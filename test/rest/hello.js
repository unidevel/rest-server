'use strict';

class hello {
  route(reg){
    reg.get(this.sayWords, '/say')
      .post(this.echo)
  }

  *sayWords(args, ctx){
    return {value: args.words};
  }

  *echo(args, ctx){
    return args.text;
  }
}

module.exports = new hello();
