import { ObservableObject, type } from "//unpkg.com/can@6/core.mjs";

import jsonLogic from "./json-logic/json-logic.js";
import {saveJSONToUrl, saveToLocalStorage} from "./shared/state-storage.js";

window.jsonLogic = jsonLogic;





function getJsonLogicFunction(key) {
  return {
    get(){
      const keyValue = this[key];
      return function(issue){
        return jsonLogic.apply(keyValue, issue );
      };
    }
  }
}





function makeLogicAndFunctionDefinition(key, defaultValue){
  return {
    [key+"JsonLogic"]: saveToLocalStorage(key, defaultValue),
    [key]: getJsonLogicFunction(key+"JsonLogic")
  };
}

function makeLogicAndFunctionDefinitionSaveToUrl(key, defaultValue){
  return {
    [key+"JsonLogic"]: saveJSONToUrl(key, defaultValue),
    [key]: getJsonLogicFunction(key+"JsonLogic")
  };
}


export class Configure extends ObservableObject {
  static props = {
		fields: {type: type.Any},
    get sortedFieldNames(){

			return this.fields.list.sort( (f1, f2)=>{
				return f1.name > f2.name ? 1 : -1
			}).map( f=> f.name );
	  },
    medianEstimateFields: saveJSONToUrl(
      "medianEstimateFields", 
      function(){
        return this.sortedFieldNames.filter( f => {
          const lowerFieldName = f.toLowerCase();
          return lowerFieldName.includes("story") && lowerFieldName.includes("points") && 
          ( lowerFieldName.includes("median") || lowerFieldName.includes("average") ) 
        } )
      },
      type.Any),
    confidenceFields: saveJSONToUrl(
      "confidenceFields", 
      function(){
        const haveConfidence = this.sortedFieldNames.filter( f => {
          const lowerFieldName = f.toLowerCase();
          return lowerFieldName.includes("confidence")  
        });
        if(haveConfidence.length > 1) {
          return haveConfidence.filter( field => field.toLowerCase().includes("story"))
        } else {
          return haveConfidence;
        }
      },
      type.Any),
    storyPointField: saveJSONToUrl(
      "storyPointField", 
      function(){
        const storyPoints = this.sortedFieldNames.filter( f => {
          const lowerFieldName = f.toLowerCase();
          return lowerFieldName === "Story points"
        });
        if(storyPoints.length  === 1) {
          return storyPoints;
        } else {
          return this.sortedFieldNames.filter( f => {
            const lowerFieldName = f.toLowerCase();
            return lowerFieldName.includes("story") && lowerFieldName.includes("points") && 
            !( lowerFieldName.includes("median") || lowerFieldName.includes("average") || lowerFieldName.includes("confidence") ) 
          });
        }
      },
      type.Any),
    startDateField: saveJSONToUrl(
      "startDateField", 
      function(){
        const startDate = this.sortedFieldNames.filter( f => f === "Start date");
        return startDate.length ? [startDate[0]] :[]
      },
      type.Any),
    dueDateField: saveJSONToUrl(
      "dueDateField", 
      function(){
        const dueDate = this.sortedFieldNames.filter( f => f === "Due date");
        return dueDate.length ? [dueDate[0]] :[]
      },
      type.Any),

    // we need to know this right away
    get issueFields(){
      return ["Summary", "Issue Type","status","Linked Issues", 
        this.startDateField, this.dueDateField,
        ...this.medianEstimateFields, ...this.confidenceFields, ...this.storyPointField]
    },
    /*
		issueFields: saveJSONToUrl("issueFields", [
			"Summary",
			"Start date",
			"Due date",
			"Issue Type",
			"Story points median",
			"Story points",
			"status",
			"Story points confidence",
			"Story Points Confidence",
			"Confidence",
			"Linked Issues"
		]),*/

    ...makeLogicAndFunctionDefinition("getTeamKey", {"var": "Project key"}),

    ...makeLogicAndFunctionDefinition("getDaysPerSprint", 10),

    ...makeLogicAndFunctionDefinitionSaveToUrl("getConfidence", function(){
      return {var: this.confidenceFields[0]}
    } ),
    ...makeLogicAndFunctionDefinitionSaveToUrl("getEstimate", function(){
      return {var: this.medianEstimateFields[0]}
    }),

    ...makeLogicAndFunctionDefinition("getParentKey", {"var": "Custom field (Parent Link)"}),
    ...makeLogicAndFunctionDefinition("getBlockingKeys", {"var": "linkedIssues.blocks"})
  };
}



/*
{
      "or": [
        {"+" :[
          0,
          // adds to the first element of the array
          { filter: [
            { merge: [{var: "Story points median"},{ var: "Story Points" } ] },
            { "!==": [{"var":""}, null] }
          ]}
        ]},
        undefined
      ]
    }
*/