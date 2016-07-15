'use strict';
var debug = require('debug')('rest-server');
var bodyParser = require('koa-bodyparser');
var convert = require('koa-convert');
var router = require('./router');
var fs = require('fs');
var PATH = require('path');
var middleware = require('./middleware');
var error = require('./error');
var GeneratorPrototype = Object.getPrototypeOf(function*(){}).constructor;


var JSONError = error.JSONError, TextError = error.TextError, HtmlError = error.HtmlError, PageError = error.PageError;

function isFunction(fn){
  return fn && typeof(fn) === 'function';
}

function isGeneratorFunction(fn){
  var proto = fn && Object.getPrototypeOf(fn);
  return proto && proto.constructor == GeneratorPrototype;
}

function defaultRoute(router, obj){
  var methods = {};
  for ( var prop in obj ) {
    if ( isGeneratorFunction(obj[prop]) ){
      methods[prop] = obj[prop];
    }
  }

  var proto = Object.getPrototypeOf(obj);
  // find in prototype
  if ( proto ) {
    var props = Object.getOwnPropertyNames(proto) || [];
    for ( var i = 0; i < props.length; ++ i ) {
      var prop = props[i];
      if ( prop == 'caller' || prop == 'arguments' ) continue;
      if ( isGeneratorFunction(obj[prop]) ){
        methods[prop] = obj[prop];
      }
    }
  }

  for ( var name in methods ) {
    var uri = '/'+name;
    var fn = methods[name];
    router.map(fn, uri);
  }
}

function* errorMiddleware(next){
  try {
    yield* next;
  }
  catch(err){
    if (404 == err.status) return;
    var status = err.status || 500;
    var message = err.message || err.toString();
    this.status = status;
    if (err instanceof JSONError) {
      this.type = 'application/json';
      this.body = err.json;
    }
    else if ( err instanceof TextError ) {
      this.type = 'text/plain';
      this.body = message;
    }
    else if ( err instanceof HtmlError ) {
      this.type = 'text/html';
      this.body = message;
    }
    else {
      if ( message ) this.body = message;
      this.app.emit('error', err, this);
    }
  }
  return;
}

class RestServer {
  constructor(options){
    this.options = options;
    this.app = null;
    this.server = null;
  }

  startServer(cb){
    var options = this.options;
    if(options.ws) {
      var koa = require('koa.io');
      this.app = koa();
      this.wsRouter = new router.WebSocketRouter(this.app.io);
    }
    else {
      var koa = require('koa');
      this.app = koa();
    }
    this.app.use(errorMiddleware);
    this.restRouter = new router.RestRouter(this.app);
    if ( options.http ) {
      var max_requests = options.http.max_requests ;
      if ( max_requests > 0 ) this.app.use(middleware.maxRequests(max_requests));
      var cros = options.http.cros;
      if ( cros && cros.domain ) {
        this.app.use(middleware.accessControl(cros.domain, cros.credential, cros.methods));
      }
      if ( options.http.static ) {
        var serve = require('koa-static-cache');
        this.app.use(serve(options.http.static));
      }
    }
    if ( options.docs ) {
      var docs = require('./docs');
      var docsuri = '/docs';
      if ( typeof options.docs == 'string' ) {
        docsuri = options.docs;
      }
      this.app.use(docs(docsuri, [this.restRouter, this.wsRouter]));
    }

    var bodyOptions = (options.http && options.http.bodyParser) || null;
    this.app.use(bodyParser(bodyOptions));
    if ( typeof(options.setup) == 'function' ) {
      options.setup(this.app);
    }
    this.app.use(this.restRouter.middleware());
    if ( this.wsRouter ) this.app.io.use(this.wsRouter.middleware());
    this.server = this.app.listen(options.port || process.env.PORT || 3000, cb);
  }

  stopServer(cb){
    if ( this.server ) {
      var that = this;
      this.server.close(cb);
      this.server = null;
      this.app = null;
    }
  }

  _routeModule(router, obj, prefix){
    router.enter(obj, prefix);
    if ( obj.route ) {
      obj.route(router);
    }
    else {
      defaultRoute(router, obj);
    }
    router.leave();
    return this;
  }

  _routeDir(router, path, prefix, recursive){
    fs.readdir(path, function(err, files){
      if ( err ) console.error(err);
      else {
        files.forEach(function(file){
          var newPrefix;
          var index = file.indexOf('.');
          if ( index >= 0 ) newPrefix = '/'+file.substr(0, index);
          else newPrefix = file;
          if ( prefix ) newPrefix = prefix + newPrefix;
          this._routePath(router, PATH.join(path, file), newPrefix, recursive);
        }.bind(this));
      }
    }.bind(this));
  }

  _routeFile(router, path, prefix){
    var obj = require(path);
    this._routeModule(router, obj, prefix);
    return this;
  }

  _routePath(router, path, prefix, recursive) {
    fs.stat(path, function(err,stats){
      if ( err ) console.error(err);
      else {
        if ( stats.isDirectory() ) {
          this._routeDir(router, path, prefix, recursive);
        }
        else if (path.endsWith('.js')) {
          this._routeFile(router, path, prefix);
        }
        else {
          console.warn('Ignored '+path+ ' for mapping!');
        }
      }
    }.bind(this));
    return this;
  }

  _route(router, path, prefix, recursive){
    if ( typeof path == 'string' ) {
      this._routePath(router, path, prefix, recursive);
    }
    else {
      this._routeModule(router, path, prefix);
    }
    return this;
  }

  route(path, prefix, recursive){
    return this._route(this.restRouter, path, prefix, recursive);
  }

  routeWS(path, prefix, recursive){
    return this._route(this.wsRouter, path, prefix, recursive);
  }
}

function createServer(options){
  var server = new RestServer(options || {});
  server.startServer();
  return server;
}

module.exports = createServer;
