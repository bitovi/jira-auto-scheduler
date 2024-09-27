const CACHE_FETCH = false;

function responseToJSON(response) {
	if(!response.ok) {
		return response.json().then((payload) => {
			const err = new Error("HTTP status code: " + response.status);
			Object.assign(err, payload);
			Object.assign(err, response);
			throw err;
		})
	}
	return response.json();
}
function responseToText(response) {
	if(!response.ok) {
		return response.json().then((payload) => {
			const err = new Error("HTTP status code: " + response.status);
			Object.assign(err, payload);
			Object.assign(err, response);
			throw err;
		})
	}
	return response.text();
}


export function nativeFetchJSON(url, options) {
	return fetch(url, options).then(responseToJSON)
}


function chunkArray(array, size) {
	const chunkedArr = [];
	for (let i = 0; i < array.length; i += size) {
	  chunkedArr.push(array.slice(i, i + size));
	}
	return chunkedArr;
}



export default function JiraOIDCHelpers({
	JIRA_CLIENT_ID,
	JIRA_SCOPE,
	JIRA_CALLBACK_URL,
	JIRA_API_URL
} = window.env) {

	let fetchJSON = nativeFetchJSON;
	if (CACHE_FETCH) {
		fetchJSON = async function (url, options) {
			if (window.localStorage.getItem(url)) {
				return JSON.parse(window.localStorage.getItem(url));
			} else {
				const result = nativeFetchJSON(url, options);
				result.then(async data => {
					try {
						window.localStorage.setItem(url, JSON.stringify(data));
					} catch (e) {
						console.log("can't save");
					}

				});
				return result;
			}
		};
	}


	let fieldsRequest;


	function makeDeepChildrenLoaderUsingNamedFields(rootMethod){

		// Makes child requests in batches of 40
		// 
		// params - base params
		// sourceParentIssues - the source of parent issues
		function fetchChildrenResponses(params, parentIssues, progress) {
			const issuesToQuery = chunkArray(parentIssues, 40);
	
			const batchedResponses = issuesToQuery.map( issues => {
				const keys = issues.map( issue => issue.key);
				const jql = `parent in (${keys.join(", ")}) ${params.childJQL || ""}`;
				return rootMethod({
					...params,
					jql
				}, progress)
			});
			// this needs to be flattened
			return batchedResponses;
		}
	
		async function fetchDeepChildren(params, sourceParentIssues, progress) {
			const batchedFirstResponses = fetchChildrenResponses(params, sourceParentIssues, progress);
	
			const getChildren = (parentIssues) => {
				if(parentIssues.length) {
					return fetchDeepChildren(params, parentIssues, progress).then(deepChildrenIssues => {
						return parentIssues.concat(deepChildrenIssues);
					})
				} else {
					return parentIssues
				}
			}
			const batchedIssueRequests = batchedFirstResponses.map( firstBatchPromise => {
				return firstBatchPromise.then( getChildren )
			})
			const allChildren = await Promise.all(batchedIssueRequests);
			return allChildren.flat();
		}
	
		return async function fetchAllDeepChildren(params, progress = function(){}){
			const fields = await fieldsRequest;
			const newParams = {
				...params,
				fields: params.fields.map(f => fields.nameMap[f] || f)
			}
	
			progress.data = progress.data || {
				issuesRequested: 0,
				issuesReceived: 0,
				changeLogsRequested: 0,
				changeLogsReceived: 0
			};
			const parentIssues = await rootMethod(newParams, progress);
	
			// go get the children
			const allChildrenIssues = await fetchDeepChildren(newParams, parentIssues, progress);
			const combined = parentIssues.concat(allChildrenIssues);
			return combined.map((issue) => {
				return {
					...issue,
					fields: mapIdsToNames(issue.fields, fields)
				}
			});
		}
	}


	const jiraHelpers = {
		saveInformationToLocalStorage: (parameters) => {
			const objectKeys = Object.keys(parameters)
			for (let key of objectKeys) {
				window.localStorage.setItem(key, parameters[key]);
			}
		},
		clearAuthFromLocalStorage: function(){
			window.localStorage.removeItem("accessToken");
			window.localStorage.removeItem("refreshToken");
			window.localStorage.removeItem("expiryTimestamp");
		},
		fetchFromLocalStorage: (key) => {
			return window.localStorage.getItem(key);
		},
		fetchAuthorizationCode: () => {
			const url = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${JIRA_CLIENT_ID}&scope=${escape(JIRA_SCOPE)}&redirect_uri=${JIRA_CALLBACK_URL}&response_type=code&prompt=consent&state=${encodeURIComponent(encodeURIComponent(window.location.search))}`;
			window.location.href = url;
		},
		refreshAccessToken: async (accessCode) => {
			try {
				const response = await fetchJSON(`${window.env.JIRA_API_URL}/?code=${accessCode}`)
				const {
					accessToken,
					expiryTimestamp,
					refreshToken,
				} = response.data;
				jiraHelpers.saveInformationToLocalStorage({
					accessToken,
					refreshToken,
					expiryTimestamp,
				});
				return accessToken;
			} catch (error) {
				console.error(error.message)
				jiraHelpers.clearAuthFromLocalStorage();
				jiraHelpers.fetchAuthorizationCode();
			}
		},
		fetchAccessTokenWithAuthCode: async (authCode) => {
			try {
				const {
					accessToken,
					expiryTimestamp,
					refreshToken,
					scopeId
				} = await fetchJSON(`./access-token?code=${authCode}`)

				jiraHelpers.saveInformationToLocalStorage({
					accessToken,
					refreshToken,
					expiryTimestamp,
					scopeId,
				});
				//redirect to data page
				const addOnQuery = new URL(window.location).searchParams.get("state");
				const decoded = decodeURIComponent(addOnQuery);
				location.href = '/' + (addOnQuery || "");
			} catch (error) {
				//handle error properly.
				console.error(error);
				// location.href = '/error.html';
			}
		},
		fetchAccessibleResources: (passedAccessToken) => {
			const accessToken = passedAccessToken || jiraHelpers.fetchFromLocalStorage('accessToken');
			return fetchJSON(`https://api.atlassian.com/oauth/token/accessible-resources`, {
				headers: {
					'Authorization': `Bearer ${accessToken}`,
				}
			});
		},
		fetchJiraSprint: async (sprintId) => {
			//this fetches all Recent Projects From Jira
			const scopeIdForJira = jiraHelpers.fetchFromLocalStorage('scopeId');
			const accessToken = jiraHelpers.fetchFromLocalStorage('accessToken');
			const url = `${JIRA_API_URL}/${scopeIdForJira}/rest/agile/1.0/sprint/${sprintId}`;
			const config = {
				headers: {
					'Authorization': `Bearer ${accessToken}`,
				}
			}
			return await fetchJSON(url, config);
		},
		fetchJiraIssue: async (issueId) => {
			//this fetches all Recent Projects From Jira
			const scopeIdForJira = jiraHelpers.fetchFromLocalStorage('scopeId');
			const accessToken = jiraHelpers.fetchFromLocalStorage('accessToken');
			const url = `${JIRA_API_URL}/${scopeIdForJira}/rest/api/3/issue/${issueId}`;
			const config = {
				headers: {
					'Authorization': `Bearer ${accessToken}`,
				}
			}
			return await fetchJSON(url, config);
		},
		editJiraIssueWithNamedFields: async (issueId, fields) => {
			const scopeIdForJira = jiraHelpers.fetchFromLocalStorage('scopeId');
			const accessToken = jiraHelpers.fetchFromLocalStorage('accessToken');

			const fieldMapping = await fieldsRequest;
			
			const editBody = fieldsToEditBody(fields, fieldMapping);
			//const fieldsWithIds = mapNamesToIds(fields || {}, fieldMapping),
			//	updateWithIds = mapNamesToIds(update || {}, fieldMapping);

			return fetch(
				`${JIRA_API_URL}/${scopeIdForJira}/rest/api/3/issue/${issueId}?` +
				"" /*new URLSearchParams(params)*/,
				{
					method: 'PUT',
					headers: {
						'Authorization': `Bearer ${accessToken}`,
						'Accept': 'application/json',
    					'Content-Type': 'application/json'
					},
					body: JSON.stringify(editBody)
				}
			).then(responseToText);
		},
		fetchJiraIssuesWithJQL: function (params) {
			const scopeIdForJira = jiraHelpers.fetchFromLocalStorage('scopeId');
			const accessToken = jiraHelpers.fetchFromLocalStorage('accessToken');

			return fetchJSON(
				`${JIRA_API_URL}/${scopeIdForJira}/rest/api/3/search?` +
				new URLSearchParams(params),
				{
					headers: {
						'Authorization': `Bearer ${accessToken}`,
					}
				}

			)
		},
		fetchJiraIssuesWithJQLWithNamedFields: async function (params) {
			const fields = await fieldsRequest;
			const newParams = {
				...params,
				fields: params.fields.map(f => fields.nameMap[f] || f)
			}
			const response = await jiraHelpers.fetchJiraIssuesWithJQL(newParams);


			return response.issues.map((issue) => {
				return {
					...issue,
					fields: mapIdsToNames(issue.fields, fields)
				}
			});
		},
		fetchAllJiraIssuesWithJQL: async function (params) {
			const { limit: limit, ...apiParams } = params;
			const firstRequest = jiraHelpers.fetchJiraIssuesWithJQL({ maxResults: 100, ...apiParams });
			const { issues, maxResults, total, startAt } = await firstRequest;
			const requests = [firstRequest];
			
			const limitOrTotal = Math.min(total, limit || Infinity);
			for (let i = startAt + maxResults; i < limitOrTotal; i += maxResults) {
				requests.push(
					jiraHelpers.fetchJiraIssuesWithJQL({ maxResults: maxResults, startAt: i, ...apiParams })
				);
			}
			return Promise.all(requests).then(
				(responses) => {
					return responses.map((response) => response.issues).flat();
				}
			)
		},
		fetchAllJiraIssuesWithJQLUsingNamedFields: async function(params) {
			const fields = await fieldsRequest;

			const newParams = {
				...params,
				fields: params.fields.map(f => fields.nameMap[f] || f)
			}
			const response = await jiraHelpers.fetchAllJiraIssuesWithJQL(newParams);

			return response.map((issue) => {
				return {
					...issue,
					fields: mapIdsToNames(issue.fields, fields)
				}
			});
		},
		fetchJiraChangelog(issueIdOrKey, params) {
			const scopeIdForJira = jiraHelpers.fetchFromLocalStorage('scopeId');
			const accessToken = jiraHelpers.fetchFromLocalStorage('accessToken');

			return fetchJSON(
				`${JIRA_API_URL}/${scopeIdForJira}/rest/api/3/issue/${issueIdOrKey}/changelog?` +
				new URLSearchParams(params),
				{
					headers: {
						'Authorization': `Bearer ${accessToken}`,
					}
				}

			)
		},
		isChangelogComplete(changelog) {
			return changelog.histories.length === changelog.total
		},
		fetchRemainingChangelogsForIssues(issues, progress = function(){}) {
			// check for remainings
			return Promise.all(issues.map(issue => {
				if (jiraHelpers.isChangelogComplete(issue.changelog)) {
					return {
						...issue,
						changelog: issue.changelog.histories
					}
				} else {
					return jiraHelpers.fetchRemainingChangelogsForIssue(issue.key, issue.changelog).then((histories) => {
						return {
							...issue,
							changelog: issue.changelog.histories
						}
					})
				}
			}))
		},
		// weirdly, this starts with the oldest, but we got the most recent
		// returns an array of histories objects
		fetchRemainingChangelogsForIssue(issueIdOrKey, mostRecentChangeLog) {
			const { histories, maxResults, total, startAt } = mostRecentChangeLog;

			const requests = [];
			requests.push({ values: mostRecentChangeLog.histories });
			for (let i = 0; i < total - maxResults; i += maxResults) {
				requests.push(
					jiraHelpers.fetchJiraChangelog(issueIdOrKey, {
						maxResults: Math.min(maxResults, total - maxResults - i),
						startAt: i,
					}).then((response) => {
						// the query above reverses the sort order, we fix that here
						return { ...response, values: response.values.reverse() };
					})
				);
			}
			// server sends back as "values", we match that

			return Promise.all(requests).then(
				(responses) => {
					return responses.map((response) => response.values).flat();
				}
			).then(function (response) {
				return response;
			})
		},
		fetchAllJiraIssuesWithJQLAndFetchAllChangelog: function (params, progress= function(){}) {
			const { limit: limit, ...apiParams } = params;
			
			
			// a weak map would be better
			progress.data = progress.data || {
				issuesRequested: 0,
				issuesReceived: 0,
				changeLogsRequested: 0,
				changeLogsReceived: 0
			};
			function getRemainingChangeLogsForIssues(response) {
				Object.assign(progress.data, {
					issuesReceived: progress.data.issuesReceived+response.issues.length
				});
				progress(progress.data);
				return jiraHelpers.fetchRemainingChangelogsForIssues(response.issues, progress)
			}

			const firstRequest = jiraHelpers.fetchJiraIssuesWithJQL({ maxResults: 100, expand: ["changelog"], ...apiParams });

			return firstRequest.then( ({ issues, maxResults, total, startAt }) => {
				Object.assign(progress.data, {
					issuesRequested: progress.data.issuesRequested+total,
					changeLogsRequested: 0,
					changeLogsReceived: 0
				});
				progress(progress.data);

				const requests = [firstRequest.then(getRemainingChangeLogsForIssues)];
				const limitOrTotal = Math.min(total, limit || Infinity);

				for (let i = startAt + maxResults; i < requests; i += maxResults) {
					requests.push(
						jiraHelpers.fetchJiraIssuesWithJQL({ maxResults: maxResults, startAt: i, ...apiParams })
							.then(getRemainingChangeLogsForIssues)
					);
				}
				return Promise.all(requests).then(
					(responses) => {
						return responses.flat();
					}
				)
			});
		},
		// this could do each response incrementally, but I'm being lazy
		fetchAllJiraIssuesWithJQLAndFetchAllChangelogUsingNamedFields: async function (params, progress) {
			const fields = await fieldsRequest;
			const newParams = {
				...params,
				fields: params.fields.map(f => fields.nameMap[f] || f)
			}
			const response = await jiraHelpers.fetchAllJiraIssuesWithJQLAndFetchAllChangelog(newParams, progress);


			return response.map((issue) => {
				return {
					...issue,
					fields: mapIdsToNames(issue.fields, fields)
				}
			});
			// change the parms
		},
		fetchJiraFields() {
			const scopeIdForJira = jiraHelpers.fetchFromLocalStorage('scopeId');
			const accessToken = jiraHelpers.fetchFromLocalStorage('accessToken');

			return fetchJSON(
				`${JIRA_API_URL}/${scopeIdForJira}/rest/api/3/field`,
				{
					headers: {
						'Authorization': `Bearer ${accessToken}`,
					}
				}
			)
		},
		getAccessToken: async function () {
			if (!jiraHelpers.hasValidAccessToken()) {
				const refreshToken = jiraHelpers.fetchFromLocalStorage("refreshToken");
				if (!refreshToken) {
					jiraHelpers.fetchAuthorizationCode();
				} else {
					return jiraHelpers.refreshAccessToken();
				}
			} else {
				return jiraHelpers.fetchFromLocalStorage("accessToken");
			}
		},
		// if someone was ever logged in
		hasAccessToken: function(){
			return !! jiraHelpers.fetchFromLocalStorage("accessToken");
		},
		hasValidAccessToken: function () {
			const accessToken = jiraHelpers.fetchFromLocalStorage("accessToken");
			let expiryTimestamp = Number(jiraHelpers.fetchFromLocalStorage("expiryTimestamp"));
			if (isNaN(expiryTimestamp)) {
				expiryTimestamp = 0;
			}
			const currentTimestamp = Math.floor(new Date().getTime() / 1000.0);
			return !((currentTimestamp > expiryTimestamp) || (!accessToken))
		},
		getServerInfo() {
			// https://your-domain.atlassian.net/rest/api/3/serverInfo
			const scopeIdForJira = jiraHelpers.fetchFromLocalStorage('scopeId');
			const accessToken = jiraHelpers.fetchFromLocalStorage('accessToken');

			return fetchJSON(
				`${JIRA_API_URL}/${scopeIdForJira}/rest/api/3/serverInfo`,
				{
					headers: {
						'Authorization': `Bearer ${accessToken}`,
					}
				}

			)
		}
	}

	jiraHelpers.fetchAllJiraIssuesAndDeepChildrenWithJQLUsingNamedFields = 
		makeDeepChildrenLoaderUsingNamedFields(jiraHelpers.fetchAllJiraIssuesWithJQL.bind(jiraHelpers));

	jiraHelpers.fetchAllJiraIssuesAndDeepChildrenWithJQLAndFetchAllChangelogUsingNamedFields = 
		makeDeepChildrenLoaderUsingNamedFields(jiraHelpers.fetchAllJiraIssuesWithJQLAndFetchAllChangelog.bind(jiraHelpers));


	function makeFieldNameToIdMap(fields) {
		const map = {};
		fields.forEach((f) => {
			map[f.name] = f.id;
		});
		return map;
	}

	if (jiraHelpers.hasValidAccessToken()) {
		fieldsRequest = jiraHelpers.fetchJiraFields().then((fields) => {
			const nameMap = {};
			const idMap = {};
			fields.forEach((f) => {
				idMap[f.id] = f.name;
				nameMap[f.name] = f.id;
			});
			console.log(nameMap);

			return {
				list: fields,
				nameMap: nameMap,
				idMap: idMap
			}
		});
		jiraHelpers.fieldsRequest = fieldsRequest;
	}


	function mapIdsToNames(obj, fields) {
		const mapped = {};
		for (let prop in obj) {
			mapped[fields.idMap[prop] || prop] = obj[prop];
		}
		return mapped;
	}
	function fieldsToEditBody(obj, fieldMapping){
		const editBody = {fields: {}, update: {}};
		
		for (let prop in obj) {
			//if(prop === "Story points") {
				// 10016 -> story point estimate
				// 10034 -> story points
				//obj[prop] = ""+obj[prop];
				//mapped["customfield_10016"] = obj[prop];
				//mapped["customfield_10034"] = obj[prop];
				//mapped["Story points"] = obj[prop];
				//mapped["storypoints"] = obj[prop];
				//mapped["Story Points"] = obj[prop];
				// 10016 -> story point estimate
			//} else {
				//mapped[fields.nameMap[prop] || prop] = obj[prop];
			//}
			editBody.update[fieldMapping.nameMap[prop] || prop] = [{set: obj[prop]}];
		}
		return editBody;
	}
	function mapNamesToIds(obj, fields) {
		const mapped = {};
		for (let prop in obj) {
			//if(prop === "Story points") {
				// 10016 -> story point estimate
				// 10034 -> story points
				//obj[prop] = ""+obj[prop];
				//mapped["customfield_10016"] = obj[prop];
				//mapped["customfield_10034"] = obj[prop];
				//mapped["Story points"] = obj[prop];
				//mapped["storypoints"] = obj[prop];
				//mapped["Story Points"] = obj[prop];
				// 10016 -> story point estimate
			//} else {
				mapped[fields.nameMap[prop] || prop] = obj[prop];
			//}
			
		}
		return mapped;
	}

	return window.jiraHelpers = jiraHelpers;
}
