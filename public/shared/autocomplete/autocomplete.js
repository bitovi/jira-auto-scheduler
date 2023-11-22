import { StacheElement, type, ObservableObject, fromAttribute } from "../../can.js";
import SimpleTooltip from "../simple-tooltip.js";

// create global tooltip reference

const TOOLTIP = new SimpleTooltip();

document.body.append(TOOLTIP);

class AutoCompleteSuggestions extends StacheElement {
    static view = `
        
        <ul class="max-h-80 overflow-y-auto">
            {{# if(this.data.length) }}
                {{# for(item of this.data) }}
                    <li class="px-2 hover:bg-blue-75 cursor-pointer" on:click="this.add(item)">{{item}}</li>
                {{/ for }}
            {{ else }}
                <li>No matches</li>
            {{/ if }}
        </ul>
    `;
}
customElements.define("auto-complete-suggestions", AutoCompleteSuggestions);

class AutoComplete extends StacheElement {
    static view = `
        <div class="flex gap-2 align-middle flex-wrap">
            {{# for(item of this.selected) }}
                <div class="border-neutral-800 border-solid border rounded-md whitespace-nowrap">
                    <label class="inline p-1">{{item}}</label>
                    <button class="text-red-500 text-sm py-1 px-2 bg-neutral-30 font-semibold rounded-r shadow-sm hover:bg-neutral-40" on:click="this.remove(item, scope.event)">x</button>
                </div>
            {{/ for }}
            <input class="form-border rounded-md px-1 placeholder:italic placeholder:text-slate-400" 
                placeholder="{{this.inputPlaceholder}}"
                on:focus="this.suggestItems(scope.element.value)"
                on:input="this.suggestItems(scope.element.value)">
        </div>
    `;
    static props = {
        data:  {type: type.Any},
        selected: {type: type.Any},
        showingSuggestions: {type: Boolean, default: false}
    };
    remove(item, event) {
        event.preventDefault();
        this.selected = this.selected.filter( (selectedItem)=> {
            return selectedItem != item;
        });
    }
    add(item) {
        this.selected = [...this.selected, item ];
        this.querySelector("input").value = "";
        this.stopShowingSuggestions();
    }
    suggestItems(searchTerm){
        const matches = this.data.filter( item => {
            return item.toLowerCase().includes(searchTerm) && !this.selected.includes(item)
        })
        this.showingSuggestions = true;
        // this could be made more efficient, but is probably ok
        TOOLTIP.belowElement(this, 
            new AutoCompleteSuggestions().initialize({
                searchTerm,
                data: matches,
                add: this.add.bind(this)
            })
        );
    }
    connected() {
        // handle when someone clicks off the element
        this.listenTo(window, "click", (event)=>{
            // if we aren't showing, don't worry about it
            if(!this.showingSuggestions) {
                return;
            }
            // do nothing if the input was clicked on
            if(this.querySelector("input") === event.target) {
                return
            }
            // do nothing if the TOOLTIP was clicked
            if(TOOLTIP.contains(event.target)) {
                return;
            }
            this.stopShowingSuggestions()
        })
    }
    stopShowingSuggestions(){
        TOOLTIP.leftElement();
        this.showingSuggestions = false;
    }
}


customElements.define("auto-complete", AutoComplete);

export default AutoComplete;