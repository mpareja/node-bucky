module.exports = function (amqp) {
  var queue = [];

  var instance = {
    produce: function (data) {
      queue.push(data);
      return instance;
    },
    expect: function (data) {
      amqp.consume({
        exchange: data.exchange,
        routingKey: data.routingKey
      });
      return instance;
    },
    end: function (cb) {
      setImmediate(function () {
        queue.forEach(function (data) {
          amqp.produce(data);
        });
        cb(null);
      });
    }
  };

  return instance;
};
