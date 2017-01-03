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
  '../../../lib/baseSelectionTree/BaseSelectionTree'
], function( _, BaseSelectionTree ) {

  'use strict';

  /**
   * @class cdf.components.filter.core.Model
   * @amd cdf/components/filter/core/Model
   * @extends cdf.lib.baseSelectionTree.BaseSelectionTree
   * @classdesc Represents the state of the filter as a tree structure.
   * @ignore
   */
  return BaseSelectionTree.extend(/** @lends cdf.components.filter.core.Model# */{

    /**
     * Default values for each node in the selection tree.
     *
     * @type     {object}
     * @property {string}  id                    The default id.
     * @property {string}  label                 The default label.
     * @property {boolean} isSelected            The default selection state.
     * @property {boolean} isVisible             The default visibility state.
     * @property {boolean} isCollapsed           The default collapsed state.
     * @property {number}  numberOfSelectedItems The default number of selected items.
     * @property {number}  numberOfItems         The default number of items.
     * @property {number}  page                  The default page.
     */
    defaults: function(){
      var defaults = this.base();

      defaults.isCollapsed = false;

      return defaults;
    },

    load: function(data) {
      this.base(data);

      var root = this.root();
      root.set('isDisabled', root.children() === null);
    },

    /**
     * Sets the isBusy parameter.
     *
     * @param {boolean} isBusy The new value to set.
     */
    setBusy: function(isBusy) {
      this.root().set('isBusy', isBusy);
    },

    /**
     * Gets the isBusy parameter value.
     *
     * @return {boolean} The `isBusy` parameter value.
     */
    isBusy: function() {
      return this.root().get('isBusy') || false;
    }
  }, {
    SelectionStates: BaseSelectionTree.SelectionStates
  });

});
