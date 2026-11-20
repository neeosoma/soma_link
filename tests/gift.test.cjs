const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { webcrypto } = require('node:crypto');
const { validateText, encode, decode, createLink, saveGift } = require('../gift.js');
const ID = 'abcd'.repeat(8);
const TEXT = 'Спасибо, что ты есть. Рядом с тобой мне спокойнее. 🌙';
function storage(initial = {}) {
    const data = new Map(Object.entries(initial));
    return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), data };
}

test('cassette link round-trips Unicode, uses a fragment, and strips query/auth context', () => {
    const url = new URL(createLink(TEXT, 'https://example.test/soma_link/index.html?uid=private#room', webcrypto));
    assert.equal(url.pathname, '/soma_link/gift.html');
    assert.equal(url.search, '');
    assert.ok(!url.href.includes('private'));
    const gift = decode(url.hash.slice(3));
    assert.equal(gift.text, TEXT);
    assert.match(gift.id, /^[a-f0-9]{32}$/);
    const second = decode(new URL(createLink(TEXT, url, webcrypto)).hash.slice(3));
    assert.notEqual(gift.id, second.id);
});

test('text limits and contact filter apply to both creation and received payloads', () => {
    for (const text of ['', 'я'.repeat(12), 'я'.repeat(334), 'позвони +12345678901', 'напиши @someone пожалуйста', 'https://example.com']) {
        assert.throws(() => validateText(text));
        assert.throws(() => decode(encode({ v: 1, id: ID, text })));
    }
    assert.equal(validateText('я'.repeat(333)).length, 333);
    assert.equal(decode(encode({ v: 1, id: ID, text: 'я'.repeat(13) })).text.length, 13);
});

test('malformed, oversized, unknown-version and unexpected-type links are rejected', () => {
    for (const token of ['', 'a', '@@@', 'x'.repeat(2401), encode(null), encode({ v: 2, id: ID, text: TEXT }), encode({ v: 1, id: 'bad', text: TEXT }), encode({ v: 1, id: ID, text: {} })]) {
        assert.throws(() => decode(token));
    }
    assert.throws(() => createLink(TEXT, 'file:///tmp/gift.html', webcrypto));
    assert.throws(() => createLink(TEXT, 'https://example.test', {}));
});

test('save uses the existing archive schema, deduplicates, and does not write rewards', () => {
    const s = storage({ soma_cassettes: JSON.stringify([{ id: 'cas_old', num: 7, text: 'existing' }]), soma_warmth: '20', soma_xp: '99' });
    const date = new Date(2026, 10, 18, 12);
    assert.equal(saveGift(s, { id: ID, text: TEXT }, date).duplicate, false);
    assert.equal(saveGift(s, { id: ID, text: TEXT }, date).duplicate, true);
    const list = JSON.parse(s.getItem('soma_cassettes'));
    assert.equal(list.length, 2);
    assert.deepEqual(list[0], { id: 'cas_gift_' + ID, num: 8, date: '18.11.2026', ts: date.getTime(), text: TEXT, fav: false });
    assert.equal(list[1].id, 'cas_old');
    assert.equal(s.getItem('soma_warmth'), '20');
    assert.equal(s.getItem('soma_xp'), '99');
    assert.throws(() => saveGift(s, { id: ID, text: TEXT + ' другой текст' }));
});

test('storage errors, corruption and full archive do not silently delete old records', () => {
    for (const raw of ['{broken', '{}', JSON.stringify(Array.from({ length: 120 }, (_, i) => ({ id: 'cas_' + i, num: i + 1, text: TEXT })))]) {
        const s = storage({ soma_cassettes: raw });
        assert.throws(() => saveGift(s, { id: ID, text: TEXT }));
        assert.equal(s.getItem('soma_cassettes'), raw);
    }
    assert.throws(() => saveGift({ getItem: () => '[]', setItem: () => { throw Error('Quota exceeded'); } }, { id: ID, text: TEXT }));
});

test('standalone reader has no external dependencies, collector, or dynamic HTML rendering', () => {
    const html = readFileSync(require.resolve('../gift.html'), 'utf8');
    const js = readFileSync(require.resolve('../gift.js'), 'utf8');
    assert.ok(html.includes('connect-src \'none\''));
    assert.ok(html.includes('name="referrer" content="no-referrer"'));
    assert.ok(html.includes('не зашифрован'));
    assert.ok(html.includes('Авторство отправителя не подтверждается'));
    assert.ok(!/<script[^>]+src="https?:/.test(html));
    assert.ok(!js.includes('innerHTML') && !js.includes('fetch(') && !js.includes('supabase'));
    assert.ok(js.includes("el('gift-message').textContent = incoming.text"));
});
