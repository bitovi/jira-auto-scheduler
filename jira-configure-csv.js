import { StacheElement, type } from "//unpkg.com/can@6/core.mjs";
import {
  makeObjectMapByKey,
  makeFilterByPropertyNotEqualToOneOfValues,
  groupByKey,
  splitByHavingPropertyValue,
  partition,
  stringToArray
} from "./helpers.js";

import jsonLogic from "./json-logic.js";
import "./components/configure-json-logic/configure-json-logic.js";


class JiraConfigureCSV extends StacheElement {
  static view = `
    <h2>Get Team Key</h2>
    <p>Given an issue, returns a key that represents which team will take on the work.</p>
    <jira-configure-json-logic rawIssues:from="this.rawIssues" jsonLogic:bind="this.config.getTeamKeyJsonLogic"/>


    <h2>Get Days Per Sprint</h2>
    <p>Given a team, returns the number of work days in a sprint.</p>
    <jira-configure-json-logic rawIssues:from="this.rawIssues" jsonLogic:bind="this.config.getDaysPerSprintJsonLogic"/>

    <h2>Get Confidence</h2>
    <p>Given an issue, returns the conflidence (from 0-100)</p>
    <jira-configure-json-logic rawIssues:from="this.rawIssues" jsonLogic:bind="this.config.getConfidenceJsonLogic"/>

    <h2>Get Estimate</h2>
    <p>Given an issue, returns the amount of work in story points.</p>
    <jira-configure-json-logic rawIssues:from="this.rawIssues" jsonLogic:bind="this.config.getEstimateJsonLogic"/>

    <h2>Get Parent Key</h2>
    <p>Given an issue, returns the container issue's key.</p>
    <jira-configure-json-logic rawIssues:from="this.rawIssues" jsonLogic:bind="this.config.getParentKeyJsonLogic"/>


    <h2>Get Blocking Keys</h2>
    <p>Given an issue, returns an array of keys that the issue blocks.</p>
    <jira-configure-json-logic rawIssues:from="this.rawIssues" jsonLogic:bind="this.config.getBlockingKeysJsonLogic"/>

    <!--
    <h2>Types</h2>
    <ul>
      {{# for( issueType of this.issueTypes) }}
        <li>{{issueType}} <input type="checkbox" checked/> {{this.issuesByType[issueType].length}}
            <details><summary>Settings</summary>
            {{# let keys=this.issueTypesKeysWithValues[issueType] }}
              <ul>
              {{# for(keyItem of keys)}}
                <li><code>{{keyItem.key}}</code>: <code>{{keyItem.example}}</code></li>
              {{/ for}}
              </ul>
            {{/ let }}
            </details>
        </li>
      {{/ for }}
    </ul>
    -->
  `;
  static props = {
    rawIssues: type.Any,
    config: type.Any
  };

  /*
  get issuesByType(){
    return groupByKey(this.rawIssues || [], "Issue Type");
  }
  get issueTypes(){
    return Object.keys(this.issuesByType);
  }
  // {Epic: {key: "Story Points": values: [10,20]}}
  get issueTypesKeysWithValues(){
    const types = {};
    for(let type in this.issuesByType) {
      const keyMap = {};
      for(let issue of this.issuesByType[type]) {
        for(let key in issue) {
          if(key === "Custom field (Functional Breakouts)") {
            debugger;
          }
          if( isMeaningfulData( issue[key] ) )  {
            if(!keyMap[key]) {
              keyMap[key] = [];
            }
            keyMap[key].push( getMeaningfulData(issue[key]) );
          }
        }
      }
      types[type] = Object.keys(keyMap).map( (key)=> {
          return {
            key: key,
            values: keyMap[key],
            example: keyMap[key][0]
          }
      })
    }
    return types;
  }*/

  connected(){

  }

  changeParentKey(){

  }

}
customElements.define("jira-configure-csv", JiraConfigureCSV);


function isMeaningfulData(value) {
  if(value === "") {
    return false;
  }

  if(Array.isArray(value)) {
    return value.some( isMeaningfulData )
  }
  return /\S/.test(value);
}

function getMeaningfulData(value){
  if(Array.isArray(value)) {
    return value.find( isMeaningfulData )
  } else {
    return value;
  }
}
