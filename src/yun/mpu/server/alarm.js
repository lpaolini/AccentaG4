const fs = require('fs');
const https = require('https');

const SerialPort = require('serialport');
const WebSocket = require('ws');

const Status = require('./status');
const Notify = require('./notify');

var config = require('./config');
var notify = Notify(config.notify);

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
    } else {
      notify('Alarm reset');
    }
  },
  intruder: function (on) {
    if (on) {
      notify('Alarm activated: INTRUDER [!]');
    } else {
      notify('Alarm deactivated: INTRUDER');
    }
  },
  pa: function (on) {
    if (on) {
      notify('Alarm activated: PANIC [!]');
    } else {
      notify('Alarm deactivated: PANIC');
    }
  }
});

// initialize serial port
const serial = new SerialPort.SerialPort('/dev/ttyATH0', {
  baudRate: 115200,
  parser: SerialPort.parsers.readline('\r\n', 'binary')
});

// initialize SSL server
const server = https.createServer({
  key: fs.readFileSync(__dirname + '/key.pem'),
  cert: fs.readFileSync(__dirname + '/cert.pem')
}, function (req, res) {
  res.writeHead(200);
  res.end('WebSocket');
}).listen(8443);

// initialize websocket
const wss = new WebSocket.Server({
  server: server
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
})(3000);

serial.on('data', function (data) {
  console.log('panel: %s', data);
  if (data.substr(0, 2) === 'S:') {
    var signals = data.substring(2);
    status.update('set', signals.charAt(0) === 'S');
    status.update('abort', signals.charAt(1) === 'A');
    status.update('intruder', signals.charAt(2) === 'I');
    status.update('pa', signals.charAt(3) === 'P');
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
