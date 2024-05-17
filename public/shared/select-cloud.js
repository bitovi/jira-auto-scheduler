import { StacheElement, type, stache } from "../can.js";
import SimpleTooltip from "./simple-tooltip.js";



const resourceSelection = stache(`<div class="bg-white rounded-sm shadow p-3 z-50">
    {{# for(resource of this.resources) }}
        <button class="link block" on:click="this.setResource(resource)">{{resource.name}}</button>
    {{/ for }}
</div>`)

const pillClass = `text-center inline-flex items-center mr-8 bg-gray-100 rounded-lg pt-1 pr-1 font-bitovipoppins font-lg`

export default class SelectCloud extends StacheElement {
    static view = `
        {{# if(this.alternateResources.isPending) }}
            <div class="${pillClass}"> ... </div>
        {{/ if }}
        {{# if(this.alternateResources.value.length)}}
            <button class="${pillClass} pl-2 hover:bg-gray-200"
                on:click="this.showResources()">
                {{# if(this.currentResource.value.name) }}<span>{{this.currentResource.value.name}}</span>{{/if}}
                <svg class="w-2.5 h-2.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
                </svg>
            </button>
        {{/ if }}
        {{# and(not(this.alternateResources.value.length), this.currentResource.value.name) }}
            <div class="${pillClass} pl-2">
                {{this.currentResource.value.name}}
            </div>
        {{/and}}

    `;
    static props = {
        jiraHelpers: type.Any,
        loginComponent: type.Any,
        get canQuery(){
            return this.jiraHelpers && this.loginComponent?.isLoggedIn;
        },
        get accessibleResources() {
            if(this.canQuery) {
                return this.jiraHelpers.fetchAccessibleResources().then((resources)=>{
                    const currentCloudId = localStorage.getItem("scopeId")
                    return resources.map((resource)=>{
                        return {
                            ...resource,
                            isCurrent: resource.id === currentCloudId
                        }
                    })
                });
            } else {
                return Promise.resolve([])
            }
        },
        get currentResource(){
            return this.accessibleResources.then( resources => {
                return resources.find( r => r.isCurrent )
            })
        },
        get alternateResources(){
            return this.accessibleResources.then( resources => {
                return resources.filter( r => !r.isCurrent )
            })
        }
    };
    showResources(){
        const div = document.createElement("div");
        this.alternateResources.then((resources) => {
            // come back acround and fix this
            
            
            this.simpleTooltip.belowElementInScrollingContainer(this, resourceSelection({
                resources,
                setResource(resource) {
                    localStorage.setItem("scopeId", resource.id);
                    window.location.reload();
                }
            }) );
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
    connected(){
        
        const simpleTooltip = new SimpleTooltip();
        this.parentNode.append(simpleTooltip);
        this.simpleTooltip = simpleTooltip;

    }
}


customElements.define("select-cloud", SelectCloud);


