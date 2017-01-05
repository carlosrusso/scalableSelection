/**
 * @module BaseFilter
 * @submodule Models
 * @class Tree
 * @constructor
 * @extends Backbone.TreeModel
 * @uses Logger
 * @uses BaseEvents
 */
define([
  'amd!cdf/lib/underscore',
  '../backboneTreemodel/backbone.treemodel',
  '../baseEvents/BaseEvents'
], function (_, Backbone, BaseEvents) {
  var TreeModel = BaseEvents.toBase(Backbone.TreeModel);

  var Tree = TreeModel.extend({

    initialize: function(attrs, options) {
      this.base.apply(this, arguments);

      var parent = this.parent();
      if (parent) {
        this.setComparator(parent.comparator);
      }
      if(options.comparator){
        this.setComparator(options.comparator);
      }
    },

    setComparator: function(comparator) {
      this.comparator = comparator;
    },

    children: function () {
      return this.nodes.apply(this, arguments);
    },

    /**
     * walk down the tree and do stuff:
     * 1. if the node has no children, call itemCallback and get the result
     * 2. if the node has children, run child.walk for every child and combine the array of results with combineCallback
     *
     *
     *     function combineCallback(array, model){
     *         return _.all(array);
     *     }
     *
     * @method walkDown
     * @param {function} itemCallback
     * @param {function} combineCallback
     * @param {function} alwaysCallback
     */
    walkDown: function(itemCallback, combineCallback, alwaysCallback) {
      var _combine = combineCallback;
      var _always = alwaysCallback;

      if (!_.isFunction(combineCallback)) {
        _combine = _.identity;
      }
      if (!_.isFunction(alwaysCallback)) {
        _always = null;
      }
      return this._walkDown(itemCallback, _combine, _always);
    },

    _walkDown: function (itemCb, combineCb, alwaysCb) {
      var result;

      var children = this.children();
      if (children) {
        result = combineCb(children.map(function (child) {
          return child._walkDown(itemCb, combineCb, alwaysCb);
        }), this);
      } else {
        result = itemCb(this);
      }
      if (alwaysCb) {
        result = alwaysCb(this, result);
      }
      return result;
    },

    /**
     * Returns self and descendants as a flat list
     * @method flatten
     * @return {Underscore} Returns a wrapped Underscore object using _.chain()
     */
    flatten: function() {
      return _.chain(
        this._walkDown(_.identity, function(children, parent) {
          children.push(parent);
          return children;
        })
      ).flatten()
    },

    /**
     * Returns just the leaf-level descendants of a given node
     * @return {Underscore} Returns a wrapped Underscore object using _.chain()
     */
    leafs: function(){
      return this.flatten().filter(function(m){
        return m.children() === null;
      });
    },

    sort: function(options) {
      var children = this.children();
      if(!children) {
        return;
      }

      options || (options = {});
      children.sort(options);

      if (!options.silent) {
        this.trigger('sort', this, options);
      }
    },

    Collection:  BaseEvents.toBase(TreeModel.prototype.Collection).extend({
      comparator: {}, // we must fool Backbone.Collection#add into sorting models

      sort: function(options){
        var comparator = this.parent.comparator;
        if(!comparator) return;
        options || (options = {});

        var deepSort = function(left, right) {
          var result = 0;

          var sorters = left.children() ? comparator.group : comparator.item;
          var N = sorters.length;
          for (var k = 0; k < N; k++) {
            result = sorters[k](left, right);
            if (result) {
              return result;
            }
          }
        };
        this.models.sort(deepSort);

        if (!options.silent) {
          this.trigger('sort', this, options);
        }
        return this;
      }

    })
  });

  return Tree;
});
