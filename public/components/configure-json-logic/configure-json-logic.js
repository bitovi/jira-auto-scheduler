import { StacheElement, type } from "//unpkg.com/can@6/core.mjs";

import jsonLogic from "../../json-logic/json-logic.js";

class JiraConfigureJSONLogic extends StacheElement {
  static view = `
    <textarea value:from='this.currentJsonLogicJSON'
      on:input='this.updateJSON(scope.element.value)'
      {{# if(this.unappliedChanges) }}class='dirty'{{/ if }}></textarea>
    <table>
      <tr><th>Summary</th><th>Result</th></tr>
      {{# for(example of this.examples)}}
        <tr>
          <td>{{example.issue.Summary}}</td>
          <td><code>{{example.jsonValue}}</code></td>
        </tr>
      {{/ }}
    </table>
    <button on:click="this.applyLogic()">Apply</button>
  `;
  static props = {
    rawIssues: type.Any,
    editorElement: type.Any,
    currentJsonLogic: type.Any,
    jsonLogic: type.Any
  };

  get currentJsonLogicJSON(){
    return JSON.stringify(this.currentJsonLogic, null, ' ');
  }
  get unappliedChanges(){
    return JSON.stringify(this.currentJsonLogic) !== JSON.stringify(this.jsonLogic);
  }
  updateJSON(json) {
    try {
      this.currentJsonLogic = JSON.parse(json);
    } catch(e) {
      console.log(e)
    }

  }
  get examples(){
    const json = this.currentJsonLogic;

    try {
      return this.rawIssues.map( (issue)=> {
        const value = jsonLogic.apply(json, issue);
        return {
          issue: issue,
          value,
          jsonValue: JSON.stringify(value)
        }
      }).filter( example => example.value !== "" ).slice(0,10);
    } catch (e) {
      return [{issue: {Summary: "Error"}, value: e, jsonValue: e.message}]
    }

  }

  applyLogic(){
    console.log("setting");
    this.jsonLogic = this.currentJsonLogic;
  }

  connected(){
    this.currentJsonLogic = this.jsonLogic;

    /*const editor = new JSONEditor(this.editorElement, {
        onChange: ()=> {
          this.currentJsonLogic = editor.get()
        }
    }, this.currentJsonLogic );

    this.listenTo("jsonLogic",({value})=> {
      if(JSON.stringify(value) !== editor.getText()) {
        this.currentJsonLogic = value;
        editor.set(value);
      }
    })*/

  }


}
customElements.define("jira-configure-json-logic", JiraConfigureJSONLogic);
export default JiraConfigureJSONLogic;
