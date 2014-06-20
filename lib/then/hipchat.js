"use strict";

var assert = require('assert');
var HipChat = require('hipchat-client');
var util = require('util');

module.exports = function(config) {
  assert(config.token, 'Posting to HipChat requires a token');
  assert(config.room_id, 'Posting to HipChat requires a room_id');

  var client = new HipChat(config.token);

  // Post to the specified hipchat room
  return function xPostToHipchat(body, callback) {
    var message = body.message || 'This webhook was somehow triggered without a message. (why oh why isn\'t there a message??)';
    var params = { from: 'Trello' };

    client.sendRoomMessage(message, config.room_id, params, function(err) {
      if (err) {
        return callback(err);
      }
      callback();
    });
  };
};

