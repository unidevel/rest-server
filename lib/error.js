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

module.exports = {
  JSONError: JSONError,
  TextError: TextError,
  HtmlError: HtmlError
};
