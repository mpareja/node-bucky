/*globals describe, it, beforeEach */
var assert = require('chai').assert;
var sinon = require('sinon');
var amqplibConnect = require('../lib/amqplib');

function getStubAmqplib() {
  var channel = {
    bindQueue: sinon.stub().yieldsAsync(null),
    publish: sinon.stub()
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
  var stub, connect;
  beforeEach(function (done) {
    stub = getStubAmqplib();
    connect = amqplibConnect(stub);
    done();
  });

  it('can connect', function (done) {
    connect('amqp://guest:guest@localhost:5672', function (err, channel) {
      assert.isDefined(channel);
      assert.isDefined(channel.bind);
      done(err);
    });
  });

  it('handles errors connecting', function (done) {
    stub.connect = sinon.stub().yieldsAsync(new Error('connect'));

    connect('amqp://guest:guest@localhost:5672', function (err) {
      assert.instanceOf(err, Error);
      done();
    });
  });

  it('handles errors creating channel', function (done) {
    stub.connection.createChannel = sinon.stub().yieldsAsync(new Error('create channel'));

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

      stub.channel.consume = function (q, h, cb) {
        assert.equal(q, 'myQueue');
        assert.equal(h, handler);
        assert.equal(cb, callback);
        done();
      };

      connect('amqp://guest:guest@localhost:5672', function (err, channel) {
        assert.isNull(err);
        channel.consume('myQueue', handler, callback);
      });
    });
  });

  describe('produce', function () {
    var channel;
    beforeEach(function (done) {
      connect('amqp://guest:guest@localhost:5672', function (err, chan) {
        channel = chan;
        done(err);
      });
    });

    it('can produce a message on an exchange', function (done) {
      var inputMessage = {
        exchange: 'data',
        routingKey: 'user',
        payload: {
          id: '1a2b3c',
          name: 'John Doe'
        }
      };
      channel.produce(inputMessage);

      sinon.assert.calledWith(stub.channel.publish, 'data', 'user', inputMessage.payload);
      done();
    });

    it('can produce message with a content type', function (done) {
      var inputMessage = {
        exchange: 'data',
        routingKey: 'user',
        contentType: 'application/json',
        payload: {
          id: '1a2b3c',
          name: 'John Doe'
        }
      };
      channel.produce(inputMessage);

      sinon.assert.calledWith(stub.channel.publish, 'data', 'user', inputMessage.payload, {
        contentType: 'application/json'
      });
      done();
    });
  });
});
