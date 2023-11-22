import JiraAutoScheduler from "./jira-auto-scheduler.js";
import JiraLogin from "./jira-login.js";
import JiraOIDCHelpers from "./jira-oidc-helpers.js";
export default async function main(config) {
	const jiraHelpers = JiraOIDCHelpers(config);
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

}


