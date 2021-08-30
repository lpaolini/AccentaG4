const config = require('./config')
const Serial = require('./serial')
const Server = require('./server')
const status = require('./status')
const Notify = require('./notify')
const log = require('./log')

const serial = Serial({
    port: config.serial,
    baudRate: 115200
})

const server = Server({
    port: config.port,
    ssl: config.ssl
})

const notify = Notify(config.notify)

// notify('Alarm controller started')

status
    .on('link', state =>
        notify(`Alarm panel link ${state ? 'up' : 'down'}`)
    )
    .on('armed', state =>
        notify(`Alarm ${state ? 'armed' : 'disarmed'}`)
    )
    .on('abort', state =>
        notify(`Alarm ${state ? 'aborted' : 'reset'}`)
    )
    .on('intruder', state =>
        notify(state ? 'INTRUDER [!]' : 'Intruder alarm deactivated')
    )
    .on('panic', state =>
        notify(state ? 'PANIC [!]' : 'Panic alarm deactivated')
    )
    .on('autoArm', hour =>
        log.info(`Auto-arm ${hour === -1 ? 'disabled' : `enabled at ${hour}:00`}`)
    )
    .on('autoDisarm', hour =>
        log.info(`Auto-disarm ${hour === -1 ? 'disabled' : `enabled at ${hour}:00`}`)
    )
    .on('autoDays', days =>
        log.info(`Auto-arm/disarm days: ${status.getAutoDays()}`)
    )

status.setAutoArm(config.autoArmHour)
status.setAutoDisarm(config.autoDisarmHour)

serial.listen(message => {
    switch (message.substr(0, 4)) {
    case 'HBT:':
        var staleness = parseInt(message.substring(4), 10)
        // status.update('link', staleness < 120)
        status.setLink(staleness < 120)
        break
    case 'SIG:':
        var signals = message.substring(4)
        status.setArmed(signals.charAt(0) === 'S')
        status.setAbort(signals.charAt(1) === 'A')
        status.setIntruder(signals.charAt(2) === 'I')
        status.setPanic(signals.charAt(3) === 'P')
        break
    case 'AIR:':
        var airQuality = message.substring(4)
        status.setAirQuality(airQuality)
        break
    default:
    }
    server.send(message)
})

server.listen(message => {
    if (message.substring(0, 5) === '#ARM=') {
        status.setAutoArm(parseInt(message.split('=')[1]))
        server.send('ARM:' + status.getAutoArm())
    } else if (message.substring(0, 5) === '#DIS=') {
        status.setAutoDisarm(parseInt(message.split('=')[1]))
        server.send('DIS:' + status.getAutoDisarm())
    } else if (message.substring(0, 5) === '#DAY=') {
        status.toggleAutoDay(parseInt(message.split('=')[1]))
        server.send('DAY:' + status.getAutoDays())
    } else {
        if (message === '?') {
            server.send('ARM:' + status.getAutoArm())
            server.send('DIS:' + status.getAutoDisarm())
            server.send('DAY:' + status.getAutoDays())
        }
        serial.send(message)
    }
})

setInterval(function() {
    var date = new Date()
    if (status.getArmed()) {
        if (config.autoDisarmCode
            && status.isAutoDay(date.getDay())
            && date.getHours() === status.getAutoDisarm()
            && date.getMinutes() === 0) {
            log.info('alarm auto-disarmed')
            serial.send(config.autoDisarmCode)
        }
    } else {
        if (config.autoArmCode
            && status.isAutoDay(date.getDay())
            && date.getHours() === status.getAutoArm()
            && date.getMinutes() === 0) {
            log.info('alarm auto-armed')
            serial.send(config.autoArmCode)
        }
    }
}, 60000)
