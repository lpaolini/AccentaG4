const fs = require('fs');
const https = require('https');

const SerialPort = require('serialport');
const WebSocket = require('ws');

const Status = require('./status');
const Notify = require('./notify');

var config = {};

if (process.argv.length > 2) {
  config = require(process.argv[2]);
} else {
  console.log('Configuration file not provided');
  process.exit(1);
}

var notify = Notify(config.notify);

notify('Alarm controller started');

var status = new Status({
  link: function (on) {
    notify(on ? 'Link up' : 'Link down [!]');
  },
  set: function (on) {
    notify(on ? 'Alarm set' : 'Alarm unset');
  },
  abort: function (on) {
    notify(on ? 'Alarm aborted' : 'Alarm reset')
  },
  intruder: function (on) {
    notify(on ? 'Alarm activated: INTRUDER [!]' : 'Alarm deactivated: INTRUDER');
  },
  pa: function (on) {
    notify(on ? 'Alarm activated: PANIC [!]' : 'Alarm deactivated: PANIC');
  }
});

// initialize serial port
const serial = (function () {
  const serial = new SerialPort.SerialPort('/dev/ttyATH0', {
    baudRate: 115200,
    parser: SerialPort.parsers.readline('\r\n', 'binary')
  });
  // handle opening
  serial.on('open', function(err) {
    if (err) {
      return console.log('Error opening port: ', err.message);
    }
    console.log('Serial port opened');
  });
  // handle errors
  serial.on('error', function(err) {
    console.log('Error: ', err.message);
  });
  return serial;
})();

// initialize dual (secure/non-secure) websocket servers
const wss = (function () {
  const httpsServer = https.createServer({
    key: fs.readFileSync(config.ssl.key || __dirname + '/key.pem'),
    cert: fs.readFileSync(config.ssl.cert || __dirname + '/cert.pem')
  }, function (req, res) {
    res.writeHead(200);
    res.end('WebSocket');
  }).listen(8443);
  return {
    secure: new WebSocket.Server({
      server: httpsServer
    }),
    nonSecure: new WebSocket.Server({
      port: 8080
    })
  };
})();

var broadcast = (function (heartbeatTimeout) {
  var timer;
  function send(message) {
    stop();
    wss.secure.clients.forEach(function (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    wss.nonSecure.clients.forEach(function (client) {
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

// react to serial messages
serial.on('data', function (data) {
  switch (data.substr(0, 2)) {
    case 'H:':
      var staleness = parseInt(data.substring(2), 10);
      status.update('link', staleness < 120);
      break;
    case 'S:':
      var signals = data.substring(2);
      status.update('set', signals.charAt(0) === 'S');
      status.update('abort', signals.charAt(1) === 'A');
      status.update('intruder', signals.charAt(2) === 'I');
      status.update('pa', signals.charAt(3) === 'P');
      break;
    default:
  }
  broadcast(data);
});

// react to secure websockets messages
wss.secure.on('connection', function (ws) {
  ws.on('message', function (message) {
    serial.write(message, function () {
      console.log('secure websockets client: %s', message);
    });
  });
});

// react to non-secure websockets messages
wss.nonSecure.on('connection', function (ws) {
  ws.on('message', function (message) {
    serial.write(message, function () {
      console.log('non-secure websockets client: %s', message);
    });
  });
});
