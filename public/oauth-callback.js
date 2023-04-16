export default function oauthCallback(jiraHelpers) {

	const queryParams = new URLSearchParams(window.location.search)
	const queryCode = queryParams.get('code')
	if (!queryCode) {
		//handle error properly to ensure good feedback
		mainElement.textContent = "Invalid code provided";
		// Todo
	} else {
		jiraHelpers.fetchAccessTokenWithAuthCode(queryCode);
	}

}