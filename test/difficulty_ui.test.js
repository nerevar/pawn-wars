const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { STRATEGIES, difficultyToStrategy } = require('../strategies.js');

function createUi(url) {
    const elements = new Map();
    const ready = [];
    const history = [];
    function element(selector) {
        if (!elements.has(selector)) elements.set(selector, { value: '', checked: false, handlers: {} });
        return elements.get(selector);
    }
    function wrap(state) {
        return {
            __state: state,
            on(event, handler) { state.handlers[event] = handler; return this; },
            val(value) { if (arguments.length) { state.value = String(value); return this; } return state.value; },
            prop(name, value) { if (arguments.length === 2) { state[name] = value; return this; } return state[name]; },
            is(query) { return query === ':checked' && state.checked === true; },
            text() { return this; }, addClass() { return this; }, removeClass() { return this; },
            attr() { return this; }, removeAttr() { return this; }, prepend() { return this; },
        };
    }
    const document = {};
    function $(selector) {
        if (selector && selector.__state) return wrap(selector.__state);
        if (typeof selector !== 'string') return { ready(handler) { ready.push(handler); } };
        return wrap(element(selector));
    }
    $.ajax = () => {};
    const location = { href: url, pathname: '/game' };
    Object.defineProperty(location, 'search', { get() { return new URL(this.href).search; } });
    const window = { location, history: {
        pushState(_state, _title, next) { history.push(next); window.location.href = next; },
        replaceState(_state, _title, next) { window.location.href = next; },
    } };
    class Chess { pgn() { return ''; } }
    const context = vm.createContext({ $, window, document, Chess, URL, URLSearchParams, Date,
        navigator: { userAgent: 'test', appName: 'test', appVersion: '1' }, console, setTimeout() {}, atob() { return ''; } });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8'), context);
    context.initializeGame = () => 'test-fen';
    context.initializeUI = () => {};
    context.extractMovesFromPGN = () => '';
    for (const handler of ready) handler();
    return { context, state: element, history };
}

test('super hard keeps bestV1 evaluation and has an explicit adaptive search profile', () => {
    assert.equal(difficultyToStrategy(5), STRATEGIES.superHard);
    assert.equal(STRATEGIES.superHard.evaluate, STRATEGIES.bestV1.evaluate);
    assert.equal(STRATEGIES.superHard.depth, 8);
    assert.deepEqual(STRATEGIES.superHard.searchOptions, { minDepth: 6, maxTimeMs: 500 });
    assert.equal(difficultyToStrategy(99), STRATEGIES.bestV1);
});

test('URL restores logging and level 5, while an unknown level falls back to level 4', () => {
    const ui = createUi('https://example.test/game?gameMode=playerb&aiDifficulty=5&searchLogging=1');
    assert.equal(ui.context.aiDifficulty, 5);
    assert.equal(ui.context.aiColor, 'w');
    assert.equal(ui.context.ENABLE_LOGGING, true);
    assert.equal(ui.state('#difficulty-select').value, '5');
    assert.equal(ui.state('#search-logging').checked, true);
    ui.context.updateURL();
    const saved = new URL(ui.history.at(-1));
    assert.equal(saved.searchParams.get('aiDifficulty'), '5');
    assert.equal(saved.searchParams.get('searchLogging'), '1');

    ui.context.window.location.href = 'https://example.test/game?gameMode=playerw&aiDifficulty=8';
    ui.context.loadGameFromURL();
    assert.equal(ui.context.aiDifficulty, 4);
    assert.equal(ui.context.aiColor, 'b');
    assert.equal(ui.context.ENABLE_LOGGING, false);
    assert.equal(ui.state('#difficulty-select').value, '4');
    assert.equal(ui.state('#search-logging').checked, false);

    const checkbox = ui.state('#search-logging');
    checkbox.checked = true;
    checkbox.handlers.change.call({ __state: checkbox });
    assert.equal(ui.context.ENABLE_LOGGING, true);
    assert.equal(new URL(ui.history.at(-1)).searchParams.get('searchLogging'), '1');
    checkbox.checked = false;
    checkbox.handlers.change.call({ __state: checkbox });
    assert.equal(ui.context.ENABLE_LOGGING, false);
    assert.equal(new URL(ui.history.at(-1)).searchParams.has('searchLogging'), false);
});

test('starting a level-5 game from either side persists the selected level', () => {
    const ui = createUi('https://example.test/game');
    assert.equal(ui.context.ENABLE_LOGGING, false);
    ui.context.startAiGameWithDifficulty('playerw', 5);
    assert.equal(ui.context.aiDifficulty, 5);
    assert.equal(ui.context.aiColor, 'b');
    assert.equal(new URL(ui.history.at(-1)).searchParams.get('aiDifficulty'), '5');

    ui.context.startAiGameWithDifficulty('playerb', 5);
    assert.equal(ui.context.aiDifficulty, 5);
    assert.equal(ui.context.aiColor, 'w');
    assert.equal(new URL(ui.history.at(-1)).searchParams.get('aiDifficulty'), '5');
});
