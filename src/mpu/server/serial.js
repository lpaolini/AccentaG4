const SerialPort = require('serialport')
const Delimiter = require('@serialport/parser-delimiter')

module.exports = config => {
    const port = new SerialPort(config.serial, {
        baudRate: 115200
    })
    
    const parser = new Delimiter({
        delimiter: '\r\n'
    })
    
    port.pipe(parser)
            
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
 
    const send = data =>
        port.write(data)

    const listen = callback =>
        parser.on('data', callback)

    return {send, listen}
}
