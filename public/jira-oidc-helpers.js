// TODO: document
const CACHE_FETCH = false;

function responseToJSON(response) {
	return response.json();
}

function nativeFetchJSON(url, options) {
	return fetch(url, options).then(responseToJSON)
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





	const jiraHelpers = {
		saveInformationToLocalStorage: (parameters) => {
			const objectKeys = Object.keys(parameters)
			for (let key of objectKeys) {
				window.localStorage.setItem(key, parameters[key]);
			}
		},
		fetchFromLocalStorage: (key) => {
			return window.localStorage.getItem(key);
		},
		fetchAuthorizationCode: () => {
			const url = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${JIRA_CLIENT_ID}&scope=${JIRA_SCOPE}&redirect_uri=${JIRA_CALLBACK_URL}&response_type=code&prompt=consent&state=${encodeURIComponent(window.location.search)}`;
			window.location.href = url;
		},
		refreshAccessToken: async (accessCode) => {
			try {
				const response = await axios.get(`${window.env.JIRA_API_URL}/?code=${accessCode}`)
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
				window.localStorage.clear()
				jiraHelpers.fetchAuthorizationCode();
			}
		},
		fetchAccessTokenWithAuthCode: async (authCode) => {
			try {
				const response = await axios.get(`./access-token?code=${authCode}`)
				const {
					accessToken,
					expiryTimestamp,
					refreshToken,
					scopeId
				} = response.data;
				jiraHelpers.saveInformationToLocalStorage({
					accessToken,
					refreshToken,
					expiryTimestamp,
					scopeId,
				});
				//redirect to data page

				const addOnQuery = new URL(window.location).searchParams.get("state");
				location.href = '/' + (addOnQuery || "");
			} catch (error) {
				//handle error properly.
				console.error(error);
				// location.href = '/error.html';
			}
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
			return await axios.get(url, config);
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
		fetchAllJiraIssuesWithJQL: async function (params) {
			const firstRequest = jiraHelpers.fetchJiraIssuesWithJQL({ maxResults: 100, ...params });
			const { issues, maxResults, total, startAt } = await firstRequest;
			const requests = [firstRequest];
			for (let i = startAt + maxResults; i < total; i += maxResults) {
				requests.push(
					jiraHelpers.fetchJiraIssuesWithJQL({ maxResults: maxResults, startAt: i, ...params })
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
		fetchRemainingChangelogsForIssues(issues) {
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
		fetchAllJiraIssuesWithJQLAndFetchAllChangelog: async function (params) {
			function getRemainingChangeLogsForIssues(response) {
				return jiraHelpers.fetchRemainingChangelogsForIssues(response.issues)
			}

			const firstRequest = jiraHelpers.fetchJiraIssuesWithJQL({ maxResults: 100, expand: ["changelog"], ...params });

			const { issues, maxResults, total, startAt } = await firstRequest;
			const requests = [firstRequest.then(getRemainingChangeLogsForIssues)];

			for (let i = startAt + maxResults; i < total; i += maxResults) {
				requests.push(
					jiraHelpers.fetchJiraIssuesWithJQL({ maxResults: maxResults, startAt: i, ...params })
						.then(getRemainingChangeLogsForIssues)
				);
			}
			return Promise.all(requests).then(
				(responses) => {
					return responses.flat();
				}
			)
		},
		// this could do each response incrementally, but I'm being lazy
		fetchAllJiraIssuesWithJQLAndFetchAllChangelogUsingNamedFields: async function (params) {
			const fields = await fieldsRequest;
			const newParams = {
				...params,
				fields: params.fields.map(f => fields.nameMap[f] || f)
			}
			const response = await jiraHelpers.fetchAllJiraIssuesWithJQLAndFetchAllChangelog(newParams);


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
	}


	function mapIdsToNames(obj, fields) {
		const mapped = {};
		for (let prop in obj) {
			mapped[fields.idMap[prop] || prop] = obj[prop];
		}
		return mapped;
	}

	return jiraHelpers;
}
