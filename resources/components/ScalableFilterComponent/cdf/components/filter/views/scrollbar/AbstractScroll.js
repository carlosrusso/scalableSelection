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
 * @summary Abstract handler to be used by engine implementation
 * @description Abstract handler to be used by engine implementation
 */
define([
 'cdf/lib/Base'
],function(Base) {

  "use strict";

  return Base.extend({
    constructor: function(view) {
      this.view = view;
      this._position = null;
    },

    setPosition: function($element) {

    },

    savePosition: function(position){
      this._position = this.view.getChildren().eq(position);
      return this._position;
    },

    restorePosition: function() {
      if (this._position) {
        this.setPosition(this._position);
        this._position = null;
      }
    }
  });
 }
);
