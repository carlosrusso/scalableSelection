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
  './_register',
  './sortByProperty'
], function($, registerAddIn, sortByProperty) {

  'use strict';

  /*
   * Sorts items/groups by label
   */
  var sortByLabel = $.extend(true, {}, sortByProperty, {
    name: 'sortByLabel',
    label: 'Sort items by label, alphabetically',
    defaults: {
      ascending: true,
      locales: undefined,
      options: undefined,
      property: "label",
      comparer: function(left, right, options) {
        var l = String(left);
        var r = String(right);
        if (l === r) {
          return 0;
        }
        return l.localeCompare(r, options.locales, options.options);
      }
    }
  });

  registerAddIn('sortItem', sortByLabel);
  registerAddIn('sortGroup', sortByLabel);

  return sortByLabel;
});
