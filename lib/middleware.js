'use strict';
var debug = require('debug')('rest-shell:middleware');
function maxRequests(max_requests){
  var count = 0;
  return function*(next){
    count ++;
    try {
      if ( count > max_requests ) {
        this.throw(429, 'Too many requests');
      }
      yield next;
    }
    finally {
      count --;
    }
  }
}

/*
function checkDomain(req, domain) {
  var origin = req.get('Origin');
  if ( origin ) {
    var pos = origin.indexOf(domain);
    if ( pos >= 0 && pos <= 24 ) {
      return true;
    }
  }
  return false;
}

function accessControlExpress(domain, credential, methods){
  var ALLOW_METHODS = methods || 'POST, GET, OPTIONS';
  var ALLOW_CREDENTIALS = !!credential;
  if ( domain == '*' ) {
    return function (req, res, next) {
      res.header('Access-Control-Allow-Origin', domain);
      res.header('Access-Control-Allow-Credentials', ALLOW_CREDENTIALS);
      res.header('Access-Control-Allow-Methods', ALLOW_METHODS);
      next();
    }
  }
  else {
    return function (req, res, next) {
      if ( checkDomain( req, domain ) ) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', ALLOW_CREDENTIALS);
        res.header('Access-Control-Allow-Methods', ALLOW_METHODS);
      }
      next();
    }
  }
}
*/

function accessControl(domain, credential, methods){
  var ALLOW_METHODS = null;
  if ( methods && methods.join ) {
    ALLOW_METHODS = methods.join(',');
  }
  else {
    ALLOW_METHODS = methods;
  }
  var ALLOW_CREDENTIALS = null;
  if ( credential !== undefined ) ALLOW_CREDENTIALS = !!credential;
  return function*(next){
    this.set('Access-Control-Allow-Origin', domain);
    if ( ALLOW_CREDENTIALS != null ) this.set('Access-Control-Allow-Credentials', ALLOW_CREDENTIALS);
    if ( ALLOW_METHODS != null ) this.set('Access-Control-Allow-Methods', ALLOW_METHODS);
    yield next;
  }
}

module.exports = {
  maxRequests: maxRequests,
  accessControl: accessControl
}
