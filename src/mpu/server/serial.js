const {Subject, timer, merge} = require('rxjs')
const {mapTo} = require('rxjs/operators')
const SerialPort = require('serialport')
const Delimiter = require('@serialport/parser-delimiter')
const {ENABLE_CHAR} = require('./constants')

module.exports = ({port, baudRate}) => {
    const serial = new SerialPort(port, {
        baudRate
    })
    
    const parser = new Delimiter({
        delimiter: '\r\n'
    })
    
    serial.pipe(parser)
            
    const send$ = new Subject()

    // handle opening
    serial.on('open', err => {
        if (err) {
            return console.error('Error opening port: ', err.message)
        }
        console.info('Serial port opened')
    })
 
    // handle errors
    serial.on('error', err =>
        console.error('Error: ', err.message)
    )
 
    const listen = callback =>
        parser.on('data', buffer =>
            callback(buffer.toString('binary'))
        )

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
            serial.write(data)
        }
    )

    const send = data =>
        send$.next(data)

    return {listen, send}
}
