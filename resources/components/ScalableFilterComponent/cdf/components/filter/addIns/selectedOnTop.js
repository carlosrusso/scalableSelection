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
   * Sorts items, by keeping the selected items on top
   */
  var selectedOnTop = {
    name: 'selectedOnTop',
    label: 'Keep selected items on top ',
    implementation: function($tgt, st, options) {

      // setup listener
      st.model.on('all', function(event, model, value) {
        if (event === 'change:isSelected') {
          var parent = model.parent();
          if (parent) {
            // postpone sorting until the event 'change:isSelected' is processed
            setTimeout(function() {
              parent.sort();
            }, 0)
          }
        }
      });

      return function(left, right) {
        var l = left.getSelection();
        var r = right.getSelection();
        if (l === r) {
          return 0;
        }

        if (l === true) {
          return -1;
        }
        if (r === true) {
          return 1;
        }

        if (l === null) {
          return -1;
        }

        return 1; // l === false and r === null
      };
    }
  };
  registerAddIn('sortItem', selectedOnTop);
  registerAddIn('sortGroup', selectedOnTop);

  return selectedOnTop;

});
