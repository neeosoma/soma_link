const stationPhases = [
    { at: 0,   name: 'Дождь',    entry: 'Город шумит за мокрым стеклом. В пустом горшке тихо спит земля.' },
    { at: 20,  name: 'Оттепель', entry: 'Тучи расступились: в морозной дымке сияет лунное гало, с арки окна тихо звенит живая капель, а комнату наполняет серебристый свет.' },
    { at: 108, name: 'Очаг',     entry: 'Под золотым серпом луны над городом плывут тёплые небесные фонарики, а ковёр согрет живым светом.' },
    { at: 240, name: 'Рассвет',  entry: 'Дождь стих. За окном разливается тёплый фиалково-космический рассвет в россыпи утренних звёзд.' }
];

// Сезонный ритм (~90 тёплых дней до цветения, без гринда и без наказаний за паузы)
const PROGRESSION_RULES = {
    DAILY_HOLD_CAP: 2,         // до +2 тепла/день за тихое дочитывание постов
    DAILY_TRAINER_CAP: 2,      // до +2 тепла/день за точное слушание в терминале
    DAILY_WARMTH_CAP: 4,       // потолок +4 тепла/день за базовые ритуалы
    WHISPER_BLOOM_ACKS: 5,     // обратная совместимость для опционального фильтра requireAcks
    WHISPER_MIN_LEN: 13,       // минимальная длина «Шёпота» (13 символов)
    WHISPER_MAX_LEN: 333,      // максимальная длина «Шёпота» (333 символа)
    DAILY_WHISPER_SEND_CAP: 3, // не более 3 отправленных «Шёпотов» в сутки
    DAILY_WHISPER_ACK_CAP: 1,  // бонус за сохранение твоего «Шёпота» на кассету — строго не более 1 раза в сутки!
    WHISPER_ACK_WARMTH: 4,     // +4 Тепла на рост растения (1 раз в сутки), когда твой «Шёпот» сохранили на кассету
    SPECIES_REVEAL_STAGE: 2,   // вид раскрывается на 3/6 (~1 месяц)
    DRY_SOIL_DAYS: 5,          // мягкая заметка о подсохшей земле без потери прогресса
    SEASON_WARMTH: 360         // полный сезон тепла (90 тёплых дней × 4)
};

// ===== УНИКАЛЬНОЕ РАСТЕНИЕ ИГРОКА (8 земных видов + 9-е тайное внеземное растение-пасхалка!) =====
const PLANT_KINDS = ['ПАПОРОТНИК', 'КАКТУС', 'СУККУЛЕНТ', 'БАМБУК', 'ЛИАНА', 'ЦВЕТОК', 'БОНСАЙ', 'ОРХИДЕЯ'];
const PLANT_STAGES = ['росток', 'всходы', 'побеги', 'крона', 'бутоны', 'цветение'];
// Нелинейная сезонная шкала: нед. 1 (20) → нед. 2 (52) → 1 мес. (108) → 1.5 мес. (180) → 2 мес. (240) → 3 мес. (360)
const PLANT_WARMTH_STEPS = [20, 52, 108, 180, 240, 360];
// Шкала для новых семян в Оранжерее после расцвета родного вида (~75 тёплых дней на вид, полный цикл на все 8)
const GREENHOUSE_WARMTH_STEPS = [16, 48, 96, 156, 216, 300];
// Секретное 9-е внеземное семя-пасхалка (1 из 7 навсегда на игрока СТРОГО после 8/8 земных видов!)
const ALIEN_WARMTH_STEPS = [48, 132, 256, 412, 576, 760];

// 7 уникальных неземных форм жизни (9-я тайная пасхалка: после 8/8 земных растений игроку достаётся ТОЛЬКО ОДИН вид навсегда!)
const ALIEN_KINDS = [
    {
        id: 'nebula_seraph',
        name: 'СЕРАФИМ ТУМАННОСТИ',
        epithet: 'Парящие опалово-фиалковые крылья света вокруг живого звёздного ядра',
        core: '#fff5dc', mid: '#c77dff', deep: '#4c1d95', accent: '#ff8fab', stem: '#7dd3fc', aura: '#a855f7',
        note: 'Шесть полупрозрачных крыльев из живого перламутра невесомо дышат вокруг тёплой золотой звезды, роняя в комнату пыльцу далёкой туманности.'
    },
    {
        id: 'aether_medusa',
        name: 'ЭФИРНАЯ МЕДУЗА',
        epithet: 'Биолюминесцентный купол аквамарина и орхидеи с поющими нитями росы',
        core: '#ecfeff', mid: '#38bdf8', deep: '#1e3a8a', accent: '#e879f9', stem: '#67e8f9', aura: '#22d3ee',
        note: 'Невесомый стеклянный купол мерно пульсирует над горшком, переливаясь бирюзой и сиренью, а с его шёлковых нитей поднимаются вверх жемчужины света.'
    },
    {
        id: 'prism_lotus',
        name: 'ЛОТОС ЗАТМЕНИЯ',
        epithet: 'Двенадцать призматических лепестков, хранящих парящее солнце с короной',
        core: '#fffbeb', mid: '#fbbf24', deep: '#7c2d12', accent: '#f472b6', stem: '#34d399', aura: '#f59e0b',
        note: 'Радужно-изумрудная чаша из двенадцати зеркальных лепестков раскрылась вокруг крошечного затмения — его золотая корона беззвучно согревает полумрак.'
    },
    {
        id: 'crystal_choir',
        name: 'ХРУСТАЛЬНЫЙ ХОР',
        epithet: 'Поющие друзы аметиста и целестина, соединённые дугами живого света',
        core: '#f5f3ff', mid: '#a78bfa', deep: '#312e81', accent: '#5eead4', stem: '#c4b5fd', aura: '#818cf8',
        note: 'Гранёные кристаллы выросли из тёмной земли и парят на миллиметр друг над другом — между их вершинами переливаются тихие аккорды бирюзового сияния.'
    },
    {
        id: 'supernova_crown',
        name: 'КОРОНА СВЕРХНОВОЙ',
        epithet: 'Обсидиановое древо космоса, цветущее живыми спиральными галактиками',
        core: '#fff7ed', mid: '#fb7185', deep: '#581c87', accent: '#fde68a', stem: '#c084fc', aura: '#ec4899',
        note: 'Изогнутые ветви цвета ночного обсидиана пронизаны золотыми прожилками, а вместо соцветий над ними медленно вращаются миниатюрные галактики.'
    },
    {
        id: 'aurora_tear',
        name: 'СЛЕЗА АВРОРЫ',
        epithet: 'Плакучая ива из лунного стекла, струящаяся лентами полярного сияния',
        core: '#f0fdfa', mid: '#2dd4bf', deep: '#115e59', accent: '#c084fc', stem: '#99f6e4', aura: '#14b8a6',
        note: 'Серебряно-стеклянный ствол склонился в тихом поклоне — с его ветвей стекают живые шёлковые занавеси изумрудно-фиалкового северного сияния.'
    },
    {
        id: 'eternity_iris',
        name: 'ОКО ВЕЧНОСТИ',
        epithet: 'Бархатный индиго-золотой цветок со звёздной радужкой и двумя лунами',
        core: '#fefce8', mid: '#818cf8', deep: '#1e1b4b', accent: '#fcd34d', stem: '#93c5fd', aura: '#6366f1',
        note: 'Королевский космический бутон из бархата цвета индиго и сусального золота хранит внутри целое звёздное небо, вокруг которого плывут две крошечные луны.'
    }
];
const ALIEN_STAGE_NOTES = [
    'В глубине земли вспыхнула тихая перламутровая искра — семя из иного мира медленно просыпается от вашего тепла.',
    'Над почвой поднялся полупрозрачный светящийся росток: он дышит медленнее земных цветов и чутко слушает комнату.',
    'Неземной побег окутался тонкой дымкой пыльцы — вокруг него изредка отрываются от земли невесомые капли света.',
    'Крона пришельца обретает немыслимую геометрию: лепестки и нити переливаются оттенками, которых нет в NEEO~CITY.',
    'В центре неземного растения зарождается живое светило — ещё много тёплых вечеров, и случится невозможное цветение.'
];

const EMPTY_POT_LINES = {
    cold: [
        'Пустой керамический горшок с тёмной землёй. От чужих драм здесь ничего не вырастет — росток проснётся с первым шепотом.',
        'Ладонь чувствует прохладную глину. Земля ждёт первого настоящего тепла, отданного живому человеку.'
    ],
    ready: [
        'Земля в горшке согрелась и затаила дыхание. Когда заработает частота «Шёпот», ваш первый отклик разбудит здесь жизнь.',
        'Допуск к тёплой линии получен — почва готова. Осталось дождаться сигнала на пейджере и согреть кого-то по-настоящему.'
    ],
    seed: [
        'В свежей земле дремлет новое неизвестное семя. Оно растёт только пока стоит здесь, в тепле вашей комнаты.',
        'Тишина над новым горшком. Какой из видов станции спит внутри, откроется со временем — берегите его в комнате.'
    ],
    alien: [
        'В горшке пульсирует единственное звёздное семя. Ему нужно гораздо больше тёплых вечеров в комнате — внутри зреет неземное чудо.',
        'Земля светится изнутри мягким перламутром. Внеземное семя растёт неспешно и только пока стоит в вашей комнате.'
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
    ],
    [
        'Меж сосновой коры и мха проснулись первые плотные глянцевые листки орхидеи.',
        'Молодая орхидея раскинула мясистую изумрудную розетку и пустила серебристый воздушный корень.',
        'Из сердца розетки грациозно вытянулся тонкий изогнутый цветонос.',
        'Высокая дуга цветоноса набрала силу, а воздушные корни мягко обняли край керамики.',
        'Вдоль изящной дуги налились жемчужно-бархатные бутоны, и первый цветок уже раскрыл крылья.',
        'Каскад королевской орхидеи фаленопсис расцвёл целиком — бархатные цветы-бабочки парят в полумраке.'
    ]
];

const ROOM_LINES = {
    window: [
        ['Стекло прохладное. Живые капли скользят вниз мимо мерцающих окон NEEO~CITY.', 'За круглым окном дышит ночной город — в высотках тихо загораются и гаснут огни.'],
        ['Сквозь расступившиеся облака льётся жемчужный свет полной луны в радужно-ледяном гало, а над башнями плывёт тёплый пар оттепели.', 'С хрустальных сосулек под сводом окна срывается живая серебряная капель — долгий холод отступил.'],
        ['Над башнями NEEO~CITY неспешно поднимаются золотые небесные фонарики, отражаясь в тёплой дымке.', 'Тонкий янтарный серп луны хранит тишину, а живые огоньки плывут меж ночных высоток.'],
        ['Дождь ушёл. За высотками NEEO~CITY дышит глубокий фиалково-космический рассвет в искрах звёзд.', 'Тёплый аметистово-розовый свет зари мягко скользит из окна на ковёр и листву.']
    ],
    lamp: [
        'Подвесная лампа плавно качнулась на шнуре — тёплый блик поплыл по столу.',
        'Абажур неспешно покачивается под потолком и мягко замирает в тишине.'
    ],
    vines: [
        'Багряные бархатные лианы над кушеткой тихо шелестят в полумраке — они раскроют путь в Оранжерею, когда расцветёт ваш первый цветок.',
        'Сердцевидные листья гранатового плюща мягко качнулись от прикосновения, затаив дыхание будущего зимнего сада.'
    ],
    vinesOpen: [
        'Живые багряные лианы мягко расступились — за тёплой листвой открывается стеклянный купол вашей Оранжереи.',
        'По бархатно-гранатовым плетям пробежал тёплый рубиновый свет: дверь в купол Оранжереи открыта.'
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
    radioOn: 'Лампы NEEOSOMA // AV-88 дышат тёплым янтарём — в комнате плывёт живая пластинка из вашей фонотеки.',
    radioOff: 'Ламповый приёмник NEEOSOMA // AV-88 ждёт прикосновения: эфир станции и редкие коллекционные записи.'
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

// ЕДИНСТВЕННОЕ СЕКРЕТНОЕ ВНЕЗЕМНОЕ РАСТЕНИЕ ИГРОКА (9-я пасхалка 1 из 7 навсегда, открывается строго после 8/8 земных видов!)
function alienSpec(id, overrideAlienKind) {
    const src = String(id || (typeof player !== 'undefined' && (player.uid || player.name)) || 'guest');
    const h = hashStr('neeosoma_xeno_seed_v1:' + src);
    let mix = Math.imul((h ^ 0x517cc1b7) >>> 0, 0x85ebca6b) >>> 0;
    mix = Math.imul(mix ^ (mix >>> 13), 0xc2b2ae35) >>> 0;
    mix = (mix ^ (mix >>> 16)) >>> 0;
    const ownAlienKind = mix % ALIEN_KINDS.length;
    const alienKind = (Number.isInteger(overrideAlienKind) && overrideAlienKind >= 0 && overrideAlienKind < ALIEN_KINDS.length)
        ? overrideAlienKind
        : ownAlienKind;
    const a = ALIEN_KINDS[alienKind];
    const base = plantSpec(src);
    return {
        ...base,
        isAlien: true,
        alienKind,
        ownAlienKind,
        kind: 100 + alienKind,
        kindName: a.name,
        alien: a,
        bloom: [a.deep, a.mid, a.core],
        pot: ['#160d24', '#311e4e', '#6d47a8', a.mid],
        seed: (mix ^ (alienKind * 0x9e3779b1)) >>> 0
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
    try {
        if (typeof window !== 'undefined' && window.SOMA_CONFIG) {
            return window.SOMA_CONFIG.WHISPER_LIVE !== false;
        }
        return false;
    } catch (_) { return false; }
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
    const s = String(hex || '#000000').trim();
    if (s.startsWith('rgb')) {
        const m = s.match(/([\d.]+)/g);
        return m ? [Number(m[0]) || 0, Number(m[1]) || 0, Number(m[2]) || 0] : [0, 0, 0];
    }
    const h = s.replace('#', '');
    if (h.length === 3) {
        return [parseInt(h[0] + h[0], 16) || 0, parseInt(h[1] + h[1], 16) || 0, parseInt(h[2] + h[2], 16) || 0];
    }
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
        pot_moon:     ['#1c1b28', '#525068', '#b8b4cc'], // лунный селадоновый фарфор с жемчужным отливом
        pot_amethyst: ['#10051c', '#431868', '#a65ee6']  // резной полуночный аметистовый оникс с гранёным кристаллом
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
                    : potSkin === 'pot_amethyst'
                        ? ['rgba(216, 132, 255, 0.30)', 'rgba(118, 36, 184, 0.10)']
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
        g.fillStyle = (potSkin === 'pot_moon' || potSkin === 'pot_amethyst') ? '#170f24' : '#16080a';
        g.beginPath();
        g.roundRect ? g.roundRect(bx - stW * 0.78, baseY + 2, 9, 6.5, 2) : g.fillRect(bx - stW * 0.78, baseY + 2, 9, 6.5);
        g.roundRect ? g.roundRect(bx + stW * 0.78 - 9, baseY + 2, 9, 6.5, 2) : g.fillRect(bx + stW * 0.78 - 9, baseY + 2, 9, 6.5);
        g.fill();
        g.fillStyle = potSkin === 'pot_kintsugi'
            ? '#24120c'
            : potSkin === 'pot_cinnabar'
                ? '#2c080c'
                : potSkin === 'pot_amethyst'
                    ? '#230d38'
                    : '#231f2e';
        g.beginPath(); g.ellipse(bx, baseY + 1.8, stW, 6.8, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = potSkin === 'pot_kintsugi'
            ? 'rgba(248, 206, 104, 0.68)'
            : potSkin === 'pot_cinnabar'
                ? 'rgba(255, 178, 112, 0.55)'
                : potSkin === 'pot_amethyst'
                    ? 'rgba(232, 176, 255, 0.66)'
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
    } else if (potSkin === 'pot_amethyst') {
        // Аметистовый оникс: двойная серебряно-лавандовая филигрань, прожилки оникса, гранёный аметист и сумеречная пыльца
        const gemGlow = 0.62 + potPulse * 0.32;
        // Полупрозрачные шёлковые прожилки полуночного оникса
        g.strokeStyle = `rgba(214, 152, 255, ${(0.22 + potPulse * 0.12).toFixed(3)})`;
        g.lineWidth = 2.1;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(bx - tw * 0.62, topY + sh.h * 0.30);
        g.bezierCurveTo(bx - tw * 0.18, topY + sh.h * 0.48, bx + tw * 0.22, topY + sh.h * 0.38, bx + tw * 0.64, topY + sh.h * 0.56);
        g.stroke();
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(bx - bw * 0.58, topY + sh.h * 0.72);
        g.quadraticCurveTo(bx, topY + sh.h * 0.84, bx + bw * 0.56, topY + sh.h * 0.68);
        g.stroke();

        // Ювелирный серебряно-сиреневый пояс филиграни с боковыми подвесками
        g.strokeStyle = `rgba(242, 214, 255, ${(0.70 + potPulse * 0.24).toFixed(3)})`;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(bx - bandW, bandY - 2);
        g.quadraticCurveTo(bx, bandY + 7.5, bx + bandW, bandY - 2);
        g.stroke();
        g.strokeStyle = `rgba(216, 158, 255, ${(0.48 + potPulse * 0.2).toFixed(3)})`;
        g.lineWidth = 1.05;
        g.beginPath();
        g.moveTo(bx - bandW * 0.88, bandY + 6.2);
        g.bezierCurveTo(bx - bandW * 0.34, bandY + 15.5, bx + bandW * 0.34, bandY + 15.5, bx + bandW * 0.88, bandY + 6.2);
        g.stroke();

        // Гранёный королевский аметист в серебряной оправе по центру сосуда
        const gy = bandY + 10.2;
        radialAura(g, bx, gy, 15.5, '#fae8ff', '#9333ea', 0.44 + potPulse * 0.26);
        g.fillStyle = `rgba(245, 226, 255, ${gemGlow.toFixed(3)})`;
        g.beginPath();
        g.moveTo(bx, gy - 6.6);
        g.lineTo(bx + 5.1, gy);
        g.lineTo(bx, gy + 6.8);
        g.lineTo(bx - 5.1, gy);
        g.closePath();
        g.fill();
        g.fillStyle = '#7e22ce';
        g.beginPath();
        g.moveTo(bx, gy - 5.0);
        g.lineTo(bx + 3.7, gy);
        g.lineTo(bx, gy + 5.2);
        g.lineTo(bx - 3.7, gy);
        g.closePath();
        g.fill();
        // Светящаяся верхняя грань кристалла
        g.fillStyle = `rgba(253, 242, 255, ${(0.82 + potPulse * 0.16).toFixed(3)})`;
        g.beginPath();
        g.moveTo(bx, gy - 4.6);
        g.lineTo(bx + 1.8, gy - 0.3);
        g.lineTo(bx, gy + 1.4);
        g.lineTo(bx - 2.4, gy - 0.5);
        g.closePath();
        g.fill();

        // Боковые гранёные капли и мерцающие сиреневые искры
        const sparks = [[-0.44, 5.4, 0.3], [0.44, 5.4, 1.9], [-0.26, 15.2, 3.2], [0.26, 15.2, 4.7]];
        for (let si = 0; si < sparks.length; si++) {
            const [sx, sy, ph] = sparks[si];
            const twk = prefersStillRoom() ? 0.78 : (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(potT * 2.3 + ph)));
            g.fillStyle = `rgba(248, 224, 255, ${twk.toFixed(3)})`;
            g.beginPath(); g.arc(bx + bandW * sx, bandY + sy, 1.0 + twk * 0.75, 0, Math.PI * 2); g.fill();
        }

        // Скользящий зеркальный аметистовый блик по полированному ониксу
        const onxShift = prefersStillRoom() ? 0 : Math.sin(potT * 0.78 + 0.6) * (tw * 0.12);
        g.strokeStyle = `rgba(244, 216, 255, ${(0.34 + potPulse * 0.16).toFixed(3)})`;
        g.lineWidth = 3.2;
        g.beginPath();
        g.moveTo(bx - tw * 0.54 + onxShift, topY + 13);
        g.quadraticCurveTo(bx - bw * 0.50 + onxShift, topY + sh.h * 0.55, bx - bw * 0.42 + onxShift, baseY - 7);
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
        : potSkin === 'pot_amethyst'
            ? 'rgba(236, 188, 255, 0.54)'
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
    } else if (potSkin === 'pot_amethyst') {
        // Серебряно-аметистовые инкрустации на венчике ониксового сосуда
        g.fillStyle = '#f5d8ff';
        g.beginPath(); g.ellipse(bx, topY + ry + 3.2, 3.4, 1.4, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(bx - tw * 0.5, topY + 8.4, 2.3, 1.1, 0.22, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(bx + tw * 0.5, topY + 8.4, 2.3, 1.1, -0.22, 0, Math.PI * 2); g.fill();
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

// 8-Й ЗЕМНОЙ ВИД — КОРОЛЕВСКАЯ ОРХИДЕЯ ФАЛЕНОПСИС (6 стадий: глянцевая розетка, серебристые воздушные корни, изящная дуга и бархатные цветы-бабочки!)
function drawSpeciesOrchid(g, bx, by, pot, spec, s, pal, bl, sway, pulse, r) {
    const dir = spec.lean >= 0 ? 1 : -1;
    const sw = sway * 11;

    // 1. Серебристо-шалфейные воздушные корни с живыми изумрудными кончиками, обнимающие край горшка (с 2-й стадии)
    if (s >= 1) {
        const roots = [
            [-26, 2, -48, 12, -56, 30],
            [24, 3, 46, 10, 52, 26],
            [-14, 4, -34, 18, -38, 38],
            [16, 4, 36, 16, 42, 36]
        ].slice(0, s >= 3 ? 4 : 2);
        g.save();
        g.lineCap = 'round';
        roots.forEach(([x0, y0, cx1, cy1, x1, y1]) => {
            g.strokeStyle = 'rgba(20, 8, 12, 0.55)';
            g.lineWidth = 4.2;
            g.beginPath(); g.moveTo(bx + x0, by + y0); g.quadraticCurveTo(bx + cx1, by + cy1, bx + x1, by + y1); g.stroke();
            g.strokeStyle = mixHex('#b8cfc4', pal[3], 0.35);
            g.lineWidth = 2.6;
            g.beginPath(); g.moveTo(bx + x0, by + y0); g.quadraticCurveTo(bx + cx1, by + cy1, bx + x1, by + y1); g.stroke();
            // Живой салатовый растущий кончик воздушного корня
            g.fillStyle = pal[3];
            g.beginPath(); g.arc(bx + x1, by + y1, 1.7, 0, Math.PI * 2); g.fill();
        });
        g.restore();
    }

    // 2. Пышная прикорневая розетка широких глянцевых мясистых листьев фаленопсиса
    const drawOrchidLeaf = (ox, oy, ang, len, wid, rimFlag) => {
        g.save();
        g.translate(ox, oy);
        g.rotate(ang);
        if (g.createLinearGradient) {
            const lg = g.createLinearGradient(0, 0, len, 0);
            lg.addColorStop(0, pal[0]);
            lg.addColorStop(0.45, pal[2]);
            lg.addColorStop(0.88, pal[3]);
            lg.addColorStop(1, pal[1]);
            g.fillStyle = lg;
        } else g.fillStyle = pal[2];
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(len * 0.28, -wid, len * 0.82, -wid * 0.92, len, 0);
        g.bezierCurveTo(len * 0.82, wid * 0.92, len * 0.28, wid, 0, 0);
        g.closePath();
        g.fill();
        // Глянцевый восковой блик и утопленная центральная жилка
        g.strokeStyle = rimFlag ? pal[4] : mixHex(pal[3], '#ffffff', 0.28, 0.55);
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(len * 0.14, -wid * 0.52);
        g.quadraticCurveTo(len * 0.58, -wid * 0.68, len * 0.92, -wid * 0.12);
        g.stroke();
        g.strokeStyle = pal[0];
        g.globalAlpha = 0.52;
        g.lineWidth = 1.0;
        g.beginPath(); g.moveTo(2, 0); g.quadraticCurveTo(len * 0.52, wid * 0.06, len * 0.94, 0); g.stroke();
        g.restore();
    };

    const leafScale = 0.55 + Math.min(s, 4) * 0.12;
    if (s >= 2) {
        drawOrchidLeaf(bx - 4, by + 1, -2.86 + sway * 0.08, 66 * leafScale, 15 * leafScale, false);
        drawOrchidLeaf(bx + 4, by + 1, -0.28 + sway * 0.08, 66 * leafScale, 15 * leafScale, true);
    }
    drawOrchidLeaf(bx - 2, by - 1, -2.52 + sway * 0.12, 58 * leafScale, 16 * leafScale, false);
    drawOrchidLeaf(bx + 2, by - 1, -0.62 + sway * 0.12, 58 * leafScale, 16 * leafScale, true);
    if (s >= 1) {
        drawOrchidLeaf(bx, by - 3, -2.14 + sway * 0.14, 46 * leafScale, 13.5 * leafScale, true);
        drawOrchidLeaf(bx, by - 3, -1.00 + sway * 0.14, 46 * leafScale, 13.5 * leafScale, true);
    }
    if (s <= 1) return;

    // 3. Тонкая бамбуковая опора с джутовым узелком (с 4-й стадии) и грациозная дуга цветоноса
    const archH = s === 2 ? 96 : (s === 3 ? 138 : (s === 4 ? 168 : 186));
    const p0x = bx, p0y = by - 3;
    const p1x = bx - dir * (24 + s * 3) + sw * 0.35, p1y = by - archH * 0.62;
    const p2x = bx + dir * (6 + s * 4) + sw * 0.7, p2y = by - archH * 1.04;
    const p3x = bx + dir * (44 + (s - 2) * 11) + sw, p3y = by - archH * (s >= 4 ? 0.72 : 0.86);

    const spikePt = (t) => {
        const u = 1 - t;
        return {
            x: u*u*u*p0x + 3*u*u*t*p1x + 3*u*t*t*p2x + t*t*t*p3x,
            y: u*u*u*p0y + 3*u*u*t*p1y + 3*u*t*t*p2y + t*t*t*p3y
        };
    };

    if (s >= 3) {
        const stakeTopX = bx - dir * 13 + sw * 0.22;
        const stakeTopY = by - archH * 0.74;
        g.save();
        g.strokeStyle = '#5c3c28';
        g.lineWidth = 2.6;
        g.lineCap = 'round';
        g.beginPath(); g.moveTo(bx - dir * 9, by + 1); g.lineTo(stakeTopX, stakeTopY); g.stroke();
        g.strokeStyle = '#9c6e4c';
        g.lineWidth = 1.0;
        g.beginPath(); g.moveTo(bx - dir * 8.4, by + 1); g.lineTo(stakeTopX + 0.6, stakeTopY); g.stroke();
        // Аккуратная перевязка цветоноса к бамбуковой палочке
        const tie = spikePt(0.4);
        g.strokeStyle = '#d4a373';
        g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(stakeTopX + dir * 1.5, tie.y); g.lineTo(tie.x, tie.y); g.stroke();
        g.restore();
    }

    // Сам живой изогнутый цветонос орхидеи
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = pal[0];
    g.lineWidth = 4.6;
    g.beginPath(); g.moveTo(p0x, p0y); g.bezierCurveTo(p1x, p1y, p2x, p2y, p3x, p3y); g.stroke();
    g.strokeStyle = mixHex(pal[2], bl[0], 0.25);
    g.lineWidth = 2.7;
    g.beginPath(); g.moveTo(p0x, p0y); g.bezierCurveTo(p1x, p1y, p2x, p2y, p3x, p3y); g.stroke();
    // Узелки-междоузлия на цветоносе
    [0.24, 0.44, 0.62].forEach(nt => {
        const np = spikePt(nt);
        g.fillStyle = pal[3];
        g.beginPath(); g.ellipse(np.x, np.y, 2.5, 1.6, 0.3, 0, Math.PI * 2); g.fill();
    });

    // Вторая боковая веточка каскада в полном цвету!
    let subPts = [];
    if (s >= 4) {
        const b0 = spikePt(0.50);
        const bx1 = b0.x - dir * 24 + sw * 0.2, by1 = b0.y - 24;
        const bx2 = b0.x - dir * (s === 5 ? 48 : 34) + sw * 0.4, by2 = b0.y - (s === 5 ? 12 : 18);
        g.strokeStyle = pal[0]; g.lineWidth = 3.2;
        g.beginPath(); g.moveTo(b0.x, b0.y); g.quadraticCurveTo(bx1, by1, bx2, by2); g.stroke();
        g.strokeStyle = mixHex(pal[2], bl[0], 0.28); g.lineWidth = 1.9;
        g.beginPath(); g.moveTo(b0.x, b0.y); g.quadraticCurveTo(bx1, by1, bx2, by2); g.stroke();
        subPts = [
            { x: (b0.x + bx1 * 2 + bx2) * 0.25, y: (b0.y + by1 * 2 + by2) * 0.25 - 2 },
            { x: bx2, y: by2 }
        ];
    }
    g.restore();

    // Кисть жемчужного бутона орхидеи
    const drawOrchidBud = (x, y, rad, tilt) => {
        g.save();
        g.translate(x, y);
        g.rotate(tilt);
        if (g.createRadialGradient) {
            const bg = g.createRadialGradient(-rad * 0.25, -rad * 0.3, 1, 0, 0, rad * 1.2);
            bg.addColorStop(0, mixHex(bl[2], '#ffffff', 0.45));
            bg.addColorStop(0.6, bl[1]);
            bg.addColorStop(1, bl[0]);
            g.fillStyle = bg;
        } else g.fillStyle = bl[1];
        g.beginPath(); g.ellipse(0, 0, rad * 1.05, rad * 0.82, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = mixHex(bl[2], '#ffffff', 0.4, 0.65);
        g.lineWidth = 0.85;
        g.stroke();
        g.restore();
    };

    // Кисть скульптурного цветка-бабочки фаленопсиса (3 чашелистика + 2 широких бархатных лепестка-крыла + тигровая золотисто-рубиновая губа!)
    const drawOrchidBlossom = (x, y, sz, tilt) => {
        if (g.createRadialGradient) {
            radialAura(g, x, y, sz * (1.75 + pulse * 0.35), bl[2], bl[0], 0.22 + pulse * 0.16);
        }
        g.save();
        g.translate(x, y);
        g.rotate(tilt);
        const cWhite = mixHex(bl[2], '#fff7fb', 0.52);
        const cBlush = bl[2];
        const cRich = bl[1];
        const cDeep = bl[0];

        // 3 задних чашелистика (верхний и два нижних)
        [[-Math.PI * 0.5, 0.96, 0.48], [Math.PI * 0.26, 0.92, 0.44], [Math.PI * 0.74, 0.92, 0.44]].forEach(([a, l, w]) => {
            g.save();
            g.rotate(a);
            g.fillStyle = mixHex(cBlush, cWhite, 0.38);
            g.beginPath();
            g.moveTo(0, 0);
            g.bezierCurveTo(sz * 0.3, -sz * w, sz * l * 0.88, -sz * w * 0.8, sz * l, 0);
            g.bezierCurveTo(sz * l * 0.88, sz * w * 0.8, sz * 0.3, sz * w, 0, 0);
            g.closePath();
            g.fill();
            g.strokeStyle = cWhite;
            g.lineWidth = 0.8;
            g.stroke();
            g.restore();
        });

        // 2 широких округлых лепестка-крыла бабочки с нежным градиентом от рубинового сердца к жемчужному краю
        [-0.14, Math.PI + 0.14].forEach((a) => {
            g.save();
            g.rotate(a);
            if (g.createRadialGradient) {
                const wg = g.createRadialGradient(sz * 0.2, 0, 1, sz * 0.55, 0, sz * 0.95);
                wg.addColorStop(0, cRich);
                wg.addColorStop(0.55, cBlush);
                wg.addColorStop(1, cWhite);
                g.fillStyle = wg;
            } else g.fillStyle = cBlush;
            g.beginPath();
            g.moveTo(0, 0);
            g.bezierCurveTo(sz * 0.22, -sz * 0.78, sz * 0.98, -sz * 0.74, sz * 1.06, 0);
            g.bezierCurveTo(sz * 0.98, sz * 0.74, sz * 0.22, sz * 0.78, 0, 0);
            g.closePath();
            g.fill();
            g.strokeStyle = cWhite;
            g.lineWidth = 0.95;
            g.stroke();
            g.restore();
        });

        // Скульптурная бархатная губа (labellum) с золотым горлышком и крапинками!
        g.fillStyle = cDeep;
        g.beginPath();
        g.moveTo(-sz * 0.28, sz * 0.04);
        g.quadraticCurveTo(0, sz * 0.74, sz * 0.28, sz * 0.04);
        g.quadraticCurveTo(0, sz * 0.28, -sz * 0.28, sz * 0.04);
        g.closePath();
        g.fill();
        g.fillStyle = '#ffd56b';
        g.beginPath(); g.ellipse(0, sz * 0.16, sz * 0.2, sz * 0.14, 0, 0, Math.PI * 2); g.fill();
        // Жемчужная колонка в самом центре орхидеи
        g.fillStyle = '#ffffff';
        g.beginPath(); g.ellipse(0, -sz * 0.04, sz * 0.13, sz * 0.16, 0, 0, Math.PI * 2); g.fill();
        g.restore();
    };

    if (s === 2) {
        drawOrchidBud(p3x, p3y, 4.6, dir * 0.3);
    } else if (s === 3) {
        [0.72, 0.88, 1.0].forEach((bt, i) => {
            const bp = spikePt(bt);
            drawOrchidBud(bp.x, bp.y + 3, 6.2 - i * 0.8, dir * 0.25);
        });
    } else if (s === 4) {
        const f1 = spikePt(0.62);
        drawOrchidBlossom(f1.x, f1.y + 2, 16.5, -dir * 0.1);
        [0.78, 0.91, 1.0].forEach((bt, i) => {
            const bp = spikePt(bt);
            drawOrchidBud(bp.x, bp.y + 4, 7.6 - i * 1.1, dir * 0.3);
        });
        if (subPts[1]) drawOrchidBud(subPts[1].x, subPts[1].y + 2, 6.8, -dir * 0.3);
    } else {
        // Стадия 5 (6/6): роскошный королевский каскад из 6 крупных бархатных цветов и жемчужного бутона на кончике!
        if (subPts[0]) drawOrchidBlossom(subPts[0].x, subPts[0].y, 16.2, -dir * 0.18);
        if (subPts[1]) drawOrchidBlossom(subPts[1].x, subPts[1].y + 2, 14.5, -dir * 0.28);
        [
            [0.56, 20.5, -0.06],
            [0.70, 19.2,  0.08],
            [0.83, 17.4,  0.18],
            [0.94, 14.8,  0.26]
        ].forEach(([bt, sz, tl]) => {
            const bp = spikePt(bt);
            drawOrchidBlossom(bp.x, bp.y + 3, sz, dir * tl);
        });
        drawOrchidBud(p3x + dir * 5, p3y + 5, 5.8, dir * 0.42);
    }
}

// ===== 7 СЕКРЕТНЫХ ВНЕЗЕМНЫХ РАСТЕНИЙ НЕРЕАЛЬНОЙ КРАСОТЫ (9-Я ПАСХАЛКА: 1 ИЗ 7 НАВСЕГДА СТРОГО ПОСЛЕ 8/8!) =====
function drawSpeciesAlien(ctx, bx, by, pot, spec, s, sway, pulse, now) {
    const al = spec.alien || ALIEN_KINDS[0];
    const kind = Number.isInteger(spec.alienKind) ? spec.alienKind : 0;
    const still = prefersStillRoom();
    const t = still ? 2.4 : (Number(now) || 0) * 0.001;
    const br = 0.5 + 0.5 * Math.sin(t * 1.65);
    const hover = still ? 0 : Math.sin(t * 1.25) * (2.2 + s * 0.7);
    const sw = sway * 14;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Биолюминесцентный звёздный мох и рунное свечение на почве горшка
    if (ctx.createRadialGradient) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        radialAura(ctx, bx, by + 1, 34 + s * 6, al.stem, al.deep, 0.34 + s * 0.06 + br * 0.1 + pulse * 0.15);
        ctx.restore();
    }
    const mossDots = 6 + s * 2;
    for (let i = 0; i < mossDots; i++) {
        const u = (i / (mossDots - 1 || 1)) * 2 - 1;
        const mx = bx + u * 44;
        const my = by + Math.sin(i * 2.3) * 3.5;
        ctx.fillStyle = i % 2 === 0 ? al.stem : al.accent;
        ctx.globalAlpha = 0.45 + 0.35 * Math.sin(t * 2 + i);
        ctx.beginPath(); ctx.ellipse(mx, my, 2.8, 1.3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Вспомогательная кисть полупрозрачного перламутрового лепестка с живым градиентом и светящейся прожилкой
    const pearlPetal = (cx, cy, rot, len, wid, cBase, cMid, cTip, alpha) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.globalAlpha = alpha;
        if (ctx.createLinearGradient) {
            const pg = ctx.createLinearGradient(0, 0, 0, -len);
            pg.addColorStop(0, cBase);
            pg.addColorStop(0.55, cMid);
            pg.addColorStop(1, cTip);
            ctx.fillStyle = pg;
        } else ctx.fillStyle = cMid;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-wid, -len * 0.28, -wid * 0.88, -len * 0.78, 0, -len);
        ctx.bezierCurveTo(wid * 0.88, -len * 0.78, wid, -len * 0.28, 0, 0);
        ctx.closePath();
        ctx.fill();
        // Светящаяся кромка и центральная жилка из звёздного серебра
        ctx.strokeStyle = al.core;
        ctx.globalAlpha = alpha * 0.68;
        ctx.lineWidth = 1.15;
        ctx.stroke();
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.quadraticCurveTo(wid * 0.08, -len * 0.52, 0, -len * 0.9);
        ctx.stroke();
        ctx.restore();
    };

    // Вспомогательная кисть светящегося стеклянного стебля
    const glassStem = (x0, y0, cx1, cy1, x1, y1, w, colA, colB) => {
        ctx.save();
        ctx.strokeStyle = colA;
        ctx.lineWidth = w + 2.4;
        ctx.globalAlpha = 0.36;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx1, cy1, x1, y1); ctx.stroke();
        if (ctx.createLinearGradient) {
            const sg = ctx.createLinearGradient(x0, y0, x1, y1);
            sg.addColorStop(0, al.deep);
            sg.addColorStop(0.45, colA);
            sg.addColorStop(1, colB);
            ctx.strokeStyle = sg;
        } else ctx.strokeStyle = colB;
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = w;
        ctx.stroke();
        ctx.strokeStyle = al.core;
        ctx.globalAlpha = 0.62;
        ctx.lineWidth = Math.max(0.9, w * 0.3);
        ctx.stroke();
        ctx.restore();
    };

    // Ранние стадии 0..1: нежный биолюминесцентный внеземной росток с индивидуальным оттенком вида
    if (s <= 1) {
        const h = s === 0 ? 44 : 84;
        const topX = bx + sw * 0.35;
        const topY = by - h + hover * 0.5;
        glassStem(bx, by + 2, bx - 6 + sw * 0.2, by - h * 0.52, topX, topY, s === 0 ? 3.4 : 4.4, al.mid, al.stem);
        pearlPetal(topX, topY + 6, -0.58 + sway * 0.4, s === 0 ? 22 : 36, s === 0 ? 8 : 13, al.deep, al.mid, al.core, 0.86);
        pearlPetal(topX, topY + 6, 0.58 + sway * 0.4, s === 0 ? 22 : 36, s === 0 ? 8 : 13, al.deep, al.accent, al.core, 0.86);
        if (s === 1) {
            pearlPetal(topX, topY + 2, sway * 0.3, 42, 12, al.deep, al.stem, al.core, 0.9);
        }
        radialAura(ctx, topX, topY - 8, s === 0 ? 22 : 36, al.core, al.aura, 0.48 + br * 0.18);
        ctx.fillStyle = al.core;
        ctx.beginPath(); ctx.arc(topX, topY - 8 + hover * 0.3, s === 0 ? 3.5 : 5.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        return;
    }

    const grow = (s - 1) / 4; // 0.25 (s=2), 0.5 (s=3), 0.75 (s=4), 1.0 (s=5)
    const cx = bx + sw * 0.55;
    const cy = by - (92 + grow * 96) + hover;

    if (kind === 0) {
        // 0: СЕРАФИМ ТУМАННОСТИ — 6 парящих опалово-фиалковых крыльев вокруг живой золотой звезды и колец света
        glassStem(bx, by + 2, bx - 14 + sw * 0.3, by - 66, cx, cy + 28, 4.8, al.mid, al.stem);
        glassStem(bx - 8, by + 2, bx + 18 + sw * 0.2, by - 58, cx, cy + 34, 2.8, al.accent, al.core);
        // Дальние крылья света
        const wingPairs = s >= 4 ? 3 : 2;
        for (let p = 0; p < wingPairs; p++) {
            const flap = still ? 0 : Math.sin(t * 1.5 + p * 0.8) * 0.06;
            const len = (52 + grow * 48) * (1 - p * 0.14);
            const wid = (18 + grow * 14) * (1 - p * 0.1);
            const ang = 0.42 + p * 0.46 + flap;
            pearlPetal(cx - 4, cy + p * 8, -ang, len, wid, al.deep, p === 1 ? al.accent : al.mid, al.core, 0.82 - p * 0.08);
            pearlPetal(cx + 4, cy + p * 8, ang, len, wid, al.deep, p === 1 ? al.accent : al.mid, al.core, 0.82 - p * 0.08);
        }
        // Корона верхнего перламутрового пера
        if (s >= 4) pearlPetal(cx, cy - 4, sway * 0.25, 58 + grow * 28, 17, al.deep, al.stem, al.core, 0.88);
        // Двойные орбитальные кольца света вокруг звёздного сердца
        if (s >= 3) {
            ctx.save();
            ctx.translate(cx, cy - 2);
            ctx.strokeStyle = al.core;
            ctx.globalAlpha = 0.62 + br * 0.2;
            ctx.lineWidth = 1.4;
            ctx.rotate(0.32 + Math.sin(t * 0.7) * 0.08);
            ctx.beginPath(); ctx.ellipse(0, 0, 44 + grow * 28, 12 + grow * 5, 0, 0, Math.PI * 2); ctx.stroke();
            if (s === 5) {
                ctx.strokeStyle = al.accent;
                ctx.rotate(-0.68);
                ctx.beginPath(); ctx.ellipse(0, 0, 52 + grow * 24, 14, 0, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();
        }
        // Пульсирующее золотисто-розовое звёздное ядро
        radialAura(ctx, cx, cy - 2, 46 + grow * 28, al.core, al.aura, 0.62 + br * 0.22);
        ctx.fillStyle = al.core;
        ctx.beginPath(); ctx.arc(cx, cy - 2, 8 + grow * 7 + br * 1.5, 0, Math.PI * 2); ctx.fill();
        // Четырёхлучевая звезда-блик
        if (s === 5) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.7;
            ctx.beginPath();
            ctx.moveTo(cx - 26, cy - 2); ctx.lineTo(cx + 26, cy - 2);
            ctx.moveTo(cx, cy - 32); ctx.lineTo(cx, cy + 28);
            ctx.stroke();
        }
    } else if (kind === 1) {
        // 1: ЭФИРНАЯ МЕДУЗА — парящий биолюминесцентный купол аквамарина и орхидеи с поющими шёлковыми нитями
        const bellY = cy - 12;
        const bellR = 36 + grow * 38;
        const bellH = 30 + grow * 32;
        // Шёлковые биолюминесцентные щупальца-нити с каплями росы
        const tentCount = s >= 4 ? 9 : 6;
        for (let i = 0; i < tentCount; i++) {
            const u = (i / (tentCount - 1)) * 2 - 1;
            const tx0 = cx + u * bellR * 0.78;
            const ty0 = bellY + 8;
            const wave = still ? 0 : Math.sin(t * 1.8 + i * 0.9) * 9;
            const tLen = (58 + grow * 62) * (1 - Math.abs(u) * 0.34);
            const tx1 = bx + u * (22 + Math.abs(u) * 14) + wave * 0.5;
            const ty1 = Math.min(by - 2, ty0 + tLen);
            glassStem(tx0, ty0, (tx0 + tx1) * 0.5 + wave, (ty0 + ty1) * 0.5, tx1, ty1, i === Math.floor(tentCount / 2) ? 3.2 : 1.7, i % 2 ? al.accent : al.mid, al.core);
            // Жемчужины света вдоль нитей
            for (let d = 1; d <= 3; d++) {
                const f = d / 3.4;
                const px = tx0 + (tx1 - tx0) * f + wave * 0.35 * Math.sin(f * Math.PI);
                const py = ty0 + (ty1 - ty0) * f;
                ctx.fillStyle = d % 2 ? al.core : al.accent;
                ctx.globalAlpha = 0.78;
                ctx.beginPath(); ctx.arc(px, py, 1.8 + (s === 5 ? 0.9 : 0), 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        // Внутренняя орхидейная корона под куполом
        radialAura(ctx, cx, bellY - 6, bellR * 1.25, al.accent, al.mid, 0.45 + br * 0.18);
        // Полупрозрачный стеклянный купол медузы с волнистой кружевной юбкой
        ctx.save();
        if (ctx.createRadialGradient) {
            const bg = ctx.createRadialGradient(cx, bellY - bellH * 0.45, 5, cx, bellY, bellR * 1.1);
            bg.addColorStop(0, al.core);
            bg.addColorStop(0.42, al.mid);
            bg.addColorStop(0.78, al.accent);
            bg.addColorStop(1, al.deep);
            ctx.fillStyle = bg;
        } else ctx.fillStyle = al.mid;
        ctx.globalAlpha = 0.88;
        ctx.beginPath();
        ctx.moveTo(cx - bellR, bellY + 8);
        ctx.bezierCurveTo(cx - bellR * 1.02, bellY - bellH * 1.15, cx + bellR * 1.02, bellY - bellH * 1.15, cx + bellR, bellY + 8);
        const lobes = 7;
        for (let l = lobes; l >= 1; l--) {
            const xA = cx - bellR + (2 * bellR) * (l / lobes);
            const xB = cx - bellR + (2 * bellR) * ((l - 1) / lobes);
            ctx.quadraticCurveTo((xA + xB) * 0.5, bellY + 18 + br * 4, xB, bellY + 8);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = al.core;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // Ребристые биолюминесцентные меридианы купола
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.0;
        [-0.62, -0.3, 0, 0.3, 0.62].forEach(k => {
            ctx.beginPath();
            ctx.moveTo(cx, bellY - bellH * 0.86);
            ctx.quadraticCurveTo(cx + bellR * k * 0.9, bellY - bellH * 0.3, cx + bellR * k, bellY + 9);
            ctx.stroke();
        });
        ctx.restore();
        if (s === 5) {
            // Две крошечные дочерние медузки света парят рядом!
            [[-58, -36, 0.34], [60, -24, 0.28]].forEach(([ox, oy, sc], idx) => {
                const mx = cx + ox, my = bellY + oy + Math.sin(t * 2 + idx * 2) * 5;
                radialAura(ctx, mx, my, 20, al.core, al.aura, 0.5);
                ctx.fillStyle = idx ? al.accent : al.stem;
                ctx.beginPath(); ctx.arc(mx, my, bellR * sc * 0.55, Math.PI, 0); ctx.fill();
                ctx.strokeStyle = al.core; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(mx - 4, my); ctx.lineTo(mx - 6, my + 16); ctx.moveTo(mx + 4, my); ctx.lineTo(mx + 5, my + 18); ctx.stroke();
            });
        }
    } else if (kind === 2) {
        // 2: ЛОТОС ЗАТМЕНИЯ — 12 призматических изумрудно-розово-золотых лепестков и парящее затмение с короной
        const lotusY = by - (74 + grow * 68);
        glassStem(bx, by + 2, bx + sw * 0.25, (by + lotusY) * 0.5, cx, lotusY + 12, 5.4, al.stem, al.mid);
        // Два широких изумрудных парящих листа у основания
        pearlPetal(bx - 12, by - 36, -1.05 + sway * 0.25, 52 + grow * 28, 19, '#064e3b', al.stem, al.core, 0.84);
        pearlPetal(bx + 12, by - 36, 1.05 + sway * 0.25, 52 + grow * 28, 19, '#064e3b', al.stem, al.core, 0.84);
        // Многоярусная чаша священного лотоса
        const outer = [-1.18, -0.82, -0.46, 0.46, 0.82, 1.18];
        outer.forEach((a, i) => {
            pearlPetal(cx, lotusY + 10, a + sway * 0.2, 52 + grow * 36, 18 + grow * 6, al.deep, i % 2 ? al.accent : al.stem, al.core, 0.84);
        });
        const inner = [-0.62, -0.3, 0, 0.3, 0.62];
        inner.forEach((a, i) => {
            pearlPetal(cx, lotusY + 4, a + sway * 0.25, 48 + grow * 34, 16 + grow * 5, al.deep, i % 2 ? al.mid : al.accent, al.core, 0.92);
        });
        // Парящее над чашей лотоса СОЛНЕЧНОЕ ЗАТМЕНИЕ с золотой короной!
        if (s >= 3) {
            const sunY = lotusY - (42 + grow * 42) + hover;
            const sunR = 13 + grow * 11;
            radialAura(ctx, cx, sunY, sunR * 4.2, al.mid, al.accent, 0.62 + br * 0.22);
            // Лучи солнечной короны
            if (s >= 4) {
                ctx.save();
                ctx.translate(cx, sunY);
                ctx.rotate(t * 0.22);
                ctx.strokeStyle = al.core;
                ctx.lineWidth = 1.3;
                for (let r = 0; r < 12; r++) {
                    const ang = (r / 12) * Math.PI * 2;
                    const rLen = sunR + (r % 2 === 0 ? 18 + br * 6 : 10);
                    ctx.globalAlpha = r % 2 === 0 ? 0.72 : 0.42;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(ang) * (sunR + 2), Math.sin(ang) * (sunR + 2));
                    ctx.lineTo(Math.cos(ang) * rLen, Math.sin(ang) * rLen);
                    ctx.stroke();
                }
                ctx.restore();
            }
            // Бархатный диск затмения + ослепительное бриллиантовое кольцо!
            ctx.fillStyle = '#12051e';
            ctx.beginPath(); ctx.arc(cx, sunY, sunR, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = al.core;
            ctx.lineWidth = 2.6;
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(cx + sunR * 0.72, sunY - sunR * 0.68, 3.8 + br * 1.4, 0, Math.PI * 2); ctx.fill();
        }
    } else if (kind === 3) {
        // 3: ХРУСТАЛЬНЫЙ ХОР — гранёные поющие кристаллы аметиста и целестина с дугами света и парящими призмами
        const drawCrystal = (x, y, rot, h, w, c1, c2) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);
            if (ctx.createLinearGradient) {
                const cg = ctx.createLinearGradient(-w, 0, w, -h);
                cg.addColorStop(0, al.deep);
                cg.addColorStop(0.52, c1);
                cg.addColorStop(1, c2);
                ctx.fillStyle = cg;
            } else ctx.fillStyle = c1;
            ctx.beginPath();
            ctx.moveTo(-w * 0.72, 0);
            ctx.lineTo(-w, -h * 0.72);
            ctx.lineTo(0, -h);
            ctx.lineTo(w, -h * 0.72);
            ctx.lineTo(w * 0.72, 0);
            ctx.closePath();
            ctx.fill();
            // Светлая зеркальная грань
            ctx.fillStyle = al.core;
            ctx.globalAlpha = 0.34;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(-w, -h * 0.72); ctx.lineTo(0, -h); ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 0.82;
            ctx.strokeStyle = al.core;
            ctx.lineWidth = 1.15;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(0, -h);
            ctx.moveTo(-w, -h * 0.72); ctx.lineTo(0, -h); ctx.lineTo(w, -h * 0.72);
            ctx.stroke();
            ctx.restore();
        };
        const spires = [
            [-36, 2, -0.42, 78 + grow * 54, 11, al.mid, al.accent],
            [36, 2, 0.42, 74 + grow * 52, 11, al.accent, al.core],
            [-18, 0, -0.2, 108 + grow * 68, 13, al.mid, al.core],
            [19, 0, 0.21, 104 + grow * 64, 13, al.stem, al.core],
            [0, 2, sway * 0.12, 132 + grow * 86, 16, al.mid, al.core]
        ];
        const tips = [];
        spires.forEach(([ox, oy, rot, h, w, c1, c2]) => {
            drawCrystal(bx + ox, by + oy, rot, h, w, c1, c2);
            tips.push([bx + ox + Math.sin(rot) * h, by + oy - Math.cos(rot) * h]);
        });
        // Поющие гармонические дуги света между вершинами кристаллов
        if (s >= 3) {
            ctx.save();
            ctx.strokeStyle = al.accent;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.58 + br * 0.28;
            for (let i = 0; i < tips.length - 1; i++) {
                const [x1, y1] = tips[i], [x2, y2] = tips[i + 1];
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.quadraticCurveTo((x1 + x2) * 0.5, Math.min(y1, y2) - 22 - br * 8, x2, y2);
                ctx.stroke();
            }
            ctx.restore();
        }
        // Парящая корона-октаэдр над главным кристаллом!
        if (s >= 4) {
            const top = tips[4];
            const py = top[1] - 28 + hover;
            radialAura(ctx, top[0], py, 48, al.accent, al.aura, 0.65 + br * 0.2);
            ctx.fillStyle = al.core;
            ctx.beginPath();
            ctx.moveTo(top[0], py - 18); ctx.lineTo(top[0] + 12, py);
            ctx.lineTo(top[0], py + 18); ctx.lineTo(top[0] - 12, py);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = al.accent; ctx.lineWidth = 1.6; ctx.stroke();
        }
    } else if (kind === 4) {
        // 4: КОРОНА СВЕРХНОВОЙ — обсидианово-золотой космический бонсай, цветущий живыми спиральными галактиками!
        const drawBranch = (x0, y0, cx1, cy1, x1, y1, w) => {
            ctx.strokeStyle = '#1b0b2e';
            ctx.lineWidth = w;
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx1, cy1, x1, y1); ctx.stroke();
            // Золотая жилка кинцуги-звёздного света внутри коры
            ctx.strokeStyle = al.accent;
            ctx.lineWidth = Math.max(1, w * 0.24);
            ctx.globalAlpha = 0.78;
            ctx.stroke();
            ctx.globalAlpha = 1;
        };
        const topY = by - (124 + grow * 82);
        drawBranch(bx, by + 4, bx - 28, by - 68, bx + 4, topY, 13);
        const galaxies = [
            [bx - 56, topY + 46, 26 + grow * 16],
            [bx + 58, topY + 34, 28 + grow * 16],
            [bx + 4, topY - 8, 34 + grow * 22]
        ];
        drawBranch(bx - 12, by - 64, bx - 44, topY + 72, galaxies[0][0], galaxies[0][1], 7.5);
        drawBranch(bx - 4, by - 88, bx + 38, topY + 62, galaxies[1][0], galaxies[1][1], 7.5);
        if (s === 5) {
            galaxies.push([bx - 34, topY - 22, 24], [bx + 42, topY - 16, 24]);
            drawBranch(bx - 2, topY + 22, bx - 22, topY, bx - 34, topY - 22, 4.5);
            drawBranch(bx + 2, topY + 18, bx + 24, topY, bx + 42, topY - 16, 4.5);
        }
        // Рисуем живые вращающиеся спиральные галактики на концах ветвей!
        galaxies.forEach(([gx, gy, gr], idx) => {
            radialAura(ctx, gx, gy, gr * 1.45, al.mid, al.deep, 0.62 + br * 0.16);
            ctx.save();
            ctx.translate(gx, gy);
            ctx.scale(1, 0.56);
            ctx.rotate(t * 0.45 + idx * 1.4);
            for (let arm = 0; arm < 2; arm++) {
                ctx.rotate(Math.PI);
                ctx.strokeStyle = arm === 0 ? al.accent : al.stem;
                ctx.lineWidth = 2.4;
                ctx.globalAlpha = 0.85;
                ctx.beginPath();
                for (let k = 0; k <= 22; k++) {
                    const a = k * 0.24;
                    const rr = (k / 22) * gr;
                    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
                    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
            ctx.fillStyle = al.core;
            ctx.globalAlpha = 1;
            ctx.beginPath(); ctx.arc(0, 0, 5.5 + (idx === 2 ? 2.5 : 0), 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
    } else if (kind === 5) {
        // 5: СЛЕЗА АВРОРЫ — плакучее древо из лунного стекла, с ветвей которого струится живое северное сияние!
        const crownY = by - (132 + grow * 82);
        glassStem(bx, by + 3, bx - 22, by - 78, bx + 4, crownY, 8.5, al.mid, al.core);
        const boughs = [
            [-68, crownY + 26], [-34, crownY - 6], [8, crownY - 16], [42, crownY - 2], [70, crownY + 28]
        ];
        boughs.forEach(([ox, ty], idx) => {
            const tx = bx + ox + sw * 0.35;
            glassStem(bx + 2, crownY + 18, (bx + tx) * 0.5, ty - 18, tx, ty, 3.8, al.stem, al.core);
            // Струящиеся шёлковые занавеси полярного сияния
            const curtains = s >= 4 ? 3 : 2;
            for (let c = 0; c < curtains; c++) {
                const dropX = tx + (c - 1) * 8;
                const dropLen = (72 + grow * 68) * (idx === 2 ? 1.05 : 0.88) - c * 10;
                const wave = still ? 0 : Math.sin(t * 1.7 + idx + c * 1.2) * 8;
                ctx.save();
                if (ctx.createLinearGradient) {
                    const ag = ctx.createLinearGradient(dropX, ty, dropX, ty + dropLen);
                    ag.addColorStop(0, al.core);
                    ag.addColorStop(0.38, c % 2 ? al.accent : al.mid);
                    ag.addColorStop(0.82, al.stem);
                    ag.addColorStop(1, 'rgba(20, 184, 166, 0)');
                    ctx.strokeStyle = ag;
                } else ctx.strokeStyle = al.mid;
                ctx.lineWidth = 4.2 - c * 0.7;
                ctx.globalAlpha = 0.76;
                ctx.beginPath();
                ctx.moveTo(dropX, ty);
                ctx.bezierCurveTo(dropX + wave, ty + dropLen * 0.36, dropX - wave, ty + dropLen * 0.72, dropX + wave * 0.4, Math.min(by - 4, ty + dropLen));
                ctx.stroke();
                // Светящаяся слеза-капля на конце нити
                if (s >= 4) {
                    const ey = Math.min(by - 6, ty + dropLen);
                    ctx.fillStyle = al.core;
                    ctx.globalAlpha = 0.9;
                    ctx.beginPath(); ctx.arc(dropX + wave * 0.4, ey, 2.3, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }
        });
        radialAura(ctx, bx + 4, crownY + 8, 78 + grow * 28, al.mid, al.accent, 0.36 + br * 0.14);
    } else {
        // 6: ОКО ВЕЧНОСТИ — королевский индиго-золотой цветок со звёздной радужкой и двумя лунами на орбите!
        glassStem(bx, by + 3, bx + 14 + sw * 0.3, (by + cy) * 0.52, cx, cy + 16, 5.6, al.mid, al.accent);
        // Изящные золотисто-сапфировые листья на стебле
        pearlPetal(bx + 4, by - 58, -0.78 + sway * 0.25, 54 + grow * 22, 16, al.deep, al.mid, al.accent, 0.85);
        pearlPetal(bx + 6, by - 82, 0.76 + sway * 0.25, 52 + grow * 22, 16, al.deep, al.mid, al.accent, 0.85);
        // 8 бархатных индиго-золотых лепестков короны
        const pCount = s >= 4 ? 8 : 6;
        for (let i = 0; i < pCount; i++) {
            const ang = (i / pCount) * Math.PI * 2 + (still ? 0 : Math.sin(t * 0.5) * 0.04);
            pearlPetal(cx, cy, ang, 46 + grow * 36, 17 + grow * 6, al.deep, i % 2 ? al.mid : '#4338ca', al.accent, 0.9);
        }
        // Звёздное Око в сердце цветка
        const eyeR = 20 + grow * 14;
        radialAura(ctx, cx, cy, eyeR * 2.6, al.accent, al.aura, 0.52 + br * 0.18);
        ctx.fillStyle = '#0c0824';
        ctx.beginPath(); ctx.ellipse(cx, cy, eyeR * 1.18, eyeR * 0.78, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = al.accent;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        // Радужка туманности и золотой зрачок со звёздами
        if (ctx.createRadialGradient) {
            const ig = ctx.createRadialGradient(cx, cy, 2, cx, cy, eyeR * 0.72);
            ig.addColorStop(0, al.core);
            ig.addColorStop(0.45, al.accent);
            ig.addColorStop(0.78, al.mid);
            ig.addColorStop(1, al.deep);
            ctx.fillStyle = ig;
        } else ctx.fillStyle = al.mid;
        ctx.beginPath(); ctx.arc(cx, cy, eyeR * 0.66, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#090418';
        ctx.beginPath(); ctx.ellipse(cx, cy, eyeR * 0.2, eyeR * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx - eyeR * 0.24, cy - eyeR * 0.2, 3.2, 0, Math.PI * 2); ctx.fill();
        // Две луны, тихо плывущие по орбите вокруг цветка!
        if (s >= 4) {
            const orb = t * 0.85;
            const m1x = cx + Math.cos(orb) * (58 + grow * 18), m1y = cy + Math.sin(orb) * 18;
            const m2x = cx - Math.cos(orb) * (58 + grow * 18), m2y = cy - Math.sin(orb) * 18;
            ctx.strokeStyle = al.accent; ctx.globalAlpha = 0.36; ctx.lineWidth = 1.1;
            ctx.beginPath(); ctx.ellipse(cx, cy, 58 + grow * 18, 18, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = al.accent;
            ctx.beginPath(); ctx.arc(m1x, m1y, 5.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = al.stem;
            ctx.beginPath(); ctx.arc(m2x, m2y, 4.0, 0, Math.PI * 2); ctx.fill();
        }
    }

    // Невесомая космическая пыльца вокруг расцветающего пришельца
    if (s >= 3) {
        const dustN = s === 5 ? 12 : 7;
        for (let i = 0; i < dustN; i++) {
            const a = (i / dustN) * Math.PI * 2 + t * 0.28;
            const rr = 46 + (i % 3) * 24 + grow * 18;
            const dx = cx + Math.cos(a) * rr;
            const dy = cy + Math.sin(a * 1.3) * (rr * 0.72);
            const da = 0.38 + 0.52 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.7));
            ctx.fillStyle = i % 3 === 0 ? al.core : (i % 2 ? al.accent : al.stem);
            ctx.globalAlpha = da;
            ctx.beginPath(); ctx.arc(dx, dy, i % 3 === 0 ? 2.2 : 1.5, 0, Math.PI * 2); ctx.fill();
        }
    }

    ctx.restore();
}

function drawPlantSprite(ctx, spec, stage, opts) {
    if (!ctx || !spec) return;
    const o = opts || {};
    const W = ctx.canvas ? ctx.canvas.width : 440;
    const H = ctx.canvas ? ctx.canvas.height : 460;
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;

    // Увеличенная сетка 440×460 с полями безопасности (+40px слева/справа, +72px сверху, +8px снизу):
    // ни один лепесток, кристалл, корона затмения и ни один пиксель свечения никогда не обрезаются по краю!
    const sx = W / 440, sy = H / 460;
    ctx.save();
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
    ctx.translate(40, 72);

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

    // Стадия -1: пустой именной керамический горшок со спящей землёй (до первого «Шёпота» или проклёвывания семени)
    if (s < 0) {
        if (spec.isAlien && ctx.createRadialGradient) {
            const al = spec.alien || ALIEN_KINDS[0];
            radialAura(ctx, bx, baseY - 62, 74, al.mid, al.deep, 0.16 + pulse * 0.14);
        } else if (pulse > 0.04 || o.soilReady) {
            radialAura(ctx, bx, baseY - 58, 62, '#ff7d8a', '#731122', pulse * 0.1 + (o.soilReady ? 0.045 : 0));
        }
        const emptyPot = drawCeramicPot(ctx, bx, baseY, spec, -1, phase >= 2 || pulse > 0.15 || !!spec.isAlien, {
            dry: !!o.dry,
            ready: !!o.soilReady || !!spec.isAlien,
            potSkin: o.potSkin === 'default' ? '' : (o.potSkin || (spec.isAlien ? 'pot_kintsugi' : ''))
        });
        if (spec.isAlien) {
            // Спящее звёздное семя тихо дышит перламутровым светом сквозь почву!
            const nt = (Number(o.now) || 0) * 0.001;
            const br = 0.55 + 0.45 * Math.sin(nt * 1.8);
            const al = spec.alien || ALIEN_KINDS[0];
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            radialAura(ctx, bx, emptyPot.soilY - 2, 28, al.core, al.aura, 0.32 + br * 0.24);
            ctx.fillStyle = al.core;
            ctx.beginPath(); ctx.ellipse(bx, emptyPot.soilY - 1.5, 4.8 + br * 1.4, 2.2 + br * 0.6, 0, 0, Math.PI * 2); ctx.fill();
            for (let m = 0; m < 4; m++) {
                const ph = (nt * 0.35 + m * 0.25) % 1;
                const mx = bx + Math.sin(nt * 1.1 + m * 2.1) * 18;
                const my = emptyPot.soilY - 6 - ph * 42;
                ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.72;
                ctx.fillStyle = m % 2 ? al.accent : al.core;
                ctx.beginPath(); ctx.arc(mx, my, 1.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
        // Светлячки тишины прилетают даже к пустому горшку, согревая спящую землю живым золотом!
        const emptyFf = o.fireflies ? Math.max(1, Math.min(7, Number(o.fireflies) || 0)) : (o.dew ? 5 : 0);
        if (emptyFf > 0 && ctx.createRadialGradient) {
            drawPlantFireflies(ctx, bx, baseY - 62, -1, emptyFf, !!o.firefliesDrowsy && !o.dew, Number(o.now) || 0, pulse);
        }
        ctx.restore();
        return;
    }

    // Мягкий атмосферный ореол от света круглого окна (полностью затухает внутри холста 440×460 — 0% обрезки!)
    if (spec.isAlien) {
        const al = spec.alien || ALIEN_KINDS[0];
        const auraA = 0.14 + s * 0.048 + pulse * 0.14 + (phase === 3 ? 0.04 : 0);
        const ay1 = baseY - 88 - s * 18;
        const ar1 = Math.min(86 + s * 20, ay1 + 68, 214);
        radialAura(ctx, bx, ay1, ar1, al.mid, al.deep, auraA);
        if (s >= 3) {
            const ay2 = baseY - 134 - s * 14;
            const ar2 = Math.min(62 + s * 14, ay2 + 68, 210);
            radialAura(ctx, bx, ay2, ar2, al.accent, al.aura, auraA * 0.62);
        }
    } else if (s >= 3 || pulse > 0.04 || o.dew) {
        const auraA = (s >= 3 ? (s - 2) * 0.045 : 0) + (phase === 3 ? 0.06 : 0) + pulse * 0.12 + (o.dew ? 0.05 : 0);
        radialAura(ctx, bx, baseY - 82 - s * 16, Math.min(78 + s * 18, 208), bl[1], '#8c1428', auraA);
    }

    // Опавшие живые лепестки (или звёздная пыльца пришельца!) на ковре вокруг горшка в полном цвету
    if (s === 5 && spec.isAlien) {
        const al = spec.alien || ALIEN_KINDS[0];
        const starFall = [[-86, 5], [-62, 13], [-30, 17], [0, 19], [34, 16], [66, 11], [88, 4], [-46, -1], [52, -2]];
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        starFall.forEach(([ox, oy], i) => {
            radialAura(ctx, bx + ox, baseY + oy, 11, i % 2 ? al.accent : al.mid, al.deep, 0.34);
            ctx.fillStyle = i % 3 === 0 ? al.core : (i % 2 ? al.accent : al.stem);
            ctx.beginPath(); ctx.ellipse(bx + ox, baseY + oy, 3.6, 1.5, (i - 4) * 0.12, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
    } else if (s === 5 && (spec.kind === 7 || spec.kind === 6 || spec.kind === 5 || spec.kind === 4)) {
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

    const pot = drawCeramicPot(ctx, bx, baseY, spec, s, phase >= 2 || pulse > 0.15 || !!spec.isAlien, {
        dry: !!o.dry,
        potSkin: o.potSkin === 'default' ? '' : (o.potSkin || (spec.isAlien ? 'pot_kintsugi' : ''))
    });
    const by = pot.soilY;

    // Секретное внеземное растение (7 шедевральных космических видов — у каждого игрока только 1 свой!)
    if (spec.isAlien) {
        drawSpeciesAlien(ctx, bx, by, pot, spec, s, sway, pulse, Number(o.now) || 0);
    } else if (spec.kind === 0) drawSpeciesFern(ctx, bx, by, spec, s, pal, bl, sway, pulse, r);
    else if (spec.kind === 1) drawSpeciesCactus(ctx, bx, by, spec, s, pal, bl, pulse, r);
    else if (spec.kind === 2) drawSpeciesSucculent(ctx, bx, by, spec, s, pal, bl, sway, pulse);
    else if (spec.kind === 3) drawSpeciesBamboo(ctx, bx, by, spec, s, pal, bl, sway, pulse, r);
    else if (spec.kind === 4) drawSpeciesVine(ctx, bx, by, pot, spec, s, pal, bl, sway, pulse, r);
    else if (spec.kind === 5) drawSpeciesFlower(ctx, bx, by, spec, s, pal, bl, sway, pulse, r);
    else if (spec.kind === 7) drawSpeciesOrchid(ctx, bx, by, pot, spec, s, pal, bl, sway, pulse, r);
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
    contextPanel: '', // '' | 'window'
    activeCassetteId: '',
    firstSessionCompleted: false,
    firstSessionAction: '',
    firstSessionCandidateId: '',
    firstSignalSkipped: [],
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
    vinesStart: -1e9,
    catPetStart: -1e9,
    dogPetStart: -1e9,
    inspectCatCoat: null,
    inspectDogBreed: null,
    inspectAlienKind: null,
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
        whisperSentToday: sameDay ? Math.max(0, Math.trunc(raw.whisperSentToday || 0)) : 0,
        whisperAckDay: typeof raw.whisperAckDay === 'string' ? raw.whisperAckDay : '',
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

// Счётчик «СРЫВОВ ПРОТОКОЛА» — строго реальные использования «Шёпота» (настоящего нарушения протокола молчания!),
// а НЕ нажатия кнопки «Помочь» в ленте боли (которая служит только для отказа системы и пасхалки на 10 нажатий).
function getWhisperBreachCount() {
    return Math.max(0, Number(loadWarmthLedger().whispersSent) || 0);
}

function syncWhisperBreachCounter(countOverride) {
    const breaches = countOverride !== undefined
        ? Math.max(0, Math.trunc(Number(countOverride) || 0))
        : getWhisperBreachCount();
    if (typeof player !== 'undefined' && player) {
        player.whispersSent = breaches;
        player.helpAttempts = breaches;
    }
    if (typeof document !== 'undefined') {
        const el = document.getElementById('stat-attempts');
        if (el) el.textContent = String(breaches);
    }
    return breaches;
}

// Начисляет тепло строго в рамках дневного потолка (не более 4/день: 2 чтение + 2 тренажёр)
function claimDailyWarmth(source, todayOverride) {
    const ledger = loadWarmthLedger(todayOverride);
    if (source === 'trainer') {
        ledger.trainedTotal += 1;
    }
    if (source === 'whisper') {
        ledger.whispersSent += 1;
        ledger.whisperSentToday = (ledger.whisperSentToday || 0) + 1;
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
    if (source === 'whisper') {
        syncWhisperBreachCounter(ledger.whispersSent);
        if (typeof updateCloudProfile === 'function') {
            try { updateCloudProfile(); } catch (_) {}
        }
    }
    return { granted: canGain ? 1 : 0, ledger };
}

function recordWhisperSent(todayOverride) {
    return claimDailyWarmth('whisper', todayOverride);
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

// Local-only, fixed-schema funnel counters. No IDs, text, names or network requests.
const FIRST_SIGNAL_EVENTS = ['entry_view', 'pager_open', 'rules_accept', 'signal_read',
    'signal_skip', 'compose_open', 'send_success', 'cassette_saved', 'echo_received',
    'session_start', 'return_visit'];
function trackFirstSignalEvent(name) {
    if (!FIRST_SIGNAL_EVENTS.includes(name)) return false;
    let counts = {};
    try { counts = JSON.parse(lsGet('soma_signal_metrics_v1') || '{}') || {}; } catch (_) {}
    const clean = {};
    FIRST_SIGNAL_EVENTS.forEach(key => { clean[key] = Math.max(0, Math.min(1000000, Number(counts[key]) || 0)); });
    clean[name] = Math.min(1000000, clean[name] + 1);
    return lsSet('soma_signal_metrics_v1', JSON.stringify(clean));
}

function acceptFirstSignalRules() {
    const saved = lsSet('soma_signal_rules_v1', 'accepted');
    if (saved) trackFirstSignalEvent('rules_accept');
    return saved;
}

const FIRST_SESSION_KEY = 'soma_first_session_v1';
const FIRST_SIGNAL_ROOM_KEY = 'soma_first_signal_room_v1';
const FIRST_SESSION_ACTIONS = ['read', 'skip', 'reply', 'look'];

function updateFirstSignalRoom() {
    if (typeof document === 'undefined') return false;
    const lit = lsGet(FIRST_SIGNAL_ROOM_KEY) === 'seen';
    const station = document.getElementById('station');
    if (station && station.dataset) {
        if (lit) station.dataset.firstSignal = 'seen';
        else delete station.dataset.firstSignal;
    }
    const note = document.getElementById('station-first-signal-note');
    if (note) note.hidden = !lit;
    return lit;
}

function completeFirstSession(action) {
    const choice = String(action || '');
    if (!FIRST_SESSION_ACTIONS.includes(choice)) return false;
    roomAnim.firstSessionCompleted = true;
    roomAnim.firstSessionAction = choice;
    const saved = lsSet(FIRST_SESSION_KEY, choice);
    if (choice === 'read' || choice === 'reply') lsSet(FIRST_SIGNAL_ROOM_KEY, 'seen');
    updateFirstSignalRoom();
    renderFirstSignalEntry();
    return saved;
}

function getVisibleFirstSignalCandidates() {
    let source = [];
    try {
        if (typeof contactPosts === 'function') {
            source = contactPosts();
        } else {
            source = typeof feedPosts !== 'undefined' && Array.isArray(feedPosts) ? feedPosts : [];
            const signalApi = typeof window !== 'undefined' ? window.SOMA_SIGNALS : null;
            if (signalApi && typeof signalApi.visiblePosts === 'function') source = signalApi.visiblePosts(source);
        }
    } catch (_) {
        return [];
    }
    return getFirstSignalCandidates(Array.isArray(source) ? source : []);
}

function renderFirstSignalEntry() {
    if (typeof document === 'undefined') return;
    updateFirstSignalRoom();
    if (!roomAnim.signalSessionTracked) {
        roomAnim.signalSessionTracked = true;
        trackFirstSignalEvent('session_start');
        const today = localDayKey();
        const previousDay = lsGet('soma_signal_last_visit');
        if (previousDay && previousDay !== today) trackFirstSignalEvent('return_visit');
        lsSet('soma_signal_last_visit', today);
    }
    const entry = document.getElementById('first-signal-entry');
    if (!entry) return;

    const ledger = loadWarmthLedger();
    const cloudSends = typeof player !== 'undefined' && player ? Number(player.whispersSent) || 0 : 0;
    const alreadySent = Math.max(ledger.whispersSent, cloudSends) > 0;
    const savedAction = lsGet(FIRST_SESSION_KEY);
    if (alreadySent && !FIRST_SESSION_ACTIONS.includes(savedAction)) {
        lsSet(FIRST_SESSION_KEY, 'reply');
        roomAnim.firstSessionCompleted = true;
        roomAnim.firstSessionAction = 'reply';
        lsSet(FIRST_SIGNAL_ROOM_KEY, 'seen');
        updateFirstSignalRoom();
    }
    const completed = roomAnim.firstSessionCompleted || FIRST_SESSION_ACTIONS.includes(savedAction) || alreadySent;
    const show = isWhisperLive() && !completed;
    entry.hidden = !show;

    let candidate = null;
    if (show) {
        const skipped = new Set(roomAnim.firstSignalSkipped || []);
        candidate = getVisibleFirstSignalCandidates().find(post => post
            && !skipped.has(String(post.id)) && !hasWhisperedToPost(String(post.id))) || null;
    }
    roomAnim.firstSessionCandidateId = candidate ? String(candidate.id) : '';

    const copy = document.getElementById('first-session-copy');
    if (copy && show) {
        const failed = typeof feedLoadFailed !== 'undefined' && feedLoadFailed;
        copy.textContent = candidate
            ? 'Одна настоящая история. Можно прочитать, ответить или пройти мимо.'
            : failed
                ? 'Истории не загрузились. Попробуйте позже.'
                : 'Пока нет подходящей истории. Можно осмотреться или заглянуть позже.';
    }
    const openBtn = document.getElementById('first-session-open');
    if (openBtn) {
        openBtn.hidden = !show || !candidate;
        openBtn.disabled = !show || !candidate;
    }
    const lookBtn = document.getElementById('first-session-look');
    if (lookBtn) lookBtn.hidden = !show;
    if (entry.dataset) entry.dataset.state = !show ? 'closed' : candidate ? 'ready' : 'quiet';

    if (show && !roomAnim.firstSignalEntrySeen) {
        roomAnim.firstSignalEntrySeen = true;
        trackFirstSignalEvent('entry_view');
    }
}

function signalTagLabel(tag) {
    if (typeof window !== 'undefined' && window.SOMA_SIGNALS) return window.SOMA_SIGNALS.tagLabel(tag);
    return String(tag || 'Без темы');
}
function signalResponseHint(tag) {
    if (typeof window !== 'undefined' && window.SOMA_SIGNALS) {
        const { intent } = window.SOMA_SIGNALS.unpackTag(tag);
        if (intent) return intent.hint;
    }
    return 'Советы не запрошены. Просто откликнитесь.';
}
function getFirstSignalCandidates(posts) {
    const mine = new Set(getLocalMyPostIdsSafe());
    const visible = typeof window !== 'undefined' && window.SOMA_SIGNALS
        ? window.SOMA_SIGNALS.visiblePosts(posts) : posts;
    return (Array.isArray(visible) ? visible : []).filter(p => p && p.id
        && !String(p.id).startsWith('demo_') && !p.isDemo && !mine.has(String(p.id)));
}

function openFirstSignalSession(postId) {
    const id = String(postId || '').trim();
    roomAnim.pagerRequestedPostId = id;
    roomAnim.firstSessionCandidateId = id;
    roomAnim.pagerComposingPostId = '';
    roomAnim.pagerDraftText = '';
    roomAnim.firstSignalSkipped = (roomAnim.firstSignalSkipped || []).filter(x => x !== id);
    openPagerModal('feed');
}

function openWhisperForPost(postId) {
    const id = String(postId || '');
    roomAnim.pagerRequestedPostId = id;
    roomAnim.pagerComposingPostId = id;
    roomAnim.pagerDraftText = '';
    roomAnim.firstSignalSkipped = (roomAnim.firstSignalSkipped || []).filter(x => x !== id);
    openPagerModal('feed');
}

function whisperAdmission(_warmth, ledger) {
    const l = ledger || loadWarmthLedger();
    const sentToday = Math.max(0, Number(l.whisperSentToday) || 0);
    const sendCap = PROGRESSION_RULES.DAILY_WHISPER_SEND_CAP;
    // First-send status changes presentation only, never sending eligibility.
    const firstAvailable = isWhisperLive() && (Number(l.whispersSent) || 0) === 0;
    const rulesAccepted = lsGet('soma_signal_rules_v1') === 'accepted';
    return {
        firstAvailable, rulesAccepted,
        admitted: rulesAccepted,
        sprouted: l.whispersSent > 0,
        whispersSent: l.whispersSent,
        whisperSentToday: sentToday,
        whisperLeftToday: Math.max(0, sendCap - sentToday),
        whisperSendCap: sendCap,
        whisperAcks: l.whisperAcks,
        ackBonusClaimedToday: l.whisperAckDay === l.day,
        live: isWhisperLive()
    };
}

// ===== ЖИВОЙ КАНАЛ «ШЁПОТ» (13..333 СИМВ., 1 ШЁПОТ НА ПОСТ, БОНУС КАССЕТЫ +4 ТЕПЛА МАКС. 1 РАЗ В СУТКИ) =====
function validateWhisperText(rawText) {
    const text = String(rawText || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!text) {
        return { ok: false, error: 'Напишите тёплый отклик — пустой шёпот не уйдёт в эфир.' };
    }
    if (text.length < PROGRESSION_RULES.WHISPER_MIN_LEN) {
        return {
            ok: false,
            error: `Слишком коротко (${text.length}/${PROGRESSION_RULES.WHISPER_MIN_LEN}). Скажите человеку то, от чего ему станет не так одиноко.`
        };
    }
    if (text.length > PROGRESSION_RULES.WHISPER_MAX_LEN) {
        return {
            ok: false,
            error: `Превышен предел «Шёпота» (${text.length}/${PROGRESSION_RULES.WHISPER_MAX_LEN} симв.).`
        };
    }
    if (/(https?:\/\/|www\.|t\.me\/|telegram\.me|\b[a-z0-9-]+\.(ru|com|net|org|io|me|gg)\b|@[a-z0-9_]{3,})/i.test(text)) {
        return { ok: false, error: 'Ради анонимности ссылки и @контакты запрещены в канале «Шёпот».' };
    }
    if (/(?:\+?\d[\s\-().]*){9,}/.test(text)) {
        return { ok: false, error: 'Протокол скрыл отправку: не передавайте номера телефонов и карт.' };
    }
    return { ok: true, value: text };
}

function getWhisperedPosts() {
    try {
        const arr = JSON.parse(lsGet('soma_whispered_posts') || '[]');
        return Array.isArray(arr) ? arr.map(String) : [];
    } catch (_) { return []; }
}

function hasWhisperedToPost(postId) {
    const id = String(postId || '').trim();
    if (!id) return false;
    return getWhisperedPosts().includes(id);
}

function rememberWhisperedPost(postId) {
    const id = String(postId || '').trim();
    if (!id) return;
    const list = [id, ...getWhisperedPosts().filter(x => x !== id)].slice(0, 300);
    lsSet('soma_whispered_posts', JSON.stringify(list));
}

function getHandledWhispers() {
    try {
        const obj = JSON.parse(lsGet('soma_handled_whispers') || '{}');
        return (obj && typeof obj === 'object') ? obj : {};
    } catch (_) { return {}; }
}

function markWhisperHandled(whisperId, status) {
    const id = String(whisperId || '').trim();
    if (!id) return;
    const map = getHandledWhispers();
    map[id] = status || 'saved';
    lsSet('soma_handled_whispers', JSON.stringify(map));
}

function getAckedWhispers() {
    try {
        const arr = JSON.parse(lsGet('soma_acked_whispers') || '[]');
        return Array.isArray(arr) ? arr.map(String) : [];
    } catch (_) { return []; }
}

function rememberAckedWhisper(whisperId) {
    const id = String(whisperId || '').trim();
    if (!id) return;
    const list = [id, ...getAckedWhispers().filter(x => x !== id)].slice(0, 300);
    lsSet('soma_acked_whispers', JSON.stringify(list));
}

// Когда ваш «Шёпот» другой человек сохранил себе на кассету VTR-90:
// даёт +4 Тепла для роста растения (без XP), но СТРОГО НЕ БОЛЕЕ 1 РАЗА В СУТКИ!
function claimWhisperCassetteAck(whisperId, todayOverride) {
    const wid = String(whisperId || '').trim();
    if (wid) {
        if (getAckedWhispers().includes(wid)) {
            return { duplicate: true, grantedWarmth: 0, ledger: loadWarmthLedger(todayOverride) };
        }
        rememberAckedWhisper(wid);
    }
    const ledger = loadWarmthLedger(todayOverride);
    ledger.whisperAcks = (ledger.whisperAcks || 0) + 1;

    const alreadyClaimedToday = ledger.whisperAckDay === ledger.day;
    let grantedWarmth = 0;

    if (!alreadyClaimedToday) {
        ledger.whisperAckDay = ledger.day;
        grantedWarmth = PROGRESSION_RULES.WHISPER_ACK_WARMTH; // +4 тепла
    }
    saveWarmthLedger(ledger);

    if (grantedWarmth > 0) {
        if (typeof addWarmth === 'function') {
            try { addWarmth(grantedWarmth); } catch (_) {}
        } else {
            if (typeof player !== 'undefined' && player) {
                player.warmth = (Number(player.warmth) || 0) + grantedWarmth;
                lsSet('soma_warmth', String(player.warmth));
                if (typeof feedActiveRoomPlant === 'function') {
                    feedActiveRoomPlant(grantedWarmth, player.warmth);
                }
            }
        }
    }

    if (typeof roomAnim !== 'undefined' && roomAnim) {
        roomAnim.pagerNotice = grantedWarmth > 0
            ? `✦ Человек сохранил ваш «Шёпот» на кассету! +${grantedWarmth} Тепла пошли на рост растения.`
            : '✦ Ещё один ваш «Шёпот» бережно сохранён на кассету (бонус тепла 1/1 за сегодня уже впитался).';
        roomAnim.customMode = 'ПЕЙДЖЕР // ОТКЛИК С КАССЕТЫ';
        roomAnim.customEntry = roomAnim.pagerNotice;
    }
    trackFirstSignalEvent('echo_received');
    renderRoom();
    return { duplicate: false, grantedWarmth, ledger };
}

// ===== ОРАНЖЕРЕЯ + СЕКРЕТНОЕ ВНЕЗЕМНОЕ СЕМЯ (1 ИЗ 7 ПОСЛЕ 7/7) =====
// Железные правила:
//   1. Кнопка Оранжереи появляется СТРОГО только когда выращено первое растение (gh.bloomed.includes(own.kind)).
//   2. Любое растение растёт ТОЛЬКО пока стоит в комнате (если в комнату поставлен готовый цветок — семя ждёт на паузе).
//   3. Любой выращенный цветок (включая расцветшего пришельца) можно поставить в комнату.
//   4. После 7/7 земных растений открывается ОДНО секретное внеземное семя из 7 (строго 1 вид навсегда для игрока!).
function loadGreenhouse(currentWarmthFallback) {
    let g = {};
    try { g = JSON.parse(lsGet('soma_greenhouse') || '{}') || {}; } catch (_) { g = {}; }
    const bloomed = Array.isArray(g.bloomed)
        ? [...new Set(g.bloomed.map(Number).filter(k => Number.isInteger(k) && k >= 0 && k < PLANT_KINDS.length))]
        : [];
    const curW = currentWarmthFallback !== undefined
        ? Math.max(0, Number(currentWarmthFallback) || 0)
        : Math.max(0, Number((typeof player !== 'undefined' && player && player.warmth) || lsGet('soma_warmth') || 0));
    let seed = null;
    if (g.activeSeed && Number.isInteger(g.activeSeed.kind) && g.activeSeed.kind >= 0 && g.activeSeed.kind < PLANT_KINDS.length) {
        const hasGrown = Number.isFinite(Number(g.activeSeed.grownWarmth));
        const legacyStart = Math.max(0, Number(g.activeSeed.startWarmth) || 0);
        const grownWarmth = hasGrown
            ? Math.max(0, Number(g.activeSeed.grownWarmth) || 0)
            : Math.max(0, curW - legacyStart);
        seed = {
            kind: g.activeSeed.kind,
            startWarmth: legacyStart,
            grownWarmth
        };
    }
    // Секретный пришелец: строго ОДИН вид навсегда на игрока (привязан к alienSpec().ownAlienKind)
    let alienSeed = null;
    if (g.alienSeed && typeof g.alienSeed === 'object' && bloomed.length >= PLANT_KINDS.length) {
        const lockedKind = alienSpec().ownAlienKind;
        const ag = Math.max(0, Number(g.alienSeed.grownWarmth) || 0);
        const isBl = !!g.alienSeed.bloomed || ag >= ALIEN_WARMTH_STEPS[ALIEN_WARMTH_STEPS.length - 1];
        alienSeed = {
            kind: lockedKind,
            grownWarmth: isBl ? Math.max(ag, ALIEN_WARMTH_STEPS[ALIEN_WARMTH_STEPS.length - 1]) : ag,
            bloomed: isBl
        };
    }
    let placed = null;
    if (Number.isInteger(g.placed) && g.placed >= 0 && g.placed < PLANT_KINDS.length) {
        placed = g.placed;
    } else if (g.placed === 'seed' && seed) {
        placed = 'seed';
    } else if (g.placed === 'alien' && alienSeed) {
        placed = 'alien';
    }
    // Индивидуальные сосуды для каждого вида в Оранжерее ('0'..'7' и 'alien' → 'default' | pot_*)
    const VALID_POT_CHOICES = new Set(['default', 'pot_cinnabar', 'pot_moon', 'pot_kintsugi', 'pot_amethyst']);
    const pots = {};
    if (g.pots && typeof g.pots === 'object') {
        for (const [k, v] of Object.entries(g.pots)) {
            const validSlot = k === 'alien' || (/^\d+$/.test(k) && Number(k) >= 0 && Number(k) < PLANT_KINDS.length);
            if (validSlot && typeof v === 'string' && VALID_POT_CHOICES.has(v)) {
                pots[k] = v;
            }
        }
    }
    return { bloomed, activeSeed: seed, alienSeed, placed, pots };
}

function saveGreenhouse(gh) {
    lsSet('soma_greenhouse', JSON.stringify(gh));
}

function isPotSkinAvailable(potId) {
    if (!potId || potId === 'default') return true;
    if (isPtsMode()) return ['pot_cinnabar', 'pot_moon', 'pot_kintsugi', 'pot_amethyst'].includes(potId);
    if (typeof getOwnedPotSkins === 'function') {
        try { return getOwnedPotSkins().includes(potId); } catch (_) {}
    }
    if (typeof isOwned === 'function') {
        try { return !!isOwned(potId); } catch (_) {}
    }
    const c = getRoomCosmeticsSafe();
    return c && c.pot === potId;
}

// Возвращает сосуд, выбранный в Оранжерее для конкретного цветка ('0'..'7' или 'alien'):
//   'default'      → родная терракота/керамика вида (перекрывает даже глобальный сосуд и кинцуги пришельца)
//   'pot_*'        → выбранный авторский сосуд мастера (если открыт у игрока / в PTS)
//   не задан       → fallbackPot (или 'pot_kintsugi' для пришельца)
function potSkinForFlower(slot, fallbackPot, ghOverride) {
    const key = slot === 'alien' ? 'alien' : String(Number(slot));
    const gh = ghOverride || loadGreenhouse();
    const chosen = gh && gh.pots && gh.pots[key];
    if (chosen === 'default') return 'default';
    if (chosen && isPotSkinAvailable(chosen)) return chosen;
    if (slot === 'alien') {
        if (fallbackPot && isPotSkinAvailable(fallbackPot)) return fallbackPot;
        return 'pot_kintsugi';
    }
    return fallbackPot || '';
}

function setGreenhouseFlowerPot(slot, potSkin) {
    const key = slot === 'alien' ? 'alien' : String(Number(slot));
    const okSlot = key === 'alien' || (/^\d+$/.test(key) && Number(key) >= 0 && Number(key) < PLANT_KINDS.length);
    if (!okSlot) return false;
    const norm = (!potSkin || potSkin === 'default') ? 'default' : String(potSkin);
    const allowed = new Set(['default', 'pot_cinnabar', 'pot_moon', 'pot_kintsugi', 'pot_amethyst']);
    if (!allowed.has(norm)) return false;
    if (norm !== 'default' && !isPotSkinAvailable(norm)) return false;
    const gh = loadGreenhouse();
    if (!gh.pots || typeof gh.pots !== 'object') gh.pots = {};
    gh.pots[key] = norm;
    saveGreenhouse(gh);
    if (typeof renderRoom === 'function') renderRoom();
    return true;
}

function activeRoomPotSkin(fallbackPot, specOverride) {
    const cosm = getRoomCosmeticsSafe();
    const fb = fallbackPot !== undefined ? fallbackPot : ((cosm && cosm.pot) || '');
    // Во время живой примерки сосуда в комнате из Бутика сразу показываем примеряемый сосуд!
    if (typeof shopState !== 'undefined' && shopState && shopState.liveRoomTry && shopState.preview && String(shopState.preview).startsWith('pot_')) {
        return shopState.preview;
    }
    const sp = specOverride || roomAnim.spec || plantSpec();
    if (!sp) return fb;
    if (sp.isAlien) return potSkinForFlower('alien', fb);
    if (Number.isInteger(sp.kind)) return potSkinForFlower(sp.kind, fb);
    return fb;
}

function isGreenhouseUnlocked(ownSpecOverride) {
    const own = ownSpecOverride || plantSpec();
    const w = (typeof player !== 'undefined' && Number.isFinite(Number(player.warmth))) ? Number(player.warmth) : 0;
    const gh = loadGreenhouse(w);
    if (w >= PLANT_WARMTH_STEPS[PLANT_WARMTH_STEPS.length - 1] && !gh.bloomed.includes(own.kind)) {
        gh.bloomed.push(own.kind);
        if (gh.placed === null) gh.placed = own.kind;
        saveGreenhouse(gh);
    }
    return gh.bloomed.includes(own.kind);
}

// Напитывает теплом СТРОГО ТОЛЬКО то растущее растение, которое СЕЙЧАС стоит в комнате!
// Если в комнате стоит уже расцветший цветок — семя в Оранжерее НЕ растёт, пока игрок не вернёт горшок с семенем в комнату.
function feedActiveRoomPlant(deltaWarmth, currentWarmth) {
    const d = Math.max(0, Number(deltaWarmth) || 0);
    if (d <= 0) return null;
    const prevWarmth = currentWarmth !== undefined ? Math.max(0, Number(currentWarmth) - d) : undefined;
    const gh = loadGreenhouse(prevWarmth);
    const own = plantSpec();
    // Пока первое растение ещё не расцвело — оно всегда стоит в комнате и растёт от общего тепла.
    if (!gh.bloomed.includes(own.kind)) return gh;

    if (gh.placed === 'seed' && gh.activeSeed) {
        gh.activeSeed.grownWarmth = Math.max(0, (Number(gh.activeSeed.grownWarmth) || 0) + d);
        const st = plantStage(gh.activeSeed.grownWarmth, { sprouted: true, steps: GREENHOUSE_WARMTH_STEPS });
        if (st >= 5) {
            const doneKind = gh.activeSeed.kind;
            if (!gh.bloomed.includes(doneKind)) gh.bloomed.push(doneKind);
            gh.activeSeed = null;
            gh.placed = doneKind;
        }
        saveGreenhouse(gh);
    } else if (gh.placed === 'alien' && gh.alienSeed && !gh.alienSeed.bloomed) {
        gh.alienSeed.grownWarmth = Math.max(0, (Number(gh.alienSeed.grownWarmth) || 0) + d);
        const st = plantStage(gh.alienSeed.grownWarmth, { sprouted: true, steps: ALIEN_WARMTH_STEPS });
        if (st >= 5) {
            gh.alienSeed.bloomed = true;
            gh.placed = 'alien';
        }
        saveGreenhouse(gh);
    } else if (gh.activeSeed) {
        // Фиксируем миграцию grownWarmth без прибавления d — в комнате стоял готовый цветок, семя на паузе!
        saveGreenhouse(gh);
    }
    return gh;
}

function plantNewGreenhouseSeed(currentWarmth, ownSpec) {
    const own = ownSpec || plantSpec();
    const w = Math.max(0, Number(currentWarmth) ?? ((typeof player !== 'undefined' && player.warmth) || 0));
    const gh = loadGreenhouse(w);
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
    gh.activeSeed = { kind: remaining[pickIdx], startWarmth: w, grownWarmth: 0 };
    gh.placed = 'seed';
    saveGreenhouse(gh);
    roomAnim.customEntry = EMPTY_POT_LINES.seed[0];
    roomAnim.customMode = 'ЖУРНАЛ // ОРАНЖЕРЕЯ';
    animatePlantShift();
    playObjectTone('plant');
    renderRoom();
    return gh.activeSeed;
}

// Бонусное 9-е секретное внеземное семя: выдаётся СТРОГО после 8/8 земных растений, и СТРОГО 1 вид из 7 навсегда на игрока!
function plantSecretAlienSeed() {
    const gh = loadGreenhouse();
    if (gh.bloomed.length < PLANT_KINDS.length) return null;
    const myAlien = alienSpec();
    if (!gh.alienSeed) {
        gh.alienSeed = {
            kind: myAlien.ownAlienKind,
            grownWarmth: 0,
            bloomed: false
        };
    } else {
        // Невозможно получить второй вид — всегда строго свой единственный!
        gh.alienSeed.kind = myAlien.ownAlienKind;
    }
    gh.placed = 'alien';
    saveGreenhouse(gh);
    roomAnim.customEntry = gh.alienSeed.bloomed
        ? myAlien.alien.note
        : EMPTY_POT_LINES.alien[0];
    roomAnim.customMode = gh.alienSeed.bloomed
        ? `ОРАНЖЕРЕЯ // ${myAlien.kindName}`
        : 'ОРАНЖЕРЕЯ // СЕКРЕТНОЕ СЕМЯ';
    animatePlantShift();
    playObjectTone('plant');
    renderRoom();
    return gh.alienSeed;
}

function selectGreenhouseSlot(slot) {
    const gh = loadGreenhouse();
    if (slot === 'seed' && gh.activeSeed) {
        gh.placed = 'seed';
    } else if (slot === 'alien' && gh.alienSeed) {
        gh.placed = 'alien';
    } else {
        const k = Math.trunc(Number(slot));
        if (!gh.bloomed.includes(k)) return false;
        gh.placed = k;
    }
    saveGreenhouse(gh);
    roomAnim.customEntry = '';
    roomAnim.customMode = '';
    animatePlantShift();
    playObjectTone('plant');
    renderRoom();
    return true;
}

function openGreenhouse(opts) {
    const allowPts = !!(opts && opts.ptsDemo && isPtsMode());
    if (!allowPts && !isGreenhouseUnlocked()) return false;
    if (typeof window !== 'undefined' && window.SOMA_GREENHOUSE && typeof window.SOMA_GREENHOUSE.open === 'function') {
        window.SOMA_GREENHOUSE.open(opts || {});
        return true;
    }
    return false;
}

// Удобный вход в Оранжерею прямо из полноэкранного режима (и для игроков с открытым куполом, и в PTS-режиме!)
function openGreenhouseFromFullscreen(ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    const unlocked = isGreenhouseUnlocked();
    if (!unlocked && !isPtsMode()) return false;
    const ok = openGreenhouse(unlocked ? {} : { ptsDemo: true });
    if (typeof bumpFullscreenHud === 'function') bumpFullscreenHud();
    return ok;
}

// Видеоархив VHS входящих анонимных «Шёпотов» (полная дата ДД.ММ.ГГГГ, постоянный номер кассеты, избранное)
function formatCassetteDate(rawDate, fallbackTs) {
    const pickYear = () => {
        if (Number.isFinite(fallbackTs) && fallbackTs > 946684800000) {
            return new Date(fallbackTs).getFullYear();
        }
        return new Date().getFullYear();
    };
    const s = String(rawDate || '').trim();
    // Полная дата ДД.ММ.ГГГГ (или Д.М.ГГГГ)
    const full = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (full) {
        return `${full[1].padStart(2, '0')}.${full[2].padStart(2, '0')}.${full[3]}`;
    }
    // ISO ГГГГ-ММ-ДД
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) {
        return `${iso[3].padStart(2, '0')}.${iso[2].padStart(2, '0')}.${iso[1]}`;
    }
    // Короткая ДД.ММ.ГГ
    const shortYr = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2})$/);
    if (shortYr) {
        return `${shortYr[1].padStart(2, '0')}.${shortYr[2].padStart(2, '0')}.20${shortYr[3]}`;
    }
    // Старый формат ДД.ММ (мягкая миграция с добавлением полного года)
    const legacy = s.match(/^(\d{1,2})\.(\d{1,2})$/);
    if (legacy) {
        return `${legacy[1].padStart(2, '0')}.${legacy[2].padStart(2, '0')}.${pickYear()}`;
    }
    const d = (Number.isFinite(fallbackTs) && fallbackTs > 946684800000) ? new Date(fallbackTs) : new Date();
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function parseCassetteDateTs(dateStr, fallbackTs) {
    const m = String(dateStr || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) {
        const t = Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0);
        if (Number.isFinite(t)) return t;
    }
    return Number.isFinite(fallbackTs) ? fallbackTs : 0;
}

function formatCassetteNum(num) {
    const n = Math.max(1, Math.floor(Number(num) || 1));
    return String(n).padStart(3, '0');
}

function loadCassettes() {
    let list = [];
    try { list = JSON.parse(lsGet('soma_cassettes') || '[]'); } catch (_) { list = []; }
    if (!Array.isArray(list)) return [];
    const valid = list.filter(c => c && typeof c.text === 'string' && c.text.trim()).slice(0, 120);
    const total = valid.length;
    return valid.map((c, idx) => {
        const idStr = String(c.id || `cas_${idx}`);
        const idTsMatch = idStr.match(/^cas_(\d{12,14})/);
        const rawTs = Number(c.ts) || (idTsMatch ? Number(idTsMatch[1]) : 0);
        const date = formatCassetteDate(c.date, rawTs);
        const ts = rawTs || parseCassetteDateTs(date, total - idx);
        const storedNum = Number(c.num);
        const num = (Number.isInteger(storedNum) && storedNum >= 1) ? storedNum : Math.max(1, total - idx);
        return {
            id: idStr,
            num,
            date,
            ts,
            text: c.text.trim().slice(0, 420),
            fav: !!c.fav
        };
    });
}

function saveWhisperCassette(text, dateLabel, opts) {
    const clean = String(text || '').trim().slice(0, 420);
    if (!clean) return null;
    const list = loadCassettes();
    const maxNum = list.reduce((mx, c) => Math.max(mx, Number(c.num) || 0), 0);
    const nowTs = Date.now();
    const stamp = formatCassetteDate(dateLabel, nowTs);
    const item = {
        id: (opts && opts.id) ? String(opts.id) : ('cas_' + nowTs + '_' + Math.floor(Math.random() * 900 + 100)),
        num: (opts && Number.isInteger(opts.num) && opts.num >= 1) ? opts.num : (maxNum + 1),
        date: stamp,
        ts: parseCassetteDateTs(stamp, nowTs),
        text: clean,
        fav: !!(opts && opts.fav)
    };
    list.unshift(item);
    lsSet('soma_cassettes', JSON.stringify(list.slice(0, 120)));
    if (typeof window !== 'undefined' && window.SOMA_VHS && typeof window.SOMA_VHS.refresh === 'function') {
        window.SOMA_VHS.refresh();
    }
    return item;
}

function toggleCassetteFav(id) {
    const list = loadCassettes();
    const found = list.find(c => c.id === id);
    if (!found) return false;
    found.fav = !found.fav;
    lsSet('soma_cassettes', JSON.stringify(list));
    renderRoom();
    if (typeof window !== 'undefined' && window.SOMA_VHS && typeof window.SOMA_VHS.refresh === 'function') {
        window.SOMA_VHS.refresh();
    }
    return found.fav;
}

function ejectCassette(silent) {
    roomAnim.activeCassetteId = '';
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!silent) {
        if ((now - roomAnim.deckStart) > 1200) roomAnim.deckStart = now;
        if (typeof playObjectTone === 'function') playObjectTone('shelf');
    }
    roomAnim.customMode = 'ВИДЕОДЕКА // ЛОТОК СВОБОДЕН';
    roomAnim.customEntry = 'Кассета бережно извлечена в футляр. Выберите любую запись, чтобы вставить её в деку.';
    renderRoom();
}

function playCassette(id, opts) {
    const list = loadCassettes();
    const found = list.find(c => c.id === id) || list[0];
    if (!found) return null;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    roomAnim.activeCassetteId = found.id;
    if (!(opts && opts.silent)) {
        if ((now - roomAnim.deckStart) > 2850) {
            roomAnim.deckStart = now;
            playObjectTone('shelf');
        } else if (typeof SFX !== 'undefined' && SFX.tap) {
            SFX.tap();
        }
    }
    roomAnim.customMode = `VHS #${formatCassetteNum(found.num)} · ${found.date}`;
    roomAnim.customEntry = `«${found.text}»`;
    renderRoom();
    if (opts && opts.openDeck && typeof window !== 'undefined' && window.SOMA_VHS && typeof window.SOMA_VHS.open === 'function') {
        window.SOMA_VHS.open(found.id);
    } else if (typeof window !== 'undefined' && window.SOMA_VHS && typeof window.SOMA_VHS.refresh === 'function') {
        window.SOMA_VHS.refresh();
    }
    return found;
}

function getActiveCassetteId() {
    return (roomAnim && roomAnim.activeCassetteId) ? String(roomAnim.activeCassetteId) : '';
}

function openVhsArchive(cassetteId) {
    if (typeof window !== 'undefined' && window.SOMA_VHS && typeof window.SOMA_VHS.open === 'function') {
        window.SOMA_VHS.open(cassetteId || roomAnim.activeCassetteId || '');
        return true;
    }
    return false;
}

function togglePtsDemoCassette() {
    const list = loadCassettes();
    const isDemo = c => c.id === 'cas_pts_demo' || /^cas_pts_demo_\d+$/.test(c.id);
    const hasDemo = list.some(isDemo);
    if (hasDemo) {
        const filtered = list.filter(c => !isDemo(c));
        lsSet('soma_cassettes', JSON.stringify(filtered));
        roomAnim.activeCassetteId = '';
        roomAnim.customMode = 'ВИДЕОДЕКА // PTS';
        roomAnim.customEntry = 'Тестовые VHS-кассеты извлечены из видеоархива.';
        renderRoom();
        if (typeof window !== 'undefined' && window.SOMA_VHS && typeof window.SOMA_VHS.refresh === 'function') {
            window.SOMA_VHS.refresh();
        }
    } else {
        const baseNum = list.reduce((mx, c) => Math.max(mx, Number(c.num) || 0), 0);
        const demoPack = [
            {
                id: 'cas_pts_demo',
                num: baseNum + 4,
                date: '18.11.2026',
                ts: Date.UTC(2026, 10, 18, 21, 40),
                fav: true,
                text: 'Я прочитал твою запись до конца и просто посидел рядом в тишине. Тебе не нужно справляться с этим в одиночку сегодня.'
            },
            {
                id: 'cas_pts_demo_3',
                num: baseNum + 3,
                date: '02.11.2026',
                ts: Date.UTC(2026, 10, 2, 23, 15),
                fav: false,
                text: 'В этом шумном городе кто-то услышал тебя по-настоящему. Береги свой тихий свет — даже самая длинная ночь заканчивается рассветом.'
            },
            {
                id: 'cas_pts_demo_2',
                num: baseNum + 2,
                date: '19.10.2026',
                ts: Date.UTC(2026, 9, 19, 20, 5),
                fav: true,
                text: 'Завари себе горячий чай, укрой плечи и выдохни. Ты уже сделал достаточно за этот день — можно просто побыть в тепле.'
            },
            {
                id: 'cas_pts_demo_1',
                num: baseNum + 1,
                date: '04.09.2026',
                ts: Date.UTC(2025, 11, 28, 19, 30),
                fav: false,
                text: 'Не знаю твоего имени, но твои слова отозвались очень близко. Пусть у тебя сегодня будет спокойная, добрая ночь без тревоги.'
            }
        ];
        demoPack[3].ts = Date.UTC(2026, 8, 4, 19, 30);
        const next = [...demoPack, ...list].slice(0, 120);
        lsSet('soma_cassettes', JSON.stringify(next));
        roomAnim.activeCassetteId = 'cas_pts_demo';
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        roomAnim.deckStart = now;
        playObjectTone('shelf');
        roomAnim.customMode = `VHS #${formatCassetteNum(demoPack[0].num)} · ${demoPack[0].date}`;
        roomAnim.customEntry = `«${demoPack[0].text}»`;
        renderRoom();
        if (typeof window !== 'undefined' && window.SOMA_VHS && typeof window.SOMA_VHS.open === 'function') {
            window.SOMA_VHS.open('cas_pts_demo');
        }
    }
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

// Точный попиксельный контур неба НАД реальными высотками NEEO~CITY из assets/quiet-station.jpg:
// ни одна башня, водонапорный бак, решётчатая радиомачта, купол, кран или шпиль не перекрывается ни на 1 пиксель —
// все здания остаются на 100% идентичными во всех 4 атмосферах (Дождь · Оттепель · Очаг · Рассвет)!
const NEEO_SKY_POLY = [
    // Левая высотка и надстройка на крыше (x=242..286)
    [242, 117], [267, 117], [267, 113], [274, 113], [274, 117], [285, 117], [286, 120],
    // Узкая башня слева (x=286..295) и ступенчатый корпус (x=295..300)
    [286, 152], [288, 152], [288, 139], [295, 139], [295, 154], [300, 154],
    // Башня ар-деко со шпилем (x=300..314) и плоский средний дом (x=314..327)
    [300, 136], [303, 131], [306, 131], [307, 124], [308, 131], [311, 131], [314, 136],
    [314, 163], [327, 163],
    // Главный лево-центральный небоскрёб с квадратной ажурной башней и радиомачтой (x=327..358)
    [327, 141], [330, 138], [333, 138], [333, 112], [337, 108], [339, 94], [341, 94],
    [342, 108], [349, 110], [349, 138], [356, 138], [358, 142],
    // Нижний квартал с щипцом (x=358..375) и индустриальная башня (x=375..391)
    [358, 177], [361, 177], [363.5, 169], [366, 177], [375, 177],
    [375, 163], [381, 163], [382.5, 158], [385, 163], [391, 163],
    // Центральная башня со шпилем (x=395..413)
    [391, 173], [395, 173], [395, 168], [400, 168], [403, 157], [405, 168], [413, 168],
    // Истинный каньон горизонта (x=413..431)
    [413, 191], [426, 191], [426, 184], [431, 184],
    // Право-центральная башня с антенной (x=431..449) и дальний просвет (x=449..460)
    [431, 174], [438, 174], [439, 163], [440, 174], [449, 174],
    [449, 188], [451, 183], [456, 183], [456, 188], [460, 188],
    // Широкий жилой небоскрёб с реальным баком на крыше (x=460..496)
    [460, 149], [467, 149], [468, 144], [469, 149], [480, 149], [480, 139], [489, 139], [489, 149], [496, 149],
    // Проём с реальным портовым краном (x=496..515)
    [496, 163], [504, 163], [505.5, 151], [507, 163], [508, 163], [508, 172], [515, 172],
    // Правый ступенчатый небоскрёб до самого свода окна (x=515..566)
    [515, 122], [520, 122], [521, 114], [523, 121], [524, 121], [525, 108], [526, 121], [528, 121], [528, 76], [566, 76]
];

// Детерминированные звёзды космоса и живые небесные фонарики «Очага» (0 аллокаций в кадре!)
const COSMIC_DAWN_STARS = (function () {
    const sr = rng(0x50a13d);
    const out = [];
    for (let i = 0; i < 46; i++) {
        out.push({
            x: 262 + sr() * 272,
            y: 38 + Math.pow(sr(), 1.25) * 114,
            r: i < 5 ? (1.25 + sr() * 0.45) : (0.52 + sr() * 0.68),
            sparkle: i < 5,
            col: i % 4 === 0 ? '#ffe8cf' : (i % 3 === 0 ? '#f5d0fe' : (i % 2 === 0 ? '#e9d5ff' : '#fff8ff')),
            speed: 0.7 + sr() * 1.6,
            phase: sr() * Math.PI * 2
        });
    }
    return out;
})();

const HEARTH_LANTERNS = (function () {
    const lr = rng(0xf1e72a);
    const out = [];
    for (let i = 0; i < 28; i++) {
        const tier = i < 10 ? 0 : (i < 20 ? 1 : 2); // 0: дальние искры, 1: средние, 2: крупные тёплые фонарики
        out.push({
            x0: 278 + ((i * 37.3 + lr() * 18) % 244),
            seed: lr(),
            speed: 0.011 + tier * 0.0045 + lr() * 0.005,
            swayAmp: 3.5 + tier * 2.6 + lr() * 2.4,
            swayFreq: 0.32 + lr() * 0.35,
            phase: lr() * Math.PI * 2,
            w: tier === 0 ? 1.15 : (tier === 1 ? 1.85 : 2.55),
            h: tier === 0 ? 1.5 : (tier === 1 ? 2.45 : 3.4),
            tier
        });
    }
    return out;
})();

function clipWindowSky(g) {
    g.beginPath();
    g.moveTo(242, 22);
    g.lineTo(566, 22);
    for (let i = NEEO_SKY_POLY.length - 1; i >= 0; i--) g.lineTo(NEEO_SKY_POLY[i][0], NEEO_SKY_POLY[i][1]);
    g.closePath();
    g.clip();
}

// 1) Окна в домах NEEO~CITY, «Очаг» с золотым месяцем и небесными фонариками, космический фиалковый «Рассвет» и дирижабль
function drawWindowWorld(g, now, phase, winGlow) {
    g.save();
    g.beginPath();
    g.ellipse(WIN_CX, WIN_CY, WIN_RX - 2, WIN_RY - 2, 0, 0, Math.PI * 2);
    g.clip();

    if (phase === 1) {
        // ===== АТМОСФЕРА «ОТТЕПЕЛЬ» (ВАУ-ЭФФЕКТ): РАССТУПИВШИЕСЯ ТУЧИ, ПОЛНАЯ ЖЕМЧУЖНАЯ ЛУНА В 22° ЛЕДЯНОМ ГАЛО,
        //       СЕРЕБРИСТО-РОЗОВЫЙ ПАР ПРОБУЖДАЮЩЕГОСЯ ГОРОДА И ХРУСТАЛЬНЫЕ ТАЮЩИЕ СОСУЛЬКИ С ЖИВОЙ КАПЕЛЬЮ! =====
        // Все высотки NEEO~CITY на 100% нетронуты — небесный просвет и гало живут строго за точным контуром зданий!
        const still = prefersStillRoom();
        const t = still ? 5.4 : now * 0.001;
        const breathe = still ? 0.6 : (0.5 + 0.5 * Math.sin(t * 0.52));

        g.save();
        clipWindowSky(g);

        // 1. Бархатно-сизое предвесеннее небо с перламутрово-ледяным просветом и тёплым розоватым дыханием у горизонта
        if (g.createLinearGradient) {
            const tk = g.createLinearGradient(0, 26, 0, 192);
            tk.addColorStop(0.00, 'rgba(18, 22, 42, 0.72)');
            tk.addColorStop(0.34, 'rgba(46, 56, 92, 0.58)');
            tk.addColorStop(0.66, 'rgba(104, 118, 158, 0.50)');
            tk.addColorStop(0.88, 'rgba(196, 168, 198, 0.52)');
            tk.addColorStop(1.00, 'rgba(244, 206, 220, 0.62)');
            g.fillStyle = tk;
            g.fillRect(242, 22, 324, 172);
        }

        // Диагональное серебряно-перламутровое «окно» в расступившихся зимних тучах
        const mx = 438, my = 74, mr = 10.6;
        if (g.createRadialGradient) {
            g.save();
            g.globalCompositeOperation = 'screen';
            const rift = g.createRadialGradient(mx, my, 4, mx - 18, my + 24, 132);
            const ra = 0.42 + breathe * 0.09 + winGlow * 0.09;
            rift.addColorStop(0.00, `rgba(240, 248, 255, ${ra.toFixed(3)})`);
            rift.addColorStop(0.32, `rgba(186, 214, 248, ${(ra * 0.66).toFixed(3)})`);
            rift.addColorStop(0.68, `rgba(224, 176, 212, ${(ra * 0.34).toFixed(3)})`);
            rift.addColorStop(1.00, 'rgba(40, 28, 56, 0)');
            g.fillStyle = rift;
            g.fillRect(242, 22, 324, 172);

            // Тёплый перламутрово-розовый отсвет тающего города снизу между башнями
            const cg = g.createRadialGradient(408, 186, 8, 408, 170, 128);
            cg.addColorStop(0.00, `rgba(255, 214, 226, ${(0.32 + breathe * 0.07).toFixed(3)})`);
            cg.addColorStop(0.48, `rgba(186, 208, 244, ${(0.20 + breathe * 0.05).toFixed(3)})`);
            cg.addColorStop(1.00, 'rgba(60, 40, 80, 0)');
            g.fillStyle = cg;
            g.fillRect(242, 22, 324, 172);
            g.restore();
        }

        // 2. Хрустальные морозные звёзды в чистом просвете между облаками
        for (let s = 0; s < 26; s++) {
            const st = COSMIC_DAWN_STARS[s];
            if (st.y > 128) continue;
            const dMoon = Math.hypot(st.x - mx, st.y - my);
            if (dMoon < 24) continue;
            const tw = still ? 0.72 : (0.32 + 0.68 * (0.5 + 0.5 * Math.sin(t * (st.speed * 1.15) + st.phase)));
            g.globalAlpha = tw * 0.72;
            g.fillStyle = s % 3 === 0 ? '#e0f2fe' : (s % 3 === 1 ? '#f8fafc' : '#fce7f3');
            g.beginPath(); g.arc(st.x, st.y, st.r * 0.9, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;

        // 3. ГЛАВНОЕ НЕБЕСНОЕ ЧУДО «ОТТЕПЕЛИ»: настоящее радужно-ледяное 22° лунное гало с парселенами (ложными лунами)!
        if (g.createRadialGradient) {
            g.save();
            g.globalCompositeOperation = 'screen';
            const haloR = 42;
            const ha = 0.34 + breathe * 0.09 + winGlow * 0.08;
            const hg = g.createRadialGradient(mx, my, haloR - 9, mx, my, haloR + 11);
            hg.addColorStop(0.00, 'rgba(255, 196, 214, 0)');
            hg.addColorStop(0.34, `rgba(255, 206, 222, ${(ha * 0.68).toFixed(3)})`); // тёплая розоватая внутренняя кромка гало
            hg.addColorStop(0.54, `rgba(244, 250, 255, ${ha.toFixed(3)})`);          // жемчужно-серебряное кольцо кристаллов льда
            hg.addColorStop(0.76, `rgba(176, 222, 255, ${(ha * 0.72).toFixed(3)})`); // прозрачный ледяной внешний ореол
            hg.addColorStop(1.00, 'rgba(148, 196, 248, 0)');
            g.fillStyle = hg;
            g.beginPath(); g.arc(mx, my, haloR + 11, 0, Math.PI * 2); g.fill();

            // Две нежные световые «парселены» (боковые блики в ледяных кристаллах на кольце гало)
            for (const sgn of [-1, 1]) {
                const px = mx + sgn * haloR;
                radialAura(g, px, my, 10.5, '#ffffff', '#bae6fd', (0.30 + breathe * 0.12));
            }
            // Тонкая горизонтальная световая дуга через луну
            const arcG = g.createLinearGradient(mx - haloR - 18, my, mx + haloR + 18, my);
            arcG.addColorStop(0.00, 'rgba(224, 242, 254, 0)');
            arcG.addColorStop(0.22, `rgba(224, 242, 254, ${(ha * 0.36).toFixed(3)})`);
            arcG.addColorStop(0.50, `rgba(255, 255, 255, ${(ha * 0.48).toFixed(3)})`);
            arcG.addColorStop(0.78, `rgba(224, 242, 254, ${(ha * 0.36).toFixed(3)})`);
            arcG.addColorStop(1.00, 'rgba(224, 242, 254, 0)');
            g.strokeStyle = arcG;
            g.lineWidth = 1.4;
            g.beginPath(); g.moveTo(mx - haloR - 16, my); g.lineTo(mx + haloR + 16, my); g.stroke();

            // Двойная жемчужная корона вокруг полной Луны
            radialAura(g, mx, my, 27, '#f0f9ff', '#c4b5fd', 0.48 + breathe * 0.08);
            radialAura(g, mx, my, 15, '#ffffff', '#e0f2fe', 0.62 + breathe * 0.08);
            g.restore();
        }

        // Полный жемчужно-серебряный диск Луны с деликатными лунными морями
        if (g.createRadialGradient) {
            const mg = g.createRadialGradient(mx - 2.6, my - 2.8, 1.2, mx, my, mr);
            mg.addColorStop(0.00, '#ffffff');
            mg.addColorStop(0.62, '#f1f5ff');
            mg.addColorStop(1.00, '#cbd5f0');
            g.fillStyle = mg;
        } else g.fillStyle = '#f4f7ff';
        g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
        // Едва заметный акварельный рельеф лунных морей
        g.fillStyle = 'rgba(148, 163, 204, 0.22)';
        g.beginPath(); g.ellipse(mx + 2.4, my - 1.8, 3.1, 2.2, 0.4, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(mx - 2.8, my + 2.6, 2.6, 1.8, -0.3, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(mx + 1.6, my + 3.4, 1.8, 1.3, 0.1, 0, Math.PI * 2); g.fill();

        // 4. Медленно расступающиеся перламутровые облака с посеребрёнными луной краями
        if (g.createRadialGradient) {
            const drift = still ? 0 : Math.sin(t * 0.055) * 12;
            const clouds = [
                [328 - drift * 0.8, 76, 62, 7.5, 0.34, true],
                [488 + drift * 0.9, 92, 54, 6.2, 0.32, true],
                [424 + drift * 0.45, 82, 34, 3.6, 0.22, true], // тонкая полупрозрачная вуаль у нижнего края Луны
                [362 + drift * 0.6, 122, 68, 6.0, 0.28, false],
                [456 - drift * 0.5, 142, 58, 5.4, 0.30, false]
            ];
            for (let ci = 0; ci < clouds.length; ci++) {
                const [cx, cy, cw, ch, ca, silver] = clouds[ci];
                g.save();
                g.translate(cx, cy);
                g.scale(1, ch / cw);
                const clg = g.createRadialGradient(0, -cw * 0.15, cw * 0.08, 0, 0, cw);
                if (silver) {
                    clg.addColorStop(0.00, `rgba(244, 250, 255, ${ca.toFixed(3)})`);
                    clg.addColorStop(0.52, `rgba(176, 198, 232, ${(ca * 0.58).toFixed(3)})`);
                    clg.addColorStop(1.00, 'rgba(92, 108, 152, 0)');
                } else {
                    clg.addColorStop(0.00, `rgba(248, 214, 230, ${ca.toFixed(3)})`);
                    clg.addColorStop(0.55, `rgba(178, 192, 228, ${(ca * 0.54).toFixed(3)})`);
                    clg.addColorStop(1.00, 'rgba(96, 98, 138, 0)');
                }
                g.fillStyle = clg;
                g.beginPath(); g.arc(0, 0, cw, 0, Math.PI * 2); g.fill();
                g.restore();
            }
        }

        // 5. Поднимающиеся с тёплых крыш невесомые кристаллики тающего инея и серебряной пыльцы в лунном свете
        g.save();
        g.globalCompositeOperation = 'screen';
        for (let m = 0; m < 20; m++) {
            const seed = (m * 0.371) % 1;
            const prog = (seed + t * (0.018 + (m % 4) * 0.005)) % 1;
            const my2 = 188 - prog * 136;
            const mx2 = 286 + ((m * 47.3) % 236) + Math.sin(t * (0.55 + (m % 3) * 0.18) + m * 1.7) * 9;
            const fade = Math.sin(prog * Math.PI) * (still ? 0.8 : (0.55 + 0.45 * Math.sin(t * 2.4 + m * 1.9)));
            if (fade < 0.06) continue;
            const isRose = m % 3 === 0;
            radialAura(g, mx2, my2, 4.4 + (m % 3) * 1.3, '#ffffff', isRose ? '#f9a8d4' : '#93c5fd', fade * 0.42);
            g.fillStyle = `rgba(248, 252, 255, ${(fade * 0.88).toFixed(3)})`;
            g.beginPath(); g.arc(mx2, my2, 0.75 + (m % 2) * 0.35, 0, Math.PI * 2); g.fill();
        }
        g.restore();

        g.restore(); // конец clipWindowSky — здания кристально чёткие!

        // 6. Шёлковые ленты серебристо-розового тумана оттепели, неспешно плывущие в каньоне над мокрыми крышами
        if (g.createRadialGradient) {
            g.save();
            g.globalCompositeOperation = 'screen';
            const mistShift = still ? 0 : Math.sin(t * 0.16) * 16;
            const mists = [
                [352 + mistShift, 224, 96, 13, 0.13, 'rgba(214, 234, 255, ', 'rgba(232, 182, 212, '],
                [446 - mistShift * 0.8, 248, 108, 15, 0.15, 'rgba(244, 212, 228, ', 'rgba(182, 214, 248, '],
                [398 + mistShift * 0.5, 292, 124, 18, 0.14, 'rgba(226, 240, 255, ', 'rgba(236, 178, 206, ']
            ];
            for (let mi = 0; mi < mists.length; mi++) {
                const [rx, ry, rw, rh, ra, c0, c1] = mists[mi];
                g.save();
                g.translate(rx, ry);
                g.scale(1, rh / rw);
                const mg = g.createRadialGradient(0, 0, 6, 0, 0, rw);
                mg.addColorStop(0.00, `${c0}${ra.toFixed(3)})`);
                mg.addColorStop(0.55, `${c1}${(ra * 0.55).toFixed(3)})`);
                mg.addColorStop(1.00, 'rgba(120, 140, 180, 0)');
                g.fillStyle = mg;
                g.beginPath(); g.arc(0, 0, rw, 0, Math.PI * 2); g.fill();
                g.restore();
            }
            g.restore();
        }

        // 7. Деликатный тающий морозный узор по самому краю круглого стекла (оставляя центр идеально прозрачным!)
        if (g.createRadialGradient) {
            g.save();
            g.globalCompositeOperation = 'screen';
            const fg = g.createRadialGradient(WIN_CX, WIN_CY, WIN_RX - 24, WIN_CX, WIN_CY, WIN_RX - 1);
            fg.addColorStop(0.00, 'rgba(220, 238, 255, 0)');
            fg.addColorStop(0.68, 'rgba(220, 238, 255, 0.04)');
            fg.addColorStop(1.00, `rgba(232, 244, 255, ${(0.16 + breathe * 0.04).toFixed(3)})`);
            g.fillStyle = fg;
            g.beginPath(); g.ellipse(WIN_CX, WIN_CY, WIN_RX - 1, WIN_RY - 1, 0, 0, Math.PI * 2); g.fill();
            g.restore();
        }

        // 8. ЮВЕЛИРНАЯ ЖИВАЯ КАПЕЛЬ: хрустальные тающие сосульки вдоль верхней каменной арки окна
        //    с алмазными каплями талой воды, которые наливаются светом луны и срываются вниз!
        const icicles = [
            { ang: -2.12, len: 14, spd: 0.34, ph: 0.10 },
            { ang: -1.94, len: 21, spd: 0.27, ph: 0.52 },
            { ang: -1.78, len: 13, spd: 0.41, ph: 0.83 },
            { ang: -1.64, len: 24, spd: 0.24, ph: 0.28 },
            { ang: -1.50, len: 16, spd: 0.36, ph: 0.67 },
            { ang: -1.36, len: 22, spd: 0.29, ph: 0.15 },
            { ang: -1.21, len: 15, spd: 0.38, ph: 0.91 },
            { ang: -1.04, len: 18, spd: 0.31, ph: 0.44 }
        ];
        g.save();
        for (let ii = 0; ii < icicles.length; ii++) {
            const ic = icicles[ii];
            const ix = WIN_CX + Math.cos(ic.ang) * (WIN_RX - 2.5);
            const iy = WIN_CY + Math.sin(ic.ang) * (WIN_RY - 2.5);
            const tipY = iy + ic.len;
            const halfBase = 1.6 + (ic.len > 18 ? 0.75 : 0.25);

            // Прозрачное хрустальное тело сосульки с лунным бликом
            if (g.createLinearGradient) {
                const ig = g.createLinearGradient(ix, iy, ix, tipY);
                ig.addColorStop(0.00, 'rgba(226, 242, 255, 0.62)');
                ig.addColorStop(0.55, 'rgba(244, 250, 255, 0.48)');
                ig.addColorStop(1.00, 'rgba(255, 255, 255, 0.86)');
                g.fillStyle = ig;
            } else g.fillStyle = 'rgba(236, 248, 255, 0.65)';
            g.beginPath();
            g.moveTo(ix - halfBase, iy - 1);
            g.lineTo(ix + halfBase, iy - 1);
            g.lineTo(ix + 0.35, tipY);
            g.lineTo(ix - 0.35, tipY);
            g.closePath();
            g.fill();

            // Тонкая алмазная грань света по левой стороне сосульки
            g.strokeStyle = 'rgba(255, 255, 255, 0.78)';
            g.lineWidth = 0.65;
            g.beginPath();
            g.moveTo(ix - halfBase * 0.45, iy);
            g.lineTo(ix, tipY);
            g.stroke();

            // Цикл живой капели: 0..0.62 — капля набухает и сияет на кончике; 0.62..1.0 — срывается вниз с серебряным следом!
            const cyc = still ? ((ii * 0.29 + 0.35) % 1) : ((t * ic.spd + ic.ph) % 1);
            if (cyc < 0.62) {
                const grow = cyc / 0.62;
                const dr = 0.75 + grow * 1.15;
                const dy = tipY + 0.9 + grow * 1.5;
                if (grow > 0.42) {
                    g.save();
                    g.globalCompositeOperation = 'screen';
                    radialAura(g, ix, dy, 5.2 * grow, '#ffffff', '#bae6fd', 0.46 * grow);
                    g.restore();
                }
                g.fillStyle = `rgba(248, 252, 255, ${(0.65 + grow * 0.32).toFixed(3)})`;
                g.beginPath(); g.ellipse(ix, dy, dr * 0.82, dr * 1.18, 0, 0, Math.PI * 2); g.fill();
            } else {
                const fall = (cyc - 0.62) / 0.38;
                const fallDist = fall * fall * 195;
                const dy = tipY + 2.4 + fallDist;
                if (insideWindow(ix, dy, 4)) {
                    const fa = (1 - fall * 0.55) * 0.88;
                    const trail = Math.min(20, 4 + fall * 18);
                    if (g.createLinearGradient) {
                        const dtg = g.createLinearGradient(ix, dy - trail, ix, dy);
                        dtg.addColorStop(0, 'rgba(224, 242, 254, 0)');
                        dtg.addColorStop(1, `rgba(240, 249, 255, ${(fa * 0.58).toFixed(3)})`);
                        g.strokeStyle = dtg;
                    } else g.strokeStyle = `rgba(240, 249, 255, ${(fa * 0.5).toFixed(3)})`;
                    g.lineWidth = 1.05;
                    g.beginPath(); g.moveTo(ix, dy - trail); g.lineTo(ix, dy); g.stroke();
                    g.fillStyle = `rgba(255, 255, 255, ${fa.toFixed(3)})`;
                    g.beginPath(); g.ellipse(ix, dy, 1.05, 1.85, 0, 0, Math.PI * 2); g.fill();
                }
            }
        }
        g.restore();
    } else if (phase === 2) {
        // ===== АТМОСФЕРА «ОЧАГ» (ВАУ-ЭФФЕКТ): БАРХАТНАЯ ЯНТАРНО-ВИННАЯ НОЧЬ, ЗОЛОТОЙ СЕРП ЛУНЫ И ПАРЯЩИЕ НЕБЕСНЫЕ ФОНАРИКИ! =====
        // Все здания остаются на 100% нетронутыми — небо живёт строго за точным силуэтом высоток!
        const still = prefersStillRoom();
        const t = still ? 6.2 : now * 0.001;
        const breathe = still ? 0.55 : (0.5 + 0.5 * Math.sin(t * 0.58));

        g.save();
        clipWindowSky(g);

        // 1. Глубокий бархатный гранатово-янтарный градиент вечернего неба с золотым теплом у горизонта
        if (g.createLinearGradient) {
            const hk = g.createLinearGradient(0, 32, 0, 191);
            hk.addColorStop(0.00, 'rgba(20, 5, 14, 0.56)');
            hk.addColorStop(0.42, 'rgba(58, 12, 24, 0.42)');
            hk.addColorStop(0.74, 'rgba(132, 36, 32, 0.46)');
            hk.addColorStop(0.92, 'rgba(218, 96, 46, 0.55)');
            hk.addColorStop(1.00, 'rgba(255, 168, 78, 0.68)');
            g.fillStyle = hk;
            g.fillRect(242, 22, 324, 172);
        }

        // Тёплое медово-золотое дыхание городских огней, поднимающееся из каньона между высотками
        if (g.createRadialGradient) {
            g.save();
            g.globalCompositeOperation = 'screen';
            const hg = g.createRadialGradient(418, 186, 6, 412, 168, 142);
            const ha = 0.34 + breathe * 0.08 + winGlow * 0.08;
            hg.addColorStop(0.00, `rgba(255, 206, 118, ${ha.toFixed(3)})`);
            hg.addColorStop(0.38, `rgba(245, 118, 58, ${(ha * 0.58).toFixed(3)})`);
            hg.addColorStop(0.75, `rgba(168, 38, 42, ${(ha * 0.24).toFixed(3)})`);
            hg.addColorStop(1.00, 'rgba(80, 10, 18, 0)');
            g.fillStyle = hg;
            g.fillRect(242, 22, 324, 172);
            g.restore();
        }

        // 2. Тихие тёплые вечерние звёзды цвета шампанского в верхней части свода
        for (let s = 0; s < 22; s++) {
            const st = COSMIC_DAWN_STARS[s];
            if (st.y > 122) continue;
            const tw = still ? 0.65 : (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * st.speed + st.phase)));
            g.globalAlpha = tw * 0.62;
            g.fillStyle = '#ffe9c2';
            g.beginPath(); g.arc(st.x, st.y, st.r * 0.85, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;

        // 3. Ювелирный золотисто-медовый серп Луны с мягким пепельным светом и двойным янтарным ореолом (x=378, y=74)
        const mx = 378, my = 74, mr = 10.2;
        if (g.createRadialGradient) {
            g.save();
            g.globalCompositeOperation = 'screen';
            radialAura(g, mx, my, 46, '#ffd282', '#c84b31', 0.32 + breathe * 0.07);
            radialAura(g, mx, my, 21, '#fff2c6', '#f59e0b', 0.44 + breathe * 0.08);
            g.restore();
        }
        // Тонкий пепельный свет теневой стороны Луны
        g.fillStyle = 'rgba(255, 214, 158, 0.08)';
        g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
        // Изящный сияющий золотой полумесяц (чистая геометрия двух дуг без вырезания неба!)
        g.save();
        g.translate(mx, my);
        g.rotate(-0.38);
        g.fillStyle = '#fff3cf';
        g.beginPath();
        g.arc(0, 0, mr, -Math.PI * 0.76, Math.PI * 0.76, false);
        g.bezierCurveTo(mr * 0.22, mr * 0.52, mr * 0.22, -mr * 0.52, Math.cos(-Math.PI * 0.76) * mr, Math.sin(-Math.PI * 0.76) * mr);
        g.closePath();
        g.fill();
        g.restore();

        // 4. Нежные янтарно-алые вечерние облачка, подсвеченные снизу тёплым светом фонариков
        if (g.createRadialGradient) {
            const cd = still ? 0 : Math.sin(t * 0.04) * 9;
            [[448 - cd, 88, 46, 5.2, 0.22], [312 + cd * 0.7, 94, 38, 4.6, 0.2], [418 + cd * 0.5, 134, 58, 4.8, 0.26]].forEach(([cx, cy, cw, ch, ca]) => {
                g.save();
                g.translate(cx, cy);
                g.scale(1, ch / cw);
                const cg = g.createRadialGradient(0, 0, cw * 0.1, 0, 0, cw);
                cg.addColorStop(0, `rgba(255, 178, 102, ${ca.toFixed(3)})`);
                cg.addColorStop(0.55, `rgba(182, 58, 48, ${(ca * 0.55).toFixed(3)})`);
                cg.addColorStop(1, 'rgba(90, 16, 24, 0)');
                g.fillStyle = cg;
                g.beginPath(); g.arc(0, 0, cw, 0, Math.PI * 2); g.fill();
                g.restore();
            });
        }

        // 5. ГЛАВНОЕ ЧУДО «ОЧАГА»: 28 живых золотых небесных фонариков, медленно взмывающих из-за башен NEEO~CITY!
        for (let i = 0; i < HEARTH_LANTERNS.length; i++) {
            const ln = HEARTH_LANTERNS[i];
            const prog = (ln.seed + t * ln.speed) % 1;
            const ly = 190 - prog * 148; // плавно поднимаются из-за крыш (y=190) под самый купол окна (y=42)
            const lx = ln.x0 + Math.sin(t * ln.swayFreq + ln.phase) * ln.swayAmp + prog * (i % 2 === 0 ? 7 : -6);
            // Мягкое проявление у горизонта и растворение высоко в небе
            const fade = Math.min(1, prog * 5.5) * Math.min(1, (1 - prog) * 3.6);
            if (fade <= 0.03) continue;
            const flick = still ? 0.85 : (0.78 + 0.22 * Math.sin(t * 3.4 + ln.phase * 2.1));
            const al = fade * flick;

            // Тёплый медово-персиковый ореол каждого фонарика
            if (g.createRadialGradient) {
                g.save();
                g.globalCompositeOperation = 'screen';
                const hr = ln.w * (ln.tier === 2 ? 4.8 : 4.0);
                radialAura(g, lx, ly, hr, '#ffd88a', '#ea580c', al * (ln.tier === 0 ? 0.34 : 0.48));
                g.restore();
            }
            // Рисовая бумага купола фонарика и живой огонёк фитиля снизу
            g.save();
            g.globalAlpha = Math.min(1, al * 0.95);
            g.fillStyle = ln.tier === 0 ? '#ffcf78' : '#ffb347';
            g.beginPath();
            g.roundRect
                ? g.roundRect(lx - ln.w * 0.5, ly - ln.h * 0.55, ln.w, ln.h, ln.w * 0.38)
                : g.rect(lx - ln.w * 0.5, ly - ln.h * 0.55, ln.w, ln.h);
            g.fill();
            // Яркое золотисто-белое сердечко пламени в основании фонарика
            g.fillStyle = '#fffbeb';
            g.beginPath();
            g.arc(lx, ly + ln.h * 0.16, Math.max(0.55, ln.w * 0.32), 0, Math.PI * 2);
            g.fill();
            g.restore();
        }
        g.restore();

        // Едва уловимое тёплое янтарное свечение воздуха в каньоне (не трогая и не перерисовывая здания!)
        g.save();
        g.globalCompositeOperation = 'screen';
        radialAura(g, 419, 188, 34, '#ffbe6b', '#b83c28', 0.14 + breathe * 0.04);
        g.restore();
    } else if (phase === 3) {
        // ===== АТМОСФЕРА «РАССВЕТ»: ГЛУБОКИЙ ТЁПЛЫЙ ФИАЛКОВО-КОСМИЧЕСКИЙ РАССВЕТ НАД NEEO~CITY =====
        // 100% идентичные здания: ни один пиксель крыш, мачт, кранов и водонапорных баков не затирается!
        const still = prefersStillRoom();
        const t = still ? 4.0 : now * 0.001;
        const breathe = still ? 0.5 : (0.5 + 0.5 * Math.sin(t * 0.52));
        const sunX = 419.5;
        const sunY = 181.5 + (still ? 0 : Math.sin(t * 0.32) * 0.9);

        g.save();
        clipWindowSky(g);

        // 1) Глубокий бархатно-тёмный космический градиент с тёплым фиолетово-аметистовым и розово-золотым тоном!
        if (g.createLinearGradient) {
            const sk = g.createLinearGradient(0, 26, 0, 192);
            sk.addColorStop(0.00, 'rgba(9, 3, 22, 0.94)');    // глубокий бархатный космос в зените
            sk.addColorStop(0.28, 'rgba(22, 8, 46, 0.93)');   // тёмный ночной индиго-аметист
            sk.addColorStop(0.54, 'rgba(52, 16, 82, 0.92)');  // глубокий тёплый фиолетовый бархат
            sk.addColorStop(0.74, 'rgba(104, 30, 106, 0.92)');// тёплая космическая слива-орхидея
            sk.addColorStop(0.88, 'rgba(168, 58, 108, 0.93)');// тёплый розово-пурпурный предрассвет
            sk.addColorStop(0.96, 'rgba(224, 118, 114, 0.94)');// мягкий персиково-розовый горизонт
            sk.addColorStop(1.00, 'rgba(255, 192, 144, 0.95)');// тёплая заря в самом каньоне
            g.fillStyle = sk;
        } else g.fillStyle = '#341052';
        g.fillRect(242, 22, 324, 172);

        // 2) Диагональная космическая туманность (шёлковый фиалково-розовый рукав Млечного Пути через свод окна!)
        if (g.createRadialGradient) {
            g.save();
            g.globalCompositeOperation = 'screen';
            [
                [356, 68, 92, 24, -0.32, 'rgba(156, 72, 232, 0.22)', 'rgba(91, 33, 182, 0)'],
                [438, 86, 86, 22, -0.28, 'rgba(218, 104, 236, 0.19)', 'rgba(126, 34, 206, 0)'],
                [398, 58, 68, 15, -0.30, 'rgba(248, 174, 202, 0.13)', 'rgba(168, 85, 247, 0)']
            ].forEach(([nx, ny, nrw, nrh, rot, cA, cB]) => {
                g.save();
                g.translate(nx, ny);
                g.rotate(rot);
                g.scale(1, nrh / nrw);
                const ng = g.createRadialGradient(0, 0, 4, 0, 0, nrw);
                ng.addColorStop(0, cA);
                ng.addColorStop(1, cB);
                g.fillStyle = ng;
                g.beginPath(); g.arc(0, 0, nrw, 0, Math.PI * 2); g.fill();
                g.restore();
            });

            // Мягкий аметистово-розово-золотой купол восходящей зари за центральным каньоном
            const halo = g.createRadialGradient(sunX, sunY + 4, 3, sunX, sunY - 6, 112);
            halo.addColorStop(0.00, `rgba(255, 224, 184, ${(0.68 + breathe * 0.08 + winGlow * 0.05).toFixed(3)})`);
            halo.addColorStop(0.24, `rgba(232, 118, 162, ${(0.42 + breathe * 0.06).toFixed(3)})`);
            halo.addColorStop(0.56, 'rgba(138, 48, 178, 0.21)');
            halo.addColorStop(1.00, 'rgba(48, 12, 78, 0)');
            g.fillStyle = halo;
            g.fillRect(242, 22, 324, 172);
            g.restore();
        }

        // 3) Россыпь живых космических звёзд и сияющих утренних алмазных светил в фиалковом зените!
        for (let i = 0; i < COSMIC_DAWN_STARS.length; i++) {
            const st = COSMIC_DAWN_STARS[i];
            const heightFade = Math.max(0, Math.min(1, (162 - st.y) / 92));
            if (heightFade <= 0.04) continue;
            const tw = still ? 0.78 : (0.42 + 0.58 * (0.5 + 0.5 * Math.sin(t * st.speed + st.phase)));
            const sa = heightFade * tw * (st.sparkle ? 0.95 : 0.78);
            g.save();
            g.globalAlpha = sa;
            g.fillStyle = st.col;
            g.beginPath(); g.arc(st.x, st.y, st.r, 0, Math.PI * 2); g.fill();
            if (st.sparkle) {
                // Тонкие четырёхлучевые космические блики у самых ярких утренних звёзд
                g.strokeStyle = st.col;
                g.globalAlpha = sa * 0.62;
                g.lineWidth = 0.65;
                const arm = st.r * (2.8 + tw * 1.1);
                g.beginPath();
                g.moveTo(st.x - arm, st.y); g.lineTo(st.x + arm, st.y);
                g.moveTo(st.x, st.y - arm); g.lineTo(st.x, st.y + arm);
                g.stroke();
            }
            g.restore();
        }

        // Редкая беззвучная падающая звезда в фиолетовом космосе (проскальзывает раз в ~15 секунд)
        if (!still) {
            const meteorCycle = (t % 15.5);
            if (meteorCycle > 11.2 && meteorCycle < 12.15) {
                const mp = (meteorCycle - 11.2) / 0.95;
                const mx1 = 468 - mp * 92, my1 = 52 + mp * 38;
                const mx0 = mx1 + 22, my0 = my1 - 9.1;
                const ma = Math.sin(mp * Math.PI) * 0.85;
                if (g.createLinearGradient) {
                    const mg = g.createLinearGradient(mx0, my0, mx1, my1);
                    mg.addColorStop(0, 'rgba(216, 180, 254, 0)');
                    mg.addColorStop(1, `rgba(255, 245, 255, ${ma.toFixed(3)})`);
                    g.strokeStyle = mg;
                    g.lineWidth = 1.15;
                    g.beginPath(); g.moveTo(mx0, my0); g.lineTo(mx1, my1); g.stroke();
                }
            }
        }

        // 4) Нежные веерные лучи космического рассвета (сиренево-розовое золото), расходящиеся вверх от зари
        g.save();
        g.globalCompositeOperation = 'screen';
        const skyRays = [-1.08, -0.68, -0.32, 0.0, 0.34, 0.72, 1.08];
        for (let r = 0; r < skyRays.length; r++) {
            const ang = -Math.PI * 0.5 + skyRays[r] + (still ? 0 : Math.sin(t * 0.22 + r * 1.3) * 0.02);
            const ra = (0.075 + 0.042 * (0.5 + 0.5 * Math.sin(t * 0.46 + r * 1.7))) * (1 + winGlow * 0.22);
            g.save();
            g.translate(sunX, sunY);
            g.rotate(ang);
            g.scale(1, 0.12);
            if (g.createRadialGradient) {
                const rg = g.createRadialGradient(48, 0, 4, 66, 0, 106);
                rg.addColorStop(0, `rgba(255, 198, 218, ${ra.toFixed(3)})`);
                rg.addColorStop(0.52, `rgba(192, 112, 248, ${(ra * 0.48).toFixed(3)})`);
                rg.addColorStop(1, 'rgba(108, 34, 168, 0)');
                g.fillStyle = rg;
                g.beginPath(); g.arc(66, 0, 106, 0, Math.PI * 2); g.fill();
            }
            g.restore();
        }
        g.restore();

        // 5) Бархатные сливово-фиалковые облака с тёплой розово-золотой кромкой снизу
        const drawCosmicCloud = (cx, cy, w, h, topCol, glowCol, puffs) => {
            if (!g.createRadialGradient) return;
            g.save();
            g.translate(cx, cy + h * 0.46);
            g.scale(1, h / w);
            const ug = g.createRadialGradient(0, 0, w * 0.08, 0, 0, w * 1.04);
            ug.addColorStop(0, glowCol);
            ug.addColorStop(0.58, glowCol.replace(/[\d.]+\)$/, m => (parseFloat(m) * 0.46).toFixed(3) + ')'));
            ug.addColorStop(1, 'rgba(216, 132, 224, 0)');
            g.fillStyle = ug;
            g.beginPath(); g.arc(0, 0, w * 1.04, 0, Math.PI * 2); g.fill();
            g.restore();
            for (let p = 0; p < puffs.length; p++) {
                const [ox, oy, rw, rh] = puffs[p];
                g.save();
                g.translate(cx + ox * w, cy + oy * h);
                g.scale(1, (h * rh) / (w * rw));
                const pg = g.createRadialGradient(0, 0, 0, 0, 0, w * rw);
                pg.addColorStop(0, topCol);
                pg.addColorStop(0.55, topCol.replace(/[\d.]+\)$/, m => (parseFloat(m) * 0.52).toFixed(3) + ')'));
                pg.addColorStop(1, 'rgba(34, 10, 58, 0)');
                g.fillStyle = pg;
                g.beginPath(); g.arc(0, 0, w * rw, 0, Math.PI * 2); g.fill();
                g.restore();
            }
        };
        const d1 = still ? 0 : Math.sin(t * 0.042) * 10;
        const d2 = still ? 0 : Math.cos(t * 0.036 + 1.1) * 8;
        drawCosmicCloud(372 + d1, 74, 56, 6.4, 'rgba(26, 9, 52, 0.56)', 'rgba(232, 142, 248, 0.34)',
            [[-0.36, 0.1, 0.52, 0.85], [0.02, -0.18, 0.62, 1.08], [0.42, 0.14, 0.45, 0.78]]);
        drawCosmicCloud(456 - d2, 99, 50, 5.8, 'rgba(46, 14, 74, 0.5)', 'rgba(248, 152, 214, 0.38)',
            [[-0.32, 0.08, 0.54, 0.9], [0.15, -0.15, 0.58, 1.04], [0.46, 0.16, 0.38, 0.7]]);
        drawCosmicCloud(416 + d2 * 0.65, 130, 64, 4.8, 'rgba(72, 22, 92, 0.4)', 'rgba(255, 182, 178, 0.44)',
            [[-0.4, 0.1, 0.48, 0.8], [-0.04, -0.14, 0.58, 0.95], [0.38, 0.08, 0.45, 0.78]]);

        // 6) Мягкий диск восходящего светила в истинном центральном каньоне (419.5, 181.5)
        if (g.createRadialGradient) {
            const corona = g.createRadialGradient(sunX, sunY, 3, sunX, sunY, 26);
            corona.addColorStop(0, 'rgba(255, 246, 228, 0.94)');
            corona.addColorStop(0.38, `rgba(255, 186, 168, ${(0.64 + breathe * 0.1).toFixed(3)})`);
            corona.addColorStop(0.74, 'rgba(214, 102, 218, 0.26)');
            corona.addColorStop(1, 'rgba(148, 52, 198, 0)');
            g.fillStyle = corona;
            g.beginPath(); g.arc(sunX, sunY, 26, 0, Math.PI * 2); g.fill();

            const disc = g.createRadialGradient(sunX, sunY - 1, 1, sunX, sunY, 6.8);
            disc.addColorStop(0, '#fffdf9');
            disc.addColorStop(0.68, '#ffe6d4');
            disc.addColorStop(1, 'rgba(255, 176, 168, 0.65)');
            g.fillStyle = disc;
        } else g.fillStyle = '#ffe8d8';
        g.beginPath(); g.arc(sunX, sunY, 6.6, 0, Math.PI * 2); g.fill();
        g.restore();

        // 7) Деликатный фиалково-розовый контровой рефлекс строго по реальным крышам (0 перерисованных стен — здания 1:1!)
        g.save();
        g.globalCompositeOperation = 'screen';
        if (g.createRadialGradient) {
            const rimGrad = g.createRadialGradient(sunX, sunY, 6, sunX, sunY, 152);
            rimGrad.addColorStop(0.00, `rgba(255, 218, 188, ${(0.58 + breathe * 0.08).toFixed(3)})`);
            rimGrad.addColorStop(0.42, 'rgba(236, 152, 232, 0.36)');
            rimGrad.addColorStop(1.00, 'rgba(168, 92, 238, 0.14)');
            g.strokeStyle = rimGrad;
        } else g.strokeStyle = 'rgba(232, 156, 238, 0.32)';
        g.lineWidth = 0.75;
        g.lineJoin = 'round';
        g.beginPath();
        for (let i = 0; i < NEEO_SKY_POLY.length; i++) {
            const [px, py] = NEEO_SKY_POLY[i];
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.stroke();
        // Бесшовная тёпло-фиолетовая атмосферная дымка по фасадам ночных башен (плавный 0->max->0 без единого шва!)
        if (g.createLinearGradient) {
            const atm = g.createLinearGradient(0, 94, 0, 312);
            atm.addColorStop(0.00, 'rgba(138, 52, 196, 0)');
            atm.addColorStop(0.36, 'rgba(164, 62, 182, 0.11)');
            atm.addColorStop(0.68, 'rgba(128, 44, 152, 0.08)');
            atm.addColorStop(1.00, 'rgba(68, 18, 96, 0)');
            g.fillStyle = atm;
            g.fillRect(WIN_CX - WIN_RX, 94, WIN_RX * 2, 218);
        }
        radialAura(g, sunX, sunY + 3, 30, '#ffd4c2', '#b845c8', 0.22 + breathe * 0.05);
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
            // Мягкое тёплое разгорание окна изнутри: на «Очаге» — уютный медовый янтарь, на «Рассвете» — тёплый сиренево-персиковый свет!
            const glow = smooth01((mood - 0.22) / 0.68) * (phase === 2 ? 0.62 : (phase === 3 ? 0.54 : 0.48));
            const cx = wx + ww * 0.5, cy = wy + wh * 0.5;
            if (phase === 2) {
                radialAura(g, cx, cy, Math.max(ww, wh) * 1.55, '#ffd07a', '#d95826', glow * 0.62);
                g.fillStyle = `rgba(255,222,152,${(glow * 0.68).toFixed(3)})`;
            } else if (phase === 3) {
                radialAura(g, cx, cy, Math.max(ww, wh) * 1.45, '#ffc8d8', '#a844c8', glow * 0.54);
                g.fillStyle = `rgba(255,214,224,${(glow * 0.58).toFixed(3)})`;
            } else {
                radialAura(g, cx, cy, Math.max(ww, wh) * 1.4, '#ff9892', '#c8283e', glow * 0.55);
                g.fillStyle = `rgba(255,186,168,${(glow * 0.55).toFixed(3)})`;
            }
            g.fillRect(wx + 0.3, wy + 0.3, Math.max(1, ww - 0.6), Math.max(1, wh - 0.6));
        }
    }

    // Тёплые огни моста и неспешные сигнальные маячки на крышах высоток
    for (let b = 0; b < BRIDGE_LIGHTS.length; b++) {
        const a = (phase === 2 ? 0.34 : 0.22) + 0.32 * (0.5 + 0.5 * Math.sin(now * 0.00095 + b * 0.9));
        g.fillStyle = phase === 2
            ? `rgba(255,212,132,${a.toFixed(3)})`
            : (phase === 3 ? `rgba(248,186,232,${a.toFixed(3)})` : `rgba(255,164,154,${a.toFixed(3)})`);
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

    // Ненавязчивый небесный дирижабль NEEO~CITY с цифровым табло (плывёт за силуэтами высоток и за каплями дождя!)
    if (typeof window !== 'undefined' && window.SOMA_BLIMP && typeof window.SOMA_BLIMP.drawInWindow === 'function') {
        g.save();
        clipWindowSky(g);
        window.SOMA_BLIMP.drawInWindow(g, now, phase);
        g.restore();
    }

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

    // Живой дождь и капли по стеклу (на «Оттепели» — редкие серебряные капли по стеклу вместо холодного ливня; на «Рассвете» сухо)
    if (phase < 3) {
        const streakCount = [42, 7, 9, 0][phase];
        const isThaw = phase === 1;
        g.lineCap = 'round';
        for (let i = 0; i < streakCount; i++) {
            const d = FX_RAIN[i];
            const al = d.alpha * (phase === 0 ? 0.95 : isThaw ? 0.52 : 0.48);
            g.strokeStyle = isThaw
                ? (d.near ? `rgba(232, 244, 255, ${al.toFixed(3)})` : `rgba(218, 186, 214, ${al.toFixed(3)})`)
                : (d.near ? `rgba(255,146,158,${al.toFixed(3)})` : `rgba(218,58,78,${al.toFixed(3)})`);
            g.lineWidth = d.near ? 1.1 : 0.75;
            g.beginPath();
            g.moveTo(d.x, d.y);
            g.lineTo(d.x - d.len * (isThaw ? 0.03 : 0.08), d.y + d.len * (isThaw ? 0.75 : 1));
            g.stroke();
        }
        const dropCount = [15, 12, 5, 0][phase];
        for (let i = 0; i < dropCount; i++) {
            const dr = FX_DROPS[i];
            if (!insideWindow(dr.x, dr.y, 6)) continue;
            const tg = g.createLinearGradient(dr.x, dr.y - dr.trail, dr.x, dr.y);
            tg.addColorStop(0, isThaw ? 'rgba(224,242,254,0)' : 'rgba(255,112,128,0)');
            tg.addColorStop(1, isThaw ? 'rgba(236,246,255,0.34)' : 'rgba(255,132,146,0.24)');
            g.strokeStyle = tg;
            g.lineWidth = isThaw ? 1.1 : 1.0;
            g.beginPath(); g.moveTo(dr.x, dr.y - dr.trail); g.lineTo(dr.x, dr.y); g.stroke();
            g.fillStyle = isThaw ? 'rgba(248,252,255,0.82)' : 'rgba(255,190,198,0.65)';
            g.beginPath(); g.ellipse(dr.x, dr.y, isThaw ? 1.25 : 1.1, isThaw ? 1.85 : 1.6, 0, 0, Math.PI * 2); g.fill();
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

// 2) Кинематографичный объёмный свет ИЗ круглого окна в комнату:
//    на «Оттепели» (phase=1) — хрустальный жемчужно-лунный свет с нежным розовым отблеском и влажным серебром на своде;
//    на «Очаге» (phase=2) — медово-янтарное тепло фонариков и луны; на «Рассвете» (phase=3) — тёплый фиалково-космический свет!
function drawWindowLightBeams(g, now, phase, winGlow) {
    if (phase < 1) return;
    const isMax = phase === 3;
    const isThaw = phase === 1;
    const still = prefersStillRoom();
    const strength = (isMax ? 0.88 : isThaw ? 0.72 : 0.66) + winGlow * 0.15;
    const b1 = still ? 0.55 : (0.5 + 0.5 * Math.sin(now * 0.00058));
    const b2 = still ? 0.5 : (0.5 + 0.5 * Math.sin(now * 0.00039 + 1.8));
    const sway = still ? 0 : Math.sin(now * 0.00032) * 8;
    const sunX = isThaw ? 426 : 419.5, sunY = isThaw ? 168 : 181.5;

    g.save();
    g.globalCompositeOperation = 'screen';

    // 1. Плавный блик по нижнему каменному своду окна (влажное серебро капели на Оттепели, золото на Очаге, аметист на Рассвете)
    const rimA = (isMax ? (0.42 + b1 * 0.11) : isThaw ? (0.38 + b1 * 0.10) : (0.34 + b1 * 0.09)) * Math.min(1.2, strength);
    g.lineCap = 'round';
    if (g.createLinearGradient) {
        const sg = g.createLinearGradient(WIN_CX - WIN_RX * 0.88, 0, WIN_CX + WIN_RX * 0.88, 0);
        sg.addColorStop(0.00, 'rgba(180, 96, 180, 0)');
        sg.addColorStop(0.25, isMax
            ? `rgba(214, 134, 248, ${(rimA * 0.62).toFixed(3)})`
            : isThaw
                ? `rgba(186, 222, 255, ${(rimA * 0.68).toFixed(3)})`
                : `rgba(255, 174, 96, ${(rimA * 0.62).toFixed(3)})`);
        sg.addColorStop(0.52, isMax
            ? `rgba(255, 202, 224, ${rimA.toFixed(3)})`
            : isThaw
                ? `rgba(248, 252, 255, ${rimA.toFixed(3)})`
                : `rgba(255, 218, 142, ${rimA.toFixed(3)})`);
        sg.addColorStop(0.78, isMax
            ? `rgba(214, 134, 248, ${(rimA * 0.62).toFixed(3)})`
            : isThaw
                ? `rgba(244, 202, 226, ${(rimA * 0.66).toFixed(3)})`
                : `rgba(255, 174, 96, ${(rimA * 0.62).toFixed(3)})`);
        sg.addColorStop(1.00, 'rgba(180, 96, 180, 0)');
        g.strokeStyle = sg;
    } else g.strokeStyle = `rgba(232, 168, 238, ${rimA.toFixed(3)})`;
    g.lineWidth = isMax ? 2.8 : 2.5;
    g.beginPath();
    g.ellipse(WIN_CX, WIN_CY + 1, WIN_RX + 1.5, WIN_RY + 1.5, 0, Math.PI * 0.14, Math.PI * 0.86);
    g.stroke();

    // 2. Бархатные объёмные лучи из окна на растение, ковёр, край стола и кушетку (не замутняя здания!)
    const shafts = [
        { ang: -0.54, spread: 0.14, cy: 232, r: 156, w: 0.90 },
        { ang: -0.30, spread: 0.15, cy: 228, r: 158, w: 1.12 },
        { ang: -0.09, spread: 0.16, cy: 224, r: 162, w: 1.44 },
        { ang:  0.10, spread: 0.16, cy: 224, r: 162, w: 1.40 },
        { ang:  0.31, spread: 0.15, cy: 228, r: 158, w: 1.10 },
        { ang:  0.54, spread: 0.14, cy: 234, r: 158, w: 0.94 }
    ];
    for (let idx = 0; idx < shafts.length; idx++) {
        const sh = shafts[idx];
        const drift = still ? 0 : Math.sin(now * (0.00034 + idx * 0.00005) + idx * 1.5) * 0.024;
        const pulse = still ? 0.6 : (0.5 + 0.5 * Math.sin(now * (0.00052 + idx * 0.00007) + idx * 1.2));
        const roomA = (isMax
            ? (0.118 + pulse * 0.052)
            : isThaw
                ? (0.094 + pulse * 0.044)
                : (0.092 + pulse * 0.042)) * sh.w * strength;
        g.save();
        g.translate(sunX, sunY);
        g.rotate(sh.ang + drift);
        g.scale(sh.spread, 1);
        if (g.createRadialGradient) {
            const rg = g.createRadialGradient(0, sh.cy - 22, 6, 0, sh.cy, sh.r);
            rg.addColorStop(0.00, isMax
                ? `rgba(244, 178, 248, ${roomA.toFixed(3)})`
                : isThaw
                    ? `rgba(232, 244, 255, ${roomA.toFixed(3)})`
                    : `rgba(255, 198, 118, ${roomA.toFixed(3)})`);
            rg.addColorStop(0.50, isMax
                ? `rgba(176, 74, 212, ${(roomA * 0.58).toFixed(3)})`
                : isThaw
                    ? `rgba(218, 168, 212, ${(roomA * 0.52).toFixed(3)})`
                    : `rgba(228, 92, 56, ${(roomA * 0.52).toFixed(3)})`);
            rg.addColorStop(1.00, 'rgba(92, 18, 86, 0)');
            g.fillStyle = rg;
            g.beginPath(); g.arc(0, sh.cy, sh.r, 0, Math.PI * 2); g.fill();
        }
        g.restore();
    }

    // 3. Живое световое озеро на персидском ковре и у пледа (жемчужно-лунное на Оттепели, медовое на Очаге, фиалковое на Рассвете!)
    g.save();
    g.translate(WIN_CX - 3 + sway * 0.5, 420);
    g.scale(1, 0.33);
    if (g.createRadialGradient) {
        const pg = g.createRadialGradient(0, -24, 14, 0, 0, 232);
        if (isMax) {
            pg.addColorStop(0.00, `rgba(244, 174, 238, ${(0.25 + b2 * 0.06).toFixed(3)})`);
            pg.addColorStop(0.45, `rgba(172, 68, 198, ${(0.15 + b1 * 0.04).toFixed(3)})`);
            pg.addColorStop(0.78, `rgba(116, 28, 112, ${(0.07 + b1 * 0.02).toFixed(3)})`);
            pg.addColorStop(1.00, 'rgba(68, 12, 72, 0)');
        } else if (isThaw) {
            pg.addColorStop(0.00, `rgba(232, 245, 255, ${(0.22 + b2 * 0.055).toFixed(3)})`);
            pg.addColorStop(0.45, `rgba(226, 176, 214, ${(0.13 + b1 * 0.038).toFixed(3)})`);
            pg.addColorStop(0.78, `rgba(148, 88, 146, ${(0.06 + b1 * 0.02).toFixed(3)})`);
            pg.addColorStop(1.00, 'rgba(72, 24, 68, 0)');
        } else {
            pg.addColorStop(0.00, `rgba(255, 194, 108, ${(0.24 + b2 * 0.065).toFixed(3)})`);
            pg.addColorStop(0.45, `rgba(232, 98, 58, ${(0.14 + b1 * 0.04).toFixed(3)})`);
            pg.addColorStop(0.78, `rgba(168, 32, 42, ${(0.065 + b1 * 0.02).toFixed(3)})`);
            pg.addColorStop(1.00, 'rgba(110, 12, 24, 0)');
        }
        g.fillStyle = pg;
        g.beginPath(); g.arc(0, 0, 232, 0, Math.PI * 2); g.fill();
    }
    g.restore();

    if (isMax) {
        radialAura(g, 608, 336, 86, '#e9a8ff', '#8e2c9e', 0.12 + b1 * 0.032);
        radialAura(g, 224, 294, 66, '#f5b8e8', '#8e2c9e', 0.1 + b2 * 0.028);
    } else {
        // На «Очаге» тёплый янтарный отсвет камина/ночников мягко обнимает кушетку, стол и ковёр!
        radialAura(g, 612, 336, 92, '#ffbe68', '#b83228', 0.15 + b1 * 0.04);
        radialAura(g, 222, 296, 74, '#ffb862', '#b82e28', 0.13 + b2 * 0.035);
    }

    // 4. Парящие искры света в комнате: золотые угольки тепла на «Очаге» и сиренево-звёздная пыльца на «Рассвете»!
    const moteCnt = FX_MOTES.length;
    for (let i = 0; i < moteCnt; i++) {
        const m = FX_MOTES[i];
        const v = (m.v + (still ? 0 : now * m.speed)) % 1;
        const span = 78 + v * 145;
        const mx = WIN_CX + (m.u - 0.5) * span * 2 + (still ? 0 : Math.sin(now * 0.0005 + m.phase) * 7) + sway * v * 0.4;
        // Пылинки кружатся преимущественно в нижней половине окна и в самой комнате (y=235..458)
        const my = 232 + v * 228;
        const edgeFade = Math.sin(v * Math.PI) * (1 - Math.abs(m.u - 0.5) * 1.35);
        const tw = still ? 0.75 : (0.45 + 0.55 * Math.sin(now * 0.0014 + m.phase));
        const ma = Math.max(0, edgeFade * tw * (isMax ? 0.56 : 0.44));
        if (ma < 0.03) continue;
        if (isMax) {
            g.fillStyle = (i % 2 === 0)
                ? `rgba(232, 198, 255, ${ma.toFixed(3)})`
                : `rgba(255, 222, 178, ${ma.toFixed(3)})`;
        } else {
            g.fillStyle = `rgba(255, 214, 132, ${ma.toFixed(3)})`;
        }
        g.beginPath(); g.arc(mx, my, m.size * (isMax ? 1.12 : 1.06), 0, Math.PI * 2); g.fill();
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
    const hasLoadedTape = !!roomAnim.activeCassetteId;
    if (!active) {
        if (hasLoadedTape) {
            // Тёплый живой огонёк деки, когда внутри стоит VHS-кассета с тёплыми словами
            g.clearRect(0, 0, cv.width, cv.height);
            const pulse = 0.62 + 0.38 * Math.sin(now * 0.0022);
            g.fillStyle = `rgba(214, 72, 62, ${(0.28 * pulse).toFixed(3)})`;
            g.fillRect(73, 38, 7, 7);
            g.fillStyle = `rgba(255, 198, 138, ${(0.78 * pulse).toFixed(3)})`;
            g.fillRect(75, 40, 3, 3);
            roomAnim.deckWasActive = true;
        } else if (roomAnim.deckWasActive) {
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

// УЛЬТРА-РЕДКАЯ МАСТЬ (РОВНО 0.1% — 1 ШАНС ИЗ 1000 ПРИ ПОЛУЧЕНИИ КОТА!):
// Полностью обсидианово-чёрный кот с сияющим золотисто-лунным полумесяцем во лбу!
const RARE_MOON_CAT_INDEX = 7;
const RARE_MOON_CAT_COAT = {
    id: 'midnight_luna',
    name: 'Полуночная Луна',
    short: 'редчайший чёрный кот с полумесяцем во лбу',
    rarity: '0.1%',
    rare: true,
    dark: '#040108', mid: '#0e0717', light: '#241438', rim: '#d8b4fe',
    belly: '#0b0512', stripe: '#020005', earIn: '#6d3580',
    moonCore: '#fff9db', moonGold: '#fde047', moonGlow: '#c084fc',
    eyeL: '#f5d0fe', eyeR: '#fde68a', pattern: 'luna'
};

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

    // Независимый точный бросок 1 из 1000 (строго 0.1%!) на уникального чёрного кота с полумесяцем во лбу!
    let rareHash = hashStr('neeosoma_rare_mooncat_01pct:' + src);
    rareHash = Math.imul((rareHash ^ 0x3c6ef372) >>> 0, 0x85ebca6b) >>> 0;
    rareHash = (rareHash ^ (rareHash >>> 15)) >>> 0;
    const isNaturalRare = (rareHash % 1000) === 0;

    let coatIdx;
    if (Number.isInteger(overrideCoat) && overrideCoat >= 0 && overrideCoat <= RARE_MOON_CAT_INDEX) {
        coatIdx = overrideCoat;
    } else if (isNaturalRare) {
        coatIdx = RARE_MOON_CAT_INDEX;
    } else {
        coatIdx = mix % CAT_COATS.length;
    }
    const isRare = coatIdx === RARE_MOON_CAT_INDEX;
    const earStyle = isRare ? 0 : ((mix >>> 7) % 3); // у лунного кота — точёные острые ушки!
    const socks = !isRare && ((mix >>> 10) % 3) === 0; // строго 100% чёрный до кончиков лап!
    const starMark = !isRare && ((mix >>> 12) % 3) === 0;
    const purrHz = isRare ? 44 : (46 + ((mix >>> 14) % 14));
    const coat = isRare ? RARE_MOON_CAT_COAT : CAT_COATS[coatIdx];
    const summary = isRare
        ? 'Чёрный кот с полумесяцем во лбу (✦ 0.1%)'
        : `${coat.name}${earStyle === 1 ? ' · рысьи кисточки' : ''}`;
    return {
        coatIdx, coat, rare: isRare, rarity: isRare ? '0.1%' : '',
        earStyle, earName: CAT_EARS[earStyle],
        socks, starMark, purrHz, seed: mix, summary
    };
}

// ===== УНИКАЛЬНЫЙ ПЁС-ХРАНИТЕЛЬ ИГРОКА (7 КРУПНЫХ РЕАЛИСТИЧНЫХ ПОРОД, СЛАДКО СПЯЩИХ С ПОДОГНУТЫМИ ЛАПАМИ РЯДОМ С КОТОМ!) =====
const DOG_BREEDS = [
    {
        name: 'Рыжий сиба-ину', short: 'рыжий сиба-ину',
        dark: '#4a1908', mid: '#9e3f14', light: '#d96f2b', rim: '#ffba6e',
        cream: '#f0d2ad', earIn: '#b86258', nose: '#120607', eye: '#3b1908', eyeGlow: '#c97b2c',
        sx: 1.28, sy: 1.27, muzzleLen: 8.6, muzzleDrop: 3.1, stop: 0.55, legLen: 0.94, ruff: 1.05,
        ears: 'pointed', tail: 'curled', pattern: 'shiba'
    },
    {
        name: 'Золотистый ретривер', short: 'золотистый ретривер',
        dark: '#4d260a', mid: '#9c5819', light: '#d99642', rim: '#ffd98a',
        cream: '#f2d5a0', earIn: '#753b12', nose: '#160807', eye: '#361708', eyeGlow: '#bf7426',
        sx: 1.52, sy: 1.48, muzzleLen: 10.4, muzzleDrop: 4.1, stop: 0.62, legLen: 1.06, ruff: 1.20,
        ears: 'floppy', tail: 'plume', pattern: 'golden'
    },
    {
        name: 'Северный хаски', short: 'северный хаски',
        dark: '#110d17', mid: '#322c3f', light: '#635b75', rim: '#cfc6e6',
        cream: '#ebe1ea', earIn: '#8f5866', nose: '#0f0609', eye: '#183a52', eyeGlow: '#9ce6ff',
        sx: 1.49, sy: 1.46, muzzleLen: 10.2, muzzleDrop: 3.3, stop: 0.48, legLen: 1.05, ruff: 1.16,
        ears: 'pointed', tail: 'brush', pattern: 'husky'
    },
    {
        name: 'Вельш-корги', short: 'рыжий вельш-корги',
        dark: '#4d1b09', mid: '#a84718', light: '#df7b35', rim: '#ffc278',
        cream: '#f2dec2', earIn: '#bf6660', nose: '#140608', eye: '#381708', eyeGlow: '#c47828',
        sx: 1.32, sy: 1.19, muzzleLen: 9.0, muzzleDrop: 3.0, stop: 0.52, legLen: 0.72, ruff: 1.10,
        ears: 'corgi', tail: 'bob', pattern: 'corgi'
    },
    {
        name: 'Шоколадный спаниель', short: 'шоколадный спаниель',
        dark: '#1a0806', mid: '#471b12', light: '#7a3522', rim: '#de8c5c',
        cream: '#cf8348', earIn: '#2e100a', nose: '#210b08', eye: '#331507', eyeGlow: '#c47c2e',
        sx: 1.34, sy: 1.32, muzzleLen: 9.2, muzzleDrop: 4.2, stop: 0.72, legLen: 0.94, ruff: 1.08,
        ears: 'longfloppy', tail: 'plume', pattern: 'spaniel'
    },
    {
        name: 'Лунный самоед', short: 'белоснежный самоед',
        dark: '#5e3d46', mid: '#ad8992', light: '#e8d4d7', rim: '#fff2ee',
        cream: '#f5e6e6', earIn: '#c97884', nose: '#120608', eye: '#2b1208', eyeGlow: '#b86c28',
        sx: 1.52, sy: 1.49, muzzleLen: 9.4, muzzleDrop: 3.3, stop: 0.50, legLen: 1.02, ruff: 1.32,
        ears: 'samoyed', tail: 'curled', pattern: 'samoyed'
    },
    {
        name: 'Чёрно-белый колли', short: 'чёрно-белый бордер-колли',
        dark: '#090306', mid: '#1c0e16', light: '#3b202e', rim: '#d9788e',
        cream: '#eee0e3', earIn: '#7d3848', nose: '#0f0507', eye: '#361808', eyeGlow: '#cf8430',
        sx: 1.44, sy: 1.42, muzzleLen: 10.3, muzzleDrop: 3.1, stop: 0.46, legLen: 1.04, ruff: 1.22,
        ears: 'tipped', tail: 'plume', pattern: 'collie'
    }
];

// УЛЬТРА-РЕДКАЯ ПОРОДА (РОВНО 0.1% — 1 ШАНС ИЗ 1000 ПРИ ПОЛУЧЕНИИ ПСА!):
// Белоснежная Белая Юна с шелковистыми фиолетовыми ушками и пышным фиолетовым хвостом!
const RARE_MALTESE_INDEX = 7;
const RARE_MALTESE_BREED = {
    id: 'maltese_violet',
    name: 'Белая Юна',
    short: 'Белая Юна с фиолетовыми ушками',
    rarity: '0.1%',
    rare: true,
    dark: '#6e5274', mid: '#d8c8de', light: '#f6eef9', cream: '#fffafe', rim: '#f8e6ff',
    violetDark: '#2f0e4f', violetMid: '#7c3aed', violetLight: '#b983ff', violetSilk: '#eed9ff',
    earIn: '#c084fc', nose: '#160818', eye: '#180820', eyeGlow: '#c084fc',
    sx: 1.16, sy: 1.12, legLen: 0.72, muzzleLen: 4.8, muzzleDrop: 2.35, stop: 1.9, ruff: 1.32,
    ears: 'maltese', tail: 'maltese_plume', pattern: 'maltese'
};

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
    mix = (mix ^ (mix >>> 16)) >>> 0;

    // Независимый точный бросок 1 из 1000 (строго 0.1%!) на уникальную белую мальтийскую болонку с фиолетовыми ушами и хвостом!
    let rareHash = hashStr('neeosoma_rare_maltese_01pct:' + src);
    rareHash = Math.imul((rareHash ^ 0x27d4eb2d) >>> 0, 0x165667b1) >>> 0;
    rareHash = (rareHash ^ (rareHash >>> 15)) >>> 0;
    const isNaturalRare = (rareHash % 1000) === 0;

    let breedIdx;
    if (Number.isInteger(overrideBreed) && overrideBreed >= 0 && overrideBreed <= RARE_MALTESE_INDEX) {
        breedIdx = overrideBreed;
    } else if (isNaturalRare) {
        breedIdx = RARE_MALTESE_INDEX;
    } else {
        breedIdx = mix % DOG_BREEDS.length;
    }
    const isRare = breedIdx === RARE_MALTESE_INDEX;
    const breed = isRare ? RARE_MALTESE_BREED : DOG_BREEDS[breedIdx];
    const browSpot = !isRare && ((mix >>> 8) % 2) === 0;
    const woofHz = isRare ? 168 : (118 + ((mix >>> 11) % 34));
    const summary = isRare
        ? 'Белая Юна с фиолетовыми ушами и хвостом (✦ 0.1%)'
        : breed.name;
    return {
        breedIdx, breed, rare: isRare, rarity: isRare ? '0.1%' : '', browSpot, woofHz, seed: mix, summary
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

function drawCompanionCat(g, now, phase, still, specOverride) {
    const uid = (typeof player !== 'undefined' && (player.uid || player.name)) || 'guest';
    const override = Number.isInteger(roomAnim.inspectCatCoat) ? roomAnim.inspectCatCoat : null;
    const cat = specOverride || catSpec(uid, override);
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

    // 1. ТЁПЛЫЙ ОРЕОЛ ЖИВОГО ПРИСУТСТВИЯ на кушетке (у редчайшего лунного кота 0.1% — мягкое мистическое аметистово-золотое сияние!)
    g.save();
    g.globalCompositeOperation = 'screen';
    const hearthA = 0.2 + breath * 0.11 + (isPetted ? 0.16 : 0) + nlBoost * 0.1 + (phase === 3 ? 0.05 : 0);
    if (c.pattern === 'luna') {
        radialAura(g, cx + 1, cy - 2, 56, '#e9d5ff', '#7e22ce', hearthA * 0.92);
        radialAura(g, cx - 15, cy - 5, 28, '#fef08a', '#a855f7', 0.18 + breath * 0.08 + (isPetted ? 0.14 : 0));
    } else {
        radialAura(g, cx + 1, cy - 2, 54, '#ffb668', '#b82238', hearthA);
    }
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
    // Мягкий рефлекс комнаты по низу шерсти (у чёрного лунного кота 0.1% — чистый глубокий чёрный обсидиановый шёлк!)
    if (g.createLinearGradient) {
        const tint = g.createLinearGradient(cx, bodyTop, cx, cy + 10);
        if (c.pattern === 'luna') {
            tint.addColorStop(0, 'rgba(192, 132, 252, 0.14)');
            tint.addColorStop(0.45, 'rgba(14, 6, 26, 0.55)');
            tint.addColorStop(1, 'rgba(3, 1, 6, 0.86)');
        } else {
            tint.addColorStop(0, 'rgba(255, 112, 96, 0.12)');
            tint.addColorStop(0.6, 'rgba(140, 16, 32, 0.16)');
            tint.addColorStop(1, 'rgba(18, 2, 5, 0.58)');
        }
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

    // 6. Выразительная круглая головка с щёчками (у лунного кота 0.1% — чисто-чёрный бархат для контраста с полумесяцем!)
    if (g.createRadialGradient) {
        const hg = g.createRadialGradient(hx - 1, hy - 3, 1.5, hx, hy, 12);
        if (c.pattern === 'luna') {
            hg.addColorStop(0, '#231336');
            hg.addColorStop(0.55, '#0c0514');
            hg.addColorStop(1, '#030106');
        } else {
            hg.addColorStop(0, mixHex(c.light, '#ffb8b0', 0.12));
            hg.addColorStop(0.65, mixHex(c.mid, '#6e1422', 0.16));
            hg.addColorStop(1, c.dark);
        }
        g.fillStyle = hg;
    } else g.fillStyle = c.mid;
    g.beginPath();
    g.ellipse(hx, hy, 11.2, 9.0, -0.1, 0, Math.PI * 2);
    g.fill();

    // Сияющий золотой полумесяц во лбу (0.1% «Полуночная Луна»!) / сиамская маска / буква «М» табби / звёздочка
    if (c.pattern === 'luna') {
        const mx = hx - 1.1, my = hy - 3.9, mr = 2.95;
        const mPulse = 0.72 + breath * 0.28 + (isPetted ? 0.2 : 0);
        if (g.createRadialGradient) {
            g.save();
            g.globalCompositeOperation = 'screen';
            radialAura(g, mx, my, 8.2, c.moonGold || '#fde047', c.moonGlow || '#c084fc', 0.52 * mPulse);
            g.restore();
        }
        // Ювелирный золотисто-лунный серп рожками вверх на чисто-чёрном лбу (как у Луны из ночной легенды!)
        g.save();
        g.translate(mx, my);
        g.fillStyle = c.moonGold || '#fde047';
        g.beginPath();
        g.arc(0, 0, mr, -Math.PI * 0.12, Math.PI * 1.12, false);
        g.bezierCurveTo(-mr * 0.62, mr * 0.42, mr * 0.62, mr * 0.42, Math.cos(-Math.PI * 0.12) * mr, Math.sin(-Math.PI * 0.12) * mr);
        g.closePath();
        g.fill();
        // Белоснежный лунный блик в сердце полумесяца
        g.fillStyle = c.moonCore || '#fffbeb';
        g.beginPath();
        g.ellipse(0, mr * 0.62, mr * 0.52, mr * 0.22, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
    } else if (c.pattern === 'siamese') {
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
        g.strokeStyle = c.pattern === 'luna'
            ? 'rgba(233, 213, 255, 0.72)'
            : ((c.pattern === 'tuxedo' || c.pattern === 'tortie' || c.pattern === 'siamese')
                ? 'rgba(235, 148, 152, 0.62)'
                : 'rgba(42, 10, 14, 0.72)');
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

// ===== СОБСТВЕННЫЙ ПЕРСИДСКИЙ КОВРИК ПСА НА ПОЛУ У КУШЕТКИ РЯДОМ С ПЛЕДОМ И КОТОМ =====
function drawDogPersianRug(g, cx, cy, phase, glowBoost) {
    g.save();
    // Изометрический разворот строго вдоль основания кушетки и свисающего бордового пледа (+14.5°)
    const lerp2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    const quad = (tl, tr, br, bl) => {
        g.beginPath();
        g.moveTo(tl[0], tl[1]);
        g.lineTo(tr[0], tr[1]);
        g.lineTo(br[0], br[1]);
        g.lineTo(bl[0], bl[1]);
        g.closePath();
    };
    const insetQuad = (tl, tr, br, bl, u, v) => {
        const t0 = lerp2(tl, bl, v), t1 = lerp2(tr, br, v);
        const b0 = lerp2(tl, bl, 1 - v), b1 = lerp2(tr, br, 1 - v);
        return [lerp2(t0, t1, u), lerp2(t0, t1, 1 - u), lerp2(b0, b1, 1 - u), lerp2(b0, b1, u)];
    };

    // Просторный персидский коврик для крупного спящего пса прямо у свисающего пледа кушетки (x≈522..698, y≈400..470)
    const TL = [cx - 56, cy - 32]; // дальний левый угол у основания кушетки
    const TR = [cx + 76, cy + 3];  // дальний правый угол прямо под бахромой пледа
    const BR = [cx + 38, cy + 38]; // ближний правый угол (чисто левее ящика)
    const BL = [cx - 94, cy + 1];  // ближний левый угол у края большого ковра

    // 1. Глубокая мягкая тень коврика на каменной плитке пола
    g.fillStyle = 'rgba(3, 0, 1, 0.72)';
    quad([TL[0] - 2, TL[1] + 2.5], [TR[0] + 3, TR[1] + 3.2], [BR[0] + 3, BR[1] + 3.8], [BL[0] - 3, BL[1] + 3.2]);
    g.fill();

    // 2. Тонкая плетёная бахрома ручной работы по обоим коротким торцам коврика
    g.lineCap = 'round';
    g.lineWidth = 0.95;
    const fringeA = phase === 3 ? 'rgba(218, 166, 118, 0.56)' : 'rgba(176, 108, 92, 0.48)';
    const fringeB = phase === 3 ? 'rgba(168, 108, 78, 0.44)' : 'rgba(128, 62, 58, 0.40)';
    for (let i = 0; i <= 11; i++) {
        const u = 0.06 + (i / 11) * 0.88;
        g.strokeStyle = (i % 2 === 0) ? fringeA : fringeB;
        const pL = lerp2(TL, BL, u);
        g.beginPath(); g.moveTo(pL[0], pL[1]); g.lineTo(pL[0] - 5.2, pL[1] - 1.3 + (i % 3) * 0.25); g.stroke();
        const pR = lerp2(TR, BR, u);
        g.beginPath(); g.moveTo(pR[0], pR[1]); g.lineTo(pR[0] + 4.8, pR[1] + 1.4 - (i % 2) * 0.25); g.stroke();
    }

    // 3. Основное гранатово-винное шерстяное полотно с естественным уходом в тень под кушеткой
    if (g.createLinearGradient) {
        const rg = g.createLinearGradient(cx - 24, cy - 18, cx + 18, cy + 28);
        rg.addColorStop(0, phase === 3 ? '#591620' : '#460f18');
        rg.addColorStop(0.52, phase === 3 ? '#6c1b26' : '#57131e');
        rg.addColorStop(1, '#2b070d');
        g.fillStyle = rg;
    } else g.fillStyle = '#4d111b';
    quad(TL, TR, BR, BL);
    g.fill();

    // Тонкая тёмно-рубиновая кромка-оверлок
    g.strokeStyle = phase === 3 ? 'rgba(196, 112, 92, 0.45)' : 'rgba(150, 56, 64, 0.42)';
    g.lineWidth = 1.1;
    g.stroke();

    // 4. Широкая персидская кайма цвета ночного индиго-бордо с золотисто-охристым орнаментом
    const b1 = insetQuad(TL, TR, BR, BL, 0.055, 0.11);
    const b2 = insetQuad(TL, TR, BR, BL, 0.135, 0.24);
    g.fillStyle = 'rgba(22, 4, 10, 0.62)';
    quad(b1[0], b1[1], b1[2], b1[3]);
    g.fill();
    g.strokeStyle = phase === 3 ? 'rgba(226, 158, 102, 0.48)' : 'rgba(192, 98, 86, 0.42)';
    g.lineWidth = 0.85;
    g.stroke();

    // Внутреннее ало-гранатовое поле коврика
    if (g.createLinearGradient) {
        const fg = g.createLinearGradient(b2[0][0], b2[0][1], b2[2][0], b2[2][1]);
        fg.addColorStop(0, phase === 3 ? '#751f2a' : '#5d1520');
        fg.addColorStop(1, phase === 3 ? '#4c111a' : '#3b0b13');
        g.fillStyle = fg;
    } else g.fillStyle = '#54131d';
    quad(b2[0], b2[1], b2[2], b2[3]);
    g.fill();
    g.strokeStyle = phase === 3 ? 'rgba(232, 170, 112, 0.46)' : 'rgba(198, 104, 92, 0.40)';
    g.lineWidth = 0.8;
    g.stroke();

    // Мелкий геометрический персидский мотив «гюль» вдоль каймы
    g.fillStyle = phase === 3 ? 'rgba(235, 174, 114, 0.36)' : 'rgba(196, 98, 92, 0.32)';
    for (let k = 0; k < 9; k++) {
        const u = 0.10 + (k / 8) * 0.80;
        const topP = lerp2(lerp2(b1[0], b2[0], 0.5), lerp2(b1[1], b2[1], 0.5), u);
        const botP = lerp2(lerp2(b1[3], b2[3], 0.5), lerp2(b1[2], b2[2], 0.5), u);
        g.fillRect(topP[0] - 0.9, topP[1] - 0.7, 1.8, 1.3);
        g.fillRect(botP[0] - 0.9, botP[1] - 0.7, 1.8, 1.3);
    }

    // 5. Центральный ступенчатый персидский медальон (ромб Тебриза) и угловые подвески
    const mc = lerp2(lerp2(b2[0], b2[2], 0.5), lerp2(b2[1], b2[3], 0.5), 0.5);
    const axX = [(b2[1][0] - b2[0][0]) * 0.24, (b2[1][1] - b2[0][1]) * 0.24];
    const axY = [(b2[3][0] - b2[0][0]) * 0.34, (b2[3][1] - b2[0][1]) * 0.34];
    g.fillStyle = 'rgba(24, 5, 11, 0.58)';
    g.strokeStyle = phase === 3 ? 'rgba(238, 178, 118, 0.5)' : 'rgba(205, 108, 96, 0.44)';
    g.lineWidth = 0.85;
    g.beginPath();
    g.moveTo(mc[0] - axX[0], mc[1] - axX[1]);
    g.lineTo(mc[0] + axY[0], mc[1] + axY[1]);
    g.lineTo(mc[0] + axX[0], mc[1] + axX[1]);
    g.lineTo(mc[0] - axY[0], mc[1] - axY[1]);
    g.closePath();
    g.fill();
    g.stroke();

    // Тёплое золотистое ядро медальона и деликатный блик ночника по ворсу
    g.fillStyle = phase === 3 ? 'rgba(232, 162, 98, 0.42)' : 'rgba(186, 78, 76, 0.38)';
    g.beginPath();
    g.ellipse(mc[0], mc[1], 4.2, 2.1, 0.24, 0, Math.PI * 2);
    g.fill();

    // Мягкая тень от края кушетки по дальней кромке коврика (вживляет коврик в комнату на 100%)
    g.strokeStyle = 'rgba(4, 1, 2, 0.42)';
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(TL[0] + 1, TL[1] + 1);
    g.lineTo(TR[0] - 1, TR[1] + 1);
    g.stroke();

    if (glowBoost > 0.02) {
        g.globalCompositeOperation = 'screen';
        radialAura(g, cx, cy, 62, '#ffbe72', '#b82238', glowBoost);
    }
    g.restore();
}

// ===== ЖИВОЙ ПЁС-ХРАНИТЕЛЬ С НАСТОЯЩЕЙ СОБАЧЬЕЙ АНАТОМИЕЙ И МАСШТАБОМ (У ПЛЕДА КУШЕТКИ РЯДОМ С КОТОМ!) =====
function drawCompanionDog(g, now, phase, still, specOverride) {
    const uid = (typeof player !== 'undefined' && (player.uid || player.name)) || 'guest';
    const override = Number.isInteger(roomAnim.inspectDogBreed) ? roomAnim.inspectDogBreed : null;
    const dog = specOverride || dogSpec(uid, override);
    const b = dog.breed;
    const isRareMaltese = b.pattern === 'maltese';
    const isSamoyed = b.pattern === 'samoyed';
    const isWhiteCloud = isSamoyed || isRareMaltese;
    const t = still ? 1.8 : now * 0.001;

    // Просторный персидский коврик пса на полу у свисающего пледа кушетки — рядом с котом (618, 333)
    const rugX = 622, rugY = 433;
    const cx = 613, cy = 425;

    // Глубокое живое дыхание спящего пса
    const breathRaw = still ? 0.45 : (0.5 + 0.5 * Math.sin(t * 1.48 + 0.6));
    const breath = breathRaw * breathRaw * (3 - 2 * breathRaw);
    const rise = breath * 2.15;
    const rib = breath * 1.05;

    const petElapsed = now - (roomAnim.dogPetStart || -1e9);
    const isPetted = !still && petElapsed > 0 && petElapsed < 3600;
    const petK = isPetted ? softBell(petElapsed, 250, 2050, 1100) : 0;
    // Как и кот: сонно приоткрывает сияющие глаза при ласке (и изредка на долю секунды сквозь дрёму!)
    const lazyCycle = !still ? (t % 21.5) : 0;
    const lazyPeek = !still && !isPetted && lazyCycle > 18.8 && lazyCycle < 19.85;
    const peekAwake = (isPetted && petElapsed > 150 && petElapsed < 1420) || lazyPeek;

    const catNear = !!getRoomCosmeticsSafe().cat;
    const headLift = petK * 6.0;
    const headPitch = -0.145 + breath * 0.018 + petK * 0.23;

    // Живой хвост: мягко дышит во сне, счастливо виляет при ласке
    const wag = still
        ? 0
        : isPetted
            ? Math.sin(t * 13.4) * (5.0 * petK + 1.1)
            : (Math.sin(t * 0.92) * 0.8 + (Math.sin(t * 0.37) > 0.92 ? Math.sin(t * 7.2) * 1.45 : 0));

    // Сонное подёргивание ушка (как у кота!) и радостный подъём при поглаживании
    const earPerk = petK * 2.35 + ((!still && Math.sin(t * 0.64 + 1.9) > 0.95) ? Math.sin(t * 13.5) * 1.05 : 0);
    const nrBoost = !still ? softBell(now - roomAnim.nightRStart, 650, 900, 1700) : 0;

    // АТМОСФЕРНАЯ СВЕТОВАЯ ПАЛИТРА УРОВНЯ КОТА:
    // бережно сохраняем 100% родных цветов каждой породы (b.dark / b.mid / b.light / b.cream / b.rim),
    // глубоко вживляя шерсть в камерный багрово-янтарный (или рассветный) свет комнаты!
    const keyWarm = phase === 2 ? '#ffd28e' : (phase === 3 ? '#f0b8dc' : '#e8837e');
    const roomShadow = phase === 3 ? '#1a081d' : '#180408';
    const rugBounce = phase === 2 ? '#c45b3a' : (phase === 3 ? '#8c2d56' : '#7a1928');

    const furDark  = mixHex(b.dark, roomShadow, 0.34);
    const furMid   = mixHex(b.mid, '#4c0f1b', phase === 2 ? 0.16 : 0.22);
    const furLight = mixHex(b.light, keyWarm, 0.16);
    const furDeep  = mixHex(b.dark, '#090103', 0.56);

    // Тёплый бархатный крем (без резкой пластмассовой белизны в тёмной комнате)
    const creamLight = mixHex(b.cream, keyWarm, phase === 3 ? 0.16 : 0.20);
    const creamWarm  = mixHex(b.cream, '#c86a6e', phase === 3 ? 0.20 : 0.26);
    const creamShade = mixHex(b.cream, '#4d1824', phase === 3 ? 0.36 : 0.44);
    const creamDeep  = mixHex(b.cream, '#24070e', 0.62);

    // Облачный белоснежный мех самоеда и редчайшей 0.1% мальтийской болонки (чистые тёплые переходы без серой грязи!)
    const cloudHighlight = isRareMaltese
        ? mixHex('#ffffff', phase === 3 ? '#fae8ff' : '#ffe8e6', 0.18)
        : mixHex(b.cream, keyWarm, 0.18);
    const cloudTop = isRareMaltese
        ? mixHex('#fff8f6', phase === 3 ? '#f3d4ee' : '#eab0b6', 0.22)
        : mixHex(b.cream, '#da8488', phase === 3 ? 0.20 : 0.26);
    const cloudMid = isRareMaltese
        ? mixHex('#ebd8e4', phase === 3 ? '#8b4e86' : '#8f4658', 0.34)
        : mixHex(b.mid, '#6b2534', 0.34);
    const cloudDark = isRareMaltese
        ? mixHex('#9c7b96', '#2a0918', 0.52)
        : mixHex(b.dark, '#290912', 0.48);

    // Мягкий золотисто-розовый контровой кант (как у кота!)
    const rimHex = isRareMaltese
        ? mixHex('#f5d0fe', '#ffe4b8', 0.38)
        : mixHex(b.rim, phase === 2 ? '#ffe09c' : (phase === 3 ? '#f5c6ec' : '#ffa28c'), 0.42);

    // 1. Персидский коврик пса + тёплое живое дыхание света (и мистический аметистовый ореол у 0.1% мальтезе!)
    const auraA = 0.13 + breath * 0.06 + petK * 0.17 + nrBoost * 0.09 + (phase >= 2 ? 0.05 : 0);
    drawDogPersianRug(g, rugX, rugY, phase, auraA);

    if (isRareMaltese) {
        g.save();
        g.globalCompositeOperation = 'screen';
        radialAura(g, cx + 2, cy - 2, 52, '#e9d5ff', '#7c3aed', 0.13 + breath * 0.06 + petK * 0.12);
        g.restore();
    }

    if (catNear && !still) {
        g.save();
        g.globalCompositeOperation = 'screen';
        radialAura(g, 620, 382, 54, '#ffb970', '#a81e34', 0.06 + breath * 0.03 + petK * 0.06);
        g.restore();
    }

    // Вспомогательная кисть мягких шёрстных прядей (придаёт живую фактуру меха без жёстких полос)
    const strokeFurLocks = (pts, col, w, alpha) => {
        g.save();
        g.strokeStyle = col;
        g.lineWidth = w;
        if (alpha !== undefined) g.globalAlpha = alpha;
        g.beginPath();
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            g.moveTo(p[0], p[1]);
            g.quadraticCurveTo(p[2], p[3], p[4], p[5]);
        }
        g.stroke();
        g.restore();
    };

    g.save();
    g.translate(cx, cy);
    g.scale(b.sx, b.sy);
    g.lineCap = 'round';
    g.lineJoin = 'round';

    // 2. Многослойная бархатная контактная тень на ворсе персидского коврика (плотно «усаживает» пса в сцену)
    g.save();
    if (g.createRadialGradient) {
        const sg = g.createRadialGradient(-1, 10.2, 5, 1, 11.0, 44);
        sg.addColorStop(0, 'rgba(3, 0, 2, 0.92)');
        sg.addColorStop(0.58, 'rgba(6, 1, 3, 0.64)');
        sg.addColorStop(1, 'rgba(6, 1, 3, 0)');
        g.fillStyle = sg;
    } else g.fillStyle = 'rgba(5, 1, 2, 0.72)';
    g.beginPath();
    g.ellipse(1.2, 10.6, 41.5, 12.2, 0.11, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // 3. СКУЛЬПТУРНЫЙ ДАЛЬНИЙ ХВОСТ (пышное кольцо сиба-ину, облачный султан самоеда, пушистый помпон корги)
    g.save();
    if (b.tail === 'curled') {
        const wOff = wag * 0.42;
        const ty = (isSamoyed ? -10.8 : -9.4) - rise * 0.52 - Math.abs(wag) * 0.14;
        const tx = (isSamoyed ? 21.5 : 23.2) + wOff;
        const outerR = isSamoyed ? 11.4 : 8.6;

        // Тень хвоста на крупе
        g.fillStyle = 'rgba(10, 2, 5, 0.36)';
        g.beginPath();
        g.ellipse(tx + 3.2, ty + 4.8, outerR * 0.85, outerR * 0.62, -0.2, 0, Math.PI * 2);
        g.fill();

        // Пышный объёмный завиток хвоста (настоящая веерная форма с градиентом, не труба!)
        if (g.createRadialGradient) {
            const tg = g.createRadialGradient(tx + 2, ty - 2.5, 1.5, tx + 3.5, ty + 1.5, outerR * 1.25);
            if (isSamoyed) {
                tg.addColorStop(0, cloudHighlight);
                tg.addColorStop(0.58, cloudTop);
                tg.addColorStop(1, cloudDark);
            } else {
                tg.addColorStop(0, creamLight);
                tg.addColorStop(0.46, furLight);
                tg.addColorStop(0.82, furMid);
                tg.addColorStop(1, furDeep);
            }
            g.fillStyle = tg;
        } else g.fillStyle = isSamoyed ? cloudTop : furLight;

        g.beginPath();
        g.moveTo(25.2, 2.6);
        g.bezierCurveTo(38.2 + wOff * 0.8, 0.2, 39.4 + wOff, ty - 8.2, tx + 2.4, ty - 7.4);
        g.bezierCurveTo(tx - 6.8, ty - 6.6, tx - 7.2, ty + 3.2, tx + 0.5, ty + 5.2);
        g.bezierCurveTo(tx + 5.2, ty + 6.4, 29.5, 5.8, 25.2, 2.6);
        g.closePath();
        g.fill();

        // Кремовый пушистый подшёрсток внутри кольца сиба-ину / шёлковые перья самоеда
        g.fillStyle = isSamoyed ? cloudHighlight : creamWarm;
        g.globalAlpha = isSamoyed ? 0.72 : 0.84;
        g.beginPath();
        g.arc(tx + 1.2, ty - 0.6, isSamoyed ? 5.6 : 4.1, Math.PI * 0.75, Math.PI * 2.15);
        g.quadraticCurveTo(tx + 1.6, ty + 1.2, tx - 2.6, ty + 2.2);
        g.closePath();
        g.fill();
        g.globalAlpha = 1;

        // Внутренняя улитка завитка и мягкий контровой блик сверху
        g.strokeStyle = isSamoyed ? mixHex(cloudDark, '#3a101d', 0.25, 0.45) : mixHex(furDark, '#1a0408', 0.3, 0.55);
        g.lineWidth = 1.05;
        g.beginPath();
        g.arc(tx + 1.4, ty + 0.4, isSamoyed ? 2.8 : 2.3, Math.PI * 0.2, Math.PI * 1.45);
        g.stroke();

        g.strokeStyle = mixHex(rimHex, '#ffffff', 0.25, 0.62);
        g.lineWidth = 1.05;
        g.beginPath();
        g.moveTo(tx - 3.6, ty - 4.8);
        g.quadraticCurveTo(tx + 3.4, ty - 8.2, tx + 10.2, ty - 2.6);
        g.stroke();
    } else if (b.tail === 'bob') {
        // Очаровательный пушистый персиково-сливочный хвостик-помпон вельш-корги
        const bx0 = 31.4 + wag * 0.38, by0 = 1.2 - rise * 0.35 - Math.abs(wag) * 0.24;
        if (g.createRadialGradient) {
            const bg0 = g.createRadialGradient(bx0 + 0.6, by0 - 1.4, 0.8, bx0, by0 + 0.6, 6.2);
            bg0.addColorStop(0, creamLight);
            bg0.addColorStop(0.58, creamWarm);
            bg0.addColorStop(1, furDark);
            g.fillStyle = bg0;
        } else g.fillStyle = creamWarm;
        g.beginPath();
        g.moveTo(27.5, -2.2);
        g.bezierCurveTo(bx0 + 3.2, by0 - 4.4, bx0 + 6.4, by0 - 0.6, bx0 + 4.8, by0 + 2.8);
        g.bezierCurveTo(bx0 + 3.0, by0 + 5.2, 28.4, 5.2, 27.5, -2.2);
        g.closePath();
        g.fill();
        g.strokeStyle = mixHex(rimHex, '#fff4e4', 0.3, 0.55);
        g.lineWidth = 0.85;
        g.beginPath();
        g.arc(bx0 + 0.8, by0 - 0.4, 3.6, -Math.PI * 0.65, Math.PI * 0.22);
        g.stroke();
    }
    g.restore();

    // 4. ДАЛЬНЯЯ ПЕРЕДНЯЯ ЛАПКА — мягко уведена в полутень под тёплую грудь
    const legK = b.legLen;
    const farFoldX = -20.2 - 3.5 * legK, farFoldY = 6.3;
    const farLegTop = (b.pattern === 'golden')
        ? mixHex(furMid, creamWarm, 0.28)
        : (b.pattern === 'spaniel'
            ? mixHex(b.mid, creamShade, 0.28)
            : (b.pattern === 'shiba' ? mixHex(furMid, creamShade, 0.45) : (isWhiteCloud ? cloudMid : creamShade)));
    const farLegBot = isWhiteCloud ? cloudDark : mixHex(furDeep, creamDeep, 0.35);
    if (g.createLinearGradient) {
        const flg = g.createLinearGradient(farFoldX - 2, 2.2, farFoldX + 8, farFoldY + 4.4);
        flg.addColorStop(0, farLegTop);
        flg.addColorStop(1, farLegBot);
        g.fillStyle = flg;
    } else g.fillStyle = farLegTop;
    g.beginPath();
    g.moveTo(-15.5, 2.4);
    g.bezierCurveTo(farFoldX - 2.3, 3.1, farFoldX - 4.3, farFoldY + 0.1, farFoldX - 2.1, farFoldY + 2.4);
    g.bezierCurveTo(farFoldX + 0.5, farFoldY + 4.0, -16.0, farFoldY + 3.6, -12.5, 7.6);
    g.closePath();
    g.fill();

    // 5. ОБЪЁМНЫЙ БАРХАТНЫЙ КОРПУС СПЯЩЕГО ПСА (дышащая грудь, плавная холка, тёплое согнутое бедро)
    const withersY = -13.5 - rise;
    const loinY = -10.4 - rise * 0.72;
    const croupY = -8.3 - rise * 0.48;

    if (g.createRadialGradient) {
        const bg = g.createRadialGradient(-4, -9.5 - rise * 0.6, 2.5, 4, 3.5, 41);
        if (isWhiteCloud) {
            bg.addColorStop(0, cloudHighlight);
            bg.addColorStop(0.45, cloudTop);
            bg.addColorStop(0.78, cloudMid);
            bg.addColorStop(1, cloudDark);
        } else {
            bg.addColorStop(0, furLight);
            bg.addColorStop(0.48, furMid);
            bg.addColorStop(0.84, furDark);
            bg.addColorStop(1, furDeep);
        }
        g.fillStyle = bg;
    } else g.fillStyle = isWhiteCloud ? cloudTop : furMid;

    g.save();
    g.beginPath();
    g.moveTo(-21.4 - rib * 0.5, 1.2);
    g.bezierCurveTo(-23.0 - rib * 0.5, -7.2, -17.4, withersY, -7.8, withersY);
    g.bezierCurveTo(1.2, withersY + 0.4, 7.2, loinY, 15.2, loinY + 0.3);
    g.bezierCurveTo(23.2, croupY, 31.2, croupY + 3.3, 33.0, 2.5);
    g.bezierCurveTo(34.5, 8.8, 26.0, 12.2, 13.0, 11.8);
    g.bezierCurveTo(1.0, 11.2, -13.5, 10.2, -21.4 - rib * 0.5, 1.2);
    g.closePath();
    g.fill();
    g.clip();

    // Породные окрасы с мягкими живописными градиентами и шёрстными переходами
    if (b.pattern === 'husky') {
        // Благородный серебристо-угольный чепрак и снежный подшёрсток сибирского хаски
        if (g.createLinearGradient) {
            const hg0 = g.createLinearGradient(0, -3, 0, 13);
            hg0.addColorStop(0, creamLight);
            hg0.addColorStop(0.58, creamWarm);
            hg0.addColorStop(1, creamShade);
            g.fillStyle = hg0;
        } else g.fillStyle = creamWarm;
        g.beginPath();
        g.moveTo(-24, -4.8);
        g.bezierCurveTo(-13.5, -3.6, -7.2, 2.8, 5.5, 3.8);
        g.bezierCurveTo(15.8, 4.2, 21.8, 1.2, 32.5, 6.2);
        g.lineTo(34, 14); g.lineTo(-26, 14);
        g.closePath();
        g.fill();
        // Пушистая зубчатая граница двойной шерсти на плече и боку хаски
        strokeFurLocks([
            [-11.5, -1.8, -8.5, 0.2, -6.2, 1.6],
            [-4.0, 1.2, -0.5, 2.8, 2.8, 3.6],
            [11.0, 3.4, 14.8, 2.6, 18.2, 3.5]
        ], furMid, 1.35, 0.55);
    } else if (b.pattern === 'collie' || b.pattern === 'corgi') {
        // Роскошный белый воротник-шаль на плечах и тёплый животик колли и вельш-корги
        if (g.createLinearGradient) {
            const cg0 = g.createLinearGradient(-16, -12, -4, 13);
            cg0.addColorStop(0, creamLight);
            cg0.addColorStop(0.62, creamWarm);
            cg0.addColorStop(1, creamShade);
            g.fillStyle = cg0;
        } else g.fillStyle = creamWarm;
        g.beginPath();
        g.moveTo(-24, -15);
        g.bezierCurveTo(-9.0, -14.8, -3.8, -5.8, -6.2, 1.8);
        g.bezierCurveTo(-7.2, 4.8, 4.5, 7.8, 15.5, 11.8);
        g.lineTo(-26, 13);
        g.closePath();
        g.fill();
        // Пушистые пёрышки белого воротника поверх рыжего/чёрного плеча
        strokeFurLocks([
            [-6.8, -7.6, -4.2, -6.4, -3.2, -4.8],
            [-6.2, -3.8, -3.6, -2.5, -2.8, -0.9],
            [-6.6, -0.2, -4.0, 1.2, -3.4, 2.8]
        ], creamLight, 1.35, 0.82);
        if (b.pattern === 'collie') {
            // Бархатный тёплый глянец на иссиня-чёрной спинке бордер-колли (чтобы читался благородный объём, как у чёрного кота!)
            g.fillStyle = mixHex(b.light, keyWarm, 0.28, 0.34);
            g.beginPath(); g.ellipse(8, -7.2 - rise * 0.5, 15, 4.0, 0.08, 0, Math.PI * 2); g.fill();
        } else {
            // Тёплый лисье-медовый отблеск на спинке корги
            g.fillStyle = mixHex(b.rim, b.light, 0.45, 0.28);
            g.beginPath(); g.ellipse(9, -6.8 - rise * 0.5, 14, 4.2, 0.09, 0, Math.PI * 2); g.fill();
        }
    } else if (isSamoyed) {
        // Воздушное тёпло-снежное облако самоеда с объёмными слоями пуха
        g.fillStyle = cloudHighlight;
        g.globalAlpha = 0.58;
        g.beginPath(); g.ellipse(-3, -6.8 - rise * 0.55, 22, 6.2, 0.06, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
        strokeFurLocks([
            [-9, -2.5, -4, -0.8, 1, -1.6],
            [13, -1.8, 18, -0.2, 23, 1.6]
        ], cloudMid, 1.0, 0.16);
    } else if (b.pattern === 'golden') {
        // Богатый медово-золотистый шёлк ретривера с тёплым сливочным очесом на груди и боку
        g.fillStyle = mixHex(b.light, creamLight, 0.45, 0.58);
        g.beginPath(); g.ellipse(-12.5, 1.2, 11.0, 8.6, -0.15, 0, Math.PI * 2); g.fill();
        g.fillStyle = mixHex(b.rim, b.light, 0.48, 0.32);
        g.beginPath(); g.ellipse(2.5, -7.6 - rise * 0.6, 17.5, 4.4, 0.08, 0, Math.PI * 2); g.fill();
        strokeFurLocks([
            [-6, 3.4, -0.5, 5.2, 5.5, 4.6],
            [4, 5.8, 9.5, 7.2, 15.0, 6.2],
            [-2, -2.6, 4.2, -1.6, 10.2, -2.2]
        ], mixHex(b.light, b.cream, 0.48), 1.15, 0.45);
    } else if (b.pattern === 'shiba') {
        // Плюшевый огненно-рыжий мех сиба-ину и мягкое кремовое «урадзиро» на груди и животике
        g.fillStyle = creamWarm;
        g.beginPath(); g.ellipse(-16.2, 3.2, 8.8, 7.6, -0.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = mixHex(b.rim, b.light, 0.4, 0.30);
        g.beginPath(); g.ellipse(3.0, -7.5 - rise * 0.55, 16.0, 4.2, 0.08, 0, Math.PI * 2); g.fill();
        g.fillStyle = creamShade;
        g.beginPath(); g.ellipse(1.5, 10.6, 19.5, 3.6, 0.05, 0, Math.PI * 2); g.fill();
    } else if (b.pattern === 'spaniel') {
        // Глубокий шоколадно-каштановый шёлк спаниеля с тёплым карамельным подпалом у груди и глянцевым бликом
        g.fillStyle = mixHex(b.light, b.cream, 0.36, 0.38);
        g.beginPath(); g.ellipse(-15.5, 4.0, 7.4, 5.8, -0.15, 0, Math.PI * 2); g.fill();
        g.fillStyle = mixHex(b.light, b.rim, 0.36, 0.34);
        g.beginPath(); g.ellipse(1.5, -7.4 - rise * 0.5, 16.5, 4.2, 0.08, 0, Math.PI * 2); g.fill();
        strokeFurLocks([
            [-5, 1.5, 0.5, 3.4, 6.5, 2.2],
            [6, 3.8, 12.0, 5.4, 17.5, 3.8]
        ], mixHex(b.light, b.rim, 0.3), 1.05, 0.34);
    } else if (isRareMaltese) {
        // Жемчужно-белоснежная шёлковая мантия редчайшей 0.1% мальтийской болонки (нежные волнистые блики, 0% серых полос!)
        g.fillStyle = cloudHighlight;
        g.globalAlpha = 0.65;
        g.beginPath(); g.ellipse(2, -6.8 - rise * 0.5, 21, 5.6, 0.06, 0, Math.PI * 2); g.fill();
        // Едва уловимый сиренево-жемчужный рефлекс у крупа от фиолетового хвоста
        g.fillStyle = 'rgba(196, 155, 255, 0.16)';
        g.beginPath(); g.ellipse(24, 3.5, 9.5, 7.2, 0.2, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
        strokeFurLocks([
            [-7, 0.5, -3.5, 4.8, -0.5, 7.8],
            [2, -0.2, 5.2, 4.6, 8.6, 7.8],
            [11, 0.2, 14.5, 4.8, 18.0, 7.6]
        ], 'rgba(255, 250, 255, 0.55)', 1.05, 0.6);
    }

    // Глубокая бархатная светотень внизу живота + тёплый ало-янтарный рефлекс от персидского коврика (вживляет в комнату на 100%!)
    if (g.createLinearGradient) {
        const bellySh = g.createLinearGradient(0, 2.5, 0, 12.5);
        bellySh.addColorStop(0, 'rgba(16, 3, 7, 0)');
        bellySh.addColorStop(0.72, 'rgba(18, 3, 8, 0.34)');
        bellySh.addColorStop(1, 'rgba(12, 2, 5, 0.58)');
        g.fillStyle = bellySh;
        g.fillRect(-26, 2.5, 62, 11);
    }
    g.fillStyle = mixHex(rugBounce, keyWarm, 0.25, 0.14);
    g.beginPath();
    g.ellipse(3, 10.6, 26, 2.8, 0.05, 0, Math.PI * 2);
    g.fill();

    // Объёмная скульптурная складка согнутого заднего бедра (окорока) с мягким бликом по округлости
    g.fillStyle = 'rgba(12, 2, 6, 0.26)';
    g.beginPath();
    g.moveTo(11.8, -0.8);
    g.bezierCurveTo(7.4, 4.8, 8.8, 9.4, 18.5, 11.6);
    g.lineTo(7.2, 11.8);
    g.bezierCurveTo(4.6, 7.2, 5.8, 2.6, 11.8, -0.8);
    g.closePath();
    g.fill();

    g.strokeStyle = isWhiteCloud ? cloudHighlight : mixHex(furLight, rimHex, 0.45);
    g.globalAlpha = 0.28;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(14.2, -1.6);
    g.quadraticCurveTo(10.2, 4.2, 15.2, 8.8);
    g.stroke();
    g.globalAlpha = 1;
    g.restore();

    // Тёплый живописный контровой свет по линии спины и крупа (фирменный приём кота!)
    g.strokeStyle = mixHex(rimHex, '#fff2dc', 0.25, 0.58);
    g.lineWidth = 1.25;
    g.beginPath();
    g.moveTo(-13.2, withersY + 1.0);
    g.bezierCurveTo(-4.0, withersY + 0.1, 8.2, loinY + 0.2, 24.5, croupY + 1.4);
    g.quadraticCurveTo(30.4, croupY + 3.8, 32.2, 0.6);
    g.stroke();

    // 6. СОГНУТАЯ ЗАДНЯЯ ЛАПКА С МЯГКИМ ОБЪЁМОМ И АККУРАТНЫМИ ПАЛЬЧИКАМИ
    const nearTopCol = (b.pattern === 'golden')
        ? mixHex(b.light, creamLight, 0.34)
        : (b.pattern === 'shiba'
            ? mixHex(b.light, creamLight, 0.46)
            : (b.pattern === 'spaniel'
                ? mixHex(b.mid, creamWarm, 0.48)
                : (isWhiteCloud ? cloudTop : creamLight)));
    const nearMidCol = (b.pattern === 'golden')
        ? mixHex(furMid, creamWarm, 0.26)
        : (b.pattern === 'spaniel'
            ? mixHex(furMid, creamShade, 0.3)
            : (isWhiteCloud ? cloudMid : creamWarm));
    const nearBotCol = (b.pattern === 'golden' || b.pattern === 'spaniel')
        ? mixHex(furDark, '#1a0408', 0.25)
        : (isWhiteCloud ? cloudDark : creamShade);

    // Тень под задней лапкой
    g.fillStyle = 'rgba(6, 1, 3, 0.48)';
    g.beginPath();
    g.ellipse(14.2, 13.6, 12.6, 2.4, -0.03, 0, Math.PI * 2);
    g.fill();

    if (g.createLinearGradient) {
        const hlg = g.createLinearGradient(0, 7.6, 0, 14.4);
        hlg.addColorStop(0, nearTopCol);
        hlg.addColorStop(0.55, nearMidCol);
        hlg.addColorStop(1, nearBotCol);
        g.fillStyle = hlg;
    } else g.fillStyle = nearTopCol;
    g.beginPath();
    g.moveTo(25.2, 7.4);
    g.quadraticCurveTo(16.2, 9.6, 9.2, 9.5);
    g.bezierCurveTo(4.0, 9.4, 1.6, 11.0, 2.4, 12.8);
    g.bezierCurveTo(3.4, 14.1, 9.6, 14.1, 16.8, 13.4);
    g.quadraticCurveTo(23.8, 12.6, 27.6, 10.1);
    g.closePath();
    g.fill();
    // Нежные складочки пальчиков задней лапки
    g.strokeStyle = 'rgba(20, 5, 9, 0.42)';
    g.lineWidth = 0.68;
    g.beginPath();
    g.moveTo(2.8, 11.5); g.lineTo(5.2, 11.6);
    g.moveTo(3.1, 12.6); g.lineTo(5.6, 12.6);
    g.stroke();

    // 7. БЛИЖНЯЯ ПЕРЕДНЯЯ ЛАПКА — уютно подогнута под тёплую грудь с шёлковым очесом у локтя
    const wristX = -15.6 - 5.1 * legK, wristY = 9.4;
    g.fillStyle = 'rgba(6, 1, 3, 0.48)';
    g.beginPath();
    g.ellipse((wristX - 4) * 0.5 - 3.8, wristY + 3.2, 11.0, 2.6, 0.04, 0, Math.PI * 2);
    g.fill();

    if (g.createLinearGradient) {
        const nlg = g.createLinearGradient(wristX, 4.4, -2, wristY + 4.4);
        nlg.addColorStop(0, nearTopCol);
        nlg.addColorStop(0.58, nearMidCol);
        nlg.addColorStop(1, nearBotCol);
        g.fillStyle = nlg;
    } else g.fillStyle = nearTopCol;
    g.beginPath();
    g.moveTo(-2.2, 4.4);
    g.bezierCurveTo(-8.2, 6.6, wristX + 5.2, wristY - 2.6, wristX + 0.5, wristY - 2.1);
    g.bezierCurveTo(wristX - 3.2, wristY - 1.6, wristX - 3.8, wristY + 1.8, wristX - 0.1, wristY + 3.0);
    g.bezierCurveTo(wristX + 4.2, wristY + 4.3, -12.2, wristY + 4.0, -8.8, wristY + 2.2);
    g.quadraticCurveTo(-3.8, wristY + 2.3, 1.0, 9.6);
    g.closePath();
    g.fill();
    // Тонкий верхний блик и мягкая складочка подогнутой лапки
    g.strokeStyle = mixHex(nearTopCol, '#fff4e6', 0.35, 0.45);
    g.lineWidth = 0.72;
    g.beginPath();
    g.moveTo(wristX - 1.2, wristY - 1.4);
    g.quadraticCurveTo(wristX + 4.2, wristY - 1.8, -7.5, 6.2);
    g.stroke();
    g.strokeStyle = 'rgba(20, 5, 9, 0.42)';
    g.lineWidth = 0.75;
    g.beginPath();
    g.moveTo(wristX + 0.6, wristY + 0.6);
    g.quadraticCurveTo(wristX + 4.8, wristY + 1.9, -11.2, wristY + 0.9);
    g.stroke();

    // 7б. СКУЛЬПТУРНЫЙ ПЕРЬЕВОЙ ХВОСТ, УЮТНО ОБНИМАЮЩИЙ БЕДРО (ретривер, хаски, колли, спаниель, 0.1% мальтезе!)
    // Рисуем настоящим заострённым веерным силуэтом с шёлковым очесом (никаких жёстких «трубок»!)
    if (b.tail === 'brush' || b.tail === 'plume') {
        g.save();
        const isBrush = b.tail === 'brush';
        const liftY = petK * 4.4 + wag * 0.52;
        const tipX = 14.8 - wag * 0.38;
        const tipY = 14.0 - liftY * 0.82;
        const thick = isBrush ? 1.12 : 0.96;

        // Бархатная тень хвоста на коврике
        g.fillStyle = 'rgba(6, 1, 3, 0.52)';
        g.beginPath();
        g.moveTo(28.5, 3.2);
        g.bezierCurveTo(41.5, 4.8, 41.2, 15.8 - liftY * 0.5, tipX, tipY + 2.8);
        g.bezierCurveTo(23.5, 14.6 - liftY * 0.5, 31.5, 10.6, 27.0, 6.0);
        g.closePath();
        g.fill();

        // Основное объёмное перо хвоста
        const tTop = (b.pattern === 'golden') ? furLight : (b.pattern === 'collie' ? mixHex(b.light, furMid, 0.5) : furLight);
        const tMid = furMid;
        const tBot = furDeep;
        if (g.createLinearGradient) {
            const tg = g.createLinearGradient(36, 2 - liftY * 0.3, tipX, tipY + 2);
            tg.addColorStop(0, tMid);
            tg.addColorStop(0.45, tTop);
            tg.addColorStop(1, tBot);
            g.fillStyle = tg;
        } else g.fillStyle = tMid;

        g.beginPath();
        g.moveTo(28.0, 0.8);
        g.bezierCurveTo(39.4, 2.2 - liftY * 0.32, 42.6, 10.2 - liftY * 0.5, 35.8, 13.8 * thick - liftY * 0.62);
        g.bezierCurveTo(30.4, 16.4 - liftY * 0.72, 21.2, 16.0 - liftY * 0.78, tipX, tipY);
        g.bezierCurveTo(20.6, 11.4 - liftY * 0.68, 29.8, 10.8 - liftY * 0.52, 32.0, 7.6 - liftY * 0.36);
        g.quadraticCurveTo(32.2, 4.8, 26.8, 4.4);
        g.closePath();
        g.fill();

        // Шёлковый светлый подшёрсток / перо по нижней кромке хвоста
        const featherCol = (b.pattern === 'golden')
            ? mixHex(b.light, creamLight, 0.56)
            : (b.pattern === 'spaniel' ? mixHex(b.light, b.rim, 0.34) : creamWarm);
        g.fillStyle = featherCol;
        g.globalAlpha = b.pattern === 'spaniel' ? 0.55 : 0.85;
        g.beginPath();
        g.moveTo(36.2, 11.4 - liftY * 0.52);
        g.bezierCurveTo(31.2, 15.6 - liftY * 0.68, 22.0, 15.8 - liftY * 0.76, tipX, tipY);
        g.quadraticCurveTo(25.4, 12.8 - liftY * 0.64, 36.2, 11.4 - liftY * 0.52);
        g.closePath();
        g.fill();
        g.globalAlpha = 1;

        if (b.pattern === 'collie') {
            // Фирменная снежно-белая кисточка («фонарик») на кончике хвоста бордер-колли
            g.fillStyle = creamLight;
            g.beginPath();
            g.moveTo(tipX + 8.6, tipY - 1.4);
            g.quadraticCurveTo(tipX + 3.8, tipY - 1.6, tipX, tipY);
            g.quadraticCurveTo(tipX + 4.2, tipY + 2.2, tipX + 9.2, tipY + 0.9);
            g.closePath();
            g.fill();
        }

        // Тёплый контровой блик по верхнему гребню хвоста
        g.strokeStyle = mixHex(rimHex, '#fff4e2', 0.22, 0.52);
        g.lineWidth = 0.95;
        g.beginPath();
        g.moveTo(29.2, 1.4);
        g.bezierCurveTo(38.6, 2.8 - liftY * 0.32, 40.4, 9.2 - liftY * 0.48, 33.5, 12.6 - liftY * 0.6);
        g.stroke();
        g.restore();
    } else if (b.tail === 'maltese_plume') {
        // РОСКОШНЫЙ ШЁЛКОВЫЙ АМЕТИСТОВО-ФИОЛЕТОВЫЙ ХВОСТ-СУЛТАН БЕЛОЙ МАЛЬТИЙСКОЙ БОЛОНКИ (0.1%)!
        g.save();
        const liftY = petK * 4.0 + wag * 0.55;
        const tipX = 15.2 - wag * 0.36;
        const tipY = 12.8 - liftY * 0.78;

        g.fillStyle = 'rgba(10, 2, 14, 0.56)';
        g.beginPath();
        g.moveTo(27.8, 2.4);
        g.bezierCurveTo(43.0, 1.4, 43.2, 15.4, tipX - 1.2, tipY + 3.2);
        g.bezierCurveTo(25.0, 16.6, 31.8, 9.2, 26.4, 5.4);
        g.closePath();
        g.fill();

        const vDeep  = b.violetDark  || '#2f0e4f';
        const vMid   = b.violetMid   || '#7c3aed';
        const vLight = b.violetLight || '#b983ff';
        const vSilk  = b.violetSilk  || '#eed9ff';
        if (g.createLinearGradient) {
            const tg = g.createLinearGradient(37, -3.5 - liftY * 0.3, tipX, tipY + 2);
            tg.addColorStop(0.0, vDeep);
            tg.addColorStop(0.34, vMid);
            tg.addColorStop(0.74, vLight);
            tg.addColorStop(1.0, vSilk);
            g.fillStyle = tg;
        } else g.fillStyle = vMid;

        g.beginPath();
        g.moveTo(27.0, -1.0);
        g.bezierCurveTo(38.8, -5.6 - liftY * 0.35, 44.6, 3.0 - liftY * 0.45, 38.6, 10.6 - liftY * 0.55);
        g.bezierCurveTo(33.8, 15.8 - liftY * 0.65, 22.4, 16.4 - liftY * 0.72, tipX, tipY);
        g.bezierCurveTo(21.8, 10.8 - liftY * 0.6, 30.8, 9.8 - liftY * 0.45, 31.6, 5.2 - liftY * 0.3);
        g.quadraticCurveTo(31.2, 2.0, 26.2, 2.8);
        g.closePath();
        g.fill();

        // Струящиеся лавандово-жемчужные шёлковые нити хвоста
        strokeFurLocks([
            [29.8, -0.4 - liftY * 0.18, 39.8, -1.2 - liftY * 0.35, 35.8, 9.2 - liftY * 0.52],
            [35.2, 4.6 - liftY * 0.32, 33.4, 12.2 - liftY * 0.56, 21.8, 13.6 - liftY * 0.68],
            [30.5, 9.2 - liftY * 0.45, 25.0, 12.6 - liftY * 0.62, tipX + 1.2, tipY + 0.2]
        ], vSilk, 0.92, 0.72);
        g.restore();
    }

    // 8. ПУШИСТАЯ ШЕЯ И ВОРОТНИК ГРУДИ С МЯГКОЙ ТЕНЬЮ ПОД ПОДБОРОДКОМ (без резких геометрических стыков!)
    const hx = -18.0, hy = -9.5 - rise * 0.55 - headLift;
    const hScale = 1.19;
    const ruffS = b.ruff || 1;

    // Плавный переход загривка в холку
    if (g.createLinearGradient) {
        const ng = g.createLinearGradient(hx, hy - 4, -4, 6);
        if (isWhiteCloud) {
            ng.addColorStop(0, cloudHighlight);
            ng.addColorStop(0.65, cloudTop);
            ng.addColorStop(1, cloudMid);
        } else if (b.pattern === 'collie' || b.pattern === 'corgi') {
            ng.addColorStop(0, creamLight);
            ng.addColorStop(0.68, creamWarm);
            ng.addColorStop(1, creamShade);
        } else {
            ng.addColorStop(0, furLight);
            ng.addColorStop(0.62, furMid);
            ng.addColorStop(1, furDark);
        }
        g.fillStyle = ng;
    } else g.fillStyle = isWhiteCloud ? cloudTop : furMid;

    g.beginPath();
    g.moveTo(-2.2, withersY + 0.4);
    g.bezierCurveTo(-8.5, withersY - 1.2, hx + 11.2, hy - 0.5, hx + 9.8, hy - 4.4);
    g.lineTo(hx - 4.0, hy + 4.2);
    g.bezierCurveTo(-24.2, -3.6, -23.0, 3.4, -16.0, 7.0);
    g.quadraticCurveTo(-6.8, 5.4, -2.2, withersY + 0.4);
    g.closePath();
    g.fill();

    // Пышное жабо груди (особенно облачное у самоеда, колли, корги, ретривера и мальтезе!)
    const ruffTop = (b.pattern === 'spaniel')
        ? mixHex(b.light, b.mid, 0.5)
        : (b.pattern === 'golden'
            ? mixHex(b.light, creamLight, 0.48)
            : (isWhiteCloud ? cloudHighlight : creamLight));
    const ruffBot = (b.pattern === 'spaniel')
        ? furDark
        : (b.pattern === 'golden'
            ? mixHex(furMid, creamShade, 0.35)
            : (isWhiteCloud ? cloudMid : creamShade));
    if (g.createLinearGradient) {
        const rg = g.createLinearGradient(-23, hy + 2, -13, 9);
        rg.addColorStop(0, ruffTop);
        rg.addColorStop(1, ruffBot);
        g.fillStyle = rg;
    } else g.fillStyle = ruffTop;

    g.beginPath();
    g.moveTo(hx - 3.0, hy + 3.2);
    g.bezierCurveTo(hx - 6.8 * ruffS, hy + 5.8, hx - 7.0 * ruffS, hy + 9.6, hx - 4.2 * ruffS, hy + 11.0);
    g.bezierCurveTo(-24.4 * Math.min(1.15, ruffS), 2.8, -22.2, 6.8, -16.8, 7.8);
    g.quadraticCurveTo(-10.2, 7.4, hx + 4.8, hy + 5.2);
    g.closePath();
    g.fill();

    // Нежные шёрстные завитки на грудке
    strokeFurLocks([
        [-21.2 * Math.min(1.1, ruffS), -1.2, -23.0 * Math.min(1.1, ruffS), 1.4, -20.4, 3.2],
        [-19.2, 2.0, -20.6, 4.6, -17.8, 6.2]
    ], ruffBot, 0.85, 0.45);

    // Мягкая контактная тень от сонной головы и мордочки на пушистой грудке (сразу рождает живой 3D-объём!)
    g.fillStyle = 'rgba(14, 3, 7, 0.34)';
    g.beginPath();
    g.ellipse(hx - 1.2, hy + 6.2 + headLift * 0.25, 9.2, 2.8, -0.1, 0, Math.PI * 2);
    g.fill();

    // 9. ВЫРАЗИТЕЛЬНАЯ ГОЛОВА В РАКУРСЕ 3/4 УРОВНЯ КОТА (живой объём, тёплый контровой свет, реснички, усики!)
    g.save();
    g.translate(hx, hy);
    g.scale(hScale, hScale);
    g.rotate(headPitch);

    const mLen = b.muzzleLen * 0.90;
    const mDrop = b.muzzleDrop;
    const noseX = -5.3 - mLen;
    const noseY = -0.85;
    const stopX = -4.9;
    const stopY = -3.2 + b.stop * 0.82;
    const pantOpen = isPetted ? petK * 1.85 : 0;
    const perkR = earPerk * 0.032;

    // 9а. Породные стоячие ушки с тёплым контровым кантом, розовой раковиной и нежным пушком внутри!
    const drawErectEar = (ex, ey, w, h, rot, roundness, isFar) => {
        g.save();
        g.translate(ex, ey);
        g.rotate(rot);
        if (!isFar) {
            // Мягкая тень у основания ближнего ушка на макушке
            g.fillStyle = 'rgba(12, 2, 6, 0.28)';
            g.beginPath(); g.ellipse(0.4, 1.4, w * 0.92, 1.7, 0.1, 0, Math.PI * 2); g.fill();
        }
        const outTop = isSamoyed
            ? (isFar ? cloudTop : cloudHighlight)
            : (isFar ? furDark : mixHex(furMid, furLight, 0.35));
        const outBot = isSamoyed
            ? (isFar ? cloudMid : cloudTop)
            : (isFar ? furDeep : furDark);
        if (g.createLinearGradient) {
            const eg = g.createLinearGradient(0, -h, 0, 2);
            eg.addColorStop(0, outTop);
            eg.addColorStop(1, outBot);
            g.fillStyle = eg;
        } else g.fillStyle = outTop;

        g.beginPath();
        g.moveTo(-w * 0.86, 1.6);
        if (roundness > 0.5) {
            g.bezierCurveTo(-w * 0.96, -h * 0.72, -w * 0.42, -h, -0.15, -h);
            g.bezierCurveTo(w * 0.46, -h, w * 0.94, -h * 0.58, w * 0.96, 1.9);
        } else {
            g.quadraticCurveTo(-w * 0.58, -h * 0.72, -0.25, -h);
            g.quadraticCurveTo(w * 0.70, -h * 0.62, w * 0.96, 1.9);
        }
        g.closePath();
        g.fill();

        // Тёплый контровой свет по кромке ушка (как у кота!)
        g.strokeStyle = mixHex(rimHex, '#ffe4ce', 0.3, isFar ? 0.42 : 0.72);
        g.lineWidth = 0.85;
        g.beginPath();
        g.moveTo(-w * 0.78, 0.6);
        g.quadraticCurveTo(-w * 0.52, -h * 0.76, -0.15, -h);
        g.quadraticCurveTo(w * 0.54, -h * 0.72, w * 0.82, 0.8);
        g.stroke();

        // Бархатная тёплая розовато-персиковая раковина ушка
        if (g.createLinearGradient) {
            const ig = g.createLinearGradient(0, -h * 0.78, 0, 1);
            ig.addColorStop(0, mixHex(b.earIn, '#2a0812', isFar ? 0.32 : 0.16));
            ig.addColorStop(1, mixHex(b.earIn, creamLight, isSamoyed ? 0.48 : 0.30));
            g.fillStyle = ig;
        } else g.fillStyle = b.earIn;
        g.globalAlpha = isFar ? 0.68 : 0.84;
        g.beginPath();
        g.moveTo(-w * 0.54, 0.6);
        g.quadraticCurveTo(-0.22, -h * 0.78, w * 0.38, 0.7);
        g.closePath();
        g.fill();
        g.globalAlpha = 1;

        // Пушистые светлые кисточки шерсти внутри ушка
        if (!isFar) {
            g.strokeStyle = isSamoyed ? cloudHighlight : creamLight;
            g.globalAlpha = 0.82;
            g.lineWidth = 0.82;
            g.beginPath();
            g.moveTo(w * 0.34, 0.4);  g.quadraticCurveTo(w * 0.05, -h * 0.14, -w * 0.18, -h * 0.22);
            g.moveTo(w * 0.24, -h * 0.18); g.quadraticCurveTo(0, -h * 0.32, -w * 0.14, -h * 0.42);
            g.moveTo(-w * 0.44, 0.4); g.lineTo(-w * 0.12, -h * 0.12);
            g.stroke();
            g.globalAlpha = 1;
        }
        g.restore();
    };

    // Дальнее ушко за черепом
    if (b.ears === 'pointed') {
        drawErectEar(-2.0, -6.5, 3.3, 7.7, -0.24 - perkR, 0.2, true);
    } else if (b.ears === 'samoyed') {
        drawErectEar(-1.8, -6.4, 3.6, 7.1, -0.22 - perkR, 0.74, true);
    } else if (b.ears === 'corgi') {
        drawErectEar(-2.1, -6.2, 4.1, 9.8, -0.29 - perkR, 0.85, true);
    } else if (b.ears === 'tipped') {
        drawErectEar(-2.0, -6.4, 3.2, 7.4, -0.20 - perkR, 0.2, true);
        g.fillStyle = furDeep;
        g.beginPath(); g.ellipse(-4.5, -12.0 - earPerk * 0.18, 2.4, 1.35, -0.42, 0, Math.PI * 2); g.fill();
    } else if (b.ears === 'floppy' || b.ears === 'longfloppy') {
        g.fillStyle = furDeep;
        g.beginPath();
        g.ellipse(-5.8, 0.9, 2.3, b.ears === 'longfloppy' ? 5.9 : 3.9, 0.16, 0, Math.PI * 2);
        g.fill();
    } else if (b.ears === 'maltese') {
        // Дальнее шелковистое фиолетовое ушко 0.1% белой мальтийской болонки
        g.save();
        const fvg = g.createLinearGradient && g.createLinearGradient(-6, -5, -6, 6.5);
        if (fvg) {
            fvg.addColorStop(0, b.violetLight || '#b983ff');
            fvg.addColorStop(0.5, b.violetMid || '#7c3aed');
            fvg.addColorStop(1, b.violetDark || '#2f0e4f');
            g.fillStyle = fvg;
        } else g.fillStyle = b.violetMid || '#7c3aed';
        g.beginPath();
        g.moveTo(-4.8, -4.4);
        g.bezierCurveTo(-8.2, -3.2, -9.2, 3.4, -6.6, 6.2);
        g.bezierCurveTo(-4.4, 6.8, -3.4, 2.6, -4.8, -4.4);
        g.closePath();
        g.fill();
        g.strokeStyle = b.violetSilk || '#eed9ff';
        g.globalAlpha = 0.65;
        g.lineWidth = 0.75;
        g.beginPath();
        g.moveTo(-6.2, -2.8); g.quadraticCurveTo(-7.6, 1.0, -6.3, 4.8);
        g.stroke();
        g.restore();
    }

    // 9б. Нижняя челюсть и крошечный розовый язычок радости при поглаживании
    g.fillStyle = (b.pattern === 'golden' || b.pattern === 'spaniel')
        ? mixHex(furMid, furDark, 0.45)
        : (isWhiteCloud ? cloudMid : creamShade);
    g.beginPath();
    g.moveTo(noseX + 2.0, noseY + mDrop - 0.3);
    g.quadraticCurveTo(noseX + 4.4, noseY + mDrop + 1.5 + pantOpen, -3.4, 4.5 + pantOpen * 0.48);
    g.lineTo(2.5, 4.4);
    g.lineTo(-4.0, 1.5);
    g.closePath();
    g.fill();

    if (pantOpen > 0.35) {
        const pant = Math.sin(t * 10.5) * 0.3;
        g.fillStyle = '#380a14';
        g.beginPath();
        g.moveTo(noseX + 1.9, noseY + mDrop - 0.35);
        g.quadraticCurveTo(-8.0, noseY + mDrop + 1.25 + pantOpen * 0.76, -4.1, 2.5);
        g.closePath();
        g.fill();
        g.fillStyle = '#e87285';
        g.beginPath();
        g.ellipse(noseX + 2.5, noseY + mDrop + 1.05 + pant * 0.28, 2.15, 1.1, -0.2, 0, Math.PI * 2);
        g.fill();
    }

    // 9в. СКУЛЬПТУРНЫЙ ЧЕРЕП И МОРДОЧКА С ЖИВЫМ 3D-ОБЪЁМОМ (исправлен 0% чёрный артефакт у самоеда!)
    if (g.createRadialGradient) {
        const hg = g.createRadialGradient(-2.0, -4.4, 1.4, -0.6, 0.8, 16.5);
        if (isRareMaltese) {
            hg.addColorStop(0, cloudHighlight);
            hg.addColorStop(0.62, cloudTop);
            hg.addColorStop(1, cloudMid);
        } else if (isSamoyed) {
            hg.addColorStop(0, cloudHighlight);
            hg.addColorStop(0.58, cloudTop);
            hg.addColorStop(1, cloudMid);
        } else if (b.pattern === 'collie') {
            hg.addColorStop(0, mixHex(b.light, keyWarm, 0.18));
            hg.addColorStop(0.58, furMid);
            hg.addColorStop(1, furDeep);
        } else {
            hg.addColorStop(0, furLight);
            hg.addColorStop(0.58, furMid);
            hg.addColorStop(1, furDark);
        }
        g.fillStyle = hg;
    } else g.fillStyle = isWhiteCloud ? cloudTop : furMid;

    g.save();
    g.beginPath();
    g.moveTo(8.8, 4.2);
    g.bezierCurveTo(10.3, -1.6, 9.0, -7.9, 3.0, -8.9);
    g.bezierCurveTo(-0.8, -9.4, -3.7, -7.8, stopX, stopY);
    g.quadraticCurveTo((stopX + noseX) * 0.5, stopY + 0.82, noseX + 0.8, noseY - 0.55);
    g.bezierCurveTo(noseX - 0.55, noseY + 0.4, noseX - 0.35, noseY + mDrop - 0.25, noseX + 2.5, noseY + mDrop);
    g.bezierCurveTo(noseX + 5.5, noseY + mDrop + 0.55, -5.8, 3.7, -2.8, 4.9);
    g.quadraticCurveTo(2.7, 6.2, 8.8, 4.2);
    g.closePath();
    g.fill();
    g.clip();

    // Породные маски лица (ювелирно мягкие и узнаваемые!)
    if (b.pattern === 'husky') {
        if (g.createLinearGradient) {
            const mg = g.createLinearGradient(0, -4, 0, 5.5);
            mg.addColorStop(0, creamLight);
            mg.addColorStop(0.7, creamWarm);
            mg.addColorStop(1, creamShade);
            g.fillStyle = mg;
        } else g.fillStyle = creamWarm;
        g.beginPath();
        g.moveTo(noseX - 1, noseY + 0.25);
        g.quadraticCurveTo(-8.2, noseY + 0.1, -4.4, -1.1);
        g.quadraticCurveTo(0.8, -2.3, 4.9, 1.8);
        g.lineTo(5.6, 7); g.lineTo(noseX - 2, 7);
        g.closePath();
        g.fill();
        // Фирменная снежная маска-трилистник вокруг глаза и бровки хаски
        g.fillStyle = creamLight;
        g.beginPath(); g.ellipse(-1.75, -3.45, 2.8, 2.05, -0.14, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(-3.6, -5.8, 0.9, 1.35, 0.22, 0, Math.PI * 2); g.fill();
    } else if (b.pattern === 'collie' || b.pattern === 'corgi') {
        g.fillStyle = creamLight;
        g.beginPath();
        g.moveTo(noseX - 1, noseY - 1.5);
        g.lineTo(stopX + 0.25, stopY - 0.3);
        g.lineTo(-3.1, -8.5);
        g.lineTo(-5.2, -8.0);
        g.lineTo(stopX - 1.4, stopY + 1.2);
        g.lineTo(-5.0, 1.45);
        g.lineTo(-2.4, 6.5);
        g.lineTo(noseX - 2, 6.5);
        g.closePath();
        g.fill();
        // Мягкая тень под белой брылей
        g.fillStyle = creamShade;
        g.globalAlpha = 0.55;
        g.beginPath(); g.ellipse(noseX + 4.2, noseY + mDrop + 0.4, 4.6, 1.3, 0.12, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
    } else if (b.pattern === 'shiba') {
        // Фирменное плюшевое кремовое «урадзиро» на щёчке, мордочке и круглой бровке сиба-ину
        g.fillStyle = creamLight;
        g.beginPath();
        g.moveTo(noseX - 0.6, noseY + 0.72);
        g.quadraticCurveTo(-7.8, noseY + 0.75, -3.9, -0.2);
        g.quadraticCurveTo(1.7, -0.7, 5.0, 2.9);
        g.lineTo(5.2, 7); g.lineTo(noseX - 2, 7);
        g.closePath();
        g.fill();
        g.beginPath(); g.ellipse(-1.85, -5.35, 1.28, 0.74, -0.14, 0, Math.PI * 2); g.fill();
    } else if (b.pattern === 'golden') {
        g.fillStyle = mixHex(b.light, creamLight, 0.52, 0.76);
        g.beginPath(); g.ellipse(noseX + 4.5, noseY + 1.5, 5.5, 2.8, 0.06, 0, Math.PI * 2); g.fill();
        g.fillStyle = mixHex(b.light, keyWarm, 0.35, 0.42);
        g.beginPath(); g.ellipse(-1.8, -5.2, 1.5, 0.8, -0.12, 0, Math.PI * 2); g.fill();
        g.fillStyle = mixHex(furMid, furDark, 0.42, 0.42);
        g.beginPath(); g.ellipse(-5.0, 2.2, 4.2, 1.7, 0.14, 0, Math.PI * 2); g.fill();
    } else if (b.pattern === 'spaniel') {
        // Тёплый карамельный подпал на мордочке, щёчке и бровке шоколадного спаниеля
        g.fillStyle = mixHex(b.light, creamWarm, 0.48, 0.80);
        g.beginPath(); g.ellipse(noseX + 4.2, noseY + 2.0, 4.6, 2.4, 0.1, 0, Math.PI * 2); g.fill();
        g.fillStyle = creamLight;
        g.beginPath(); g.ellipse(-1.85, -5.35, 1.22, 0.72, -0.12, 0, Math.PI * 2); g.fill();
    } else if (isSamoyed) {
        // Сияющая белоснежная мордочка и тёплая пушистая щёчка лунного самоеда
        g.fillStyle = cloudHighlight;
        g.globalAlpha = 0.72;
        g.beginPath(); g.ellipse(noseX + 4.6, noseY + 0.9, 5.2, 2.7, 0.05, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(2.6, 0.8, 5.4, 4.0, -0.15, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
    } else if (isRareMaltese) {
        // Фарфорово-белоснежная мордочка мальтезе с нежнейшим розово-жемчужным румянцем на щёчке
        g.fillStyle = cloudHighlight;
        g.globalAlpha = 0.78;
        g.beginPath(); g.ellipse(-2.8, -1.2, 6.2, 4.6, -0.1, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(244, 168, 212, 0.22)';
        g.beginPath(); g.ellipse(0.4, 0.2, 2.3, 1.3, 0, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
    }

    // Нежная тень по нижнему контуру щеки для бархатной круглоты головы
    g.fillStyle = 'rgba(18, 4, 9, 0.22)';
    g.beginPath();
    g.ellipse(1.5, 5.1, 7.6, 1.8, 0.05, 0, Math.PI * 2);
    g.fill();

    // Тёплый блик по лобику и спинке носа
    g.strokeStyle = mixHex(rimHex, '#fff4e0', 0.35, 0.56);
    g.lineWidth = 0.92;
    g.beginPath();
    g.moveTo(4.2, -8.3);
    g.bezierCurveTo(-0.4, -8.9, -3.4, -7.4, stopX, stopY);
    g.lineTo(noseX + 2.2, noseY - 0.3);
    g.stroke();
    g.restore();

    // Пушистые шёрстные щёчки (самоед, сиба, хаски, мальтезе) и воздушный хохолок мальтийской болонки!
    if (isWhiteCloud || b.pattern === 'shiba' || b.pattern === 'husky') {
        g.fillStyle = isWhiteCloud ? cloudTop : creamWarm;
        g.beginPath();
        g.moveTo(4.8, 0.4);
        g.quadraticCurveTo(9.4, 2.5, 6.0, 5.1);
        g.quadraticCurveTo(3.0, 5.5, 2.0, 3.2);
        g.closePath();
        g.fill();
        if (isRareMaltese) {
            // Шёлковая белоснежная чёлка-облачко мальтезе с крошечной аметистовой искоркой в волосах
            g.fillStyle = cloudHighlight;
            g.beginPath();
            g.moveTo(-3.4, -6.7);
            g.bezierCurveTo(-2.2, -10.0, 3.8, -10.2, 5.6, -7.1);
            g.quadraticCurveTo(1.2, -5.6, -3.4, -6.7);
            g.closePath();
            g.fill();
        }
    }

    // 9г. Мягкая живая улыбка спящего пса и тончайшие точечки вибрисс-усиков (как у кота!)
    const smileUp = (isSamoyed ? 0.68 : (isRareMaltese ? 0.45 : 0.28)) + petK * 0.72;
    g.strokeStyle = 'rgba(22, 5, 10, 0.78)';
    g.lineWidth = 0.88;
    g.beginPath();
    g.moveTo(noseX + 0.7, noseY + mDrop - 0.45);
    g.bezierCurveTo(noseX + 4.0, noseY + mDrop + 0.38, -6.6, 2.55, -4.2, 1.9 - smileUp);
    g.stroke();

    // Деликатные полупрозрачные усики на мордочке (фирменная деталь уюта, роднящая пса с котом!)
    g.strokeStyle = 'rgba(255, 224, 216, 0.28)';
    g.lineWidth = 0.55;
    g.beginPath();
    g.moveTo(noseX + 3.4, noseY + 1.2); g.quadraticCurveTo(noseX + 0.8, noseY + 2.4, noseX - 1.6, noseY + 3.2);
    g.moveTo(noseX + 4.6, noseY + 1.5); g.quadraticCurveTo(noseX + 2.6, noseY + 3.0, noseX + 0.4, noseY + 4.0);
    g.stroke();

    // 9д. Глянцевая кожаная мочка носа с ноздрёй и живым влажным бликом
    g.fillStyle = b.nose;
    g.beginPath();
    g.moveTo(noseX + 2.25, noseY - 0.92);
    g.bezierCurveTo(noseX - 0.68, noseY - 0.92, noseX - 0.98, noseY + 1.28, noseX + 0.78, noseY + 1.78);
    g.quadraticCurveTo(noseX + 2.68, noseY + 1.38, noseX + 2.25, noseY - 0.92);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(0, 0, 0, 0.55)';
    g.beginPath(); g.ellipse(noseX + 1.15, noseY + 0.72, 0.55, 0.34, 0.35, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255, 242, 238, 0.78)';
    g.beginPath(); g.ellipse(noseX + 0.82, noseY - 0.36, 0.96, 0.40, -0.14, 0, Math.PI * 2); g.fill();

    // 9е. ДУШЕВНЫЕ ГЛАЗА И РЕСНИЧКИ УРОВНЯ КОТА (мирный сон / сияющий взгляд при ласке / счастливый прищур «⌒»)
    const ex = -1.65, ey = -3.42;
    if (peekAwake) {
        const halfK = lazyPeek ? 0.62 : 1.0;
        // Бархатная подводка века
        g.fillStyle = '#0c0205';
        g.beginPath();
        g.moveTo(ex - 2.35, ey + 0.08);
        g.quadraticCurveTo(ex - 0.1, ey - 1.85 * halfK, ex + 2.25, ey + 0.18);
        g.quadraticCurveTo(ex + 0.05, ey + 1.55 * halfK, ex - 2.35, ey + 0.08);
        g.closePath();
        g.fill();
        // Сияющая радужка (льдисто-голубая у хаски, тёплый янтарь у ретривера/сибы/корги, звёздно-аметистовая у 0.1% мальтезе!)
        const irisGlow = isRareMaltese ? '#c49bff' : b.eyeGlow;
        g.fillStyle = irisGlow;
        g.beginPath(); g.ellipse(ex - 0.1, ey + 0.04, 1.42, 1.18 * halfK, 0, 0, Math.PI * 2); g.fill();
        // Глубокий живой зрачок
        g.fillStyle = '#090104';
        g.beginPath(); g.ellipse(ex - 0.22, ey + 0.02, 0.78, 0.78 * halfK, 0, 0, Math.PI * 2); g.fill();
        // Двойная живая искорка света в глазу (как у кота!)
        g.fillStyle = '#fffdf5';
        g.beginPath(); g.arc(ex - 0.66, ey - 0.42 * halfK, 0.52, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255, 244, 224, 0.75)';
        g.beginPath(); g.arc(ex + 0.48, ey + 0.36 * halfK, 0.26, 0, Math.PI * 2); g.fill();
    } else if (isPetted && petK > 0.22) {
        // Блаженная счастливая дуга «⌒» благодарного пса от поглаживания
        g.strokeStyle = b.pattern === 'collie' ? mixHex(rimHex, '#ffe8d8', 0.5, 0.88) : '#180408';
        g.lineWidth = 1.32;
        g.beginPath();
        g.moveTo(ex - 2.2, ey + 0.36);
        g.quadraticCurveTo(ex, ey - 1.38, ex + 2.25, ey + 0.44);
        g.stroke();
    } else {
        // Глубокий уютный сон: нежно изогнутое сомкнутое веко с крошечными ресничками!
        const isDarkFace = b.pattern === 'collie' || b.pattern === 'spaniel';
        g.strokeStyle = b.pattern === 'collie'
            ? 'rgba(246, 206, 206, 0.74)'
            : (b.pattern === 'spaniel' ? 'rgba(22, 5, 7, 0.88)' : 'rgba(24, 5, 10, 0.86)');
        g.lineWidth = 1.22;
        g.beginPath();
        g.moveTo(ex - 2.2, ey - 0.24);
        g.quadraticCurveTo(ex - 0.05, ey + 1.18, ex + 2.18, ey - 0.14);
        g.stroke();
        // Изящная ресничка у внешнего уголка глаза
        g.lineWidth = 0.82;
        g.beginPath();
        g.moveTo(ex + 1.85, ey + 0.02);
        g.lineTo(ex + 2.65, ey - 0.32);
        g.stroke();
        // Мягкий тёплый блик по верхнему веку для бархатного объёма
        g.strokeStyle = isDarkFace ? 'rgba(255, 220, 205, 0.28)' : 'rgba(255, 236, 224, 0.32)';
        g.lineWidth = 0.68;
        g.beginPath();
        g.moveTo(ex - 1.65, ey - 0.95);
        g.quadraticCurveTo(ex + 0.15, ey - 1.48, ex + 1.75, ey - 0.82);
        g.stroke();
    }

    // 9ж. БЛИЖНЕЕ ПОРОДНОЕ УШКО С БАРХАТНЫМ ОБЪЁМОМ, ТЕНЬЮ И КОНТРОВЫМ БЛИКОМ
    if (b.ears === 'pointed') {
        drawErectEar(3.4, -6.2, 3.7, 8.4, -0.15 - perkR, 0.2, false);
    } else if (b.ears === 'samoyed') {
        drawErectEar(3.5, -6.1, 3.9, 7.6, -0.14 - perkR, 0.74, false);
    } else if (b.ears === 'corgi') {
        drawErectEar(3.8, -5.8, 4.4, 10.6, -0.12 - perkR, 0.85, false);
    } else if (b.ears === 'tipped') {
        drawErectEar(3.4, -6.0, 3.6, 8.0, -0.12 - perkR, 0.2, false);
        // Фирменный загнутый вперёд бархатный кончик ушка колли
        g.fillStyle = mixHex(b.dark, b.light, 0.32);
        g.strokeStyle = mixHex(rimHex, '#ffe6d2', 0.3, 0.55);
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(1.1, -13.3 - earPerk * 0.18);
        g.quadraticCurveTo(4.1, -13.9, 4.7, -11.0);
        g.lineTo(-0.3, -10.5);
        g.closePath();
        g.fill();
        g.stroke();
    } else if (b.ears === 'floppy') {
        // Бархатное золотистое ушко ретривера с тёплым медовым градиентом и шёлковым бликом
        g.save();
        g.translate(4.1, -6.0 - earPerk * 0.2);
        g.rotate(perkR * 0.65);
        g.fillStyle = 'rgba(16, 4, 7, 0.46)';
        g.beginPath();
        g.moveTo(-2.8, 1.2);
        g.bezierCurveTo(-3.4, 5.5, -1.7, 10.6, 1.8, 10.8);
        g.bezierCurveTo(4.8, 10.4, 5.2, 4.5, 3.1, 0.6);
        g.closePath();
        g.fill();

        if (g.createLinearGradient) {
            const eg = g.createLinearGradient(0, -1, 1.5, 10.5);
            eg.addColorStop(0, furLight);
            eg.addColorStop(0.55, furMid);
            eg.addColorStop(1, furDark);
            g.fillStyle = eg;
        } else g.fillStyle = furMid;
        g.beginPath();
        g.moveTo(-2.3, 0.4);
        g.bezierCurveTo(-0.8, -1.3, 3.2, -0.6, 4.4, 1.8);
        g.bezierCurveTo(5.5, 5.6, 4.2, 10.2, 1.1, 10.4);
        g.bezierCurveTo(-1.9, 10.1, -3.0, 5.0, -2.3, 0.4);
        g.closePath();
        g.fill();

        g.strokeStyle = mixHex(rimHex, b.light, 0.4, 0.62);
        g.lineWidth = 0.85;
        g.beginPath();
        g.moveTo(-1.6, 0.0);
        g.bezierCurveTo(1.2, -0.9, 3.9, 0.2, 4.4, 3.4);
        g.quadraticCurveTo(4.6, 7.2, 2.4, 9.6);
        g.stroke();
        g.restore();
    } else if (b.ears === 'longfloppy') {
        // Длинное шелковистое волнистое ухо шоколадного спаниеля с карамельно-медными завитками
        g.save();
        g.translate(4.2, -4.3 - earPerk * 0.18);
        g.rotate(perkR * 0.5);
        g.fillStyle = 'rgba(10, 2, 5, 0.54)';
        g.beginPath(); g.ellipse(0.8, 7.3, 4.4, 7.5, -0.06, 0, Math.PI * 2); g.fill();

        if (g.createLinearGradient) {
            const eg = g.createLinearGradient(0, -0.8, 1.2, 14.4);
            eg.addColorStop(0, furLight);
            eg.addColorStop(0.45, furMid);
            eg.addColorStop(1, furDeep);
            g.fillStyle = eg;
        } else g.fillStyle = furMid;
        g.beginPath();
        g.moveTo(-2.1, 0);
        g.bezierCurveTo(-3.4, 4.8, -3.5, 12.6, 0.8, 14.3);
        g.bezierCurveTo(5.0, 14.9, 6.2, 10.4, 4.1, 1.1);
        g.quadraticCurveTo(1.1, -1.1, -2.1, 0);
        g.closePath();
        g.fill();

        g.strokeStyle = mixHex(b.rim, b.light, 0.42, 0.62);
        g.lineWidth = 0.88;
        g.beginPath();
        g.moveTo(-0.8, 1.4); g.bezierCurveTo(-2.2, 5.2, 0.3, 8.6, -0.9, 12.8);
        g.moveTo(1.7, 1.6);  g.bezierCurveTo(0.5, 5.6, 3.1, 9.2, 1.7, 13.2);
        g.moveTo(3.4, 1.2);  g.quadraticCurveTo(5.0, 6.4, 3.6, 12.0);
        g.stroke();
        g.restore();
    } else if (b.ears === 'maltese') {
        // СТРУЯЩЕЕСЯ КОРОЛЕВСКО-ФИОЛЕТОВОЕ ШЁЛКОВОЕ УШКО БЕЛОЙ МАЛЬТИЙСКОЙ БОЛОНКИ (0.1%)!
        g.save();
        g.translate(3.9, -5.1 - earPerk * 0.2);
        g.rotate(perkR * 0.55);
        g.fillStyle = 'rgba(18, 4, 32, 0.45)';
        g.beginPath(); g.ellipse(0.5, 7.1, 4.3, 7.3, -0.05, 0, Math.PI * 2); g.fill();

        const vDeep  = b.violetDark  || '#2f0e4f';
        const vMid   = b.violetMid   || '#7c3aed';
        const vLight = b.violetLight || '#b983ff';
        const vSilk  = b.violetSilk  || '#eed9ff';
        if (g.createLinearGradient) {
            const eg = g.createLinearGradient(-0.5, -1.2, 1.6, 14.0);
            eg.addColorStop(0.0, vSilk);
            eg.addColorStop(0.22, vLight);
            eg.addColorStop(0.62, vMid);
            eg.addColorStop(1.0, vDeep);
            g.fillStyle = eg;
        } else g.fillStyle = vMid;
        // Изящный каскадный локон с мягкими перьевыми кончиками (не плоский овал!)
        g.beginPath();
        g.moveTo(-2.1, -0.4);
        g.bezierCurveTo(-3.7, 3.8, -4.0, 10.8, -0.8, 13.6);
        g.quadraticCurveTo(0.8, 14.6, 2.2, 13.7);
        g.bezierCurveTo(5.5, 11.8, 6.0, 6.4, 4.1, 0.7);
        g.quadraticCurveTo(1.1, -1.7, -2.1, -0.4);
        g.closePath();
        g.fill();

        // Переливающиеся лавандово-жемчужные шёлковые пряди ушка
        g.strokeStyle = vSilk;
        g.lineWidth = 0.85;
        g.globalAlpha = 0.82;
        g.beginPath();
        g.moveTo(-0.9, 0.6); g.bezierCurveTo(-2.2, 4.8, -1.4, 9.2, -0.4, 12.6);
        g.moveTo(1.1, 0.4);  g.bezierCurveTo(0.4, 5.0, 1.6, 9.4, 1.1, 13.0);
        g.moveTo(2.8, 1.0);  g.bezierCurveTo(4.4, 5.2, 4.0, 9.4, 2.6, 12.4);
        g.stroke();
        g.restore();
    }

    g.restore(); // конец трансформации головы
    g.restore(); // конец масштаба породы

    // 10. Живое тёплое дыхание у носика во сне + сияющие искры радости при поглаживании (и аметистово-звёздные у 0.1% мальтезе!)
    if (!still) {
        const worldNoseX = cx + (hx + (-5.3 - mLen) * hScale) * b.sx;
        const worldNoseY = cy + (hy - 0.95 * hScale) * b.sy;
        const exhale = ((t + 0.8) * 0.31) % 1;
        const exA = Math.sin(exhale * Math.PI) * 0.22;
        if (exA > 0.04 && !isPetted) {
            g.fillStyle = `rgba(255, 218, 182, ${exA.toFixed(3)})`;
            g.beginPath();
            g.arc(worldNoseX - 2 - exhale * 5, worldNoseY - 1 - exhale * 10, 0.95 + exhale * 1.0, 0, Math.PI * 2);
            g.fill();
        }
        if (isPetted) {
            const worldHeadX = cx + hx * b.sx;
            const worldHeadY = cy + hy * b.sy;
            const p01 = clamp01(petElapsed / 2700);
            const sparkX = [-10, 1, 12];
            const sparkRise = [21, 27, 19];
            const spCore = isRareMaltese ? '#f5d0fe' : '#ffe89c';
            const spRim  = isRareMaltese ? '#9333ea' : '#ff6b78';
            for (let k = 0; k < 3; k++) {
                const kp = clamp01((p01 * 1.45) - k * 0.18);
                if (kp <= 0 || kp >= 1) continue;
                const ka = Math.sin(kp * Math.PI) * 0.88;
                const kx = worldHeadX + sparkX[k] + Math.sin(kp * 5.2 + k * 2.1) * 3.2;
                const ky = worldHeadY - 12 - kp * sparkRise[k];
                radialAura(g, kx, ky, 6.4, spCore, spRim, ka * 0.55);
                g.fillStyle = isRareMaltese
                    ? `rgba(250, 236, 255, ${ka.toFixed(3)})`
                    : `rgba(255, 244, 192, ${ka.toFixed(3)})`;
                g.beginPath(); g.arc(kx, ky, 1.32, 0, Math.PI * 2); g.fill();
            }
        }
    }
}

function drawRoomCosmetics(g, now, phase, cosmOverride) {
    const cosm = cosmOverride || getRoomCosmeticsSafe();
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

// ===== ЖИВЫЕ СВИСАЮЩИЕ ЛИАНЫ НАД КУШЕТКОЙ — ДИЕГЕТИЧЕСКИЙ ПОРТАЛ В ОРАНЖЕРЕЮ =====
// Расположены с попиксельной точностью поверх каскадного плюща/эпипремнума справа над полкой (x: 710..766, y: 112..254):
// ни единой кнопки поверх окна — живые плети дышат в полумраке, а после первого расцветшего цветка
// распускают нежные росистые бутоны и светлячков-пыльцу, приглашая войти в стеклянный купол Оранжереи.
const VINE_STRANDS = [
    {
        x0: 718, y0: 125, len: 64, swayAmp: 2.3, freq: 0.72, ph: 0.2,
        leaves: [
            { u: 0.22, dx: -3.4, s: 5.6, ang: -0.46, tone: 0 },
            { u: 0.48, dx: 2.8,  s: 5.2, ang: 0.34,  tone: 1 },
            { u: 0.74, dx: -3.2, s: 6.1, ang: -0.38, tone: 2, bud: true },
            { u: 0.98, dx: 0.4,  s: 4.8, ang: 0.08,  tone: 1 }
        ]
    },
    {
        x0: 730, y0: 119, len: 108, swayAmp: 3.1, freq: 0.64, ph: 1.45,
        leaves: [
            { u: 0.16, dx: -3.2, s: 6.4, ang: -0.40, tone: 1 },
            { u: 0.34, dx: 3.5,  s: 6.0, ang: 0.36,  tone: 0 },
            { u: 0.52, dx: -3.8, s: 6.8, ang: -0.34, tone: 2, bud: true },
            { u: 0.71, dx: 3.0,  s: 5.8, ang: 0.30,  tone: 1 },
            { u: 0.87, dx: -2.6, s: 5.6, ang: -0.26, tone: 0 },
            { u: 0.99, dx: 0.3,  s: 4.9, ang: 0.05,  tone: 2 }
        ]
    },
    {
        x0: 743, y0: 118, len: 132, swayAmp: 3.6, freq: 0.58, ph: 2.8,
        leaves: [
            { u: 0.13, dx: 3.2,  s: 6.6, ang: 0.38,  tone: 2 },
            { u: 0.28, dx: -3.5, s: 6.2, ang: -0.35, tone: 0 },
            { u: 0.44, dx: 3.8,  s: 7.0, ang: 0.32,  tone: 1, bud: true },
            { u: 0.60, dx: -3.4, s: 6.5, ang: -0.30, tone: 2 },
            { u: 0.76, dx: 3.1,  s: 6.1, ang: 0.26,  tone: 0, bud: true },
            { u: 0.90, dx: -2.4, s: 5.4, ang: -0.22, tone: 1 },
            { u: 1.00, dx: 0.6,  s: 5.1, ang: 0.06,  tone: 2 }
        ]
    },
    {
        x0: 756, y0: 124, len: 112, swayAmp: 2.9, freq: 0.68, ph: 4.1,
        leaves: [
            { u: 0.18, dx: 3.4,  s: 6.0, ang: 0.42,  tone: 0 },
            { u: 0.38, dx: -3.0, s: 6.3, ang: -0.32, tone: 1 },
            { u: 0.58, dx: 3.6,  s: 6.4, ang: 0.35,  tone: 2, bud: true },
            { u: 0.78, dx: -2.8, s: 5.6, ang: -0.28, tone: 0 },
            { u: 0.97, dx: 0.8,  s: 4.7, ang: 0.12,  tone: 1 }
        ]
    }
];

function drawVineHeartLeaf(g, x, y, size, ang, darkCol, midCol, lightCol, rimCol, rimAlpha) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    // Мягкая тень листка на кирпичной кладке
    g.fillStyle = 'rgba(6, 1, 3, 0.52)';
    g.beginPath();
    g.moveTo(0, -size * 0.22 + 1.2);
    g.bezierCurveTo(-size * 0.82, -size * 0.68 + 1.2, -size * 0.86, size * 0.36 + 1.2, 0, size * 1.12 + 1.2);
    g.bezierCurveTo(size * 0.86, size * 0.36 + 1.2, size * 0.82, -size * 0.68 + 1.2, 0, -size * 0.22 + 1.2);
    g.closePath();
    g.fill();

    // Бархатное сердцевидное полотно листа
    if (g.createLinearGradient) {
        const lg = g.createLinearGradient(-size * 0.55, -size * 0.5, size * 0.5, size * 1.05);
        lg.addColorStop(0, lightCol);
        lg.addColorStop(0.48, midCol);
        lg.addColorStop(1, darkCol);
        g.fillStyle = lg;
    } else {
        g.fillStyle = midCol;
    }
    g.beginPath();
    g.moveTo(0, -size * 0.22);
    g.bezierCurveTo(-size * 0.82, -size * 0.68, -size * 0.86, size * 0.36, 0, size * 1.12);
    g.bezierCurveTo(size * 0.86, size * 0.36, size * 0.82, -size * 0.68, 0, -size * 0.22);
    g.closePath();
    g.fill();

    // Центральная жилка и тёплый контровой кант света от лампы и ночника
    g.strokeStyle = mixHex(rimCol, lightCol, 0.35, rimAlpha);
    g.lineWidth = 0.72;
    g.beginPath();
    g.moveTo(-size * 0.52, -size * 0.24);
    g.quadraticCurveTo(-size * 0.64, size * 0.32, 0, size * 1.04);
    g.stroke();

    g.strokeStyle = mixHex(lightCol, rimCol, 0.5, rimAlpha * 0.62);
    g.lineWidth = 0.55;
    g.beginPath();
    g.moveTo(0, -size * 0.14);
    g.quadraticCurveTo(-size * 0.05, size * 0.42, 0, size * 0.92);
    g.stroke();
    g.restore();
}

function drawGreenhouseVines(g, now, phase, opts) {
    const o = opts || {};
    const still = prefersStillRoom();
    const t = still ? 1.8 : now * 0.001;
    const gh = o.gh || loadGreenhouse();
    const ghOpen = o.open !== undefined ? o.open : (isGreenhouseUnlocked() || isPtsMode());
    const allEarth = o.allEarth !== undefined ? o.allEarth : gh.bloomed.length >= PLANT_KINDS.length;
    const secretAwait = o.secretAwait !== undefined ? o.secretAwait : (ghOpen && allEarth && !(gh.alienSeed && gh.alienSeed.bloomed));

    // Органичный шелест при касании (затухающий маятник по всей длине плетей)
    const vinesStart = o.vinesStart !== undefined ? o.vinesStart : roomAnim.vinesStart;
    const touchDt = Math.max(0, (now - (vinesStart || -1e9)) * 0.001);
    const rustleEnv = touchDt < 2.6 ? Math.exp(-touchDt * 1.45) * Math.sin(touchDt * 7.4) : 0;
    const touchGlow = softBell(now - (vinesStart || -1e9), 280, 420, 1200);

    // Единая живая багряно-гранатовая палитра лиан (без чужеродной зелени!):
    // тон-в-тон продолжает родные тёмно-бордовые плети на стене, так что оба слоя сливаются
    // в одно живое бархатное растение, согретое тёплым рубиново-розовым светом комнаты.
    const warmPhase = phase === 2;
    const dawnPhase = phase === 3;
    const thawPhase = phase === 1;
    const baseDark  = '#130306';
    const baseMid   = ghOpen
        ? (warmPhase ? '#471118' : dawnPhase ? '#420f24' : thawPhase ? '#400d1b' : '#3f0b14')
        : (warmPhase ? '#3a0d13' : dawnPhase ? '#350c1e' : '#330911');
    const baseLight = ghOpen
        ? (warmPhase ? '#862228' : dawnPhase ? '#7a1f3d' : thawPhase ? '#781b30' : '#761826')
        : (warmPhase ? '#66191f' : dawnPhase ? '#5c1730' : '#5b131f');
    const rimCol    = secretAwait
        ? '#e9b8ff'
        : ghOpen
            ? (warmPhase ? '#ffc288' : dawnPhase ? '#f09ac8' : thawPhase ? '#f4b4cc' : '#f26d7f')
            : (warmPhase ? '#e8966c' : dawnPhase ? '#cf7ea8' : '#c94c5e');

    const breath = still ? 0.65 : (0.55 + 0.45 * Math.sin(t * 1.45));

    g.save();

    // Деликатное тёплое рубиново-гранатовое (или аметистовое при 8/8) дыхание среди листвы — единое с комнатой!
    if (ghOpen) {
        g.save();
        g.globalCompositeOperation = 'screen';
        const auraA = (0.13 + 0.07 * breath + 0.16 * touchGlow);
        radialAura(g, 740, 178, 54,
            secretAwait ? '#d8b4fe' : (warmPhase ? '#ffbe78' : dawnPhase ? '#f08cc0' : '#ff6b80'),
            secretAwait ? '#6d28d9' : '#6e0d20',
            auraA);
        radialAura(g, 744, 224, 38,
            secretAwait ? '#f0abfc' : (warmPhase ? '#ffd49e' : '#ff98a8'),
            '#5e0b1b',
            auraA * 0.62);
        g.restore();
    } else if (touchGlow > 0.02) {
        g.save();
        g.globalCompositeOperation = 'screen';
        radialAura(g, 740, 182, 42, '#ff8694', '#6e1022', touchGlow * 0.18);
        g.restore();
    }

    // Пышная живая шапка верхних и глубинных багряных листьев — оживляет тёмные фоновые плети в единую крону
    const crownLeaves = [
        { x: 722, y: 116, s: 6.5, a: -0.60 },
        { x: 730, y: 114, s: 6.2, a: -0.26 },
        { x: 737, y: 113, s: 7.0, a: -0.05 },
        { x: 745, y: 114, s: 6.4, a: 0.24 },
        { x: 752, y: 116, s: 6.6, a: 0.48 },
        { x: 727, y: 122, s: 6.0, a: -0.30 },
        { x: 737, y: 122, s: 6.2, a: 0.04 },
        { x: 747, y: 122, s: 6.1, a: 0.28 }
    ];
    for (let c = 0; c < crownLeaves.length; c++) {
        const cl = crownLeaves[c];
        const cSway = still ? 0 : Math.sin(t * 0.9 + c * 1.1) * 0.55 + rustleEnv * 1.4;
        drawVineHeartLeaf(
            g, cl.x + cSway, cl.y, cl.s, cl.a + cSway * 0.03,
            baseDark, baseMid, baseLight, rimCol,
            ghOpen ? (0.48 + 0.18 * breath + 0.2 * touchGlow) : (0.32 + 0.18 * touchGlow)
        );
    }

    // 4 живые каскадные плети, мягко покачивающиеся в тёплом воздухе комнаты
    for (let si = 0; si < VINE_STRANDS.length; si++) {
        const st = VINE_STRANDS[si];
        const wave = (u) => {
            const nat = Math.sin(u * 4.2 + st.ph) * 2.2 * Math.sin(u * Math.PI);
            if (still) return nat + Math.sin(st.ph + u * 2.1) * st.swayAmp * 0.25 * u;
            const air = Math.sin(t * st.freq * 1.65 + st.ph - u * 1.85) * st.swayAmp
                      + Math.sin(t * 0.52 + si * 1.9 + u * 1.2) * (st.swayAmp * 0.42);
            const touch = rustleEnv * (4.8 + si * 0.55) * Math.sin(u * 2.4 + si * 0.5);
            return nat + (air + touch) * Math.pow(u, 1.22);
        };

        // Тёплая гранатовая подсветка-стебель, оживляющая и родные тёмные плети под ним
        g.strokeStyle = mixHex(baseDark, baseLight, ghOpen ? 0.62 : 0.44, 0.92);
        g.lineWidth = 1.25;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(st.x0, st.y0);
        const segs = 7;
        for (let k = 1; k <= segs; k++) {
            const u = k / segs;
            g.lineTo(st.x0 + wave(u), st.y0 + st.len * u);
        }
        g.stroke();

        // Тонкий завиток усика на самом кончике плети
        const tipX = st.x0 + wave(1);
        const tipY = st.y0 + st.len;
        g.strokeStyle = mixHex(baseLight, rimCol, ghOpen ? 0.48 : 0.26, 0.68);
        g.lineWidth = 0.78;
        g.beginPath();
        g.moveTo(tipX, tipY);
        g.bezierCurveTo(tipX + (si % 2 ? 3.2 : -3.2), tipY + 4.2, tipX + (si % 2 ? -2.2 : 2.2), tipY + 7.4, tipX + (si % 2 ? 1.2 : -1.2), tipY + 8.2);
        g.stroke();

        // Глубинные бархатно-бордовые листочки второго плана — бесшовно связывают живые плети с фоновыми лианами стены
        for (let bi = 0; bi < st.leaves.length - 1; bi++) {
            const bu = (st.leaves[bi].u + st.leaves[bi + 1].u) * 0.5;
            const bwx = wave(bu) * 0.55;
            const bdx = -st.leaves[bi].dx * 0.62;
            const bMid = mixHex(baseDark, baseMid, 0.78);
            const bTop = mixHex(baseMid, baseLight, 0.58);
            drawVineHeartLeaf(
                g, st.x0 + bwx + bdx, st.y0 + st.len * bu,
                st.leaves[bi].s * 0.86, -st.leaves[bi].ang * 0.65,
                baseDark, bMid, bTop, rimCol, ghOpen ? 0.30 : 0.20
            );
        }

        // Сердцевидные листья и живые рубиново-янтарные бутоны портала Оранжереи
        for (let li = 0; li < st.leaves.length; li++) {
            const lf = st.leaves[li];
            const wx = wave(lf.u);
            const lx = st.x0 + wx + lf.dx;
            const ly = st.y0 + st.len * lf.u;
            const flutter = still ? 0 : Math.sin(t * 1.9 + st.ph + li * 1.3) * 0.055 + rustleEnv * 0.11 * lf.u;
            const tShift = lf.tone === 2 ? 0.22 : (lf.tone === 0 ? -0.10 : 0.04);
            const lMid = tShift >= 0 ? mixHex(baseMid, baseLight, tShift) : mixHex(baseMid, baseDark, -tShift);
            const lTop = tShift >= 0 ? mixHex(baseLight, rimCol, ghOpen ? 0.26 : 0.14) : baseLight;
            const rimA = ghOpen
                ? (0.46 + 0.24 * Math.sin(t * 1.6 + si + li * 0.7) * 0.5 + 0.16 + touchGlow * 0.22)
                : (0.30 + touchGlow * 0.2);

            // Черешок
            g.strokeStyle = mixHex(baseMid, rimCol, 0.24, 0.78);
            g.lineWidth = 0.78;
            g.beginPath();
            g.moveTo(st.x0 + wx, ly - 1.4);
            g.lineTo(lx, ly);
            g.stroke();

            drawVineHeartLeaf(g, lx, ly, lf.s * 1.05, lf.ang + flutter + wx * 0.025, baseDark, lMid, lTop, rimCol, Math.min(0.92, rimA));

            // Когда Оранжерея открыта — среди багряной листвы нежно дышат рубиново-жемчужные бутоны!
            if (ghOpen && lf.bud) {
                const bx = lx + (lf.dx < 0 ? -2.2 : 2.2);
                const by = ly + lf.s * 0.42;
                const bPulse = still ? 0.8 : (0.65 + 0.35 * Math.sin(t * 2.1 + si * 1.7 + li));
                const isSecretBud = secretAwait && (si === 2 && li === 2);
                const budCore = isSecretBud ? '#f5d0fe' : (warmPhase ? '#ffe8b8' : '#ffd8de');
                const budGlow = isSecretBud ? '#c084fc' : (warmPhase ? '#f59e0b' : '#f43f5e');
                radialAura(g, bx, by, 5.6, budCore, budGlow, (0.34 + touchGlow * 0.28) * bPulse);
                g.fillStyle = mixHex(budCore, '#fff5f7', 0.38, 0.92);
                g.beginPath();
                g.ellipse(bx, by, 1.45, 2.05, lf.ang * 0.5, 0, Math.PI * 2);
                g.fill();
            }
        }
    }

    // Парящие рубиново-янтарные искорки пыльцы вокруг живых лиан — мягкий знак живого портала в Оранжерею
    if (ghOpen) {
        const moteCount = secretAwait ? 6 : 4;
        for (let m = 0; m < moteCount; m++) {
            const seed = m * 1.93 + 0.6;
            const cyc = still ? ((m + 0.5) / moteCount) : ((t * (0.14 + (m % 3) * 0.03) + m * 0.27) % 1);
            const ma = Math.sin(cyc * Math.PI) * (0.58 + touchGlow * 0.32);
            if (ma < 0.05) continue;
            const mx = 720 + ((m * 13) % 40) + Math.sin(t * 1.15 + seed) * 5.2;
            const my = 246 - cyc * 124;
            const isVioletMote = secretAwait && (m % 2 === 0);
            radialAura(g, mx, my, 4.8,
                isVioletMote ? '#f3e8ff' : '#ffe4cc',
                isVioletMote ? '#a855f7' : '#e11d48',
                ma * 0.52);
            g.fillStyle = isVioletMote
                ? `rgba(245, 224, 255, ${ma.toFixed(3)})`
                : `rgba(255, 224, 226, ${ma.toFixed(3)})`;
            g.beginPath();
            g.arc(mx, my, 0.95, 0, Math.PI * 2);
            g.fill();
        }
    }

    g.restore();
}

// ===== ВРАЩЕНИЕ СЦЕНЫ И ПЛАВНЫЙ ТАЧ-СКРОЛЛ ВНУТРИ FULLSCREEN (±90° / 180°) =====
// Когда #station-scene повёрнута на ±90° на портретном iPhone/Android, нативный overflow-y браузера
// слушает физическую ось Y экрана вместо локальной оси Y оверлея. Эти хелперы точно переводят касания
// и жесты прокрутки в локальную систему координат любого окна (VHS, Оранжерея, Приёмник, Снимок, Дирижабль).
function getSomaSceneRotationDeg(el) {
    if (!roomAnim.isFullscreen && !roomAnim.fsClosing) return 0;
    if (el && typeof document !== 'undefined') {
        const scene = document.getElementById('station-scene');
        if (scene && typeof scene.contains === 'function' && !scene.contains(el)) return 0;
    }
    return Number(roomAnim.fsLastDeg) || 0;
}

function somaClientToLocal(el, clientX, clientY) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return { x: 0, y: 0, w: 1, h: 1 };
    const rect = el.getBoundingClientRect();
    const deg = getSomaSceneRotationDeg(el);
    const localW = Number(el.offsetWidth) || ((Math.abs(deg) === 90) ? rect.height : rect.width) || 1;
    const localH = Number(el.offsetHeight) || ((Math.abs(deg) === 90) ? rect.width : rect.height) || 1;
    if (!deg) {
        return {
            x: ((clientX - rect.left) / (rect.width || 1)) * localW,
            y: ((clientY - rect.top) / (rect.height || 1)) * localH,
            w: localW,
            h: localH
        };
    }
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // Обратный поворот (-deg) + учёт возможного scale
    const unrotW = Math.abs(deg) === 90 ? rect.height : rect.width;
    const unrotH = Math.abs(deg) === 90 ? rect.width : rect.height;
    const sx = (unrotW || localW) / localW;
    const sy = (unrotH || localH) / localH;
    const lx = (dx * cos + dy * sin) / (sx || 1) + localW * 0.5;
    const ly = (-dx * sin + dy * cos) / (sy || 1) + localH * 0.5;
    return { x: lx, y: ly, w: localW, h: localH };
}

function somaScreenDeltaToLocal(deg, dx, dy) {
    if (!deg) return { lx: dx, ly: dy };
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
        lx: dx * cos + dy * sin,
        ly: -dx * sin + dy * cos
    };
}

function bindSomaSceneScroll(el) {
    if (!el || el.__somaScrollBound || typeof el.addEventListener !== 'function') return el;
    el.__somaScrollBound = true;
    if (typeof el.setAttribute === 'function') el.setAttribute('data-soma-scroll', '1');

    let activeId = null;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let totalMove = 0;
    let dragging = false;
    let velY = 0;
    let rafId = 0;
    let suppressClickUntil = 0;

    const stopInertia = () => {
        if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
        rafId = 0;
        velY = 0;
    };

    const canScrollY = () => (el.scrollHeight - el.clientHeight) > 1;

    const startInertia = () => {
        if (typeof requestAnimationFrame !== 'function' || Math.abs(velY) < 0.08) return;
        let prev = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const tick = (ts) => {
            const now = ts || Date.now();
            const dt = Math.min(34, Math.max(8, now - prev));
            prev = now;
            const before = el.scrollTop;
            el.scrollTop = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, before + velY * dt));
            velY *= Math.pow(0.92, dt / 16);
            if (Math.abs(velY) < 0.04 || Math.abs(el.scrollTop - before) < 0.1) {
                rafId = 0;
                return;
            }
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
    };

    // Touch events — надёжно работают в iOS Safari, Telegram WebView и Android Chrome при rotate(±90deg / 180deg)
    el.addEventListener('touchstart', (ev) => {
        const deg = getSomaSceneRotationDeg(el);
        if (!deg || !ev.touches || ev.touches.length !== 1) return;
        stopInertia();
        const t = ev.touches[0];
        activeId = t.identifier;
        lastX = t.clientX;
        lastY = t.clientY;
        lastT = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        totalMove = 0;
        dragging = false;
    }, { passive: true });

    el.addEventListener('touchmove', (ev) => {
        const deg = getSomaSceneRotationDeg(el);
        if (!deg || activeId === null || !ev.touches) return;
        let t = null;
        for (let i = 0; i < ev.touches.length; i++) {
            if (ev.touches[i].identifier === activeId) { t = ev.touches[i]; break; }
        }
        if (!t) return;
        const dx = t.clientX - lastX;
        const dy = t.clientY - lastY;
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const dt = Math.max(6, now - lastT);
        lastX = t.clientX;
        lastY = t.clientY;
        lastT = now;

        const { ly } = somaScreenDeltaToLocal(deg, dx, dy);
        totalMove += Math.hypot(dx, dy);
        if (!dragging && totalMove > 6) dragging = true;
        if (!dragging) return;

        if (canScrollY()) {
            const deltaScroll = -ly;
            const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
            el.scrollTop = Math.max(0, Math.min(maxScroll, el.scrollTop + deltaScroll));
            const instV = deltaScroll / dt;
            velY = velY * 0.45 + instV * 0.55;
        }
        if (ev.cancelable) ev.preventDefault();
        ev.stopPropagation();
    }, { passive: false });

    const finishTouch = () => {
        if (activeId === null) return;
        const wasDrag = dragging;
        activeId = null;
        dragging = false;
        if (wasDrag) {
            suppressClickUntil = Date.now() + 260;
            startInertia();
        }
    };
    el.addEventListener('touchend', finishTouch, { passive: true });
    el.addEventListener('touchcancel', finishTouch, { passive: true });

    // Подавляем случайный клик по кассете сразу после перетягивания списка, но пропускаем чистые тапы!
    el.addEventListener('click', (ev) => {
        if (suppressClickUntil && Date.now() < suppressClickUntil) {
            suppressClickUntil = 0;
            ev.preventDefault();
            ev.stopPropagation();
        }
    }, true);

    return el;
}

if (typeof window !== 'undefined') {
    window.getSomaSceneRotationDeg = getSomaSceneRotationDeg;
    window.somaClientToLocal = somaClientToLocal;
    window.somaScreenDeltaToLocal = somaScreenDeltaToLocal;
    window.bindSomaSceneScroll = bindSomaSceneScroll;
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
    drawGreenhouseVines(g, now, phase);
    drawCassetteDeck(now);

    // Мягкое тёплое дыхание ламповой шкалы приёмника RX-88 (при касании и во время звучания музыки!)
    const rxPlaying = !!(typeof window !== 'undefined' && window.SOMA_RECEIVER
        && typeof window.SOMA_RECEIVER.isPlaying === 'function' && window.SOMA_RECEIVER.isPlaying());
    const rxEnergy = rxPlaying && typeof window.SOMA_RECEIVER.getEnergy === 'function'
        ? clamp01(window.SOMA_RECEIVER.getEnergy())
        : 0;
    const dialPower = Math.max(radGlow, rxPlaying ? (0.58 + rxEnergy * 0.42) : 0);
    if (dialPower > 0.02) {
        g.save();
        g.globalCompositeOperation = 'screen';
        radialAura(g, 672, 224, rxPlaying ? 46 : 36, '#ffb27a', '#c8203c', dialPower * (rxPlaying ? 0.24 : 0.18));
        if (rxPlaying) {
            // Живые тёплые ламповые огоньки шкалы на полке — в такт звучащей музыке!
            for (let bi = 0; bi < 7; bi++) {
                const bx = 656 + bi * 5.2;
                const bh = 1.6 + (prefersStillRoom()
                    ? 1.8
                    : (0.45 + 0.55 * Math.abs(Math.sin(now * 0.0046 + bi * 1.15))) * (1.8 + rxEnergy * 3.4));
                g.fillStyle = bi === 3
                    ? `rgba(255, 224, 152, ${(0.58 + rxEnergy * 0.34).toFixed(3)})`
                    : `rgba(255, 134, 112, ${(0.38 + rxEnergy * 0.36).toFixed(3)})`;
                g.fillRect(bx, 225.5 - bh, 2.2, bh);
            }
        }
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
        potSkin: activeRoomPotSkin(cosm.pot || '', roomAnim.spec)
    });
}

function stationLoop(now) {
    const view = typeof document !== 'undefined' && document.getElementById('view-room');
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
    const view = typeof document !== 'undefined' && document.getElementById('view-room');
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
    if (typeof window !== 'undefined' && typeof window.restoreSomaScroll === 'function') {
        window.restoreSomaScroll();
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
    syncAllRoomOverlays();
    ensureStationLoop();
}

function syncAllRoomOverlays() {
    if (typeof window === 'undefined') return;
    if (window.SOMA_RECEIVER && typeof window.SOMA_RECEIVER.syncMount === 'function') window.SOMA_RECEIVER.syncMount();
    if (window.SOMA_VHS && typeof window.SOMA_VHS.syncMount === 'function') window.SOMA_VHS.syncMount();
    if (window.SOMA_SHARE && typeof window.SOMA_SHARE.syncMount === 'function') window.SOMA_SHARE.syncMount();
    if (window.SOMA_GREENHOUSE && typeof window.SOMA_GREENHOUSE.remount === 'function') window.SOMA_GREENHOUSE.remount();
    if (window.SOMA_BLIMP && typeof window.SOMA_BLIMP.remount === 'function') window.SOMA_BLIMP.remount();
    if (typeof mountPagerModalForCurrentMode === 'function' && typeof document !== 'undefined' && document.getElementById('pager-overlay')) {
        mountPagerModalForCurrentMode();
    }
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
            syncAllRoomOverlays();
            ensureStationLoop();
        };
        roomAnim.fsAnimTimer = setTimeout(finishClose, 530);
        return;
    }

    roomAnim.fsClosing = false;
    roomAnim.fsLastDeg = 0;
    restoreRoomFromPortal(room, scene);
    syncAllRoomOverlays();
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
    } else if (obj === 'vines') {
        // Нежный ботанический шелест живых лиан и хрустальный перезвон входа в Оранжерею
        if (typeof noise === 'function') noise(0.06, 0.014, 0, 1650);
        tone(523.25, 0.34, 'sine', 0.016, 0.02, 587.33);
        tone(659.25, 0.42, 'sine', 0.014, 0.10, 783.99);
        tone(987.77, 0.50, 'sine', 0.010, 0.19);
    }
}

function stageNoteForPlayer(spec, stage, revealKnown) {
    if (spec && spec.isAlien) {
        if (stage < 0) return nextRoomLine('pot_alien', EMPTY_POT_LINES.alien);
        if (stage >= 5) return (spec.alien && spec.alien.note) || ALIEN_KINDS[0].note;
        return ALIEN_STAGE_NOTES[Math.max(0, Math.min(4, stage))];
    }
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
        modeLabel = 'NEEOSOMA // TRM-01';
        line = ROOM_LINES.terminal;
    } else if (obj === 'radio') {
        roomAnim.radioStart = now;
        roomAnim.contextPanel = '';
        const rx = typeof window !== 'undefined' ? window.SOMA_RECEIVER : null;
        const rxTrack = rx && typeof rx.getCurrentTrack === 'function' ? rx.getCurrentTrack() : null;
        const rxOn = !!(rx && typeof rx.isPlaying === 'function' && rx.isPlaying());
        modeLabel = rxTrack && rxTrack.freq ? `NEEOSOMA // AV-88 · ${rxTrack.freq} FM` : 'NEEOSOMA // AV-88';
        line = rxOn && rxTrack
            ? `В эфире «${rxTrack.title}» — тёплый ламповый сигнал мягко наполняет станцию.`
            : ROOM_LINES.radioOff;
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
        if ((now - roomAnim.deckStart) > 2850) {
            roomAnim.deckStart = now;
            playObjectTone('shelf');
        }
        const tapes = loadCassettes();
        if (tapes.length) {
            const current = tapes.find(c => c.id === roomAnim.activeCassetteId) || tapes[0];
            roomAnim.activeCassetteId = current.id;
            modeLabel = `VHS #${formatCassetteNum(current.num)} · ${current.date}`;
            line = `«${current.text}»`;
        } else {
            modeLabel = 'NEEOSOMA // VTR-90 · ВИДЕОАРХИВ';
            line = nextRoomLine('shelf', ROOM_LINES.shelf);
        }
        // Открываем ламповый видеомагнитофон NEEOSOMA // VTR-90 прямо поверх сцены (без выхода из Fullscreen!)
        if (typeof window !== 'undefined' && window.SOMA_VHS && typeof window.SOMA_VHS.open === 'function') {
            roomAnim.customMode = modeLabel;
            roomAnim.customEntry = line;
            renderRoom();
            window.SOMA_VHS.open(roomAnim.activeCassetteId || '');
            return;
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
    } else if (obj === 'vines') {
        roomAnim.contextPanel = '';
        roomAnim.vinesStart = now;
        playObjectTone('vines');
        const unlocked = isGreenhouseUnlocked();
        const ptsAllow = !unlocked && isPtsMode();
        if (unlocked || ptsAllow) {
            modeLabel = 'ЖУРНАЛ // ОРАНЖЕРЕЯ';
            line = nextRoomLine('vinesOpen', ROOM_LINES.vinesOpen);
            roomAnim.customMode = modeLabel;
            roomAnim.customEntry = line;
            if (roomAnim.isFullscreen) bumpFullscreenHud();
            const opened = openGreenhouse(unlocked ? {} : { ptsDemo: true });
            if (opened) {
                renderRoom();
                return;
            }
        } else {
            modeLabel = 'ЖУРНАЛ // ЛИАНЫ';
            line = nextRoomLine('vines', ROOM_LINES.vines);
            if (roomAnim.isFullscreen) {
                bumpFullscreenHud();
                showFullscreenCaption(line);
                roomAnim.customMode = modeLabel;
                roomAnim.customEntry = line;
                return;
            }
        }
    } else if (obj === 'bed') {
        roomAnim.contextPanel = '';
        if ((now - roomAnim.nightRStart) > 900) roomAnim.nightRStart = now;
        const cosm = getRoomCosmeticsSafe();
        if (cosm.cat) {
            roomAnim.catPetStart = now;
            const myCat = activeCatSpec();
            const cName = typeof getPetName === 'function' ? getPetName('cat') : '';
            const dName = (cosm.dog && typeof getPetName === 'function') ? getPetName('dog') : '';
            modeLabel = myCat.rare
                ? `ЖУРНАЛ // ✦ ${myCat.coat.name.toUpperCase()} (0.1%)`
                : `ЖУРНАЛ // ${myCat.coat.name.toUpperCase()}`;
            const catLines = cName
                ? (myCat.rare
                    ? [
                        `${cName} приподнял голову на ваш голос: золотой полумесяц во лбу мягко вспыхнул, и он тихо замурчал под ладонью.`,
                        `${cName} — ваш полуночный хранитель с сияющим полумесяцем — блаженно зажмурился и согрел край пледа тёплым мурчанием.`
                    ]
                    : [
                        `${cName} приподнял голову, узнал ваше прикосновение, блеснул глазами и тепло замурчал под ладонью.`,
                        `${cName} (${myCat.coat.short} хранитель) сладко зажмурился, повёл хвостом и согрел край пледа.`
                    ])
                : (myCat.rare
                    ? [
                        'Ваш редчайший чёрный кот (шанс 0.1%!) приподнял голову: золотой полумесяц во лбу мягко вспыхнул, и он тихо замурчал под ладонью.',
                        'Обсидианово-чёрный хранитель с сияющим полумесяцем во лбу блаженно зажмурился и согрел край пледа тёплым мурчанием.'
                    ]
                    : [
                        `Ваш ${myCat.coat.short} кот приподнял голову, блеснул глазами и тепло замурчал под ладонью.`,
                        `Тёплый клубок (${myCat.summary.toLowerCase()}) сладко зажмурился, повёл хвостом и согрел край пледа.`
                    ]);
            if (cosm.dog) {
                const myDog = activeDogSpec();
                const dogRef = dName ? `с другом на ковре — ${dName}` : `с другом на ковре (${myDog.breed.short})`;
                catLines.push(`${cName || `Ваш ${myCat.coat.short} кот`} лениво переглянулся ${dogRef} — в комнате двойное живое тепло.`);
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
        const myDog = activeDogSpec();
        const dName = typeof getPetName === 'function' ? getPetName('dog') : '';
        const cName = (cosm.cat && typeof getPetName === 'function') ? getPetName('cat') : '';
        modeLabel = myDog.rare
            ? `ЖУРНАЛ // ✦ ${myDog.breed.name.toUpperCase()} (0.1%)`
            : `ЖУРНАЛ // ${myDog.breed.name.toUpperCase()}`;
        const dogLines = dName
            ? (myDog.rare
                ? [
                    `${dName} сонно дрогнула шелковистыми фиолетовыми ушками на ваше прикосновение и мягко взмахнула фиолетовым хвостом сквозь дрёму!`,
                    `${dName} — белоснежное чудо с фиолетовыми ушками — блаженно зажмурилась от ласки, ещё уютнее подогнув лапки на персидском коврике.`
                ]
                : [
                    `${dName} сонно приподнял голову, ткнулся тёплым носом в вашу ладонь и счастливо завилял хвостом сквозь дрёму!`,
                    `${dName} (${myDog.breed.name.toLowerCase()}) блаженно зажмурился от ласки и ещё уютнее подогнул тёплые лапки на персидском коврике у пледа.`
                ])
            : (myDog.rare
                ? [
                    `Ваша редчайшая Белая Юна (шанс 0.1%!) сонно дрогнула шелковистыми фиолетовыми ушками и мягко взмахнула фиолетовым хвостом сквозь дрёму!`,
                    `Белоснежное чудо с фиолетовыми ушками и фиолетовым хвостом блаженно зажмурилось от ласки, ещё уютнее подогнув лапки на персидском коврике.`
                ]
                : [
                    `Ваш ${myDog.breed.short} сонно приподнял голову, ткнулся тёплым носом в ладонь и счастливо завилял хвостом сквозь дрёму!`,
                    `Верный хранитель (${myDog.breed.name.toLowerCase()}) блаженно зажмурился от ласки и ещё уютнее подогнул тёплые лапки на персидском коврике у пледа.`
                ]);
        if (cosm.cat) {
            const myCat = activeCatSpec();
            const catRef = cName || `${myCat.coat.short} кот`;
            dogLines.push(`${dName || `Ваш ${myDog.breed.short}`} сладко дремлет на коврике у пледа, а рядом на кушетке тихо мурчит ${catRef} — родство двух живых сердец.`);
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
    // Терминал открывает тренажёр в основном экране, а приёмник RX-88 открывается ПРЯМО поверх комнаты, НЕ выбивая из Fullscreen!
    if (obj === 'terminal' && roomAnim.isFullscreen) {
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

}

function getLocalMyPostIdsSafe() {
    if (typeof getMyPostIds === 'function') {
        try { return getMyPostIds().map(String); } catch (_) {}
    }
    try {
        const arr = JSON.parse(lsGet('soma_my_posts') || '[]');
        return Array.isArray(arr) ? arr.map(String) : [];
    } catch (_) { return []; }
}

function isOwnPostId(postId) {
    const id = String(postId || '').trim();
    if (!id) return false;
    return getLocalMyPostIdsSafe().includes(id);
}

function loadRawInboxWhispers() {
    try {
        const arr = JSON.parse(lsGet('soma_inbox_whispers') || '[]');
        return Array.isArray(arr) ? arr.filter(x => x && typeof x === 'object' && x.id && x.text) : [];
    } catch (_) { return []; }
}

function saveRawInboxWhispers(list) {
    lsSet('soma_inbox_whispers', JSON.stringify((Array.isArray(list) ? list : []).slice(0, 60)));
}

// Возвращает все непрочитанные входящие «Шёпоты», пришедшие на посты игрока (доступно с 1-го дня даже при 0 тепла!)
function getPendingInboxWhispers() {
    const handled = getHandledWhispers();
    return loadRawInboxWhispers().filter(w => !handled[w.id] && (!w.status || w.status === 'pending'));
}

// Добавляет входящий «Шёпот» в очередь пейджера (при синхронизации из облака или локально)
function receiveIncomingWhisperLocal(whisperObj) {
    if (!whisperObj || typeof whisperObj !== 'object') return null;
    const check = validateWhisperText(whisperObj.text);
    if (!check.ok) return null;
    const id = String(whisperObj.id || ('w_in_' + Date.now() + '_' + Math.floor(Math.random() * 900 + 100)));
    const handled = getHandledWhispers();
    if (handled[id]) return null;
    const item = {
        id,
        post_id: String(whisperObj.post_id || 'p_local'),
        post_tag: String(whisperObj.post_tag || 'ЛИЧНАЯ БОЛЬ').slice(0, 32),
        post_preview: String(whisperObj.post_preview || '').replace(/\s+/g, ' ').trim().slice(0, 140),
        text: check.value,
        created_at: whisperObj.created_at || new Date().toISOString(),
        status: 'pending'
    };
    const existing = loadRawInboxWhispers();
    if (!existing.some(x => x.id === id)) {
        saveRawInboxWhispers([item, ...existing]);
        playObjectTone('pager');
        }
    if (roomAnim.pagerModalOpen) renderPagerModal();
    return item;
}

// Игрок выбирает «📼 ЗАПИСАТЬ НА КАССЕТУ» для пришедшего ему «Шёпота»
async function persistWhisperStatus(id, status) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return { ok: true };
    try {
        const { data, error } = await supabaseClient.from('soma_whispers')
            .update({ status }).eq('id', id).select('id');
        if (error || !data || data.length !== 1) throw new Error('Status not saved');
        return { ok: true };
    } catch (_) {
        roomAnim.pagerModalError = 'Не удалось подтвердить действие. Попробуйте ещё раз.';
        if (roomAnim.pagerModalOpen) renderPagerModal();
        return { ok: false, error: roomAnim.pagerModalError };
    }
}

function isWhisperSafetyLive() {
    return typeof window !== 'undefined' && !!window.SOMA_CONFIG
        && window.SOMA_CONFIG.WHISPER_SAFETY_LIVE === true;
}

async function whisperSafetyRpc(name, args) {
    if (!isWhisperSafetyLive()) return { ok: false, error: 'Защита канала ещё не подключена.' };
    if (roomAnim.pagerSafetyBusy) return { ok: false, error: 'Предыдущее действие ещё выполняется.' };
    roomAnim.pagerSafetyBusy = true;
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) throw new Error();
        const { data, error } = await supabaseClient.rpc(name, args);
        if (error) throw new Error();
        return { ok: true, data };
    } catch (_) {
        return { ok: false, error: 'Сервер не подтвердил действие. Проверьте соединение и попробуйте позже.'
            + (name === 'report_soma_whisper' ? ' Лимит: пять новых жалоб в сутки.' : '') };
    } finally { roomAnim.pagerSafetyBusy = false; }
}

async function reportIncomingWhisper(id, reason) {
    if (!['spam', 'harassment', 'unsafe', 'other'].includes(reason)) return { ok: false, error: 'Выберите причину жалобы.' };
    const result = await whisperSafetyRpc('report_soma_whisper', { p_whisper_id: String(id), p_reason: reason });
    if (result.ok && typeof result.data !== 'boolean') return { ok: false, error: 'Не удалось подтвердить запись жалобы.' };
    if (result.ok) {
        roomAnim.pagerSafetyTarget = null;
        roomAnim.pagerModalNotice = result.data
            ? 'Жалоба записана для ручного разбора владельцем. Срок не гарантирован. Блокировка — отдельно.'
            : 'Жалоба на это сообщение уже записана.';
    }
    return result;
}

async function blockIncomingWhisper(id) {
    const result = await whisperSafetyRpc('block_soma_whisper_sender', { p_whisper_id: String(id) });
    if (result.ok && (!Array.isArray(result.data) || !result.data.every(x => typeof x === 'string'))) {
        return { ok: false, error: 'Сервер вернул неподдерживаемый ответ. Обновите входящие.' };
    }
    if (result.ok) {
        const removed = new Set(result.data);
        result.data.forEach(wid => markWhisperHandled(wid, 'dismissed'));
        saveRawInboxWhispers(loadRawInboxWhispers().filter(w => !removed.has(w.id)));
        roomAnim.pagerSafetyTarget = null;
        roomAnim.pagerModalNotice = 'Аккаунт заблокирован, его ожидающие шёпоты убраны. Кассеты сохранены. Другой аккаунт блокировка не охватывает.';
        }
    return result;
}

async function loadWhisperBlocks() {
    const result = await whisperSafetyRpc('my_soma_whisper_blocks');
    if (result.ok && Array.isArray(result.data)) {
        roomAnim.pagerBlockList = result.data.filter(x => x && typeof x.anchor_id === 'string')
            .map(x => ({ anchor_id: x.anchor_id, created_at: x.created_at }));
    } else if (result.ok) return { ok: false, error: 'Не удалось прочитать список блокировок.' };
    return result;
}

async function unblockWhisperSender(anchorId) {
    const result = await whisperSafetyRpc('unblock_soma_whisper_sender', { p_anchor_id: String(anchorId) });
    if (result.ok && typeof result.data !== 'boolean') return { ok: false, error: 'Не удалось подтвердить снятие блокировки.' };
    if (result.ok) {
        roomAnim.pagerBlockList = (roomAnim.pagerBlockList || []).filter(x => x.anchor_id !== anchorId);
        roomAnim.pagerModalNotice = 'Блокировка снята. Старые сообщения не возвращаются.';
    }
    return result;
}

async function acceptIncomingWhisper(whisperId) {
    const id = String(whisperId || '').trim();
    const pending = getPendingInboxWhispers();
    const w = pending.find(x => x.id === id);
    if (!w) return { ok: false, error: 'Шёпот уже обработан.' };

    const cloud = await persistWhisperStatus(w.id, 'saved');
    if (!cloud.ok) return cloud;
    const cas = saveWhisperCassette(w.text, undefined, { id: 'cas_' + w.id });
    markWhisperHandled(w.id, 'saved');
    trackFirstSignalEvent('cassette_saved');
    roomAnim.activeCassetteId = cas ? cas.id : roomAnim.activeCassetteId;
    roomAnim.cassettePlaying = true;
    roomAnim.cassetteStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const numStr = cas ? formatCassetteNum(cas.num) : '001';
    roomAnim.pagerModalNotice = `✓ Тёплый «Шёпот» записан на кассету #${numStr} в ваш магнитофон VTR-90! Отправителю ушёл благодарный импульс.`;
    roomAnim.customMode = `МАГНИТОФОН // ЗАПИСАНА КАССЕТА #${numStr}`;
    roomAnim.customEntry = `«${w.text}»`;
    playObjectTone('deck');
    try { Telegram.WebApp.HapticFeedback.notificationOccurred('success'); } catch (_) {}
    renderRoom();
    if (roomAnim.pagerModalOpen) renderPagerModal();
    return { ok: true, cassette: cas, whisper: w };
}

// Игрок выбирает «◌ ОТПУСТИТЬ В ЭФИР» (не сохранять входящий «Шёпот» на кассету)
async function dismissIncomingWhisper(whisperId) {
    const id = String(whisperId || '').trim();
    const pending = getPendingInboxWhispers();
    const w = pending.find(x => x.id === id);
    if (!w) return { ok: false, error: 'Шёпот уже обработан.' };

    const cloud = await persistWhisperStatus(w.id, 'dismissed');
    if (!cloud.ok) return cloud;
    markWhisperHandled(w.id, 'dismissed');

    roomAnim.pagerModalNotice = '◌ Сигнал прочитан и бережно отпущен в ночной эфир без записи на кассету.';
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    if (roomAnim.pagerModalOpen) renderPagerModal();
    return { ok: true, whisper: w };
}

// Отправка анонимного «Шёпота» (13..333 симв.) автору чужого поста через пейджер
async function sendWhisperToPost(postObj, rawText, opts) {
    if (roomAnim.whisperSending) return { ok: false, code: 'busy', error: 'Предыдущий шёпот ещё отправляется.' };
    roomAnim.whisperSending = true;
    try { return await sendWhisperToPostOnce(postObj, rawText, opts); }
    finally { roomAnim.whisperSending = false; }
}

async function sendWhisperToPostOnce(postObj, rawText, opts) {
    const o = (opts && typeof opts === 'object') ? opts : {};
    if (postObj && (postObj.isDemo || String(postObj.id || '').startsWith('demo_'))) {
        return { ok: false, code: 'demo_post', error: 'Демонстрационному сигналу нельзя отправить шёпот.' };
    }
    const warmthNow = typeof player !== 'undefined' && player && Number.isFinite(Number(player.warmth))
        ? Number(player.warmth)
        : (Number(roomAnim.warmth) || 0);
    const ledger = loadWarmthLedger(o.today);
    const adm = whisperAdmission(warmthNow, ledger);

    if (typeof window !== 'undefined' && window.SOMA_CONFIG && !adm.live && !o.skipCloud) {
        return { ok: false, code: 'channel_disabled', error: 'Канал пока выключен.' };
    }
    if (!adm.admitted) {
        return {
            ok: false,
            code: 'locked',
            error: 'Прочитайте короткие правила перед первым шёпотом.'
        };
    }

    const postId = String((postObj && postObj.id) || '').trim();
    if (!postId) {
        return { ok: false, code: 'invalid_post', error: 'Выберите историю из эфира.' };
    }
    if (isOwnPostId(postId)) {
        return { ok: false, code: 'own_post', error: 'Нельзя отправить «Шёпот» на собственный сигнал.' };
    }
    if (hasWhisperedToPost(postId)) {
        return { ok: false, code: 'already_whispered', error: 'На эту историю вы уже ответили. Один шёпот на пост.' };
    }
    if (ledger.whisperSentToday >= PROGRESSION_RULES.DAILY_WHISPER_SEND_CAP) {
        return {
            ok: false,
            code: 'daily_cap',
            error: `Лимит эфира: не более ${PROGRESSION_RULES.DAILY_WHISPER_SEND_CAP} «Шёпотов» в сутки.`
        };
    }

    const check = validateWhisperText(rawText);
    if (!check.ok) {
        return { ok: false, code: 'invalid_text', error: check.error };
    }

    if (!o.skipCloud && (typeof supabaseClient === 'undefined' || !supabaseClient)) {
        return { ok: false, code: 'network_error', error: 'Нет соединения с каналом. Шёпот не отправлен — попробуйте позже.' };
    }

    const senderUid = String((typeof player !== 'undefined' && player && player.uid) || 'u_local0000');
    const wRow = {
        id: 'w_' + Date.now() + '_' + Math.floor(Math.random() * 9000 + 1000),
        post_id: postId,
        post_tag: String((postObj && postObj.tag) || 'ЛИЧНАЯ БОЛЬ').slice(0, 32),
        post_preview: String((postObj && postObj.text) || '').replace(/\s+/g, ' ').trim().slice(0, 140),
        sender_uid: senderUid,
        text: check.value,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient && !o.skipCloud) {
            const { error } = await supabaseClient.from('soma_whispers').insert([wRow]);
            if (error) {
                if (String(error.code) === '23505') {
                    rememberWhisperedPost(postId);
                    return { ok: false, code: 'already_whispered', error: 'Вы уже поддержали этого человека (1 шёпот на 1 сигнал).' };
                }
                return { ok: false, code: 'network_error', error: 'Эфир временно недоступен: ' + (error.message || 'ошибка сети') };
            }
        }
    } catch (e) {
        if (!o.skipCloud) {
            return { ok: false, code: 'network_error', error: 'Эфир временно недоступен.' };
        }
    }

    rememberWhisperedPost(postId);
    const sentRes = recordWhisperSent(o.today);
    const firstSprout = sentRes.ledger.whispersSent === 1;
    trackFirstSignalEvent('send_success');
    completeFirstSession('reply');
    if (typeof window !== 'undefined' && typeof window.refreshStationRitual === 'function') {
        try { window.refreshStationRitual(true); } catch (_) {}
    }

    if (typeof player !== 'undefined' && player) {
        if (typeof updateCloudProfile === 'function') {
            try { updateCloudProfile(); } catch (_) {}
        }
        if (typeof updateHeader === 'function') {
            try { updateHeader(); } catch (_) {}
        }
    }

    roomAnim.pagerComposingPostId = '';
    roomAnim.pagerRequestedPostId = '';
    roomAnim.pagerDraftText = '';
    roomAnim.pagerModalError = '';
    roomAnim.pagerModalNotice = firstSprout
        ? `✦ Ваш первый «Шёпот» отправлен живому человеку! В горшке вашей комнаты проснулся живой росток!`
        : `✦ Ваши слова отправлены на пейджер автора. Когда он сохранит его на кассету, вам вернётся +${PROGRESSION_RULES.WHISPER_ACK_WARMTH} Тепла!`;

    if (firstSprout) {
        roomAnim.customMode = 'ШЁПОТ // ПРОБУЖДЕНИЕ РОСТКА';
        roomAnim.customEntry = 'Вы передали свои слова другому человеку — в сосуде вашей комнаты проснулся первый росток. Ответ может прийти позже, а может и не прийти.';
        animatePlantShift();
    }
    playObjectTone('pager');
    try { Telegram.WebApp.HapticFeedback.notificationOccurred('success'); } catch (_) {}
    renderRoom();
    if (roomAnim.pagerModalOpen) renderPagerModal();
    return { ok: true, whisper: wRow, firstSprout, ledger: sentRes.ledger };
}

// Синхронизирует входящие «Шёпоты» на посты игрока и проверяет, сохранили ли получатели отправленные им «Шёпоты» на кассету
async function syncPagerWhispers() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    try {
        // 1) Проверяем входящие «Шёпоты» на наши посты из soma_my_posts (работает даже при 0 тепла!)
        const myPosts = getLocalMyPostIdsSafe();
        if (myPosts.length) {
            const { data: inRows } = await supabaseClient
                .from('soma_whispers')
                .select('id,post_id,post_tag,post_preview,text,created_at,status')
                .in('post_id', myPosts.slice(0, 30))
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(20);
            if (Array.isArray(inRows) && inRows.length) {
                const handled = getHandledWhispers();
                const current = loadRawInboxWhispers();
                const map = new Map(current.map(x => [x.id, x]));
                let added = false;
                inRows.forEach(r => {
                    if (!r || !r.id || handled[r.id] || map.has(r.id)) return;
                    map.set(r.id, {
                        id: String(r.id),
                        post_id: String(r.post_id || ''),
                        post_tag: String(r.post_tag || 'ЛИЧНАЯ БОЛЬ'),
                        post_preview: String(r.post_preview || ''),
                        text: String(r.text || '').slice(0, PROGRESSION_RULES.WHISPER_MAX_LEN),
                        created_at: r.created_at || new Date().toISOString(),
                        status: 'pending'
                    });
                    added = true;
                });
                if (added) {
                    saveRawInboxWhispers([...map.values()]);
                    playObjectTone('pager');
                                }
            }
        }

        // 2) Проверяем, сохранил ли кто-то из поддержанных нами людей наш «Шёпот» себе на кассету VTR-90
        const myUid = typeof player !== 'undefined' && player && player.uid;
        if (myUid) {
            const { data: savedRows } = await supabaseClient
                .rpc('my_saved_soma_whispers');
            if (Array.isArray(savedRows) && savedRows.length) {
                const acked = new Set(getAckedWhispers());
                savedRows.forEach(r => {
                    if (r && r.id && !acked.has(String(r.id))) {
                        claimWhisperCassetteAck(String(r.id));
                    }
                });
            }
        }
    } catch (_) {}
    if (roomAnim.pagerModalOpen) renderPagerModal();
}

function pressPagerScan() {
    if (isWhisperLive()) {
        const inbox = getPendingInboxWhispers();
        openPagerModal(inbox.length > 0 ? 'inbox' : 'feed');
        return;
    }
    try { Telegram.WebApp.HapticFeedback.impactOccurred('light'); } catch (_) {}
    playObjectTone('pager');
    openPagerModal('feed');
}

function pressPagerInfo() {
    try { Telegram.WebApp.HapticFeedback.impactOccurred('soft'); } catch (_) {}
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    openPagerModal('feed');
}

function openWhisper() {
    openPagerModal();
}



// ===== ИНТЕРАКТИВНЫЙ МАТРИЧНЫЙ ЭКРАН ПЕЙДЖЕРА NEEOSOMA // NMAV-04 (ЛЕНТА ЭМПАТИИ + ВХОДЯЩИЕ НА КАССЕТУ) =====
function ensurePagerModal() {
    if (typeof document === 'undefined' || !document.createElement) return null;
    let ov = document.getElementById('pager-overlay');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'pager-overlay';
    ov.className = 'pager-overlay hidden';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Пейджер NEEOSOMA // NMAV-04 — Канал Шёпот');
    ov.innerHTML = `
        <div class="soma-pager pager-modal-chassis" id="pager-modal-chassis">
            <!-- ШАПКА УСТРОЙСТВА: бренд + LED + частота + закрыть -->
            <div class="pager-top pager-modal-top">
                <span class="pager-brand"><i class="pager-led" aria-hidden="true"></i>NEEOSOMA // NMAV-04</span>
                <span class="pager-freq">CH·04 «ШЁПОТ»</span>
                <button type="button" class="pager-modal-close" id="pager-modal-close" aria-label="Закрыть пейджер">✕</button>
            </div>
            <!-- ЖИВЫЕ ПОЛОСКИ СИЛЫ СВЯЗИ -->
            <div class="pager-sig-bar" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
            <!-- СЕГМЕНТНЫЕ ВКЛАЛКИ -->
            <div class="pager-modal-tabs" role="tablist">
                <button type="button" class="pager-modal-tab" id="pager-tab-feed" role="tab" aria-selected="true">📡 ПОЙМАТЬ СИГНАЛ</button>
                <button type="button" class="pager-modal-tab" id="pager-tab-inbox" role="tab" aria-selected="false">📥 ВХОДЯЩИЕ <span id="pager-inbox-badge" class="pager-inbox-badge hidden">0</span></button>
            </div>
            <!-- LCD-ЭКРАН С CRT-ЭФФЕКТОМ -->
            <div class="pager-bezel pager-modal-bezel">
                <div class="pager-lcd pager-modal-lcd">
                    <div class="pager-lcd-meta" id="pager-modal-meta"></div>
                    <div class="pager-modal-notice hidden" id="pager-modal-notice"></div>
                    <div class="pager-modal-body" id="pager-modal-body"></div>
                    <div class="pager-lcd-scan" aria-hidden="true"></div>
                </div>
            </div>
            <div class="pager-modal-foot" id="pager-modal-foot"></div>
        </div>
    `;
    ov.addEventListener('click', (e) => {
        if (e.target === ov) closePagerModal();
    });
    const closeBtn = ov.querySelector('#pager-modal-close');
    if (closeBtn) closeBtn.onclick = () => closePagerModal();
    const tabFeed = ov.querySelector('#pager-tab-feed');
    if (tabFeed) {
        tabFeed.onclick = () => {
            roomAnim.pagerShowBlocks = false;
            roomAnim.pagerTab = 'feed';
            roomAnim.pagerModalError = '';
            if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
            renderPagerModal();
        };
    }
    const tabInbox = ov.querySelector('#pager-tab-inbox');
    if (tabInbox) {
        tabInbox.onclick = () => {
            roomAnim.pagerShowBlocks = false;
            roomAnim.pagerTab = 'inbox';
            roomAnim.pagerModalError = '';
            if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
            renderPagerModal();
        };
    }
    if (document.body && document.body.appendChild) {
        document.body.appendChild(ov);
    }
    const bodyScroll = ov.querySelector('#pager-modal-body');
    if (bodyScroll && typeof bindSomaSceneScroll === 'function') {
        bindSomaSceneScroll(bodyScroll);
    }
    return ov;
}

function mountPagerModalForCurrentMode() {
    const ov = ensurePagerModal();
    if (!ov || typeof document === 'undefined') return null;
    const scene = document.getElementById('station-scene');
    const station = document.getElementById('station');
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    const inFs = !!((fsEl && scene && (fsEl === scene || scene.contains(fsEl)))
        || roomAnim.isFullscreen
        || (station && station.classList && station.classList.contains('is-fullscreen')));
    const target = (inFs && scene) ? scene : document.body;
    if (target && ov.parentElement !== target && target.appendChild) {
        target.appendChild(ov);
    }
    if (ov.classList) ov.classList.toggle('is-in-fs', target === scene);
    const chassis = ov.querySelector('#pager-modal-chassis');
    if (chassis) {
        const cosm = getRoomCosmeticsSafe();
        if (cosm && cosm.pager) chassis.dataset.skin = cosm.pager;
        else delete chassis.dataset.skin;
    }
    return ov;
}

function openPagerModal(preferredTab) {
    const ov = mountPagerModalForCurrentMode();
    if (!ov) return;
    const inbox = getPendingInboxWhispers();
    trackFirstSignalEvent('pager_open');
    roomAnim.pagerModalOpen = true;
    roomAnim.pagerTab = preferredTab || (inbox.length > 0 ? 'inbox' : (roomAnim.pagerTab || 'feed'));
    roomAnim.pagerModalError = '';
    ov.classList.remove('hidden');
    playObjectTone('pager');
    syncPagerWhispers();
    renderPagerModal();
}

function closePagerModal() {
    const ov = typeof document !== 'undefined' && document.getElementById('pager-overlay');
    if (ov && ov.classList) ov.classList.add('hidden');
    roomAnim.pagerModalOpen = false;
    roomAnim.pagerShowBlocks = false;
    roomAnim.pagerSafetyTarget = null;
    roomAnim.pagerRequestedPostId = '';
    roomAnim.pagerComposingPostId = '';
    roomAnim.pagerModalError = '';
    if (typeof restoreSomaScroll === 'function') {
        try { restoreSomaScroll(); } catch (_) {}
    }
}

function renderPagerModal() {
    const ov = mountPagerModalForCurrentMode();
    if (!ov || !roomAnim.pagerModalOpen) return;
    const escFn = typeof esc === 'function'
        ? esc
        : (s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

    const warmthNow = typeof player !== 'undefined' && player && Number.isFinite(Number(player.warmth))
        ? Number(player.warmth)
        : (Number(roomAnim.warmth) || 0);
    const ledger = loadWarmthLedger();
    const adm = whisperAdmission(warmthNow, ledger);

    const inbox = getPendingInboxWhispers();
    const tapes = loadCassettes();

    const tabFeed = ov.querySelector('#pager-tab-feed');
    const tabInbox = ov.querySelector('#pager-tab-inbox');
    const badgeEl = ov.querySelector('#pager-inbox-badge');
    const metaEl = ov.querySelector('#pager-modal-meta');
    const noticeEl = ov.querySelector('#pager-modal-notice');
    const bodyEl = ov.querySelector('#pager-modal-body');
    const footEl = ov.querySelector('#pager-modal-foot');

    const activeTab = roomAnim.pagerTab === 'inbox' ? 'inbox' : 'feed';
    if (tabFeed) tabFeed.setAttribute('aria-selected', String(activeTab === 'feed'));
    if (tabInbox) tabInbox.setAttribute('aria-selected', String(activeTab === 'inbox'));
    if (badgeEl) {
        badgeEl.textContent = String(inbox.length);
        badgeEl.classList.toggle('hidden', inbox.length === 0);
    }

    if (metaEl) {
        const bonusTxt = adm.ackBonusClaimedToday
            ? 'ТЕПЛО ОТ КАССЕТЫ СЕГОДНЯ: ✓ ПОЛУЧЕНО (1/1)'
            : `КАССЕТА ДАЁТ +${PROGRESSION_RULES.WHISPER_ACK_WARMTH} ТЕПЛА ДЛЯ РАСТЕНИЯ (1/ДЕНЬ)`;
        metaEl.innerHTML = `
            <span>ШЁПОТОВ СЕГОДНЯ: <b>${adm.whisperLeftToday}/${adm.whisperSendCap}</b></span>
            <span>${bonusTxt}</span>
        `;
    }

    if (noticeEl) {
        const msg = roomAnim.pagerModalError || roomAnim.pagerModalNotice || '';
        noticeEl.textContent = msg;
        noticeEl.className = 'pager-modal-notice'
            + (msg ? '' : ' hidden')
            + (roomAnim.pagerModalError ? ' is-error' : '');
    }

    if (!bodyEl) return;

    async function safetyAction(action) {
        if (roomAnim.pagerSafetyBusy) return;
        roomAnim.pagerModalError = '';
        const result = await action();
        if (!result.ok) roomAnim.pagerModalError = result.error;
        if (roomAnim.pagerModalOpen) renderPagerModal();
    }
    if (activeTab === 'inbox') {
        if (roomAnim.pagerShowBlocks && isWhisperSafetyLive()) {
            const blocks = roomAnim.pagerBlockList || [];
            bodyEl.innerHTML = `<div class="pager-empty-title">БЛОКИРОВКИ ВХОДЯЩИХ</div>
                <p class="pager-empty-sub">Блокируется аккаунт, не человек на всех устройствах. Старые сообщения не вернутся.</p>
                ${blocks.length ? blocks.map((x, i) => `<div class="pager-card"><span>Отправитель ${i + 1} · ${escFn(formatCassetteDate(x.created_at))}</span><button type="button" class="pager-act-btn" data-act="unblock" data-id="${escFn(x.anchor_id)}">СНЯТЬ БЛОКИРОВКУ</button></div>`).join('') : '<p class="pager-empty-sub">Здесь пока нет загруженных блокировок.</p>'}
                <button type="button" class="pager-act-btn" id="pager-blocks-back">НАЗАД К ВХОДЯЩИМ</button>`;
            bodyEl.querySelectorAll('[data-act="unblock"]').forEach(btn => {
                btn.onclick = () => safetyAction(() => unblockWhisperSender(btn.dataset.id));
            });
            bodyEl.querySelector('#pager-blocks-back').onclick = () => { roomAnim.pagerShowBlocks = false; renderPagerModal(); };
        } else if (!inbox.length) {
            bodyEl.innerHTML = `
                <div class="pager-empty-box">
                    <div class="pager-empty-title">ВХОДЯЩИХ ШЁПОТОВ ПОКА НЕТ</div>
                    <p class="pager-empty-sub">Здесь появятся отклики на ваши истории.</p>
                    <p class="pager-empty-sub">Понравится — сохраните на кассету. Отвечать не обязательно.</p>
                </div>
            `;
        } else {
            bodyEl.innerHTML = inbox.map(w => `
                <div class="pager-card pager-card--inbox" data-whisper-id="${escFn(w.id)}">
                    <div class="pager-card-head">
                        <span class="pager-card-tag">✦ ВХОДЯЩИЙ ШЁПОТ · #${escFn(signalTagLabel(w.post_tag))}</span>
                        <span class="pager-card-meta">CH·04 // АНОНИМНЫЙ СЛУШАТЕЛЬ</span>
                    </div>
                    ${w.post_preview ? `<div class="pager-card-quote">На ваш сигнал: «${escFn(w.post_preview)}»</div>` : ''}
                    <p class="pager-card-text">«${escFn(w.text)}»</p>
                    <div class="pager-card-actions">
                        <button type="button" class="pager-act-btn pager-act-btn--save" data-act="save" data-id="${escFn(w.id)}">📼 ЗАПИСАТЬ НА КАССЕТУ VTR-90</button>
                        <button type="button" class="pager-act-btn pager-act-btn--dismiss" data-act="dismiss" data-id="${escFn(w.id)}">◌ ОТПУСТИТЬ</button>
                    </div>
                    ${isWhisperSafetyLive() ? `<div class="pager-card-actions">
                        <button type="button" class="pager-act-btn pager-act-btn--dismiss" data-act="report" data-id="${escFn(w.id)}">ПОЖАЛОВАТЬСЯ</button>
                        <button type="button" class="pager-act-btn pager-act-btn--dismiss" data-act="block" data-id="${escFn(w.id)}">БЛОКИРОВАТЬ ОТПРАВИТЕЛЯ</button>
                    </div>` : ''}
                    ${isWhisperSafetyLive() && roomAnim.pagerSafetyTarget && roomAnim.pagerSafetyTarget.id === w.id ? `<div class="pager-compose">
                        ${roomAnim.pagerSafetyTarget.mode === 'report' ? `<label class="pager-empty-sub" for="pager-report-reason">Причина жалобы</label><select id="pager-report-reason" class="pager-compose-input"><option value="spam">Спам</option><option value="harassment">Оскорбления или преследование</option><option value="unsafe">Опасное содержание</option><option value="other">Другое</option></select>
                        <p class="pager-empty-sub">Жалобу и текст увидит владелец станции. Не экстренная помощь; срок ответа не гарантирован.</p>` : '<p class="pager-empty-sub">Новые и ожидающие шёпоты этого аккаунта будут скрыты. Кассеты останутся. Блокировку можно снять.</p>'}
                        <button type="button" class="pager-act-btn" data-act="safety-confirm" data-id="${escFn(w.id)}">${roomAnim.pagerSafetyTarget.mode === 'report' ? 'ОТПРАВИТЬ ЖАЛОБУ' : 'ПОДТВЕРДИТЬ БЛОКИРОВКУ'}</button>
                        <button type="button" class="pager-act-btn pager-act-btn--dismiss" data-act="safety-cancel">ОТМЕНА</button>
                    </div>` : ''}
                </div>
            `).join('');
            bodyEl.querySelectorAll('[data-act="report"], [data-act="block"]').forEach(btn => {
                btn.onclick = () => { roomAnim.pagerSafetyTarget = { id: btn.dataset.id, mode: btn.dataset.act }; roomAnim.pagerReportReason = 'spam'; renderPagerModal(); };
            });
            bodyEl.querySelectorAll('[data-act="safety-cancel"]').forEach(btn => { btn.onclick = () => { roomAnim.pagerSafetyTarget = null; renderPagerModal(); }; });
            const reportReason = bodyEl.querySelector('#pager-report-reason');
            if (reportReason) {
                reportReason.value = roomAnim.pagerReportReason || 'spam';
                reportReason.onchange = () => { roomAnim.pagerReportReason = reportReason.value; };
            }
            bodyEl.querySelectorAll('[data-act="safety-confirm"]').forEach(btn => {
                btn.onclick = () => {
                    const report = roomAnim.pagerSafetyTarget && roomAnim.pagerSafetyTarget.mode === 'report';
                    const reason = bodyEl.querySelector('#pager-report-reason');
                    btn.disabled = true;
                    safetyAction(() => report ? reportIncomingWhisper(btn.dataset.id, reason && reason.value) : blockIncomingWhisper(btn.dataset.id));
                };
            });
            bodyEl.querySelectorAll('[data-act="save"]').forEach(btn => {
                btn.onclick = () => acceptIncomingWhisper(btn.dataset.id);
            });
            bodyEl.querySelectorAll('[data-act="dismiss"]').forEach(btn => {
                btn.onclick = () => dismissIncomingWhisper(btn.dataset.id);
            });
        }
    } else {
        // Reading/skipping stay open; the short rules are required only after choosing to compose.
        if (!adm.live) {
            bodyEl.innerHTML = '<div class="pager-empty-box">Канал пока выключен. Вернитесь позже.</div>';
        } else {
            const whisperedSet = new Set(getWhisperedPosts());
            let candidates = getVisibleFirstSignalCandidates()
                .sort((a, b) => Number(String(b.id) === roomAnim.pagerRequestedPostId) - Number(String(a.id) === roomAnim.pagerRequestedPostId)
                    || Number(whisperedSet.has(String(a.id))) - Number(whisperedSet.has(String(b.id))));
            if (adm.firstAvailable) {
                const skipped = new Set(roomAnim.firstSignalSkipped || []);
                candidates = candidates.filter(p => !skipped.has(String(p.id)) && !whisperedSet.has(String(p.id))).slice(0, 1);
            }

            if (!candidates.length) {
                bodyEl.innerHTML = `
                    <div class="pager-empty-box">
                        <div class="pager-empty-title">В ЭФИРЕ ПОКА ТИХО</div>
                        <p class="pager-empty-sub">Новых историй пока нет. Загляните позже.</p>
                    </div>
                `;
            } else {
                bodyEl.innerHTML = candidates.map(post => {
                    const pid = String(post.id);
                    const done = whisperedSet.has(pid);
                    const isComposing = roomAnim.pagerComposingPostId === pid && !done;
                    const draft = isComposing ? (roomAnim.pagerDraftText || '') : '';
                    const trimLen = draft.trim().length;
                    return `
                        <div class="pager-card ${done ? 'is-whispered' : ''}" data-post-id="${escFn(pid)}">
                            <div class="pager-card-head">
                                <span class="pager-card-tag">${escFn(post.author || 'Аноним')} · #${escFn(signalTagLabel(post.tag))}</span>
                                <span class="pager-card-meta">${done ? '✓ ОТКЛИК ОТПРАВЛЕН' : 'ГОЛОС СО СТАНЦИИ'}</span>
                            </div>
                            <p class="pager-card-text">${escFn(post.text || '')}</p>
                            <p class="pager-compose-hint">${escFn(signalResponseHint(post.tag))}</p>
                            ${adm.firstAvailable && !isComposing ? `<div class="pager-card-actions">
                                <button type="button" class="pager-act-btn pager-act-btn--dismiss" data-act="read" data-post-id="${escFn(pid)}">ПРОСТО ПРОЧИТАТЬ</button>
                                <button type="button" class="pager-act-btn pager-act-btn--dismiss" data-act="skip" data-post-id="${escFn(pid)}">ПРОПУСТИТЬ</button>
                            </div>` : ''}
                            ${done
                                ? `<div class="pager-card-done">✓ Ваш шёпот уже отправлен.</div>`
                                : isComposing && !adm.rulesAccepted
                                    ? `<div class="pager-gate-box">
                                        <div class="pager-empty-title">ПЕРЕД ОТВЕТОМ · КОРОТКИЕ ПРАВИЛА</div>
                                        <p class="pager-empty-sub">Читать и пропустить можно без подтверждения. Чтобы ответить, сначала примите правила.</p>
                                        <p class="pager-empty-sub">Пишите от себя. Без оценок, непрошеных советов, ссылок и контактов.</p>
                                        <p class="pager-empty-sub">До 3 шёпотов в сутки, один на пост. Ответ может не прийти.</p>
                                        <button type="button" class="pager-act-btn" id="signal-rules-accept">ПОНЯТНО · ПРОДОЛЖИТЬ К ОТВЕТУ</button>
                                        <button type="button" class="pager-act-btn pager-act-btn--dismiss" id="signal-rules-later">НЕ СЕЙЧАС</button>
                                    </div>`
                                    : isComposing
                                        ? `<div class="pager-compose">
                                        <div class="pager-compose-hint">Своими словами. Без оценок и непрошеных советов (${PROGRESSION_RULES.WHISPER_MIN_LEN}–${PROGRESSION_RULES.WHISPER_MAX_LEN} симв.).</div>
                                        <textarea id="pager-compose-input" class="pager-compose-input" rows="3" maxlength="${PROGRESSION_RULES.WHISPER_MAX_LEN}" placeholder="Напишите тёплый анонимный отклик (${PROGRESSION_RULES.WHISPER_MIN_LEN}–${PROGRESSION_RULES.WHISPER_MAX_LEN} симв.)...">${escFn(draft)}</textarea>
                                        <div class="pager-compose-bar">
                                            <span id="pager-compose-count" class="pager-compose-count">${draft.length} / ${PROGRESSION_RULES.WHISPER_MAX_LEN} (мин. ${PROGRESSION_RULES.WHISPER_MIN_LEN})</span>
                                            <div class="pager-compose-btns">
                                                <button type="button" class="pager-act-btn pager-act-btn--dismiss" id="pager-compose-cancel">ОТМЕНА</button>
                                                <button type="button" class="pager-act-btn pager-act-btn--save" id="pager-compose-send" ${adm.whisperLeftToday <= 0 ? 'disabled' : ''}>◈ ПЕРЕДАТЬ СВОИ СЛОВА</button>
                                            </div>
                                        </div>
                                    </div>`
                                    : `<div class="pager-card-actions">
                                        <button type="button" class="pager-act-btn pager-act-btn--save" data-act="compose" data-post-id="${escFn(pid)}" ${adm.whisperLeftToday <= 0 ? 'disabled' : ''}>
                                            ${adm.whisperLeftToday > 0 ? '✦ ОТВЕТИТЬ ШЁПОТОМ' : 'ЛИМИТ ДНЯ ИСЧЕРПАН (3/3)'}
                                        </button>
                                    </div>`
                            }
                        </div>
                    `;
                }).join('');

                const rulesAccept = bodyEl.querySelector('#signal-rules-accept');
                if (rulesAccept) rulesAccept.onclick = () => {
                    roomAnim.pagerModalError = '';
                    if (!acceptFirstSignalRules()) {
                        roomAnim.pagerModalError = 'Не удалось сохранить правила. Проверьте доступ к хранилищу браузера.';
                    }
                    renderPagerModal();
                };
                const rulesLater = bodyEl.querySelector('#signal-rules-later');
                if (rulesLater) rulesLater.onclick = () => {
                    roomAnim.pagerComposingPostId = '';
                    roomAnim.pagerDraftText = '';
                    roomAnim.pagerModalError = '';
                    renderPagerModal();
                };

                bodyEl.querySelectorAll('[data-act="read"], [data-act="skip"]').forEach(btn => {
                    btn.onclick = async () => {
                        trackFirstSignalEvent(btn.dataset.act === 'read' ? 'signal_read' : 'signal_skip');
                        if (adm.firstAvailable) completeFirstSession(btn.dataset.act);
                        if (typeof decidePagerStory === 'function') {
                            btn.disabled = true;
                            await decidePagerStory(btn.dataset.postId, btn);
                        }
                        roomAnim.pagerModalNotice = btn.dataset.act === 'read'
                            ? 'Можно просто прочитать. Отвечать не обязательно.' : 'Сигнал пропущен. Это нормально.';
                        renderPagerModal();
                    };
                });
                bodyEl.querySelectorAll('[data-act="compose"]').forEach(btn => {
                    btn.onclick = () => {
                        trackFirstSignalEvent('compose_open');
                        roomAnim.pagerComposingPostId = btn.dataset.postId;
                        roomAnim.pagerDraftText = '';
                        roomAnim.pagerModalError = '';
                        roomAnim.pagerModalNotice = '';
                        if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
                        renderPagerModal();
                        const inp = bodyEl.querySelector('#pager-compose-input');
                        if (inp && inp.focus) setTimeout(() => { try { inp.focus(); } catch (_) {} }, 30);
                    };
                });

                const inp = bodyEl.querySelector('#pager-compose-input');
                const cnt = bodyEl.querySelector('#pager-compose-count');
                const cancelBtn = bodyEl.querySelector('#pager-compose-cancel');
                const sendBtn = bodyEl.querySelector('#pager-compose-send');
                if (inp) {
                    inp.oninput = () => {
                        if (inp.value.length > PROGRESSION_RULES.WHISPER_MAX_LEN) {
                            inp.value = inp.value.slice(0, PROGRESSION_RULES.WHISPER_MAX_LEN);
                        }
                        roomAnim.pagerDraftText = inp.value;
                        if (cnt) {
                            cnt.textContent = `${inp.value.length} / ${PROGRESSION_RULES.WHISPER_MAX_LEN} (мин. ${PROGRESSION_RULES.WHISPER_MIN_LEN})`;
                        }
                    };
                }
                if (cancelBtn) {
                    cancelBtn.onclick = () => {
                        roomAnim.pagerComposingPostId = '';
                        roomAnim.pagerDraftText = '';
                        roomAnim.pagerModalError = '';
                        renderPagerModal();
                    };
                }
                if (sendBtn && inp) {
                    sendBtn.onclick = async () => {
                        const targetPost = candidates.find(p => String(p.id) === String(roomAnim.pagerComposingPostId));
                        sendBtn.disabled = true;
                        const res = await sendWhisperToPost(targetPost, inp.value);
                        if (!res.ok) {
                            roomAnim.pagerModalError = '⛔ ' + res.error;
                            if (typeof SFX !== 'undefined' && SFX.block) SFX.block();
                            renderPagerModal();
                        } else if (typeof decidePagerStory === 'function' && targetPost) {
                            await decidePagerStory(targetPost.id);
                            renderPagerModal();
                        }
                    };
                }
            }
        }
    }

    if (footEl) {
        footEl.innerHTML = `
            <span class="pager-foot-rule">⚖ 13–333 симв. · 1 шёпот на человека · кассета даёт +4 Тепла растению (1/день)</span>
            <button type="button" class="pager-foot-vhs" id="pager-open-vhs-btn">📼 КАССЕТЫ VTR-90 (${tapes.length})</button>
            <a class="pager-foot-vhs" href="gift.html">ЗАПИСАТЬ СВОИ СЛОВА ДРУГУ →</a>
            ${isWhisperSafetyLive() ? '<button type="button" class="pager-foot-vhs" id="pager-manage-blocks">БЛОКИРОВКИ</button>' : ''}
        `;
        const manage = footEl.querySelector('#pager-manage-blocks');
        if (manage) manage.onclick = () => safetyAction(async () => {
            const result = await loadWhisperBlocks();
            if (result.ok) { roomAnim.pagerTab = 'inbox'; roomAnim.pagerShowBlocks = true; }
            return result;
        });
        const vhsBtn = footEl.querySelector('#pager-open-vhs-btn');
        if (vhsBtn) {
            vhsBtn.onclick = () => {
                closePagerModal();
                openVhsArchive();
            };
        }
    }
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
    roomAnim.customMode = roomAnim.ptsDew ? 'PTS // СВЕТЛЯЧКИ ТИШИНЫ (7/7)' : 'ЖУРНАЛ СТАНЦИИ';
    roomAnim.customEntry = roomAnim.ptsDew
        ? 'Над горшком зажглось полное созвездие из 7 Светлячков тишины — награда за неделю тёплых вечеров.'
        : '';
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    renderRoom();
}

// Активные спутники игрока (с учётом выбранной масти/породы в комнате и PTS, без подмены на базовый индекс 0!)
function activeCatSpec(uid) {
    const ov = (uid === undefined && isPtsMode() && Number.isInteger(roomAnim.inspectCatCoat))
        ? roomAnim.inspectCatCoat
        : (uid === undefined && Number.isInteger(roomAnim.inspectCatCoat) ? roomAnim.inspectCatCoat : null);
    return catSpec(uid, ov);
}

function activeDogSpec(uid) {
    const ov = (uid === undefined && Number.isInteger(roomAnim.inspectDogBreed))
        ? roomAnim.inspectDogBreed
        : null;
    return dogSpec(uid, ov);
}

function savePtsPetInspect() {
    if (!isPtsMode()) return;
    try {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('soma_pts_pets', JSON.stringify({
                cat: Number.isInteger(roomAnim.inspectCatCoat) ? roomAnim.inspectCatCoat : null,
                dog: Number.isInteger(roomAnim.inspectDogBreed) ? roomAnim.inspectDogBreed : null
            }));
        }
    } catch (_) {}
}

function restorePtsPetInspect() {
    if (!isPtsMode()) return;
    try {
        if (typeof sessionStorage !== 'undefined') {
            const d = JSON.parse(sessionStorage.getItem('soma_pts_pets') || 'null');
            if (d && typeof d === 'object') {
                if (Number.isInteger(d.cat) && d.cat >= 0 && d.cat <= CAT_COATS.length) roomAnim.inspectCatCoat = d.cat;
                if (Number.isInteger(d.dog) && d.dog >= 0 && d.dog <= DOG_BREEDS.length) roomAnim.inspectDogBreed = d.dog;
            }
        }
    } catch (_) {}
}

// PTS: посмотреть все 7 базовых мастей кота + редчайшего чёрного кота 0.1% с полумесяцем во лбу!
function cyclePtsCatCoat() {
    if (!isPtsMode()) return;
    const own = catSpec();
    const total = CAT_COATS.length + 1; // 7 базовых + 1 ультра-редкий (RARE_MOON_CAT_INDEX = 7, шанс 0.1%)
    const cur = Number.isInteger(roomAnim.inspectCatCoat) ? roomAnim.inspectCatCoat : own.coatIdx;
    const next = (cur + 1) % total;
    roomAnim.inspectCatCoat = next === own.coatIdx ? null : next;
    savePtsPetInspect();
    // Если кот ещё не надет — включаем его в PTS для наглядного осмотра
    if (typeof grantOwnedItem === 'function' && typeof getActiveCosmetics === 'function' && !getActiveCosmetics().cat) {
        grantOwnedItem('room_cat');
    }
    const shown = activeCatSpec();
    roomAnim.catPetStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    roomAnim.customMode = shown.rare
        ? 'PTS // ✦ КОТ 0.1% · ПОЛУНОЧНАЯ ЛУНА'
        : `PTS // КОТ ${next + 1}/7 · ${shown.coat.name.toUpperCase()}`;
    roomAnim.customEntry = shown.rare
        ? 'Ультра-редкая масть (шанс 0.1%): полностью чёрный кот с сияющим золотым полумесяцем во лбу!'
        : (next === own.coatIdx
            ? `Ваш родной кот: ${shown.summary}.`
            : `Осмотр масти «${shown.coat.name}» (родной: ${own.coat.name}).`);
    playObjectTone('cat');
    renderRoom();
    if (typeof renderShop === 'function') {
        const sm = typeof document !== 'undefined' && document.getElementById('shop-modal');
        if (sm && !sm.classList.contains('hidden')) renderShop();
    }
}

// PTS: посмотреть все 7 базовых пород пса + редчайшую белую мальтийскую болонку 0.1% с фиолетовыми ушами и хвостом!
function cyclePtsDogBreed() {
    if (!isPtsMode()) return;
    const own = dogSpec();
    const total = DOG_BREEDS.length + 1; // 7 базовых + 1 ультра-редкая (RARE_MALTESE_INDEX = 7, шанс 0.1%)
    const cur = Number.isInteger(roomAnim.inspectDogBreed) ? roomAnim.inspectDogBreed : own.breedIdx;
    const next = (cur + 1) % total;
    roomAnim.inspectDogBreed = next === own.breedIdx ? null : next;
    savePtsPetInspect();
    if (typeof grantOwnedItem === 'function' && typeof getActiveCosmetics === 'function' && !getActiveCosmetics().dog) {
        grantOwnedItem('room_dog');
    }
    const shown = activeDogSpec();
    roomAnim.dogPetStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    roomAnim.customMode = shown.rare
        ? 'PTS // ✦ ПЁС 0.1% · БЕЛАЯ ЮНА'
        : `PTS // ПЁС ${next + 1}/7 · ${shown.breed.name.toUpperCase()}`;
    roomAnim.customEntry = shown.rare
        ? `Ультра-редкая порода (шанс 0.1%): Белая Юна с фиолетовыми ушами и фиолетовым хвостом!`
        : (next === own.breedIdx
            ? `Ваш родной пёс: ${shown.summary}.`
            : `Осмотр породы «${shown.breed.name}» (родной: ${own.breed.name}).`);
    playObjectTone('dog');
    renderRoom();
    if (typeof renderShop === 'function') {
        const sm = typeof document !== 'undefined' && document.getElementById('shop-modal');
        if (sm && !sm.classList.contains('hidden')) renderShop();
    }
}

// PTS: посмотреть все 7 секретных внеземных растений (в релизе каждому игроку достаётся строго 1 свой вид после 7/7!)
function cyclePtsAlienKind() {
    if (!isPtsMode()) return;
    const cur = Number.isInteger(roomAnim.inspectAlienKind) ? roomAnim.inspectAlienKind : -1;
    const next = cur + 1;
    if (next >= ALIEN_KINDS.length) {
        roomAnim.inspectAlienKind = null;
        roomAnim.customMode = 'PTS // РОДНОЕ РАСТЕНИЕ';
        roomAnim.customEntry = 'Осмотр внеземной флоры завершён — в комнате снова ваше растение.';
    } else {
        roomAnim.inspectAlienKind = next;
        roomAnim.inspectKind = null;
        const al = alienSpec(undefined, next);
        const ownAl = alienSpec();
        roomAnim.customMode = `PTS // ✦ ПРИШЕЛЕЦ ${next + 1}/7 · ${al.kindName}`;
        roomAnim.customEntry = `${al.alien.note} (Ваш единственный вид по ID: «${ownAl.kindName}».)`;
    }
    animatePlantShift();
    playObjectTone('plant');
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
    roomAnim.customEntry = stageNoteForPlayer(sp, s, true);
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

    const rIdx = previewing
        ? [0, 2, 4, stationPhases.length - 1][previewIdx]
        : unlocked;
    const stars = rIdx + 1;
    const phase = stationPhases[active];
    if (!roomAnim.ptsPetsRestored && isPtsMode()) {
        roomAnim.ptsPetsRestored = true;
        restorePtsPetInspect();
    }

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
            requireAcks: false,
            bloomAcks: adm.whisperAcks
        });

    const gh = loadGreenhouse(warmth);
    if (!previewing && nativeStage === 5 && !gh.bloomed.includes(ownSpec.kind)) {
        gh.bloomed.push(ownSpec.kind);
        if (gh.placed === null) gh.placed = ownSpec.kind;
        saveGreenhouse(gh);
    }
    // Семя растёт СТРОГО только когда стоит в комнате (gh.placed === 'seed' / 'alien') и копит grownWarmth!
    if (!previewing && gh.placed === 'seed' && gh.activeSeed) {
        const seedGain = Math.max(0, Number(gh.activeSeed.grownWarmth) || 0);
        const sStage = plantStage(seedGain, { sprouted: true, steps: GREENHOUSE_WARMTH_STEPS });
        if (sStage === 5) {
            const doneK = gh.activeSeed.kind;
            if (!gh.bloomed.includes(doneK)) gh.bloomed.push(doneK);
            gh.placed = doneK;
            roomAnim.customMode = gh.bloomed.length >= PLANT_KINDS.length
                ? 'ОРАНЖЕРЕЯ // 8/8 · ТАЙНА ПРОБУДИЛАСЬ!'
                : 'ОРАНЖЕРЕЯ // РАСЦВЕТ';
            roomAnim.customEntry = gh.bloomed.length >= PLANT_KINDS.length
                ? `${PLANT_NOTES[doneK][5]} Вы вырастили все 8 земных видов — в самом центре Оранжереи из звёздного света проявилось 9-е тайное семя!`
                : PLANT_NOTES[doneK][5];
            gh.activeSeed = null;
            saveGreenhouse(gh);
        }
    }
    if (!previewing && gh.placed === 'alien' && gh.alienSeed && !gh.alienSeed.bloomed) {
        const aGain = Math.max(0, Number(gh.alienSeed.grownWarmth) || 0);
        const aStage = plantStage(aGain, { sprouted: true, steps: ALIEN_WARMTH_STEPS });
        if (aStage === 5) {
            gh.alienSeed.bloomed = true;
            const myAl = alienSpec();
            roomAnim.customMode = `ОРАНЖЕРЕЯ // ✦ ${myAl.kindName}`;
            roomAnim.customEntry = myAl.alien.note;
            saveGreenhouse(gh);
        }
    }

    let liveSpec = ownSpec;
    let liveStage = nativeStage;
    let isSeedPot = false;
    let isAlienPot = false;
    let activeSteps = PLANT_WARMTH_STEPS;
    let effectiveWarmth = warmth;

    if (!previewing && gh.bloomed.includes(ownSpec.kind)) {
        if (gh.placed === 'alien' && gh.alienSeed) {
            liveSpec = alienSpec();
            effectiveWarmth = Math.max(0, Number(gh.alienSeed.grownWarmth) || 0);
            activeSteps = ALIEN_WARMTH_STEPS;
            liveStage = gh.alienSeed.bloomed
                ? 5
                : plantStage(effectiveWarmth, { sprouted: true, steps: ALIEN_WARMTH_STEPS });
            isAlienPot = true;
            isSeedPot = !gh.alienSeed.bloomed;
        } else if (gh.placed === 'seed' && gh.activeSeed) {
            liveSpec = gallerySpecForKind(gh.activeSeed.kind, ownSpec);
            effectiveWarmth = Math.max(0, Number(gh.activeSeed.grownWarmth) || 0);
            activeSteps = GREENHOUSE_WARMTH_STEPS;
            liveStage = plantStage(effectiveWarmth, { sprouted: true, steps: GREENHOUSE_WARMTH_STEPS });
            isSeedPot = true;
        } else if (Number.isInteger(gh.placed) && gh.bloomed.includes(gh.placed)) {
            liveSpec = gallerySpecForKind(gh.placed, ownSpec);
            liveStage = 5;
        } else {
            liveSpec = ownSpec;
            liveStage = 5;
        }
    }

    const inspectAlien = Number.isInteger(roomAnim.inspectAlienKind) && roomAnim.inspectAlienKind >= 0 && roomAnim.inspectAlienKind < ALIEN_KINDS.length;
    const otherKind = inspectAlien || (Number.isInteger(roomAnim.inspectKind) && roomAnim.inspectKind !== liveSpec.kind);
    const spec = inspectAlien
        ? alienSpec(undefined, roomAnim.inspectAlienKind)
        : (Number.isInteger(roomAnim.inspectKind) && roomAnim.inspectKind !== liveSpec.kind
            ? gallerySpecForKind(roomAnim.inspectKind, ownSpec)
            : liveSpec);

    const grew = roomAnim.lastStage >= -1 && liveStage > roomAnim.lastStage && !previewing && !isSeedPot;
    if (grew) {
        roomAnim.inspectStage = null;
        roomAnim.inspectKind = null;
        roomAnim.inspectAlienKind = null;
    }

    const shownStage = inspectAlien
        ? (Number.isInteger(roomAnim.inspectStage) ? roomAnim.inspectStage : 5)
        : (previewing
            ? (Number.isInteger(roomAnim.previewStage) ? roomAnim.previewStage : liveStage)
            : (Number.isInteger(roomAnim.inspectStage) ? roomAnim.inspectStage : liveStage));
    const isPeeking = previewing || otherKind || shownStage !== liveStage;
    const speciesKnown = isPeeking
        || (spec.isAlien ? shownStage >= 5 : gh.bloomed.includes(spec.kind))
        || (!spec.isAlien && shownStage >= PROGRESSION_RULES.SPECIES_REVEAL_STAGE);
    const radioReady = !!(typeof window !== 'undefined' && window.SOMA_RECEIVER
        && typeof window.SOMA_RECEIVER.isPlaying === 'function' && window.SOMA_RECEIVER.isPlaying());

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

    // Необязательный старый показатель: не занимает место в новой основной шапке.
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
            plantInfo.textContent = spec.isAlien
                ? '✦ ЗВЁЗДНОЕ СЕМЯ // ПРОБУЖДЕНИЕ В КОМНАТЕ'
                : (isSeedPot
                    ? 'НОВОЕ СЕМЯ // РАСТЁТ В КОМНАТЕ'
                    : (adm.admitted && !isPeeking ? 'ПУСТОЙ ГОРШОК // ПОЧВА СОГРЕТА' : 'ПУСТОЙ ГОРШОК // ОЖИДАНИЕ ЖИЗНИ'));
        } else {
            const title = speciesKnown
                ? (spec.isAlien ? `✦ ${spec.kindName}` : spec.kindName)
                : (spec.isAlien
                    ? '✦ ВНЕЗЕМНАЯ ФОРМА ЖИЗНИ'
                    : (shownStage === 0 ? 'НЕИЗВЕСТНЫЙ РОСТОК' : 'НЕИЗВЕСТНЫЙ ПОБЕГ'));
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
            const hint = shownStage + 1 === PROGRESSION_RULES.SPECIES_REVEAL_STAGE ? 'до открытия вида' : 'до след. стадии';
            plantSub.textContent = `${hint}: ещё ${needNext} тепла · ${rhythmTag}`;
        } else {
            plantSub.textContent = `полное цветение сезона · ${rhythmTag}`;
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

    // Оранжерея игрока: открывается СТРОГО после первого расцветшего цветка (вход — живые лианы над кушеткой, без кнопок на окне!)
    const hasGh = !previewing && gh.bloomed.includes(ownSpec.kind);
    const vinesHit = document.getElementById('station-hit-vines');
    if (vinesHit && typeof vinesHit.setAttribute === 'function') {
        const canPortal = hasGh || isPtsMode();
        vinesHit.setAttribute(
            'aria-label',
            canPortal
                ? 'Живые лианы над кушеткой — войти в Оранжерею'
                : 'Живые лианы над кушеткой'
        );
        if (vinesHit.classList) vinesHit.classList.toggle('is-portal-open', canPortal);
    }
    const ghBox = document.getElementById('station-greenhouse');
    if (ghBox && ghBox.classList) {
        ghBox.classList.toggle('hidden', !hasGh);
        const ghCount = document.getElementById('station-gh-count');
        if (ghCount) {
            const allEarthDone = gh.bloomed.length >= PLANT_KINDS.length;
            const alienBadge = allEarthDone
                ? ((gh.alienSeed && gh.alienSeed.bloomed) ? ' · ✦ IX' : ' · ✦ ТАЙНА')
                : '';
            ghCount.textContent = `${gh.bloomed.length}/${PLANT_KINDS.length} ВИДОВ${alienBadge}`;
        }
        const ghSlots = document.getElementById('station-gh-slots');
        if (ghSlots && hasGh && document.createElement) {
            ghSlots.textContent = '';
            // Тихая диегетическая подсказка вместо отдельной кнопки: в Оранжерею ведут живые лианы над кушеткой!
            const hint = document.createElement('span');
            const secretReady = gh.bloomed.length >= PLANT_KINDS.length && !gh.alienSeed;
            hint.className = secretReady ? 'station-gh-hint is-secret' : 'station-gh-hint';
            hint.textContent = secretReady
                ? '✦ Коснитесь живых лиан над кушеткой — в куполе Оранжереи ждёт тайное семя'
                : '✿ Коснитесь живых лиан над кушеткой, чтобы войти в купол Оранжереи';
            ghSlots.appendChild(hint);

            gh.bloomed.forEach(k => {
                const b = document.createElement('button');
                b.type = 'button';
                const nm = PLANT_KINDS[k][0] + PLANT_KINDS[k].slice(1).toLowerCase();
                b.textContent = k === ownSpec.kind ? `★ ${nm}` : nm;
                const activeSlot = !isSeedPot && !isAlienPot && liveSpec.kind === k;
                b.setAttribute('aria-pressed', String(activeSlot));
                b.onclick = () => selectGreenhouseSlot(k);
                ghSlots.appendChild(b);
            });
            if (gh.activeSeed) {
                const sb = document.createElement('button');
                sb.type = 'button';
                const sg = Math.max(0, Number(gh.activeSeed.grownWarmth) || 0);
                const ss = plantStage(sg, { sprouted: true, steps: GREENHOUSE_WARMTH_STEPS });
                const pausedTag = (gh.placed !== 'seed') ? ' · пауза' : '';
                sb.textContent = ss >= PROGRESSION_RULES.SPECIES_REVEAL_STAGE
                    ? `🌱 ${PLANT_KINDS[gh.activeSeed.kind][0] + PLANT_KINDS[gh.activeSeed.kind].slice(1).toLowerCase()} (${ss + 1}/6${pausedTag})`
                    : `🌱 Семя (${ss < 0 ? '0' : ss + 1}/6${pausedTag})`;
                sb.setAttribute('aria-pressed', String(gh.placed === 'seed'));
                sb.onclick = () => selectGreenhouseSlot('seed');
                ghSlots.appendChild(sb);
            } else if (gh.bloomed.length < PLANT_KINDS.length) {
                const nb = document.createElement('button');
                nb.type = 'button';
                nb.className = 'is-seed-action';
                nb.textContent = '+ Новое семя';
                nb.onclick = () => plantNewGreenhouseSeed(warmth, ownSpec);
                ghSlots.appendChild(nb);
            } else if (gh.alienSeed) {
                const ab = document.createElement('button');
                ab.type = 'button';
                ab.className = 'is-alien-slot';
                const myAl = alienSpec();
                if (gh.alienSeed.bloomed) {
                    ab.textContent = `✦ ${myAl.kindName}`;
                } else {
                    const ag = Math.max(0, Number(gh.alienSeed.grownWarmth) || 0);
                    const as = plantStage(ag, { sprouted: true, steps: ALIEN_WARMTH_STEPS });
                    const pTag = gh.placed !== 'alien' ? ' · пауза' : '';
                    ab.textContent = `✦ Звёздное семя (${as < 0 ? '0' : as + 1}/6${pTag})`;
                }
                ab.setAttribute('aria-pressed', String(isAlienPot));
                ab.onclick = () => selectGreenhouseSlot('alien');
                ghSlots.appendChild(ab);
            } else if (gh.bloomed.length >= PLANT_KINDS.length) {
                const ab = document.createElement('button');
                ab.type = 'button';
                ab.className = 'is-alien-slot';
                ab.textContent = '✦ Посадить звёздное семя';
                ab.onclick = () => plantSecretAlienSeed();
                ghSlots.appendChild(ab);
            }
            if (!isSeedPot && typeof window !== 'undefined' && window.SOMA_SHARE && typeof window.SOMA_SHARE.sharePlant === 'function') {
                const sh = document.createElement('button');
                sh.type = 'button';
                sh.className = 'is-seed-action';
                sh.textContent = '▣ Открытка';
                sh.onclick = () => window.SOMA_SHARE.sharePlant(isAlienPot ? 'alien' : liveSpec.kind);
                ghSlots.appendChild(sh);
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

    // На «Рассвете» звёзды растворяются в утреннем свете, в ночных фазах сияют по атмосферам
    room.querySelectorAll('.station-sky circle, .station-sky line').forEach(el => {
        el.style.opacity = active === 3 ? 0 : (Number(el.dataset.star) <= stars ? 1 : 0);
    });

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
            : 'PTS // ИНСПЕКТОР (СТАДИИ 0–6 · 8 ВИДОВ · РАССВЕТ)';
    }
    if (ptsBody && ptsBody.classList) {
        ptsBody.classList.toggle('hidden', !roomAnim.ptsOpen);
    }

    const toggleBtn = document.getElementById('station-kinds-toggle');
    const kindsWrap = document.getElementById('station-plant-kinds');
    if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', String(roomAnim.galleryOpen));
        toggleBtn.textContent = roomAnim.galleryOpen ? 'СКРЫТЬ ВИДЫ' : `ВСЕ ${PLANT_KINDS.length} ВИДОВ`;
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
        ptsCatBtn.textContent = sc.rare
            ? '✦ КОТ 0.1%: ЛУНА'
            : `КОТ: ${sc.coat.name.toUpperCase()}`;
    }
    const ptsDogBtn = document.getElementById('pts-dog-btn');
    if (ptsDogBtn) {
        const sd = dogSpec(undefined, Number.isInteger(roomAnim.inspectDogBreed) ? roomAnim.inspectDogBreed : null);
        ptsDogBtn.setAttribute('aria-pressed', String(Number.isInteger(roomAnim.inspectDogBreed)));
        ptsDogBtn.textContent = sd.rare
            ? `✦ ПЁС 0.1%: МАЛЬТЕЗЕ`
            : `ПЁС: ${sd.breed.name.toUpperCase()}`;
    }
    const ptsAlienBtn = document.getElementById('pts-alien-btn');
    if (ptsAlienBtn) {
        const ia = Number.isInteger(roomAnim.inspectAlienKind);
        ptsAlienBtn.setAttribute('aria-pressed', String(ia));
        ptsAlienBtn.textContent = ia
            ? `✦ ПРИШЕЛЕЦ ${roomAnim.inspectAlienKind + 1}/7`
            : '✦ ПРИШЕЛЕЦ';
    }
    syncCompanionHotspots();

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
    roomAnim.inspectAlienKind = null;
    roomAnim.inspectCatCoat = null;
    roomAnim.inspectDogBreed = null;
    try { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('soma_pts_pets'); } catch (_) {}
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

// Public pager API for integrations and headless regression tests.
const pagerApi = {
    isWhisperSafetyLive, reportIncomingWhisper, blockIncomingWhisper, loadWhisperBlocks, unblockWhisperSender,
    openFirstSignalSession, openWhisperForPost, signalTagLabel, signalResponseHint,
    acceptFirstSignalRules, completeFirstSession, updateFirstSignalRoom, trackFirstSignalEvent,
    renderFirstSignalEntry, getFirstSignalCandidates, getVisibleFirstSignalCandidates,
    validateWhisperText, hasWhisperedToPost, rememberWhisperedPost,
    claimWhisperCassetteAck, getPendingInboxWhispers, receiveIncomingWhisperLocal,
    acceptIncomingWhisper, dismissIncomingWhisper, sendWhisperToPost,
    syncPagerWhispers, openPagerModal, closePagerModal, renderPagerModal
};
if (typeof window !== 'undefined') window.SOMA_ROOM = Object.assign(window.SOMA_ROOM || {}, pagerApi);
if (typeof module !== 'undefined' && module.exports) Object.assign(module.exports, pagerApi);
