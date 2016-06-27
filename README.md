# rest-server
---
### Rest server used as a quick way to test a rest api, without setting up the web environment like express or koa. It provide a command line to start a web server to serve your rest apis.

## Prerequisite
* Node > 4.4
* Rest API using generator

## Install

You can install via npm.

```bash
$ npm install rest-server --save
```

## USAGE:
```bash
$ rest-server [-p port] [-r] <rest dir>
```

## Example

Suppose you have your rest apis under the directory named "test", you can add a new file to start the rest-server

```bash
$ cd <path to your project>
$ rest-server -p 3000 ./rest
```

Rest API Example
```js
'use strict';

class hello {
  // Request example: /hello/echo?text=words
  *echo(args){
    return args.text;
  }
}

module.exports = new hello();
```
