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
  'text!./templates/Root/Root-skeleton.html',
  'text!./templates/Root/Root-header.html',
  'text!./templates/Root/Root-controls.html',
  'text!./templates/Root/Root-filter.html',
  'text!./templates/Root/Root-footer.html',
  'text!./templates/Group/Group-skeleton.html',
  'text!./templates/Item/Item-template.html'
], function(
  Root,
  RootHeader,
  RootControls,
  RootFilter,
  RootFooter,
  Group,
  Item
) {

  "use strict";

  var value = '{{{value}}}';

  return {
    Root: {
      container: f(Root),
      header: f(RootHeader),
      controls: f(RootControls),
      filter: f(RootFilter),
      value: value,
      footer: f(RootFooter),
      child: '<div class="filter-root-child"/>'
    },

    Group: {
      container: f(Group),
      value: value,
      child: '<div class="filter-group-child"/>'
    },

    Item: {
      container: f(Item),
      value: value
    }
  };

  function f(template){
    return template.replace(/\s+/g, ' ');
  }

});
