"use strict";

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var parse = require('shell-quote').parse;
var spawn = require('child_process').spawn;
var Writable = require('stream').Writable;

var logStream = new Writable();

logStream._write = function(chunk, _, callback) {
  chunk.toString('utf8').split('\n').forEach(function(l) {
    console.error('     -----> ' + l);
  });
};

describe('hipchat2trello', function() {
  it('will stay up for three frickin\' seconds', function(done) {
    this.timeout(6000);

    var procfile = fs.readFileSync(path.join(__dirname, '..', 'Procfile'), 'utf8');

    var cmd;
    assert(procfile.split('\n').some(function(l) {
      if (l.match(/^web: /)) {
        cmd = parse(l.replace('web: ', ''));
        return true;
      }
    }));

    var appEnv = {
      HIPCHAT_TOKEN: 'some_token',
      HIPCHAT_ROOM: 'some_room'
    };

    Object.keys(process.env).forEach(function(k) {
      appEnv[k] = process.env[k];
    });

    var app = spawn(cmd.shift(), cmd, {
      env: appEnv,
      cwd: path.join(__dirname, '..')
    });

    console.error();
    app.stdout.pipe(logStream);
    app.stderr.pipe(logStream);

    app.on('error', function(err) {
      throw err;
    });

    var isDone = false;
    app.on('exit', function() {
      assert(isDone);
    });

    setTimeout(function() {
      isDone = true;
      app.kill(); 
      console.error();
      done();
    }, 3000);
  });
});

