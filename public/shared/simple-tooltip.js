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
    belowElementInScrollingContainer(element, DOM){
    
      // find if there's a scrolling container and move ourselves to that 
      const container = findScrollingContainer(element);
      this.innerHTML = "";
      container.appendChild(this);
      // find the relative position 
      this.style.top = "-1000px";
      this.style.left = "-1000px";
      if(typeof DOM === "string") {
        this.innerHTML = DOM;
      } else {
        this.appendChild(DOM);
      }
      
      this.style.display = "";
      
      // where is the container on the page
      const containerRect = container.getBoundingClientRect(),
        // where is the element we are positioning next to on the page
        elementRect = element.getBoundingClientRect(),
        // how big is the tooltip
        tooltipRect = this.getBoundingClientRect();
      
      const containerStyles = window.getComputedStyle(container)
      // how much room is there 
      
      // where would the tooltip's bottom reach in the viewport 
      const bottomInWindow = elementRect.bottom + tooltipRect.height;
      // if the tooltip wouldn't be visible "down"
      if(bottomInWindow > window.innerHeight) {
        const viewPortPosition = ( elementRect.top - tooltipRect.height );
        const posInContainer = viewPortPosition - containerRect.top -  parseFloat( containerStyles.borderTopWidth, 10);
        const posInContainerAccountingForScrolling = posInContainer + container.scrollTop;
        this.style.top = ( posInContainerAccountingForScrolling )+"px";
      } else {
        const topFromContainer = elementRect.bottom - containerRect.top;
        this.style.top = topFromContainer +"px";
      }
  
      const leftFromContainer = elementRect.left - containerRect.left;
      this.style.left = leftFromContainer +"px";
      
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
  customElements.define("simple-tooltip", SimpleTooltip);
  export default SimpleTooltip;



  function findScrollingContainer(element){
    let cur = element.parentElement;
    while(cur && cur.scrollHeight === cur.clientHeight) {
      cur = cur.parentElement;
    }
    if(!cur) {
      return document.body
    } else {
      return cur;
    }
  }