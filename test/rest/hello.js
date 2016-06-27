'use strict';

class hello {
  route(ctx){
    ctx.get(this.sayWords, '/say', {
      validate: true,
      comment: 'say some words',
      args: [
        ctx.arg('words', 'string', 'words to say')
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
