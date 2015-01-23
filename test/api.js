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

  it('binds message queue to the exchange and routing key we expect to get a message on', function (done) {
    var amqp = {
      produce: sinon.spy(),
      consume: sinon.spy()
    };

    bucky(amqp)
      .expect(inputMessage)
      .end(function (err) {
        assert.isNull(err);
        sinon.assert.calledOnce(amqp.consume);
        sinon.assert.calledWith(amqp.consume, {
          exchange: 'data',
          routingKey: 'user'
        });
        done();
      });
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
});
