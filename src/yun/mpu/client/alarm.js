var lcd = (() => {
  // https://dawes.wordpress.com/2010/01/05/hd44780-instruction-set/
  var display;
  var pos;
  var cmd = false;
  function clear () {
    display = ['                ', '                '];
    pos = 0;
  }
  function write(char) {
    if (char >= ' ') {
      var row, col;
      if (pos < 16) {
        row = 0;
        col = pos;
      } else {
        row = 1;
        col = pos - 64;
      }
      display[row] = display[row].substr(0, col) + char + display[row].substr(col + 1);
      pos++;
    }
  }
  function ingest (data) {
    for (var i = 0; i < data.length; i++) {
      var char = data.charCodeAt(i);
      if (cmd) {
        if (char >= 0x80) { // set position
          pos = char - 0x80;
        }
        cmd = false;
      } else {
        switch (data.charCodeAt(i)) {
          case 0xa: // crlf
            pos = 64;
            break;
          case 0x10: // left
            pos--;
            break;
          case 0x7: // right
            pos++;
            break;
          case 0xc: // clear?
            clear();
            break;
          case 0x4: // command
            cmd = true;
            break;
          default:
            write(data.charAt(i));
        }
      }
    }
  }
  function get (row) {
    return row !== undefined ? display[row] : display;
  }
  clear();
  return {
    ingest: ingest,
    get: get
  }
})();

$(() => {
  var ws;

  var monitor = ((timeout) => {
    var timer;
    function start () {
      timer = setTimeout(() => {
        console.log('connection lost...');
        offline();
      }, timeout);
    }
    function stop () {
      clearTimeout(timer);
      timer = null;
    }
    function ack () {
      console.log('connection acknowledged');
      stop();
      start();
    }
    return {
      start: start,
      stop: stop,
      ack: ack
    };
  })(5000);

  function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
  }

  function connect() {
    if (isConnected()) {
      console.log('already connected');
    } else {
      ws = new WebSocket("ws://10.118.5.5:8080");
      console.log('establishing connection');
      ws.onopen = () => {
        console.log('connection established');
        monitor.start();
        ws.send('?');
      };
      ws.onmessage = (evt) => {
        monitor.ack();
        if (evt.data) {
          var type = evt.data.charAt(0);
          var msg = evt.data.substring(2);
          switch (type) {
            case 'S':
              $('body').toggleClass('active', msg.indexOf('I') !== -1 || msg.indexOf('P') !== -1);
              for (var i = 0; i < 4; i++) {
                var signal = 'SAIP'.charAt(i);
                $('[data-signal~="' + signal + '"]').toggleClass('active', msg.indexOf(signal) !== -1);
              }
              break;
            case 'P':
              for (var i = 0; i < 12; i++) {
                var led = '12345678UTSP'.charAt(i);
                $('[data-led*="' + led + '"]').toggleClass('active', msg.indexOf(led) !== -1);
              } 
              break;
            case 'L':
              for (var i = 0; i < msg.length; i++) {
                console.log(msg.charCodeAt(i) >= 32 && msg.charCodeAt(i) <= 127 ? msg.charAt(i) : ' ', msg.charCodeAt(i).toString(16));
              }

              lcd.ingest(msg);
              $('#lcd0').html(lcd.get(0));
              $('#lcd1').html(lcd.get(1));

              break;
            default:
              break;
          }
        }
      };
      ws.onclose = () => {
        console.log('connection closed');
      }
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
  }

  // connect/disconnect based on page visibility
  $(document).on({
    show: connect,
    hide: disconnect
  });
  
  // bind click commands
  $('[data-command][data-trigger="click"]').click((e) => {
    ws.send($(e.target).data('command'));
  });

  // bind dbl-click commands
  $('[data-command][data-trigger="dblclick"]').dblclick((e) => {
    ws.send($(e.target).data('command'));
  });
  
  connect();
});