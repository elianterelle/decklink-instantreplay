/*
    Ports:
        9000: Core Server Websocket
        9001: Video Server Websocket
*/

const WebSocket = require('ws');
const { CasparCG } = require("casparcg-connection");
const { Atem } = require('atem-connection');


let casparCG = null;
let replayWs = null;
const atem = new Atem();

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
                    pointer: 0,
                    position: 0
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
            stingerFile: 'stinger',
            replayAtemInput: 2,
            inputs: [true, true]
        },
        connections: {
            replay: false,
            casparCG: false,
            atem: false
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
                state.replay.state.pause = data;
                console.log(state);
                sendReplayState();
                sendState('replay.state.pause');
                break;

            case 'setInput':
                state.replay.input = data;
                sendReplayState();
                sendState('replay.state.input');
                break;

            case 'changePlaybackOffset':
                sendReplayAction('changePlaybackOffset', data);
                break;

            case 'cutWithStinger':
                casparCG.play(1, 20, 'stinger').then((data) => {
                    setTimeout(() => {
                        atem.cut();
                    }, 500);
                });
                break;

            case 'prepareReplay':
                atem.changePreviewInput(state.settings.replayAtemInput);
                break;
            
            case 'resetReplay':
                sendReplayAction('resetPlaybackOffset');
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
        state,
        change
    });
}



///////////////////////////////////////////
///// Websocket Client (ReplayServer) /////
///////////////////////////////////////////

function connectReplay() {
    console.log('Connecting to Replay Server...')

    replayWs = new WebSocket('ws://localhost:9001')

    replayWs.on('open', () => {
        console.log('Connected to Replay Server!')
        state.connections.replay = true;
        sendState('connection');
    });

    replayWs.on('close', () => {
        state.connections.replay = false;
        sendState('connection');

        console.log('Lost connection to Replay Server, reconnecting in 1 Second')
        setTimeout(() => {
            connectReplay();
        }, 1000);
    });

    replayWs.on('error', () => {});

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

function sendReplayAction(action, data = null) {
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



///////////////////////////////////////////
///////////// Atem Client /////////////////
///////////////////////////////////////////


function connectAtem() {
    atem.on('info', (log) => {
        console.log('[Atem] Info:', log);
    });

    atem.on('error', (log) => {
        console.error('[Atem] Error:', log);
    });

    console.log("Connecting to Atem...");
    atem.connect('10.1.2.177');

    atem.on('connected', () => {
        console.log("Connected to Atem!");
        state.connections.atem = true;
        sendState('connection');
    });

    atem.on('disconnected', () => {
        console.log('Lost connection to Atem, reconnecting in 1 Second');
        state.connections.atem = false;
        sendState('connection');
        setTimeout(() => {
            connectAtem();
        }, 1000);
    });

    atem.on('stateChanged', (atemState, change) => {
        if (!change.includes('video.ME.0.programInput') && !change.includes('video.ME.0.previewInput')) {
            return;
        }
        const {programInput, previewInput} = atemState.video.mixEffects[0];
        
        state.atem = {
            program: programInput,
            preview: previewInput
        };

        sendState('atem');
    });
}
///////////////////////////////////////////
/////////// CasparCG Client ///////////////
///////////////////////////////////////////



function connectCasparCG() {
    console.log("Connecting to CasparCG...");
    casparCG = new CasparCG('10.1.2.50');
    casparCG.autoReconnect = true;
    casparCG.autoReconnectAttempts = 999999999999;
    casparCG.autoReconnectInterval = 1000;
    casparCG.onConnected = casparCG.onDisconnected = () => {
        console.log('Connected to CasparCG!')
        state.connections.casparCG = true;
        sendState('connection');
    };

    casparCG.onLog = (log) => {
        console.log('[CasparCG] Log:', log);
    };

    casparCG.onDisconnected = () => {
        console.log('Lost connection to CasparCG, reconnecting in 1 Second');
        state.connections.casparCG = false;
        sendState('connection');
    };
}

setState();
connectReplay();
connectAtem();
connectCasparCG();
