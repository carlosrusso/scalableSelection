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

(function() {
  var requirePaths = requireCfg.paths;

  // TODO: var isDebug = typeof document == "undefined" || document.location.href.indexOf("debug=true") > 0;

  var prefix;
  if(typeof KARMA_RUN !== "undefined") { // test
    //prefix = requirePaths['scalableSelection/components'] = CONTEXT_PATH + './components';
    prefix = requirePaths['scalableSelection/components'] = 'resources/components';

  } else if(typeof CONTEXT_PATH !== "undefined") { // production vs debug
    //requirePaths['autoPrompt/components'] = CONTEXT_PATH + 'api/repos/autoPrompt/resources/components' + (isDebug ? '' : '/compressed');
    prefix = requirePaths['scalableSelection/components'] = CONTEXT_PATH + 'api/repos/scalableSelection/resources/components';

  } else if(typeof FULLY_QUALIFIED_URL != "undefined") { // embedded production vs debug
    //requirePaths['autoPrompt/components'] = FULLY_QUALIFIED_URL  + 'api/repos/autoPrompt/resources/components' + (isDebug ? '' : '/compressed');
    prefix = requirePaths['scalableSelection/components'] = FULLY_QUALIFIED_URL + 'api/repos/scalableSelection/resources/components';

  } else { // build
    prefix = requirePaths['scalableSelection/components'] = '../resources/components';
  }


  requireCfg.packages = requireCfg.packages || [];
  function registerComponent(name) {
    requireCfg.packages.push({
      "name": "scalableSelection/components/" + name,
      "main": name
    });

  }

  [
    'ScalableFilterComponent'
  ].forEach(registerComponent);

})();
