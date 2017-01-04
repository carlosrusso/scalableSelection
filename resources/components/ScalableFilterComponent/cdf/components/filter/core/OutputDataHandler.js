/*!
 * Copyright 2002 - 2016 Webdetails, a Pentaho company. All rights reserved.
 *
 * This software was developed by Webdetails and is provided under the terms
 * of the Mozilla Public License, Version 2.0, or any later version. You may not use
 * this file except in compliance with the license. If you need a copy of the license,
 * please go to http://mozilla.org/MPL/2.0/. The Initial Developer is Webdetails.
 *
 * Software distributed under the Mozilla Public License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. Please refer to
 * the license for the specific language governing your rights and limitations.
 */

define([
  'amd!cdf/lib/underscore',
  '../../../lib/baseEvents/BaseEvents',
  './Model',
  'pentaho/type/Context',
  'pentaho/type/filter/abstract',
  'pentaho/type/filter/isIn',
  'pentaho/type/filter/and',
  'pentaho/type/filter/or'
], function(_, BaseEvents,
            Model,
            Context,
            abstractFilterFactory, isInFactory, andFactory, orFactory
) {

  'use strict';


  var SelectionStates = Model.SelectionStates;
  var context = new Context();
  var AbstractFilter = context.get(abstractFilterFactory);
  var IsInFilter = context.get(isInFactory);
  var AndFilter = context.get(andFactory);
  var OrFilter = context.get(orFactory);

  var Filter = AbstractFilter.extend({
    contains: function() {
      return false;
    }
  });

  /**
   * @class cdf.components.filter.core.OutputDataHandler
   * @amd cdf/components/filter/core/OutputDataHandler
   * @extends cdf.lib.BaseEvents
   * @classdesc The Output DataHandler:
   *   <ul><li>watches the model for specific changes</li>
   *       <li>synchronizes CDF with the model</li></ul>
   *   If you squint, you can see that it behaves like a View,
   *   except that it writes to a CDF parameter.
   * @ignore
   */
  return BaseEvents.extend(/** @lends cdf.components.filter.core.OutputDataHandler# */{

    constructor: function(spec) {
      this.model = spec.model;
      this.options = spec.options;

      if (true || this.options.trigger === 'apply') {
        this.listenTo(this.model, 'change:selectedItems', this.onApply);
      } else {
        this.listenTo(this.model, 'change:isSelected', this.onSelection);
      }
    },

    _processOutput: function(model, selection) {
      var result;

      var outputFormat = this.options.outputFormat;
      if (_.isString(outputFormat)) {
        switch (outputFormat.toLowerCase()) {
          case 'lowestid':
            result = this.getLowestId(selection);
            break;
          case 'highestid':
            result = this.getHighestId(selection);
            break;
          case 'selected':
            result = selection;
            break;
          case 'scalable':
            result = this.getFilter(selection);
            break;
        }
      } else if (_.isFunction(outputFormat)) {
        result = outputFormat.call(this, model, selection);
      }

      if (_.isUndefined(result)) {
        result = this.getLowestId(selection);
      }
      return result;
    },

    /**
     * Process the list of selected items and attempt to produce a compact array,
     * in which a single id is used to represent all the members of a fully
     * selected group.
     *
     * @param {string} selectionState The selection state.
     * @return {object[]} Returns a list of model identifiers.
     */
    getHighestId: function(selectionState) {
      var list = _.chain(selectionState.all)
        .reject(function(m) {
          // exclude items without a valid id
          return _.isUndefined(m.get('id'));
        })
        .reject(function(m, idx, models) {
          // exclude items whose parents are already in this list
          return _.contains(models, m.parent());
        })
        .map(function(m) {
          return m.get('id');
        })
        .value();
      return list;
    },

    /**
     * Process the list of selected items and produce a list of the ids of
     * the selected items (leafs only).
     *
     * @param {string} selectionState The selection state.
     * @return {string[]} Returns a list of model identifiers.
     */
    getLowestId: function(selectionState) {

      var list = _.chain(selectionState.all)
        .reject(function(m) {
          return m.children();
        })
        .map(function(m) {
          return m.get('id');
        })
        .value();
      return list;
    },

    /**
     * Transforms the state of the model into a set of conditions
     *
     * @param selectionState
     * @returns {pentaho.type.filter.abstract}
     */
    getFilter: function(selectionState) {
      var root = this.model;

      return toFilter(root);

      function item(model) {
        return model;
      }

      function combine(list, modelGroup) {

        switch(modelGroup.getSelection()){
          case SelectionStates.ALL:
            return isIn([modelGroup]);

          case SelectionStates.NONE:
            return not(isIn([modelGroup]));

          case SelectionStates.SOME:
            var modelsAndSpecs = _.partition(_.compact(list), function(m) {
              return m.get; // hack to determine if
            });
            var included = _.filter(modelsAndSpecs[0], function(m) {
              return m.getSelection() === SelectionStates.ALL;
            });

            var operands = modelsAndSpecs[1].length ? modelsAndSpecs[1] : [];
            if (included){
              var spec = isIn(included);
              if(operands.length){
                operands.push(spec);
              } else {
                operands = [spec];
              }
            }
            return operands.length ? {
              "_": "pentaho/type/filter/or",
              operands: operands
            } : null;

        }
      }

      return root.walkDown(item, combine, null);

    },

    onApply: function(model, _selectionState) {
      if (_selectionState == null) {
        return;
      }
      var selectionState = _selectionState.value();

      var treatedSelection = this._processOutput(model, selectionState);
      this.trigger('changed', treatedSelection);
    },

    onSelection: function(model) {
    },

    /**
     * Reads the selection state from the model and transforms this information
     * into the format the CDF filter is expecting to consume.
     *
     * @return {string[] | any} Returns the currently committed selection state.
     */
    getValue: function() {
      var model = this.model;
      var selection = model.root().get('selectedItems');
      return this._processOutput(selection, model);
    }
  });



  function toFilter(modelGroup){
    switch(modelGroup.getSelection()){
      case SelectionStates.ALL:
        return isIn([modelGroup]);

      case SelectionStates.NONE:
        return isIn([]);

      case SelectionStates.SOME:

        var operands = modelGroup.children().chain()
          .reject(function(m) {
            return m.getSelection() === SelectionStates.NONE;
          })
          .map(toFilter)
          .compact()
          .value();

        if(operands.length === 0) return null;

        operands = simplifyIsIn(operands);

        switch(operands.length) {
          case 0:
            return null;
          case 1:
            return operands[0];
          default:

            return {
              "_": "pentaho/type/filter/or",
              operands: operands
            };
        }
    }
  }

  function simplifyIsIn(operands) {
    var isInOperandsAndOthers = _.partition(operands, function(spec){
      return spec["_"] === "pentaho/type/filter/isIn";
    });

    var result = isInOperandsAndOthers[1];
    var isInOperands = isInOperandsAndOthers[0];

    var isInValues = _.reduce(isInOperands, function(memo, spec) {
        if(spec.values.length){
          memo.push.apply(memo, _.compact(_.pluck(spec.values, "v")));
        }
        return memo;
    }, []);

    var isInOperand = {
      "_": "pentaho/type/filter/isIn",
      property: 'id',
      values: _.map(isInValues, function(v) {
        return {
          "_": "string",
          v: v
        };
      })
    };

    if(result.length){
      result.push(isInOperand)
    } else if(isInOperand.values.length) {
      result = [isInOperand];
    } else {
      result = null;
    }
    return result;
  }

  function isIn(modelList) {
    return {
      "_": "pentaho/type/filter/isIn",
      property: 'id',
      values: _.map(modelList, function(model) {
        return {
          "_": "string",
          "v": model.get('id')
        };
      })
    };
  }

  function not(spec) {
    return {
      "_": "pentaho/type/filter/not",
      operand: spec
    };
  }

});
