(() => {
 
    var Connection = (url, handlers) => {
        offline()
        var ws
        var autoRetry = Timer(() => {
            console.log('connection timeout')
            ws.close()
            start()
        }, 5000)
        var keepAlive = Timer(() => {
            console.log('connection lost')
            offline()
            start()
        }, 5000)
        function isConnected() {
            return ws && ws.readyState === WebSocket.OPEN
        }
        function online() {
            handlers.onOnline && handlers.onOnline()
        }
        function offline() {
            handlers.onOffline && handlers.onOffline()
        }
        function message(data) {
            handlers.onMessage && handlers.onMessage(data)
        }
        function start() {
            if (isConnected()) {
                console.log('already connected')
            } else {
                console.log('establishing connection')
                ws = new WebSocket(url)
                autoRetry.start()
                ws.onopen = () => {
                    console.log('connection established')
                    autoRetry.stop()
                    keepAlive.start()
                    online()
                    send('?') // request current status
                }
                ws.onerror = err => {
                    console.log('connection error', err)
                    autoRetry.restart()
                }
                ws.onclose = () => {
                    console.log('connection closed')
                    offline()
                }
                ws.onmessage = evt => {
                    keepAlive.restart()
                    message(evt.data)
                }
            }
        }
        function stop() {
            if (isConnected()) {
                console.log('closing connection')
                keepAlive.stop()
                ws.close()
                offline()
            } else {
                console.log('already disconnected')
            }
        }
        function send(msg) {
            ws.send(msg)
        }
        return {
            start: start,
            stop: stop,
            send: send
        }
    }

    const Timer = (callback, timeout) => {
        let timer
        const start = () => {
            if (!timer) {
                timer = setTimeout(callback, timeout)
            }
        }
        const stop = () => {
            if (timer) {
                clearTimeout(timer)
                timer = null
            }
        }
        const restart = () => {
            stop()
            start()
        }
        return {
            start: start,
            stop: stop,
            restart: restart
        }
    }

    const Lcd = callback => {
    // https://dawes.wordpress.com/2010/01/05/hd44780-instruction-set/
        var display
        var pos
        var cmd = false
        var cursor = false
        var timer
        const show = () => {
            callback(display)
        }
        const write = char => {
            if (char >= ' ') {
                var row, col
                if (pos < 16) {
                    row = 0
                    col = pos
                } else {
                    row = 1
                    col = pos - 64
                }
                var previousChar = display[row].substr(col, 1)
                display[row] = display[row].substr(0, col) + char + display[row].substr(col + 1)
                return previousChar
            }
        }
        const advance = () => {
            pos++
        }
        const start = () => {
            var cursorChar = '_'
            if (cursor) {
                timer = setInterval(function () {
                    cursorChar = write(cursorChar)
                    show()
                }, 400)
            }
        }
        const stop = () => {
            if (timer) {
                clearInterval(timer)
            }
        }
        const refresh = () => {
            stop()
            show()
            start()
        }
        const offline = () => {
            display = ['Connecting...   ', '                ']
            show()
        }
        const reset = () => {
            display = ['                ', '                ']
            pos = 0
            refresh()
        }
        const ingest = data => {
            for (var i = 0; i < data.length; i++) {
                var char = data.charCodeAt(i)
                if (cmd) {
                    if (char >= 0x80) { // set position
                        pos = char - 0x80
                    } else {
                        console.log('unknown command: ', char.toString(16))
                    }
                    cmd = false
                } else {
                    switch (char) {
                    // case 0x03: // unknown
                    //   break;
                    case 0x04: // command
                        cmd = true; break
                    case 0x05: // hide cursor
                        cursor = false; break
                    case 0x06: // show cursor
                        cursor = true; break
                    case 0x07: // cursor right
                        pos++; break
                    case 0x0a: // newline
                        pos = 64; break
                    case 0x0c: // clear
                        reset(); break
                        // case 0x0d: // unknown
                        //   break;
                        // case 0x10: // unknown
                        //   break;
                        // case 0x16: // unknown
                        //   break;
                    default:
                        if (char >= 0x20 && char <= 0x7f) {
                            write(data.charAt(i))
                            advance()
                        } else {
                            console.log('unprintable character: ', char.toString(16))
                        }
                    }
                }
            }
            refresh()
        }
        reset()
        return {
            offline: offline,
            ingest: ingest,
            reset: reset
        }
    }

    const Led = (attr, values) => {
        const length = values.length
        return {
            ingest: data => {
                for (var i = 0; i < length; i++) {
                    var led = values.charAt(i)
                    $('[' + attr + '~="' + led + '"]').toggleClass('active', data.indexOf(led) !== -1)
                }
            },
            reset: () => {
                $('[' + attr + ']').removeClass('active')
            }
        }
    }

    const Auto = attr => {
        return {
            ingest: data => {
                const hour = parseInt(data)
                const time = hour === -1
                    ? 'OFF'
                    : `${hour < 10 ? '0' : ''}${hour}:00`
                $('[' + attr + ']').html(time)
            }
        }
    }

    const Air = callback => {
        return {
            ingest: data => {
                const [temperature, relativeHumidity, absoluteHumidity, tvoc, co2] = data.split(':')
                console.log({temperature, relativeHumidity, absoluteHumidity, tvoc, co2})
                callback({
                    temperature: parseFloat(temperature).toFixed(1),
                    relativeHumidity: parseFloat(relativeHumidity).toFixed(0),
                    absoluteHumidity: parseFloat(absoluteHumidity).toFixed(0),
                    tvoc: parseInt(tvoc),
                    co2: parseInt(co2)
                })
            }
        }
    }

    $(() => {
        var lcd = Lcd(rows => {
            $('#row0', '.lcd').html(rows[0])
            $('#row1', '.lcd').html(rows[1])
        })

        var air = Air(({temperature, relativeHumidity, tvoc, co2}) => {
            $('#temperature').html(temperature)
            $('#relativeHumidity').html(relativeHumidity)
            $('#tvoc').html(tvoc)
            $('#co2').html(co2)
        })

        var keypadLed = Led('data-keypad', '12345678UTSP')
        var panelLed = Led('data-panel', 'SAIP')
        var autoArm = Auto('data-autoarm')
        var autoDisarm = Auto('data-autodisarm')

        var url = location.protocol === 'https:' ?
            'wss://' + location.hostname + ':8443' :
            'ws://' + location.hostname + ':8080'

        var connection = Connection(url, {
            onMessage: msg => {
                if (msg) {
                    $('.lcd').removeClass('lost')
                    var type = msg.substring(0, 3)
                    var data = msg.substring(4)
                    switch (type) {
                    case '+': // heartbeat
                        $('.lcd').addClass('heartbeat')
                        setTimeout(() => $('.lcd').removeClass('heartbeat'), 100)
                        break
                    case 'SIG': // panel signals
                        $('body').toggleClass('active', /[IP]/.test(data))
                        panelLed.ingest(data)
                        break
                    case 'LED': // keypad messages
                        keypadLed.ingest(data)
                        break
                    case 'LCD': // LCD messages
                        lcd.ingest(data)
                        break
                    case 'AIR': // sensors
                        air.ingest(data)
                        break
                    case 'ARM': // auto arm
                        autoArm.ingest(data)
                        break
                    case 'DIS': // auto disarm
                        autoDisarm.ingest(data)
                        break
                    default:
                        break
                    }
                }
            },
            onOnline: () => {
                lcd.reset()
            },
            onOffline: () => {
                panelLed.reset()
                keypadLed.reset()
                lcd.offline()
            }
        })

        // bind click commands
        $('[data-click]').click(e => {
            connection.send($(e.target).data('click'))
        })

        // bind dbl-click commands
        $('[data-dblclick]').dblclick(e => {
            connection.send($(e.target).data('dblclick'))
        })

        // connect/disconnect based on page visibility
        // $(document).on({
        //     show: connection.start,
        //     hide: connection.stop
        // })

        $('.lcd').on('click', () => {
            $('.keyboard').toggle()
            $('.auto').toggle()
        })
        // $('.auto').on('click', () => $('.auto').hide())

        connection.start()
    })

})()
