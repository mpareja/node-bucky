/*globals describe, it, before */
var assert = require('chai').assert;
var sinon = require('sinon');
var amqplibConnect = require('../lib/amqplib');

function getStubAmqplib() {
  var channel = {
    bindQueue: sinon.stub().yieldsAsync(null)
  };

  var connection = {
    createChannel: sinon.stub().yieldsAsync(null, channel)
  };

  return {
    connect: sinon.stub().yieldsAsync(null, connection),
    channel: channel,
    connection: connection
  };
}

describe('amqplib support', function () {
  it('can connect', function (done) {
    var connect = amqplibConnect(getStubAmqplib());
    connect('amqp://guest:guest@localhost:5672', function (err, channel) {
      assert.isDefined(channel);
      assert.isDefined(channel.bind);
      done(err);
    });
  });

  it('handles errors connecting', function (done) {
    var stub = getStubAmqplib();
    stub.connect = sinon.stub().yieldsAsync(new Error('connect'));

    var connect = amqplibConnect(stub);
    connect('amqp://guest:guest@localhost:5672', function (err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

  it('handles errors creating channel', function (done) {
    var stub = getStubAmqplib();
    stub.connection.createChannel = sinon.stub().yieldsAsync(new Error('create channel'));

    var connect = amqplibConnect(stub);
    connect('amqp://guest:guest@localhost:5672', function (err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

  describe('bind', function () {
    it('creates queue and binds it to the specified exchange', function (done) {
      var input = {
        exchange: 'myExchange',
        routingKey: 'myRoutingKey',
        queue: 'myQueueName'
      };

      var stub = getStubAmqplib();
      var connect = amqplibConnect(stub);
      connect('amqp://guest:guest@localhost:5672', function (err, channel) {
        assert.isNull(err);
        channel.bind(input, function (err) {
          assert.isNull(err);
          sinon.assert.calledWith(stub.channel.bindQueue,
                                  'myQueueName', 'myExchange', 'myRoutingKey');
          done();
        });
      });
    });
  });

  describe('consume', function () {
    it('can receive messages from a queue', function (done) {
      var handler = sinon.spy();
      var callback = function () { return; };
      var stub = getStubAmqplib();

      stub.channel.consume = function (q, h, cb) {
        assert.equal(q, 'myQueue');
        assert.equal(h, handler);
        assert.equal(cb, callback);
        done();
      };

      var connect = amqplibConnect(stub);
      connect('amqp://guest:guest@localhost:5672', function (err, channel) {
        assert.isNull(err);
        channel.consume('myQueue', handler, callback);
      });
    });
  });
});