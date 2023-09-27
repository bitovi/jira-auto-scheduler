import { StacheElement, type } from "//unpkg.com/can@6/core.mjs";
import {
  makeObjectMapByKey,
  makeFilterByPropertyNotEqualToOneOfValues,
  groupByKey,
  splitByHavingPropertyValue,
  partition,
  stringToArray
} from "./helpers.js";

import jsonLogic from "./json-logic/json-logic.js";
import "./components/configure-json-logic/configure-json-logic.js";


class JiraConfigureCSV extends StacheElement {
  static view = `
		<h2>Issue JQL</h2>
		<p>What issues do you want to load?</p>
    <p>Use <code class="inline-code">issuekey in portfolioChildIssuesOf("KEY") and issueType = Epic</code> to load epics for a single initiative.</p>
		<p><input value:bind="this.config.issueJQL" class="w-full text-base"/></p>
    <p>Loaded {{this.rawIssues.length}} issues.</p>


		<h2>Issue Fields</h2>
		<p>What issue data do you want to load?</p>
		{{# if(this.sortedFieldNames.value)}}
			<select multiple values:bind="this.config.issueFields">
				{{# for(field of this.sortedFieldNames.value)}}
					<option value="{{field.name}}">{{field.name}}</option>
				{{/}}
			</select>
		{{/ }}

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

    <h2>Types</h2>
    {{# if(this._showTypeInfo) }}
      <ul>
        {{# for( issueType of this.issueTypes) }}
          <li>{{issueType}} -
                {{this.issuesByType[issueType].length}} -

              <details><summary>Settings</summary>
              {{# let keys=this.issueTypesKeysWithValues[issueType] }}

                <ul>
                {{# for(keyItem of keys)}}
                  <li><b>{{keyItem.key}}</b>:
                    <select>
                      {{# for(value of keyItem.values) }}
                        <option>{{value}}</option>
                      {{/ for}}
                    </select>
                  </li>
                {{/ for}}
                </ul>
              {{/ let }}
              </details>
          </li>
        {{/ for }}
      </ul>
    {{ else }}
      <button on:click="this.showTypeInfo()">Show Type Info</button>
    {{/ if }}
  `;
  static props = {
    rawIssues: type.Any,
    config: type.Any,
    _showTypeInfo: {Type: Boolean, default: false},
		jiraHelpers: type.Any
  };

	get sortedFieldNames(){
		return this.jiraHelpers.fieldsRequest.then((fields)=>{
			return fields.list.sort( (f1, f2)=>{
				return f1.name > f2.name ? 1 : -1
			});
		})
	}
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

          if( isMeaningfulData( issue[key] ) )  {
            if(!keyMap[key]) {
              keyMap[key] = new Set();
            }
            keyMap[key].add( getMeaningfulData(issue[key]) );
          }
        }
      }
      types[type] = Object.keys(keyMap).map( (key)=> {
          const values = [...keyMap[key]];
          return {
            key: key,
            values: values,
            example: values[0],
          }
      })
    }
    return types;
  }

  connected(){

  }

  changeParentKey(){

  }
  showTypeInfo(){
    this._showTypeInfo = true;
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
