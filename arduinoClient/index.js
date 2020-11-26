const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const WebSocket = require('ws');

const port = new SerialPort('COM3', { baudRate: 9600 });
const parser = port.pipe(new Readline({ delimiter: '\n' }));

port.on("open", () => {
  console.log('serial port open');
});

let lastEncoderValue = 0;
let lastSliderValue = 0;
let lastButtonValue = 0;

function init() {
    parser.on('data', data =>{
        const [buttonValueRaw, encoderValueRaw, sliderValueRaw] = data.split(',');

        const buttonValue = buttonValueRaw == 1;
        let encoderValue = parseInt(encoderValueRaw);
        let sliderValue = parseInt(sliderValueRaw);

        if (encoderValue >= -1 && encoderValue <= 1) {
            encoderValue = 0;
        }

        if (lastEncoderValue !== encoderValue && buttonValue) {
            sendAction('changePlaybackPointer', Math.ceil(encoderValue/3));
        }

        if (lastSliderValue !== sliderValue) {
            let slowmotion = 0;

            if (sliderValue <= 75) {
                if (sliderValue > 50) {
                    slowmotion = 1;
                } else if (sliderValue > 25) {
                    slowmotion = 2;
                } else {
                    slowmotion = 3;
                }
            }
            sendAction('setSlowmotion', slowmotion);
        }

        if (lastButtonValue !== buttonValue) {
            sendAction(buttonValue ? 'pausePlayback' : 'resumePlayback');
        }

        lastEncoderValue = encoderValue;
        lastSliderValue = sliderValue;
        lastButtonValue = buttonValue;
    });
}




/////////////////
// Arduino
/////////////////

const ws = new WebSocket('ws://localhost:9090');
 
ws.on('open', function open() {
    init();
});
 
ws.on('message', function incoming(data) {});

function sendAction(action, data) {
    console.log(action, data);
    ws.send(JSON.stringify({
        action,
        data
    }));
}