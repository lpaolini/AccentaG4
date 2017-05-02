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
          var data = evt.data.split(':');
          switch (data[0]) {
            case 'S':
              $('body').toggleClass('active', data[1].indexOf('I') !== -1 || data[1].indexOf('P') !== -1);
              for (var i = 0; i < 4; i++) {
                var signal = 'SAIP'.charAt(i);
                $('[data-signal~="' + signal + '"]').toggleClass('active', data[1].indexOf(signal) !== -1);
              }
              break;
            case 'P':
              for (var i = 0; i < 12; i++) {
                var signal = '12345678UTHM'.charAt(i);
                $('[data-led*="' + signal + '"]').toggleClass('active', data[1].indexOf(signal) !== -1);
              } 
              break;
            case 'L':
              // ignore
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