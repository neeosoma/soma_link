// Regression test for the signal-composer ("Отправить сигнал") keyboard/scroll bug:
// writing a message in the composer must keep the chassis scrollable, must not let
// the keyboard hide the send button, and must re-scroll the send button into view
// above the keyboard when it opens.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const css = fs.readFileSync(require.resolve('../room.css'), 'utf8');

// Extract the kb-scheme functions from the inline script:
// _somaKbVvHeight .. end of _somaKbBind (exclusive of _vinylKbFreeze).
const start = html.indexOf('function _somaKbVvHeight()');
const end = html.indexOf('function _vinylKbFreeze');
assert.ok(start > 0 && end > start, 'kb block not found in index.html');
const block = html.slice(start, end);

const sm = html.match(/function scrollSendIntoView\(\) \{[\s\S]*?\n    \}/);
assert.ok(sm, 'scrollSendIntoView not found in index.html');

function makeClassList() {
    const set = new Set();
    return {
        contains: c => set.has(c),
        add: c => set.add(c),
        remove: c => set.delete(c),
        toggle: (c, force) => {
            if (force === undefined) { set.has(c) ? set.delete(c) : set.add(c); }
            else { force ? set.add(c) : set.delete(c); }
        },
        _set: set,
    };
}

function buildScenario() {
    const chassisStyle = {};
    const chassis = {
        classList: makeClassList(),
        style: chassisStyle,
        offsetHeight: 700,
        querySelectorAll: () => [],
    };
    chassis.classList.add('soma-modal-chassis');

    const sendCalls = [];
    const sendBtn = { scrollIntoView: opts => sendCalls.push(opts) };
    const textarea = { tagName: 'TEXTAREA' };

    const pModal = {
        id: 'post-modal',
        classList: makeClassList(),
        querySelector: sel => (sel === '.soma-modal-chassis' ? chassis : null),
        querySelectorAll: () => [],
        addEventListener: (t, fn) => { pModal._ls = pModal._ls || {}; pModal._ls[t] = fn; },
        removeEventListener: () => {},
    };

    let vvHeight = 844;
    const vvListeners = {};
    const timeoutFns = [];

    const sandbox = {
        console,
        setTimeout: (fn) => { timeoutFns.push(fn); return timeoutFns.length; },
        clearTimeout: () => {},
        window: {
            innerHeight: 844,
            visualViewport: {
                get height() { return vvHeight; },
                addEventListener: (t, fn) => { vvListeners[t] = fn; },
                removeEventListener: () => {},
            },
            addEventListener: () => {},
            removeEventListener: () => {},
        },
        document: {
            getElementById: id => (id === 'send-btn' ? sendBtn : null),
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(block + '\n' + sm[0], sandbox);

    return {
        sandbox, pModal, chassis, chassisStyle, sendCalls, textarea,
        setVv: h => { vvHeight = h; },
        resize: () => vvListeners.resize && vvListeners.resize(),
        flushTimeouts: () => timeoutFns.forEach(fn => fn()),
    };
}

test('signal composer: chassis scrolls and stays above the keyboard while typing', () => {
    const { sandbox, pModal, chassisStyle, sendCalls, textarea, setVv, resize, flushTimeouts } = buildScenario();
    const { _somaKbBind } = sandbox;

    // open composer + focus textarea -> keyboard armed, chassis frozen and scrollable
    _somaKbBind(pModal);
    pModal._ls.focusin({ target: textarea });

    assert.equal(chassisStyle.overflowY, 'auto', 'freeze must enable chassis scroll (overflowY auto)');
    assert.equal(chassisStyle.height, '700px', 'freeze fixes chassis height');
    assert.equal(chassisStyle.maxHeight, '700px', 'freeze sets maxHeight');

    // keyboard opens: visualViewport shrinks
    setVv(600);
    resize();

    assert.ok(pModal.classList.contains('is-kb-open'), 'is-kb-open applied when keyboard opens');
    // cap = vh - 24 = 576 -> chassis must NOT stay 700 (would hide the send button behind the keyboard)
    assert.equal(chassisStyle.maxHeight, '576px', 'chassis maxHeight capped to the visible area');
    assert.ok(parseInt(chassisStyle.maxHeight, 10) < 700, 'capped below the frozen height');

    // send button re-scrolled into view after the keyboard opens
    flushTimeouts();
    assert.equal(sendCalls.length, 1, 'scrollSendIntoView scheduled once on keyboard open');
    assert.equal(sendCalls[0].block, 'end');
    assert.equal(sendCalls[0].behavior, 'smooth');

    // keyboard closes -> unfreeze restores the chassis
    setVv(844);
    resize();
    assert.ok(!pModal.classList.contains('is-kb-open'), 'is-kb-open removed when the keyboard closes');
    assert.equal(chassisStyle.maxHeight, '', 'maxHeight cleared on unfreeze');
});

test('signal composer CSS: chassis is scrollable and kb-open aligns it to the top', () => {
    const m = css.match(/#post-modal-chassis \{[\s\S]*?\}/);
    assert.ok(m, 'post-modal-chassis rule exists');
    assert.match(m[0], /overflow-y:\s*auto/, 'chassis CSS enables vertical scroll');
    assert.match(css, /#post-modal\.is-kb-open \{\s*align-items:\s*flex-start;/,
        'kb-open aligns the chassis to the top of the visible area');
});
