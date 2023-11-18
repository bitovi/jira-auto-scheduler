class SimpleTooltip extends HTMLElement {
    static get observedAttributes() { return ['for']; }
    attributeChangedCallback(name, oldValue, newValue) {
  
    }
    connectedCallback(){
      this.enteredElement = this.enteredElement.bind(this);
      this.leftElement = this.leftElement.bind(this);
      this.forElement = this.getAttribute("for");
      this.style.display = "none";
  
      this.style.position = "absolute";
    }
    disconnectedCallback(){
      if(this._forElement) {
        this._forElement.removeEventListener("mouseenter", this.enteredElement);
        this._forElement.removeEventListener("mouseenter", this.leftElement);
      }
    }
    set forElement(element){
      if(typeof element === "string") {
        element = document.querySelectorAll(element);
      }
      if(this._forElement) {
        this._forElement.removeEventListener("mouseenter", this.enteredElement);
        this._forElement.removeEventListener("mouseenter", this.leftElement);
      }
      if(element) {
        element.addEventListener("mouseenter", this.enteredElement);
        element.addEventListener("mouseenter", this.leftElement);
      }
      this._forElement = element;
    }
    enteredElement(event, html){
      if(arguments.length > 1) {
        this.innerHTML = html;
        var rect = event.currentTarget.getBoundingClientRect();
        this.style.top = (window.scrollY + rect.bottom)+"px";
        this.style.left = (window.scrollX + rect.left) +"px";
        this.style.display = "";
      }
    }
    belowElement(element, DOM) {
        if(arguments.length > 1) {
            this.innerHTML = "";
            this.appendChild(DOM);
            var rect = element.getBoundingClientRect();
            this.style.top = (window.scrollY + rect.bottom)+"px";
            this.style.left = (window.scrollX + rect.left) +"px";
            this.style.display = "";
        }
    }
    centeredBelowElement(element, html) {
      if(arguments.length > 1) {
        this.innerHTML = html;
        
        this.style.top = "-1000px";
        this.style.left = "-1000px";

        this.style.display = "";
        const tooltipRect = this.getBoundingClientRect();

        this.style.display = "";
        var rect = element.getBoundingClientRect();



        this.style.top = (window.scrollY + rect.bottom)+"px";
        this.style.left = (window.scrollX + rect.left + (rect.width / 2) - (tooltipRect.width / 2)) +"px";

        
      }
    }
    leftElement(event) {
      this.style.display = "none";
    }
  }
  customElements.define("simple-tooltip", SimpleTooltip);
  export default SimpleTooltip;