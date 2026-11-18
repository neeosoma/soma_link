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
        roomCode + ';({ stationPhases, stationState, equipStationPhase, inspectPlantStage, PLANT_KINDS, PLANT_STAGES, PLANT_WARMTH_STEPS, PLANT_LEAF, PLANT_BLOOM, PLANT_POTS, CITY_WINDOWS, hashStr, rng, plantSpec, plantStage, drawPlantSprite, drawStationFx, paintPlantFrame, renderRoom, touchRoomObject, activateRoomObject, resetStationPreview, roomAnim });',
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
    assert.equal(PLANT_LEAF.length, 6);
    assert.equal(PLANT_BLOOM.length, 6);
    assert.equal(PLANT_POTS.length, 5);

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

    const fallbackRoom = loadRoom({ player: { uid: '', name: 'AGENT_4821', warmth: 0 } });
    assert.equal(fallbackRoom.plantSpec().seed, legacySpec('', 'AGENT_4821').seed);
    const emptyRoom = loadRoom({ player: { uid: '', name: '', warmth: 0 } });
    assert.equal(emptyRoom.plantSpec().seed, legacySpec('', '').seed);
});

test('all 7 species grow visibly across all 6 stages and cactus never sways side to side', () => {
    const { plantSpec, plantStage, drawPlantSprite } = loadRoom();
    assert.equal(plantStage(0, 0), 0);
    assert.equal(plantStage(2, 0), 1);
    assert.equal(plantStage(5, 0), 2);
    assert.equal(plantStage(15, 0), 3);
    assert.equal(plantStage(22, 0), 4);
    assert.equal(plantStage(30, 0), 5);
    assert.equal(plantStage(0, 4), 4);
    assert.equal(plantStage(0, 5), 5);

    function tracePlant(spec, stage, sway) {
        let m = [1, 0, 0, 1, 0, 0];
        const stack = [];
        let minY = 380, ops = 0;
        const log = [];
        const record = (x, y) => {
            const wx = m[0] * x + m[2] * y + m[4];
            const wy = m[1] * x + m[3] * y + m[5];
            if (wy < minY) minY = wy;
            ops++;
            log.push(wx.toFixed(2) + ',' + wy.toFixed(2));
        };
        const dummyGrad = { addColorStop() {} };
        const ctx = {
            canvas: { width: 360, height: 380 },
            fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', imageSmoothingEnabled: true,
            clearRect() {},
            save() { stack.push(m.slice()); },
            restore() { if (stack.length) m = stack.pop(); },
            translate(x, y) { m = [m[0], m[1], m[2], m[3], m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]]; },
            scale(sx, sy) { m = [m[0]*sx, m[1]*sx, m[2]*sy, m[3]*sy, m[4], m[5]]; },
            rotate(a) {
                const c = Math.cos(a), s = Math.sin(a);
                m = [m[0]*c + m[2]*s, m[1]*c + m[3]*s, m[0]*-s + m[2]*c, m[1]*-s + m[3]*c, m[4], m[5]];
            },
            createLinearGradient() { return dummyGrad; },
            createRadialGradient() { return dummyGrad; },
            beginPath() {}, closePath() {}, clip() {}, fill() {}, stroke() {},
            fillRect() {}, rect(x, y) { record(x, y); },
            moveTo(x, y) { record(x, y); },
            lineTo(x, y) { record(x, y); },
            quadraticCurveTo(cx, cy, x, y) { record(cx, cy); record(x, y); },
            bezierCurveTo(c1x, c1y, c2x, c2y, x, y) { record(c2x, c2y); record(x, y); },
            arc(x, y, r) { if (r < 45) record(x, y - r); },
            ellipse(x, y, rx, ry) { record(x, y - ry); }
        };
        drawPlantSprite(ctx, spec, stage, { sway, glow: 0, phase: 2 });
        return { height: 348 - minY, ops, sig: log.join('|') };
    }

    for (let kind = 0; kind < 7; kind++) {
        let spec = null;
        for (let n = 0; n < 500; n++) {
            const c = plantSpec('u_growth_' + n);
            if (c.kind === kind) { spec = c; break; }
        }
        assert.ok(spec);
        const stages = [0, 1, 2, 3, 4, 5].map(s => tracePlant(spec, s, 0));
        for (let s = 1; s < 6; s++) {
            assert.ok(stages[s].height > stages[s - 1].height, `${spec.kindName} stage ${s + 1} must be taller than stage ${s}`);
        }
        assert.ok(stages[5].height - stages[0].height >= 130, `${spec.kindName} must grow dramatically across 6 stages`);
        assert.ok(stages[5].ops > stages[0].ops * 1.5, `${spec.kindName} detail must enrich across 6 stages`);

        // Cactus must stay 100% motionless in its pot regardless of sway input
        if (kind === 1) {
            for (let s = 0; s < 6; s++) {
                const a = tracePlant(spec, s, -4);
                const b = tracePlant(spec, s, 4);
                assert.equal(a.sig, b.sig, `cactus stage ${s + 1} must not sway side to side`);
            }
        }
    }
});

test('all 6 plant stages are inspectable and scene uses smooth object animations without tap flashes', () => {
    assert.ok(!roomCss.includes('station-hit-pulse'), 'harsh radial tap flash must be removed');
    assert.ok(!roomCss.includes('station-plant-touch'), 'rigid whole-plant wobble animation must be removed');

    const sceneMatch = indexHtml.match(/<div id="station-scene" class="station-scene">([\s\S]*?)<\/div>\s*<div class="station-log">/);
    assert.ok(sceneMatch);
    assert.equal(sceneMatch[1].replace(/<[^>]+>/g, '').trim(), '', 'scene must contain zero overlaid text');

    const stageBtns = [...indexHtml.matchAll(/data-stage-btn="(\d)"/g)].map(m => Number(m[1]));
    assert.deepEqual(stageBtns, [0, 1, 2, 3, 4, 5], 'bottom panel must expose all 6 growth stage buttons');

    let trainerCalls = 0, radioCalls = 0, fakeNow = 1000;
    const entryEl = { textContent: '', offsetWidth: 0, classList: { remove() {}, add() {} } };
    const infoEl = { textContent: '' };
    const subEl = { textContent: '' };
    const domStageBtns = [0, 1, 2, 3, 4, 5].map(() => ({
        title: '', pressed: 'false',
        classList: { toggle() {} },
        setAttribute(k, v) { if (k === 'aria-pressed') this.pressed = v; }
    }));
    const roomEl = {
        dataset: {},
        querySelector() { return { setAttribute() {} }; },
        querySelectorAll(sel) { return sel === '[data-stage-btn]' ? domStageBtns : []; }
    };
    const { activateRoomObject, inspectPlantStage, renderRoom, roomAnim, CITY_WINDOWS } = loadRoom({
        performance: { now: () => (fakeNow += 4000) },
        openTrainer: () => { trainerCalls++; },
        openRadio: () => { radioCalls++; },
        document: {
            hidden: false,
            getElementById(id) {
                if (id === 'station') return roomEl;
                if (id === 'station-entry') return entryEl;
                if (id === 'station-plant-info') return infoEl;
                if (id === 'station-plant-sub') return subEl;
                return null;
            }
        }
    });

    assert.ok(CITY_WINDOWS.length >= 50, 'city skyscraper windows must be animated');
    renderRoom();
    assert.equal(roomAnim.liveStage, 1); // warmth 4 => stage 2/6

    // Inspect every single one of the 6 stages (0..5)
    for (let s = 0; s < 6; s++) {
        inspectPlantStage(s);
        assert.equal(roomAnim.stage, s);
        assert.equal(roomEl.dataset.stage, String(s));
        assert.equal(domStageBtns[s].pressed, 'true');
        assert.ok(infoEl.textContent.includes(`${s + 1}/6`));
    }

    // Smooth object timelines start cleanly on tap
    activateRoomObject('lamp');
    assert.ok(roomAnim.lampStart > 0 && roomAnim.lampAmp > 0);
    activateRoomObject('shelf');
    assert.ok(roomAnim.deckStart > 0);
    activateRoomObject('nightlight');
    assert.ok(roomAnim.nightLStart > 0);
    activateRoomObject('nightlightR');
    assert.ok(roomAnim.nightRStart > 0);
    activateRoomObject('terminal');
    assert.equal(trainerCalls, 1);
    activateRoomObject('radio');
    assert.equal(radioCalls, 1);
});

test('mobile hotspots never overlap and main targets stay >=44px down to 320px width', () => {
    const blocks = [...roomCss.matchAll(/\.station-hit--(\w+)\s*\{([^}]+)\}/g)];
    assert.equal(blocks.length, 9);
    const num = (body, prop) => Number(body.match(new RegExp(prop + ':\\s*([\\d.]+)%'))[1]) / 100;
    const defs = blocks.map(([, name, body]) => ({
        name, left: num(body, 'left'), top: num(body, 'top'), width: num(body, 'width'), height: num(body, 'height')
    }));

    for (const viewportWidth of [320, 360, 375, 390, 414]) {
        const sceneW = viewportWidth - 30;
        const sceneH = sceneW * (992 / 1586);
        const boxes = defs.map(d => ({
            name: d.name,
            x1: d.left * sceneW, y1: d.top * sceneH,
            x2: (d.left + d.width) * sceneW, y2: (d.top + d.height) * sceneH,
            w: d.width * sceneW, h: d.height * sceneH
        }));
        for (const key of ['terminal', 'radio', 'plant', 'window']) {
            const b = boxes.find(x => x.name === key);
            assert.ok(b.w >= 44 && b.h >= 44, `${key} at ${viewportWidth}px must be >=44x44px`);
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
