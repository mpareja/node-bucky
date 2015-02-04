var async = require('async');
var crypto = require('crypto');
var debug = require('debug')('bucky');

module.exports = function (amqp) {
  var queue = [];
  var expectations = [];
  var received = [];
  var timeoutId;
  var timeoutLength = 1800;
  var end;

  function match() {
    return true;
  }

  function findFailingExpectations() {
    return expectations.filter(function (expected) {
      // ASSUMPTION: multiple expectations matching the same message instance is okay
      var assertionMet = received.some(match.bind(null, expected));
      return !assertionMet;
    });
  }

  function enableTimeout(cb) {
    debug('enabling timeout');

    function onTimeout() {
      debug('timeout encountered');

      var remaining = findFailingExpectations();
      /*istanbul ignore else */
      if (remaining.length) {
        cb(new Error('Timeout waiting for messages'));
      } else {
        /*istanbul ignore next */
        // assertion
        throw new Error('Timeout while not waiting for message: this should not happen.');
      }
    }

    timeoutId = setTimeout(onTimeout, timeoutLength);
  }

  function messageReceived(msg) {
    debug('message received: ', msg);
    var remaining = findFailingExpectations();
    /*istanbul ignore else */
    if (!remaining.length) {
      clearTimeout(timeoutId);
      end(null);
    }
  }

  var instance = {
    produce: function (data) {
      queue.push(data);
      return instance;
    },
    expect: function (data) {
      expectations.push(data);
      return instance;
    },
    timeout: function (length) {
      timeoutLength = length;
      return instance;
    },
    end: function (cb) {
      end = cb;

      if (expectations.length) {
        enableTimeout(cb);
      }

      var bindingFunctions = expectations.map(function (data) {
        return function bindQueue(cb) {
          var queueName = 'bucky-' + crypto.randomBytes(24).toString('hex');
          amqp.bind({
            exchange: data.exchange,
            routingKey: data.routingKey,
            queue: queueName
          }, function () {

            function handleMessage(msg) {
              msg.exchange = data.exchange;
              msg.routingKey = data.routingKey;
              received.push(msg);
              messageReceived(msg);
            }

            amqp.consume(queueName, handleMessage, cb);
          });
        };
      });

      async.parallel(bindingFunctions, function queuesBound() {
        queue.forEach(function (data) {
          amqp.produce(data);
        });
        if (!expectations.length) {
          end(null);
        }
      });
    }
  };

  return instance;
};
