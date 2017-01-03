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
 * @summary MCustomScrollBarEngineImplementation implementation of ScrollBarHandler
 * @description MCustomScrollBarEngineImplementation implementation of ScrollBarHandler
 */
define([
  './AbstractScroll',
  'cdf/lib/jquery',
  'amd!cdf/lib/underscore',
  'amd!cdf/lib/jquery.mCustomScrollbar',
  'css!./mCustomScrollbar'
],function(AbstractScroll, $, _){

  "use strict";

  return AbstractScroll.extend({
    constructor: function (view) {
      this.base(view);

      var scrollDelay = view.config.view.delays.scroll;

      var options = $.extend(true, {
        callbacks: {
          onTotalScroll: debounce(function () {
            view.trigger('scroll:reached:bottom', view.model);
          }, scrollDelay),
          onTotalScrollBack: debounce(function () {
            view.trigger('scroll:reached:top', view.model);
          }, scrollDelay)
        }
      }, view.config.view.scrollbar.options);

      this.scrollbar = view.$(view.config.view.partials.children.selector)
        .parent()
        .mCustomScrollbar(options);
    },

    setPosition: function($element) {
      this.scrollbar.mCustomScrollbar("scrollTo", $element, { callbacks: false });
    }
  });

  function debounce(f, t){
    if(t >= 0) {
      // runs immediately and block similar requests for t ms
      return _.debounce(f, t, true);
    }

    return f;
  }

});
