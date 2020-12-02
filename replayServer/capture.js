const config = require('../config');
const macadam = require('macadam');

class Capture {
    frameBuffer = new Array(config.bufferSize);
    frameBufferPointer = 0;
    capture;
    frameCallback = () => {};
  
    constructor(input, frameCallback = () => {}) {
        this.frameCallback = frameCallback;
        macadam.capture({
            deviceIndex: input,
            displayMode: config.videoFormat,
            pixelFormat: macadam.bmdFormat8BitYUV,
        }).then(capture => {
            this.capture = capture;
            this.loop();
        });
    }
  
    loop() {
        this.capture.frame().then(frame => {  
            this.frameBuffer[this.frameBufferPointer] = Buffer.from(frame.video.data);
            this.frameBufferPointer = (this.frameBufferPointer+1) % config.bufferSize;
            process.nextTick(() => {
            this.loop();
            });
            this.frameCallback();
        });
    }

    getPointer() {
        return this.frameBufferPointer;
    }
}

module.exports = Capture;