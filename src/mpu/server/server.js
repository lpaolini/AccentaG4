const fs = require('fs')
const https = require('https')
const express = require('express')
const path = require('path')
const WebSocket = require('ws')

module.exports = config => {
    const app = express()

    app.use(express.static(path.join(__dirname, '../client')))
    
    app.get('/', function(req, res) {
        res.render('index.html')
    })
    
    const sslCredentials = {
        key: fs.readFileSync(config.ssl.key || __dirname + '/key.pem'),
        cert: fs.readFileSync(config.ssl.cert || __dirname + '/cert.pem')
    }
    
    const server = https.createServer(sslCredentials, app)
    
    const wss = new WebSocket.Server({server})
    
    server.listen(config.port, () => {
        console.info(`Server started on port ${config.port}`)
    })

    const send = data =>
        wss.clients.forEach(function (client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data)
            }
        })

    const listen = callback =>
        wss.on('connection', callback)

    return {send, listen}
}
