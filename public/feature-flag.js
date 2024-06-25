const flags = {};
function toBoolean(b){
    return !!b;
}

export function defineFeatureFlag(key, description, convertValue, defaultValue = "ON"){
    convertValue = convertValue || toBoolean;
    flags[key] = readFeatureFlag();
    Object.defineProperty(flags, key+" read details",{
        get: function(){
            console.log(
`== ${key} ==

Current Value: ${ readFeatureFlag() }
--------
${description}
`);

        }
    })
    Object.defineProperty(flags, key+ " toggle value", {
        get(){
            if(readFeatureFlag()) {
                localStorage.removeItem(key)
            } else {
                localStorage.setItem(key, defaultValue)
            }
            window.location.reload();
        }
    })

    function readFeatureFlag(){
        const value = localStorage.getItem(key);
        return convertValue(value);
    }
    return readFeatureFlag;
}

setTimeout(()=> {
    console.log("Feature Flags", flags)
}, 1000);


