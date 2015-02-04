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
        done();
      }
    };

    bucky(amqp)
      .produce(inputMessage)
      .expect(outputMessage)
      .end(function () { return; });
  });

  it('times out while waiting for the expected message to arrive', function (done) {
    this.timeout(100); // be explicit about mocha timeout value

    var amqp = {
      bind: sinon.stub().yieldsAsync([ null ]), // pretend we bound and execute callback
      consume: sinon.stub().callsArgWithAsync(2, null), // pretend we're listening to queue
      produce: sinon.spy()
    };

    bucky(amqp)
      .timeout(50)
      .expect(outputMessage)
      .end(function (err) {
        assert.instanceOf(err, Error);
        done();
      });
  });

  it('completes when an expected message is received', function (done) {
    var receivedMessage = {
      content: new Buffer(''),
      fields: {},
      properties: {}
    };

    /*jslint unparam:false */
    var amqp = {
      produce: sinon.spy(),
      bind: sinon.stub().yieldsAsync([ null ]), // pretend we bound and execute callback
      consume: function (queue, handler, cb) {
        /*jslint unparam:true */

        setImmediate(function () {
          // notify that we're listening to queue
          cb(null);

          // pretend a message was received
          setTimeout(function () {
            handler(receivedMessage);
          }, 50);
        });
      }
    };

    var endCalled = false;

    bucky(amqp)
      .timeout(55)
      .expect({
        exchange: 'emails',
        routingKey: 'newUserRegistration',
        payload: new Buffer('')
      })
      .end(function (err) {
        assert.isFalse(endCalled); // shouldn't get timeout callback on success
        assert.isNull(err);
        endCalled = true;
        setTimeout(done, 50);
      });
  });

  it('completes after ALL expected messages are received'); // refactor other expected messages test
  it('handles errors binding queues to exchanges');
  it('handles errors setting up consumption from a queue');
  it('handles multiple expectations for the same exchange/routingKey combination');
  it('cleans up after itself');
});
