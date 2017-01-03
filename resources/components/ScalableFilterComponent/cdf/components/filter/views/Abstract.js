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
  'amd!cdf/lib/underscore',
  'amd!cdf/lib/backbone',
  'cdf/lib/mustache',
  '../../../lib/baseEvents/BaseEvents',
  './scrollbar/ScrollBarFactory',
  '../HtmlUtils'
], function ($, _, Backbone, Mustache, BaseEvents, ScrollBarFactory, HtmlUtils) {

  "use strict";

  /**
   * @class cdf.components.filter.views.Abstract
   * @amd cdf/components/filter/views/Abstract
   * @classdesc Abstract base class for all Views
   * @extends cdf.lib.BaseEvents
   * @extends Backbone.View
   * @ignore
   */


  /**
   * Map the handlers that are directly relayed to view events,
   * which will be processed by the view's controller.
   *
   * @type {object}
   */

  return BaseEvents.convertClass(Backbone.View).extend(/** @lends cdf.components.filter.views.Abstract# */{
    type: null,
    templates: null,

    initialize: function (options) {
      this.configuration = options.configuration;
      this.config = this.configuration[this.type];

      this._staticViewModel = _.extend({
        strings: this.config.strings,
        selectionStrategy: _.omit(options.configuration.selectionStrategy, 'strategy')
      }, this.config.options);

      //this.templates = this.config.view.templates;

      if(!this.events) this.events = {};
      if (this.config.view.events) {
        this.events = $.extend(true, this.events, {}, this.config.view.events);
      }


      this.bindToModel(this.model);
      this.setElement(options.target);

      this._$subViews = {};
      this.render();
    },

    /**
     * Binds changes of model properties to view methods.
     *
     * @param {cdf.components.filter.core.Model} model
     */

    bindToModel: function (model) {
      var delays = this.config.view.delays;
      var debounce = function(f, type) {
        var delay = delays[type] || delays.default;
        if (delay >= 0) {
          return _.debounce(f, delay);
        }
        return f;
      };

      _.each(this.config.view.relayEvents, function(viewEvent, key) {
        var eventHandler = this.events[key];
        if(!eventHandler){

          this.events[key] = debounce(function(event) {
            this.trigger(viewEvent, model, event);
            return false;
          }, viewEvent);

        } else if (_.isFunction(eventHandler)){

          this.events[key] = debounce(function(event) {
            eventHandler.call(this, arguments);
            this.trigger(viewEvent, model, event);
            return false;
          }, viewEvent);
        }
      }, this);

      var defaultDelay = this.config.view.delays.default;
      _.each(this.config.view.onModelChange, function(reaction, property) {

        var r = this.renderPartials(reaction.partials);
        var delay = reaction.delay || defaultDelay;

        this.onChange(model, property, function(){

          var viewModel = this.getViewModel();
          r.call(this, viewModel);

        }, delay);
      }, this);
    },

    /*
     * View methods
     */
    getViewModel: function () {
      var model = this.model.toJSON(true);

      var viewModel = _.extend(model, this._staticViewModel);
      return viewModel;
    },

    /**
     * Renders a template to a string whose html is properly sanitized.
     *
     * @param {string} template - A Mustache template
     * @param {object} viewModel
     * @return {string} The sanitized html
     */
    getHtml: function(template, viewModel){
      /**
       *
       * To enable setting a placeholder in the input box, one must explicitly whitelist the
       * corresponding attribute:
       *
       * @example
       * require(["cdf/lib/sanitizer/lib/html4"], function(html4){
       *   html4.ATTRIBS["input::placeholder"] = 0
       * });
       */
      if(!template){
        return "";
      }

      var patchViewModel = this.config.view.patchViewModel;
      if(_.isFunction(patchViewModel)){
        viewModel = patchViewModel(viewModel, this.model, this.configuration);
      }

      //console.log("rendering stuff", viewModel.label);

      var html = Mustache.render(template, viewModel, this.config.view.main.templatePartials);
      return HtmlUtils.sanitizeHtml(html);
    },

    renderPartials: function(subViews) {
      return function(viewModel) {

        _.each(subViews, function(subView) {

          var template = this.config.view.partials[subView].template;
          if (template) {
            var html = this.getHtml(template, viewModel);
            var $element = this.placeholder(subView);
            $element.html(html);
          }

          this.injectContent(subView, viewModel);

        }, this);

      };
    },

    injectContent: function (subView, viewModel) {
      var renderers = this.config.view.partials[subView].renderers;
      if (!renderers) {
        return;
      }

      var $tgt = this.placeholder(subView);
      _.each(renderers, function (renderer) {
        if (_.isFunction(renderer)) {
          return renderer.call(this, $tgt, this.model, this.configuration, viewModel, this.config);
        }
      }, this);
    },

    /**
     * Fully renders the view.
     */

    render: function() {
      var viewModel = this.getViewModel();
      this.renderContainer(viewModel);

      var subViews = this.config.view.main.render;
      this.renderPartials(subViews).call(this, viewModel);

      return viewModel;
    },

    renderContainer: function(viewModel) {
      var html = this.getHtml(this.config.view.main.template, viewModel);
      this.$el.html(html);
    },

    /*
     * Boilerplate methods
     */
    close: function () {
      this.remove();
      return this.unbind();
    },

    /*
     * internal machinery
     */


    /**
     * Sets up a listener for changes on a list of properties.
     *
     * By default, the listeners are debounced.
     *
     * @param obj
     * @param {string} properties - Space separated list of properties to observe.
     * @param {function} eventHandler - Event handler.
     * @param {number} [delayOverride]
     */
    onChange: function (obj, properties, eventHandler, delayOverride) {
      var events;
      var defaultDelay;

      if(properties){
        defaultDelay = this.config.view.delays.changeAttribute;
        events = _.map(properties.split(' '), function(prop) {
          return prop ? 'change:' + prop : 'change';
        }).join(' ');
      } else {
        defaultDelay = this.config.view.delays.change;
        events = 'change';
      }

      var delay = delayOverride ? delayOverride : defaultDelay;
      var f = (delay >= 0) ? _.debounce(eventHandler, delay) : eventHandler;

      this.listenTo(obj, events, f);
    },

    placeholder: function(subView) {
      var $element = this._$subViews[subView];

      if(!$element){
        $element = this.$(this.config.view.partials[subView].selector);
        this._$subViews[subView] = $element;
      }

      return $element;
    }
  });


});
