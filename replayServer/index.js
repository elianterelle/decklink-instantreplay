const WebSocket = require('ws');
const { bufferSize } = require('./config');
const Playback = require('./playback');

const inputs = [0, 1];

const captures = [];
const playback = new Playback(3, () => {
  pointerStateChange();
});

async function init() {
  inputs.forEach((input, index) => {
    captures.push(new Capture(input, () => {
      if (playback.getInput() == input) {
        playback.nextFrame();
      }

      pointerStateChange();
    }));
  });

  playback.init(captures);
}


/////////////////
// Websocket
/////////////////

// Start Websocket Server
const wss = new WebSocket.Server({ port: 9001 });

// On new Websocket Connection
wss.on('connection', ws => {
  console.log("connection!")
  
  // On new Websocket Message
  ws.on('message', (json) => {
    const { action, data } = JSON.parse(json);

    switch (action) {
      case 'setState':
        const { slowmotion, input, pause, inputs } = data;
        playback.setSlowmotion(slowmotion);
        playback.setInput(input);
        playback.setPause(pause);
        break;
      
      case 'changePlaybackOffset':
        playback.setOffset(playback.getOffset() + data);
        break;
    }
  });
});

function sendToAll(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function pointerStateChange() {
  const pointerState = {
    captures: captures.map(capture => capture.getPointer()),
    playback: {
      offset: playback.getOffset(),
      pointer: playback.getPointer()
    },
    bufferSize: bufferSize
  };

  sendToAll({
    type: 'pointerStateChange',
    data: pointerState
  });
}

init();

