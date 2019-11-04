const fs = require('fs')
const https = require('https')
const express = require('express')
const path = require('path')
const WebSocket = require('ws')
const {Subject, merge} = require('rxjs')
const {filter, throttleTime} = require('rxjs/operators')

const ENABLE_CHAR = '+'
const DISABLE_CHAR = '-'

module.exports = config => {
    const app = express()

    app.use(express.static(path.join(__dirname, '../client')))
    
    app.get('/', function(req, res) {
        res.render('index.html')
    })

    const send$ = new Subject()
    
    const sslCredentials = {
        key: fs.readFileSync(config.ssl.key || __dirname + '/key.pem'),
        cert: fs.readFileSync(config.ssl.cert || __dirname + '/cert.pem')
    }
    
    const server = https.createServer(sslCredentials, app)
    
    const wss = new WebSocket.Server({server})
    
    server.listen(config.port, () => {
        console.info(`Server started on port ${config.port}`)
    })

    const listen = callback =>
        wss.on('connection', callback)

    const downstreamWithThrottledHeartbeats$ = merge(
        send$.pipe(
            filter(data => data !== ENABLE_CHAR)
        ),
        send$.pipe(
            filter(data => data === ENABLE_CHAR),
            throttleTime(3000)
        )
    )
        
    downstreamWithThrottledHeartbeats$.subscribe(
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
