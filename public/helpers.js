export function makeObjectMapByKey(issues, key) {
  // could replace with native methods
  // return Object.fromEntries(issues.map((issue) => [issue[key], issue]));
  var map = {};
  issues.forEach((issue) => {
    map[issue[key]] = issue;
  });
  return map;
}

export function makeFilterByPropertyNotEqualToOneOfValues(property, values) {
  return function (issue) {
    return !values.includes(issue[property]);
  };
}

export function groupByKey(issues, key) {
  var map = {};
  issues.forEach((issue) => {
    var value = typeof key === "function" ? key(issue) : issue[key];

    if (!map[value]) {
      map[value] = [];
    }
    map[value].push(issue);
  });
  return map;
}

export function splitByHavingPropertyValue(issues, splitProperty) {
  return partition(issues, function (issue) {
    return issue[splitProperty];
  });
}

export function partition(array, filter, thisArg) {
  var falsy = [];
  var truthy = [];
  array.forEach((issue, i) => {
    if (filter.call(thisArg, issue, i)) {
      truthy.push(issue);
    } else {
      falsy.push(issue);
    }
  });
  return { falsy, truthy };
}

export function stringToArray(value) {
  if (typeof value === "string") {
    return [value];
  } else {
    return value;
  }
}
