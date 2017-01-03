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
  '../core/Model',
  './MultiSelect',
  'cdf/Logger'
], function (_, Model, MultiSelect, Logger) {

  'use strict';

  var SelectionStates = Model.SelectionStates;

  return MultiSelect.extend(/** @lends cdf.components.filter.strategies.LimitedSelect# */{
    /**
     * @constructs
     * @amd cdf/components/filter/strategies/LimitedSelect
     * @extends cdf.components.filter.strategies.MultiSelect
     * @classdesc Limited (Multiple) Selection allows selecting a limited number of items.
     * @param {object} options Selection options.
     * @param {object} options.limit=Infinity The selection limit option.
     * @ignore
     */
    constructor: function (options) {
      this.base(options);
      this.selectionLimit = options.limit || Infinity;
    },

    /**
     * Sets the new selection state to the provided model.
     *
     * @param {string} newState The new state to set.
     * @param {object} model The target model.
     */
    setSelection: function (newState, model) {

      var allow = true;
      if (newState !== SelectionStates.NONE) {

        var nSelected = model.root().get('numberOfSelectedItems');
        if (!_.isFinite(nSelected)) {
          model.update();
          nSelected = model.root().get('numberOfSelectedItems');
        }

        if (nSelected >= this.selectionLimit) {
          Logger.warn("Cannot allow the selection of  \"" + (model.get('label')) + "\". Selection limit of " + this.selectionLimit + " has been reached.");
          allow = false;
        } else {
          if (model.children() && (newState === SelectionStates.ALL)) {
            var nCandidates = model.leafs()
              .filter(function(m) {
                return m.getSelection() !== SelectionStates.ALL;
              })
              .size()
              .value();
            if (nSelected + nCandidates >= this.selectionLimit) {
              Logger.warn("Cannot allow the selection of \"" + (model.get('label')) + "\". Selection limit of " + this.selectionLimit + " would be reached.");
              allow = false;
            }
          }
        }
      }

      if (allow) {
        model.setAndUpdateSelection(newState);
        this._updateReachedSelectionLimit(model);
      }
    },

    _updateReachedSelectionLimit: function(model){
      var root = model.root();
      root.set("reachedSelectionLimit", root.get('numberOfSelectedItems') >= this.selectionLimit);
    },

    cancelSelection: function(model){
      this.base(model);
      this._updateReachedSelectionLimit(model);
    },

    applySelection: function(model){
      this.base(model);
      this._updateReachedSelectionLimit(model);
    }


  });

});
