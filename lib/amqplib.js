module.exports = function (amqp) {
  return function (url, callback) {
    var channel;
    var instance = {
      bind: function (input, cb) {
        channel.bindQueue(input.queue, input.exchange, input.routingKey, cb);
      },
      consume: function (queue, handler, cb) {
        channel.consume(queue, handler, cb);
      }
    };

    amqp.connect(url, function (err, conn) {
      if (err) { return callback(err); }
      conn.createChannel(function (err, chan) {
        if (err) { return callback(err); }
        channel = chan;
        callback(null, instance);
      });
    });
  };
};
