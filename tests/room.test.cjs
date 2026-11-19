const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { createHash } = require('node:crypto');

const roomCode = readFileSync(require.resolve('../room.js'), 'utf8');
const roomCss = readFileSync(require.resolve('../room.css'), 'utf8');
const indexHtml = readFileSync(require.resolve('../index.html'), 'utf8');

function makeStorage(initial = {}) {
    const map = new Map(Object.entries(initial).map(([k, v]) => [k, String(v)]));
    return {
        getItem: k => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => { map.set(k, String(v)); },
        removeItem: k => { map.delete(k); },
        dump: () => Object.fromEntries(map)
    };
}

function loadRoom(env = {}) {
    const localStorage = env.localStorage || makeStorage();
    return runInNewContext(
        roomCode + ';({ stationPhases, PROGRESSION_RULES, GREENHOUSE_WARMTH_STEPS, stationState, indifferenceIndex, equipStationPhase, inspectPlantStage, togglePlantGallery, inspectPlantKind, togglePtsDrawer, togglePtsDew, cyclePtsCatCoat, togglePtsDemoCassette, loadWarmthLedger, claimDailyWarmth, fireflyState, recordWhisperEcho, daysSinceLastWarmth, whisperAdmission, loadGreenhouse, plantNewGreenhouseSeed, selectGreenhouseSlot, loadCassettes, saveWhisperCassette, playCassette, pressPagerScan, pressPagerInfo, renderPager, PLANT_KINDS, PLANT_STAGES, PLANT_WARMTH_STEPS, PLANT_LEAF, PLANT_BLOOM, PLANT_POTS, CAT_COATS, catSpec, CITY_WINDOWS, hashStr, rng, plantSpec, plantStage, drawPlantSprite, drawCrtMonitor, drawRoomCosmetics, drawWindowWorld, drawWindowLightBeams, drawStationFx, drawCassetteDeck, paintPlantFrame, getFullscreenViewport, computeFullscreenSceneBox, toggleRoomFullscreen, enterRoomFullscreen, exitRoomFullscreen, flipRoomFullscreen, renderRoom, touchRoomObject, activateRoomObject, resetStationPreview, roomAnim });',
        { player: { uid: 'u_0123456789abcdef', name: 'AGENT_1001', warmth: 0 }, roomPreview: false, localStorage, ...env }
    );
}

test('seasonal atmospheres unlock at [0, 20, 108, 240], auto-switch on unlock, and allow choosing any unlocked phase', () => {
    const { stationState, equipStationPhase } = loadRoom();
    for (const [warmth, index, next] of [
        [0, 0, 20], [19, 0, 20],
        [20, 1, 108], [107, 1, 108],
        [108, 2, 240], [239, 2, 240],
        [240, 3, undefined], [360, 3, undefined]
    ]) {
        const state = stationState(warmth);
        assert.equal(state.unlocked, index);
        assert.equal(state.active, index);
        assert.equal(state.next?.at, next);
    }

    // Auto-catharsis when crossing into Dawn (seenMax = 2 -> unlocked = 3), even if Rain (0) was equipped before
    const freshDawn = stationState(240, 0, 2);
    assert.equal(freshDawn.justUnlocked, true);
    assert.equal(freshDawn.active, 3);

    // Once Dawn was already seen (seenMax = 3), player can freely switch back to Rain (0) or Hearth (2) at max level
    const chosenRain = stationState(360, 0, 3);
    assert.equal(chosenRain.justUnlocked, false);
    assert.equal(chosenRain.active, 0);
    assert.equal(stationState(360, 2, 3).active, 2);

    // Invalid or locked choices safely fall back to highest unlocked
    assert.equal(stationState(20, 3, 1).active, 1);
    assert.equal(stationState(108, -1, 2).active, 2);
    assert.equal(stationState(108, NaN, 2).active, 2);
    assert.doesNotThrow(() => equipStationPhase(1));
});

test('90-day anti-grind caps daily warmth at 4/day, decouples cold XP, keeps pot empty until Whisper, and unlocks Greenhouse + Cassettes', () => {
    const ls = makeStorage();
    const room = loadRoom({ localStorage: ls });
    const {
        PROGRESSION_RULES, PLANT_WARMTH_STEPS, claimDailyWarmth, daysSinceLastWarmth,
        whisperAdmission, plantStage, indifferenceIndex, recordWhisperEcho,
        loadGreenhouse, saveWhisperCassette, loadCassettes, plantNewGreenhouseSeed, selectGreenhouseSlot, plantSpec
    } = room;

    assert.equal(PROGRESSION_RULES.DAILY_WARMTH_CAP, 4);
    assert.equal(PROGRESSION_RULES.SEASON_WARMTH, 360);
    assert.equal(PROGRESSION_RULES.SEASON_WARMTH / PROGRESSION_RULES.DAILY_WARMTH_CAP, 90, 'full bloom takes 90 warm days');

    // Mindless spam on Day 1: 20 holds + 10 trainer picks yields at most 4 warmth (2 hold + 2 trainer)
    let day1Warmth = 0;
    for (let i = 0; i < 20; i++) day1Warmth += claimDailyWarmth('hold', '2026-11-18').granted;
    for (let i = 0; i < 10; i++) day1Warmth += claimDailyWarmth('trainer', '2026-11-18').granted;
    assert.equal(day1Warmth, 4, 'cannot grind more than 4 warmth per day');

    // 3 days of max play = 12 warmth: cannot even unlock phase 1 (20), let alone max level (360)
    let total = day1Warmth;
    for (const d of ['2026-11-19', '2026-11-20']) {
        total += claimDailyWarmth('hold', d).granted + claimDailyWarmth('hold', d).granted;
        total += claimDailyWarmth('trainer', d).granted + claimDailyWarmth('trainer', d).granted;
    }
    assert.equal(total, 12);
    assert.equal(whisperAdmission(total).admitted, false);

    // Skipping a full week never resets warmth or warmDays; only triggers gentle dry-soil indicator
    const afterPause = room.loadWarmthLedger('2026-11-28');
    assert.equal(afterPause.warmDays, 3);
    assert.equal(daysSinceLastWarmth(afterPause, '2026-11-28'), 8);
    assert.ok(daysSinceLastWarmth(afterPause, '2026-11-28') >= PROGRESSION_RULES.DRY_SOIL_DAYS);

    // Pot stays strictly empty (-1) even with huge warmth or max rank until Whisper sprouts it
    assert.equal(plantStage(0, { sprouted: false }), -1);
    assert.equal(plantStage(360, { sprouted: false }), -1);
    assert.equal(plantStage(19, { sprouted: true }), -1);

    // Once Whisper sprouts it, follows seasonal steps [20, 52, 108, 180, 240, 360]
    PLANT_WARMTH_STEPS.forEach((at, idx) => {
        assert.equal(plantStage(at, { sprouted: true }), idx);
    });
    // Live Whisper gate holds final bloom at stage 4 (5/6 buds) until 5 real "стало теплее" echoes
    assert.equal(plantStage(360, { sprouted: true, requireAcks: true, bloomAcks: 4 }), 4);
    assert.equal(plantStage(360, { sprouted: true, requireAcks: true, bloomAcks: 5 }), 5);

    // Echo grants 24h dew; Indifference Index melts from 100% to 0% across the season
    const echoed = recordWhisperEcho(1000000);
    assert.equal(echoed.whisperAcks, 1);
    assert.ok(echoed.dewUntil > 1000000);
    assert.equal(indifferenceIndex(0), 100);
    assert.equal(indifferenceIndex(180), 50);
    assert.equal(indifferenceIndex(360), 0);

    // Cassettes store incoming anonymous Whispers cleanly
    saveWhisperCassette('Я дочитал твой пост до конца. Ты не один.', '18.11');
    assert.equal(loadCassettes().length, 1);

    // Greenhouse unlocks a new mystery seed from the remaining 6 species after native blooms
    const own = plantSpec();
    ls.setItem('soma_greenhouse', JSON.stringify({ bloomed: [own.kind], activeSeed: null, placed: own.kind }));
    const seed = plantNewGreenhouseSeed(360, own);
    assert.ok(seed && seed.kind !== own.kind);
    assert.equal(loadGreenhouse().placed, 'seed');
    selectGreenhouseSlot(own.kind);
    assert.equal(loadGreenhouse().placed, own.kind, 'player can place native bloomed plant back anytime');
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

test('empty pot (-1) and all 7 species across all 6 stages grow visibly and cactus never sways side to side', () => {
    const { plantSpec, drawPlantSprite } = loadRoom();

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
        const emptyPot = tracePlant(spec, -1, 0);
        const stages = [0, 1, 2, 3, 4, 5].map(s => tracePlant(spec, s, 0));
        assert.ok(emptyPot.height > 40 && emptyPot.height < stages[0].height, `${spec.kindName} empty pot must sit cleanly below stage 1 sprout`);
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

test('release UI hides spoilers, pager replaces NEEO_PHONE, window picks unlocked phases, and PTS inspects stages 0..6 & 7 species', () => {
    assert.ok(!roomCss.includes('station-hit-pulse'), 'harsh radial tap flash must be removed');
    assert.ok(!roomCss.includes('station-plant-touch'), 'rigid whole-plant wobble animation must be removed');
    assert.ok(!indexHtml.includes('NEEO_PHONE'), 'duplicate NEEO_PHONE panel must be removed');
    assert.ok(indexHtml.includes('id="soma-pager"') && indexHtml.includes('SOMA // PGR-04'), 'retro Whisper pager must replace phone');
    assert.ok(indexHtml.includes('id="station-window-bar"'), 'diegetic window atmosphere bar must exist');
    assert.ok(indexHtml.includes('id="station-deck-bar"'), 'diegetic cassette deck archive bar must exist');
    assert.ok(indexHtml.includes('id="station-greenhouse"'), 'greenhouse herbarium section must exist');

    const sceneMatch = indexHtml.match(/<div id="station-scene" class="station-scene">([\s\S]*?)<\/div>\s*<div class="station-log">/);
    assert.ok(sceneMatch);
    // Strip the fullscreen-only HUD (display:none outside .is-fullscreen) to verify default room scene has zero overlaid text
    const defaultScene = sceneMatch[1].replace(/<div class="station-fs-hud"[\s\S]*$/, '');
    assert.equal(defaultScene.replace(/<[^>]+>/g, '').trim(), '', 'default scene must contain zero overlaid text');
    assert.ok(!indexHtml.includes('station-crt-beam') && !roomCss.includes('station-crt-beam'), 'cheap moving CRT scan bar must be completely removed');

    const stageBtns = [...indexHtml.matchAll(/data-stage-btn="(-?\d)"/g)].map(m => Number(m[1]));
    assert.deepEqual(stageBtns, [-1, 0, 1, 2, 3, 4, 5], 'PTS inspector must expose empty pot (-1) + all 6 stages (0..5)');
    const kindBtns = [...indexHtml.matchAll(/data-kind-btn="(\d)"/g)].map(m => Number(m[1]));
    assert.deepEqual(kindBtns, [0, 1, 2, 3, 4, 5, 6], 'PTS inspector must allow inspecting all 7 plant species');
    assert.ok(indexHtml.includes('id="station-lamp"') && indexHtml.includes('assets/lamp.png'), 'lamp must be a dedicated cutout layer');
    assert.ok(!roomCode.includes('getLampSprite'), 'must not slice background image at runtime');
    assert.ok(roomCss.includes('.station[data-phase="3"] .station-sky') && /data-phase="3"\]\s*\.station-sky\s*\{\s*opacity:\s*0/.test(roomCss), 'constellation must fade out in dawn light');

    // Trainer expanded to 60 nuanced scenarios in scenarios.js, and bottom #view-profile safety button removed
    const p = require('path'), vm = require('vm'), fs = require('fs');
    const scenPath = p.join(__dirname, '..', 'scenarios.js');
    const scenCtx = {};
    vm.runInNewContext(fs.readFileSync(scenPath, 'utf8') + ';globalThis.OUT = SCEN;', scenCtx);
    assert.ok(Array.isArray(scenCtx.OUT) && scenCtx.OUT.length >= 60, 'trainer must have >=60 nuanced scenarios');
    const seenPrompts = new Set();
    for (const sc of scenCtx.OUT) {
        assert.ok(sc.t.length >= 25 && !seenPrompts.has(sc.t), 'every scenario prompt must be unique and meaningful');
        seenPrompts.add(sc.t);
        assert.equal(sc.o.length, 3, 'each scenario has 3 choices');
        assert.equal(sc.o.filter(o => o[1] === 1).length, 1, 'each scenario has exactly 1 empathetic choice');
    }
    const profileMatch = indexHtml.match(/<div id="view-profile"[\s\S]*?<script src="config\.js">/);
    assert.ok(profileMatch && !profileMatch[0].includes('openSafety('), 'bottom safety button in room view must be removed while sticky top banner stays');
    assert.ok(indexHtml.includes('onclick="openSafety()"'), 'top sticky crisis help button must stay intact');

    // Cosmetic catalog + serverless Telegram Stars Edge Function 1:1 parity + anti-contact epitaph filter
    const cosmCode = fs.readFileSync(p.join(__dirname, '..', 'cosmetics.js'), 'utf8');
    const edgeCode = fs.readFileSync(p.join(__dirname, '..', 'billing', 'supabase', 'functions', 'soma-stars', 'index.ts'), 'utf8');
    const cosmLs = makeStorage();
    const cosmEnv = { localStorage: cosmLs, player: { uid: 'u_01', warmth: 7, xp: 100 } };
    vm.runInNewContext(cosmCode + ';globalThis.API = { SOMA_CATALOG, sanitizeEpitaph, grantOwnedItem, getActiveCosmetics };', cosmEnv);
    assert.ok(cosmEnv.API.SOMA_CATALOG.length >= 24, 'rich cosmetic catalog across Top and Room');
    for (const item of cosmEnv.API.SOMA_CATALOG) {
        const re = new RegExp(`\\b${item.id}\\s*:\\s*\\{[^}]*stars:\\s*${item.stars}\\b`);
        assert.ok(re.test(edgeCode), `Edge Function price must match catalog item ${item.id}`);
        cosmEnv.API.grantOwnedItem(item.id);
    }
    assert.equal(cosmEnv.player.warmth, 7, 'cosmetics must NEVER alter player warmth or plant growth');
    assert.equal(cosmEnv.API.sanitizeEpitaph('Тишина громче чужих сирен.').ok, true);
    assert.equal(cosmEnv.API.sanitizeEpitaph('пиши @mytag').ok, false, 'epitaph must block @handles');
    assert.equal(cosmEnv.API.sanitizeEpitaph('https://t.me/foo').ok, false, 'epitaph must block URLs');
    assert.equal(cosmEnv.API.sanitizeEpitaph('+7 999 123 45 67').ok, false, 'epitaph must block phone numbers');

    let trainerCalls = 0, radioCalls = 0, fakeNow = 1000;
    const makeClassList = (initHidden = false) => {
        const set = new Set(initHidden ? ['hidden'] : []);
        return {
            remove: c => set.delete(c),
            add: c => set.add(c),
            toggle: (c, force) => (force === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : (force ? set.add(c) : set.delete(c))),
            contains: c => set.has(c)
        };
    };
    const entryEl = { textContent: '', offsetWidth: 0, classList: makeClassList() };
    const infoEl = { textContent: '' };
    const subEl = { textContent: '' };
    const ptsWrapEl = { classList: makeClassList(true) };
    const pagerEl = { dataset: {}, offsetWidth: 0, classList: makeClassList() };
    const pagerMsgEl = { textContent: '' };
    const pagerGateEl = { textContent: '' };
    const winBtns = [0, 1, 2, 3].map(i => ({
        dataset: { winPhase: String(i) }, hidden: false, disabled: false, pressed: 'false',
        classList: makeClassList(),
        setAttribute(k, v) { if (k === 'aria-pressed') this.pressed = v; }
    }));
    const winBarEl = { classList: makeClassList(true), querySelectorAll: () => winBtns };
    const starEl = { dataset: { star: '1' }, style: { opacity: 1 } };
    const domStageBtns = [-1, 0, 1, 2, 3, 4, 5].map(s => ({
        dataset: { stageBtn: String(s) }, title: '', pressed: 'false',
        classList: makeClassList(),
        setAttribute(k, v) { if (k === 'aria-pressed') this.pressed = v; }
    }));
    const domKindBtns = [0, 1, 2, 3, 4, 5, 6].map(() => ({
        textContent: '', pressed: 'false',
        classList: makeClassList(),
        setAttribute(k, v) { if (k === 'aria-pressed') this.pressed = v; }
    }));
    const roomEl = {
        dataset: {},
        querySelector() { return { setAttribute() {} }; },
        querySelectorAll(sel) {
            if (sel === '[data-stage-btn]') return domStageBtns;
            if (sel === '[data-kind-btn]') return domKindBtns;
            if (sel.includes('station-sky')) return [starEl];
            return [];
        }
    };
    const domMap = {
        'station': roomEl, 'station-entry': entryEl, 'station-plant-info': infoEl,
        'station-plant-sub': subEl, 'pts-panel': ptsWrapEl, 'station-window-bar': winBarEl,
        'soma-pager': pagerEl, 'pager-msg': pagerMsgEl, 'pager-gate': pagerGateEl
    };

    const ls = makeStorage();
    const {
        activateRoomObject, inspectPlantStage, togglePlantGallery, inspectPlantKind,
        pressPagerScan, pressPagerInfo, equipStationPhase, renderRoom, roomAnim, PLANT_KINDS, CITY_WINDOWS
    } = loadRoom({
        localStorage: ls,
        player: { uid: 'u_0123456789abcdef', name: 'AGENT_1001', warmth: 20 },
        performance: { now: () => (fakeNow += 4000) },
        openTrainer: () => { trainerCalls++; },
        openRadio: () => { radioCalls++; },
        document: { hidden: false, getElementById: id => domMap[id] || null }
    });

    assert.ok(CITY_WINDOWS.length >= 50, 'city skyscraper windows must be animated');
    renderRoom();
    const ownKind = roomAnim.ownSpec.kind;
    assert.equal(ptsWrapEl.classList.contains('hidden'), true, 'PTS panel must stay hidden in release mode');
    assert.equal(roomAnim.liveStage, -1, 'pot starts empty until Whisper awakens it');
    assert.ok(infoEl.textContent.includes('ПУСТОЙ ГОРШОК'));
    assert.equal(starEl.style.opacity, 1);

    // Tapping window at warmth 20 reveals ONLY unlocked phases (0 Дождь, 1 Оттепель) and hides future spoilers (2, 3)
    activateRoomObject('window');
    assert.equal(winBarEl.classList.contains('hidden'), false);
    assert.deepEqual(winBtns.map(b => b.hidden), [false, false, true, true]);
    equipStationPhase(0, true);
    assert.equal(roomAnim.activePhase, 0, 'player can switch back to Rain via window');

    // Offline retro pager cycles diagnostics silently without alerts
    assert.equal(pagerEl.dataset.state, 'offline');
    pressPagerScan();
    assert.ok(pagerMsgEl.textContent.includes('ПОИСК НЕСУЩЕЙ'));
    pressPagerInfo();
    assert.ok(pagerMsgEl.textContent.includes('ОДНОСТОРОННИЙ'));

    // Hidden species on stages 1/6 & 2/6, revealed at 3/6 for a sprouted player
    ls.setItem('soma_warmth_ledger', JSON.stringify({ day: '2026-11-18', whispersSent: 1, trainedTotal: 5 }));
    renderRoom();
    assert.equal(roomAnim.liveStage, 0);
    assert.ok(infoEl.textContent.startsWith('НЕИЗВЕСТНЫЙ РОСТОК'), 'species must stay a mystery at stage 1/6');

    // PTS inspection covers empty pot (-1) + all 6 stages (0..5) + all 7 species without altering ID binding
    for (let s = -1; s < 6; s++) {
        inspectPlantStage(s);
        assert.equal(roomAnim.stage, s);
        assert.equal(roomEl.dataset.stage, String(s));
        assert.equal(domStageBtns[s + 1].pressed, 'true');
    }
    togglePlantGallery();
    assert.equal(roomAnim.galleryOpen, true);
    for (let k = 0; k < 7; k++) {
        inspectPlantKind(k);
        assert.equal(roomAnim.spec.kind, k);
        assert.equal(roomAnim.ownSpec.kind, ownKind);
        assert.ok(infoEl.textContent.startsWith(PLANT_KINDS[k]));
    }
    togglePlantGallery();
    assert.equal(roomAnim.spec.kind, ownKind, 'closing gallery restores own ID-bound plant');

    // Verify stars hide when dawn light pours through window (phase 3 at 240+ warmth), and return if player switches to Rain!
    const dawnLs = makeStorage();
    const dawnPlayer = { uid: 'u_0123456789abcdef', name: 'AGENT_1001', warmth: 360 };
    const dawnRoom = loadRoom({
        localStorage: dawnLs,
        player: dawnPlayer,
        document: { hidden: false, getElementById: id => domMap[id] || null }
    });
    dawnRoom.renderRoom();
    assert.equal(dawnRoom.roomAnim.activePhase, 3);
    assert.equal(starEl.style.opacity, 0, 'stars must hide at max dawn phase');
    dawnRoom.equipStationPhase(0, true);
    assert.equal(dawnRoom.roomAnim.activePhase, 0, 'max player can choose Rain atmosphere');
    assert.equal(starEl.style.opacity, 1, 'stars return when max player switches to night Rain');

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

test('v7: unique 7-coat cat, Fireflies of Silence retention, live CRT + all 8 room attributes, landscape fullscreen, and 1/day Pain Feed', () => {
    const p = require('path'), fs = require('fs');
    const sqlCode = fs.readFileSync(p.join(__dirname, '..', 'billing', 'setup_stars.sql'), 'utf8');
    const cosmCode = fs.readFileSync(p.join(__dirname, '..', 'cosmetics.js'), 'utf8');
    assert.ok(sqlCode.includes('room_garland') && sqlCode.includes('room_candles'), 'SQL trigger must guard new garland and candles attributes');
    assert.ok(cosmCode.includes('room_garland') && cosmCode.includes('room_candles'), 'catalog must include garland and candles');

    // 1. Unique deterministic per-player cat (7 coats, independent of plant species)
    const ls = makeStorage();
    let vw = 390, vh = 844, trainerOpened = 0;
    const clsSet = new Set();
    const roomNode = {
        dataset: {},
        classList: {
            add: c => clsSet.add(c),
            remove: (...cs) => cs.forEach(c => clsSet.delete(c)),
            toggle: (c, f) => (f === undefined ? (clsSet.has(c) ? clsSet.delete(c) : clsSet.add(c)) : (f ? clsSet.add(c) : clsSet.delete(c))),
            contains: c => clsSet.has(c)
        },
        querySelector: () => null,
        querySelectorAll: () => []
    };
    const r = loadRoom({
        localStorage: ls,
        window: { innerWidth: 390, innerHeight: 844, addEventListener: () => {} },
        document: { hidden: false, addEventListener: () => {}, getElementById: id => (id === 'station' ? roomNode : null) },
        openTrainer: () => { trainerOpened++; },
        getActiveCosmetics: () => ({ cat: true, steam: true, tape: true, garland: true, candles: true, pot: 'pot_kintsugi' })
    });
    Object.defineProperty(r, '_vw', { value: () => vw });

    const seenCoats = new Set();
    const seenPairs = new Set();
    for (let i = 0; i < 120; i++) {
        const uid = 'u_' + createHash('sha256').update('witness_' + i).digest('hex').slice(0, 16);
        const c1 = r.catSpec(uid);
        const c2 = r.catSpec(uid);
        assert.equal(c1.coatIdx, c2.coatIdx, 'cat coat must be 100% deterministic per uid');
        assert.equal(c1.summary, c2.summary);
        seenCoats.add(c1.coatIdx);
        seenPairs.add(`${r.plantSpec(uid).kind}:${c1.coatIdx}`);
    }
    assert.equal(seenCoats.size, 7, 'all 7 unique cat coats must appear across player IDs');
    assert.ok(seenPairs.size >= 25, 'cat coat and plant species must distribute independently');

    // 2. Fireflies of Silence: builds 1..7 over consecutive warm evenings, cools gently (-1 per extra missed day), never harshly wipes!
    for (let d = 1; d <= 8; d++) {
        const day = `2026-11-${String(d).padStart(2, '0')}`;
        const res = r.claimDailyWarmth('hold', day);
        assert.equal(res.granted, 1);
        const ff = r.fireflyState(res.ledger, day);
        assert.equal(ff.active, true);
        assert.equal(ff.drowsy, false);
        assert.equal(ff.count, Math.min(7, d), `day ${d} must light ${Math.min(7, d)}/7 fireflies`);
        // Second warmth on same day does not double-increment streak
        const same = r.claimDailyWarmth('trainer', day);
        assert.equal(r.fireflyState(same.ledger, day).count, Math.min(7, d));
    }
    // Next day before warming: all 7 fireflies wait as drowsy embers (0 lost!)
    const nextDay = r.fireflyState(r.loadWarmthLedger('2026-11-09'), '2026-11-09');
    assert.deepEqual({ count: nextDay.count, active: nextDay.active, drowsy: nextDay.drowsy }, { count: 7, active: false, drowsy: true });
    // Skip 2 full days (Nov 9 & Nov 10 -> check Nov 11): gently cools by 2 (7 -> 5), NOT wiped to 0!
    const afterPause = r.fireflyState(r.loadWarmthLedger('2026-11-11'), '2026-11-11');
    assert.deepEqual({ count: afterPause.count, active: afterPause.active, drowsy: afterPause.drowsy }, { count: 5, active: false, drowsy: true });
    // Warming on Nov 11 re-ignites from 5 -> 6 immediately!
    const reignite = r.claimDailyWarmth('hold', '2026-11-11');
    assert.deepEqual({ count: r.fireflyState(reignite.ledger, '2026-11-11').count, active: true }, { count: 6, active: true });

    // 3. Fullscreen horizontal mode: rotates 90deg on portrait phones, auto-exits cleanly before opening Terminal modal
    r.toggleRoomFullscreen();
    assert.equal(clsSet.has('is-fullscreen'), true);
    assert.equal(clsSet.has('is-rotated'), true, 'portrait phone must rotate room into horizontal landscape');
    r.activateRoomObject('terminal');
    assert.equal(clsSet.has('is-fullscreen'), false, 'opening terminal must exit fullscreen cleanly first');
    assert.equal(trainerOpened, 1);

    // 4. Pain Feed 1-signal-per-day quota + meaningful text + anti-self-dox rules exist in index.html
    assert.ok(indexHtml.includes("POST_DAY_KEY = 'soma_post_day'") && indexHtml.includes('hasSentPainToday'), '1 post/day gate must be enforced');
    assert.ok(indexHtml.includes('validatePainPost') && indexHtml.includes('formatUntilNextSignal'), 'post validator and countdown must be wired');
});

test('v8: body-portal FLIP fullscreen + 180 flip + rotated pointer mapping, Dawn sunrise & viaduct, Pain Feed CTA, and equalized flagship cosmetics', () => {
    const p = require('path'), fs = require('fs'), vm = require('vm');
    const cosmCode = fs.readFileSync(p.join(__dirname, '..', 'cosmetics.js'), 'utf8');
    const cosmCss = fs.readFileSync(p.join(__dirname, '..', 'cosmetics.css'), 'utf8');
    const edgeCode = fs.readFileSync(p.join(__dirname, '..', 'billing', 'supabase', 'functions', 'soma-stars', 'index.ts'), 'utf8');

    // 1. Body-portal FLIP fullscreen fits every mobile & desktop viewport with zero clipping and restores cleanly to exact DOM slot
    const makeCls = () => {
        const s = new Set();
        return {
            add: (...cs) => cs.forEach(c => s.add(c)),
            remove: (...cs) => cs.forEach(c => s.delete(c)),
            toggle: (c, f) => (f === undefined ? (s.has(c) ? s.delete(c) : s.add(c)) : (f ? s.add(c) : s.delete(c))),
            contains: c => s.has(c)
        };
    };
    const makeContainer = name => {
        const node = {
            name, children: [], style: {}, dataset: {}, classList: makeCls(),
            appendChild(ch) {
                if (ch.parentNode) ch.parentNode.removeChild(ch);
                ch.parentNode = node; node.children.push(ch); return ch;
            },
            insertBefore(ch, ref) {
                if (ch.parentNode) ch.parentNode.removeChild(ch);
                ch.parentNode = node;
                const idx = node.children.indexOf(ref);
                if (idx >= 0) node.children.splice(idx, 0, ch); else node.children.push(ch);
                return ch;
            },
            removeChild(ch) {
                const idx = node.children.indexOf(ch);
                if (idx >= 0) node.children.splice(idx, 1);
                ch.parentNode = null;
            },
            setAttribute(k, v) { node[k] = v; },
            querySelector: () => null,
            querySelectorAll: () => []
        };
        return node;
    };

    const docEl = makeContainer('html');
    const bodyEl = makeContainer('body');
    const profileEl = makeContainer('view-profile');
    const beforeSibling = makeContainer('tryon-bar');
    const roomEl = makeContainer('station');
    const sceneEl = makeContainer('station-scene');
    const afterSibling = makeContainer('soma-pager');
    const metaTheme = { content: '#0b0708', setAttribute(k, v) { this[k] = v; } };
    profileEl.appendChild(beforeSibling);
    profileEl.appendChild(roomEl);
    profileEl.appendChild(afterSibling);

    let cardRect = { left: 14, top: 158, width: 362, height: 226.4 };
    roomEl.getBoundingClientRect = () => ({ left: 14, top: 158, width: 362, height: 520 });
    sceneEl.getBoundingClientRect = () => cardRect;

    const rafQueue = [];
    const timers = [];
    const vv = { width: 390, height: 718, offsetLeft: 0, offsetTop: 0, addEventListener: () => {} };
    const domById = {
        'station': roomEl,
        'station-scene': sceneEl,
        'soma-theme-color': metaTheme,
        get 'station-fs-placeholder'() { return profileEl.children.find(c => c.id === 'station-fs-placeholder') || null; }
    };
    let fakeNow = 2000;
    const r = loadRoom({
        window: { innerWidth: 390, innerHeight: 844, visualViewport: vv, matchMedia: () => ({ matches: false }), addEventListener: () => {} },
        document: {
            hidden: false, documentElement: docEl, body: bodyEl,
            createElement: tag => {
                const el = makeContainer(tag);
                el.getBoundingClientRect = () => ({ left: 14, top: 158, width: 362, height: 520 });
                return el;
            },
            getElementById: id => domById[id] || null,
            addEventListener: () => {}
        },
        performance: { now: () => (fakeNow += 500) },
        requestAnimationFrame: fn => { rafQueue.push(fn); return rafQueue.length; },
        setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
        clearTimeout: () => {},
        getActiveCosmetics: () => ({ cat: true, steam: true, tape: true, garland: true, candles: true, pot: 'pot_kintsugi' })
    });

    // Check zero-clipping scene fit across iPhone Chrome (390x718), iPhone full (390x844), iPhone SE (375x667), iPad (768x1024), Desktop (1440x900)
    for (const [w, h, expectRot] of [[390, 718, true], [390, 844, true], [375, 667, true], [768, 1024, true], [844, 390, false], [1440, 900, false]]) {
        const box = r.computeFullscreenSceneBox({ left: 0, top: 0, width: w, height: h });
        assert.equal(box.rotated, expectRot);
        const visW = box.rotated ? box.sceneH : box.sceneW;
        const visH = box.rotated ? box.sceneW : box.sceneH;
        assert.ok(visW <= w + 0.05 && visH <= h + 0.05, `scene (${visW.toFixed(1)}x${visH.toFixed(1)}) must fit inside ${w}x${h} with zero clipping`);
        assert.ok(Math.abs(visW - w) < 1 || Math.abs(visH - h) < 1, `scene must fill full long or short axis on ${w}x${h}`);
    }

    // Enter fullscreen on portrait iOS Chrome: portaled to body, UI hidden, starts from card FLIP transform, then animates to 90deg landscape
    r.enterRoomFullscreen();
    assert.equal(roomEl.parentNode, bodyEl, '#station must portal directly into document.body to cover all app chrome');
    assert.equal(profileEl.children[1].id, 'station-fs-placeholder', 'placeholder must hold exact slot inside #view-profile');
    assert.equal(docEl.classList.contains('is-soma-fs'), true, 'app UI must fade out in fullscreen');
    assert.equal(metaTheme.content, '#040102');
    assert.ok(sceneEl.style.transform.includes('rotate(0deg) scale('), 'initial FLIP frame must start from unrotated card scale');
    while (rafQueue.length) rafQueue.shift()();
    assert.equal(roomEl.classList.contains('is-fs-animating'), true);
    assert.equal(roomEl.classList.contains('is-fs-active'), true);
    assert.equal(roomEl.classList.contains('is-rotated'), true);
    assert.equal(sceneEl.style.transform, 'translate(-50%, -50%) rotate(90deg) scale(1)');

    // Pointer un-rotation in +90deg and -90deg (180° flip button) hits the exact window ripple coordinate!
    // In +90deg portrait: rotated bounding box has width = sceneH, height = sceneW; center of window (fxX=396.5, fxY=180) maps to nx = 1 - 180/496, ny = 396.5/793
    cardRect = { left: 0, top: 0, width: 390, height: 623.5 };
    r.roomAnim.ripples.length = 0;
    r.touchRoomObject('window', { clientX: (1 - 180 / 496) * 390, clientY: (410 / 793) * 623.5 });
    assert.equal(r.roomAnim.ripples.length, 1);
    assert.ok(Math.abs(r.roomAnim.ripples[0].x - 410) < 1 && Math.abs(r.roomAnim.ripples[0].y - 180) < 1, '+90deg touch must map to exact FX coordinate');

    r.flipRoomFullscreen();
    assert.equal(roomEl.classList.contains('is-flipped'), true);
    assert.equal(sceneEl.style.transform, 'translate(-50%, -50%) rotate(-90deg) scale(1)');
    r.roomAnim.ripples.length = 0;
    r.touchRoomObject('window', { clientX: (180 / 496) * 390, clientY: (1 - 410 / 793) * 623.5 });
    assert.ok(Math.abs(r.roomAnim.ripples[0].x - 410) < 1 && Math.abs(r.roomAnim.ripples[0].y - 180) < 1, '-90deg flipped touch must map to exact FX coordinate');

    // Animated reverse FLIP exit flies back to card rect, then restores #station between beforeSibling and afterSibling
    r.exitRoomFullscreen();
    assert.equal(roomEl.classList.contains('is-fs-closing'), true);
    assert.ok(sceneEl.style.transform.includes('rotate(0deg) scale('), 'closing FLIP must smoothly un-rotate back to card');
    timers.pop().fn();
    assert.equal(roomEl.parentNode, profileEl, '#station must return cleanly to #view-profile after exit');
    assert.deepEqual(profileEl.children.map(c => c.name), ['tryon-bar', 'station', 'soma-pager'], 'exact sibling order preserved');
    assert.equal(roomEl.classList.contains('is-fullscreen'), false);
    assert.equal(docEl.classList.contains('is-soma-fs'), false);
    assert.equal(metaTheme.content, '#0b0708');
    assert.equal(sceneEl.style.transform, '');

    // 2. Dawn (phase 3) sunrise, crisp viaduct, sunbeams, and all 3 animated artisan pots render cleanly with zero errors
    const dummyGrad = { addColorStop() {} };
    let dawnClips = 0, dawnArcs = 0;
    const g = {
        canvas: { width: 793, height: 496 },
        fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', globalCompositeOperation: 'source-over',
        save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, clearRect() {},
        beginPath() {}, closePath() {}, clip() { dawnClips++; }, fill() {}, stroke() {},
        fillRect() {}, rect() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {},
        arc() { dawnArcs++; }, ellipse() {},
        createLinearGradient: () => dummyGrad, createRadialGradient: () => dummyGrad
    };
    r.drawWindowWorld(g, 4200, 3, 0.2);
    r.drawRoomCosmetics(g, 4200, 3);
    r.drawWindowLightBeams(g, 4200, 3, 0.2);
    assert.ok(dawnClips >= 3 && dawnArcs >= 20, 'Dawn renders clipped sky sunrise, sun disc, viaduct arches, and room sunbeams');
    for (const potSkin of ['pot_cinnabar', 'pot_moon', 'pot_kintsugi']) {
        assert.doesNotThrow(() => r.drawPlantSprite(g, r.plantSpec('u_pot'), 5, { phase: 3, now: 2500, potSkin, fireflies: 5 }));
    }

    // 3. Pain Feed CTA visibility hooks present and cache-busted to v8
    assert.ok(indexHtml.includes('soma-post-cta') && indexHtml.includes('soma-post-beacon') && indexHtml.includes('soma-post-arrow'));
    assert.ok(indexHtml.includes('id="station-fs-flip"') && indexHtml.includes('room.js?v=8') && indexHtml.includes('cosmetics.css?v=8'));

    // 4. Flagship cosmetics: equalized peer pricing within every category + 1:1 Edge Function parity + every frame/seal/title/pager styled in CSS
    const cEnv = { localStorage: makeStorage(), player: { uid: 'u_01', warmth: 12, xp: 500 }, esc: s => String(s) };
    vm.runInNewContext(cosmCode + ';globalThis.C = { SOMA_CATALOG, SOMA_SEALS_SVG, SOMA_SEAL_CLASS, sealHtmlOf, titleSpanOf };', cEnv);
    const cat = cEnv.C.SOMA_CATALOG;
    const pricesOf = slot => [...new Set(cat.filter(i => i.slot === slot).map(i => i.stars))];
    assert.deepEqual(pricesOf('frame'), [150], 'all 6 flagship frames must share equal 150 Stars tier');
    assert.equal(cat.filter(i => i.slot === 'frame').length, 6, '6 bespoke animated frames including frame_pulse');
    assert.deepEqual(pricesOf('seal'), [100], 'all 5 animated seals must share equal 100 Stars tier');
    assert.deepEqual(pricesOf('title'), [110], 'all 5 animated titles must share equal 110 Stars tier');
    assert.deepEqual(pricesOf('pager'), [140], 'all 4 animated pager skins must share equal 140 Stars tier');
    assert.deepEqual(pricesOf('pot'), [160], 'all 3 artisan pots must share equal 160 Stars tier');
    const ambStars = [...new Set(cat.filter(i => ['steam', 'tape', 'garland', 'candles'].includes(i.slot)).map(i => i.stars))];
    assert.deepEqual(ambStars, [140], 'all 4 room ambience items must share equal 140 Stars tier');

    // Exact bidirectional 1:1 count and price parity with billing/supabase/functions/soma-stars/index.ts
    const edgeEntries = [...edgeCode.matchAll(/^\s*(\w+)\s*:\s*\{\s*title:[^}]*stars:\s*(\d+)\s*\}/gm)];
    assert.equal(edgeEntries.length, cat.length, 'Edge Function must have exact same item count as SOMA_CATALOG');
    for (const [_, id, stars] of edgeEntries) {
        const found = cat.find(i => i.id === id);
        assert.ok(found, `Edge item ${id} must exist in SOMA_CATALOG`);
        assert.equal(found.stars, Number(stars), `Edge price for ${id} must match SOMA_CATALOG`);
    }
    // Every frame, seal, title, and pager has dedicated CSS animation rules in cosmetics.css
    for (const it of cat) {
        if (it.slot === 'frame') assert.ok(cosmCss.includes(`.${it.css}`), `CSS must style frame ${it.css}`);
        if (it.slot === 'seal') {
            assert.ok(cosmCss.includes(`.${cEnv.C.SOMA_SEAL_CLASS[it.id]}`), `CSS must animate seal ${it.id}`);
            assert.ok(cEnv.C.sealHtmlOf(it.id).includes(cEnv.C.SOMA_SEAL_CLASS[it.id]));
        }
        if (it.slot === 'title') {
            assert.ok(cosmCss.includes(`.${it.titleCss}`), `CSS must animate title ${it.titleCss}`);
            assert.ok(cEnv.C.titleSpanOf(it.id, true).includes(it.titleCss));
        }
        if (it.slot === 'pager') assert.ok(cosmCss.includes(`data-skin="${it.id}"`), `CSS must style pager ${it.id}`);
    }
});
