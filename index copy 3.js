const macadam = require('macadam');
const WebSocket = require('ws');
const { fps } = require('./config');

/////////////////
// Capture
/////////////////


class Capture {
  frameBuffer = new Array(bufferSize);
  frameBufferPointer = 0;
  capture;

  constructor(input) {
    macadam.capture({
      deviceIndex: input, // Index relative to the 'macadam.getDeviceInfo()' array
      displayMode: macadam.bmdModeHD1080p50,
      pixelFormat: macadam.bmdFormat8BitYUV,
    }).then(capture => {
      this.capture = capture;
      this.loop();
    });
  }

  loop() {
    this.capture.frame().then(frame => {  
      this.frameBuffer[this.frameBufferPointer] = Buffer.from(frame.video.data);
      this.frameBufferPointer = (this.frameBufferPointer+1) % bufferSize;
      process.nextTick(() => {
        this.loop();
      });
    });
  }
}



const bufferSize = 50*10;

const inputs = [0];//, 1];

const captures = [];
let playback = null;
let playbackOffset = 50*5; // 5 Seconds
let playbackPointer = 0;
let playbackIndex = 0;
let speed = 1;

async function init() {
  for (const input of inputs) {
    captures.push(new Capture(input));
  }

  playback  = await macadam.playback({
    deviceIndex: 3,
    displayMode: macadam.bmdModeHD1080p50,
    pixelFormat: macadam.bmdFormat8BitYUV
  });

  playbackLoop();
}

function timer(t) {
  return new Promise((f, r) => {
    setTimeout(f, t);
  });
}

async function playbackLoop() {
  const capture = captures[0];
  console.log()
  const index = (bufferSize - playbackOffset + playbackPointer) % bufferSize;
  let frame = capture.frameBuffer[index];

  if (!frame) {
    frame = new Uint8ClampedArray(1080*1920*2);
  } else {
    playbackPointer++;
  }

  
  await playback.schedule({
    video: frame,
    time: playbackIndex * 1000
  });

  console.log('scheduled', playbackIndex*1000)

  if (playbackIndex === 0) {
    await playback.schedule({
      video: frame,
      time: 1 * 1000
    });

    await playback.schedule({
      video: frame,
      time: 2 * 1000
    });

    playbackIndex = 2;
    playback.start({ startTime: 0 });
  }

  playbackIndex++;

  playback.played(playbackIndex * 1000 - 3000).then(() => {
    process.nextTick(() => {
      playbackLoop();
    });
  })
}

/////////////////
// Websocket
/////////////////

// Start Websocket Server
const wss = new WebSocket.Server({ port: 9090 });

// On new Websocket Connection
wss.on('connection', ws => {
  console.log("connection!")
  
  // On new Websocket Message
  ws.on('message', (json) => {
    const { action, data } = JSON.parse(json);

    switch (action) {
      case 'setSpeed':
        speed = data;
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

init();