/*globals describe, it */
var assert = require('chai').assert;
var bucky = require('../');
var sinon = require('sinon');

var inputMessage = {
  exchange: 'data',
  routingKey: 'user',
  contentType: 'application/json',
  payload: {
    id: '1a2b3c',
    name: 'John Doe'
  }
};

var outputMessage = {
  exchange: 'emails',
  routingKey: 'newUserRegistration',
  contentType: 'application/json',
  payload: {
    name: 'John Doe',
    greeting: 'Hola!'
  }
};

describe('bucky', function () {
  it('gives you a chance to set your expectations before sending messages', function (done) {
    var amqp = {
      produce: sinon.spy()
    };
    bucky(amqp)
      .produce(inputMessage);

    sinon.assert.notCalled(amqp.produce);
    done();
  });

  it('sends messages that it was told to send', function (done) {
    var amqp = { produce: sinon.spy() };

    bucky(amqp)
      .produce(inputMessage)
      .end(function (err) {
        assert.isNull(err);
        sinon.assert.calledOnce(amqp.produce);
        sinon.assert.calledWith(amqp.produce, inputMessage);
        done();
      });
  });

  it('starts listening for expected messages before producing messages', function (done) {
    var amqp = {
      bind: sinon.stub().yieldsAsync([ null ]), // pretend we bound and execute callback
      consume: sinon.stub().callsArgWithAsync(2, null), // pretend we're listening to queue
      produce: function () {
        sinon.assert.calledOnce(amqp.bind);
        sinon.assert.calledWith(amqp.bind, sinon.match({
          exchange: outputMessage.exchange,
          routingKey: outputMessage.routingKey
        }));

        var queue = amqp.bind.args[0][0].queue;
        sinon.assert.calledOnce(amqp.consume);
        sinon.assert.calledWith(amqp.consume, queue);
      }
    };

    bucky(amqp)
      .produce(inputMessage)
      .expect(outputMessage)
      .end(done);
  });

  it('starts listening for expected messages before producing messages', function (done) {
    var amqp = {
      produce: sinon.spy(),
      consume: sinon.spy()
    };

    bucky(amqp)
      .produce(inputMessage)
      .expect(outputMessage)
      .end(function (err) {
        assert.isNull(err);
        sinon.assert.callOrder(amqp.consume, amqp.produce);
        done();
      });
  });

  it('handles errors binding queues to exchanges');
  it('handles errors setting up consumption from a queue');
});
