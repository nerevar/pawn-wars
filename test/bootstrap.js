// Shared Node bootstrap for search tests. The browser loads the same source files.
globalThis.Chess = require('../chess.js').Chess;
Object.assign(globalThis, require('../game.js'), require('../strategies.js'));
globalThis.gameMode = 'playerw';
globalThis.aiColor = 'b';
globalThis.ENABLE_LOGGING = false;
const ai = require('../ai.js');
globalThis.debug = ai.debug;
module.exports = ai;
