const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const api = require('../signals.js');
const code = readFileSync(require.resolve('../signals.js'), 'utf8');
function storage(value = '{}') {
    let raw = value;
    return { getItem: () => raw, setItem: (_, next) => { raw = next; }, raw: () => raw };
}

test('topic tags are sanitized, fit DB limits and round-trip', () => {
    const tag = api.packTag('д'.repeat(50));
    assert.ok(tag.length <= 32);
    const parsed = api.unpackTag(tag);
    assert.equal(parsed.topic, 'Д'.repeat(24));
    assert.equal(parsed.legacy, false);
    assert.equal(api.packTag('<script>@победа</script>'), 'SCRIPTПОБЕДАSCRIPT');
    assert.equal(api.packTag('  работа  '), 'РАБОТА');
});

test('legacy S1: intent-format tags keep the topic, drop the intent', () => {
    for (const tag of ['РАБОТА', 'ЛИЧНАЯ БОЛЬ', '', 'S1:X|РАБОТА', '<img onerror=alert(1)>']) {
        const parsed = api.unpackTag(tag);
        assert.equal(parsed.legacy, tag.startsWith('S1:'));
        assert.equal(parsed.topic, tag.startsWith('S1:') ? tag.split('|')[1] : tag);
    }
    assert.equal(api.tagLabel('РАБОТА'), 'РАБОТА');
    assert.equal(api.tagLabel('S1:V|РАБОТА'), 'РАБОТА');
    assert.equal(api.tagLabel(''), 'Без темы');
});

test('filterPosts only drops locally hidden posts and preserves original rows', () => {
    const posts = [
        { id: 'a', tag: 'РАБОТА' },
        { id: 'b', tag: 'S1:S|ДЕНЬ' },
        { id: 'c', tag: '' }
    ];
    assert.deepEqual(api.filterPosts(posts, { hidden: [] }), posts);
    assert.deepEqual(api.filterPosts(posts, { hidden: ['b'] }).map(x => x.id), ['a', 'c']);
    assert.deepEqual(api.filterPosts(posts, { hidden: ['x'] }), posts);
});

test('local boundaries recover corrupted storage, deduplicate and cap hidden IDs', () => {
    for (const raw of ['{broken', 'null', '[]', '"text"']) {
        assert.deepEqual(api.readPrefs(storage(raw)), { hidden: [] });
    }
    const s = storage();
    api.writePrefs(s, { hidden: ['a', 'a', 'b'] });
    assert.deepEqual(api.readPrefs(s), { hidden: ['a', 'b'] });
    api.writePrefs(s, { hidden: Array.from({ length: 550 }, (_, i) => String(i)) });
    assert.equal(api.readPrefs(s).hidden.length, 500);
    assert.throws(() => api.writePrefs({ setItem() { throw Error('blocked'); } }, { hidden: [] }));
});

test('pager candidate integration respects locally hidden posts', () => {
    const localStorage = storage(JSON.stringify({ hidden: ['post_win'] }));
    const window = { document: {}, localStorage };
    runInNewContext(code, { window });
    const rows = [{ id: 'post_win', tag: 'ПОБЕДА' }, { id: 'post_share', tag: 'ДЕЛИМСЯ' }, { id: 'post_need', tag: 'РЯДОМ' }];
    assert.equal(JSON.stringify(window.SOMA_SIGNALS.visiblePosts(rows)), JSON.stringify([rows[1], rows[2]]));
});
