/*!
 * Copyright 2017 Pentaho Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define([
  'amd!cdf/lib/underscore',
  './Model'
], function(_, Model) {

  "use strict";

  var SelectionStates = Model.SelectionStates;

  return toFilter;

  function toFilter(modelGroup, parentState) {

    var selectionState = modelGroup.getSelection();

    switch (selectionState) {
      case SelectionStates.ALL:
        return isIn(modelGroup.parent(), [modelGroup]);

      case SelectionStates.NONE:
        if (parentState === SelectionStates.EXCLUDE) {
          return isIn(modelGroup.parent(), [modelGroup]);
        } else {
          return isIn(modelGroup.parent(), []);
        }

      default:
        return toPartialFilter(modelGroup, selectionState);
    }
  }

  function toPartialFilter(modelGroup, parentState) {

    var isInclusive =
      (parentState === SelectionStates.NONE) ||
      (parentState === SelectionStates.INCLUDE);

    var rejectState = isInclusive ? SelectionStates.NONE : SelectionStates.ALL;

    var operands = modelGroup.children().chain()
      .reject(function(m) {
        return m.getSelection() === rejectState;
      })
      .map(function(m) {
        return toFilter(m, parentState);
      })
      .compact()
      .value();

    if (operands.length === 0) {
      return null;
    }
    operands = simplifyIsIn(operands);

    var aggregatedOperands = null;
    switch (operands.length) {
      case 0:
        aggregatedOperands = null;
        break;
      case 1:
        aggregatedOperands = operands[0];
        break;
      default:
        aggregatedOperands = {
          "_": "pentaho/type/filter/or",
          operands: operands
        };
        break;
    }

    var isExclude =  modelGroup.getSelection() === SelectionStates.EXCLUDE;
    if(isExclude){
      var childrenWithExcludes = modelGroup.children().filter(function(m){
        return m.getSelection() === SelectionStates.EXCLUDE;
      });

      if(childrenWithExcludes.length){
        return aggregatedOperands; // should this be changed to an AND ?
      } else {
        return not(aggregatedOperands);
      }
    }

    return aggregatedOperands;
  }

  function simplifyIsIn(operands) {
    var isInOperandsAndOthers = _.partition(operands, function(spec) {
      return spec["_"] === "pentaho/type/filter/isIn";
    });

    var result = isInOperandsAndOthers[1];
    var isInOperands = isInOperandsAndOthers[0];

    var byParent = _.groupBy(isInOperands, function(operand) {
      return operand.property;
    });

    var simplifiedIsInOperands = _.map(byParent, function(operands, parentId) {
      var isInValues = _.reduce(operands, function(memo, spec) {
        if (spec.values.length) {
          memo.push.apply(memo, _.compact(_.pluck(spec.values, "v")));
        }
        return memo;
      }, []);

      var isInOperand = {
        "_": "pentaho/type/filter/isIn",
        property: parentId,
        values: _.map(isInValues, function(v) {
          return {
            "_": "string",
            v: v
          };
        })
      };
      return isInOperand;
    });

    result.push.apply(result, simplifiedIsInOperands);
    return result;

  }

  function isIn(modelParent, modelList) {
    return {
      "_": "pentaho/type/filter/isIn",
      property: modelParent ? modelParent.get('id') : null, // TODO is this hack needed?
      values: _.map(modelList, function(model) {
        return {
          "_": "string",
          "v": model.get('id')
        };
      })
    };
  }


  function not(spec) {
    switch (spec._) {
      case "pentaho/type/filter/or":
        return {
          "_": "pentaho/type/filter/and",
          operands: _.map(spec.operands, not)
        };

      case  "pentaho/type/filter/and":
        return {
          "_": "pentaho/type/filter/or",
          operands: _.map(spec.operands, not)
        };

      //case "pentaho/type/filter/not":
      //  return spec.operand;

      default:
        return {
          "_": "pentaho/type/filter/not",
          operand: spec
        };
    }
  }


});
