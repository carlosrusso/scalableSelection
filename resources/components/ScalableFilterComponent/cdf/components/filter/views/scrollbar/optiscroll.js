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
/**
 * @summary OptiScrollBar implementation of ScrollBarHandler
 * @description OptiScrollBar implementation of ScrollBarHandler
 */
define([
  './AbstractScroll'
], function(AbstractScroll) {

  "use strict";

  return AbstractScroll.extend({
    constructor: function(view) {
      this.base(view);

      this.scrollbar = view.$(view.config.view.partials.children.selector)
        .addClass('optiscroll-content')
        .parent()
        .addClass('optiscroll')
        .optiscroll()
        .off('scrollreachbottom')
        .on('scrollreachbottom', function(event) {
          return view.trigger('scroll:reached:bottom', view.model, event);
        })
        .off('scrollreachtop')
        .on('scrollreachtop', function(event) {
          return view.trigger('scroll:reached:top', view.model, event);
        })
        .data('optiscroll');
    },

    setPosition: function($element) {
      this.scrollbar.scrollIntoView($element);
    }
  });
});
