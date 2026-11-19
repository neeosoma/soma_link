const stationPhases = [
    { at: 0,   name: 'Дождь',    entry: 'Город шумит за мокрым стеклом. В пустом горшке тихо спит земля.' },
    { at: 20,  name: 'Оттепель', entry: 'Дождь редеет. От круглого окна больше не тянет прежним холодом.' },
    { at: 108, name: 'Очаг',     entry: 'Мягкий свет ночных окон и ночников сходится на тёплом ковре.' },
    { at: 240, name: 'Рассвет',  entry: 'Дождь стих. Из круглого окна в комнату медленно льётся алый рассвет.' }
];

// Сезонный ритм (~90 тёплых дней до цветения, без гринда и без наказаний за паузы)
const PROGRESSION_RULES = {
    DAILY_HOLD_CAP: 2,        // до +2 тепла/день за тихое дочитывание постов
    DAILY_TRAINER_CAP: 2,     // до +2 тепла/день за точное слушание в терминале
    DAILY_WARMTH_CAP: 4,      // потолок +4 тепла/день (нельзя зафармить комнату за 3 дня)
    WHISPER_WARMTH_GATE: 20,  // допуск к пейджеру «Шёпот»: ~1-я неделя
    WHISPER_TRAINER_GATE: 5,  // допуск к пейджеру «Шёпот»: 5 услышанных историй
    WHISPER_BLOOM_ACKS: 5,    // для финального цветения 6/6 (после запуска «Шёпота»)
    SPECIES_REVEAL_STAGE: 2,  // вид раскрывается на 3/6 (~1 месяц)
    DRY_SOIL_DAYS: 5,         // мягкая заметка о подсохшей земле без потери прогресса
    SEASON_WARMTH: 360        // полный сезон тепла (90 тёплых дней × 4)
};

// ===== УНИКАЛЬНОЕ РАСТЕНИЕ ИГРОКА (точная привязка к прежнему анонимному ID) =====
const PLANT_KINDS = ['ПАПОРОТНИК', 'КАКТУС', 'СУККУЛЕНТ', 'БАМБУК', 'ЛИАНА', 'ЦВЕТОК', 'БОНСАЙ'];
const PLANT_STAGES = ['росток', 'всходы', 'побеги', 'крона', 'бутоны', 'цветение'];
// Нелинейная сезонная шкала: нед. 1 (20) → нед. 2 (52) → 1 мес. (108) → 1.5 мес. (180) → 2 мес. (240) → 3 мес. (360)
const PLANT_WARMTH_STEPS = [20, 52, 108, 180, 240, 360];
// Шкала для новых семян в Оранжерее после расцвета родного вида (~75 тёплых дней на вид, год+ на все 7)
const GREENHOUSE_WARMTH_STEPS = [16, 48, 96, 156, 216, 300];

const EMPTY_POT_LINES = {
    cold: [
        'Пустой керамический горшок с тёмной землёй. От чужих драм здесь ничего не вырастет — росток проснётся, когда откроется «Шёпот».',
        'Ладонь чувствует прохладную глину. Земля ждёт первого настоящего тепла, отданного живому человеку.'
    ],
    ready: [
        'Земля в горшке согрелась и затаила дыхание. Когда заработает частота «Шёпот», ваш первый отклик разбудит здесь жизнь.',
        'Допуск к тёплой линии получен — почва готова. Осталось дождаться сигнала на пейджере и согреть кого-то по-настоящему.'
    ],
    seed: [
        'В свежей земле Оранжереи дремлет новое неизвестное семя. Дайте ему несколько тёплых вечеров — и покажется росток.',
        'Тишина над новым горшком. Какой из видов станции спит внутри, откроется только со временем.'
    ],
    dry: 'Земля чуть подсохла за дни тишины, но терпеливо дождалась вас. Здесь ничто не вянет от паузы.'
};

const MYSTERY_STAGE_NOTES = [
    'Сквозь тёмную землю пробилась первая живая точка. Ещё слишком рано угадывать, кем она станет.',
    'Молодой побег окреп и потянулся к круглому окну — его истинный вид вот-вот начнёт угадываться.'
];

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

// Холодный XP и циничные ранги больше НИКОГДА не растят цветок.
// Возвращает -1 (пустой горшок с землёй), пока не открыт и не отправлен первый «Шёпот», либо 0..5 (стадии 1/6..6/6).
function plantStage(warmth, opts) {
    const w = Math.max(0, Number(warmth) || 0);
    const o = (opts && typeof opts === 'object') ? opts : {};
    const steps = Array.isArray(o.steps) ? o.steps : PLANT_WARMTH_STEPS;
    const sprouted = !!o.sprouted;
    if (!sprouted || w < steps[0]) return -1;
    let st = steps.reduce((last, at, i) => w >= at ? i : last, -1);
    if (st >= 5 && o.requireAcks && (Number(o.bloomAcks) || 0) < PROGRESSION_RULES.WHISPER_BLOOM_ACKS) {
        st = 4;
    }
    return Math.max(-1, Math.min(5, st));
}

function isWhisperLive() {
    try { return !!(typeof window !== 'undefined' && window.SOMA_CONFIG && window.SOMA_CONFIG.WHISPER_LIVE); }
    catch (_) { return false; }
}

function isPtsMode() {
    try {
        if (typeof cfg !== 'undefined' && cfg && cfg.ENV === 'pts') return true;
        return !!(typeof window !== 'undefined' && window.SOMA_CONFIG && window.SOMA_CONFIG.ENV === 'pts');
    } catch (_) { return false; }
}

function indifferenceIndex(warmth) {
    const w = Math.max(0, Number(warmth) || 0);
    const ratio = Math.min(1, w / PROGRESSION_RULES.SEASON_WARMTH);
    return Math.max(0, Math.min(100, Math.round((1 - ratio) * 100)));
}

function stationState(warmth, equipped, seenMax) {
    const w = Math.max(0, Number(warmth) || 0);
    const unlocked = stationPhases.reduce((last, phase, i) => w >= phase.at ? i : last, 0);
    const justUnlocked = Number.isInteger(seenMax) && seenMax >= 0 && unlocked > seenMax;
    const active = justUnlocked
        ? unlocked
        : (Number.isInteger(equipped) && equipped >= 0 && equipped <= unlocked ? equipped : unlocked);
    return { unlocked, active, justUnlocked, next: stationPhases[unlocked + 1] };
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
function drawCeramicPot(g, bx, baseY, sp, stage, lit, soilOpts) {
    const so = soilOpts || {};
    const shapes = [
        { topW: 102, botW: 66, h: 66, rimH: 11, belly: 1.05, feet: false }, // классическая терракота
        { topW: 128, botW: 88, h: 48, rimH: 9,  belly: 1.08, feet: true },  // широкая чаша бонсай/эхеверии
        { topW: 88,  botW: 60, h: 76, rimH: 10, belly: 1.06, feet: false }  // высокий сосуд ручной лепки
    ];
    const sh = shapes[sp.potShape] || shapes[0];
    const topY = baseY - sh.h;
    const tw = sh.topW * 0.5, bw = sh.botW * 0.5;
    const CUSTOM_POTS = {
        pot_kintsugi: ['#080507', '#1d1318', '#422c35'], // чёрная глина раку + 24k сусальное золото кинцуги
        pot_cinnabar: ['#3a050b', '#9e1426', '#eb4458'], // императорский киноварный лак с золотым поясом
        pot_moon:     ['#1c1b28', '#525068', '#b8b4cc']  // лунный селадоновый фарфор с жемчужным отливом
    };
    const potSkin = so.potSkin && CUSTOM_POTS[so.potSkin] ? so.potSkin : '';
    const [pDark, pMid, pLight] = potSkin ? CUSTOM_POTS[potSkin] : sp.pot;

    // Резная коллекционная подставка «кадаи» и живой световой отблеск на ковре для авторских сосудов
    if (potSkin) {
        g.save();
        if (g.createRadialGradient) {
            const auraCol = potSkin === 'pot_kintsugi'
                ? ['rgba(255, 206, 98, 0.24)', 'rgba(180, 112, 24, 0.08)']
                : potSkin === 'pot_cinnabar'
                    ? ['rgba(255, 76, 96, 0.28)', 'rgba(165, 18, 38, 0.09)']
                    : ['rgba(206, 204, 242, 0.24)', 'rgba(118, 112, 168, 0.08)'];
            const pg = g.createRadialGradient(bx, baseY + 4, 6, bx, baseY + 4, bw + 34);
            pg.addColorStop(0, auraCol[0]);
            pg.addColorStop(0.55, auraCol[1]);
            pg.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = pg;
            g.beginPath(); g.ellipse(bx, baseY + 5, bw + 34, 15, 0, 0, Math.PI * 2); g.fill();
        }
        // Точёные ножки и лаковая площадка подставки кадаи
        const stW = bw + 8;
        g.fillStyle = potSkin === 'pot_moon' ? '#181420' : '#16080a';
        g.beginPath();
        g.roundRect ? g.roundRect(bx - stW * 0.78, baseY + 2, 9, 6.5, 2) : g.fillRect(bx - stW * 0.78, baseY + 2, 9, 6.5);
        g.roundRect ? g.roundRect(bx + stW * 0.78 - 9, baseY + 2, 9, 6.5, 2) : g.fillRect(bx + stW * 0.78 - 9, baseY + 2, 9, 6.5);
        g.fill();
        g.fillStyle = potSkin === 'pot_kintsugi' ? '#24120c' : potSkin === 'pot_cinnabar' ? '#2c080c' : '#231f2e';
        g.beginPath(); g.ellipse(bx, baseY + 1.8, stW, 6.8, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = potSkin === 'pot_kintsugi'
            ? 'rgba(248, 206, 104, 0.68)'
            : potSkin === 'pot_cinnabar'
                ? 'rgba(255, 178, 112, 0.55)'
                : 'rgba(218, 216, 248, 0.55)';
        g.lineWidth = 1.25;
        g.beginPath(); g.ellipse(bx, baseY + 1.4, stW - 1, 6.0, 0, 0, Math.PI); g.stroke();
        g.restore();
    }

    // Глубокая мягкая тень горшка на ковре (прочно «сажает» растение в комнату)
    if (g.createRadialGradient) {
        const sr = bw * 1.75 + Math.max(0, stage) * 5;
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

    // Тонкая рельефная бороздка ручной работы (или золотые швы Кинцуги / двойной кант Киновари)
    const bandY = topY + sh.h * 0.44;
    const bandW = tw * 0.92;
    const potT = ((typeof so.now === 'number' ? so.now : 0) || 0) * 0.001;
    const potPulse = prefersStillRoom() ? 0.65 : (0.5 + 0.5 * Math.sin(potT * 1.45));
    if (potSkin === 'pot_kintsugi') {
        g.save();
        g.lineCap = 'round';
        g.lineJoin = 'round';
        const goldGlow = 0.24 + potPulse * 0.22;
        const drawGoldSeam = pts => {
            g.strokeStyle = `rgba(255, 200, 76, ${goldGlow.toFixed(3)})`;
            g.lineWidth = 5.4 + potPulse * 1.4;
            g.beginPath();
            pts.forEach(([x, y], i) => { if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); });
            g.stroke();
            g.strokeStyle = 'rgba(138, 82, 14, 0.92)';
            g.lineWidth = 2.8;
            g.stroke();
            g.strokeStyle = '#ffd262';
            g.lineWidth = 1.7;
            g.stroke();
            g.strokeStyle = `rgba(255, 252, 220, ${(0.78 + potPulse * 0.22).toFixed(3)})`;
            g.lineWidth = 0.78;
            g.stroke();
        };
        const mainSeam = [
            [bx - tw * 0.46, topY + 6],
            [bx - tw * 0.26, topY + sh.h * 0.34],
            [bx - tw * 0.04, topY + sh.h * 0.52],
            [bx + bw * 0.22, topY + sh.h * 0.78],
            [bx + bw * 0.46, baseY - 2]
        ];
        drawGoldSeam(mainSeam);
        drawGoldSeam([
            [bx - tw * 0.04, topY + sh.h * 0.52],
            [bx + tw * 0.24, topY + sh.h * 0.38],
            [bx + tw * 0.48, topY + 8]
        ]);
        drawGoldSeam([
            [bx - tw * 0.26, topY + sh.h * 0.34],
            [bx - bw * 0.56, topY + sh.h * 0.68],
            [bx - bw * 0.36, baseY - 3]
        ]);
        // Живая золотая искра-блик, мягко скользящая по главному шву 24k золота
        const segPos = (prefersStillRoom() ? 0.48 : ((potT * 0.28) % 1)) * (mainSeam.length - 1);
        const si = Math.min(mainSeam.length - 2, Math.floor(segPos));
        const sf = segPos - si;
        const gx = mainSeam[si][0] + (mainSeam[si + 1][0] - mainSeam[si][0]) * sf;
        const gy = mainSeam[si][1] + (mainSeam[si + 1][1] - mainSeam[si][1]) * sf;
        radialAura(g, gx, gy, 7.5, '#fff8d6', '#ffb838', 0.65);
        g.restore();
    } else if (potSkin === 'pot_cinnabar') {
        // Императорский киноварный лак: двойной золотой пояс, сияющая печать мастера и бегущий лаковый блик
        const sealGlow = 0.72 + potPulse * 0.24;
        g.strokeStyle = `rgba(255, 218, 128, ${sealGlow.toFixed(3)})`;
        g.lineWidth = 1.65;
        g.beginPath();
        g.moveTo(bx - bandW, bandY - 2.5);
        g.quadraticCurveTo(bx, bandY + 6.5, bx + bandW, bandY - 2.5);
        g.stroke();
        g.lineWidth = 1.15;
        g.beginPath();
        g.moveTo(bx - bandW * 0.95, bandY + 5.5);
        g.quadraticCurveTo(bx, bandY + 14.5, bx + bandW * 0.95, bandY + 5.5);
        g.stroke();
        // Тёплый золотой медальон мастера с живым дыханием по центру сосуда
        radialAura(g, bx, bandY + 6, 11, '#ffd978', '#d8243c', 0.34 + potPulse * 0.2);
        g.fillStyle = `rgba(255, 224, 134, ${sealGlow.toFixed(3)})`;
        g.beginPath(); g.arc(bx, bandY + 6, 4.4, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#6e0815';
        g.fillRect(bx - 1.9, bandY + 4.1, 3.8, 3.8);
        g.fillStyle = '#ffe9a6';
        g.fillRect(bx - 0.7, bandY + 5.3, 1.4, 1.4);
        // Две боковые золотые заклёпки пояса
        for (const sgn of [-1, 1]) {
            g.fillStyle = 'rgba(255, 220, 132, 0.82)';
            g.beginPath(); g.arc(bx + sgn * bandW * 0.46, bandY + 3.8, 1.5, 0, Math.PI * 2); g.fill();
        }
        // Глянцевый зеркальный блик многослойного киноварного лака с плавным переливом
        const sheenShift = prefersStillRoom() ? 0 : Math.sin(potT * 0.85) * (tw * 0.14);
        g.strokeStyle = `rgba(255, 226, 220, ${(0.34 + potPulse * 0.14).toFixed(3)})`;
        g.lineWidth = 3.4;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(bx - tw * 0.54 + sheenShift, topY + 13);
        g.quadraticCurveTo(bx - bw * 0.50 + sheenShift, topY + sh.h * 0.55, bx - bw * 0.42 + sheenShift, baseY - 7);
        g.stroke();
    } else if (potSkin === 'pot_moon') {
        // Лунный селадон: серебряный пояс, светящийся полумесяц в живом ореоле и мерцающие звёздные искры
        const moonGlow = 0.52 + potPulse * 0.28;
        g.strokeStyle = `rgba(236, 234, 255, ${(0.55 + potPulse * 0.2).toFixed(3)})`;
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(bx - bandW, bandY - 1);
        g.quadraticCurveTo(bx, bandY + 8, bx + bandW, bandY - 1);
        g.stroke();
        // Мягкий перламутрово-лунный ореол вокруг серебряного серпа
        radialAura(g, bx, bandY + 13.5, 14, '#eef0ff', '#8b82d6', 0.34 + potPulse * 0.22);
        g.fillStyle = `rgba(248, 246, 255, ${(0.84 + potPulse * 0.15).toFixed(3)})`;
        g.beginPath(); g.arc(bx, bandY + 13.5, 5.1, 0, Math.PI * 2); g.fill();
        g.fillStyle = pMid;
        g.beginPath(); g.arc(bx + 2.2, bandY + 12.6, 4.3, 0, Math.PI * 2); g.fill();
        // Мерцающие серебряные созвездия по бокам лунного серпа
        const stars = [[-0.36, 10.5, 0], [0.34, 11.2, 1.8], [-0.20, 17.5, 3.1], [0.22, 17.0, 4.5]];
        for (let si = 0; si < stars.length; si++) {
            const [sx, sy, ph] = stars[si];
            const twk = prefersStillRoom() ? 0.75 : (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(potT * 2.1 + ph)));
            g.fillStyle = `rgba(244, 242, 255, ${twk.toFixed(3)})`;
            g.beginPath(); g.arc(bx + bandW * sx, bandY + sy, 0.9 + twk * 0.65, 0, Math.PI * 2); g.fill();
        }
        g.strokeStyle = `rgba(246, 244, 255, ${(0.32 + moonGlow * 0.18).toFixed(3)})`;
        g.lineWidth = 3.1;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(bx - tw * 0.55, topY + 14);
        g.quadraticCurveTo(bx - bw * 0.52, topY + sh.h * 0.55, bx - bw * 0.44, baseY - 8);
        g.stroke();
    } else {
        g.strokeStyle = mixHex(pLight, '#ff9aa4', 0.22, stage >= 3 ? 0.42 : 0.22);
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(bx - bandW, bandY);
        g.quadraticCurveTo(bx, bandY + 9, bx + bandW, bandY);
        g.stroke();
    }
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

    // Глубокий живой грунт внутри горшка:
    // на стадии -1 (пустой горшок) — только тёмная спящая земля без мха и спойлера вида!
    const sw = tw - 3, sy = ry - 2.2;
    g.fillStyle = so.dry ? '#211110' : '#140807';
    g.beginPath(); g.ellipse(bx, topY + 2, sw, sy, 0, 0, Math.PI * 2); g.fill();

    const sr2 = rng(sp.seed ^ 0x51a7);
    if (stage < 0) {
        // Бархатистые комочки тёмного чернозёма и крошечная лунка в центре, ждущая «Шёпота»
        for (let i = 0; i < 26; i++) {
            const a = sr2() * Math.PI * 2, d = Math.sqrt(sr2()) * 0.88;
            const gx = bx + Math.cos(a) * sw * d;
            const gy = topY + 2 + Math.sin(a) * sy * d;
            g.fillStyle = so.dry
                ? (i % 3 === 0 ? '#4d2e29' : i % 3 === 1 ? '#361d1a' : '#63413b')
                : (i % 3 === 0 ? '#2f1614' : i % 3 === 1 ? '#1f0d0c' : '#43221e');
            g.beginPath();
            g.ellipse(gx, gy, 2.0 + sr2() * 3.4, 1.1 + sr2() * 1.5, sr2(), 0, Math.PI * 2);
            g.fill();
        }
        // Мягкая лунка в центре земли
        g.fillStyle = 'rgba(8,2,3,0.52)';
        g.beginPath();
        g.ellipse(bx, topY + 2.3, sw * 0.26, sy * 0.34, 0, 0, Math.PI * 2);
        g.fill();
        if (so.ready) {
            // Едва уловимое тёплое дыхание согретой земли (допуск получен, горшок ждёт первого «Шёпота»)
            radialAura(g, bx, topY + 1, sw * 0.55, '#ff8d96', '#8c192b', 0.16);
        }
    } else {
        const revealSoil = stage >= PROGRESSION_RULES.SPECIES_REVEAL_STAGE;
        const isDesert = revealSoil && (sp.kind === 1 || sp.kind === 2);
        for (let i = 0; i < 22; i++) {
            const a = sr2() * Math.PI * 2, d = Math.sqrt(sr2()) * 0.88;
            const gx = bx + Math.cos(a) * sw * d;
            const gy = topY + 2 + Math.sin(a) * sy * d;
            if (!revealSoil) {
                g.fillStyle = i % 3 === 0 ? '#2b1815' : i % 3 === 1 ? '#1e2c1f' : '#3b201b';
                g.beginPath();
                g.ellipse(gx, gy, 2.2 + sr2() * 3.2, 1.2 + sr2() * 1.5, sr2(), 0, Math.PI * 2);
                g.fill();
            } else if (isDesert) {
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
    }

    // Передняя кромка венчика перекрывает грунт снизу для объёма
    g.strokeStyle = potSkin === 'pot_kintsugi'
        ? 'rgba(246, 203, 100, 0.46)'
        : mixHex(pLight, '#ffc4ca', 0.2, 0.5);
    g.lineWidth = 1.6;
    g.beginPath();
    g.ellipse(bx, topY + 3, rw - 1.5, ry + 0.5, 0, Math.PI * 0.08, Math.PI * 0.92);
    g.stroke();
    if (potSkin === 'pot_kintsugi') {
        // Золотая спайка на самом венчике сосуда
        g.fillStyle = '#ffe294';
        g.beginPath(); g.ellipse(bx - tw * 0.45, topY + 8.5, 3.2, 1.5, 0.25, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(bx + tw * 0.47, topY + 8.2, 2.8, 1.4, -0.25, 0, Math.PI * 2); g.fill();
    }

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

    const rawStage = (stage === undefined || stage === null) ? -1 : Math.trunc(Number(stage));
    const s = Math.max(-1, Math.min(5, Number.isNaN(rawStage) ? -1 : rawStage));
    const sway = Number(o.sway) || 0;
    const pulse = Math.max(0, Math.min(1, Number(o.glow) || 0));
    const phase = Number.isInteger(o.phase) ? o.phase : 2;
    const bx = 180;
    const baseY = 348;
    const r = rng(spec.seed);
    const pal = roomToneLeaf(spec.leaf, phase);
    const bl = spec.bloom;

    // Стадия -1: пустой именной керамический горшок со спящей землёй (до первого «Шёпота»)
    if (s < 0) {
        if (pulse > 0.04 || o.soilReady) {
            radialAura(ctx, bx, baseY - 58, 62, '#ff7d8a', '#731122', pulse * 0.1 + (o.soilReady ? 0.045 : 0));
        }
        drawCeramicPot(ctx, bx, baseY, spec, -1, phase >= 2 || pulse > 0.15, {
            dry: !!o.dry,
            ready: !!o.soilReady,
            potSkin: o.potSkin || ''
        });
        // Светлячки тишины прилетают даже к пустому горшку, согревая спящую землю живым золотом!
        const emptyFf = o.fireflies ? Math.max(1, Math.min(7, Number(o.fireflies) || 0)) : (o.dew ? 5 : 0);
        if (emptyFf > 0 && ctx.createRadialGradient) {
            drawPlantFireflies(ctx, bx, baseY - 62, -1, emptyFf, !!o.firefliesDrowsy && !o.dew, Number(o.now) || 0, pulse);
        }
        ctx.restore();
        return;
    }

    // Мягкий атмосферный ореол от света круглого окна за растением
    if (s >= 3 || pulse > 0.04 || o.dew) {
        const auraA = (s >= 3 ? (s - 2) * 0.045 : 0) + (phase === 3 ? 0.06 : 0) + pulse * 0.12 + (o.dew ? 0.05 : 0);
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

    const pot = drawCeramicPot(ctx, bx, baseY, spec, s, phase >= 2 || pulse > 0.15, {
        dry: !!o.dry,
        potSkin: o.potSkin || ''
    });
    const by = pot.soilY;

    // Естественная физика по видам: кактус, розетка суккулента и ствол бонсая НЕ качаются из стороны в сторону!
    if (spec.kind === 0) drawSpeciesFern(ctx, bx, by, spec, s, pal, bl, sway, pulse, r);
    else if (spec.kind === 1) drawSpeciesCactus(ctx, bx, by, spec, s, pal, bl, pulse, r);
    else if (spec.kind === 2) drawSpeciesSucculent(ctx, bx, by, spec, s, pal, bl, sway, pulse);
    else if (spec.kind === 3) drawSpeciesBamboo(ctx, bx, by, spec, s, pal, bl, sway, pulse, r);
    else if (spec.kind === 4) drawSpeciesVine(ctx, bx, by, pot, spec, s, pal, bl, sway, pulse, r);
    else if (spec.kind === 5) drawSpeciesFlower(ctx, bx, by, spec, s, pal, bl, sway, pulse, r);
    else drawSpeciesBonsai(ctx, bx, by, spec, s, pal, bl, sway, pulse, r);

    // «Светлячки тишины» и живое золотое биолюминесцентное сияние кроны (механика ежедневного присутствия 1..7)
    const ffCount = o.fireflies ? Math.max(1, Math.min(7, Number(o.fireflies) || 0)) : (o.dew ? 5 : 0);
    const ffDrowsy = !!o.firefliesDrowsy && !o.dew;
    if (ffCount > 0 && ctx.createRadialGradient) {
        drawPlantFireflies(ctx, bx, by, s, ffCount, ffDrowsy, Number(o.now) || 0, pulse);
    }

    ctx.restore();
}

// Рисует живых золотисто-янтарных «Светлячков тишины» и мягкое биолюминесцентное дыхание над горшком/кроной
function drawPlantFireflies(ctx, bx, by, stage, count, drowsy, now, touchPulse) {
    const still = prefersStillRoom();
    const t = still ? 1.4 : now * 0.001;
    const canopyH = stage < 0 ? 34 : (52 + stage * 28);
    const spreadX = stage < 0 ? 44 : (58 + stage * 14);
    const centerY = by - canopyH * 0.52;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // 1. Тёплое золотисто-медовое сияние самой кроны / согретой почвы (видно мгновенно на любом экране!)
    const auraStrength = (drowsy ? 0.11 : (0.17 + count * 0.024)) + touchPulse * 0.12;
    const crownGlow = ctx.createRadialGradient(bx, centerY, 4, bx, centerY, spreadX * 1.25);
    crownGlow.addColorStop(0, `rgba(255, 214, 108, ${auraStrength.toFixed(3)})`);
    crownGlow.addColorStop(0.5, `rgba(255, 138, 56, ${(auraStrength * 0.48).toFixed(3)})`);
    crownGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = crownGlow;
    ctx.beginPath();
    ctx.ellipse(bx, centerY, spreadX * 1.25, canopyH * 0.88 + 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Каждый тёплый вечер подряд (1..7) — живой парящий золотой светлячок со шлейфом и пульсом сердца
    const shown = drowsy ? Math.min(2, count) : Math.max(2, count + (count === 1 ? 1 : 0));
    for (let i = 0; i < shown; i++) {
        const seed = i * 2.39996 + 0.7;
        const speed = drowsy ? 0.35 : (0.68 + (i % 3) * 0.19);
        const orbitA = t * speed + seed;
        const lift = touchPulse * (16 + (i % 3) * 8);
        const rx = spreadX * (0.42 + ((i * 37) % 10) * 0.055);
        const fx = bx + Math.cos(orbitA) * rx + Math.sin(t * 1.3 + i) * 5;
        const baseBand = drowsy
            ? (by - 14 - (i * 11))
            : (by - 18 - ((i + 0.5) / shown) * canopyH);
        const fy = baseBand + Math.sin(orbitA * 1.6 + i) * (drowsy ? 4 : 11) - lift;
        const pulse = drowsy
            ? (0.35 + 0.25 * Math.sin(t * 1.4 + seed))
            : (0.68 + 0.32 * Math.sin(t * 2.6 + seed * 1.7));
        const haloR = (drowsy ? 10 : 15 + (i % 2) * 4) * (0.85 + pulse * 0.25);

        // Внешний медово-янтарный ореол
        const fg = ctx.createRadialGradient(fx, fy, 0.5, fx, fy, haloR);
        fg.addColorStop(0, `rgba(255, 250, 214, ${(pulse * 0.95).toFixed(3)})`);
        fg.addColorStop(0.22, `rgba(255, 206, 86, ${(pulse * 0.72).toFixed(3)})`);
        fg.addColorStop(0.58, `rgba(255, 118, 48, ${(pulse * 0.28).toFixed(3)})`);
        fg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(fx, fy, haloR, 0, Math.PI * 2); ctx.fill();

        // Тонкий шлейф движения (когда светлячок бодрствует)
        if (!drowsy && !still) {
            const tx = fx - (-Math.sin(orbitA) * rx * 0.14);
            const ty = fy - (Math.cos(orbitA * 1.6 + i) * 3.5);
            ctx.strokeStyle = `rgba(255, 224, 132, ${(pulse * 0.36).toFixed(3)})`;
            ctx.lineWidth = 1.4;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(fx, fy); ctx.stroke();
        }

        // Яркое живое ядрышко огонька
        ctx.fillStyle = `rgba(255, 252, 228, ${Math.min(1, pulse * 1.05).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(fx, fy, drowsy ? 1.8 : 2.6, 0, Math.PI * 2); ctx.fill();
    }

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
    lastPlantFrame: 0,
    activePhase: 0,
    unlockedPhase: 0,
    warmth: 0,
    rank: 0,
    stage: -1,
    liveStage: -1,
    inspectStage: null, // PTS: ручной осмотр -1 (пустой горшок) и 0..5 (стадии 1/6..6/6)
    inspectKind: null,  // PTS: ручной осмотр любого из 7 видов (0..6)
    galleryOpen: false,
    ptsOpen: false,
    ptsDew: false,
    previewStage: null,
    lastStage: -2,
    ownSpec: null,
    spec: null,
    soilReady: false,
    soilDry: false,
    dewActive: false,
    isSeedPot: false,
    radioLit: false,
    previewPhase: 3,
    contextPanel: '', // '' | 'window' | 'deck'
    activeCassetteId: '',
    pagerStep: 0,
    pagerMode: 'idle', // 'idle' | 'scan' | 'info'
    pagerResetTimer: null,
    customEntry: '',
    customMode: '',
    lineStep: {},
    lastTouchAt: 0,
    lastTouchObj: '',
    clearTouchTimer: null,
    // Плавные физические таймлайны предметов (без вспышек и без артефактов!)
    lampStart: -1e9,
    lampAmp: 0,
    lampDir: 1,
    deckStart: -1e9,
    deckWasActive: false,
    nightLStart: -1e9,
    nightRStart: -1e9,
    crtStart: -1e9,
    radioStart: -1e9,
    plantStart: -1e9,
    winStart: -1e9,
    catPetStart: -1e9,
    dogPetStart: -1e9,
    inspectCatCoat: null,
    inspectDogBreed: null,
    fsWaapi: null,
    fsBgWaapi: null,
    fsNativeActive: false,
    fsExitingNative: false,
    fsLastDeg: 0,
    ripples: [],
    spores: []
};

// ===== ДНЕВНОЙ РИТМ ТЕПЛА (АНТИ-ГРИНД), ДОПУСК К ПЕЙДЖЕРУ, ОРАНЖЕРЕЯ И КАССЕТЫ =====
function localDayKey(dateObj) {
    const d = dateObj instanceof Date ? dateObj : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function lsGet(key) {
    try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; }
    catch (_) { return null; }
}

function lsSet(key, val) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, val); return true; }
    catch (_) { return false; }
}

function loadWarmthLedger(todayOverride) {
    const today = todayOverride || localDayKey();
    let raw = {};
    try { raw = JSON.parse(lsGet('soma_warmth_ledger') || '{}') || {}; } catch (_) { raw = {}; }
    const sameDay = raw.day === today;
    return {
        day: today,
        hold: sameDay ? Math.max(0, Math.trunc(raw.hold || 0)) : 0,
        trainer: sameDay ? Math.max(0, Math.trunc(raw.trainer || 0)) : 0,
        total: sameDay ? Math.max(0, Math.trunc(raw.total || 0)) : 0,
        trainedSessions: sameDay ? Math.max(0, Math.trunc(raw.trainedSessions || 0)) : 0,
        warmDays: Math.max(0, Math.trunc(raw.warmDays || 0)),
        lastWarmDay: typeof raw.lastWarmDay === 'string' ? raw.lastWarmDay : '',
        trainedTotal: Math.max(0, Math.trunc(raw.trainedTotal || 0)),
        whispersSent: Math.max(0, Math.trunc(raw.whispersSent || 0)),
        whisperAcks: Math.max(0, Math.trunc(raw.whisperAcks || 0)),
        streak: Math.max(0, Math.min(7, Math.trunc(raw.streak || 0))),
        dewUntil: Math.max(0, Number(raw.dewUntil) || 0)
    };
}

// Бережная механика удержания «Светлячки тишины» (1..7 тёплых вечеров подряд, без жёсткого обнуления!)
function fireflyState(ledger, todayOverride, nowMs) {
    const l = ledger || loadWarmthLedger(todayOverride);
    const echoLit = l.dewUntil > (Number(nowMs) || Date.now());
    const away = daysSinceLastWarmth(l, todayOverride);
    const baseStreak = l.streak || (l.warmDays > 0 && away <= 1 ? 1 : 0);
    // Если сегодня уже согрели комнату (или прилетел отклик на «Шёпот») — светлячки ярко кружат весь вечер!
    if ((l.lastWarmDay === (todayOverride || l.day) && baseStreak > 0) || echoLit) {
        const count = Math.max(echoLit ? 3 : 1, Math.min(7, baseStreak));
        return { count, active: true, drowsy: false, max: 7 };
    }
    // Если вчера были рядом (away === 1) или пропустили пару дней — не сжигаем серию в 0, а мягко гасим по 1 огоньку!
    const remaining = away <= 1 ? baseStreak : Math.max(0, baseStreak - (away - 1));
    if (remaining > 0) {
        return { count: remaining, active: false, drowsy: true, max: 7 };
    }
    return { count: 0, active: false, drowsy: false, max: 7 };
}

function saveWarmthLedger(ledger) {
    lsSet('soma_warmth_ledger', JSON.stringify(ledger));
}

// Начисляет тепло строго в рамках дневного потолка (не более 4/день: 2 чтение + 2 тренажёр)
function claimDailyWarmth(source, todayOverride) {
    const ledger = loadWarmthLedger(todayOverride);
    if (source === 'trainer') {
        ledger.trainedTotal += 1;
    }
    if (source === 'whisper') {
        ledger.whispersSent += 1;
    }
    const srcCap = source === 'hold'
        ? PROGRESSION_RULES.DAILY_HOLD_CAP
        : source === 'trainer'
            ? PROGRESSION_RULES.DAILY_TRAINER_CAP
            : 1;
    const used = source === 'hold' ? ledger.hold : source === 'trainer' ? ledger.trainer : 0;
    const canGain = used < srcCap && ledger.total < PROGRESSION_RULES.DAILY_WARMTH_CAP;
    if (canGain) {
        if (source === 'hold') ledger.hold += 1;
        else if (source === 'trainer') ledger.trainer += 1;
        ledger.total += 1;
        if (ledger.lastWarmDay !== ledger.day) {
            const away = daysSinceLastWarmth(ledger, ledger.day);
            const carried = !ledger.lastWarmDay ? 0 : (away <= 1 ? (ledger.streak || 1) : Math.max(0, (ledger.streak || 1) - (away - 1)));
            ledger.streak = Math.min(7, carried + 1);
            ledger.warmDays += 1;
            ledger.lastWarmDay = ledger.day;
        } else if (!ledger.streak) {
            ledger.streak = 1;
        }
    }
    saveWarmthLedger(ledger);
    return { granted: canGain ? 1 : 0, ledger };
}

function recordWhisperEcho(nowMs) {
    const ledger = loadWarmthLedger();
    ledger.whisperAcks += 1;
    ledger.dewUntil = (Number(nowMs) || Date.now()) + 86400000; // 24 часа живой росы на лепестках
    saveWarmthLedger(ledger);
    return ledger;
}

function daysSinceLastWarmth(ledger, todayOverride) {
    const l = ledger || loadWarmthLedger(todayOverride);
    if (!l.lastWarmDay) return 0;
    const a = Date.parse(l.lastWarmDay + 'T00:00:00Z');
    const b = Date.parse((todayOverride || l.day) + 'T00:00:00Z');
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
    return Math.floor((b - a) / 86400000);
}

function whisperAdmission(warmth, ledger) {
    const w = Math.max(0, Number(warmth) || 0);
    const l = ledger || loadWarmthLedger();
    const warmthMet = w >= PROGRESSION_RULES.WHISPER_WARMTH_GATE;
    const trainerMet = l.trainedTotal >= PROGRESSION_RULES.WHISPER_TRAINER_GATE;
    return {
        admitted: warmthMet && trainerMet,
        warmth: Math.min(w, PROGRESSION_RULES.WHISPER_WARMTH_GATE),
        warmthNeed: PROGRESSION_RULES.WHISPER_WARMTH_GATE,
        trained: Math.min(l.trainedTotal, PROGRESSION_RULES.WHISPER_TRAINER_GATE),
        trainedNeed: PROGRESSION_RULES.WHISPER_TRAINER_GATE,
        sprouted: l.whispersSent > 0,
        whispersSent: l.whispersSent,
        whisperAcks: l.whisperAcks,
        live: isWhisperLive()
    };
}

// Оранжерея (Гербарий всех 7 видов после расцвета родного растения — удержание на год+)
function loadGreenhouse() {
    let g = {};
    try { g = JSON.parse(lsGet('soma_greenhouse') || '{}') || {}; } catch (_) { g = {}; }
    const bloomed = Array.isArray(g.bloomed)
        ? [...new Set(g.bloomed.map(Number).filter(k => Number.isInteger(k) && k >= 0 && k < PLANT_KINDS.length))]
        : [];
    const seed = (g.activeSeed && Number.isInteger(g.activeSeed.kind) && g.activeSeed.kind >= 0 && g.activeSeed.kind < PLANT_KINDS.length)
        ? { kind: g.activeSeed.kind, startWarmth: Math.max(0, Number(g.activeSeed.startWarmth) || 0) }
        : null;
    const placed = (Number.isInteger(g.placed) && g.placed >= 0 && g.placed < PLANT_KINDS.length)
        ? g.placed
        : (g.placed === 'seed' ? 'seed' : null);
    return { bloomed, activeSeed: seed, placed };
}

function saveGreenhouse(gh) {
    lsSet('soma_greenhouse', JSON.stringify(gh));
}

function plantNewGreenhouseSeed(currentWarmth, ownSpec) {
    const own = ownSpec || plantSpec();
    const w = Math.max(0, Number(currentWarmth) ?? ((typeof player !== 'undefined' && player.warmth) || 0));
    const gh = loadGreenhouse();
    if (!gh.bloomed.includes(own.kind)) return null;
    if (gh.activeSeed) {
        gh.placed = 'seed';
        saveGreenhouse(gh);
        renderRoom();
        return gh.activeSeed;
    }
    const remaining = PLANT_KINDS.map((_, i) => i).filter(i => !gh.bloomed.includes(i));
    if (!remaining.length) return null;
    const pickIdx = hashStr(`${own.seed}:${gh.bloomed.length}:${w}`) % remaining.length;
    gh.activeSeed = { kind: remaining[pickIdx], startWarmth: w };
    gh.placed = 'seed';
    saveGreenhouse(gh);
    roomAnim.customEntry = EMPTY_POT_LINES.seed[0];
    roomAnim.customMode = 'ЖУРНАЛ // ОРАНЖЕРЕЯ';
    animatePlantShift();
    playObjectTone('plant');
    renderRoom();
    return gh.activeSeed;
}

function selectGreenhouseSlot(slot) {
    const gh = loadGreenhouse();
    if (slot === 'seed' && gh.activeSeed) {
        gh.placed = 'seed';
    } else {
        const k = Math.trunc(Number(slot));
        if (!gh.bloomed.includes(k)) return;
        gh.placed = k;
    }
    saveGreenhouse(gh);
    roomAnim.customEntry = '';
    roomAnim.customMode = '';
    animatePlantShift();
    playObjectTone('plant');
    renderRoom();
}

// Кассетный архив входящих «Шёпотов» в старом магнитофоне
function loadCassettes() {
    let list = [];
    try { list = JSON.parse(lsGet('soma_cassettes') || '[]'); } catch (_) { list = []; }
    if (!Array.isArray(list)) return [];
    return list.filter(c => c && typeof c.text === 'string' && c.text.trim()).slice(0, 30);
}

function saveWhisperCassette(text, dateLabel) {
    const clean = String(text || '').trim().slice(0, 320);
    if (!clean) return null;
    const list = loadCassettes();
    const d = new Date();
    const stamp = dateLabel || `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
    const item = { id: 'cas_' + Date.now(), date: stamp, text: clean };
    list.unshift(item);
    lsSet('soma_cassettes', JSON.stringify(list.slice(0, 30)));
    return item;
}

function playCassette(id) {
    const list = loadCassettes();
    const found = list.find(c => c.id === id) || list[0];
    if (!found) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    roomAnim.activeCassetteId = found.id;
    roomAnim.contextPanel = 'deck';
    if ((now - roomAnim.deckStart) > 2850) {
        roomAnim.deckStart = now;
        playObjectTone('shelf');
    } else if (typeof SFX !== 'undefined' && SFX.tap) {
        SFX.tap();
    }
    const idx = list.length - list.indexOf(found);
    roomAnim.customMode = `КАССЕТА #${String(idx).padStart(2, '0')} · ${found.date}`;
    roomAnim.customEntry = `«${found.text}»`;
    renderRoom();
}

function togglePtsDemoCassette() {
    const list = loadCassettes();
    const hasDemo = list.some(c => c.id === 'cas_pts_demo');
    if (hasDemo) {
        const filtered = list.filter(c => c.id !== 'cas_pts_demo');
        lsSet('soma_cassettes', JSON.stringify(filtered));
        roomAnim.activeCassetteId = '';
        roomAnim.customEntry = 'Тестовая кассета извлечена из деки.';
    } else {
        const next = [{
            id: 'cas_pts_demo',
            date: '18.11',
            text: 'Я прочитал твою запись до конца и просто посидел рядом в тишине. Тебе не нужно справляться с этим в одиночку сегодня.'
        }, ...list];
        lsSet('soma_cassettes', JSON.stringify(next));
        roomAnim.activeCassetteId = 'cas_pts_demo';
        roomAnim.contextPanel = 'deck';
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        roomAnim.deckStart = now;
        playObjectTone('shelf');
        roomAnim.customMode = 'КАССЕТА #01 · 18.11';
        roomAnim.customEntry = `«${next[0].text}»`;
    }
    renderRoom();
}

// Возвращает эталонный экземпляр любого из 7 видов для режима осмотра (не меняя личный ID игрока)
function gallerySpecForKind(kind, ownSpec) {
    if (ownSpec && ownSpec.kind === kind) return ownSpec;
    const base = ownSpec ? ownSpec.seed : 42;
    return {
        kind,
        kindName: PLANT_KINDS[kind],
        leafIdx: kind % PLANT_LEAF.length,
        leaf: PLANT_LEAF[kind % PLANT_LEAF.length],
        bloomIdx: (kind + 1) % PLANT_BLOOM.length,
        bloom: PLANT_BLOOM[(kind + 1) % PLANT_BLOOM.length],
        potIdx: kind % PLANT_POTS.length,
        pot: PLANT_POTS[kind % PLANT_POTS.length],
        seed: (base ^ Math.imul(kind + 1, 2654435761)) >>> 0,
        lean: ((kind % 3) - 1) * 0.35,
        potShape: (kind === 2 || kind === 6) ? 1 : (kind === 3 ? 2 : 0)
    };
}

function prefersStillRoom() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (_) { return false; }
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smooth01(v) { const t = clamp01(v); return t * t * (3 - 2 * t); }
function easeOutCubic(v) { const t = clamp01(v); return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(v) { const t = clamp01(v); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function softBell(elapsed, riseMs, holdMs, fallMs) {
    if (elapsed <= 0) return 0;
    if (elapsed < riseMs) return 0.5 - 0.5 * Math.cos(Math.PI * (elapsed / riseMs));
    if (elapsed < riseMs + holdMs) {
        const h = (elapsed - riseMs) / Math.max(1, holdMs);
        return 0.95 + 0.05 * Math.sin(h * Math.PI);
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

function spawnPlantSpores(count, isPetals) {
    const n = count || 5;
    for (let i = 0; i < n; i++) {
        roomAnim.spores.push({
            x: 396 + (Math.random() - 0.5) * (40 + roomAnim.stage * 9),
            y: isPetals ? (345 - roomAnim.stage * 10 + Math.random() * 22) : (425 - roomAnim.stage * 15 - Math.random() * 16),
            vx: (Math.random() - 0.5) * 0.2 + (isPetals ? 0.1 : 0),
            vy: isPetals ? (0.22 + Math.random() * 0.2) : (-0.25 - Math.random() * 0.22),
            life: 1,
            petal: !!isPetals,
            phase: Math.random() * 6.28
        });
    }
    if (roomAnim.spores.length > 24) roomAnim.spores.splice(0, roomAnim.spores.length - 24);
}

// 1) Окна в домах NEEO_CITY, заря и дождь за круглым стеклом
function drawWindowWorld(g, now, phase, winGlow) {
    g.save();
    g.beginPath();
    g.ellipse(WIN_CX, WIN_CY, WIN_RX - 2, WIN_RY - 2, 0, 0, Math.PI * 2);
    g.clip();

    // На «Очаге» (phase=2) — тихое предрассветное тепло за горизонтом; на «Рассвете» (phase=3) — настоящий живой восход солнца!
    if (phase === 2) {
        const breathe = 0.5 + 0.5 * Math.sin(now * 0.00052);
        g.save();
        g.globalCompositeOperation = 'screen';
        const dg = g.createRadialGradient(419, 182, 6, 412, 178, 128);
        const a = 0.1 + breathe * 0.03;
        dg.addColorStop(0, `rgba(255,152,112,${a.toFixed(3)})`);
        dg.addColorStop(0.45, `rgba(224,52,68,${(a * 0.58).toFixed(3)})`);
        dg.addColorStop(1, 'rgba(90,8,20,0)');
        g.fillStyle = dg;
        g.fillRect(WIN_CX - WIN_RX, WIN_CY - WIN_RY, WIN_RX * 2, 200);
        g.restore();
    } else if (phase === 3) {
        const still = prefersStillRoom();
        const t = still ? 4.0 : now * 0.001;
        const breathe = still ? 0.5 : (0.5 + 0.5 * Math.sin(t * 0.55));
        const sunX = 419.5;
        const sunY = 176.5 + (still ? 0 : Math.sin(t * 0.35) * 1.1);

        // Точный попиксельный контур неба НАД крышами высоток NEEO_CITY (силуэты зданий остаются 100% чёткими!)
        const skyPoly = [
            [242, 126], [262, 126], [262, 118], [284, 118], [284, 128], [293, 128], [293, 182],
            [298, 182], [298, 143], [304, 134], [306, 120], [308, 134], [314, 143], [314, 174],
            [325, 174], [325, 165], [328, 165], [328, 145], [333, 145], [333, 121], [337, 114],
            [339, 98],  [341, 114], [345, 121], [346, 144], [351, 144], [351, 165], [356, 165],
            [356, 184], [360, 172], [364, 165], [368, 172], [373, 172], [373, 165], [379, 159],
            [381, 150], [383, 159], [389, 165], [389, 176], [394, 176], [394, 169], [399, 162],
            [401, 152], [403, 162], [411, 168], [411, 189],
            // Центральный каньон горизонта — прямо здесь встаёт живое утреннее солнце!
            [428, 189],
            [428, 173], [436, 170], [438, 162], [440, 170], [448, 173], [448, 188],
            [459, 188], [459, 161], [465, 161], [465, 150], [485, 150], [485, 159], [491, 159],
            // Просвет со строительным краном справа
            [491, 181], [517, 181],
            [517, 128], [522, 128], [522, 102], [530, 92], [530, 82], [566, 82]
        ];

        // 1) ЖИВОЕ РАССВЕТНОЕ НЕБО строго ЗА силуэтами небоскрёбов (ни грамма мыла поверх домов!)
        g.save();
        g.beginPath();
        g.moveTo(242, 22);
        g.lineTo(566, 22);
        for (let i = skyPoly.length - 1; i >= 0; i--) g.lineTo(skyPoly[i][0], skyPoly[i][1]);
        g.closePath();
        g.clip();

        // Многослойный живописный градиент настоящего рассвета: от бархатного винного зенита к расплавленному золоту у горизонта
        if (g.createLinearGradient) {
            const sk = g.createLinearGradient(0, 26, 0, 191);
            sk.addColorStop(0.00, 'rgba(42, 8, 22, 0.88)');
            sk.addColorStop(0.26, 'rgba(98, 20, 42, 0.88)');
            sk.addColorStop(0.50, 'rgba(176, 44, 62, 0.90)');
            sk.addColorStop(0.70, 'rgba(232, 92, 72, 0.92)');
            sk.addColorStop(0.86, 'rgba(255, 162, 88, 0.94)');
            sk.addColorStop(1.00, 'rgba(255, 228, 148, 0.96)');
            g.fillStyle = sk;
        } else g.fillStyle = '#d85c4c';
        g.fillRect(242, 22, 324, 172);

        // Широкий золотисто-персиковый купол солнечной короны за центральными башнями
        if (g.createRadialGradient) {
            const halo = g.createRadialGradient(sunX, sunY + 4, 4, sunX, sunY - 6, 132);
            halo.addColorStop(0.00, `rgba(255, 248, 206, ${(0.88 + breathe * 0.08 + winGlow * 0.04).toFixed(3)})`);
            halo.addColorStop(0.18, `rgba(255, 204, 118, ${(0.62 + breathe * 0.08).toFixed(3)})`);
            halo.addColorStop(0.48, 'rgba(255, 118, 82, 0.28)');
            halo.addColorStop(1.00, 'rgba(160, 28, 52, 0)');
            g.fillStyle = halo;
            g.fillRect(242, 22, 324, 172);
        }

        // Веер мягких растушёванных небесных лучей, расходящихся ВВЕРХ от восходящего солнца
        g.save();
        g.globalCompositeOperation = 'screen';
        const skyRays = [-1.15, -0.76, -0.40, -0.06, 0.28, 0.64, 1.04];
        for (let r = 0; r < skyRays.length; r++) {
            const ang = -Math.PI * 0.5 + skyRays[r] + (still ? 0 : Math.sin(t * 0.24 + r * 1.3) * 0.024);
            const ra = (0.09 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.48 + r * 1.7))) * (1 + winGlow * 0.25);
            g.save();
            g.translate(sunX, sunY);
            g.rotate(ang);
            g.scale(1, 0.13);
            if (g.createRadialGradient) {
                const rg = g.createRadialGradient(52, 0, 4, 68, 0, 108);
                rg.addColorStop(0, `rgba(255, 232, 162, ${ra.toFixed(3)})`);
                rg.addColorStop(0.55, `rgba(255, 152, 102, ${(ra * 0.42).toFixed(3)})`);
                rg.addColorStop(1, 'rgba(255, 110, 90, 0)');
                g.fillStyle = rg;
                g.beginPath(); g.arc(68, 0, 108, 0, Math.PI * 2); g.fill();
            }
            g.restore();
        }
        g.restore();

        // Живописные перистые облака рассвета (мягкие многослойные мазки с тёплым золотым подсветом снизу — без жёстких краёв!)
        const drawDawnCloud = (cx, cy, w, h, topCol, glowCol, puffs) => {
            if (!g.createRadialGradient) return;
            // 1. Тёплое золотисто-коралловое свечение по нижней кромке облачной гряды
            g.save();
            g.translate(cx, cy + h * 0.48);
            g.scale(1, h / w);
            const ug = g.createRadialGradient(0, 0, w * 0.08, 0, 0, w * 1.05);
            ug.addColorStop(0, glowCol);
            ug.addColorStop(0.58, glowCol.replace(/[\d.]+\)$/, m => (parseFloat(m) * 0.48).toFixed(3) + ')'));
            ug.addColorStop(1, 'rgba(255, 160, 110, 0)');
            g.fillStyle = ug;
            g.beginPath(); g.arc(0, 0, w * 1.05, 0, Math.PI * 2); g.fill();
            g.restore();
            // 2. Мягкие клубящиеся винно-лиловые пряди облака сверху
            for (let p = 0; p < puffs.length; p++) {
                const [ox, oy, rw, rh] = puffs[p];
                g.save();
                g.translate(cx + ox * w, cy + oy * h);
                g.scale(1, (h * rh) / (w * rw));
                const pg = g.createRadialGradient(0, 0, 0, 0, 0, w * rw);
                pg.addColorStop(0, topCol);
                pg.addColorStop(0.55, topCol.replace(/[\d.]+\)$/, m => (parseFloat(m) * 0.55).toFixed(3) + ')'));
                pg.addColorStop(1, 'rgba(60, 12, 28, 0)');
                g.fillStyle = pg;
                g.beginPath(); g.arc(0, 0, w * rw, 0, Math.PI * 2); g.fill();
                g.restore();
            }
        };
        const d1 = still ? 0 : Math.sin(t * 0.045) * 11;
        const d2 = still ? 0 : Math.cos(t * 0.038 + 1.1) * 9;
        const d3 = still ? 0 : Math.sin(t * 0.032 + 2.4) * 8;
        drawDawnCloud(374 + d1, 68, 62, 7.5, 'rgba(58, 11, 28, 0.52)', 'rgba(255, 152, 118, 0.36)',
            [[-0.38, 0.1, 0.52, 0.85], [0.02, -0.18, 0.64, 1.1], [0.42, 0.14, 0.46, 0.78]]);
        drawDawnCloud(458 - d2, 95, 52, 6.2, 'rgba(84, 16, 36, 0.46)', 'rgba(255, 186, 126, 0.44)',
            [[-0.32, 0.08, 0.55, 0.9], [0.15, -0.16, 0.58, 1.05], [0.48, 0.18, 0.38, 0.7]]);
        drawDawnCloud(308 + d3, 92, 44, 5.5, 'rgba(78, 15, 34, 0.44)', 'rgba(255, 172, 122, 0.38)',
            [[-0.25, 0.05, 0.55, 0.9], [0.22, -0.12, 0.52, 0.95]]);
        drawDawnCloud(416 + d2 * 0.7, 126, 68, 5.2, 'rgba(124, 28, 44, 0.36)', 'rgba(255, 218, 142, 0.52)',
            [[-0.42, 0.1, 0.48, 0.8], [-0.04, -0.14, 0.58, 0.95], [0.38, 0.08, 0.46, 0.78]]);
        drawDawnCloud(472 - d1 * 0.6, 143, 38, 3.8, 'rgba(148, 42, 50, 0.28)', 'rgba(255, 232, 158, 0.55)',
            [[-0.22, 0, 0.56, 0.85], [0.26, -0.1, 0.48, 0.8]]);

        // НАСТОЯЩИЙ ДИСК ВОСХОДЯЩЕГО СОЛНЦА в каньоне между центральными башнями (419.5, 176.5)
        if (g.createRadialGradient) {
            const corona = g.createRadialGradient(sunX, sunY, 4, sunX, sunY, 30);
            corona.addColorStop(0, 'rgba(255, 252, 226, 0.96)');
            corona.addColorStop(0.36, `rgba(255, 216, 126, ${(0.72 + breathe * 0.12).toFixed(3)})`);
            corona.addColorStop(0.72, 'rgba(255, 156, 86, 0.28)');
            corona.addColorStop(1, 'rgba(255, 130, 74, 0)');
            g.fillStyle = corona;
            g.beginPath(); g.arc(sunX, sunY, 30, 0, Math.PI * 2); g.fill();

            const disc = g.createRadialGradient(sunX, sunY - 1.2, 1, sunX, sunY, 8.2);
            disc.addColorStop(0, '#fffef6');
            disc.addColorStop(0.68, '#fff1c2');
            disc.addColorStop(1, 'rgba(255, 208, 114, 0.72)');
            g.fillStyle = disc;
        } else g.fillStyle = '#fff6d4';
        g.beginPath(); g.arc(sunX, sunY, 8.0, 0, Math.PI * 2); g.fill();

        // Тонкий реалистичный силуэт башенного крана и шпилей небоскрёбов на фоне золотого неба
        g.strokeStyle = 'rgba(46, 9, 18, 0.82)';
        g.lineWidth = 0.95;
        g.beginPath();
        // Вертикальная мачта башенного крана и горизонтальная стрела (как в оригинальном арте x=502, y=162)
        g.moveTo(502.5, 181); g.lineTo(502.5, 152);
        g.moveTo(494.5, 161.5); g.lineTo(515.5, 161.5);
        // Пологие ванты стрелы
        g.lineWidth = 0.55;
        g.moveTo(502.5, 153); g.lineTo(512.5, 161.5);
        g.moveTo(502.5, 153); g.lineTo(496.5, 161.5);
        g.moveTo(512.5, 161.5); g.lineTo(512.5, 170);
        // Изящные громоотводы на вершинах шпилей
        g.lineWidth = 0.85;
        g.moveTo(339, 99);  g.lineTo(339, 89);
        g.moveTo(306, 121); g.lineTo(306, 113);
        g.moveTo(381, 151); g.lineTo(381, 144);
        g.moveTo(401, 153); g.lineTo(401, 145);
        g.stroke();
        // Противовес и кабина крана
        g.fillStyle = 'rgba(46, 9, 18, 0.85)';
        g.fillRect(495, 161.5, 2.8, 1.8);
        g.fillRect(501.3, 161.5, 2.4, 2.4);

        // Три крошечные утренние птицы, неспешно парящие в золотом небе рассвета
        const birdPeriod = 18;
        const bt = still ? 0.42 : ((t % birdPeriod) / birdPeriod);
        if (bt < 0.85) {
            const bp = bt / 0.85;
            const bx0 = 335 + bp * 155;
            const by0 = 104 - Math.sin(bp * Math.PI) * 18;
            g.strokeStyle = 'rgba(54, 10, 20, 0.72)';
            g.lineWidth = 0.85;
            g.lineCap = 'round';
            for (let b = 0; b < 3; b++) {
                const bx = bx0 - b * 8.5, by = by0 + (b === 1 ? -4.2 : b * 2.6);
                const flap = still ? 1.0 : Math.sin(t * 5.8 + b * 1.7) * 1.3;
                g.beginPath();
                g.moveTo(bx - 2.2, by - flap);
                g.quadraticCurveTo(bx - 0.7, by - 0.7, bx, by);
                g.quadraticCurveTo(bx + 0.7, by - 0.7, bx + 2.2, by - flap);
                g.stroke();
            }
        }
        g.restore();

        // 2) ЗОЛОТОЙ КОНТРОВОЙ СВЕТ ПО ГРАНЯМ НЕБОСКРЁБОВ (яркое золото возле солнца, мягкая медь к краям окна!)
        g.save();
        g.lineCap = 'round';
        g.lineJoin = 'round';
        if (g.createRadialGradient) {
            const rimGrad = g.createRadialGradient(sunX, sunY, 6, sunX, sunY, 155);
            rimGrad.addColorStop(0.00, `rgba(255, 244, 192, ${(0.92 + breathe * 0.08).toFixed(3)})`);
            rimGrad.addColorStop(0.38, `rgba(255, 202, 122, ${(0.68 + breathe * 0.1).toFixed(3)})`);
            rimGrad.addColorStop(0.75, 'rgba(238, 118, 92, 0.36)');
            rimGrad.addColorStop(1.00, 'rgba(180, 58, 66, 0.14)');
            g.strokeStyle = rimGrad;
        } else {
            g.strokeStyle = 'rgba(255, 202, 124, 0.55)';
        }
        g.lineWidth = 1.05;
        g.beginPath();
        for (let i = 0; i < skyPoly.length; i++) {
            const [px, py] = skyPoly[i];
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.stroke();

        // Мягкий солнечный ореол, переливающийся через край каньона (даёт живой оптический «bloom» настоящего солнца!)
        g.save();
        g.globalCompositeOperation = 'screen';
        radialAura(g, sunX, sunY + 3, 38, '#ffe29c', '#e05848', 0.24 + breathe * 0.06);
        g.restore();

        // Яркие солнечные блики на внутренних вертикальных стенах башен, обращённых прямо к солнцу!
        const litEdges = [
            // Правые грани левых башен (смотрят вправо на солнце)
            [293, 129, 293, 212, 0.42],
            [314, 143, 314, 198, 0.46],
            [345.5, 121, 345.5, 144, 0.62],
            [351, 144, 351, 165, 0.64],
            [356, 165, 356, 220, 0.68],
            [389, 165, 389, 214, 0.62],
            [411, 168, 411, 218, 0.88], // левая стена солнечного каньона!
            // Левые грани правых башен (смотрят влево на солнце)
            [428, 173, 428, 218, 0.88], // правая стена солнечного каньона!
            [459, 161, 459, 224, 0.72],
            [465, 150, 465, 161, 0.65],
            [517, 128, 517, 232, 0.56],
            [522, 102, 522, 128, 0.50],
            // Коньки ближних крыш внизу окна
            [342, 250, 382, 250, 0.42],
            [412, 252, 462, 250, 0.45]
        ];
        for (let e = 0; e < litEdges.length; e++) {
            const [x1, y1, x2, y2, al] = litEdges[e];
            g.strokeStyle = `rgba(255, 212, 132, ${al.toFixed(3)})`;
            g.lineWidth = (x1 === 411 || x1 === 428) ? 1.35 : 1.0;
            g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        }

        // 3) ЧЁТКИЙ АРХИТЕКТУРНЫЙ КАМЕННЫЙ ВИАДУК И БЛЕСТЯЩИЕ НА СОЛНЦЕ РЕЛЬСЫ (x=355..459, y=221.5..246)
        // Лёгкая золотистая утренняя дымка ТОЛЬКО в проёмах трёх арок под мостом
        const arches = [[374, 9.0], [404, 13.5], [436, 11.5]];
        for (let a = 0; a < arches.length; a++) {
            const [ax, arw] = arches[a];
            radialAura(g, ax, 235, arw * 1.25, '#ffc478', '#b83244', 0.22);
            // Тёплый золотой блик по внутреннему своду каменной арки
            g.strokeStyle = 'rgba(255, 192, 122, 0.52)';
            g.lineWidth = 0.95;
            g.beginPath();
            g.ellipse(ax, 236, arw, 7.2, 0, Math.PI * 1.08, Math.PI * 1.92);
            g.stroke();
        }
        // Тёмная чёткая стальная балка полотна моста и каменные опоры (чтобы поезд ВСЕГДА шёл по реальному мосту!)
        g.fillStyle = 'rgba(28, 5, 10, 0.88)';
        g.fillRect(355, 222.2, 104, 3.4);
        const piers = [360, 385, 419, 449];
        for (let p = 0; p < piers.length; p++) {
            g.fillRect(piers[p], 225.4, 4.4, 19);
            // Солнечная кромка на грани каждой каменной опоры, обращённой к солнцу
            const edgeX = piers[p] < sunX ? piers[p] + 4.4 : piers[p];
            g.fillStyle = 'rgba(255, 196, 124, 0.42)';
            g.fillRect(edgeX, 225.6, 0.85, 17);
            g.fillStyle = 'rgba(28, 5, 10, 0.88)';
        }
        // Непрерывная сияющая золотом линия стальных рельсов и балюстрады виадука!
        g.strokeStyle = 'rgba(255, 224, 148, 0.82)';
        g.lineWidth = 1.05;
        g.beginPath(); g.moveTo(355, 222.0); g.lineTo(459, 222.0); g.stroke();
        // Ажурные перила и шпалы виадука
        g.fillStyle = 'rgba(255, 198, 126, 0.48)';
        for (let rx = 357; rx < 458; rx += 4) {
            g.fillRect(rx, 220.9, 0.8, 1.1);
        }
        g.restore();
    }

    // Естественная плавная жизнь окон в домах (только по точным контурам окон, сохраняя их переплёты)
    for (let i = 0; i < CITY_WINDOWS.length; i++) {
        const [wx, wy, ww, wh] = CITY_WINDOWS[i];
        const rate = 0.00024 + (i % 9) * 0.000065;
        const ph = i * 2.39996 + (i % 5) * 0.7;
        const mood = Math.sin(now * rate + ph) * 0.65 + Math.sin(now * rate * 0.41 - ph * 0.6) * 0.35;

        if (mood < -0.25) {
            // Мягкое приглушение света в окне (без грубых чёрных пятен)
            const dim = smooth01((-mood - 0.25) / 0.65) * 0.68;
            g.fillStyle = `rgba(20,4,7,${dim.toFixed(3)})`;
            g.fillRect(wx, wy, ww, wh);
        } else if (mood > 0.22) {
            // Мягкое тёплое разгорание окна изнутри
            const glow = smooth01((mood - 0.22) / 0.68) * (0.42 + (phase === 3 ? 0.14 : 0.08));
            const cx = wx + ww * 0.5, cy = wy + wh * 0.5;
            radialAura(g, cx, cy, Math.max(ww, wh) * 1.4, '#ff9892', '#c8283e', glow * 0.55);
            g.fillStyle = `rgba(255,186,168,${(glow * 0.55).toFixed(3)})`;
            g.fillRect(wx + 0.3, wy + 0.3, Math.max(1, ww - 0.6), Math.max(1, wh - 0.6));
        }
    }

    // Тёплые огни моста и неспешные сигнальные маячки на крышах высоток
    for (let b = 0; b < BRIDGE_LIGHTS.length; b++) {
        const a = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(now * 0.00095 + b * 0.9));
        g.fillStyle = `rgba(255,164,154,${a.toFixed(3)})`;
        g.fillRect(BRIDGE_LIGHTS[b] - 0.8, 232, 1.6, 1.4);
    }
    CITY_BEACONS.forEach(bc => {
        const p = Math.pow(0.5 + 0.5 * Math.sin(now * bc.speed + bc.phase), 2.4);
        if (p > 0.1) {
            radialAura(g, bc.x, bc.y, bc.r * 3, '#ff6274', '#9e1428', p * 0.32);
            g.fillStyle = `rgba(255,204,208,${(p * 0.72).toFixed(3)})`;
            g.beginPath(); g.arc(bc.x, bc.y, bc.r * 0.45, 0, Math.PI * 2); g.fill();
        }
    });

    // Атрибут «Ночной экспресс»: светящийся ночной поезд плавно идёт по арочному мосту за окном (x=356..458, y=218..222)
    const winCosm = getRoomCosmeticsSafe();
    if (winCosm.tape) {
        const still = prefersStillRoom();
        // Цикл 11.5 с: 8.2 с плавный проход по мосту + 3.3 с уютная пауза, чередуя направления
        const period = 11500;
        const phaseT = still ? 0.44 : ((now % period) / period);
        const runPart = 0.76;
        if (phaseT < runPart) {
            const prog = phaseT / runPart;
            const passIdx = still ? 0 : Math.floor(now / period);
            const dir = (passIdx % 2 === 0) ? 1 : -1;
            const cars = 6, carW = 8.4, gap = 1.4, totalLen = cars * (carW + gap);
            const trackL = 355, trackR = 459, railY = 221.6;
            const headX = dir > 0
                ? (trackL - 4 + prog * (trackR - trackL + totalLen + 14))
                : (trackR + 4 - prog * (trackR - trackL + totalLen + 14));

            g.save();
            // Строго обрезаем по пролёту виадука между двумя силуэтами высоток
            g.beginPath();
            g.rect(trackL, 206, trackR - trackL, 32);
            g.clip();

            // Мягкое тёплое зарево от окон вагонов на каменных арках моста
            g.save();
            g.globalCompositeOperation = 'screen';
            const midTrain = headX - dir * totalLen * 0.5;
            radialAura(g, midTrain, railY + 2, 34, '#ffbe66', '#b82838', 0.24);

            // Тёплый конус головного прожектора локомотива
            const beamLen = 24;
            const bg = g.createLinearGradient(headX, railY - 2, headX + dir * beamLen, railY - 2);
            bg.addColorStop(0, 'rgba(255, 236, 172, 0.65)');
            bg.addColorStop(0.45, 'rgba(255, 178, 92, 0.26)');
            bg.addColorStop(1, 'rgba(255, 120, 68, 0)');
            g.fillStyle = bg;
            g.beginPath();
            g.moveTo(headX, railY - 2.6);
            g.lineTo(headX + dir * beamLen, railY - 6.2);
            g.lineTo(headX + dir * beamLen, railY + 1.2);
            g.lineTo(headX, railY - 0.6);
            g.closePath();
            g.fill();
            g.restore();

            // Тонкий стальной отблеск рельсов и парапета моста под поездом в ночных фазах
            if (phase < 3) {
                g.fillStyle = 'rgba(26, 5, 10, 0.72)';
                g.fillRect(trackL, railY + 0.5, trackR - trackL, 2.2);
                g.fillStyle = 'rgba(255, 152, 118, 0.34)';
                g.fillRect(trackL, railY + 0.2, trackR - trackL, 0.65);
            }

            // Силуэты вагонов с золотисто-янтарными купейными окнами
            for (let c = 0; c < cars; c++) {
                const front = headX - dir * c * (carW + gap);
                const cx0 = dir > 0 ? front - carW : front;
                const cy0 = railY - 3.6;
                // Тёмно-бордовый корпус вагона с ярким золотым солнечным бликом крыши на «Рассвете»
                g.fillStyle = phase === 3 ? '#1e0409' : '#26070d';
                g.fillRect(cx0, cy0, carW, 3.3);
                g.fillStyle = phase === 3 ? 'rgba(255, 224, 146, 0.85)' : 'rgba(255, 146, 122, 0.42)';
                g.fillRect(cx0 + 0.3, cy0, carW - 0.6, phase === 3 ? 0.75 : 0.6);
                // Светящиеся тёплые окна ночных купе (по 3 на вагон)
                for (let w = 0; w < 3; w++) {
                    const wx = cx0 + 1.0 + w * 2.3;
                    const warm = ((c * 3 + w) % 4 === 0) ? '#ffa26b' : '#ffe08c';
                    g.fillStyle = warm;
                    g.fillRect(wx, cy0 + 0.9, 1.55, 1.35);
                }
                // Тёплый отблеск внизу на опорах моста
                g.fillStyle = 'rgba(255, 194, 98, 0.16)';
                g.fillRect(cx0 + 1, railY + 1.5, carW - 2, 2.2);
            }

            // Яркая фара спереди и рубиновый хвостовой фонарь последнего вагона
            g.fillStyle = '#fff6cf';
            g.beginPath(); g.arc(headX, railY - 1.8, 1.2, 0, Math.PI * 2); g.fill();
            const tailX = headX - dir * (totalLen - gap);
            g.fillStyle = '#ff3b54';
            g.beginPath(); g.arc(tailX, railY - 1.9, 1.05, 0, Math.PI * 2); g.fill();

            // Редкая живая искра пантографа на контактном проводе
            if (!still && Math.sin(now * 0.019) > 0.965) {
                const spX = headX - dir * (carW * 1.4);
                radialAura(g, spX, railY - 4.4, 5.5, '#fff4d2', '#ff8c52', 0.65);
            }
            g.restore();
        }
    }

    // Живой дождь и капли по стеклу (только фазы 0..2; на «Рассвете» дождя нет)
    if (phase < 3) {
        const streakCount = [42, 22, 9, 0][phase];
        g.lineCap = 'round';
        for (let i = 0; i < streakCount; i++) {
            const d = FX_RAIN[i];
            const al = d.alpha * (phase === 0 ? 0.95 : phase === 1 ? 0.72 : 0.48);
            g.strokeStyle = d.near ? `rgba(255,146,158,${al.toFixed(3)})` : `rgba(218,58,78,${al.toFixed(3)})`;
            g.lineWidth = d.near ? 1.1 : 0.75;
            g.beginPath();
            g.moveTo(d.x, d.y);
            g.lineTo(d.x - d.len * 0.08, d.y + d.len);
            g.stroke();
        }
        const dropCount = [15, 10, 5, 0][phase];
        for (let i = 0; i < dropCount; i++) {
            const dr = FX_DROPS[i];
            if (!insideWindow(dr.x, dr.y, 6)) continue;
            const tg = g.createLinearGradient(dr.x, dr.y - dr.trail, dr.x, dr.y);
            tg.addColorStop(0, 'rgba(255,112,128,0)');
            tg.addColorStop(1, 'rgba(255,132,146,0.24)');
            g.strokeStyle = tg;
            g.lineWidth = 1.0;
            g.beginPath(); g.moveTo(dr.x, dr.y - dr.trail); g.lineTo(dr.x, dr.y); g.stroke();
            g.fillStyle = 'rgba(255,190,198,0.65)';
            g.beginPath(); g.ellipse(dr.x, dr.y, 1.1, 1.6, 0, 0, Math.PI * 2); g.fill();
        }
    }

    // Едва заметная мягкая рябь влаги по стеклу при касании окна
    for (let i = 0; i < roomAnim.ripples.length; i++) {
        const rp = roomAnim.ripples[i];
        const rad = 4 + rp.maxR * easeOutCubic(1 - rp.life);
        const alpha = Math.sin(rp.life * Math.PI) * 0.22;
        g.strokeStyle = `rgba(255,172,180,${alpha.toFixed(3)})`;
        g.lineWidth = 1.0;
        g.beginPath(); g.arc(rp.x, rp.y, rad, 0, Math.PI * 2); g.stroke();
    }

    g.restore();
}

// 2) Кинематографичный объёмный утренний свет ИЗ круглого окна в комнату (не замутняя силуэты города и моста!)
function drawWindowLightBeams(g, now, phase, winGlow) {
    if (phase < 2) return;
    const isMax = phase === 3;
    const still = prefersStillRoom();
    const strength = (isMax ? 1 : 0.24) + winGlow * 0.15;
    const b1 = still ? 0.55 : (0.5 + 0.5 * Math.sin(now * 0.00058));
    const b2 = still ? 0.5 : (0.5 + 0.5 * Math.sin(now * 0.00039 + 1.8));
    const sway = still ? 0 : Math.sin(now * 0.00032) * 8;
    const sunX = 419.5, sunY = 176.5;

    g.save();
    g.globalCompositeOperation = 'screen';

    // 1. Плавный золотисто-коралловый блик утреннего солнца по нижнему каменному своду окна (мягко сходит на нет к краям!)
    const rimA = (isMax ? (0.44 + b1 * 0.12) : (0.16 + b1 * 0.06)) * Math.min(1.2, strength);
    g.lineCap = 'round';
    if (g.createLinearGradient) {
        const sg = g.createLinearGradient(WIN_CX - WIN_RX * 0.88, 0, WIN_CX + WIN_RX * 0.88, 0);
        sg.addColorStop(0.00, 'rgba(255, 160, 110, 0)');
        sg.addColorStop(0.25, isMax ? `rgba(255, 186, 122, ${(rimA * 0.62).toFixed(3)})` : `rgba(255, 128, 126, ${(rimA * 0.6).toFixed(3)})`);
        sg.addColorStop(0.52, isMax ? `rgba(255, 228, 164, ${rimA.toFixed(3)})` : `rgba(255, 146, 140, ${rimA.toFixed(3)})`);
        sg.addColorStop(0.78, isMax ? `rgba(255, 186, 122, ${(rimA * 0.62).toFixed(3)})` : `rgba(255, 128, 126, ${(rimA * 0.6).toFixed(3)})`);
        sg.addColorStop(1.00, 'rgba(255, 160, 110, 0)');
        g.strokeStyle = sg;
    } else g.strokeStyle = `rgba(255, 198, 132, ${rimA.toFixed(3)})`;
    g.lineWidth = isMax ? 3.0 : 2.2;
    g.beginPath();
    g.ellipse(WIN_CX, WIN_CY + 1, WIN_RX + 1.5, WIN_RY + 1.5, 0, Math.PI * 0.14, Math.PI * 0.86);
    g.stroke();

    // 2. Бархатные объёмные солнечные лучи (с мягкими растушёванными краями без резких граней!),
    //    льющиеся из окна на растение, ковёр, край стола и кушетку, НЕ размывая здания и рельсы за окном!
    const shafts = [
        { ang: -0.54, spread: 0.14, cy: 232, r: 156, w: 0.92 }, // золотой луч на стол с горячим чаем
        { ang: -0.30, spread: 0.15, cy: 228, r: 158, w: 1.15 }, // левый луч на свечи и ковёр
        { ang: -0.09, spread: 0.16, cy: 224, r: 162, w: 1.48 }, // яркий утренний сноп прямо на цветок и сосуд
        { ang:  0.10, spread: 0.16, cy: 224, r: 162, w: 1.42 }, // центральный золотой сноп на персидский ковёр
        { ang:  0.31, spread: 0.15, cy: 228, r: 158, w: 1.12 }, // правый луч на ковёр и свечи
        { ang:  0.54, spread: 0.14, cy: 234, r: 158, w: 0.96 }  // тёплый солнечный луч на кушетку и спящего кота
    ];
    for (let idx = 0; idx < shafts.length; idx++) {
        const sh = shafts[idx];
        const drift = still ? 0 : Math.sin(now * (0.00034 + idx * 0.00005) + idx * 1.5) * 0.024;
        const pulse = still ? 0.6 : (0.5 + 0.5 * Math.sin(now * (0.00052 + idx * 0.00007) + idx * 1.2));
        const roomA = (isMax ? (0.135 + pulse * 0.062) : (0.095 + pulse * 0.048)) * sh.w * strength;
        g.save();
        g.translate(sunX, sunY);
        g.rotate(sh.ang + drift);
        g.scale(sh.spread, 1);
        if (g.createRadialGradient) {
            const rg = g.createRadialGradient(0, sh.cy - 22, 6, 0, sh.cy, sh.r);
            rg.addColorStop(0.00, isMax
                ? `rgba(255, 214, 142, ${roomA.toFixed(3)})`
                : `rgba(255, 132, 122, ${roomA.toFixed(3)})`);
            rg.addColorStop(0.50, isMax
                ? `rgba(250, 122, 90, ${(roomA * 0.58).toFixed(3)})`
                : `rgba(222, 48, 66, ${(roomA * 0.5).toFixed(3)})`);
            rg.addColorStop(1.00, 'rgba(150, 18, 34, 0)');
            g.fillStyle = rg;
            g.beginPath(); g.arc(0, sh.cy, sh.r, 0, Math.PI * 2); g.fill();
        }
        g.restore();
    }

    // 3. Живое тёплое пятно утреннего солнца, разливающееся по персидскому ковру, кушетке и краю стола!
    if (isMax) {
        g.save();
        g.translate(WIN_CX - 3 + sway * 0.5, 420);
        g.scale(1, 0.33);
        if (g.createRadialGradient) {
            const pg = g.createRadialGradient(0, -24, 14, 0, 0, 236);
            pg.addColorStop(0.00, `rgba(255, 206, 132, ${(0.32 + b2 * 0.075).toFixed(3)})`);
            pg.addColorStop(0.42, `rgba(250, 116, 88, ${(0.19 + b1 * 0.048).toFixed(3)})`);
            pg.addColorStop(0.76, `rgba(198, 38, 56, ${(0.085 + b1 * 0.02).toFixed(3)})`);
            pg.addColorStop(1.00, 'rgba(140, 14, 30, 0)');
            g.fillStyle = pg;
            g.beginPath(); g.arc(0, 0, 236, 0, Math.PI * 2); g.fill();
        }
        g.restore();

        // Тёплый утренний солнечный свет мягко касается кота на кушетке, радиополки и стола с чаем
        radialAura(g, 608, 336, 86, '#ffbe76', '#b8283e', 0.14 + b1 * 0.035);
        radialAura(g, 224, 294, 66, '#ffba74', '#b8283e', 0.12 + b2 * 0.03);
    }

    // 4. Золотистые утренние пылинки, неспешно танцующие в лучах солнца внутри комнаты
    const moteCnt = isMax ? FX_MOTES.length : 8;
    for (let i = 0; i < moteCnt; i++) {
        const m = FX_MOTES[i];
        const v = (m.v + (still ? 0 : now * m.speed)) % 1;
        const span = 78 + v * 145;
        const mx = WIN_CX + (m.u - 0.5) * span * 2 + (still ? 0 : Math.sin(now * 0.0005 + m.phase) * 7) + sway * v * 0.4;
        // Пылинки кружатся преимущественно в нижней половине окна и в самой комнате (y=235..458)
        const my = 232 + v * 228;
        const edgeFade = Math.sin(v * Math.PI) * (1 - Math.abs(m.u - 0.5) * 1.35);
        const tw = still ? 0.75 : (0.45 + 0.55 * Math.sin(now * 0.0014 + m.phase));
        const ma = Math.max(0, edgeFade * tw * (isMax ? 0.62 : 0.22));
        if (ma < 0.03) continue;
        g.fillStyle = isMax ? `rgba(255, 232, 174, ${ma.toFixed(3)})` : `rgba(255, 198, 190, ${ma.toFixed(3)})`;
        g.beginPath(); g.arc(mx, my, m.size * (isMax ? 1.12 : 1), 0, Math.PI * 2); g.fill();
    }
    g.restore();
}

// 3) Идеально чистое маятниковое качание отдельного слоя висячей лампы (#station-lamp) вокруг точки крепления на потолке
function updateSwingingLamp(g, now) {
    const lampEl = typeof document !== 'undefined' && document.getElementById('station-lamp');
    const elapsed = (now - roomAnim.lampStart) * 0.001;
    let angle = 0, env = 0;
    if (elapsed > 0 && elapsed < 5.4 && roomAnim.lampAmp > 0.001) {
        env = Math.exp(-elapsed * 0.78);
        angle = roomAnim.lampDir * roomAnim.lampAmp * env * Math.sin(elapsed * 4.2);
    }
    if (lampEl && lampEl.style) {
        if (Math.abs(angle) > 0.0004) {
            const deg = (angle * 180 / Math.PI).toFixed(3);
            lampEl.style.transform = `rotate(${deg}deg)`;
        } else if (lampEl.style.transform) {
            lampEl.style.transform = '';
        }
    }
    // Мягкий живой отсвет качнувшейся лампы на крышке терминала внизу
    const bulbX = 188 - Math.sin(angle) * 158;
    const bulbY = Math.cos(angle) * 158;
    g.save();
    g.globalCompositeOperation = 'screen';
    if (env > 0.02) {
        const softIn = smooth01(elapsed / 0.35) * env;
        radialAura(g, bulbX, bulbY, 34, '#ff8e8c', '#b81e36', softIn * 0.18);
        radialAura(g, 188 - Math.sin(angle) * 215, 224, 52, '#ff7280', '#8f1226', softIn * 0.14);
    }
    g.restore();
}

// 4) Оптическая плавная подсветка ночников (БЕЗ нарисованной второй решётки — светится родное стекло сквозь родные прутья!)
function updateNightlights(g, now) {
    const pL = softBell(now - roomAnim.nightLStart, 950, 800, 1750);
    const pR = softBell(now - roomAnim.nightRStart, 950, 800, 1750);

    const nlEl = typeof document !== 'undefined' && document.getElementById('station-nl');
    const nrEl = typeof document !== 'undefined' && document.getElementById('station-nr');
    if (nlEl && nlEl.style) nlEl.style.opacity = pL > 0.003 ? pL.toFixed(3) : '0';
    if (nrEl && nrEl.style) nrEl.style.opacity = pR > 0.003 ? pR.toFixed(3) : '0';

    // Нежный рассеянный отсвет на столешнице и складках пледа вокруг ночников
    if (pL > 0.01 || pR > 0.01) {
        g.save();
        g.globalCompositeOperation = 'screen';
        if (pL > 0.01) {
            radialAura(g, 114, 296, 48, '#ff7c78', '#a81830', pL * 0.2);
            g.save();
            g.translate(112, 316); g.scale(1, 0.3);
            radialAura(g, 0, 0, 62, '#ff8882', '#9e162c', pL * 0.24);
            g.restore();
        }
        if (pR > 0.01) {
            radialAura(g, 748, 312, 54, '#ff7c78', '#a81830', pR * 0.22);
            g.save();
            g.translate(736, 336); g.scale(1, 0.34);
            radialAura(g, 0, 0, 74, '#ff8882', '#9e162c', pR * 0.24);
            g.restore();
        }
        g.restore();
    }
}

// 5) Реалистичный пиксельный 3D-лоток старого кассетного магнитофона (масштаб 1:1 к исходнику: x=70..180, y=534..606)
// Выезжает строго горизонтально вперёд-вправо в точной изометрии полки и плавно заезжает обратно (никаких «призраков»!)
function drawCassetteDeck(now) {
    const cv = typeof document !== 'undefined' && document.getElementById('station-deck');
    if (!cv || !cv.getContext) return;
    const g = cv.getContext('2d');
    if (!g) return;

    const elapsed = (now - roomAnim.deckStart) * 0.001;
    const active = elapsed > 0 && elapsed < 2.85;
    if (!active) {
        if (roomAnim.deckWasActive) {
            g.clearRect(0, 0, cv.width, cv.height);
            roomAnim.deckWasActive = false;
        }
        return;
    }
    roomAnim.deckWasActive = true;
    g.clearRect(0, 0, cv.width, cv.height);

    // Плавный таймлайн моторизованного лотка:
    // 0.00..0.22 — нажатие кнопки EJECT и тёплый огонёк индикатора
    // 0.16..0.92 — плавный горизонтальный выезд 3D-лотка с лежащей кассетой C-90
    // 0.92..1.52 — спокойная пауза в открытом положении
    // 1.52..2.38 — плавное втягивание лотка обратно в шахту деки
    // 2.38..2.85 — мягкое затухание индикатора после защёлкивания
    let eject = 0;
    if (elapsed >= 0.16 && elapsed < 0.92) eject = easeOutCubic((elapsed - 0.16) / 0.76);
    else if (elapsed >= 0.92 && elapsed < 1.52) eject = 1;
    else if (elapsed >= 1.52 && elapsed < 2.38) eject = 1 - easeInOutCubic((elapsed - 1.52) / 0.86);

    const openVis = clamp01(eject * 4.5);
    const ledA = softBell(elapsed * 1000, 260, 1950, 620);

    // Кнопка EJECT (в исходнике x=145..154, y=557..561 -> локально 75..84, 23..27) и тёплый красный светодиод (76, 41)
    if (elapsed < 0.35) {
        const press = Math.sin((elapsed / 0.35) * Math.PI);
        g.fillStyle = `rgba(10,2,3,${(press * 0.7).toFixed(3)})`;
        g.fillRect(75, 23, 8, 3);
    }
    g.fillStyle = `rgba(180,38,46,${(ledA * 0.45).toFixed(3)})`;
    g.fillRect(74, 39, 5, 5);
    g.fillStyle = `rgba(255,156,148,${(ledA * 0.88).toFixed(3)})`;
    g.fillRect(75.5, 40.5, 2, 2);

    if (eject <= 0.01) return;

    // Точная геометрия горизонтальной шахты деки (x=90..138, y=560..577 -> локально x0=20..68, наклон фасада -3.4°: dy = -2.8px)
    const xL = 20, xR = 67;           // левый и правый край шахты (ширина 47px)
    const yL = 33.5, yR = 30.8;       // линия слота по наклону передней панели деки
    // Вектор горизонтального выезда лотка ИЗ деки в комнату (вперёд-вправо-вниз по перспективе полки!)
    const vx = 14.5 * eject;
    const vy = 10.5 * eject;

    // 1. Тёмная открытая шахта деки с тёплой тусклой подсветкой лентопротяжки в глубине
    g.save();
    g.fillStyle = `rgba(9,2,3,${(0.92 * openVis).toFixed(3)})`;
    g.beginPath();
    g.moveTo(xL, yL - 8); g.lineTo(xR, yR - 8);
    g.lineTo(xR, yR + 6); g.lineTo(xL, yL + 6);
    g.closePath();
    g.fill();
    // Тусклый тёплый огонёк подсветки кассетоприёмника внутри шахты
    const wellGrad = g.createLinearGradient(xL, yL - 7, xL, yL + 3);
    wellGrad.addColorStop(0, `rgba(148,34,40,${(0.45 * openVis).toFixed(3)})`);
    wellGrad.addColorStop(1, 'rgba(20,4,6,0)');
    g.fillStyle = wellGrad;
    g.fillRect(xL + 3, yR - 7, xR - xL - 6, 9);

    // 2. Реалистичная падающая тень от выдвинутого лотка на нижнюю кромку деки и усилитель
    g.fillStyle = `rgba(4,1,2,${(0.68 * Math.min(1, eject * 1.4)).toFixed(3)})`;
    g.beginPath();
    g.moveTo(xL + 1, yL + 6.5);
    g.lineTo(xR + 1, yR + 6.5);
    g.lineTo(xR + vx + 1, yR + vy + 9.5);
    g.lineTo(xL + vx - 1, yL + vy + 9.5);
    g.closePath();
    g.fill();

    // 3. Твердотельный металлический 3D-лоток (горизонтальная площадка в изометрии)
    const fLx = xL + vx, fLy = yL + vy;
    const fRx = xR + vx, fRy = yR + vy;

    // Дно и боковые металлические салазки лотка
    g.fillStyle = '#180507';
    g.beginPath();
    g.moveTo(xL, yL); g.lineTo(xR, yR);
    g.lineTo(fRx, fRy); g.lineTo(fLx, fLy);
    g.closePath();
    g.fill();

    // Боковые стальные направляющие (правая ловит тёплый алый свет от ночника рядом!)
    g.strokeStyle = '#4a1418';
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(xL + 0.7, yL); g.lineTo(fLx + 0.7, fLy); g.stroke();
    g.strokeStyle = '#7d262c';
    g.beginPath(); g.moveTo(xR - 0.7, yR); g.lineTo(fRx - 0.7, fRy); g.stroke();

    // 4. Настоящая аудиокассета C-90, ЛЕЖАЩАЯ ПЛАШМЯ внутри горизонтального лотка!
    if (eject > 0.12) {
        const cIn = 3.5; // отступ кассеты от бортиков лотка
        const bLx = xL + cIn + vx * 0.08, bLy = yL + vy * 0.08 - 0.5;
        const bRx = xR - cIn + vx * 0.08, bRy = yR + vy * 0.08 - 0.5;
        const cLx = fLx + cIn - vx * 0.1, cLy = fLy - vy * 0.1 - 1.2;
        const cRx = fRx - cIn - vx * 0.1, cRy = fRy - vy * 0.1 - 1.2;

        // Тёмно-бордовый матовый корпус кассеты (вид сверху под углом комнаты)
        g.fillStyle = '#260a0d';
        g.strokeStyle = '#5c1b20';
        g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(bLx, bLy); g.lineTo(bRx, bRy);
        g.lineTo(cRx, cRy); g.lineTo(cLx, cLy);
        g.closePath();
        g.fill();
        g.stroke();

        // Узкая тёплая бумажная наклейка кассеты (вдоль дальней половины, без яркой белизны — в тоне сцены!)
        const lerp = (a, b, t) => a + (b - a) * t;
        g.fillStyle = '#852b32';
        g.beginPath();
        g.moveTo(lerp(bLx, cLx, 0.16) + 2, lerp(bLy, cLy, 0.16));
        g.lineTo(lerp(bRx, cRx, 0.16) - 2, lerp(bRy, cRy, 0.16));
        g.lineTo(lerp(bRx, cRx, 0.46) - 2, lerp(bRy, cRy, 0.46));
        g.lineTo(lerp(bLx, cLx, 0.46) + 2, lerp(bLy, cLy, 0.46));
        g.closePath();
        g.fill();

        // Узкое тёмное смотровое окошко плёнки с двумя плоскими в перспективе медными бобышками
        if (eject > 0.38) {
            const mLx = lerp(bLx, cLx, 0.68), mLy = lerp(bLy, cLy, 0.68);
            const mRx = lerp(bRx, cRx, 0.68), mRy = lerp(bRy, cRy, 0.68);
            g.strokeStyle = '#0e0204';
            g.lineWidth = 2.4;
            g.beginPath();
            g.moveTo(lerp(mLx, mRx, 0.2), lerp(mLy, mRy, 0.2));
            g.lineTo(lerp(mLx, mRx, 0.8), lerp(mLy, mRy, 0.8));
            g.stroke();

            // Плоские эллипсы катушек в изометрии (тёплая медь #99393f, никаких белых кружков!)
            for (const u of [0.33, 0.67]) {
                const hx = lerp(mLx, mRx, u), hy = lerp(mLy, mRy, u);
                g.fillStyle = '#8f343a';
                g.beginPath(); g.ellipse(hx, hy, 2.4, 0.95, -0.06, 0, Math.PI * 2); g.fill();
                g.fillStyle = '#140406';
                g.beginPath(); g.ellipse(hx, hy, 0.9, 0.45, -0.06, 0, Math.PI * 2); g.fill();
            }
        }
    }

    // 5. Массивная передняя планка (фасад) кассетного лотка с тонкой металлической фаской сверху
    const lipH = 5.2;
    const faceGrad = g.createLinearGradient(fLx, fLy, fRx, fRy);
    faceGrad.addColorStop(0, '#22080a');
    faceGrad.addColorStop(0.65, '#340d11');
    faceGrad.addColorStop(1, '#54181d'); // отсвет от правого ночника
    g.fillStyle = faceGrad;
    g.beginPath();
    g.moveTo(fLx, fLy); g.lineTo(fRx, fRy);
    g.lineTo(fRx, fRy + lipH); g.lineTo(fLx, fLy + lipH);
    g.closePath();
    g.fill();

    // Верхнее ребро передней планки и правый торец лотка
    g.strokeStyle = '#882c33';
    g.lineWidth = 1.0;
    g.beginPath(); g.moveTo(fLx, fLy); g.lineTo(fRx, fRy); g.stroke();
    g.strokeStyle = '#120305';
    g.beginPath(); g.moveTo(fLx, fLy + lipH); g.lineTo(fRx, fRy + lipH); g.stroke();

    // Аккуратная выемка по центру передней планки лотка
    const midX = (fLx + fRx) * 0.5, midY = (fLy + fRy) * 0.5;
    g.fillStyle = '#140406';
    g.fillRect(midX - 5, midY + 1.4, 10, 2);
    g.restore();
}

// ===== УНИКАЛЬНЫЙ КОТ ИГРОКА (ПРИВЯЗАН К АНОНИМНОМУ ID, КАК И РАСТЕНИЕ) =====
const CAT_COATS = [
    {
        name: 'Рыжий огонёк', short: 'рыжий полосатый',
        dark: '#4a170a', mid: '#9e3914', light: '#e06d2b', rim: '#ffad5c',
        belly: '#f5cfa2', stripe: '#3b1006', earIn: '#c95c54',
        eyeL: '#c8f06a', eyeR: '#c8f06a', pattern: 'tabby'
    },
    {
        name: 'Угольный бархат', short: 'угольно-чёрный',
        dark: '#090306', mid: '#1c0a12', light: '#3b1826', rim: '#e05870',
        belly: '#f2ded8', stripe: '#050103', earIn: '#9c3248',
        eyeL: '#ffbe47', eyeR: '#ffbe47', pattern: 'tuxedo'
    },
    {
        name: 'Серебристый дым', short: 'дымчато-серебристый',
        dark: '#231f2b', mid: '#565066', light: '#9992ab', rim: '#e6c8d8',
        belly: '#dcd8e8', stripe: '#2a2534', earIn: '#a86478',
        eyeL: '#ffd166', eyeR: '#ffd166', pattern: 'tabby'
    },
    {
        name: 'Трёхцветный микэ', short: 'трёхцветный микэ',
        dark: '#693c2c', mid: '#cfa78e', light: '#f2d9c4', rim: '#ffcaa8',
        belly: '#f7e5d4', stripe: '#1c0b10', patch: '#c44b1d', earIn: '#cf7478',
        eyeL: '#f5b041', eyeR: '#f5b041', pattern: 'calico'
    },
    {
        name: 'Сиамский шёлк', short: 'сиамский сил-пойнт',
        dark: '#5e3c2e', mid: '#b89178', light: '#e6c8b0', rim: '#ffd4be',
        belly: '#eed8c4', stripe: '#240d0c', earIn: '#7a3438',
        eyeL: '#7cd4ff', eyeR: '#7cd4ff', pattern: 'siamese'
    },
    {
        name: 'Янтарная черепаха', short: 'черепаховый с золотом',
        dark: '#1c0907', mid: '#421912', light: '#6e2c1c', rim: '#f59c4e',
        belly: '#d99352', stripe: '#d97828', patch: '#f2b85c', earIn: '#9e443e',
        eyeL: '#ffca52', eyeR: '#ffca52', pattern: 'tortie'
    },
    {
        name: 'Лунный снег', short: 'белоснежный разноглазый',
        dark: '#6e4952', mid: '#bd969c', light: '#f0dada', rim: '#fff0ee',
        belly: '#f8ebeb', stripe: '#9e727a', earIn: '#de7c8a',
        eyeL: '#ffc44d', eyeR: '#7ad8ff', pattern: 'snow'
    }
];

const CAT_EARS = ['чуткие ушки', 'рысьи кисточки', 'мягкие ушки'];

function catSpec(rawId, overrideCoat) {
    const src = String(rawId || (typeof player !== 'undefined' && (player.uid || player.name)) || 'guest');
    let h = 2166136261 >>> 0;
    for (let i = 0; i < src.length; i++) {
        h ^= src.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    // Дополнительное перемешивание, чтобы масть кота и вид растения распределялись независимо
    const mix = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    const coatIdx = Number.isInteger(overrideCoat) && overrideCoat >= 0 && overrideCoat < CAT_COATS.length
        ? overrideCoat
        : (mix % CAT_COATS.length);
    const earStyle = (mix >>> 7) % 3; // 0: классика, 1: рысьи кисточки, 2: плюшевые
    const socks = ((mix >>> 10) % 3) === 0;
    const starMark = ((mix >>> 12) % 3) === 0;
    const purrHz = 46 + ((mix >>> 14) % 14);
    const coat = CAT_COATS[coatIdx];
    const summary = `${coat.name}${earStyle === 1 ? ' · рысьи кисточки' : ''}`;
    return {
        coatIdx, coat, earStyle, earName: CAT_EARS[earStyle],
        socks, starMark, purrHz, seed: mix, summary
    };
}

// ===== УНИКАЛЬНЫЙ ПЁС-ХРАНИТЕЛЬ ИГРОКА (7 ЖИВЫХ ПОРОД ПО ID · СВОЁ МЕСТО НА КОВРЕ РЯДОМ С КОТОМ!) =====
const DOG_BREEDS = [
    {
        name: 'Рыжий сиба-ину', short: 'рыжий сиба-ину',
        dark: '#57200b', mid: '#b84c18', light: '#eb8338', rim: '#ffc478',
        cream: '#fae3c2', earIn: '#c9625a', nose: '#160708',
        eyeL: '#ffcf75', eyeR: '#ffcf75',
        ears: 'pointed', tail: 'curled', pattern: 'shiba'
    },
    {
        name: 'Золотистый ретривер', short: 'золотистый ретривер',
        dark: '#59300e', mid: '#b56c24', light: '#ebb05a', rim: '#ffe098',
        cream: '#fce8be', earIn: '#8c4918', nose: '#1c0b09',
        eyeL: '#ffca68', eyeR: '#ffca68',
        ears: 'floppy', tail: 'plume', pattern: 'golden'
    },
    {
        name: 'Северный хаски', short: 'северный хаски',
        dark: '#14111c', mid: '#3b364a', light: '#736c87', rim: '#dcd6f2',
        cream: '#f5eef7', earIn: '#9e5c6e', nose: '#12080c',
        eyeL: '#8ce2ff', eyeR: '#8ce2ff',
        ears: 'pointed', tail: 'plume', pattern: 'husky'
    },
    {
        name: 'Вельш-корги', short: 'рыжий вельш-корги',
        dark: '#59220c', mid: '#bd551e', light: '#f08e46', rim: '#ffca82',
        cream: '#fcf0de', earIn: '#d46c68', nose: '#170809',
        eyeL: '#ffd070', eyeR: '#ffd070',
        ears: 'corgi', tail: 'bob', pattern: 'corgi'
    },
    {
        name: 'Шоколадный спаниель', short: 'шоколадный спаниель',
        dark: '#1c0907', mid: '#4d1f16', light: '#823b28', rim: '#e89868',
        cream: '#e39a5c', earIn: '#36130d', nose: '#260d0a',
        eyeL: '#ffc45c', eyeR: '#ffc45c',
        ears: 'longfloppy', tail: 'plume', pattern: 'spaniel'
    },
    {
        name: 'Лунный самоед', short: 'белоснежный самоед',
        dark: '#75505a', mid: '#c7a4ac', light: '#f5e4e6', rim: '#fff7f5',
        cream: '#fcf2f2', earIn: '#de8592', nose: '#17080b',
        eyeL: '#ffd480', eyeR: '#ffd480',
        ears: 'pointed', tail: 'curled', pattern: 'samoyed'
    },
    {
        name: 'Чёрно-белый колли', short: 'чёрно-белый бордер-колли',
        dark: '#080306', mid: '#1d0d16', light: '#3f2030', rim: '#e87890',
        cream: '#f7ecee', earIn: '#8f3b4e', nose: '#120508',
        eyeL: '#ffd06b', eyeR: '#8ad8ff',
        ears: 'tipped', tail: 'plume', pattern: 'collie'
    }
];

function dogSpec(rawId, overrideBreed) {
    const src = String(rawId || (typeof player !== 'undefined' && (player.uid || player.name)) || 'guest');
    let h = 2166136261 >>> 0;
    for (let i = 0; i < src.length; i++) {
        h ^= src.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    // Собственная независимая соль Murmur3 — порода пса не зависит ни от вида цветка, ни от масти кота!
    let mix = Math.imul((h ^ 0x9e3779b9) >>> 0, 0x85ebca6b) >>> 0;
    mix = Math.imul(mix ^ (mix >>> 13), 0xc2b2ae35) >>> 0;
    const breedIdx = Number.isInteger(overrideBreed) && overrideBreed >= 0 && overrideBreed < DOG_BREEDS.length
        ? overrideBreed
        : (mix % DOG_BREEDS.length);
    const browSpot = ((mix >>> 8) % 2) === 0;
    const woofHz = 118 + ((mix >>> 11) % 34);
    const breed = DOG_BREEDS[breedIdx];
    return {
        breedIdx, breed, browSpot, woofHz, seed: mix, summary: breed.name
    };
}

// ===== НАСТОЯЩИЙ ЖИВОЙ ЭЛТ-МОНИТОР ТЕРМИНАЛА (x=149..206, y=218..266) =====
function drawCrtMonitor(g, now, phase, crtGlow) {
    const still = prefersStillRoom();
    const t = still ? 2.1 : now * 0.001;
    const sx = 149.5, sy = 218.5, sw = 56, sh = 47;
    const fx = 153, fy = 223, fw = 49, fh = 39.5;
    const midY = fy + fh * 0.5;
    const excite = 1 + crtGlow * 0.65;

    g.save();
    // 1. Скруглённая стеклянная трубка кинескопа (полностью заменяет статичную JPEG-картинку)
    g.beginPath();
    if (g.roundRect) g.roundRect(sx, sy, sw, sh, 3.2);
    else g.rect(sx, sy, sw, sh);
    g.clip();

    if (g.createRadialGradient) {
        const tube = g.createRadialGradient(sx + sw * 0.5, midY, 3, sx + sw * 0.5, midY, sw * 0.72);
        tube.addColorStop(0, phase === 3 ? '#32070e' : '#28050b');
        tube.addColorStop(0.65, '#150206');
        tube.addColorStop(1, '#080102');
        g.fillStyle = tube;
    } else g.fillStyle = '#160206';
    g.fillRect(sx, sy, sw, sh);

    // 2. Тонкая осциллографическая сетка и прицельные деления
    g.strokeStyle = 'rgba(255, 68, 88, 0.11)';
    g.lineWidth = 0.5;
    for (let gx = fx + 8; gx < fx + fw - 2; gx += 8) {
        g.beginPath(); g.moveTo(gx, fy + 1); g.lineTo(gx, fy + fh - 1); g.stroke();
    }
    for (let gy = fy + 8; gy < fy + fh - 2; gy += 8) {
        g.beginPath(); g.moveTo(fx + 1, gy); g.lineTo(fx + fw - 1, gy); g.stroke();
    }
    // Центральная нулевая ось сигнала
    g.strokeStyle = 'rgba(255, 92, 110, 0.24)';
    g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(fx + 1, midY); g.lineTo(fx + fw - 1, midY); g.stroke();

    // Пунктирная красная рамка интерфейса SOMA_LINK (в точном стиле оригинального пиксель-арта)
    g.strokeStyle = `rgba(235, 72, 92, ${(0.52 + crtGlow * 0.25).toFixed(3)})`;
    g.lineWidth = 0.85;
    g.strokeRect(fx + 0.4, fy + 0.4, fw - 0.8, fh - 0.8);

    // 3. Верхняя телеметрия: мигающий индикатор приёма + бегущие блоки данных
    const recOn = still || Math.sin(t * 4.2) > -0.15;
    g.fillStyle = recOn ? '#ff6478' : 'rgba(180,40,56,0.35)';
    g.fillRect(fx + 2.4, fy + 2.2, 2.2, 1.8);
    g.fillStyle = 'rgba(255, 132, 146, 0.52)';
    const hdrBars = 5 + ((Math.floor(t * 2.5)) % 4);
    for (let b = 0; b < hdrBars; b++) {
        g.fillRect(fx + 6.4 + b * 2.4, fy + 2.5, 1.6, 1.2);
    }
    // Правый верхний индикатор синхронизации узла
    for (let d = 0; d < 3; d++) {
        const on = ((Math.floor(t * 3) + d) % 3) === 0;
        g.fillStyle = on ? '#ffb8c2' : 'rgba(215, 58, 76, 0.32)';
        g.fillRect(fx + fw - 9.5 + d * 2.5, fy + 2.4, 1.6, 1.5);
    }

    // 4. Живая многослойная волна эфира (сейсмограмма голосов + ритм сердца NEEO_CITY)
    const sampleWave = (u, timeSec) => {
        // Мягкое оконное затухание у краёв рамки, как на настоящем осциллографе
        const env = Math.pow(Math.sin(u * Math.PI), 0.75);
        // Две живые «вспышки голоса», плавно дышащие и перетекающие по экрану
        const packet1 = Math.exp(-Math.pow((u - (0.34 + Math.sin(timeSec * 0.7) * 0.1)) / 0.14, 2));
        const packet2 = Math.exp(-Math.pow((u - (0.68 + Math.cos(timeSec * 0.55) * 0.09)) / 0.13, 2));
        // Периодический кардиоимпульс, пробегающий слева направо каждые 2.6 с
        const beatPos = (timeSec * 0.42) % 1.35 - 0.15;
        const dBeat = (u - beatPos) / 0.042;
        const ecg = (Math.exp(-dBeat * dBeat) * 1.15 - Math.exp(-Math.pow(dBeat - 1.1, 2)) * 0.68)
            * (beatPos > 0 && beatPos < 1 ? 1 : 0);
        const carrier = Math.sin(u * 38 - timeSec * 7.4) * 0.52
            + Math.sin(u * 67 + timeSec * 11.2) * 0.34
            + Math.cos(u * 21 - timeSec * 3.8) * 0.24;
        const burst = (0.16 + (packet1 * 0.95 + packet2 * 0.85) * (0.62 + 0.38 * Math.sin(timeSec * 2.3)));
        return env * (carrier * burst * 9.5 + ecg * 6.8) * excite;
    };

    // Слой А: инерционное послесвечение люминофора (предыдущий такт волны)
    g.strokeStyle = 'rgba(220, 32, 56, 0.34)';
    g.lineWidth = 2.6;
    g.lineJoin = 'round';
    g.beginPath();
    const steps = 46;
    for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const wx = fx + 1.5 + u * (fw - 3);
        const wy = midY + Math.max(-14.5, Math.min(14.5, sampleWave(u, t - 0.09)));
        if (i === 0) g.moveTo(wx, wy); else g.lineTo(wx, wy);
    }
    g.stroke();

    // Слой Б: широкое алое свечение активного луча
    let peakEnergy = 0;
    g.strokeStyle = 'rgba(255, 58, 82, 0.62)';
    g.lineWidth = 2.2;
    g.beginPath();
    const pts = [];
    for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const wx = fx + 1.5 + u * (fw - 3);
        const dy = Math.max(-14.8, Math.min(14.8, sampleWave(u, t)));
        if (Math.abs(dy) > peakEnergy) peakEnergy = Math.abs(dy);
        const wy = midY + dy;
        pts.push([wx, wy, Math.abs(dy)]);
        if (i === 0) g.moveTo(wx, wy); else g.lineTo(wx, wy);
    }
    g.stroke();

    // Слой В: раскалённое бело-розовое ядро осциллографа
    g.strokeStyle = '#ff9aa8';
    g.lineWidth = 0.95;
    g.stroke();

    // Горячие белые искры на самых высоких пиках сигнала
    for (let i = 2; i < pts.length - 2; i += 2) {
        if (pts[i][2] > 6.4) {
            g.fillStyle = 'rgba(255, 228, 232, 0.85)';
            g.fillRect(pts[i][0] - 0.5, pts[i][1] - 0.5, 1.1, 1.1);
        }
    }

    // Мерцающие пиксельные частицы эфира вокруг волны (как в родном арте, но живые!)
    for (let p = 0; p < 12; p++) {
        const pu = ((p * 0.173 + t * (0.04 + (p % 3) * 0.015)) % 0.88) + 0.06;
        const py = midY + Math.sin(t * 1.4 + p * 2.3) * 12.5;
        const pa = 0.18 + 0.42 * Math.pow(0.5 + 0.5 * Math.sin(t * 3.1 + p * 1.9), 2);
        g.fillStyle = `rgba(255, 138, 152, ${pa.toFixed(3)})`;
        g.fillRect(fx + pu * fw, py, 1.0, 1.0);
    }

    // 5. Нижний живой 12-полосный спектроанализатор частот NEEO_CITY
    for (let b = 0; b < 12; b++) {
        const lvl = 0.5 + 0.5 * Math.sin(t * (4.2 + (b % 4) * 1.1) + b * 0.85);
        const bh = Math.max(0.8, (1.1 + lvl * 3.4) * Math.min(1.3, excite));
        const bx0 = fx + 3 + b * 3.65;
        g.fillStyle = lvl > 0.72 ? 'rgba(255, 168, 178, 0.78)' : 'rgba(232, 58, 78, 0.48)';
        g.fillRect(bx0, fy + fh - 1.6 - bh, 2.3, bh);
    }

    // 6. Реалистичная растровая сетка кинескопа (неподвижная!) и мягкий блик выпуклого стекла
    g.fillStyle = 'rgba(5, 0, 2, 0.26)';
    for (let y = sy; y < sy + sh; y += 2) {
        g.fillRect(sx, y, sw, 0.85);
    }
    if (g.createLinearGradient) {
        const glass = g.createLinearGradient(sx, sy, sx + sw * 0.6, sy + sh);
        glass.addColorStop(0, 'rgba(255, 190, 200, 0.09)');
        glass.addColorStop(0.32, 'rgba(255, 120, 135, 0.02)');
        glass.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
        g.fillStyle = glass;
        g.fillRect(sx, sy, sw, sh);
    }
    g.restore();

    // 7. Живой индикатор питания под экраном и мягкий синхронный отсвет волны на клавишах!
    const energy01 = clamp01(peakEnergy / 13);
    const ledA = 0.45 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.2));
    g.fillStyle = `rgba(255, 112, 126, ${ledA.toFixed(3)})`;
    g.fillRect(154.5, 270.2, 2.2, 1.3);

    g.save();
    g.globalCompositeOperation = 'screen';
    radialAura(g, 178, 243, 38, '#ff5c72', '#9e1428', 0.07 + energy01 * 0.09 + crtGlow * 0.16);
    // Живой отблеск люминофора на клавиатуре терминала
    radialAura(g, 184, 285, 28, '#ff687c', '#8f1024', 0.04 + energy01 * 0.08 + crtGlow * 0.1);
    g.restore();
}

// ===== КОСМЕТИЧЕСКИЕ АТРИБУТЫ КОМНАТЫ (НАСТОЯЩЕЕ ТЕПЛО, УЮТ И УНИКАЛЬНЫЙ КОТ) =====
function getRoomCosmeticsSafe() {
    if (typeof getActiveCosmetics === 'function') {
        try { return getActiveCosmetics() || {}; } catch (_) {}
    }
    return roomAnim.cosmeticsOverride || {};
}

function drawCompanionCat(g, now, phase, still) {
    const uid = (typeof player !== 'undefined' && (player.uid || player.name)) || 'guest';
    const override = Number.isInteger(roomAnim.inspectCatCoat) ? roomAnim.inspectCatCoat : null;
    const cat = catSpec(uid, override);
    const c = cat.coat;
    const t = still ? 1.2 : now * 0.001;

    // Крупный, уютно свернувшийся на багровом стёганом пледе кот (x=618, y=333)
    const cx = 618, cy = 333;

    // ОЩУТИМОЕ ЖИВОЕ ДЫХАНИЕ: глубокий спокойный вдох (подъём спинки на ~4.4px + расширение бока) и мягкий выдох
    const breathRaw = still ? 0.42 : (0.5 + 0.5 * Math.sin(t * 1.85));
    const breath = breathRaw * breathRaw * (3 - 2 * breathRaw);
    const rise = breath * 4.4;
    const ribExpand = breath * 1.9;

    // Живой хвост, сонное подёргивание ушка и редкий доверчивый полувзгляд
    const tailSwing = still ? 0 : (Math.sin(t * 1.15) * 3.2 + Math.sin(t * 2.4) * 1.2);
    const earTwitch = (!still && Math.sin(t * 0.85 + 1.3) > 0.94) ? Math.sin(t * 22) * 1.8 : 0;
    const lazyPeek = !still && (t % 14) > 11.6 && (t % 14) < 13.1;

    const petElapsed = now - (roomAnim.catPetStart || -1e9);
    const isPetted = !still && petElapsed > 0 && petElapsed < 2800;
    const headLift = isPetted ? softBell(petElapsed, 280, 1500, 900) * 2.8 : 0;
    const nlBoost = !still ? softBell(now - roomAnim.nightRStart, 650, 900, 1700) : 0;

    g.save();

    // 1. ТЁПЛЫЙ ОРЕОЛ ЖИВОГО ПРИСУТСТВИЯ на кушетке (дышит вместе с котом — комната сразу теплеет!)
    g.save();
    g.globalCompositeOperation = 'screen';
    const hearthA = 0.2 + breath * 0.11 + (isPetted ? 0.16 : 0) + nlBoost * 0.1 + (phase === 3 ? 0.05 : 0);
    radialAura(g, cx + 1, cy - 2, 54, '#ffb668', '#b82238', hearthA);
    g.restore();

    // 2. Мягкая бархатная растушёванная тень в складках стёганого пледа (без жёсткого края!)
    g.save();
    g.translate(cx + 1, cy + 7.2);
    g.scale(1, 0.32);
    if (g.createRadialGradient) {
        const sg = g.createRadialGradient(0, 0, 8, 0, 0, 34 + ribExpand * 0.7);
        sg.addColorStop(0, 'rgba(4, 1, 2, 0.88)');
        sg.addColorStop(0.65, 'rgba(6, 1, 2, 0.56)');
        sg.addColorStop(1, 'rgba(6, 1, 2, 0)');
        g.fillStyle = sg;
    } else g.fillStyle = 'rgba(5, 1, 2, 0.65)';
    g.beginPath(); g.arc(0, 0, 34 + ribExpand * 0.7, 0, Math.PI * 2); g.fill();
    g.restore();

    // 3. Округлый дышащий корпус кота (56×32px — отлично читается и на телефоне, и на ПК!)
    const bodyTop = cy - 16.5 - rise;
    if (g.createRadialGradient) {
        const bg = g.createRadialGradient(cx + 3, cy - 8 - rise * 0.8, 3, cx + 2, cy - 1, 31);
        bg.addColorStop(0, c.light);
        bg.addColorStop(0.56, c.mid);
        bg.addColorStop(1, c.dark);
        g.fillStyle = bg;
    } else g.fillStyle = c.mid;

    g.save();
    g.beginPath();
    g.moveTo(cx - 24, cy + 4);
    g.bezierCurveTo(cx - 26 - ribExpand * 0.4, cy - 10 - rise * 0.7, cx - 8, bodyTop, cx + 10, bodyTop + 1.5);
    g.bezierCurveTo(cx + 25 + ribExpand, bodyTop + 4, cx + 30 + ribExpand, cy - 1, cx + 26, cy + 6.2);
    g.bezierCurveTo(cx + 15, cy + 11, cx - 13, cy + 10.5, cx - 24, cy + 4);
    g.closePath();
    g.fill();

    // 4. Уникальный рисунок шерсти по масти игрока (клип по корпусу)
    g.clip();
    // Тёплая светлая грудка (у смокинга, рыжего, микэ и по ID)
    if (c.pattern === 'tuxedo' || c.pattern === 'tabby' || cat.socks) {
        g.fillStyle = c.belly;
        g.globalAlpha = c.pattern === 'tuxedo' ? 0.85 : 0.45;
        g.beginPath();
        g.ellipse(cx - 14, cy + 4.5, 8.5, 5.5, 0.2, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
    }
    if (c.pattern === 'tabby') {
        // Выразительные тигровые полоски на дышащей спинке
        g.strokeStyle = c.stripe;
        g.lineWidth = 2.4;
        g.lineCap = 'round';
        g.globalAlpha = 0.62;
        for (let s = 0; s < 5; s++) {
            const sx0 = cx - 4 + s * 5.8;
            g.beginPath();
            g.moveTo(sx0, bodyTop - 1);
            g.quadraticCurveTo(sx0 + 2.4, cy - 5 - rise * 0.5, sx0 - 0.5, cy + 2);
            g.stroke();
        }
        g.globalAlpha = 1;
    } else if (c.pattern === 'calico') {
        // Крупные живописные рыжие и угольные пятна трёхцветного кота микэ
        g.fillStyle = c.patch;
        g.beginPath(); g.ellipse(cx + 4, cy - 9 - rise * 0.8, 9.5, 6.8, 0.25, 0, Math.PI * 2); g.fill();
        g.fillStyle = c.stripe;
        g.beginPath(); g.ellipse(cx + 18, cy - 3 - rise * 0.4, 8.5, 7.2, -0.2, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(cx - 5, cy - 11 - rise * 0.8, 5.2, 4.0, 0.1, 0, Math.PI * 2); g.fill();
    } else if (c.pattern === 'tortie') {
        // Тёплая россыпь карамельно-золотых подпалин
        const sr = rng(cat.seed ^ 0xca71);
        for (let p = 0; p < 9; p++) {
            g.fillStyle = p % 2 === 0 ? c.stripe : c.patch;
            g.globalAlpha = 0.55;
            const px = cx - 10 + sr() * 34;
            const py = bodyTop + 3 + sr() * 14;
            g.beginPath(); g.ellipse(px, py, 3.2 + sr() * 3.5, 2.2 + sr() * 2.2, sr() * 2, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;
    } else if (c.pattern === 'siamese') {
        // Тёмный шоколадный пойнт на бедре и лапках
        g.fillStyle = 'rgba(36, 12, 10, 0.55)';
        g.beginPath(); g.ellipse(cx + 22, cy + 3, 9, 7, 0, 0, Math.PI * 2); g.fill();
    }
    // Мягкий тёплый алый рефлекс комнаты по низу шерсти, чтобы любая масть сидела в сцене как родная!
    if (g.createLinearGradient) {
        const tint = g.createLinearGradient(cx, bodyTop, cx, cy + 10);
        tint.addColorStop(0, 'rgba(255, 112, 96, 0.12)');
        tint.addColorStop(0.6, 'rgba(140, 16, 32, 0.16)');
        tint.addColorStop(1, 'rgba(18, 2, 5, 0.58)');
        g.fillStyle = tint;
        g.fillRect(cx - 30, bodyTop - 4, 64, 34);
    }
    g.restore();

    // Тонкий контровой свет строго по самому верхнему контуру дышащей спинки (от окна и ночника)
    const rimA = 0.48 + breath * 0.28 + nlBoost * 0.18;
    g.strokeStyle = mixHex(c.rim, '#ffb298', 0.35, rimA);
    g.lineWidth = 1.25;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - 10, bodyTop + 3.2);
    g.bezierCurveTo(cx - 2, bodyTop + 0.4, cx + 13, bodyTop + 1.4, cx + 24.5 + ribExpand * 0.7, cy - 5.2 - rise * 0.3);
    g.stroke();

    // Уютная складка согнутой задней лапки
    g.strokeStyle = mixHex(c.dark, '#000000', 0.4, 0.55);
    g.lineWidth = 1.3;
    g.beginPath();
    g.arc(cx + 11, cy + 1.5 - rise * 0.25, 10.5, Math.PI * 1.12, Math.PI * 1.82);
    g.stroke();

    // Передние сложенные лапки (с белыми носочками, если выпало по ID!)
    const pawCol = (cat.socks || c.pattern === 'tuxedo' || c.pattern === 'calico')
        ? mixHex(c.belly, '#e8a4a0', 0.22)
        : (c.pattern === 'siamese' ? c.stripe : mixHex(c.mid, c.light, 0.3));
    g.fillStyle = pawCol;
    g.beginPath(); g.ellipse(cx - 21, cy + 5.8, 4.4, 2.5, 0.12, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx - 13.5, cy + 6.6, 4.6, 2.6, -0.08, 0, Math.PI * 2); g.fill();

    // 5. Мягкая естественная пушистая грудка (без ошейников и ленточек — чистый живой силуэт!)
    const hx = cx - 15.5, hy = cy - 2.2 - rise * 0.42 - headLift;
    g.fillStyle = mixHex(c.belly, c.light, 0.35, 0.62);
    g.beginPath();
    g.ellipse(hx + 2.2, hy + 6.4, 5.4, 3.2, 0.15, 0, Math.PI * 2);
    g.fill();

    // 6. Выразительная круглая головка с щёчками
    if (g.createRadialGradient) {
        const hg = g.createRadialGradient(hx - 1, hy - 3, 1.5, hx, hy, 12);
        hg.addColorStop(0, mixHex(c.light, '#ffb8b0', 0.12));
        hg.addColorStop(0.65, mixHex(c.mid, '#6e1422', 0.16));
        hg.addColorStop(1, c.dark);
        g.fillStyle = hg;
    } else g.fillStyle = c.mid;
    g.beginPath();
    g.ellipse(hx, hy, 11.2, 9.0, -0.1, 0, Math.PI * 2);
    g.fill();

    // Сиамская тёмная маска или звёздочка/буква «М» табби на лбу
    if (c.pattern === 'siamese') {
        g.fillStyle = 'rgba(32, 10, 10, 0.78)';
        g.beginPath(); g.ellipse(hx - 1.2, hy + 1.4, 7.2, 5.2, -0.05, 0, Math.PI * 2); g.fill();
    } else if (c.pattern === 'calico') {
        g.fillStyle = c.patch;
        g.beginPath(); g.ellipse(hx + 4.5, hy - 3.5, 5.2, 4.2, 0.3, 0, Math.PI * 2); g.fill();
    } else if (c.pattern === 'tabby') {
        g.strokeStyle = c.stripe;
        g.lineWidth = 1.0;
        g.beginPath();
        g.moveTo(hx - 4.2, hy - 3.2); g.lineTo(hx - 2.6, hy - 5.4); g.lineTo(hx - 1.0, hy - 3.6);
        g.lineTo(hx + 0.6, hy - 5.4); g.lineTo(hx + 2.2, hy - 3.2);
        g.stroke();
    } else if (cat.starMark && c.pattern !== 'snow') {
        g.fillStyle = mixHex(c.belly, '#ffd8d2', 0.25, 0.78);
        g.beginPath();
        g.moveTo(hx - 1.2, hy - 5.8); g.lineTo(hx + 0.2, hy - 3.8);
        g.lineTo(hx - 1.2, hy - 1.8); g.lineTo(hx - 2.6, hy - 3.8);
        g.closePath(); g.fill();
    }

    // 7. Ушки (классические / с рысьими кисточками / мягкие округлые) + живое подёргивание!
    const earBaseCol = (c.pattern === 'siamese' || c.pattern === 'calico') ? c.stripe : mixHex(c.mid, c.dark, 0.45);
    const drawEar = (ex, ey, lx, ly, rx, ry, twitch) => {
        const tx = ex + twitch * 0.7, ty = ey + Math.abs(twitch) * 0.4;
        g.fillStyle = earBaseCol;
        g.beginPath();
        if (cat.earStyle === 2) {
            g.moveTo(lx, ly);
            g.quadraticCurveTo(tx, ty - 1.2, rx, ry);
        } else {
            g.moveTo(lx, ly); g.lineTo(tx, ty); g.lineTo(rx, ry);
        }
        g.closePath();
        g.fill();
        g.strokeStyle = mixHex(c.rim, '#ff9898', 0.3, 0.72);
        g.lineWidth = 1.0;
        g.beginPath(); g.moveTo(lx, ly); g.lineTo(tx, ty); g.lineTo(rx, ry); g.stroke();
        // Тёплая розоватая серединка ушка
        g.fillStyle = c.earIn;
        g.globalAlpha = 0.68;
        g.beginPath();
        g.moveTo(lx + 1.6, ly - 0.4); g.lineTo(tx + 0.2, ty + 2.4); g.lineTo(rx - 1.5, ry - 0.3);
        g.closePath(); g.fill();
        g.globalAlpha = 1;
        // Рысьи кисточки!
        if (cat.earStyle === 1) {
            g.strokeStyle = mixHex(c.rim, '#ffe0c8', 0.4, 0.85);
            g.lineWidth = 1.05;
            g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + (tx < hx ? -1.4 : 1.4), ty - 3.2); g.stroke();
        }
    };
    drawEar(hx - 7.4, hy - 13.8, hx - 10.2, hy - 4.4, hx - 2.2, hy - 6.8, 0);
    drawEar(hx + 4.8, hy - 14.2 - (isPetted ? 0.9 : 0), hx - 0.4, hy - 7.0, hx + 8.4, hy - 4.6, earTwitch);

    // 8. Глазки, носик и усики
    const eyesOpen = (isPetted && petElapsed > 140 && petElapsed < 1650) || lazyPeek;
    const happySquint = isPetted && petElapsed >= 1650;
    const drawGlowingEye = (ex, ey, col, half) => {
        g.save();
        g.fillStyle = col;
        g.beginPath(); g.ellipse(ex, ey, 2.35, half ? 1.15 : 1.85, 0, 0, Math.PI * 2); g.fill();
        // Вертикальный кошачий зрачок и живая искорка
        g.fillStyle = '#0b0204';
        g.beginPath(); g.ellipse(ex, ey, 0.7, half ? 0.95 : 1.5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fffdf2';
        g.fillRect(ex - 0.9, ey - 1.0, 0.85, 0.85);
        g.restore();
    };
    if (eyesOpen) {
        drawGlowingEye(hx - 4.6, hy + 0.8, c.eyeL, lazyPeek);
        drawGlowingEye(hx + 2.2, hy + 1.0, c.eyeR, lazyPeek);
    } else if (happySquint) {
        // Счастливые прищуренные дуги «^ ^» от поглаживания
        g.strokeStyle = mixHex(c.rim, '#ffe6b8', 0.5, 0.85);
        g.lineWidth = 1.25;
        g.beginPath(); g.arc(hx - 4.6, hy + 1.8, 2.2, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
        g.beginPath(); g.arc(hx + 2.2, hy + 2.0, 2.2, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    } else {
        // Мирно сомкнутые реснички во сне
        g.strokeStyle = (c.pattern === 'tuxedo' || c.pattern === 'tortie' || c.pattern === 'siamese')
            ? 'rgba(235, 148, 152, 0.62)'
            : 'rgba(42, 10, 14, 0.72)';
        g.lineWidth = 1.15;
        g.beginPath(); g.arc(hx - 4.6, hy + 0.6, 2.2, 0.18, Math.PI - 0.18); g.stroke();
        g.beginPath(); g.arc(hx + 2.2, hy + 0.8, 2.2, 0.18, Math.PI - 0.18); g.stroke();
    }

    // Крошечный розовый/терракотовый носик и тонкие светлые усы
    g.fillStyle = c.earIn;
    g.beginPath();
    g.moveTo(hx - 2.3, hy + 3.0); g.lineTo(hx - 0.1, hy + 3.0); g.lineTo(hx - 1.2, hy + 4.3);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255, 214, 210, 0.34)';
    g.lineWidth = 0.65;
    g.beginPath();
    g.moveTo(hx - 6.5, hy + 3.2); g.lineTo(hx - 13.5, hy + 2.3);
    g.moveTo(hx - 6.5, hy + 4.4); g.lineTo(hx - 13.0, hy + 5.1);
    g.moveTo(hx + 4.2, hy + 3.5); g.lineTo(hx + 10.8, hy + 2.9);
    g.stroke();

    // 9. Пушистый живой хвост, плавно покачивающийся вокруг лапок
    const tailCol = (c.pattern === 'siamese' || c.pattern === 'calico') ? c.stripe : c.dark;
    const tipX = cx - 10 + tailSwing * 0.45;
    const tipY = cy + 7.2 - tailSwing * 0.85 - (isPetted ? Math.sin(t * 7) * 2.4 : 0);
    g.strokeStyle = tailCol;
    g.lineWidth = 4.8;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx + 24, cy + 4.5);
    g.bezierCurveTo(cx + 21, cy + 11.2, cx + 2, cy + 12.2, tipX, tipY);
    g.stroke();
    g.strokeStyle = mixHex(c.rim, '#ff9c98', 0.3, 0.62);
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(cx + 22, cy + 3.4);
    g.quadraticCurveTo(cx + 6, cy + 10.4, tipX + 0.5, tipY - 1.0);
    g.stroke();
    // Светлый кончик хвоста у рыжего/смокинга
    if (cat.socks || c.pattern === 'tabby') {
        g.fillStyle = mixHex(c.belly, '#ffc4b8', 0.25, 0.85);
        g.beginPath(); g.arc(tipX, tipY, 2.2, 0, Math.PI * 2); g.fill();
    }

    // 10. Визуальный ритм сонного дыхания (крошечное тёплое облачко на выдохе) и золотые искорки мурчания!
    if (!still) {
        const exhale = (t * 0.31) % 1;
        const exA = Math.sin(exhale * Math.PI) * 0.28;
        if (exA > 0.04) {
            g.fillStyle = `rgba(255, 214, 168, ${exA.toFixed(3)})`;
            g.beginPath();
            g.arc(hx - 6 - exhale * 4, hy - 8 - exhale * 14, 1.1 + exhale * 1.1, 0, Math.PI * 2);
            g.fill();
        }
        if (isPetted) {
            // Тёплые золотисто-алые искорки мурчания поднимаются над котом!
            const p01 = clamp01(petElapsed / 2400);
            for (let k = 0; k < 3; k++) {
                const kp = clamp01((p01 * 1.4) - k * 0.18);
                if (kp <= 0 || kp >= 1) continue;
                const ka = Math.sin(kp * Math.PI) * 0.88;
                const kx = hx - 2 + (k - 1) * 9 + Math.sin(kp * 5 + k) * 3;
                const ky = hy - 14 - kp * 22;
                radialAura(g, kx, ky, 6, '#ffe694', '#ff6474', ka * 0.55);
                g.fillStyle = `rgba(255, 240, 184, ${ka.toFixed(3)})`;
                g.beginPath(); g.arc(kx, ky, 1.4, 0, Math.PI * 2); g.fill();
            }
        }
    }

    g.restore();
}

// ===== ЖИВОЙ ПЁС-ХРАНИТЕЛЬ НА СВОЁМ ТЁПЛОМ ЛЕЖАКЕ У КОВРА (7 ПОРОД ПО ID · ДРУЖИТ С КОТОМ!) =====
function drawCompanionDog(g, now, phase, still) {
    const uid = (typeof player !== 'undefined' && (player.uid || player.name)) || 'guest';
    const override = Number.isInteger(roomAnim.inspectDogBreed) ? roomAnim.inspectDogBreed : null;
    const dog = dogSpec(uid, override);
    const b = dog.breed;
    const t = still ? 1.4 : now * 0.001;

    // Уютное собственное место пса слева на персидском ковре у рабочего стола (x=226, y=424) —
    // смотрит вправо-вперёд на цветок и кота на кушетке, не задевая ни свечи (x=256, y=372), ни растение!
    const cx = 226, cy = 424;

    // Глубокое тёплое собачье дыхание (мягкий подъём грудной клетки и спины)
    const breathRaw = still ? 0.45 : (0.5 + 0.5 * Math.sin(t * 2.05 + 0.7));
    const breath = breathRaw * breathRaw * (3 - 2 * breathRaw);
    const rise = breath * 4.0;
    const rib = breath * 1.75;

    const petElapsed = now - (roomAnim.dogPetStart || -1e9);
    const isPetted = !still && petElapsed > 0 && petElapsed < 3200;
    const petK = isPetted ? softBell(petElapsed, 220, 1850, 950) : 0;
    const headLift = petK * 4.4;
    const headTilt = petK * -0.075;

    // Живой хвост: в покое умиротворённо покачивается, а от поглаживания радостно виляет!
    const wag = still
        ? 0
        : isPetted
            ? Math.sin(t * 15.5) * (6.2 * petK + 1.5)
            : (Math.sin(t * 1.45) * 2.4 + (Math.sin(t * 0.42) > 0.86 ? Math.sin(t * 9.5) * 2.6 : 0));

    // Чуткое ушко ловит ночные звуки города, а во сне изредка чуть подрагивает лапка
    const earPerk = petK * 2.4 + ((!still && Math.sin(t * 0.72 + 2.1) > 0.93) ? Math.sin(t * 18) * 1.6 : 0);
    const pawTwitch = (!still && !isPetted && Math.sin(t * 0.58 + 0.4) > 0.965) ? Math.sin(t * 24) * 0.9 : 0;
    const lazyPeek = !still && !isPetted && ((t + 4.5) % 13) > 10.4 && ((t + 4.5) % 13) < 12.2;
    const nlBoost = !still ? softBell(now - roomAnim.nightLStart, 650, 900, 1700) : 0;

    const warmK = phase === 3 ? 0.12 : 0.18;
    const creamWarm = mixHex(b.cream, '#ffc4ad', warmK);
    const furLight = mixHex(b.light, '#ffba9e', 0.1);
    const furMid = mixHex(b.mid, '#5c1420', 0.1);

    g.save();

    // 1. Тёплый живой ореол на ковре (дышит в такт псу и откликается на рассвет и ласку)
    g.save();
    g.globalCompositeOperation = 'screen';
    const auraA = 0.19 + breath * 0.1 + petK * 0.16 + nlBoost * 0.08 + (phase === 3 ? 0.07 : 0);
    radialAura(g, cx + 2, cy + 1, 56, '#ffbe6e', '#b82238', auraA);
    g.restore();

    // 2. Собственный плетёный шерстяной лежак винно-орехового оттенка на персидском ковре
    // Мягкая тень лежака по ворсу ковра
    g.save();
    g.translate(cx + 1, cy + 9.2);
    g.scale(1, 0.31);
    if (g.createRadialGradient) {
        const sg = g.createRadialGradient(0, 0, 12, 0, 0, 46);
        sg.addColorStop(0, 'rgba(4, 1, 2, 0.9)');
        sg.addColorStop(0.68, 'rgba(6, 1, 2, 0.58)');
        sg.addColorStop(1, 'rgba(6, 1, 2, 0)');
        g.fillStyle = sg;
    } else g.fillStyle = 'rgba(5, 1, 2, 0.7)';
    g.beginPath(); g.arc(0, 0, 46, 0, Math.PI * 2); g.fill();
    g.restore();

    // Внешний пухлый бортик лежака (тёплая бордовая шерсть с золотисто-медной прострочкой)
    if (g.createLinearGradient) {
        const mg = g.createLinearGradient(cx, cy - 4, cx, cy + 16);
        mg.addColorStop(0, '#5c1824');
        mg.addColorStop(0.48, '#3a0d16');
        mg.addColorStop(1, '#180408');
        g.fillStyle = mg;
    } else g.fillStyle = '#3a0d16';
    g.beginPath();
    g.ellipse(cx + 1, cy + 6.4, 38.5, 11.4, 0.02, 0, Math.PI * 2);
    g.fill();
    // Мягкая внутренняя подушка лежака
    if (g.createRadialGradient) {
        const ig = g.createRadialGradient(cx + 2, cy + 4, 4, cx + 1, cy + 5.2, 32);
        ig.addColorStop(0, '#2a0910');
        ig.addColorStop(0.7, '#47121c');
        ig.addColorStop(1, '#24070c');
        g.fillStyle = ig;
    } else g.fillStyle = '#330b13';
    g.beginPath();
    g.ellipse(cx + 1, cy + 4.9, 32.5, 8.2, 0.02, 0, Math.PI * 2);
    g.fill();
    // Тёплый блик и ручной шов по переднему краю лежака
    g.strokeStyle = phase === 3 ? 'rgba(255, 192, 128, 0.42)' : 'rgba(232, 112, 116, 0.34)';
    g.lineWidth = 1.05;
    g.beginPath();
    g.ellipse(cx + 1, cy + 6.2, 37.6, 10.6, 0.02, Math.PI * 0.08, Math.PI * 0.92);
    g.stroke();

    // 3. ЖИВОЙ ХВОСТ (слева у бедра — три уникальные формы по породе: колечко, пушистое перо или помпон корги!)
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (b.tail === 'curled') {
        // Пышный закрученный хвост-колечко сиба-ину и самоеда с кремовой изнанкой!
        const tx = cx - 22 + wag * 0.48, ty = cy - 11.5 - rise * 0.55 + Math.abs(wag) * 0.14;
        g.strokeStyle = b.dark;
        g.lineWidth = b.pattern === 'samoyed' ? 8.8 : 7.4;
        g.beginPath();
        g.moveTo(cx - 21, cy + 1);
        g.bezierCurveTo(cx - 31 + wag * 0.35, cy - 6, tx - 6, ty - 7, tx + 3.5, ty - 1.5);
        g.stroke();
        g.strokeStyle = b.pattern === 'samoyed' ? creamWarm : furLight;
        g.lineWidth = b.pattern === 'samoyed' ? 6.8 : 5.4;
        g.stroke();
        // Кремовая пушистая внутренняя спираль хвоста
        g.strokeStyle = b.pattern === 'samoyed' ? '#fff6f4' : creamWarm;
        g.lineWidth = 2.6;
        g.beginPath();
        g.arc(tx, ty - 1.2, 3.8, Math.PI * 0.15, Math.PI * 1.45);
        g.stroke();
    } else if (b.tail === 'bob') {
        // Очаровательный пушистый кремовый хвостик-помпон вельш-корги (очень смешно виляет при ласке!)
        const bx0 = cx - 25.5 + wag * 0.42, by0 = cy - 3.2 - rise * 0.4 - Math.abs(wag) * 0.25;
        g.fillStyle = b.dark;
        g.beginPath(); g.ellipse(bx0, by0, 5.4, 4.4, -0.3 + wag * 0.04, 0, Math.PI * 2); g.fill();
        g.fillStyle = creamWarm;
        g.beginPath(); g.ellipse(bx0 + 0.3, by0 - 0.3, 4.4, 3.5, -0.3 + wag * 0.04, 0, Math.PI * 2); g.fill();
    } else {
        // Длинный пушистый хвост-перо (ретривер, хаски, спаниель, бордер-колли)
        const tipX = cx - 37 + wag * 0.45;
        const tipY = cy - 4.5 - wag * 0.85 - (isPetted ? 4.5 * petK : 0);
        const ctrlX = cx - 32, ctrlY = cy + 5.2 - wag * 0.35;
        g.strokeStyle = b.dark;
        g.lineWidth = 6.8;
        g.beginPath();
        g.moveTo(cx - 20, cy + 2.5);
        g.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
        g.stroke();
        g.strokeStyle = furMid;
        g.lineWidth = 5.0;
        g.stroke();
        // Шёлковый светлый подвес хвоста и снежно-белый кончик у хаски и колли
        g.strokeStyle = (b.pattern === 'husky' || b.pattern === 'collie') ? creamWarm : mixHex(b.light, b.cream, 0.5);
        g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(cx - 23, cy + 3.8);
        g.quadraticCurveTo(ctrlX, ctrlY + 1.4, tipX, tipY);
        g.stroke();
        if (b.pattern === 'collie' || b.pattern === 'husky') {
            g.fillStyle = creamWarm;
            g.beginPath(); g.ellipse(tipX, tipY, 3.2, 2.3, -0.3, 0, Math.PI * 2); g.fill();
        }
    }
    g.restore();

    // 4. ОКРУГЛОЕ ТЁПЛОЕ ТЕЛО ПСА С ЖИВЫМ ДЫХАНИЕМ И ПОРОДНЫМ ОКРАСОМ
    const bodyTop = cy - 15.8 - rise;
    if (g.createRadialGradient) {
        const bg = g.createRadialGradient(cx - 1, cy - 8 - rise * 0.7, 3, cx - 2, cy, 30);
        bg.addColorStop(0, furLight);
        bg.addColorStop(0.58, furMid);
        bg.addColorStop(1, b.dark);
        g.fillStyle = bg;
    } else g.fillStyle = furMid;

    g.save();
    g.beginPath();
    g.moveTo(cx - 24, cy + 4.5);
    g.bezierCurveTo(cx - 27 - rib * 0.4, cy - 9 - rise * 0.65, cx - 12, bodyTop, cx + 6, bodyTop + 1.2);
    g.bezierCurveTo(cx + 19 + rib * 0.8, bodyTop + 3.2, cx + 23 + rib, cy - 1, cx + 20, cy + 6.2);
    g.bezierCurveTo(cx + 8, cy + 9.2, cx - 14, cy + 8.8, cx - 24, cy + 4.5);
    g.closePath();
    g.fill();
    g.clip();

    // Мягкий кремовый подшёрсток животика и породные пятна/воротник
    g.fillStyle = mixHex(b.cream, b.light, b.pattern === 'spaniel' ? 0.52 : 0.18, 0.72);
    g.beginPath(); g.ellipse(cx + 2, cy + 6.8, 19, 5.2, 0, 0, Math.PI * 2); g.fill();

    if (b.pattern === 'corgi' || b.pattern === 'collie') {
        // Белоснежный воротник-манишка на плечах корги и бордер-колли
        g.fillStyle = creamWarm;
        g.beginPath(); g.ellipse(cx + 10.5, cy - 1.5, 8.2, 13.5, 0.22, 0, Math.PI * 2); g.fill();
    } else if (b.pattern === 'husky') {
        // Серебристо-кремовое плечо и бедро северного хаски
        g.fillStyle = mixHex(b.cream, b.light, 0.22, 0.8);
        g.beginPath(); g.ellipse(cx + 11, cy + 2.5, 8.5, 7.5, 0.2, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(cx - 14, cy + 4.5, 9, 5, -0.1, 0, Math.PI * 2); g.fill();
    } else if (b.pattern === 'golden' || b.pattern === 'samoyed') {
        // Мягкие пушистые пряди шёлковой шерсти на боку
        g.strokeStyle = mixHex(b.cream, '#ffffff', 0.25, 0.36);
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(cx - 14, cy - 5 - rise * 0.5); g.quadraticCurveTo(cx - 4, cy - 2, cx + 6, cy - 4 - rise * 0.4);
        g.moveTo(cx - 16, cy - 0.5); g.quadraticCurveTo(cx - 5, cy + 2.5, cx + 5, cy + 0.5);
        g.stroke();
    } else if (b.pattern === 'spaniel') {
        // Шелковистый каштаново-медный отлив шерсти спаниеля
        g.strokeStyle = mixHex(b.light, b.cream, 0.38, 0.4);
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(cx - 14, cy - 4 - rise * 0.5); g.quadraticCurveTo(cx - 4, cy - 1, cx + 5, cy - 3 - rise * 0.4);
        g.stroke();
    }

    // Уютно поджатое заднее бедро с мягкой естественной светотенью
    g.strokeStyle = mixHex(b.dark, '#090204', 0.4, 0.55);
    g.lineWidth = 1.35;
    g.beginPath();
    g.arc(cx - 13.5, cy + 1.2 - rise * 0.22, 8.6, Math.PI * 1.18, Math.PI * 1.9);
    g.stroke();
    g.restore();

    // Мягкий золотисто-алый контровой свет окна и свечей по спинке пса
    g.strokeStyle = mixHex(b.rim, phase === 3 ? '#ffe29c' : '#ff9882', phase === 3 ? 0.45 : 0.3, 0.56);
    g.lineWidth = 1.25;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - 20, cy - 4.5 - rise * 0.45);
    g.bezierCurveTo(cx - 12, bodyTop + 0.2, cx + 3, bodyTop + 0.8, cx + 12, cy - 9 - rise * 0.5);
    g.stroke();

    // 5. ПЫШНАЯ НАТУРАЛЬНАЯ ГРУДКА И ВЫТЯНУТЫЕ ВПЕРЁД ЛАПКИ НА БОРТИКЕ ЛЕЖАКА (никаких ленточек!)
    const chestCol = (b.pattern === 'spaniel')
        ? mixHex(b.mid, b.cream, 0.42)
        : (b.pattern === 'golden' ? mixHex(b.light, b.cream, 0.65) : creamWarm);
    g.fillStyle = chestCol;
    g.beginPath();
    g.ellipse(cx + 12.5, cy + 1.2 - rise * 0.3, (b.pattern === 'samoyed' || b.pattern === 'collie') ? 8.8 : 7.5, 6.2, -0.15, 0, Math.PI * 2);
    g.fill();

    // Задняя лапка, выглядывающая у бедра
    const pawHexA = (b.pattern === 'golden') ? b.light : b.cream;
    const pawHexB = b.cream;
    g.fillStyle = mixHex(pawHexA, b.dark, 0.26);
    g.beginPath(); g.ellipse(cx - 8.5, cy + 6.9, 4.8, 2.5, 0.08, 0, Math.PI * 2); g.fill();

    // Две передние лапки, доверчиво сложенные впереди на бортике лежака
    // Дальняя правая лапка
    g.fillStyle = mixHex(pawHexA, b.dark, 0.16);
    g.beginPath(); g.ellipse(cx + 22.8 + pawTwitch, cy + 6.5, 5.8, 2.7, -0.1, 0, Math.PI * 2); g.fill();
    // Ближняя левая лапка
    g.fillStyle = (b.pattern === 'golden') ? mixHex(b.light, pawHexB, 0.58) : creamWarm;
    g.beginPath(); g.ellipse(cx + 13.6 - pawTwitch * 0.5, cy + 7.6, 6.2, 2.9, 0.08, 0, Math.PI * 2); g.fill();
    // Аккуратные складочки пальчиков на лапках
    g.strokeStyle = mixHex(b.dark, '#2b0a10', 0.35, 0.45);
    g.lineWidth = 0.75;
    g.beginPath();
    g.moveTo(cx + 16.5, cy + 6.8); g.lineTo(cx + 18.4, cy + 7.4);
    g.moveTo(cx + 16.2, cy + 8.1); g.lineTo(cx + 18.2, cy + 8.5);
    g.moveTo(cx + 25.5, cy + 5.9); g.lineTo(cx + 27.2, cy + 6.3);
    g.stroke();

    // 6. ВЫРАЗИТЕЛЬНАЯ СОБАЧЬЯ ГОЛОВА, УШИ, МОРДОЧКА, МОКРЫЙ НОС И ЖИВЫЕ ГЛАЗА!
    const hx = cx + 14.8, hy = cy - 6.2 - rise * 0.42 - headLift;
    g.save();
    g.translate(hx, hy);
    g.rotate(headTilt);

    // 6а. Дальнее (правое) ухо — рисуется ЗА головой для настоящего 3D-объёма
    const earOuterFar = (b.pattern === 'samoyed') ? mixHex(b.light, b.mid, 0.32) : mixHex(b.mid, b.dark, 0.32);
    const earOuterNear = (b.pattern === 'samoyed') ? mixHex(b.cream, b.light, 0.35) : mixHex(b.mid, b.dark, 0.18);
    const drawPointedEar = (ex, ey, w, h, rot, roundTip, outerCol) => {
        g.save();
        g.translate(ex, ey);
        g.rotate(rot);
        g.fillStyle = outerCol;
        g.beginPath();
        g.moveTo(-w, 1);
        if (roundTip) {
            g.quadraticCurveTo(-w * 0.9, -h, 0, -h);
            g.quadraticCurveTo(w * 0.9, -h, w, 1);
        } else {
            g.quadraticCurveTo(-w * 0.48, -h * 0.74, 0, -h);
            g.quadraticCurveTo(w * 0.55, -h * 0.74, w, 1);
        }
        g.closePath();
        g.fill();
        // Нежная розовато-кремовая серединка ушка и пушок
        g.fillStyle = mixHex(b.earIn, b.cream, b.pattern === 'samoyed' ? 0.42 : 0.28, 0.88);
        g.beginPath();
        g.moveTo(-w * 0.52, 0.2);
        g.quadraticCurveTo(0, -h * 0.8, w * 0.52, 0.2);
        g.closePath();
        g.fill();
        g.restore();
    };

    const perkRad = earPerk * 0.035;
    if (b.ears === 'pointed') {
        drawPointedEar(4.6, -6.2, 4.1, 7.6, 0.28 - perkRad, b.pattern === 'samoyed', earOuterFar);
    } else if (b.ears === 'corgi') {
        drawPointedEar(5.2, -5.8, 4.7, 9.6, 0.34 - perkRad, true, earOuterFar);
    } else if (b.ears === 'tipped') {
        // Чуткое полустоячее ухо бордер-колли с загнутым вперёд кончиком!
        drawPointedEar(4.6, -6.0, 4.0, 7.4, 0.25 - perkRad, false, earOuterFar);
        g.fillStyle = mixHex(b.dark, b.light, 0.2);
        g.beginPath(); g.ellipse(6.8, -11.2 - earPerk * 0.2, 2.7, 1.65, 0.42, 0, Math.PI * 2); g.fill();
    } else if (b.ears === 'floppy' || b.ears === 'longfloppy') {
        // Дальнее мягкое висячее ушко ретривера / спаниеля (тёплый карамельный / шоколадный оттенок!)
        const eh = b.ears === 'longfloppy' ? 11.8 : 8.5;
        g.fillStyle = mixHex(b.mid, b.dark, 0.42);
        g.beginPath();
        g.ellipse(7.5, 0.8 - earPerk * 0.2, 3.5, eh * 0.54, -0.16, 0, Math.PI * 2);
        g.fill();
    }

    // 6б. Округлый лоб и щёчки пса
    if (g.createRadialGradient) {
        const hg = g.createRadialGradient(0, -3.2, 1.5, 0, 0, 12.2);
        hg.addColorStop(0, furLight);
        hg.addColorStop(0.64, furMid);
        hg.addColorStop(1, b.dark);
        g.fillStyle = hg;
    } else g.fillStyle = furMid;
    g.beginPath();
    g.ellipse(0, 0, 10.6, 8.8, -0.05, 0, Math.PI * 2);
    g.fill();

    // Породные маски на голове (урадзиро сиба-ину, маска хаски, белая проточина корги и колли, пушистые щёки самоеда!)
    if (b.pattern === 'shiba') {
        // Две пухлые кремовые щёчки «урадзиро», между которыми мягко спускается рыжий лобик!
        g.fillStyle = creamWarm;
        g.beginPath(); g.ellipse(-1.4, 3.8, 5.8, 4.2, 0.12, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(4.8, 3.6, 5.2, 4.0, -0.1, 0, Math.PI * 2); g.fill();
    } else if (b.pattern === 'husky') {
        // Фирменная снежная «маска-трилистник» хаски вокруг глаз и щёк
        g.fillStyle = creamWarm;
        g.beginPath(); g.ellipse(1.8, 3.2, 8.6, 5.1, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(-1.4, -1.2, 3.3, 3.6, -0.12, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(5.0, -1.3, 3.0, 3.4, 0.12, 0, Math.PI * 2); g.fill();
    } else if (b.pattern === 'corgi' || b.pattern === 'collie') {
        // Изящная белая проточина ото лба к носу
        g.fillStyle = creamWarm;
        g.beginPath();
        g.moveTo(1.8, -7.2);
        g.quadraticCurveTo(0.2, -1.0, -0.8, 4.5);
        g.lineTo(6.2, 4.5);
        g.quadraticCurveTo(4.6, -1.0, 3.2, -7.2);
        g.closePath();
        g.fill();
    } else if (b.pattern === 'samoyed') {
        // Облачные белоснежные пушистые щёчки самоеда
        g.fillStyle = creamWarm;
        g.beginPath(); g.ellipse(-5.5, 2.2, 5.4, 4.4, 0.2, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(1.2, 2.2, 9.2, 6.2, 0, 0, Math.PI * 2); g.fill();
    }

    // 6в. Объёмная собачья мордочка (выступает вперёд-вправо — 100% живой пёс с первого взгляда!)
    const snoutCol = (b.pattern === 'golden')
        ? mixHex(b.light, b.cream, 0.62)
        : (b.pattern === 'spaniel' ? mixHex(b.mid, b.cream, 0.52) : creamWarm);
    // Тёплая спинка носа
    g.fillStyle = (b.pattern === 'corgi' || b.pattern === 'collie' || b.pattern === 'samoyed' || b.pattern === 'husky')
        ? creamWarm
        : mixHex(b.light, b.cream, b.pattern === 'shiba' ? 0.35 : 0.45);
    g.beginPath();
    g.ellipse(6.8, 2.2, 6.2, 4.2, 0.08, 0, Math.PI * 2);
    g.fill();
    // Мягкие подушечки брылей
    g.fillStyle = snoutCol;
    g.beginPath();
    g.ellipse(6.5, 3.4, 5.8, 3.5, 0.06, 0, Math.PI * 2);
    g.fill();

    // Маленький розовый язычок счастья, когда пса гладят!
    if (isPetted && petK > 0.25) {
        const pant = Math.sin(t * 11) * 0.45;
        g.fillStyle = '#f26d82';
        g.beginPath();
        g.ellipse(8.2, 6.0 + pant * 0.5, 1.85, 2.1 + pant * 0.3, 0.12, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(130, 26, 44, 0.55)';
        g.lineWidth = 0.55;
        g.beginPath(); g.moveTo(8.2, 4.8); g.lineTo(8.3, 6.9); g.stroke();
    }

    // Добрая собачья улыбка (особенно выразительная у самоеда, корги, сибы и при поглаживании!)
    g.strokeStyle = 'rgba(26, 7, 10, 0.82)';
    g.lineWidth = 0.9;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(10.6, 2.8); g.lineTo(9.8, 4.5);
    g.moveTo(9.8, 4.5); g.quadraticCurveTo(7.4, 5.8 + petK * 0.7, 4.6, 4.2 - petK * 0.5);
    g.moveTo(9.8, 4.5); g.quadraticCurveTo(11.3, 5.3, 12.0, 4.2);
    g.stroke();

    // Блестящий влажный кожаный нос пуговкой с живым бликом!
    g.fillStyle = b.nose;
    g.beginPath();
    g.ellipse(11.2, 1.5, 2.55, 1.95, -0.08, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255, 240, 236, 0.78)';
    g.beginPath();
    g.ellipse(10.6, 0.85, 1.05, 0.55, -0.2, 0, Math.PI * 2);
    g.fill();

    // 6г. Выразительные бровки-пятнышки (у сиба-ину, спаниеля, корги и по ID) и живые душевные глаза!
    if (b.pattern === 'shiba' || b.pattern === 'spaniel' || b.pattern === 'corgi' || (dog.browSpot && b.pattern === 'collie')) {
        g.fillStyle = creamWarm;
        g.beginPath();
        g.ellipse(-1.1, -3.4 - petK * 0.45, 1.35, 0.85, -0.15, 0, Math.PI * 2);
        g.ellipse(5.3, -3.5 - petK * 0.45, 1.2, 0.8, 0.15, 0, Math.PI * 2);
        g.fill();
    }

    if (lazyPeek) {
        // Тёплый преданный взгляд живых собачьих глаз с искоркой!
        const drawDogEye = (ex, ey, rx, col) => {
            g.fillStyle = '#140507';
            g.beginPath(); g.ellipse(ex, ey, rx, rx * 0.95, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = col;
            g.beginPath(); g.ellipse(ex + 0.15, ey + 0.1, rx * 0.68, rx * 0.65, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#120406';
            g.beginPath(); g.arc(ex + 0.25, ey + 0.05, rx * 0.42, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#fffaf0';
            g.beginPath(); g.arc(ex - 0.45, ey - 0.55, 0.68, 0, Math.PI * 2); g.fill();
        };
        drawDogEye(-0.8, -0.8, 1.95, b.eyeL);
        drawDogEye(5.6, -0.9, 1.75, b.eyeR);
    } else if (isPetted) {
        // Счастливые прищуренные дуги-улыбки от вашей ладони + тёплый румянец на щёчках!
        g.strokeStyle = '#160508';
        g.lineWidth = 1.3;
        g.beginPath();
        g.arc(-0.8, 0.2, 2.0, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
        g.beginPath();
        g.arc(5.6, 0.0, 1.8, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
        g.fillStyle = 'rgba(255, 128, 132, 0.28)';
        g.beginPath(); g.ellipse(-2.6, 2.2, 2.2, 1.2, 0, 0, Math.PI * 2); g.fill();
    } else {
        // Умиротворённо сомкнутые сонные веки спящего пса
        g.strokeStyle = 'rgba(22, 6, 9, 0.86)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(-0.8, -1.2, 1.95, Math.PI * 0.16, Math.PI * 0.84);
        g.stroke();
        g.beginPath();
        g.arc(5.6, -1.3, 1.75, Math.PI * 0.16, Math.PI * 0.84);
        g.stroke();
    }

    // 6д. Ближнее (левое) ухо — ПОВЕРХ головы, задаёт неповторимый живой силуэт породы!
    if (b.ears === 'pointed') {
        drawPointedEar(-4.8, -5.8, 4.5, 8.2, -0.26 + perkRad, b.pattern === 'samoyed', earOuterNear);
    } else if (b.ears === 'corgi') {
        drawPointedEar(-5.4, -5.2, 5.1, 10.4, -0.34 + perkRad, true, earOuterNear);
    } else if (b.ears === 'tipped') {
        drawPointedEar(-4.8, -5.6, 4.3, 7.9, -0.22 + perkRad, false, earOuterNear);
        g.fillStyle = mixHex(b.dark, b.light, 0.28);
        g.beginPath(); g.ellipse(-5.2, -11.4 - earPerk * 0.2, 3.0, 1.8, 0.28, 0, Math.PI * 2); g.fill();
    } else if (b.ears === 'floppy') {
        // Бархатное карамельно-золотое висячее ушко золотистого ретривера!
        g.save();
        g.translate(-6.2, -4.5 - earPerk * 0.22);
        g.rotate(0.12 - perkRad * 0.6);
        g.fillStyle = mixHex(b.mid, b.dark, 0.22);
        g.beginPath();
        g.moveTo(-2.5, 0);
        g.bezierCurveTo(-5.8, 3.5, -5.2, 10.4, -1.2, 11.0);
        g.bezierCurveTo(2.4, 11.2, 3.5, 5.2, 2.2, 0.5);
        g.closePath();
        g.fill();
        g.fillStyle = mixHex(b.light, b.mid, 0.55, 0.72);
        g.beginPath();
        g.ellipse(-1.4, 5.6, 2.4, 4.2, 0.08, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = mixHex(b.rim, '#ffd29a', 0.4, 0.55);
        g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(-2.4, 0.6); g.quadraticCurveTo(-4.8, 5.2, -1.6, 9.8); g.stroke();
        g.restore();
    } else if (b.ears === 'longfloppy') {
        // Длинное шелковистое шоколадно-каштановое волнистое ухо спаниеля, ниспадающее к плечу!
        g.save();
        g.translate(-6.0, -4.2 - earPerk * 0.2);
        g.rotate(0.08 - perkRad * 0.5);
        g.fillStyle = mixHex(b.mid, b.dark, 0.28);
        g.beginPath();
        g.moveTo(-2.2, 0);
        g.bezierCurveTo(-6.4, 4.5, -7.0, 12.8, -2.6, 14.5);
        g.bezierCurveTo(1.4, 15.2, 3.5, 11.2, 2.0, 1.0);
        g.closePath();
        g.fill();
        // Шёлковые шоколадно-медные локоны на ушке
        g.strokeStyle = mixHex(b.light, b.rim, 0.42, 0.65);
        g.lineWidth = 1.0;
        g.beginPath();
        g.moveTo(-2.2, 2.0); g.quadraticCurveTo(-4.9, 7.6, -2.5, 13.0);
        g.moveTo(0.2, 3.2);  g.quadraticCurveTo(-1.4, 8.2, 0.0, 12.4);
        g.stroke();
        g.restore();
    }

    // Тёплый блик света по макушке лба
    g.strokeStyle = mixHex(b.rim, '#ffe2b8', 0.4, 0.45);
    g.lineWidth = 0.95;
    g.beginPath();
    g.arc(0.4, -0.5, 8.2, Math.PI * 1.28, Math.PI * 1.7);
    g.stroke();

    g.restore(); // конец трансформации головы

    // 7. Тёплое сонное дыхание у мокрого носа и живые золотые огоньки радости при поглаживании!
    if (!still) {
        const exhale = ((t + 0.9) * 0.34) % 1;
        const exA = Math.sin(exhale * Math.PI) * 0.25;
        if (exA > 0.04 && !isPetted) {
            g.fillStyle = `rgba(255, 218, 174, ${exA.toFixed(3)})`;
            g.beginPath();
            g.arc(hx + 13 + exhale * 5, hy - 1 - exhale * 11, 1.0 + exhale * 1.05, 0, Math.PI * 2);
            g.fill();
        }
        if (isPetted) {
            const p01 = clamp01(petElapsed / 2600);
            const sparkX = [-12, -2, 9];
            const sparkRise = [22, 28, 19];
            for (let k = 0; k < 3; k++) {
                const kp = clamp01((p01 * 1.45) - k * 0.18);
                if (kp <= 0 || kp >= 1) continue;
                const ka = Math.sin(kp * Math.PI) * 0.88;
                const kx = hx + sparkX[k] + Math.sin(kp * 5.4 + k * 2.1) * 3.5;
                const ky = hy - 13 - kp * sparkRise[k];
                radialAura(g, kx, ky, 6.2, '#ffe89c', '#ff6b78', ka * 0.55);
                g.fillStyle = `rgba(255, 244, 192, ${ka.toFixed(3)})`;
                g.beginPath(); g.arc(kx, ky, 1.35, 0, Math.PI * 2); g.fill();
            }
        }
    }

    g.restore();
}

function drawRoomCosmetics(g, now, phase) {
    const cosm = getRoomCosmeticsSafe();
    const still = prefersStillRoom();
    const t = still ? 1.5 : now * 0.001;

    // 1) «Тёплые огни у окна» (room_garland): 13 винтажных янтарных лампочек Эдисона по каменной арке окна!
    if (cosm.garland) {
        g.save();
        const bulbs = 13;
        const wirePts = [];
        for (let i = 0; i < bulbs; i++) {
            const u = i / (bulbs - 1);
            // Дуга по верхнему каменному своду круглого окна (от 196° до 344°) с мягким провисом провода
            const ang = Math.PI * (1.07 + u * 0.86);
            const sag = Math.sin(u * Math.PI * 4) * 2.2;
            const bx = WIN_CX + Math.cos(ang) * (WIN_RX + 14.5);
            const by = WIN_CY + Math.sin(ang) * (WIN_RY + 13.5) + Math.abs(sag);
            wirePts.push([bx, by]);
        }
        // Тёмный витой провод и патроны
        g.strokeStyle = 'rgba(24, 6, 9, 0.9)';
        g.lineWidth = 1.35;
        g.beginPath();
        wirePts.forEach(([x, y], i) => {
            if (i === 0) g.moveTo(x, y - 2);
            else {
                const [px, py] = wirePts[i - 1];
                g.quadraticCurveTo((px + x) * 0.5, (py + y) * 0.5 + 3.2, x, y - 2);
            }
        });
        g.stroke();

        // Мягкое янтарно-золотое свечение каждой лампочки Эдисона на старинном кирпиче
        g.save();
        g.globalCompositeOperation = 'screen';
        for (let i = 0; i < bulbs; i++) {
            const [bx, by] = wirePts[i];
            const tw = still ? 0.85 : (0.76 + 0.24 * Math.sin(t * 2.1 + i * 1.37));
            const swing = still ? 0 : Math.sin(t * 1.1 + i * 0.8) * 0.6;
            radialAura(g, bx + swing, by + 3.4, 22, '#ffc468', '#c82e3e', tw * 0.34);
            radialAura(g, bx + swing, by + 3.4, 7.5, '#fff2be', '#ff9848', tw * 0.62);
        }
        g.restore();

        // Стеклянные колбы и раскалённые вольфрамовые нити
        for (let i = 0; i < bulbs; i++) {
            const [bx, by] = wirePts[i];
            const tw = still ? 0.9 : (0.8 + 0.2 * Math.sin(t * 2.1 + i * 1.37));
            const swing = still ? 0 : Math.sin(t * 1.1 + i * 0.8) * 0.6;
            g.fillStyle = '#2a0d0e';
            g.fillRect(bx - 1.3, by - 1.5, 2.6, 2.4);
            g.fillStyle = `rgba(255, 214, 126, ${(tw * 0.92).toFixed(3)})`;
            g.beginPath(); g.ellipse(bx + swing, by + 3.5, 2.3, 3.2, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = `rgba(255, 250, 224, ${tw.toFixed(3)})`;
            g.beginPath(); g.arc(bx + swing, by + 3.3, 1.15, 0, Math.PI * 2); g.fill();
        }
        g.restore();
    }

    // 2) «Ночной экспресс и винил» (room_tape): вращающаяся пластинка на проигрывателе слева + живой VU-эквалайзер!
    //    (Плюс светящийся ночной поезд идёт по мосту за круглым окном в drawWindowWorld!)
    if (cosm.tape) {
        g.save();
        // Вращающийся виниловый диск на вертушке (cx=50, cy=260.5)
        const vx = 50, vy = 260.5, vrx = 21.5, vry = 3.6;
        g.fillStyle = '#0b0305';
        g.beginPath(); g.ellipse(vx, vy, vrx, vry, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(180, 68, 82, 0.42)';
        g.lineWidth = 0.8;
        g.stroke();

        // Бегущий шёлковый блик по дорожкам вращающегося винила
        const spin = still ? 0.6 : t * 2.8;
        for (let k = 0; k < 2; k++) {
            const a0 = spin + k * Math.PI;
            g.strokeStyle = 'rgba(255, 192, 152, 0.42)';
            g.lineWidth = 1.2;
            g.beginPath();
            g.ellipse(vx, vy, vrx * 0.74, vry * 0.74, 0, a0, a0 + 0.65);
            g.stroke();
        }
        // Тёплое ало-золотое «яблоко» пластинки в центре
        g.fillStyle = '#d93248';
        g.beginPath(); g.ellipse(vx, vy, 6.2, 1.35, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffe29a';
        g.beginPath(); g.arc(vx + Math.cos(spin) * 2.2, vy, 0.9, 0, Math.PI * 2); g.fill();

        // Опущенный латунный тонарм и янтарный огонёк стробоскопа вертушки
        g.strokeStyle = '#d8a878';
        g.lineWidth = 1.1;
        g.beginPath(); g.moveTo(74, 258.5); g.lineTo(59, 261.2); g.stroke();
        g.fillStyle = '#ffbe55';
        g.fillRect(28, 262.2, 2.2, 1.5);

        // Тёплое свечение над вертушкой и живые янтарные индикаторы усилителя (x=48..76, y=300..306)
        g.save();
        g.globalCompositeOperation = 'screen';
        radialAura(g, vx + 4, vy, 28, '#ffb86b', '#a82038', 0.2);
        radialAura(g, 62, 303, 22, '#ffc46b', '#b82838', 0.22);
        g.restore();

        for (let b = 0; b < 6; b++) {
            const v = still ? 0.6 : (0.35 + 0.65 * Math.abs(Math.sin(t * (3.1 + b * 0.55) + b)));
            const bh = 1.2 + v * 3.8;
            g.fillStyle = v > 0.75 ? '#ffe08a' : '#ff785a';
            g.fillRect(50 + b * 3.6, 305.5 - bh, 2.2, bh);
        }
        g.restore();
    }

    // 3) «Чай и благовония у терминала» (room_steam): тёплая кружка с густым паром + тлеющая палочка сандала!
    if (cosm.steam) {
        g.save();
        // Тёплый янтарный отсвет горячего чая на ободке родной кружки (238, 286) и ярлычок на ниточке
        g.save();
        g.globalCompositeOperation = 'screen';
        radialAura(g, 238, 282, 24, '#ffb878', '#b8263c', 0.24);
        g.restore();
        g.fillStyle = 'rgba(255, 182, 108, 0.72)';
        g.beginPath(); g.ellipse(238, 286.4, 5.2, 1.4, 0, 0, Math.PI * 2); g.fill();
        // Маленький золотисто-алый ярлычок чая сбоку кружки
        g.strokeStyle = 'rgba(255, 210, 180, 0.5)';
        g.lineWidth = 0.6;
        g.beginPath(); g.moveTo(242.5, 287); g.lineTo(244.2, 292.5); g.stroke();
        g.fillStyle = '#d94854';
        g.fillRect(243.1, 292.5, 2.3, 2.6);

        // Объёмные, мягко клубящиеся золотисто-розовые струи горячего пара вверх к лампе
        g.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
            const cycle = still ? (0.2 + i * 0.2) : (((t * 0.34) + i * 0.25) % 1);
            const alpha = Math.sin(cycle * Math.PI) * (phase === 3 ? 0.52 : 0.46);
            if (alpha <= 0.02) continue;
            const sx = 237.8 + (i - 1.5) * 2.0;
            const sy = 285.2 - cycle * 4;
            const topY = sy - 18 - cycle * 26;
            const sway = Math.sin(t * 1.9 + i * 1.8) * (4.5 + cycle * 3.5);
            // Мягкое облачко-ореол пара
            g.strokeStyle = `rgba(255, 178, 152, ${(alpha * 0.42).toFixed(3)})`;
            g.lineWidth = 3.8 - cycle * 1.2;
            g.beginPath();
            g.moveTo(sx, sy);
            g.bezierCurveTo(sx - sway, sy - 11, sx + sway * 1.2, topY + 11, sx + sway * 0.5, topY);
            g.stroke();
            // Яркая шёлковая нить пара
            g.strokeStyle = `rgba(255, 226, 206, ${alpha.toFixed(3)})`;
            g.lineWidth = 1.45 - cycle * 0.5;
            g.stroke();
        }

        // Изящная керамическая подставка с тлеющей палочкой сандала прямо на деревянной столешнице (x=247.5, y=298.8)
        g.fillStyle = '#26090e';
        g.beginPath(); g.ellipse(247.5, 298.8, 5.6, 1.7, -0.05, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(255, 168, 128, 0.38)';
        g.lineWidth = 0.55;
        g.stroke();
        g.strokeStyle = '#7c3a2e';
        g.lineWidth = 0.95;
        g.beginPath(); g.moveTo(245.5, 298.3); g.lineTo(253.2, 289.2); g.stroke();
        // Живой пульсирующий рубиново-золотой уголёк благовония
        const ember = still ? 0.85 : (0.65 + 0.35 * Math.sin(t * 3.4));
        g.save();
        g.globalCompositeOperation = 'screen';
        radialAura(g, 253.4, 289.0, 9.5, '#ffae52', '#d9243c', ember * 0.62);
        g.restore();
        g.fillStyle = '#ffe89c';
        g.beginPath(); g.arc(253.4, 289.0, 1.25, 0, Math.PI * 2); g.fill();
        // Длинная гипнотическая шёлковая лента дымка от благовония
        const wispSway = Math.sin(t * 1.25) * 6.0;
        g.strokeStyle = 'rgba(255, 202, 190, 0.34)';
        g.lineWidth = 1.25;
        g.beginPath();
        g.moveTo(253.4, 288.0);
        g.bezierCurveTo(254 + wispSway * 0.5, 273, 251 - wispSway, 255, 255 + wispSway * 0.6, 236);
        g.stroke();
        g.restore();
    }

    // 4) «Живые свечи станции» (room_candles): тёплые восковые свечи с трепещущим огнём у ковра и на полке!
    if (cosm.candles) {
        const clusters = [
            // Левый край ковра (3 разновеликие свечи)
            { x: 248, y: 376, w: 5.4, h: 14, ph: 0.2 },
            { x: 256, y: 379, w: 6.2, h: 20, ph: 1.4 },
            { x: 264, y: 381, w: 4.8, h: 11, ph: 2.7 },
            // Правый край ковра у кушетки (2 свечи)
            { x: 526, y: 376, w: 5.8, h: 17, ph: 0.9 },
            { x: 534, y: 379, w: 4.8, h: 11, ph: 2.2 },
            // Полка рядом с радиоприёмником (1 уютная свеча)
            { x: 604, y: 250, w: 5.0, h: 13, ph: 3.5 }
        ];
        g.save();
        // Живые тёплые лужицы огненного света на полу, ковре и полке
        g.save();
        g.globalCompositeOperation = 'screen';
        const fL = still ? 0.85 : (0.78 + 0.22 * Math.sin(t * 5.2) * Math.cos(t * 3.1));
        const fR = still ? 0.85 : (0.78 + 0.22 * Math.sin(t * 4.7 + 1.5));
        const fS = still ? 0.85 : (0.8 + 0.2 * Math.sin(t * 5.6 + 2.4));
        radialAura(g, 256, 372, 52, '#ffae54', '#b82234', 0.32 * fL);
        radialAura(g, 530, 372, 44, '#ffae54', '#b82234', 0.28 * fR);
        radialAura(g, 604, 244, 34, '#ffae54', '#b82234', 0.26 * fS);
        g.restore();

        for (let i = 0; i < clusters.length; i++) {
            const cd = clusters[i];
            const topY = cd.y - cd.h;
            // Тень у основания свечи
            g.fillStyle = 'rgba(6, 1, 2, 0.72)';
            g.beginPath(); g.ellipse(cd.x, cd.y + 1.2, cd.w * 0.85, 2.2, 0, 0, Math.PI * 2); g.fill();
            // Тёплый слоново-янтарный воск с алым полутоном внизу
            if (g.createLinearGradient) {
                const wg = g.createLinearGradient(cd.x, topY, cd.x, cd.y);
                wg.addColorStop(0, '#ffdcb0');
                wg.addColorStop(0.35, '#c97864');
                wg.addColorStop(1, '#5e1d24');
                g.fillStyle = wg;
            } else g.fillStyle = '#c97864';
            g.fillRect(cd.x - cd.w * 0.5, topY, cd.w, cd.h);
            // Светящаяся расплавленная лунка воска и фитиль
            g.fillStyle = '#ffe9bd';
            g.beginPath(); g.ellipse(cd.x, topY, cd.w * 0.5, 1.35, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#1f0808';
            g.fillRect(cd.x - 0.4, topY - 2.2, 0.8, 2.2);

            // Трепещущее живое пламя свечи (внешний янтарь + бело-золотое сердце)
            const tilt = still ? 0 : (Math.sin(t * 6.4 + cd.ph) * 1.15 + Math.sin(t * 11.2 + cd.ph) * 0.45);
            const fh = still ? 6.2 : (5.8 + Math.sin(t * 8.3 + cd.ph * 1.7) * 1.1);
            g.save();
            g.globalCompositeOperation = 'screen';
            radialAura(g, cd.x + tilt * 0.4, topY - 4, 11, '#ffd275', '#e04838', 0.52);
            g.restore();

            g.fillStyle = '#ff9838';
            g.beginPath();
            g.moveTo(cd.x, topY - 1.2);
            g.quadraticCurveTo(cd.x - 2.6, topY - fh * 0.5, cd.x + tilt, topY - fh - 1.5);
            g.quadraticCurveTo(cd.x + 2.6, topY - fh * 0.5, cd.x, topY - 1.2);
            g.fill();

            g.fillStyle = '#fff8d4';
            g.beginPath();
            g.ellipse(cd.x + tilt * 0.3, topY - 3.3, 1.1, 2.1, tilt * 0.08, 0, Math.PI * 2);
            g.fill();
        }
        g.restore();
    }

    // 5) Уникальный живой кот игрока на кушетке (room_cat)
    if (cosm.cat) {
        drawCompanionCat(g, now, phase, still);
    }

    // 6) Уникальный живой пёс-хранитель на своём шерстяном лежаке у ковра (room_dog — можно завести вместе с котом!)
    if (cosm.dog) {
        drawCompanionDog(g, now, phase, still);
    }
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

    if (step) {
        if (phase < 3) {
            const speedMul = phase === 0 ? 1 : phase === 1 ? 0.76 : 0.55;
            for (let i = 0; i < FX_RAIN.length; i++) {
                const d = FX_RAIN[i];
                d.y += d.v * speedMul;
                d.x -= d.v * 0.08 * speedMul;
                if (d.y > WIN_CY + WIN_RY || d.x < WIN_CX - WIN_RX) {
                    d.x = WIN_CX + ((((i * 97 + ((now * 0.05) | 0)) % 304) - 152));
                    d.y = WIN_CY - WIN_RY - (i % 18);
                }
            }
            for (let i = 0; i < FX_DROPS.length; i++) {
                const dr = FX_DROPS[i];
                if (dr.pause > 0 && winGlow < 0.25) dr.pause--;
                else {
                    dr.y += dr.v * (1 + winGlow) * speedMul;
                    dr.x += Math.sin(now * 0.0015 + i * 1.7) * 0.06;
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
        if (roomAnim.spec && roomAnim.spec.kind === 6 && roomAnim.stage === 5 && roomAnim.spores.length < 3 && Math.random() < 0.016) {
            spawnPlantSpores(1, true);
        }
        for (let i = roomAnim.spores.length - 1; i >= 0; i--) {
            const sp = roomAnim.spores[i];
            sp.x += sp.vx + Math.sin(now * 0.003 + sp.phase) * (sp.petal ? 0.26 : 0.1);
            sp.y += sp.vy;
            sp.life -= sp.petal ? 0.0085 : 0.014;
            if (sp.life <= 0 || sp.y > 474) roomAnim.spores.splice(i, 1);
        }
    }

    drawWindowWorld(g, now, phase, winGlow);
    drawCrtMonitor(g, now, phase, crtGlow);
    drawRoomCosmetics(g, now, phase);
    drawWindowLightBeams(g, now, phase, winGlow);
    // Мягкий золотой отблеск на ковре от «Светлячков тишины», когда они согревают горшок
    if (roomAnim.fireflyCount > 0 && !roomAnim.fireflyDrowsy) {
        g.save();
        g.globalCompositeOperation = 'screen';
        const fp = prefersStillRoom() ? 0.8 : (0.72 + 0.28 * Math.sin(now * 0.002));
        radialAura(g, 396, 424, 62, '#ffc868', '#c83438', (0.12 + roomAnim.fireflyCount * 0.022) * fp);
        g.restore();
    }
    updateSwingingLamp(g, now);
    updateNightlights(g, now);
    drawCassetteDeck(now);

    // Мягкое тёплое дыхание шкалы радио при касании
    if (radGlow > 0.02) {
        g.save();
        g.globalCompositeOperation = 'screen';
        radialAura(g, 672, 224, 36, '#ff7888', '#a81830', radGlow * 0.18);
        g.restore();
    }

    // Пыльца и опадающие лепестки растения
    for (let i = 0; i < roomAnim.spores.length; i++) {
        const sp = roomAnim.spores[i];
        const a = Math.sin(clamp01(sp.life) * Math.PI) * 0.76;
        if (sp.petal) {
            const bl = roomAnim.spec ? roomAnim.spec.bloom : PLANT_BLOOM[1];
            g.save();
            g.translate(sp.x, sp.y);
            g.rotate(now * 0.002 + sp.phase);
            g.fillStyle = mixHex(bl[1], bl[2], 0.55, a);
            g.beginPath(); g.ellipse(0, 0, 2.5, 1.25, 0, 0, Math.PI * 2); g.fill();
            g.restore();
        } else {
            g.fillStyle = `rgba(255,224,188,${a.toFixed(3)})`;
            g.beginPath(); g.arc(sp.x, sp.y, 1.2, 0, Math.PI * 2); g.fill();
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
    let sway = 0;
    if (!still && roomAnim.stage >= 0 && kind !== 1) {
        const elapsed = (now - roomAnim.plantStart) * 0.001;
        const rustle = (elapsed > 0 && elapsed < 2.4)
            ? Math.exp(-elapsed * 1.6) * Math.sin(elapsed * 5.2) * (kind === 6 || kind === 2 ? 1.5 : 3.8)
            : 0;
        const idle = Math.sin(now * 0.00082) * (kind === 6 ? 1.0 : kind === 2 ? 1.6 : 2.2);
        sway = idle + rustle;
    }
    const cosm = getRoomCosmeticsSafe();
    drawPlantSprite(g, roomAnim.spec, roomAnim.stage, {
        sway,
        glow: touchGlow,
        phase: roomAnim.activePhase,
        soilReady: roomAnim.soilReady,
        dry: roomAnim.soilDry,
        dew: roomAnim.dewActive,
        fireflies: roomAnim.fireflyCount || 0,
        firefliesDrowsy: !!roomAnim.fireflyDrowsy,
        now,
        potSkin: cosm.pot || ''
    });
}

function stationLoop(now) {
    const view = typeof document !== 'undefined' && document.getElementById('view-profile');
    if (!view || view.classList.contains('hidden') || document.hidden || prefersStillRoom()) {
        roomAnim.raf = null;
        return;
    }
    // Полная частота экрана (60–120 fps) во время анимации лампы, кассеты и ночников для идеальной плавности!
    const busy = (now - roomAnim.lampStart < 5500)
        || (now - roomAnim.deckStart < 2950)
        || (now - roomAnim.nightLStart < 3600)
        || (now - roomAnim.nightRStart < 3600)
        || roomAnim.ripples.length > 0;
    if (busy || now - roomAnim.lastFrame >= 33) {
        const stepWorld = (now - roomAnim.lastFrame) >= 28;
        if (stepWorld) roomAnim.lastFrame = now;
        drawStationFx(now, stepWorld);
        if (!roomAnim.lastPlantFrame || now - roomAnim.lastPlantFrame >= 45) {
            roomAnim.lastPlantFrame = now;
            paintPlantFrame(now);
        }
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
    if (entry) {
        entry.textContent = text;
        if (pulse && entry.classList) {
            entry.classList.remove('is-fresh');
            void entry.offsetWidth;
            entry.classList.add('is-fresh');
        }
    }
    if (pulse && roomAnim.isFullscreen) showFullscreenCaption(text);
}

// ===== НАСТОЯЩИЙ СИСТЕМНЫЙ ПОЛНОЭКРАННЫЙ РЕЖИМ (NATIVE FULLSCREEN API + TELEGRAM + ПЛАВНАЯ WAAPI-АНИМАЦИЯ) =====
function isRealTelegramMiniApp() {
    if (typeof window === 'undefined' || !window.Telegram || !window.Telegram.WebApp) return false;
    const tg = window.Telegram.WebApp;
    return typeof tg.initData === 'string' && tg.initData.length > 0;
}

function getNativeFullscreenElement() {
    if (typeof document === 'undefined') return null;
    return document.fullscreenElement
        || document.webkitFullscreenElement
        || document.msFullscreenElement
        || null;
}

function lockLandscapeSafe() {
    try {
        if (typeof screen !== 'undefined' && screen && screen.orientation && typeof screen.orientation.lock === 'function') {
            const lp = screen.orientation.lock('landscape');
            if (lp && typeof lp.catch === 'function') lp.catch(() => {});
        }
    } catch (_) {}
}

function requestNativeRoomFullscreen(room) {
    // 1. В настоящем Telegram Mini App (где передан initData) вызываем системный полноэкранный режим Telegram 8.0+
    if (isRealTelegramMiniApp()) {
        const tg = window.Telegram.WebApp;
        try { if (typeof tg.expand === 'function') tg.expand(); } catch (_) {}
        try {
            const canTgFs = typeof tg.requestFullscreen === 'function'
                && (typeof tg.isVersionAtLeast !== 'function' || tg.isVersionAtLeast('8.0'));
            if (canTgFs) {
                tg.requestFullscreen();
                lockLandscapeSafe();
                return 'telegram';
            }
        } catch (_) {}
    }

    // 2. Во всех обычных браузерах (Desktop Chrome/Safari/Firefox/Edge, Android, iPad) — НАСТОЯЩИЙ нативный Fullscreen API!
    if (typeof document === 'undefined') return '';
    if (getNativeFullscreenElement()) {
        roomAnim.fsNativeActive = true;
        lockLandscapeSafe();
        return 'native';
    }
    const candidates = [room, document.documentElement].filter(Boolean);
    for (const el of candidates) {
        try {
            if (typeof el.requestFullscreen === 'function') {
                const p = el.requestFullscreen({ navigationUI: 'hide' });
                if (p && typeof p.then === 'function') {
                    p.then(() => {
                        roomAnim.fsNativeActive = true;
                        lockLandscapeSafe();
                        if (roomAnim.isFullscreen && !roomAnim.fsClosing) syncFullscreenOrientation(true);
                    }).catch(() => {});
                } else {
                    roomAnim.fsNativeActive = !!getNativeFullscreenElement();
                    lockLandscapeSafe();
                }
                return 'native';
            }
            if (typeof el.webkitRequestFullscreen === 'function') {
                el.webkitRequestFullscreen();
                roomAnim.fsNativeActive = true;
                lockLandscapeSafe();
                return 'webkit';
            }
            if (typeof el.msRequestFullscreen === 'function') {
                el.msRequestFullscreen();
                roomAnim.fsNativeActive = true;
                return 'ms';
            }
        } catch (_) {}
    }
    // 3. iPhone Safari (где WebKit не даёт requestFullscreen для div/html) — портал в body на 100% visualViewport + поворот 90°
    lockLandscapeSafe();
    return 'portal';
}

function exitNativeRoomFullscreen() {
    if (isRealTelegramMiniApp()) {
        try {
            const tg = window.Telegram.WebApp;
            if (tg.isFullscreen && typeof tg.exitFullscreen === 'function') tg.exitFullscreen();
        } catch (_) {}
    }
    if (typeof document !== 'undefined') {
        const fsEl = getNativeFullscreenElement();
        if (fsEl) {
            roomAnim.fsExitingNative = true;
            const clearFlag = () => { roomAnim.fsExitingNative = false; roomAnim.fsNativeActive = false; };
            try {
                if (typeof document.exitFullscreen === 'function') {
                    const ep = document.exitFullscreen();
                    if (ep && typeof ep.then === 'function') ep.then(clearFlag, clearFlag);
                    else clearFlag();
                } else if (typeof document.webkitExitFullscreen === 'function') {
                    document.webkitExitFullscreen();
                    clearFlag();
                } else if (typeof document.msExitFullscreen === 'function') {
                    document.msExitFullscreen();
                    clearFlag();
                } else clearFlag();
            } catch (_) { clearFlag(); }
        } else {
            roomAnim.fsNativeActive = false;
            roomAnim.fsExitingNative = false;
        }
    }
    try {
        if (typeof screen !== 'undefined' && screen && screen.orientation && typeof screen.orientation.unlock === 'function') {
            screen.orientation.unlock();
        }
    } catch (_) {}
}

function cancelFullscreenWaapi() {
    if (roomAnim.fsWaapi) {
        try { roomAnim.fsWaapi.cancel(); } catch (_) {}
        roomAnim.fsWaapi = null;
    }
    if (roomAnim.fsBgWaapi) {
        try { roomAnim.fsBgWaapi.cancel(); } catch (_) {}
        roomAnim.fsBgWaapi = null;
    }
}

function getFullscreenViewport() {
    if (typeof window === 'undefined') return { left: 0, top: 0, width: 800, height: 500 };
    // В нативном системном Fullscreen элемент занимает весь монитор от (0, 0) без смещения visualViewport
    if (getNativeFullscreenElement()) {
        const w = Math.max(1, Number(window.innerWidth || (typeof screen !== 'undefined' && screen.width)) || 800);
        const h = Math.max(1, Number(window.innerHeight || (typeof screen !== 'undefined' && screen.height)) || 500);
        return { left: 0, top: 0, width: w, height: h };
    }
    const vv = window.visualViewport;
    const width = Math.max(1, Number((vv && vv.width) || window.innerWidth) || 800);
    const height = Math.max(1, Number((vv && vv.height) || window.innerHeight) || 500);
    const left = Number((vv && vv.offsetLeft) || 0) || 0;
    const top = Number((vv && vv.offsetTop) || 0) || 0;
    return { left, top, width, height };
}

function computeFullscreenSceneBox(vp) {
    const aspect = 1586 / 992;
    const rotated = vp.width < vp.height;
    const deg = rotated ? (roomAnim.fsFlip ? -90 : 90) : 0;
    const longAxis = rotated ? vp.height : vp.width;
    const shortAxis = rotated ? vp.width : vp.height;
    const sceneW = Math.min(longAxis, shortAxis * aspect);
    const sceneH = sceneW / aspect;
    return { rotated, deg, sceneW, sceneH };
}

function clearFullscreenInlineStyles(room, scene) {
    cancelFullscreenWaapi();
    if (room && room.style) {
        room.style.top = '';
        room.style.left = '';
        room.style.right = '';
        room.style.bottom = '';
        room.style.width = '';
        room.style.height = '';
        room.style.backgroundColor = '';
    }
    if (scene && scene.style) {
        scene.style.width = '';
        scene.style.height = '';
        scene.style.transform = '';
        scene.style.borderRadius = '';
        scene.style.opacity = '';
    }
}

function restoreRoomFromPortal(room, scene) {
    if (typeof document !== 'undefined') {
        const docEl = document.documentElement;
        if (docEl && docEl.classList) docEl.classList.remove('is-soma-fs', 'is-soma-fs-closing');
        const ph = roomAnim.fsPlaceholder || document.getElementById('station-fs-placeholder');
        if (ph && ph.parentNode && room) {
            ph.parentNode.insertBefore(room, ph);
            ph.parentNode.removeChild(ph);
        }
        roomAnim.fsPlaceholder = null;
        // Обновляем цвет системной панели браузера обратно в нуарный #0b0708
        const metaTheme = document.getElementById('soma-theme-color');
        if (metaTheme && metaTheme.setAttribute) metaTheme.setAttribute('content', '#0b0708');
    }
    clearFullscreenInlineStyles(room, scene);
    if (room && room.classList) {
        room.classList.remove('is-fullscreen', 'is-fs-active', 'is-fs-animating', 'is-fs-closing', 'is-rotated', 'is-flipped', 'is-fs-idle');
    }
}

function syncFullscreenOrientation(applyTransform) {
    if (typeof document === 'undefined' || typeof window === 'undefined') return null;
    const room = document.getElementById('station');
    const scene = document.getElementById('station-scene');
    if (!room || !room.classList) return null;
    if (!roomAnim.isFullscreen && !roomAnim.fsClosing) {
        restoreRoomFromPortal(room, scene);
        return null;
    }
    const vp = getFullscreenViewport();
    const box = computeFullscreenSceneBox(vp);
    const prevDeg = Number(roomAnim.fsLastDeg) || 0;
    room.classList.add('is-fullscreen');
    room.classList.toggle('is-rotated', box.rotated);
    room.classList.toggle('is-flipped', box.rotated && !!roomAnim.fsFlip);
    if (room.style) {
        room.style.left = `${vp.left}px`;
        room.style.top = `${vp.top}px`;
        room.style.right = 'auto';
        room.style.bottom = 'auto';
        room.style.width = `${vp.width}px`;
        room.style.height = `${vp.height}px`;
    }
    const finalRadius = box.sceneW >= (box.rotated ? vp.height : vp.width) - 2 ? '0px' : '6px';
    if (scene && scene.style) {
        scene.style.width = `${box.sceneW.toFixed(2)}px`;
        scene.style.height = `${box.sceneH.toFixed(2)}px`;
        if (applyTransform !== false && !roomAnim.fsClosing) {
            scene.style.transform = `translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(${box.deg}deg) scale(1)`;
            scene.style.borderRadius = finalRadius;
            // Если во время входной анимации Android физически повернул экран (90° → 0°), мягко доводим до нового угла!
            if (roomAnim.fsWaapi && prevDeg !== box.deg && typeof scene.animate === 'function') {
                cancelFullscreenWaapi();
                roomAnim.fsWaapi = scene.animate([
                    { transform: 'translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(0deg) scale(0.84)', borderRadius: '16px' },
                    { transform: `translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(${box.deg}deg) scale(1)`, borderRadius: finalRadius }
                ], { duration: 480, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
                roomAnim.fsWaapi.onfinish = () => { roomAnim.fsWaapi = null; };
            }
        }
    }
    roomAnim.fsLastDeg = box.deg;
    const sndPill = document.getElementById('station-fs-snd');
    if (sndPill && typeof soundOn !== 'undefined') sndPill.textContent = soundOn ? '🔊' : '🔇';
    return { vp, box, finalRadius };
}

function flipRoomFullscreen() {
    if (!roomAnim.isFullscreen || roomAnim.fsClosing) return;
    const prevDeg = Number(roomAnim.fsLastDeg) || (roomAnim.fsFlip ? -90 : 90);
    roomAnim.fsFlip = !roomAnim.fsFlip;
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    const room = typeof document !== 'undefined' && document.getElementById('station');
    const scene = typeof document !== 'undefined' && document.getElementById('station-scene');
    if (room && room.classList) room.classList.add('is-fs-animating');
    cancelFullscreenWaapi();
    const geom = syncFullscreenOrientation(true);
    // Плавный кинематографичный разворот на 180° через GPU Web Animations API с мягким отлётом камеры!
    if (geom && geom.box.rotated && !prefersStillRoom() && scene && typeof scene.animate === 'function') {
        const midDeg = (prevDeg + geom.box.deg) * 0.5;
        try {
            roomAnim.fsWaapi = scene.animate([
                { transform: `translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(${prevDeg}deg) scale(1)`, borderRadius: geom.finalRadius },
                { transform: `translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(${midDeg}deg) scale(0.82)`, borderRadius: '16px', offset: 0.46 },
                { transform: `translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(${geom.box.deg}deg) scale(1)`, borderRadius: geom.finalRadius }
            ], { duration: 540, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
            roomAnim.fsWaapi.onfinish = () => { roomAnim.fsWaapi = null; };
        } catch (_) {}
    }
    bumpFullscreenHud();
}

function bumpFullscreenHud() {
    if (typeof document === 'undefined' || !roomAnim.isFullscreen) return;
    const room = document.getElementById('station');
    if (!room || !room.classList) return;
    room.classList.remove('is-fs-idle');
    if (typeof clearTimeout === 'function') clearTimeout(roomAnim.fsIdleTimer);
    if (typeof setTimeout === 'function') {
        roomAnim.fsIdleTimer = setTimeout(() => {
            if (roomAnim.isFullscreen && room.classList) room.classList.add('is-fs-idle');
        }, 3200);
    }
}

function showFullscreenCaption(text) {
    if (typeof document === 'undefined' || !text) return;
    const cap = document.getElementById('station-fs-caption');
    if (!cap || !cap.classList) return;
    cap.textContent = text;
    cap.classList.add('is-visible');
    if (typeof clearTimeout === 'function') clearTimeout(roomAnim.fsCapTimer);
    if (typeof setTimeout === 'function') {
        roomAnim.fsCapTimer = setTimeout(() => {
            if (cap.classList) cap.classList.remove('is-visible');
        }, 3800);
    }
}

function toggleRoomFullscreen() {
    if (roomAnim.isFullscreen) exitRoomFullscreen();
    else enterRoomFullscreen();
}

function enterRoomFullscreen() {
    if (typeof document === 'undefined') return;
    const room = document.getElementById('station');
    const scene = document.getElementById('station-scene');
    if (!room) return;

    // Если шло закрытие — мгновенно отменяем и подхватываем с места
    if (typeof clearTimeout === 'function') clearTimeout(roomAnim.fsAnimTimer);
    cancelFullscreenWaapi();
    roomAnim.fsClosing = false;
    roomAnim.fsExitingNative = false;
    roomAnim.isFullscreen = true;

    // 1. Замеряем точное положение карточки комнаты в интерфейсе ДО переноса (для бесшовной FLIP-анимации!)
    let fromRect = null;
    if (scene && typeof scene.getBoundingClientRect === 'function') {
        const r = scene.getBoundingClientRect();
        if (r && r.width > 20 && r.height > 20) {
            fromRect = { left: r.left, top: r.top, width: r.width, height: r.height };
        }
    }
    let cardHeight = 0;
    if (typeof room.getBoundingClientRect === 'function') {
        const cr = room.getBoundingClientRect();
        if (cr && cr.height > 20) cardHeight = cr.height;
    }

    // Мягкий бархатный аккорд раскрытия пространства
    if (typeof tone === 'function') {
        tone(196, 0.36, 'sine', 0.022, 0, 294);
        tone(392, 0.44, 'sine', 0.013, 0.07, 440);
    } else if (typeof SFX !== 'undefined' && SFX.tap) {
        SFX.tap();
    }

    // 2. Выносим #station ПОРТАЛОМ прямо в document.body (исключает обрезку внутри #view-profile на iOS/Android/Telegram!)
    if (document.body && room.parentNode && room.parentNode !== document.body && typeof document.createElement === 'function') {
        const ph = document.createElement('div');
        ph.id = 'station-fs-placeholder';
        ph.className = 'station-fs-placeholder';
        if (ph.style && cardHeight > 0) ph.style.height = `${Math.round(cardHeight)}px`;
        ph.setAttribute('aria-hidden', 'true');
        room.parentNode.insertBefore(ph, room);
        document.body.appendChild(room);
        roomAnim.fsPlaceholder = ph;
    }
    if (document.documentElement && document.documentElement.classList) {
        document.documentElement.classList.remove('is-soma-fs-closing');
        document.documentElement.classList.add('is-soma-fs');
    }
    const metaTheme = document.getElementById('soma-theme-color');
    if (metaTheme && metaTheme.setAttribute) metaTheme.setAttribute('content', '#040102');

    // 3. НАСТОЯЩИЙ нативный Fullscreen API в браузере ИЛИ Telegram.WebApp.requestFullscreen() внутри Telegram Mini App!
    // Вызывается строго синхронно в жесте пользователя, чтобы Chrome, Safari, Firefox, Edge и Android приняли его на 100%.
    requestNativeRoomFullscreen(room);

    // 4. Выставляем финальную геометрию и запускаем плавную 700мс GPU-анимацию раскрытия (Web Animations API —
    // не сбрасывается ни при переносе в body, ни при входе браузера в системный Fullscreen!).
    room.classList.remove('is-fs-closing');
    room.classList.add('is-fs-animating', 'is-fs-active');
    const geom = syncFullscreenOrientation(true);
    const still = prefersStillRoom();

    if (!still && geom && scene && typeof scene.animate === 'function') {
        const { vp, box, finalRadius } = geom;
        let dx = 0, dy = 0, s0 = 0.72;
        if (fromRect) {
            dx = (fromRect.left + fromRect.width * 0.5) - (vp.left + vp.width * 0.5);
            dy = (fromRect.top + fromRect.height * 0.5) - (vp.top + vp.height * 0.5);
            // Гарантируем заметный благородный зум (<= 0.78) даже если окно браузера уже было узким до Fullscreen!
            s0 = Math.max(0.24, Math.min(0.78, fromRect.width / box.sceneW));
        }
        const midDx = dx * 0.16;
        const midDy = dy * 0.16;
        const midDeg = box.deg * 0.72;
        const midScale = Math.min(0.96, s0 + (1 - s0) * 0.74);
        const startRadius = `${Math.min(34, Math.round(18 / s0))}px`;
        try {
            roomAnim.fsWaapi = scene.animate([
                {
                    transform: `translate(-50%, -50%) translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0px) rotate(0deg) scale(${s0.toFixed(4)})`,
                    borderRadius: startRadius,
                    boxShadow: '0 24px 72px rgba(0, 0, 0, 0.85), 0 0 42px rgba(217, 46, 72, 0.28)',
                    filter: 'brightness(0.92)'
                },
                {
                    transform: `translate(-50%, -50%) translate3d(${midDx.toFixed(1)}px, ${midDy.toFixed(1)}px, 0px) rotate(${midDeg.toFixed(1)}deg) scale(${midScale.toFixed(4)})`,
                    borderRadius: '12px',
                    boxShadow: '0 32px 110px rgba(0, 0, 0, 0.94), 0 0 56px rgba(255, 148, 112, 0.22)',
                    filter: 'brightness(1.05)',
                    offset: 0.54
                },
                {
                    transform: `translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(${box.deg}deg) scale(1)`,
                    borderRadius: finalRadius,
                    boxShadow: '0 28px 90px rgba(0, 0, 0, 0.92), 0 0 0 rgba(255, 148, 112, 0)',
                    filter: 'brightness(1)'
                }
            ], { duration: 700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
            roomAnim.fsWaapi.onfinish = () => { roomAnim.fsWaapi = null; };
        } catch (_) {}

        if (typeof room.animate === 'function') {
            try {
                roomAnim.fsBgWaapi = room.animate([
                    { backgroundColor: 'rgba(4, 1, 2, 0)' },
                    { backgroundColor: 'rgba(4, 1, 2, 0.92)', offset: 0.45 },
                    { backgroundColor: 'rgba(4, 1, 2, 1)' }
                ], { duration: 580, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
                roomAnim.fsBgWaapi.onfinish = () => { roomAnim.fsBgWaapi = null; };
            } catch (_) {}
        }

        if (typeof setTimeout === 'function') {
            roomAnim.fsAnimTimer = setTimeout(() => {
                if (!roomAnim.isFullscreen || roomAnim.fsClosing) return;
                syncFullscreenOrientation(true);
                showFullscreenCaption('Касайтесь предметов, чтобы оживить станцию');
            }, 680);
        }
    } else {
        showFullscreenCaption('Касайтесь предметов, чтобы оживить станцию');
    }

    bumpFullscreenHud();
    ensureStationLoop();
}

function exitRoomFullscreen(silent) {
    if (!roomAnim.isFullscreen && !roomAnim.fsClosing) return;
    roomAnim.isFullscreen = false;
    if (typeof clearTimeout === 'function') {
        clearTimeout(roomAnim.fsIdleTimer);
        clearTimeout(roomAnim.fsCapTimer);
        clearTimeout(roomAnim.fsAnimTimer);
    }
    cancelFullscreenWaapi();

    const room = typeof document !== 'undefined' && document.getElementById('station');
    const scene = typeof document !== 'undefined' && document.getElementById('station-scene');
    const fromDeg = Number(roomAnim.fsLastDeg) || 0;

    if (!silent) {
        if (typeof tone === 'function') {
            tone(294, 0.28, 'sine', 0.018, 0, 196);
        } else if (typeof SFX !== 'undefined' && SFX.tap) {
            SFX.tap();
        }
    }

    if (typeof document !== 'undefined') {
        const cap = document.getElementById('station-fs-caption');
        if (cap && cap.classList) cap.classList.remove('is-visible');
    }

    // Освобождаем нативный Fullscreen, чтобы под полупрозрачным занавесом плавно проявилась карточка профиля
    exitNativeRoomFullscreen();

    // Плавная 540мс WAAPI-посадка комнаты из полного экрана ровно обратно в свою карточку в профиле!
    const ph = roomAnim.fsPlaceholder || (typeof document !== 'undefined' && document.getElementById('station-fs-placeholder'));
    const canAnimate = !silent
        && !prefersStillRoom()
        && room && room.classList
        && scene && scene.style
        && typeof setTimeout === 'function';

    if (canAnimate) {
        let toRect = null;
        if (ph && typeof ph.getBoundingClientRect === 'function') {
            const pr = ph.getBoundingClientRect();
            if (pr && pr.width > 20) {
                toRect = {
                    left: pr.left,
                    top: pr.top,
                    width: pr.width,
                    height: pr.width * (992 / 1586)
                };
            }
        }
        roomAnim.fsClosing = true;
        if (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList) {
            document.documentElement.classList.add('is-soma-fs-closing');
        }
        const vp = getFullscreenViewport();
        const box = computeFullscreenSceneBox(vp);
        if (room.style) {
            room.style.left = `${vp.left}px`;
            room.style.top = `${vp.top}px`;
            room.style.width = `${vp.width}px`;
            room.style.height = `${vp.height}px`;
        }
        scene.style.width = `${box.sceneW.toFixed(2)}px`;
        scene.style.height = `${box.sceneH.toFixed(2)}px`;
        const dx = toRect ? ((toRect.left + toRect.width * 0.5) - (vp.left + vp.width * 0.5)) : 0;
        const dy = toRect ? ((toRect.top + toRect.height * 0.5) - (vp.top + vp.height * 0.5)) : 14;
        const s1 = toRect ? Math.max(0.2, Math.min(0.86, toRect.width / box.sceneW)) : 0.78;
        const endRadius = `${Math.min(34, Math.round(18 / s1))}px`;
        const endTransform = `translate(-50%, -50%) translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0px) rotate(0deg) scale(${s1.toFixed(4)})`;

        room.classList.remove('is-fs-active', 'is-fs-animating');
        room.classList.add('is-fs-closing');
        scene.style.transform = endTransform;
        scene.style.borderRadius = endRadius;

        if (typeof scene.animate === 'function') {
            try {
                roomAnim.fsWaapi = scene.animate([
                    {
                        transform: `translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(${fromDeg}deg) scale(1)`,
                        borderRadius: '0px',
                        opacity: 1
                    },
                    {
                        transform: endTransform,
                        borderRadius: endRadius,
                        opacity: toRect ? 1 : 0.92
                    }
                ], { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
            } catch (_) {}
        }
        if (typeof room.animate === 'function') {
            try {
                roomAnim.fsBgWaapi = room.animate([
                    { backgroundColor: 'rgba(4, 1, 2, 1)' },
                    { backgroundColor: 'rgba(4, 1, 2, 0)' }
                ], { duration: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
            } catch (_) {}
        }

        const finishClose = () => {
            if (!roomAnim.fsClosing) return;
            roomAnim.fsClosing = false;
            roomAnim.fsLastDeg = 0;
            restoreRoomFromPortal(room, scene);
            ensureStationLoop();
        };
        roomAnim.fsAnimTimer = setTimeout(finishClose, 530);
        return;
    }

    roomAnim.fsClosing = false;
    roomAnim.fsLastDeg = 0;
    restoreRoomFromPortal(room, scene);
    ensureStationLoop();
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const onFsViewportChange = () => { if (roomAnim.isFullscreen && !roomAnim.fsClosing) syncFullscreenOrientation(true); };
    window.addEventListener('resize', onFsViewportChange);
    window.addEventListener('orientationchange', () => {
        if (roomAnim.isFullscreen && typeof setTimeout === 'function') {
            setTimeout(onFsViewportChange, 60);
            setTimeout(onFsViewportChange, 260);
        }
    });
    if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
        window.visualViewport.addEventListener('resize', onFsViewportChange);
        window.visualViewport.addEventListener('scroll', onFsViewportChange);
    }
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        const onNativeFsChange = () => {
            const fsEl = getNativeFullscreenElement();
            if (fsEl) {
                roomAnim.fsNativeActive = true;
                if (roomAnim.isFullscreen && !roomAnim.fsClosing) onFsViewportChange();
            } else if (roomAnim.fsNativeActive) {
                roomAnim.fsNativeActive = false;
                // Пользователь вышел системной клавишей Esc или жестом «Назад» — мягко возвращаем комнату в профиль!
                if (roomAnim.isFullscreen && !roomAnim.fsClosing && !roomAnim.fsExitingNative) {
                    exitRoomFullscreen(false);
                }
            }
        };
        document.addEventListener('fullscreenchange', onNativeFsChange);
        document.addEventListener('webkitfullscreenchange', onNativeFsChange);
    }
}

function playObjectTone(obj) {
    if (typeof tone !== 'function') return;
    if (obj === 'pot') {
        tone(196, 0.16, 'triangle', 0.022, 0, 168);
        tone(294, 0.28, 'sine', 0.012, 0.04);
    } else if (obj === 'plant') {
        tone(396, 0.38, 'sine', 0.025); tone(594, 0.46, 'sine', 0.017, 0.09);
    } else if (obj === 'window') {
        tone(660, 0.28, 'sine', 0.018, 0, 520);
    } else if (obj === 'lamp') {
        tone(480, 0.14, 'triangle', 0.015, 0, 410); tone(240, 0.45, 'sine', 0.014, 0.05);
    } else if (obj === 'shelf') {
        if (typeof noise === 'function') { noise(0.04, 0.02, 0.02, 1500); noise(0.035, 0.016, 2.32, 1350); }
        tone(210, 0.24, 'sine', 0.015, 0.15, 260);
        tone(250, 0.24, 'sine', 0.014, 1.55, 195);
    } else if (obj === 'nightlight' || obj === 'nightlightR') {
        tone(294, 0.65, 'sine', 0.02, 0, 330);
        tone(440, 0.75, 'sine', 0.013, 0.12);
    } else if (obj === 'bed') {
        tone(220, 0.55, 'sine', 0.02); tone(330, 0.65, 'sine', 0.014, 0.12);
    } else if (obj === 'cat') {
        // Глубокое бархатное кошачье мурчание на индивидуальной частоте вашего кота!
        const hz = catSpec().purrHz || 52;
        for (let p = 0; p < 6; p++) {
            tone(hz + (p % 2) * 5, 0.24, 'triangle', 0.028, p * 0.13, hz - 6);
            tone(hz * 2.02, 0.18, 'sine', 0.012, p * 0.13 + 0.03);
        }
        tone(330, 0.55, 'sine', 0.016, 0.12, 392);
    } else if (obj === 'dog') {
        // Тёплый радостный отклик пса: мягкий грудной «уф-вздох» + ритмичное постукивание хвоста по шерстяному лежаку!
        const hz = dogSpec().woofHz || 132;
        tone(hz, 0.16, 'triangle', 0.026, 0, hz * 1.24);
        tone(hz * 1.22, 0.22, 'sine', 0.02, 0.09, hz * 0.94);
        for (let w = 0; w < 4; w++) {
            tone(84 + (w % 2) * 8, 0.09, 'sine', 0.024, 0.16 + w * 0.14, 58);
        }
        tone(392, 0.42, 'sine', 0.015, 0.14, 494);
    } else if (obj === 'pager') {
        if (typeof noise === 'function') noise(0.028, 0.025, 0, 2200);
        tone(920, 0.055, 'square', 0.014, 0.02, 640);
        tone(195, 0.22, 'sine', 0.016, 0.09, 155);
    }
}

function stageNoteForPlayer(spec, stage, revealKnown) {
    if (stage < 0) {
        if (roomAnim.soilDry) return EMPTY_POT_LINES.dry;
        if (roomAnim.isSeedPot) return nextRoomLine('pot_seed', EMPTY_POT_LINES.seed);
        if (roomAnim.soilReady) return nextRoomLine('pot_ready', EMPTY_POT_LINES.ready);
        return nextRoomLine('pot_cold', EMPTY_POT_LINES.cold);
    }
    if (!revealKnown && stage < PROGRESSION_RULES.SPECIES_REVEAL_STAGE) {
        return MYSTERY_STAGE_NOTES[stage] || PLANT_NOTES[spec.kind][stage];
    }
    return PLANT_NOTES[spec.kind][stage];
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
            const nx = (event.clientX - rect.left) / rect.width;
            const ny = (event.clientY - rect.top) / rect.height;
            // Точный перевод координат касания даже при повороте сцены на ±90° на портретном телефоне!
            if (roomAnim.isFullscreen && room.classList && room.classList.contains('is-rotated')) {
                if (roomAnim.fsFlip) {
                    fxX = (1 - ny) * FX_W;
                    fxY = nx * FX_H;
                } else {
                    fxX = ny * FX_W;
                    fxY = (1 - nx) * FX_H;
                }
            } else {
                fxX = nx * FX_W;
                fxY = ny * FX_H;
            }
        }
    }

    try { Telegram.WebApp.HapticFeedback.impactOccurred('soft'); } catch (_) {}

    let line = '';
    let modeLabel = '';
    if (obj === 'terminal') {
        roomAnim.crtStart = now;
        roomAnim.contextPanel = '';
        modeLabel = 'ЖУРНАЛ // ТЕРМИНАЛ';
        line = ROOM_LINES.terminal;
    } else if (obj === 'radio') {
        roomAnim.radioStart = now;
        roomAnim.contextPanel = '';
        const hasSignal = typeof musicFound === 'function' && musicFound();
        modeLabel = 'ЖУРНАЛ // ПРИЁМНИК';
        line = hasSignal ? ROOM_LINES.radioOn : ROOM_LINES.radioOff;
    } else if (obj === 'plant') {
        roomAnim.plantStart = now;
        roomAnim.contextPanel = '';
        const sp = roomAnim.spec || plantSpec();
        if (roomAnim.stage < 0) {
            modeLabel = 'ЖУРНАЛ // ГОРШОК';
            line = stageNoteForPlayer(sp, -1, false);
            playObjectTone('pot');
        } else {
            const known = roomAnim.stage >= PROGRESSION_RULES.SPECIES_REVEAL_STAGE
                || Number.isInteger(roomAnim.inspectKind)
                || Number.isInteger(roomAnim.inspectStage)
                || (typeof roomPreview !== 'undefined' && !!roomPreview);
            const dropPetals = roomAnim.stage === 5 && (sp.kind === 6 || sp.kind === 5 || sp.kind === 4);
            if (roomAnim.stage >= 3 || roomAnim.dewActive) spawnPlantSpores(4 + Math.floor(roomAnim.stage * 0.7), dropPetals);
            modeLabel = 'ЖУРНАЛ // РАСТЕНИЕ';
            line = stageNoteForPlayer(sp, roomAnim.stage, known);
            playObjectTone('plant');
        }
    } else if (obj === 'window') {
        roomAnim.winStart = now;
        roomAnim.contextPanel = roomAnim.unlockedPhase >= 1 ? 'window' : '';
        const wx = fxX && insideWindow(fxX, fxY, 12) ? fxX : WIN_CX;
        const wy = fxY && insideWindow(fxX, fxY, 12) ? fxY : WIN_CY + 10;
        roomAnim.ripples.push({ x: wx, y: wy, maxR: 26, life: 1, speed: 0.022 });
        modeLabel = 'ЖУРНАЛ // ОКНО';
        line = nextRoomLine('win_' + roomAnim.activePhase, ROOM_LINES.window[roomAnim.activePhase] || ROOM_LINES.window[0]);
        playObjectTone('window');
    } else if (obj === 'lamp') {
        roomAnim.contextPanel = '';
        const running = (now - roomAnim.lampStart) * 0.001;
        if (running > 0.5 || running < 0) {
            roomAnim.lampDir = fxX ? (fxX > 188 ? 1 : -1) : -roomAnim.lampDir;
            roomAnim.lampAmp = 0.095; // ~5.4° мягкого реалистичного маятника
            roomAnim.lampStart = now;
        }
        modeLabel = 'ЖУРНАЛ // ЛАМПА';
        line = nextRoomLine('lamp', ROOM_LINES.lamp);
        playObjectTone('lamp');
    } else if (obj === 'shelf') {
        roomAnim.contextPanel = 'deck';
        if ((now - roomAnim.deckStart) > 2850) {
            roomAnim.deckStart = now;
            playObjectTone('shelf');
        }
        const tapes = loadCassettes();
        if (tapes.length) {
            const current = tapes.find(c => c.id === roomAnim.activeCassetteId) || tapes[0];
            roomAnim.activeCassetteId = current.id;
            const num = tapes.length - tapes.indexOf(current);
            modeLabel = `КАССЕТА #${String(num).padStart(2, '0')} · ${current.date}`;
            line = `«${current.text}»`;
        } else {
            modeLabel = 'ЖУРНАЛ // МАГНИТОФОН';
            line = nextRoomLine('shelf', ROOM_LINES.shelf);
        }
    } else if (obj === 'nightlight') {
        roomAnim.contextPanel = '';
        if ((now - roomAnim.nightLStart) > 900) {
            roomAnim.nightLStart = now;
            playObjectTone('nightlight');
        }
        modeLabel = 'ЖУРНАЛ // НОЧНИК';
        line = nextRoomLine('nightlight', ROOM_LINES.nightlight);
    } else if (obj === 'nightlightR') {
        roomAnim.contextPanel = '';
        if ((now - roomAnim.nightRStart) > 900) {
            roomAnim.nightRStart = now;
            playObjectTone('nightlightR');
        }
        modeLabel = 'ЖУРНАЛ // НОЧНИК';
        line = nextRoomLine('nightlightR', ROOM_LINES.nightlightR);
    } else if (obj === 'bed') {
        roomAnim.contextPanel = '';
        if ((now - roomAnim.nightRStart) > 900) roomAnim.nightRStart = now;
        const cosm = getRoomCosmeticsSafe();
        if (cosm.cat) {
            roomAnim.catPetStart = now;
            const myCat = catSpec(undefined, Number.isInteger(roomAnim.inspectCatCoat) ? roomAnim.inspectCatCoat : null);
            modeLabel = `ЖУРНАЛ // ${myCat.coat.name.toUpperCase()}`;
            const catLines = [
                `Ваш ${myCat.coat.short} кот приподнял голову, блеснул глазами и тепло замурчал под ладонью.`,
                `Тёплый клубок (${myCat.summary.toLowerCase()}) сладко зажмурился, повёл хвостом и согрел край пледа.`
            ];
            if (cosm.dog) {
                const myDog = dogSpec(undefined, Number.isInteger(roomAnim.inspectDogBreed) ? roomAnim.inspectDogBreed : null);
                catLines.push(`Ваш ${myCat.coat.short} кот лениво переглянулся с другом на ковре (${myDog.breed.short}) — в комнате двойное живое тепло.`);
            }
            line = nextRoomLine('cat', catLines);
            playObjectTone('cat');
        } else {
            modeLabel = 'ЖУРНАЛ // КУШЕТКА';
            line = nextRoomLine('bed', ROOM_LINES.bed);
            playObjectTone('bed');
        }
    } else if (obj === 'dog') {
        roomAnim.contextPanel = '';
        const cosm = getRoomCosmeticsSafe();
        if (!cosm.dog) return;
        roomAnim.dogPetStart = now;
        const myDog = dogSpec(undefined, Number.isInteger(roomAnim.inspectDogBreed) ? roomAnim.inspectDogBreed : null);
        modeLabel = `ЖУРНАЛ // ${myDog.breed.name.toUpperCase()}`;
        const dogLines = [
            `Ваш ${myDog.breed.short} радостно вскинул уши, ткнулся тёплым носом в ладонь и счастливо завилял хвостом!`,
            `Верный хранитель (${myDog.breed.name.toLowerCase()}) сладко улыбнулся, прищурился от ласки и уютнее устроился на лежаке.`
        ];
        if (cosm.cat) {
            const myCat = catSpec(undefined, Number.isInteger(roomAnim.inspectCatCoat) ? roomAnim.inspectCatCoat : null);
            dogLines.push(`Ваш ${myDog.breed.short} тихо стучит хвостом по ковру, а ${myCat.coat.short} кот мурчит на кушетке — они берегут ваш вечер вдвоём.`);
        }
        line = nextRoomLine('dog', dogLines);
        playObjectTone('dog');
    }

    // В полноэкранном режиме касание круглого окна сразу переключает открытые атмосферы на лету!
    if (roomAnim.isFullscreen) {
        bumpFullscreenHud();
        if (obj === 'window' && (Number(roomAnim.unlockedPhase) || 0) >= 1) {
            const nextPh = ((Number(roomAnim.activePhase) || 0) + 1) % ((Number(roomAnim.unlockedPhase) || 0) + 1);
            equipStationPhase(nextPh, true);
            showFullscreenCaption(`Атмосфера: ${stationPhases[nextPh].name} · ${stationPhases[nextPh].entry}`);
            return;
        }
    }

    if (line) {
        roomAnim.customEntry = line;
        roomAnim.customMode = modeLabel;
        setStationEntry(line, true);
    }

    syncContextPanels();
    const mEl = typeof document !== 'undefined' && document.getElementById('station-mode');
    if (mEl && modeLabel) mEl.textContent = modeLabel;
    paintPlantFrame(now);
    drawStationFx(now, false);
    ensureStationLoop();
}

function activateRoomObject(obj, event) {
    if ((obj === 'terminal' || obj === 'radio') && roomAnim.isFullscreen) {
        exitRoomFullscreen(true);
    }
    touchRoomObject(obj, event);
    if (obj === 'terminal' && typeof openTrainer === 'function') openTrainer();
    else if (obj === 'radio' && typeof openRadio === 'function') openRadio();
}

function animatePlantShift() {
    const cv = typeof document !== 'undefined' && document.getElementById('station-plant');
    if (cv && cv.classList) {
        cv.classList.remove('is-stage-shift');
        void cv.offsetWidth;
        cv.classList.add('is-stage-shift');
    }
}

// Диегетические панели окна (только открытые атмосферы!) и кассетного архива деки
function syncContextPanels() {
    if (typeof document === 'undefined') return;
    const winBar = document.getElementById('station-window-bar');
    if (winBar && winBar.classList) {
        const showWin = roomAnim.contextPanel === 'window' && roomAnim.unlockedPhase >= 1;
        winBar.classList.toggle('hidden', !showWin);
        if (winBar.querySelectorAll) {
            winBar.querySelectorAll('[data-win-phase]').forEach(btn => {
                const idx = Number(btn.dataset.winPhase);
                const isUnlocked = idx <= roomAnim.unlockedPhase;
                btn.hidden = !isUnlocked;
                if (btn.classList) btn.classList.toggle('hidden', !isUnlocked);
                btn.disabled = !isUnlocked;
                btn.setAttribute('aria-pressed', String(idx === roomAnim.activePhase));
            });
        }
    }

    const deckBar = document.getElementById('station-deck-bar');
    if (deckBar && deckBar.classList) {
        const showDeck = roomAnim.contextPanel === 'deck';
        deckBar.classList.toggle('hidden', !showDeck);
        const listEl = document.getElementById('station-deck-list');
        const emptyEl = document.getElementById('station-deck-empty');
        const countEl = document.getElementById('station-deck-count');
        const tapes = loadCassettes();
        if (countEl) countEl.textContent = tapes.length ? `${tapes.length} ЗАП.` : 'ЛОТОК ПУСТ';
        if (emptyEl && emptyEl.classList) emptyEl.classList.toggle('hidden', tapes.length > 0);
        if (listEl) {
            listEl.textContent = '';
            if (tapes.length && document.createElement) {
                tapes.forEach((tape, idx) => {
                    const num = String(tapes.length - idx).padStart(2, '0');
                    const b = document.createElement('button');
                    b.type = 'button';
                    b.textContent = `#${num} · ${tape.date}`;
                    b.setAttribute('aria-pressed', String(tape.id === roomAnim.activeCassetteId));
                    b.onclick = () => playCassette(tape.id);
                    listEl.appendChild(b);
                });
            }
        }
    }
}

// Тактильный чёрно-красный ретро-пейджер «Шёпота» (временно вне эфира, без дубля телефона)
function pulsePagerScreen() {
    const p = typeof document !== 'undefined' && document.getElementById('soma-pager');
    if (!p || !p.classList) return;
    p.classList.remove('is-ping');
    void p.offsetWidth;
    p.classList.add('is-ping');
    if (typeof clearTimeout === 'function') clearTimeout(roomAnim.pagerResetTimer);
    if (typeof setTimeout === 'function') {
        roomAnim.pagerResetTimer = setTimeout(() => {
            if (p.classList) p.classList.remove('is-ping');
        }, 720);
    }
}

function pressPagerScan() {
    roomAnim.pagerStep = roomAnim.pagerMode === 'scan' ? (roomAnim.pagerStep + 1) % 3 : 0;
    roomAnim.pagerMode = 'scan';
    try { Telegram.WebApp.HapticFeedback.impactOccurred('light'); } catch (_) {}
    playObjectTone('pager');
    pulsePagerScreen();
    renderPager();
}

function pressPagerInfo() {
    roomAnim.pagerMode = roomAnim.pagerMode === 'info' ? 'idle' : 'info';
    try { Telegram.WebApp.HapticFeedback.impactOccurred('soft'); } catch (_) {}
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    pulsePagerScreen();
    renderPager();
}

function openWhisper() {
    pressPagerScan();
}

function renderPager(warmthArg, ledgerArg, isWatchmanArg) {
    if (typeof document === 'undefined') return;
    const pager = document.getElementById('soma-pager');
    if (!pager) return;
    const w = warmthArg !== undefined ? warmthArg : roomAnim.warmth;
    const ledger = ledgerArg || loadWarmthLedger();
    const adm = whisperAdmission(w, ledger);
    const gh = loadGreenhouse();
    const own = roomAnim.ownSpec || plantSpec();
    const watchman = isWatchmanArg !== undefined ? isWatchmanArg : gh.bloomed.includes(own.kind);

    pager.dataset.state = adm.live ? (adm.admitted ? 'ready' : 'locked') : 'offline';
    pager.dataset.admitted = adm.admitted ? '1' : '0';

    const carrierEl = document.getElementById('pager-carrier');
    const gateEl = document.getElementById('pager-gate');
    const msgEl = document.getElementById('pager-msg');
    const subEl = document.getElementById('pager-sub');

    if (carrierEl) carrierEl.textContent = adm.live ? 'ЭФИР АКТИВЕН' : 'НЕТ НЕСУЩЕЙ';
    if (gateEl) {
        gateEl.textContent = watchman
            ? 'ДОПУСК: СМОТРИТЕЛЬ'
            : adm.admitted
                ? 'ДОПУСК: ГОТОВ'
                : `ДОПУСК ${adm.warmth}/${adm.warmthNeed} · ТРН ${adm.trained}/${adm.trainedNeed}`;
    }

    let mainLine = 'ЧАСТОТА «ШЁПОТ» ОТКЛЮЧЕНА';
    let subLine = adm.admitted
        ? 'допуск получен · приёмник ждёт запуска тёплой линии'
        : 'линия временно молчит · готовьте допуск в тишине и терминале';

    if (roomAnim.pagerMode === 'info') {
        mainLine = watchman
            ? 'РЕЗЕРВ // ВОЛНА «ПОТЕРЯННЫЙ СИГНАЛ»'
            : 'ОДНОСТОРОННИЙ КАНАЛ // БЕЗ ИМЁН';
        subLine = watchman
            ? 'смотрители слышат голоса, оставшиеся без единого ответа'
            : 'горшок пуст, пока молчит «Шёпот» — первый сигнал разбудит росток';
    } else if (roomAnim.pagerMode === 'scan') {
        const screens = [
            [
                'ПОИСК НЕСУЩЕЙ... ЭФИР ПУСТ',
                'ретранслятор «Шёпота» в NEEO_CITY ещё не запущен'
            ],
            [
                adm.admitted ? 'КЛЮЧ СЛУШАТЕЛЯ ПОДТВЕРЖДЁН' : `НУЖНО ${adm.warmthNeed} ТЕПЛА И ${adm.trainedNeed} СЕАНСОВ`,
                adm.admitted
                    ? 'когда канал оживёт, первый шёпот пробудит жизнь в горшке'
                    : `сейчас: ${adm.warmth}/${adm.warmthNeed} тепла · услышано в терминале: ${adm.trained}/${adm.trainedNeed}`
            ],
            [
                watchman ? 'ЧАСТОТА СМОТРИТЕЛЯ В ОЖИДАНИИ' : 'ВХОДЯЩИЕ ПИШУТСЯ НА КАССЕТЫ',
                watchman
                    ? 'после запуска вы сможете отвечать на забытые сигналы сети'
                    : 'чужие шёпоты для вас сохранит магнитофон на левой полке'
            ]
        ];
        const pick = screens[roomAnim.pagerStep % screens.length];
        mainLine = pick[0];
        subLine = pick[1];
    }

    if (msgEl) msgEl.textContent = mainLine;
    if (subEl) subEl.textContent = subLine;
}

function togglePtsDrawer() {
    roomAnim.ptsOpen = !roomAnim.ptsOpen;
    if (!roomAnim.ptsOpen) {
        roomAnim.inspectStage = null;
        roomAnim.inspectKind = null;
        roomAnim.inspectCatCoat = null;
        roomAnim.inspectDogBreed = null;
        roomAnim.galleryOpen = false;
        roomAnim.ptsDew = false;
        roomAnim.customEntry = '';
        roomAnim.customMode = '';
    }
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    renderRoom();
}

function togglePtsDew() {
    roomAnim.ptsDew = !roomAnim.ptsDew;
    roomAnim.customMode = roomAnim.ptsDew ? 'PTS // СВЕТЛЯЧКИ ТИШИНЫ (7/7)' : 'ЖУРНАЛ СТАНЦИИ';
    roomAnim.customEntry = roomAnim.ptsDew
        ? 'Над горшком зажглось полное созвездие из 7 Светлячков тишины — награда за неделю тёплых вечеров.'
        : '';
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    renderRoom();
}

// PTS: посмотреть все 7 уникальных мастей кота (ваш родной по ID сохраняется неизменным!)
function cyclePtsCatCoat() {
    if (!isPtsMode()) return;
    const own = catSpec();
    const cur = Number.isInteger(roomAnim.inspectCatCoat) ? roomAnim.inspectCatCoat : own.coatIdx;
    const next = (cur + 1) % CAT_COATS.length;
    roomAnim.inspectCatCoat = next === own.coatIdx ? null : next;
    // Если кот ещё не надет — включаем его в PTS для наглядного осмотра
    if (typeof grantOwnedItem === 'function' && typeof getActiveCosmetics === 'function' && !getActiveCosmetics().cat) {
        grantOwnedItem('room_cat');
    }
    const shown = catSpec(undefined, roomAnim.inspectCatCoat);
    roomAnim.catPetStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    roomAnim.customMode = `PTS // КОТ ${next + 1}/7 · ${shown.coat.name.toUpperCase()}`;
    roomAnim.customEntry = next === own.coatIdx
        ? `Ваш родной кот по ID: ${shown.summary}.`
        : `Осмотр масти «${shown.coat.name}» (ваш родной по ID: ${own.coat.name}).`;
    playObjectTone('cat');
    renderRoom();
}

// PTS: посмотреть все 7 уникальных пород пса-хранителя (своё место на ковре — живёт дружно вместе с котом!)
function cyclePtsDogBreed() {
    if (!isPtsMode()) return;
    const own = dogSpec();
    const cur = Number.isInteger(roomAnim.inspectDogBreed) ? roomAnim.inspectDogBreed : own.breedIdx;
    const next = (cur + 1) % DOG_BREEDS.length;
    roomAnim.inspectDogBreed = next === own.breedIdx ? null : next;
    if (typeof grantOwnedItem === 'function' && typeof getActiveCosmetics === 'function' && !getActiveCosmetics().dog) {
        grantOwnedItem('room_dog');
    }
    const shown = dogSpec(undefined, roomAnim.inspectDogBreed);
    roomAnim.dogPetStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    roomAnim.customMode = `PTS // ПЁС ${next + 1}/7 · ${shown.breed.name.toUpperCase()}`;
    roomAnim.customEntry = next === own.breedIdx
        ? `Ваш родной пёс по ID: ${shown.summary}.`
        : `Осмотр породы «${shown.breed.name}» (ваш родной по ID: ${own.breed.name}).`;
    playObjectTone('dog');
    renderRoom();
}

// PTS-осмотр стадий: -1 (пустой горшок) и 0..5 (стадии 1/6 .. 6/6)
function inspectPlantStage(idx) {
    const s = Math.trunc(Number(idx));
    if (!Number.isInteger(s) || s < -1 || s >= PLANT_STAGES.length) return;
    roomAnim.ptsOpen = true;
    const previewing = typeof roomPreview !== 'undefined' && !!roomPreview;
    if (previewing) {
        roomAnim.previewStage = s;
    } else {
        roomAnim.inspectStage = (s === roomAnim.liveStage && roomAnim.inspectKind === null) ? null : s;
    }
    const sp = roomAnim.spec || plantSpec();
    roomAnim.customMode = s < 0 ? 'PTS // ПУСТОЙ ГОРШОК' : `PTS // СТАДИЯ ${s + 1}/6`;
    roomAnim.customEntry = s < 0 ? EMPTY_POT_LINES.cold[0] : PLANT_NOTES[sp.kind][s];
    animatePlantShift();
    playObjectTone(s < 0 ? 'pot' : 'plant');
    renderRoom();
}

// PTS: открыть/скрыть панель осмотра всех 7 видов растений
function togglePlantGallery() {
    roomAnim.ptsOpen = true;
    roomAnim.galleryOpen = !roomAnim.galleryOpen;
    if (!roomAnim.galleryOpen && roomAnim.inspectKind !== null) {
        roomAnim.inspectKind = null;
        roomAnim.customEntry = '';
        roomAnim.customMode = '';
        animatePlantShift();
    }
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    renderRoom();
}

// PTS: посмотреть любой из 7 видов прямо на ковре (личное растение по ID сохраняется неизменным!)
function inspectPlantKind(kindIdx) {
    const k = Math.trunc(Number(kindIdx));
    if (!Number.isInteger(k) || k < 0 || k >= PLANT_KINDS.length) return;
    const own = roomAnim.ownSpec || plantSpec();
    roomAnim.ptsOpen = true;
    roomAnim.galleryOpen = true;
    const previewing = typeof roomPreview !== 'undefined' && !!roomPreview;
    if (k === own.kind) {
        roomAnim.inspectKind = null;
        if (!previewing && roomAnim.inspectStage === null && roomAnim.liveStage < 0) {
            roomAnim.inspectStage = 5;
        }
    } else {
        roomAnim.inspectKind = k;
        if (previewing && roomAnim.previewStage === -1) roomAnim.previewStage = 5;
        if (!previewing && (roomAnim.inspectStage === null || roomAnim.inspectStage < 0)) {
            roomAnim.inspectStage = 5;
        }
    }
    const nextStage = previewing
        ? (Number.isInteger(roomAnim.previewStage) ? roomAnim.previewStage : 5)
        : (Number.isInteger(roomAnim.inspectStage) ? roomAnim.inspectStage : roomAnim.liveStage);
    roomAnim.customMode = `PTS // ${PLANT_KINDS[k]}`;
    roomAnim.customEntry = nextStage < 0 ? EMPTY_POT_LINES.cold[0] : PLANT_NOTES[k][nextStage];
    animatePlantShift();
    playObjectTone(nextStage < 0 ? 'pot' : 'plant');
    renderRoom();
}

function renderRoom() {
    if (typeof document === 'undefined') return;
    const room = document.getElementById('station');
    if (!room) return;

    const previewing = typeof roomPreview !== 'undefined' && !!roomPreview;
    const previewIdx = Number.isInteger(roomAnim.previewPhase) ? Math.max(0, Math.min(3, roomAnim.previewPhase)) : 3;
    const demoWarmthByPhase = [0, 20, 108, PROGRESSION_RULES.SEASON_WARMTH];
    const warmth = previewing
        ? demoWarmthByPhase[previewIdx]
        : Math.max(0, (typeof player !== 'undefined' && player.warmth) || 0);

    let equipped, seenMax;
    if (!previewing) {
        const sEq = lsGet('soma_station_phase');
        if (sEq !== null && sEq !== '') equipped = Number(sEq);
        const sSeen = lsGet('soma_seen_phase');
        if (sSeen !== null && sSeen !== '') seenMax = Number(sSeen);
    }

    const stState = previewing
        ? { unlocked: stationPhases.length - 1, active: previewIdx, justUnlocked: false, next: stationPhases[previewIdx + 1] }
        : stationState(warmth, equipped, seenMax);
    const { unlocked, active, justUnlocked, next } = stState;

    // При первом открытии новой атмосферы комната САМА впускает её (катарсис), а дальше игрок выбирает через окно!
    if (!previewing) {
        if (!Number.isInteger(seenMax) || unlocked > seenMax) lsSet('soma_seen_phase', String(unlocked));
        if (justUnlocked) {
            lsSet('soma_station_phase', String(unlocked));
            roomAnim.customEntry = stationPhases[unlocked].entry;
            roomAnim.customMode = `НОВАЯ АТМОСФЕРА // ${stationPhases[unlocked].name.toUpperCase()}`;
        }
    }

    const totalRanks = typeof ranks !== 'undefined' ? ranks.length : 6;
    const rIdx = previewing
        ? [0, 2, 4, totalRanks - 1][previewIdx]
        : (typeof rankIdx === 'function' ? rankIdx() : 0);
    const stars = rIdx + 1;
    const phase = stationPhases[active];

    const ledger = loadWarmthLedger();
    const adm = whisperAdmission(warmth, ledger);
    const awayDays = previewing ? 0 : daysSinceLastWarmth(ledger);
    const soilDry = awayDays >= PROGRESSION_RULES.DRY_SOIL_DAYS;
    const nowMs = Date.now();
    const dewActive = roomAnim.ptsDew || (ledger.dewUntil > nowMs);

    // Родное растение строго по ID игрока + коллекция Оранжереи после его первого расцвета (6/6)
    const ownSpec = plantSpec();
    const nativeStage = previewing
        ? [-1, 0, 2, 5][previewIdx]
        : plantStage(warmth, {
            sprouted: adm.sprouted,
            requireAcks: adm.live,
            bloomAcks: adm.whisperAcks
        });

    const gh = loadGreenhouse();
    if (!previewing && nativeStage === 5 && !gh.bloomed.includes(ownSpec.kind)) {
        gh.bloomed.push(ownSpec.kind);
        if (gh.placed === null) gh.placed = ownSpec.kind;
        saveGreenhouse(gh);
    }
    if (!previewing && gh.activeSeed) {
        const seedGain = Math.max(0, warmth - gh.activeSeed.startWarmth);
        const sStage = plantStage(seedGain, { sprouted: true, steps: GREENHOUSE_WARMTH_STEPS });
        if (sStage === 5) {
            if (!gh.bloomed.includes(gh.activeSeed.kind)) gh.bloomed.push(gh.activeSeed.kind);
            gh.placed = gh.activeSeed.kind;
            roomAnim.customMode = 'ОРАНЖЕРЕЯ // РАСЦВЕТ';
            roomAnim.customEntry = PLANT_NOTES[gh.activeSeed.kind][5];
            gh.activeSeed = null;
            saveGreenhouse(gh);
        }
    }

    let liveSpec = ownSpec;
    let liveStage = nativeStage;
    let isSeedPot = false;
    let activeSteps = PLANT_WARMTH_STEPS;
    let effectiveWarmth = warmth;

    if (!previewing && gh.bloomed.includes(ownSpec.kind)) {
        if (gh.placed === 'seed' && gh.activeSeed) {
            liveSpec = gallerySpecForKind(gh.activeSeed.kind, ownSpec);
            effectiveWarmth = Math.max(0, warmth - gh.activeSeed.startWarmth);
            activeSteps = GREENHOUSE_WARMTH_STEPS;
            liveStage = plantStage(effectiveWarmth, { sprouted: true, steps: GREENHOUSE_WARMTH_STEPS });
            isSeedPot = true;
        } else if (Number.isInteger(gh.placed) && gh.bloomed.includes(gh.placed)) {
            liveSpec = gallerySpecForKind(gh.placed, ownSpec);
            liveStage = 5;
        }
    }

    const otherKind = Number.isInteger(roomAnim.inspectKind) && roomAnim.inspectKind !== liveSpec.kind;
    const spec = otherKind ? gallerySpecForKind(roomAnim.inspectKind, ownSpec) : liveSpec;

    const grew = roomAnim.lastStage >= -1 && liveStage > roomAnim.lastStage && !previewing && !isSeedPot;
    if (grew) {
        roomAnim.inspectStage = null;
        roomAnim.inspectKind = null;
    }

    const shownStage = previewing
        ? (Number.isInteger(roomAnim.previewStage) ? roomAnim.previewStage : liveStage)
        : (Number.isInteger(roomAnim.inspectStage) ? roomAnim.inspectStage : liveStage);
    const isPeeking = previewing || otherKind || shownStage !== liveStage;
    const speciesKnown = isPeeking
        || gh.bloomed.includes(spec.kind)
        || shownStage >= PROGRESSION_RULES.SPECIES_REVEAL_STAGE;
    const radioReady = typeof musicFound === 'function' && musicFound();

    const ff = roomAnim.ptsDew
        ? { count: 7, active: true, drowsy: false, max: 7 }
        : fireflyState(ledger, undefined, nowMs);

    roomAnim.activePhase = active;
    roomAnim.unlockedPhase = unlocked;
    roomAnim.warmth = warmth;
    roomAnim.rank = rIdx;
    roomAnim.liveStage = liveStage;
    roomAnim.stage = shownStage;
    roomAnim.lastStage = liveStage;
    roomAnim.ownSpec = ownSpec;
    roomAnim.spec = spec;
    roomAnim.soilReady = !isSeedPot && adm.admitted && shownStage < 0;
    roomAnim.soilDry = soilDry;
    roomAnim.dewActive = dewActive;
    roomAnim.fireflyCount = ff.count;
    roomAnim.fireflyDrowsy = ff.drowsy;
    roomAnim.isSeedPot = isSeedPot;
    roomAnim.radioLit = radioReady;

    if (grew && liveStage >= 0) {
        roomAnim.plantStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
        roomAnim.customMode = liveStage === PROGRESSION_RULES.SPECIES_REVEAL_STAGE
            ? `ОТКРЫТИЕ ВИДА // ${ownSpec.kindName}`
            : 'ЖУРНАЛ // НОВЫЙ РОСТ';
        roomAnim.customEntry = stageNoteForPlayer(ownSpec, liveStage, liveStage >= PROGRESSION_RULES.SPECIES_REVEAL_STAGE);
        if (liveStage >= 3) spawnPlantSpores(6, liveStage === 5 && ownSpec.kind >= 4);
    }

    room.dataset.phase = String(active);
    room.dataset.radio = radioReady ? 'on' : 'off';
    room.dataset.stage = String(shownStage);

    const wEl = document.getElementById('warmth-val');
    if (wEl) wEl.textContent = String(warmth);

    // Таяние Индекса равнодушия в шапке от живого тепла (а не от пустого XP)
    const indEl = document.getElementById('indiff-val');
    if (indEl) indEl.textContent = `${indifferenceIndex(warmth)}%`;

    const mEl = document.getElementById('station-mode');
    if (mEl) {
        mEl.textContent = roomAnim.customMode
            || (previewing ? 'PTS // ДЕМОНСТРАЦИЯ' : 'ЖУРНАЛ СТАНЦИИ');
    }

    // Если игрок с цветущим растением вернул «Дождь» через окно — фраза без упоминания пустого горшка
    const defaultEntry = (active === 0 && shownStage >= 0)
        ? 'Город шумит за мокрым стеклом. Рядом с живым цветком ночь кажется теплее.'
        : phase.entry;
    setStationEntry(roomAnim.customEntry || defaultEntry, grew || justUnlocked);

    // Блок горшка / растения (чистый и загадочный для игрока, информативный в PTS-осмотре)
    const plantInfo = document.getElementById('station-plant-info');
    if (plantInfo) {
        if (shownStage < 0) {
            plantInfo.textContent = isSeedPot
                ? 'НОВОЕ СЕМЯ // ТИШИНА В ЗЕМЛЕ'
                : (adm.admitted && !isPeeking ? 'ПУСТОЙ ГОРШОК // ПОЧВА СОГРЕТА' : 'ПУСТОЙ ГОРШОК // ОЖИДАНИЕ ЖИЗНИ');
        } else {
            const title = speciesKnown
                ? spec.kindName
                : (shownStage === 0 ? 'НЕИЗВЕСТНЫЙ РОСТОК' : 'НЕИЗВЕСТНЫЙ ПОБЕГ');
            const prefix = (otherKind || (!previewing && shownStage !== liveStage)) ? 'ОСМОТР' : 'РОСТ';
            const glowMark = (ff.active && ff.count > 0) ? ` · ✦ ${ff.count}/7` : '';
            plantInfo.textContent = `${title} // ${prefix} ${shownStage + 1}/6 · ${PLANT_STAGES[shownStage].toUpperCase()}${glowMark}`;
        }
    }

    // Индикатор «Светлячков тишины» (бережная серия тёплых вечеров 1..7 без жёсткого сгорания!)
    const ffRow = document.getElementById('station-firefly-row');
    const ffLabel = document.getElementById('station-firefly-label');
    const ffDots = document.getElementById('station-firefly-dots');
    if (ffRow && ffLabel && ffDots) {
        if (ff.active && ff.count > 0) {
            ffLabel.textContent = ff.count >= 7
                ? '✦ СВЕТЛЯЧКИ ТИШИНЫ: 7/7 · СОЗВЕЗДИЕ ПОЛНОЕ'
                : `✦ СВЕТЛЯЧКИ ТИШИНЫ: ${ff.count}/7 · СОГРЕТО СЕГОДНЯ`;
        } else if (ff.drowsy && ff.count > 0) {
            ffLabel.textContent = `◌ ОГОНЬКИ ДРЕМЛЮТ (${ff.count}/7) · ПОБУДЬТЕ РЯДОМ СЕГОДНЯ`;
        } else {
            ffLabel.textContent = '◌ СВЕТЛЯЧКИ ТИШИНЫ · ЗАЖГУТСЯ ОТ ПЕРВОГО ТЕПЛА ДНЯ';
        }
        const dots = ffDots.querySelectorAll ? ffDots.querySelectorAll('i') : [];
        for (let i = 0; i < dots.length; i++) {
            if (!dots[i].classList) continue;
            dots[i].classList.toggle('is-lit', ff.active && i < ff.count);
            dots[i].classList.toggle('is-drowsy', ff.drowsy && i < ff.count);
        }
    }

    const plantSub = document.getElementById('station-plant-sub');
    const rhythmTag = ledger.warmDays > 0
        ? `сегодня +${ledger.total}/${PROGRESSION_RULES.DAILY_WARMTH_CAP} · тёплых дней: ${ledger.warmDays}`
        : `сегодня +${ledger.total}/${PROGRESSION_RULES.DAILY_WARMTH_CAP} тепла`;
    if (plantSub) {
        if (otherKind) {
            plantSub.textContent = `PTS-осмотр вида · ваш родной по ID: ${ownSpec.kindName.toLowerCase()}`;
        } else if (!previewing && shownStage !== liveStage) {
            plantSub.textContent = `PTS-осмотр стадии · в реальности сейчас: ${liveStage < 0 ? 'пустой горшок' : `${liveStage + 1}/6`}`;
        } else if (previewing) {
            plantSub.textContent = `демо сезона · коснитесь окна для смены атмосферы или листайте PTS ниже`;
        } else if (shownStage < 0) {
            if (soilDry) {
                plantSub.textContent = `пауза ${awayDays} дн. без потерь · росток ждёт запуска «Шёпота»`;
            } else if (isSeedPot) {
                const left = Math.max(0, activeSteps[0] - effectiveWarmth);
                plantSub.textContent = `до первого ростка: ещё ${left} тепла · ${rhythmTag}`;
            } else if (adm.admitted) {
                plantSub.textContent = `почва готова · росток проснётся с первым «Шёпотом» · ${rhythmTag}`;
            } else {
                plantSub.textContent = `росток проснётся, когда откроется «Шёпот» · ${rhythmTag}`;
            }
        } else if (shownStage < 5) {
            const needNext = Math.max(0, activeSteps[shownStage + 1] - effectiveWarmth);
            if (shownStage === 4 && !isSeedPot && adm.live && needNext === 0 && adm.whisperAcks < PROGRESSION_RULES.WHISPER_BLOOM_ACKS) {
                plantSub.textContent = `для цветения нужны живые отклики «стало теплее»: ${adm.whisperAcks}/${PROGRESSION_RULES.WHISPER_BLOOM_ACKS}`;
            } else {
                const hint = shownStage + 1 === PROGRESSION_RULES.SPECIES_REVEAL_STAGE ? 'до открытия вида' : 'до след. стадии';
                plantSub.textContent = `${hint}: ещё ${needNext} тепла · ${rhythmTag}`;
            }
        } else {
            plantSub.textContent = roomAnim.dewActive
                ? `полное цветение · на лепестках держится свежая роса`
                : `полное цветение сезона · ${rhythmTag}`;
        }
    }

    // Тихая релизная шкала роста (6 точек без спойлеров — видна только после появления ростка!)
    const trackEl = document.getElementById('station-growth-track');
    if (trackEl && trackEl.classList) {
        trackEl.classList.toggle('hidden', shownStage < 0);
        if (trackEl.querySelectorAll) {
            trackEl.querySelectorAll('i').forEach((dot, idx) => {
                dot.classList.toggle('is-lit', idx <= shownStage);
                dot.classList.toggle('is-now', idx === shownStage);
            });
        }
    }

    // Оранжерея игрока (открывается в релизе, когда родной цветок достиг 6/6)
    const ghBox = document.getElementById('station-greenhouse');
    if (ghBox && ghBox.classList) {
        const hasGh = !previewing && gh.bloomed.includes(ownSpec.kind);
        ghBox.classList.toggle('hidden', !hasGh);
        const ghCount = document.getElementById('station-gh-count');
        if (ghCount) ghCount.textContent = `${gh.bloomed.length}/7 ВИДОВ`;
        const ghSlots = document.getElementById('station-gh-slots');
        if (ghSlots && hasGh && document.createElement) {
            ghSlots.textContent = '';
            gh.bloomed.forEach(k => {
                const b = document.createElement('button');
                b.type = 'button';
                const nm = PLANT_KINDS[k][0] + PLANT_KINDS[k].slice(1).toLowerCase();
                b.textContent = k === ownSpec.kind ? `★ ${nm}` : nm;
                const activeSlot = !isSeedPot && liveSpec.kind === k;
                b.setAttribute('aria-pressed', String(activeSlot));
                b.onclick = () => selectGreenhouseSlot(k);
                ghSlots.appendChild(b);
            });
            if (gh.activeSeed) {
                const sb = document.createElement('button');
                sb.type = 'button';
                const sg = Math.max(0, warmth - gh.activeSeed.startWarmth);
                const ss = plantStage(sg, { sprouted: true, steps: GREENHOUSE_WARMTH_STEPS });
                sb.textContent = ss >= PROGRESSION_RULES.SPECIES_REVEAL_STAGE
                    ? `🌱 ${PLANT_KINDS[gh.activeSeed.kind][0] + PLANT_KINDS[gh.activeSeed.kind].slice(1).toLowerCase()} (${ss + 1}/6)`
                    : `🌱 Семя (${ss < 0 ? '0' : ss + 1}/6)`;
                sb.setAttribute('aria-pressed', String(isSeedPot));
                sb.onclick = () => selectGreenhouseSlot('seed');
                ghSlots.appendChild(sb);
            } else if (gh.bloomed.length < PLANT_KINDS.length) {
                const nb = document.createElement('button');
                nb.type = 'button';
                nb.className = 'is-seed-action';
                nb.textContent = '+ Новое семя';
                nb.onclick = () => plantNewGreenhouseSeed(warmth, ownSpec);
                ghSlots.appendChild(nb);
            }
        }
    }

    // Доступность хотспота горшка / растения (без спойлера скрытого вида!)
    const plantBtn = room.querySelector('[data-obj="plant"]');
    if (plantBtn) {
        if (shownStage < 0) {
            plantBtn.setAttribute('aria-label', 'Пустой горшок с землёй — осмотреть');
        } else if (!speciesKnown) {
            plantBtn.setAttribute('aria-label', `Неизвестный росток, стадия ${shownStage + 1} из 6 — осмотреть`);
        } else {
            plantBtn.setAttribute('aria-label', `${spec.kindName[0] + spec.kindName.slice(1).toLowerCase()}, стадия ${shownStage + 1} из 6 — осмотреть`);
        }
    }

    // Диегетические панели окна и магнитофона
    syncContextPanels();

    // Тихая строка прогресса комнаты (без спойлера названия будущих фаз до их открытия!)
    const nextEl = document.getElementById('station-next');
    if (nextEl) {
        if (previewing) {
            nextEl.textContent = `Атмосфера: «${phase.name}». Коснитесь круглого окна, чтобы сменить час как игрок.`;
        } else if (next) {
            const winHint = unlocked >= 1 ? ' · окно меняет открытые состояния' : '';
            nextEl.textContent = `Воздух теплеет: ещё ${next.at - warmth} тепла до новой перемены за окном${winHint}.`;
        } else {
            nextEl.textContent = `Сейчас за окном: «${phase.name}». Коснитесь окна, чтобы выбрать любую атмосферу.`;
        }
    }

    const meter = document.getElementById('station-meter');
    if (meter) {
        meter.hidden = previewing || !next;
        if (!previewing && next) {
            meter.max = next.at - stationPhases[unlocked].at;
            meter.value = warmth - stationPhases[unlocked].at;
        }
    }

    // На «Рассвете» звёзды растворяются в утреннем свете, в ночных фазах сияют по рангу (холодный XP)
    room.querySelectorAll('.station-sky circle, .station-sky line').forEach(el => {
        el.style.opacity = active === 3 ? 0 : (Number(el.dataset.star) <= stars ? 1 : 0);
    });
    const stEl = document.getElementById('station-stars');
    if (stEl) {
        stEl.textContent = active === 3
            ? `Созвездие рангов: ${stars}/6 · растаяло в лучах рассвета (верните ночь через окно, чтобы увидеть).`
            : `Созвездие рангов: ${stars}/6 · холодные звёзды опыта свидетеля.`;
    }

    // PTS-инспектор (строго скрыт в релизе; на PTS аккуратно сворачивается, чтобы видеть чистый интерфейс игрока)
    const ptsWrap = document.getElementById('pts-panel');
    const ptsBody = document.getElementById('pts-body');
    const ptsToggle = document.getElementById('pts-drawer-toggle');
    if (ptsWrap && ptsWrap.classList) {
        ptsWrap.classList.toggle('hidden', !isPtsMode());
    }
    if (ptsToggle) {
        ptsToggle.setAttribute('aria-expanded', String(!!roomAnim.ptsOpen));
        ptsToggle.textContent = roomAnim.ptsOpen
            ? 'PTS // СКРЫТЬ ИНСПЕКТОР (ЧИСТЫЙ ВИД ИГРОКА)'
            : 'PTS // ИНСПЕКТОР (СТАДИИ 0–6 · 7 ВИДОВ · РАССВЕТ)';
    }
    if (ptsBody && ptsBody.classList) {
        ptsBody.classList.toggle('hidden', !roomAnim.ptsOpen);
    }

    const toggleBtn = document.getElementById('station-kinds-toggle');
    const kindsWrap = document.getElementById('station-plant-kinds');
    if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', String(roomAnim.galleryOpen));
        toggleBtn.textContent = roomAnim.galleryOpen ? 'СКРЫТЬ ВИДЫ' : 'ВСЕ 7 ВИДОВ';
    }
    if (kindsWrap && kindsWrap.classList) {
        kindsWrap.classList.toggle('hidden', !roomAnim.galleryOpen);
    }
    room.querySelectorAll('[data-kind-btn]').forEach((btn, idx) => {
        const isOwn = idx === ownSpec.kind;
        const label = PLANT_KINDS[idx][0] + PLANT_KINDS[idx].slice(1).toLowerCase();
        btn.textContent = isOwn ? `★ ${label}` : label;
        btn.classList.toggle('is-own', isOwn);
        btn.setAttribute('aria-pressed', String(idx === spec.kind));
    });

    room.querySelectorAll('[data-stage-btn]').forEach(btn => {
        const sVal = Number(btn.dataset.stageBtn);
        const reached = (previewing || sVal <= liveStage) && !otherKind;
        const selected = sVal === shownStage;
        btn.classList.toggle('is-reached', reached);
        btn.classList.toggle('is-live', !previewing && !otherKind && sVal === liveStage);
        btn.classList.toggle('is-peek', !reached && selected);
        btn.setAttribute('aria-pressed', String(selected));
        btn.title = sVal < 0
            ? 'Стадия 0: пустой горшок (до первого «Шёпота»)'
            : `Стадия ${sVal + 1}/6: ${PLANT_STAGES[sVal]} (${PLANT_WARMTH_STEPS[sVal]} тепла)`;
    });

    room.querySelectorAll('[data-preset]').forEach((button, i) => {
        button.disabled = !previewing && i > unlocked;
        button.setAttribute('aria-pressed', String(i === active));
        const sub = button.querySelector('span');
        if (sub) sub.textContent = !previewing && i > unlocked ? `${stationPhases[i].at} тепла` : i === active ? 'выбрано' : 'открыто';
    });

    const ptsMaxBtn = document.getElementById('pts-preview');
    if (ptsMaxBtn) {
        ptsMaxBtn.textContent = previewing ? 'PTS: ВЕРНУТЬСЯ В РЕЖИМ ИГРОКА' : 'PTS: ВКЛЮЧИТЬ МАКС. УРОВЕНЬ (СЕЗОН 90 ДН.)';
    }
    const ptsDewBtn = document.getElementById('pts-dew-btn');
    if (ptsDewBtn) {
        ptsDewBtn.setAttribute('aria-pressed', String(!!roomAnim.ptsDew));
        ptsDewBtn.textContent = roomAnim.ptsDew ? 'СВЕТЛЯЧКИ: 7/7 ВКЛ' : 'СВЕТЛЯЧКИ 7/7';
    }
    const ptsCatBtn = document.getElementById('pts-cat-btn');
    if (ptsCatBtn) {
        const sc = catSpec(undefined, Number.isInteger(roomAnim.inspectCatCoat) ? roomAnim.inspectCatCoat : null);
        ptsCatBtn.setAttribute('aria-pressed', String(Number.isInteger(roomAnim.inspectCatCoat)));
        ptsCatBtn.textContent = `КОТ: ${sc.coat.name.toUpperCase()}`;
    }
    const ptsDogBtn = document.getElementById('pts-dog-btn');
    if (ptsDogBtn) {
        const sd = dogSpec(undefined, Number.isInteger(roomAnim.inspectDogBreed) ? roomAnim.inspectDogBreed : null);
        ptsDogBtn.setAttribute('aria-pressed', String(Number.isInteger(roomAnim.inspectDogBreed)));
        ptsDogBtn.textContent = `ПЁС: ${sd.breed.name.toUpperCase()}`;
    }
    syncCompanionHotspots();

    renderPager(warmth, ledger, gh.bloomed.includes(ownSpec.kind));
    ensureStationLoop();
}

function syncCompanionHotspots() {
    if (typeof document === 'undefined') return;
    const activeCosm = getRoomCosmeticsSafe();
    const dogHit = document.getElementById('station-hit-dog');
    if (dogHit && dogHit.classList) {
        const hasDog = !!activeCosm.dog;
        dogHit.classList.toggle('hidden', !hasDog);
        if (hasDog) {
            const sd = dogSpec(undefined, Number.isInteger(roomAnim.inspectDogBreed) ? roomAnim.inspectDogBreed : null);
            const label = `Погладить пса (${sd.breed.name})`;
            dogHit.setAttribute('aria-label', label);
            dogHit.title = label;
        }
    }
    const bedHit = document.getElementById('station-hit-bed');
    if (bedHit) {
        if (activeCosm.cat) {
            const sc = catSpec(undefined, Number.isInteger(roomAnim.inspectCatCoat) ? roomAnim.inspectCatCoat : null);
            const label = `Погладить кота (${sc.coat.name})`;
            bedHit.setAttribute('aria-label', label);
            bedHit.title = label;
        } else {
            bedHit.setAttribute('aria-label', 'Осмотреть кушетку');
            bedHit.title = 'Осмотреть кушетку';
        }
    }
}

function resetStationPreview() {
    const previewing = typeof roomPreview !== 'undefined' && !!roomPreview;
    roomAnim.previewPhase = stationPhases.length - 1;
    roomAnim.previewStage = null;
    roomAnim.inspectStage = null;
    roomAnim.inspectKind = null;
    roomAnim.inspectCatCoat = null;
    roomAnim.inspectDogBreed = null;
    roomAnim.ptsOpen = previewing ? true : roomAnim.ptsOpen;
    roomAnim.customEntry = '';
    roomAnim.customMode = '';
}

function equipStationPhase(i, fromWindow) {
    if (!Number.isInteger(i) || !stationPhases[i]) return;
    if (typeof roomPreview !== 'undefined' && roomPreview) {
        roomAnim.previewPhase = i;
        if (!fromWindow) roomAnim.previewStage = null;
        else if (roomAnim.previewStage === null) roomAnim.previewStage = 5; // как у игрока на максе: цветок остаётся при смене неба!
        roomAnim.customEntry = '';
        roomAnim.customMode = fromWindow ? `ОКНО // ${stationPhases[i].name.toUpperCase()}` : '';
        if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
        renderRoom();
        return;
    }
    const warmth = (typeof player !== 'undefined' && player.warmth) || 0;
    if (warmth < stationPhases[i].at) return;
    roomAnim.customEntry = '';
    roomAnim.customMode = fromWindow ? `ОКНО // ${stationPhases[i].name.toUpperCase()}` : '';
    if (!lsSet('soma_station_phase', String(i)) && typeof notify === 'function') {
        notify('Не удалось сохранить атмосферу на этом устройстве.');
    }
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    renderRoom();
}

if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) ensureStationLoop();
    });
}
