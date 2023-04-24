const getSafeEnv = require("../server/client-env");

module.exports = function (env) {
	return `
	<!DOCTYPE html>
	<html lang="en">
	<head>
			<meta charset="UTF-8">
			<meta http-equiv="X-UA-Compatible" content="IE=edge">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Jira Auto Scheduler</title>
			<link rel="stylesheet" href="./jira-auto-scheduler.css">
	</head>
	<body>
			<div id="mainElement">Loading ... </div>
			<link href="//cdnjs.cloudflare.com/ajax/libs/jsoneditor/9.5.5/jsoneditor.min.css" rel="stylesheet" type="text/css">
		  <script src="//cdnjs.cloudflare.com/ajax/libs/jsoneditor/9.5.5/jsoneditor.min.js"></script>
			<script type="module">
				import JiraOIDCHelpers from "./jira-oidc-helpers.js";
				import main from "./main.js";
				const jiraHelpers = JiraOIDCHelpers(${JSON.stringify(getSafeEnv())});
				main(jiraHelpers);
			</script>
	</body>
	</html>
	`
}