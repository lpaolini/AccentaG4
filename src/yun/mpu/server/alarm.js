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
