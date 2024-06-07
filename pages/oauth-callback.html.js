const getSafeEnv = require("../server/client-env");

module.exports = function () {

	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jira Auto Scheduler OAuth Callback</title>
	<link rel="icon" 
				type="image/png" 
				href="/images/favicon.png">
	<link rel="stylesheet" href="./dist/production.css">
</head>
<body class="bg-slate-400">
		<div class="bg-white px-2 drop-shadow-md hide-on-fullscreen">
			<nav class="py-2 place-center w-1280">
				<div class="flex" style="align-items: center">
					<ul class="flex gap-3 flex-grow items-baseline">
						<li>
							<a class="text-neutral-800 text-3xl hover:underline font-bitovipoppins font-bold">Statistical Auto-Scheduler for Jira - OAuth Callback</a>
						</li>
						<li>
							<a href="https://www.bitovi.com/services/agile-project-management-consulting" 
								class="font-bitovipoppins text-orange-400"
								style="line-height: 37px; font-size: 14px; text-decoration: none"
								>by <img src="./images/bitovi-logo.png" class="inline align-baseline"/></a>
						</li>
					</ul>
				</div>
			</nav>
		</div>	
		
		<div id="mainElement" class="bg-white p-8 text-lg">Redirecting momentarily ...</div>
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