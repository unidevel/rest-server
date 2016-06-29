'use strict'
var mustache = require('mustache');
var URI = '/docs';
var fs = require('fs');
var path = require('path');
function docs(uri, routers){
  uri = uri || URI;
  var template = fs.readFileSync(path.join(__dirname, './docs.tmpl'), 'utf8');
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
      var mappings = [];
      var api = this.path.substr(uri.length);
      api = api.substr(1);
      var pos = api.indexOf('/');
      var index = parseInt(api.substr(0,pos));
      api = pos < 0 ? api : api.substr(pos);
      var selectedRouter = routers[index];
      var selectedItem = null;
      if ( selectedRouter && selectedRouter.mapping ) {
        selectedItem = selectedRouter.mapping[api];
      }
      for ( var i = 0; i < routers.length; ++ i ) {
        var router = routers[i];
        if ( router == null ) continue;
        var mapping = router.mapping;
        var map = [];
        mappings.push({mapping: map, index: i, name: router.name || 'Unknown'});
        for ( var mapUri in mapping ) {
          var mapItem = mapping[mapUri];
          map.push(mapItemView(mapUri, mapItem));
        }
      }
      this.type = 'html';
      this.body = mustache.render(template, {
        base: uri,
        mappings: mappings,
        selected: selectedItem?mapItemView(api, selectedItem, true):null
      });
    }
    else {
      yield next;
    }
  }
}

module.exports = docs;
