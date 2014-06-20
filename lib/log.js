"use strict";

var EventEmitter = require('events').EventEmitter;

var logger = module.exports = new EventEmitter();

'trace debug info warn error fatal'.split(' ').forEach(function(m) {
  logger[m] = function(body) {
    logger.emit('log', {
      level: m,
      body: body
    });
  };
});

logger.bunyan = function (bunyan) {
  logger.on('log', function(data) {
    var l = bunyan[data.level] || bunyan.info;
    l.call(bunyan, data.body || JSON.stringify(data));
  });
};

