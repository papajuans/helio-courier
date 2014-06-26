"use strict";

var concat = require('concat-stream');
var crypto = require('crypto');
var log = require('../log');
var moment = require('moment');
var util = require('util');

// Verify that payloads are in fact from Trello.
//
// See: https://trello.com/docs/gettingstarted/webhooks.html
// ctrl-f 'validity of a request'
function verify(body, headers, secret, url) {
  var hash = crypto.createHmac('sha1', secret).update(body + url).digest('base64');

  return hash === headers['x-trello-webhook'];
}

// Serialize a raw payload from Trello.
//
// The formats of the payloads (ie, which actions can happen for a given model)
// is not particularly well-documented, so most of this is reverse engineered.
// It tries to produce sane messages in cases where it gets confused, and log
// the raw payload so that one may figure out how to implement that action.
function serialize(payload) {
  var serialized = { _raw: payload };
  var type;

  function malformed() {
    serialized.message = 'Received a malformed or unparseable POST body from' +
      ' Trello. Look at the logs to see the raw payload.';

    log.warn(serialized);
  }

  if (!payload) {
    log.warn('Empty payload!');
    type = 'EMALFORMED';
  }
  else if (!payload.action) {
    log.warn('No payload.action!');
    type = 'EMALFORMED';
  }
  else if (!payload.action.type) {
    log.warn('No payload.action.type!');
    type = 'EMALFORMED';
  }
  else {
    type = payload.action.type;
  }

  try {
    switch (type) {
      case 'addChecklistToCard':
        serialized.message = util.format(
          '<strong>%s</strong> added a checklist to card <strong>%s</strong> on <strong>%s</strong> <a href="%s">%s</a>',
          payload.action.memberCreator.username,
          payload.action.data.card.name,
          payload.action.data.board.name,
          payload.model.shortUrl,
          payload.model.shortUrl
        );
        serialized.ignore = true;
      break;

      case 'addLabelToCard':
        serialized.message = util.format(
          '<strong>%s</strong> added label <strong>%s</strong> to card <strong>%s</strong> in <strong>%s</strong> <a href="%s">%s</a>',
          payload.action.memberCreator.username,
          payload.action.data.text,
          payload.action.data.card.name,
          payload.action.data.board.name,
          payload.model.shortUrl,
          payload.model.shortUrl
        );
      break;

      case 'addMemberToCard':
        var whoWasAdded = payload.action.member.username;

        if (whoWasAdded === payload.action.memberCreator.username) {
          whoWasAdded = 'themself';
        }
        serialized.message = util.format(
          '<strong>%s</strong> added <strong>%s</strong> to card <strong>%s</strong> on <strong>%s</strong> <a href="%s">%s</a>',
          payload.action.memberCreator.username,
          whoWasAdded,
          payload.action.data.card.name,
          payload.action.data.board.name,
          payload.model.shortUrl,
          payload.model.shortUrl
        );
      break;

      case 'removeMemberFromCard':
        var whoWasRemoved = payload.action.member.username;

        if (whoWasRemoved === payload.action.memberCreator.username) {
          whoWasRemoved = 'themself';
        }
        serialized.message = util.format(
          '<strong>%s</strong> removed <strong>%s</strong> from card <strong>%s</strong> on <strong>%s</strong> <a href="%s">%s</a>',
          payload.action.memberCreator.username,
          whoWasRemoved,
          payload.action.data.card.name,
          payload.action.data.board.name,
          payload.model.shortUrl,
          payload.model.shortUrl
        );
      break;

      case 'commentCard':
        serialized.message = util.format(
          '<strong>%s</strong> commented on card <strong>%s</strong> in <strong>%s</strong> <a href="%s">%s</a>',
          payload.action.memberCreator.username,
          payload.action.data.card.name,
          payload.action.data.board.name,
          payload.model.shortUrl,
          payload.model.shortUrl
        );
      break;

      case 'createCard':
        serialized.message = util.format(
          '<strong>%s</strong> created card <strong>%s</strong> in <strong>%s</strong> <a href="%s">%s</a>',
          payload.action.memberCreator.username,
          payload.action.data.card.name,
          payload.action.data.board.name,
          payload.model.shortUrl,
          payload.model.shortUrl
        );
      break;

      case 'createCheckItem':
        serialized.message = util.format(
          '<strong>%s</strong> added a checklist item to card <strong>%s</strong> in <strong>%s</strong> <a href="%s">%s</a>',
          payload.action.memberCreator.username,
          payload.action.data.card.name,
          payload.action.data.board.name,
          payload.model.shortUrl,
          payload.model.shortUrl
        );
        serialized.ignore = true;
      break;

      case 'deleteCheckItem':
        serialized.message = util.format(
          '<strong>%s</strong> removed a checklist item from card <strong>%s</strong> in <strong>%s</strong> <a href="%s">%s</a>',
          payload.action.memberCreator.username,
          payload.action.data.card.name,
          payload.action.data.board.name,
          payload.model.shortUrl,
          payload.model.shortUrl
        );
        serialized.ignore = true;
      break;

      case 'deleteComment':
        serialized.message = util.format(
          '<strong>%s</strong> deleted a comment on card <strong>%s</strong> in <strong>%s</strong> <a href="%s">%s</a>',
          payload.action.memberCreator.username,
          payload.action.data.card.name,
          payload.action.data.board.name,
          payload.model.shortUrl,
          payload.model.shortUrl
        );
        serialized.ignore = true;
      break;

      case 'updateComment':
        serialized.message = util.format(
          '<strong>%s</strong> updated a comment on card <strong>%s</strong> in <strong>%s</strong> <a href="%s">%s</a>',
          payload.action.memberCreator.username,
          payload.action.data.card.name,
          payload.action.data.board.name,
          payload.model.shortUrl,
          payload.model.shortUrl
        );
        serialized.ignore = true;
      break;

      case 'updateCard':
        var past = payload.action.data.old;
        var key = Object.keys(past)[0];
        var present = payload.action.data.card;

        switch (key) {
          case 'due':
            serialized.message = util.format(
              '<strong>%s</strong> changed the due date of card <strong>%s</strong> to <strong>%s</strong> in <strong>%s</strong> <a href="%s">%s</a>',
              payload.action.memberCreator.username,
              payload.action.data.card.name,
              moment(payload.action.data.card.due).format("MMM DD @ hh:mm a"),
              payload.action.data.board.name,
              payload.model.shortUrl,
              payload.model.shortUrl
            );
          break;

          case 'desc':
            serialized.message = util.format(
              '<strong>%s</strong> updated the description in card <strong>%s</strong> of <strong>%s</strong> in <strong>%s</strong> <a href="%s">%s</a>',
              payload.action.memberCreator.username,
              payload.action.data.card.name,
              payload.action.data.board.name,
              payload.model.shortUrl,
              payload.model.shortUrl
            );
            serialized.ignore = true;
          break;

          case 'pos':
            var direction = present.pos - past.pos;
            if (direction > 0) {
              direction = 'upward';
            }
            else {
              direction = 'downward';
            }

            serialized.message = util.format(
              '<strong>%s</strong> reprioritized card <strong>%s</strong> <em>%s</em> in <strong>%s</strong> <a href="%s">%s</a>',
              payload.action.memberCreator.username,
              payload.action.data.card.name,
              direction,
              payload.action.data.board.name,
              payload.model.shortUrl,
              payload.model.shortUrl
            );

            serialized.ignore = true;
          break;

          case 'idList':
            serialized.message = util.format(
              '<strong>%s</strong> moved card <strong>%s</strong> from list <strong>%s</strong> to <strong>%s</strong> in <strong>%s</strong> <a href="%s">%s</a>',
              payload.action.memberCreator.username,
              payload.action.data.card.name,
              payload.action.data.listBefore.name,
              payload.action.data.listAfter.name,
              payload.action.data.board.name,
              payload.model.shortUrl,
              payload.model.shortUrl
            );
          break;

          case 'name':
            serialized.message = util.format(
              '<strong>%s</strong> changed a card\'s name to <strong>%s</strong> in <strong>%s</strong> <a href="%s">%s</a>',
              payload.action.memberCreator.username,
              payload.action.data.card.name,
              payload.action.data.board.name,
              payload.model.shortUrl,
              payload.model.shortUrl
            );
            serialized.ignore = true;
          break;

          default:
            serialized.message = util.format(
              '<strong>%s</strong> updated card <strong>%s</strong> in unparsed manner "%s" in <strong>%s</strong> <a href="%s">%s</a>',
              payload.action.memberCreator.username,
              payload.action.data.card.name,
              key,
              payload.action.data.board.name,
              payload.model.shortUrl,
              payload.model.shortUrl
            );

            log.warn(serialized);

            // The channel doesn't care about this... but maybe there's a
            // better way to do alerts?
            serialized.ignore = true;
        }
      break;

      case 'updateCheckItemStateOnCard':
        serialized.message = util.format(
          '<strong>%s</strong> marked checklist item "<em>%s</em>" as <em>%s</em> in card <strong>%s</strong> on <strong>%s</strong> <a href="%s">%s</a>',
          payload.action.memberCreator.username,
          payload.action.data.checkItem.name,
          payload.action.data.checkItem.state,
          payload.action.data.card.name,
          payload.action.data.board.name,
          payload.model.shortUrl,
          payload.model.shortUrl
        );

        if (payload.action.data.checkItem.state !== 'complete') {
          serialized.ignore;
        }

      break;

      case 'updateCheckItem':
        serialized.message = util.format(
          '<strong>%s</strong> updated checklist item "<em>%s</em>" in card <strong>%s</strong> on <strong>%s</strong> <a href="%s">%s</a>',
          payload.action.memberCreator.username,
          payload.action.data.checkItem.name,
          payload.action.data.card.name,
          payload.action.data.board.name,
          payload.model.shortUrl,
          payload.model.shortUrl
        );

        serialized.ignore = true;

      break;

      case 'EMALFORMED':
        malformed();
      break;
      default:
        serialized.message = util.format(
          '<strong>%s</strong> did <strong>SOME UNPARSED ACTION</strong> of type `%s` in <strong>%s</strong> <a href="%s">%s</a>',
          payload.action.memberCreator.username,
          type,
          payload.action.data.board.name,
          payload.model.shortUrl,
          payload.model.shortUrl
        );

        log.warn(serialized);

        serialized.ignore = true;
    }
  }
  catch (err) {
    // Errors are typically caused by trying to access properties that don't
    // exist. Log the error, and indicate that the payload was malformed
    log.warn(err);
    malformed();
  }

  if (serialized.message) {
    log.info('Serialized message: ' +  serialized.message);
  }
  else {
    // This only happens if there's a bug in the switch statements.
    log.warn('No serialized message?!');
    log.warn(serialized);
  }

  return serialized;
}

var trello = module.exports = function (opts, then) {
  return function requestHandler(req, res) {

    if (req.method !== 'POST') {
      return res.end(JSON.stringify({ alive: true }) + '\n');
    }

    // Collect the request. This assumes the request is streaming.
    // TODO: Consider supporting express body parser if expected properties
    // are defined.
    req.pipe(concat({ encoding: 'string' }, function(body) {
      var jsons, serialized;
      var verified = verify(body, req.headers, opts.secret, opts.callbackUrl);

      // Verify the message as having come from Trello
      if (!verified) {
        log.warn('Unverified message received!');

        res.statusCode = 401;
        return res.end(JSON.stringify({
          code: 401,
          ok: false,
          message: 'You are not Trello, stop frontin\' and gtfo. -_-;'
        }) + '\n');
      }

      // Parse the JSON payload...
      try {
        jsons = JSON.parse(body);
      }
      catch (err) {
        res.statusCode = 400;
        return res.end(JSON.stringify({
          code: 400,
          ok: false,
          message: 'That is not JSON. C\'mon Trello you\'re better than this.'
        }) + '\n');
      }

      // Serialize...
      try {
        serialized = serialize(jsons);
      }
      catch (err) {
        log.error(err);
        serialized = body;
      }

      // Cap off the request when it's time to.
      function finish(err) {
        if (err) {
          log.error(err);

          res.statusCode = 500;
          res.end(JSON.stringify({
            code: 500,
            ok: false,
            message: err.message || 'FLAGRANT ERROR'
          }) + '\n');
        }

        return res.end(JSON.stringify({
          code: 200,
          ok: true,
          message: 'EVERYTHING is COOL'
        }) + '\n');
      }

      // The "ignore" property is set by the serializer and is used to
      // indicate that the result isn't actually wanted.
      if (serialized.ignore) {
        finish();
      }
      else {
        // Call the Action!
        then(serialized, finish);
      }
    }));
  };
};
