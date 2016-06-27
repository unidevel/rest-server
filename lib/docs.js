'use strict'
var mustache = require('mustache');
var URI = '/docs';
var fs = require('fs');
var path = require('path');
function docs(uri, router){
  uri = uri || URI;
  var template = fs.readFileSync(path.join(__dirname, './docs.tmpl'), 'utf8');
  var mapping = router.mapping;
  function mapArg(arg){
    var newArg = {};
    Object.assign(newArg, arg);
    newArg.required = arg.optional?'optional':'required';
    return newArg;
  }

  function mapItemView(uri, item, mapArgs){
    var view = {};
    view.uri = uri;
    view.method = item.method || 'ALL';
    view.validate = !!item.validate;
    Object.assign(view, item.config);
    if ( mapArgs && view.args ) {
      var newArgs = [];
      view.args.forEach((arg)=>{
        newArgs.push(mapArg(arg));
      })
      view.args = newArgs;
    }
    return view;
  }
  return function *(next){
    if ( this.path.startsWith(uri) ) {
      var map = [];
      for ( var mapUri in mapping ) {
        var mapItem = mapping[mapUri];
        map.push(mapItemView(mapUri, mapItem));
      }
      var api = this.path.substr(uri.length)
      var selectedItem = mapping[api];
      this.type = 'html';
      this.body = mustache.render(template, {
        base: uri,
        mapping: map,
        selected: selectedItem?mapItemView(api, selectedItem, true):null
      });
    }
    else {
      yield next;
    }
  }
}

module.exports = docs;
