const stationPhases = [
    { at: 0, name: 'Дождь', entry: 'Город шумит за мокрым стеклом. Здесь можно остановиться.' },
    { at: 5, name: 'Оттепель', entry: 'Дождь редеет. От круглого окна больше не тянет холодом.' },
    { at: 15, name: 'Очаг', entry: 'Мягкий свет ночных окон и ночников сходится на ковре.' },
    { at: 30, name: 'Рассвет', entry: 'Дождь стих. Из круглого окна в комнату медленно льётся алый рассвет.' }
];

// ===== УНИКАЛЬНОЕ РАСТЕНИЕ ИГРОКА (точная привязка к прежнему анонимному ID) =====
const PLANT_KINDS = ['ПАПОРОТНИК', 'КАКТУС', 'СУККУЛЕНТ', 'БАМБУК', 'ЛИАНА', 'ЦВЕТОК', 'БОНСАЙ'];
const PLANT_STAGES = ['росток', 'всходы', 'побеги', 'крона', 'бутоны', 'цветение'];
const PLANT_WARMTH_STEPS = [0, 2, 5, 15, 22, 30];

// Длины массивов (6, 6, 5) строго сохранены для 100% совпадения с прежней формулой ID
// Живые природные оттенки листвы в тёплом чёрно-красном полумраке комнаты: [тень, база, живой зелёный, светлый блик]
const PLANT_LEAF = [
    ['#0c1a14', '#1b3d2b', '#2f6a47', '#67a676'],
    ['#0e1d1c', '#1e423d', '#336d62', '#73b09e'],
    ['#101c11', '#254322', '#3f7136', '#7fb36b'],
    ['#0d1916', '#1c3a31', '#2e6351', '#68a38b'],
    ['#131b10', '#2b3f1f', '#4a6b33', '#8cb068'],
    ['#0e1b18', '#214036', '#386c58', '#78b396']
];
// Живые оттенки цветов: [глубокий лепесток, шёлковый средний, нежный край]
const PLANT_BLOOM = [
    ['#7d1128', '#e63b5a', '#ffdbe3'],
    ['#8c243c', '#f58ca2', '#fff4f6'],
    ['#8f1c24', '#f25449', '#ffe3dc'],
    ['#781433', '#e84374', '#ffd8e6'],
    ['#941926', '#ff4757', '#ffebee'],
    ['#8a2938', '#f7798b', '#fff0f2']
];
// Ручная керамика и терракота в свете комнаты: [глубокая тень, глина/глазурь, тёплый блик]
const PLANT_POTS = [
    ['#210c0b', '#5c241e', '#9e4739'],
    ['#1c1114', '#4a2b31', '#87545d'],
    ['#14090c', '#33171e', '#69323d'],
    ['#220b11', '#541b28', '#94384a'],
    ['#23110d', '#592c21', '#995340']
];

const PLANT_NOTES = [
    [
        'Изумрудная улитка папоротника только пробилась сквозь влажный мох.',
        'Молодые вайи папоротника плавно раскручиваются навстречу окну.',
        'Резные перистые листья папоротника собрались в живую розетку.',
        'Пышный лесной папоротник раскинулся фонтаном и ловит алые блики на росе.',
        'Под бархатными вайями папоротника созрели тёплые рубиновые споры.',
        'Папоротник в полной силе — живой изумрудный каскад дышит в свете рассвета.'
    ],
    [
        'Округлый ребристый сеянец кактуса сидит среди тёплой каменной крошки.',
        'Молодой кактус вытянулся, выстроил грани и распустил тонкие светлые иглы.',
        'Кактус окреп и выпустил первый плавно изогнутый боковой побег.',
        'Благородный пустынный кактус хранит тишину, поблёскивая иглами в алом свете.',
        'На пушистых макушках кактуса налились шелковистые ночные бутоны.',
        'Редкое чудо пустыни: кактус раскрыл крупные сияющие цветы с золотой пыльцой.'
    ],
    [
        'В центре чаши сложилась крошечная жемчужно-зелёная завязь эхеверии.',
        'Мясистые листья суккулента легли аккуратной спиралью с алыми кончиками.',
        'Каменная роза набрала объём — пудровые грани мягко алеют по краям.',
        'Роскошная многоярусная эхеверия с деткой переливается живым восковым блеском.',
        'Из сердца каменной розы поднялись тонкие дуги-цветоносы с коралловыми бутонами.',
        'Суккулент расцвёл: над живой розеткой парят гроздья светящихся колокольчиков.'
    ],
    [
        'Свежий побег бамбука пробил мшистый грунт и раскрыл два нежных листа.',
        'Стройный глянцевый стебель бамбука с коленцами тянется к свету окна.',
        'Пара гибких стеблей бамбука перешёптывается узкой изумрудной листвой.',
        'Живая бамбуковая рощица окружила речные камни мягкой кружевной тенью.',
        'Высокие стебли бамбука склонились аркой — в узлах завязались нежные бутоны.',
        'Бамбуковый сад в расцвете: роса и шёлковые соцветия сияют в алом рассвете.'
    ],
    [
        'Два глянцевых сердцевидных листка с тонкими прожилками выглянули из мха.',
        'Молодая лиана выпустила витой усик и свесила первую плеть через край горшка.',
        'Живые изумрудные плети поднялись дугой и мягко заструились вдоль керамики.',
        'Богатый водопад сердцевидных листьев укрыл горшок и коснулся ковра.',
        'Среди глянцевой листвы лианы зажглись гроздья бархатных бутонов.',
        'Лиана превратилась в живой цветущий каскад — лепестки осыпались на ковёр.'
    ],
    [
        'Нежный росток с капелькой росы раскрыл первые живые листки.',
        'Молодой побег камелии развернул глянцевые резные листья к окну.',
        'Над тёмно-зелёной листвой налился первый тугой бархатный бутон.',
        'Первая живая роза приоткрыла шёлковые лепестки в окружении новых побегов.',
        'Пышный куст держит раскрытый бархатный цветок и тяжёлые алые бутоны.',
        'Куст расцвёл целиком — многослойные бархатные розы светятся живой красотой.'
    ],
    [
        'Над подушкой лесного мха поднялся тонкий древесный сеянец с живыми листками.',
        'Молодой бонсай плавно изогнул ствол и собрал первую изумрудную шапку листвы.',
        'Корни бонсая обняли камень, а раздвоенный ствол выстроил живые ярусы.',
        'Взрослый бонсай с фактурной корой раскинул гармоничную многоярусную крону.',
        'Древний ветвистый бонсай усыпан сотнями нежных розово-алых бутонов.',
        'Бонсай в полном цвету — живое облако лепестков сияет и тихо опадает на ковёр.'
    ]
];

const ROOM_LINES = {
    window: [
        ['Стекло прохладное. Живые капли скользят вниз мимо мерцающих окон NEEO_CITY.', 'За круглым окном дышит ночной город — в высотках тихо загораются и гаснут огни.'],
        ['Дождь становится мягче. В мокром стекле плывут тёплые огни дальних башен.', 'Редкие капли неспешно сбегают по стеклу, а окна домов перемигиваются в ночи.'],
        ['Дождь почти стих. Огни высоток и моста ровно дышат в глубокой тишине.', 'За стеклом засыпают кварталы — то одно, то другое окно мягко гаснет.'],
        ['Дождь ушёл. Из круглого окна в комнату медленно струится живой алый рассвет.', 'Тёплые лучи рассвета скользят из окна на ковёр, а в домах догорают ночные окна.']
    ],
    lamp: [
        'Подвесная лампа плавно качнулась на шнуре — тёплый блик поплыл по столу.',
        'Абажур неспешно покачивается под потолком и мягко замирает в тишине.'
    ],
    shelf: [
        'Карман старой деки мягко открылся, показал кассету без подписи и плавно втянул её обратно.',
        'Механика магнитофона тихо вздохнула: кассета выехала на мгновение и вернулась на место.'
    ],
    nightlight: [
        'Решётчатый ночник у терминала плавно разгорелся изнутри, согревая край стола.',
        'Тёплый алый свет мягко наполнил стекло ночника и медленно успокоился.'
    ],
    nightlightR: [
        'Ночник в изголовье плавно налился тёплым светом и озарил складки пледа.',
        'Мягкое свечение ночника разлилось по кирпичной стене и неспешно затихло.'
    ],
    bed: [
        'Узкая кушетка у стены. Шерстяной плед хранит покой, а рядом тихо греет ночник.',
        'Ночник в изголовье мягко отозвался тёплым светом. Здесь никто не торопит.'
    ],
    terminal: 'Экран терминала плавно оживает — волна сигнала собирается в ровную линию.',
    radioOn: 'Стрелка приёмника плавно скользит к знакомой частоте. Шкала мягко теплеет.',
    radioOff: 'Стрелка неспешно плывёт по тёплой шкале в поисках скрытого сигнала.'
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

// ===== БОТАНИЧЕСКАЯ ЖИВОПИСЬ ВЫСОКОГО РАЗРЕШЕНИЯ (7 ВИДОВ × 6 СТАДИЙ) =====
function hexRgb(hex) {
    const h = String(hex || '#000000').replace('#', '');
    return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
}

function mixHex(a, b, t, alpha) {
    const A = hexRgb(a), B = hexRgb(b);
    const u = Math.max(0, Math.min(1, t));
    const r = Math.round(A[0] + (B[0] - A[0]) * u);
    const g = Math.round(A[1] + (B[1] - A[1]) * u);
    const bl = Math.round(A[2] + (B[2] - A[2]) * u);
    return alpha === undefined ? `rgb(${r},${g},${bl})` : `rgba(${r},${g},${bl},${alpha.toFixed(3)})`;
}

function radialAura(g, cx, cy, r, c0, c1, alpha) {
    if (r <= 0 || alpha <= 0 || !g.createRadialGradient) return;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, mixHex(c0, c0, 0, Math.min(0.85, alpha)));
    gr.addColorStop(0.45, mixHex(c1, c1, 0, Math.min(0.65, alpha * 0.42)));
    gr.addColorStop(1, mixHex(c1, c1, 0, 0));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
}

// Гармонизация живой зелени с чёрно-красным светом станции (глубокие тени + тонкий алый контровой свет)
function roomToneLeaf(leaf, phase) {
    const dawn = phase === 3 ? 0.14 : phase === 2 ? 0.08 : 0.04;
    return [
        mixHex(leaf[0], '#120407', 0.48),
        mixHex(leaf[1], '#2a0c12', 0.22),
        mixHex(leaf[2], '#5e2228', 0.12),
        mixHex(leaf[3], '#d9887c', 0.14 + dawn),
        mixHex(leaf[3], '#ff858f', 0.52 + dawn) // тёплый алый контровой рефлекс окна
    ];
}

function drawDew(g, x, y, r) {
    g.save();
    g.fillStyle = 'rgba(10,18,14,0.38)';
    g.beginPath(); g.ellipse(x + r * 0.2, y + r * 0.35, r, r * 0.85, 0, 0, Math.PI * 2); g.fill();
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.08, x, y, r);
    gr.addColorStop(0, 'rgba(255,240,242,0.92)');
    gr.addColorStop(0.45, 'rgba(210,235,220,0.48)');
    gr.addColorStop(1, 'rgba(255,112,126,0.28)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.restore();
}

function drawPointedLeaf(g, x0, y0, angle, len, wid, pal, opts) {
    const o = opts || {};
    const bend = o.bend || 0;
    g.save();
    g.translate(x0, y0);
    g.rotate(angle);
    if (g.createLinearGradient) {
        const lg = g.createLinearGradient(0, -wid, len, wid);
        lg.addColorStop(0, pal[0]);
        lg.addColorStop(0.35, o.back ? pal[1] : pal[2]);
        lg.addColorStop(0.82, o.back ? pal[2] : pal[3]);
        lg.addColorStop(1, o.rim ? pal[4] : pal[3]);
        g.fillStyle = lg;
    } else {
        g.fillStyle = pal[2];
    }
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(len * 0.26, -wid, len * 0.72, -wid * 0.78 + bend * 0.5, len, bend);
    g.bezierCurveTo(len * 0.72, wid * 0.82 + bend * 0.5, len * 0.26, wid * 0.95, 0, 0);
    g.closePath();
    g.fill();

    // Тёмная нижняя грань и тонкий светлый край
    g.strokeStyle = o.rim ? mixHex(pal[4], '#ffd4d8', 0.2, 0.42) : mixHex(pal[3], '#ffffff', 0.15, 0.25);
    g.lineWidth = Math.max(0.7, wid * 0.09);
    g.beginPath();
    g.moveTo(len * 0.08, -wid * 0.18);
    g.quadraticCurveTo(len * 0.52, -wid * 0.76 + bend * 0.3, len * 0.96, bend);
    g.stroke();

    // Центральная и боковые прожилки
    if (wid >= 3.2 && !o.noVein) {
        g.strokeStyle = mixHex(pal[3], '#e8f5e4', 0.28, o.back ? 0.22 : 0.42);
        g.lineWidth = Math.max(0.65, wid * 0.08);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(len * 0.52, bend * 0.35, len * 0.9, bend * 0.9);
        g.stroke();
        if (wid >= 5.5) {
            g.lineWidth = 0.55;
            for (let v = 1; v <= 3; v++) {
                const t = v * 0.22;
                const vx = len * t, vy = bend * t * t;
                const vw = wid * Math.sin(t * Math.PI) * 0.58;
                g.beginPath();
                g.moveTo(vx, vy); g.lineTo(vx + len * 0.11, vy - vw);
                g.moveTo(vx, vy); g.lineTo(vx + len * 0.11, vy + vw);
                g.stroke();
            }
        }
    }
    g.restore();
}

function drawHeartLeaf(g, x, y, angle, size, pal, blush) {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    const s = size;
    // Мягкая тень под листом
    g.fillStyle = 'rgba(6,2,3,0.42)';
    g.beginPath();
    g.moveTo(0, s * 0.18);
    g.bezierCurveTo(-s * 0.65, -s * 0.28, -s * 0.72, s * 0.58, 0, s * 1.18);
    g.bezierCurveTo(s * 0.72, s * 0.58, s * 0.65, -s * 0.28, 0, s * 0.18);
    g.fill();

    if (g.createLinearGradient) {
        const lg = g.createLinearGradient(-s * 0.5, -s * 0.15, s * 0.5, s * 1.1);
        lg.addColorStop(0, pal[3]);
        lg.addColorStop(0.45, pal[2]);
        lg.addColorStop(0.85, pal[1]);
        lg.addColorStop(1, blush ? pal[4] : pal[0]);
        g.fillStyle = lg;
    } else g.fillStyle = pal[2];

    g.beginPath();
    g.moveTo(0, s * 0.1);
    g.bezierCurveTo(-s * 0.58, -s * 0.36, -s * 0.74, s * 0.48, 0, s * 1.12);
    g.bezierCurveTo(s * 0.74, s * 0.48, s * 0.58, -s * 0.36, 0, s * 0.1);
    g.closePath();
    g.fill();

    // Восковой глянец и сеть живых прожилок
    g.strokeStyle = mixHex(pal[3], '#f4fff0', 0.35, 0.48);
    g.lineWidth = Math.max(0.65, s * 0.055);
    g.beginPath();
    g.moveTo(0, s * 0.1); g.lineTo(0, s * 0.98);
    for (let i = 1; i <= 3; i++) {
        const yy = s * (0.2 + i * 0.2);
        const sp = s * (0.42 - i * 0.08);
        g.moveTo(0, yy); g.quadraticCurveTo(-sp * 0.6, yy + s * 0.03, -sp, yy + s * 0.14);
        g.moveTo(0, yy); g.quadraticCurveTo(sp * 0.6, yy + s * 0.03, sp, yy + s * 0.14);
    }
    g.stroke();

    if (blush) {
        g.strokeStyle = mixHex(pal[4], '#ffb8c0', 0.25, 0.42);
        g.lineWidth = Math.max(0.7, s * 0.05);
        g.beginPath();
        g.moveTo(-s * 0.45, s * 0.04);
        g.bezierCurveTo(-s * 0.68, s * 0.45, -s * 0.25, s * 0.88, 0, s * 1.12);
        g.stroke();
    }
    g.restore();
}

function drawSilkBud(g, x, y, angle, size, bl, pal, openAmt) {
    const op = openAmt || 0;
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    const s = size;
    // Чашелистик
    g.fillStyle = pal[1];
    g.beginPath();
    g.ellipse(0, 0, s * 0.44, s * 0.36, 0, 0, Math.PI * 2);
    g.fill();
    // Шелковистый бутон
    const gr = g.createLinearGradient(-s * 0.5, 0, s * 0.5, -s * 1.45);
    gr.addColorStop(0, bl[0]);
    gr.addColorStop(0.58, bl[1]);
    gr.addColorStop(1, bl[2]);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(-s * 0.42, 0);
    g.bezierCurveTo(-s * (0.62 + op * 0.22), -s * 0.75, -s * (0.18 + op * 0.18), -s * 1.32, 0, -s * 1.48);
    g.bezierCurveTo(s * (0.18 + op * 0.18), -s * 1.32, s * (0.62 + op * 0.22), -s * 0.75, s * 0.42, 0);
    g.closePath();
    g.fill();
    // Наружные чешуйки чашечки
    g.fillStyle = pal[2];
    for (const dir of [-1, 1]) {
        g.beginPath();
        g.moveTo(0, s * 0.1);
        g.quadraticCurveTo(dir * s * 0.56, -s * 0.25, dir * s * 0.34, -s * 0.82);
        g.quadraticCurveTo(dir * s * 0.16, -s * 0.32, 0, -s * 0.05);
        g.fill();
    }
    // Нежный блик лепестка
    g.strokeStyle = mixHex(bl[2], '#ffffff', 0.4, 0.55);
    g.lineWidth = Math.max(0.7, s * 0.08);
    g.beginPath();
    g.moveTo(-s * 0.12, -s * 0.28);
    g.quadraticCurveTo(-s * 0.22, -s * 0.85, 0, -s * 1.38);
    g.stroke();
    g.restore();
}

// Роскошный многослойный живой цветок с бархатной глубиной и золотыми тычинками
function drawLushFlower(g, x, y, radius, bl, opts) {
    const o = opts || {};
    const petals = o.petals || 8;
    const tilt = o.tilt || 0.82;
    const rot = o.rot || 0;
    const glow = o.glow || 0;
    const style = o.style || 'lotus'; // 'cactus' | 'rose' | 'lotus' | 'sakura' | 'bell'

    if (glow > 0.02) {
        radialAura(g, x, y, radius * (2.15 + glow * 0.5), bl[1], bl[0], 0.18 + glow * 0.18);
    }

    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(1, tilt);

    if (style === 'bell') {
        const gr = g.createLinearGradient(0, -radius * 0.8, 0, radius * 1.15);
        gr.addColorStop(0, bl[0]);
        gr.addColorStop(0.55, bl[1]);
        gr.addColorStop(1, '#ffe4b8');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(-radius * 0.35, -radius * 0.7);
        g.bezierCurveTo(-radius * 0.92, radius * 0.15, -radius * 0.85, radius * 0.85, -radius * 0.95, radius * 1.05);
        g.lineTo(-radius * 0.32, radius * 0.78);
        g.lineTo(0, radius * 1.15);
        g.lineTo(radius * 0.32, radius * 0.78);
        g.lineTo(radius * 0.95, radius * 1.05);
        g.bezierCurveTo(radius * 0.85, radius * 0.85, radius * 0.92, radius * 0.15, radius * 0.35, -radius * 0.7);
        g.closePath();
        g.fill();
        g.fillStyle = '#ffd584';
        g.beginPath(); g.arc(0, radius * 0.96, radius * 0.18, 0, Math.PI * 2); g.fill();
        g.restore();
        return;
    }

    const rings = style === 'cactus' ? 3 : style === 'rose' ? 4 : style === 'sakura' ? 1 : 2;
    for (let ring = 0; ring < rings; ring++) {
        const rt = rings === 1 ? 0.65 : ring / (rings - 1);
        const rr = radius * (1 - ring * (style === 'rose' ? 0.2 : 0.22));
        const cnt = style === 'cactus' ? (12 - ring * 2) : style === 'sakura' ? 5 : petals;
        const pw = style === 'cactus' ? rr * 0.28 : style === 'sakura' ? rr * 0.54 : rr * 0.46;
        const off = ring * 0.37;
        for (let i = 0; i < cnt; i++) {
            const a = off + (i / cnt) * Math.PI * 2;
            g.save();
            g.rotate(a);
            if (g.createLinearGradient) {
                const pg = g.createLinearGradient(0, 0, rr, 0);
                pg.addColorStop(0, mixHex(bl[0], '#2c0510', 0.38 * (1 - rt)));
                pg.addColorStop(0.52, mixHex(bl[0], bl[1], 0.45 + rt * 0.5));
                pg.addColorStop(1, style === 'cactus' && ring === 2 ? mixHex(bl[2], '#fff9ef', 0.55) : mixHex(bl[1], bl[2], 0.35 + rt * 0.65));
                g.fillStyle = pg;
            } else g.fillStyle = bl[1];

            g.beginPath();
            g.moveTo(0, 0);
            if (style === 'sakura') {
                g.bezierCurveTo(rr * 0.35, -pw, rr * 0.88, -pw * 0.85, rr, -pw * 0.18);
                g.lineTo(rr * 0.84, 0);
                g.lineTo(rr, pw * 0.18);
                g.bezierCurveTo(rr * 0.88, pw * 0.85, rr * 0.35, pw, 0, 0);
            } else if (style === 'cactus') {
                g.bezierCurveTo(rr * 0.34, -pw, rr * 0.78, -pw * 0.72, rr * 1.04, 0);
                g.bezierCurveTo(rr * 0.78, pw * 0.72, rr * 0.34, pw, 0, 0);
            } else {
                g.bezierCurveTo(rr * 0.28, -pw * 1.05, rr * 0.85, -pw * 0.92, rr, 0);
                g.bezierCurveTo(rr * 0.85, pw * 0.92, rr * 0.28, pw * 1.05, 0, 0);
            }
            g.closePath();
            g.fill();

            g.strokeStyle = mixHex(bl[2], '#ffffff', 0.35, 0.28);
            g.lineWidth = Math.max(0.5, radius * 0.03);
            g.stroke();
            g.restore();
        }
    }

    // Живая сердцевина с золотистыми тычинками
    if (style === 'rose') {
        const cg = g.createRadialGradient(0, 0, 0, 0, 0, radius * 0.34);
        cg.addColorStop(0, '#ffdca2');
        cg.addColorStop(0.45, bl[0]);
        cg.addColorStop(1, mixHex(bl[1], bl[2], 0.4));
        g.fillStyle = cg;
        g.beginPath(); g.arc(0, 0, radius * 0.26, 0, Math.PI * 2); g.fill();
        g.strokeStyle = mixHex(bl[2], '#fff5f7', 0.45, 0.65);
        g.lineWidth = Math.max(0.7, radius * 0.045);
        for (let sp = 0; sp < 3; sp++) {
            const sa = sp * 2.1;
            g.beginPath();
            g.arc(0, 0, radius * (0.1 + sp * 0.065), sa, sa + 1.9);
            g.stroke();
        }
    } else {
        const cr = radius * (style === 'cactus' ? 0.32 : 0.24);
        const cg = g.createRadialGradient(0, 0, 0, 0, 0, cr * 1.2);
        cg.addColorStop(0, '#fff2c2');
        cg.addColorStop(0.55, '#f2a94e');
        cg.addColorStop(1, mixHex(bl[0], '#4a0814', 0.4, 0.7));
        g.fillStyle = cg;
        g.beginPath(); g.arc(0, 0, cr, 0, Math.PI * 2); g.fill();

        const stCnt = style === 'cactus' ? 14 : 7;
        g.strokeStyle = 'rgba(255,222,150,0.72)';
        g.lineWidth = Math.max(0.55, radius * 0.03);
        for (let i = 0; i < stCnt; i++) {
            const a = (i / stCnt) * Math.PI * 2;
            const sr = cr * (style === 'cactus' ? 1.28 : 1.1);
            const sx = Math.cos(a) * sr, sy = Math.sin(a) * sr;
            g.beginPath(); g.moveTo(0, 0); g.lineTo(sx, sy); g.stroke();
            g.fillStyle = '#fff3cf';
            g.beginPath(); g.arc(sx, sy, Math.max(0.75, radius * 0.048), 0, Math.PI * 2); g.fill();
        }
    }
    g.restore();
}

// Ручной керамический горшок с живой глазурью, рефлексом алого ковра и фактурным грунтом
function drawCeramicPot(g, bx, baseY, sp, stage, lit) {
    const shapes = [
        { topW: 102, botW: 66, h: 66, rimH: 11, belly: 1.05, feet: false }, // классическая терракота
        { topW: 128, botW: 88, h: 48, rimH: 9,  belly: 1.08, feet: true },  // широкая чаша бонсай/эхеверии
        { topW: 88,  botW: 60, h: 76, rimH: 10, belly: 1.06, feet: false }  // высокий сосуд ручной лепки
    ];
    const sh = shapes[sp.potShape] || shapes[0];
    const topY = baseY - sh.h;
    const tw = sh.topW * 0.5, bw = sh.botW * 0.5;
    const [pDark, pMid, pLight] = sp.pot;

    // Глубокая мягкая тень горшка на ковре (прочно «сажает» растение в комнату)
    if (g.createRadialGradient) {
        const sr = bw * 1.75 + stage * 5;
        const sg = g.createRadialGradient(bx, baseY + 3, bw * 0.2, bx, baseY + 4, sr);
        sg.addColorStop(0, 'rgba(4,1,2,0.88)');
        sg.addColorStop(0.55, 'rgba(9,2,4,0.56)');
        sg.addColorStop(1, 'rgba(9,2,4,0)');
        g.fillStyle = sg;
        g.save();
        g.translate(bx, baseY + 4);
        g.scale(1, 0.26);
        g.beginPath(); g.arc(0, 0, sr, 0, Math.PI * 2); g.fill();
        g.restore();
    }

    // Ножки у японской чаши
    if (sh.feet) {
        g.fillStyle = mixHex(pDark, '#080203', 0.45);
        for (const dir of [-1, 1]) {
            g.beginPath();
            g.roundRect ? g.roundRect(bx + dir * (bw * 0.68) - 8, baseY - 4, 16, 8, 3) : g.rect(bx + dir * (bw * 0.68) - 8, baseY - 4, 16, 8);
            g.fill();
        }
    }

    // Тело сосуда с трёхмерной цилиндрической светотенью
    g.save();
    g.beginPath();
    g.moveTo(bx - tw, topY + 2);
    g.bezierCurveTo(bx - tw * sh.belly, topY + sh.h * 0.42, bx - bw * 1.08, baseY - 8, bx - bw, baseY);
    g.quadraticCurveTo(bx, baseY + 11, bx + bw, baseY);
    g.bezierCurveTo(bx + bw * 1.08, baseY - 8, bx + tw * sh.belly, topY + sh.h * 0.42, bx + tw, topY + 2);
    g.closePath();

    if (g.createLinearGradient) {
        const pg = g.createLinearGradient(bx - tw, topY, bx + tw, topY);
        pg.addColorStop(0, mixHex(pDark, '#ff5c6e', lit ? 0.22 : 0.1));
        pg.addColorStop(0.14, pDark);
        pg.addColorStop(0.34, pLight);
        pg.addColorStop(0.58, pMid);
        pg.addColorStop(0.86, mixHex(pDark, '#090204', 0.35));
        pg.addColorStop(1, mixHex(pMid, '#ff6878', lit ? 0.28 : 0.14));
        g.fillStyle = pg;
    } else g.fillStyle = pMid;
    g.fill();

    // Тень под ободком и тёплый красный рефлекс снизу от ковра
    if (g.createLinearGradient) {
        const vg = g.createLinearGradient(bx, topY, bx, baseY + 8);
        vg.addColorStop(0, 'rgba(6,1,3,0.52)');
        vg.addColorStop(0.2, 'rgba(6,1,3,0)');
        vg.addColorStop(0.76, 'rgba(120,18,32,0.06)');
        vg.addColorStop(1, 'rgba(18,3,6,0.55)');
        g.fillStyle = vg;
        g.fill();
    }

    // Тонкая рельефная бороздка ручной работы
    g.strokeStyle = mixHex(pLight, '#ff9aa4', 0.22, stage >= 3 ? 0.42 : 0.22);
    g.lineWidth = 1.3;
    const bandY = topY + sh.h * 0.44;
    const bandW = tw * 0.92;
    g.beginPath();
    g.moveTo(bx - bandW, bandY);
    g.quadraticCurveTo(bx, bandY + 9, bx + bandW, bandY);
    g.stroke();
    g.restore();

    // Объёмный керамический венчик (ободок)
    const rw = tw + 5.5, ry = 10.5;
    if (g.createLinearGradient) {
        const rg = g.createLinearGradient(bx - rw, topY, bx + rw, topY);
        rg.addColorStop(0, pDark);
        rg.addColorStop(0.28, mixHex(pLight, '#ffb8be', lit ? 0.25 : 0.12));
        rg.addColorStop(0.62, pMid);
        rg.addColorStop(0.92, pDark);
        rg.addColorStop(1, mixHex(pLight, '#ff7282', 0.25));
        g.fillStyle = rg;
    } else g.fillStyle = pLight;
    g.beginPath();
    g.ellipse(bx, topY + 2.5, rw, ry + 2.2, 0, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = mixHex(pLight, '#ffd0d6', 0.3, 0.48);
    g.lineWidth = 1.2;
    g.beginPath();
    g.ellipse(bx, topY + 0.5, rw - 1, ry, 0, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();

    // Глубокий живой грунт внутри горшка + мох или пустынная галька по виду растения
    const sw = tw - 3, sy = ry - 2.2;
    g.fillStyle = '#140807';
    g.beginPath(); g.ellipse(bx, topY + 2, sw, sy, 0, 0, Math.PI * 2); g.fill();

    const sr2 = rng(sp.seed ^ 0x51a7);
    const isDesert = sp.kind === 1 || sp.kind === 2;
    for (let i = 0; i < 22; i++) {
        const a = sr2() * Math.PI * 2, d = Math.sqrt(sr2()) * 0.88;
        const gx = bx + Math.cos(a) * sw * d;
        const gy = topY + 2 + Math.sin(a) * sy * d;
        if (isDesert) {
            // Тёплая терракотово-кварцевая галька вокруг кактуса и суккулента
            g.fillStyle = i % 3 === 0 ? '#6e453c' : i % 3 === 1 ? '#472823' : '#946a5e';
            g.beginPath();
            g.ellipse(gx, gy, 2.2 + sr2() * 2.8, 1.3 + sr2() * 1.5, sr2(), 0, Math.PI * 2);
            g.fill();
        } else {
            // Бархатные подушечки живого лесного мха и тёмной коры
            g.fillStyle = i % 3 === 0 ? '#244529' : i % 3 === 1 ? '#182e1c' : '#2e1612';
            g.beginPath();
            g.ellipse(gx, gy, 2.8 + sr2() * 4.2, 1.4 + sr2() * 1.8, 0, 0, Math.PI * 2);
            g.fill();
        }
    }

    // Передняя кромка венчика перекрывает грунт снизу для объёма
    g.strokeStyle = mixHex(pLight, '#ffc4ca', 0.2, 0.5);
    g.lineWidth = 1.6;
    g.beginPath();
    g.ellipse(bx, topY + 3, rw - 1.5, ry + 0.5, 0, Math.PI * 0.08, Math.PI * 0.92);
    g.stroke();

    return { soilY: topY + 2, halfW: sw, rimW: rw, baseY };
}

// 0: ПАПОРОТНИК — от изумрудной улитки-вайи в росе до пышного лесного каскада
function drawSpeciesFern(g, bx, by, sp, s, pal, bl, breath, pulse, r) {
    const drawCrosier = (x0, y0, h, dir, scale) => {
        const tx = x0 + dir * (6 * scale) + breath * 0.45 * scale;
        const ty = y0 - h;
        const cx = x0 - dir * (4 * scale) + breath * 0.2;
        const cy = y0 - h * 0.58;
        g.strokeStyle = pal[1];
        g.lineWidth = 3.2 * scale;
        g.lineCap = 'round';
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke();
        g.strokeStyle = pal[3];
        g.lineWidth = 1.4 * scale;
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke();
        // Живая спираль Фибоначчи на кончике молодой вайи
        let sx = tx, sy = ty, rad = 7.8 * scale, a0 = dir > 0 ? -Math.PI * 0.85 : -Math.PI * 0.15;
        g.strokeStyle = pal[2];
        g.lineWidth = 2.6 * scale;
        g.beginPath();
        for (let t = 0; t <= 26; t++) {
            const u = t / 26;
            const a = a0 + dir * u * Math.PI * 2.55;
            const cr = rad * (1 - u * 0.78);
            const px = sx + dir * rad * 0.7 + Math.cos(a) * cr;
            const py = sy + rad * 0.18 + Math.sin(a) * cr;
            if (t === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.stroke();
        g.strokeStyle = pal[3];
        g.lineWidth = 1.1 * scale;
        g.stroke();
    };

    if (s === 0) {
        const dir = sp.lean >= 0 ? 1 : -1;
        drawPointedLeaf(g, bx - dir * 3, by - 2, -Math.PI * 0.5 - dir * 0.72, 22, 4.5, pal, { bend: dir * 3 });
        drawPointedLeaf(g, bx + dir * 2, by - 1, -Math.PI * 0.5 + dir * 0.88, 17, 3.8, pal, { back: true });
        drawCrosier(bx, by + 1, 36, dir, 1.05);
        drawDew(g, bx + dir * 9, by - 36, 2.4);
        return;
    }

    const frondCounts = [1, 5, 8, 12, 15, 18][s];
    const maxLen = [38, 72, 108, 146, 178, 206][s];

    for (let layer = 0; layer < 2; layer++) {
        for (let i = 0; i < frondCounts; i++) {
            if ((i % 2) !== layer) continue;
            const u = frondCounts === 1 ? 0 : (i / (frondCounts - 1)) * 2 - 1;
            const jitter = (r() - 0.45) * 16;
            const len = maxLen * (1 - Math.abs(u) * 0.2) + jitter;
            // Каждая вайя дышит в своей мягкой фазе, корень неподвижен
            const tipSway = breath * (0.65 + 0.35 * Math.cos(i * 1.3)) * (len / 140);
            const x0 = bx + u * (8 + s * 1.4);
            const y0 = by + (layer ? 1 : -2);
            const spread = u * len * (0.72 + s * 0.045) + sp.lean * (5 + s * 1.5);
            const cx = x0 + spread * 0.44 + tipSway * 0.4;
            const cy = y0 - len * (0.94 - Math.abs(u) * 0.16);
            const droop = s >= 3 ? Math.pow(Math.abs(u), 1.4) * (28 + s * 8) : Math.abs(u) * 10;
            const tx = x0 + spread + tipSway;
            const ty = y0 - len * (0.86 - Math.abs(u) * 0.42) + droop;

            // Тёмный гибкий рахис (стебель вайи)
            g.strokeStyle = layer === 0 ? pal[0] : mixHex(pal[1], '#3b1c18', 0.35);
            g.lineWidth = layer === 0 ? 1.5 : 1.9;
            g.lineCap = 'round';
            g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke();

            // Перистые листочки (пинны) вдоль дуги вайи
            const pairs = 7 + s * 3;
            for (let j = 2; j <= pairs; j++) {
                const t = j / (pairs + 0.6), inv = 1 - t;
                const px = inv * inv * x0 + 2 * inv * t * cx + t * t * tx;
                const py = inv * inv * y0 + 2 * inv * t * cy + t * t * ty;
                const dx = 2 * inv * (cx - x0) + 2 * t * (tx - cx);
                const dy = 2 * inv * (cy - y0) + 2 * t * (ty - cy);
                const tang = Math.atan2(dy, dx);
                const env = Math.sin(Math.pow(t, 0.78) * Math.PI);
                const pLen = (6 + s * 2.9) * env * (layer === 0 ? 0.85 : 1);
                const pWid = Math.max(1.8, pLen * 0.27);
                const rim = layer === 1 && t > 0.62 && Math.abs(u) > 0.35;
                drawPointedLeaf(g, px, py, tang - 1.12, pLen, pWid, pal, { back: layer === 0, rim, noVein: true });
                drawPointedLeaf(g, px, py, tang + 1.12, pLen, pWid, pal, { back: layer === 0, rim: rim && u > 0, noVein: true });

                // Тёплые светящиеся споры-сорусы на стадиях 5 и 6
                if (s >= 4 && layer === 1 && j % 3 === 0 && t > 0.3 && t < 0.86) {
                    const sc = s === 5 ? bl[1] : bl[0];
                    if (s === 5 && j % 6 === 0) radialAura(g, px, py, 7, bl[1], bl[0], 0.22 + pulse * 0.2);
                    g.fillStyle = s === 5 ? mixHex(bl[2], '#ffd89e', 0.4) : sc;
                    g.beginPath(); g.arc(px + Math.cos(tang + 1.1) * pLen * 0.45, py + Math.sin(tang + 1.1) * pLen * 0.45, s === 5 ? 1.7 : 1.3, 0, Math.PI * 2); g.fill();
                }
            }
            if (s === 5 && layer === 1 && i % 4 === 1) drawDew(g, tx, ty + 1, 2.1);
        }
    }
    // Молодая раскручивающаяся улитка в сердце куста
    if (s <= 3) drawCrosier(bx + sp.lean * 4, by, 26 + s * 14, sp.lean >= 0 ? 1 : -1, 0.82);
}

// 1: КАКТУС — благородный скульптурный цереус/сагуаро (НЕПОДВИЖЕН в горшке, 3D-рёбра, ареолы, иглы и ночное цветение!)
function drawSpeciesCactus(g, bx, by, sp, s, pal, bl, pulse, r) {
    // Рисует ребристый 3D-сегмент кактуса с восковым налётом, пушистыми ареолами и лучистыми иглами
    const drawRibbedColumn = (cx, baseY, h, rad, ribs, isMain) => {
        const topY = baseY - h;
        g.save();
        // Силуэт живого округлого стебля (слегка пухлее в середине, мягкий купол сверху)
        g.beginPath();
        g.moveTo(cx - rad * 0.86, baseY + 2);
        g.bezierCurveTo(cx - rad * 1.08, baseY - h * 0.28, cx - rad * 1.06, topY + rad * 0.9, cx - rad * 0.88, topY + rad * 0.55);
        g.bezierCurveTo(cx - rad * 0.58, topY - rad * 0.12, cx + rad * 0.58, topY - rad * 0.12, cx + rad * 0.88, topY + rad * 0.55);
        g.bezierCurveTo(cx + rad * 1.06, topY + rad * 0.9, cx + rad * 1.08, baseY - h * 0.28, cx + rad * 0.86, baseY + 2);
        g.closePath();

        // Объёмный градиент живой сизо-изумрудной кожицы с алым контровым рефлексом комнаты
        if (g.createLinearGradient) {
            const bg = g.createLinearGradient(cx - rad, topY, cx + rad, topY);
            bg.addColorStop(0, mixHex(pal[1], '#ff6878', 0.24));
            bg.addColorStop(0.14, pal[2]);
            bg.addColorStop(0.36, mixHex(pal[3], '#b9dec8', 0.26));
            bg.addColorStop(0.64, pal[2]);
            bg.addColorStop(0.88, pal[0]);
            bg.addColorStop(1, mixHex(pal[1], '#ff5e70', 0.28));
            g.fillStyle = bg;
        } else g.fillStyle = pal[2];
        g.fill();

        // Клип по телу стебля для глубоких трёхмерных ложбинок и светлых граней рёбер
        g.save();
        g.clip();

        // Мягкое затенение у самой земли и восковое свечение макушки
        if (g.createLinearGradient) {
            const vg = g.createLinearGradient(cx, topY, cx, baseY + 4);
            vg.addColorStop(0, mixHex(pal[3], '#e4f7ea', 0.22, 0.35));
            vg.addColorStop(0.28, 'rgba(0,0,0,0)');
            vg.addColorStop(0.84, 'rgba(8,14,10,0.18)');
            vg.addColorStop(1, 'rgba(8,3,4,0.62)');
            g.fillStyle = vg;
            g.fillRect(cx - rad * 1.2, topY - rad, rad * 2.4, h + rad + 8);
        }

        // Скульптурные вертикальные рёбра (сходятся дугой к макушке!)
        for (let rb = 0; rb < ribs; rb++) {
            const u = (rb / (ribs - 1)) * 2 - 1; // -1..1
            const valleyX = cx + u * rad * 0.86;
            const crownX = cx + u * rad * 0.24;
            // Глубокая теневая ложбинка между рёбрами
            g.strokeStyle = mixHex(pal[0], '#060c09', 0.45, 0.58);
            g.lineWidth = Math.max(1.2, rad * 0.11);
            g.beginPath();
            g.moveTo(cx + u * rad * 0.74, baseY + 3);
            g.bezierCurveTo(valleyX, baseY - h * 0.32, valleyX, topY + rad * 0.85, crownX, topY + 2);
            g.stroke();

            // Восковой светлый гребень соседнего ребра
            if (rb < ribs - 1) {
                const ru = ((rb + 0.5) / (ribs - 1)) * 2 - 1;
                const rx = cx + ru * rad * 0.9;
                const rTop = cx + ru * rad * 0.26;
                const litSide = ru < 0.25;
                g.strokeStyle = litSide ? mixHex(pal[3], '#dff5e5', 0.35, 0.42) : mixHex(pal[2], '#ff8d98', 0.22, 0.22);
                g.lineWidth = Math.max(1.0, rad * 0.085);
                g.beginPath();
                g.moveTo(cx + ru * rad * 0.76, baseY);
                g.bezierCurveTo(rx, baseY - h * 0.32, rx, topY + rad * 0.85, rTop, topY + 3);
                g.stroke();
            }
        }
        g.restore();

        // Тонкий алый контровой кант по контуру от света окна
        g.strokeStyle = 'rgba(255,124,136,0.28)';
        g.lineWidth = 1.15;
        g.stroke();

        // Пушистая кремовая макушка (апикальная меристема)
        g.fillStyle = 'rgba(244,226,210,0.62)';
        g.beginPath();
        g.ellipse(cx, topY + 3.5, rad * 0.26, rad * 0.11, 0, 0, Math.PI * 2);
        g.fill();

        // Пушистые ареолы и тончайшие золотисто-слоновые лучистые иголки по гребням рёбер
        const step = Math.max(11, isMain ? 15 : 13);
        const rows = Math.max(2, Math.floor((h - 8) / step));
        const spineLen = (isMain ? 6.5 : 5.2) + s * 0.55;

        const drawSpineCluster = (ax, ay, outDir, scale) => {
            const sl = spineLen * scale;
            // Тонкие радиальные иглы, подсвеченные контровым светом
            const fan = [-0.85, -0.42, 0, 0.42, 0.85];
            for (let f = 0; f < fan.length; f++) {
                const ang = (outDir >= 0 ? 0 : Math.PI) + fan[f] * (Math.abs(outDir) < 0.35 ? 1.4 : 0.72);
                const l = sl * (f === 2 ? 1.25 : 0.82);
                const dx = Math.abs(outDir) < 0.35 ? Math.cos(f * 1.25 - 0.3) * l * 0.78 : Math.cos(ang) * l;
                const dy = Math.abs(outDir) < 0.35 ? Math.sin(f * 1.25 - 0.3) * l * 0.65 - 1.2 : Math.sin(ang) * l * 0.78 - 1.0;
                g.strokeStyle = f === 2 ? 'rgba(255,232,206,0.78)' : 'rgba(245,198,186,0.52)';
                g.lineWidth = f === 2 ? 0.85 : 0.6;
                g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + dx, ay + dy); g.stroke();
            }
            // Бархатная подушечка ареолы
            g.fillStyle = '#ead2c0';
            g.beginPath(); g.arc(ax, ay, 1.35 * scale, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#8c5a4c';
            g.beginPath(); g.arc(ax + 0.3, ay + 0.3, 0.65 * scale, 0, Math.PI * 2); g.fill();
        };

        for (let row = 0; row <= rows; row++) {
            const t = (row + 0.55) / (rows + 0.85);
            const ay = baseY - 5 - t * (h - 9);
            const widthFactor = t > 0.82 ? Math.cos((t - 0.82) / 0.22 * 1.05) : Math.sin(t * 2.4) * 0.08 + 0.98;
            // Силуэтные иглы слева и справа (дают живой светящийся ореол настоящему кактусу!)
            drawSpineCluster(cx - rad * 0.96 * widthFactor, ay, -1, 1);
            drawSpineCluster(cx + rad * 0.96 * widthFactor, ay + 2, 1, 0.95);
            // Передние рёбра
            if (row % 1 === 0) {
                const shift = (row % 2) * 0.14 - 0.07;
                drawSpineCluster(cx + (-0.42 + shift) * rad * widthFactor, ay + 1, -0.2, 0.82);
                if (rad >= 17) drawSpineCluster(cx + (0.38 + shift) * rad * widthFactor, ay - 1, 0.2, 0.78);
            }
        }
        g.restore();
        return { x: cx, y: topY + 2 };
    };

    // Рисует плавно изогнутую живую боковую ветвь сагуаро — единый бесшовный 3D-изгиб с рёбрами и иглами!
    const drawCurvedArm = (stemX, joinY, dir, reach, armH, armR) => {
        const elbowX = stemX + dir * reach;
        const dipY = joinY + armR * 0.55;
        const riseY = joinY - armR * 0.45;
        const Layers = [
            { col: mixHex(pal[0], '#070d0a', 0.35), w: armR * 1.88, ox: 0, oy: 1.5 },
            { col: pal[1], w: armR * 1.72, ox: 0, oy: 0.5 },
            { col: pal[2], w: armR * 1.38, ox: -dir * 0.5, oy: -armR * 0.14 },
            { col: mixHex(pal[3], '#cdebd6', 0.22, 0.55), w: armR * 0.52, ox: -dir * 1, oy: -armR * 0.38 }
        ];
        g.save();
        g.lineCap = 'round';
        g.lineJoin = 'round';
        Layers.forEach(L => {
            g.strokeStyle = L.col;
            g.lineWidth = L.w;
            g.beginPath();
            g.moveTo(stemX - dir * 2 + L.ox, joinY + L.oy);
            g.bezierCurveTo(
                stemX + dir * reach * 0.58 + L.ox, dipY + L.oy,
                elbowX + L.ox, dipY + L.oy,
                elbowX + L.ox, riseY + L.oy
            );
            g.stroke();
        });
        // Тёмные бороздки рёбер и пара нежных иголок вдоль самого изгиба
        for (const ryOff of [-armR * 0.22, armR * 0.28]) {
            g.strokeStyle = mixHex(pal[0], '#060c09', 0.45, 0.52);
            g.lineWidth = Math.max(1.1, armR * 0.11);
            g.beginPath();
            g.moveTo(stemX, joinY + ryOff);
            g.bezierCurveTo(stemX + dir * reach * 0.58, dipY + ryOff, elbowX, dipY + ryOff, elbowX, riseY);
            g.stroke();
        }
        const spX = stemX + dir * reach * 0.72, spY = dipY + armR * 0.52;
        g.strokeStyle = 'rgba(248,214,196,0.58)';
        g.lineWidth = 0.65;
        g.beginPath();
        g.moveTo(spX, spY); g.lineTo(spX + dir * 3.5, spY + 4.5);
        g.moveTo(spX, spY); g.lineTo(spX - dir * 1.5, spY + 5);
        g.stroke();
        g.restore();

        const tip = drawRibbedColumn(elbowX, riseY + armR * 0.22, armH, armR, 5, false);
        return { x: tip.x, y: tip.y, r: armR };
    };

    // Лёгкая природная посадка без малейшего раскачивания!
    const rootX = bx + sp.lean * 2.5;
    const heights = [34, 68, 108, 148, 182, 206];
    const radii   = [19, 21, 23,  25,  26.5, 28];
    const h = heights[s], rad = radii[s];

    const armTips = [];
    // Боковые ветви появляются последовательно на стадиях 3, 4, 5-6
    if (s >= 2) {
        armTips.push(drawCurvedArm(rootX - rad * 0.55, by - h * 0.47, -1, 30 + s * 4.2, 26 + s * 11, 11.5 + s * 1.05));
    }
    if (s >= 3) {
        armTips.push(drawCurvedArm(rootX + rad * 0.55, by - h * 0.37, 1, 28 + s * 4.0, 22 + (s - 1) * 11.5, 11 + s * 1.0));
    }
    if (s >= 4) {
        armTips.push(drawCurvedArm(rootX - rad * 0.5, by - h * 0.71, -1, 24 + (s - 3) * 5, 22 + (s - 3) * 14, 11.5 + (s - 3) * 1.2));
    }

    // Главный величественный ребристый ствол
    const crown = drawRibbedColumn(rootX, by + 2, h, rad, s === 0 ? 5 : 6, true);

    // Округлая живая «детка» у подножия кактуса со 2-й стадии
    let pupTip = null;
    if (s >= 1) {
        const pDir = sp.lean >= 0 ? 1 : -1;
        const pRad = 8.5 + s * 1.45;
        const pH = 14 + s * 3.4;
        pupTip = drawRibbedColumn(rootX + pDir * (rad * 0.82 + 4), by + 4, pH, pRad, 4, false);
    }

    // Живое дыхание бутонов и роскошное ночное цветение «Царицы ночи» (5 и 6 стадии)
    const bloomBreath = 1 + pulse * 0.08;
    if (s === 4) {
        // Шелковистые налитые бутоны на пушистых макушках
        radialAura(g, crown.x, crown.y - 8, 34, bl[1], bl[0], 0.16 + pulse * 0.18);
        drawSilkBud(g, crown.x - 7, crown.y + 1, -0.28, 10.5 * bloomBreath, bl, pal, 0.25 + pulse * 0.2);
        drawSilkBud(g, crown.x + 6, crown.y + 2, 0.26, 9.2 * bloomBreath, bl, pal, 0.15);
        armTips.forEach((at, i) => {
            drawSilkBud(g, at.x, at.y + 1, i % 2 ? 0.18 : -0.18, (7.8 - i * 0.5) * bloomBreath, bl, pal, 0.18);
        });
    } else if (s === 5) {
        // Грандиозное ночное цветение пустыни!
        armTips.forEach((at, i) => {
            drawLushFlower(g, at.x, at.y - 2, (16.5 - i * 0.8) * bloomBreath, bl, {
                style: 'cactus', tilt: 0.78, rot: i * 0.7, glow: 0.55 + pulse * 0.5
            });
        });
        drawLushFlower(g, crown.x + 11, crown.y, 17 * bloomBreath, bl, {
            style: 'cactus', tilt: 0.76, rot: 0.45, glow: 0.6 + pulse * 0.5
        });
        drawLushFlower(g, crown.x - 6, crown.y - 4, 23.5 * bloomBreath, bl, {
            style: 'cactus', tilt: 0.8, rot: -0.2, glow: 0.85 + pulse * 0.55
        });
        if (pupTip) {
            drawSilkBud(g, pupTip.x + 2, pupTip.y + 1, 0.22, 8.2 * bloomBreath, bl, pal, 0.35);
        }
    }
    void r;
}

// 2: СУККУЛЕНТ — живая восковая эхеверия с алыми кончиками (розетка неподвижна!) и дугами колокольчиков
function drawSpeciesSucculent(g, bx, by, sp, s, pal, bl, breath, pulse) {
    const drawSuccLeaf = (cx, cy, ang, len, wid, tipBlush, lift) => {
        g.save();
        g.translate(cx, cy);
        g.rotate(ang);
        // Тень мясистого листа на нижний ярус
        g.fillStyle = 'rgba(7,3,4,0.34)';
        g.beginPath();
        g.moveTo(0, 2);
        g.bezierCurveTo(len * 0.32, -wid * 0.9, len * 0.86, -wid * 0.95, len * 1.02, 2);
        g.bezierCurveTo(len * 0.86, wid * 0.95, len * 0.32, wid * 0.9, 0, 2);
        g.fill();

        // Пудрово-нефритовая мякоть с румяным алым остриём (мукроном)
        const lg = g.createLinearGradient(0, 0, len, 0);
        lg.addColorStop(0, pal[0]);
        lg.addColorStop(0.28, pal[2]);
        lg.addColorStop(0.68, mixHex(pal[3], '#c8e4d8', 0.34 + lift * 0.14));
        lg.addColorStop(0.88, mixHex(pal[3], bl[1], 0.38 + tipBlush * 0.28));
        lg.addColorStop(1, mixHex(bl[1], bl[2], 0.25));
        g.fillStyle = lg;

        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(len * 0.25, -wid * 0.72, len * 0.76, -wid * 1.08, len * 0.93, -wid * 0.22);
        g.quadraticCurveTo(len * 1.04, 0, len * 1.07, 0);
        g.quadraticCurveTo(len * 1.04, 0, len * 0.93, wid * 0.22);
        g.bezierCurveTo(len * 0.76, wid * 1.08, len * 0.25, wid * 0.72, 0, 0);
        g.closePath();
        g.fill();

        // Алая кайма и восковой киль
        g.strokeStyle = mixHex(bl[1], '#ffb8c2', 0.3, 0.5 + pulse * 0.2);
        g.lineWidth = 0.95;
        g.beginPath();
        g.moveTo(len * 0.55, -wid * 0.78);
        g.quadraticCurveTo(len * 0.94, -wid * 0.42, len * 1.07, 0);
        g.quadraticCurveTo(len * 0.94, wid * 0.42, len * 0.55, wid * 0.78);
        g.stroke();

        g.strokeStyle = 'rgba(235,252,244,0.26)';
        g.lineWidth = 1.0;
        g.beginPath(); g.moveTo(len * 0.16, -wid * 0.08); g.lineTo(len * 0.88, 0); g.stroke();
        g.restore();
    };

    const drawRosette = (rx, ry, maxR, count, heightLift) => {
        // Золотой угол Фибоначчи 137.508° от внешних листьев к нежной сердцевине!
        const golden = 2.399963;
        const leaves = [];
        for (let i = 0; i < count; i++) {
            const t = i / Math.max(1, count - 1); // 0 внешний -> 1 центр
            const a = i * golden + sp.lean * 0.5;
            const len = maxR * (1 - t * 0.68);
            const wid = len * (0.36 + t * 0.1);
            // Перспектива 3/4: верхние листья смотрят вверх, передние — на зрителя
            const dx = Math.cos(a), dy = Math.sin(a) * 0.56 - (0.28 + t * 0.52);
            const screenAng = Math.atan2(dy, dx);
            const screenLen = len * Math.hypot(dx, dy * 0.95);
            leaves.push({ i, t, ang: screenAng, len: screenLen, wid, yOff: -t * heightLift + Math.sin(a) * 3 });
        }
        leaves.forEach(lf => {
            drawSuccLeaf(rx, ry + lf.yOff, lf.ang, lf.len, lf.wid, s >= 2 ? 0.85 : 0.45, lf.t);
        });
        // Жемчужная бутонообразная сердцевина розетки
        g.fillStyle = mixHex(pal[3], bl[2], 0.42);
        g.beginPath(); g.arc(rx, ry - heightLift - 1, Math.max(2.5, maxR * 0.09), 0, Math.PI * 2); g.fill();
    };

    const counts = [6, 11, 17, 24, 27, 30][s];
    const radii  = [22, 36, 52, 66, 72, 76][s];
    const lifts  = [7,  16, 26, 38, 42, 46][s];

    // Боковая розетка-«детка» у края чаши с 4-й стадии
    if (s >= 3) {
        const d = sp.lean >= 0 ? -1 : 1;
        drawRosette(bx + d * 42, by + 4, 24 + (s - 3) * 4, 11, 12);
    }

    // Главная каменная роза (абсолютно устойчива в горшке!)
    drawRosette(bx, by + 2, radii, counts, lifts);
    if (s >= 2) drawDew(g, bx - radii * 0.34, by - lifts * 0.45, 2.3);

    // Изящные высокие коралловые цветоносы эхеверии на 5 и 6 стадиях (едва покачиваются на воздухе)
    if (s >= 4) {
        const stalks = s === 5 ? [1, -1] : [sp.lean >= 0 ? 1 : -1];
        stalks.forEach((dir, idx) => {
            const sh = (s === 5 ? 196 : 152) - idx * 36;
            const sw = breath * (idx === 0 ? 0.65 : 0.5);
            const sx = bx + dir * 6, sy = by - lifts * 0.72;
            const cx = bx - dir * 12 + sw * 0.45, cy = by - sh * 0.68;
            const tx = bx + dir * (34 - idx * 6) + sw, ty = by - sh;

            const sg = g.createLinearGradient(sx, sy, tx, ty);
            sg.addColorStop(0, pal[2]);
            sg.addColorStop(0.45, mixHex(pal[3], bl[1], 0.58));
            sg.addColorStop(1, bl[1]);
            g.strokeStyle = sg;
            g.lineWidth = idx === 0 ? 3.0 : 2.4;
            g.lineCap = 'round';
            g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke();

            // Мелкие прицветные листочки на стебле
            for (const bt of [0.28, 0.48]) {
                const inv = 1 - bt;
                const px = inv * inv * sx + 2 * inv * bt * cx + bt * bt * tx;
                const py = inv * inv * sy + 2 * inv * bt * cy + bt * bt * ty;
                drawSuccLeaf(px, py, bt > 0.35 ? -0.4 : -2.6, 12, 4.2, 0.9, 0.7);
            }

            // Гроздь светящихся кораллово-алых колокольчиков
            const bells = s === 5 ? (idx === 0 ? 6 : 4) : 4;
            for (let b = 0; b < bells; b++) {
                const t = 0.6 + (b / Math.max(1, bells - 1)) * 0.4, inv = 1 - t;
                const px = inv * inv * sx + 2 * inv * t * cx + t * t * tx;
                const py = inv * inv * sy + 2 * inv * t * cy + t * t * ty;
                const side = (b % 2 ? 1 : -1) * dir;
                const bx2 = px + side * (11 - b * 0.7);
                const by2 = py + 7;
                g.strokeStyle = bl[1];
                g.lineWidth = 1.3;
                g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(bx2, py, bx2, by2 - 3); g.stroke();
                if (s === 5) {
                    radialAura(g, bx2, by2 + 3, 18, bl[1], bl[0], 0.2 + pulse * 0.18);
                    drawLushFlower(g, bx2, by2 + 2, 7.6 - b * 0.35, bl, { style: 'bell', tilt: 1, rot: -side * 0.14 });
                } else {
                    drawSilkBud(g, bx2, by2 - 2, Math.PI + side * 0.15, 5.8, bl, pal, 0.1);
                }
            }
        });
    }
}

// 3: БАМБУК — стройная живая бамбуковая рощица с глянцевыми коленцами и кружевной листвой
function drawSpeciesBamboo(g, bx, by, sp, s, pal, bl, breath, pulse, r) {
    // Тёмные речные голыши у корней бамбука
    if (s >= 2) {
        for (const [ox, oy, rx, ry] of [[-22, 3, 10, 5.5], [20, 4, 8.5, 4.8]]) {
            const rg = g.createRadialGradient(bx + ox - 3, by + oy - 2, 1, bx + ox, by + oy, rx);
            rg.addColorStop(0, '#59484a');
            rg.addColorStop(1, '#180d10');
            g.fillStyle = rg;
            g.beginPath(); g.ellipse(bx + ox, by + oy, rx, ry, 0, 0, Math.PI * 2); g.fill();
        }
    }

    const stalkCnt = [1, 1, 2, 4, 5, 6][s];
    const maxH = [38, 78, 118, 158, 188, 214][s];

    for (let i = 0; i < stalkCnt; i++) {
        const u = stalkCnt === 1 ? 0 : (i / (stalkCnt - 1)) * 2 - 1;
        const back = stalkCnt >= 3 && (i % 2 === 0);
        const sx = bx + u * (4 + stalkCnt * 4.8);
        const h = maxH * (1 - Math.abs(u) * 0.17) + (r() - 0.4) * 14;
        const sw = breath * (h / 165) * (0.8 + 0.2 * Math.sin(i * 1.9));
        const leanOff = u * (10 + s * 2.5) + sp.lean * (6 + s * 1.5) + sw;
        const segs = Math.max(2, Math.round(h / 28));
        const baseW = (s === 0 ? 5.2 : 4.2 + Math.min(3.2, s * 0.55)) * (back ? 0.82 : 1);

        let x0 = sx, y0 = by + 2;
        for (let sg = 1; sg <= segs; sg++) {
            const t = sg / segs;
            const x1 = sx + leanOff * (t * t);
            const y1 = by + 2 - h * t;
            const w = Math.max(1.8, baseW * (1 - t * 0.42));

            // Глянцевое цилиндрическое междоузлие бамбука
            g.lineCap = 'butt';
            g.strokeStyle = back ? pal[0] : pal[1];
            g.lineWidth = w + 1.4;
            g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();

            g.strokeStyle = back ? pal[1] : pal[2];
            g.lineWidth = w * 0.72;
            g.beginPath(); g.moveTo(x0 - w * 0.1, y0); g.lineTo(x1 - w * 0.1, y1); g.stroke();

            g.strokeStyle = mixHex(pal[3], '#e8f5d6', 0.35, back ? 0.3 : 0.65);
            g.lineWidth = Math.max(0.8, w * 0.24);
            g.beginPath(); g.moveTo(x0 - w * 0.22, y0); g.lineTo(x1 - w * 0.22, y1); g.stroke();

            // Характерное двойное коленце бамбука
            if (sg < segs) {
                const ang = Math.atan2(y1 - y0, x1 - x0) + Math.PI * 0.5;
                const nx = Math.cos(ang) * (w * 0.72), ny = Math.sin(ang) * (w * 0.72);
                g.strokeStyle = pal[0];
                g.lineWidth = 2.1;
                g.beginPath(); g.moveTo(x1 - nx, y1 - ny); g.lineTo(x1 + nx, y1 + ny); g.stroke();
                g.strokeStyle = mixHex(pal[3], '#f2e8c9', 0.45, 0.75);
                g.lineWidth = 1.1;
                g.beginPath(); g.moveTo(x1 - nx, y1 - ny - 1.3); g.lineTo(x1 + nx, y1 + ny - 1.3); g.stroke();
            }

            // Тонкие веточки с веерами изящных бамбуковых листьев
            if (sg >= Math.max(1, segs - 3) && (s >= 1 || sg === segs)) {
                const dir = ((sg + i) % 2 ? 1 : -1);
                const bx2 = x1 + dir * (10 + s * 2.2) + sw * 0.2;
                const by2 = y1 - (5 + s * 1.2);
                g.strokeStyle = pal[2];
                g.lineWidth = 1.1;
                g.beginPath(); g.moveTo(x1, y1); g.lineTo(bx2, by2); g.stroke();

                const leafL = (18 + s * 3.8) * (back ? 0.85 : 1);
                const fanAngles = dir > 0 ? [-0.45, 0.08, 0.52] : [Math.PI + 0.45, Math.PI - 0.08, Math.PI - 0.52];
                const cntL = s === 0 ? 2 : 3;
                for (let f = 0; f < cntL; f++) {
                    drawPointedLeaf(g, bx2, by2, fanAngles[f] + breath * 0.012, leafL * (f === 1 ? 1.12 : 0.88), 3.6 + s * 0.35, pal, {
                        back, rim: !back && f === 0, bend: 3.5
                    });
                }
                if (s === 4 && !back && sg >= segs - 1) {
                    drawSilkBud(g, bx2, by2 - 1, dir * 0.4, 5.8, bl, pal, 0.2);
                } else if (s === 5 && sg >= segs - 1 && (i + sg) % 2 === 0) {
                    drawLushFlower(g, bx2, by2 - 2, back ? 8.5 : 11, bl, {
                        style: 'sakura', tilt: 0.88, rot: i + sg, glow: 0.55 + pulse * 0.45
                    });
                }
            }
            x0 = x1; y0 = y1;
        }
        // Верхушечная кисть листьев
        drawPointedLeaf(g, x0, y0, -1.9 + breath * 0.014, 18 + s * 3.2, 3.5 + s * 0.3, pal, { back, rim: !back, bend: -3 });
        drawPointedLeaf(g, x0, y0, -1.15 + breath * 0.014, 20 + s * 3.5, 3.6 + s * 0.3, pal, { back, rim: true, bend: 3 });
    }
}

// 4: ЛИАНА — глянцевый сердцелистный филодендрон/жасмин с каскадными плетями до самого ковра
function drawSpeciesVine(g, bx, by, pot, sp, s, pal, bl, breath, pulse, r) {
    // Живой витой усик лианы
    const drawTendril = (x0, y0, dir, scale) => {
        g.strokeStyle = mixHex(pal[3], bl[2], 0.25, 0.72);
        g.lineWidth = 1.05;
        g.beginPath();
        for (let t = 0; t <= 22; t++) {
            const u = t / 22;
            const px = x0 + dir * (u * 14 * scale + Math.cos(u * 10) * 3.2 * (1 - u * 0.4) * scale);
            const py = y0 - u * 10 * scale + Math.sin(u * 10) * 3.2 * (1 - u * 0.4) * scale;
            if (t === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.stroke();
    };

    // Вьющиеся вверх живые побеги
    const upH = [32, 66, 104, 142, 174, 202][s];
    const upStems = s === 0 ? 1 : s <= 2 ? 2 : 3;
    for (let i = 0; i < upStems; i++) {
        const h = upH - i * 22;
        const dir = (i % 2 ? -1 : 1) * (sp.lean >= 0 ? 1 : -1);
        const sw = breath * (h / 160) * 0.75;
        const x0 = bx + (i - (upStems - 1) * 0.5) * 18;
        const cx1 = x0 + dir * (18 + s * 6) + sw * 0.4;
        const cx2 = x0 - dir * (14 + s * 4.5) + sw * 0.75;
        const tx = x0 + dir * (6 + s * 2) + sw;
        const ty = by - h;

        g.strokeStyle = i === upStems - 1 ? pal[2] : pal[1];
        g.lineWidth = 2.6 - i * 0.3;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x0, by + 2);
        g.bezierCurveTo(cx1, by - h * 0.36, cx2, by - h * 0.72, tx, ty);
        g.stroke();

        const lCnt = 2 + s * 2;
        for (let j = 1; j <= lCnt; j++) {
            const t = j / lCnt, u = 1 - t;
            const px = u*u*u*x0 + 3*u*u*t*cx1 + 3*u*t*t*cx2 + t*t*t*tx;
            const py = u*u*u*(by + 2) + 3*u*u*t*(by - h * 0.36) + 3*u*t*t*(by - h * 0.72) + t*t*t*ty;
            const side = j % 2 ? 1 : -1;
            const spreadOut = side * (8 + (1 - t * 0.55) * (6 + s * 2.6));
            const lSize = (12.5 + s * 2.4) * (1 - t * 0.22) + r() * 2;
            drawHeartLeaf(g, px + spreadOut, py - 5, side * 0.62 + breath * 0.01, lSize, pal, j % 3 === 0 || s >= 4);
            if (s === 4 && j % 3 === 0) {
                drawSilkBud(g, px - side * 5, py - 3, -side * 0.35, 6.8, bl, pal, 0.2);
            } else if (s === 5 && j % 2 === 0) {
                drawLushFlower(g, px - side * 6, py - 4, 11.5 - t * 2, bl, {
                    style: 'sakura', tilt: 0.9, rot: j * 0.8, glow: 0.55 + pulse * 0.45
                });
            }
        }
        if (s >= 1) drawTendril(tx, ty, dir, 0.9 + s * 0.08);
        if (s === 5 && i === 0) {
            drawLushFlower(g, tx, ty - 4, 15, bl, { style: 'lotus', petals: 6, tilt: 0.86, glow: 0.8 + pulse * 0.5 });
        }
    }

    // Живописные ниспадающие плети через керамический венчик до самого ковра
    if (s >= 1) {
        const d0 = sp.lean >= 0 ? 1 : -1;
        const trails = s >= 3 ? [d0, -d0, d0 * 0.42] : s === 2 ? [d0, -d0] : [d0];
        trails.forEach((d, idx) => {
            const sign = d >= 0 ? 1 : -1;
            const dropMax = pot.baseY - by + 6;
            const drop = Math.min(dropMax, [0, 26, 48, 66, 74, 78][s] - idx * 10);
            const sx = bx + d * (pot.halfW * 0.88);
            const sy = by + 4;
            const spread = s >= 4 && idx < 2 ? (s - 3) * 16 : 5;
            const ex = sx + sign * (12 + spread) + breath * 0.28;
            const ey = Math.min(pot.baseY + 5, sy + drop);

            g.strokeStyle = pal[2];
            g.lineWidth = 2.1;
            g.beginPath();
            g.moveTo(bx + d * pot.halfW * 0.45, by + 1);
            g.quadraticCurveTo(sx + sign * 8, sy + drop * 0.38, ex, ey);
            g.stroke();

            const steps = 2 + s;
            for (let k = 1; k <= steps; k++) {
                const t = k / steps, u = 1 - t;
                const px = u*u*(bx + d * pot.halfW * 0.45) + 2*u*t*(sx + sign * 8) + t*t*ex;
                const py = u*u*(by + 1) + 2*u*t*(sy + drop * 0.38) + t*t*ey;
                drawHeartLeaf(g, px, py - 2, (k % 2 ? 0.32 : -0.32) * sign, 10.5 + s * 1.35 * (1 - t * 0.22), pal, k === steps);
                if (s === 4 && k % 3 === 0) {
                    drawSilkBud(g, px + sign * 5, py, Math.PI * 0.82 * sign, 5.8, bl, pal, 0.15);
                } else if (s === 5 && k % 2 === 0) {
                    drawLushFlower(g, px + sign * 4, py + 1, 9.8, bl, {
                        style: 'sakura', tilt: 0.92, rot: k * 1.1, glow: 0.5 + pulse * 0.4
                    });
                }
            }
        });
    }
}

// 5: ЦВЕТОК — живой бархатный куст ночной розы / японской камелии в капельках росы
function drawSpeciesFlower(g, bx, by, sp, s, pal, bl, breath, pulse, r) {
    if (s === 0) {
        const sw = breath * 0.35;
        const tx = bx + sp.lean * 3 + sw, ty = by - 34;
        g.strokeStyle = pal[2];
        g.lineWidth = 3.0;
        g.lineCap = 'round';
        g.beginPath(); g.moveTo(bx, by + 2); g.quadraticCurveTo(bx, by - 18, tx, ty); g.stroke();
        drawPointedLeaf(g, tx, ty + 6, -2.45, 24, 8.2, pal, { bend: -2 });
        drawPointedLeaf(g, tx, ty + 6, -0.68, 24, 8.2, pal, { rim: true, bend: 2 });
        drawDew(g, tx + 11, ty - 2, 2.3);
        g.fillStyle = mixHex(pal[3], bl[2], 0.45);
        g.beginPath(); g.ellipse(tx, ty - 3, 2.8, 4.2, 0, 0, Math.PI * 2); g.fill();
        return;
    }

    // Пышная прикорневая розетка глянцевых листьев камелии
    const baseLeaves = 3 + s * 2;
    for (let b = 0; b < baseLeaves; b++) {
        const u = (b / (baseLeaves - 1)) * 2 - 1;
        const ang = -Math.PI * 0.5 + u * 1.26;
        const len = 26 + s * 5.8 - Math.abs(u) * 6;
        drawPointedLeaf(g, bx + u * 12, by + 1, ang, len, len * 0.34, pal, {
            back: b % 2 === 0, rim: b % 3 === 0, bend: u * 4
        });
    }

    const stemDefs = [
        [],
        [{ u: 0, h: 72, kind: 'leaf' }],
        [{ u: 0, h: 112, kind: 'bud', sz: 12.5 }],
        [{ u: -0.65, h: 112, kind: 'bud', sz: 10.5 }, { u: 0.12, h: 150, kind: 'half', sz: 18 }, { u: 0.72, h: 102, kind: 'bud', sz: 9.5 }],
        [{ u: -0.82, h: 132, kind: 'bud', sz: 12 }, { u: 0.78, h: 138, kind: 'half', sz: 17 }, { u: -0.25, h: 162, kind: 'bud', sz: 13.5 }, { u: 0.18, h: 184, kind: 'rose', sz: 23 }],
        [
            { u: -0.95, h: 142, kind: 'rose', sz: 19 },
            { u: 0.95,  h: 146, kind: 'rose', sz: 19.5 },
            { u: -0.46, h: 178, kind: 'rose', sz: 22 },
            { u: 0.52,  h: 174, kind: 'rose', sz: 21.5 },
            { u: 0.0,   h: 206, kind: 'rose', sz: 27 }
        ]
    ][s];

    stemDefs.forEach((st, idx) => {
        const h = st.h + (r() - 0.5) * 6;
        const sw = breath * (h / 165) * (0.75 + 0.25 * Math.cos(idx * 1.5));
        const x0 = bx + st.u * 14;
        const cx = bx + st.u * (24 + s * 5.2) + sp.lean * 6 + sw * 0.45;
        const tx = bx + st.u * (38 + s * 6.5) + sp.lean * 8 + sw;
        const ty = by - h;

        // Упругий живой стебель с тёплым бордовым оттенком у бутона
        const sg = g.createLinearGradient(x0, by, tx, ty);
        sg.addColorStop(0, pal[0]);
        sg.addColorStop(0.65, pal[2]);
        sg.addColorStop(1, mixHex(pal[2], bl[0], 0.42));
        g.strokeStyle = sg;
        g.lineWidth = 3.2 - Math.abs(st.u) * 0.6;
        g.lineCap = 'round';
        g.beginPath(); g.moveTo(x0, by + 1); g.quadraticCurveTo(cx, by - h * 0.54, tx, ty); g.stroke();

        // Глянцевые стеблевые листья с прожилками
        for (const lt of [0.34, 0.64]) {
            const inv = 1 - lt;
            const lx = inv * inv * x0 + 2 * inv * lt * cx + lt * lt * tx;
            const ly = inv * inv * (by + 1) + 2 * inv * lt * (by - h * 0.54) + lt * lt * ty;
            const side = (lt > 0.5 ? 1 : -1) * (idx % 2 ? -1 : 1);
            const ll = 24 + s * 2.8;
            drawPointedLeaf(g, lx, ly, -Math.PI * 0.5 + side * 1.05, ll, ll * 0.36, pal, { rim: side > 0, bend: side * 3 });
        }

        const openScale = 1 + pulse * 0.06;
        if (st.kind === 'leaf') {
            drawPointedLeaf(g, tx, ty, -2.2, 26, 8.8, pal, { bend: -2 });
            drawPointedLeaf(g, tx, ty, -0.95, 26, 8.8, pal, { rim: true, bend: 2 });
            drawDew(g, tx + 9, ty - 11, 2.2);
        } else if (st.kind === 'bud') {
            drawSilkBud(g, tx, ty + 2, st.u * 0.24, st.sz * openScale, bl, pal, 0.22);
        } else if (st.kind === 'half') {
            drawLushFlower(g, tx, ty - 2, st.sz * openScale, bl, {
                style: 'rose', petals: 6, tilt: 0.78, rot: idx, glow: 0.35 + pulse * 0.35
            });
        } else if (st.kind === 'rose') {
            // Чашелистики под бархатной розой
            for (const sa of [-2.4, -0.75, 0.8, 2.35]) {
                drawPointedLeaf(g, tx, ty + 1, sa, st.sz * 0.92, st.sz * 0.22, pal, { noVein: true });
            }
            drawLushFlower(g, tx, ty - 3, st.sz * openScale, bl, {
                style: 'rose', petals: 7, tilt: 0.84, rot: idx * 0.9 + 0.2, glow: (s === 5 ? 0.72 : 0.45) + pulse * 0.45
            });
            if (st.u === 0) drawDew(g, tx + st.sz * 0.52, ty + 2, 2.1);
        }
    });
}

// 6: БОНСАЙ — древнее японское дерево с живой корой, корнями нэбари и облаками листвы/сакуры (ствол НЕПОДВИЖЕН!)
function drawSpeciesBonsai(g, bx, by, sp, s, pal, bl, breath, pulse, r) {
    const dir = sp.lean >= 0 ? 1 : -1;

    // Подушка изумрудного мха и дикий камень у корней бонсая
    if (s >= 1) {
        const mg = g.createLinearGradient(bx - 42, by - 6, bx + 42, by + 6);
        mg.addColorStop(0, pal[0]);
        mg.addColorStop(0.5, pal[2]);
        mg.addColorStop(1, pal[1]);
        g.fillStyle = mg;
        g.beginPath();
        g.ellipse(bx, by + 2, Math.min(48, 22 + s * 5.2), 6.5, 0, 0, Math.PI * 2);
        g.fill();
    }
    if (s >= 2) {
        const sx = bx - dir * 24, sy = by + 2;
        const sg = g.createRadialGradient(sx - 3, sy - 4, 1, sx, sy, 13);
        sg.addColorStop(0, '#6e585a');
        sg.addColorStop(0.6, '#382528');
        sg.addColorStop(1, '#14090b');
        g.fillStyle = sg;
        g.beginPath();
        g.moveTo(sx - 11, sy + 3);
        g.quadraticCurveTo(sx - 8, sy - 9, sx + 2, sy - 7);
        g.quadraticCurveTo(sx + 12, sy - 5, sx + 11, sy + 4);
        g.closePath();
        g.fill();
    }

    // Плавная сужающаяся древесная ветвь с настоящей фактурой коры
    const drawBarkLimb = (x0, y0, cx, cy, x1, y1, w0, w1) => {
        const steps = 18;
        for (let i = 0; i < steps; i++) {
            const t0 = i / steps, t1 = (i + 1) / steps;
            const u0 = 1 - t0, u1 = 1 - t1;
            const ax = u0*u0*x0 + 2*u0*t0*cx + t0*t0*x1;
            const ay = u0*u0*y0 + 2*u0*t0*cy + t0*t0*y1;
            const px = u1*u1*x0 + 2*u1*t1*cx + t1*t1*x1;
            const py = u1*u1*y0 + 2*u1*t1*cy + t1*t1*y1;
            const w = w0 + (w1 - w0) * t0;
            g.lineCap = 'round';
            g.strokeStyle = '#1f0f0e';
            g.lineWidth = w;
            g.beginPath(); g.moveTo(ax, ay); g.lineTo(px, py); g.stroke();
            g.strokeStyle = '#4e2b26';
            g.lineWidth = w * 0.68;
            g.beginPath(); g.moveTo(ax - w * 0.12, ay); g.lineTo(px - w * 0.12, py); g.stroke();
            if (w > 4) {
                g.strokeStyle = 'rgba(164,96,86,0.45)';
                g.lineWidth = Math.max(0.9, w * 0.2);
                g.beginPath(); g.moveTo(ax - w * 0.26, ay); g.lineTo(px - w * 0.26, py); g.stroke();
            }
        }
    };

    const trunkH = [36, 68, 102, 134, 160, 178][s];
    const baseW  = [4.5, 8.5, 13, 18, 22, 25][s];
    const c1x = bx - dir * (8 + s * 6.5), c1y = by - trunkH * 0.48;
    const topX = bx + dir * (6 + s * 4.5), topY = by - trunkH;

    // Узловые поверхностные корни (нэбари) прочно держат землю
    if (s >= 2) {
        drawBarkLimb(bx - baseW * 0.25, by - 4, bx - 14, by + 2, bx - (18 + s * 4), by + 5, baseW * 0.48, 2.2);
        drawBarkLimb(bx + baseW * 0.25, by - 4, bx + 14, by + 2, bx + (17 + s * 3.8), by + 5, baseW * 0.45, 2.0);
        drawBarkLimb(bx, by - 2, bx + dir * 4, by + 3, bx + dir * (10 + s * 2), by + 6, baseW * 0.36, 1.8);
    }

    // Главный скульптурный S-образный ствол (100% неподвижен!)
    drawBarkLimb(bx, by + 2, c1x, c1y, topX, topY, baseW, Math.max(2.2, baseW * 0.26));

    // Живое многослойное облако из десятков отдельных листочков и цветов сакуры
    const drawFoliageCloud = (px, py, rx, ry) => {
        const whisper = breath * 0.22; // едва уловимый шёпот самых кончиков листвы
        if (s === 5) radialAura(g, px, py - 2, rx * 1.35, bl[1], bl[0], 0.22 + pulse * 0.16);

        // Живая трёхмерная крона бонсая: тёмная тень снизу облака, насыщенный изумруд в толще, солнечный и алый блик по верхнему куполу!
        const subLobes = [
            { ox: -rx * 0.42, oy: ry * 0.12, s: 0.68 },
            { ox:  rx * 0.42, oy: ry * 0.14, s: 0.66 },
            { ox:  0,         oy: -ry * 0.16, s: 0.82 }
        ];
        const leafCnt = Math.round(26 + rx * 0.95);
        // Сортируем листики снизу вверх, чтобы верхние подсвеченные перекрывали теневые!
        const pts = [];
        for (let i = 0; i < leafCnt; i++) {
            const lb = subLobes[i % 3];
            const a = i * 2.39996 + 0.4;
            const d = Math.sqrt(((i * 17) % leafCnt) / leafCnt);
            const lx = px + lb.ox + Math.cos(a) * rx * lb.s * d;
            const ly = py + lb.oy + Math.sin(a) * ry * lb.s * d;
            pts.push({ lx, ly, ny: (ly - py) / Math.max(1, ry), ang: Math.cos(a) * 0.48 + (r() - 0.5) * 0.5, rw: 5.5 + r() * 3.6, rh: 2.6 + r() * 1.5, rim: r() > 0.72 });
        }
        pts.sort((a, b) => b.ly - a.ly);
        pts.forEach(pt => {
            const col = pt.ny > 0.28 ? pal[0] : pt.ny > -0.05 ? pal[1] : pt.ny > -0.42 ? pal[2] : (pt.rim ? pal[4] : pal[3]);
            g.save();
            g.translate(pt.lx + (pt.ny < 0 ? whisper : 0), pt.ly);
            g.rotate(pt.ang);
            g.fillStyle = col;
            g.beginPath();
            g.ellipse(0, 0, pt.rw, pt.rh, 0, 0, Math.PI * 2);
            g.fill();
            g.restore();
        });

        // Нежные бутоны (стадия 5) и роскошное цветение сакуры (стадия 6)
        if (s === 4) {
            const bCnt = Math.round(rx * 0.36);
            for (let b = 0; b < bCnt; b++) {
                const a = b * 2.39996 + 0.5;
                const d = Math.sqrt((b + 0.5) / bCnt) * 0.88;
                const fx = px + Math.cos(a) * rx * d + whisper;
                const fy = py + Math.sin(a) * ry * d - ry * 0.18;
                g.fillStyle = b % 2 ? bl[1] : bl[2];
                g.beginPath(); g.arc(fx, fy, 2.4 + (b % 2) * 0.7, 0, Math.PI * 2); g.fill();
            }
        } else if (s === 5) {
            const fCnt = Math.round(rx * 0.44);
            for (let f = 0; f < fCnt; f++) {
                const a = f * 2.39996 + 0.3;
                const d = Math.sqrt((f + 0.4) / fCnt) * 0.95;
                const fx = px + Math.cos(a) * rx * d + whisper;
                const fy = py + Math.sin(a) * ry * d - ry * 0.22;
                drawLushFlower(g, fx, fy, 5.8 + (f % 3) * 1.4, bl, {
                    style: 'sakura', tilt: 0.86, rot: f * 1.1, glow: 0
                });
            }
        }
    };

    if (s === 0) {
        drawPointedLeaf(g, topX, topY, -2.35, 19, 5.8, pal, { bend: -2 });
        drawPointedLeaf(g, topX, topY, -0.8, 19, 5.8, pal, { rim: true, bend: 2 });
        drawPointedLeaf(g, topX, topY - 1, -1.57, 15, 4.6, pal, { rim: true });
        return;
    }
    if (s === 1) {
        drawBarkLimb(topX - dir * 2, topY + 12, topX - dir * 12, topY + 6, topX - dir * 18, topY + 2, 4, 1.6);
        drawFoliageCloud(topX - dir * 18, topY, 18, 10);
        drawFoliageCloud(topX + dir * 2, topY - 7, 25, 13);
        return;
    }

    const branches = [
        { sy: 0.44, dx: -dir * (36 + s * 6.5), dy: 0.36, rx: 24 + s * 4.2, ry: 12 + s * 1.6, min: 2 },
        { sy: 0.58, dx:  dir * (34 + s * 6.2), dy: 0.22, rx: 23 + s * 4.0, ry: 11.5 + s * 1.5, min: 2 },
        { sy: 0.32, dx:  dir * (42 + s * 5.8), dy: 0.48, rx: 21 + s * 3.4, ry: 10.5 + s * 1.4, min: 3 },
        { sy: 0.78, dx: -dir * (26 + s * 5.0), dy: 0.08, rx: 22 + s * 3.8, ry: 11 + s * 1.5, min: 4 },
        { sy: 0.68, dx:  dir * (22 + s * 4.2), dy: -0.02, rx: 20 + s * 3.4, ry: 10.5 + s * 1.4, min: 5 }
    ];

    // Рисуем живые раскидистые ветви, а поверх них — пышные ярусные шапки
    const activePads = [];
    branches.forEach(br => {
        if (s < br.min) return;
        const bt = br.sy, bu = 1 - bt;
        const sx = bu*bu*bx + 2*bu*bt*c1x + bt*bt*topX;
        const sy = bu*bu*(by + 2) + 2*bu*bt*c1y + bt*bt*topY;
        const ex = bx + br.dx;
        const ey = topY + trunkH * br.dy;
        drawBarkLimb(sx, sy, (sx + ex) * 0.5, sy - 6, ex, ey + 3, baseW * 0.38, 2.0);
        // Мелкая развилка на конце ветки
        drawBarkLimb(ex - Math.sign(br.dx) * 8, ey + 3, ex, ey - 2, ex + Math.sign(br.dx) * 9, ey, 2.4, 1.2);
        activePads.push({ x: ex, y: ey - 2, rx: br.rx, ry: br.ry });
    });

    activePads.forEach(p => drawFoliageCloud(p.x, p.y, p.rx, p.ry));
    // Главная вершинная корона бонсая
    drawFoliageCloud(topX, topY - 10, 29 + s * 5.2, 14 + s * 2.1);
}

function drawPlantSprite(ctx, spec, stage, opts) {
    if (!ctx || !spec) return;
    const o = opts || {};
    const W = ctx.canvas ? ctx.canvas.width : 360;
    const H = ctx.canvas ? ctx.canvas.height : 380;
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;

    // Масштабирование под любой размер холста (базовая сетка 360×380)
    const sx = W / 360, sy = H / 380;
    ctx.save();
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);

    const s = Math.max(0, Math.min(5, Math.trunc(stage || 0)));
    const sway = Number(o.sway) || 0;
    const pulse = Math.max(0, Math.min(1, Number(o.glow) || 0));
    const phase = Number.isInteger(o.phase) ? o.phase : 2;
    const bx = 180;
    const baseY = 348;
    const r = rng(spec.seed);
    const pal = roomToneLeaf(spec.leaf, phase);
    const bl = spec.bloom;

    // Мягкий атмосферный ореол от света круглого окна за растением
    if (s >= 3 || pulse > 0.04) {
        const auraA = (s >= 3 ? (s - 2) * 0.045 : 0) + (phase === 3 ? 0.06 : 0) + pulse * 0.12;
        radialAura(ctx, bx, baseY - 82 - s * 16, 78 + s * 18, bl[1], '#8c1428', auraA);
    }

    // Опавшие живые лепестки на ковре вокруг горшка в полном цвету
    if (s === 5 && (spec.kind === 6 || spec.kind === 5 || spec.kind === 4)) {
        const fallen = [[-82, 4, 0.3], [-58, 12, -0.5], [-28, 16, 0.2], [32, 15, -0.3], [64, 10, 0.6], [86, 3, -0.2], [50, -2, 0.4]];
        fallen.forEach(([ox, oy, rot], i) => {
            ctx.save();
            ctx.translate(bx + ox, baseY + oy);
            ctx.rotate(rot);
            ctx.fillStyle = i % 3 === 0 ? bl[2] : bl[1];
            ctx.beginPath();
            ctx.ellipse(0, 0, 4.4, 2.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    const pot = drawCeramicPot(ctx, bx, baseY, spec, s, phase >= 2 || pulse > 0.15);
    const by = pot.soilY;

    // Естественная физика по видам: кактус, розетка суккулента и ствол бонсая НЕ качаются из стороны в сторону!
    if (spec.kind === 0) drawSpeciesFern(ctx, bx, by, spec, s, pal, bl, sway, pulse, r);
    else if (spec.kind === 1) drawSpeciesCactus(ctx, bx, by, spec, s, pal, bl, pulse, r);
    else if (spec.kind === 2) drawSpeciesSucculent(ctx, bx, by, spec, s, pal, bl, sway, pulse);
    else if (spec.kind === 3) drawSpeciesBamboo(ctx, bx, by, spec, s, pal, bl, sway, pulse, r);
    else if (spec.kind === 4) drawSpeciesVine(ctx, bx, by, pot, spec, s, pal, bl, sway, pulse, r);
    else if (spec.kind === 5) drawSpeciesFlower(ctx, bx, by, spec, s, pal, bl, sway, pulse, r);
    else drawSpeciesBonsai(ctx, bx, by, spec, s, pal, bl, sway, pulse, r);

    ctx.restore();
}

// ===== ЖИВАЯ СЦЕНА 793×496: ОКНА ДОМОВ, СВЕТ ИЗ ОКНА, ЛАМПА-МАЯТНИК, КАССЕТА, НОЧНИКИ =====
const FX_W = 793, FX_H = 496;
const WIN_CX = 403.2, WIN_CY = 175.5, WIN_RX = 156.5, WIN_RY = 147.5;

// Реальные координаты 60 окон в небоскрёбах NEEO_CITY (в сетке 793×496)
const CITY_WINDOWS = [
    [522,132,2,4],[522,141,5,4],[351,148,2,2],[525,148,2,4],[529,148,3,4],[480,153,4,3],
    [541,153,4,4],[341,154,2,2],[351,153,2,3],[270,159,2,2],[541,163,2,4],[492,167,2,2],
    [480,167,4,3],[269,171,4,5],[337,171,2,3],[283,172,3,4],[541,176,2,2],[337,176,3,3],
    [306,180,2,4],[276,180,4,5],[480,187,3,3],[294,194,2,2],[338,197,3,2],[365,200,3,2],
    [312,200,3,3],[480,201,4,3],[530,200,5,5],[338,204,3,3],[507,209,6,5],[346,213,4,5],
    [338,213,4,4],[360,213,2,2],[441,214,2,3],[313,218,2,3],[507,218,6,5],[413,220,2,2],
    [391,220,2,2],[373,222,2,2],[325,227,3,4],[338,234,2,2],[479,234,5,4],[527,235,2,4],
    [479,241,5,4],[314,242,5,5],[413,245,3,2],[509,250,6,6],[368,258,3,3],[306,262,2,2],
    [368,263,4,5],[351,264,3,4],[395,266,3,3],[305,266,3,2],[332,277,3,2],[470,282,2,4],
    [438,286,4,6],[463,293,3,5],[468,293,3,4],[410,302,3,2],[384,304,3,5],[395,310,2,2]
];

// Огни моста и сигнальные маячки на шпилях высоток
const CITY_BEACONS = [
    { x: 341, y: 112, speed: 0.0017, phase: 0.2, r: 2.2 },
    { x: 402, y: 156, speed: 0.0013, phase: 2.1, r: 1.8 },
    { x: 482, y: 141, speed: 0.0015, phase: 4.0, r: 2.0 }
];
const BRIDGE_LIGHTS = [364, 379, 395, 412, 428, 444, 460];

// Плавный многослойный дождь (только фазы 0..2; на макс. фазе 3 небо идеально чистое!)
const FX_RAIN = Array.from({ length: 44 }, (_, i) => ({
    x: WIN_CX - WIN_RX + ((i * 59 + 19) % Math.round(WIN_RX * 2)),
    y: WIN_CY - WIN_RY + ((i * 73 + 11) % Math.round(WIN_RY * 2)),
    v: 3.2 + (i % 6) * 0.65,
    len: 10 + (i % 5) * 4,
    alpha: 0.16 + (i % 4) * 0.08,
    near: i % 4 === 0
}));

const FX_DROPS = Array.from({ length: 16 }, (_, i) => ({
    x: WIN_CX + Math.cos(i * 2.1 + 0.4) * WIN_RX * (0.2 + (i % 5) * 0.15),
    y: WIN_CY - WIN_RY * 0.72 + ((i * 43) % Math.round(WIN_RY * 1.4)),
    v: 0.16 + (i % 4) * 0.08,
    pause: (i * 19) % 50,
    trail: 9 + (i % 4) * 4
}));

// Пылинки, мягко плывущие в лучах света из круглого окна
const FX_MOTES = Array.from({ length: 22 }, (_, i) => ({
    u: ((i * 37 + 11) % 100) / 100,
    v: ((i * 61 + 23) % 100) / 100,
    speed: 0.000035 + (i % 5) * 0.000012,
    phase: i * 1.47,
    size: 1.0 + (i % 3) * 0.45
}));

const roomAnim = {
    raf: null,
    lastFrame: 0,
    activePhase: 0,
    warmth: 0,
    rank: 0,
    stage: 0,
    liveStage: 0,
    inspectStage: null, // ручной осмотр любой из 6 стадий (0..5)
    previewStage: null, // выбранная стадия в режиме PTS
    lastStage: -1,
    spec: null,
    radioLit: false,
    previewPhase: 3,
    customEntry: '',
    lineStep: {},
    lastTouchAt: 0,
    lastTouchObj: '',
    clearTouchTimer: null,
    // Плавные физические таймлайны предметов (без резких вспышек!)
    lampStart: -1e9,
    lampAmp: 0,
    lampDir: 1,
    deckStart: -1e9,
    nightLStart: -1e9,
    nightRStart: -1e9,
    crtStart: -1e9,
    radioStart: -1e9,
    plantStart: -1e9,
    winStart: -1e9,
    ripples: [],
    spores: [],
    lampCache: null
};

function prefersStillRoom() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (_) { return false; }
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smooth01(v) { const t = clamp01(v); return t * t * (3 - 2 * t); }
function easeOutCubic(v) { const t = clamp01(v); return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(v) { const t = clamp01(v); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

// Плавная колоколообразная огибающая (0 -> мягкий подъём -> дыхание -> долгий спад -> 0, БЕЗ вспышки!)
function softBell(elapsed, riseMs, holdMs, fallMs) {
    if (elapsed <= 0) return 0;
    if (elapsed < riseMs) return 0.5 - 0.5 * Math.cos(Math.PI * (elapsed / riseMs));
    if (elapsed < riseMs + holdMs) {
        const h = (elapsed - riseMs) / Math.max(1, holdMs);
        return 0.94 + 0.06 * Math.sin(h * Math.PI);
    }
    const f = elapsed - riseMs - holdMs;
    if (f < fallMs) return 0.5 + 0.5 * Math.cos(Math.PI * (f / fallMs));
    return 0;
}

function insideWindow(x, y, pad) {
    const p = pad || 0;
    const rx = WIN_RX - p, ry = WIN_RY - p;
    if (rx <= 0 || ry <= 0) return false;
    const dx = x - WIN_CX, dy = y - WIN_CY;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

// Подготовка реального спрайта подвесной лампы со шнуром из фона сцены для честного маятника
function getLampSprite() {
    if (roomAnim.lampCache) return roomAnim.lampCache;
    if (typeof document === 'undefined') return null;
    const img = document.getElementById('station-bg');
    if (!img || !img.complete || !img.naturalWidth) return null;
    try {
        // В исходнике 1586×992: шнур x=374, y=16..242; купол лампы x=330..420, y=242..332
        const sx = 326, sy = 14, sw = 98, sh = 324;
        const spr = document.createElement('canvas');
        spr.width = sw; spr.height = sh;
        const sg = spr.getContext('2d');
        sg.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        const id = sg.getImageData(0, 0, sw, sh);
        const d = id.data;

        // Аккуратно отделяем шнур и кованый плафон от тёмной стены
        for (let y = 0; y < sh; y++) {
            const gy = sy + y;
            for (let x = 0; x < sw; x++) {
                const gx = sx + x;
                const p = (y * sw + x) * 4;
                let alpha = 0;
                if (gy < 240) {
                    // Тонкий вертикальный шнур x≈374 (не трогаем трубу потолка y≈76..92 сбоку!)
                    const dist = Math.abs(gx - 374);
                    if (dist <= 3.5) alpha = clamp01(1 - (dist - 1.2) / 2.5) * (d[p] > 24 ? 1 : 0.65);
                } else {
                    // Купольный плафон и тёплая лампа накаливания
                    const dx = (gx - 375) / 45.5;
                    const dy = gy < 306 ? (gy - 302) / 62 : (gy - 306) / 24;
                    const dist = Math.hypot(dx, dy);
                    if (dist <= 1.06) {
                        const edge = clamp01((1.06 - dist) / 0.14);
                        const lum = d[p];
                        alpha = gy > 314 ? clamp01((lum - 24) / 70) * edge : edge;
                    }
                }
                d[p + 3] = Math.round(alpha * 255);
            }
        }
        sg.putImageData(id, 0, 0);

        // Чистая заплатка тёмной стены позади неподвижной лампы
        const patch = document.createElement('canvas');
        patch.width = sw; patch.height = sh;
        const pg = patch.getContext('2d');
        pg.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        const pid = pg.getImageData(0, 0, sw, sh);
        const pd = pid.data;
        for (let y = 0; y < sh; y++) {
            const gy = sy + y;
            // Берём чистый тон стены слева и справа от шнура/плафона
            const lCol = [pd[(y * sw + 2) * 4], pd[(y * sw + 2) * 4 + 1], pd[(y * sw + 2) * 4 + 2]];
            const rCol = [pd[(y * sw + sw - 3) * 4], pd[(y * sw + sw - 3) * 4 + 1], pd[(y * sw + sw - 3) * 4 + 2]];
            for (let x = 0; x < sw; x++) {
                const gx = sx + x;
                const maskA = d[(y * sw + x) * 4 + 3] / 255;
                // Полностью закрываем статичный купол и ореол под лампой, чтобы не оставалось двойного контура
                const domeCover = gy >= 238 ? clamp01((1.16 - Math.hypot((gx - 375) / 48, (gy - 294) / 54)) / 0.14) : 0;
                const w = Math.max(maskA, domeCover);
                if (w <= 0.01) continue;
                const t = x / (sw - 1);
                const br = Math.min(24, lCol[0] * (1 - t) + rCol[0] * t);
                const bg = Math.min(6,  lCol[1] * (1 - t) + rCol[1] * t);
                const bb = Math.min(8,  lCol[2] * (1 - t) + rCol[2] * t);
                const p = (y * sw + x) * 4;
                pd[p]     = Math.round(pd[p] * (1 - w) + br * w);
                pd[p + 1] = Math.round(pd[p + 1] * (1 - w) + bg * w);
                pd[p + 2] = Math.round(pd[p + 2] * (1 - w) + bb * w);
            }
        }
        pg.putImageData(pid, 0, 0);

        roomAnim.lampCache = { spr, patch, sx: sx * 0.5, sy: sy * 0.5, sw: sw * 0.5, sh: sh * 0.5, pivX: 187, pivY: 8 };
        return roomAnim.lampCache;
    } catch (_) {
        return null;
    }
}

function spawnPlantSpores(count, isPetals) {
    const n = count || 6;
    for (let i = 0; i < n; i++) {
        roomAnim.spores.push({
            x: 396 + (Math.random() - 0.5) * (42 + roomAnim.stage * 10),
            y: isPetals ? (345 - roomAnim.stage * 10 + Math.random() * 24) : (425 - roomAnim.stage * 16 - Math.random() * 18),
            vx: (Math.random() - 0.5) * 0.22 + (isPetals ? 0.12 : 0),
            vy: isPetals ? (0.24 + Math.random() * 0.22) : (-0.28 - Math.random() * 0.26),
            life: 1,
            petal: !!isPetals,
            phase: Math.random() * 6.28
        });
    }
    if (roomAnim.spores.length > 26) roomAnim.spores.splice(0, roomAnim.spores.length - 26);
}

// 1) Плавная анимация окон в домах NEEO_CITY, огней моста и рассветного неба за круглым окном
function drawWindowWorld(g, now, phase, winGlow) {
    g.save();
    g.beginPath();
    g.ellipse(WIN_CX, WIN_CY, WIN_RX - 1.5, WIN_RY - 1.5, 0, 0, Math.PI * 2);
    g.clip();

    // На фазе 3 («Рассвет») за силуэтами высоток медленно дышит живая ало-янтарная заря (без единой капли дождя!)
    if (phase >= 2) {
        const isDawn = phase === 3;
        const breathe = 0.5 + 0.5 * Math.sin(now * 0.00055);
        const shiftX = Math.sin(now * 0.00032) * 14;
        const intensity = (isDawn ? 0.34 + breathe * 0.1 + winGlow * 0.08 : 0.1 + breathe * 0.03);

        g.save();
        g.globalCompositeOperation = 'screen';
        // Заря, поднимающаяся из-за горизонта за домами
        const dg = g.createRadialGradient(WIN_CX + shiftX, 204, 8, WIN_CX + shiftX * 0.5, 192, 168);
        dg.addColorStop(0, `rgba(255,132,112,${intensity.toFixed(3)})`);
        dg.addColorStop(0.38, `rgba(238,54,72,${(intensity * 0.68).toFixed(3)})`);
        dg.addColorStop(0.75, `rgba(148,18,36,${(intensity * 0.3).toFixed(3)})`);
        dg.addColorStop(1, 'rgba(90,8,20,0)');
        g.fillStyle = dg;
        g.fillRect(WIN_CX - WIN_RX, WIN_CY - WIN_RY, WIN_RX * 2, WIN_RY * 2);

        // Тонкая плавно плывущая рассветная дымка над горизонтом
        if (isDawn) {
            const bandY = 178 + Math.sin(now * 0.0004) * 5;
            const hg = g.createLinearGradient(0, bandY - 52, 0, bandY + 58);
            hg.addColorStop(0, 'rgba(255,90,96,0)');
            hg.addColorStop(0.5, `rgba(255,118,106,${(0.14 + breathe * 0.06).toFixed(3)})`);
            hg.addColorStop(1, 'rgba(200,32,52,0)');
            g.fillStyle = hg;
            g.fillRect(WIN_CX - WIN_RX, bandY - 52, WIN_RX * 2, 110);
        }
        g.restore();
    }

    // Живые окна в домах NEEO_CITY: плавно гаснут, загораются и тепло дышат
    for (let i = 0; i < CITY_WINDOWS.length; i++) {
        const [wx, wy, ww, wh] = CITY_WINDOWS[i];
        // Медленная индивидуальная волна жизни для каждого окна (цикл 9–24 сек)
        const rate = 0.00028 + (i % 9) * 0.000075;
        const ph = i * 2.39996 + (i % 5) * 0.7;
        const w1 = Math.sin(now * rate + ph);
        const w2 = Math.sin(now * rate * 0.43 - ph * 0.6);
        const mood = w1 * 0.65 + w2 * 0.35; // -1..1

        if (mood < -0.22) {
            // Окно плавно гаснет (жильцы выключили свет)
            const dim = smooth01((-mood - 0.22) / 0.62) * (phase === 3 ? 0.82 : 0.72);
            g.fillStyle = `rgba(18,3,6,${dim.toFixed(3)})`;
            g.fillRect(wx - 0.5, wy - 0.5, ww + 1, wh + 1);
        } else if (mood > 0.18) {
            // Окно плавно разгорается тёплым живым светом
            const glow = smooth01((mood - 0.18) / 0.68) * (0.55 + (phase === 3 ? 0.2 : 0.1) + winGlow * 0.18);
            g.fillStyle = `rgba(255,88,96,${(glow * 0.34).toFixed(3)})`;
            g.fillRect(wx - 1.5, wy - 1.5, ww + 3, wh + 3);
            g.fillStyle = i % 3 === 0
                ? `rgba(255,198,176,${(glow * 0.78).toFixed(3)})`
                : `rgba(255,134,138,${(glow * 0.72).toFixed(3)})`;
            g.fillRect(wx, wy, ww, wh);
        }
    }

    // Мягкое переливание огней на ночном мосту
    for (let b = 0; b < BRIDGE_LIGHTS.length; b++) {
        const bx = BRIDGE_LIGHTS[b];
        const a = (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(now * 0.0011 + b * 0.85)));
        g.fillStyle = `rgba(255,162,152,${a.toFixed(3)})`;
        g.fillRect(bx - 1, 232, 2, 1.6);
    }

    // Плавные сигнальные огни на крышах небоскрёбов
    CITY_BEACONS.forEach(bc => {
        const p = Math.pow(0.5 + 0.5 * Math.sin(now * bc.speed + bc.phase), 2.2);
        if (p > 0.08) {
            radialAura(g, bc.x, bc.y, bc.r * 3.4, '#ff5c70', '#9e1428', p * 0.36);
            g.fillStyle = `rgba(255,204,208,${(p * 0.78).toFixed(3)})`;
            g.beginPath(); g.arc(bc.x, bc.y, bc.r * 0.52, 0, Math.PI * 2); g.fill();
        }
    });

    // Дождь и живые капли на стекле — ТОЛЬКО в фазах 0, 1, 2 (в фазе 3 небо чистое, без застывшего дождя!)
    if (phase < 3) {
        const streakCount = [44, 24, 10, 0][phase];
        g.lineCap = 'round';
        for (let i = 0; i < streakCount; i++) {
            const d = FX_RAIN[i];
            const al = d.alpha * (phase === 0 ? 1 : phase === 1 ? 0.78 : 0.52);
            g.strokeStyle = d.near ? `rgba(255,148,160,${al.toFixed(3)})` : `rgba(224,62,82,${al.toFixed(3)})`;
            g.lineWidth = d.near ? 1.15 : 0.8;
            g.beginPath();
            g.moveTo(d.x, d.y);
            g.lineTo(d.x - d.len * 0.09, d.y + d.len);
            g.stroke();
        }

        const dropCount = [16, 11, 6, 0][phase];
        for (let i = 0; i < dropCount; i++) {
            const dr = FX_DROPS[i];
            if (!insideWindow(dr.x, dr.y, 6)) continue;
            const tg = g.createLinearGradient(dr.x, dr.y - dr.trail, dr.x, dr.y);
            tg.addColorStop(0, 'rgba(255,112,128,0)');
            tg.addColorStop(1, 'rgba(255,132,146,0.28)');
            g.strokeStyle = tg;
            g.lineWidth = 1.1;
            g.beginPath(); g.moveTo(dr.x, dr.y - dr.trail); g.lineTo(dr.x, dr.y); g.stroke();
            g.fillStyle = 'rgba(255,192,200,0.72)';
            g.beginPath(); g.ellipse(dr.x, dr.y, 1.2, 1.8, 0, 0, Math.PI * 2); g.fill();
        }
    }

    // Нежнейшая водная/световая рябь по стеклу при касании окна
    for (let i = roomAnim.ripples.length - 1; i >= 0; i--) {
        const rp = roomAnim.ripples[i];
        const prog = 1 - rp.life;
        const rad = 4 + rp.maxR * easeOutCubic(prog);
        const alpha = Math.sin(rp.life * Math.PI) * 0.28;
        g.strokeStyle = `rgba(255,168,176,${alpha.toFixed(3)})`;
        g.lineWidth = 1.2;
        g.beginPath(); g.arc(rp.x, rp.y, rad, 0, Math.PI * 2); g.stroke();
    }

    g.restore();
}

// 2) Плавный объёмный свет ИЗ круглого окна на комнату, растение и ковёр (максимальный уровень!)
function drawWindowLightBeams(g, now, phase, winGlow) {
    if (phase < 2) return;
    const isMax = phase === 3;
    const strength = (isMax ? 1 : 0.28) + winGlow * 0.16;
    const b1 = 0.5 + 0.5 * Math.sin(now * 0.00062);
    const b2 = 0.5 + 0.5 * Math.sin(now * 0.00041 + 1.8);
    const sway = Math.sin(now * 0.00034) * 14;

    g.save();
    g.globalCompositeOperation = 'screen';

    // Подсветка внутреннего нижнего откоса круглого окна (показывает, что свет бьёт снаружи внутрь!)
    const rimA = (0.2 + b1 * 0.08) * strength;
    g.strokeStyle = `rgba(255,134,132,${rimA.toFixed(3)})`;
    g.lineWidth = 3.2;
    g.beginPath();
    g.ellipse(WIN_CX, WIN_CY + 1, WIN_RX + 1.5, WIN_RY + 1.5, 0, Math.PI * 0.14, Math.PI * 0.86);
    g.stroke();

    // Мягкие бархатные объёмные лучи рассвета (без жёстких граней), льющиеся ИЗ круглого окна вниз на растение и ковёр
    const fanAngles = [-0.24, -0.11, 0.0, 0.12, 0.25];
    fanAngles.forEach((baseAng, idx) => {
        const drift = Math.sin(now * (0.00038 + idx * 0.00007) + idx * 1.4) * 0.035;
        const pulseA = 0.5 + 0.5 * Math.sin(now * (0.00055 + idx * 0.00009) + idx * 1.1);
        const rayA = (0.055 + pulseA * 0.042) * (idx === 2 ? 1.25 : 0.92) * strength;
        g.save();
        g.translate(WIN_CX, WIN_CY - 22);
        g.rotate(baseAng + drift);
        g.scale(0.32 + (idx === 2 ? 0.09 : 0), 1);
        const rg = g.createRadialGradient(0, 120, 10, 0, 155, 225);
        rg.addColorStop(0, `rgba(255,126,118,${rayA.toFixed(3)})`);
        rg.addColorStop(0.55, `rgba(232,54,72,${(rayA * 0.58).toFixed(3)})`);
        rg.addColorStop(1, 'rgba(150,18,34,0)');
        g.fillStyle = rg;
        g.beginPath(); g.arc(0, 155, 225, 0, Math.PI * 2); g.fill();
        g.restore();
    });

    // Живое световое пятно от круглого окна, мягко лежащее на полу и ковре (смещается вместе с лучами!)
    if (isMax) {
        const poolX = WIN_CX + sway * 0.65, poolY = 418;
        g.save();
        g.translate(poolX, poolY);
        g.scale(1, 0.34);
        const pg = g.createRadialGradient(0, -35, 12, 0, 0, 215);
        pg.addColorStop(0, `rgba(255,112,110,${(0.22 + b2 * 0.07).toFixed(3)})`);
        pg.addColorStop(0.52, `rgba(224,44,64,${(0.13 + b1 * 0.04).toFixed(3)})`);
        pg.addColorStop(1, 'rgba(140,14,30,0)');
        g.fillStyle = pg;
        g.beginPath(); g.arc(0, 0, 215, 0, Math.PI * 2); g.fill();
        g.restore();
    }

    // Тёплые пылинки, медленно кружащиеся только внутри конуса света из окна
    const moteCnt = isMax ? FX_MOTES.length : 9;
    for (let i = 0; i < moteCnt; i++) {
        const m = FX_MOTES[i];
        const v = (m.v + now * m.speed) % 1;
        const span = 96 + v * 125;
        const mx = WIN_CX + (m.u - 0.5) * span * 2 + Math.sin(now * 0.00055 + m.phase) * 9 + sway * v * 0.5;
        const my = 152 + v * 298;
        const edgeFade = Math.sin(v * Math.PI) * (1 - Math.abs(m.u - 0.5) * 1.4);
        const twinkle = 0.45 + 0.55 * Math.sin(now * 0.0014 + m.phase);
        const ma = Math.max(0, edgeFade * twinkle * (isMax ? 0.52 : 0.24));
        if (ma < 0.03) continue;
        g.fillStyle = `rgba(255,198,190,${ma.toFixed(3)})`;
        g.beginPath(); g.arc(mx, my, m.size, 0, Math.PI * 2); g.fill();
    }

    g.restore();
}

// 3) Честное маятниковое покачивание висячей лампы на шнуре
function drawSwingingLamp(g, now) {
    const elapsed = (now - roomAnim.lampStart) * 0.001; // сек
    let angle = 0, warmth = 0;
    if (elapsed > 0 && elapsed < 5.6 && roomAnim.lampAmp > 0.001) {
        // Плавный затухающий маятник: стартует строго с 0°, мягко качается туда-сюда и замирает
        const env = Math.exp(-elapsed * 0.72);
        angle = roomAnim.lampDir * roomAnim.lampAmp * env * Math.sin(elapsed * 4.4);
        warmth = env * smooth01(elapsed / 0.35);
    }

    const armLen = 158 - 8;
    // При повороте холста на angle точка (0, armLen) смещается в (-sin*L, cos*L)
    const bulbX = 187.5 - Math.sin(angle) * armLen;
    const bulbY = 8 + Math.cos(angle) * armLen;

    if (Math.abs(angle) > 0.0012) {
        const cache = getLampSprite();
        if (cache) {
            // Скрываем статичную лампу чистой стеной и рисуем саму лампу, повёрнутую вокруг точки подвеса!
            g.drawImage(cache.patch, cache.sx, cache.sy, cache.sw, cache.sh);
            g.save();
            g.translate(cache.pivX, cache.pivY);
            g.rotate(angle);
            g.drawImage(cache.spr, cache.sx - cache.pivX, cache.sy - cache.pivY, cache.sw, cache.sh);
            g.restore();
        }
    }

    // Живое дыхание нити накала и мягкий качающийся свет на терминале под лампой
    const idleBreath = 0.5 + 0.5 * Math.sin(now * 0.0016);
    g.save();
    g.globalCompositeOperation = 'screen';
    radialAura(g, bulbX, bulbY, 28 + warmth * 14, '#ff9a98', '#c8223c', 0.12 + idleBreath * 0.04 + warmth * 0.16);
    if (warmth > 0.02) {
        // Мягкий блик от качнувшейся лампы скользит по верхушке терминала и столу
        radialAura(g, bulbX + Math.sin(angle) * 62, 232, 56, '#ff7280', '#961428', warmth * 0.14);
    }
    g.restore();
}

// 4) Плавная анимация старого кассетного магнитофона: открытие кармана → выезд кассеты → возврат → закрытие
function drawCassetteDeck(g, now) {
    // Точные координаты кассетного отсека верхней деки (в 793×496: x=45..69, y=279..292)
    const elapsed = (now - roomAnim.deckStart) * 0.001;
    const idleBlink = 0.35 + 0.25 * Math.sin(now * 0.0019);

    // Тёплый индикатор нижней деки (x=52..72, y=306..313)
    const active = elapsed > 0 && elapsed < 2.9;
    if (!active) {
        g.fillStyle = `rgba(255,112,124,${idleBlink.toFixed(3)})`;
        g.fillRect(54, 308, 2, 1.5);
        return;
    }

    // Фазы плавной механики (2.9 сек):
    // 0.00..0.48 — крышка подкассетника плавно откидывается на себя
    // 0.36..1.05 — кассета плавно выезжает из кармана с лёгким проворотом бобин
    // 1.05..1.65 — короткая живая пауза (кассета на виду, мерцают тёплые индикаторы уровня)
    // 1.65..2.35 — кассета плавно уходит обратно в карман
    // 2.25..2.85 — крышка мягко прикрывается и защёлкивается
    let doorOpen = 0, eject = 0;
    if (elapsed < 0.48) doorOpen = easeInOutCubic(elapsed / 0.48);
    else if (elapsed < 2.25) doorOpen = 1;
    else doorOpen = 1 - easeInOutCubic((elapsed - 2.25) / 0.6);

    if (elapsed >= 0.36 && elapsed < 1.05) eject = easeOutCubic((elapsed - 0.36) / 0.69);
    else if (elapsed >= 1.05 && elapsed < 1.65) eject = 1;
    else if (elapsed >= 1.65 && elapsed < 2.35) eject = 1 - easeInOutCubic((elapsed - 1.65) / 0.7);

    const cx = 57.5, cy = 285.5;
    const deckWarm = Math.sin(clamp01(elapsed / 2.9) * Math.PI);

    // Плавная тёплая подсветка окошка деки и VU-индикаторов внизу
    g.save();
    radialAura(g, cx, cy, 24, '#ff7882', '#9e182c', deckWarm * 0.22);
    for (let b = 0; b < 4; b++) {
        const lvl = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(elapsed * 5.2 + b * 1.1));
        g.fillStyle = `rgba(255,146,142,${(deckWarm * lvl * 0.78).toFixed(3)})`;
        g.fillRect(54 + b * 4, 308, 2.4, 2.2);
    }

    // Открытая ниша подкассетника с тёплой внутренней подсветкой и лентопротяжным валиком
    g.fillStyle = `rgba(12,3,5,${(0.92 * doorOpen).toFixed(3)})`;
    g.fillRect(cx - 12.5, cy - 6.5, 25, 13);
    g.fillStyle = `rgba(220,58,72,${(0.32 * doorOpen).toFixed(3)})`;
    g.fillRect(cx - 11, cy - 5, 22, 3);
    // Магнитная головка и тонвалы внутри
    g.fillStyle = `rgba(185,112,118,${(0.65 * doorOpen).toFixed(3)})`;
    g.fillRect(cx - 2, cy + 3.5, 4, 2);
    g.fillRect(cx - 7, cy + 4, 1.5, 1.5);
    g.fillRect(cx + 5.5, cy + 4, 1.5, 1.5);

    // Сама аудиокассета (выезжает плавно вперёд-вверх под естественным углом старой деки!)
    if (doorOpen > 0.15) {
        const slideX = eject * 6.5;
        const slideY = -eject * 10.5;
        const scale = 0.88 + eject * 0.22;
        const reelAng = eject * Math.PI * 1.35 + (elapsed > 1.05 && elapsed < 1.65 ? Math.sin((elapsed - 1.05) * 3) * 0.08 : 0);

        g.save();
        // При малом выезде кассета аккуратно обрезается нижней кромкой кармана
        g.beginPath();
        g.rect(cx - 26, cy - 28, 56, 34.5);
        g.clip();

        g.translate(cx + slideX, cy + slideY);
        g.rotate(-eject * 0.055);
        g.scale(scale, scale);

        // Тень под выехавшей кассетой
        if (eject > 0.05) {
            g.fillStyle = `rgba(4,1,2,${(eject * 0.58).toFixed(3)})`;
            g.fillRect(-11.5, -5.5, 24, 14.5);
        }

        // Корпус компакт-кассеты (тёмный графитово-бордовый пластик с тёплой фаской)
        g.fillStyle = '#240c10';
        g.strokeStyle = '#9c434d';
        g.lineWidth = 0.9;
        g.beginPath();
        g.rect(-11.5, -7, 23, 14);
        g.fill();
        g.stroke();

        // Верхняя бумажная наклейка в тёплом алом свете ночника
        const lbl = g.createLinearGradient(-10, -5.5, 10, -1);
        lbl.addColorStop(0, '#c86a72');
        lbl.addColorStop(0.55, '#eb9ca2');
        lbl.addColorStop(1, '#9e454e');
        g.fillStyle = lbl;
        g.fillRect(-9.6, -5.4, 19.2, 3.3);
        // Тонкая полоска «А-стороны» на наклейке
        g.fillStyle = '#5c1822';
        g.fillRect(-8.5, -4.4, 11, 0.8);

        // Прозрачное окошко с двумя вращающимися бобинками и тёмной магнитной лентой
        g.fillStyle = '#120406';
        g.fillRect(-8.2, -1.2, 16.4, 5.2);
        // Остаток плёнки на левой и правой катушках
        g.fillStyle = '#3b151a';
        g.beginPath(); g.arc(-4.6, 1.4, 2.3, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(4.6, 1.4, 1.9, 0, Math.PI * 2); g.fill();

        // Светлые зубчатые сердечники бобин (плавно проворачиваются при выезде/заезде!)
        for (const rx of [-4.6, 4.6]) {
            g.save();
            g.translate(rx, 1.4);
            g.rotate(reelAng);
            g.strokeStyle = '#f2b8be';
            g.lineWidth = 0.85;
            g.beginPath(); g.arc(0, 0, 1.25, 0, Math.PI * 2); g.stroke();
            for (let k = 0; k < 3; k++) {
                const a = k * 2.094;
                g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 1.45, Math.sin(a) * 1.45); g.stroke();
            }
            g.restore();
        }

        // Нижняя трапеция кассеты (утолщение под головку)
        g.fillStyle = '#341218';
        g.beginPath();
        g.moveTo(-7.5, 7); g.lineTo(-6.2, 4.6); g.lineTo(6.2, 4.6); g.lineTo(7.5, 7);
        g.closePath();
        g.fill();
        g.restore();
    }

    // Передняя полупрозрачная крышка кассетного кармана (откидывается на петлях снизу)
    const lidTilt = doorOpen * 4.8;
    const lidTopY = cy - 6.5 + doorOpen * 4.2;
    g.fillStyle = `rgba(48,16,22,${(0.55 - eject * 0.18).toFixed(3)})`;
    g.strokeStyle = `rgba(218,98,110,${(0.5 + doorOpen * 0.35).toFixed(3)})`;
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(cx - 12.5 - lidTilt * 0.25, lidTopY);
    g.lineTo(cx + 12.5 + lidTilt * 0.25, lidTopY);
    g.lineTo(cx + 12.5, cy + 6.8);
    g.lineTo(cx - 12.5, cy + 6.8);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
}

// 5) Плавная тёплая подсветка решётчатых ночников (левого у терминала и правого у кушетки)
function drawNightlight(g, now, startAt, cx, topY, w, h, surfaceY, wallSide) {
    const elapsed = now - startAt;
    // Плавнейший розжиг 950мс -> мягкое тёплое дыхание 850мс -> долгий шёлковый спад 1650мс
    const pulse = softBell(elapsed, 950, 850, 1650);
    const idle = 0.08 + 0.03 * Math.sin(now * 0.0018 + cx);
    const k = idle + pulse * 0.92;

    const midY = topY + h * 0.5;
    g.save();
    g.globalCompositeOperation = 'screen';

    // Мягкий ореол в воздухе и тёплый отсвет на столешнице / складках пледа и кирпичной стене
    radialAura(g, cx, midY, 26 + pulse * 44, '#ff988c', '#c8223c', 0.08 + pulse * 0.34);
    if (pulse > 0.01) {
        // Тёплое световое пятно, стелющееся по столу или пледу кушетки
        g.save();
        g.translate(cx + wallSide * 8, surfaceY);
        g.scale(1, 0.32);
        radialAura(g, 0, 0, 52 + pulse * 42, '#ff8e88', '#b81d36', pulse * 0.32);
        g.restore();
    }

    // Внутренняя матовая колба ночника плавно наливается тёплым янтарно-алым светом
    if (pulse > 0.01) {
        const lg = g.createLinearGradient(cx - w * 0.5, midY, cx + w * 0.5, midY);
        lg.addColorStop(0, `rgba(235,58,72,${(pulse * 0.42).toFixed(3)})`);
        lg.addColorStop(0.5, `rgba(255,214,196,${(pulse * 0.78).toFixed(3)})`);
        lg.addColorStop(1, `rgba(235,58,72,${(pulse * 0.42).toFixed(3)})`);
        g.fillStyle = lg;
        g.beginPath();
        g.rect(cx - w * 0.46, topY + 2, w * 0.92, h - 4);
        g.fill();
    }
    g.restore();

    // Сохраняем тёмный силуэт кованой решётки поверх свечения, чтобы свет шёл ИЗНУТРИ ночника!
    if (pulse > 0.02) {
        g.save();
        g.strokeStyle = `rgba(22,5,8,${(pulse * 0.78).toFixed(3)})`;
        g.lineWidth = 1.25;
        for (const u of [-0.46, -0.18, 0.16, 0.46]) {
            const bx = cx + w * u;
            g.beginPath(); g.moveTo(bx, topY + 1); g.lineTo(bx, topY + h - 1); g.stroke();
        }
        for (let r = 0; r <= 4; r++) {
            const by = topY + 2 + (r / 4) * (h - 4);
            g.beginPath(); g.moveTo(cx - w * 0.48, by); g.lineTo(cx + w * 0.48, by); g.stroke();
        }
        g.restore();
    }
    void k;
}

function drawStationFx(now, step) {
    const cv = typeof document !== 'undefined' && document.getElementById('station-fx');
    if (!cv || !cv.getContext) return;
    const g = cv.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, cv.width, cv.height);
    g.imageSmoothingEnabled = true;

    const scaleX = cv.width / FX_W, scaleY = cv.height / FX_H;
    g.save();
    if (scaleX !== 1 || scaleY !== 1) g.scale(scaleX, scaleY);

    const phase = roomAnim.activePhase;
    const winGlow = softBell(now - roomAnim.winStart, 700, 500, 1400);
    const crtGlow = softBell(now - roomAnim.crtStart, 420, 350, 950);
    const radGlow = softBell(now - roomAnim.radioStart, 420, 350, 950);

    // Обновление физики дождя, капель и ряби
    if (step) {
        if (phase < 3) {
            const speedMul = phase === 0 ? 1 : phase === 1 ? 0.76 : 0.55;
            for (let i = 0; i < FX_RAIN.length; i++) {
                const d = FX_RAIN[i];
                d.y += d.v * speedMul;
                d.x -= d.v * 0.09 * speedMul;
                if (d.y > WIN_CY + WIN_RY || d.x < WIN_CX - WIN_RX) {
                    d.x = WIN_CX + ((((i * 97 + ((now * 0.05) | 0)) % 304) - 152));
                    d.y = WIN_CY - WIN_RY - (i % 18);
                }
            }
            for (let i = 0; i < FX_DROPS.length; i++) {
                const dr = FX_DROPS[i];
                if (dr.pause > 0 && winGlow < 0.25) {
                    dr.pause--;
                } else {
                    dr.y += dr.v * (1 + winGlow * 1.1) * speedMul;
                    dr.x += Math.sin(now * 0.0016 + i * 1.7) * 0.07;
                    if ((i + ((now * 0.02) | 0)) % 127 === 0) dr.pause = 20 + (i % 5) * 8;
                }
                if (!insideWindow(dr.x, dr.y, 7)) {
                    const span = ((((i * 53 + ((now * 0.01) | 0)) % 240) - 120)) / 145;
                    dr.x = WIN_CX + span * WIN_RX * 0.86;
                    const maxDy = Math.sqrt(Math.max(0.06, 1 - Math.pow((dr.x - WIN_CX) / WIN_RX, 2))) * WIN_RY;
                    dr.y = WIN_CY - maxDy * (0.5 + (i % 4) * 0.1);
                    dr.pause = 10 + (i % 4) * 9;
                }
            }
        }
        for (let i = roomAnim.ripples.length - 1; i >= 0; i--) {
            roomAnim.ripples[i].life -= roomAnim.ripples[i].speed;
            if (roomAnim.ripples[i].life <= 0) roomAnim.ripples.splice(i, 1);
        }
        // Редкий живой лепесток, неспешно слетающий с цветущего бонсая
        if (roomAnim.spec && roomAnim.spec.kind === 6 && roomAnim.stage === 5 && roomAnim.spores.length < 3 && Math.random() < 0.018) {
            spawnPlantSpores(1, true);
        }
        for (let i = roomAnim.spores.length - 1; i >= 0; i--) {
            const sp = roomAnim.spores[i];
            sp.x += sp.vx + Math.sin(now * 0.003 + sp.phase) * (sp.petal ? 0.28 : 0.12);
            sp.y += sp.vy;
            sp.life -= sp.petal ? 0.0085 : 0.014;
            if (sp.life <= 0 || sp.y > 474) roomAnim.spores.splice(i, 1);
        }
    }

    // 1. Ночной город с живыми окнами, заря и дождь за стеклом
    drawWindowWorld(g, now, phase, winGlow);

    // 2. Плавный объёмный свет из круглого окна на комнату и ковёр
    drawWindowLightBeams(g, now, phase, winGlow);

    // 3. Подвесная лампа на шнуре (плавный маятник)
    drawSwingingLamp(g, now);

    // 4. Старый кассетный магнитофон (плавный выезд и возврат кассеты)
    drawCassetteDeck(g, now);

    // 5. Левый ночник (x=208..244 -> cx=113) и правый ночник (x=1474..1514 -> cx=747)
    drawNightlight(g, now, roomAnim.nightLStart, 113, 280, 15.5, 34, 316, -1);
    drawNightlight(g, now, roomAnim.nightRStart, 747.5, 292, 16, 41, 338, -1);

    // 6. Плавная живая осциллограмма на ЭЛТ-терминале (x=150..204, y=218..264)
    const sx = 150, sy = 218, sw = 54, sh = 46;
    g.strokeStyle = `rgba(255,152,162,${(0.55 + crtGlow * 0.35).toFixed(3)})`;
    g.lineWidth = 1.25;
    g.beginPath();
    for (let x = 4; x < sw - 4; x++) {
        const u = x / (sw - 1);
        const env = Math.sin(u * Math.PI);
        const wave = Math.sin(now * 0.0045 + x * 0.32) * 0.65 + Math.sin(now * 0.011 - x * 0.58) * 0.35;
        const wy = sy + sh * 0.52 + wave * env * (5.2 + crtGlow * 5.5);
        if (x === 4) g.moveTo(sx + x, wy); else g.lineTo(sx + x, wy);
    }
    g.stroke();
    if (crtGlow > 0.02) radialAura(g, sx + sw * 0.5, sy + sh * 0.5, 42, '#ff7888', '#a81830', crtGlow * 0.18);

    // 7. Тёплая аналоговая шкала приёмника (x=642..698, y=216..232)
    const needleU = radGlow > 0.02
        ? 0.22 + 0.56 * (0.5 - 0.5 * Math.cos(now * 0.0045))
        : roomAnim.radioLit
            ? 0.62 + Math.sin(now * 0.0011) * 0.06
            : 0.28 + Math.sin(now * 0.0007) * 0.14;
    const nx = 646 + needleU * 46;
    g.fillStyle = `rgba(255,154,164,${(0.45 + (roomAnim.radioLit ? 0.35 : 0) + radGlow * 0.2).toFixed(3)})`;
    g.fillRect(nx, 218, 1.4, 11);
    if (roomAnim.radioLit || radGlow > 0.04) {
        for (let b = 0; b < 5; b++) {
            const bh = 2 + (0.5 + 0.5 * Math.sin(now * 0.006 + b * 1.2)) * (4 + radGlow * 3);
            g.fillStyle = `rgba(255,96,112,${(0.26 + radGlow * 0.28).toFixed(3)})`;
            g.fillRect(652 + b * 8, 229 - bh, 3.2, bh);
        }
    }
    if (radGlow > 0.02) radialAura(g, 672, 226, 38, '#ff7888', '#a81830', radGlow * 0.16);

    // 8. Пыльца и опадающие живые лепестки растения
    for (let i = 0; i < roomAnim.spores.length; i++) {
        const sp = roomAnim.spores[i];
        const a = Math.sin(clamp01(sp.life) * Math.PI) * 0.78;
        if (sp.petal) {
            const bl = roomAnim.spec ? roomAnim.spec.bloom : PLANT_BLOOM[1];
            g.save();
            g.translate(sp.x, sp.y);
            g.rotate(now * 0.002 + sp.phase);
            g.fillStyle = mixHex(bl[1], bl[2], 0.55, a);
            g.beginPath(); g.ellipse(0, 0, 2.6, 1.3, 0, 0, Math.PI * 2); g.fill();
            g.restore();
        } else {
            g.fillStyle = `rgba(255,224,188,${a.toFixed(3)})`;
            g.beginPath(); g.arc(sp.x, sp.y, 1.25, 0, Math.PI * 2); g.fill();
        }
    }

    g.restore();
}

function paintPlantFrame(now) {
    const cv = typeof document !== 'undefined' && document.getElementById('station-plant');
    if (!cv || !cv.getContext || !roomAnim.spec) return;
    const g = cv.getContext('2d');
    if (!g) return;
    const still = prefersStillRoom();
    const touchGlow = still ? 0 : softBell(now - roomAnim.plantStart, 520, 420, 1250);
    const kind = roomAnim.spec.kind;
    // Кактус (1) — 0 раскачивания; суккулент (2) и бонсай (6) — только еле уловимое дыхание цветоноса/листвы; гибкие виды — мягкое дыхание кончиков
    let sway = 0;
    if (!still && kind !== 1) {
        const elapsed = (now - roomAnim.plantStart) * 0.001;
        const rustle = (elapsed > 0 && elapsed < 2.4)
            ? Math.exp(-elapsed * 1.6) * Math.sin(elapsed * 5.2) * (kind === 6 || kind === 2 ? 1.6 : 4.2)
            : 0;
        const idle = Math.sin(now * 0.00085) * (kind === 6 ? 1.1 : kind === 2 ? 1.8 : 2.4);
        sway = idle + rustle;
    }
    drawPlantSprite(g, roomAnim.spec, roomAnim.stage, {
        sway,
        glow: touchGlow,
        phase: roomAnim.activePhase
    });
}

function stationLoop(now) {
    const view = typeof document !== 'undefined' && document.getElementById('view-profile');
    if (!view || view.classList.contains('hidden') || document.hidden || prefersStillRoom()) {
        roomAnim.raf = null;
        return;
    }
    if (now - roomAnim.lastFrame >= 28) {
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
    if (obj === 'plant') { tone(396, 0.38, 'sine', 0.026); tone(594, 0.48, 'sine', 0.018, 0.09); }
    else if (obj === 'window') { tone(660, 0.28, 'sine', 0.018, 0, 520); }
    else if (obj === 'lamp') { tone(520, 0.14, 'triangle', 0.016, 0, 440); tone(260, 0.45, 'sine', 0.015, 0.05); }
    else if (obj === 'shelf') {
        // Мягкий механический звук открытия кассеты и возврата назад
        if (typeof noise === 'function') { noise(0.05, 0.022, 0, 1600); noise(0.04, 0.018, 2.2, 1400); }
        tone(280, 0.12, 'triangle', 0.016, 0.05, 340);
        tone(320, 0.12, 'triangle', 0.014, 1.7, 250);
    } else if (obj === 'nightlight' || obj === 'nightlightR') {
        tone(294, 0.65, 'sine', 0.022, 0, 330);
        tone(440, 0.75, 'sine', 0.014, 0.12);
    } else if (obj === 'bed') {
        tone(220, 0.55, 'sine', 0.022); tone(330, 0.65, 'sine', 0.015, 0.12);
    }
}

function nextRoomLine(key, list) {
    const idx = roomAnim.lineStep[key] || 0;
    roomAnim.lineStep[key] = idx + 1;
    return list[idx % list.length];
}

function touchRoomObject(obj, event) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (roomAnim.lastTouchObj === obj && now - roomAnim.lastTouchAt < 260) return;
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
        }, 1200);
    }

    let fxX = null, fxY = null;
    if (event && typeof event.clientX === 'number' && scene && scene.getBoundingClientRect) {
        const rect = scene.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (event.clientX || event.clientY)) {
            fxX = ((event.clientX - rect.left) / rect.width) * FX_W;
            fxY = ((event.clientY - rect.top) / rect.height) * FX_H;
        }
    }

    try { Telegram.WebApp.HapticFeedback.impactOccurred('soft'); } catch (_) {}

    let line = '';
    if (obj === 'terminal') {
        roomAnim.crtStart = now;
        line = ROOM_LINES.terminal;
    } else if (obj === 'radio') {
        roomAnim.radioStart = now;
        const hasSignal = typeof musicFound === 'function' && musicFound();
        line = hasSignal ? ROOM_LINES.radioOn : ROOM_LINES.radioOff;
    } else if (obj === 'plant') {
        roomAnim.plantStart = now;
        const sp = roomAnim.spec || plantSpec();
        const dropPetals = roomAnim.stage === 5 && (sp.kind === 6 || sp.kind === 5 || sp.kind === 4);
        if (roomAnim.stage >= 3) spawnPlantSpores(4 + Math.floor(roomAnim.stage * 0.7), dropPetals);
        line = PLANT_NOTES[sp.kind][roomAnim.stage];
        playObjectTone('plant');
    } else if (obj === 'window') {
        roomAnim.winStart = now;
        const wx = fxX && insideWindow(fxX, fxY, 12) ? fxX : WIN_CX;
        const wy = fxY && insideWindow(fxX, fxY, 12) ? fxY : WIN_CY + 10;
        roomAnim.ripples.push({ x: wx, y: wy, maxR: 28, life: 1, speed: 0.022 });
        line = nextRoomLine('win_' + roomAnim.activePhase, ROOM_LINES.window[roomAnim.activePhase] || ROOM_LINES.window[0]);
        playObjectTone('window');
    } else if (obj === 'lamp') {
        // Мягкий толчок подвесной лампы (если уже качается — плавно подхватываем без рывка)
        const running = (now - roomAnim.lampStart) * 0.001;
        if (running > 0.45 || running < 0) {
            roomAnim.lampDir = fxX && fxX > 187 ? -1 : -roomAnim.lampDir;
            roomAnim.lampAmp = 0.095; // ~5.5° плавного естественного качания
            roomAnim.lampStart = now;
        }
        line = nextRoomLine('lamp', ROOM_LINES.lamp);
        playObjectTone('lamp');
    } else if (obj === 'shelf') {
        // Плавный выезд и возврат кассеты (не обрываем на полпути, если уже идёт цикл)
        if ((now - roomAnim.deckStart) > 2850) {
            roomAnim.deckStart = now;
            playObjectTone('shelf');
        }
        line = nextRoomLine('shelf', ROOM_LINES.shelf);
    } else if (obj === 'nightlight') {
        roomAnim.nightLStart = now;
        line = nextRoomLine('nightlight', ROOM_LINES.nightlight);
        playObjectTone('nightlight');
    } else if (obj === 'nightlightR') {
        roomAnim.nightRStart = now;
        line = nextRoomLine('nightlightR', ROOM_LINES.nightlightR);
        playObjectTone('nightlightR');
    } else if (obj === 'bed') {
        // Лёгкое касание кушетки мягко отзывается тёплым светом прикроватного ночника
        roomAnim.nightRStart = now;
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

// Прямой наглядный осмотр любой из 6 стадий роста растения (1/6 .. 6/6) в нижней панели
function inspectPlantStage(idx) {
    const s = Math.trunc(Number(idx));
    if (!Number.isInteger(s) || s < 0 || s >= PLANT_STAGES.length) return;
    const previewing = typeof roomPreview !== 'undefined' && !!roomPreview;
    if (previewing) {
        roomAnim.previewStage = s;
    } else {
        roomAnim.inspectStage = (s === roomAnim.liveStage) ? null : s;
    }
    const sp = roomAnim.spec || plantSpec();
    roomAnim.customEntry = PLANT_NOTES[sp.kind][s];
    const cv = typeof document !== 'undefined' && document.getElementById('station-plant');
    if (cv && cv.classList) {
        cv.classList.remove('is-stage-shift');
        void cv.offsetWidth;
        cv.classList.add('is-stage-shift');
    }
    playObjectTone('plant');
    renderRoom();
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
    const liveStage = plantStage(warmth, rIdx);

    // Если игрок реально вырос до новой стадии — сбрасываем режим осмотра и показываем живой рост!
    const grew = roomAnim.lastStage >= 0 && liveStage > roomAnim.lastStage && !previewing;
    if (grew) roomAnim.inspectStage = null;

    const shownStage = previewing
        ? (Number.isInteger(roomAnim.previewStage) ? roomAnim.previewStage : liveStage)
        : (Number.isInteger(roomAnim.inspectStage) ? roomAnim.inspectStage : liveStage);
    const isPeeking = !previewing && shownStage !== liveStage;
    const radioReady = typeof musicFound === 'function' && musicFound();

    roomAnim.activePhase = active;
    roomAnim.warmth = warmth;
    roomAnim.rank = rIdx;
    roomAnim.liveStage = liveStage;
    roomAnim.stage = shownStage;
    roomAnim.lastStage = liveStage;
    roomAnim.spec = spec;
    roomAnim.radioLit = radioReady;
    if (grew) {
        roomAnim.plantStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
        roomAnim.customEntry = PLANT_NOTES[spec.kind][liveStage];
        if (liveStage >= 3) spawnPlantSpores(6, liveStage === 5 && spec.kind >= 4);
    }

    room.dataset.phase = String(active);
    room.dataset.radio = radioReady ? 'on' : 'off';
    room.dataset.stage = String(shownStage);

    const wEl = document.getElementById('warmth-val');
    if (wEl) wEl.textContent = String(warmth);
    const mEl = document.getElementById('station-mode');
    if (mEl) mEl.textContent = previewing ? 'ДЕМОНСТРАЦИЯ // ЖУРНАЛ' : 'ЖУРНАЛ СТАНЦИИ';
    setStationEntry(roomAnim.customEntry || phase.entry, grew);

    const plantInfo = document.getElementById('station-plant-info');
    if (plantInfo) {
        const prefix = isPeeking ? 'ОСМОТР' : 'РОСТ';
        plantInfo.textContent = `${spec.kindName} // ${prefix} ${shownStage + 1}/6 · ${PLANT_STAGES[shownStage].toUpperCase()}`;
    }
    const plantSub = document.getElementById('station-plant-sub');
    if (plantSub) {
        if (isPeeking) {
            const need = PLANT_WARMTH_STEPS[shownStage];
            plantSub.textContent = shownStage <= liveStage
                ? `пройдено · ваш этап ${liveStage + 1}/6`
                : `с ${need} тепла / Ур. ${shownStage + 1} · ваш ${liveStage + 1}/6`;
        } else if (previewing) {
            plantSub.textContent = `нажмите 1–6 для всех стадий`;
        } else if (liveStage < 5) {
            plantSub.textContent = `след.: ${PLANT_WARMTH_STEPS[liveStage + 1]} тепла · нажмите 1–6`;
        } else {
            plantSub.textContent = `полное цветение · все 6 стадий`;
        }
    }

    room.querySelectorAll('[data-stage-btn]').forEach((btn, idx) => {
        const reached = previewing || idx <= liveStage;
        const selected = idx === shownStage;
        btn.classList.toggle('is-reached', reached);
        btn.classList.toggle('is-live', !previewing && idx === liveStage);
        btn.classList.toggle('is-peek', !reached && selected);
        btn.setAttribute('aria-pressed', String(selected));
        btn.title = `Стадия ${idx + 1}/6: ${PLANT_STAGES[idx]} (${PLANT_WARMTH_STEPS[idx]} тепла)`;
    });

    const plantBtn = room.querySelector('[data-obj="plant"]');
    if (plantBtn) {
        plantBtn.setAttribute('aria-label', `${spec.kindName[0] + spec.kindName.slice(1).toLowerCase()}, стадия ${shownStage + 1} из 6 — осмотреть`);
    }

    const nextEl = document.getElementById('station-next');
    if (nextEl) {
        nextEl.textContent = previewing
            ? 'Режим осмотра: переключайте стадии 1–6 и атмосферы комнаты.'
            : next
                ? `До атмосферы «${next.name}»: ещё ${next.at - warmth} тепла.`
                : 'Все атмосферы открыты. За окном — живой рассвет.';
    }

    const meter = document.getElementById('station-meter');
    if (meter) {
        meter.hidden = previewing || !next;
        if (!previewing && next) {
            meter.max = next.at - stationPhases[unlocked].at;
            meter.value = warmth - stationPhases[unlocked].at;
        }
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
    const stEl = document.getElementById('station-stars');
    if (stEl) stEl.textContent = `Карта неба: ${stars}/6. С каждым новым рангом загорается звезда.`;

    const appRadio = document.getElementById('app-radio');
    if (appRadio) appRadio.style.opacity = radioReady ? 1 : 0.65;

    ensureStationLoop();
}

function resetStationPreview() {
    roomAnim.previewPhase = stationPhases.length - 1;
    roomAnim.previewStage = null;
    roomAnim.inspectStage = null;
    roomAnim.customEntry = '';
}

function equipStationPhase(i) {
    if (!Number.isInteger(i) || !stationPhases[i]) return;
    if (typeof roomPreview !== 'undefined' && roomPreview) {
        roomAnim.previewPhase = i;
        roomAnim.previewStage = null;
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
