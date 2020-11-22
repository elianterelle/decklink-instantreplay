
/////////////////
// Arduino
/////////////////
const { Board, Sensor } = require("johnny-five");
const board = new Board({port: 'COM3', repl: false});
const WebSocket = require('ws');

let avgIndex = 0;
let avgSum = 0;
 
const ws = new WebSocket('ws://localhost:9090');
 
ws.on('open', function open() {
    init();
});
 
ws.on('message', function incoming(data) {
  
});

function init() {
    board.on("ready", () => {
        // Create a new generic sensor instance for
        // a sensor connected to an analog (ADC) pin
        const sensor = new Sensor("A0");

        // When the sensor value changes, log the value
        sensor.on("change", value => {
            avgSum += parseInt(value)-509;
            avgIndex++;

            if (avgIndex === 3) {
                handleRotation(avgSum/3);
                avgIndex = 0;
                avgSum = 0;
            }
        });
    });
}

function handleRotation(value) {
    if (value > 5) {
        sendAction('changePlaybackPointer', Math.round(value/2));
    }

    if (value < -5) {
        sendAction('changePlaybackPointer', Math.round(value*3));
    }
}

function sendAction(action, data) {
    console.log(action, data);
    ws.send(JSON.stringify({
        action,
        data
    }));
}