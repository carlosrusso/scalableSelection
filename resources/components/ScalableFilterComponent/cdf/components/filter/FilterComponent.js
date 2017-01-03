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
  'cdf/components/UnmanagedComponent',
  'cdf/Logger',
  //
  './core/Model',
  './core/Manager',
  './core/InputDataHandler',
  './core/OutputDataHandler',
  './IFilter',
  './IConfiguration',
  './addIns'
], function($, _, UnmanagedComponent, Logger,
            Model, Manager, InputDataHandler, OutputDataHandler,
            IFilter, IConfiguration) {

  'use strict';

  /*
   * Über-filter: one filter to rule them all
   * Schmiede, mein Hammer, ein hartes Schwert!
   */

  /**
   * @class cdf.components.filter.FilterComponent
   * @extends cdf.components.UnmanagedComponent
   * @amd cdf/components/FilterComponent
   * @classdesc An intuitive Filter Component with many out-of-the-box features:
   *   <ul>
   *     <li>multiple nested groups</li>
   *     <li>extensible via addIns</li>
   *     <li>searchable</li>
   *     <li>pluggable selection logic: single-, multi-, and limited-select</li>
   *     <li>automatic handling of groups of options</li>
   *     <li>server-side pagination and searching</li>
   *   </ul>
   * @ignore
   */


  return UnmanagedComponent.extend(IFilter).extend(IConfiguration).extend(/** @lends cdf.components.filter.FilterComponent# */{
    /**
     * Object responsible for storing the MVC model, which contains both the data and the state of the component.
     *
     * @type {cdf.components.filter.core.Model}
     */
    model: void 0,

    /**
     * Object responsible for managing the MVC hierarchy of views and controllers associated with the model.
     *
     * @type {cdf.components.filter.core.Manager}
     */
    manager: void 0,

    /**
     * Object that handles writing to the MVC model.
     *
     * @type {cdf.components.filter.core.InputDataHandler}
     */
    inputDataHandler: void 0,

    /**
     * Object that handles reading from the MVC model.
     *
     * @type {cdf.components.filter.core.InputDataHandler}
     */
    outputDataHandler: void 0,

    update: function() {
      this.close(); // Clean up any leftover from previous executions
      return this.getData(this.onDataReady, this.onDataFail);
    },


    /**
     * Initialize the component by creating new instances of the main objects:
     * <ul>
     *   <li>model</li>
     *   <li>input data handler</li>
     *   <li>output data handler</li>
     * </ul>
     *
     * @return {object} Returns a configuration object.
     */
    initialize: function() {
      /*
       * Transform user-defined CDF settings to our own configuration object
       */
      var configuration = this.getConfiguration();

      /*
       * Initialize the model
       */



      this.model = new Model(configuration.input.root, {
        // TODO: deprecate configuration.component.search.matcher in favour of configuration.input.root.matcher
        // and remove this option
        matcher: configuration.component.search.matcher
      });

      var itemSorters = configuration.component.Item.sorters;
      var nItemSorters = itemSorters.length;
      var groupSorters = configuration.component.Group.sorters;
      var nGroupSorters = groupSorters.length;

      if(nItemSorters || nGroupSorters) {
        var model = this.model;
        var comparator = {
          group: _.map(_.compact(groupSorters), function(f) {
            return f(null, model, configuration);
          }),
          item: _.map(_.compact(itemSorters), function(f) {
            return f(null, model, configuration);
          })
        };
        model.setComparator(comparator);
      }

      /*
       * Initialize the CDF interface
       */
      this.inputDataHandler = new InputDataHandler({
        model: this.model,
        options: configuration.input
      });
      this.outputDataHandler = new OutputDataHandler({
        model: this.model,
        options: configuration.output
      });
      this.listenTo(this.outputDataHandler, 'changed', this.processChange);

      return configuration;
    },

    close: function() {
      if (this.manager != null) {
        this.manager.empty();
        this.manager = null;
      }
      if (this.model != null) {
        this.model.stopListening().off();
        this.model = null;
      }
      return this.stopListening();
    },

    /**
     * Abstract the origin of the data used to populate the component.
     * Precedence order for importing data: query -> parameter -> valuesArray
     *
     * @return {Promise} Returns promise that is fulfilled when the data is available.
     */
    getData: function(onSuccess, onFailure) {
      var deferred = new $.Deferred();
      if (!_.isEmpty(this.dashboard.detectQueryType(this.queryDefinition))) {

        var queryOptions = {
          ajax: {
            error: function() {
              var reason = onFailure.call(this, data);
              deferred.reject(reason);
              return Logger.log("Query failed", 'debug');
            }
          }
        };
        var onQueryData = _.bind(function(data) {
          deferred.resolve(data);
          onSuccess.call(this, data);
        }, this);
        this.triggerQuery(this.queryDefinition, _.bind(onQueryData, this), queryOptions);

      } else {

        if (_.isEmpty(this.componentInput.inputParameter)) {

          var onStaticData = function() {
            var data = this.componentInput.valuesArray;
            onSuccess.call(this, data);
            deferred.resolve(data);
          };
          this.synchronous(_.bind(onStaticData, this), null);
        } else {

          var onParamData = function() {
            var data = this.dashboard.getParameterValue(this.componentInput.inputParameter);
            onSuccess.call(this, data);
            deferred.resolve(data);
          };
          this.synchronous(_.bind(onParamData, this), null);

        }
      }
      return deferred.promise();
    },

    /*
     * Launch an event equivalent to postExecution
     */

    onDataReady: function(data) {

      var configuration = this.initialize();

      this.inputDataHandler.updateModel(data);
      if (this.parameter) {
        var currentSelection = this.dashboard.getParameterValue(this.parameter);
        this.setValue(currentSelection);
      }

      // we can now instantiate views
      this.manager = new Manager({
        model: this.model,
        configuration: configuration.component
      });

      this.trigger('getData:success');
      return this;
    },

    onDataFail: function(reason) {
      Logger.log('Component failed to retrieve data: ' + reason, 'debug');
      this.trigger('getData:failed', reason);
      return this;
    }
  });

});
