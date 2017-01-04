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
  './_register'
], function(registerAddIn) {

  'use strict';

  /*
   * Sorts items/groups by property value
   */
  var sortByProperty = {
    name: 'sortByProperty',
    label: 'Sort models by the value of a property',
    defaults: {
      ascending: true,
      property: 'id',
      comparer: function(left, right, options) {
        if (left === right) {
          return 0;
        }
        return left < right ? -1 : 1;
      }
    },

    implementation: function($tgt, st, options) {
      return function(left, right) {
        var l = left.get(options.property);
        var r = right.get(options.property);

        var comparison = options.comparer(l, r, options);
        if (options.ascending) {
          return comparison;
        }
        return -comparison;

      };
    }
  };

  registerAddIn('sortItem', sortByProperty);
  registerAddIn('sortGroup', sortByProperty);

  return sortByProperty;
});
