'use strict';

class JSONError extends Error{
  constructor(value){
    super(JSON.stringify(value));
    this.json = value;
  }
}

class TextError extends Error{
  constructor(msg){
    super(msg);
    this.message = msg;
  }
}

class HtmlError extends Error{
  constructor(html){
    super(html);
    this.message = message;
  }
}

class HttpError extends Error {
  constructor(opts, body){
    super(body || (opts && (opts.msg || opts.message)));
    if ( body ) this.body = body;
    if ( typeof opts == 'number' ) this.code = opts;
    else {
      for ( var key in opts ) {
        this[key] = opts[key];
      }
    }
  }
}

module.exports = {
  JSONError: JSONError,
  TextError: TextError,
  HtmlError: HtmlError,
  HttpError: HttpError
};
