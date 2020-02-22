const fs = require('fs')
const https = require('https')
const express = require('express')
const path = require('path')
const WebSocket = require('ws')
const {Subject, merge} = require('rxjs')
const {filter, throttleTime} = require('rxjs/operators')
const {ENABLE_CHAR} = require('./constants')

module.exports = ({port, ssl}) => {
    const app = express()

    app.use(express.static(path.join(__dirname, '../client')))
    
    app.get('/', function(req, res) {
        res.render('index.html')
    })

    const send$ = new Subject()
    
    const sslCredentials = {
        key: fs.readFileSync(ssl.key || __dirname + '/key.pem'),
        cert: fs.readFileSync(ssl.cert || __dirname + '/cert.pem')
    }
    
    const server = https.createServer(sslCredentials, app)
    
    const wss = new WebSocket.Server({server})
    
    server.listen(port, () => {
        console.info(`Server started on port ${port}`)
    })

    const listen = callback =>
        wss.on('connection', ws =>
            ws.on('message', message =>
                callback(message)
            )
        )

    // const data$ = merge(
    //     send$.pipe(
    //         filter(data => data !== ENABLE_CHAR)
    //     ),
    //     send$.pipe(
    //         filter(data => data === ENABLE_CHAR),
    //         throttleTime(3000)
    //     )
    // )
    
    send$.subscribe(
        data => {
            // data !== ENABLE_CHAR && console.log('Downstream message:', {data})
            wss.clients.forEach(function (client) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(data)
                }
            })
        }
    )
    
    const send = data =>
        send$.next(data)

    return {listen, send}
}
