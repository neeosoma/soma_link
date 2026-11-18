const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { createHash } = require('node:crypto');

const roomCode = readFileSync(require.resolve('../room.js'), 'utf8');
const roomCss = readFileSync(require.resolve('../room.css'), 'utf8');
const indexHtml = readFileSync(require.resolve('../index.html'), 'utf8');

function loadRoom(env = {}) {
    return runInNewContext(
        roomCode + ';({ stationPhases, stationState, equipStationPhase, PLANT_KINDS, PLANT_STAGES, PLANT_LEAF, PLANT_BLOOM, PLANT_POTS, hashStr, rng, plantSpec, plantStage, drawPlantSprite, renderRoom, touchRoomObject, activateRoomObject, resetStationPreview });',
        { player: { uid: 'u_0123456789abcdef', name: 'AGENT_1001', warmth: 4 }, roomPreview: false, ...env }
    );
}

test('atmospheres unlock exactly at warmth thresholds', () => {
    const { stationState } = loadRoom();
    for (const [warmth, index, next] of [[0,0,5],[4,0,5],[5,1,15],[14,1,15],[15,2,30],[29,2,30],[30,3,undefined],[50,3,undefined]]) {
        const state = stationState(warmth);
        assert.equal(state.unlocked, index);
        assert.equal(state.active, index);
        assert.equal(state.next?.at, next);
    }
});

test('a previously unlocked atmosphere can stay selected; invalid choices fall back', () => {
    const { stationState, equipStationPhase } = loadRoom();
    assert.equal(stationState(30, 0).active, 0);
    assert.equal(stationState(5, 3).active, 1);
    assert.equal(stationState(15, -1).active, 2);
    assert.equal(stationState(15, NaN).active, 2);
    assert.doesNotThrow(() => equipStationPhase(1));
});

test('unique plant binding matches legacy anonymous ID formula identically', () => {
    const { plantSpec, PLANT_KINDS, PLANT_LEAF, PLANT_BLOOM, PLANT_POTS } = loadRoom();
    const LEGACY_KINDS = ['ПАПОРОТНИК', 'КАКТУС', 'СУККУЛЕНТ', 'БАМБУК', 'ЛИАНА', 'ЦВЕТОК', 'БОНСАЙ'];
    function legacySpec(uid, name) {
        const s = String(uid || name || 'x');
        let n = 2166136261;
        for (let i = 0; i < s.length; i++) { n ^= s.charCodeAt(i); n = Math.imul(n, 16777619); }
        let a = n >>> 0;
        const r = () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        return {
            kind: Math.floor(r() * 7),
            leafIdx: Math.floor(r() * 6),
            bloomIdx: Math.floor(r() * 6),
            potIdx: Math.floor(r() * 5),
            seed: Math.floor(r() * 1e9),
            lean: r() * 2 - 1,
            potShape: Math.floor(r() * 3)
        };
    }

    assert.deepEqual(Array.from(PLANT_KINDS), LEGACY_KINDS);
    const seenKinds = new Set();
    for (let i = 0; i < 300; i++) {
        const hex = createHash('sha256').update('soma:' + (100000 + i)).digest('hex').slice(0, 16);
        const uid = 'u_' + hex;
        const expected = legacySpec(uid);
        const actual = plantSpec(uid);
        seenKinds.add(actual.kind);
        assert.equal(actual.kind, expected.kind);
        assert.equal(actual.kindName, LEGACY_KINDS[expected.kind]);
        assert.equal(actual.leafIdx, expected.leafIdx);
        assert.equal(actual.bloomIdx, expected.bloomIdx);
        assert.equal(actual.potIdx, expected.potIdx);
        assert.equal(actual.seed, expected.seed);
        assert.equal(actual.lean, expected.lean);
        assert.equal(actual.potShape, expected.potShape);
    }
    assert.equal(seenKinds.size, 7, 'all 7 legacy species must be reachable');

    // Fallbacks when uid is empty match legacy player.uid || player.name || 'x'
    const fallbackRoom = loadRoom({ player: { uid: '', name: 'AGENT_4821', warmth: 0 } });
    assert.equal(fallbackRoom.plantSpec().seed, legacySpec('', 'AGENT_4821').seed);
    const emptyRoom = loadRoom({ player: { uid: '', name: '', warmth: 0 } });
    assert.equal(emptyRoom.plantSpec().seed, legacySpec('', '').seed);

    // Every plant palette stays strictly in the black-and-red palette (R >= B and R > G)
    for (const group of [PLANT_LEAF, PLANT_BLOOM, PLANT_POTS]) {
        for (const swatch of group) {
            for (const hex of swatch) {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                assert.ok(r > g && r >= b, `color ${hex} must remain in black-and-red palette`);
            }
        }
    }
});

test('every plant species visibly grows across room warmth and rank stages', () => {
    const { plantSpec, plantStage, drawPlantSprite } = loadRoom();
    assert.equal(plantStage(0, 0), 0);
    assert.equal(plantStage(2, 0), 1);
    assert.equal(plantStage(5, 0), 2);
    assert.equal(plantStage(15, 0), 3);
    assert.equal(plantStage(22, 0), 4);
    assert.equal(plantStage(30, 0), 5);
    assert.equal(plantStage(0, 4), 4);
    assert.equal(plantStage(0, 5), 5);

    function measureHeight(spec, stage) {
        let minY = 96, pixels = 0;
        const ctx = {
            canvas: { width: 96, height: 96 },
            fillStyle: '#000',
            clearRect() {},
            fillRect(x, y, w, h) {
                if (String(this.fillStyle).startsWith('rgba(')) return;
                if (y < minY) minY = y;
                pixels += w * h;
            }
        };
        drawPlantSprite(ctx, spec, stage, { sway: 0, glow: 0 });
        return { height: 89 - minY, pixels };
    }

    for (let kind = 0; kind < 7; kind++) {
        let spec = null;
        for (let n = 0; n < 400; n++) {
            const candidate = plantSpec('u_growth_' + n);
            if (candidate.kind === kind) { spec = candidate; break; }
        }
        assert.ok(spec);
        const stages = [0, 1, 2, 3, 4, 5].map(s => measureHeight(spec, s));
        for (let s = 1; s < 6; s++) {
            assert.ok(stages[s].height > stages[s - 1].height, `${spec.kindName} stage ${s + 1} must be taller than stage ${s}`);
        }
        assert.ok(stages[5].height - stages[0].height >= 30, `${spec.kindName} must grow dramatically from stage 1 to stage 6`);
        assert.ok(stages[5].pixels > stages[0].pixels * 1.8, `${spec.kindName} crown mass must expand noticeably`);
    }
});

test('point-and-click scene has no overlaid text buttons, preserves bottom panel, and activates terminal and radio', () => {
    const sceneMatch = indexHtml.match(/<div id="station-scene" class="station-scene">([\s\S]*?)<\/div>\s*<div class="station-log">/);
    assert.ok(sceneMatch, 'station-scene and bottom station-log must exist');
    const sceneHtml = sceneMatch[1];
    assert.ok(!sceneHtml.includes('station-point'), 'legacy floating text buttons must be removed');
    const visibleText = sceneHtml.replace(/<[^>]+>/g, '').trim();
    assert.equal(visibleText, '', 'scene must contain zero visible text overlays');

    const buttons = [...sceneHtml.matchAll(/<button\b[^>]*data-obj="(\w+)"[^>]*aria-label="([^"]+)"[^>]*>/g)];
    const objs = buttons.map(m => m[1]);
    assert.ok(objs.includes('terminal') && objs.includes('radio') && objs.includes('plant') && objs.includes('window'));
    buttons.forEach(m => assert.ok(m[2].length > 5, `${m[1]} hotspot must have descriptive aria-label`));

    // Verify bottom panels remain intact
    assert.ok(indexHtml.includes('class="station-log"'));
    assert.ok(indexHtml.includes('NEEO_PHONE'));
    assert.ok(indexHtml.includes('station-rain') && indexHtml.includes('station-crt-beam'));

    // Verify clicking terminal calls openTrainer, radio calls openRadio, and objects record touch feedback
    let trainerCalls = 0, radioCalls = 0;
    const entryEl = { textContent: '', offsetWidth: 0, classList: { remove() {}, add() {} } };
    const hitEls = {};
    for (const o of objs) hitEls[o] = { offsetWidth: 0, classList: { hit: false, remove() { this.hit = false; }, add(c) { if (c === 'is-hit') this.hit = true; } }, setAttribute() {} };
    const roomEl = {
        dataset: {},
        querySelector(sel) { const m = sel.match(/data-obj="(\w+)"/); return m ? hitEls[m[1]] : null; },
        querySelectorAll() { return []; }
    };
    const { activateRoomObject } = loadRoom({
        openTrainer: () => { trainerCalls++; },
        openRadio: () => { radioCalls++; },
        document: {
            hidden: false,
            getElementById(id) {
                if (id === 'station') return roomEl;
                if (id === 'station-entry') return entryEl;
                return null;
            }
        }
    });

    activateRoomObject('terminal');
    assert.equal(trainerCalls, 1);
    assert.equal(roomEl.dataset.touch, 'terminal');
    assert.equal(hitEls.terminal.classList.hit, true);

    activateRoomObject('radio');
    assert.equal(radioCalls, 1);
    assert.equal(roomEl.dataset.touch, 'radio');
    assert.equal(hitEls.radio.classList.hit, true);

    activateRoomObject('plant');
    assert.equal(roomEl.dataset.touch, 'plant');
    assert.ok(entryEl.textContent.length > 15);
});

test('mobile hotspots meet >=44px touch target sizes and never overlap down to 320px width', () => {
    const blocks = [...roomCss.matchAll(/\.station-hit--(\w+)\s*\{([^}]+)\}/g)];
    assert.ok(blocks.length >= 7);
    const num = (body, prop) => Number(body.match(new RegExp(prop + ':\\s*([\\d.]+)%'))[1]) / 100;
    const defs = blocks.map(([, name, body]) => ({
        name,
        left: num(body, 'left'),
        top: num(body, 'top'),
        width: num(body, 'width'),
        height: num(body, 'height')
    }));

    for (const viewportWidth of [320, 360, 375, 390, 414]) {
        const sceneW = viewportWidth - 30; // p-3.5 (28px) + 2px border
        const sceneH = sceneW * (992 / 1586);
        const boxes = defs.map(d => ({
            name: d.name,
            x1: d.left * sceneW,
            y1: d.top * sceneH,
            x2: (d.left + d.width) * sceneW,
            y2: (d.top + d.height) * sceneH,
            w: d.width * sceneW,
            h: d.height * sceneH
        }));
        for (const key of ['terminal', 'radio', 'plant', 'window']) {
            const b = boxes.find(x => x.name === key);
            assert.ok(b.w >= 44 && b.h >= 44, `${key} at ${viewportWidth}px must be >=44x44px, got ${b.w.toFixed(1)}x${b.h.toFixed(1)}`);
        }
        for (let i = 0; i < boxes.length; i++) {
            for (let j = i + 1; j < boxes.length; j++) {
                const a = boxes[i], b = boxes[j];
                const overlap = a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
                assert.equal(overlap, false, `${a.name} and ${b.name} must not overlap at ${viewportWidth}px`);
            }
        }
    }
});
