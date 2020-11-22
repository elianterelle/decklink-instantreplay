const { modeInterlace } = require('macadam');
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
  frameCallback = () => {};

  constructor(input, frameCallback = () => {}) {
    this.frameCallback = frameCallback;
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
      this.frameCallback();
    });
  }
}



const bufferSize = 50*20;

const inputs = [0, 1];

const captures = [];
let playback = null;
let playbackInput = 0;
let playbackOffset = 50*5; // 5 Seconds
let playbackPointer = 0;
let playbackIndex = 0;
let playbackPause = false;
let slowmotion = 0; // 0: Full Speed; 1: 3/4 Speed; 2: Half Speed

async function init() {
  inputs.forEach((input, index) => {
    if (index == 0) {
      captures.push(new Capture(input, () => {
        playbackLoop();
      }));
      return;
    }

    captures.push(new Capture(input));
  });

  playback  = await macadam.playback({
    deviceIndex: 3,
    displayMode: macadam.bmdModeHD1080p50,
    pixelFormat: macadam.bmdFormat8BitYUV
  });

  playbackLoop();

  setInterval(() => {
    sendToAll({
      type: 'pointers',
      data: {
        capture: captures[playbackInput].frameBufferPointer,
        playback: playbackPointer - playbackOffset,
        buffersize: bufferSize
      }
    });
  }, 10)
}

async function playbackLoop() {
  if (!playback) {
    return;
  }

  const capture = captures[playbackInput];
  let slowmoOffset = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [0, 1, 1, 1, 0, 1, 1, 1]
  ][slowmotion][playbackIndex % 8];

  if (!playbackPause) {
    playbackPointer = playbackPointer - slowmoOffset;
  }

  const index = (bufferSize - playbackOffset + playbackPointer) % bufferSize;

  let frame = capture.frameBuffer[index];

  if (!frame) {
    frame = new Uint8ClampedArray(1080*1920*2);
  }

  await playback.displayFrame(frame);
  if (!playbackPause) {
    playbackPointer = (playbackPointer + 1) % bufferSize;
  }
  playbackIndex++;
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
      case 'setSlowmotion':
        slowmotion = data;
        break;
      case 'changePlaybackPointer':
        const capturePointer = captures[playbackInput].frameBufferPointer;
        const distance = Math.abs((playbackPointer-playbackOffset) % bufferSize - capturePointer);
        const preLimit = (data > 0 && capturePointer < (playbackPointer-playbackOffset) % bufferSize);
        const postLimit = (data < 0 && capturePointer > (playbackPointer-playbackOffset) % bufferSize);
        const limit = distance < 30 && (preLimit || postLimit);

        if (limit) {
          return;
        }

        playbackPointer = (playbackPointer + data) % bufferSize;
        break;

      case 'pausePlayback':
        playbackPause = true;
        break;

      case 'resumePlayback':
        playbackPause = false;
        break;
      
      case 'setPlaybackInput':
        if (captures[data]) {
          playbackInput = data;
        }
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

