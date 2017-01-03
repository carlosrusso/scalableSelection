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
  'cdf/lib/jquery',
  './views/viewDefaults'
], function($, viewDefaults) {

  "use strict";

  /**
   * @class cdf.components.filter.configuration.defaults
   * @amd cdf/components/filter/configuration/defaults
   * @classdesc Filter component default values.
   * @ignore
   */

  /*
   * Default settings
   */
  return $.extend(true, {}, viewDefaults, {

    /**
     * Configuration of the pagination.
     *
     * @type {object}
     */
    pagination: {
      pageSize: Infinity
    },
    /**
     * Configuration of the search.
     *
     * @type {object}
     */
    search: {
      serverSide: false,
      /**
       * Allows overriding the default search mechanism
       * @type {function(cdf.components.filter.core.Model, string)}
       */
      matcher: undefined // function(model, textToMatch)
    },
    /**
     * Configuration of the selection strategy.
     *
     * @type {object}
     */
    selectionStrategy: {
      type: 'LimitedSelect',
      limit: 500
    },

    /**
     * Configuration of the Root view (root node).
     *
     * @type {object}
     */
    Root: {
      options: {
        className: 'multi-select',
        styles: [],
        showCommitButtons: true,
        showFilter: false,
        showGroupSelection: true,
        showButtonOnlyThis: false,
        showSelectedItems: false,
        showListOfSelectedItems: false,
        showNumberOfSelectedItems: true,
        showValue: false,
        showIcons: true,
        scrollThreshold: 12,
        detachThreshold: 200,
        isResizable: false,
        useOverlay: true,
        expandMode: 'absolute'
      },
      strings: {
        isDisabled: 'Unavailable',
        allItems: 'All',
        noItems: 'None',
        groupSelection: 'All',
        btnApply: 'Apply',
        btnCancel: 'Cancel',
        loadingInfo: 'Fetching data...',
        searchPlaceholder: "Search",
        reachedSelectionLimitBefore: 'The selection limit (',
        reachedSelectionLimitAfter: ') for specific items has been reached.'
      }
    },

    /**
     * Configuration of the Group (branch nodes).
     *
     * @type {object}
     */
    Group: {
      sorters: [],
      options: {
        className: '',
        styles: [],
        showFilter: false,
        showCommitButtons: false,
        showGroupSelection: false,
        showButtonOnlyThis: false,
        showSelectedItems: false,
        showButtonCollapse: false,
        showValue: false,
        showIcons: true,
        scrollThreshold: Infinity,
        detachThreshold: 50,
        isResizable: false
      },
      strings: {
        allItems: 'All',
        noItems: 'None',
        groupSelection: 'All',
        btnApply: 'Apply',
        btnCancel: 'Cancel',
        moreData: 'Get more data...'
      }
    },

    /**
     * Configuration of the Item view (leaf nodes).
     *
     * @type {object}
     */
    Item: {
      sorters: [],
      options: {
        className: '',
        styles: [],
        showButtonOnlyThis: false,
        showValue: false,
        showIcons: true
      },
      strings: {
        btnOnlyThis: 'Only'
      }
    }
  });

});
