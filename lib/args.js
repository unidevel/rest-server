'use strict';
var error = require('./error');
const DUMMY = {};

function arg(name, type, comment, optional, validator, converter){
  return {
    name: name,
    type: type,
    comment: comment,
    optional: !!optional,
    validator: validator,
    converter: converter,
  };
}

function check(args, def){
  if ( !def ) return args;
  args = args || DUMMY;
  var fields = [];
  var newArgs = {};
  def.forEach(function(meta){
    var field = meta.name;
    var value = args[field];
    if ( meta.optional ) {
      newArgs[field] = value;
      return;
    }
    if ( meta.converter ) value = converter(value);
    if ( meta.validator ) {
      if ( !meta.validator(value) ) {
        fields.push(field);
      }
    }
    else {
      if ( meta.type && typeof value != meta.type ) {
        fields.push(field);
      }
    }
    newArgs[field] = value;
  });
  if ( fields.length ) {
    var err = new error.TextError('Validation failed - '+fields.join(','));
    err.status = 400;
    throw err;
  }
  return newArgs;
}

module.exports = {
  check: check,
  arg: arg
}
