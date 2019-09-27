const fs = require('fs')
const https = require('https')

const {Subject, timer, merge} = require('rxjs')
const {switchMap, mapTo} = require('rxjs/operators')

const SerialPort = require('serialport')
const Delimiter = require('@serialport/parser-delimiter')

const WebSocket = require('ws')

const Status = require('./status')
const Notify = require('./notify')

const HEARTBEAT_TIMEOUT = 3000

var config = {}

if (process.argv.length > 2) {
    config = require(process.argv[2])
} else {
    console.log('Configuration file not provided, exiting.')
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
        console.log(hour === -1 ? 'Auto-arm disabled' : 'Auto-arm enabled at ' + hour + ':00')
    },
    autoDisarm: function (hour) {
        console.log(hour === -1 ? 'Auto-disarm disabled' : 'Auto-disarm enabled at ' + hour + ':00')
    }
})

status.update('autoArm', config.autoArmHour)
status.update('autoDisarm', config.autoDisarmHour)

// initialize serial port
const {port, parser} = (function () {
    const port = new SerialPort(config.serial, {
        baudRate: 115200
    })
    
    const parser = new Delimiter({
        delimiter: '\r\n'
    })
    
    port.pipe(parser)
            
    // handle opening
    port.on('open', function(err) {
        if (err) {
            return console.log('Error opening port: ', err.message)
        }
        console.log('Serial port opened')
    })
    // handle errors
    port.on('error', function(err) {
        console.log('Error: ', err.message)
    })
    return {port, parser}
})()

// initialize websocket servers
const wss = (function () {
    const httpsServer = https.createServer({
        key: fs.readFileSync(config.ssl.key || __dirname + '/key.pem'),
        cert: fs.readFileSync(config.ssl.cert || __dirname + '/cert.pem')
    }, function (req, res) {
        res.writeHead(200)
        res.end('WebSocket')
    }).listen(config.port)
    return new WebSocket.Server({
        server: httpsServer
    })
})()

const upstream$ = new Subject()
const downstream$ = new Subject()

// react to serial messages
parser.on('data', function (buffer) {
    const data = buffer.toString('binary')
    console.log('incoming serial data:', {data})
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
    downstream$.next(data)
})

// react to websockets messages
wss.on('connection', function (ws) {
    ws.on('message', function (message) {
        if (message.substring(0, 5) === '#ARM=') {
            status.update('autoArm', parseInt(message.split('=')[1]))
            downstream$.next('ARM:' + status.read('autoArm'))
        } else if (message.substring(0, 5) === '#DIS=') {
            status.update('autoDisarm', parseInt(message.split('=')[1]))
            downstream$.next('DIS:' + status.read('autoDisarm'))
        } else {
            if (message === '?') {
                downstream$.next('ARM:' + status.read('autoArm'))
                downstream$.next('DIS:' + status.read('autoDisarm'))
            }
            upstream$.next(message, function () {
                console.log('incoming websocket message:', {message})
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
            upstream$.next(config.autoDisarmCode)
        }
    } else {
        if (config.autoArmCode
            && date.getHours() === status.read('autoArm')
            && date.getMinutes() === 0) {
            console.log('alarm auto-armed')
            upstream$.next(config.autoArmCode)
        }
    }
}, 60000)

const broadcast = data =>
    wss.clients.forEach(function (client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data)
        }
    })

const withHeartbeat = (stream$, heartbeatDelay, heartbeatValue = '') =>
    merge(
        stream$,
        stream$.pipe(
            switchMap(
                () => timer(heartbeatDelay, heartbeatDelay)
            ),
            mapTo(heartbeatValue)
        )
    )

withHeartbeat(upstream$, 1000).subscribe(
    data => port.write(data)
)

withHeartbeat(downstream$, HEARTBEAT_TIMEOUT).subscribe(
    data => broadcast(data)
)
