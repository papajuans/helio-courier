# helio-courier

A budding webhooks framework for node.js

## Example:

```js
#!/usr/bin/env node

"use strict";

var bunyan = require('bunyan').createLogger({ name: 'helio-courier' });
var helio = require('../');
var http = require('http');

var port = Number(process.env.PORT || 8080);

http.createServer(
  helio.if.trello({
    secret: process.env.TRELLO_SECRET,
    callbackUrl: process.env.TRELLO_CALLBACK_URL
  }, helio.then.hipchat({
    token: process.env.HIPCHAT_TOKEN,
    room_id: process.env.HIPCHAT_ROOM
  }))
).listen(port, function(err) {
  if (err) {
    throw err;
  }
  bunyan.info('helio-courier listening on ' + port);
});

helio.log.bunyan(bunyan);
```

## Supported webhook triggers

* Trello

## Supported webhook actions

* HipChat

## Basic webhook API (`helio.if`)

### `helio.if.trello(options, action)`

Returns a request handler suitable for use with trello.

#### Options:

* **secret:** This is your [Trello secret](https://trello.com/1/appKey/generate).
* **callbackUrl:** This is the url at which Trello is POSTING.

#### Creating a Trello webhook:

This is not an easy task, as it can be done [through the API only](https://trello.com/docs/api/webhook/index.html). Here are a whole bunch of notes on the process:

1. [Set up your application key/secret pair](https://trello.com/1/appKey/generate)

2. Fill in the blanks in `https://trello.com/1/authorize?key=$TRELLO_KEY&name=$YOUR_APP_NAME&expiration=$EXPIRATION_TIME&response_type=token`. `YOUR_APP_NAME` can be whatever you want it to be, and for my case `EXPIRATION_TIME=never`. Say "yes," and **keep the token around.** You can see which "apps" have been approved by looking in your account settings.

3. Find the id for the board you want to follow. I did this by filling in the blanks in `https://api.trello.com/1/members/me/boards?key=$TRELLO_KEY&token=$TRELLO_TOKEN`.

4. Create a webhook by [PUTing to /1/webhooks/](https://trello.com/docs/api/webhook/index.html). You will need `TRELLO_KEY`, `TRELLO_TOKEN` *and* the board id (referred to as the "model" in webhook parlance).

5. To list webhooks, visit `https://api.trello.com/1/tokens/$TRELLO_TOKEN/webhooks?key=$TRELLO_KEY`. You will need both the token you created the hook with, and the key.

Remember: Once in place, the webhooks are associated with *tokens*, **not** secret or key, so make sure you don't lose the token!

## Basic action API (`helio.then`)

### `helio.then.hipchat(options)`

Returns an action handler to be passed to a request handler.

#### Options:

* **token:** This is your HipChat API key. You will need to contact your sysadmin, unless you *are* the sysadmin in which case carry on.
* **room_id:** This is the HipChat internal id for the room. You may be able to find this with the API, or possibly in the sysadmin dashboard. Me, I contacted my sysadmin. ;)

## Webhook (if) API

Webhooks should have call signature `webhook(options, action)`, where `options` is an options hash and `action is an Action. They should return http request handlers.

Actions should get passed an object that has the following properties:

* **message:** A string representing the POST action that just occured. Typically an Action uses this directly.
* **_raw:** An object representing the raw payload (JSON.parse(payload) for JSON POST bodies). This is generally for debugging purposes.

## Action (then) API

Actions should have call signature `action(options)`, where `options` is an options hash. They should return functions with call signature `function(payload, callback)`.

`payload` should be expected to have `message` and `_raw` properties as specified in the prior section.

## `helio.log`

This is an instance of EventEmitter used by included Webhooks and Actions.

### `helio.log.bunyan(bunyanLogger)`

Pass a [bunyan](https://github.com/trentm/node-bunyan) logger into this to get bunyan logging of what your webhooks are doing.

## Tests

Testing is limited to a sanity test. We also run jshint as a pretest hook.

## Heroku Deployment

We've been using heroku to host our webhook server. Here are a few short hints:

* You'll need to install [the heroku toolbelt](https://toolbelt.heroku.com/)
* You will need to run something like: `git remote add heroku git@heroku.com/my-webhooks-app.git` in order to deploy to it
* Deploy manually by running: `git push heroku <some_branch>:master`
* Get logs by running `heroku logs` or `heroku logs -t` for tail-like behavior
* alternately, run `make deploy` in this directory (note this also runs tests)

## License:

MIT. See LICENSE file.
