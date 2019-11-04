const config = require('./config')()
const Serial = require('./serial')
const Server = require('./server')
const Status = require('./status')
const Notify = require('./notify')

const serial = Serial(config)
const server = Server(config)
const notify = Notify(config.notify)

notify('Alarm controller started')

const status = new Status({
    link: on => notify(on ? 'Alarm panel link up' : 'Alarm panel link down [!]'),
    set: on => notify(on ? 'Alarm set' : 'Alarm unset'),
    abort: on => notify(on ? 'Alarm aborted' : 'Alarm reset'),
    intruder: on => notify(on ? 'Alarm activated: INTRUDER [!]' : 'Alarm deactivated: INTRUDER'),
    pa: on => notify(on ? 'Alarm activated: PANIC [!]' : 'Alarm deactivated: PANIC'),
    autoArm: hour => console.info(hour === -1 ? 'Auto-arm disabled' : 'Auto-arm enabled at ' + hour + ':00'),
    autoDisarm: hour => console.info(hour === -1 ? 'Auto-disarm disabled' : 'Auto-disarm enabled at ' + hour + ':00')
})

status.update('autoArm', config.autoArmHour)
status.update('autoDisarm', config.autoDisarmHour)

serial.listen(buffer => {
    const data = buffer.toString('binary')
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
    case 'AIR:':
        var airQuality = data.substring(4)
        status.update('air', airQuality)
        break
    default:
    }
    server.send(data)
})

server.listen(ws => {
    ws.on('message', message => {
        // console.log('client message:', message)
        if (message.substring(0, 5) === '#ARM=') {
            status.update('autoArm', parseInt(message.split('=')[1]))
            server.send('ARM:' + status.read('autoArm'))
        } else if (message.substring(0, 5) === '#DIS=') {
            status.update('autoDisarm', parseInt(message.split('=')[1]))
            server.send('DIS:' + status.read('autoDisarm'))
        } else {
            if (message === '?') {
                server.send('ARM:' + status.read('autoArm'))
                server.send('DIS:' + status.read('autoDisarm'))
            }
            serial.send(message)
        }
    })
})

setInterval(function() {
    var date = new Date()
    if (status.read('set')) {
        if (config.autoDisarmCode
            && date.getHours() === status.read('autoDisarm')
            && date.getMinutes() === 0) {
            console.info('alarm auto-disarmed')
            serial.send(config.autoDisarmCode)
        }
    } else {
        if (config.autoArmCode
            && date.getHours() === status.read('autoArm')
            && date.getMinutes() === 0) {
            console.info('alarm auto-armed')
            serial.send(config.autoArmCode)
        }
    }
}, 60000)
