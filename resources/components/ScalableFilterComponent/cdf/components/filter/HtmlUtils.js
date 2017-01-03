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
  "cdf/lib/sanitizer/lib/html4",
  "cdf/lib/sanitizer/lib/uri",
  "cdf/lib/sanitizer"
], function() {

  'use strict';

  return {
    sanitizeHtml: function(html) {
      // here is iframe explicitly replaced by script to further sanitizing since sanitizer itself doesn't sanitize iframe tag
      html = html
        .replace(/<iframe\b[^>]*>/gi, "<script>")
        .replace(/<\/iframe>/gi, "</script>");

      return Sanitizer.sanitize(html);
    }
  }
});
