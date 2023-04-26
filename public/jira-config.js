import { ObservableObject, type } from "//unpkg.com/can@6/core.mjs";

import jsonLogic from "./json-logic/json-logic.js";
window.jsonLogic = jsonLogic;


function saveToLocalStorage(key, defaultValue) {
  return {
    value({lastSet, listenTo, resolve}) {
      resolve( JSON.parse( localStorage.getItem(key) ) || defaultValue );

      listenTo(lastSet, (value)=> {
        localStorage.setItem(key, JSON.stringify(value));
        resolve(value);
      })
    }
  }
}

function saveToUrl(key, defaultValue){
	const defaultJSON = JSON.stringify(defaultValue);
	return {
      value({ lastSet, listenTo, resolve }) {
          if (lastSet.value) {
              resolve(lastSet.value)
          } else {
              resolve(JSON.parse( new URL(window.location).searchParams.get(key) || defaultJSON ) );
          }

          listenTo(lastSet, (value) => {
              const newUrl = new URL(window.location);
							const valueJSON = JSON.stringify(value);
							if(valueJSON !== defaultJSON) {
								newUrl.searchParams.set(key, valueJSON );
							}
              history.pushState({}, '', newUrl);
              resolve(value);
          })
      }
  }
}


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
    [key+"JsonLogic"]: saveToUrl(key, defaultValue),
    [key]: getJsonLogicFunction(key+"JsonLogic")
  };
}


class Configure extends ObservableObject {
  static props = {
		issueJQL: saveToUrl("issueJQL", "issueType = Epic"),
		issueFields: saveToUrl("issueFields", [
			"Summary",
			"Start date",
			"Due date",
			"Issue Type",
			"Story Points",
			"status",
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
            { merge: [{var: "Story Points Confidence"},{ var: "Confidence" }] },
            { "!==": [{"var":""}, null] }
          ]}
        ]},
        50
      ]} ),
    ...makeLogicAndFunctionDefinitionSaveToUrl("getEstimate", {
      "or": [
        {"+" :[
          0,
          // adds to the first element of the array
          { filter: [
            { merge: [{var: "Story Points"} ] },
            { "!==": [{"var":""}, null] }
          ]}
        ]},
        50
      ]
    }),

    ...makeLogicAndFunctionDefinition("getParentKey", {"var": "Custom field (Parent Link)"}),
    ...makeLogicAndFunctionDefinition("getBlockingKeys", {"var": "linkedIssues.blocks"})
  };
}



export default new Configure();
