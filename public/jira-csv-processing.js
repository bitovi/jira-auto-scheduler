const papaPromise = new Promise(function(resolve, reject){
  const script = document.createElement("script");
  script.src = "https://unpkg.com/papaparse@5.3.0/papaparse.min.js";

  script.onload = function(){
    resolve(Papa)
  };
  document.head.appendChild(script);
});

export function getCSVResultsFromUrl(url){

  return new Promise(function(resolve){
    papaPromise.then(function(Papa){
      Papa.parse(url,{
        download: true,
        // rest of config ...
        complete: function(results, file) {
          resolve(results);
        }
      });
    });
  });
}

export function getCSVResultsFromFile(file) {
  return new Promise(function(resolve){
    papaPromise.then(function(Papa){
      Papa.parse(file, {
        complete: function(results, file) {
          resolve(results);
        }
      });
    });
  })
}

export function makeObjectsFromRows(rows) {
    var headers = rows[0];
    const issues = [];
    for(let i = 1; i < rows.length; i++) {
        let issue = {};
        let row = rows[i]
        let lastHeader = null;
        for(let c = 0; c < headers.length; c++) {
            let currentHeader = headers[c];
            if(currentHeader === lastHeader) {
                if( !Array.isArray(issue[currentHeader]) ) {
                    issue[currentHeader] = [ issue[currentHeader] ]
                }
                issue[currentHeader].push(row[c]);
            } else {
                issue[currentHeader] = row[c];
            }
            lastHeader = currentHeader;
        }
        if(issue["Issue key"]) {
            issues.push(issue);
        }

    }
    return issues;
}
