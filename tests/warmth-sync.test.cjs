// Tests for syncWitnessWarmthToLocal in index.html (extracted & executed
// against stubs so the exact shipped code is verified).
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const start = html.indexOf('function syncWitnessWarmthToLocal');
assert.ok(start >= 0, 'syncWitnessWarmthToLocal found in index.html');

function findMatchingBrace(s, openIdx) {
    let depth = 0;
    for (let i = openIdx; i < s.length; i++) {
        if (s[i] === '{') depth++;
        else if (s[i] === '}') { depth--; if (depth === 0) return i; }
    }
    throw new Error('unbalanced braces');
}
const openIdx = html.indexOf('{', start);
const end = findMatchingBrace(html, openIdx);
const funcSrc = html.slice(start, end + 1);

function makeEnv(lsWarmth, seen) {
    const store = {};
    if (lsWarmth !== undefined) store['soma_warmth'] = String(lsWarmth);
    if (seen !== undefined) store['soma_server_warmth_seen'] = String(seen);
    const player = { warmth: lsWarmth === undefined ? 0 : Number(lsWarmth) };
    const localStorage = {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
    };
    const fed = [];
    const feedActiveRoomPlant = (delta) => { fed.push(delta); };
    const updateHeader = () => { store.headerUpdated = (store.headerUpdated || 0) + 1; };
    const sync = new Function('player', 'localStorage', 'feedActiveRoomPlant', 'updateHeader',
        funcSrc + '\nreturn syncWitnessWarmthToLocal;')(player, localStorage, feedActiveRoomPlant, updateHeader);
    return { player, store, fed, sync };
}

// 1. Fresh device: baseline from cloud, delta only when cloud is higher.
{
    const env = makeEnv(10, undefined);
    const ok = env.sync(36);
    assert.strictEqual(env.player.warmth, 36, 'fresh device takes cloud baseline');
    assert.strictEqual(env.store['soma_server_warmth_seen'], '36', 'seen set to remote');
    assert.ok(ok, 'fresh device returns changed');
}

// 2. Server-side correction: cloud dropped below local seen baseline.
//    Local inflated value must snap down to the cloud value (the fix).
{
    const env = makeEnv(756, 756); // inflated local + seen
    const ok = env.sync(216);
    assert.strictEqual(env.player.warmth, 216, 'cloud-win snaps inflated local to cloud');
    assert.strictEqual(env.store['soma_server_warmth_seen'], '216', 'seen synced down');
    assert.ok(ok, 'returns true on snap-down');
}

// 3. Normal server-side increase: warmth becomes max(current, remote).
{
    const env = makeEnv(36, 36);
    const ok = env.sync(50);
    assert.strictEqual(env.player.warmth, 50, 'increase raises to remote');
    assert.strictEqual(env.store['soma_server_warmth_seen'], '50', 'seen updated');
    assert.deepStrictEqual(env.fed, [50 - 36], 'plant fed the real delta only');
}

// 4. No-op when nothing changed.
{
    const env = makeEnv(36, 36);
    const ok = env.sync(36);
    assert.strictEqual(ok, false, 'no-op returns false');
    assert.strictEqual(env.player.warmth, 36, 'warmth unchanged');
}

// 5. Local below baseline is raised to baseline (existing behaviour kept).
{
    const env = makeEnv(10, 36);
    const ok = env.sync(36); // remote == seen
    assert.strictEqual(env.player.warmth, 36, 'local raised to seen');
    assert.ok(ok, 'returns true');
}

console.log('warmth-sync: 5/5 ok');
