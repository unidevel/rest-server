'use strict';

var path = require('path');
var restServer = require('../');
var agent = require('superagent');
var test = require('ava');
var base = 'http://localhost:3000';
var server = null;

test.before(t=>{
  server = restServer({
    http: {
      max_requests: 10,
      cros: {
        domain: '*',
        credential: false,
        methods: ['GET', 'POST']
      }
    },
    port: 3000
  });
  server.route(path.join(__dirname, 'rest'));
});

test.cb('simple GET', t=>{
  var words = 'hello, world';
  agent.get(base+'/hello/say')
    .query({words: words})
    .end((err, res)=>{
      if ( err ) t.fail();
      else t.is(words, res.body.value);
      t.end();
    })
});

test.cb('method not allowed', t=>{
  var words = 'hello, world';
  agent.post(base+'/hello/say')
    .send({words: words})
    .end((err, res)=>{
      if ( err ) t.is(err.status, 405);
      else t.fail()
      t.end();
    })
});

test.cb('simple POST', t=>{
  var words = 'hello, world';
  agent.post(base+'/hello/echo')
    .send({text: words})
    .end((err, res)=>{
      if ( err ) t.fail();
      else t.is(words, res.text);
      t.end();
    })
});

test.after(t=>{
  server.stopServer(true);
});
