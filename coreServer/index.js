/*
    Ports:
        9000: Core Server Websocket
        9001: Video Server Websocket
*/

const WebSocket = require('ws');
const { CasparCG } = require("casparcg-connection");

let state = {};

function setState() {
    state = {
        replay: {
            state: {
                input: 0,
                slowmotion: 0,
                pause: false,
            },
            pointers: {
                captures: [],
                playback: {
                    offset: 0,
                    pointer: 0
                },
                bufferSize: 0
            }
        },
        atem: {
            program: 0,
            preview: 0
        },
        casparCG: {},
        settings: {
            labels: {
                inputs: ['Kamera 1', 'Kamera 2']
            },
            fps: 50,
            inputs: [true, true]
        },
        connections: {
            replay: false,
            casparCG: false
        }
    };
}



/*
function updateState(state) {
    const changes = [];
    
    const isObject = (item) => {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    const deepMerge = (target, ...sources) => {
        if (!sources.length) {
            return target;
        }
        const source = sources.shift();
      
        if (isObject(target) && isObject(source)) {
          for (const key in source) {
            if (isObject(source[key])) {
              if (!target[key]) {
                  Object.assign(target, { [key]: {} });
              }
              deepMerge(target[key], source[key]);
            } else {
              Object.assign(target, { [key]: source[key] });
            }
          }
        }
      
        return deepMerge(target, ...sources);
      }

    deepMerge([]);
}
*/
///////////////////////////////////////////
/////////// Websocket Server //////////////
///////////////////////////////////////////

// Start Websocket Server
const wss = new WebSocket.Server({ port: 9000 });

// On new Websocket Connection
wss.on('connection', ws => {
    console.log("connection!");

    sendState();

    // On new Websocket Message
    ws.on('message', (json) => {
        const { action, data } = JSON.parse(json);

        switch (action) {
            case 'setSlowmotion':
                state.replay.state.slowmotion = data;
                sendReplayState();
                sendState('replay.state.slowmotion');
                break;

            case 'setPause':
                state.replay.pause = data;
                sendReplayState();
                sendState('replay.state.pause');
                break;

            case 'setInput':
                state.replay.input = data;
                sendReplayState();
                sendState('replay.state.input');
                break;

            case 'changeOffset':
                sendReplayAction('changePlaybackOffset', data);
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

function sendState(change = '*') {
    sendToAll({
        type: 'state',
        change
    });
}



///////////////////////////////////////////
///// Websocket Client (ReplayServer) /////
///////////////////////////////////////////

let replayWs = null;

function connectReplay() {
    console.log('Connecting to Replay Server...')

    replayWs = new WebSocket('ws://localhost:9001')

    replayWs.on('open', () => {
        console.log('Connected to Replay Server!')
        state.connections.replay = true;
        sendState(['connection']);
    });

    replayWs.on('close', () => {
        state.connections.replay = false;
        sendState(['connection']);

        console.log('Lost connection to Replay Server, reconnecting in 1 Second')
        setTimeout(() => {
            connectReplay();
        }, 1000);
    });

    replayWs.on('message', (json) => {
        const { type, data } = JSON.parse(json);

        switch (type) {
            case 'pointerStateChange':
                const { captures, playback, bufferSize } = data;

                state.replay.pointers.captures = captures;
                state.replay.pointers.playback = playback;
                state.replay.pointers.bufferSize = bufferSize;

                sendState('replay.pointers');
                break;
        }
    });
}

function sendReplayAction(action, data) {
    if (!replayWs) {
        return;
    }

    replayWs.send(JSON.stringify({
        action,
        data
    }));
}

function sendReplayState() {
    sendReplayAction('setState', state.replay.state);
}



setState();
connectReplay();
