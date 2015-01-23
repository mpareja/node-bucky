module.exports = function (amqp) {
  var queue = [];

  setImmediate(function () {
    queue.forEach(function (data) {
      amqp.produce(data);
    });
  });

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
    }
  };

  return instance;
};
