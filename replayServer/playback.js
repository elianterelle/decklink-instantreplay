const config = require('../config');
const macadam = require('macadam');

class Playback {
    playback = null;
    playbackInput = 0;
    playbackOutput;
    playbackOffset = 0;
    playbackPointer = 0;
    playbackIndex = 0;
    playbackPause = false;
    slowmotion = 0; // 0: Full Speed; 1: 3/4 Speed; 2: Half Speed
    captures = [];

    constructor(playbackOutput) {
        this.playbackOutput = playbackOutput;
    }

    async init(captures) {
        this.playback  = await macadam.playback({
            deviceIndex: this.playbackOutput,
            displayMode: config.videoFormat,
            pixelFormat: macadam.bmdFormat8BitYUV
        });

        this.captures = captures;
    }

    async nextFrame() {
        if (!this.playback) {
            return;
        }

        const capture = this.captures[this.playbackInput];
        let slowmoOffset = [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 0, 0, 0, 1],
            [0, 1, 0, 1, 0, 1, 0, 1],
            [0, 1, 1, 1, 0, 1, 1, 1]
        ][this.slowmotion][this.playbackIndex % 8];

        if (!this.playbackPause) {
            this.playbackOffset = this.playbackOffset + slowmoOffset;
        }

        const index = (config.bufferSize - this.playbackOffset + this.playbackPointer) % config.bufferSize;

        let frame = capture.frameBuffer[index];

        if (!frame) {
            console.log('Missing Frame!')
            frame = new Uint8ClampedArray(1080*1920*2);
        }

        await this.playback.displayFrame(frame);

        if (this.playbackPause) {
            this.playbackOffset++;
        }

        this.playbackPointer = (this.playbackPointer + 1) % config.bufferSize;

        this.playbackIndex++;
    }

    getPointer() {
        return this.playbackPointer;
    }

    getOffset() {
        return this.playbackOffset;
    }

    setOffset(offset) {
        this.playbackOffset = offset;
    }

    getInput() {
        return this.playbackInput;
    }

    setInput(input) {
        this.playbackInput = input;
    }

    getPause() {
        return this.playbackPause;
    }

    setPause(pause) {
        this.playbackPause = pause;
    }

    getSlowmotion() {
        return this.slowmotion;
    }

    setSlowmotion(slowmotion) {
        this.slowmotion = slowmotion;
    }
}

module.exports = Playback;