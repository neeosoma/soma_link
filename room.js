const stationPhases = [
    { at: 0, name: 'Дождь', entry: 'Город шумит за мокрым стеклом. Здесь можно остановиться.' },
    { at: 5, name: 'Оттепель', entry: 'Дождь редеет. От круглого окна больше не тянет холодом.' },
    { at: 15, name: 'Очаг', entry: 'Густой алый свет доходит до самого ковра.' },
    { at: 30, name: 'Рассвет', entry: 'Ночь ещё видна, но за крышами уже тлеет рассвет.' }
];

// ===== УНИКАЛЬНОЕ РАСТЕНИЕ ИГРОКА (точная привязка к прежнему анонимному ID) =====
const PLANT_KINDS = ['ПАПОРОТНИК', 'КАКТУС', 'СУККУЛЕНТ', 'БАМБУК', 'ЛИАНА', 'ЦВЕТОК', 'БОНСАЙ'];
const PLANT_STAGES = ['росток', 'всходы', 'побеги', 'крона', 'бутоны', 'цветение'];
const PLANT_WARMTH_STEPS = [0, 2, 5, 15, 22, 30];

// Длины массивов (6, 6, 5) совпадают с исходной версией, сохраняя порядок вызовов ГПСЧ
const PLANT_LEAF = [
    ['#160407', '#3c0a13', '#781728', '#cc394f'],
    ['#18050a', '#440d1b', '#861d36', '#dc4664'],
    ['#190406', '#480c12', '#8c1a24', '#de3c49'],
    ['#16040b', '#3a0b1d', '#731939', '#c83d68'],
    ['#1a0406', '#4d0a12', '#961726', '#eb3d50'],
    ['#150508', '#380e15', '#6e1e2b', '#c24355']
];
const PLANT_BLOOM = [
    ['#9e172b', '#ff475e', '#ffd9df'],
    ['#9e4252', '#f5b8c2', '#fff1f3'],
    ['#a31826', '#ff4d5c', '#ffdce0'],
    ['#8d112e', '#f73b68', '#ffd0dc'],
    ['#ad1824', '#ff3846', '#ffe3e6'],
    ['#942439', '#ff7389', '#ffecef']
];
const PLANT_POTS = [
    ['#1e0709', '#4f1519', '#8e2c31'],
    ['#231115', '#572b33', '#99535f'],
    ['#120507', '#2f1016', '#632631'],
    ['#1b060d', '#471122', '#852640'],
    ['#1d0809', '#471618', '#842e32']
];

const PLANT_NOTES = [
    [
        'Тонкая спираль папоротника только пробилась из тёмной земли.',
        'Молодые вайи папоротника раскручиваются навстречу окну.',
        'Папоротник вздрагивает от касания — резные листья уже держат форму.',
        'Густой папоротник раскинулся над ковром и ловит алые блики.',
        'Под широкими вайями папоротника наливаются тёмно-красные споры.',
        'Папоротник разросся в полную силу — алые споры тихо тлеют в полумраке.'
    ],
    [
        'Крошечный ребристый кактус упрямо сидит в тёмном грунте.',
        'Кактус вытянулся и обзавёлся первыми светлыми иголками.',
        'На боку кактуса показался первый боковой побег.',
        'Высокий кактус держит тишину комнаты, поблёскивая гранями в красном свете.',
        'На макушке кактуса собрались плотные алые бутоны.',
        'Редкое ночное цветение: вершины кактуса раскрылись яркими алыми венчиками.'
    ],
    [
        'В центре горшка едва заметна первая мясистая завязь суккулента.',
        'Аккуратная розетка суккулента медленно набирает силу.',
        'Плотные листья суккулента легли в два яруса с алой кромкой.',
        'Широкая каменная роза переливается в свете ночного окна.',
        'Из центра суккулента вытянулась высокая стрелка с бутонами.',
        'Суккулент выбросил высокое соцветие — алые колокольчики светятся в темноте.'
    ],
    [
        'Острый росток бамбука проколол землю и выпустил первый лист.',
        'Тонкий коленчатый стебель бамбука тихо качается от касания.',
        'Два стебля бамбука тянутся к круглому окну, шурша узкими листьями.',
        'Бамбук собрался в стройную тёмно-алую рощицу посреди комнаты.',
        'Высокие стебли бамбука переплелись кронами, на узлах алеют завязи.',
        'Бамбук вырос почти до света окна — листья тихо шелестят и искрятся алым.'
    ],
    [
        'Тонкий стебелёк лианы с парой листьев выглянул над краем горшка.',
        'Лиана дала первый ус — он осторожно свесился через кромку.',
        'Гибкие плети лианы вьются вверх и спускаются по стенке горшка.',
        'Густая лиана оплела горшок и коснулась листьями узора на ковре.',
        'Среди сердцевидных листьев лианы зажглись первые алые бутоны.',
        'Лиана поднялась живым каскадом и рассыпала алые цветы до самого ковра.'
    ],
    [
        'Два крошечных листка пробились к слабому свету станции.',
        'Тонкий стебель цветка повернулся в сторону дождливого окна.',
        'На верхушке стебля завязался первый плотный тёмно-алый бутон.',
        'Главный цветок приоткрыл лепестки, рядом подрастают новые побеги.',
        'Высокий куст держит раскрытый алый венчик и тяжёлые бутоны.',
        'Пышный куст расцвёл целиком — лепестки мягко светятся в чёрно-красной тишине.'
    ],
    [
        'Из земли показался крошечный древесный прутик с двумя листками.',
        'Молодой бонсай изогнул тонкий ствол и собрал первую прядь листвы.',
        'Изогнутый ствол бонсая разделился надвое — на ветвях легли тёмные шапки.',
        'Окрепший бонсай врос корнями в грунт и раскинул ярусную крону.',
        'Старый ветвистый бонсай усыпан мелкими алыми бутонами.',
        'Бонсай в полном цвету — алая крона светится, а на ковёр опустились лепестки.'
    ]
];

const ROOM_LINES = {
    window: [
        ['Стекло холодное. Капли срываются вниз поверх чужих красных окон NEEO_CITY.', 'От касания по мокрому стеклу расходится дрожь. Город внизу не спит.'],
        ['Стекло чуть запотело под пальцами. Дождь за окном становится тише.', 'Редкие капли медленно ползут по стеклу, собирая красный свет высоток.'],
        ['В тёмном стекле мягко отражается алый свет комнаты.', 'Морось почти улеглась. За мостом ровно горят ночные окна.'],
        ['Последние капли застыли на стекле. Над крышами проступает алая полоса.', 'Город встречает тихий рассвет. Стекло наконец стало тёплым.']
    ],
    lamp: [
        'Подвесная лампа тихо качается. Красный блик скользит по столу и полу.',
        'Нить накала вспыхивает чуть теплее и снова замирает в полсилы.'
    ],
    shelf: [
        'Старые кассеты и чужие записи без имён. Дека едва слышно щёлкает в темноте.',
        'На нижней тумбе ровно тлеет красный фонарь. Плёнка хранит тишину.'
    ],
    bed: [
        'Узкая кушетка у стены. Плед хранит немного тепла между сигналами.',
        'Фонарь в изголовье мягко разгорается алым. Здесь никто не торопит.'
    ],
    terminal: 'Терминал отзывается коротким гулом. По красному люминофору бежит развёртка.',
    radioOn: 'Шкала приёмника вспыхивает алым. Частота держится ровно.',
    radioOff: 'Приёмник отзывается сухим треском. Шкала скользит мимо скрытой частоты.'
};

function hashStr(s) {
    let n = 2166136261;
    const str = String(s);
    for (let i = 0; i < str.length; i++) {
        n ^= str.charCodeAt(i);
        n = Math.imul(n, 16777619);
    }
    return n >>> 0;
}

function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function plantSpec(id) {
    const fallback = typeof player !== 'undefined' && player ? (player.uid || player.name) : '';
    const r = rng(hashStr(id || fallback || 'x'));
    const kind = Math.floor(r() * 7);
    const leafIdx = Math.floor(r() * PLANT_LEAF.length);
    const bloomIdx = Math.floor(r() * PLANT_BLOOM.length);
    const potIdx = Math.floor(r() * PLANT_POTS.length);
    const seed = Math.floor(r() * 1e9);
    const lean = r() * 2 - 1;
    const potShape = Math.floor(r() * 3);
    return {
        kind,
        kindName: PLANT_KINDS[kind],
        leafIdx,
        leaf: PLANT_LEAF[leafIdx],
        bloomIdx,
        bloom: PLANT_BLOOM[bloomIdx],
        potIdx,
        pot: PLANT_POTS[potIdx],
        seed,
        lean,
        potShape
    };
}

function plantStage(warmth, rankIndex) {
    const w = Math.max(0, Number(warmth) || 0);
    const r = Math.max(0, Math.min(5, Math.trunc(Number(rankIndex) || 0)));
    const byWarmth = PLANT_WARMTH_STEPS.reduce((last, at, i) => w >= at ? i : last, 0);
    return Math.min(5, Math.max(byWarmth, r));
}

function stationState(warmth, equipped) {
    const w = Math.max(0, Number(warmth) || 0);
    const unlocked = stationPhases.reduce((last, phase, i) => w >= phase.at ? i : last, 0);
    const active = Number.isInteger(equipped) && equipped >= 0 && equipped <= unlocked ? equipped : unlocked;
    return { unlocked, active, next: stationPhases[unlocked + 1] };
}

// ===== ПИКСЕЛЬНАЯ ОТРИСОВКА РАСТЕНИЯ (7 ВИДОВ × 6 СТАДИЙ РОСТА) =====
function pxRect(g, x, y, w, h, col) {
    const rw = Math.round(w), rh = Math.round(h);
    if (rw <= 0 || rh <= 0) return;
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), rw, rh);
}

function pxDot(g, x, y, col) {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), 1, 1);
}

function pxDisc(g, cx, cy, r, col) {
    const x0 = Math.round(cx), y0 = Math.round(cy), rr = Math.ceil(r);
    g.fillStyle = col;
    for (let y = -rr; y <= rr; y++) {
        for (let x = -rr; x <= rr; x++) {
            if (x * x + y * y <= r * r + r * 0.35) g.fillRect(x0 + x, y0 + y, 1, 1);
        }
    }
}

function pxEllipse(g, cx, cy, rx, ry, col) {
    const x0 = Math.round(cx), y0 = Math.round(cy), ex = Math.ceil(rx), ey = Math.ceil(ry);
    if (rx <= 0 || ry <= 0) return;
    g.fillStyle = col;
    for (let y = -ey; y <= ey; y++) {
        for (let x = -ex; x <= ex; x++) {
            if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.02) g.fillRect(x0 + x, y0 + y, 1, 1);
        }
    }
}

function pxLine(g, x0, y0, x1, y1, col, thick) {
    let ax = Math.round(x0), ay = Math.round(y0);
    const bx = Math.round(x1), by = Math.round(y1);
    const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1;
    let err = dx + dy;
    g.fillStyle = col;
    for (;;) {
        if (thick > 1) g.fillRect(ax, ay, thick, thick);
        else g.fillRect(ax, ay, 1, 1);
        if (ax === bx && ay === by) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; ax += sx; }
        if (e2 <= dx) { err += dx; ay += sy; }
    }
}

function pxCurve(g, x0, y0, cx, cy, x1, y1, col, thick) {
    const steps = Math.max(8, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.6));
    g.fillStyle = col;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps, u = 1 - t;
        const x = Math.round(u * u * x0 + 2 * u * t * cx + t * t * x1);
        const y = Math.round(u * u * y0 + 2 * u * t * cy + t * t * y1);
        if (thick > 1) g.fillRect(x, y, thick, thick);
        else g.fillRect(x, y, 1, 1);
    }
}

function pxLeafBlade(g, x0, y0, x1, y1, width, cols) {
    const steps = Math.max(5, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.4));
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const prof = Math.sin(t * Math.PI) * (1 - t * 0.22);
        const hw = width * prof;
        const px = x0 + dx * t, py = y0 + dy * t;
        const span = Math.ceil(hw);
        for (let k = -span; k <= span; k++) {
            if (Math.abs(k) > hw + 0.25) continue;
            const lx = Math.round(px + nx * k), ly = Math.round(py + ny * k);
            const upper = (ny * k) < -0.15 || (Math.abs(k) >= hw - 0.55 && t > 0.45);
            g.fillStyle = Math.abs(k) < 0.45 ? cols[1] : upper ? cols[3] : cols[2];
            g.fillRect(lx, ly, 1, 1);
        }
    }
    pxDot(g, x1, y1, cols[3]);
}

function softGlow(g, cx, cy, r, alpha) {
    if (r <= 0 || alpha <= 0 || !g.createRadialGradient) return;
    const a = Math.min(0.65, alpha);
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(255,74,94,${a.toFixed(3)})`);
    grad.addColorStop(0.45, `rgba(210,24,48,${(a * 0.42).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(150,10,28,0)');
    g.fillStyle = grad;
    g.fillRect(Math.floor(cx - r), Math.floor(cy - r), Math.ceil(r * 2), Math.ceil(r * 2));
}

function pxBlossom(g, cx, cy, size, bloom, glow) {
    const x = Math.round(cx), y = Math.round(cy);
    if (glow) softGlow(g, x + 0.5, y + 0.5, size + 5.5, 0.34);
    if (size <= 1) {
        pxRect(g, x - 1, y - 1, 3, 3, bloom[0]);
        pxDot(g, x, y - 1, bloom[1]);
        pxDot(g, x - 1, y, bloom[1]);
        pxDot(g, x + 1, y, bloom[1]);
        pxDot(g, x, y, bloom[2]);
        return;
    }
    if (size === 2) {
        pxDisc(g, x, y, 2.4, bloom[0]);
        const petals = [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1]];
        petals.forEach(p => pxDot(g, x + p[0], y + p[1], bloom[1]));
        pxDot(g, x, y - 1, bloom[2]);
        pxDot(g, x, y, bloom[2]);
        return;
    }
    pxDisc(g, x, y, size + 0.5, '#120306');
    pxDisc(g, x, y, size - 0.2, bloom[0]);
    for (let a = 0; a < 5; a++) {
        const ang = a * (Math.PI * 2 / 5) - Math.PI / 2;
        pxDisc(g, x + Math.cos(ang) * (size * 0.58), y + Math.sin(ang) * (size * 0.52), 1.35, bloom[1]);
    }
    pxDisc(g, x, y, 1.1, bloom[2]);
}

function drawPot(g, bx, baseY, sp, stage, lit) {
    const shapes = [
        { topW: 24, botW: 16, h: 15, rimH: 3 }, // классический
        { topW: 30, botW: 20, h: 12, rimH: 3 }, // широкая чаша
        { topW: 20, botW: 14, h: 18, rimH: 3 }  // высокий сосуд
    ];
    const sh = shapes[sp.potShape] || shapes[0];
    const topY = baseY - sh.h;
    const [pDark, pMid, pRim] = sp.pot;

    // Мягкая тень на ковре
    pxEllipse(g, bx, baseY + 1, sh.botW * 0.85 + stage * 0.9, 3.6, 'rgba(5,1,3,0.72)');
    pxEllipse(g, bx, baseY, sh.botW * 0.62, 2.2, '#060103');

    // Тело горшка с объёмной светотенью
    for (let row = 0; row < sh.h; row++) {
        const t = row / Math.max(1, sh.h - 1);
        const curve = Math.pow(t, 0.85);
        const hw = Math.round((sh.topW * (1 - curve) + sh.botW * curve) / 2);
        const y = topY + row;
        pxRect(g, bx - hw - 1, y, hw * 2 + 2, 1, '#090204');
        for (let x = -hw; x <= hw; x++) {
            const nx = x / Math.max(1, hw);
            let col = pMid;
            if (row <= 1 || nx < -0.78 || nx > 0.78 || t > 0.86) col = pDark;
            else if (nx > -0.62 && nx < -0.18 && t < 0.78) col = pRim;
            else if (lit && Math.abs(nx) > 0.62 && row < 5) col = pRim;
            pxDot(g, bx + x, y, col);
        }
        // Тонкий орнамент на горшке с прокачкой комнаты
        if (stage >= 3 && row === Math.floor(sh.h * 0.52)) {
            for (let x = -hw + 2; x <= hw - 2; x += 2) pxDot(g, bx + x, y, pRim);
        }
    }

    // Ободок и тёмная земля
    const rw = Math.round(sh.topW / 2) + 1;
    pxEllipse(g, bx, topY, rw + 1, 3.2, '#090204');
    pxEllipse(g, bx, topY, rw, 2.4, pMid);
    for (let x = -rw + 2; x <= rw - 2; x++) {
        pxDot(g, bx + x, topY - 2, Math.abs(x) < rw - 4 ? pRim : pMid);
        pxDot(g, bx + x, topY + 2, Math.abs(x) < rw * 0.55 ? pRim : pDark);
    }
    pxEllipse(g, bx, topY, rw - 2, 1.7, '#110406');
    for (let x = -rw + 4; x <= rw - 4; x += 3) pxDot(g, bx + x, topY, '#24090d');

    return { soilY: topY, halfW: rw };
}

function drawPlantSprite(ctx, spec, stage, opts) {
    const o = opts || {};
    const W = ctx.canvas ? ctx.canvas.width : 96;
    const H = ctx.canvas ? ctx.canvas.height : 96;
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;

    const s = Math.max(0, Math.min(5, Math.trunc(stage || 0)));
    const sway = Number(o.sway) || 0;
    const boost = Number(o.glow) || 0;
    const bx = Math.round(W / 2);
    const baseY = H - 7;
    const r = rng(spec.seed);
    const cols = spec.leaf;
    const bl = spec.bloom;
    const shift = h => sway * Math.min(1.5, Math.max(0, h) / 34);

    // Мягкий алый ореол у взрослых стадий и при касании
    if (s >= 3 || boost > 0.05) {
        const rad = 18 + s * 4.5 + boost * 8;
        const cy = baseY - 18 - s * 4;
        const alpha = Math.min(0.38, (s >= 3 ? (s - 2) * 0.065 : 0) + boost * 0.24);
        softGlow(ctx, bx + shift(s * 5), cy, rad, alpha);
    }

    // Опавшие алые лепестки на ковре у взрослого бонсая/цветка
    if (s === 5 && (spec.kind === 6 || spec.kind === 5 || spec.kind === 4)) {
        const petals = [[-19, 1], [-13, 3], [14, 2], [20, 0], [-7, 4], [9, 4]];
        petals.forEach((p, idx) => {
            pxRect(ctx, bx + p[0], baseY + p[1], idx % 2 ? 2 : 1, 1, idx % 3 === 0 ? bl[2] : bl[1]);
        });
    }

    const pot = drawPot(ctx, bx, baseY, spec, s, boost > 0.15 || s >= 4);
    const by = pot.soilY;
    const k = spec.kind;

    if (k === 0) {
        // 0: ПАПОРОТНИК — от крошечной улитки-вайи до пышного алого фонтана со спорами
        if (s === 0) {
            const dir = spec.lean >= 0 ? 1 : -1;
            const tx = bx + dir * 2 + shift(9), ty = by - 9;
            pxCurve(ctx, bx - 1, by, bx - 1, by - 5, tx - 1, ty, '#090204', 1);
            pxCurve(ctx, bx, by, bx, by - 5, tx, ty, cols[3], 1);
            pxDisc(ctx, tx + dir * 2, ty, 2.5, '#090204');
            pxDisc(ctx, tx + dir * 2, ty, 1.8, cols[2]);
            pxDot(ctx, tx + dir * 2, ty - 1, cols[3]);
            pxDot(ctx, tx + dir, ty - 1, bl[2]);
            pxLeafBlade(ctx, bx, by - 2, bx - dir * 4, by - 5, 1.2, cols);
        } else {
            const counts = [1, 3, 5, 8, 11, 14];
            const cnt = counts[s];
            const maxL = [8, 17, 25, 33, 41, 49][s];
            for (let pass = 0; pass < 2; pass++) {
                for (let i = 0; i < cnt; i++) {
                    if ((i % 2) !== pass) continue;
                    const u = cnt === 1 ? 0 : (i / (cnt - 1)) * 2 - 1;
                    const len = maxL * (1 - Math.abs(u) * 0.26) + (r() - 0.3) * 4;
                    const sw = shift(len);
                    const cx = bx + u * len * 0.42 + spec.lean * 2 + sw * 0.55;
                    const cy = by - len * 1.02;
                    const tx = bx + u * len * 0.88 + spec.lean * 3 + sw;
                    const ty = by - len * (0.86 - Math.abs(u) * 0.34) + (s >= 3 ? Math.abs(u) * 4 : 0);
                    const stemCol = pass === 0 ? cols[1] : cols[2];
                    pxCurve(ctx, bx + u * 2, by, cx, cy, tx, ty, stemCol, 1);
                    const leaflets = 3 + s * 2;
                    for (let j = 2; j <= leaflets; j++) {
                        const t = j / (leaflets + 0.5), inv = 1 - t;
                        const px = inv * inv * (bx + u * 2) + 2 * inv * t * cx + t * t * tx;
                        const py = inv * inv * by + 2 * inv * t * cy + t * t * ty;
                        const w = Math.max(1, Math.round((1 - Math.abs(t - 0.55) * 1.3) * (1.6 + s * 0.65)));
                        const col = pass === 0 ? cols[2] : (t > 0.42 ? cols[3] : cols[2]);
                        pxLine(ctx, px, py, px - w, py - 1, col, 1);
                        pxLine(ctx, px, py, px + w, py - 1, pass === 0 ? cols[1] : col, 1);
                        if (s >= 4 && pass === 1 && j % 3 === 0) {
                            pxDot(ctx, px + (u >= 0 ? 1 : -1), py + 1, s === 5 ? bl[1] : bl[0]);
                        }
                    }
                    pxDot(ctx, tx, ty - 1, s === 5 ? bl[2] : cols[3]);
                }
            }
        }
    } else if (k === 1) {
        // 1: КАКТУС — от круглого сеянца до высокого ребристого сагуаро в алых цветах
        const heights = [7, 15, 24, 33, 41, 48];
        const widths = [7, 8, 9, 10, 11, 12];
        const h = heights[s], w = widths[s];
        const sw = shift(h * 0.5);
        const topY = by - h;
        const cx = Math.round(bx + spec.lean * (s * 0.4) + sw * 0.4);

        const drawArm = (ax, ay, dir, reach, armH, bloomSize) => {
            const ex = ax + dir * reach;
            pxRect(ctx, Math.min(ax, ex) - 1, ay - 3, Math.abs(ex - ax) + 4, 6, '#090204');
            pxRect(ctx, Math.min(ax, ex), ay - 2, Math.abs(ex - ax) + 2, 4, cols[1]);
            pxRect(ctx, Math.min(ax, ex), ay - 2, Math.abs(ex - ax) + 2, 1, cols[2]);
            pxRect(ctx, ex - 3, ay - armH - 1, 7, armH + 3, '#090204');
            pxRect(ctx, ex - 2, ay - armH, 5, armH + 1, cols[1]);
            pxRect(ctx, ex - 1, ay - armH, 2, armH, cols[2]);
            pxLine(ctx, ex - 2, ay - armH + 1, ex - 2, ay - 2, cols[3], 1);
            pxDisc(ctx, ex, ay - armH, 2.4, cols[2]);
            pxDot(ctx, ex - 1, ay - armH - 2, cols[3]);
            for (let sy = ay - armH + 3; sy < ay - 1; sy += 4) pxDot(ctx, ex + dir * 3, sy, '#f0c2c9');
            if (bloomSize > 0) pxBlossom(ctx, ex, ay - armH - 3, bloomSize, bl, s === 5);
        };

        if (s >= 2) drawArm(cx - Math.floor(w / 2), by - Math.round(h * 0.48), -1, 6 + (s >= 4 ? 2 : 0), 6 + s * 2, s === 5 ? 2 : s === 4 ? 1 : 0);
        if (s >= 3) drawArm(cx + Math.floor(w / 2), by - Math.round(h * 0.38), 1, 6 + (s >= 5 ? 2 : 0), 5 + s * 2, s === 5 ? 2 : s === 4 ? 1 : 0);
        if (s >= 4) drawArm(cx - Math.floor(w / 2), by - Math.round(h * 0.72), -1, 5, 6 + (s - 3) * 2, s === 5 ? 2 : 0);

        // Главный ребристый ствол
        const hw = Math.floor(w / 2);
        for (let y = 0; y < h; y++) {
            const py = by - y;
            const taper = y > h - 4 ? Math.round((y - (h - 4)) * 0.55) : 0;
            const rw = Math.max(2, hw - taper);
            pxRect(ctx, cx - rw - 1, py, rw * 2 + 3, 1, '#090204');
            for (let x = -rw; x <= rw; x++) {
                let col = cols[1];
                if (x === -rw + 1 || (x === 0 && rw >= 4)) col = cols[3];
                else if (x < 1 && x !== -2) col = cols[2];
                else if (x === rw) col = cols[0];
                pxDot(ctx, cx + x, py, col);
            }
            if (y > 2 && y < h - 2 && y % 4 === 0) {
                pxDot(ctx, cx - rw - 1, py, '#f2c6cd');
                pxDot(ctx, cx + rw + 1, py - 1, '#d99aa4');
            }
        }
        pxRect(ctx, cx - hw + 2, topY - 1, Math.max(2, w - 4), 1, cols[3]);
        if (s === 4) pxBlossom(ctx, cx, topY - 2, 2, bl, false);
        if (s === 5) {
            pxBlossom(ctx, cx - 2, topY - 3, 3, bl, true);
            pxBlossom(ctx, cx + 3, topY - 2, 2, bl, true);
        }
    } else if (k === 2) {
        // 2: СУККУЛЕНТ — от крошечной почки до многоярусной каменной розы с высоким цветоносом
        const tiers = [1, 2, 2, 3, 4, 4][s];
        const baseLen = [5, 9, 14, 19, 22, 25][s];
        for (let tr = 0; tr < tiers; tr++) {
            const cnt = s === 0 ? 3 : 4 + tr * 2;
            const len = baseLen * (1 - tr * 0.17);
            const lift = tr * 2.4;
            for (let i = 0; i < cnt; i++) {
                const u = cnt === 1 ? 0 : (i / (cnt - 1)) * 2 - 1;
                const ang = u * (1.28 - tr * 0.18) + spec.lean * 0.08;
                const sw = shift(len * 0.45);
                const tx = bx + Math.sin(ang) * len * 1.18 + sw * 0.45;
                const ty = by - lift - Math.cos(ang) * len * (0.62 + tr * 0.12) - 2;
                pxLeafBlade(ctx, bx + u * 2, by - lift, tx, ty, 1.5 + s * 0.35 - tr * 0.2, cols);
                pxDot(ctx, tx, ty - 1, s >= 4 ? bl[1] : cols[3]);
            }
        }
        // Высокий изогнутый цветонос на стадиях 5 и 6
        if (s >= 4) {
            const stalkH = s === 5 ? 49 : 36;
            const dir = spec.lean >= 0 ? 1 : -1;
            const sw = shift(stalkH);
            const tipX = bx + dir * 7 + sw, tipY = by - stalkH;
            const ctrlX = bx - dir * 3 + sw * 0.5, ctrlY = by - stalkH * 0.58;
            pxCurve(ctx, bx, by - 6, ctrlX, ctrlY, tipX, tipY, cols[2], 1);
            pxCurve(ctx, bx + 1, by - 6, ctrlX + 1, ctrlY, tipX + 1, tipY, cols[3], 1);
            const bells = s === 5 ? 5 : 3;
            for (let b = 0; b < bells; b++) {
                const t = 0.55 + (b / Math.max(1, bells - 1)) * 0.45, inv = 1 - t;
                const px = inv * inv * bx + 2 * inv * t * ctrlX + t * t * tipX;
                const py = inv * inv * (by - 6) + 2 * inv * t * ctrlY + t * t * tipY;
                const side = b % 2 ? 1 : -1;
                pxLine(ctx, px, py, px + side * 4, py + 1, cols[3], 1);
                pxBlossom(ctx, px + side * 5, py + 2, s === 5 ? (b === bells - 1 ? 3 : 2) : 1, bl, s === 5);
            }
        }
    } else if (k === 3) {
        // 3: БАМБУК — от острого побега до стройной коленчатой рощицы в 5 стеблей
        const stalks = [1, 1, 2, 3, 4, 5][s];
        const baseH = [8, 17, 26, 35, 43, 51][s];
        for (let i = 0; i < stalks; i++) {
            const u = stalks === 1 ? 0 : (i / (stalks - 1)) * 2 - 1;
            const sx = Math.round(bx + u * (2 + stalks * 1.4));
            const h = Math.round(baseH * (1 - Math.abs(u) * 0.18) + (r() - 0.4) * 5);
            const sw = shift(h);
            const topX = sx + u * 2 + spec.lean * 2.2 + sw;
            const topY = by - h;
            if (s === 0) {
                pxLine(ctx, sx - 2, by, topX - 2, topY, '#090204', 1);
                pxLine(ctx, sx + 1, by, topX + 1, topY, cols[3], 1);
            }
            const segs = Math.max(1, Math.floor(h / 7));
            let px0 = sx, py0 = by;
            for (let sg = 1; sg <= segs; sg++) {
                const t = sg / segs;
                const px1 = sx + (topX - sx) * (t * t);
                const py1 = by - h * t;
                pxLine(ctx, px0 - 1, py0, px1 - 1, py1, cols[1], 1);
                pxLine(ctx, px0, py0, px1, py1, cols[2], 1);
                if (s >= 2) pxLine(ctx, px0 + 1, py0, px1 + 1, py1, cols[3], 1);
                // Коленце бамбука
                if (sg < segs) {
                    pxRect(ctx, px1 - 2, py1, s >= 2 ? 4 : 3, 1, '#0c0205');
                    pxRect(ctx, px1 - 1, py1 - 1, s >= 2 ? 3 : 2, 1, cols[3]);
                }
                // Боковые узкие листья
                if (s >= 1 && (sg >= Math.max(1, segs - 2) || sg % 2 === 0)) {
                    const dir = (sg + i) % 2 ? 1 : -1;
                    const lLen = 5 + s * 1.5;
                    pxLeafBlade(ctx, px1, py1, px1 + dir * lLen + sw * 0.3, py1 + 2, 1.1, cols);
                    if (s >= 3) pxLeafBlade(ctx, px1, py1, px1 + dir * (lLen - 2) + sw * 0.3, py1 - 3, 1.0, cols);
                    if (s >= 4 && sg >= segs - 1) pxBlossom(ctx, px1 - dir * 2, py1 - 1, s === 5 ? 2 : 1, bl, s === 5);
                }
                px0 = px1; py0 = py1;
            }
            // Верхушечный пучок листьев
            pxLeafBlade(ctx, topX, topY, topX - (3 + s), topY - 2, 1.1, cols);
            if (s >= 1) pxLeafBlade(ctx, topX, topY, topX + (3 + s), topY - 1, 1.1, cols);
            if (s >= 2) pxLeafBlade(ctx, topX, topY, topX + spec.lean * 2, topY - (4 + s * 0.7), 1.0, cols);
            if (s === 5 && i % 2 === 0) pxBlossom(ctx, topX, topY - 2, 2, bl, true);
        }
    } else if (k === 4) {
        // 4: ЛИАНА — вьющиеся вверх побеги + ниспадающие плети до самого ковра
        const upH = [7, 14, 22, 31, 40, 48][s];
        const stems = s === 0 ? 1 : s <= 2 ? 2 : 3;
        for (let i = 0; i < stems; i++) {
            const h = upH - i * 5;
            const sw = shift(h);
            const dir = (i % 2 ? -1 : 1) * (spec.lean >= 0 ? 1 : -1);
            const x0 = bx + (i - (stems - 1) / 2) * 4;
            const cx = x0 + dir * (4 + s * 1.4) + sw * 0.5;
            const tx = x0 - dir * (2 + s * 0.8) + sw;
            const ty = by - h;
            pxCurve(ctx, x0, by, cx, by - h * 0.55, tx, ty, cols[2], 1);
            const leaves = 1 + s * 2;
            for (let j = 1; j <= leaves; j++) {
                const t = j / leaves, inv = 1 - t;
                const lx = inv * inv * x0 + 2 * inv * t * cx + t * t * tx;
                const ly = inv * inv * by + 2 * inv * t * (by - h * 0.55) + t * t * ty;
                const side = j % 2 ? 1 : -1;
                pxLeafBlade(ctx, lx, ly, lx + side * (3 + s * 0.9), ly - 2, 1.4 + s * 0.2, cols);
                if (s >= 4 && j % 3 === 0) pxBlossom(ctx, lx - side * 2, ly - 2, s === 5 ? 2 : 1, bl, s === 5);
            }
            if (s === 5 && i === 0) pxBlossom(ctx, tx, ty - 2, 3, bl, true);
        }
        // Свисающие плети через край горшка
        if (s >= 1) {
            const dir = spec.lean >= 0 ? 1 : -1;
            const trails = s >= 3 ? [dir, -dir] : [dir];
            trails.forEach((d, idx) => {
                const len = Math.max(4, [0, 6, 12, 17, 22, 26][s] - idx * 4);
                const sx = bx + d * (pot.halfW - 2);
                for (let step = 0; step <= len; step++) {
                    const t = step / Math.max(1, len);
                    const py = Math.min(baseY + 2, by + step * 0.72);
                    const spread = py >= baseY - 1 ? (step - 16) * 0.9 : Math.sin(step * 0.5) * 1.6 + t * 4;
                    const px = sx + d * Math.max(0, spread) + sway * 0.25 * t;
                    pxDot(ctx, px, py, cols[2]);
                    if (step > 1 && step % 4 === 0) {
                        pxDisc(ctx, px + d * 1.5, py, 1.5, cols[2]);
                        pxDot(ctx, px + d * 2, py - 1, cols[3]);
                        if (s >= 4 && step % 8 === 0) pxBlossom(ctx, px - d, py, s === 5 ? 2 : 1, bl, s === 5);
                    }
                }
            });
        }
    } else if (k === 5) {
        // 5: ЦВЕТОК — от двух семядольных листков до пышного алого куста в цвету
        if (s === 0) {
            const tx = bx + shift(8);
            pxLine(ctx, bx - 1, by, tx - 1, by - 8, '#090204', 1);
            pxLine(ctx, bx, by, tx, by - 8, cols[3], 1);
            pxLeafBlade(ctx, tx, by - 6, tx - 5, by - 9, 1.5, cols);
            pxLeafBlade(ctx, tx, by - 6, tx + 5, by - 9, 1.5, cols);
            pxDot(ctx, tx, by - 9, bl[2]);
        } else {
            const stems = [1, 1, 1, 2, 3, 5][s];
            const baseH = [6, 15, 24, 32, 41, 48][s];
            // Прикорневые листья у взрослых стадий
            if (s >= 2) {
                for (let b = 0; b < s + 1; b++) {
                    const u = (b / s) * 2 - 1;
                    pxLeafBlade(ctx, bx + u * 2, by - 1, bx + u * (8 + s * 2.2) + shift(8) * 0.3, by - (5 + (1 - Math.abs(u)) * 5), 1.5, cols);
                }
            }
            for (let i = 0; i < stems; i++) {
                const u = stems === 1 ? 0 : (i / (stems - 1)) * 2 - 1;
                const h = baseH * (1 - Math.abs(u) * 0.22) + (r() - 0.4) * 4;
                const sw = shift(h);
                const x0 = bx + u * 3;
                const cx = bx + u * (4 + s * 1.4) + spec.lean * 2 + sw * 0.5;
                const tx = bx + u * (7 + s * 2.1) + spec.lean * 2.5 + sw;
                const ty = by - h;
                pxCurve(ctx, x0, by, cx, by - h * 0.55, tx, ty, cols[2], 1);
                pxLeafBlade(ctx, (x0 + cx) / 2, by - h * 0.35, (x0 + cx) / 2 - 5 - s * 0.5, by - h * 0.42, 1.4, cols);
                pxLeafBlade(ctx, cx, by - h * 0.58, cx + 5 + s * 0.5, by - h * 0.65, 1.4, cols);
                if (s === 2) {
                    // Закрытый тёмно-алый бутон
                    pxDisc(ctx, tx, ty - 1, 2.0, cols[1]);
                    pxRect(ctx, tx - 1, ty - 3, 3, 2, bl[0]);
                    pxDot(ctx, tx, ty - 3, bl[1]);
                } else if (s === 3) {
                    pxBlossom(ctx, tx, ty - 2, i === 0 ? 2 : 1, bl, false);
                } else if (s === 4) {
                    pxBlossom(ctx, tx, ty - 2, i === 1 ? 3 : 2, bl, i === 1);
                } else if (s === 5) {
                    pxBlossom(ctx, tx, ty - 2, i === 2 || i % 2 === 0 ? 3 : 2, bl, true);
                }
            }
        }
    } else {
        // 6: БОНСАЙ — от прутика до изогнутого дерева с ярусной алой кроной
        const trunkH = [8, 15, 22, 29, 36, 42][s];
        const dir = spec.lean >= 0 ? 1 : -1;
        const sw = shift(trunkH);
        const cx = bx - dir * (2 + s * 1.4) + sw * 0.35;
        const tx = bx + dir * (2 + s * 1.5) + sw * 0.8;
        const ty = by - trunkH;

        // Корни у основания на взрослых стадиях
        if (s >= 2) {
            pxLine(ctx, bx - 1, by, bx - 4 - s * 0.7, by + 1, '#3b1217', 1);
            pxLine(ctx, bx + 1, by, bx + 4 + s * 0.7, by + 1, '#260a0e', 1);
        }
        // Изогнутый ствол с фактурой коры
        const thick = s >= 4 ? 4 : s >= 2 ? 3 : s >= 1 ? 2 : 1;
        for (let o2 = 0; o2 < thick; o2++) {
            const barkCol = o2 === 0 ? '#5e1d24' : o2 === thick - 1 ? '#170508' : '#361015';
            pxCurve(ctx, bx - Math.floor(thick / 2) + o2, by, cx - Math.floor(thick / 2) + o2, by - trunkH * 0.52, tx + Math.round(o2 * 0.5), ty, barkCol, 1);
        }

        const drawPad = (px, py, rx, ry) => {
            pxEllipse(ctx, px, py + 1, rx + 0.8, ry + 0.6, '#0d0205');
            pxEllipse(ctx, px, py, rx, ry, cols[1]);
            pxEllipse(ctx, px, py - 0.8, rx * 0.86, ry * 0.72, cols[2]);
            // Верхняя алая кромка от света окна
            for (let k2 = 0; k2 < Math.round(rx * 2.4); k2++) {
                const lx = px + (r() - 0.5) * rx * 1.6;
                const ly = py - ry * 0.25 - r() * ry * 0.65;
                pxDot(ctx, lx, ly, cols[3]);
            }
            if (s >= 4) {
                const bCnt = s === 5 ? Math.max(2, Math.round(rx * 0.45)) : Math.max(1, Math.round(rx * 0.22));
                for (let b = 0; b < bCnt; b++) {
                    const bx2 = px + (r() - 0.5) * rx * 1.45;
                    const by2 = py + (r() - 0.6) * ry * 1.2;
                    if (s === 5) {
                        pxDot(ctx, bx2, by2, bl[1]);
                        pxDot(ctx, bx2 + 1, by2, bl[0]);
                        if (b % 2 === 0) pxDot(ctx, bx2, by2 - 1, bl[2]);
                    } else {
                        pxDot(ctx, bx2, by2, bl[1]);
                    }
                }
            }
        };

        if (s === 0) {
            pxLeafBlade(ctx, tx, ty, tx - 3, ty - 2, 1.1, cols);
            pxLeafBlade(ctx, tx, ty, tx + 3, ty - 2, 1.1, cols);
        } else if (s === 1) {
            drawPad(tx, ty - 2, 6, 3.6);
        } else {
            const pads = [
                { dx: -dir * (7 + s * 1.6), dy: trunkH * 0.34, rx: 6 + s * 1.1, ry: 3.4 + s * 0.45, min: 2 },
                { dx: dir * (7 + s * 1.5), dy: trunkH * 0.18, rx: 6 + s * 1.0, ry: 3.3 + s * 0.45, min: 3 },
                { dx: -dir * (5 + s * 1.1), dy: 3, rx: 5.5 + s * 1.0, ry: 3.2 + s * 0.4, min: 4 },
                { dx: dir * (9 + s * 1.3), dy: trunkH * 0.45, rx: 5.5 + s * 0.9, ry: 3.0 + s * 0.4, min: 5 },
                { dx: 0, dy: -3, rx: 7.5 + s * 1.4, ry: 4.0 + s * 0.55, min: 2 }
            ];
            pads.forEach(p => {
                if (s < p.min) return;
                const px = tx + p.dx + sw * 0.25, py = ty + p.dy;
                pxLine(ctx, tx, Math.min(by - 6, py + 4), px, py + 1, '#3b1218', 1);
                drawPad(px, py, p.rx, p.ry);
            });
        }
    }
}

// ===== СОСТОЯНИЕ СЦЕНЫ, АНИМАЦИИ И ОТКЛИК ПРЕДМЕТОВ =====
const WIN_CX = 201.6, WIN_CY = 87.5, WIN_RX = 80.2, WIN_RY = 73.8;
const FX_RAIN = Array.from({ length: 30 }, (_, i) => ({
    x: WIN_CX - WIN_RX + ((i * 29 + 13) % Math.round(WIN_RX * 2)),
    y: WIN_CY - WIN_RY + ((i * 41 + 7) % Math.round(WIN_RY * 2)),
    v: 1.5 + (i % 5) * 0.42,
    len: 5 + (i % 4) * 2,
    bright: i % 3 === 0
}));
const FX_DROPS = Array.from({ length: 15 }, (_, i) => ({
    x: WIN_CX + Math.cos(i * 2.1 + 0.4) * WIN_RX * (0.22 + (i % 5) * 0.15),
    y: WIN_CY - WIN_RY * 0.72 + ((i * 23) % Math.round(WIN_RY * 1.4)),
    v: 0.08 + (i % 4) * 0.05,
    pause: (i * 19) % 45,
    trail: 4 + (i % 4) * 2
}));
const FX_MOTES = Array.from({ length: 8 }, (_, i) => ({
    x: 132 + i * 19,
    y: 72 + (i * 27) % 120,
    phase: i * 1.3
}));

const roomAnim = {
    raf: null,
    lastFrame: 0,
    activePhase: 0,
    warmth: 0,
    rank: 0,
    stage: 0,
    lastStage: -1,
    spec: null,
    radioLit: false,
    previewPhase: 3,
    customEntry: '',
    lineStep: {},
    lastTouchAt: 0,
    lastTouchObj: '',
    clearTouchTimer: null,
    // Импульсы отклика при касании
    crtPulse: 0,
    radioPulse: 0,
    plantRustle: 0,
    lampSwing: 0,
    shelfPulse: 0,
    bedPulse: 0,
    windowPulse: 0,
    ripples: [],
    spores: []
};

function prefersStillRoom() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (_) { return false; }
}

function insideWindow(x, y, pad) {
    const p = pad || 0;
    const rx = WIN_RX - p, ry = WIN_RY - p;
    if (rx <= 0 || ry <= 0) return false;
    const dx = x - WIN_CX, dy = y - WIN_CY;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

function spawnPlantSpores(count) {
    const n = count || 6;
    for (let i = 0; i < n; i++) {
        roomAnim.spores.push({
            x: 198 + (Math.random() - 0.5) * (18 + roomAnim.stage * 4),
            y: 214 - roomAnim.stage * 6 - Math.random() * 10,
            vx: (Math.random() - 0.5) * 0.25,
            vy: -0.28 - Math.random() * 0.28,
            life: 1,
            bright: i % 2 === 0
        });
    }
    if (roomAnim.spores.length > 24) roomAnim.spores.splice(0, roomAnim.spores.length - 24);
}

function drawStationFx(now, step) {
    const cv = typeof document !== 'undefined' && document.getElementById('station-fx');
    if (!cv || !cv.getContext) return;
    const g = cv.getContext('2d');
    if (!g) return;
    const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;

    const dt = step ? 1 : 0;
    const phase = roomAnim.activePhase;

    // 1. ДОЖДЬ И КАПЛИ НА КРУГЛОМ СТЕКЛЕ
    const streakCount = [28, 16, 8, 0][phase] || 0;
    for (let i = 0; i < streakCount; i++) {
        const d = FX_RAIN[i];
        if (dt) {
            d.y += d.v * (phase === 0 ? 1 : 0.72);
            d.x -= d.v * 0.11;
            if (d.y > WIN_CY + WIN_RY || d.x < WIN_CX - WIN_RX) {
                d.x = WIN_CX + ((((i * 53 + (now * 0.03) | 0) % 156) - 78));
                d.y = WIN_CY - WIN_RY + (i % 9);
            }
        }
        if (insideWindow(d.x, d.y, 2) && insideWindow(d.x, d.y + d.len, 2)) {
            const rx = Math.round(d.x), ry = Math.round(d.y);
            g.fillStyle = d.bright ? 'rgba(255,112,130,0.55)' : 'rgba(218,52,74,0.38)';
            g.fillRect(rx, ry, 1, d.len);
            if (d.bright) {
                g.fillStyle = 'rgba(255,196,206,0.75)';
                g.fillRect(rx, ry + d.len - 1, 1, 1);
            }
        }
    }

    // Живые капли, стекающие по самому стеклу
    const dropCount = [15, 11, 7, 3][phase] || 3;
    for (let i = 0; i < dropCount; i++) {
        const dr = FX_DROPS[i];
        if (dt && phase < 3) {
            if (dr.pause > 0 && roomAnim.windowPulse < 0.2) {
                dr.pause--;
            } else {
                const rush = 1 + roomAnim.windowPulse * 2.4;
                dr.y += dr.v * rush * (phase === 0 ? 1.45 : phase === 1 ? 0.95 : 0.6);
                dr.x += Math.sin(now * 0.002 + i * 1.7) * 0.05;
                if ((i + ((now * 0.02) | 0)) % 97 === 0) dr.pause = 16 + (i % 5) * 6;
            }
            if (!insideWindow(dr.x, dr.y, 4)) {
                const span = ((((i * 37 + ((now * 0.01) | 0)) % 128) - 64)) / 80;
                dr.x = WIN_CX + span * WIN_RX * 0.88;
                const maxDy = Math.sqrt(Math.max(0.05, 1 - (dr.x - WIN_CX) ** 2 / (WIN_RX * WIN_RX))) * WIN_RY;
                dr.y = WIN_CY - maxDy * (0.48 + (i % 4) * 0.1);
                dr.pause = 8 + (i % 4) * 7;
            }
        }
        if (insideWindow(dr.x, dr.y, 3)) {
            const rx = Math.round(dr.x), ry = Math.round(dr.y);
            // Мокрый след над каплей
            if (phase < 3) {
                g.fillStyle = 'rgba(255,112,132,0.24)';
                for (let tr = 2; tr <= dr.trail; tr += 2) {
                    if (insideWindow(rx, ry - tr, 3)) g.fillRect(rx, ry - tr, 1, 1);
                }
            }
            // Тёмное донышко + алый блик на капле
            g.fillStyle = 'rgba(22,3,7,0.82)';
            g.fillRect(rx, ry - 1, 1, 1);
            g.fillStyle = phase === 3 ? 'rgba(255,182,190,0.6)' : 'rgba(255,156,170,0.82)';
            g.fillRect(rx, ry, 1, i % 3 === 0 ? 2 : 1);
        }
    }

    // Круги на мокром стекле и отклик касания
    for (let i = roomAnim.ripples.length - 1; i >= 0; i--) {
        const rp = roomAnim.ripples[i];
        const rad = rp.maxR * (1 - rp.life);
        const alpha = rp.life * 0.62;
        const col = `rgba(255,112,130,${alpha.toFixed(3)})`;
        const steps = Math.max(12, Math.round(rad * 6));
        g.fillStyle = col;
        for (let a = 0; a < steps; a++) {
            const ang = (a / steps) * Math.PI * 2;
            const px = Math.round(rp.x + Math.cos(ang) * rad);
            const py = Math.round(rp.y + Math.sin(ang) * rad * (rp.flat ? 0.55 : 1));
            if (!rp.inWindow || insideWindow(px, py, 2)) g.fillRect(px, py, 1, 1);
        }
        if (dt) {
            rp.life -= rp.speed;
            if (rp.life <= 0) roomAnim.ripples.splice(i, 1);
        }
    }

    // 2. РАЗВЁРТКА ЭЛТ И ЖИВАЯ ОСЦИЛЛОГРАММА (экран x=75..102, y=109..132)
    const sx = 75, sy = 109, sw = 27, sh = 23;
    const crtBoost = roomAnim.crtPulse;
    const scanPeriod = crtBoost > 0.15 ? 420 : 1900;
    const scanY = sy + Math.floor(((now % scanPeriod) / scanPeriod) * sh);
    // Шлейф луча кадровой развёртки
    for (let k = 0; k < 5; k++) {
        const ly = scanY - k;
        if (ly < sy || ly >= sy + sh) continue;
        const a = (0.44 - k * 0.08) + crtBoost * (0.3 - k * 0.04);
        if (a <= 0) continue;
        g.fillStyle = k === 0 ? `rgba(255,190,200,${Math.min(0.85, a).toFixed(3)})` : `rgba(255,64,88,${Math.min(0.62, a).toFixed(3)})`;
        g.fillRect(sx, ly, sw, 1);
    }
    // Бегущая красная волна сигнала внутри ЭЛТ
    const jitter = (!dt || crtBoost < 0.25 && ((now / 120) | 0) % 53 !== 0) ? 0 : 1;
    const midY = sy + 12;
    for (let x = 2; x < sw - 2; x++) {
        const wave = Math.sin(now * 0.007 + x * 0.65) * Math.sin(x / (sw - 1) * Math.PI);
        const spike = Math.sin(now * 0.019 - x * 1.3) * (0.35 + crtBoost * 0.9);
        const amp = (2.8 + crtBoost * 4.4) * (wave * 0.7 + spike * 0.45);
        const wy = Math.max(sy + 2, Math.min(sy + sh - 3, Math.round(midY + amp)));
        g.fillStyle = crtBoost > 0.2 ? 'rgba(255,212,218,0.92)' : 'rgba(255,134,148,0.76)';
        g.fillRect(sx + x + jitter, wy, 1, 1);
    }
    // Мигающий курсор терминала и индикатор питания
    if (((now / 480) | 0) % 2 === 0 || crtBoost > 0.2) {
        g.fillStyle = 'rgba(255,154,166,0.8)';
        g.fillRect(sx + 2, sy + 2, 2, 1);
    }
    g.fillStyle = crtBoost > 0.1 ? 'rgba(255,120,136,0.95)' : 'rgba(235,54,74,0.65)';
    g.fillRect(98, 138, 2, 1);
    if (crtBoost > 0.05) {
        softGlow(g, sx + 13, sy + 12, 24 + crtBoost * 12, crtBoost * 0.36);
    }

    // 3. ШКАЛА ПРИЁМНИКА (x=321..349, y=108..116)
    const rp = roomAnim.radioPulse;
    const dialBase = roomAnim.radioLit ? 0.55 : 0.25;
    const needleU = rp > 0.05
        ? 0.12 + 0.76 * (0.5 + 0.5 * Math.sin(now * 0.022))
        : roomAnim.radioLit
            ? 0.62 + Math.sin(now * 0.0016) * 0.06
            : 0.24 + Math.sin(now * 0.0009) * 0.18;
    const nx = Math.round(323 + needleU * 23);
    g.fillStyle = `rgba(255,128,144,${Math.min(0.95, dialBase + rp * 0.45).toFixed(3)})`;
    g.fillRect(nx, 109, 1, 6);
    if (roomAnim.radioLit || rp > 0.1) {
        for (let b = 0; b < 5; b++) {
            const bh = 1 + Math.round((0.5 + 0.5 * Math.sin(now * 0.011 + b * 1.4)) * (rp > 0.1 ? 3 : 2));
            g.fillStyle = `rgba(255,78,98,${(0.32 + rp * 0.4).toFixed(3)})`;
            g.fillRect(326 + b * 4, 115 - bh, 2, bh);
        }
    }
    if (rp > 0.05) {
        softGlow(g, 336, 114, 22 + rp * 10, rp * 0.36);
    }
    // Индикатор приёмника
    g.fillStyle = roomAnim.radioLit ? 'rgba(255,112,128,0.85)' : (((now / 900) | 0) % 3 === 0 ? 'rgba(220,52,70,0.55)' : 'rgba(110,20,30,0.35)');
    g.fillRect(324, 122, 1, 1);

    // 4. ЛАМПА, ФОНАРИ, ПЫЛИНКИ И ИСКРЫ РАСТЕНИЯ
    const swingX = Math.sin(now * 0.009) * roomAnim.lampSwing * 4.5;
    const lampAlpha = 0.14 + Math.sin(now * 0.0024) * 0.035 + roomAnim.lampSwing * 0.28;
    softGlow(g, 96 + swingX, 77, 16 + roomAnim.lampSwing * 12, lampAlpha);

    // Левый фонарь и индикаторы кассетной деки
    const leftGlow = 0.1 + Math.sin(now * 0.0031 + 1) * 0.025 + roomAnim.shelfPulse * 0.3;
    softGlow(g, 58, 148, 12 + roomAnim.shelfPulse * 10, leftGlow);
    if (roomAnim.shelfPulse > 0.08 || ((now / 1100) | 0) % 2 === 0) {
        g.fillStyle = roomAnim.shelfPulse > 0.08 ? 'rgba(255,148,162,0.9)' : 'rgba(224,62,80,0.45)';
        g.fillRect(31, 153, 1, 1);
        if (roomAnim.shelfPulse > 0.2) g.fillRect(34, 153, 1, 1);
    }

    // Правый фонарь у кушетки
    const rightGlow = 0.1 + Math.sin(now * 0.0027 + 2.4) * 0.025 + roomAnim.bedPulse * 0.32;
    softGlow(g, 375, 153, 13 + roomAnim.bedPulse * 11, rightGlow);

    // Редкие алые пылинки в свете окна
    if (phase >= 1) {
        const moteCount = phase === 3 ? 8 : phase === 2 ? 5 : 3;
        for (let i = 0; i < moteCount; i++) {
            const m = FX_MOTES[i];
            const mx = m.x + Math.sin(now * 0.0005 + m.phase) * 9;
            const my = m.y + Math.cos(now * 0.0004 + m.phase * 1.3) * 7;
            const ma = (0.14 + 0.14 * Math.sin(now * 0.0018 + m.phase)) * (phase * 0.42);
            g.fillStyle = `rgba(255,142,154,${ma.toFixed(3)})`;
            g.fillRect(Math.round(mx), Math.round(my), 1, 1);
        }
    }

    // Алые споры/пыльца от растения при касании или росте
    for (let i = roomAnim.spores.length - 1; i >= 0; i--) {
        const sp = roomAnim.spores[i];
        const a = sp.life * 0.85;
        g.fillStyle = sp.bright ? `rgba(255,186,196,${a.toFixed(3)})` : `rgba(255,72,94,${a.toFixed(3)})`;
        g.fillRect(Math.round(sp.x), Math.round(sp.y), 1, 1);
        if (dt) {
            sp.x += sp.vx + Math.sin(now * 0.008 + i) * 0.08;
            sp.y += sp.vy;
            sp.life -= 0.026;
            if (sp.life <= 0) roomAnim.spores.splice(i, 1);
        }
    }

    // Плавное затухание импульсов касания
    if (dt) {
        roomAnim.crtPulse = Math.max(0, roomAnim.crtPulse * 0.9 - 0.004);
        roomAnim.radioPulse = Math.max(0, roomAnim.radioPulse * 0.9 - 0.004);
        roomAnim.plantRustle = Math.max(0, roomAnim.plantRustle * 0.92 - 0.003);
        roomAnim.lampSwing = Math.max(0, roomAnim.lampSwing * 0.95 - 0.002);
        roomAnim.shelfPulse = Math.max(0, roomAnim.shelfPulse * 0.9 - 0.004);
        roomAnim.bedPulse = Math.max(0, roomAnim.bedPulse * 0.91 - 0.004);
        roomAnim.windowPulse = Math.max(0, roomAnim.windowPulse * 0.92 - 0.004);
    }
}

function paintPlantFrame(now) {
    const cv = typeof document !== 'undefined' && document.getElementById('station-plant');
    if (!cv || !cv.getContext || !roomAnim.spec) return;
    const g = cv.getContext('2d');
    if (!g) return;
    const still = prefersStillRoom();
    const idle = still ? 0 : Math.sin(now * 0.0014) * (0.65 + roomAnim.stage * 0.16);
    const rustle = still ? 0 : Math.sin(now * 0.018) * roomAnim.plantRustle * (2.2 + roomAnim.stage * 0.4);
    drawPlantSprite(g, roomAnim.spec, roomAnim.stage, {
        sway: idle + rustle,
        glow: roomAnim.plantRustle
    });
}

function stationLoop(now) {
    const view = typeof document !== 'undefined' && document.getElementById('view-profile');
    if (!view || view.classList.contains('hidden') || document.hidden || prefersStillRoom()) {
        roomAnim.raf = null;
        return;
    }
    if (now - roomAnim.lastFrame >= 42) {
        roomAnim.lastFrame = now;
        drawStationFx(now, true);
        paintPlantFrame(now);
    }
    roomAnim.raf = requestAnimationFrame(stationLoop);
}

function ensureStationLoop() {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    paintPlantFrame(now);
    drawStationFx(now, false);
    if (prefersStillRoom() || typeof requestAnimationFrame !== 'function') return;
    const view = typeof document !== 'undefined' && document.getElementById('view-profile');
    if (view && !view.classList.contains('hidden') && !document.hidden && !roomAnim.raf) {
        roomAnim.raf = requestAnimationFrame(stationLoop);
    }
}

function setStationEntry(text, pulse) {
    const entry = typeof document !== 'undefined' && document.getElementById('station-entry');
    if (!entry) return;
    entry.textContent = text;
    if (pulse && entry.classList) {
        entry.classList.remove('is-fresh');
        void entry.offsetWidth;
        entry.classList.add('is-fresh');
    }
}

function playObjectTone(obj) {
    if (typeof tone !== 'function') return;
    if (obj === 'plant') { tone(330, 0.24, 'sine', 0.035); tone(495, 0.34, 'sine', 0.025, 0.07); }
    else if (obj === 'window') { tone(740, 0.16, 'sine', 0.025, 0, 520); }
    else if (obj === 'lamp') { tone(980, 0.05, 'triangle', 0.025); tone(220, 0.28, 'sine', 0.02, 0.03); }
    else if (obj === 'shelf') { if (typeof noise === 'function') noise(0.05, 0.03, 0, 1800); tone(310, 0.08, 'square', 0.018, 0.02); }
    else if (obj === 'bed') { tone(196, 0.45, 'sine', 0.03); tone(294, 0.5, 'sine', 0.02, 0.1); }
}

function nextRoomLine(key, list) {
    const idx = roomAnim.lineStep[key] || 0;
    roomAnim.lineStep[key] = idx + 1;
    return list[idx % list.length];
}

function touchRoomObject(obj, event) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (roomAnim.lastTouchObj === obj && now - roomAnim.lastTouchAt < 280) return;
    roomAnim.lastTouchObj = obj;
    roomAnim.lastTouchAt = now;

    const room = typeof document !== 'undefined' && document.getElementById('station');
    const scene = typeof document !== 'undefined' && document.getElementById('station-scene');
    if (!room) return;

    room.dataset.touch = obj;
    if (typeof clearTimeout === 'function') clearTimeout(roomAnim.clearTouchTimer);
    if (typeof setTimeout === 'function') {
        roomAnim.clearTouchTimer = setTimeout(() => {
            if (room.dataset.touch === obj) delete room.dataset.touch;
        }, 620);
    }

    const btn = room.querySelector(`[data-obj="${obj}"]`);
    if (btn && btn.classList) {
        btn.classList.remove('is-hit');
        void btn.offsetWidth;
        btn.classList.add('is-hit');
    }

    // Координаты касания внутри сцены для пиксельного отклика
    let fxX = null, fxY = null;
    if (event && typeof event.clientX === 'number' && scene && scene.getBoundingClientRect) {
        const rect = scene.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (event.clientX || event.clientY)) {
            fxX = ((event.clientX - rect.left) / rect.width) * 396;
            fxY = ((event.clientY - rect.top) / rect.height) * 248;
        }
    }

    try { Telegram.WebApp.HapticFeedback.impactOccurred('light'); } catch (_) {}

    let line = '';
    if (obj === 'terminal') {
        roomAnim.crtPulse = 1;
        roomAnim.ripples.push({ x: fxX || 89, y: fxY || 121, maxR: 13, life: 1, speed: 0.08, inWindow: false });
        line = ROOM_LINES.terminal;
    } else if (obj === 'radio') {
        roomAnim.radioPulse = 1;
        roomAnim.ripples.push({ x: fxX || 336, y: fxY || 114, maxR: 13, life: 1, speed: 0.08, inWindow: false });
        const hasSignal = typeof musicFound === 'function' && musicFound();
        line = hasSignal ? ROOM_LINES.radioOn : ROOM_LINES.radioOff;
    } else if (obj === 'plant') {
        roomAnim.plantRustle = 1;
        spawnPlantSpores(5 + roomAnim.stage);
        roomAnim.ripples.push({ x: 198, y: 229, maxR: 14, life: 1, speed: 0.07, flat: true, inWindow: false });
        const sp = roomAnim.spec || plantSpec();
        line = PLANT_NOTES[sp.kind][roomAnim.stage];
        playObjectTone('plant');
    } else if (obj === 'window') {
        roomAnim.windowPulse = 1;
        const wx = fxX && insideWindow(fxX, fxY, 6) ? fxX : WIN_CX;
        const wy = fxY && insideWindow(fxX, fxY, 6) ? fxY : WIN_CY + 6;
        roomAnim.ripples.push({ x: wx, y: wy, maxR: 18, life: 1, speed: 0.055, inWindow: true });
        roomAnim.ripples.push({ x: wx, y: wy, maxR: 9, life: 0.85, speed: 0.07, inWindow: true });
        line = nextRoomLine('win_' + roomAnim.activePhase, ROOM_LINES.window[roomAnim.activePhase] || ROOM_LINES.window[0]);
        playObjectTone('window');
    } else if (obj === 'lamp') {
        roomAnim.lampSwing = 1;
        roomAnim.ripples.push({ x: 96, y: 77, maxR: 11, life: 1, speed: 0.08, inWindow: false });
        line = nextRoomLine('lamp', ROOM_LINES.lamp);
        playObjectTone('lamp');
    } else if (obj === 'shelf') {
        roomAnim.shelfPulse = 1;
        roomAnim.ripples.push({ x: fxX || 52, y: fxY || 148, maxR: 11, life: 1, speed: 0.08, inWindow: false });
        line = nextRoomLine('shelf', ROOM_LINES.shelf);
        playObjectTone('shelf');
    } else if (obj === 'bed') {
        roomAnim.bedPulse = 1;
        roomAnim.ripples.push({ x: fxX || 332, y: fxY || 168, maxR: 13, life: 1, speed: 0.07, flat: true, inWindow: false });
        line = nextRoomLine('bed', ROOM_LINES.bed);
        playObjectTone('bed');
    }

    if (line) {
        roomAnim.customEntry = line;
        setStationEntry(line, true);
    }

    paintPlantFrame(now);
    drawStationFx(now, false);
    ensureStationLoop();
}

function activateRoomObject(obj, event) {
    touchRoomObject(obj, event);
    if (obj === 'terminal' && typeof openTrainer === 'function') openTrainer();
    else if (obj === 'radio' && typeof openRadio === 'function') openRadio();
}

function renderRoom() {
    if (typeof document === 'undefined') return;
    const room = document.getElementById('station');
    if (!room) return;

    const previewing = typeof roomPreview !== 'undefined' && !!roomPreview;
    const previewIdx = Number.isInteger(roomAnim.previewPhase) ? Math.max(0, Math.min(3, roomAnim.previewPhase)) : 3;
    const warmth = previewing ? stationPhases[previewIdx].at : Math.max(0, (typeof player !== 'undefined' && player.warmth) || 0);
    let equipped;
    if (!previewing) {
        try {
            const saved = localStorage.getItem('soma_station_phase');
            if (saved !== null) equipped = Number(saved);
        } catch (_) {}
    }

    const { unlocked, active, next } = previewing
        ? { unlocked: stationPhases.length - 1, active: previewIdx, next: stationPhases[previewIdx + 1] }
        : stationState(warmth, equipped);

    const totalRanks = typeof ranks !== 'undefined' ? ranks.length : 6;
    const rIdx = previewing
        ? [0, 2, 4, totalRanks - 1][previewIdx]
        : (typeof rankIdx === 'function' ? rankIdx() : 0);
    const stars = rIdx + 1;
    const phase = stationPhases[active];
    const spec = plantSpec();
    const stage = plantStage(warmth, rIdx);
    const radioReady = typeof musicFound === 'function' && musicFound();

    const grew = roomAnim.lastStage >= 0 && stage > roomAnim.lastStage && !previewing;
    roomAnim.activePhase = active;
    roomAnim.warmth = warmth;
    roomAnim.rank = rIdx;
    roomAnim.stage = stage;
    roomAnim.lastStage = stage;
    roomAnim.spec = spec;
    roomAnim.radioLit = radioReady;
    if (grew) {
        roomAnim.plantRustle = 1;
        roomAnim.customEntry = PLANT_NOTES[spec.kind][stage];
        spawnPlantSpores(8);
    }

    room.dataset.phase = String(active);
    room.dataset.radio = radioReady ? 'on' : 'off';
    room.dataset.stage = String(stage);

    document.getElementById('warmth-val').textContent = String(warmth);
    document.getElementById('station-mode').textContent = previewing ? 'ДЕМОНСТРАЦИЯ // ЖУРНАЛ' : 'ЖУРНАЛ СТАНЦИИ';
    setStationEntry(roomAnim.customEntry || phase.entry, grew);

    const plantInfo = document.getElementById('station-plant-info');
    if (plantInfo) {
        plantInfo.textContent = `${spec.kindName} // РОСТ ${stage + 1}/6 · ${PLANT_STAGES[stage].toUpperCase()}`;
    }
    const plantPips = document.getElementById('station-plant-pips');
    if (plantPips) {
        plantPips.innerHTML = PLANT_STAGES.map((_, idx) => `<i class="${idx <= stage ? 'is-on' : ''}"></i>`).join('');
    }
    const plantBtn = room.querySelector('[data-obj="plant"]');
    if (plantBtn) {
        plantBtn.setAttribute('aria-label', `${spec.kindName[0] + spec.kindName.slice(1).toLowerCase()}, стадия ${stage + 1} из 6 — осмотреть`);
    }

    document.getElementById('station-next').textContent = previewing
        ? 'Режим осмотра: переключайте атмосферы, чтобы увидеть стадии роста.'
        : next
            ? `До атмосферы «${next.name}»: ещё ${next.at - warmth} тепла.`
            : 'Все атмосферы открыты. Можно выбрать любую.';

    const meter = document.getElementById('station-meter');
    meter.hidden = previewing || !next;
    if (!previewing && next) {
        meter.max = next.at - stationPhases[unlocked].at;
        meter.value = warmth - stationPhases[unlocked].at;
    }

    room.querySelectorAll('[data-preset]').forEach((button, i) => {
        button.disabled = !previewing && i > unlocked;
        button.setAttribute('aria-pressed', String(i === active));
        const sub = button.querySelector('span');
        if (sub) sub.textContent = !previewing && i > unlocked ? `${stationPhases[i].at} тепла` : i === active ? 'выбрано' : 'открыто';
    });

    room.querySelectorAll('.station-sky circle, .station-sky line').forEach(el => {
        el.style.opacity = Number(el.dataset.star) <= stars ? 1 : 0;
    });
    document.getElementById('station-stars').textContent = `Карта неба: ${stars}/6. С каждым новым рангом загорается звезда.`;

    const appRadio = document.getElementById('app-radio');
    if (appRadio) appRadio.style.opacity = radioReady ? 1 : 0.65;

    ensureStationLoop();
}

function resetStationPreview() {
    roomAnim.previewPhase = stationPhases.length - 1;
    roomAnim.customEntry = '';
}

function equipStationPhase(i) {
    if (!Number.isInteger(i) || !stationPhases[i]) return;
    if (typeof roomPreview !== 'undefined' && roomPreview) {
        roomAnim.previewPhase = i;
        roomAnim.customEntry = '';
        if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
        renderRoom();
        return;
    }
    const warmth = (typeof player !== 'undefined' && player.warmth) || 0;
    if (warmth < stationPhases[i].at) return;
    roomAnim.customEntry = '';
    try { localStorage.setItem('soma_station_phase', String(i)); }
    catch (_) { if (typeof notify === 'function') notify('Не удалось сохранить атмосферу на этом устройстве.'); }
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    renderRoom();
}

if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) ensureStationLoop();
    });
}
