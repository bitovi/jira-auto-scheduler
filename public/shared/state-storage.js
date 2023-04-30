export function saveToLocalStorage(key, defaultValue) {
  return {
    value({lastSet, listenTo, resolve}) {
      resolve( JSON.parse( localStorage.getItem(key) ) || defaultValue );

      listenTo(lastSet, (value)=> {
        localStorage.setItem(key, JSON.stringify(value));
        resolve(value);
      })
    }
  }
}

export function saveJSONToUrl(key, defaultValue, Type){
	const defaultJSON = JSON.stringify(defaultValue);
	return {
			type: Type,
      value({ lastSet, listenTo, resolve }) {
          if (lastSet.value) {
              resolve(lastSet.value)
          } else {
              resolve(JSON.parse( new URL(window.location).searchParams.get(key) || defaultJSON ) );
          }

          listenTo(lastSet, (value) => {
              const newUrl = new URL(window.location);
							const valueJSON = JSON.stringify(value);
							if(valueJSON !== defaultJSON) {
								newUrl.searchParams.set(key, valueJSON );
							}
              history.pushState({}, '', newUrl);
              resolve(value);
          })
      }
  }
}
