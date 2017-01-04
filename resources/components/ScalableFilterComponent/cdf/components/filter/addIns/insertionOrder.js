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
   * Sorts items, by keeping the insertion order
   */
  var insertionOrder = {
    name: 'insertionOrder',
    label: 'Keep insertion order',
    defaults: {
      ascending: true
    },
    implementation: function($tgt, st, options) {
      return function(left, right) {
        var l = left.cid;
        var r = right.cid;

        if (l === r) {
          return 0;
        }
        if (!options.ascending) {
          return l < r ? 1 : -1;
        }
        return l < r ? -1 : 1;
      };
    }
  };

  registerAddIn('sortItem', insertionOrder);
  registerAddIn('sortGroup', insertionOrder);

  return insertionOrder;

});
