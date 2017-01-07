define([
  'cdf/lib/jquery',
  'amd!cdf/lib/underscore',
  './cdf/components/filter/core/Model',
  './cdf/components/filter/FilterComponent'
], function($, _, Model, FilterComponent) {
  "use strict";

  var SelectionStates = Model.SelectionStates;

  var templateInvert = [
    '<button class="filter-group-invert-button">Invert</button>',
    '<span>{{isSelected}}</span>'
  ].join('');

  return FilterComponent.extend({
    getConfiguration: function() {
      var configuration = this.base();

      var partialGroupInvert = {
        selector: '.filter-group-invert:eq(0)',
        template: templateInvert
      };

      configuration.component.Root.view.partials.groupInvert = partialGroupInvert;
      configuration.component.Root.view.main.render.push('groupInvert');
      configuration.component.Root.view.onModelChange.isSelected.partials.push('groupInvert');

      configuration.component.Root.view.events["click .filter-group-invert-button:eq(0)"] = function(event) {
        invertSelection(this.model);
        this.model.update();
        return false;
      };

      configuration.component.Group.view.partials.groupInvert = partialGroupInvert;
      configuration.component.Group.view.main.render.push('groupInvert');
      configuration.component.Group.view.onModelChange.isSelected.partials.push('groupInvert');
      configuration.component.Group.view.events["click .filter-group-invert-button:eq(0)"] = function(event) {
        invertSelection(this.model);
        this.model.update();
        return false;
      };

      return configuration;
    }
  });

  function invertSelection(model) {
    var selection = model.getSelection();
    var children = model.children();
    switch (selection) {
      case SelectionStates.NONE:
        model.setSelection(SelectionStates.ALL);
        return;

      case SelectionStates.ALL:
        model.setSelection(SelectionStates.NONE);
        return;

      case SelectionStates.INCLUDE:
        if (children) {
          children.each(function(m) {
            invertSelection(m);
          });
        }
        model.setSelection(SelectionStates.EXCLUDE);
        return;

      case SelectionStates.EXCLUDE:
        if (children) {
          children.each(function(m) {
            invertSelection(m);
          });
        }
        model.setSelection(SelectionStates.INCLUDE);
        return;
    }
  }

});
