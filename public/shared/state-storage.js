export function saveToLocalStorage(key, getDefault) {
  return {
    value({lastSet, listenTo, resolve}) {
      const defaultValue = typeof getDefault === "function" ? getDefault.call(this) : getDefault;

      resolve( JSON.parse( localStorage.getItem(key) ) || defaultValue );

      listenTo(lastSet, (value)=> {
        localStorage.setItem(key, JSON.stringify(value));
        resolve(value);
      })
    }
  }
}

export const booleanParsing = {
  parse: x => {
    return ({"": true, "true": true, "false": false})[x];
  },
  stringify: x => ""+x
};

const dateMatch = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function saveJSONToUrl(key, defaultValue, Type, converter = JSON){
	const {stringify, parse} = converter;
	
	return {
			type: Type,
      value({ lastSet, listenTo, resolve }) {
          const defaultJSON = stringify(typeof defaultValue === "function" ? defaultValue.call(this) : defaultValue);
          if (lastSet.value) {
              resolve(lastSet.value)
          } else {
							const parsed = parse( new URL(window.location).searchParams.get(key) || defaultJSON );
							if(parsed && dateMatch.test(parsed)) {
								resolve( new Date(parsed) );
							} else {
								resolve( parsed );
							}
          }

          listenTo(lastSet, (value) => {
              const newUrl = new URL(window.location);
							const valueJSON = stringify(value);
							if(valueJSON !== defaultJSON) {
								newUrl.searchParams.set(key, valueJSON );
							} else {
								newUrl.searchParams.delete(key );
							}
              history.pushState({}, '', newUrl);
              resolve(value);
          })
      }
  }
}

function addToLocalStorage(key, value, count=10){
  const currentLocalStorageValue = localStorage.getItem(key);
  let values = [];
  try{
    values = JSON.parse(currentLocalStorageValue);
  } catch(e) {

  }

  if(!Array.isArray(values)) {
    values = [];
  }

  values.unshift(value);

  values = [...new Set(values)];

  localStorage.setItem(key, JSON.stringify(values));
}

export function saveJSONToUrlAndToLocalStorage(key, defaultValue, Type, converter = JSON){
  const {stringify, parse} = converter;
  return {
    type: Type,
    value({ lastSet, listenTo, resolve }) {
        const defaultJSON = stringify(typeof defaultValue === "function" ? defaultValue.call(this) : defaultValue);
        if (lastSet.value) {
            resolve(lastSet.value)
        } else {
            const urlValue = new URL(window.location).searchParams.get(key);
            const localStorageKeyValue =  localStorage.getItem(key);
            let parsed = parse( defaultJSON );
            try {
              if(urlValue) {
                parsed = parse( urlValue );
              } 
              else if(localStorageKeyValue) {
                const items = JSON.parse(localStorageKeyValue);
                if(Array.isArray(items) && items.length) {
                  parsed = items[0];
                }
              }
            } catch(e) {

            }
            
            if(parsed && dateMatch.test(parsed)) {
              resolve( new Date(parsed) );
            } else {
              resolve( parsed );
            }
        }

        listenTo(lastSet, (value) => {
            const newUrl = new URL(window.location);
            const valueJSON = stringify(value);
            if(valueJSON !== defaultJSON) {
              newUrl.searchParams.set(key, valueJSON );
            } else {
              newUrl.searchParams.delete(key );
            }
            history.pushState({}, '', newUrl);

            addToLocalStorage(key, value)

            resolve(value);
        })
    }
}
}