// Regression test for the signal-composer ("Отправить сигнал") keyboard/scroll bug:
// the composer panel (chassis) must NOT move or resize when the keyboard opens,
// but the whole panel must stay scrollable even with the keyboard open — so the
// send button can be reached by scrolling the panel content.
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

    const sandbox = {
        console,
        setTimeout: () => 0,
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
        document: { getElementById: () => null },
    };
    vm.createContext(sandbox);
    vm.runInContext(block, sandbox);

    return {
        sandbox, pModal, chassis, chassisStyle, textarea,
        setVv: h => { vvHeight = h; },
        resize: () => vvListeners.resize && vvListeners.resize(),
    };
}

test('signal composer: panel stays put but scrolls even with the keyboard open', () => {
    const { sandbox, pModal, chassisStyle, textarea, setVv, resize } = buildScenario();
    const { _somaKbBind } = sandbox;

    // open composer + focus textarea -> keyboard armed, chassis frozen (fixed height, scrollable)
    _somaKbBind(pModal);
    pModal._ls.focusin({ target: textarea });

    assert.equal(chassisStyle.overflowY, 'auto', 'frozen chassis must be scrollable (overflowY auto)');
    assert.equal(chassisStyle.height, '700px', 'freeze fixes the chassis height (block does not resize)');
    assert.equal(chassisStyle.maxHeight, '700px', 'freeze sets maxHeight to the frozen height');

    // keyboard opens: visualViewport shrinks -> the block must NOT move or resize
    setVv(600);
    resize();

    assert.ok(pModal.classList.contains('is-kb-open'), 'is-kb-open applied when the keyboard opens');
    // The chassis keeps its frozen height — no maxHeight capping, no repositioning:
    // the block stays exactly where it was, only its scrollable content can move.
    assert.equal(chassisStyle.height, '700px', 'chassis height unchanged when keyboard opens (block does not move)');
    assert.equal(chassisStyle.maxHeight, '700px', 'no maxHeight capping — block keeps its size');
    assert.equal(chassisStyle.overflowY, 'auto', 'chassis still scrollable with the keyboard open');

    // keyboard closes -> unfreeze restores
    setVv(844);
    resize();
    assert.ok(!pModal.classList.contains('is-kb-open'), 'is-kb-open removed when the keyboard closes');
    assert.equal(chassisStyle.maxHeight, '', 'maxHeight cleared on unfreeze');
});

test('signal composer CSS: panel scrolls and is never repositioned by the keyboard', () => {
    const m = css.match(/#post-modal-chassis \{[\s\S]*?\}/);
    assert.ok(m, 'post-modal-chassis rule exists');
    assert.match(m[0], /overflow-y:\s*auto/, 'chassis CSS enables vertical scroll');
    // The keyboard must not reposition the panel: no align-items override on is-kb-open.
    assert.doesNotMatch(css, /#post-modal\.is-kb-open\s*\{[^}]*align-items/,
        'no align-items rule for #post-modal.is-kb-open — the block stays in place');
});
