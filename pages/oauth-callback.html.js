const getSafeEnv = require("../server/client-env");

module.exports = function () {

	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>

</head>
<body>
		<h1>Jira QA Metrics: OAuth Callback</h1>
		<div id="mainElement">Loading ... </div>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/axios/1.1.2/axios.min.js"></script>
		<script type="module">
			import JiraOIDCHelpers from "./jira-oidc-helpers.js";
			import oauthCallback from "./oauth-callback.js";
			const jiraHelpers = JiraOIDCHelpers(${JSON.stringify(getSafeEnv())});
			oauthCallback(jiraHelpers);
		</script>
</body>
</html>`

}