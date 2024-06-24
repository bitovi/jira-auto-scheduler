import { StacheElement, type, ObservableObject } from "../can.js";
//import SimpleTooltip from "./simple-tooltip.js";

// ["velocity","tracks","sprint length"];

class TeamConfiguration extends ObservableObject {
    static getTeamConfiguration(jiraHelpers){
        const getIssues = jiraHelpers.fetchJiraIssuesWithJQLWithNamedFields({
            jql: `summary ~ "Jira Auto Scheduler Configuration"`,
            fields: ["summary","Description"]
        })
        
        return Promise.all([jiraHelpers.getServerInfo(), getIssues]).then( ([serverInfo, issues])=> {      
            const first = issues.find( issue => issue.fields.Summary === "Jira Auto Scheduler Configuration");

            if(first) {
                //const description = first.fields.Description.content,
                //    teamConfiguration = searchDocument(description, matchTeamTable);
                
                return new TeamConfiguration({issue: {...first, url: serverInfo.baseUrl+"/browse/"+first.key}})
            } else {
                return new TeamConfiguration({issue: null})
            }

        })
        
    }
    static props = {
        temporaryData: {get default(){ return new ObservableObject() }}
    };
    get _issueConfig(){
        if(this.issue) {
            const teamConfigurationArray = searchDocument(this.issue.fields.Description.content, matchTeamTable);
            if(teamConfigurationArray.length) {
                return normalizeTeamConfigurationArray(teamConfigurationArray[0])
            }
        }
    }

    getVelocityForTeam(team){
        if(this.temporaryData?.[team]?.velocity) {
            return this.temporaryData[team].velocity;
        } else if(this._issueConfig?.[team]?.velocity) {
            return this._issueConfig?.[team].velocity;
        } else {
            return 21;
        }
    }
    setVelocityForTeam(team, value) {
        if(this.temporaryData[team]) {
            this.temporaryData[team] = {...this.temporaryData[team], velocity: value};
        } else {
            this.temporaryData[team] = {name: team, velocity: value};
        }
    }
    updateConfiguration(){
        console.log("TODO", this.temporaryData, this._issueConfig)
    }
    getTracksForTeam(team) {
        if(this.temporaryData?.[team]?.tracks) {
            return this.temporaryData[team].tracks;
        } else if(this._issueConfig?.[team]?.tracks) {
            return this._issueConfig?.[team].tracks;
        } else {
            return 1;
        }
    }
    addTrackForTeam(team) {
        const newTracks = this.getTracksForTeam(team) + 1;
        if(this.temporaryData[team]) {
            this.temporaryData[team] = {...this.temporaryData[team], tracks: newTracks};
        } else {
            this.temporaryData[team] = {name: team, tracks: newTracks};
        }
    }
    removeTrackForTeam(team) {
        const newTracks = Math.max( this.getTracksForTeam(team) - 1, 1);
        if(this.temporaryData[team]) {
            this.temporaryData[team] = {...this.temporaryData[team], tracks: newTracks};
        } else {
            this.temporaryData[team] = {name: team, tracks: newTracks};
        }
    }
}

const aliases = {
    "velocities": "velocity", 
    "track": "tracks", "parallel epics": "tracks",
    "sprint length": "sprintLength", "sprint days": "sprintLength", 
    "team": "name" 
};
const propertiesToTurnIntoNumbers = ["velocity","tracks","sprint length"];
function normalizeTeamConfigurationArray(teamConfigurationArray){
    const normalizedTeamData = {};
    for(let team of teamConfigurationArray) {
        const record = {};
        for(let prop in team) {
            let propToSet = prop in aliases ? aliases[prop] : prop;
            record[ propToSet ] = propertiesToTurnIntoNumbers.includes(propToSet) ? 
                + team[prop] : team[prop];
        }
        normalizedTeamData[record.name] = record
    }
    return normalizedTeamData;

}

export default class VelocitiesFromIssue extends StacheElement {
    static view = `
        {{# if(this.canQuery) }}
            <div class="mr-8 hover:bg-gray-200 bg-gray-100 rounded-lg font-bitovipoppins font-lg">
                {{# if(this.teamConfigurationPromise.isPending) }}
                    <span class="px-2 py-1">Loading ...</span>
                {{/ }}

                {{# if(this.teamConfigurationPromise.isResolved) }}
                    
                    {{# if(this.teamConfigurationPromise.value.issue) }}

                        <a class="px-2 py-1" href="{{this.teamConfigurationPromise.value.issue.url}}" target="_blank">
                            Configuration Issue
                        </a>
                    {{ else }}
                            <a class="px-2 py-1" href="https://github.com/bitovi/jira-auto-scheduler/blob/main/docs/saved-configuration.md" target="_blank">
                            Create Configuration
                            </a>
                    {{/ if }}

                {{/ }}
            </div>
        {{/ if}}

    `;
    static props = {
        jiraHelpers: type.Any,
        loginComponent: type.Any,
        get canQuery(){
            return this.jiraHelpers && this.loginComponent?.isLoggedIn;
        },
        get teamConfigurationPromise(){
            if(this.canQuery) {
                return TeamConfiguration.getTeamConfiguration(this.jiraHelpers);
            } else {
                
                return Promise.resolve(new TeamConfiguration({issue: null}))
            }
        }
    };
    /*
    showSavedReports(){
        const div = document.createElement("div");
        this.globalConfigurationsPromise.then(({links, issue,serverInfo}) => {
            // come back acround and fix this
            
            let html = ``
            if(!issue) {
                html += `<a href="https://github.com/bitovi/jira-timeline-report/blob/main/docs/saved-reports.md" class="link block">Create Saved Reports</a>`
            } else {
                html += `
                <div class="divide-y divide-gray-100">
                    <div class="py-2">
                        ${
                            links.map(link => {
                                return `
                                    <a href="${link.href}" class="${
                                        unescape(link.href) === unescape(window.location) ? "" : "link"
                                    } block py-1">${link.text}</a>
                                `
                            }).join("")
                        }
                    </div>
                    <div class="py-2">
                        <a href="${serverInfo.baseUrl}/browse/${issue.key}" class="link block">Update Saved Reports</a>
                    </div>
                </div>`;
            }
            
            
            this.simpleTooltip.belowElementInScrollingContainer(this, html );
            // wait for this click event to clear the event queue
            
            setTimeout(()=>{
                const handler = () => {
                    this.simpleTooltip.leftElement();
                    window.removeEventListener("click", handler);
                }
                window.addEventListener("click", handler);
            }, 13)
            
        })
        
        
        
    }
    */
    connected(){
        
        //const simpleTooltip = new SimpleTooltip();
        //this.parentNode.append(simpleTooltip);
        //this.simpleTooltip = simpleTooltip;

    }
}


function matchLink(fragment) {
    const isText = fragment.type === "text";
    if(!isText) {
        return false;
    }
    const marks = ( fragment?.marks || [] )
    const link = marks.find(mark => mark.type === "link")
    const strong = marks.find(mark => mark.type === "strong");
    if(link) {
        return {
            text: fragment.text,
            href: link.attrs.href,
            default: !!strong
        }
    }
}

function isParagraph(frag) {return frag.type === "paragraph"; }

function getTextFromParagraph(p){
    return p.content.filter( text => text.type === "text").map( text =>  text.text );
}
function getTextFromWithinCell(cell) {
    return cell.content.filter(isParagraph)
            .map( getTextFromParagraph ).flat().join(" ")
}

function matchTeamTable(fragment) {
    if(fragment.type !== "table") {
        return false;
    }
    if(fragment.content[0].type !== "tableRow") {
        return false;
    }
    const headerRow = fragment.content[0];
    const headerTitles = headerRow.content.map( (header)=> {
        // gets the first text from each header cell
        return getTextFromWithinCell(header).toLowerCase()
    })

    if(!headerTitles.includes("team")) {
        return false;
    }

    const records = [];

    // build objects from other table content 
    for(let i = 1; i < fragment.content.length; i++) {
        let row = fragment.content[i];
        let record = {};
        // loop
        for(let c = 0; c < row.content.length; c++) {
            let name = headerTitles[c];
            let cell = row.content[c];
            record[name] = getTextFromWithinCell(cell)
        }
        records.push(record);
    }
    return records;
}




function searchDocument(document, matcher) {
    let matches = [];

    // Helper function to recursively search for matches
    function recurse(doc) {
        if (Array.isArray(doc)) {
            for (const item of doc) {
                recurse(item);
            }
        } else if (typeof doc === 'object' && doc !== null) {
            const result = matcher(doc);
            if (result) {
                matches.push(result); // Collect matching substructure
            } else {
                for (const key of Object.keys(doc)) {
                    recurse(doc[key]);
                }
            }
            
        }
    }

    recurse(document); // Start the recursive search
    return matches; // Return all matching substructures
}

customElements.define("velocities-from-issue", VelocitiesFromIssue);


