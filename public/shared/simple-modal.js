class SimpleModal extends HTMLElement {
    static get observedAttributes() { return ['for']; }
    attributeChangedCallback(name, oldValue, newValue) {
  
    }
    connectedCallback(){
      this.enteredElement = this.enteredElement.bind(this);
      this.leftElement = this.leftElement.bind(this);
      this.forElement = this.getAttribute("for");
      this.innerHTML = `<div></div>`
      Object.extend(this.style,{
        display: "none",
        position: "fixed",
        left: "20%",
        right: "20%",
        top: "20%",
        bottom: "20%"
      });
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
        this.style.top = "-1000px";
        this.style.left = "-1000px";
        
        this.innerHTML = html;
        
        this.style.display = "";
        const tooltipRect = this.getBoundingClientRect();

        var rect = element.getBoundingClientRect();
        this.style.top = (window.scrollY + rect.bottom)+"px";
        this.style.left = (window.scrollX + rect.left + (rect.width / 2) - (tooltipRect.width / 2)) +"px";
      }
    }
    topRightOnElementBottomRight(element, html) {
      if(arguments.length > 1) {
        this.style.top = "-1000px";
        this.style.left = "-1000px";

        if(typeof html === "string") {
          this.innerHTML = html;
        } else {
          this.innerHTML = "";
          this.appendChild(html);
        }
        
        
        this.style.display = "";

        const tooltipRect = this.getBoundingClientRect();
        const rect = element.getBoundingClientRect();

        this.style.top = (window.scrollY + rect.bottom)+"px";
        this.style.left = (window.scrollX + rect.left + (rect.width) - (tooltipRect.width)) +"px";
      }
    }
    leftElement(event) {
      this.style.display = "none";
    }
  }
  customElements.define("simple-modal", SimpleModal);
  export default SimpleModal;