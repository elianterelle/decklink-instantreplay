const OBSWebSocket = require('obs-websocket-js');
const WebSocket = require('ws');

let coreWS = null;
let obs = null;

function connectOBS() {
    obs = new OBSWebSocket();
    obs.connect({ address: '10.16.12.21', password: 'OBSWebSocket' });
    obs.on('ConnectionClosed', () => {
        console.log('Lost connection to OBS, reconnecting in 1 Second');
        obs = null;
        setTimeout(() => {
            connectOBS();
        }, 1000);
    });
    obs.on('AuthenticationFailure', () => {
        console.log('OBS Authentication Failure, reconnecting in 1 Second');
        obs = null;
        setTimeout(() => {
            connectOBS();
        }, 1000);
    });
}


function connectCore() {
    console.log('Connecting to Core Server...');

    coreWS = new WebSocket('ws://localhost:9002');

    coreWS.on('open', () => {
        console.log('Connected to Core Server!');
    });

    coreWS.on('close', () => {
        console.log('Lost connection to Core Server, reconnecting in 1 Second');
        setTimeout(() => {
            connectReplay();
        }, 1000);
    });

    coreWS.on('error', () => {});

    coreWS.on('message', message => {
        switch (message) {
            case 'playStingerIn':
                if (obs) {
                    obs.send('SetSceneItemProperties', {item: 'overlays', visible: false});
                }
                break;
            case 'playStingerOut':
                if (obs) {
                    obs.send('SetSceneItemProperties', {item: 'overlays', visible: true});
                }
                break;
        }
    });
}

connectOBS();
connectCore();