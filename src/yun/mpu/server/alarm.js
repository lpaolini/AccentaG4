const fs = require('fs')
const https = require('https')

const SerialPort = require('serialport')
const WebSocket = require('ws')

const Status = require('./status')
const Notify = require('./notify')

var config = {}

if (process.argv.length > 2) {
    config = require(process.argv[2])
} else {
    console.log('Configuration file not provided')
    process.exit(1)
}

const notify = Notify(config.notify)

notify('Alarm controller started')

const status = new Status({
    link: function (on) {
        notify(on ? 'Alarm panel link up' : 'Alarm panel link down [!]')
    },
    set: function (on) {
        notify(on ? 'Alarm set' : 'Alarm unset')
    },
    abort: function (on) {
        notify(on ? 'Alarm aborted' : 'Alarm reset')
    },
    intruder: function (on) {
        notify(on ? 'Alarm activated: INTRUDER [!]' : 'Alarm deactivated: INTRUDER')
    },
    pa: function (on) {
        notify(on ? 'Alarm activated: PANIC [!]' : 'Alarm deactivated: PANIC')
    },
    autoArm: function (hour) {
        console.log(hour ? 'Auto-arm enabled at ' + hour + ':00' : 'Auto-arm disabled')
    },
    autoDisarm: function (hour) {
        console.log(hour ? 'Auto-disarm enabled at ' + hour + ':00' : 'Auto-disarm disabled')
    }
})

// initialize serial port
const serial = (function () {
    const serial = new SerialPort.SerialPort('/dev/ttyATH0', {
        baudRate: 115200,
        parser: SerialPort.parsers.readline('\r\n', 'binary')
    })
    // handle opening
    serial.on('open', function(err) {
        if (err) {
            return console.log('Error opening port: ', err.message)
        }
        console.log('Serial port opened')
    })
    // handle errors
    serial.on('error', function(err) {
        console.log('Error: ', err.message)
    })
    return serial
})()

// initialize websocket servers
const wss = (function () {
    const httpsServer = https.createServer({
        key: fs.readFileSync(config.ssl.key || __dirname + '/key.pem'),
        cert: fs.readFileSync(config.ssl.cert || __dirname + '/cert.pem')
    }, function (req, res) {
        res.writeHead(200)
        res.end('WebSocket')
    }).listen(8443)
    return new WebSocket.Server({
        server: httpsServer
    })
})()

const broadcast = (function (heartbeatTimeout) {
    var timer
    function send(message) {
        stop()
        wss.clients.forEach(function (client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message)
            }
        })
        start()
    }
    function stop() {
        clearTimeout(timer)
    }
    function start() {
        timer = setTimeout(function () {
            console.log('sending heartbeat')
            send()
        }, heartbeatTimeout)
    }
    start()
    return send
})(3000)

const processCommand = function (command) {
    if (command.substring(0, 4) === 'ARM=')) {
        status.update('autoArm', parseInt(command.split('=')[1]))
        broadcast('ARM:' + status.read('autoArm'))
    } else if (command.substring(0, 4) === 'DIS=') {
        status.update('autoDisarm', parseInt(command.split('=')[1]))
        broadcast('DIS:' + status.read('autoDisarm'))
    }
}

// react to serial messages
serial.on('data', function (data) {
    console.log('data: [' + data + ']')
    switch (data.substr(0, 4)) {
    case 'HBT:':
        var staleness = parseInt(data.substring(4), 10)
        status.update('link', staleness < 120)
        break
    case 'SIG:':
        var signals = data.substring(4)
        status.update('set', signals.charAt(0) === 'S')
        status.update('abort', signals.charAt(1) === 'A')
        status.update('intruder', signals.charAt(2) === 'I')
        status.update('pa', signals.charAt(3) === 'P')
        break
    default:
    }
    broadcast(data)
})

// react to websockets messages
wss.on('connection', function (ws) {
    ws.on('message', function (message) {
        if (message.substring(0, 1) === '#') {
            processCommand(message.substring(1))
        } else {
            serial.write(message, function () {
                console.log('secure websockets client: %s', message)
            })
        }
    })
})

setInterval(function() {
    var date = new Date()
    if (status.read('set')) {
        if (config.autoDisarmCode
            && date.getHours() === status.read('autoDisarm')
            && date.getMinutes() === 0) {
            console.log('alarm auto-disarmed')
            serial.write(config.autoDisarmCode)
        }
    } else {
        if (config.autoArmCode
            && date.getHours() === status.read('autoArm')
            && date.getMinutes() === 0) {
            console.log('alarm auto-armed')
            serial.write(config.autoArmCode)
        }
    }
}, 60000)
