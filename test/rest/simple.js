'use strict';

class Simple {
  *args(args, ctx){
    return {args: args}
  }
}

module.exports = new Simple();
