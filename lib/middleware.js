'use strict';
var debug = require('debug')('rest-server:middleware');
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
