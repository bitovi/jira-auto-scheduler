const getSafeEnv = require("../server/client-env");

module.exports = function (env) {
	return `
	<!DOCTYPE html>
	<html lang="en">
	<head>
			<script>
				console.time("start");
			</script>
			<meta charset="UTF-8">
			<meta http-equiv="X-UA-Compatible" content="IE=edge">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Jira Auto Scheduler</title>
			<link rel="stylesheet" href="./dist/production.css">
			<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&display=swap" rel="stylesheet">
			<link rel="icon" 
				type="image/png" 
				href="/images/favicon.png">

			<meta property="og:title" content="Statistical Auto-Scheduler for Jira">
			<meta property="og:type" content="website" />
			<meta property="og:description" content="A statistical monte-carlo roadmapping tool for Jira.">
			<meta property="og:image" content="https://repository-images.githubusercontent.com/354628180/fe4dbf27-0409-4cc6-86cc-0a7097983901">
			<meta property="og:url" content="https://auto-scheduler.bitovi-jira.com/">
			<meta name="twitter:card" content="summary_large_image">
	</head>
	<body class="bg-slate-400">
	<div class="bg-white px-2 drop-shadow-md hide-on-fullscreen">
		<nav class="py-2 place-center w-1280">
			<div class="flex" style="align-items: center">
				<ul class="flex gap-3 flex-grow items-baseline">
					<li>
						<a href="https://github.com/bitovi/jira-auto-scheduler" 
							class="text-neutral-800 text-3xl hover:underline font-bitovipoppins font-bold">Statistical Auto-Scheduler for Jira</a>
					</li>
					<li>
						<a href="https://www.bitovi.com/services/agile-project-management-consulting" 
							class="font-bitovipoppins text-orange-400"
							style="line-height: 37px; font-size: 14px; text-decoration: none"
							>by <img src="./images/bitovi-logo.png" class="inline align-baseline"/></a>
					</li>
				</ul>
				<select-cloud></select-cloud>
				<div id="login">
					
				</div>
			</div>
		</nav>
	</div>	
		<div id="mainElement">Loading ... </div>

		<div id="key" class="p-2 rounded-lg bg-white m-2 mb-10">
			<div class="text-base font-semibold shrink">KEY</div>
			<div class="flex justify-center">
				<div class="relative w-1/2">
					<div class="absolute bg-gradient-to-r from-blue-200 to-green-200 from-85% to-95% h-1 top-1.5 border-box w-full"></div>
					<div class="work-item cursor-pointer border-solid border relative bg-gradient-to-r from-blue-500 to-green-400 from-45% to-55% h-4 border-box rounded w-1/2" 
						style="left: 50%"></div>
					<div class="relative  pt-2">
						<div class="text-center" style="position: absolute; width: 30%; transform: translateX(-50%);">
							<div class="w-3 h-3 bg-blue-200 rounded-full inline-block"></div><br/>
							Earliest development might start within risk parameters
						</div>
						<div class="text-center" style="position: absolute; width: 30%; right: 0px; transform: translateX(50%);">
							<div class="w-3 h-3 bg-green-400 rounded-full inline-block"></div><br/>
								Latest development must finish to be within risk parameters
							</div>
						<div class="text-center" style="position: relative; width: 30%; left: 50%; transform: translateX(-50%);">
							<div class="w-3 h-3 bg-blue-500 rounded-full inline-block"></div><br/>
							Latest development must start to be within risk parameters</div>
					</div>
				</div>
			</div>

		</div>
		<script>
		
		</script>
		<script type="module">
			import main from "./main.js";
			main( ${JSON.stringify(getSafeEnv())} );
		</script>
	</body>
	</html>
	`
}
