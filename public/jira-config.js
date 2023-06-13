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


class Configure extends ObservableObject {
  static props = {
		issueJQL: saveJSONToUrl("issueJQL", "issueType = Epic"),
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
		]),

    ...makeLogicAndFunctionDefinition("getTeamKey", {"var": "Project key"}),

    ...makeLogicAndFunctionDefinition("getDaysPerSprint", 10),

    ...makeLogicAndFunctionDefinitionSaveToUrl("getConfidence", {
      "or": [
        {"+" :[
          0,
          // adds to the first element of the array
          { filter: [
            { merge: [{var: "Story points confidence"},{ var: "Confidence" }] },
            { "!==": [{"var":""}, null] }
          ]}
        ]},
        undefined
      ]} ),
    ...makeLogicAndFunctionDefinitionSaveToUrl("getEstimate", {
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
    }),

    ...makeLogicAndFunctionDefinition("getParentKey", {"var": "Custom field (Parent Link)"}),
    ...makeLogicAndFunctionDefinition("getBlockingKeys", {"var": "linkedIssues.blocks"})
  };
}



export default new Configure();
