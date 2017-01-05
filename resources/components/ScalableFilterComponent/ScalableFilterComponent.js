define([
  'cdf/lib/jquery',
  'amd!cdf/lib/underscore',
  './cdf/components/filter/core/Model',
  './cdf/components/filter/FilterComponent'
], function($, _, Model, FilterComponent) {
  "use strict";

  var SelectionStates = Model.SelectionStates;

  var templateInvert = [
    ' <span>{{isSelected}}</span>',
    ' <button class="filter-group-invert-button">Invert</button>'
  ].join('');

  function run(partials, delay) {
    var reaction = {
      partials: partials
    };

    if (delay != null) {
      reaction.delay = delay;
    }

    return reaction;
  }

  return FilterComponent.extend({
    getConfiguration: function() {
      var configuration = this.base();

      configuration.component.Root.view.main.render.push('groupInvert');
      configuration.component.Root.view.partials.groupInvert = {
        selector: '.filter-group-invert:eq(0)',
        template: templateInvert
      };
      configuration.component.Root.view.onModelChange.isSelected = run(['selection', 'controls', 'header', 'groupInvert']);

      configuration.component.Root.view.events["click .filter-group-invert-button:eq(0)"] = function(event) {
        invertSelection(this.model);
        this.model.update();
        return false;
      };

      configuration.component.Group.view.partials.groupInvert = {
        selector: '.filter-group-invert:eq(0)',
        template: templateInvert
      };

      configuration.component.Group.view.main.render.push('groupInvert');
      configuration.component.Group.view.onModelChange.isSelected = run(['selection', 'groupInvert']);
      configuration.component.Group.view.events["click .filter-group-invert-button:eq(0)"] = function(event) {
        invertSelection(this.model);
        this.model.update();
        return false;
      };

      return configuration;
    }
  });

  function invertSelection(model){
    switch (model.getSelection()){
      case SelectionStates.NONE:
        model.setSelection(SelectionStates.ALL);
        return;

      case SelectionStates.ALL:
        model.setSelection(SelectionStates.NONE);
        return;

      case SelectionStates.INCLUDE:
        if(model.children()){
          model.children().each(function(m){
            invertSelection(m);
          });
        }
        model.setSelection(SelectionStates.EXCLUDE);
        return;

      case SelectionStates.EXCLUDE:
        if(model.children()){
          model.children().each(function(m){
            invertSelection(m);
          });
        }
        model.setSelection(SelectionStates.INCLUDE);
        return;
    }
  }

});
