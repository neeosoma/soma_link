/* ==========================================================================
   NEEOSOMA // ОРАНЖЕРЕЯ — ИНТЕРАКТИВНЫЙ СТЕКЛЯННЫЙ КУПОЛ НАД NEEO~CITY
   - Открывается СТРОГО только когда выращено первое растение (6/6).
   - Любой выращенный цветок (и секретного пришельца!) можно поставить в комнату.
   - Растение растёт СТРОГО только пока стоит в комнате (в куполе ждёт на паузе).
   - После 8/8 земных видов в центре купола пробуждается ОДНО 9-е секретное
     внеземное семя из 7 (строго 1 уникальный вид навсегда на игрока!).
   - Живая 60fps-сцена со стеклянным куполом, светом, светлячками, авророй,
     поющими стеклянными аккордами, режимом «Созерцать» и панорамной открыткой!
   ========================================================================== */
(function () {
    'use strict';

    const SCENE_W = 960;
    const SCENE_H = 564;
    const MOOD_KEY = 'soma_gh_mood';

    const MOODS = [
        {
            id: 'moon',
            label: '◐ ЛУНА',
            name: 'Лунная роса',
            skyTop: '#070516', skyMid: '#181034', skyBot: '#3a1632',
            beamA: 'rgba(196, 224, 255, 0.13)', beamB: 'rgba(216, 180, 254, 0.08)',
            auroraA: '#38bdf8', auroraB: '#c084fc', lantern: '#ffcf86', mist: 'rgba(148, 197, 255, 0.08)'
        },
        {
            id: 'dawn',
            label: '☀ ЗАРЯ',
            name: 'Янтарный рассвет',
            skyTop: '#160718', skyMid: '#4c142e', skyBot: '#b84846',
            beamA: 'rgba(255, 214, 142, 0.17)', beamB: 'rgba(255, 138, 128, 0.10)',
            auroraA: '#fbbf24', auroraB: '#fb7185', lantern: '#ffe29c', mist: 'rgba(255, 186, 132, 0.10)'
        },
        {
            id: 'aurora',
            label: '✦ АВРОРА',
            name: 'Звёздная аврора',
            skyTop: '#040a18', skyMid: '#0d2638', skyBot: '#291544',
            beamA: 'rgba(94, 234, 212, 0.15)', beamB: 'rgba(192, 132, 252, 0.12)',
            auroraA: '#2dd4bf', auroraB: '#a855f7', lantern: '#fde68a', mist: 'rgba(94, 234, 212, 0.10)'
        }
    ];

    // 8 идеально симметричных амфитеатральных пьедесталов земных видов (4 слева + 4 справа от зеркальной чаши x=480)
    // + 9-й тайный звёздный алтарь пришельца-пасхалки (ПОЛНОСТЬЮ СКРЫТ, пока не расцветут все 8/8 земных растений!)
    const EARTH_COUNT = 8;
    const PEDESTALS = [
        { slot: 0, x: 88,  y: 446, scale: 0.41, tier: 'front' },
        { slot: 1, x: 178, y: 412, scale: 0.39, tier: 'mid'   },
        { slot: 2, x: 270, y: 388, scale: 0.38, tier: 'back'  },
        { slot: 3, x: 362, y: 372, scale: 0.37, tier: 'back'  },
        { slot: 4, x: 598, y: 372, scale: 0.37, tier: 'back'  },
        { slot: 5, x: 690, y: 388, scale: 0.38, tier: 'back'  },
        { slot: 6, x: 782, y: 412, scale: 0.39, tier: 'mid'   },
        { slot: 7, x: 872, y: 446, scale: 0.41, tier: 'front' },
        { slot: 'alien', x: 480, y: 482, scale: 0.52, tier: 'altar' }
    ];

    // Звёзды, светлячки и капли на куполе (детерминированные, без дёрганья)
    const STARS = Array.from({ length: 68 }, (_, i) => {
        const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
        const s2 = Math.sin(i * 269.5 + 183.3) * 24634.6345;
        const u = s - Math.floor(s);
        const v = s2 - Math.floor(s2);
        return {
            x: 40 + u * (SCENE_W - 80),
            y: 18 + v * 238,
            r: 0.65 + (i % 4) * 0.42,
            ph: i * 1.37
        };
    });

    const FIREFLIES = Array.from({ length: 34 }, (_, i) => ({
        x: 70 + ((i * 97) % 820),
        y: 150 + ((i * 61) % 330),
        ampX: 16 + (i % 5) * 8,
        ampY: 10 + (i % 4) * 7,
        spd: 0.32 + (i % 7) * 0.08,
        ph: i * 0.91,
        r: 1.4 + (i % 3) * 0.65,
        hue: i % 5 === 0 ? 'violet' : (i % 4 === 0 ? 'mint' : 'gold')
    }));

    const SKYLINE = [
        [30, 316, 46, 92], [82, 300, 38, 108], [126, 274, 52, 134], [186, 308, 42, 100],
        [236, 288, 48, 120], [292, 318, 54, 90], [618, 314, 50, 94], [676, 282, 46, 126],
        [730, 296, 44, 112], [782, 264, 54, 144], [844, 298, 42, 110], [892, 312, 48, 96]
    ];

    const state = {
        open: false,
        zen: false,
        moodIdx: 0,
        selected: 0,
        ptsDemo: null, // null | 'full' (только на PTS для превью 7/7 + пришелец без порчи сохранения)
        raf: 0,
        overlay: null,
        canvas: null,
        spriteCache: new Map(),
        ripples: [],
        audioCtx: null
    };

    try {
        const savedMood = Number(localStorage.getItem(MOOD_KEY));
        if (Number.isInteger(savedMood) && savedMood >= 0 && savedMood < MOODS.length) {
            state.moodIdx = savedMood;
        }
    } catch (_) {}

    function playGlassHarp(idx) {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            if (!state.audioCtx) state.audioCtx = new Ctx();
            const ac = state.audioCtx;
            if (ac.state === 'suspended') ac.resume().catch(() => {});
            const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 987.77, 1046.5, 1174.66];
            const f = notes[Math.abs(Number(idx) || 0) % notes.length];
            const now = ac.currentTime;
            [1, 2.002].forEach((mult, k) => {
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f * mult, now);
                gain.gain.setValueAtTime(0.0001, now);
                gain.gain.exponentialRampToValueAtTime(k === 0 ? 0.045 : 0.014, now + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + (k === 0 ? 1.35 : 0.85));
                osc.connect(gain);
                gain.connect(ac.destination);
                osc.start(now);
                osc.stop(now + 1.4);
            });
        } catch (_) {}
    }

    function getSnapshot() {
        const own = typeof plantSpec === 'function' ? plantSpec() : { kind: 0, kindName: 'ПАПОРОТНИК', seed: 42 };
        const myAlien = typeof alienSpec === 'function' ? alienSpec() : null;
        if (state.ptsDemo && typeof isPtsMode === 'function' && isPtsMode()) {
            const demoAlienKind = Number.isInteger(state.ptsDemoAlien)
                ? state.ptsDemoAlien
                : (myAlien ? myAlien.ownAlienKind : 0);
            const demoAlien = typeof alienSpec === 'function' ? alienSpec(undefined, demoAlienKind) : myAlien;
            // Режим 'earth' на PTS позволяет увидеть чистую Оранжерею ДО 8/8 (без малейшего намёка на 9-ю пасхалку!)
            if (state.ptsDemo === 'earth') {
                return {
                    own,
                    myAlien: demoAlien,
                    gh: {
                        bloomed: [0, 1, 2, 3, 4, 5, 6],
                        activeSeed: { kind: 7, grownWarmth: 164 },
                        alienSeed: null,
                        placed: 7
                    },
                    isDemo: true
                };
            }
            return {
                own,
                myAlien: demoAlien,
                gh: {
                    bloomed: [0, 1, 2, 3, 4, 5, 6, 7],
                    activeSeed: null,
                    alienSeed: { kind: demoAlienKind, grownWarmth: 760, bloomed: true },
                    placed: 'alien'
                },
                isDemo: true
            };
        }
        const gh = typeof loadGreenhouse === 'function'
            ? loadGreenhouse()
            : { bloomed: [], activeSeed: null, alienSeed: null, placed: null };
        const effectivePlaced = (gh.placed === null && gh.bloomed.includes(own.kind)) ? own.kind : gh.placed;
        return {
            own,
            myAlien,
            gh: { ...gh, placed: effectivePlaced },
            isDemo: false
        };
    }

    // Оффскрин-спрайт конкретного растения (440×460 с полями безопасности — 0% обрезки лепестков и свечения!)
    function renderSpecimenCanvas(key, spec, stage, nowBucket, potSkin) {
        const cacheKey = `${key}:${stage}:${nowBucket}:${potSkin || ''}`;
        let entry = state.spriteCache.get(key);
        if (!entry) {
            const c = document.createElement('canvas');
            c.width = 440;
            c.height = 460;
            entry = { canvas: c, sig: '' };
            state.spriteCache.set(key, entry);
        }
        if (entry.sig !== cacheKey && typeof drawPlantSprite === 'function') {
            const ctx = entry.canvas.getContext('2d');
            drawPlantSprite(ctx, spec, stage, {
                phase: 3,
                glow: spec && spec.isAlien ? 0.55 : 0.25,
                sway: Math.sin(nowBucket * 0.45 + (spec ? spec.kind : 0)) * 0.14,
                now: nowBucket * 240,
                potSkin: potSkin || ''
            });
            entry.sig = cacheKey;
        }
        return entry.canvas;
    }

    function drawGlassCloche(g, x, y, w, h, tint, activePulse) {
        g.save();
        // Мягкое свечение внутри стеклянного колпака
        const rg = g.createRadialGradient(x, y - h * 0.42, 4, x, y - h * 0.42, w * 0.9);
        rg.addColorStop(0, tint || 'rgba(148, 197, 255, 0.16)');
        rg.addColorStop(1, 'rgba(15, 23, 42, 0)');
        g.fillStyle = rg;
        g.beginPath(); g.ellipse(x, y - h * 0.42, w * 0.85, h * 0.65, 0, 0, Math.PI * 2); g.fill();

        // Стеклянный ботанический клош (колокол)
        const gg = g.createLinearGradient(x - w * 0.5, y - h, x + w * 0.5, y);
        gg.addColorStop(0, 'rgba(226, 232, 240, 0.20)');
        gg.addColorStop(0.45, 'rgba(148, 163, 184, 0.06)');
        gg.addColorStop(1, 'rgba(226, 232, 240, 0.16)');
        g.fillStyle = gg;
        g.beginPath();
        g.moveTo(x - w * 0.5, y);
        g.lineTo(x - w * 0.5, y - h * 0.56);
        g.bezierCurveTo(x - w * 0.5, y - h * 1.05, x + w * 0.5, y - h * 1.05, x + w * 0.5, y - h * 0.56);
        g.lineTo(x + w * 0.5, y);
        g.closePath();
        g.fill();

        g.strokeStyle = activePulse ? 'rgba(216, 180, 254, 0.62)' : 'rgba(226, 232, 240, 0.34)';
        g.lineWidth = 1.35;
        g.stroke();

        // Блик изогнутого стекла и латунная ручка сверху
        g.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(x - w * 0.34, y - h * 0.18);
        g.quadraticCurveTo(x - w * 0.36, y - h * 0.72, x - w * 0.1, y - h * 0.86);
        g.stroke();

        g.fillStyle = '#d4a359';
        g.beginPath(); g.arc(x, y - h * 0.96, 3.6, 0, Math.PI * 2); g.fill();
        g.restore();
    }

    function drawPedestalBase(g, p, opts) {
        const { selected, inRoom, isAlien, unlocked } = opts;
        const x = p.x, y = p.y;
        const rw = isAlien ? 68 : 44;
        const rh = isAlien ? 17 : 11;
        const colH = isAlien ? 26 : 36;

        g.save();
        // Тень пьедестала на каменном полу оранжереи
        g.fillStyle = 'rgba(3, 1, 8, 0.68)';
        g.beginPath();
        g.ellipse(x, y + colH + 5, rw * 1.18, rh * 1.15, 0, 0, Math.PI * 2);
        g.fill();

        if (isAlien) {
            // Центральный звёздный алтарь-астролябия!
            const ringAlpha = unlocked ? 0.72 : 0.24;
            g.strokeStyle = unlocked ? `rgba(216, 180, 254, ${ringAlpha})` : 'rgba(148, 163, 184, 0.24)';
            g.lineWidth = 1.6;
            g.beginPath(); g.ellipse(x, y + colH, rw * 1.36, rh * 1.42, 0, 0, Math.PI * 2); g.stroke();
            g.strokeStyle = unlocked ? 'rgba(253, 230, 138, 0.52)' : 'rgba(148, 163, 184, 0.14)';
            g.lineWidth = 1.0;
            g.beginPath(); g.ellipse(x, y + colH, rw * 1.56, rh * 1.62, 0, 0, Math.PI * 2); g.stroke();
        }

        // Колонна из тёмного ботанического мрамора с латунным пояском
        const cg = g.createLinearGradient(x - rw * 0.78, y, x + rw * 0.78, y);
        cg.addColorStop(0, isAlien ? '#150c28' : '#14111d');
        cg.addColorStop(0.42, isAlien ? '#331d5c' : '#2d2638');
        cg.addColorStop(0.75, isAlien ? '#231342' : '#1f1a28');
        cg.addColorStop(1, '#0d0914');
        g.fillStyle = cg;
        g.beginPath();
        g.moveTo(x - rw * 0.78, y);
        g.lineTo(x - rw * 0.88, y + colH);
        g.ellipse(x, y + colH, rw * 0.88, rh * 0.88, 0, Math.PI, 0, true);
        g.lineTo(x + rw * 0.78, y);
        g.closePath();
        g.fill();

        // Верхняя мраморная плита с тёплым латунным кантом
        const tg = g.createRadialGradient(x - rw * 0.2, y - 2, 3, x, y, rw);
        tg.addColorStop(0, selected ? '#543c72' : (isAlien ? '#3f2470' : '#3a3148'));
        tg.addColorStop(1, isAlien ? '#1a0e32' : '#1a1423');
        g.fillStyle = tg;
        g.beginPath();
        g.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2);
        g.fill();

        g.strokeStyle = selected
            ? '#fde68a'
            : (inRoom ? 'rgba(251, 191, 36, 0.78)' : (isAlien && unlocked ? 'rgba(192, 132, 252, 0.72)' : 'rgba(212, 163, 89, 0.42)'));
        g.lineWidth = selected ? 2.2 : 1.35;
        g.stroke();

        // Латунная табличка «В КОМНАТЕ» прямо на пьедестале!
        if (inRoom) {
            g.fillStyle = 'rgba(251, 191, 36, 0.94)';
            g.beginPath();
            g.arc(x, y + colH * 0.55, 3.4, 0, Math.PI * 2);
            g.fill();
            const lg = g.createRadialGradient(x, y - 48, 8, x, y - 36, rw * 1.65);
            lg.addColorStop(0, isAlien ? 'rgba(192, 132, 252, 0.28)' : 'rgba(253, 224, 71, 0.20)');
            lg.addColorStop(1, 'rgba(253, 224, 71, 0)');
            g.fillStyle = lg;
            g.beginPath(); g.ellipse(x, y - 38, rw * 1.5, 76, 0, 0, Math.PI * 2); g.fill();
        }
        g.restore();
    }

    // Главный живописный рендер Стеклянного Купола Оранжереи (используется И в живом окне, И на 1200×675 открытке!)
    function paintConservatoryScene(g, W, H, now, opts) {
        const o = opts || {};
        const mood = MOODS[Number.isInteger(o.moodIdx) ? o.moodIdx : state.moodIdx] || MOODS[0];
        const snap = o.snapshot || getSnapshot();
        const { own, myAlien, gh } = snap;
        const t = (Number(now) || 0) * 0.001;
        const cosm = typeof getActiveCosmetics === 'function' ? getActiveCosmetics() : {};
        const potSkin = cosm.pot || '';

        g.save();
        g.scale(W / SCENE_W, H / SCENE_H);

        // 1. НОЧНОЕ / РАССВЕТНОЕ / АВРОРНОЕ НЕБО НАД NEEO~CITY ЗА СТЕКЛЯННЫМ КУПОЛОМ
        const sky = g.createLinearGradient(0, 0, 0, 390);
        sky.addColorStop(0, mood.skyTop);
        sky.addColorStop(0.56, mood.skyMid);
        sky.addColorStop(1, mood.skyBot);
        g.fillStyle = sky;
        g.fillRect(0, 0, SCENE_W, SCENE_H);

        // Мерцающие созвездия сквозь стекло купола
        STARS.forEach(st => {
            const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.6 + st.ph));
            g.fillStyle = `rgba(255, 250, 244, ${(tw * (mood.id === 'dawn' ? 0.52 : 0.88)).toFixed(3)})`;
            g.beginPath(); g.arc(st.x, st.y, st.r, 0, Math.PI * 2); g.fill();
        });

        // Живые шёлковые ленты северного сияния / небесного света под сводом купола
        g.save();
        g.globalCompositeOperation = 'screen';
        for (let band = 0; band < 3; band++) {
            const ag = g.createLinearGradient(120, 40, 840, 220);
            ag.addColorStop(0, 'rgba(0,0,0,0)');
            ag.addColorStop(0.32, mood.auroraA);
            ag.addColorStop(0.68, mood.auroraB);
            ag.addColorStop(1, 'rgba(0,0,0,0)');
            g.strokeStyle = ag;
            g.globalAlpha = (mood.id === 'aurora' ? 0.24 : 0.11) - band * 0.025;
            g.lineWidth = 34 - band * 6;
            g.lineCap = 'round';
            g.beginPath();
            for (let x = 90; x <= 870; x += 30) {
                const u = (x - 90) / 780;
                const arch = 155 - Math.sin(u * Math.PI) * 88 + band * 24;
                const wave = Math.sin(u * 5.2 + t * 0.55 + band * 1.4) * 14;
                if (x === 90) g.moveTo(x, arch + wave); else g.lineTo(x, arch + wave);
            }
            g.stroke();
        }
        // Луна или рассветное светило в окулусе купола
        const orbX = mood.id === 'dawn' ? 480 : 620;
        const orbY = mood.id === 'dawn' ? 196 : 96;
        const orbHalo = g.createRadialGradient(orbX, orbY, 6, orbX, orbY, mood.id === 'dawn' ? 160 : 96);
        orbHalo.addColorStop(0, mood.id === 'dawn' ? 'rgba(255, 238, 182, 0.55)' : 'rgba(226, 240, 255, 0.42)');
        orbHalo.addColorStop(0.5, mood.id === 'dawn' ? 'rgba(251, 146, 60, 0.18)' : 'rgba(192, 132, 252, 0.14)');
        orbHalo.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = orbHalo;
        g.beginPath(); g.arc(orbX, orbY, 160, 0, Math.PI * 2); g.fill();
        if (mood.id !== 'dawn') {
            g.fillStyle = 'rgba(248, 250, 255, 0.88)';
            g.beginPath(); g.arc(orbX, orbY, 17, 0, Math.PI * 2); g.fill();
            g.fillStyle = mood.skyMid;
            g.beginPath(); g.arc(orbX + 6.5, orbY - 3.5, 14.5, 0, Math.PI * 2); g.fill();
        }
        g.restore();

        // 2. ДАЛЁКИЕ СИЛУЭТЫ БАШЕН NEEO~CITY С МЕРЦАЮЩИМИ ОГОНЬКАМИ ЗА СТЕКЛЯННЫМИ СТЕНАМИ
        SKYLINE.forEach(([bx, by, bw, bh], bi) => {
            g.fillStyle = 'rgba(11, 7, 20, 0.72)';
            g.fillRect(bx, by, bw, bh);
            for (let wy = by + 10; wy < 382; wy += 12) {
                for (let wx = bx + 7; wx < bx + bw - 7; wx += 10) {
                    const lit = Math.sin(wx * 0.37 + wy * 0.21 + bi) > 0.18;
                    if (!lit) continue;
                    const flk = 0.35 + 0.35 * Math.sin(t * 0.7 + wx + wy);
                    g.fillStyle = (wx + wy) % 3 === 0
                        ? `rgba(255, 132, 148, ${flk.toFixed(3)})`
                        : `rgba(255, 206, 142, ${flk.toFixed(3)})`;
                    g.fillRect(wx, wy, 3.2, 4.6);
                }
            }
        });

        // Пышная теневая ботаническая листва по краям стеклянной галереи
        g.fillStyle = 'rgba(12, 28, 26, 0.72)';
        for (let i = 0; i < 14; i++) {
            const lx = 35 + i * 68;
            const lr = 36 + (i % 3) * 14;
            g.beginPath(); g.arc(lx, 388 + (i % 2) * 8, lr, Math.PI, 0); g.fill();
        }

        // 3. ВИКТОРИАНСКИЙ КОВАНЫЙ СТЕКЛЯННЫЙ КУПОЛ ОРАНЖЕРЕИ С АРКАМИ И ОКУЛУСОМ
        g.save();
        g.strokeStyle = 'rgba(212, 175, 118, 0.34)';
        g.lineWidth = 2.4;
        // Главный свод купола
        g.beginPath();
        g.moveTo(22, 388);
        g.lineTo(22, 204);
        g.bezierCurveTo(22, 42, SCENE_W - 22, 42, SCENE_W - 22, 204);
        g.lineTo(SCENE_W - 22, 388);
        g.stroke();

        // Меридиональные рёбра стеклянного купола, сходящиеся к центральному окулусу (480, 26)
        g.lineWidth = 1.35;
        g.strokeStyle = 'rgba(212, 175, 118, 0.24)';
        const ribXs = [95, 185, 285, 382, 480, 578, 675, 775, 865];
        ribXs.forEach(rx => {
            g.beginPath();
            g.moveTo(rx, 388);
            g.lineTo(rx, 212);
            g.quadraticCurveTo(rx, 64, 480, 24);
            g.stroke();
        });
        // Горизонтальные ажурные пояса остекления
        [118, 182, 256, 326, 388].forEach((ry, idx) => {
            g.strokeStyle = idx === 4 ? 'rgba(212, 175, 118, 0.48)' : 'rgba(212, 175, 118, 0.18)';
            g.lineWidth = idx === 4 ? 2.6 : 1.1;
            g.beginPath();
            g.moveTo(22, ry);
            g.quadraticCurveTo(480, ry - (idx < 2 ? 26 : 8), SCENE_W - 22, ry);
            g.stroke();
        });
        // Центральное кольцо окулуса в зените купола
        g.strokeStyle = 'rgba(253, 230, 138, 0.45)';
        g.lineWidth = 1.8;
        g.beginPath(); g.ellipse(480, 28, 56, 13, 0, 0, Math.PI * 2); g.stroke();
        g.restore();

        // 4. ДИАГОНАЛЬНЫЕ ОБЪЁМНЫЕ ЛУЧИ СВЕТА СКВОЗЬ СТЕКЛЯННЫЙ СВОД
        g.save();
        g.globalCompositeOperation = 'screen';
        const shafts = [
            [480, 26, 260, 520, 110, mood.beamA],
            [480, 26, 480, 540, 145, mood.beamA],
            [480, 26, 700, 520, 110, mood.beamB]
        ];
        shafts.forEach(([x0, y0, x1, y1, spread, col], si) => {
            const breathe = 0.82 + 0.18 * Math.sin(t * 0.7 + si * 1.5);
            const sg = g.createLinearGradient(x0, y0, x1, y1);
            sg.addColorStop(0, col);
            sg.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = sg;
            g.globalAlpha = breathe;
            g.beginPath();
            g.moveTo(x0 - 28, y0);
            g.lineTo(x0 + 28, y0);
            g.lineTo(x1 + spread, y1);
            g.lineTo(x1 - spread, y1);
            g.closePath();
            g.fill();
        });
        g.restore();

        // 5. ПОДВЕСНЫЕ ЛАТУННЫЕ БОТАНИЧЕСКИЕ ФОНАРИ, ТИХО ПОКАЧИВАЮЩИЕСЯ ПОД СВОДОМ
        [[198, 148], [356, 114], [604, 114], [762, 148]].forEach(([lx, ly], li) => {
            const swing = Math.sin(t * 0.95 + li * 1.4) * 3.2;
            const fx = lx + swing;
            g.strokeStyle = 'rgba(212, 175, 118, 0.45)';
            g.lineWidth = 1.1;
            g.beginPath(); g.moveTo(lx, ly - 58); g.lineTo(fx, ly); g.stroke();
            const lg = g.createRadialGradient(fx, ly + 8, 2, fx, ly + 8, 44);
            lg.addColorStop(0, 'rgba(255, 232, 168, 0.58)');
            lg.addColorStop(0.45, 'rgba(251, 146, 60, 0.18)');
            lg.addColorStop(1, 'rgba(251, 146, 60, 0)');
            g.fillStyle = lg;
            g.beginPath(); g.arc(fx, ly + 8, 44, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#d4a359';
            g.fillRect(fx - 5, ly, 10, 3);
            g.fillStyle = mood.lantern;
            g.beginPath(); g.ellipse(fx, ly + 8, 4.2, 6.2, 0, 0, Math.PI * 2); g.fill();
        });

        // 6. ВЛАЖНЫЙ КАМЕННО-МШИСТЫЙ ПОЛ ОРАНЖЕРЕИ С ЗЕРКАЛЬНЫМИ ОТБЛЕСКАМИ НЕБА
        const floor = g.createLinearGradient(0, 386, 0, SCENE_H);
        floor.addColorStop(0, '#161324');
        floor.addColorStop(0.42, '#110d1c');
        floor.addColorStop(1, '#08050f');
        g.fillStyle = floor;
        g.fillRect(0, 386, SCENE_W, SCENE_H - 386);

        // Концентрические латунные дорожки ботанического амфитеатра
        g.strokeStyle = 'rgba(212, 175, 118, 0.16)';
        g.lineWidth = 1.2;
        [220, 340, 445].forEach(rx => {
            g.beginPath(); g.ellipse(480, 476, rx, rx * 0.21, 0, 0, Math.PI * 2); g.stroke();
        });
        // Лёгкий тёплый туман над мшистым полом
        const mistG = g.createLinearGradient(0, 372, 0, 446);
        mistG.addColorStop(0, 'rgba(0,0,0,0)');
        mistG.addColorStop(0.5, mood.mist);
        mistG.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = mistG;
        g.fillRect(0, 372, SCENE_W, 76);

        // 7. РИСУЕМ 8 ЗЕМНЫХ ПЬЕДЕСТАЛОВ + (СТРОГО ПОСЛЕ 8/8!) 9-Й СЕКРЕТНЫЙ ЗВЁЗДНЫЙ АЛТАРЬ ПРИШЕЛЬЦА
        const allEight = gh.bloomed.length >= EARTH_COUNT;
        const nowBucket = Math.floor((Number(now) || 0) / 240);

        // Тихая зеркальная водная чаша в центре зала (до 8/8 в ней отражается только небо — 0% спойлеров 9-й пасхалки!)
        if (!allEight) {
            g.save();
            const px = 480, py = 486;
            const pg = g.createRadialGradient(px, py - 3, 6, px, py, 86);
            pg.addColorStop(0, mood.id === 'dawn' ? 'rgba(255, 198, 138, 0.22)' : 'rgba(167, 243, 208, 0.16)');
            pg.addColorStop(0.55, 'rgba(30, 22, 54, 0.55)');
            pg.addColorStop(1, 'rgba(12, 8, 22, 0.78)');
            g.fillStyle = pg;
            g.beginPath(); g.ellipse(px, py, 86, 20, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = 'rgba(212, 175, 118, 0.34)';
            g.lineWidth = 1.4;
            g.stroke();
            // Живая световая рябь на воде
            const ripR = 24 + (t * 9) % 52;
            const ripA = (1 - (ripR - 24) / 52) * 0.28;
            g.strokeStyle = `rgba(226, 232, 240, ${ripA.toFixed(3)})`;
            g.lineWidth = 0.9;
            g.beginPath(); g.ellipse(px, py, ripR, ripR * 0.22, 0, 0, Math.PI * 2); g.stroke();
            g.restore();
        }

        const order = allEight ? [3, 4, 2, 5, 1, 6, 0, 7, 8] : [3, 4, 2, 5, 1, 6, 0, 7];

        order.forEach(idx => {
            const p = PEDESTALS[idx];
            const isSel = !o.hideSelection && state.selected === p.slot;

            if (p.slot === 'alien') {
                if (!allEight) return; // Настоящая тайная пасхалка: до 8/8 центрального пьедестала не существует!
                const inRoom = gh.placed === 'alien';
                drawPedestalBase(g, p, { selected: isSel, inRoom, isAlien: true, unlocked: true });
                if (gh.alienSeed && myAlien) {
                    const aStage = gh.alienSeed.bloomed
                        ? 5
                        : (typeof plantStage === 'function' && typeof ALIEN_WARMTH_STEPS !== 'undefined'
                            ? plantStage(gh.alienSeed.grownWarmth || 0, { sprouted: true, steps: ALIEN_WARMTH_STEPS })
                            : -1);
                    // Космический столб света из окулуса прямо на пришельца!
                    if (gh.alienSeed.bloomed) {
                        g.save();
                        g.globalCompositeOperation = 'screen';
                        const cg = g.createRadialGradient(p.x, p.y - 84, 8, p.x, p.y - 72, 138);
                        cg.addColorStop(0, myAlien.alien.mid);
                        cg.addColorStop(0.55, myAlien.alien.deep);
                        cg.addColorStop(1, 'rgba(0,0,0,0)');
                        g.fillStyle = cg;
                        g.globalAlpha = 0.42 + 0.12 * Math.sin(t * 1.6);
                        g.beginPath(); g.arc(p.x, p.y - 76, 138, 0, Math.PI * 2); g.fill();
                        g.restore();
                    }
                    const spCanvas = renderSpecimenCanvas(`alien_${myAlien.alienKind}`, myAlien, aStage, nowBucket, 'pot_kintsugi');
                    const dw = 440 * p.scale, dh = 460 * p.scale;
                    g.drawImage(spCanvas, p.x - dw * 0.5, p.y - 434 * p.scale, dw, dh);
                    if (!gh.alienSeed.bloomed && !inRoom) {
                        // На паузе в оранжерее — бережно укрыто хрустальным клошем
                        drawGlassCloche(g, p.x, p.y + 2, 86, 118, 'rgba(192, 132, 252, 0.22)', true);
                    }
                } else {
                    // 8/8 достигнуто! Парящее 9-е звёздное семя впервые проявилось в центре Оранжереи под хрустальным куполом!
                    const fy = p.y - 44 + Math.sin(t * 2.1) * 5;
                    drawGlassCloche(g, p.x, p.y + 2, 78, 98, 'rgba(192, 132, 252, 0.32)', true);
                    const sg = g.createRadialGradient(p.x, fy, 2, p.x, fy, 28);
                    sg.addColorStop(0, '#ffffff');
                    sg.addColorStop(0.4, '#e879f9');
                    sg.addColorStop(1, 'rgba(168, 85, 247, 0)');
                    g.fillStyle = sg;
                    g.beginPath(); g.arc(p.x, fy, 28, 0, Math.PI * 2); g.fill();
                    g.fillStyle = '#fffbeb';
                    g.beginPath(); g.arc(p.x, fy, 5.5, 0, Math.PI * 2); g.fill();
                }
                return;
            }

            const kind = p.slot;
            const isBloomed = gh.bloomed.includes(kind);
            const isActiveSeed = !isBloomed && gh.activeSeed && gh.activeSeed.kind === kind;
            const inRoom = isBloomed ? (gh.placed === kind) : (isActiveSeed && gh.placed === 'seed');

            drawPedestalBase(g, p, { selected: isSel, inRoom, isAlien: false, unlocked: isBloomed || isActiveSeed });

            if (isBloomed) {
                const spec = typeof gallerySpecForKind === 'function' ? gallerySpecForKind(kind, own) : own;
                const spCanvas = renderSpecimenCanvas(`earth_${kind}`, spec, 5, Math.floor(nowBucket * 0.5), potSkin);
                const dw = 440 * p.scale, dh = 460 * p.scale;
                g.drawImage(spCanvas, p.x - dw * 0.5, p.y - 434 * p.scale, dw, dh);
            } else if (isActiveSeed) {
                const spec = typeof gallerySpecForKind === 'function' ? gallerySpecForKind(kind, own) : own;
                const sStage = typeof plantStage === 'function' && typeof GREENHOUSE_WARMTH_STEPS !== 'undefined'
                    ? plantStage(gh.activeSeed.grownWarmth || 0, { sprouted: true, steps: GREENHOUSE_WARMTH_STEPS })
                    : -1;
                const spCanvas = renderSpecimenCanvas(`seed_${kind}`, spec, sStage, Math.floor(nowBucket * 0.5), potSkin);
                const dw = 440 * p.scale, dh = 460 * p.scale;
                g.drawImage(spCanvas, p.x - dw * 0.5, p.y - 434 * p.scale, dw, dh);
                if (!inRoom) {
                    drawGlassCloche(g, p.x, p.y + 2, 56, 78, 'rgba(251, 191, 36, 0.14)', false);
                }
            } else {
                // Ещё не открытый земной вид спит под запотевшим ботаническим клошем с одной тихой искоркой
                drawGlassCloche(g, p.x, p.y + 2, 48, 66, 'rgba(148, 163, 184, 0.10)', false);
                const gl = 0.3 + 0.3 * Math.sin(t * 1.4 + kind);
                g.fillStyle = `rgba(253, 230, 138, ${gl.toFixed(3)})`;
                g.beginPath(); g.arc(p.x, p.y - 22 + Math.sin(t + kind) * 3, 2.0, 0, Math.PI * 2); g.fill();
            }
        });

        // 8. ТАНЦУЮЩИЕ СВЕТЛЯЧКИ И ЗОЛОТАЯ ПЫЛЬЦА В ЛУЧАХ КУПОЛА
        g.save();
        g.globalCompositeOperation = 'screen';
        FIREFLIES.forEach(f => {
            const fx = f.x + Math.sin(t * f.spd + f.ph) * f.ampX;
            const fy = f.y + Math.cos(t * f.spd * 0.85 + f.ph) * f.ampY;
            const al = 0.28 + 0.68 * (0.5 + 0.5 * Math.sin(t * 2.1 + f.ph));
            const cCore = f.hue === 'violet' ? '#f3e8ff' : (f.hue === 'mint' ? '#d1fae5' : '#fef3c7');
            const cMid = f.hue === 'violet' ? 'rgba(192,132,252,0.42)' : (f.hue === 'mint' ? 'rgba(52,211,153,0.38)' : 'rgba(251,191,36,0.45)');
            const rg = g.createRadialGradient(fx, fy, 0.5, fx, fy, f.r * 5.2);
            rg.addColorStop(0, cCore);
            rg.addColorStop(0.38, cMid);
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            g.globalAlpha = al;
            g.fillStyle = rg;
            g.beginPath(); g.arc(fx, fy, f.r * 5.2, 0, Math.PI * 2); g.fill();
        });

        // Мягкие световые круги от прикосновения к цветам
        for (let i = state.ripples.length - 1; i >= 0; i--) {
            const rp = state.ripples[i];
            rp.life -= 0.025;
            if (rp.life <= 0) { state.ripples.splice(i, 1); continue; }
            g.globalAlpha = rp.life * 0.55;
            g.strokeStyle = '#fde68a';
            g.lineWidth = 1.6;
            g.beginPath();
            g.arc(rp.x, rp.y, (1 - rp.life) * 52 + 8, 0, Math.PI * 2);
            g.stroke();
        }
        g.restore();

        // Кинематографическая бархатная виньетка по краям купола
        const vig = g.createRadialGradient(SCENE_W * 0.5, SCENE_H * 0.48, SCENE_W * 0.28, SCENE_W * 0.5, SCENE_H * 0.5, SCENE_W * 0.62);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(4, 2, 10, 0.46)');
        g.fillStyle = vig;
        g.fillRect(0, 0, SCENE_W, SCENE_H);

        g.restore();
    }

    function ensureOverlay() {
        if (state.overlay) return state.overlay;
        const ov = document.createElement('div');
        ov.id = 'gh-overlay';
        ov.className = 'gh-overlay';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-label', 'Оранжерея NEEOSOMA');
        ov.innerHTML = `
            <div class="gh-shell" id="gh-shell">
                <div class="gh-head">
                    <div class="gh-brand">
                        <span class="gh-gem" aria-hidden="true"></span>
                        <span class="gh-title">NEEOSOMA // ОРАНЖЕРЕЯ</span>
                        <span class="gh-counter" id="gh-counter">1/7</span>
                    </div>
                    <div class="gh-head-actions">
                        <button type="button" class="gh-mood-btn" id="gh-mood-btn" title="Сменить свет под куполом">◐ ЛУНА</button>
                        <button type="button" class="gh-zen-btn" id="gh-zen-btn" aria-pressed="false" title="Режим чистого созерцания">◌ СОЗЕРЦАТЬ</button>
                        <button type="button" class="gh-close-btn" id="gh-close-btn" aria-label="Закрыть оранжерею">✕</button>
                    </div>
                </div>
                <div class="gh-stage" id="gh-stage">
                    <canvas class="gh-canvas" id="gh-canvas" width="${SCENE_W}" height="${SCENE_H}"></canvas>
                    <div class="gh-stage-hint">КОСНИТЕСЬ ПЬЕДЕСТАЛА · ЦВЕТОК СТАВИТСЯ В КОМНАТУ</div>
                </div>
                <div class="gh-strip" id="gh-strip" role="tablist" aria-label="Растения оранжереи"></div>
                <div class="gh-inspector" id="gh-inspector">
                    <div class="gh-insp-top">
                        <span class="gh-insp-name" id="gh-insp-name">—</span>
                        <span class="gh-insp-status" id="gh-insp-status">—</span>
                    </div>
                    <p class="gh-insp-note" id="gh-insp-note"></p>
                    <div class="gh-progress hidden" id="gh-progress"><i></i></div>
                    <div class="gh-actions" id="gh-actions"></div>
                    <div class="gh-rule-foot">⚖ Растение растёт строго пока стоит в вашей комнате · в Оранжерее семя бережно ждёт без потерь</div>
                </div>
            </div>
        `;
        ov.addEventListener('click', (e) => {
            if (e.target === ov) close();
        });
        ov.querySelector('#gh-close-btn').addEventListener('click', close);
        ov.querySelector('#gh-mood-btn').addEventListener('click', () => {
            state.moodIdx = (state.moodIdx + 1) % MOODS.length;
            try { localStorage.setItem(MOOD_KEY, String(state.moodIdx)); } catch (_) {}
            playGlassHarp(state.moodIdx + 2);
            renderControls();
            drawFrame(performance.now());
        });
        ov.querySelector('#gh-zen-btn').addEventListener('click', () => {
            state.zen = !state.zen;
            playGlassHarp(5);
            renderControls();
        });
        ov.querySelector('#gh-stage').addEventListener('click', (e) => {
            const canvas = state.canvas;
            if (!canvas) return;
            // Точный перевод координат клика с учётом CSS-поворота Fullscreen (±90°/180°) И object-fit: contain!
            let lx = 0, ly = 0, lw = 0, lh = 0;
            if (typeof window !== 'undefined' && typeof window.somaClientToLocal === 'function') {
                const loc = window.somaClientToLocal(canvas, e.clientX, e.clientY);
                lx = loc.x; ly = loc.y; lw = loc.w; lh = loc.h;
            } else {
                const rect = canvas.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                lx = e.clientX - rect.left;
                ly = e.clientY - rect.top;
                lw = rect.width;
                lh = rect.height;
            }
            if (!lw || !lh) return;
            // Вычисляем реальный прямоугольник отрисовки холста SCENE_W×SCENE_H внутри lw×lh (object-fit: contain)
            const fitScale = Math.min(lw / SCENE_W, lh / SCENE_H);
            const drawW = SCENE_W * fitScale;
            const drawH = SCENE_H * fitScale;
            const offX = (lw - drawW) * 0.5;
            const offY = (lh - drawH) * 0.5;
            const x = ((lx - offX) / (drawW || 1)) * SCENE_W;
            const y = ((ly - offY) / (drawH || 1)) * SCENE_H;
            if (x < 0 || x > SCENE_W || y < 0 || y > SCENE_H) return;
            state.ripples.push({ x, y, life: 1 });
            if (state.zen) {
                playGlassHarp(Math.floor((x / SCENE_W) * 8));
                return;
            }
            // Находим ближайший видимый пьедестал (9-й тайный алтарь кликабелен СТРОГО после 8/8!)
            const curSnap = getSnapshot();
            const hasSecret = curSnap.gh.bloomed.length >= EARTH_COUNT;
            let best = null, bestD = 9999;
            PEDESTALS.forEach((p, idx) => {
                if (p.slot === 'alien' && !hasSecret) return;
                const dx = x - p.x;
                const dy = (y - (p.y - 42)) * 0.85;
                const d = Math.hypot(dx, dy);
                if (d < 86 && d < bestD) { bestD = d; best = { p, idx }; }
            });
            if (best) {
                state.selected = best.p.slot;
                playGlassHarp(best.idx);
                try { Telegram.WebApp.HapticFeedback.selectionChanged(); } catch (_) {}
                renderControls();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (state.open && e.key === 'Escape') close();
        });
        document.body.appendChild(ov);
        if (typeof window !== 'undefined' && typeof window.bindSomaSceneScroll === 'function') {
            window.bindSomaSceneScroll(ov.querySelector('#gh-shell'));
        }
        state.overlay = ov;
        state.canvas = ov.querySelector('#gh-canvas');
        return ov;
    }

    function mountForCurrentMode() {
        const ov = ensureOverlay();
        const scene = document.getElementById('station-scene');
        const station = document.getElementById('station');
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        const inFs = !!((fsEl && scene && (fsEl === scene || scene.contains(fsEl)))
            || (typeof roomAnim !== 'undefined' && roomAnim && roomAnim.isFullscreen)
            || (station && station.classList.contains('is-fullscreen')));
        const target = (inFs && scene) ? scene : document.body;
        if (ov.parentElement !== target) target.appendChild(ov);
        ov.classList.toggle('is-in-fs', target === scene);
    }

    function formatKindTitle(k) {
        const raw = (typeof PLANT_KINDS !== 'undefined' && PLANT_KINDS[k]) ? PLANT_KINDS[k] : `ВИД #${k + 1}`;
        return raw[0] + raw.slice(1).toLowerCase();
    }

    function renderControls() {
        const ov = ensureOverlay();
        const snap = getSnapshot();
        const { own, myAlien, gh, isDemo } = snap;
        const allEight = gh.bloomed.length >= EARTH_COUNT;
        if (state.selected === 'alien' && !allEight) {
            state.selected = gh.bloomed.length ? gh.bloomed[0] : 0;
        }
        const shell = ov.querySelector('#gh-shell');
        shell.classList.toggle('is-zen', state.zen);

        const mood = MOODS[state.moodIdx] || MOODS[0];
        ov.querySelector('#gh-mood-btn').textContent = mood.label;
        const zenBtn = ov.querySelector('#gh-zen-btn');
        zenBtn.setAttribute('aria-pressed', String(state.zen));
        zenBtn.textContent = state.zen ? '◈ ПАНЕЛЬ' : '◌ СОЗЕРЦАТЬ';

        const alienDone = allEight && !!(gh.alienSeed && gh.alienSeed.bloomed);
        ov.querySelector('#gh-counter').textContent = isDemo
            ? (allEight ? 'PTS · 8/8 + ✦ IX' : `PTS · ${gh.bloomed.length}/${EARTH_COUNT}`)
            : (alienDone ? `${EARTH_COUNT}/${EARTH_COUNT} + ✦ IX` : `${gh.bloomed.length}/${EARTH_COUNT} ВИДОВ`);

        // Аккуратная сетка 4×2 всех 8 земных пьедесталов (0% обрезки на любом телефоне!).
        // 9-е внеземное растение — настоящая тайная пасхалка: до 8/8 ни пьедестала, ни чипа, ни подсказки не существует!
        const strip = ov.querySelector('#gh-strip');
        strip.textContent = '';
        for (let k = 0; k < EARTH_COUNT; k++) {
            const bloomed = gh.bloomed.includes(k);
            const isSeed = !bloomed && gh.activeSeed && gh.activeSeed.kind === k;
            const inRoom = bloomed ? (gh.placed === k) : (isSeed && gh.placed === 'seed');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'gh-chip'
                + (bloomed ? ' is-bloomed' : (isSeed ? '' : ' is-locked'))
                + (inRoom ? ' is-in-room' : '');
            btn.setAttribute('aria-selected', String(state.selected === k));
            if (bloomed) {
                btn.textContent = `${inRoom ? '◉ ' : (k === own.kind ? '★ ' : '✿ ')}${formatKindTitle(k)}`;
            } else if (isSeed) {
                const st = plantStage(gh.activeSeed.grownWarmth || 0, { sprouted: true, steps: GREENHOUSE_WARMTH_STEPS });
                const known = st >= PROGRESSION_RULES.SPECIES_REVEAL_STAGE;
                btn.textContent = `🌱 ${known ? formatKindTitle(k) : 'Семя'} ${st < 0 ? 0 : st + 1}/6`;
            } else {
                btn.textContent = `◌ #${k + 1}`;
            }
            btn.onclick = () => {
                state.selected = k;
                playGlassHarp(k);
                renderControls();
            };
            strip.appendChild(btn);
        }

        // 9-я тайная вкладка-пасхалка: появляется СТРОГО после расцвета всех 8/8 земных видов!
        if (allEight) {
            const aChip = document.createElement('button');
            aChip.type = 'button';
            aChip.className = 'gh-chip is-alien' + (gh.placed === 'alien' ? ' is-in-room' : '');
            aChip.setAttribute('aria-selected', String(state.selected === 'alien'));
            let aLong = 'ТАЙНОЕ СЕМЯ ПРОБУДИЛОСЬ';
            if (gh.alienSeed && gh.alienSeed.bloomed && myAlien) {
                aLong = myAlien.kindName;
            } else if (gh.alienSeed) {
                const ast = plantStage(gh.alienSeed.grownWarmth || 0, { sprouted: true, steps: ALIEN_WARMTH_STEPS });
                aLong = `ЗВЁЗДНОЕ СЕМЯ (${ast < 0 ? 0 : ast + 1}/6)`;
            }
            const sShort = document.createElement('span');
            sShort.className = 'gh-alien-short';
            sShort.textContent = '✦ IX';
            const sLong = document.createElement('span');
            sLong.className = 'gh-alien-long';
            sLong.textContent = ` · ${aLong}`;
            aChip.appendChild(sShort);
            aChip.appendChild(sLong);
            aChip.onclick = () => {
                state.selected = 'alien';
                playGlassHarp(8);
                renderControls();
            };
            strip.appendChild(aChip);
        }

        // Инспектор выбранного растения
        const nameEl = ov.querySelector('#gh-insp-name');
        const statusEl = ov.querySelector('#gh-insp-status');
        const noteEl = ov.querySelector('#gh-insp-note');
        const progEl = ov.querySelector('#gh-progress');
        const progFill = progEl.querySelector('i');
        const actEl = ov.querySelector('#gh-actions');
        actEl.textContent = '';
        progEl.classList.add('hidden');
        statusEl.className = 'gh-insp-status';

        const addBtn = (label, cls, disabled, fn) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'gh-btn' + (cls ? ' ' + cls : '');
            b.textContent = label;
            b.disabled = !!disabled;
            if (!disabled && fn) b.onclick = fn;
            actEl.appendChild(b);
        };

        if (state.selected === 'alien' && allEight) {
            if (!gh.alienSeed) {
                nameEl.textContent = '✦ IX · ТАЙНОЕ ВНЕЗЕМНОЕ СЕМЯ (1 ИЗ 7)';
                statusEl.textContent = 'СЕКРЕТНАЯ ПАСХАЛКА 8/8';
                statusEl.classList.add('is-alien');
                noteEl.textContent = 'Вы вырастили все 8 земных видов — и в центре зеркальной чаши из звёздного света проявилось ваше единственное 9-е внеземное семя! Оно требует долгого ухода (760 тепла) и растёт только стоя в комнате.';
                addBtn('✦ ПОСАДИТЬ В КОМНАТУ', 'gh-btn--alien', false, () => {
                    if (typeof plantSecretAlienSeed === 'function') plantSecretAlienSeed();
                    playGlassHarp(7);
                    renderControls();
                });
            } else if (!gh.alienSeed.bloomed) {
                const ag = Math.max(0, Number(gh.alienSeed.grownWarmth) || 0);
                const maxW = ALIEN_WARMTH_STEPS[ALIEN_WARMTH_STEPS.length - 1];
                const ast = plantStage(ag, { sprouted: true, steps: ALIEN_WARMTH_STEPS });
                const inRoom = gh.placed === 'alien';
                nameEl.textContent = `✦ ВНЕЗЕМНОЕ СЕМЯ · РОСТ ${ast < 0 ? 0 : ast + 1}/6`;
                statusEl.textContent = inRoom ? '◉ В КОМНАТЕ · РАСТЁТ' : '⏸ НА ПАУЗЕ · НЕ В КОМНАТЕ';
                statusEl.classList.add(inRoom ? 'is-room' : 'is-paused');
                noteEl.textContent = inRoom
                    ? `Ваше единственное внеземное семя стоит в комнате и медленно впитывает живое тепло (${ag}/${maxW}). Его истинный облик (1 из 7 возможных) раскроется в полном цветении.`
                    : `Сейчас в комнате стоит другой цветок, поэтому звёздное семя бережно ждёт под хрустальным клошем (${ag}/${maxW} тепла). Верните его в комнату, чтобы продолжить уход.`;
                progEl.classList.remove('hidden');
                progFill.style.width = `${Math.min(100, Math.round((ag / maxW) * 100))}%`;
                addBtn(
                    inRoom ? '✓ РАСТЁТ В ВАШЕЙ КОМНАТЕ' : '✦ ВЕРНУТЬ В КОМНАТУ (РАСТИТЬ)',
                    'gh-btn--alien',
                    inRoom,
                    () => { selectGreenhouseSlot('alien'); playGlassHarp(7); renderControls(); }
                );
            } else {
                const inRoom = gh.placed === 'alien';
                nameEl.textContent = `✦ ${myAlien.kindName}`;
                statusEl.textContent = inRoom ? '◉ СИЯЕТ В КОМНАТЕ · 1 ИЗ 7' : '✦ ВАШ ЕДИНСТВЕННЫЙ ПРИШЕЛЕЦ (1/7)';
                statusEl.classList.add('is-alien');
                noteEl.textContent = `${myAlien.alien.note}`;
                if (isDemo) {
                    addBtn('✦ СЛЕД. ВИД ПРИШЕЛЬЦА (PTS)', 'gh-btn--alien', false, () => {
                        state.ptsDemoAlien = ((Number.isInteger(state.ptsDemoAlien) ? state.ptsDemoAlien : myAlien.alienKind) + 1) % ALIEN_KINDS.length;
                        playGlassHarp(7);
                        renderControls();
                    });
                } else {
                    addBtn(
                        inRoom ? '✓ СЕЙЧАС СТОИТ В КОМНАТЕ' : '✦ ПОСТАВИТЬ ПРИШЕЛЬЦА В КОМНАТУ',
                        'gh-btn--alien',
                        inRoom,
                        () => { selectGreenhouseSlot('alien'); playGlassHarp(7); renderControls(); }
                    );
                }
            }
        } else {
            const k = Number(state.selected) || 0;
            const bloomed = gh.bloomed.includes(k);
            const isSeed = !bloomed && gh.activeSeed && gh.activeSeed.kind === k;
            if (bloomed) {
                const inRoom = gh.placed === k;
                nameEl.textContent = `${k === own.kind ? '★ ' : '✿ '}${PLANT_KINDS[k]} · ПОЛНОЕ ЦВЕТЕНИЕ`;
                statusEl.textContent = inRoom ? '◉ СЕЙЧАС В КОМНАТЕ' : 'В ОРАНЖЕРЕЕ · ГОТОВ К РАЗМЕЩЕНИЮ';
                if (inRoom) statusEl.classList.add('is-room');
                noteEl.textContent = (typeof PLANT_NOTES !== 'undefined' && PLANT_NOTES[k]) ? PLANT_NOTES[k][5] : '';
                if (!isDemo) {
                    addBtn(
                        inRoom ? '✓ СТОИТ В ВАШЕЙ КОМНАТЕ' : '✿ ПОСТАВИТЬ В КОМНАТУ',
                        '',
                        inRoom,
                        () => {
                            selectGreenhouseSlot(k);
                            playGlassHarp(k);
                            try { Telegram.WebApp.HapticFeedback.notificationOccurred('success'); } catch (_) {}
                            renderControls();
                        }
                    );
                }
            } else if (isSeed) {
                const sg = Math.max(0, Number(gh.activeSeed.grownWarmth) || 0);
                const maxW = GREENHOUSE_WARMTH_STEPS[GREENHOUSE_WARMTH_STEPS.length - 1];
                const st = plantStage(sg, { sprouted: true, steps: GREENHOUSE_WARMTH_STEPS });
                const known = st >= PROGRESSION_RULES.SPECIES_REVEAL_STAGE;
                const inRoom = gh.placed === 'seed';
                nameEl.textContent = `🌱 ${known ? PLANT_KINDS[k] : 'НЕИЗВЕСТНОЕ СЕМЯ'} · ${st < 0 ? 0 : st + 1}/6`;
                statusEl.textContent = inRoom ? '◉ В КОМНАТЕ · ВПИТЫВАЕТ ТЕПЛО' : '⏸ НА ПАУЗЕ · РАСТЁТ ТОЛЬКО В КОМНАТЕ';
                statusEl.classList.add(inRoom ? 'is-room' : 'is-paused');
                noteEl.textContent = inRoom
                    ? `Горшок стоит на ковре в вашей комнате и растёт от каждого тёплого дня (${sg}/${maxW} тепла).`
                    : `Семя бережно хранится под стеклянным клошем (${sg}/${maxW} тепла). Поставьте его в комнату, чтобы оно продолжило расти.`;
                progEl.classList.remove('hidden');
                progFill.style.width = `${Math.min(100, Math.round((sg / maxW) * 100))}%`;
                addBtn(
                    inRoom ? '✓ РАСТЁТ В ВАШЕЙ КОМНАТЕ' : '🌱 ПОСТАВИТЬ В КОМНАТУ (РАСТИТЬ)',
                    '',
                    inRoom,
                    () => { selectGreenhouseSlot('seed'); playGlassHarp(k); renderControls(); }
                );
            } else {
                nameEl.textContent = `◌ СПЯЩИЙ СОСУД #${k + 1}`;
                statusEl.textContent = gh.activeSeed ? 'ЖДЁТ СВОЕЙ ОЧЕРЕДИ' : 'СВОБОДНО ДЛЯ ПОСАДКИ';
                noteEl.textContent = gh.activeSeed
                    ? 'Сначала дорастите текущее семя в вашей комнате — затем можно будет пробудить следующий вид Оранжереи.'
                    : 'Посадите новое семя: горшок встанет в вашей комнате и с каждым тёплым вечером раскроет ещё один живой вид.';
                if (!gh.activeSeed && !isDemo) {
                    addBtn('+ ПОСАДИТЬ НОВОЕ СЕМЯ В КОМНАТУ', '', false, () => {
                        const curW = (typeof player !== 'undefined' && player.warmth) || 0;
                        const planted = plantNewGreenhouseSeed(curW, own);
                        if (planted) state.selected = planted.kind;
                        playGlassHarp(4);
                        renderControls();
                    });
                }
            }
        }

        // На PTS — удобный переключатель между чистым видом игрока ДО 8/8 (без спойлера!) и пасхалкой 8/8 + IX!
        if (isDemo) {
            addBtn(
                state.ptsDemo === 'earth' ? 'PTS: ОТКРЫТЬ 8/8 + ПАСХАЛКУ IX' : 'PTS: ВИД ДО 8/8 (БЕЗ СПОЙЛЕРА)',
                '',
                false,
                () => {
                    state.ptsDemo = state.ptsDemo === 'earth' ? 'full' : 'earth';
                    state.selected = state.ptsDemo === 'full' ? 'alien' : 7;
                    playGlassHarp(6);
                    renderControls();
                    drawFrame(performance.now());
                }
            );
        }

        // Если ещё нет активного семени и коллекция < 8/8 — удобная кнопка посадки прямо рядом
        if (!isDemo && !gh.activeSeed && gh.bloomed.length < EARTH_COUNT && gh.bloomed.includes(state.selected)) {
            addBtn('+ НОВОЕ СЕМЯ', '', false, () => {
                const curW = (typeof player !== 'undefined' && player.warmth) || 0;
                const planted = plantNewGreenhouseSeed(curW, own);
                if (planted) state.selected = planted.kind;
                playGlassHarp(4);
                renderControls();
            });
        }

        // Кнопка «Поделиться Оранжереей» — панорамная открытка 1200×675!
        if (window.SOMA_SHARE && typeof window.SOMA_SHARE.shareConservatory === 'function') {
            addBtn('▣ ПОДЕЛИТЬСЯ ОРАНЖЕРЕЕЙ', 'gh-btn--share', false, () => {
                window.SOMA_SHARE.shareConservatory({
                    moodIdx: state.moodIdx,
                    snapshot: isDemo ? snap : null
                });
            });
        }
    }

    function drawFrame(now) {
        if (!state.canvas) return;
        const g = state.canvas.getContext('2d');
        if (!g) return;
        paintConservatoryScene(g, SCENE_W, SCENE_H, now || performance.now());
    }

    function tick(now) {
        if (!state.open) { state.raf = 0; return; }
        drawFrame(now);
        state.raf = requestAnimationFrame(tick);
    }

    function open(opts) {
        const o = opts || {};
        const ptsOk = !!(o.ptsDemo && typeof isPtsMode === 'function' && isPtsMode());
        const unlocked = typeof isGreenhouseUnlocked === 'function' && isGreenhouseUnlocked();
        // ЖЕЛЕЗНОЕ ПРАВИЛО: в релизе Оранжерея открывается СТРОГО только после расцвета первого растения!
        if (!ptsOk && !unlocked) return false;

        state.ptsDemo = ptsOk ? 'full' : null;
        state.ptsDemoAlien = null;
        state.zen = false;

        const snap = getSnapshot();
        if (snap.gh.placed === 'alien') state.selected = 'alien';
        else if (snap.gh.placed === 'seed' && snap.gh.activeSeed) state.selected = snap.gh.activeSeed.kind;
        else if (Number.isInteger(snap.gh.placed) && snap.gh.bloomed.includes(snap.gh.placed)) state.selected = snap.gh.placed;
        else if (snap.gh.bloomed.length) state.selected = snap.gh.bloomed[0];
        else state.selected = snap.own.kind;

        mountForCurrentMode();
        renderControls();
        state.open = true;
        state.overlay.classList.add('is-open');
        playGlassHarp(3);
        drawFrame(performance.now());
        if (!state.raf) state.raf = requestAnimationFrame(tick);
        return true;
    }

    function close() {
        if (!state.open) return;
        state.open = false;
        state.ptsDemo = null;
        if (state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; }
        if (state.overlay) state.overlay.classList.remove('is-open');
        if (typeof renderRoom === 'function') renderRoom();
        if (typeof window.restoreSomaScroll === 'function') window.restoreSomaScroll();
    }

    document.addEventListener('fullscreenchange', () => {
        if (state.open) mountForCurrentMode();
    });

    window.SOMA_GREENHOUSE = {
        open,
        close,
        isOpen: () => state.open,
        remount: () => { if (state.open) mountForCurrentMode(); },
        paintScene: paintConservatoryScene,
        getMoodName: (idx) => (MOODS[Number.isInteger(idx) ? idx : state.moodIdx] || MOODS[0]).name
    };
})();
