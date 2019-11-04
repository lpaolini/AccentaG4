const {Subject, timer, merge} = require('rxjs')
const {mapTo} = require('rxjs/operators')
const SerialPort = require('serialport')
const Delimiter = require('@serialport/parser-delimiter')

const ENABLE_CHAR = '+'
const DISABLE_CHAR = '-'

module.exports = config => {
    const port = new SerialPort(config.serial, {
        baudRate: 115200
    })
    
    const parser = new Delimiter({
        delimiter: '\r\n'
    })
    
    port.pipe(parser)
            
    const send$ = new Subject()

    // handle opening
    port.on('open', err => {
        if (err) {
            return console.error('Error opening port: ', err.message)
        }
        console.info('Serial port opened')
    })
 
    // handle errors
    port.on('error', err =>
        console.error('Error: ', err.message)
    )
 
    const listen = callback =>
        parser.on('data', callback)

    const mergeHeartbeat = (heartbeatDelay, heartbeatValue) =>
        observable$ =>
            merge(
                observable$,
                timer(heartbeatDelay, heartbeatDelay).pipe(
                    mapTo(heartbeatValue)
                )
            )
    
    send$.pipe(
        mergeHeartbeat(1000, ENABLE_CHAR)
    ).subscribe(
        data => {
            // data !== ENABLE_CHAR && console.log('Upstream message:', {data})
            port.write(data)
        }
    )

    const send = data =>
        send$.next(data)

    return {listen, send}
}
