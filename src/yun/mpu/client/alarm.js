$(() => {
  var ws;

  var monitor = ((timeout, callback) => {
    var timer;
    function start () {
      timer = setTimeout(callback, timeout);
    }
    function stop () {
      clearTimeout(timer);
      timer = null;
    }
    function ack () {
      stop();
      start();
    }
    return {
      start: start,
      stop: stop,
      ack: ack
    };
  })(5000, () => {
    console.log('connection lost');
    offline();
    connect();
  });

  var lcd = ((callback) => {
    // https://dawes.wordpress.com/2010/01/05/hd44780-instruction-set/
    var display;
    var pos;
    var cmd = false;
    var cursor = false;
    var timer;
    function reset () {
      display = ['                ', '                '];
      pos = 0;
      stop();
      show();
    }
    function show () {
      callback(display);
    }
    function write (char) {
      if (char >= ' ') {
        var row, col;
        if (pos < 16) {
          row = 0;
          col = pos;
        } else {
          row = 1;
          col = pos - 64;
        }
        var previousChar = display[row].substr(col, 1);
        display[row] = display[row].substr(0, col) + char + display[row].substr(col + 1);
        return previousChar;
      }
    }
    function advance () {
      pos++;
    }
    function start () {
      var cursorChar = '_';
      if (cursor) {
        timer = setInterval(function () {
          cursorChar = write(cursorChar);
          callback(display);
        }, 400);
      }
    }
    function stop () {
      if (timer) {
        clearInterval(timer);
      }
    }
    function refresh () {
      stop();
      show();
      start();
    }
    function ingest (data) {
      for (var i = 0; i < data.length; i++) {
        var char = data.charCodeAt(i);
        if (cmd) {
          if (char >= 0x80) { // set position
            pos = char - 0x80;
          } else {
            console.log('unknown command: ', char.toString(16));
          }
          cmd = false;
        } else {
          switch (char) {
            // case 0x03: // unknown
            //   break;
            case 0x04: // command
              cmd = true; break;
            case 0x05: // hide cursor
              cursor = false; break;
            case 0x06: // show cursor
              cursor = true; break;
            case 0x07: // cursor right
              pos++; break;
            case 0x0a: // newline
              pos = 64; break;
            case 0x0c: // clear
              reset(); break;
            // case 0x0d: // unknown
            //   break;
            // case 0x10: // unknown
            //   break;
            // case 0x16: // unknown
            //   break;
            default:
              if (char < 32) {
                console.log('unknown control char: ', char.toString(16));
              }
              write(data.charAt(i));
              advance();
          }
        }
      }
      refresh();
    }
    reset();
    return {
      ingest: ingest,
      reset: reset
    }
  })(function (display) {
    $('#lcd0').html(display[0]);
    $('#lcd1').html(display[1]);
  });

  function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
  }

  function connect() {
    if (isConnected()) {
      console.log('already connected');
    } else {
      ws = new WebSocket("ws://10.118.5.5:8080");
      console.log('establishing connection');
      var timer = setTimeout(() => {
        console.log('connection timeout, aborting');
        ws.close();
        connect();
      }, 3000);
      ws.onopen = () => {
        clearTimeout(timer);
        console.log('connection established');
        monitor.start();
        ws.send('?'); // request current status
      };
      ws.onerror = (err) => {
        clearTimeout(timer);
        console.log('connection error', err);
      };
      ws.onmessage = (evt) => {
        monitor.ack();
        handleMessage(evt.data);
      };
      ws.onclose = () => {
        clearTimeout(timer);
        console.log('connection closed');
        offline();
      }
    }
  }

  function handleMessage(msg) {
    if (msg) {
      $('.lcd').removeClass('heartbeat');
      var type = msg.charAt(0);
      var data = msg.substring(2);
      switch (type) {
        case 'S':
          $('body').toggleClass('active', data.indexOf('I') !== -1 || data.indexOf('P') !== -1);
          for (var i = 0; i < 4; i++) {
            var signal = 'SAIP'.charAt(i);
            $('[data-signal~="' + signal + '"]').toggleClass('active', data.indexOf(signal) !== -1);
          }
          break;
        case 'P':
          for (var i = 0; i < 12; i++) {
            var led = '12345678UTSP'.charAt(i);
            $('[data-led*="' + led + '"]').toggleClass('active', data.indexOf(led) !== -1);
          } 
          break;
        case 'L':
          lcd.ingest(data);
          break;
        default:
          break;
      }
    } else {
      $('.lcd').addClass('heartbeat');
    }
  }

  function disconnect() {
    if (isConnected()) {
      console.log('closing connection');
      monitor.stop();
      ws.close();
      offline();
    } else {
      console.log('already disconnected');
    }
  }

  function offline() {
    $('.led').removeClass('active');
    $('.lcd').removeClass('heartbeat');
    lcd.reset();
  }

  // connect/disconnect based on page visibility
  $(document).on({
    show: connect,
    hide: disconnect
  });

  // bind click commands
  $('[data-click]').click((e) => {
    ws.send($(e.target).data('click'));
  });

  // bind dbl-click commands
  $('[data-dblclick]').dblclick((e) => {
    ws.send($(e.target).data('dblclick'));
  });

  connect();
});