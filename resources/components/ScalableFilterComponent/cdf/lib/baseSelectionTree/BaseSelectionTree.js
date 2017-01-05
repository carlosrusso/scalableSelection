/**
 * Represents the state of the filter as tree structure.
 #
 * @module BaseFilter
 * @submodule Models
 * @class SelectionTree
 * @constructor
 * @extends Tree
 */

define([
  'amd!cdf/lib/underscore',
  './Tree',
  'cdf/Logger'
], function(_, Tree, Logger) {

  /**
   * The selection state representation.
   *
   * @typedef {?boolean | ?string} SelectionStates
   * @property {null}  SOME - Some items selected.
   * @property {}     INCLUDE - Only the items marked as selected are included in the selection.
   * @property {}    EXCLUDE - All items except those marked as unselected are included in the selection.
   * @property {false} NONE - No items selected.
   * @property {true}  ALL  - All items selected.
   */
  var SelectionStates = {
    NONE: "none",
    INCLUDE: "include",
    EXCLUDE: "exclude",
    ALL: "all"
  };

  var SelectionStateValues = ["include", "exclude", "none", "all"];

  var ISelection = {

    /**
     * Gets the selection state of the model.
     *
     * @method getSelection
     * @public
     * @return {Boolean}
     */
    getSelection: function() {
      return this.get('isSelected');
    },

    /**
     * Sets the selection state of the model.
     *
     * @method setSelection
     * @public
     * @param {SelectionStates} newState The new selection state to be set.
     */
    setSelection: function(newState) {
      if (this.getSelection() === newState) {
        //Logger.log("No need to set selection of ", this.get('id'), " to ", newState);
        return;
      }

      this._setSelection(newState);

      var parent = this.parent();
      if (parent) {
        parent.updateSelection();
      }
      return this;
    },

    _setSelection: function(newState) {
      this.set('isSelected', newState);

      if (newState !== SelectionStates.ALL && newState !== SelectionStates.NONE) {
        return;
      }

      var children = this.children();
      if (!children) {
        return;
      }

      children.each(function(child) {
        if (child.getSelection() !== newState) {
          child._setSelection(newState);
        }
      });
    },

    setAndUpdateSelection: function(newState) {
      this._setSelection(newState);
      this.update();
      this.trigger('selection', this);
    },

    getSelectedItems: function(field) {
      var isSelected = this.getSelection();

      switch (isSelected) {
        case SelectionStates.NONE:
          return [];
        case SelectionStates.ALL:
          return [this.get(field || 'id')];
        default:
          var children = this.children();
          if (children) {
            return children.chain()
              .map(function(child) {
                return child.getSelectedItems(field);
              })
              .flatten()
              .value();
          }
      }
      return [];
    },

    update: function() {
      var root = this.root();
      root.updateSelection();

      root._updateCount('numberOfSelectedItems', getSelection);

      var numberOfServerItems = root.get('numberOfItemsAtServer');
      if (numberOfServerItems != null) {
        root.set('numberOfItems', numberOfServerItems);
      } else {
        root._updateCount('numberOfItems', function(model) {
          return 1; // 1 parent + 10 children === 11?
        });
      }
      return this;
    },

    updateSelection: function() {
      function setSelection(model, state) {
        if (model.children()) {
          model.setSelection(state);
        }
        return state;
      }

      return this._walkDown(getSelection, reduceSelectionStates, setSelection);
    },


    hasChanged: function(attr) {
      if (attr && attr !== 'isSelected') {
        return this.base(attr);
      }

      var _previousSelection = this.get('selectedItems');
      if (_previousSelection == null) {
        return false;
      }

      var previousSelection = _previousSelection.value();

      // Confirm if any of the previously marked items changed its selection state
      var foundChange = _.some(previousSelection.include, function(m) {
        return m.getSelection() != SelectionStates.INCLUDE;
      });
      if (foundChange) {
        return true;
      }

      foundChange = _.some(previousSelection.none, function(m) {
        return m.getSelection() != SelectionStates.NONE;
      });
      if (foundChange) {
        return true;
      }

      var foundChange = _.some(previousSelection.exclude, function(m) {
        return m.getSelection() != SelectionStates.EXCLUDE;
      });
      if (foundChange) {
        return true;
      }

      foundChange = _.some(previousSelection.all, function(m) {
        return m.getSelection() != SelectionStates.ALL;
      });
      if (foundChange) {
        return true;
      }

      // Perhaps we added more elements after saving the snapshot.
      // Let's see if any of the new items are selected.
      // We must take into account if the parent item was previously stored as ALL or NONE
      function item(m) {
        if (m.getSelection() === SelectionStates.ALL) { // is selected
          var isNotNew = _.contains(previousSelection.all, m);
          if (isNotNew) {
            return false;
          }
          // is new
          var parent = m.parent();
          if (parent) {
            // if the parent was previously unselected, and the child is selected, then
            // something has changed
            return _.contains(previousSelection.none, parent);
          }
        }
        return false;
      }

      function aggregate(results, m) {
        return _.some(results);
      }

      return this._walkDown(item, aggregate);
    },

    /**
     * Mark listed items as selected.
     *
     * @method setSelectedItems
     * @param {Array} idList A list of ids.
     */
    // NOTE: currently acts directly on the model and bypasses any business logic
    // TODO: change implementation to be recursive rather than acting on a flat tree
    setSelectedItems: function(idList) {
      var nodes = this.flatten().partition(function(m) {
        return m.children() == null;
      }).value();

      var leafs = nodes[0];
      var parents = nodes[1];

      if (leafs.length + parents.length === 0) {
        return;
      }

      var idMap = {};
      _.each(idList, function(id) {
        idMap[id] = 1;
      });

      _.each(leafs, function(m) {
        var id = m.get('id');
        if (_.has(idMap, id)) {
          m.setSelection(SelectionStates.ALL);
        } else {
          m.setSelection(SelectionStates.NONE);
        }
      });

      _.each(parents, function(m) {
        var id = m.get('id');
        if (_.has(idMap, id)) {
          m.setSelection(SelectionStates.ALL);
        }
      });

      this.update();
      return this.root().updateSelectedItems({
        silent: true
      });
    },

    updateSelectedItems: function(options) {
      var root = this.root();
      root.set('selectedItems', root._getSelectionSnapshot(), options);
    },

    restoreSelectedItems: function() {
      var _selectedItems = this.root().get('selectedItems');
      if (_selectedItems == null) {
        return;
      }

      var root = this.root();
      root.setSelection(SelectionStates.NONE);

      var selectedItems = _selectedItems.value();

      _.each(selectedItems.all, function(m) {
        m.setSelection(SelectionStates.ALL);
      });

      this.update();
    },

    _getSelectionSnapshot: function() {
      var selectionSnapshot = this.flatten()
        .groupBy(function(m) {
          switch (m.getSelection()) {
            case SelectionStates.NONE:
              return "none";
            case SelectionStates.INCLUDE:
              return "include";
            case SelectionStates.EXCLUDE:
              return "exclude";
            case SelectionStates.ALL:
              return "all";
            default:
              return "undefined";
          }
        });

      return selectionSnapshot;
    }
  };

  var IVisibility = {
    getVisibility: function() {
      return this.get('isVisible');
    },

    setVisibility: function(newState) {
      var isVisible = this.get('isVisible');
      if (isVisible !== newState) {
        return this.set('isVisible', newState);
      }
      //Logger.debug("No need to set visibility of ", this.get('id'), " to ", newState);
    },

    filterBy: function(text) {
      var root = this.root();
      if (text !== root.get('searchPattern')) {
        root.set('searchPattern', text); //,{silent: true});
      }

      this._filter(text, root.get("matcher"));
      root.setVisibility(true);
      return this;
    },


    _filter: function(text, customMatcher) {

      /*
       * decide on item visibility based on a match to a filter string
       * The children are processed first in order to ensure the visibility is reset correctly
       * if the user decides to delete/clear the search box
       */

      var isMatch;
      var children = this.children();

      if (children) {
        // iterate over all children to set the visibility
        isMatch = children.chain()
          .map(function(m) {
            return m._filter(text, customMatcher);
          })
          .some()
          .value();
      } else if (_.isEmpty(text)) {
        isMatch = true;
      } else {
        isMatch = customMatcher(this, text);
      }

      this.setVisibility(isMatch);
      return isMatch;
    }
  };

  var Mixins = _.extend({}, ISelection, IVisibility);

  var BaseSelectionTree = Tree.extend(Mixins).extend(/** @lends cdf.lib.BaseSelectionTree */{

    /**
     * Default values for each node in the selection tree.
     *
     * @type     {Object}
     * @property {string}  id                    - The default id.
     * @property {string}  label                 - The default label.
     * @property {boolean} isSelected            - The default selection state.
     * @property {boolean} isVisible             - The default visibility state.
     * @property {number}  numberOfSelectedItems - The default number of selected items.
     * @property {number}  numberOfItems         - The default number of items.
     */
    defaults: function() {
      return {
        id: undefined,
        label: '',
        isSelected: SelectionStates.NONE,
        isVisible: true
        // numberOfSelectedItems: 0, // no need to define this as default
        // numberOfItems: 0  // no need to define this as default
      };
    },

    initialize: function(attributes, options) {
      this.base.apply(this, arguments);

      if (this.isRoot()) {
        // Initializations specific to root node
        this.set('matcher', getOwn(options, 'matcher') || defaultMatcher);
        this.on('change:searchPattern', function(model, value) {
          model.filterBy(value);
        });
      }
    },

    /**
     * Loads a model specification.
     *
     * @param {modelSpec} data - A tree model specification
     */
    load: function(data) {
      if (!data) {
        return;
      }

      var selectionState = this.getSelection();

      switch (selectionState) {
        case SelectionStates.ALL:
        case SelectionStates.EXCLUDE:
          data.isSelected = SelectionStates.ALL;
          break;
        case SelectionStates.NONE:
        case SelectionStates.INCLUDE:
          data.isSelected = SelectionStates.NONE;
          break;
      }
      this.add(data);


      if (_.includes(SelectionStateValues, selectionState)) {
        this._setSelection(selectionState);
      }

      // If there's a searchPattern defined, adjust the visibility of this node
      var root = this.root();
      var filterText = root.get('searchPattern');
      this._filter(filterText, root.get('matcher'));

      this.update();
    },

    count: function(countItemCallback) {
      if (!countItemCallback) {
        countItemCallback = function() {
          return 1;
        };
      }
      return this._walkDown(countItemCallback, computeNumberOfItems, null);
    },

    _updateCount: function(property, countItemCallback) {
      function setPropertyIfParent(model, count) {
        if (model.children()) {
          model.set(property, count);
        }
        return count;
      }

      return this._walkDown(countItemCallback, computeNumberOfItems, setPropertyIfParent);
    }

  }, {
    SelectionStates: SelectionStates,
    Collection: Tree.Collection
  });

  return BaseSelectionTree;

  function computeNumberOfItems(list, model) {
    switch (model.getSelection()) {
      case SelectionStates.NONE:
        return 0;

      case SelectionStates.ALL:
        return model.get('numberOfItemsAtServer');

      case SelectionStates.INCLUDE:
        return _.reduce(list, function(memo, st) {
          return st === SelectionStates.ALL ? memo + 1 : memo;
        }, 0);

      case SelectionStates.EXCLUDE:
        var excludedItems = _.reduce(list, function(memo, st) {
          return st === SelectionStates.NONE ? memo + 1 : memo;
        }, 0);
        return model.get('numberOfItemsAtServer') - excludedItems;
    }
  }

  function getSelection(model) {
    return model.getSelection();
  }

  /**
   * Infers the state of a node, based on the current state of its children.
   *
   * @param {SelectionStates[]} states an array containing the state of each child
   * @return {SelectionStates} Returns the inferred state
   */
  function reduceSelectionStates(states, self) {
    var currentState = self.getSelection();

    var isAll = _.every(states, function(el) {
      return el === SelectionStates.ALL;
    });
    if (isAll) {
      var nItemsAtServer = self.get('numberOfItemsAtServer');
      var isReallyAll =
        (nItemsAtServer === undefined) || // the user did not configure the filter with this info
        (states.length === nItemsAtServer) ||
        (currentState === SelectionStates.EXCLUDE) ||
        (currentState === SelectionStates.ALL);

      if (isReallyAll) {
        return SelectionStates.ALL;
      }
    }

    var isNone = _.every(states, function(el) {
      return el === SelectionStates.NONE;
    });
    if (isNone && currentState !== SelectionStates.EXCLUDE) {
      return SelectionStates.NONE;
    }

    if (currentState === SelectionStates.NONE || currentState === SelectionStates.INCLUDE) {
      return SelectionStates.INCLUDE;
    }

    if (currentState === SelectionStates.ALL || currentState === SelectionStates.EXCLUDE) {
      return SelectionStates.EXCLUDE;
    }
  }

  function getOwn(o, p, v) {
    return _.has(o, p) ? o[p] : v;
  }

  function defaultMatcher(model, text) {
    var fullString = '';
    for (var m = model; m != null; m = m.parent()) {
      fullString = m.get('label') + ' ' + fullString;
    }
    return fullString.toLowerCase().indexOf(text.toLowerCase()) > -1;
  }

});
