'use strict'
var mustache = require('mustache');
var URI = '/docs';
var fs = require('fs');
var path = require('path');
function docs(uri, router){
  uri = uri || URI;
  var template = fs.readFileSync(path.join(__dirname, './docs.tmpl'), 'utf8');
  var mapping = router.mapping;
  return function *(next){
    if ( this.path.startsWith(uri) ) {
      var map = [];
      for ( var mapUri in mapping ) {
        map.push({uri: mapUri, config: mapping[mapUri]});
      }
      var api = this.path.substr(uri.length)
      var config = mapping[api] || {};
      this.type = 'html';
      this.body = mustache.render(template, {
        base: uri,
        mapping: map,
        selected: config?{uri:api, config:config}:null
      });
    }
    else {
      yield next;
    }
  }
}

module.exports = docs;
