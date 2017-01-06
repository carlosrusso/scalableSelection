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
  './Abstract',
  '../core/Model',
  './scrollbar/ScrollBarFactory'
], function ($, _, AbstractView, Model, ScrollBarFactory) {

  "use strict";

  var SelectionStates = Model.SelectionStates;

  /**
   * @class cdf.components.filter.views.Parent
   * @amd cdf/components/filter/views/Parent
   * @classdesc Abstract base class for all Views that have children
   * @extends cdf.components.filter.views.Abstract
   * @extends Backbone.View
   * @ignore
   */

  /**
   * Map the handlers that are directly relayed to view events,
   * which will be processed by the view's controller.
   *
   * @type {object}
   */

  return AbstractView.extend(/** @lends cdf.components.filter.views.Abstract# */{

    initialize: function(options) {
      this.base(options);

      this.setupScrollBar();

      this.attach = debounce(this._attach, this.config.view.delays.renderOffline.attach);
    },

    bindToModel: function(model) {
      this.base(model);

      var that = this;
      this.listenTo(model, 'update', debounce(function() {
        that.updateScrollBar();
      },  this.config.view.delays.modelUpdate));
    },

    /*
     * View methods
     */
    getViewModel: function () {
      var viewModel = this.base();

      // lazy evaluation of viewModel properties
      var that = this;
      var selectedItems = _.memoize(function(){
        return that.configuration
          .selectionStrategy
          .strategy
          .getSelectedItems(that.model, 'label');
      });

      var modelSelection = this.model.getSelection();
      var isPartiallySelected = (modelSelection === SelectionStates.INCLUDE || modelSelection === SelectionStates.EXCLUDE );
      var allItemsSelected = (modelSelection === SelectionStates.ALL);
      var noItemsSelected = (modelSelection === SelectionStates.NONE);

      var selectionState = "none-selected";
      if(allItemsSelected) {
        selectionState = "all-selected"
      } else if(isPartiallySelected){
        selectionState = "some-selected"
      }

      var children = this.model.children();
      _.extend(viewModel, {
        selectedItems: selectedItems,
        numberOfChildren: children ? children.length : 0,
        selectionState: selectionState,

        isPartiallySelected: isPartiallySelected,
        allItemsSelected: allItemsSelected,
        noItemsSelected: noItemsSelected
      });

      return viewModel;
    },

    /*
     * Children management
     */
    getChildren: function() {
      return this.placeholder('children').children();
    },

    /**
     * Renders a list of (child) views using the specified order
     *
     * @param {Array.<cdf.components.filter.views.Abstract>} childViews
     */
    setChildren: function(childViews) {
      var currentNodes = this.getChildren();

      var elems = [];
      var futureNodes = childViews.map(function(view) {
        var $el = view.$el;
        elems.push($el.get(0));
        return $el;
      });

      if( _.isEqual(currentNodes.toArray(), elems)) {
        return;
      }

      var $nursery = this.placeholder('children');
      //$nursery.hide();
      $nursery.toggleClass('filter-hidden', true);
      currentNodes.detach();
      $nursery.append(futureNodes);
      //$nursery.show();
      $nursery.toggleClass('filter-hidden', false);
    },

    createChildNode: function () {
      var $child = $(this.getHtml(this.config.view.partials.child.template));
      $child.appendTo(this.placeholder('children'));
      return $child;
    },

    renderOffline: function(event) {
      var delays = this.config.view.delays.renderOffline;
      var delay = delays[event] || delays["default"];
      if (delay < 0) {
        return;
      }

      this._detach();

      var that = this;
      setTimeout(function() {
        that.attach();
      }, delay || 0);
    },

    _detach: function(){
      return; // TODO: re-enable this

      if(this._detachedNodes){
        return;
      }
      if(this.model.get('numberOfItems') < this.config.options.detachThreshold){
        return;
      }
      // console.log('Detaching', this.model.isRoot() ? "root" : this.model.get('label'));

      this.areChildrenDetached = true;

      var $node = this.placeholder('detach') || this.$el;

      var clones = (1===0) ? $node.children().clone(false) :  $("<div>Please wait</div>");
      this._detachedNodes = $node.children().detach();
      $node.append(clones);

    },

    _attach: function() {
      if(!this._detachedNodes){
        return;
      }
      this.areChildrenDetached = false;

      var $node = this.placeholder('detach');
      if (!$node.length) {
        $node = this.$el;
      }
      $node
        .empty() // remove clones
        .append(this._detachedNodes); // append real nodes

      this._detachedNodes = null;

      this.restoreScrollBar();
    },

    /*
     * Scrollbar methods
     */

    setupScrollBar: function() {
      var that = this;

      this.on('scroll:reached:top', function(){
        that.saveScrollBar(1);
      });

      this.on('scroll:reached:bottom', function(){
        that.saveScrollBar(-1);
      });

      this.updateScrollBar();
    },


    updateScrollBar: function () {
      var pageSize = this.configuration.pagination.pageSize;
      var isPaginated = _.isFinite(pageSize) && pageSize > 0;

      if (isPaginated) {
        this._addScrollBar();
      } else {
        var isOverThreshold = this.model.count() > this.config.options.scrollThreshold;
        if(isOverThreshold){
          this._addScrollBar();
        }
      }
      this.restoreScrollBar();
    },

    _addScrollBar: function () {
      if (this._scrollBar != null) {
        return;
      }

      if (!this.config.view.scrollbar) {
        return;
      }

      var that = this;
      ScrollBarFactory
        .createScrollBar(this.config.view.scrollbar.engine, this)
        .then(function(scrollBar) {
          that._scrollBar = scrollBar;
        });
    },

    restoreScrollBar: function() {
      if (this._scrollBar) {

        // Prevent the scrollbar to be restored if the view has been detached
        // This is probably not the best place to do this management, this should be revised
        // TODO: revise handling of scrollbar when the view has been detached for offline rendering
        if (this.areChildrenDetached) {
          return;
        }
        this._scrollBar.restorePosition();
      }
    },

    saveScrollBar: function(position) {
      if (this._scrollBar) {
        this._scrollBar.savePosition(position);
      }
    }

  });


  function debounce(f, t){
    if(t >= 0) {
      return _.debounce(f, t);
    }

    return f;
  }

});
