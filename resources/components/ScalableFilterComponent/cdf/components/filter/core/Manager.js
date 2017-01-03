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
  '../../../lib/baseSelectionTree/Tree',
  'cdf/Logger'
], function($, _, Tree, Logger) {

  "use strict";

  return Tree.extend(/** @lends cdf.components.filter.controllers.Manager# */{
    /**
     * Default values.
     *
     * @type {{model: object, view: object, configuration: object}}
     */
    defaults: function() {
      return {
        model: null,
        view: null,
        configuration: null
      }
    },

    /**
     * @constructs
     * @amd cdf/components/filter/controllers/Manager
     * @extends cdf.lib.baseSelectionTree.Tree
     * @classdesc Controller responsible for managing the hierarchy of views.
     * When data is added to the model, the Manager reacts by
     * creating the appropriate views.
     *
     * @param {object} node
     * @ignore
     */
    constructor: function() {
      this.base.apply(this, arguments);
      this.updateChildren();
    },

    // region initialization
    initialize: function() {
      if (this.get('view') == null) {
        this.createView(this.get('model'));
      }
      if (this.get('view') != null) {
        this.applyBindings();
      }
    },

    /**
     * Keep the manager in sync with the model
     */
    comparator: {
      group: [sortByModel],
      item: [sortByModel]
    },

    /**
     * Creates a new view for this node
     *
     * @param {cdf.components.filter.core.Model} newModel
     */
    createView: function(newModel) {
      var viewConfig, configuration, target;
      if (this.isRoot()) {
        /*
         * This node is the Root.
         * A configuration object must have been passed as an option
         */
        configuration = this.get('configuration');
        target = configuration.target;
        viewConfig = configuration.Root;
      } else {
        /*
         * This node is either a branch (has children) or a leaf (has no children)
         * Use the parent's configuration
         */
        var parent = this.parent();
        configuration = parent.get('configuration');

        var parentView = parent.get('view');

        var childConfig = configuration[parentView.type].type.childConfig;
        if(!childConfig) {
          this.set('view', null);
          return;
        }

        if (newModel.children()) {
          viewConfig = configuration[childConfig.branch];
        } else {
          viewConfig = configuration[childConfig.leaf];
        }

        target = parentView.createChildNode();
      }

      /*
       * Create new view
       */
      var newView = new viewConfig.type.constructor({
        model: newModel,
        configuration: configuration,
        target: target
      });

      this.set('view', newView);
    },

    applyBindings: function() {
      var view = this.get('view');
      var configuration = this.get('configuration');

      var throttleScroll = function(f) {
        var delayInMilliseconds = configuration.pagination.throttleTimeMilliseconds;
        return _.throttle(f, delayInMilliseconds || 0, {
          trailing: false
        });
      };
      var debounce = function(f, delayType) {
        var delayInMilliseconds;
        if(_.isString(delayType)){
          delayInMilliseconds = view.config.view.delays[delayType] || view.config.view.delays["default"];
        } else {
          delayInMilliseconds = view.config.view.throttleTimeMilliseconds;
        }
        return _.debounce(f, delayInMilliseconds);
      };

      /*
       * Bind to model and view.
       */

      var bindings = {
        model: {
          'change:isSelected': function(){ this.renderDetached('change:isSelected'); },
          'change:isVisible': function(){ this.renderDetached('change:isVisible'); },
          'add': this.onAdd,
          'remove': this.onRemove,
          'update': this.onUpdate,
          'sort': debounce(this.onSort)
        },
        view: {
          'filter': debounce(this.onFilterChange, 'filter'),
          'scroll:reached:top': this.getPreviousPage,
          'scroll:reached:bottom': this.getNextPage
        }
      };
      _.each(bindings, function(bindingList, object) {
        var obj = this.get(object);
        _.each(bindingList, function(method, event) {

          this.listenTo(obj, event, _.bind(method, this));

        }, this);
      }, this);

      /*
       * Bind view events to the strategy
       */
      var viewBindings = {
        //viewEvent: strategyMethod
        'toggleCollapse': 'toggleCollapse',
        'mouseover': 'mouseOver',
        'mouseout': 'mouseOut',
        'selected': 'changeSelection',
        'control:apply': 'applySelection',
        'control:cancel': 'cancelSelection',
        'control:only-this': 'selectOnlyThis',
        'click:outside': 'clickOutside'
      };

      var strategy = configuration.selectionStrategy.strategy;

      _.each(viewBindings, function(strategyMethod, viewEvent) {
        this.listenTo(view, viewEvent, function() {
          strategy[strategyMethod].apply(strategy, arguments);
        });
      }, this);

    },

    // endregion

    // region model events
    renderDetached: function(event){
      //console.log('evaluating offline rendering for ', this.get('model').get('label'));

      if( !this.children() ){
        // no optimizations for leaf nodes
        return;
      }

      // Don't optimize this view if a parent view is already being optimized
      var m;
      var v;
      for(m = this; m; m = m.parent()){
        v = m.get('view');
        if(!v || v.areChildrenDetached) {
          return;
        }
      }

      this.get('view').renderOffline(event);
    },

    onAdd: function(model, collection, options) {

      var parentManager = this.findWhere({
        model: model.parent()
      });

      this.renderDetached('add');

      var grandParentManager = parentManager.parent();
      if (grandParentManager) {
        var parentViewType = grandParentManager.get('view')
          .config.type.childConfig.branch;
        var parentView = parentManager.get('view');
        if (parentView.type !== parentViewType) {
          parentView.close();
          parentManager.createView(model.parent());
        }
      }
      parentManager.addChild(model);
    },

    onRemove: function(model, collection, options) {
      if(model !== this.get('model')){
        return;
      }

      this.get('view').close();
      this.remove();
    },

    onUpdate: function(collection, options) {
      return;
      //console.log('Update received by ', this.get('model').get('label'), collection.parent.get('label'), options);

      var updatedNode = this.findWhere({
        model: collection.parent
      });
      var view = updatedNode.get('view');
    },

    onSort: function(model, options) {
      this.renderDetached('sort');

      // Ensure the manager nodes are in the same order as the model
      this.sort();

      var children = this.children();
      if(!children){
        return;
      }

      var childViews = children.pluck('view');
      this.get('view').setChildren(childViews)
    },

    // endregion

    // region children management
    /**
     * Creates a new manager for this MVC tuple.
     */
    addChild: function(newModel) {
      var newManager = {
        model: newModel,
        configuration: this.get('configuration')
      };
      this.add(newManager);
      return this;
    },

    updateChildren: function() {
      var models = this.get('model').children();
      if (models == null) {
        return;
      }

      var children = this.children();
      var modelsToAdd;
      if (!children) {
        modelsToAdd = models;
      } else {
        var existentModels = children.map(function(child) {
          return child.get('model');
        });

        modelsToAdd = models.chain().reject(function(m) {
          return _.includes(existentModels, m);
        });
      }

      modelsToAdd.each(function(m) {
        this.addChild(m);
      }, this);
    },

    // endregion

    // region pagination
    getNextPage: function(model, event) {
      return this.getPage('next', model, event);
    },

    getPreviousPage: function(model, event) {
      return this.getPage('previous', model, event);
    },

    getPage: function(page, model, event) {
      Logger.debug("Item " + (model.get('label')) + " requested page " + page);

      var searchPattern = "";
      if (this.get('configuration').search.serverSide === true) {
        searchPattern = model.root().get('searchPattern')
      }
      return this.requestPage(page, searchPattern);
    },

    requestPage: function(page, searchPattern) {
      var getPage = this.get('configuration').pagination.getPage;
      if (!_.isFunction(getPage)) {
        return $.when(null);
      }

      return getPage(page, searchPattern).then(function(json) {
        if (json.resultset != null) {
          Logger.debug("getPage: got " + json.resultset.length + " more items");
        } else {
          Logger.debug("getPage: no more items");
        }
      });
    },
    // endregion

    /**
     * React to the user typing in the search box.
     *
     * @param {string} text The new search pattern.
     */
    onFilterChange: function(model, text) {
      var configuration = this.get('configuration');
      configuration.selectionStrategy.strategy.filter(model, text);

      if (text && configuration.search.serverSide === true) {
        this.requestPage(0, text)
      }
    },

    /**
     * @summary Removes event handlers and closes the view from this node and its children.
     * @description Removes event handlers and closes the view from this node and its children.
     *              Also removes the children.
     *
     * @return {Object} Returns this node to allow chaining.
     */
    close: function() {
      this.empty();
      this.get('view').close();
      this.stopListening();
      this.off();
      this.clear();
      return this;
    },
    /**
     * @summary Closes and removes the children from the tree.
     * @description Closes and removes the children from the tree.
     */
    empty: function() {
      var children = this.children();
      if (children) {
        children.each(function(child) {
          child.close();
        });
      }
    }
  });

  /**
   * Follow the order by which the models are defined
   * @param left
   * @param right
   * @returns {number}
   */
  function sortByModel(left, right) {
    var l = left.get('model').index();
    var r = right.get('model').index();
    return l - r;
  }

});
