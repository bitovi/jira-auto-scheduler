import { ObservableObject, type } from "//unpkg.com/can@6/core.mjs";

import jsonLogic from "./json-logic.js";
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


class Configure extends ObservableObject {
  static props = {
    issueLinkPrefix: saveToLocalStorage("issueLinkPrefix", "https://bitovi.atlassian.net/browse/"),

    ...makeLogicAndFunctionDefinition("getTeamKey", {"var": "Project key"}),

    ...makeLogicAndFunctionDefinition("getDaysPerSprint", 10),

    ...makeLogicAndFunctionDefinition("getConfidence", {
      "or": [
        {"+" :[
          0,
          // adds to the first element of the array
          { filter: [
            { merge: { var: "Custom field (Confidence)" } },
            { "!==": [{"var":""}, ""] }
          ]}
        ]},
        50
      ]} ),
    ...makeLogicAndFunctionDefinition("getEstimate", {
      "or": [
        {"+" :[
          0,
          // adds to the first element of the array
          { filter: [
            { merge: [{ var: "Custom field (Story Points)" }, {var: "Custom field (Story point estimate)"} ] },
            { "!==": [{"var":""}, ""] }
          ]}
        ]},
        50
      ]
    }),

    ...makeLogicAndFunctionDefinition("getParentKey", {"var": "Custom field (Parent Link)"}),
    ...makeLogicAndFunctionDefinition("getBlockingKeys", {"var": "Outward issue link (Blocks)"})
  };
}



export default new Configure();
