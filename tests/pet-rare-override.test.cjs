// Verifies that the profile-level cat_coat / dog_breed override produces the
// 0.1% rare companion variants (index 7) — extracted from the shipped room.js.
const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync(__dirname + '/../room.js', 'utf8');

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
function extractConst(name) {
    const m = src.match(new RegExp('const ' + name + '\\s*=\\s*'));
    assert.ok(m, name + ' const found');
    const start = m.index + m[0].length;
    const first = src[start].trim();
    let end;
    if (first === '[') {
        let depth = 0;
        for (let i = start; i < src.length; i++) {
            if (src[i] === '[') depth++;
            else if (src[i] === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
        }
    } else if (first === '{') {
        let depth = 0;
        for (let i = start; i < src.length; i++) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
        }
    } else {
        const semi = src.indexOf(';', start);
        end = semi + 1;
    }
    return src.slice(m.index, end);
}

const code = [
    extractConst('CAT_COATS'),
    extractConst('CAT_EARS'),
    extractConst('RARE_MOON_CAT_INDEX'),
    extractConst('RARE_MOON_CAT_COAT'),
    extractFn('hashStr'),
    extractFn('catSpec'),
    extractConst('DOG_BREEDS'),
    extractConst('RARE_MALTESE_INDEX'),
    extractConst('RARE_MALTESE_BREED'),
    extractFn('dogSpec'),
    extractFn('activeCatSpec'),
    extractFn('activeDogSpec')
].join('\n');

// Stubs for globals referenced by activeCatSpec/activeDogSpec
const roomAnim = { inspectCatCoat: null, inspectDogBreed: null };
const player = { uid: 'u_505b95ec6dd804db', name: 'test' };
const isPtsMode = () => false;
let activeCosmetics = {};
const getActiveCosmetics = () => activeCosmetics;

const sandbox = new Function('roomAnim', 'player', 'isPtsMode', 'getActiveCosmetics',
    code + '\nreturn { catSpec, dogSpec, activeCatSpec, activeDogSpec };')(roomAnim, player, isPtsMode, getActiveCosmetics);

// 1. Explicit override 7 => rare for both
{
    const cat = sandbox.catSpec(undefined, 7);
    assert.strictEqual(cat.rare, true, 'cat override 7 => rare');
    assert.strictEqual(cat.coatIdx, 7, 'cat coatIdx = 7');
    assert.ok(cat.summary.includes('0.1%'), 'cat summary shows 0.1%');
    const dog = sandbox.dogSpec(undefined, 7);
    assert.strictEqual(dog.rare, true, 'dog override 7 => rare');
    assert.strictEqual(dog.breedIdx, 7, 'dog breedIdx = 7');
    assert.ok(dog.summary.includes('0.1%'), 'dog summary shows 0.1%');
}

// 2. No override + non-rare uid => not rare (baseline behaviour preserved)
{
    const cat = sandbox.catSpec(undefined, null);
    assert.strictEqual(cat.rare, false, 'cat without override not rare for this uid');
    const dog = sandbox.dogSpec(undefined, null);
    assert.strictEqual(dog.rare, false, 'dog without override not rare for this uid');
}

// 3. activeCatSpec / activeDogSpec honor profile override (cat_coat / dog_breed)
{
    activeCosmetics = { cat_coat: 7, dog_breed: 7 };
    const cat = sandbox.activeCatSpec();
    assert.strictEqual(cat.rare, true, 'activeCatSpec honors cat_coat=7');
    const dog = sandbox.activeDogSpec();
    assert.strictEqual(dog.rare, true, 'activeDogSpec honors dog_breed=7');
}

// 4. activeCatSpec without profile override stays non-rare
{
    activeCosmetics = { cat: true, dog: true };
    const cat = sandbox.activeCatSpec();
    assert.strictEqual(cat.rare, false, 'activeCatSpec without cat_coat not rare');
    const dog = sandbox.activeDogSpec();
    assert.strictEqual(dog.rare, false, 'activeDogSpec without dog_breed not rare');
}

console.log('pet-rare-override: 4/4 ok');
