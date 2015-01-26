var async = require('async');
var crypto = require('crypto');
module.exports = function (amqp) {
  var queue = [];
  var expectations = [];

  function messageReceived() {
    return;
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
    end: function (cb) {
      var bindingFunctions = expectations.map(function (data) {
        return function bindQueue(cb) {
          var queueName = 'bucky-' + crypto.randomBytes(24).toString('hex');
          amqp.bind({
            exchange: data.exchange,
            routingKey: data.routingKey,
            queue: queueName
          }, function () {
            amqp.consume(queueName, messageReceived, cb);
          });
        };
      });

      async.parallel(bindingFunctions, function queuesBound() {
        queue.forEach(function (data) {
          amqp.produce(data);
        });
        cb(null);
      });
    }
  };

  return instance;
};
