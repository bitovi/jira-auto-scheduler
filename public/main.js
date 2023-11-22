import JiraAutoScheduler from "./jira-auto-scheduler.js";
import JiraLogin from "./jira-login.js";
export default async function main(jiraHelpers) {
	
	// The main app wants to know if the person is logged in before it starts doing its stuff
	const loginComponent = new JiraLogin().initialize({jiraHelpers});
	const listener = ({value})=>{
		if(value) {
			loginComponent.off("isResolved", listener);
			mainElement.style.display = "none";

			const report = new JiraAutoScheduler().initialize({jiraHelpers, loginComponent});
			document.body.append(report);
			
		}
	}
	loginComponent.on("isResolved",listener);
	login.appendChild(loginComponent);
	/*mainElement.textContent = "Checking for Jira Access Token";

	if (!jiraHelpers.hasValidAccessToken()) {
		await sleep(100);
		mainElement.textContent = "Getting access token";
		const accessToken = await jiraHelpers.getAccessToken();
		return;
	}

	const accessToken = await jiraHelpers.getAccessToken();

	mainElement.textContent = "Got Access Token";*/
	

	//document.body.innerHTML = "ready 2 go"
}


function sleep(time) {
	return new Promise((resolve) => {
		setTimeout(resolve, time)
	})
}
