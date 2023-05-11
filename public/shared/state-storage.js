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

const dateMatch = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function saveJSONToUrl(key, defaultValue, Type){
	const defaultJSON = JSON.stringify(defaultValue);
	return {
			type: Type,
      value({ lastSet, listenTo, resolve }) {
          if (lastSet.value) {
              resolve(lastSet.value)
          } else {
							const parsed = JSON.parse( new URL(window.location).searchParams.get(key) || defaultJSON );
							if(parsed && dateMatch.test(parsed)) {
								resolve( new Date(parsed) );
							} else {
								resolve( parsed );
							}
          }

          listenTo(lastSet, (value) => {
              const newUrl = new URL(window.location);
							const valueJSON = JSON.stringify(value);
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
