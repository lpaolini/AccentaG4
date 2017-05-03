const SerialPort = require('serialport');
const WebSocket = require('ws');

const Status = require('./status');
const Notify = require('./notify');

var notify = new Notify();

// var notify = new Notify({
// 	from: 'from@email.provider.com',
// 	to: 'to@email.provider.com'
// });

notify('Alarm controller started');

var status = new Status({
  set: function (on) {
    if (on) {
      notify('Alarm set');
    } else {
      notify('Alarm unset');
    }
  },
  abort: function (on) {
    if (on) {
      notify('Alarm aborted');
    }
  },
  intruder: function (on) {
    if (on) {
      notify('Alarm activated: INTRUDER');
    }
  },
  pa: function (on) {
    if (on) {
      notify('Alarm activated: PANIC');
    }
  }
});

// initialize serial port
const serial = new SerialPort.SerialPort('/dev/ttyATH0', {
  baudRate: 115200,
  parser: SerialPort.parsers.readline('\r\n', 'binary')
});

// initialize websocket
const wss = new WebSocket.Server({
  port: 8080
});

serial.on('open', function(err) {
  if (err) {
    return console.log('Error opening port: ', err.message);
  }
  console.log('port opened');
});

// open errors will be emitted as an error event
serial.on('error', function(err) {
  console.log('Error: ', err.message);
});

var broadcast = (function (heartbeatTimeout) {
  var timer;
  function send(message) {
    stop();
    wss.clients.forEach(function (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    start();
  }
  function stop() {
    clearTimeout(timer);
  }
  function start() {
    timer = setTimeout(function () {
      console.log('sending heartbeat');
      send();
    }, heartbeatTimeout);
  }
  start();
  return send;
})(2000);

serial.on('data', function (data) {
  console.log('panel: %s', data);
  if (/$S:/.test(data)) {
    var signals = data.substring(2);
    status.update('set', data.charAt(0) === 'S');
    status.update('abort', data.charAt(1) === 'A');
    status.update('intruder', data.charAt(2) === 'I');
    status.update('pa', data.charAt(3) === 'P');
  }
  broadcast(data);
});

wss.on('connection', function (ws) {
  ws.on('message', function (message) {
    serial.write(message, function () {
      console.log('client: %s', message);
    });
  });
});
