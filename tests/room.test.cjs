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
        roomCode + ';({ ...pagerApi, stationPhases, PROGRESSION_RULES, GREENHOUSE_WARMTH_STEPS, ALIEN_WARMTH_STEPS, ALIEN_KINDS, alienSpec, gallerySpecForKind, isGreenhouseUnlocked, plantSecretAlienSeed, feedActiveRoomPlant, openGreenhouse, drawGreenhouseVines, bindSomaSceneScroll, somaClientToLocal, somaScreenDeltaToLocal, mixHex, cyclePtsAlienKind, getWhisperBreachCount, recordWhisperSent, syncWhisperBreachCounter, RARE_MALTESE_INDEX, RARE_MALTESE_BREED, RARE_MOON_CAT_INDEX, RARE_MOON_CAT_COAT, NEEO_SKY_POLY, HEARTH_LANTERNS, COSMIC_DAWN_STARS, stationState, indifferenceIndex, equipStationPhase, inspectPlantStage, togglePlantGallery, inspectPlantKind, togglePtsDrawer, togglePtsDew, cyclePtsCatCoat, cyclePtsDogBreed, togglePtsDemoCassette, loadWarmthLedger, claimDailyWarmth, fireflyState, recordWhisperEcho, daysSinceLastWarmth, whisperAdmission, loadGreenhouse, plantNewGreenhouseSeed, selectGreenhouseSlot, formatCassetteDate, formatCassetteNum, loadCassettes, saveWhisperCassette, toggleCassetteFav, ejectCassette, playCassette, pressPagerScan, pressPagerInfo, PLANT_KINDS, PLANT_NOTES, PLANT_STAGES, PLANT_WARMTH_STEPS, PLANT_LEAF, PLANT_BLOOM, PLANT_POTS, CAT_COATS, catSpec, DOG_BREEDS, dogSpec, drawCompanionCat, drawCompanionDog, CITY_WINDOWS, hashStr, rng, plantSpec, plantStage, drawPlantSprite, drawCrtMonitor, drawRoomCosmetics, drawWindowWorld, drawWindowLightBeams, drawStationFx, drawCassetteDeck, paintPlantFrame, isRealTelegramMiniApp, getNativeFullscreenElement, requestNativeRoomFullscreen, getFullscreenViewport, computeFullscreenSceneBox, toggleRoomFullscreen, enterRoomFullscreen, exitRoomFullscreen, flipRoomFullscreen, renderRoom, touchRoomObject, activateRoomObject, resetStationPreview, roomAnim });',
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
            kind: Math.floor(r() * 8),
            leafIdx: Math.floor(r() * 6),
            bloomIdx: Math.floor(r() * 6),
            potIdx: Math.floor(r() * 5),
            seed: Math.floor(r() * 1e9),
            lean: r() * 2 - 1,
            potShape: Math.floor(r() * 3)
        };
    }

    assert.deepEqual(Array.from(PLANT_KINDS), [...LEGACY_KINDS, 'ОРХИДЕЯ']);
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
        assert.equal(actual.kindName, PLANT_KINDS[expected.kind]);
        assert.equal(actual.leafIdx, expected.leafIdx);
        assert.equal(actual.bloomIdx, expected.bloomIdx);
        assert.equal(actual.potIdx, expected.potIdx);
        assert.equal(actual.seed, expected.seed);
        assert.equal(actual.lean, expected.lean);
        assert.equal(actual.potShape, expected.potShape);
    }
    assert.equal(seenKinds.size, 8, 'all 8 species must be reachable');

    const fallbackRoom = loadRoom({ player: { uid: '', name: 'AGENT_4821', warmth: 0 } });
    assert.equal(fallbackRoom.plantSpec().seed, legacySpec('', 'AGENT_4821').seed);
    const emptyRoom = loadRoom({ player: { uid: '', name: '', warmth: 0 } });
    assert.equal(emptyRoom.plantSpec().seed, legacySpec('', '').seed);
});

test('empty pot (-1) and all 8 species (including Orchid) across all 6 stages grow visibly on 440x460 and cactus never sways', () => {
    const { plantSpec, gallerySpecForKind, drawPlantSprite } = loadRoom();

    function tracePlant(spec, stage, sway) {
        let m = [1, 0, 0, 1, 0, 0];
        const stack = [];
        let minY = 460, ops = 0;
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
            canvas: { width: 440, height: 460 },
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
        return { height: 420 - minY, ops, sig: log.join('|') };
    }

    const baseOwn = plantSpec('u_growth_0');
    for (let kind = 0; kind < 8; kind++) {
        let spec = null;
        if (kind === 7) {
            spec = gallerySpecForKind(7, baseOwn);
        } else {
            for (let n = 0; n < 500; n++) {
                const c = plantSpec('u_growth_' + n);
                if (c.kind === kind) { spec = c; break; }
            }
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

test('release UI hides spoilers, pager replaces NEEO_PHONE, window picks unlocked phases, PTS inspects stages 0..6 & 7 species, VHS deck bar removed', () => {
    assert.ok(!roomCss.includes('station-hit-pulse'), 'harsh radial tap flash must be removed');
    assert.ok(!roomCss.includes('station-plant-touch'), 'rigid whole-plant wobble animation must be removed');
    assert.ok(!indexHtml.includes('NEEO_PHONE'), 'duplicate NEEO_PHONE panel must be removed');
    assert.ok(!indexHtml.includes('id="soma-pager"'), 'retro Whisper pager removed from room — pager lives in its own tab');
    assert.ok(roomCode.includes('NEEOSOMA // NMAV-04'), 'pager modal NEEOSOMA // NMAV-04 branding preserved');
    assert.ok(indexHtml.includes('id="station-window-bar"'), 'diegetic window atmosphere bar must exist');
    assert.ok(!indexHtml.includes('id="station-deck-bar"'), 'diegetic cassette deck archive bar must be removed entirely');
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
    assert.deepEqual(kindBtns, [0, 1, 2, 3, 4, 5, 6, 7], 'PTS inspector must allow inspecting all 8 Earth plant species including Orchid');
    assert.ok(indexHtml.includes('id="station-lamp"') && indexHtml.includes('assets/lamp.png'), 'lamp must be a dedicated cutout layer');
    assert.ok(!roomCode.includes('getLampSprite'), 'must not slice background image at runtime');
    assert.ok(roomCss.includes('.station[data-phase="3"] .station-sky'), 'phase 3 tunes cosmic warm-violet sky constellation layer');

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
    const profileMatch = indexHtml.match(/<div id="view-room"[\s\S]*?<script src="config\.js">/);
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
        'station-plant-sub': subEl, 'pts-panel': ptsWrapEl, 'station-window-bar': winBarEl
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

    // Pager scan/info now open the pager modal (room retro pager removed)
    pressPagerScan();
    pressPagerInfo();

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
    assert.equal(blocks.length, 12);
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
    const afterSibling = makeContainer('witness-card');
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

    // Enter fullscreen on portrait phone: portaled to body, UI hidden, WAAPI smoothly flies card -> 90deg landscape
    const waapiCalls = [];
    sceneEl.animate = (kf, opts) => { const a = { kf, opts, cancelled: false, cancel() { this.cancelled = true; } }; waapiCalls.push({ el: 'scene', a }); return a; };
    roomEl.animate = (kf, opts) => { const a = { kf, opts, cancelled: false, cancel() { this.cancelled = true; } }; waapiCalls.push({ el: 'room', a }); return a; };
    r.enterRoomFullscreen();
    assert.equal(roomEl.parentNode, bodyEl, '#station must portal directly into document.body to cover all app chrome');
    assert.equal(profileEl.children[1].id, 'station-fs-placeholder', 'placeholder must hold exact slot inside #view-profile');
    assert.equal(docEl.classList.contains('is-soma-fs'), true, 'app UI must fade out in fullscreen');
    assert.equal(metaTheme.content, '#040102');
    assert.equal(roomEl.classList.contains('is-fs-animating'), true);
    assert.equal(roomEl.classList.contains('is-fs-active'), true);
    assert.equal(roomEl.classList.contains('is-rotated'), true);
    assert.equal(sceneEl.style.transform, 'translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(90deg) scale(1)');
    const enterSceneAnim = waapiCalls.find(c => c.el === 'scene');
    assert.ok(enterSceneAnim && enterSceneAnim.a.kf[0].transform.includes('rotate(0deg) scale('), 'WAAPI opening frame starts from unrotated card scale');
    assert.ok(enterSceneAnim.a.kf[enterSceneAnim.a.kf.length - 1].transform.includes('rotate(90deg) scale(1)'), 'WAAPI final frame lands at 90deg scale(1)');
    assert.ok(enterSceneAnim.a.opts.duration >= 600, 'smooth visible opening animation duration');

    // Pointer un-rotation in +90deg and -90deg (180° flip button) hits the exact window ripple coordinate!
    cardRect = { left: 0, top: 0, width: 390, height: 623.5 };
    r.roomAnim.ripples.length = 0;
    r.touchRoomObject('window', { clientX: (1 - 180 / 496) * 390, clientY: (410 / 793) * 623.5 });
    assert.equal(r.roomAnim.ripples.length, 1);
    assert.ok(Math.abs(r.roomAnim.ripples[0].x - 410) < 1 && Math.abs(r.roomAnim.ripples[0].y - 180) < 1, '+90deg touch must map to exact FX coordinate');

    waapiCalls.length = 0;
    r.flipRoomFullscreen();
    assert.equal(roomEl.classList.contains('is-flipped'), true);
    assert.equal(sceneEl.style.transform, 'translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-90deg) scale(1)');
    assert.ok(waapiCalls.some(c => c.el === 'scene' && c.a.kf.length === 3), '180deg flip runs smooth 3-keyframe WAAPI animation');
    r.roomAnim.ripples.length = 0;
    r.touchRoomObject('window', { clientX: (180 / 496) * 390, clientY: (1 - 410 / 793) * 623.5 });
    assert.ok(Math.abs(r.roomAnim.ripples[0].x - 410) < 1 && Math.abs(r.roomAnim.ripples[0].y - 180) < 1, '-90deg flipped touch must map to exact FX coordinate');

    // Animated reverse WAAPI exit flies back to card rect, then restores #station between beforeSibling and afterSibling
    waapiCalls.length = 0;
    r.exitRoomFullscreen();
    assert.equal(roomEl.classList.contains('is-fs-closing'), true);
    assert.ok(sceneEl.style.transform.includes('rotate(0deg) scale('), 'closing transform smoothly un-rotates back to card');
    assert.ok(waapiCalls.some(c => c.el === 'scene') && waapiCalls.some(c => c.el === 'room'), 'exit animates both scene and backdrop via WAAPI');
    timers.pop().fn();
    assert.equal(roomEl.parentNode, profileEl, '#station must return cleanly to #view-profile after exit');
    assert.deepEqual(profileEl.children.map(c => c.name), ['tryon-bar', 'station', 'witness-card'], 'exact sibling order preserved');
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
    for (const potSkin of ['pot_cinnabar', 'pot_moon', 'pot_kintsugi', 'pot_amethyst']) {
        assert.doesNotThrow(() => r.drawPlantSprite(g, r.plantSpec('u_pot'), 5, { phase: 3, now: 2500, potSkin, fireflies: 5 }));
    }

    // 3. Feed CTA visibility hooks and cache-busted assets remain present
    assert.ok(indexHtml.includes('soma-post-cta') && indexHtml.includes('soma-post-beacon') && indexHtml.includes('soma-post-arrow'));
    assert.ok(
        indexHtml.includes('id="station-fs-flip"')
        && indexHtml.includes('room.js?v=27')
        && indexHtml.includes('cosmetics.css?v=15')
        && indexHtml.includes('receiver.js?v=17')
        && indexHtml.includes('vhs.js?v=15')
        && indexHtml.includes('greenhouse.js?v=15')
        && indexHtml.includes('blimp.js?v=15')
        && indexHtml.includes('share.js?v=16')
    );

    // 4. Flagship cosmetics + collectible 7" vinyl pressings: equalized peer pricing + 1:1 Edge Function parity
    const musicCode = require('fs').readFileSync(require('path').join(__dirname, '..', 'music.js'), 'utf8');
    const cEnv = { window: {}, localStorage: makeStorage(), player: { uid: 'u_01', warmth: 12, xp: 500 }, esc: s => String(s) };
    vm.runInNewContext(musicCode, cEnv);
    vm.runInNewContext(cosmCode + ';globalThis.C = { SOMA_CATALOG, SOMA_SEALS_SVG, SOMA_SEAL_CLASS, sealHtmlOf, titleSpanOf };', cEnv);
    const cat = cEnv.C.SOMA_CATALOG;
    const collectTracks = (cEnv.window.SOMA_TRACKS || []).filter(t => t.collectible);
    const pricesOf = slot => [...new Set(cat.filter(i => i.slot === slot).map(i => i.stars))];
    assert.deepEqual(pricesOf('frame'), [150], 'all 6 flagship frames must share equal 150 Stars tier');
    assert.equal(cat.filter(i => i.slot === 'frame').length, 6, '6 bespoke animated frames including frame_pulse');
    assert.deepEqual(pricesOf('seal'), [100], 'all 5 animated seals must share equal 100 Stars tier');
    assert.deepEqual(pricesOf('title'), [110], 'all 5 animated titles must share equal 110 Stars tier');
    assert.deepEqual(pricesOf('pager'), [140], 'all 4 animated pager skins must share equal 140 Stars tier');
    assert.deepEqual(pricesOf('pot'), [160], 'all 3 artisan pots must share equal 160 Stars tier');
    const ambStars = [...new Set(cat.filter(i => ['steam', 'tape', 'garland', 'candles'].includes(i.slot)).map(i => i.stars))];
    assert.deepEqual(ambStars, [140], 'all 4 room ambience items must share equal 140 Stars tier');
    assert.deepEqual([...new Set(collectTracks.map(t => t.stars))], [50], 'all 4 collectible 7" singles share equal 50 Stars ($1) tier');

    // Exact bidirectional 1:1 count and price parity with billing/supabase/functions/soma-stars/index.ts
    const allBillable = [...cat, ...collectTracks];
    const edgeEntries = [...edgeCode.matchAll(/^\s*(\w+)\s*:\s*\{\s*title:[^}]*stars:\s*(\d+)\s*\}/gm)];
    assert.equal(edgeEntries.length, allBillable.length, 'Edge Function must match exact 30 cosmetics + 4 collectible 7" tracks');
    for (const [_, id, stars] of edgeEntries) {
        const found = allBillable.find(i => i.id === id);
        assert.ok(found, `Edge item ${id} must exist in SOMA_CATALOG or SOMA_TRACKS`);
        assert.equal(found.stars, Number(stars), `Edge price for ${id} must match client catalog`);
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

test('v9: true native browser fullscreen (even with Telegram SDK loaded), fixed-size non-jumping FS button, ribbon-free cats, and 7 living guardian dogs coexisting with cats', () => {
    const p = require('path'), fs = require('fs'), vm = require('vm');
    const sqlCode = fs.readFileSync(p.join(__dirname, '..', 'billing', 'setup_stars.sql'), 'utf8');
    const cosmCode = fs.readFileSync(p.join(__dirname, '..', 'cosmetics.js'), 'utf8');

    // 1. Browser with telegram-web-app.js loaded (initData === '') MUST invoke native el.requestFullscreen, NEVER no-op Telegram.WebApp.requestFullscreen!
    let tgFsCalls = 0, nativeFsCalls = 0, nativeExitCalls = 0, orientLocks = 0;
    let activeFsEl = null;
    const docListeners = {};
    const makeEl = name => ({
        name, parentNode: null, children: [], style: {},
        classList: (() => {
            const s = new Set();
            return { add: (...c) => c.forEach(x => s.add(x)), remove: (...c) => c.forEach(x => s.delete(x)), toggle: (c, f) => (f === undefined ? (s.has(c) ? s.delete(c) : s.add(c)) : (f ? s.add(c) : s.delete(c))), contains: c => s.has(c) };
        })(),
        setAttribute() {},
        getBoundingClientRect: () => ({ left: 100, top: 80, width: 420, height: 262.7 }),
        animate: () => ({ cancel() {}, onfinish: null })
    });
    const roomEl = makeEl('station');
    let seenNavUi = '';
    roomEl.requestFullscreen = opts => {
        seenNavUi = opts && opts.navigationUI;
        nativeFsCalls++;
        activeFsEl = roomEl;
        return Promise.resolve();
    };
    const sceneEl = makeEl('station-scene');
    const docStub = {
        hidden: false,
        get fullscreenElement() { return activeFsEl; },
        documentElement: makeEl('html'),
        body: { appendChild(n) { n.parentNode = this; } },
        createElement: () => makeEl('placeholder'),
        getElementById: id => (id === 'station' ? roomEl : id === 'station-scene' ? sceneEl : null),
        exitFullscreen: () => { nativeExitCalls++; activeFsEl = null; return Promise.resolve(); },
        addEventListener: (ev, fn) => { docListeners[ev] = fn; }
    };
    const tgStub = {
        initData: '', // Regular browser with telegram-web-app.js loaded in <head>
        isVersionAtLeast: () => true,
        requestFullscreen: () => { tgFsCalls++; },
        exitFullscreen: () => { tgFsCalls++; },
        expand: () => {}
    };
    const browserRoom = loadRoom({
        window: { innerWidth: 1440, innerHeight: 900, Telegram: { WebApp: tgStub }, matchMedia: () => ({ matches: false }), addEventListener: () => {} },
        screen: { orientation: { lock: () => { orientLocks++; return Promise.resolve(); }, unlock: () => {} } },
        document: docStub,
        setTimeout: () => 1,
        clearTimeout: () => {}
    });

    assert.equal(browserRoom.isRealTelegramMiniApp(), false, 'empty initData must NOT be treated as Telegram Mini App');
    browserRoom.enterRoomFullscreen();
    assert.equal(nativeFsCalls, 1, 'browser MUST invoke real native requestFullscreen()');
    assert.equal(seenNavUi, 'hide', 'requests hidden OS navigation UI in fullscreen');
    assert.equal(tgFsCalls, 0, 'browser must NOT hijack fullscreen with silent Telegram no-op');
    assert.equal(activeFsEl, roomEl, '#station becomes real native fullscreenElement');

    // Hardware Esc exits native fullscreen -> fullscreenchange listener smoothly exits room fullscreen too
    browserRoom.roomAnim.fsNativeActive = true;
    activeFsEl = null;
    docListeners.fullscreenchange();
    assert.equal(browserRoom.roomAnim.isFullscreen, false, 'hardware Esc must cleanly exit room fullscreen');

    // Real Telegram Mini App (initData populated) DOES call Telegram.WebApp.requestFullscreen()
    tgStub.initData = 'query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A777%7D&hash=abc';
    assert.equal(browserRoom.isRealTelegramMiniApp(), true);
    browserRoom.enterRoomFullscreen();
    assert.equal(tgFsCalls, 1, 'real Telegram Mini App calls Telegram.WebApp.requestFullscreen()');
    assert.ok(orientLocks >= 1, 'attempts landscape orientation lock');
    browserRoom.exitRoomFullscreen(true);
    assert.ok(nativeExitCalls >= 0);

    // 2. Fixed-size fullscreen button lives in #station-scene (not in .station-bar), never shifts, and zero hotspots overlap!
    const barMatch = indexHtml.match(/<div class="station-bar">([\s\S]*?)<\/div>\s*<p class="station-line"/);
    assert.ok(barMatch && !barMatch[1].includes('station-fs-open'), '#station-fs-open must NOT live inside .station-bar where text shifts it');
    assert.ok(/\.station-fs-btn\s*\{[^}]*position:\s*absolute[^}]*width:\s*34px[^}]*height:\s*34px/s.test(roomCss), 'FS button must have fixed 34x34px absolute dimensions');
    const hitBoxes = {};
    for (const m of roomCss.matchAll(/\.station-hit--(\w+)\s*\{([^}]+)\}/g)) {
        const b = m[2];
        const num = k => Number((b.match(new RegExp(k + ':\\s*([\\d.]+)%')) || [])[1]);
        if (!Number.isNaN(num('left'))) {
            hitBoxes[m[1]] = { l: num('left'), t: num('top'), r: num('left') + num('width'), b: num('top') + num('height') };
        }
    }
    assert.equal(Object.keys(hitBoxes).length, 12, 'all 12 interactive hotspots including vinyl player, dog and living vines must be styled');
    assert.ok(hitBoxes.dog && hitBoxes.vines && hitBoxes.vinyl, '.station-hit--dog, .station-hit--vines and .station-hit--vinyl must exist');
    const names = Object.keys(hitBoxes);
    for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
            const A = hitBoxes[names[i]], B = hitBoxes[names[j]];
            const overlap = A.l < B.r && A.r > B.l && A.t < B.b && A.b > B.t;
            assert.equal(overlap, false, `hotspots ${names[i]} and ${names[j]} must never overlap`);
        }
    }

    // 3. Cat ribbons/collars are 100% gone across every single UID (including browser 'guest'), and all 7 dog breeds shine!
    assert.ok(!roomCode.includes('CAT_COLLARS'), 'CAT_COLLARS must be completely removed');
    assert.equal(browserRoom.DOG_BREEDS.length, 7, '7 bespoke ID-bound dog breeds');
    const seenDogBreeds = new Set();
    const seenCatCoats = new Set();
    let diffPetPairs = 0;
    for (const id of ['guest', ...Array.from({ length: 400 }, (_, i) => 'u_pet_' + i)]) {
        const cs = browserRoom.catSpec(id);
        const ds = browserRoom.dogSpec(id);
        assert.equal(cs.collar, undefined, 'cat must have no collar property');
        assert.ok(!/лент|бубенчик|медальон|ошейник/i.test(cs.summary), `cat summary must never mention ribbon/collar: ${cs.summary}`);
        seenCatCoats.add(cs.coatIdx);
        seenDogBreeds.add(ds.breedIdx);
        if (cs.coatIdx !== ds.breedIdx) diffPetPairs++;
    }
    assert.equal([...seenCatCoats].filter(c => c < 7).length, 7, 'all 7 regular cat coats reachable (plus 0.1% rare Moon Cat #7)');
    assert.equal([...seenDogBreeds].filter(b => b < 7).length, 7, 'all 7 regular dog breeds reachable (plus 0.1% rare Maltese #7)');
    assert.ok(diffPetPairs > 250, 'dog breed hash is statistically independent from cat coat hash');

    // 4. Simultaneous cat + dog ownership, equipping, petting, duet journal line, PTS dog cycler, and SQL trigger protection!
    const cEnv = { localStorage: makeStorage(), player: { uid: 'u_duet_77', warmth: 42, xp: 300 }, esc: s => String(s) };
    vm.runInNewContext(cosmCode + ';globalThis.C = { SOMA_CATALOG, grantOwnedItem, getActiveCosmetics, toggleEquipCosmetic };', cEnv);
    assert.equal(cEnv.C.SOMA_CATALOG.length, 31, '31 flagship cosmetic items including pot_amethyst and room_dog');
    const dogItem = cEnv.C.SOMA_CATALOG.find(i => i.id === 'room_dog');
    const catItem = cEnv.C.SOMA_CATALOG.find(i => i.id === 'room_cat');
    assert.ok(dogItem && dogItem.stars === 220 && catItem.stars === 220, 'cat and dog share equal 220 Stars companion tier');
    cEnv.C.grantOwnedItem('room_cat');
    cEnv.C.grantOwnedItem('room_dog');
    const both = cEnv.C.getActiveCosmetics();
    assert.equal(both.cat, true, 'cat stays equipped when dog is granted');
    assert.equal(both.dog, true, 'dog is equipped simultaneously with cat');
    assert.equal(cEnv.player.warmth, 42, 'owning both companions never alters gameplay warmth');
    assert.ok(sqlCode.includes("'room_dog'") && sqlCode.includes("'{dog}'"), 'Supabase SQL trigger guards room_dog ownership');

    let nowClock = 5000;
    const duetRoomEl = { dataset: {}, querySelector: () => null, querySelectorAll: () => [] };
    const duetDogHit = { title: '', attrs: {}, classList: makeEl('dog-hit').classList, setAttribute(k, v) { this.attrs[k] = v; } };
    const duetRoom = loadRoom({
        window: { SOMA_CONFIG: { ENV: 'pts' }, matchMedia: () => ({ matches: false }), addEventListener: () => {} },
        document: { hidden: false, getElementById: id => (id === 'station' ? duetRoomEl : id === 'station-hit-dog' ? duetDogHit : null) },
        performance: { now: () => (nowClock += 1200) },
        getActiveCosmetics: () => both
    });
    duetRoom.renderRoom();
    assert.equal(duetDogHit.classList.contains('hidden'), false, 'dog hotspot activates when room_dog is equipped');
    assert.ok(duetDogHit.title.includes('Погладить пса'), 'dog hotspot has accessible breed label');
    const dogLines = [0, 1, 2].map(() => { duetRoom.touchRoomObject('dog'); return duetRoom.roomAnim.customEntry; });
    const catLines = [0, 1, 2].map(() => { duetRoom.touchRoomObject('bed'); return duetRoom.roomAnim.customEntry; });
    assert.ok(dogLines[0].includes('хвостом') && dogLines[1].includes('персидском коврике') && dogLines[2].includes('пледа'), 'petting dog triggers happy tail wag & Persian-rug-by-blanket duet line next to cat');
    assert.ok(catLines[0].includes('замурчал') && catLines[2].includes('двойное живое тепло'), 'petting cat independently works alongside dog & triggers cat+dog duet line');
    const cycledBreeds = new Set();
    for (let i = 0; i < 8; i++) {
        duetRoom.cyclePtsDogBreed();
        cycledBreeds.add(duetRoom.dogSpec(undefined, duetRoom.roomAnim.inspectDogBreed).breedIdx);
    }
    assert.equal(cycledBreeds.size, 8, 'PTS dog cycler tours all 7 standard dog breeds + ultra-rare 0.1% White Maltese and returns to own breed');
    assert.equal(duetRoom.roomAnim.inspectDogBreed, null, 'full 8-step cycle lands cleanly back on player ID breed');
});

test('v10: realistic dogs on Persian rug by bed blanket next to untouched cat, NEEOSOMA isolated strictly to nickname egg, and fullscreen-safe RX-88 collectible Hi-Fi receiver', () => {
    const p = require('path'), fs = require('fs'), vm = require('vm');
    const musicCode = fs.readFileSync(p.join(__dirname, '..', 'music.js'), 'utf8');
    const rxCode = fs.readFileSync(p.join(__dirname, '..', 'receiver.js'), 'utf8');
    const rxCss = fs.readFileSync(p.join(__dirname, '..', 'receiver.css'), 'utf8');
    const cosmCode = fs.readFileSync(p.join(__dirname, '..', 'cosmetics.js'), 'utf8');

    // 1. Cat stays untouched at (618, 333); dog sits on its own mini Persian rug beside the bed's blanket right below the cat!
    assert.ok(roomCode.includes('const cx = 618, cy = 333;'), 'cat couch position (618, 333) must stay completely untouched');
    assert.ok(roomCode.includes('function drawDogPersianRug(') && roomCode.includes('const rugX = 622, rugY = 433;'), 'dog has its own isometric Persian rug beside the draped blanket');
    assert.ok(roomCode.includes('const cx = 613, cy = 425;'), 'enlarged sleeping dog rests right next to the cat below the couch and blanket');
    const dogHit = roomCss.match(/\.station-hit--dog\s*\{([^}]+)\}/)[1];
    const bedHit = roomCss.match(/\.station-hit--bed\s*\{([^}]+)\}/)[1];
    assert.ok(parseFloat(dogHit.match(/left:\s*([\d.]+)%/)[1]) >= 65 && parseFloat(dogHit.match(/top:\s*([\d.]+)%/)[1]) >= 77, 'dog hotspot aligned with floor by bed blanket');
    assert.ok(parseFloat(bedHit.match(/top:\s*([\d.]+)%/)[1]) + parseFloat(bedHit.match(/height:\s*([\d.]+)%/)[1]) <= parseFloat(dogHit.match(/top:\s*([\d.]+)%/)[1]), 'bed (cat) and dog hotspots never overlap');

    // Every single one of the 7 dog breeds has authentic per-breed anatomy scales & draws cleanly in all 4 phases (awake + petted)
    const r = loadRoom({ getActiveCosmetics: () => ({ cat: true, dog: true }) });
    const largeDogs = r.DOG_BREEDS.filter(b => b.sx >= 1.05 && b.sy >= 1.03);
    assert.ok(largeDogs.length >= 4, 'Golden Retriever, Husky, Samoyed, and Border Collie are genuinely larger than cats');
    const corgi = r.DOG_BREEDS.find(b => b.pattern === 'corgi');
    assert.ok(corgi && corgi.legLen < 0.8 && corgi.ears === 'corgi', 'Corgi has authentic short legs and large rounded Pembroke ears');
    const dummyGrad = { addColorStop() {} };
    const g = {
        canvas: { width: 793, height: 496 },
        fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, globalCompositeOperation: 'source-over',
        save() {}, restore() {}, translate() {}, scale() {}, rotate() {},
        beginPath() {}, closePath() {}, clip() {}, fill() {}, stroke() {},
        fillRect() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, arc() {}, ellipse() {},
        createLinearGradient: () => dummyGrad, createRadialGradient: () => dummyGrad
    };
    for (let bi = 0; bi < 7; bi++) {
        r.roomAnim.inspectDogBreed = bi;
        for (const ph of [0, 1, 2, 3]) {
            r.roomAnim.dogPetStart = -1e9;
            assert.doesNotThrow(() => r.drawCompanionDog(g, 4200, ph, false));
            r.roomAnim.dogPetStart = 3500;
            assert.doesNotThrow(() => r.drawCompanionDog(g, 4200, ph, false));
        }
    }

    // 2. NEEOSOMA hardware branding (AV-88) while artist streaming links stay strictly in 7-tap nickname easter egg!
    assert.ok(rxCode.includes('NEEOSOMA // AV-88'), 'receiver uses unified NEEOSOMA // AV-88 brand');
    assert.ok(!/SOMA_MUSIC|music-modal|openMusic|musicFound/.test(rxCode), 'receiver.js never leaks artist easter-egg links');
    assert.ok(!/musicFound|openMusic|SOMA_MUSIC/.test(roomCode), 'room.js never leaks artist easter-egg links');
    const eggBlock = indexHtml.match(/id="egg-modal"[\s\S]*?<\/div>\s*<\/div>/)[0];
    assert.ok(!eggBlock.includes('openMusic'), '#egg-modal must NOT redirect to NEEOSOMA promo');
    assert.ok(/function pulseTap\(\)[\s\S]{0,260}if \(pulseN >= 7\) \{ pulseN = 0; openMusic\(\); \}/.test(indexHtml), 'nickname 7-tap easter egg stays intact');
    assert.ok(indexHtml.includes('id="music-modal"') && musicCode.includes("name: 'NEEOSOMA'"), 'NEEOSOMA easter-egg config preserved');
    assert.ok(/function openRadio\(\)\s*\{\s*if \(window\.SOMA_RECEIVER/.test(indexHtml), 'openRadio opens RX-88 Hi-Fi receiver directly');

    // 3. Activating radio inside fullscreen NEVER exits fullscreen (while terminal still exits fullscreen)!
    let radioOpened = 0, trainerOpened = 0;
    const fsRoom = loadRoom({
        document: {
            hidden: false,
            documentElement: { classList: { add() {}, remove() {} } },
            getElementById: id => id === 'station' ? { dataset: {}, classList: { remove() {}, contains: () => false } } : null
        },
        openRadio: () => { radioOpened++; },
        openTrainer: () => { trainerOpened++; }
    });
    fsRoom.roomAnim.isFullscreen = true;
    fsRoom.activateRoomObject('radio');
    assert.equal(radioOpened, 1, 'radio opens RX-88 immediately');
    assert.equal(fsRoom.roomAnim.isFullscreen, true, 'opening radio receiver MUST NEVER exit fullscreen!');
    fsRoom.activateRoomObject('terminal');
    assert.equal(trainerOpened, 1);
    assert.equal(fsRoom.roomAnim.isFullscreen, false, 'opening terminal trainer exits fullscreen cleanly');

    // 4. RX-88 streaming URL parsers (Spotify + Yandex Music) & $1 (50 Stars) collectible ownership security
    const rxEnv = { window: {}, URL, localStorage: makeStorage(), player: { uid: 'u_vinyl_42', warmth: 25, xp: 400 }, isPtsMode: () => true, esc: s => String(s) };
    rxEnv.window = rxEnv;
    vm.runInNewContext(musicCode, rxEnv);
    vm.runInNewContext(cosmCode, rxEnv);
    vm.runInNewContext(rxCode, rxEnv);
    const RX = rxEnv.window.SOMA_RECEIVER;
    assert.ok(RX, 'window.SOMA_RECEIVER initialized');

    const sp1 = RX.parseSpotifyEmbed('https://open.spotify.com/intl-ru/track/4cOdK2wGLETKBW3PvgPWqT?si=abc');
    assert.equal(sp1.embedUrl, 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT?utm_source=generator&theme=0');
    const sp2 = RX.parseSpotifyEmbed('https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6');
    assert.equal(sp2.kind, 'playlist');
    assert.equal(RX.parseSpotifyEmbed('https://evil.example.com/track/123'), null, 'rejects untrusted Spotify domains');

    const ya1 = RX.parseYandexEmbed('https://music.yandex.ru/album/112233/track/998877');
    assert.equal(ya1.embedUrl, 'https://music.yandex.ru/iframe/track/998877/112233');
    const ya2 = RX.parseYandexEmbed('https://music.yandex.ru/users/author.name/playlists/1005');
    assert.equal(ya2.embedUrl, 'https://music.yandex.ru/iframe/playlist/author.name/1005');
    assert.equal(RX.parseYandexEmbed('javascript:alert(1)'), null, 'rejects unsafe streaming schemes');

    // Free tracks owned immediately; $1 (50 Stars) dubplates locked until purchased, then permanently stored with 0% pay-to-win!
    assert.equal(RX.isTrackOwned('rx_night_platform'), true);
    assert.equal(RX.isTrackOwned('track_aurora'), false);
    RX.buy('track_aurora');
    assert.equal(RX.isTrackOwned('track_aurora'), true, 'PTS 1-click purchase unlocks collectible 7" vinyl forever');
    assert.ok(JSON.parse(rxEnv.localStorage.getItem('soma_owned')).includes('track_aurora'), 'persisted in soma_owned');
    assert.equal(rxEnv.player.warmth, 25, 'buying collectible music grants 0 gameplay warmth (zero pay-to-win)');
    assert.equal(rxEnv.player.xp, 400, 'buying collectible music grants 0 gameplay XP (zero pay-to-win)');
});

test('v11: enlarged sleeping dogs with tucked front paws, clean RX-88 header, fullscreen-safe VHS archive (DD.MM.YYYY + #num + search/fav), and atmospheric canvas achievement share cards', async () => {
    const p = require('path'), fs = require('fs'), vm = require('vm');
    const rxCode = fs.readFileSync(p.join(__dirname, '..', 'receiver.js'), 'utf8');
    const rxCss = fs.readFileSync(p.join(__dirname, '..', 'receiver.css'), 'utf8');
    const vhsCode = fs.readFileSync(p.join(__dirname, '..', 'vhs.js'), 'utf8');
    const vhsCss = fs.readFileSync(p.join(__dirname, '..', 'vhs.css'), 'utf8');
    const shareCode = fs.readFileSync(p.join(__dirname, '..', 'share.js'), 'utf8');
    const shareCss = fs.readFileSync(p.join(__dirname, '..', 'share.css'), 'utf8');
    const cosmCode = fs.readFileSync(p.join(__dirname, '..', 'cosmetics.js'), 'utf8');

    // 1. RX-88 header: «ЛАМПОВАЯ ФОНОТЕКА» removed completely so it never collides with STEREO badge
    assert.ok(!/ламповая фонотека/i.test(rxCode) && !rxCode.includes('rx-model-sub'), 'RX-88 header has no ламповая фонотека subtitle');
    assert.ok(!rxCss.includes('rx-model-sub'), 'rx-model-sub style cleaned from receiver.css');
    assert.ok(rxCode.includes('rx-stereo-lamp') && rxCode.includes('SOMA // RX-88'), 'RX-88 brand and STEREO indicator remain crisp');

    // 2. All 7 dog breeds are noticeably larger than the cat (sx >= 1.28, up to 1.52x) and sleep with tucked front paws + closed eyelids
    const r = loadRoom({ getActiveCosmetics: () => ({ cat: true, dog: true, pot: 'pot_kintsugi' }) });
    assert.equal(r.DOG_BREEDS.length, 7);
    for (const b of r.DOG_BREEDS) {
        assert.ok(b.sx >= 1.28 && b.sy >= 1.18, `${b.name} must be noticeably larger than the cat (got ${b.sx}x${b.sy})`);
    }
    const bigFour = r.DOG_BREEDS.filter(b => b.sx >= 1.44);
    assert.equal(bigFour.length, 4, 'Golden Retriever, Samoyed, Husky, and Border Collie are >=1.44x large dogs');
    assert.ok(/const headLift = petK \* 6(?:\.\d+)?/.test(roomCode) && roomCode.includes('const peekAwake ='), 'dogs sleep with lowered head, tucked front paws, and closed eyelids that wake on petting');

    // 3. VHS archive: NEEOSOMA // VTR-90 branding, full DD.MM.YYYY stamps, legacy DD.MM migration, permanent #001..#NNN numbering, favorites, PTS demo pack
    assert.ok(vhsCode.includes('NEEOSOMA // VTR-90') && shareCode.includes('NEEOSOMA // VTR-90'));
    const store = makeStorage();
    store.setItem('soma_cassettes', JSON.stringify([
        { id: 'cas_1762000000000', date: '07.03', text: 'Старая тёплая кассета без года — должна обрести полный год.' }
    ]));
    const vRoom = loadRoom({ localStorage: store });
    const migrated = vRoom.loadCassettes();
    assert.equal(migrated.length, 1);
    assert.match(migrated[0].date, /^07\.03\.\d{4}$/, 'legacy DD.MM cassette migrated seamlessly to full DD.MM.YYYY');
    assert.equal(migrated[0].num, 1, 'oldest cassette gets permanent #001');

    const added1 = vRoom.saveWhisperCassette('Пусть эта ночь будет к тебе бережной.');
    assert.match(added1.date, /^\d{2}\.\d{2}\.\d{4}$/, 'new whisper cassette stamped with full DD.MM.YYYY');
    assert.equal(added1.num, 2, 'next cassette gets permanent sequential #002');
    const added2 = vRoom.saveWhisperCassette('Тепло дошло сквозь тишину.', '5.9.2026');
    assert.equal(added2.date, '05.09.2026', 'normalizes single-digit D.M.YYYY to DD.MM.YYYY');
    assert.equal(added2.num, 3);

    assert.equal(vRoom.toggleCassetteFav(added1.id), true, 'cassette marked favorite');
    assert.equal(vRoom.loadCassettes().find(c => c.id === added1.id).fav, true, 'favorite flag persisted in localStorage');
    assert.equal(vRoom.toggleCassetteFav(added1.id), false, 'cassette unfavorited cleanly');

    // Opening the cassette archive (VTR-90 deck) from room shelf inside fullscreen NEVER exits fullscreen
    let vhsOpened = 0, vhsOpenedWith = null;
    const fsVhs = loadRoom({
        localStorage: store,
        window: {
            SOMA_CONFIG: { ENV: 'pts' },
            SOMA_VHS: { open: id => { vhsOpened++; vhsOpenedWith = id; }, refresh() {}, syncMount() {} },
            openDiaryArchive: () => {}
        },
        document: {
            hidden: false,
            documentElement: { classList: { add() {}, remove() {} } },
            getElementById: id => id === 'station' ? { dataset: {}, querySelector: () => null, querySelectorAll: () => [], classList: { remove() {}, toggle() {}, contains: () => true } } : null
        }
    });
    fsVhs.roomAnim.isFullscreen = true;
    fsVhs.activateRoomObject('shelf');
    assert.equal(vhsOpened, 1, 'tapping room shelf opens the cassette archive (VTR-90 deck)');
    assert.equal(fsVhs.roomAnim.isFullscreen, true, 'opening cassette archive MUST NEVER exit fullscreen!');

    // PTS demo pack inserts 4 full-date VHS cassettes and cleanly removes only demo cassettes on second toggle
    fsVhs.togglePtsDemoCassette();
    const withDemo = fsVhs.loadCassettes();
    assert.equal(withDemo.length, 7, '3 user tapes + 4 PTS demo VHS tapes');
    assert.ok(withDemo.every(t => /^\d{2}\.\d{2}\.\d{4}$/.test(t.date)), 'every cassette has full DD.MM.YYYY date');
    fsVhs.togglePtsDemoCassette();
    assert.equal(fsVhs.loadCassettes().length, 3, 'second toggle removes only demo tapes, preserving user archive');

    // 4. Atmospheric canvas share cards: all 6 poster types render 1200x675 cleanly and all share buttons route through SOMA_SHARE
    assert.ok(/function copyShareText\(\)[\s\S]{0,140}SOMA_SHARE\.shareWitness\(\)/.test(indexHtml), 'Witness report shares illustrated live room card');
    assert.ok(/function shareEgg\(\)[\s\S]{0,140}SOMA_SHARE\.shareEgg\(\)/.test(indexHtml), 'Protocol Breaker egg shares illustrated card');
    assert.ok(/function shareMusic\(\)[\s\S]{0,140}SOMA_SHARE\.shareSignal\(\)/.test(indexHtml), 'Secret frequency egg shares illustrated card');
    assert.ok(vhsCode.includes('SOMA_SHARE.shareVhs(cur)'), 'VTR-90 deck shares illustrated VHS CRT card');

    const makeMockCanvas = (w, h) => {
        let ops = 0;
        const grad = { addColorStop() {} };
        const ctx = {
            canvas: { width: w, height: h },
            fillStyle: '', strokeStyle: '', font: '', textAlign: 'left', textBaseline: 'alphabetic',
            lineWidth: 1, lineCap: 'butt', globalAlpha: 1, globalCompositeOperation: 'source-over',
            shadowColor: '', shadowBlur: 0, filter: 'none',
            save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, setLineDash() {},
            beginPath() {}, closePath() {}, clip() {},
            moveTo() {}, lineTo() {}, arcTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, arc() {}, ellipse() {},
            fill() { ops++; }, stroke() { ops++; }, fillRect() { ops++; }, clearRect() {},
            drawImage() { ops++; },
            fillText() { ops++; },
            measureText: txt => ({ width: String(txt).length * 7.5 }),
            createLinearGradient: () => grad,
            createRadialGradient: () => grad
        };
        return {
            width: w, height: h,
            get ops() { return ops; },
            getContext: () => ctx,
            toDataURL: () => 'data:image/png;base64,iVBORw0KGgo=',
            toBlob: cb => cb(new Blob(['png'], { type: 'image/png' }))
        };
    };

    const sEnv = {
        Math, Number, String, Array, Object, Set, Map, Date, JSON, RegExp, Promise, Blob,
        parseInt, parseFloat, isNaN, isFinite, setTimeout, clearTimeout,
        performance: { now: () => 4200 },
        player: { uid: 'u_99', name: 'Аноним #7712', xp: 3200, seen: 42, reacts: 11, attempts: 10, warmth: 260, trained: 9 },
        rankOf: () => 'АРХИТЕКТОР',
        BOT_LINK: 'https://t.me/soma_link_bot',
        localStorage: makeStorage(),
        __somaCreateCanvas: makeMockCanvas,
        __somaLoadImage: async () => ({ width: 1586, height: 992 })
    };
    sEnv.window = sEnv;
    sEnv.globalThis = sEnv;
    sEnv.SOMA_CONFIG = { ENV: 'prod', BOT_LINK: 'https://t.me/soma_link_bot' };
    sEnv.matchMedia = () => ({ matches: false });
    sEnv.addEventListener = () => {};
    vm.createContext(sEnv);
    vm.runInContext(roomCode, sEnv);
    vm.runInContext(cosmCode, sEnv);
    vm.runInContext(shareCode, sEnv);

    for (const [kind, payload] of [
        ['witness', null],
        ['egg', null],
        ['signal', null],
        ['vhs', { num: 12, date: '18.11.2026', text: 'Тихое тепло сквозь ночной эфир.' }],
        ['plant', { kind: 6 }]
    ]) {
        const cv = await sEnv.SOMA_SHARE.renderCard(kind, payload);
        assert.equal(cv.width, 1200);
        assert.equal(cv.height, 675);
        assert.ok(cv.ops > 40, `share card "${kind}" rendered rich layered illustration (${cv.ops} draw ops)`);
    }
});

test('cloud-only signal storage: saveJournalEntry calls Supabase, loadDiaryArchive reads cloud (authoritative), fav syncs', async () => {
    const calls = [];
    const cloudJournal = [];
    const supabaseClient = {
        async rpc(name, args) {
            calls.push({ name, args });
            if (name === 'save_soma_journal_entry') {
                cloudJournal.push({
                    id: args.p_id, kind: 'entry', text: args.p_text,
                    date_label: args.p_date, num: args.p_num, fav: args.p_fav,
                    author_auth_id: 'auth_test', created_at: Date.now()
                });
                return { error: null, data: [] };
            }
            if (name === 'set_soma_journal_fav') {
                const row = cloudJournal.find(r => r.id === args.p_id);
                if (row) row.fav = args.p_fav;
                return { error: null };
            }
            if (name === 'get_my_soma_journal') return { error: null, data: cloudJournal };
            return { error: null };
        }
    };
    const r = loadRoom({ localStorage: makeStorage(), supabaseClient });

    // 1) saveJournalEntry — вызов cloud RPC с правильными аргументами (без локального хранения).
    const res = await r.saveJournalEntry('e_cloud_1', 'Сигнал в облако.', '2026-11-21', 'S1:S|Тема');
    assert.equal(res.ok, true, 'saveJournalEntry succeeds with cloud');
    assert.equal(res.offline, false, 'cloud path is reported as online');
    const saveCall = calls.find(c => c.name === 'save_soma_journal_entry');
    assert.ok(saveCall, 'cloud RPC save_soma_journal_entry is called');
    assert.equal(saveCall.args.p_id, 'e_cloud_1');
    assert.equal(saveCall.args.p_kind, 'entry');
    assert.equal(saveCall.args.p_text, 'Сигнал в облако.');
    assert.equal(saveCall.args.p_date, '2026-11-21');

    // 2) loadDiaryArchive — облачная запись появляется в архиве (kind=entry).
    const archive = await r.loadDiaryArchive();
    const cloudEntry = archive.find(it => it.id === 'e_cloud_1' && it.kind === 'entry');
    assert.ok(cloudEntry, 'cloud entry appears in the archive');
    assert.equal(cloudEntry.text, 'Сигнал в облако.');

    // 3) Облако авторитетно: изменение в облаке отражается в архиве.
    const cloudRow = cloudJournal.find(x => x.id === 'e_cloud_1');
    cloudRow.text = 'Облачный авторитетный текст.';
    const archive2 = await r.loadDiaryArchive();
    assert.equal(archive2.find(it => it.id === 'e_cloud_1').text, 'Облачный авторитетный текст.',
        'cloud text is reflected in the archive');

    // 4) toggleEntryFav — синхронизирует избранное в облако.
    const fav = r.toggleEntryFav('e_cloud_1');
    assert.equal(fav, true, 'entry marked favorite');
    const favCall = calls.find(c => c.name === 'set_soma_journal_fav' && c.args.p_id === 'e_cloud_1');
    assert.ok(favCall, 'cloud RPC set_soma_journal_fav is called');
    assert.equal(favCall.args.p_fav, true);
    assert.equal(r.isEntryFav('e_cloud_1'), true, 'isEntryFav reflects the favorite');
});

test('v12: top-left fullscreen vinyl bar, unified NEEOSOMA/NEEO~CITY/SOMA~LINK branding, Whisper-only protocol breaches, 0.1% White Maltese, Greenhouse conservatory + 7 secret alien plants (room-only growth), and NEEOSOMA // SKY-01 window airship', async () => {
    const p = require('path'), fs = require('fs'), vm = require('vm');
    const rxCss = fs.readFileSync(p.join(__dirname, '..', 'receiver.css'), 'utf8');
    const rxCode = fs.readFileSync(p.join(__dirname, '..', 'receiver.js'), 'utf8');
    const vhsCode = fs.readFileSync(p.join(__dirname, '..', 'vhs.js'), 'utf8');
    const cosmCode = fs.readFileSync(p.join(__dirname, '..', 'cosmetics.js'), 'utf8');
    const ghCode = fs.readFileSync(p.join(__dirname, '..', 'greenhouse.js'), 'utf8');
    const ghCss = fs.readFileSync(p.join(__dirname, '..', 'greenhouse.css'), 'utf8');
    const blimpCode = fs.readFileSync(p.join(__dirname, '..', 'blimp.js'), 'utf8');
    const blimpCss = fs.readFileSync(p.join(__dirname, '..', 'blimp.css'), 'utf8');
    const shareCode = fs.readFileSync(p.join(__dirname, '..', 'share.js'), 'utf8');
    const musicCode = fs.readFileSync(p.join(__dirname, '..', 'music.js'), 'utf8');
    const scenCode = fs.readFileSync(p.join(__dirname, '..', 'scenarios.js'), 'utf8');

    // 1. FULLSCREEN VINYL PILL IN TOP-LEFT CORNER (zero collision with bottom status line or top-right HUD)
    const pillBlock = rxCss.match(/\.rx-fs-pill\s*\{([^}]+)\}/)[1];
    assert.ok(/top:\s*max\(10px/.test(pillBlock) && /left:\s*max\(12px/.test(pillBlock) && /bottom:\s*auto/.test(pillBlock),
        'fullscreen vinyl Now-Playing pill sits cleanly in top-left corner with safe-area insets');

    // 2. UNIFIED BRANDING ACROSS ENTIRE APP (NEEOSOMA // AV-88, VTR-90, NMAV-04, TRM-01, SKY-01; NEEO~CITY; SOMA~LINK)
    assert.ok(rxCode.includes('NEEOSOMA // AV-88') && indexHtml.includes('NEEOSOMA // AV-88'), 'audio receiver branded NEEOSOMA // AV-88');
    assert.ok(vhsCode.includes('NEEOSOMA // VTR-90') && roomCode.includes('NEEOSOMA // VTR-90'), 'video recorder branded NEEOSOMA // VTR-90');
    assert.ok(roomCode.includes('NEEOSOMA // NMAV-04') && cosmCode.includes('NEEOSOMA // NMAV-04'), 'Whisper pager branded NEEOSOMA // NMAV-04');
    assert.ok(indexHtml.includes('NEEOSOMA // TRM-01') && roomCode.includes('NEEOSOMA // TRM-01'), 'terminal branded NEEOSOMA // TRM-01');
    assert.ok(blimpCode.includes('NEEOSOMA // SKY-01'), 'window dirigible channel branded NEEOSOMA // SKY-01');
    assert.ok(ghCode.includes('NEEOSOMA // ОРАНЖЕРЕЯ'), 'conservatory branded NEEOSOMA // ОРАНЖЕРЕЯ');
    const allUserCode = [indexHtml, roomCode, cosmCode, rxCode, vhsCode, ghCode, blimpCode, shareCode, musicCode, scenCode].join('\n');
    const noComments = allUserCode.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, '');
    assert.ok(!/(?<!NEEO)SOMA \/\/|RX-88|PGR-04|NEEO_CITY|NEEO CITY|SOMA LINK|SOMA_LINK/.test(noComments),
        'zero legacy SOMA //, RX-88, PGR-04, NEEO_CITY, SOMA LINK, or SOMA_LINK in any user-facing code');

    // 3. PROTOCOL BREACH COUNTER STRICTLY BOUND TO WHISPER USAGE (NOT PAIN-FEED HELP CLICKS)
    assert.ok(indexHtml.includes('ШЁПОТОВ ОТПРАВЛЕНО') && !indexHtml.includes('>ПОПЫТОК ПОМОЧЬ<') && !cosmCode.includes('ПОПЫТОК ПОМОЧЬ'), 'Whisper counter keeps its data binding with a contact-first label');
    assert.ok(/function triggerHelpBlock\(\)[\s\S]{0,650}soma_help_clicks/.test(indexHtml), 'Pain-Feed help clicks isolated to local easter-egg counter soma_help_clicks');
    const helpFn = indexHtml.match(/function triggerHelpBlock\(\)\s*\{[\s\S]*?\n        \}/)[0];
    assert.ok(!/helpAttempts|recordWhisperSent|whispersSent/.test(helpFn), 'triggerHelpBlock NEVER increments protocol breach counter');

    const wStore = makeStorage();
    let cloudSyncs = 0;
    const wPlayer = { uid: 'u_whisper', warmth: 0, whispersSent: 0, helpAttempts: 0 };
    const wRoom = loadRoom({ localStorage: wStore, player: wPlayer, updateCloudProfile: () => { cloudSyncs++; } });
    assert.equal(wRoom.getWhisperBreachCount(), 0, 'starts at 0 protocol breaches');
    wRoom.claimDailyWarmth('visit');
    wRoom.claimDailyWarmth('react');
    assert.equal(wRoom.getWhisperBreachCount(), 0, 'visit & react warmth never increment protocol breaches');
    wRoom.claimDailyWarmth('whisper');
    assert.equal(wRoom.getWhisperBreachCount(), 1, 'sending 1st Whisper increments protocol breaches to 1');
    assert.equal(wPlayer.helpAttempts, 1, 'player.helpAttempts mirrors exact Whisper breach count');
    wRoom.recordWhisperSent();
    assert.equal(wRoom.getWhisperBreachCount(), 2, 'sending a 2nd Whisper on the same day increments protocol breaches to 2');
    assert.ok(cloudSyncs >= 2, 'each Whisper triggers cloud profile sync');

    // 4. ULTRA-RARE 0.1% WHITE MALTESE WITH VIOLET EARS & VIOLET TAIL
    let malteseHits = 0;
    const stdHits = new Array(7).fill(0);
    let luckyUid = null;
    for (let i = 0; i < 100000; i++) {
        const uid = 'tg_user_' + (100000000 + i * 37);
        const ds = wRoom.dogSpec(uid);
        if (ds.rare) {
            malteseHits++;
            if (!luckyUid) luckyUid = uid;
            assert.equal(ds.breedIdx, 7);
            assert.equal(ds.rarity, '0.1%');
            assert.equal(ds.breed.ears, 'maltese');
            assert.equal(ds.breed.tail, 'maltese_plume');
            assert.equal(ds.breed.name, 'Белая Юна');
        } else {
            stdHits[ds.breedIdx]++;
        }
    }
    assert.ok(malteseHits >= 65 && malteseHits <= 140, `0.1% Maltese rarity over 100k IDs should be ~100 (got ${malteseHits})`);
    assert.ok(stdHits.every(c => c > 13000), 'remaining 99.9% distributed evenly across all 7 standard dog breeds');
    assert.equal(wRoom.dogSpec(luckyUid).breed.id, 'maltese_violet', 'lucky player keeps their 0.1% Maltese permanently and deterministically');

    // 5 & 6. ROOM-ONLY PLANT GROWTH + GREENHOUSE UNLOCK ON FIRST BLOOM + ALL 7 EARTH FLOWERS + 1-OF-7 SECRET ALIEN PLANT
    const gStore = makeStorage();
    const gPlayer = { uid: 'botanist_42', warmth: 0 };
    const gRoom = loadRoom({ localStorage: gStore, player: gPlayer });
    const ownKind = gRoom.plantSpec('botanist_42').kind;

    // Locked before first plant reaches stage 5 (360 warmth)
    gPlayer.warmth = 240;
    gRoom.loadGreenhouse();
    assert.equal(gRoom.isGreenhouseUnlocked(), false, 'Greenhouse strictly hidden while first plant is still growing (stage 4)');
    assert.equal(gRoom.plantSecretAlienSeed(), null, 'secret alien seed locked before all 7 Earth species bloom');

    // First plant blooms at 360 warmth -> Greenhouse unlocks!
    gPlayer.warmth = 360;
    assert.equal(gRoom.isGreenhouseUnlocked(), true, 'Greenhouse unlocks the moment the first plant finishes blooming (6/6)');

    // Grow all remaining 7 Earth species (including Orchid #7) strictly via room-only feedActiveRoomPlant
    for (let step = 0; step < 7; step++) {
        assert.equal(gRoom.plantSecretAlienSeed(), null, `secret 9th alien stays 100% locked at ${step + 1}/8 Earth plants`);
        const planted = gRoom.plantNewGreenhouseSeed(gPlayer.warmth, gRoom.plantSpec('botanist_42'));
        assert.ok(planted, `can plant unseen Earth seed #${step + 1}`);
        const k = planted.kind;
        assert.equal(gRoom.loadGreenhouse().placed, 'seed', 'newly planted seed is placed in the room');

        // Grow partway in room
        gRoom.feedActiveRoomPlant(100, gPlayer.warmth);
        assert.equal(gRoom.loadGreenhouse().activeSeed.grownWarmth, 100, 'seed gains warmth while placed in the room');

        // Swap bloomed own flower into the room -> active seed MUST PAUSE growth completely!
        assert.equal(gRoom.selectGreenhouseSlot(ownKind), true, 'can place already-bloomed flower back in room');
        gRoom.feedActiveRoomPlant(250, gPlayer.warmth);
        assert.equal(gRoom.loadGreenhouse().activeSeed.grownWarmth, 100, 'seed growth is 100% PAUSED while kept in Greenhouse');

        // Return seed to room -> finishes blooming at 300!
        assert.equal(gRoom.selectGreenhouseSlot('seed'), true, 'can return growing seed to room pot');
        const res = gRoom.feedActiveRoomPlant(200, gPlayer.warmth);
        assert.ok(res && res.bloomed.includes(k) && res.activeSeed === null, `species #${k} finishes blooming in the room at 300 warmth`);
        assert.equal(gRoom.loadGreenhouse().placed, k, 'freshly bloomed flower stays displayed in the room');
    }

    assert.equal(gRoom.loadGreenhouse().bloomed.length, 8, 'all 8/8 Earth species (including Orchid) collected in Conservatory');

    // Secret 9th bonus alien plant: longer scale (760 warmth), strictly room-only growth, strictly 1 permanent species out of 7!
    assert.equal(gRoom.ALIEN_KINDS.length, 7, '7 distinct alien species exist in the universe');
    assert.equal(gRoom.ALIEN_WARMTH_STEPS[5], 760, 'secret alien plant takes longer than normal seeds (760 vs 300/360)');
    assert.ok(gRoom.plantSecretAlienSeed(), 'can plant secret 9th alien seed ONLY after 8/8 Earth species bloom');
    const assignedAlien = gRoom.loadGreenhouse().alienSeed.kind;
    assert.equal(assignedAlien, gRoom.alienSpec('botanist_42').ownAlienKind, 'matches player deterministic 1-of-7 alien species');

    gRoom.feedActiveRoomPlant(300, gPlayer.warmth);
    assert.equal(gRoom.loadGreenhouse().alienSeed.grownWarmth, 300);
    assert.equal(gRoom.loadGreenhouse().alienSeed.bloomed, false, 'alien seed still mid-growth at 300 warmth (needs 760)');

    // Move alien seed out of room by displaying Earth flower #2 -> alien growth MUST PAUSE!
    assert.equal(gRoom.selectGreenhouseSlot(2), true);
    gRoom.feedActiveRoomPlant(900, gPlayer.warmth);
    assert.equal(gRoom.loadGreenhouse().alienSeed.grownWarmth, 300, 'alien seed NEVER grows while not placed in the room');

    // Return alien seed to room -> blooms at 760!
    assert.equal(gRoom.selectGreenhouseSlot('alien'), true);
    const alienBloom = gRoom.feedActiveRoomPlant(460, gPlayer.warmth);
    assert.ok(alienBloom && alienBloom.alienSeed && alienBloom.alienSeed.bloomed === true, 'secret alien plant blooms in room at 760 warmth');
    assert.equal(gRoom.loadGreenhouse().alienSeed.bloomed, true);
    assert.deepEqual(JSON.parse(JSON.stringify(gRoom.plantSecretAlienSeed())), { kind: assignedAlien, grownWarmth: 760, bloomed: true },
        'player can NEVER grow a 2nd alien species — strictly 1 of 7 forever');

    // Any of the 8 Earth flowers (incl. Orchid #7) + the bloomed 9th secret alien can be placed in the room at will!
    for (const target of [0, 1, 2, 3, 4, 5, 6, 7, 'alien']) {
        assert.equal(gRoom.selectGreenhouseSlot(target), true, `can showcase "${target}" on the live room table`);
        assert.equal(gRoom.loadGreenhouse().placed, target);
    }

    // Verify all 7 alien species distribute evenly across players
    const alienDist = new Array(7).fill(0);
    for (let i = 0; i < 7000; i++) alienDist[gRoom.alienSpec('alien_test_' + i).ownAlienKind]++;
    assert.ok(alienDist.every(n => n > 850 && n < 1150), 'all 7 secret alien species distribute evenly across player IDs');

    // 7. CONSERVATORY SHARE CARD + ALIEN PLANT SHARE CARD + WINDOW AIRSHIP SYSTEM (SOMA_BLIMP / SOMA_ADS)
    function makeMockCanvas(w = 360, h = 380) {
        const c = { width: w, height: h, ops: 0, style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } }, setAttribute(){}, addEventListener(){} };
        const grad = { addColorStop() {} };
        const ctx2d = {
            canvas: c, fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '',
            textAlign: 'left', textBaseline: 'alphabetic', lineCap: 'butt', lineJoin: 'miter',
            shadowColor: 'transparent', shadowBlur: 0, globalCompositeOperation: 'source-over',
            save(){}, restore(){}, translate(){}, rotate(){}, scale(){}, setTransform(){},
            beginPath(){}, closePath(){}, clip(){}, setLineDash(){},
            moveTo(){ c.ops++; }, lineTo(){ c.ops++; }, arc(){ c.ops++; }, arcTo(){ c.ops++; },
            ellipse(){ c.ops++; }, rect(){ c.ops++; }, quadraticCurveTo(){ c.ops++; }, bezierCurveTo(){ c.ops++; },
            fill(){ c.ops++; }, stroke(){ c.ops++; }, clearRect(){},
            fillRect(){ c.ops++; }, strokeRect(){ c.ops++; },
            fillText(){ c.ops++; }, strokeText(){ c.ops++; },
            drawImage(){ c.ops++; },
            measureText: s => ({ width: String(s || '').length * 8 }),
            createLinearGradient: () => grad, createRadialGradient: () => grad
        };
        c.getContext = () => ctx2d;
        return c;
    }
    const blimpHit = {
        style: {}, title: '',
        classList: {
            _s: new Set(['hidden']),
            add(k){ this._s.add(k); }, remove(k){ this._s.delete(k); },
            toggle(k, on){ if (on) this._s.add(k); else this._s.delete(k); },
            contains(k){ return this._s.has(k); }
        },
        setAttribute(){}, getAttribute(){ return ''; }
    };
    const env = {
        console, Math, Date, Number, String, Boolean, Array, Object, Set, Map, RegExp, JSON, Promise, URL,
        parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
        setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
        requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
        performance: { now: () => 5000 },
        localStorage: gStore,
        player: { uid: 'botanist_42', name: 'NEEO_TEST', xp: 2200, warmth: 360, seen: 20, reacts: 10, whispersSent: 4, helpAttempts: 4 },
        rankOf: () => 'СВИДЕТЕЛЬ',
        getActiveCosmetics: () => ({ pot: 'pot_kintsugi', cat: true, dog: true }),
        matchMedia: () => ({ matches: false, addEventListener: () => {} }),
        addEventListener: () => {},
        document: {
            hidden: false,
            body: { appendChild(){} },
            addEventListener(){},
            getElementById: id => id === 'station-hit-blimp' ? blimpHit : null,
            createElement: tag => {
                if (tag === 'canvas') return makeMockCanvas(360, 380);
                const el = {
                    style: { setProperty(){} }, innerHTML: '', textContent: '', href: '',
                    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
                    setAttribute(){}, getAttribute(){ return ''; }, removeAttribute(){}, addEventListener(){}, appendChild(){}, remove(){},
                    querySelector: () => el, querySelectorAll: () => []
                };
                return el;
            }
        }
    };
    env.window = env; env.globalThis = env;
    vm.createContext(env);
    for (const code of [roomCode, ghCode, blimpCode, shareCode]) vm.runInContext(code, env);

    // Conservatory & Alien share cards render at full 1200x675
    const ghCard = await env.SOMA_SHARE.renderCard('conservatory', { moodIdx: 2 });
    assert.equal(ghCard.width, 1200);
    assert.equal(ghCard.height, 675);
    assert.ok(ghCard.ops > 200, 'panoramic Conservatory poster renders glass dome + 7 pedestals + alien altar');
    const alienCard = await env.SOMA_SHARE.renderCard('plant', { kind: 'alien' });
    assert.equal(alienCard.width, 1200);
    assert.ok(alienCard.ops > 80, 'secret alien specimen share card renders at 1200x675');

    // Airship: 0 flights in PROD when no active campaigns configured
    assert.equal(env.SOMA_BLIMP.getActiveCampaigns().length, 0, 'PROD defaults to zero active ad campaigns (completely silent sky)');
    const skyCv = makeMockCanvas(793, 496);
    env.SOMA_BLIMP.drawInWindow(skyCv.getContext('2d'), 5000, 0, 0.2, env.NEEO_SKY_POLY);
    assert.equal(env.SOMA_BLIMP.isFlying(), false, 'no airship flies when campaign roster is empty');
    assert.equal(blimpHit.classList.contains('hidden'), true, 'blimp hitbox stays hidden when no blimp is in the sky');

    // Airship: active campaign glides across window, updates precision hitbox, and logs impression + click on catch!
    const adEvents = [];
    env.onSomaAdEvent = e => adEvents.push(`${e.type}:${e.campaignId}`);
    env.SOMA_ADS.campaigns.push({
        id: 'partner_01', active: true, brand: 'NEEO PARTNER', signText: 'NEEO PARTNER',
        accent: '#ff6b7d', tagline: 'Ночной сигнал', promoCode: 'NEEO12', ctaUrl: 'https://neeosoma.art'
    });
    assert.equal(env.SOMA_BLIMP.getActiveCampaigns().length, 1);
    env.SOMA_BLIMP.launchFlight(env.SOMA_ADS.campaigns[0], 5000, { startProgress: 0.5, dir: 1, durationSec: 24 });
    env.SOMA_BLIMP.drawInWindow(skyCv.getContext('2d'), 5000, 0, 0.2, env.NEEO_SKY_POLY);
    assert.equal(env.SOMA_BLIMP.isFlying(), true);
    assert.equal(blimpHit.classList.contains('hidden'), false, 'dynamic blimp hitbox activates directly over visible dirigible');
    assert.ok(skyCv.ops > 25, 'dirigible renders hull, neon billboard, gondola, searchlight, and navigation beacons');
    assert.equal(env.SOMA_BLIMP.catchActive(), true, 'tapping the flying airship catches it and opens sponsor interface');
    assert.deepEqual(adEvents, ['impression:partner_01', 'click:partner_01'], 'records non-intrusive impression + opt-in click telemetry');

    // Fullscreen layering: Greenhouse (68) < Blimp modal (70) < Share Studio (82), all mount inside #station-scene
    assert.ok(ghCss.includes('z-index: 68') && blimpCss.includes('z-index: 70'), 'fullscreen z-index hierarchy stays clean and conflict-free');
});

test('v13: scroll freedom, 66-char epitaph, 13..666 Call, 8 Earth + hidden 9th alien, 0.1% Moon Cat, Hearth lanterns & cosmic violet Dawn, FS Greenhouse pill, enlarged blimp, and no VHS deck bar', () => {
    const vm = require('node:vm');
    const fs = require('node:fs');
    const path = require('path');
    const cosmCode = fs.readFileSync(path.join(__dirname, '..', 'cosmetics.js'), 'utf8');
    const ghCode = fs.readFileSync(path.join(__dirname, '..', 'greenhouse.js'), 'utf8');
    const ghCss = fs.readFileSync(path.join(__dirname, '..', 'greenhouse.css'), 'utf8');
    const blimpCode = fs.readFileSync(path.join(__dirname, '..', 'blimp.js'), 'utf8');
    const blimpCss = fs.readFileSync(path.join(__dirname, '..', 'blimp.css'), 'utf8');
    const sqlCode = fs.readFileSync(path.join(__dirname, '..', 'billing', 'setup_stars.sql'), 'utf8');

    // 1. Mobile scroll freedom & restoreSomaScroll safety hooks
    assert.ok(indexHtml.includes('window.restoreSomaScroll = restoreSomaScroll'), 'restoreSomaScroll helper registered globally');
    assert.ok(indexHtml.includes('overflow-y: auto') && indexHtml.includes('-webkit-overflow-scrolling: touch') && indexHtml.includes('overscroll-behavior-y: contain'), 'native smooth iOS/WKWebView touch scrolling enabled on #app-scroll');
    assert.ok(ghCss.includes('visibility: hidden') && blimpCss.includes('visibility: hidden'), 'closed Greenhouse and Blimp overlays use visibility:hidden + pointer-events:none');

    // 2. Epitaph max length = 66 chars (JS + SQL trigger) & Pain Feed Call = 13..666 chars
    const ep66 = 'Тишина NEEO~CITY хранит каждый шёпот, который не услышал весь мир!'; // 66 chars
    assert.equal(ep66.length, 66);
    const fakeInput = { value: ep66 + 'EXTRA_TRUNCATED' };
    const cEnv = {
        window: {},
        document: { getElementById: id => (id === 'shop-epitaph-input' ? fakeInput : null) },
        localStorage: makeStorage(),
        player: { uid: 'ep_66', warmth: 50 },
        esc: s => String(s), notify() {}, SFX: { tap(){} }
    };
    vm.runInNewContext(cosmCode + ';globalThis.C = { EPITAPH_MAX_LEN, sanitizeEpitaph, grantOwnedItem, saveMyEpitaph, getActiveCosmetics, SOMA_ITEM_MAP };', cEnv);
    assert.equal(cEnv.C.EPITAPH_MAX_LEN, 66, 'epitaph limit is exactly 66 chars');
    const san = cEnv.C.sanitizeEpitaph(ep66 + 'EXTRA_TRUNCATED');
    assert.equal(san.ok, true);
    assert.equal(san.value, ep66, 'sanitizeEpitaph preserves full 66 chars and trims beyond 66');
    cEnv.C.grantOwnedItem('perk_epitaph');
    cEnv.C.saveMyEpitaph();
    assert.equal(cEnv.C.getActiveCosmetics().epitaph, ep66, 'saveMyEpitaph persists full 66-char epitaph cleanly');
    assert.ok(sqlCode.includes("length(coalesce(new.cosmetics ->> 'epitaph', '')) > 66") && sqlCode.includes("left(new.cosmetics ->> 'epitaph', 66)"), 'Supabase SQL trigger updated to 66 chars');
    assert.ok(cEnv.C.SOMA_ITEM_MAP.room_cat.desc.includes('0.1%') && cEnv.C.SOMA_ITEM_MAP.room_cat.desc.includes('полумесяцем'), 'cat shop card notes 0.1% black crescent-moon cat');

    assert.ok(
        indexHtml.includes('minlength="13" maxlength="666"')
        && indexHtml.includes('0 / 666 (мин. 13)')
        && indexHtml.includes('const POST_MIN_LEN = 13;')
        && indexHtml.includes('.slice(0, 666)'),
        'Pain Feed («Зов») enforces exact 13..666 character bounds with live 0 / 666 counter'
    );

    // 3. 0.1% ultra-rare black crescent-moon cat («Полуночная Луна»)
    const r = loadRoom();
    assert.equal(r.RARE_MOON_CAT_INDEX, 7);
    assert.equal(r.RARE_MOON_CAT_COAT.name, 'Полуночная Луна');
    let rareCount = 0;
    let rareUid = null;
    for (let i = 0; i < 50000; i++) {
        const uid = 'moon_cat_check_' + i;
        const cs = r.catSpec(uid);
        if (cs.rare) {
            rareCount++;
            if (!rareUid) rareUid = uid;
            assert.equal(cs.coatIdx, 7);
            assert.equal(cs.rarity, '0.1%');
            assert.equal(cs.socks, false, 'Moon Cat is 100% obsidian black down to every paw');
            assert.equal(cs.coat.pattern, 'luna');
            assert.equal(cs.coat.id, 'midnight_luna');
        }
    }
    assert.ok(rareCount >= 30 && rareCount <= 75, `Moon Cat rarity stays tightly around 0.1% (got ${rareCount}/50000 = ${(rareCount / 500).toFixed(3)}%)`);
    assert.equal(r.catSpec(rareUid).rare, true, 'Moon Cat is 100% deterministic for lucky UID');
    const overrideMoon = r.catSpec('ordinary_user', 7);
    assert.equal(overrideMoon.rare, true, 'PTS can inspect rare Moon Cat via index 7 without changing player UID');

    // 4. Unclipped 440x460 plant canvas + Orchid #7 + Hearth lanterns/crescent + Cosmic Violet Dawn + untouched NEEO_SKY_POLY
    assert.ok(indexHtml.includes('id="station-plant" class="station-plant" width="440" height="460"'), 'room plant canvas upgraded to unclipped 440x460');
    assert.equal(r.PLANT_NOTES.length, 8, 'all 8 Earth species including Orchid have full 6-stage botanical notes');
    assert.equal(r.HEARTH_LANTERNS.length, 28, 'Hearth phase releases 28 glowing golden sky lanterns');
    assert.ok(r.COSMIC_DAWN_STARS.length >= 30, 'Cosmic Violet Dawn paints starfield above untouched skyline');
    assert.ok(r.NEEO_SKY_POLY.length >= 85, 'pixel-exact NEEO_SKY_POLY preserves every building roof and antenna spire');
    assert.ok(r.stationPhases[2].entry.includes('серпом луны') && r.stationPhases[2].entry.includes('фонарики'), 'Phase 2 describes crescent moon and sky lanterns');
    assert.ok(r.stationPhases[3].entry.includes('фиалково-космический'), 'Phase 3 describes warm-violet cosmic Dawn');

    // 5. Diegetic Greenhouse vines portal (zero button over Fullscreen window), zero pre-8/8 spoiler of 9th Easter egg, VHS deck bar removed, and enlarged Blimp
    assert.ok(!indexHtml.includes('id="station-fs-gh"') && indexHtml.includes('id="station-hit-vines"'),
        'Fullscreen Greenhouse button replaced by living hanging vines portal above the bed');
    assert.ok(!indexHtml.includes('station-ctx-head--deck') && !indexHtml.includes('id="station-deck-active"') && !indexHtml.includes('id="station-deck-count"'),
        'VHS deck bar removed entirely — no cassette plaque in the room');
    assert.ok(!roomCode.includes('▣ NEEOSOMA // VTR-90'), 'redundant extra VTR-90 button removed from VHS tape list');
    assert.ok(ghCode.includes('const EARTH_COUNT = 8') && !ghCode.includes('✦ Тайна (') && ghCss.includes('grid-template-columns: repeat(4, minmax(0, 1fr))'),
        'Conservatory shows 4x2 symmetric 8 Earth slots with ZERO pre-8/8 spoiler of the 9th secret alien');
    assert.ok(blimpCode.includes('const bw = 86, bh = 21.4') && blimpCode.includes('flightDurationSec: 26'),
        'Blimp enlarged with double-framed 86x21.4 readable signboard and graceful 26s crossing');
});

test('v14: animated hanging vines Greenhouse portal (zero button), unclipped Fullscreen Greenhouse, widescreen Fullscreen VHS + rotated touch scroll, and upgraded 8 dogs', () => {
    const p = require('path'), fs = require('fs');
    const vhsCss = fs.readFileSync(p.join(__dirname, '..', 'vhs.css'), 'utf8');
    const vhsCode = fs.readFileSync(p.join(__dirname, '..', 'vhs.js'), 'utf8');
    const ghCss = fs.readFileSync(p.join(__dirname, '..', 'greenhouse.css'), 'utf8');
    const ghCode = fs.readFileSync(p.join(__dirname, '..', 'greenhouse.js'), 'utf8');
    const shareCss = fs.readFileSync(p.join(__dirname, '..', 'share.css'), 'utf8');

    // 1. Greenhouse button completely removed; animated hanging vines above the bed act as gated Greenhouse portal
    assert.ok(!indexHtml.includes('id="station-fs-gh"'), 'Fullscreen Greenhouse button removed so window is 100% unobstructed');
    assert.ok(!roomCss.includes('.station-fs-pill--gh') && !roomCode.includes('id = \'station-open-gh-btn\''),
        'no standalone Greenhouse button remains');
    assert.ok(indexHtml.includes('id="station-hit-vines"') && indexHtml.includes("activateRoomObject('vines', event)"),
        'vines hotspot wired cleanly in room scene');

    let ghOpened = 0, lastGhOpts = null;
    const prodStore = makeStorage();
    const prodPlayer = { uid: 'u_vines_prod', name: 'AGENT_V14', warmth: 12 };
    const prodRoom = loadRoom({
        localStorage: prodStore,
        player: prodPlayer,
        location: { search: '', hostname: 'neeosoma.github.io' },
        SOMA_GREENHOUSE: { open(o) { ghOpened++; lastGhOpts = o; }, isOpen: () => false }
    });
    // Expose window.SOMA_GREENHOUSE inside sandbox via direct test of PROD gate -> unlock -> PTS
    prodRoom.window = prodRoom.window || {};
    const makeMockCtx = () => ({
        save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, beginPath() {}, closePath() {},
        moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, arc() {}, ellipse() {},
        fill() {}, stroke() {}, clip() {}, fillRect() {}, strokeRect() {}, clearRect() {},
        createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} })
    });
    const vCtx = makeMockCtx();
    assert.doesNotThrow(() => prodRoom.drawGreenhouseVines(vCtx, 1800, 0), 'vines animate smoothly before 1st bloom');
    const mockRoomDoc = { getElementById: (id) => id === 'station' ? { dataset: {}, querySelector: () => null, querySelectorAll: () => [], classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } } } : null };
    const prodTap = loadRoom({
        localStorage: prodStore,
        player: prodPlayer,
        document: mockRoomDoc,
        location: { search: '', hostname: 'neeosoma.github.io' },
        window: { SOMA_GREENHOUSE: { open(o) { ghOpened++; lastGhOpts = o; } } }
    });
    prodTap.activateRoomObject('vines');
    assert.equal(ghOpened, 0, 'PROD vines must NOT open Greenhouse before 1st flower blooms');
    assert.ok(prodTap.roomAnim.vinesStart > 0 && prodTap.roomAnim.customEntry.includes('лианы'), 'tapping locked vines gently rustles and hints poetically');

    // Unlock 1st flower in PROD -> touching vines opens Greenhouse!
    const ownK = prodRoom.plantSpec().kind;
    prodStore.setItem('soma_greenhouse', JSON.stringify({ bloomed: [ownK], activeSeed: null, placed: ownK }));
    const openEnv = loadRoom({
        localStorage: prodStore,
        player: { uid: 'u_vines_prod', name: 'AGENT_V14', warmth: 260 },
        document: mockRoomDoc,
        location: { search: '', hostname: 'neeosoma.github.io' },
        window: { SOMA_GREENHOUSE: { open(o) { ghOpened++; lastGhOpts = o; } } }
    });
    assert.doesNotThrow(() => openEnv.drawGreenhouseVines(vCtx, 2600, 2), 'vines bloom with glowing buds & motes when Greenhouse unlocked');
    openEnv.activateRoomObject('vines');
    assert.equal(ghOpened, 1, 'touching living vines after 1st bloom opens Greenhouse immediately');
    assert.equal(!!(lastGhOpts && lastGhOpts.ptsDemo), false);

    // PTS tester can enter Greenhouse through vines even at 0 bloomed
    const ptsEnv = loadRoom({
        localStorage: makeStorage(),
        player: { uid: 'u_vines_pts', name: 'PTS_V14', warmth: 0 },
        document: mockRoomDoc,
        cfg: { ENV: 'pts' },
        window: { SOMA_CONFIG: { ENV: 'pts' }, SOMA_GREENHOUSE: { open(o) { ghOpened++; lastGhOpts = o; } } }
    });
    ptsEnv.activateRoomObject('vines');
    assert.equal(ghOpened, 2, 'PTS tester enters Greenhouse via living vines');
    assert.equal(!!(lastGhOpts && lastGhOpts.ptsDemo), true);

    // 2. Fullscreen Greenhouse uses % + container-type: size + object-fit: contain (0px clipping on rotated iPhone!) + rotation-aware pedestal click
    assert.ok(ghCss.includes('.gh-overlay.is-in-fs') && ghCss.includes('container-type: size') && ghCss.includes('object-fit: contain'),
        'Fullscreen Greenhouse sizes strictly against rotated scene container with object-fit: contain');
    assert.ok(ghCss.includes('.gh-overlay.is-in-fs .gh-stage') && ghCss.includes('flex: 1 1 0') && ghCss.includes('min-height: 0'),
        'Conservatory stage flexes to fit 100% of dome, 8 pedestals, and central IX altar on screen at once');
    assert.ok(ghCode.includes('window.somaClientToLocal') && ghCode.includes('Math.min(lw / SCENE_W, lh / SCENE_H)'),
        'Conservatory click unprojects both scene rotation (±90°/180°) and object-fit: contain letterboxing');

    // 3. Fullscreen VHS studio 2-column % layout + mathematically verified rotated touch scroll across +90°, -90°, 180°, 0°
    assert.ok(vhsCss.includes('.vhs-overlay.is-in-scene') && vhsCss.includes('container-type: size')
        && vhsCss.includes('.vhs-overlay.is-in-scene .vhs-body') && vhsCss.includes('max-height: 95%'),
        'Fullscreen VHS fits 100% inside rotated scene container without dvh overflow');
    assert.ok(shareCss.includes('.soma-share-overlay.is-in-scene .soma-share-card') && shareCss.includes('max-height: 94%'),
        'Share modal also fits cleanly inside rotated Fullscreen scene');
    assert.ok(vhsCode.includes('bindSomaSceneScroll') && vhsCode.includes('#vhs-list') && vhsCode.includes('#vhs-crt-scroll'),
        'Both VHS cassette list and CRT message screen support rotated touch scrolling');

    // Verify exact scroll vector & live touch drag behavior on rotated +90°, -90°, and 180° Fullscreen!
    openEnv.roomAnim.isFullscreen = true;
    const listeners = {};
    const mockList = {
        scrollTop: 0, scrollHeight: 620, clientHeight: 220,
        offsetWidth: 280, offsetHeight: 220,
        setAttribute(k, v) { this[k] = v; },
        addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
        getBoundingClientRect: () => ({ left: 40, top: 300, width: 220, height: 280 })
    };
    openEnv.bindSomaSceneScroll(mockList);
    assert.equal(mockList['data-soma-scroll'], '1');

    // +90° (portrait iPhone standard landscape): local top is at screen RIGHT (+X) -> dragging right (+dx) scrolls DOWN (scrollTop increases)
    openEnv.roomAnim.fsLastDeg = 90;
    listeners.touchstart[0]({ touches: [{ identifier: 1, clientX: 120, clientY: 420 }] });
    listeners.touchmove[0]({ touches: [{ identifier: 1, clientX: 210, clientY: 420 }], cancelable: true, preventDefault() {}, stopPropagation() {} });
    listeners.touchend[0]({ touches: [] });
    assert.equal(mockList.scrollTop, 90, '+90° Fullscreen: finger drag toward local top (+X) scrolls VHS list down smoothly');

    // Suppress accidental click right after drag, then allow clean tap!
    let clickBlocked = false;
    listeners.click[0]({ preventDefault() { clickBlocked = true; }, stopPropagation() {} });
    assert.equal(clickBlocked, true, 'post-drag synthetic click suppressed cleanly');
    clickBlocked = false;
    listeners.touchstart[0]({ touches: [{ identifier: 2, clientX: 150, clientY: 420 }] });
    listeners.touchend[0]({ touches: [] });
    listeners.click[0]({ preventDefault() { clickBlocked = true; }, stopPropagation() {} });
    assert.equal(clickBlocked, false, 'clean cassette tap passes right through');

    // -90° (flipped 180° portrait iPhone): local top is at screen LEFT (-X) -> dragging left (-dx) scrolls DOWN further
    openEnv.roomAnim.fsLastDeg = -90;
    listeners.touchstart[0]({ touches: [{ identifier: 3, clientX: 200, clientY: 420 }] });
    listeners.touchmove[0]({ touches: [{ identifier: 3, clientX: 130, clientY: 420 }], cancelable: true, preventDefault() {}, stopPropagation() {} });
    listeners.touchend[0]({ touches: [] });
    assert.equal(mockList.scrollTop, 160, '-90° Fullscreen: finger drag toward local top (-X) scrolls VHS list down smoothly');

    // Verify somaClientToLocal unprojects rotated +90° coordinates with sub-pixel accuracy
    openEnv.roomAnim.fsLastDeg = 90;
    const locTopLeft = openEnv.somaClientToLocal(mockList, 40 + 220, 300); // top-right of screen bbox == local (0, 0) under +90° rotation!
    assert.ok(Math.abs(locTopLeft.x) < 0.01 && Math.abs(locTopLeft.y) < 0.01, 'somaClientToLocal maps +90° top-left corner identically to (0,0)');

    // 4. All 8 guardian dog breeds (0..6 + rare 0.1% White Maltese #7) preserve exact breeds/palettes, fix rgb() mixHex, and render cleanly in all phases & petting states
    const mixedTwice = openEnv.mixHex(openEnv.mixHex('#fff8ee', '#ffbe8a', 0.2), '#6b2534', 0.3);
    assert.ok(!mixedTwice.startsWith('rgb(0,0,0'), 'hexRgb cleanly parses rgb(...) strings so Samoyed & Maltese highlights stay pure snow');
    assert.equal(openEnv.DOG_BREEDS.length, 7);
    assert.equal(openEnv.RARE_MALTESE_BREED.pattern, 'maltese');
    const dCtx = makeMockCtx();
    for (let bi = 0; bi <= 7; bi++) {
        openEnv.roomAnim.inspectDogBreed = bi;
        for (const ph of [0, 1, 2, 3]) {
            openEnv.roomAnim.dogPetStart = -1e9;
            assert.doesNotThrow(() => openEnv.drawCompanionDog(dCtx, 2400, ph, false), `dog breed #${bi} sleeping in phase ${ph}`);
            openEnv.roomAnim.dogPetStart = 1850;
            assert.doesNotThrow(() => openEnv.drawCompanionDog(dCtx, 2400, ph, false), `dog breed #${bi} awake/petted in phase ${ph}`);
        }
    }
});

test('v15: 4th pot (pot_amethyst) + per-flower Greenhouse picker, sheer FS caption, Thaw WOW atmosphere, private pet names, Keepers heading, clean AV-88/VTR-90 corners, crimson vines, and accurate Boutique pet preview', () => {
    const fs = require('fs');
    const path = require('path');
    const ghCode = fs.readFileSync(path.join(__dirname, '..', 'greenhouse.js'), 'utf8');
    const ghCss = fs.readFileSync(path.join(__dirname, '..', 'greenhouse.css'), 'utf8');
    const rxCss = fs.readFileSync(path.join(__dirname, '..', 'receiver.css'), 'utf8');
    const vhsCss = fs.readFileSync(path.join(__dirname, '..', 'vhs.css'), 'utf8');
    const shareCode = fs.readFileSync(path.join(__dirname, '..', 'share.js'), 'utf8');
    const edgeFnCode = fs.readFileSync(path.join(__dirname, '..', 'billing/supabase/functions/soma-stars/index.ts'), 'utf8');

    // 1. Receiver & Tape Deck: zero top corner rivet dots (.rx-chassis::before/after & .vhs-chassis::before/after removed)
    assert.ok(!rxCss.includes('.rx-chassis::before') && !rxCss.includes('.rx-chassis::after'), 'Receiver top corner dots removed');
    assert.ok(!vhsCss.includes('.vhs-chassis::before') && !vhsCss.includes('.vhs-chassis::after'), 'VHS Tape Deck top corner dots removed');

    // 2. Fullscreen caption (.station-fs-caption): airy translucent glass, pointer-events: none, low-profile over sleeping dog
    const capBlock = (roomCss.match(/\.station-fs-caption\s*\{[\s\S]*?\}/) || [''])[0];
    assert.ok(capBlock.includes('pointer-events: none'), 'FS caption never blocks taps on sleeping dog');
    assert.ok(!capBlock.includes('0.82'), 'opaque 0.82 dark block removed from FS caption');
    assert.ok(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\.(30|32|34|40|42)\)/.test(capBlock), 'FS caption uses sheer translucent alpha <= 0.42');
    assert.ok(capBlock.includes('backdrop-filter: blur(4px)'), 'FS caption has refined soft glass blur');

    // 3. Full integrated PTS + PROD sandbox: room.js + cosmetics.js + greenhouse.js + share.js
    const vm = require('vm');
    const cosmCode = fs.readFileSync(path.join(__dirname, '..', 'cosmetics.js'), 'utf8');
    const makeEl = (id) => {
        const classes = new Set();
        return {
            id,
            textContent: '',
            innerHTML: '',
            value: '',
            title: '',
            style: {},
            dataset: {},
            attrs: {},
            setAttribute(k, v) { this.attrs[k] = v; },
            getAttribute(k) { return this.attrs[k]; },
            classList: {
                add: (...cs) => cs.forEach(c => classes.add(c)),
                remove: (...cs) => cs.forEach(c => classes.delete(c)),
                toggle: (c, f) => (f === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : (f ? classes.add(c) : classes.delete(c))),
                contains: (c) => classes.has(c)
            }
        };
    };
    const store = makeStorage();
    const sessStore = makeStorage();
    let isPts = true;
    const domMap = new Map();
    const regEl = (id) => {
        if (!domMap.has(id)) {
            const e = makeEl(id);
            e.innerHTML = '';
            e.value = '';
            e.children = [];
            e.appendChild = (c) => { e.children.push(c); return c; };
            e.querySelector = (sel) => domMap.get(sel.replace(/^#/, '')) || null;
            e.querySelectorAll = () => [];
            e.focus = () => {};
            e.select = () => {};
            domMap.set(id, e);
        }
        return domMap.get(id);
    };
    ['shop-body', 'shop-preview', 'shop-notice', 'shop-modal', 'shop-petname-input',
     'dossier-modal', 'dossier-card', 'dossier-body', 'station-tryon-bar', 'station-tryon-text',
     'station-tryon-buy', 'station-entry', 'station-mode', 'station-fs-caption', 'station', 'station-scene'].forEach(regEl);

    const makeMockCanvas = (w = 440, h = 460) => ({
        width: w, height: h, style: {}, dataset: {},
        classList: makeEl('cv').classList,
        getContext: () => ({
            canvas: { width: w, height: h },
            save() {}, restore() {}, clearRect() {}, fillRect() {}, strokeRect() {},
            beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {},
            bezierCurveTo() {}, arc() {}, ellipse() {}, clip() {}, fill() {}, stroke() {},
            translate() {}, rotate() {}, scale() {}, setLineDash() {}, drawImage() {},
            roundRect() {}, rect() {}, fillText() {}, strokeText() {},
            measureText: (t) => ({ width: String(t).length * 7 }),
            createLinearGradient: () => ({ addColorStop() {} }),
            createRadialGradient: () => ({ addColorStop() {} })
        })
    });

    const env = {
        window: {
            SOMA_CONFIG: { get ENV() { return isPts ? 'pts' : 'prod'; } },
            matchMedia: () => ({ matches: false }),
            addEventListener() {}, removeEventListener() {}
        },
        document: {
            hidden: false,
            body: regEl('body'),
            getElementById: (id) => domMap.get(id) || null,
            querySelectorAll: () => [],
            addEventListener() {},
            createElement: (tag) => {
                if (tag === 'canvas') return makeMockCanvas();
                const el = makeEl(tag);
                el.children = [];
                el.onclick = null;
                el.appendChild = (ch) => { el.children.push(ch); return ch; };
                el.querySelector = (sel) => {
                    const id = sel.replace(/^#/, '');
                    const walk = (n) => {
                        if (!n) return null;
                        if (n.id === id) return n;
                        for (const c of (n.children || [])) { const f = walk(c); if (f) return f; }
                        return null;
                    };
                    return walk(el);
                };
                return el;
            }
        },
        localStorage: store,
        sessionStorage: sessStore,
        performance: { now: () => 4800 },
        setTimeout: (fn) => { fn(); return 1; },
        clearTimeout() {},
        player: { uid: 'u_v15_check', warmth: 360, xp: 1200 },
        ranks: [{ minXp: 0, title: 'УР. 1' }, { minXp: 1000, title: 'УР. 6 // ВЕРШИНА' }],
        anonLabel: () => 'Аноним #7527',
        esc: s => String(s),
        SFX: { tap() {}, react() {}, block() {}, egg() {} },
        Math, Number, String, Boolean, Array, Object, Set, Map, JSON, Date, RegExp, parseInt, parseFloat, isNaN, isFinite
    };
    env.window.document = env.document;
    vm.runInNewContext(
        roomCode + '\n' + cosmCode + '\n'
        + 'Object.assign(globalThis, { SOMA_CATALOG, SHOP_GROUP_META, shopState, stationPhases, roomAnim, RARE_MOON_CAT_INDEX, RARE_MALTESE_INDEX });',
        env
    );
    env.window.bindSomaSceneScroll = env.bindSomaSceneScroll;
    env.window.somaClientToLocal = env.somaClientToLocal;

    // 4. 4th Master Pot `pot_amethyst`: equal 160 ⭐ tier + Edge Function parity + draws cleanly across all pot shapes
    const pots = env.SOMA_CATALOG.filter(i => i.slot === 'pot');
    assert.deepEqual(Array.from(pots, p => p.id), ['pot_cinnabar', 'pot_moon', 'pot_kintsugi', 'pot_amethyst'], '4 Master Pots present');
    assert.deepEqual([...new Set(Array.from(pots, p => p.stars))], [160], 'all 4 Master Pots share 160 ⭐ peer price');
    assert.ok(edgeFnCode.includes("pot_amethyst:") && edgeFnCode.includes("stars: 160"), 'Edge Function has pot_amethyst at 160 ⭐');
    for (let k = 0; k < 8; k++) {
        const sp = env.gallerySpecForKind(k, env.plantSpec());
        assert.doesNotThrow(() => env.drawPlantSprite(makeMockCanvas().getContext('2d'), sp, 5, { potSkin: 'pot_amethyst', now: 3200, phase: 1 }));
    }
    assert.doesNotThrow(() => env.drawPlantSprite(makeMockCanvas().getContext('2d'), env.alienSpec(), 5, { potSkin: 'pot_amethyst', now: 3200, phase: 3 }));
    assert.doesNotThrow(() => env.drawPlantSprite(makeMockCanvas().getContext('2d'), env.alienSpec(), 5, { potSkin: 'default', now: 3200, phase: 3 }));

    // 5. Per-flower pot selection in Greenhouse (each flower keeps its own vessel + PROD ownership gating + FS zero-clip CSS)
    assert.equal(env.setGreenhouseFlowerPot(0, 'pot_amethyst'), true);
    assert.equal(env.setGreenhouseFlowerPot(3, 'pot_moon'), true);
    assert.equal(env.setGreenhouseFlowerPot(6, 'pot_cinnabar'), true);
    assert.equal(env.setGreenhouseFlowerPot(7, 'default'), true);
    assert.equal(env.setGreenhouseFlowerPot('alien', 'pot_amethyst'), true);
    assert.equal(env.potSkinForFlower(0, 'pot_kintsugi'), 'pot_amethyst');
    assert.equal(env.potSkinForFlower(3, 'pot_kintsugi'), 'pot_moon');
    assert.equal(env.potSkinForFlower(6, 'pot_kintsugi'), 'pot_cinnabar');
    assert.equal(env.potSkinForFlower(7, 'pot_kintsugi'), 'default', 'explicit default clay overrides global pot');
    assert.equal(env.potSkinForFlower('alien', 'pot_kintsugi'), 'pot_amethyst', 'alien respects chosen amethyst pot');
    assert.equal(env.setGreenhouseFlowerPot('alien', 'default'), true);
    assert.equal(env.potSkinForFlower('alien', 'pot_kintsugi'), 'default', 'alien respects explicit native clay choice');
    assert.ok(ghCode.includes('id="gh-pot-bar"') && ghCode.includes('pot_amethyst') && ghCode.includes('setGreenhouseFlowerPot'));
    assert.ok(ghCss.includes('.gh-overlay.is-in-fs .gh-pot-txt') && ghCss.includes('.gh-pot-opt--amethyst'), 'FS Greenhouse keeps compact pot gems with 0 clipping');
    assert.ok(shareCode.includes('activeRoomPotSkin') && shareCode.includes('potSkinForFlower'), 'Share postcards reflect chosen per-flower pots');

    // PROD ownership gate: unowned pot cannot be set; owned pot works!
    isPts = false;
    assert.equal(env.setGreenhouseFlowerPot(2, 'pot_amethyst'), false, 'PROD rejects unowned pot_amethyst');
    env.grantOwnedItem('pot_amethyst');
    assert.equal(env.setGreenhouseFlowerPot(2, 'pot_amethyst'), true, 'PROD accepts owned pot_amethyst');
    assert.equal(env.potSkinForFlower(2, ''), 'pot_amethyst');
    assert.equal(env.potSkinForFlower(3, ''), '', 'PROD gracefully falls back if PTS-chosen pot is not owned');
    isPts = true;

    // 6. Companion heading strictly `// ХРАНИТЕЛИ ТЕПЛА` (zero `по ID`, zero `спутники`, zero `можно обоих/двоих`)
    assert.equal(env.SHOP_GROUP_META.companion.title, '// ХРАНИТЕЛИ ТЕПЛА');
    env.switchShopTab('room');
    const roomShopHtml = regEl('shop-body').innerHTML;
    assert.ok(roomShopHtml.includes('// ХРАНИТЕЛИ ТЕПЛА'), 'Boutique Room shows ХРАНИТЕЛИ ТЕПЛА');
    assert.ok(!/спутники|можно обоих|можно двоих|по id/i.test(roomShopHtml), 'zero mentions of ID or dual-equip hint in Boutique Room');

    // 7. IMG_2254.png FIX: Selecting 0.1% Moon Cat + 0.1% White Yuna (even after closing PTS drawer!) displays exact names in Boutique preview!
    env.grantOwnedItem('room_cat');
    env.grantOwnedItem('room_dog');
    env.roomAnim.inspectCatCoat = env.RARE_MOON_CAT_INDEX;   // 7 -> Полуночная Луна
    env.roomAnim.inspectDogBreed = env.RARE_MALTESE_INDEX;   // 7 -> Белая Юна
    env.roomAnim.ptsOpen = true;
    env.togglePtsDrawer(); // collapse PTS drawer — must NOT wipe chosen cat/dog!
    env.renderShop();
    const prevHtml = regEl('shop-preview').innerHTML;
    assert.ok(prevHtml.includes('🐈 Полуночная Луна'), 'Boutique preview shows selected 0.1% Black Moon Cat');
    assert.ok(prevHtml.includes('🐕 Белая Юна'), 'Boutique preview shows selected 0.1% White Yuna');
    assert.ok(!prevHtml.includes('Рыжий огонёк') && !prevHtml.includes('Рыжий сиба-ину'), 'never falls back to wrong index-0 names');

    // 8. Custom Cat & Dog naming: prompted on purchase, validated, displayed STRICTLY in room interaction journal and NOWHERE else!
    const freshPetEnv = () => {
        env.shopState.owned = env.shopState.owned.filter(x => x !== 'room_cat' && x !== 'room_dog');
        env.purchaseCosmetic('room_cat');
        assert.equal(env.shopState.namingPet, 'cat', 'purchasing cat immediately opens naming prompt');
        assert.ok(regEl('shop-body').innerHTML.includes('shop-petname-input'), 'naming input rendered right inside Boutique card');
        env.purchaseCosmetic('room_dog');
        assert.equal(env.shopState.namingPet, 'dog', 'purchasing dog immediately opens naming prompt');
    };
    freshPetEnv();
    assert.equal(env.sanitizePetName('https://spam.ru').ok, false, 'blocks URLs in pet names');
    assert.equal(env.sanitizePetName('@badhandle').ok, false, 'blocks @handles in pet names');
    assert.equal(env.sanitizePetName('ОченьДлинноеИмяПитомца123').ok, false, 'caps pet name at 20 chars');
    regEl('shop-petname-input').value = 'Нокс';
    env.saveMyPetName('cat');
    regEl('shop-petname-input').value = 'Юки';
    env.saveMyPetName('dog');
    assert.equal(env.getPetName('cat'), 'Нокс');
    assert.equal(env.getPetName('dog'), 'Юки');

    // Privacy guarantee: custom pet names NEVER leak into Boutique preview, item descriptions, or Top dossier!
    env.shopState.namingPet = '';
    env.renderShop();
    assert.ok(!regEl('shop-preview').innerHTML.includes('Нокс') && !regEl('shop-preview').innerHTML.includes('Юки'), 'pet names never appear in Boutique preview banner');
    assert.ok(!regEl('shop-body').innerHTML.includes('Нокс') && !regEl('shop-body').innerHTML.includes('Юки'), 'pet names never appear on Boutique cards when editor closed');
    // Room interaction journal DOES warmly feature both custom names!
    const catJournalLines = [];
    const dogJournalLines = [];
    for (let i = 0; i < 3; i++) {
        env.activateRoomObject('bed');
        catJournalLines.push(regEl('station-entry').textContent);
        env.activateRoomObject('dog');
        dogJournalLines.push(regEl('station-entry').textContent);
    }
    assert.ok(catJournalLines.every(l => l.includes('Нокс')), 'every cat interaction journal line addresses the cat by its custom name');
    assert.ok(catJournalLines.some(l => l.includes('Юки')), 'duet cat line also names the sleeping dog friend');
    assert.ok(dogJournalLines.every(l => l.includes('Юки')), 'every dog interaction journal line addresses the dog by its custom name');
    assert.ok(dogJournalLines.some(l => l.includes('Нокс')), 'duet dog line also names the purring cat friend');
    assert.ok(!regEl('station-mode').textContent.includes('Нокс') && !regEl('station-mode').textContent.includes('Юки'), 'pet names stay strictly inside journal body text');

    // 9. «Оттепель» (Phase 1) WOW overhaul: clipped-sky lunar halo + moon + clouds + mist + 8 icicles w/ live капель + volumetric room beams!
    let thawClips = 0, thawArcs = 0, thawEllipses = 0, beamArcs = 0;
    const recGrad = { addColorStop() {} };
    const thawCtx = {
        save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
        quadraticCurveTo() {}, bezierCurveTo() {}, fillRect() {}, strokeRect() {},
        fill() {}, stroke() {}, translate() {}, rotate() {}, scale() {},
        clip() { thawClips++; },
        arc() { thawArcs++; },
        ellipse() { thawEllipses++; },
        createLinearGradient: () => recGrad,
        createRadialGradient: () => recGrad
    };
    env.drawWindowWorld(thawCtx, 5200, 1, 0.25);
    assert.ok(thawClips >= 2 && thawArcs >= 45 && thawEllipses >= 12, 'Phase 1 Thaw draws clipped sky, lunar 22° halo, stars, clouds, mist, and live icicle melt drops');
    const beamCtx = { ...thawCtx, arc() { beamArcs++; } };
    env.drawWindowLightBeams(beamCtx, 5200, 1, 0.25);
    assert.ok(beamArcs >= 7, 'Phase 1 Thaw casts 6 volumetric moonlit beams + shimmering rug reflection into the room');
    assert.ok(env.stationPhases[1].entry.includes('гало') && env.stationPhases[1].entry.includes('капель'), 'Thaw phase caption reflects lunar halo & melting капель');

    // 10. Harmonized crimson-garnet hanging vines: ZERO green-dominant colors across ALL 4 phases (locked, open, and 8/8 secret)!
    const recordedStyles = [];
    const parseRgb = (s) => {
        if (typeof s !== 'string') return null;
        let m = s.match(/^#([0-9a-f]{6})$/i);
        if (m) {
            const n = parseInt(m[1], 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        }
        m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        return m ? [+m[1], +m[2], +m[3]] : null;
    };
    const vineCtx = {
        save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
        quadraticCurveTo() {}, bezierCurveTo() {}, arc() {}, ellipse() {}, fill() {}, stroke() {},
        translate() {}, rotate() {}, scale() {},
        set fillStyle(v) { recordedStyles.push(v); },
        set strokeStyle(v) { recordedStyles.push(v); },
        createLinearGradient: () => ({ addColorStop(_, c) { recordedStyles.push(c); } }),
        createRadialGradient: () => ({ addColorStop(_, c) { recordedStyles.push(c); } })
    };
    for (const ph of [0, 1, 2, 3]) {
        env.drawGreenhouseVines(vineCtx, 3100, ph);
    }
    const greenColors = recordedStyles.filter(c => {
        const rgb = parseRgb(c);
        return rgb && rgb[1] > rgb[0] + 4; // G strictly exceeding R = greenish!
    });
    assert.equal(greenColors.length, 0, `Hanging vines draw ZERO green colors (found: ${greenColors.join(', ')})`);
    assert.ok(recordedStyles.length > 200, 'Hanging vines render rich layered crimson-garnet foliage & buds');
});


test('profanity filter blocks toxic text and obfuscation in whisper validation', () => {
    const r = loadRoom();
    assert.equal(typeof r.somaTextBlocked, 'function');
    assert.equal(r.somaTextBlocked('Ты ублюдок, иди на хуй!'), true);
    assert.equal(r.somaTextBlocked('х——у…..—-й'), true);
    assert.equal(r.somaTextBlocked('ХУЙ'), true);
    assert.equal(r.somaTextBlocked('просто хороший день'), false);
    // whisper validation rejects toxic text, keeps clean text
    assert.equal(r.validateWhisperText('Ты сука, замолчи.').ok, false);
    assert.equal(r.validateWhisperText('Пусть сегодня станет немного легче.').ok, true);
});

test('live Whisper validates 13..333 characters without a warmth or lesson gate', () => {
    const r = loadRoom();
    assert.equal('WHISPER_TRAINER_GATE' in r.PROGRESSION_RULES, false);
    assert.equal('WHISPER_WARMTH_GATE' in r.PROGRESSION_RULES, false);
    for (const n of [0, 12, 334]) assert.equal(r.validateWhisperText('я'.repeat(n)).ok, false);
    for (const n of [13, 333]) assert.equal(r.validateWhisperText('я'.repeat(n)).ok, true);
    for (const text of ['напишите мне @someone', 'ссылка https://example.com', 'телефон +12345678901']) {
        assert.equal(r.validateWhisperText(text).ok, false);
    }
    assert.equal(r.whisperAdmission(100, { trainedTotal: 12 }).admitted, false);
    assert.equal(r.whisperAdmission(100, { trainedTotal: 13 }).admitted, false, 'rules apply even to experienced players');
    r.acceptFirstSignalRules();
    assert.equal(r.whisperAdmission(0, { trainedTotal: 0 }).admitted, true);
});

test('Whisper sends once per post, caps at three per day, and grants only warmth (no XP)', async () => {
    const player = { uid: 'u_0123456789abcdef', warmth: 100 };
    const localStorage = makeStorage({ soma_signal_rules_v1: 'accepted', soma_warmth_ledger: JSON.stringify({ day: '2026-11-18', trainedTotal: 0 }) });
    const r = loadRoom({ player, localStorage });
    const opts = { today: '2026-11-18', skipCloud: true };
    const text = 'Пусть сегодня станет немного легче.';
    assert.equal((await r.sendWhisperToPost({ id: 'post_1' }, text, opts)).ok, true);
    assert.equal((await r.sendWhisperToPost({ id: 'post_1' }, text, opts)).code, 'already_whispered');
    for (const id of ['post_2', 'post_3']) assert.equal((await r.sendWhisperToPost({ id }, text, opts)).ok, true);
    assert.equal((await r.sendWhisperToPost({ id: 'post_4' }, text, opts)).code, 'daily_cap');
    assert.equal(player.xp, undefined, 'XP removed — player.xp must not exist');
    assert.equal(player.warmth, 100, 'sending whispers grants warmth only, no XP');
    assert.equal((await r.sendWhisperToPost({ id: 'post_4' }, text, { ...opts, today: '2026-11-19' })).ok, true);
});

test('Whisper reply: sends once with p_reply_to, free of daily cap, marks original handled', async () => {
    const calls = [];
    const supabaseClient = {
        async rpc(name, args) {
            calls.push({ name, args });
            if (name === 'send_soma_whisper') {
                return {
                    error: null,
                    data: [{ id: args.p_id, reply_to_id: args.p_reply_to, status: 'pending' }]
                };
            }
            return { error: null, data: [] };
        }
    };
    // Личный счётчик уже исчерпан (3/3) — ответ НЕ должен сработать лимит.
    const ledger = JSON.stringify({ day: '2026-11-18', whisperSentToday: 3, whispersSent: 3 });
    const player = { uid: 'u_0123456789abcdef', warmth: 100 };
    const r = loadRoom({ player, localStorage: makeStorage({ soma_signal_rules_v1: 'accepted', soma_warmth_ledger: ledger }), supabaseClient });
    // Исходный входящий шёпот в переполненном ящике.
    r.receiveIncomingWhisperLocal({ id: 'w_in_1', post_id: 'p_a1', text: 'Пусть сегодня станет немного легче.' });
    assert.equal(r.getPendingInboxWhispers().length, 1);

    const res = await r.sendWhisperReply({ id: 'w_in_1', post_id: 'p_a1', post_tag: 'ЛИЧНАЯ БОЛЬ', text: 'Пусть сегодня станет немного легче.' }, 'Это тёплый ответ на ваше сообщение.', { today: '2026-11-18' });
    assert.equal(res.ok, true, 'reply succeeds even with exhausted daily cap');

    const call = calls.find(c => c.name === 'send_soma_whisper');
    assert.ok(call, 'send_soma_whisper called');
    assert.equal(call.args.p_reply_to, 'w_in_1', 'p_reply_to carries the incoming whisper id');
    assert.equal(call.args.p_text, 'Это тёплый ответ на ваше сообщение.');
    // Оригинальный шёпот снят с входящих (handled).
    assert.equal(r.getPendingInboxWhispers().length, 0, 'answered whisper removed from inbox');

    // Личный счётчик не потрачен: whisperSentToday остаётся 3, общий счётчик +1.
    const after = r.loadWarmthLedger('2026-11-18');
    assert.equal(after.whisperSentToday, 3, 'daily cap counter unchanged');
    assert.equal(after.whispersSent, 4, 'total whisper counter incremented');

    // Короткий / пустой ответ — rejected до сети.
    const short = await r.sendWhisperReply({ id: 'w_in_1', post_id: 'p_a1', text: 'Пусть сегодня станет немного легче.' }, 'коротко');
    assert.equal(short.ok, false);
    assert.equal(short.code, 'invalid_text');
});

test('incoming Whispers can be recorded or dismissed even without sender admission', async () => {
    const r = loadRoom();
    for (const id of ['incoming_1', 'incoming_2']) r.receiveIncomingWhisperLocal({ id, text: 'Пусть сегодня станет немного легче.' });
    assert.equal(r.getPendingInboxWhispers().length, 2);
    assert.equal((await r.acceptIncomingWhisper('incoming_1')).ok, true);
    assert.equal(r.loadCassettes().length, 1);
    assert.equal((await r.acceptIncomingWhisper('incoming_1')).ok, false);
    assert.equal((await r.dismissIncomingWhisper('incoming_2')).ok, true);
    assert.equal(r.loadCassettes().length, 1);
    assert.equal(r.getPendingInboxWhispers().length, 0);
    assert.equal(r.receiveIncomingWhisperLocal({ id: 'incoming_2', text: 'Пусть сегодня станет немного легче.' }), null);
});

test('cassette echoes grant +4 plant warmth and no XP at most once daily and never twice per ID', () => {
    const player = { uid: 'u_0123456789abcdef', warmth: 0 };
    const r = loadRoom({ player });
    const a = r.claimWhisperCassetteAck('echo_1', '2026-11-18');
    assert.equal(a.grantedWarmth, 4);
    assert.equal(a.grantedXp, undefined, 'XP removed — grantedXp no longer returned');
    assert.equal(r.claimWhisperCassetteAck('echo_2', '2026-11-18').grantedWarmth, 0);
    assert.equal(r.claimWhisperCassetteAck('echo_2', '2026-11-18').duplicate, true, 'the same saved Whisper ID cannot be claimed twice');
    assert.equal(r.claimWhisperCassetteAck('echo_1', '2026-11-19').duplicate, true);
    assert.equal(r.claimWhisperCassetteAck('echo_3', '2026-11-19').grantedWarmth, 4);
    assert.equal(player.warmth, 8);
    assert.equal(player.xp, undefined, 'XP removed — player.xp must not exist');
});

test('failed cloud cassette acknowledgement leaves the inbox retryable', async () => {
    const supabaseClient = { from: () => ({ update: () => ({ eq: () => ({ select: async () => ({ data: null, error: { message: 'offline' } }) }) }) }) };
    const r = loadRoom({ supabaseClient });
    r.receiveIncomingWhisperLocal({ id: 'retry_1', text: 'Пусть сегодня станет немного легче.' });
    assert.equal((await r.acceptIncomingWhisper('retry_1')).ok, false);
    assert.equal(r.getPendingInboxWhispers().length, 1);
    assert.equal(r.loadCassettes().length, 0);
    assert.equal((await r.dismissIncomingWhisper('retry_1')).ok, false);
    assert.equal(r.getPendingInboxWhispers().length, 1);
});

test('Whisper schema restricts participants and sender identity, with a serialized server cap', () => {
    const sql = readFileSync(require.resolve('../billing/setup_stars.sql'), 'utf8');
    assert.ok(sql.includes('revoke all on public.soma_whispers from anon, authenticated'));
    assert.ok(sql.includes('sender_auth_id = auth.uid() or public.owns_soma_post(post_id)'));
    assert.ok(sql.includes('pg_advisory_xact_lock'));
    assert.ok(sql.includes('Post has no verified recipient'));
    assert.ok(sql.includes('on public.soma_whispers(post_id, sender_auth_id)'));
    assert.ok(sql.trim().endsWith('commit;'));
});

test('zero-warmth players can send three daily after rules, while channel-off still prevents real sends', async () => {
    const window = { SOMA_CONFIG: { WHISPER_LIVE: true } };
    const player = { uid: 'u_0123456789abcdef', warmth: 0, xp: 0 };
    const r = loadRoom({ window, player });
    assert.equal(r.whisperAdmission(0).admitted, false);
    r.acceptFirstSignalRules();
    assert.equal(r.whisperAdmission(0).admitted, true);
    const opts = { today: '2026-11-18', skipCloud: true };
    for (const id of ['test_a', 'test_b', 'test_c']) {
        assert.equal((await r.sendWhisperToPost({ id }, 'Пусть сегодня станет немного легче.', opts)).ok, true);
    }
    assert.equal((await r.sendWhisperToPost({ id: 'test_d' }, 'Пусть сегодня станет немного легче.', opts)).code, 'daily_cap');
    window.SOMA_CONFIG.WHISPER_LIVE = false;
    assert.equal((await r.sendWhisperToPost({ id: 'test_e' }, 'Пусть сегодня станет немного легче.')).code, 'channel_disabled');
});



test('rare dog is White Yuna throughout user-facing copy without changing its rarity or appearance', () => {
    const r = loadRoom();
    const dog = r.RARE_MALTESE_BREED;
    assert.equal(dog.name, 'Белая Юна');
    assert.equal(dog.pattern, 'maltese');
    assert.equal(r.RARE_MALTESE_INDEX, 7);
    const cosmetics = readFileSync(require.resolve('../cosmetics.js'), 'utf8');
    assert.ok(cosmetics.includes('Белая Юна'));
    assert.ok(!/Лунная Юна/i.test(roomCode + cosmetics));
});

test('rules are remembered after reload and subsequent sends stay open at zero warmth', async () => {
    const localStorage = makeStorage();
    const window = { SOMA_CONFIG: { WHISPER_LIVE: true } };
    let r = loadRoom({ window, localStorage });
    const opts = { today: '2026-11-18', skipCloud: true };
    const text = 'Пусть сегодня станет немного легче.';
    assert.equal(r.whisperAdmission(0).firstAvailable, true);
    assert.equal(r.whisperAdmission(0).admitted, false);
    assert.equal((await r.sendWhisperToPost({ id: 'post_first' }, text, opts)).code, 'locked');
    assert.equal(r.acceptFirstSignalRules(), true);
    assert.equal(r.whisperAdmission(0).admitted, true);
    assert.equal((await r.sendWhisperToPost({ id: 'post_first' }, text, opts)).ok, true);
    r = loadRoom({ window, localStorage });
    assert.equal(r.whisperAdmission(0).firstAvailable, false);
    assert.equal((await r.sendWhisperToPost({ id: 'post_next' }, text, opts)).ok, true);
    assert.equal(r.whisperAdmission(100, { ...r.loadWarmthLedger(), trainedTotal: 13 }).admitted, true);
});

test('first send failure does not consume the opportunity, award XP, or fake delivery', async () => {
    const localStorage = makeStorage();
    const player = { uid: 'u_0123456789abcdef', warmth: 0, xp: 0 };
    const window = { SOMA_CONFIG: { WHISPER_LIVE: true } };
    const supabaseClient = { from: () => ({ insert: async () => ({ error: { message: 'offline' } }) }) };
    const r = loadRoom({ localStorage, player, window, supabaseClient });
    r.acceptFirstSignalRules();
    const res = await r.sendWhisperToPost({ id: 'post_retry' }, 'Пусть сегодня станет немного легче.', { allowOfflineFallback: true });
    assert.equal(res.code, 'network_error');
    assert.equal(r.whisperAdmission(0).firstAvailable, true);
    assert.equal(r.loadWarmthLedger().whispersSent, 0);
    assert.equal(r.hasWhisperedToPost('post_retry'), false);
    assert.equal(player.xp, 0);
    assert.equal(JSON.parse(localStorage.getItem('soma_signal_metrics_v1')).send_success, 0);
    const noClient = loadRoom({ localStorage, window });
    assert.equal((await noClient.sendWhisperToPost({ id: 'post_retry' }, 'Пусть сегодня станет немного легче.')).code, 'network_error');
});

test('first signal filters demos and own posts and does not create fabricated messages', async () => {
    const localStorage = makeStorage({ soma_my_posts: '["post_mine"]' });
    const r = loadRoom({ localStorage, window: { SOMA_CONFIG: { WHISPER_LIVE: true } } });
    const posts = [{ id: 'demo_1' }, { id: 'post_demo', isDemo: true }, { id: 'post_mine' }, null, { id: 'post_live' }];
    assert.equal(JSON.stringify(r.getFirstSignalCandidates(posts)), '[{"id":"post_live"}]');
    assert.equal(r.getFirstSignalCandidates([]).length, 0);
    assert.equal((await r.sendWhisperToPost(posts[0], 'Пусть сегодня станет немного легче.')).code, 'demo_post');
    assert.ok(!indexHtml.includes("id: 'demo_1'"));
});

test('first-session pager opens a preview, while feed reply still opens the composer', () => {
    const r = loadRoom();
    r.openFirstSignalSession('post_real_1');
    assert.equal(r.roomAnim.pagerRequestedPostId, 'post_real_1');
    assert.equal(r.roomAnim.pagerComposingPostId, '', 'first-session CTA does not jump straight into a reply');
    r.openWhisperForPost('post_real_2');
    assert.equal(r.roomAnim.pagerComposingPostId, 'post_real_2', 'reply button keeps direct composition behavior');
});

test('reading and skipping are available before rules; rules appear only for a chosen reply', () => {
    const feedBranch = roomCode.slice(
        roomCode.indexOf('Reading/skipping stay open; the short rules are required only after choosing to compose.'),
        roomCode.indexOf('if (footEl)', roomCode.indexOf('Reading/skipping stay open;'))
    );
    assert.ok(feedBranch.includes('isComposing && !adm.rulesAccepted'));
    assert.ok(feedBranch.includes('data-act="read"') && feedBranch.includes('data-act="skip"'));
    assert.ok(!/if\s*\(!adm\.rulesAccepted\)\s*\{\s*bodyEl\.innerHTML/.test(feedBranch));
});

test('first-session and pager candidates preserve reader hide and topic-intent filters', () => {
    const candidates = [
        { id: 'post_visible' },
        { id: 'post_hidden' },
        { id: 'demo_test', isDemo: true }
    ];
    const r = loadRoom({
        feedPosts: candidates,
        contactPosts: () => [candidates[0]],
        localStorage: makeStorage()
    });
    assert.deepEqual(r.getVisibleFirstSignalCandidates().map(post => post.id), ['post_visible']);
});

test('first session is dismissible, offers only a real visible post, and leaves a private room glow after reading', () => {
    const posts = [{ id: 'demo_1' }, { id: 'post_mine' }, { id: 'post_live', text: 'Тихий настоящий сигнал.' }];
    const localStorage = makeStorage({ soma_my_posts: '["post_mine"]' });
    const elements = new Map([
        ['first-signal-entry', { hidden: true, dataset: {} }],
        ['first-session-copy', { textContent: '' }],
        ['first-session-open', { hidden: false, disabled: false }],
        ['first-session-look', { hidden: false }],
        ['station', { dataset: {} }]
    ]);
    const document = { getElementById: id => elements.get(id) || null };
    const player = { uid: 'u_0123456789abcdef', name: 'AGENT_1001', warmth: 0, xp: 71 };
    const window = {
        SOMA_CONFIG: { WHISPER_LIVE: true },
        SOMA_SIGNALS: { visiblePosts: rows => rows }
    };
    const r = loadRoom({ localStorage, document, window, player, feedPosts: posts, contactPosts: () => posts });
    r.renderFirstSignalEntry();
    assert.equal(elements.get('first-signal-entry').hidden, false);
    assert.equal(elements.get('first-session-open').hidden, false);
    assert.match(elements.get('first-session-copy').textContent, /настоящая история/);
    assert.equal(r.completeFirstSession('read'), true);
    assert.equal(elements.get('first-signal-entry').hidden, true);
    assert.equal(elements.get('station').dataset.firstSignal, 'seen');
    assert.equal(localStorage.getItem('soma_first_session_v1'), 'read');
    assert.equal(player.xp, 71, 'the private room mark gives no XP');

    const skipStorage = makeStorage();
    const skipElements = new Map([
        ['first-signal-entry', { hidden: true, dataset: {} }],
        ['station', { dataset: {} }]
    ]);
    const skipPlayer = { uid: 'u_0123456789abcdef', name: 'AGENT_1001', warmth: 0, xp: 71 };
    const skipRoom = loadRoom({
        localStorage: skipStorage,
        document: { getElementById: id => skipElements.get(id) || null },
        window,
        player: skipPlayer
    });
    assert.equal(skipRoom.completeFirstSession('skip'), true);
    assert.equal(skipElements.get('station').dataset.firstSignal, undefined, 'skipping does not produce the private read glow');
    assert.equal(skipPlayer.xp, 71, 'skipping has no reward or penalty');

    const emptyStorage = makeStorage();
    const emptyElements = new Map([
        ['first-signal-entry', { hidden: true, dataset: {} }],
        ['first-session-copy', { textContent: '' }],
        ['first-session-open', { hidden: false, disabled: false }],
        ['first-session-look', { hidden: false }]
    ]);
    const emptyRoom = loadRoom({
        localStorage: emptyStorage,
        document: { getElementById: id => emptyElements.get(id) || null },
        window,
        feedPosts: [],
        contactPosts: () => []
    });
    emptyRoom.renderFirstSignalEntry();
    assert.equal(emptyElements.get('first-signal-entry').hidden, false);
    assert.equal(emptyElements.get('first-session-open').hidden, true);
    assert.match(emptyElements.get('first-session-copy').textContent, /нет подходящей истории/);
    assert.equal(emptyRoom.completeFirstSession('invalid'), false);
    assert.ok(indexHtml.includes('Отправить сигнал'));
    assert.ok(!/незнакомец оставил вам сигнал/i.test(indexHtml));
});

test('funnel metrics accept only fixed event names and never save supplied message payloads', () => {
    const localStorage = makeStorage({ soma_signal_metrics_v1: '{"secret":"private message","entry_view":2}' });
    const r = loadRoom({ localStorage });
    assert.equal(r.trackFirstSignalEvent('entry_view', { text: 'secret message', uid: 'u_private' }), true);
    assert.equal(r.trackFirstSignalEvent('secret message'), false);
    const raw = localStorage.getItem('soma_signal_metrics_v1');
    const counts = JSON.parse(raw);
    assert.equal(counts.entry_view, 3);
    assert.ok(!raw.includes('secret') && !raw.includes('uid') && !raw.includes('text'));
});

test('concurrent sends are serialized without locking subsequent zero-warmth sends', async () => {
    let finish;
    const rpc = new Promise(resolve => { finish = resolve; });
    const r = loadRoom({
        window: { SOMA_CONFIG: { WHISPER_LIVE: true } },
        supabaseClient: { rpc: () => rpc }
    });
    r.acceptFirstSignalRules();
    const text = 'Пусть сегодня станет немного легче.';
    const pending = r.sendWhisperToPost({ id: 'post_a' }, text);
    assert.equal((await r.sendWhisperToPost({ id: 'post_b' }, text)).code, 'busy');
    finish({ data: [{ o_id: 'w_test', o_status: 'pending' }], error: null });
    assert.equal((await pending).ok, true);
    assert.equal((await r.sendWhisperToPost({ id: 'post_b' }, text)).ok, true);
});

test('new names stay consistent without changing progression bindings', () => {
    const cosmetics = readFileSync(require.resolve('../cosmetics.js'), 'utf8');
    const share = readFileSync(require.resolve('../share.js'), 'utf8');
    assert.ok(indexHtml.includes('Отправить сигнал'));
    assert.ok(indexHtml.includes('ЖИВАЯ ЧАСТОТА'));
    assert.ok(!indexHtml.includes('ИНДЕКС РАВНОДУШИЯ'));
    assert.ok(!/Лента контакта|ЛЕНТА КОНТАКТА|СОЗВЕЗДИЕ СТАНЦИИ/.test(indexHtml + cosmetics + share + roomCode));
});

test('safety RPCs stay disabled until the SQL migration is explicitly enabled', async () => {
    let calls = 0;
    const r = loadRoom({ window: { SOMA_CONFIG: {} }, supabaseClient: { rpc: async () => { calls++; return { data: true }; } } });
    assert.equal((await r.reportIncomingWhisper('in_1', 'spam')).ok, false);
    assert.equal((await r.blockIncomingWhisper('in_1')).ok, false);
    assert.equal(calls, 0);
});

test('reporting confirms only a valid server response and never rewards the player', async () => {
    const calls = [];
    const player = { uid: 'u_0123456789abcdef', warmth: 0, xp: 0 };
    const r = loadRoom({ player, window: { SOMA_CONFIG: { WHISPER_SAFETY_LIVE: true } }, supabaseClient: { rpc: async (name, args) => { calls.push({ name, args }); return { data: true, error: null }; } } });
    assert.equal((await r.reportIncomingWhisper('in_1', 'invalid')).ok, false);
    assert.equal(calls.length, 0);
    assert.equal((await r.reportIncomingWhisper('in_1', 'harassment')).ok, true);
    assert.equal(calls[0].name, 'report_soma_whisper');
    assert.equal(JSON.stringify(calls[0].args), '{"p_whisper_id":"in_1","p_reason":"harassment"}');
    assert.equal(player.xp, 0);
    assert.equal(player.warmth, 0);
});

test('server-confirmed block removes only returned incoming IDs and leaves cassettes intact', async () => {
    const localStorage = makeStorage();
    const r = loadRoom({ localStorage, window: { SOMA_CONFIG: { WHISPER_SAFETY_LIVE: true } }, supabaseClient: { rpc: async () => ({ data: ['in_1'], error: null }) } });
    for (const id of ['in_1', 'in_2']) r.receiveIncomingWhisperLocal({ id, text: 'Пусть сегодня станет немного легче.' });
    r.saveWhisperCassette('Сохранённая кассета не должна пропасть.');
    const archive = localStorage.getItem('soma_cassettes');
    assert.equal((await r.blockIncomingWhisper('in_1')).ok, true);
    assert.equal(r.getPendingInboxWhispers().length, 1);
    assert.equal(r.getPendingInboxWhispers()[0].id, 'in_2');
    assert.equal(localStorage.getItem('soma_cassettes'), archive);
});

test('failed safety actions never pretend to report, hide an inbox item or unblock', async () => {
    const r = loadRoom({ window: { SOMA_CONFIG: { WHISPER_SAFETY_LIVE: true } }, supabaseClient: { rpc: async () => ({ data: null, error: { message: 'missing migration' } }) } });
    r.receiveIncomingWhisperLocal({ id: 'in_retry', text: 'Пусть сегодня станет немного легче.' });
    assert.equal((await r.blockIncomingWhisper('in_retry')).ok, false);
    assert.equal((await r.reportIncomingWhisper('in_retry', 'spam')).ok, false);
    assert.equal((await r.unblockWhisperSender('in_retry')).ok, false);
    assert.equal(r.getPendingInboxWhispers().length, 1);
});

test('block management keeps only safe anchor/date fields, and validates RPC payloads', async () => {
    let payload = [{ anchor_id: 'in_anchor', created_at: '2026-11-18', sender_id: 'not-for-client' }];
    const r = loadRoom({ window: { SOMA_CONFIG: { WHISPER_SAFETY_LIVE: true } }, supabaseClient: { rpc: async () => ({ data: payload }) } });
    assert.equal((await r.loadWhisperBlocks()).ok, true);
    assert.equal(JSON.stringify(r.roomAnim.pagerBlockList), '[{"anchor_id":"in_anchor","created_at":"2026-11-18"}]');
    payload = true;
    assert.equal((await r.unblockWhisperSender('in_anchor')).ok, true);
    assert.equal(r.roomAnim.pagerBlockList.length, 0);
    payload = { unexpected: true };
    assert.equal((await r.blockIncomingWhisper('in_anchor')).ok, false);
    assert.equal((await r.reportIncomingWhisper('in_anchor', 'other')).ok, false);
});
