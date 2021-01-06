'use strict';

const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const WebSocket = require('ws');

let lastEncoderValue = 0;
let lastSliderValue = 0;
let lastButtonValues = [];

function connectArduino(ports, index = 0) {
    const port = new SerialPort(ports[index % ports.length], { baudRate: 9600 });
    const parser = port.pipe(new Readline({ delimiter: '\n' }));
    
    port.on("open", () => {
      console.log('serial port open');
    });
    
    port.on("close", () => {
        console.log('Lost connection to Arduino Controller, reconnecting in 1 Second');
        setTimeout(() => connectArduino(), 1000);
    });

    port.on("error", (e) => {
        console.log('Error while connecting to Arduino, reconnecting in 1 Second',e);
        setTimeout(() => connectArduino(ports, (index + 1) % ports.length), 1000);
    });

    parser.on('data', data =>{
        const values = data.split(',');

        if (values.length !== 9) {
            return;
        }

        const [encoderValueRaw, sliderValueRaw] = values.slice(7);
        const buttonValues = values.slice(0, 7).map(value => value == 1);
        let encoderValue = parseInt(encoderValueRaw);
        let sliderValue = 100 - parseInt(sliderValueRaw.replace('\r', ''));

        if (encoderValue >= -1 && encoderValue <= 1) {
            encoderValue = 0;
        }

        if (lastEncoderValue !== encoderValue && buttonValues[0]) {
            sendAction('changePlaybackOffset', Math.ceil(encoderValue/5));
        }

        if (lastSliderValue !== sliderValue) {
            let slowmotion = 0;

            if (sliderValue <= 85) {
                if (sliderValue > 50) {
                    slowmotion = 1;
                } else if (sliderValue > 10) {
                    slowmotion = 2;
                } else {
                    slowmotion = 3;
                }
            }
            sendAction('setSlowmotion', slowmotion);
        }

        // Pause
        if (lastButtonValues[0] !== buttonValues[0]) {
            sendAction('setPause', buttonValues[0]);
        }

        // Prepare (Set Preview)
        if (lastButtonValues[1] !== buttonValues[1] && buttonValues[1]) {
            sendAction('prepareReplay', buttonValues[1]);
        }

        // Reset
        if (lastButtonValues[2] !== buttonValues[2] && buttonValues[2]) {
            sendAction('resetReplay', buttonValues[2]);
        }

        // Cut with Stinger
        if (lastButtonValues[3] !== buttonValues[3] && buttonValues[3]) {
            sendAction('cutWithStinger', buttonValues[3]);
        }

        // Input 0
        if (lastButtonValues[4] !== buttonValues[4] && buttonValues[4]) {
            sendAction('setInput', 0);
        }

        // Input 1
        if (lastButtonValues[5] !== buttonValues[5] && buttonValues[5]) {
            sendAction('setInput', 1);
        }

        // Input 2
        if (lastButtonValues[6] !== buttonValues[6] && buttonValues[6]) {
            sendAction('setInput', 2);
        }

        lastEncoderValue = encoderValue;
        lastSliderValue = sliderValue;
        lastButtonValues = buttonValues;
    });
}




/////////////////
// Arduino
/////////////////

let ws = null;

const ports = ['/dev/ttyACM0', '/dev/ttyACM1']

function connectWs() {
    ws = new WebSocket('ws://localhost:9000');
    ws.on('open', () => {
        connectArduino(ports);
    });
    
    ws.on('message', () => {});

    ws.on('error', () => {});

    ws.on('close', () => {
        console.log('Lost connection to Core Server, reconnecting in 1 Second')
        setTimeout(() => {
            connectWs();
        }, 1000);
    });
}

function sendAction(action, data) {
    if (!ws) {
        return;
    }

    console.log(action, data);
    ws.send(JSON.stringify({
        action,
        data
    }));
}

connectWs();
