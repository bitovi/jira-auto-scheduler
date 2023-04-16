import jsonLogic from "../json-logic.js";


const test = (function(){
  return function(name, test){
    function assert(value, name) {
      if(!value) {
        throw new Error(name, {cause: value})
      }
    }
    assert.equal = function(result, expected, testCaseName){
      if(result !== expected) {

        const e = new Error(name+":"+testCaseName, {cause: {expected, result}});
        if(!e.cause) {
          e.cause =  {expected, result};
        }
        throw e;
      }
    }
    try {
      Promise.resolve( test(assert) ).then( ()=> {
        console.log("PASSED", name);
      });

    } catch(e) {
      console.error(e);
      console.log(e.cause);
    }
  }
})();

const isComplete = {
  "if": [
    {"==": [{var: "Status"}, "Ready to Test"]}, true,
    {"==": [{var: "Status"}, "QA Testing"]}, true,
    {"==": [{var: "Status"}, "Closed"]}, true,
    {"==": [{var: "Status"}, "Customer Acceptance Testing"]}, true,
    {"==": [{var: "Status"}, "Release Candidate"]}, true,
    {"==": [{var: "Status"}, "Canceled"]}, true,
    {"==": [{var: "Status"}, "Testing"]}, true,
    {"==": [{var: "Status"}, "Done"]}, true,
    false
  ]
}

test("story complete points", function({equal}){
  equal(jsonLogic.apply(isComplete,{Status: "Ready to Test"}), true,
    "got the right value");

  equal(jsonLogic.apply(isComplete,{Status: "Anything else"}), false,
    "got the right value");



});

const getPendingRawChildrenStoryPoints = {
  "map": [
    {"var": "_children"},
    {"if": [
      {"!": isComplete},
      {"var": "Custom field (Story Points)"},
      ""
    ]}]
}

const getAllRawChildrenStoryPoints = {
  "map": [
    {"var": "_children"},
    {"var": "Custom field (Story Points)"} ]
}



function makeChildrenStoryPoints(getChildrenStoryPoints) {

  const filterChildrenStoryPoints = {
    "filter": [
      getChildrenStoryPoints,
      {"!==": [ { "var": "" }, "" ]}
    ]
  };

  const childrenStoryPointsToNumbers = {
    "map": [
      filterChildrenStoryPoints,
      {"+": [0,{"var": ""}] }
    ]
  }

  return {
    "reduce": [
      childrenStoryPointsToNumbers,
      {"+":[{"var":"current"}, {"var":"accumulator"}]},
      0
    ]
  };
}

const getPendingChildrenStoryPoints = makeChildrenStoryPoints(getPendingRawChildrenStoryPoints)

test("pending children sum", function( {equal} ){
  const example = {
    _children: [
      { "Custom field (Story Points)": "10" },
      { "Custom field (Story Points)": "5" },
      { "Custom field (Story Points)": "" },

      { "Custom field (Story Points)": "10", Status: "Closed" },
      { "Custom field (Story Points)": "5", Status: "QA Testing" },
      { "Custom field (Story Points)": "", Status: "Ready to Test" }
    ]
  };

  let result = jsonLogic.apply(getPendingChildrenStoryPoints,example);
  equal(result, 15, "got the right value");

});

const epicStoryPoints = {"reduce": [
    {"merge": [
      { "var": "Custom field (Story Points)" },
      { "var": "Custom field (Story point estimate)" }] },
    {
      "if": [
        {and: [{"!==": [ {"var":"current"}, "" ] }, {"!==": [ {"var":"current"}, null ] }]},
        {"+": [{"var":"accumulator"}, {"var":"current"}] },
        {"var":"accumulator"}
      ]
    },
    0
 ]
}


test("epicStoryPoints", function({equal}){
  equal( jsonLogic.apply(epicStoryPoints, {}), 0, "no props is 0 points" );
})


// The RULE
// if the epic has more story points than the children total, use epic points - completed children.
// if their are children, use "remaining children"
// if the epic has story points, use those
// if the epic has children, use those or substract
// if the epic has "Custom field (T-shirt Size)", use that

const getAllChildrenStoryPoints = makeChildrenStoryPoints(getAllRawChildrenStoryPoints);

function makeReduce(value) {
  return {
    "reduce": [
      value,
      {"if": [
        {and: [{"!==": [ {"var":"current"}, "" ] }, {"!==": [ {"var":"current"}, null ] }]},
        {"var":"current" },
        {"var":"accumulator"}
      ]},
      ""
    ]
  }
}

const getTShirtSize = {
  "if": [
    {"==": [makeReduce({var: "Custom field (T-shirt Size)"}), "Small"]}, 15,
    {"==": [makeReduce({var: "Custom field (T-shirt Size)"}), "Medium"]}, 30,
    {"==": [makeReduce({var: "Custom field (T-shirt Size)"}), "Large"]}, 45,
    null
  ]
};
test("get t-shirt size", function( {equal} ){

  equal( jsonLogic.apply(getTShirtSize, {
    "Custom field (T-shirt Size)": ["Large",""]
  }), 45, "no children, 1 story point" );

})
const finalRule = {
  "if": [
    { ">": [epicStoryPoints, getAllChildrenStoryPoints] },
    { "-": [epicStoryPoints, getPendingChildrenStoryPoints]},

    { "!==": [getPendingChildrenStoryPoints,0]},
    getPendingChildrenStoryPoints,

    { "!==": [getTShirtSize,null]},
    { "-": [getTShirtSize, getPendingChildrenStoryPoints]},

    3.14
  ]
}

test("final rule", function( {equal} ){

  equal( jsonLogic.apply(finalRule, {
    "Custom field (Story Points)": 1
  }), 1, "no children, 1 story point" );

  equal( jsonLogic.apply(finalRule, {
    _children: [{
      "Custom field (Story Points)": 1
    }]
  }), 1, "just one pending child" );


  equal( jsonLogic.apply(finalRule, {
    "Custom field (Story Points)": 3,
    _children: [{
      "Custom field (Story Points)": 1
    }]
  }), 2, "just one pending child where epic has story points" );


  equal( jsonLogic.apply(finalRule, {
    "Custom field (Story Points)": 3,
    _children: [
      { "Custom field (Story Points)": 1 },
      { "Custom field (Story Points)": 4 }
    ]
  }), 5, "children have more than parent" );


  equal( jsonLogic.apply(finalRule, {
    "Custom field (Story Points)": 3,
    _children: [
      { "Custom field (Story Points)": 1, Status: "Closed" },
      { "Custom field (Story Points)": 4 }
    ]
  }), 4, "children have more than parent and get subtracted" );

  equal( jsonLogic.apply(finalRule, {
    "Custom field (T-shirt Size)": "Small",
    _children: [
    ]
  }), 15, "children have more than parent and get subtracted" );

});


console.log(JSON.stringify(finalRule))




/*
test("t-shirt size", function(assert){
  jsonLogic.apply({
     "or": [
      {
       "+": [
        0,
        {
         "filter": [
          {
           "merge": [
            { "var": "Custom field (Story Points)" },
            { "var": "Custom field (Story point estimate)" },
           ]
          },
          { "!==": [ { "var": "" }, "" ] }
         ]
        }
       ]
      },
      50
     ]
   }, {

   })
})*/
