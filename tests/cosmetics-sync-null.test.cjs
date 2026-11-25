// Verifies that syncCosmeticsCloud never pushes a null cat_coat/dog_breed,
// so a client sync with an empty local override cannot wipe the server-side
// rare-variant value (cat_coat/dog_breed = 7).
const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync(__dirname + '/../cosmetics.js', 'utf8');

function extractFn(name) {
    const start = src.indexOf('function ' + name + '(');
    assert.ok(start >= 0, name + ' found');
    const open = src.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
    }
    throw new Error('unbalanced ' + name);
}

const code = extractFn('syncCosmeticsCloud');

let capturedPayload = null;
function makeChain() {
    const obj = {
        update: (payload) => { capturedPayload = payload; return makeChain(); },
        eq: () => makeChain(),
        then: (a) => Promise.resolve(a && a())
    };
    return obj;
}
const supabaseClient = { from: () => makeChain() };
const player = { uid: 'u_505b95ec6dd804db' };
const isPtsMode = () => false;

function runSync(equipped) {
    const shopState = { equipped, owned: [], preview: null, tab: 'frames' };
    capturedPayload = null;
    new Function('supabaseClient', 'player', 'shopState', 'isPtsMode',
        code + '\nreturn syncCosmeticsCloud;')(supabaseClient, player, shopState, isPtsMode)();
    return capturedPayload;
}

// 1. Null local cat_coat/dog_breed must NOT be written (server value preserved)
{
    const payload = runSync({ frame: 'frame_neon', cat: true, dog: true, cat_coat: null, dog_breed: null });
    assert.ok(payload && payload.cosmetics, 'payload has cosmetics');
    assert.strictEqual('cat_coat' in payload.cosmetics, false, 'null cat_coat omitted');
    assert.strictEqual('dog_breed' in payload.cosmetics, false, 'null dog_breed omitted');
    // other fields preserved
    assert.strictEqual(payload.cosmetics.frame, 'frame_neon');
    assert.strictEqual(payload.cosmetics.cat, true);
}

// 2. Non-null override must still be pushed (user-set coat syncs)
{
    const payload = runSync({ frame: 'frame_neon', cat: true, dog: true, cat_coat: 7, dog_breed: 7 });
    assert.strictEqual(payload.cosmetics.cat_coat, 7, 'cat_coat=7 pushed');
    assert.strictEqual(payload.cosmetics.dog_breed, 7, 'dog_breed=7 pushed');
}

// 3. Missing keys (undefined) also must NOT be written
{
    const payload = runSync({ frame: 'frame_neon', cat: true, dog: true });
    assert.strictEqual('cat_coat' in payload.cosmetics, false, 'absent cat_coat omitted');
    assert.strictEqual('dog_breed' in payload.cosmetics, false, 'absent dog_breed omitted');
}

// 4. shopState.equipped must NOT be mutated (shallow copy)
{
    const equipped = { frame: 'frame_neon', cat_coat: null, dog_breed: null };
    const payload = runSync(equipped);
    assert.strictEqual('cat_coat' in equipped, true, 'original equipped keeps cat_coat key');
    assert.strictEqual('dog_breed' in equipped, true, 'original equipped keeps dog_breed key');
    assert.strictEqual('cat_coat' in payload.cosmetics, false, 'payload still omits null');
}

console.log('cosmetics-sync-null: 4/4 ok');
