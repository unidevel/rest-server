'use strict';
var debug = require('debug')('rest-server:router');
var args = require('./args');
var co = require('co');

function isFunction(fn){
  return fn && typeof(fn) === 'function';
}

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
    this.arg = args.arg;
    this.name = 'RestAPI';
  }

  enter(target, prefix){
    this.target = target;
    this.prefix = prefix;
  }

  leave(){
    delete this.target;
    delete this.prefix;
  }

  _map(method, fn, uri, extra){
    var prefix = this.prefix;
    if ( uri == null ) {
      uri = findMethodName(this.target, fn);
      if ( uri != null ) uri = '/'+uri;
    }
    if ( uri == null ) throw new Error('Can not mapping function not in target!');
    if ( prefix ) uri = prefix+uri;
    debug('Mapping',(method||'ALL'),uri);
    this.mapping[uri] = {
      target: this.target,
      method: method || null,
      handle: fn.bind(this.target),
      config: extra || {}
    }
    return this;
  }

  get(fn, uri, extra){
    this._map('GET', fn, uri, extra);
    return this;
  }

  post(fn, uri, extra){
    this._map('POST', fn, uri, extra);
    return this;
  }

  put(fn, uri, extra){
    this._map('PUT', fn, uri, extra);
    return this;
  }

  delete(fn, uri, extra){
    this._map('DELETE', fn, uri, extra);
    return this;
  }

  all(fn, uri, extra){
    this._map(null, fn, uri, extra);
    return this;
  }

  map(fn, uri, extra){
    this._map(null, fn, uri, extra);
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
        if ( target.config.check || target.config.validate) {
          params = args.check(params, target.config.args);
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

class WebSocketRouter {
  constructor(io){
    this.io = io;
    this.name = 'WebSocket'
    this.mapping = {};
    this.targets = [];
    this.arg = args.arg;
  }

  enter(target, prefix){
    this.target = target;
    this.targets.push(target);
    this.prefix = prefix;
  }

  leave(){
    delete this.target;
    delete this.prefix;
  }

  map(fn, uri, extra){
    var prefix = this.prefix;
    if ( uri == null ) {
      uri = findMethodName(this.target, fn);
      if ( uri != null ) uri = '/'+uri;
    }
    if ( uri == null ) throw new Error('Can not mapping function not in target!');
    if ( prefix ) uri = prefix+uri;
    debug('Mapping websocket ',uri);
    this.mapping[uri] = {
      target: this.target,
      handle: fn.bind(this.target),
      config: extra || {}
    }
    return this;
  }

  middleware(){
    var that = this;
    return function*(next){
      var socket = this.socket;
      var mapping = that.mapping;
      var targets = that.targets;
      var io = that.io;
      var ctx = {socket: socket, io: io};
      for ( var name in mapping ) {
        var target = mapping[name];
        socket.on(name, function(target, args){
          co.wrap(target.handle)(args, ctx)
            .then(function(){})
            .catch(function genError(err){
              if ( isFunction( target.target.onError ) ) {
                var context = {
                  socket: socket,
                  io: io,
                  uri: name
                }
                target.target.onError(err, context);
              }
              else {
                console.error(name, err, err.stack);
              }
            });
        }.bind(null, target));
      }
      socket.on('error', function(err){
        var count = targets.length;
        var handled = false;
        for ( var i = 0; i < count; ++ i ){
          var target = targets[i];
          if ( isFunction( target.onError ) ) {
            handled = true;
            target.onError(err, ctx);
          }
        }
        if ( !handled ) {
          console.error(err, err.stack);
        }
      });
      var count = targets.length;
      for ( var i = 0; i < count; ++ i ){
        var target = targets[i];
        if ( isFunction( target.onConnect ) ) {
          target.onConnect(socket, ctx);
        }
      }
      yield* next;
      for ( var i = count-1; i >= 0; -- i ){
        var target = targets[i];
        if ( isFunction( target.onDisconnect ) ) {
          target.onDisconnect(socket, ctx);
        }
      }
    }
  }
}

module.exports = {
  RestRouter: RestRouter,
  WebSocketRouter: WebSocketRouter
}
