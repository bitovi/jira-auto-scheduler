import { StacheElement, type } from "./can.js";
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
import "./shared/autocomplete/autocomplete.js";
import {saveJSONToUrl} from "./shared/state-storage.js";


class JiraConfigureCSV extends StacheElement {
  static view = `
    <h2 class="text-lg font-bold">Overview</h2>
    <p class=" pb-2">The Statistical AutoScheduler schedules Jira epics using story point estimates, confidences 
    and blockers between epics. By default, the AutoScheduler works with the setup described in 
    <a href="https://www.bitovi.com/academy/learn-agile-program-management-with-jira.html">Learn Agile Program Management with Jira</a>. 
    If your Jira instance is different, you can make those changes here. 
    </p>
    <p  class=" pb-4">All configuration changes are saved to the URL. Remember to bookmark this page after your setup is complete.</p>
    <h2 class="text-lg font-bold">Epic JQL</h2>
    <div class="flex gap-6 flex-wrap pb-4">
      <div class="grow">
        
        <p class="text-base my-1">Specify a <a href="https://www.atlassian.com/software/jira/guides/jql/overview">JQL</a> used to load the epics you 
        want to schedule.</p>
        <p><input value:bind="this.issueJQL" class="w-full text-base form-border"/></p>
        
        {{# if(this.rawIssuesPromise.isRejected) }}
          <div class="border-solid-1px-slate-900 border-box block overflow-hidden bg-yellow-500 p-1">
            <p>There was an error loading from Jira!</p>
            <p>Error message: {{this.rawIssuesPromise.reason.errorMessages[0]}}</p>
            <p>Please check your JQL is correct!</p>
          </div>
        {{/ if }}
        <div class="flex justify-between mt-1">
      
          <p class="text-xs"><input type='checkbox' 
            class='self-start align-middle' checked:bind='this.loadChildren'/> <span class="align-middle">Load all children of JQL specified issues</span>
          </p>
          
          {{# if(this.rawIssuesPromise.isResolved) }}
            <p class="text-xs">Loaded {{this.rawIssues.length}} issues</p>
          {{/ if }}
          {{# if(this.rawIssuesPromise.isPending) }}
            <p class="text-xs text-right">Loading issues ...</p>
          {{/ if }}
        </div>


      </div>
      <div class="lg:w-112 bg-neutral-30 p-1 w-full">
        <p class="my-1 text-sm">
        JQL is a SQL-like syntax used to load issues. For more information, read <a href="https://www.atlassian.com/software/jira/guides/jql/overview">JQL Overview</a>.
        Use <code class="inline-code  whitespace-nowrap">issuekey in portfolioChildIssuesOf("KEY")</code> to load all issues for a single initiative.</p>
      </div>
    </div>
    <h2 class="text-lg font-bold">Median Estimate Field(s)</h2>
    <div class="flex gap-6 flex-wrap pb-4">
      <div class="grow">
        
        <p class="text-base my-1">What field(s) provide the median estimate?</p>
        <auto-complete 
          data:from="this.config.sortedFieldNames" 
          selected:bind="this.config.medianEstimateFields"
          inputPlaceholder:raw="Search for field"></auto-complete>
      </div>
      <div class="lg:w-112 bg-neutral-30 p-1 w-full">
        <p class="my-1 text-sm">
          The median estimate is the average amount of time the epic will take to complete.
          See <a href="https://www.bitovi.com/academy/learn-agile-program-management-with-jira/continuous-exploration-board.html#adding-custom-fields">Adding Custom Fields</a>
          for how to create a <code class="inline-code">Story points median</code> field.
        </p>
      </div>
    </div>

    <h2 class="text-lg font-bold">Confidence Field(s)</h2>
    <div class="flex gap-6 flex-wrap pb-4">
      <div class="grow">
        
        <p class="text-base my-1">What field(s) provide the confidence?</p>
        <auto-complete 
          data:from="this.config.sortedFieldNames" 
          selected:bind="this.config.confidenceFields"
          inputPlaceholder:raw="Search for field"></auto-complete>
      </div>
      <div class="lg:w-112 bg-neutral-30 p-1 w-full">
        <p class="my-1 text-sm">
          Confidence is how certain your team feels about the median estimate. 
          See the <a href="https://bitovi.github.io/statistical-software-estimator/">Statistical Software Estimator</a> for a deeper understanding 
          on how confidence and median estimate work together. 
          See <a href="https://www.bitovi.com/academy/learn-agile-program-management-with-jira/continuous-exploration-board.html#adding-custom-fields">Adding Custom Fields</a>
          for how to create a <code class="inline-code">Story points confidence</code> field.
        </p>
      </div>
    </div>


    <h2 class="text-lg font-bold">Adjusted Story Point Output Field</h2>
    <div class="flex gap-6 flex-wrap pb-4">
      <div class="grow">
        
        <p class="text-base my-1">What field should have the resulting story points?</p>
        <auto-complete 
          data:from="this.config.sortedFieldNames" 
          selected:bind="this.config.storyPointField"
          inputPlaceholder:raw="Search for field"></auto-complete>
      </div>
      <div class="lg:w-112 bg-neutral-30 p-1 w-full">
        <p class="my-1 text-sm">
          This AutoScheduler writes to the <code class="inline-code">Adjusted Story Point</code> field the adjusted story points 
          combining the median estimate and confidence. This should typically be Jira's default <code class="inline-code">Story points</code>
          field. See the <a href="https://bitovi.github.io/statistical-software-estimator/">Statistical Software Estimator</a> for a deeper understanding 
          on how confidence and median estimate work together. 
        </p>
      </div>
    </div>

    <h2 class="text-lg font-bold">Start Date Output Field</h2>
    <div class="flex gap-6 flex-wrap pb-4">
      <div class="grow">
        
        <p class="text-base my-1">What field should have the resulting story points?</p>
        <auto-complete 
          data:from="this.config.sortedFieldNames" 
          selected:bind="this.config.startDateField"
          inputPlaceholder:raw="Search for field"></auto-complete>
      </div>
      <div class="lg:w-112 bg-neutral-30 p-1 w-full">
        <p class="my-1 text-sm">
          The AutoScheduler writes epic start dates to the <code class="inline-code">Start date</code> field.
          This should typically be Jira's default <code class="inline-code">Start date</code> field.
        </p>
      </div>
    </div>

    <h2 class="text-lg font-bold">Due Date Output Field</h2>
    <div class="flex gap-6 flex-wrap pb-6">
      <div class="grow">
        
        <p class="text-base my-1">What field should have the resulting story points?</p>
        <auto-complete 
          data:from="this.config.sortedFieldNames" 
          selected:bind="this.config.dueDateField"
          inputPlaceholder:raw="Search for field"></auto-complete>
      </div>
      <div class="lg:w-112 bg-neutral-30 p-1 w-full">
        <p class="my-1 text-sm">
          The AutoScheduler writes epic end dates to the <code class="inline-code">Due date</code> field.
          This should typically be Jira's default <code class="inline-code">Due date</code> field.
        </p>
      </div>
    </div>

    <details class="border-yellow-500 border-solid border bg-white mt-4">
      <summary class="text-base p-3 bg-yellow-500 cursor-pointer">
        Advanced Configuration
      </summary>
      <div class="p-2">
        <p class="mb-4">The following configuration allows for complex rules to be provided to the AutoScheduler via 
          <a href="https://jsonlogic.com/">JsonLogic</a>.  If you need help, reach out on <a href="https://discord.gg/J7ejFsZnJ4">Bitovi's Discord</a>.
        </p>
        <h2 class="text-lg font-bold">Get Team Key</h2>
        <p>Given an issue, returns a key that represents which team will take on the work.</p>
        <jira-configure-json-logic rawIssues:from="this.rawIssues" jsonLogic:bind="this.config.getTeamKeyJsonLogic"/>
    
    
        <h2 class="text-lg font-bold">Get Days Per Sprint</h2>
        <p>Given a team, returns the number of work days in a sprint.</p>
        <jira-configure-json-logic rawIssues:from="this.rawIssues" jsonLogic:bind="this.config.getDaysPerSprintJsonLogic"/>
    
        <h2 class="text-lg font-bold">Get Confidence</h2>
        <p>Given an issue, returns the conflidence (from 0-100)</p>
        <jira-configure-json-logic rawIssues:from="this.rawIssues" jsonLogic:bind="this.config.getConfidenceJsonLogic"/>
    
        <h2 class="text-lg font-bold">Get Estimate</h2>
        <p>Given an issue, returns the amount of work in story points.</p>
        <jira-configure-json-logic rawIssues:from="this.rawIssues" jsonLogic:bind="this.config.getEstimateJsonLogic"/>
    
        <h2 class="text-lg font-bold">Get Parent Key</h2>
        <p>Given an issue, returns the container issue's key.</p>
        <jira-configure-json-logic rawIssues:from="this.rawIssues" jsonLogic:bind="this.config.getParentKeyJsonLogic"/>
    
    
        <h2 class="text-lg font-bold">Get Blocking Keys</h2>
        <p>Given an issue, returns an array of keys that the issue blocks.</p>
        <jira-configure-json-logic rawIssues:from="this.rawIssues" jsonLogic:bind="this.config.getBlockingKeysJsonLogic"/>
    
        <h2 class="text-lg font-bold">Types</h2>
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
      </div>

  </details>

    
  `;
  static props = {
    rawIssues: type.Any,
    rawIssuesPromise: type.Any,
    config: type.Any,
    _showTypeInfo: {Type: Boolean, default: false},
		
  }
  /*{
      value({resolve, lastSet, listenTo}) {
        if (lastSet.value) {
            resolve(lastSet.value)
        } else {
            const parsed = JSON.parse( new URL(window.location).searchParams.get(key) || defaultJSON );
            if(parsed && dateMatch.test(parsed)) {
              resolve( new Date(parsed) );
            } else {
              resolve( parsed );
            }
        }

        listenTo(lastSet, (value) => {
            const newUrl = new URL(window.location);
            const valueJSON = JSON.stringify(value);
            if(valueJSON !== defaultJSON) {
              newUrl.searchParams.set(key, valueJSON );
            } else {
              newUrl.searchParams.delete(key );
            }
            history.pushState({}, '', newUrl);
            resolve(value);
        })


        // calculate the default from fields 
        const findDefaults = (allFields)=> {
  
           allFields.filter( f => {
            const lowerFieldName = f.toLowerCase();
            return lowerFieldName.includes("story") && lowerFieldName.includes("points") && 
             ( lowerFieldName.includes("median") || lowerFieldName.includes("average") )
          })
        }
        
        listenTo("fields",({value})=>{

        })

        
      }*/


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
