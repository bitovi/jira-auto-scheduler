
class SimpleTooltip extends HTMLElement {
  static get observedAttributes() { return ['for']; }
  attributeChangedCallback(name, oldValue, newValue) {

  }
  connectedCallback(){
    this.enteredElement = this.enteredElement.bind(this);
    this.leftElement = this.leftElement.bind(this);
    this.forElement = this.getAttribute("for");
    this.style.display = "none";

    this.style.position = "fixed";
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
      this.style.top = (rect.bottom)+"px";
      this.style.left = (rect.left) +"px";
      this.style.display = "";
    }
  }
  leftElement(event) {
    this.style.display = "none";
  }
}
customElements.define("simple-tooltip", SimpleTooltip);
