define(['amd!cdf/lib/underscore'], function(_) {

  function transform(obj) {
    // obj = {
    //   "_": "pentaho/type/filter/isIn",
    //   "property": "id",
    //   "values": [
    //     {_: "string", v: "[Product].[Classic Cars]"},
    //     {_: "string", v: "[Product].[Motorcycles]"},
    //   ]
    // }

    // obj = {
    //   "_": "pentaho/type/filter/and",
    //   "operands": [
    //     {
    //       "_": "pentaho/type/filter/isIn",
    //       "property": "id",
    //       "values": [
    //         {_: "string", v: "[Product].[Line]"}
    //       ]
    //     },
    //     {
    //       "_": "pentaho/type/filter/not",
    //       "operand":  {
    //           "_": "pentaho/type/filter/isIn",
    //           "property": "id",
    //           "values": [
    //             {_: "string", v: "[Product].[Classic Cars]"},
    //             {_: "string", v: "[Product].[Motorcycles]"}
    //           ]
    //       }
    //     }
    //   ]
    // }

    // obj = {
    //   "_": "pentaho/type/filter/isIn",
    //   "property": null,
    //   "values": [
    //   ]
    // }

    /*obj = {
      "_": "pentaho/type/filter/not",
      "operand":  {
          "_": "pentaho/type/filter/isIn",
          "property": "[Product].[Line]",
          "values": [
            {_: "string", v: "[Product].[Classic Cars]"},
            {_: "string", v: "[Product].[Motorcycles]"}
          ]
      }
    }*/
      
    var exp = '';
    var notExp = '';
    var notExists = false;
    var rootOp = getOperand(obj._);

    if (rootOp === 'isIn') {
      // LEAF case      
      exp = _.pluck(obj.values, 'v').join();
      if (obj.property === null && obj.values.length) {
        exp += '.MEMBERS';
      }

    } else if (rootOp === 'and' || rootOp === 'or') {
      // AND Case
      
      var expValues = [];
      _.each(obj.operands, function(operand, idx) {        
        var op = getOperand(operand._);

        if (op === 'isIn') {          
          expValues.push(_.pluck(operand.values, 'v'));
        } else if (op === 'not') {          
          notExists = true;
          var notOperand = operand.operand;

          notExp = _.pluck(notOperand.values, 'v').join();
        }
      });
      exp = expValues.join();

    } else if (rootOp === 'not') {
      notExists = true;
      var notOperand = obj.operand;

      exp = notOperand.property;
      notExp = _.pluck(notOperand.values, 'v').join();
    }


    if (notExists) {
      exp = 'EXCEPT(' + exp + '.MEMBERS, {' + notExp + '})';
    }

    return '{' + exp + '}';

  }

  function getOperand(operand) {
    return operand ? operand.replace('pentaho/type/filter/', '') : '';
  }


  return {
    transform: transform  
  };
});
