# Bucky - test your RabbitMQ services

<img align="right" height="220px" src="public/logo.jpg" />
Let Bucky help you produce Rabbit messages and assert that your systems are generating the expected messages in response.

# Example

This example demonstrates publishing a message to a rabbit connection and verifying that a different message was produced by the system under test.

```
var connection = require('./rabbit-connection.js');
var bucky = require('bucky');

bucky(connection)
  .produce({
    exchange: 'data',
    routingKey: 'user',
    contentType: 'application/json',
    payload: {
      id: '1a2b3c',
      name: 'John Doe'
    }
  })
  .expect({
    exchange: 'emails',
    routingKey: 'newUserRegistration',
    contentType: 'application/json',
    payload: {
      name: 'John Doe',
      greeting: 'Hola!'
    }
  })
  .end(function (err) {
    if (err) { throw; }
    console.log('Success!');
  });
```

# What's with the name?

Bucky is inspired by [supertest](https://github.com/tj/supertest). Rather than use something unoriginal like `superrabbit`, it made sense to name the module after superhero rabbit (Bucky O'Hare)[http://www.buckyohare.org/].
