'use strict';

class hello {
  route(reg){
    reg.get(this.sayWords, '/say', {
      validate: true,
      comment: 'say some words',
      args: [
        reg.def('words', 'string', 'words to say')
      ]})
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
