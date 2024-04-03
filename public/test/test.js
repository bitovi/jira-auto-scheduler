export const test = (function(){
    return function(name, test){
      function assert(value, name) {
        if(!value) {
          throw new Error(name, {cause: value})
        }
      }
      const passedCases = [];
      assert.equal = function(result, expected, testCaseName){
        if(result !== expected) {
  
          const e = new Error(name+":"+testCaseName, {cause: {expected, result}});
          if(!e.cause) {
            e.cause =  {expected, result};
          }
          throw e;
        } else {
            passedCases.push(testCaseName);
        }
      }
      try {
        Promise.resolve( test(assert) ).then( ()=> {
          console.log("PASSED", name, {passedCases});
        });
  
      } catch(e) {
        console.error(e);
        console.log(e.cause);
      }
    }
  })();