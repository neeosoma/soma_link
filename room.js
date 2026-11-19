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
        pot_kintsugi: ['#090608', '#1b1216', '#3a2730'], // матовая чёрная глина раку + золотые швы кинцуги
        pot_cinnabar: ['#2b0409', '#7d1120', '#cf384b'], // императорский киноварный лак
        pot_moon:     ['#141118', '#3a3442', '#7d7285']  // дымчатый лунный фарфор
    };
    const potSkin = so.potSkin && CUSTOM_POTS[so.potSkin] ? so.potSkin : '';
    const [pDark, pMid, pLight] = potSkin ? CUSTOM_POTS[potSkin] : sp.pot;

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
    if (potSkin === 'pot_kintsugi') {
        g.save();
        g.lineCap = 'round';
        g.lineJoin = 'round';
        const drawGoldSeam = pts => {
            g.strokeStyle = 'rgba(130, 78, 16, 0.85)';
            g.lineWidth = 2.4;
            g.beginPath();
            pts.forEach(([x, y], i) => { if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); });
            g.stroke();
            g.strokeStyle = '#f6cb64';
            g.lineWidth = 1.35;
            g.stroke();
            g.strokeStyle = 'rgba(255, 245, 198, 0.78)';
            g.lineWidth = 0.55;
            g.stroke();
        };
        // Главный золотой шов исцеления с живой развилкой по керамике
        drawGoldSeam([
            [bx - tw * 0.44, topY + 6],
            [bx - tw * 0.28, topY + sh.h * 0.34],
            [bx - tw * 0.06, topY + sh.h * 0.52],
            [bx + bw * 0.22, topY + sh.h * 0.78],
            [bx + bw * 0.44, baseY - 2]
        ]);
        drawGoldSeam([
            [bx - tw * 0.06, topY + sh.h * 0.52],
            [bx + tw * 0.22, topY + sh.h * 0.40],
            [bx + tw * 0.46, topY + 9]
        ]);
        drawGoldSeam([
            [bx - tw * 0.28, topY + sh.h * 0.34],
            [bx - bw * 0.52, topY + sh.h * 0.66]
        ]);
        g.restore();
    } else {
        g.strokeStyle = potSkin === 'pot_cinnabar'
            ? 'rgba(255, 196, 138, 0.52)'
            : mixHex(pLight, '#ff9aa4', 0.22, stage >= 3 ? 0.42 : 0.22);
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(bx - bandW, bandY);
        g.quadraticCurveTo(bx, bandY + 9, bx + bandW, bandY);
        g.stroke();
        if (potSkin === 'pot_cinnabar') {
            g.beginPath();
            g.moveTo(bx - bandW * 0.96, bandY + 5);
            g.quadraticCurveTo(bx, bandY + 14, bx + bandW * 0.96, bandY + 5);
            g.stroke();
        }
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

    // Живая роса на сутки после подтверждённого «Шёпота» (лежит строго на листьях и лепестках каждого вида!)
    if (o.dew && ctx.createRadialGradient) {
        const dewAnchors = s === 0
            ? [[0, -18, 2.2]]
            : spec.kind === 1 // кактус: на рёбрах центрального ствола и макушке
                ? [[-7, -42 - s * 14, 2.3], [6, -68 - s * 18, 2.5], [-4, -26 - s * 8, 2.1]]
                : spec.kind === 2 // суккулент: на мясистых листьях каменной розы
                    ? [[-18 - s * 4, -14 - s * 2, 2.4], [16 + s * 4, -16 - s * 2, 2.4], [0, -24 - s * 4, 2.2], [-8, -10, 2.0]]
                    : spec.kind === 6 // бонсай: строго на вершинной шапке и боковых облаках кроны
                        ? [[(spec.lean >= 0 ? 1 : -1) * (10 + s * 2), -64 - s * 24, 2.5], [-(spec.lean >= 0 ? 1 : -1) * (24 + s * 4), -48 - s * 14, 2.3], [(spec.lean >= 0 ? 1 : -1) * (26 + s * 4), -54 - s * 17, 2.3]]
                        : [[-14 - s * 3, -34 - s * 14, 2.4], [13 + s * 3, -46 - s * 17, 2.5], [0, -28 - s * 11, 2.2], [-6, -54 - s * 20, 2.2]];
        const cap = Math.min(dewAnchors.length, 1 + Math.ceil((s + 1) * 0.6));
        for (let d = 0; d < cap; d++) {
            const [ox, oy, dr] = dewAnchors[d];
            drawDew(ctx, bx + ox, by + oy, dr);
        }
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
        dewUntil: Math.max(0, Number(raw.dewUntil) || 0)
    };
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
            ledger.warmDays += 1;
            ledger.lastWarmDay = ledger.day;
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

    // На макс. фазе («Рассвет») за домами дышит живая ало-янтарная заря (без дождя и без ночного созвездия!)
    if (phase >= 2) {
        const isDawn = phase === 3;
        const breathe = 0.5 + 0.5 * Math.sin(now * 0.00052);
        const shiftX = Math.sin(now * 0.00028) * 12;
        const intensity = isDawn ? (0.34 + breathe * 0.09 + winGlow * 0.06) : (0.09 + breathe * 0.025);

        g.save();
        g.globalCompositeOperation = 'screen';
        const dg = g.createRadialGradient(WIN_CX + shiftX, 206, 8, WIN_CX + shiftX * 0.4, 190, 166);
        dg.addColorStop(0, `rgba(255,134,114,${intensity.toFixed(3)})`);
        dg.addColorStop(0.4, `rgba(236,54,70,${(intensity * 0.65).toFixed(3)})`);
        dg.addColorStop(0.76, `rgba(146,18,36,${(intensity * 0.28).toFixed(3)})`);
        dg.addColorStop(1, 'rgba(90,8,20,0)');
        g.fillStyle = dg;
        g.fillRect(WIN_CX - WIN_RX, WIN_CY - WIN_RY, WIN_RX * 2, WIN_RY * 2);

        if (isDawn) {
            const bandY = 180 + Math.sin(now * 0.00036) * 4.5;
            const hg = g.createLinearGradient(0, bandY - 56, 0, bandY + 58);
            hg.addColorStop(0, 'rgba(255,92,96,0)');
            hg.addColorStop(0.5, `rgba(255,122,108,${(0.14 + breathe * 0.055).toFixed(3)})`);
            hg.addColorStop(1, 'rgba(200,32,52,0)');
            g.fillStyle = hg;
            g.fillRect(WIN_CX - WIN_RX, bandY - 56, WIN_RX * 2, 114);
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

// 2) Плавный объёмный свет ИЗ круглого окна вниз на растение и ковёр
function drawWindowLightBeams(g, now, phase, winGlow) {
    if (phase < 2) return;
    const isMax = phase === 3;
    const strength = (isMax ? 1 : 0.26) + winGlow * 0.14;
    const b1 = 0.5 + 0.5 * Math.sin(now * 0.00058);
    const b2 = 0.5 + 0.5 * Math.sin(now * 0.00039 + 1.8);
    const sway = Math.sin(now * 0.00032) * 12;

    g.save();
    g.globalCompositeOperation = 'screen';

    // Тёплый блик рассвета по нижней внутренней кромке круглого окна
    const rimA = (0.18 + b1 * 0.07) * strength;
    g.strokeStyle = `rgba(255,134,132,${rimA.toFixed(3)})`;
    g.lineWidth = 2.8;
    g.beginPath();
    g.ellipse(WIN_CX, WIN_CY + 1, WIN_RX + 1, WIN_RY + 1, 0, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();

    // Бархатные объёмные лучи, льющиеся из проёма круглого окна на пол комнаты
    const fanAngles = [-0.23, -0.11, 0.0, 0.11, 0.23];
    fanAngles.forEach((baseAng, idx) => {
        const drift = Math.sin(now * (0.00036 + idx * 0.00006) + idx * 1.4) * 0.032;
        const pulseA = 0.5 + 0.5 * Math.sin(now * (0.00052 + idx * 0.00008) + idx * 1.1);
        const rayA = (0.052 + pulseA * 0.038) * (idx === 2 ? 1.25 : 0.9) * strength;
        g.save();
        g.translate(WIN_CX, WIN_CY - 20);
        g.rotate(baseAng + drift);
        g.scale(0.33 + (idx === 2 ? 0.09 : 0), 1);
        const rg = g.createRadialGradient(0, 118, 10, 0, 155, 222);
        rg.addColorStop(0, `rgba(255,126,118,${rayA.toFixed(3)})`);
        rg.addColorStop(0.55, `rgba(230,52,70,${(rayA * 0.56).toFixed(3)})`);
        rg.addColorStop(1, 'rgba(150,18,34,0)');
        g.fillStyle = rg;
        g.beginPath(); g.arc(0, 155, 222, 0, Math.PI * 2); g.fill();
        g.restore();
    });

    // Световая проекция окна на ковре (плавно дышит и чуть плывёт вместе с лучами)
    if (isMax) {
        g.save();
        g.translate(WIN_CX + sway * 0.6, 418);
        g.scale(1, 0.34);
        const pg = g.createRadialGradient(0, -34, 12, 0, 0, 212);
        pg.addColorStop(0, `rgba(255,112,110,${(0.2 + b2 * 0.065).toFixed(3)})`);
        pg.addColorStop(0.52, `rgba(222,42,62,${(0.12 + b1 * 0.04).toFixed(3)})`);
        pg.addColorStop(1, 'rgba(140,14,30,0)');
        g.fillStyle = pg;
        g.beginPath(); g.arc(0, 0, 212, 0, Math.PI * 2); g.fill();
        g.restore();
    }

    // Тёплые пылинки внутри конуса света из окна
    const moteCnt = isMax ? FX_MOTES.length : 8;
    for (let i = 0; i < moteCnt; i++) {
        const m = FX_MOTES[i];
        const v = (m.v + now * m.speed) % 1;
        const span = 94 + v * 120;
        const mx = WIN_CX + (m.u - 0.5) * span * 2 + Math.sin(now * 0.0005 + m.phase) * 8 + sway * v * 0.45;
        const my = 152 + v * 296;
        const edgeFade = Math.sin(v * Math.PI) * (1 - Math.abs(m.u - 0.5) * 1.4);
        const ma = Math.max(0, edgeFade * (0.45 + 0.55 * Math.sin(now * 0.0013 + m.phase)) * (isMax ? 0.48 : 0.22));
        if (ma < 0.03) continue;
        g.fillStyle = `rgba(255,198,190,${ma.toFixed(3)})`;
        g.beginPath(); g.arc(mx, my, m.size, 0, Math.PI * 2); g.fill();
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

// Косметические штрихи комнаты: пар над родной кружкой у терминала и спящий чёрный кот на кушетке
function getRoomCosmeticsSafe() {
    if (typeof getActiveCosmetics === 'function') {
        try { return getActiveCosmetics() || {}; } catch (_) {}
    }
    return roomAnim.cosmeticsOverride || {};
}

function drawRoomCosmetics(g, now, phase) {
    const cosm = getRoomCosmeticsSafe();
    const still = prefersStillRoom();

    // 1) Тонкий живой пар, поднимающийся прямо из родной керамической кружки на столе (x=238, y=286)
    if (cosm.steam) {
        g.save();
        g.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const cycle = still ? (0.3 + i * 0.22) : (((now * 0.00024) + i * 0.333) % 1);
            const alpha = Math.sin(cycle * Math.PI) * (phase === 3 ? 0.32 : 0.26);
            if (alpha <= 0.01) continue;
            const sx = 237.8 + (i - 1) * 2.1;
            const sy = 285.5 - cycle * 3.5;
            const topY = sy - 11 - cycle * 13;
            const sway = Math.sin((still ? 1 : now * 0.0016) + i * 2.1) * 3.1;
            g.strokeStyle = `rgba(255, 174, 180, ${alpha.toFixed(3)})`;
            g.lineWidth = 1.25 - cycle * 0.42;
            g.beginPath();
            g.moveTo(sx, sy);
            g.bezierCurveTo(sx - sway, sy - 6, sx + sway * 1.15, topY + 6, sx + sway * 0.55, topY);
            g.stroke();
        }
        g.restore();
    }

    // 2) Спящий чёрный кот, свернувшийся клубком на стёганой багровой кушетке (x=626, y=334)
    if (cosm.cat) {
        const cx = 626, cy = 334;
        const breathe = still ? 0 : Math.sin(now * 0.00145) * 0.85;
        const tailWave = still ? 0 : Math.pow(Math.max(0, Math.sin(now * 0.00075)), 5) * 2.8;
        const petElapsed = now - (roomAnim.catPetStart || -1e9);
        const purrBlink = !still && petElapsed > 0 && petElapsed < 1900;
        const nlBoost = !still ? softBell(now - roomAnim.nightRStart, 650, 900, 1700) : 0;
        const rimAlpha = 0.54 + (phase >= 2 ? 0.14 : 0) + nlBoost * 0.28;

        g.save();
        // Глубокая мягкая тень в складках тёмно-багрового покрывала
        g.fillStyle = 'rgba(5, 1, 2, 0.78)';
        g.beginPath();
        g.ellipse(cx + 1, cy + 5.5, 22.5, 7.2, 0.05, 0, Math.PI * 2);
        g.fill();

        // Округлый бархатно-чёрный корпус спящего клубка (дышит спинкой)
        if (g.createRadialGradient) {
            const bg = g.createRadialGradient(cx + 2, cy - 5 - breathe, 2, cx, cy, 22);
            bg.addColorStop(0, '#24080e');
            bg.addColorStop(0.55, '#110306');
            bg.addColorStop(1, '#070103');
            g.fillStyle = bg;
        } else g.fillStyle = '#0e0305';
        g.beginPath();
        g.moveTo(cx - 18, cy + 3);
        g.bezierCurveTo(cx - 19, cy - 8 - breathe, cx - 5, cy - 12.5 - breathe, cx + 8, cy - 10.5 - breathe);
        g.bezierCurveTo(cx + 19, cy - 8.5 - breathe * 0.6, cx + 22, cy - 1, cx + 19, cy + 4.5);
        g.bezierCurveTo(cx + 11, cy + 8.5, cx - 10, cy + 8.2, cx - 18, cy + 3);
        g.closePath();
        g.fill();

        // Тёплый багровый контровой блик по спинке от ночника и круглого окна
        g.strokeStyle = `rgba(198, 54, 72, ${rimAlpha.toFixed(3)})`;
        g.lineWidth = 1.25;
        g.beginPath();
        g.moveTo(cx - 12, cy - 6.8 - breathe * 0.8);
        g.quadraticCurveTo(cx + 3, cy - 12.2 - breathe, cx + 17.5, cy - 5.2 - breathe * 0.5);
        g.stroke();

        // Складка бедра для живого объёма
        g.strokeStyle = 'rgba(138, 34, 48, 0.34)';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(cx + 7, cy + 1, 8.5, Math.PI * 1.15, Math.PI * 1.78);
        g.stroke();

        // Голова, уютно уложенная на передние лапки
        const hx = cx - 11.5, hy = cy - 1.2 - breathe * 0.35;
        g.fillStyle = '#0c0205';
        g.beginPath();
        g.ellipse(hx, hy, 8.2, 6.6, -0.12, 0, Math.PI * 2);
        g.fill();

        // Острые кошачьи ушки с тонким алым кантом
        const drawEar = (ex, ey, lx, ly, rx, ry) => {
            g.fillStyle = '#0b0204';
            g.beginPath();
            g.moveTo(lx, ly); g.lineTo(ex, ey); g.lineTo(rx, ry); g.closePath();
            g.fill();
            g.strokeStyle = `rgba(190, 52, 70, ${(rimAlpha * 0.9).toFixed(3)})`;
            g.lineWidth = 0.95;
            g.beginPath(); g.moveTo(lx, ly); g.lineTo(ex, ey); g.lineTo(rx, ry); g.stroke();
            g.fillStyle = 'rgba(132, 34, 48, 0.54)';
            g.beginPath();
            g.moveTo(lx + 1.2, ly - 0.3); g.lineTo(ex + 0.3, ey + 1.7); g.lineTo(rx - 1.1, ry - 0.2);
            g.closePath(); g.fill();
        };
        drawEar(hx - 5.2, hy - 10.6, hx - 7.4, hy - 3.6, hx - 1.6, hy - 5.2);
        drawEar(hx + 3.2, hy - 10.8 + (purrBlink ? -0.6 : 0), hx - 0.4, hy - 5.4, hx + 5.8, hy - 3.8);

        // Глазки: мирно сомкнуты во сне, а при поглаживании на миг блестят тёплым янтарём
        if (purrBlink && petElapsed > 180 && petElapsed < 1450) {
            g.fillStyle = '#ffb85c';
            g.beginPath(); g.ellipse(hx - 3.4, hy + 0.8, 1.5, 0.85, 0.1, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.ellipse(hx + 1.6, hy + 0.9, 1.5, 0.85, -0.1, 0, Math.PI * 2); g.fill();
        } else {
            g.strokeStyle = 'rgba(165, 56, 70, 0.45)';
            g.lineWidth = 0.85;
            g.beginPath(); g.arc(hx - 3.4, hy + 0.6, 1.6, 0.2, Math.PI - 0.2); g.stroke();
            g.beginPath(); g.arc(hx + 1.6, hy + 0.7, 1.6, 0.2, Math.PI - 0.2); g.stroke();
        }

        // Пушистый чёрный хвост, мягко обнимающий бок
        g.strokeStyle = '#090204';
        g.lineWidth = 3.4;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(cx + 17, cy + 3.5);
        g.bezierCurveTo(cx + 14, cy + 8.5, cx - 2, cy + 9.2, cx - 10, cy + 6.2 - tailWave);
        g.stroke();
        g.strokeStyle = `rgba(176, 48, 66, ${(rimAlpha * 0.72).toFixed(3)})`;
        g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(cx + 15, cy + 5.2);
        g.quadraticCurveTo(cx + 3, cy + 8.8, cx - 9.5, cy + 5.6 - tailWave);
        g.stroke();
        g.restore();
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
    drawRoomCosmetics(g, now, phase);
    drawWindowLightBeams(g, now, phase, winGlow);
    updateSwingingLamp(g, now);
    updateNightlights(g, now);
    drawCassetteDeck(now);

    // Мягкое тёплое дыхание ЭЛТ и шкалы радио при касании (без лишних линий и без вспышек)
    if (crtGlow > 0.02) {
        g.save();
        g.globalCompositeOperation = 'screen';
        radialAura(g, 177, 241, 40, '#ff7888', '#a81830', crtGlow * 0.18);
        g.restore();
    }
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
        // Тихое тёплое кошачье мурчание под ладонью
        for (let p = 0; p < 5; p++) tone(52 + (p % 2) * 4, 0.2, 'triangle', 0.018, p * 0.14, 46);
        tone(294, 0.5, 'sine', 0.012, 0.1);
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
            fxX = ((event.clientX - rect.left) / rect.width) * FX_W;
            fxY = ((event.clientY - rect.top) / rect.height) * FX_H;
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
            modeLabel = 'ЖУРНАЛ // ЧЁРНЫЙ КОТ';
            line = nextRoomLine('cat', [
                'Чёрный кот приоткрыл сонные янтарные глаза и тихо замурчал под ладонью, согревая край пледа.',
                'Тёплый бархатный клубок мерно дышит у подушки и лениво повёл кончиком хвоста в ответ на касание.'
            ]);
            playObjectTone('cat');
        } else {
            modeLabel = 'ЖУРНАЛ // КУШЕТКА';
            line = nextRoomLine('bed', ROOM_LINES.bed);
            playObjectTone('bed');
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
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
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
    roomAnim.dewActive = dewActive && shownStage >= 0;
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
            const dewMark = roomAnim.dewActive ? ' · РОСА' : '';
            plantInfo.textContent = `${title} // ${prefix} ${shownStage + 1}/6 · ${PLANT_STAGES[shownStage].toUpperCase()}${dewMark}`;
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
    if (ptsDewBtn) ptsDewBtn.setAttribute('aria-pressed', String(!!roomAnim.ptsDew));

    renderPager(warmth, ledger, gh.bloomed.includes(ownSpec.kind));
    ensureStationLoop();
}

function resetStationPreview() {
    const previewing = typeof roomPreview !== 'undefined' && !!roomPreview;
    roomAnim.previewPhase = stationPhases.length - 1;
    roomAnim.previewStage = null;
    roomAnim.inspectStage = null;
    roomAnim.inspectKind = null;
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
