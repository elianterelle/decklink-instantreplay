const macadam = require('macadam');

// Count of Frames kept in the Buffer
exports.bufferSize = 50*20;

// Input Framerate
exports.fps = 50;

// Bmd Input/Output Format
exports.videoFormat = macadam.bmdModeHD1080p50;