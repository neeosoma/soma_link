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

test('all four author intents fit existing DB and Whisper tag limits and round-trip', () => {
    for (const intent of api.INTENTS) {
        const tag = api.packTag(intent.id, 'д'.repeat(50));
        assert.ok(tag.length <= 32);
        const parsed = api.unpackTag(tag);
        assert.equal(parsed.intent.id, intent.id);
        assert.equal(parsed.topic, 'Д'.repeat(24));
        assert.equal(parsed.legacy, false);
        assert.ok(api.tagLabel(tag).startsWith(intent.title));
    }
    assert.throws(() => api.packTag('unknown', 'topic'));
    assert.equal(api.packTag('W', '<script>@победа</script>'), 'S1:W|SCRIPTПОБЕДАSCRIPT');
});

test('legacy tags remain themes, not invented author consent or advice requests', () => {
    for (const tag of ['РАБОТА', 'ЛИЧНАЯ БОЛЬ', '', 'S1:X|РАБОТА', '<img onerror=alert(1)>']) {
        const parsed = api.unpackTag(tag);
        assert.equal(parsed.intent, null);
        assert.equal(parsed.legacy, true);
        assert.equal(parsed.topic, tag);
    }
    assert.equal(api.tagLabel('РАБОТА'), 'РАБОТА');
    assert.equal(api.unpackTag('S1:V|РАБОТА').intent.title, 'Хочу взгляд со стороны');
});

test('light and intent filters compose, preserve original rows and exclude legacy in light mode', () => {
    const posts = api.INTENTS.map(i => ({ id: i.id, tag: api.packTag(i.id, '') }));
    posts.push({ id: 'old', tag: 'РАБОТА' });
    assert.deepEqual(api.filterPosts(posts, { light: false, hidden: [] }), posts);
    assert.deepEqual(api.filterPosts(posts, { light: true, hidden: [] }).map(x => x.id), ['W', 'S']);
    assert.deepEqual(api.filterPosts(posts, { light: true, hidden: ['W'] }).map(x => x.id), ['S']);
    assert.equal(api.filterPosts(posts, { light: true, hidden: [] }, 'N').length, 0);
    assert.deepEqual(api.filterPosts(posts, { light: false, hidden: [] }, 'V').map(x => x.id), ['V']);
    assert.equal(posts.length, 5);
});

test('local boundaries recover corrupted storage, deduplicate and cap hidden IDs', () => {
    for (const raw of ['{broken', 'null', '[]', '"text"']) {
        assert.deepEqual(api.readPrefs(storage(raw)), { light: false, hidden: [] });
    }
    const s = storage();
    api.writePrefs(s, { light: true, hidden: ['a', 'a', 'b'] });
    assert.deepEqual(api.readPrefs(s), { light: true, hidden: ['a', 'b'] });
    api.writePrefs(s, { light: false, hidden: Array.from({ length: 550 }, (_, i) => String(i)) });
    assert.equal(api.readPrefs(s).hidden.length, 500);
    assert.throws(() => api.writePrefs({ setItem() { throw Error('blocked'); } }, { light: true, hidden: [] }));
});

test('pager candidate integration respects light mode and locally hidden posts', () => {
    const localStorage = storage(JSON.stringify({ light: true, hidden: ['post_win'] }));
    const window = { document: {}, localStorage };
    runInNewContext(code, { window });
    const rows = [{ id: 'post_win', tag: api.packTag('W', '') }, { id: 'post_share', tag: api.packTag('S', '') }, { id: 'post_need', tag: api.packTag('N', '') }];
    assert.equal(JSON.stringify(window.SOMA_SIGNALS.visiblePosts(rows)), JSON.stringify([rows[1]]));
});
