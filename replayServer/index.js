const WebSocket = require('ws');
const { bufferSize } = require('../config');
const Playback = require('./playback');
const Capture = require('./capture');

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
        console.log(data);
        break;
      
      case 'changePlaybackOffset':
        playback.setOffset(playback.getOffset() + data);
        break;

      case 'resetPlaybackOffset':
        playback.setOffset(5);
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
  const offset = playback.getOffset();
  const pointer = playback.getPointer();
  const position = (bufferSize + pointer - offset) % bufferSize;
  const pointerState = {
    captures: captures.map(capture => capture.getPointer()),
    playback: {
      offset,
      pointer,
      position
    },
    bufferSize: bufferSize
  };

  sendToAll({
    type: 'pointerStateChange',
    data: pointerState
  });
}

init();

