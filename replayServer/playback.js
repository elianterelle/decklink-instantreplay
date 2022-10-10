const config = require('../config');
const macadam = require('macadam');

class Playback {
    playback = null;
    playbackInput = 0;
    playbackOutput;
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
            displayMode: macadam[config.videoFormat],
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
            [0, 0, 0, 0, 0, 0, 0, 0], // 100%
            [0, 0, 0, 1, 0, 0, 0, 1], // 75%
            [0, 1, 0, 1, 0, 1, 0, 1], // 50%
            [0, 1, 1, 1, 0, 1, 1, 1]  // 25%
        ][this.slowmotion][this.playbackIndex % 8];

        if (!this.playbackPause) {
            this.decreasePointer(slowmoOffset);
        }

        const index = (config.bufferSize + this.playbackPointer) % config.bufferSize;

        let frame = capture.frameBuffer[index];

        if (!frame) {
            console.log('Missing Frame')
            frame = new Uint8ClampedArray(1080*1920*2);
        }

        try {
            await this.playback.displayFrame(frame);
        } catch {
            console.log('Frame Playback Failed');
            process.exit(1);
        }

        if (this.playbackPause) {
            this.decreasePointer();
        }

        this.increasePointer();

        this.playbackIndex++;
    }

    increasePointer() {
        this.playbackPointer = (this.playbackPointer + 1) % config.bufferSize;
    }

    decreasePointer(value = 1) {
        this.playbackPointer = (config.bufferSize + (this.playbackPointer - value)) % config.bufferSize;
    }

    getPointer() {
        return this.playbackPointer;
    }

    resetPointer() {
        const capture = this.captures[this.playbackInput];
        this.playbackPointer = (config.bufferSize + capture.frameBufferPointer - 1) % config.bufferSize;
    }

    setOffset(offset) {
        this.decreasePointer(offset);
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