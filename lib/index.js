'use strict';
// Must use koa1 instead of koa2
var koa = require('koa.io');
var bodyParser = require('koa-bodyparser');
var convert = require('koa-convert');
var fs = require('fs');
var PATH = require('path');
var middleware = require('./middleware');

function findMethodName(obj, fn){
  var proto = Object.getPrototypeOf(obj);
  // find in prototype
  if ( proto ) {
    var props = Object.getOwnPropertyNames(proto) || [];
    for ( var i = 0; i < props.length; ++ i ) {
      var prop = props[i];
      if ( obj[prop] == fn )
        return prop;
    }
  }
  // find in properties
  {
    var props = Object.getOwnPropertyNames(obj) || [];
    for ( var i = 0; i < props.length; ++ i ) {
      var prop = props[i];
      if ( obj[prop] == fn )
        return prop;
    }
  }
  return null;
}

class RestRouter {
  constructor(){
    this.mapping = {};
  }

  enter(target, prefix){
    this.target = target;
    this.prefix = prefix;
  }

  leave(){
    delete this.target;
    delete this.prefix;
  }

  map(method, fn, uri, extra){
    var prefix = this.prefix;
    if ( uri == null ) {
      uri = findMethodName(this.target, fn);
      if ( uri != null ) uri = '/'+uri;
    }
    if ( uri == null ) throw new Error('Can not mapping function not in target!');
    if ( prefix ) uri = prefix+uri;
    console.log('Mapping '+(method||'ALL')+' '+uri);
    this.mapping[uri] = {
      method: method || null,
      handle: fn.bind(this.target),
      config: extra
    }
    return this;
  }

  get(fn, uri, extra){
    this.map('GET', fn, uri, extra);
    return this;
  }

  post(fn, uri, extra){
    this.map('POST', fn, uri, extra);
    return this;
  }

  put(fn, uri, extra){
    this.map('PUT', fn, uri, extra);
    return this;
  }

  delete(fn, uri, extra){
    this.map('DELETE', fn, uri, extra);
    return this;
  }

  all(fn, uri, extra){
    this.map(null, fn, uri, extra);
    return this;
  }

  middleware(){
    var that = this;
    return function*(next){
      var path = this.path;
      var target = that.mapping[path];
      if ( target ) {
        if ( target.method && target.method != this.method ) {
          this.throw(405, 'Method not allowed!', 405);
        }
        var params ;
        if ( this.method == 'GET' ) {
          params = this.query;
        }
        else {
          params = this.request.body;
        }
        var ctx = {req: this.request};
        var result = yield target.handle(params, ctx);
        if ( result == null || typeof result == 'string' ) {
          this.body = result;
        }
        else {
          this.type = 'json';
          this.body = JSON.stringify(result);
        }
      }
      else {
        yield next;
      }
    }
  }
}

class RestWrapper {
  constructor(options){
    this.options = options;
  }

  createServer(){
    var options = this.options;
    this.app = koa();
    this.router = new RestRouter();
    if ( options.ws ) {
      if ( options.ws.adpater ) app.io.adapt(options.ws.adapter);
    }
    if ( options.http ) {
      var max_requests = options.http.max_requests ;
      if ( max_requests > 0 ) this.app.use(middleware.maxRequests(max_requests));
      var cros = options.http.cros;
      if ( cros && cros.domain ) {
        this.app.use(middleware.accessControl(cros.domain, cros.credential, cros.methods));
      }
    }
    this.app.use(bodyParser());
    if ( typeof(options.setup) == 'function' ) {
      options.setup(this.app);
    }
    this.app.use(this.router.middleware());
    this.app.listen(options.port || process.env.PORT || 3000 );
  }

  routeObject(obj, prefix){
    var router = this.router;
    router.enter(obj, prefix);
    obj.route(router);
    router.leave();
    return this;
  }

  routeDir(path, prefix, recursive){
    fs.readdir(path, function(err, files){
      if ( err ) {
        console.error(err);
      }
      else {
        files.forEach(function(file){
          var newPrefix;
          var index = file.indexOf('.');
          if ( index >= 0 ) newPrefix = '/'+file.substr(0, index);
          else newPrefix = file;
          if ( prefix ) newPrefix = prefix + newPrefix;
          this.routePath(PATH.join(path, file), newPrefix, recursive);
        }.bind(this));
      }
    }.bind(this));
  }

  routeFile(path, prefix){
    var obj = require(path);
    this.routeObject(obj, prefix);
    return this;
  }

  routePath(path, prefix, recursive) {
    fs.stat(path, function(err,stats){
      if ( err ) console.error(err);
      else {
        if ( stats.isDirectory() ) {
          this.routeDir(path, prefix, recursive);
        }
        else if (path.endsWith('.js')) {
          this.routeFile(path, prefix);
        }
        else {
          console.warn('ignore file '+path+' for url mapping');
        }
      }
    }.bind(this));
    return this;
  }

  route(path, prefix, recursive){
    if ( typeof path == 'string' ) {
      this.routePath(path, prefix, recursive);
    }
    else {
      this.routeObject(path, prefix);
    }
    return this;
  }
}

function createWrapper(options){
  var wrapper = new RestWrapper(options || {});
  wrapper.createServer();
  return wrapper;
}

module.exports = createWrapper;
