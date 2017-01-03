define([
  'cdf/lib/jquery',
  'amd!cdf/lib/underscore',
  'cdf/Dashboard.Clean',
  'cdf/AddIn',
  './cdf/components/filter/FilterComponent'
], function($, _, Dashboard, AddIn, FilterComponent) {
  "using strict";


  return FilterComponent.extend({

    getConfiguration0: function() {
      var configuration = this.base();

      configuration.component.search.matcher = function(model, text) {
        if (!text || text.length < 3) {
          return true;
        }
        return defaultMatcher(model, text);
      };

      var inputFocus = {
        component: {
          Root: {
            strings: {
              groupSelection: [
                '<div class="normal">',
                configuration.component.Root.strings.groupSelection,
                '</div>',
                '<div class="no-matches">',
                'No matches found',
                '</div>'
              ].join('')
            },
            view: {
              partials: {
                selectionIcon: {
                  selector: '.filter-root-container',
                  renderers: [updateRootSelection]
                },
                filtering: {
                  selector: ".filter-root-container",
                  renderers: [filterMode]
                }
              },
              onModelChange: {
                "searchPattern pim!": {
                  partials: ['selectionIcon', 'filtering']
                  //delay: 10
                }
              }
            }
          }
        }
      };
      $.extend(true, configuration, inputFocus);

      //configuration.component.Root.view.scrollbar.engine = "native";
      configuration.component.Root.view.partials.selection.renderers.push(updateRootSelection);

      configuration.component.Root.view.overlaySimulateClick = false;

      // Move scrollbar to the top
      var that = this;
      this.on("cdf:postExecution", function() {
        var manager = that.manager;
        that.model.on('change:isCollapsed', function(model, value) {
          // Move the scrollbar to the top if there are selected items
          if (model.get('numberOfSelectedItems') === 0) {
            return;
          }

          var view = manager.get('view');
          view.saveScrollBar(0);
          view.restoreScrollBar();
        });

      });

      return configuration;
    }
  });

  function filterMode($tgt, model, configuration, viewModel, viewConfig) {
    var searchPattern = model.get('searchPattern');
    var isFiltering = searchPattern !== "";
    var aboveThreshold = searchPattern.length > 2;

    var nVisibleLeafs = getVisibleLeafs(model.root())
      .size()
      .value();
    var hasMatches = nVisibleLeafs > 0;

    $tgt
      .toggleClass('filtering', isFiltering)
      .toggleClass('filtering-above-threshold', aboveThreshold)
      .toggleClass('filtering-no-matches', !hasMatches);

  }

  function updateRootSelection($tgt, model, configuration, viewModel, viewConfig) {
    var isFiltering = model.get('searchPattern') !== "";
    if (!isFiltering) {
      $tgt
        .toggleClass('all-filtered-selected', false)
        .toggleClass('none-filtered-selected', false)
        .toggleClass('some-filtered-selected', false);

      return;
    }

    var visibleLeafs = getVisibleLeafs(model);

    var selection = visibleLeafs
      .map(function(m) {
        return m.getSelection();
      })
      .value();

    var isAllSelected = _.every(selection);
    var isNoneSelected = !_.some(selection);
    var isSomeSelected = !isAllSelected && !isNoneSelected;

    $tgt
      .toggleClass('all-filtered-selected', isAllSelected)
      .toggleClass('none-filtered-selected', isNoneSelected)
      .toggleClass('some-filtered-selected', isSomeSelected);

  }

  function defaultMatcher(model, text) {
    var fullString = '';
    for (var n = model; n != null; n = n.parent()) {
      fullString = n.get('label') + ' ' + fullString;
    }
    return fullString.toLowerCase().indexOf(text.toLowerCase()) > -1;
  }

  function getVisibleLeafs(model) {
    return model.leafs()
      .filter(function(m) {
        return m.getVisibility();
      });
  }

});
