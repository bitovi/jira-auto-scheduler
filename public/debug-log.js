const logLevel = window.localStorage.getItem("logLevel")

export default function log(...args){ 
    if(logLevel) {
        console.log(...args);
    }
    if(logLevel === "debug") {
        debugger;
    }
    
}