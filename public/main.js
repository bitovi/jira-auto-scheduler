import JiraAutoScheduler from "./jira-auto-scheduler.js";
import JiraLogin from "./jira-login.js";
import JiraOIDCHelpers from "./jira-oidc-helpers.js";
import "./shared/select-cloud.js";
import "./components/velocities-from-issue.js"

export default async function main(config) {
	const jiraHelpers = JiraOIDCHelpers(config);
	// The main app wants to know if the person is logged in before it starts doing its stuff
	const loginComponent = new JiraLogin().initialize({jiraHelpers});


	const selectCloud = document.querySelector("select-cloud")
	selectCloud.loginComponent = loginComponent;
	selectCloud.jiraHelpers = jiraHelpers;

	const velocitiesConfiguration = document.querySelector("velocities-from-issue")
	velocitiesConfiguration.loginComponent = loginComponent;
	velocitiesConfiguration.jiraHelpers = jiraHelpers;

	const listener = ({value})=>{
		if(value) {
			loginComponent.off("isResolved", listener);
			mainElement.style.display = "none";
			const report = new JiraAutoScheduler().initialize({jiraHelpers, loginComponent});
			mainElement.replaceWith(report);
		}
	}
	loginComponent.on("isResolved",listener);
	login.appendChild(loginComponent);

}


