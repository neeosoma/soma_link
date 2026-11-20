// ===== ПАНТЕОН ЦИНИКОВ, КОЛЛЕКЦИОННЫЙ БУТИК И TELEGRAM STARS (SOMA~LINK) =====
// Принцип SOMA~LINK: продаётся СТРОГО эстетика. Внутри каждой категории — единая равная цена,
// чтобы каждый атрибут был самодостаточным произведением искусства со своей уникальной анимацией.
// Живое Тепло и рост цветка не продаются никогда.

const SOMA_SEALS_SVG = {
    seal_eye: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M1.2 8C3 4.4 5.4 3 8 3S13 4.4 14.8 8C13 11.6 10.6 13 8 13S3 11.6 1.2 8Z"/><g class="seal-iris"><circle cx="8" cy="8" r="2.7" stroke-width="1.15"/><circle cx="8" cy="8" r="1.25" fill="currentColor"/><circle cx="7.2" cy="7.2" r="0.55" fill="#fff7ed" stroke="none"/></g></svg>',
    seal_eclipse: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.25"><circle cx="8" cy="8" r="5.3" stroke-opacity="0.72"/><path d="M9.8 3.05A4.65 4.65 0 0 0 9.8 12.95A5.25 5.25 0 1 1 9.8 3.05Z" fill="currentColor"/><g class="seal-flare" stroke="none"><circle cx="12.3" cy="4.8" r="1.35" fill="#fffbeb"/><path d="M12.3 2.4L12.65 4.45L14.7 4.8L12.65 5.15L12.3 7.2L11.95 5.15L9.9 4.8L11.95 4.45Z" fill="currentColor"/></g></svg>',
    seal_moth: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><g class="seal-wings"><path d="M8 5C5.5 2.1 1.5 2.9 1.9 6.8C2.2 9.3 5.1 9.8 8 8.2C10.9 9.8 13.8 9.3 14.1 6.8C14.5 2.9 10.5 2.1 8 5Z" fill="currentColor" fill-opacity="0.16"/><path d="M8 8.2L4.4 12.8L7.4 11.5L8 8.2ZM8 8.2L11.6 12.8L8.6 11.5L8 8.2Z"/><circle cx="4.6" cy="6.4" r="0.85" fill="currentColor" stroke="none"/><circle cx="11.4" cy="6.4" r="0.85" fill="currentColor" stroke="none"/></g><path d="M8 3.6V13M6.6 2.3L8 4L9.4 2.3"/></svg>',
    seal_crown: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12.2L3.1 5L6.1 8.1L8 3.2L9.9 8.1L12.9 5L14 12.2H2Z" fill="currentColor" fill-opacity="0.15"/><line x1="2.3" y1="14" x2="13.7" y2="14"/><g class="seal-gems" fill="#fffbeb" stroke="none"><circle cx="8" cy="2.6" r="1.05"/><circle cx="3" cy="4.4" r="0.8"/><circle cx="13" cy="4.4" r="0.8"/></g></svg>',
    seal_signal: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,8.6 4.2,8.6 6,3 8.3,13.2 10.3,5.8 11.7,8.6 15,8.6" stroke-width="1.2" stroke-opacity="0.3"/><polyline class="seal-wave" points="1,8.6 4.2,8.6 6,3 8.3,13.2 10.3,5.8 11.7,8.6 15,8.6" stroke-width="1.55"/></svg>'
};

const SOMA_SEAL_CLASS = {
    seal_eye: 'soma-seal--eye',
    seal_eclipse: 'soma-seal--eclipse',
    seal_moth: 'soma-seal--moth',
    seal_crown: 'soma-seal--crown',
    seal_signal: 'soma-seal--signal'
};

const THRONE_CROWN_SVG = '<svg viewBox="0 0 18 14" width="14" height="11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M1.5 11.5L3 3.5L6.5 7.2L9 1.8L11.5 7.2L15 3.5L16.5 11.5H1.5Z"/></svg>';

const SOMA_CATALOG = [
    // 1. КОЛЛЕКЦИОННЫЕ РАМКИ ТОПА, ДОСЬЕ И КАРТОЧКИ СВИДЕТЕЛЯ (ЕДИНЫЙ ТИР 150 ⭐ · 6 УНИКАЛЬНЫХ АНИМАЦИЙ)
    { id: 'frame_ember',   tab: 'frames', group: 'frames', slot: 'frame', css: 'soma-frame--ember',   motion: 'ИСКРЫ ГОРНА',    stars: 150, name: 'Тлеющий уголь',   desc: 'Вулканический обсидиан с переливчатой кромкой жара, дыханием горна и всплывающими искрами пепла.' },
    { id: 'frame_glitch',  tab: 'frames', group: 'frames', slot: 'frame', css: 'soma-frame--glitch',  motion: 'RGB-РАЗВЁРТКА',  stars: 150, name: 'Сбой протокола',  desc: 'Хроматический RGB-раскол, прицельные уголки телеметрии и живой бегущий луч ЭЛТ-развёртки.' },
    { id: 'frame_neon',    tab: 'frames', group: 'frames', slot: 'frame', css: 'soma-frame--neon',    motion: 'ПЛАЗМА НЕОНА',   stars: 150, name: 'Багровый неон',   desc: 'Стеклянная неоновая трубка верхнего NEEO~CITY с бегущей по контуру рубиновой плазменной дугой.' },
    { id: 'frame_gold',    tab: 'frames', group: 'frames', slot: 'frame', css: 'soma-frame--gold',    motion: 'ШЁЛК 24K',       stars: 150, name: 'Чёрное золото',   desc: 'Чёрный оникс Ар-Деко с двойной золотой филигранью, заклёпками и скользящим музейным бликом 24k.' },
    { id: 'frame_phantom', tab: 'frames', group: 'frames', slot: 'frame', css: 'soma-frame--phantom', motion: 'ОРБИТА АВРОРЫ',  stars: 150, name: 'Призрак эфира',   desc: 'Спектральная призма лунного серебра, аметиста и опала с двойной орбитой северного сияния.' },
    { id: 'frame_pulse',   tab: 'frames', group: 'frames', slot: 'frame', css: 'soma-frame--pulse',   motion: 'КАРДИО-ЛУЧ',     stars: 150, name: 'Пульс Станции',   desc: 'Живой осциллограф SOMA~LINK с двойным ритмом сердцебиения и скользящим лазерным импульсом.' },

    // 2. ЮВЕЛИРНЫЕ ПЕЧАТИ (100 ⭐), ЖИВЫЕ ТИТУЛЫ (110 ⭐) И ЛИЧНАЯ ЭПИТАФИЯ (150 ⭐)
    { id: 'seal_eye',        tab: 'status', group: 'seals',  slot: 'seal',  motion: 'ЖИВОЙ ВЗГЛЯД',   stars: 100, name: 'Печать «Око»',          desc: 'Рубиновое око наблюдателя: зрачок неспешно сканирует зал и изредка гипнотически моргает.' },
    { id: 'seal_eclipse',    tab: 'status', group: 'seals',  slot: 'seal',  motion: 'КОРОНА СОЛНЦА',  stars: 100, name: 'Печать «Затмение»',     desc: 'Тёмный диск в золотой солнечной короне с мерцающей вспышкой «бриллиантового кольца».' },
    { id: 'seal_moth',       tab: 'status', group: 'seals',  slot: 'seal',  motion: 'ВЗМАХ КРЫЛЬЕВ',  stars: 100, name: 'Печать «Мотылёк»',      desc: 'Ночной мотылёк с узором на крыльях, которые мягко трепещут рядом с вашим позывным.' },
    { id: 'seal_crown',      tab: 'status', group: 'seals',  slot: 'seal',  motion: 'СИЯНИЕ ВЕНЦА',   stars: 100, name: 'Печать «Венец»',        desc: 'Золотая корона трибунала с тремя мерцающими искрами на острых зубцах.' },
    { id: 'seal_signal',     tab: 'status', group: 'seals',  slot: 'seal',  motion: 'БЕГУЩИЙ ЭКГ',    stars: 100, name: 'Печать «Импульс»',      desc: 'Непрерывная живая волна кардиограммы, пробегающая рядом с вашим номером в Топе.' },
    { id: 'title_architect', tab: 'status', group: 'titles', slot: 'title', label: 'АРХИТЕКТОР ТИШИНЫ',   glyph: '◈', titleCss: 'soma-title--architect', stars: 110, name: 'Титул «Архитектор тишины»',   desc: 'Холодный платиново-стальной перелив букв в Топе, Досье и карточке Свидетеля.' },
    { id: 'title_collector', tab: 'status', group: 'titles', slot: 'title', label: 'КОЛЛЕКЦИОНЕР ДРАМ',   glyph: '❖', titleCss: 'soma-title--collector', stars: 110, name: 'Титул «Коллекционер драм»',   desc: 'Бархатный рубиново-розовый перелив для ценителей ночных исповедей.' },
    { id: 'title_patrician', tab: 'status', group: 'titles', slot: 'title', label: 'ПАТРИЦИЙ ЭФИРА',      glyph: '♛', titleCss: 'soma-title--patrician', stars: 110, name: 'Титул «Патриций эфира»',      desc: 'Тёплое шампанское золото закрытой ложи Паноптикума с мягким сиянием.' },
    { id: 'title_ghost',     tab: 'status', group: 'titles', slot: 'title', label: 'ПРИЗРАК NEEO~CITY',   glyph: '◌', titleCss: 'soma-title--ghost',     stars: 110, name: 'Титул «Призрак NEEO~CITY»',   desc: 'Спектральный опалово-серебряный перелив — повсюду в эфире и неуловим.' },
    { id: 'title_oracle',    tab: 'status', group: 'titles', slot: 'title', label: 'ПОСЛЕДНИЙ СВИДЕТЕЛЬ', glyph: '✦', titleCss: 'soma-title--oracle',    stars: 110, name: 'Титул «Последний свидетель»', desc: 'Рассветно-янтарный огненный градиент хранителя ночной станции.' },
    { id: 'perk_epitaph',    tab: 'status', group: 'epitaph', slot: 'epitaph_unlock', stars: 150, name: 'Право на эпитафию', desc: 'Ваша личная фраза (до 66 символов) на Троне #1, в строке Топа, в Досье и в профиле.' },

    // 3. ЖИВЫЕ КОРПУСА ПЕЙДЖЕРА NEEOSOMA // NMAV-04 (ЕДИНЫЙ ТИР 140 ⭐)
    { id: 'pager_amber', tab: 'pager', group: 'pagers', slot: 'pager', motion: 'ЛУЧ ЛЮМИНОФОРА', sample: 'CH·04 // 1986 AMBER', stars: 140, name: 'Янтарный фосфор',     desc: 'Тёплый катодный дисплей 1986 года с живой янтарной развёрткой, пульсом диода и бронзовым крепежом.' },
    { id: 'pager_clear', tab: 'pager', group: 'pagers', slot: 'pager', motion: 'ИМПУЛЬС ПЛАТЫ',  sample: 'CH·04 // RUBY PCB',   stars: 140, name: 'Дымчатый рубин 90-х', desc: 'Полупрозрачный рубиновый пластик, сквозь который видны дорожки платы и бегущий по ним сигнал.' },
    { id: 'pager_ghost', tab: 'pager', group: 'pagers', slot: 'pager', motion: 'ДЫМКА ЭФИРА',    sample: 'CH·04 // WHITE NOISE', stars: 140, name: 'Белый шум',          desc: 'Анодированный титановый хром с живой опалово-серебряной дымкой на холодной матрице.' },
    { id: 'pager_brass', tab: 'pager', group: 'pagers', slot: 'pager', motion: 'ЗОЛОТОЙ БЛИК',   sample: 'CH·04 // GUNMETAL',   stars: 140, name: 'Воронёная сталь',     desc: 'Оружейный корпус с четырьмя латунными винтами, скользящим часовым бликом и тёплой шкалой.' },

    // 4. АВТОРСКИЕ СОСУДЫ (160 ⭐), ЖИВАЯ АТМОСФЕРА КОМНАТЫ (140 ⭐) И ХРАНИТЕЛИ ТЕПЛА (220 ⭐)
    { id: 'pot_cinnabar', tab: 'room', group: 'pots',     slot: 'pot',     stars: 160, name: 'Киноварный лак',           desc: 'Императорская киноварь на подставке кадай с двойным золотым поясом, сияющей печатью и живым лаковым переливом.' },
    { id: 'pot_moon',     tab: 'room', group: 'pots',     slot: 'pot',     stars: 160, name: 'Лунный селадон',           desc: 'Жемчужно-дымчатый фарфор на подставке с лунным серпом в живом ореоле и мерцающими серебряными искрами.' },
    { id: 'pot_kintsugi', tab: 'room', group: 'pots',     slot: 'pot',     stars: 160, name: 'Керамика Кинцуги',         desc: 'Чёрная японская глина раку на подставке кадай, исцелённая дышащими швами 24k золота с бегущим бликом.' },
    { id: 'pot_amethyst', tab: 'room', group: 'pots',     slot: 'pot',     stars: 160, name: 'Аметистовый оникс',        desc: 'Резной полуночный оникс на подставке кадай с сияющим гранёным аметистом, серебряной филигранью и сумеречной пыльцой.' },
    { id: 'room_steam',   tab: 'room', group: 'ambience', slot: 'steam',   stars: 140, name: 'Чай и сандал у терминала', desc: 'Янтарный чай с густым паром и курильница с тлеющей палочкой благовоний и шёлковым дымком.' },
    { id: 'room_tape',    tab: 'room', group: 'ambience', slot: 'tape',    stars: 140, name: 'Винил «Ночной экспресс»',  desc: 'Крутится пластинка, танцуют огни усилителя, по виадуку идёт светящийся поезд + тёплый лоу-фай звук.' },
    { id: 'room_garland', tab: 'room', group: 'ambience', slot: 'garland', stars: 140, name: 'Гирлянда Эдисона у окна',  desc: '13 винтажных лампочек с тёплыми вольфрамовыми нитями и золотым светом по каменной арке окна.' },
    { id: 'room_candles', tab: 'room', group: 'ambience',  slot: 'candles', stars: 140, name: 'Живые свечи станции',      desc: 'Шесть восковых свечей с трепещущим живым пламенем и тёплыми бликами у ковра и на полке радио.' },
    { id: 'room_cat',     tab: 'room', group: 'companion', slot: 'cat',     stars: 220, name: 'Живой кот-хранитель',      desc: 'Крупный тёплый кот одной из 7 мастей на кушетке: глубоко дышит, мурчит, откликается на данное вами имя и дружит с псом (шанс 0.1% — уникальный чёрный кот с полумесяцем во лбу!).' },
    { id: 'room_dog',     tab: 'room', group: 'companion', slot: 'dog',     stars: 220, name: 'Живой пёс-хранитель',      desc: 'Крупный пёс одной из 7 пород спит на персидском коврике рядом с котом, виляет хвостом и помнит данное вами имя (шанс 0.1% — уникальная Белая Юна с фиолетовыми ушами и хвостом!).' }
];

const SOMA_ITEM_MAP = Object.fromEntries(SOMA_CATALOG.map(it => [it.id, it]));
// Коллекционные пластинки 7" лампового приёмника NEEOSOMA // AV-88 (хранятся в том же защищённом owned_cosmetics, 0% pay-to-win)
const SOMA_DEFAULT_TRACK_IDS = ['track_velvet', 'track_aurora', 'track_solstice', 'track_rainline'];
function isCollectibleTrackId(id) {
    if (!id || typeof id !== 'string') return false;
    if (SOMA_DEFAULT_TRACK_IDS.includes(id)) return true;
    const list = (typeof window !== 'undefined' && Array.isArray(window.SOMA_TRACKS)) ? window.SOMA_TRACKS : [];
    return list.some(t => t && t.collectible && t.id === id);
}
function isOwnableSomaId(id) {
    return !!(SOMA_ITEM_MAP[id] || isCollectibleTrackId(id));
}
const SOMA_FRAME_CLASSES = SOMA_CATALOG.filter(it => it.slot === 'frame' && it.css).map(it => it.css);
const ROOM_FLAG_SLOTS = ['cat', 'dog', 'steam', 'tape', 'garland', 'candles'];
const ROOM_FLAG_ITEM = { cat: 'room_cat', dog: 'room_dog', steam: 'room_steam', tape: 'room_tape', garland: 'room_garland', candles: 'room_candles' };
const SHOP_GROUP_META = {
    frames:    { title: '// КОЛЛЕКЦИОННЫЕ РАМКИ',      pill: 'ЕДИНЫЙ ТИР · 150 ⭐' },
    seals:     { title: '// ЖИВЫЕ ПЕЧАТИ СВИДЕТЕЛЯ',   pill: 'ЕДИНЫЙ ТИР · 100 ⭐' },
    titles:    { title: '// АВТОРСКИЕ ТИТУЛЫ',         pill: 'ЕДИНЫЙ ТИР · 110 ⭐' },
    epitaph:   { title: '// ЛИЧНЫЙ ГОЛОС В ТОПЕ',      pill: 'ПРИВИЛЕГИЯ · 150 ⭐' },
    pagers:    { title: '// КОРПУСА NEEOSOMA // NMAV-04', pill: 'ЕДИНЫЙ ТИР · 140 ⭐' },
    pots:      { title: '// СОСУДЫ МАСТЕРА',           pill: 'ЕДИНЫЙ ТИР · 160 ⭐' },
    ambience:  { title: '// ЖИВАЯ АТМОСФЕРА СТАНЦИИ',  pill: 'ЕДИНЫЙ ТИР · 140 ⭐' },
    companion: { title: '// ХРАНИТЕЛИ ТЕПЛА',          pill: 'ЕДИНЫЙ ТИР · 220 ⭐' }
};

const SOMA_POT_IDS = ['pot_cinnabar', 'pot_moon', 'pot_kintsugi', 'pot_amethyst'];
const SOMA_POT_META = {
    '':           { short: 'Родная глина',      badge: 'ТЕРРАКОТА СТАНЦИИ' },
    pot_cinnabar: { short: 'Киноварь',          badge: 'ИМПЕРАТОРСКИЙ ЛАК · ПЕЧАТЬ 24K' },
    pot_moon:     { short: 'Селадон',           badge: 'ЛУННЫЙ ФАРФОР · СЕРП И СОЗВЕЗДИЯ' },
    pot_kintsugi: { short: 'Кинцуги',           badge: 'ЧЁРНАЯ ГЛИНА РАКУ · ШВЫ 24K' },
    pot_amethyst: { short: 'Аметист',           badge: 'ПОЛУНОЧНЫЙ ОНИКС · ГРАНЁНЫЙ КРИСТАЛЛ' }
};

function getOwnedPotSkins() {
    const pts = typeof isPtsMode === 'function' && isPtsMode();
    return SOMA_POT_IDS.filter(id => pts || isOwned(id));
}

// ===== ЛИЧНЫЕ ИМЕНА ХРАНИТЕЛЕЙ ТЕПЛА (ВИДНЫ СТРОГО В ЖУРНАЛЕ ПРИ ВЗАИМОДЕЙСТВИИ!) =====
function petNamesStorageKey() {
    const uid = (typeof player !== 'undefined' && player && player.uid) ? String(player.uid) : '';
    return uid ? `soma_pet_names_${uid}` : 'soma_pet_names';
}

function loadPetNamesMap() {
    try {
        const raw = localStorage.getItem(petNamesStorageKey()) || localStorage.getItem('soma_pet_names') || '{}';
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') return obj;
    } catch (_) {}
    return {};
}

function sanitizePetName(raw) {
    const clean = String(raw || '')
        .replace(/[\u0000-\u001F\u007F<>`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!clean) return { ok: true, value: '' };
    if (clean.length > 20) return { ok: false, error: 'Имя хранителя — не длиннее 20 символов.' };
    if (/(https?:\/\/|www\.|t\.me\/|@[a-z0-9_]{3,}|\.[a-z]{2,5}\b)/i.test(clean)) {
        return { ok: false, error: 'В имени нельзя использовать ссылки и @ники.' };
    }
    if ((clean.match(/\d/g) || []).length >= 5) {
        return { ok: false, error: 'Слишком много цифр — дайте живое тёплое имя.' };
    }
    if (!/^[\p{L}\p{N}\s\-’'·.]+$/u.test(clean)) {
        return { ok: false, error: 'Используйте буквы, пробел или дефис.' };
    }
    return { ok: true, value: clean };
}

function getPetName(kind) {
    if (kind !== 'cat' && kind !== 'dog') return '';
    const map = loadPetNamesMap();
    const val = typeof map[kind] === 'string' ? map[kind].trim() : '';
    const chk = sanitizePetName(val);
    return chk.ok ? chk.value : '';
}

function setPetName(kind, rawName) {
    if (kind !== 'cat' && kind !== 'dog') return { ok: false, error: 'Неизвестный питомец.' };
    const chk = sanitizePetName(rawName);
    if (!chk.ok) return chk;
    const map = loadPetNamesMap();
    if (chk.value) map[kind] = chk.value;
    else delete map[kind];
    try {
        const payload = JSON.stringify(map);
        localStorage.setItem(petNamesStorageKey(), payload);
        localStorage.setItem('soma_pet_names', payload);
    } catch (_) {}
    return { ok: true, value: chk.value };
}

function currentSelfCatSpec() {
    if (typeof activeCatSpec === 'function') return activeCatSpec();
    if (typeof catSpec === 'function') {
        const ov = (typeof roomAnim !== 'undefined' && Number.isInteger(roomAnim.inspectCatCoat)) ? roomAnim.inspectCatCoat : null;
        return catSpec(undefined, ov);
    }
    return null;
}

function currentSelfDogSpec() {
    if (typeof activeDogSpec === 'function') return activeDogSpec();
    if (typeof dogSpec === 'function') {
        const ov = (typeof roomAnim !== 'undefined' && Number.isInteger(roomAnim.inspectDogBreed)) ? roomAnim.inspectDogBreed : null;
        return dogSpec(undefined, ov);
    }
    return null;
}

const shopState = {
    tab: 'frames',
    owned: [],
    equipped: { frame: '', seal: '', title: '', epitaph: '', pager: '', pot: '', cat: false, dog: false, steam: false, tape: false, garland: false, candles: false },
    preview: null, // временная примерка любого предмета до покупки (включая живой показ прямо в комнате!)
    liveRoomTry: false,
    namingPet: '', // '' | 'cat' | 'dog' — камерное предложение дать имя при покупке или переименовании
    topMode: 'all', // 'all' | 'week'
    lastBoard: [],
    myRank: null,
    buying: '',
    notice: ''
};

let tapeTimer = null;

function loadCosmeticsLocal() {
    try {
        const ow = JSON.parse(localStorage.getItem('soma_owned') || '[]');
        if (Array.isArray(ow)) shopState.owned = [...new Set(ow.filter(id => isOwnableSomaId(id)))];
    } catch (_) {}
    try {
        const eq = JSON.parse(localStorage.getItem('soma_cosmetics') || '{}') || {};
        shopState.equipped = normalizeEquipped(eq, shopState.owned);
    } catch (_) {}
}

function saveCosmeticsLocal() {
    try {
        localStorage.setItem('soma_owned', JSON.stringify(shopState.owned));
        localStorage.setItem('soma_cosmetics', JSON.stringify(shopState.equipped));
    } catch (_) {}
}

// Защита анонимности и лора: режет ссылки, @ники, телефоны, карты и грубый спам
const EPITAPH_MAX_LEN = 66;
function sanitizeEpitaph(raw) {
    const str = String(raw || '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, EPITAPH_MAX_LEN);
    if (!str) return { ok: true, value: '' };
    if (/(https?:\/\/|www\.|t\.me\/|telegram\.me|\.ru\b|\.com\b|\.net\b|\.org\b|\.io\b|@\w{2,})/i.test(str)) {
        return { ok: false, error: 'Протокол запрещает ссылки, домены и @контакты.' };
    }
    if (/(?:\d[\s\-().]*){5,}/.test(str)) {
        return { ok: false, error: 'Протокол блокирует номера телефонов и карт.' };
    }
    if (/(пиш[иу]\s*в\s*лс|личк[ауе]|ватсап|whatsapp|viber|discord|инст[ауе]?)/i.test(str)) {
        return { ok: false, error: 'Прямые контакты запрещены протоколом SOMA~LINK.' };
    }
    return { ok: true, value: str };
}

function normalizeEquipped(raw, ownedList) {
    const r = (raw && typeof raw === 'object') ? raw : {};
    const check = (id, slot) => {
        if (!id || !SOMA_ITEM_MAP[id] || SOMA_ITEM_MAP[id].slot !== slot) return '';
        if (Array.isArray(ownedList) && !ownedList.includes(id)) return '';
        return id;
    };
    const hasFlag = (val, id) => !!val && (!Array.isArray(ownedList) || ownedList.includes(id));
    const canEp = !Array.isArray(ownedList) || ownedList.includes('perk_epitaph');
    const ep = canEp ? sanitizeEpitaph(r.epitaph || '') : { ok: true, value: '' };
    return {
        frame: check(r.frame, 'frame'),
        seal: check(r.seal, 'seal'),
        title: check(r.title, 'title'),
        epitaph: ep.ok ? ep.value : '',
        pager: check(r.pager, 'pager'),
        pot: check(r.pot, 'pot'),
        cat: hasFlag(r.cat, 'room_cat'),
        dog: hasFlag(r.dog, 'room_dog'),
        steam: hasFlag(r.steam, 'room_steam'),
        tape: hasFlag(r.tape, 'room_tape'),
        garland: hasFlag(r.garland, 'room_garland'),
        candles: hasFlag(r.candles, 'room_candles')
    };
}

// Возвращает активный облик игрока (с учётом живой примерки, если она включена)
function getActiveCosmetics() {
    const base = { ...shopState.equipped };
    const p = shopState.preview && SOMA_ITEM_MAP[shopState.preview];
    if (!p) return base;
    if (ROOM_FLAG_SLOTS.includes(p.slot)) base[p.slot] = true;
    else if (p.slot === 'epitaph_unlock') {
        if (!base.epitaph) base.epitaph = 'Город горит — а у меня лучший вид.';
    } else {
        base[p.slot] = p.id;
    }
    return base;
}

function isOwned(id) {
    return shopState.owned.includes(id);
}

function isEquipped(id) {
    const it = SOMA_ITEM_MAP[id];
    if (!it) return false;
    const eq = shopState.equipped;
    if (ROOM_FLAG_SLOTS.includes(it.slot)) return !!eq[it.slot];
    if (it.slot === 'epitaph_unlock') return isOwned('perk_epitaph');
    return eq[it.slot] === id;
}

function frameClassOf(cosm) {
    const it = cosm && cosm.frame && SOMA_ITEM_MAP[cosm.frame];
    return it && it.css ? it.css : '';
}

function sealHtmlOf(cosmOrId) {
    const id = typeof cosmOrId === 'string' ? cosmOrId : (cosmOrId && cosmOrId.seal);
    const svg = id && SOMA_SEALS_SVG[id];
    if (!svg) return '';
    const mod = SOMA_SEAL_CLASS[id] || '';
    return `<span class="soma-seal ${mod}" aria-hidden="true">${svg}</span>`;
}

function titleLabelOf(cosm) {
    const it = cosm && cosm.title && SOMA_ITEM_MAP[cosm.title];
    return it && it.label ? it.label : '';
}

function titleSpanOf(cosmOrId, withGlyph) {
    const id = typeof cosmOrId === 'string' ? cosmOrId : (cosmOrId && cosmOrId.title);
    const it = id && SOMA_ITEM_MAP[id];
    if (!it || !it.label) return '';
    const prefix = withGlyph ? `${it.glyph || '✦'} ` : '';
    const cls = it.titleCss ? `soma-title ${it.titleCss}` : '';
    const safe = typeof esc === 'function' ? esc(prefix + it.label) : (prefix + it.label);
    return cls ? `<span class="${cls}">${safe}</span>` : safe;
}

// Текущий ключ недели (понедельник UTC) и таймер до сброса недельной охоты
function currentWeekKey(dObj) {
    const d = dObj ? new Date(dObj) : new Date();
    const day = (d.getUTCDay() + 6) % 7;
    const mon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
    return mon.toISOString().slice(0, 10);
}

function weekResetCountdown() {
    const now = new Date();
    const day = (now.getUTCDay() + 6) % 7;
    const nextMon = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 7);
    const diffH = Math.max(1, Math.floor((nextMon - now.getTime()) / 3600000));
    const days = Math.floor(diffH / 24), hrs = diffH % 24;
    return days > 0 ? `${days}д ${hrs}ч` : `${hrs}ч`;
}

function addWeeklyXp(delta) {
    const n = Math.max(0, Math.trunc(Number(delta) || 0));
    if (!n) return 0;
    const wk = currentWeekKey();
    let cur = 0;
    try {
        const raw = JSON.parse(localStorage.getItem('soma_week') || '{}') || {};
        cur = raw.key === wk ? (Math.trunc(raw.xp) || 0) : 0;
        cur += n;
        localStorage.setItem('soma_week', JSON.stringify({ key: wk, xp: cur }));
    } catch (_) { cur = n; }
    if (typeof player !== 'undefined' && player) {
        player.weeklyXp = cur;
        player.weeklyKey = wk;
    }
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient && player && player.uid) {
            supabaseClient.from('soma_users').update({ weekly_xp: cur, weekly_key: wk }).eq('username', player.uid).then(() => {}, () => {});
        }
    } catch (_) {}
    return cur;
}

function getMyWeeklyXp() {
    const wk = currentWeekKey();
    try {
        const raw = JSON.parse(localStorage.getItem('soma_week') || '{}') || {};
        if (raw.key === wk) return Math.max(0, Math.trunc(raw.xp) || 0);
    } catch (_) {}
    return 0;
}

function hydrateCosmeticsFromCloud(row) {
    if (!row || typeof row !== 'object') return;
    if (Array.isArray(row.owned_cosmetics)) {
        const merged = new Set([...shopState.owned, ...row.owned_cosmetics.filter(id => isOwnableSomaId(id))]);
        shopState.owned = [...merged];
    }
    if (row.cosmetics && typeof row.cosmetics === 'object') {
        const hasLocal = Object.values(shopState.equipped).some(Boolean);
        if (!hasLocal) shopState.equipped = normalizeEquipped(row.cosmetics, shopState.owned);
    }
    if (row.weekly_key === currentWeekKey() && typeof row.weekly_xp === 'number') {
        const best = Math.max(getMyWeeklyXp(), row.weekly_xp);
        try { localStorage.setItem('soma_week', JSON.stringify({ key: row.weekly_key, xp: best })); } catch (_) {}
    }
    saveCosmeticsLocal();
    applyCosmeticsToUI();
    if (typeof window !== 'undefined' && window.SOMA_RECEIVER && typeof window.SOMA_RECEIVER.refresh === 'function') {
        window.SOMA_RECEIVER.refresh();
    }
}

function syncCosmeticsCloud() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient || typeof player === 'undefined' || !player.uid) return;
        const payload = { cosmetics: shopState.equipped };
        // На PTS разрешаем синхронизировать и тестовые предметы; в проде owned_cosmetics пишет только Edge Function!
        if (typeof isPtsMode === 'function' && isPtsMode()) payload.owned_cosmetics = shopState.owned;
        supabaseClient.from('soma_users').update(payload).eq('username', player.uid).then(() => {}, () => {});
    } catch (_) {}
}

// Винил «Ночной экспресс»: бархатный лоу-фай аккорд Rhodes + виниловый шорох + мягкий ритм ночного поезда
let tapeChordIdx = 0;
const TAPE_CHORDS = [
    [220.0, 261.6, 329.6, 392.0], // Am7 — тёплая ночная меланхолия
    [174.6, 220.0, 261.6, 329.6], // Fmaj7 — свет вагона в дожде
    [146.8, 174.6, 220.0, 261.6], // Dm7 — тихое дыхание города
    [164.8, 196.0, 246.9, 293.7]  // Em7 — возвращение домой
];

function syncAmbientTape(enabled) {
    if (!enabled) {
        if (tapeTimer) { clearInterval(tapeTimer); tapeTimer = null; }
        return;
    }
    if (tapeTimer || typeof setInterval !== 'function') return;
    const playBar = () => {
        if (typeof document !== 'undefined' && document.hidden) return;
        if (typeof soundOn !== 'undefined' && !soundOn) return;
        // Уступаем сцену ламповому приёмнику RX-88, пока играет пластинка или поток
        if (typeof window !== 'undefined' && window.SOMA_RECEIVER
            && typeof window.SOMA_RECEIVER.isAudioActive === 'function' && window.SOMA_RECEIVER.isAudioActive()) return;
        const prof = typeof document !== 'undefined' && document.getElementById('view-profile');
        if (!prof || prof.classList.contains('hidden')) return;
        const chord = TAPE_CHORDS[tapeChordIdx % TAPE_CHORDS.length];
        tapeChordIdx++;
        if (typeof tone === 'function') {
            // Мягкий обволакивающий аккорд виниловой пластинки
            chord.forEach((f, idx) => tone(f, 2.2, 'sine', 0.0085, idx * 0.09, f * 0.998));
            // Уютный мерный перестук колёс ночного экспресса на мосту
            tone(72, 0.12, 'sine', 0.02, 0.1, 58);
            tone(66, 0.12, 'sine', 0.016, 0.28, 54);
            tone(70, 0.11, 'sine', 0.015, 1.35, 56);
            tone(64, 0.11, 'sine', 0.012, 1.53, 52);
        }
        if (typeof noise === 'function') {
            noise(0.08, 0.007, 0.05, 1850);
            noise(0.07, 0.005, 1.8, 2100);
        }
    };
    tapeTimer = setInterval(playBar, 5200);
}

function renderRoomTryOnBar() {
    if (typeof document === 'undefined') return;
    const bar = document.getElementById('station-tryon-bar');
    const txt = document.getElementById('station-tryon-text');
    const buyBtn = document.getElementById('station-tryon-buy');
    if (!bar) return;
    const it = shopState.liveRoomTry && shopState.preview && SOMA_ITEM_MAP[shopState.preview];
    if (!it || isOwned(it.id)) {
        bar.classList.add('hidden');
        return;
    }
    const pts = typeof isPtsMode === 'function' && isPtsMode();
    let label = `ПРИМЕРКА: «${it.name}»`;
    const tryCat = it.id === 'room_cat' ? currentSelfCatSpec() : null;
    const tryDog = it.id === 'room_dog' ? currentSelfDogSpec() : null;
    if (tryCat && tryCat.coat) {
        label = `ПРИМЕРКА: ВАШ КОТ · ${tryCat.coat.name.toUpperCase()}`;
    } else if (tryDog && tryDog.breed) {
        label = `ПРИМЕРКА: ВАШ ПЁС · ${tryDog.breed.name.toUpperCase()}`;
    }
    if (txt) txt.textContent = label;
    if (buyBtn) {
        buyBtn.textContent = pts ? `ВЗЯТЬ (${it.stars} ⭐)` : `ОТКРЫТЬ · ${it.stars} ⭐`;
        buyBtn.onclick = () => {
            const id = it.id;
            stopRoomTryOn(true);
            openShop(it.tab);
            purchaseCosmetic(id);
        };
    }
    bar.classList.remove('hidden');
}

function stopRoomTryOn(silent) {
    shopState.liveRoomTry = false;
    shopState.preview = null;
    if (!silent && typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    applyCosmeticsToUI();
    if (typeof renderRoom === 'function') renderRoom();
}

// Применяет выбранную косметику к пейджеру, карточке Свидетеля в профиле и комнате
function applyCosmeticsToUI() {
    if (typeof document === 'undefined') return;
    const c = getActiveCosmetics();

    // 1) Скин пейджера SOMA // PGR-04
    const pager = document.getElementById('soma-pager');
    if (pager) {
        if (c.pager) pager.dataset.skin = c.pager;
        else delete pager.dataset.skin;
    }

    // 2) Карточка Свидетеля в профиле (рамка, печать, титул, эпитафия)
    const card = document.getElementById('witness-card');
    if (card && card.classList) {
        SOMA_FRAME_CLASSES.forEach(cls => card.classList.remove(cls));
        const fc = frameClassOf(c);
        if (fc) card.classList.add(fc);
    }
    const sealSlot = document.getElementById('card-seal');
    if (sealSlot) sealSlot.innerHTML = sealHtmlOf(c);
    const titleSlot = document.getElementById('card-custom-title');
    if (titleSlot) {
        const th = titleSpanOf(c, true);
        titleSlot.innerHTML = th;
        titleSlot.classList.toggle('hidden', !th);
    }
    const epSlot = document.getElementById('card-epitaph');
    if (epSlot) {
        epSlot.textContent = c.epitaph ? `«${c.epitaph}»` : '';
        epSlot.classList.toggle('hidden', !c.epitaph);
    }

    // 3) Звуковая плёнка, зоны поглаживания питомцев, плашка живой примерки и перерисовка комнаты
    syncAmbientTape(!!c.tape);
    if (typeof syncCompanionHotspots === 'function') syncCompanionHotspots();
    renderRoomTryOnBar();
    if (typeof ensureStationLoop === 'function') ensureStationLoop();
}

// ===== БУТИК ПРИВИЛЕГИЙ SOMA (ПРИМЕРКА, ЭКИПИРОВКА, ОПЛАТА TELEGRAM STARS) =====
function openShop(tab) {
    if (typeof exitRoomFullscreen === 'function') exitRoomFullscreen(true);
    if (tab) shopState.tab = tab;
    shopState.liveRoomTry = false;
    shopState.notice = '';
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    applyCosmeticsToUI();
    renderShop();
    const m = document.getElementById('shop-modal');
    if (m) m.classList.remove('hidden');
}

function closeShop() {
    if (!shopState.liveRoomTry) shopState.preview = null;
    shopState.notice = '';
    const m = document.getElementById('shop-modal');
    if (m) m.classList.add('hidden');
    applyCosmeticsToUI();
    const topView = document.getElementById('view-top');
    if (topView && !topView.classList.contains('hidden') && typeof renderLeaderboard === 'function') {
        renderLeaderboard();
    }
    if (typeof window !== 'undefined' && typeof window.restoreSomaScroll === 'function') {
        window.restoreSomaScroll();
    }
}

function switchShopTab(tab) {
    shopState.tab = tab;
    shopState.notice = '';
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    renderShop();
}

function tryCosmetic(id) {
    const it = SOMA_ITEM_MAP[id];
    if (!it) return;
    // Для атрибутов комнаты и пейджера сразу показываем живую примерку прямо в вашей комнате!
    if (it.tab === 'room' || it.tab === 'pager') {
        shopState.preview = id;
        shopState.liveRoomTry = true;
        const m = document.getElementById('shop-modal');
        if (m) m.classList.add('hidden');
        if (typeof switchTab === 'function') switchTab('profile');
        applyCosmeticsToUI();
        if (typeof renderRoom === 'function') renderRoom();
        if (it.id === 'room_cat' && typeof roomAnim !== 'undefined') {
            roomAnim.catPetStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
            if (typeof playObjectTone === 'function') playObjectTone('cat');
        } else if (it.id === 'room_dog' && typeof roomAnim !== 'undefined') {
            roomAnim.dogPetStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
            if (typeof playObjectTone === 'function') playObjectTone('dog');
        } else if (typeof SFX !== 'undefined' && SFX.tap) {
            SFX.tap();
        }
        if (it.tab === 'pager') {
            const pg = document.getElementById('soma-pager');
            if (pg && pg.scrollIntoView) try { pg.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
        } else {
            const st = document.getElementById('station');
            if (st && st.scrollIntoView) try { st.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}
        }
        return;
    }
    shopState.liveRoomTry = false;
    shopState.preview = shopState.preview === id ? null : id;
    shopState.notice = shopState.preview
        ? `Примерка: «${it.name}» показан на образце строки Топа выше.`
        : '';
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    applyCosmeticsToUI();
    renderShop();
}

function toggleEquipCosmetic(id) {
    const it = SOMA_ITEM_MAP[id];
    if (!it || !isOwned(id)) return;
    shopState.preview = null;
    shopState.liveRoomTry = false;
    const eq = shopState.equipped;
    if (ROOM_FLAG_SLOTS.includes(it.slot)) eq[it.slot] = !eq[it.slot];
    else if (it.slot !== 'epitaph_unlock') {
        eq[it.slot] = eq[it.slot] === id ? '' : id;
    }
    saveCosmeticsLocal();
    syncCosmeticsCloud();
    applyCosmeticsToUI();
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    renderShop();
}

function saveMyEpitaph() {
    if (!isOwned('perk_epitaph')) return;
    const inp = document.getElementById('shop-epitaph-input');
    if (!inp) return;
    const check = sanitizeEpitaph(inp.value);
    if (!check.ok) {
        shopState.notice = '⛔ ' + check.error;
        if (typeof SFX !== 'undefined' && SFX.block) SFX.block();
        renderShop();
        return;
    }
    shopState.equipped.epitaph = check.value;
    saveCosmeticsLocal();
    syncCosmeticsCloud();
    applyCosmeticsToUI();
    shopState.notice = check.value ? '✓ Эпитафия сохранена и видна в Топе Циников.' : 'Эпитафия скрыта.';
    if (typeof SFX !== 'undefined' && SFX.react) SFX.react();
    renderShop();
}

function grantOwnedTrack(id) {
    if (!isCollectibleTrackId(id)) return false;
    if (!shopState.owned.includes(id)) shopState.owned.push(id);
    saveCosmeticsLocal();
    syncCosmeticsCloud();
    if (typeof window !== 'undefined' && window.SOMA_RECEIVER && typeof window.SOMA_RECEIVER.refresh === 'function') {
        window.SOMA_RECEIVER.refresh();
    }
    return true;
}

function grantOwnedItem(id) {
    if (!SOMA_ITEM_MAP[id]) return;
    if (!shopState.owned.includes(id)) shopState.owned.push(id);
    shopState.preview = null;
    shopState.liveRoomTry = false;
    const it = SOMA_ITEM_MAP[id];
    if (ROOM_FLAG_SLOTS.includes(it.slot)) shopState.equipped[it.slot] = true;
    else if (it.slot !== 'epitaph_unlock') shopState.equipped[it.slot] = id;
    saveCosmeticsLocal();
    syncCosmeticsCloud();
    applyCosmeticsToUI();
}

function openPetNamePrompt(kind) {
    if (kind !== 'cat' && kind !== 'dog') return;
    shopState.tab = 'room';
    shopState.namingPet = kind;
    renderShop();
    setTimeout(() => {
        const inp = typeof document !== 'undefined' && document.getElementById('shop-petname-input');
        if (inp && typeof inp.focus === 'function') {
            try { inp.focus(); inp.select && inp.select(); } catch (_) {}
        }
    }, 30);
}

function saveMyPetName(kind) {
    const k = kind === 'dog' ? 'dog' : 'cat';
    const itemId = k === 'dog' ? 'room_dog' : 'room_cat';
    if (!isOwned(itemId)) return;
    const inp = typeof document !== 'undefined' && document.getElementById('shop-petname-input');
    const res = setPetName(k, inp ? inp.value : '');
    if (!res.ok) {
        shopState.notice = '⛔ ' + res.error;
        if (typeof SFX !== 'undefined' && SFX.block) SFX.block();
        renderShop();
        return;
    }
    shopState.namingPet = '';
    const who = k === 'dog' ? 'Пёс' : 'Кот';
    shopState.notice = res.value
        ? `✓ ${who} запомнил своё имя — «${res.value}». Оно звучит только в строках журнала комнаты, когда вы рядом.`
        : `✓ Имя снято — в журнале снова звучит природный облик хранителя.`;
    try { Telegram.WebApp.HapticFeedback.notificationOccurred('success'); } catch (_) {}
    if (typeof SFX !== 'undefined' && SFX.react) SFX.react();
    renderShop();
}

function skipMyPetName() {
    shopState.namingPet = '';
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    renderShop();
}

async function purchaseCosmetic(id) {
    const it = SOMA_ITEM_MAP[id];
    if (!it || shopState.buying) return;
    if (isOwned(id)) { toggleEquipCosmetic(id); return; }

    const isPet = id === 'room_cat' || id === 'room_dog';
    const petKind = id === 'room_dog' ? 'dog' : (id === 'room_cat' ? 'cat' : '');

    const pts = typeof isPtsMode === 'function' && isPtsMode();
    if (pts) {
        grantOwnedItem(id);
        if (isPet) shopState.namingPet = petKind;
        shopState.notice = isPet
            ? `✓ PTS: «${it.name}» уже в комнате — при желании дайте ему личное имя ниже!`
            : `✓ PTS: «${it.name}» открыт и надет (в релизе — ${it.stars} ⭐ Telegram Stars).`;
        try { Telegram.WebApp.HapticFeedback.notificationOccurred('success'); } catch (_) {}
        if (typeof SFX !== 'undefined' && SFX.react) SFX.react();
        renderShop();
        if (isPet) openPetNamePrompt(petKind);
        return;
    }

    const fnUrl = (typeof cfg !== 'undefined' && cfg && cfg.STARS_FUNCTION_URL) || '';
    const tg = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp;
    if (!fnUrl || !tg || typeof tg.openInvoice !== 'function') {
        tryCosmetic(id);
        shopState.notice = !fnUrl
            ? `Касса Telegram Stars (${it.stars} ⭐) подключается. Включена живая примерка «${it.name}».`
            : `Оплата ${it.stars} ⭐ доступна внутри Telegram Mini App. Включена примерка «${it.name}».`;
        renderShop();
        return;
    }

    shopState.buying = id;
    shopState.notice = 'Формирование счёта Telegram Stars...';
    renderShop();
    try {
        const res = await fetch(fnUrl.replace(/\/$/, '') + '/create-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                itemId: id,
                uid: player.uid,
                initData: tg.initData || ''
            })
        });
        const data = await res.json();
        if (!res.ok || !data || !data.invoiceUrl) throw new Error((data && data.error) || 'Счёт недоступен');
        tg.openInvoice(data.invoiceUrl, async status => {
            shopState.buying = '';
            if (status === 'paid') {
                grantOwnedItem(id);
                if (isPet) shopState.namingPet = petKind;
                // Подтверждаем список покупок из Supabase (записанный вебхуком бота)
                try {
                    const { data: row } = await supabaseClient.from('soma_users').select('owned_cosmetics').eq('username', player.uid).single();
                    if (row) hydrateCosmeticsFromCloud(row);
                } catch (_) {}
                shopState.notice = isPet
                    ? `✓ Оплачено (${it.stars} ⭐): «${it.name}» теперь живёт у вас — дайте ему имя!`
                    : `✓ Оплачено (${it.stars} ⭐): «${it.name}» навсегда в вашей коллекции!`;
                try { tg.HapticFeedback.notificationOccurred('success'); } catch (_) {}
                if (typeof SFX !== 'undefined' && SFX.egg) SFX.egg();
            } else if (status === 'cancelled') {
                shopState.notice = 'Оплата отменена.';
            } else {
                shopState.notice = 'Не удалось завершить оплату. Попробуйте позже.';
            }
            renderShop();
            if (status === 'paid' && isPet) openPetNamePrompt(petKind);
        });
    } catch (e) {
        shopState.buying = '';
        shopState.notice = 'Касса временно недоступна: ' + ((e && e.message) || 'ошибка сети');
        if (typeof SFX !== 'undefined' && SFX.block) SFX.block();
        renderShop();
    }
}

function renderShop() {
    const body = document.getElementById('shop-body');
    const prev = document.getElementById('shop-preview');
    const note = document.getElementById('shop-notice');
    if (!body) return;

    document.querySelectorAll('[data-shop-tab]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.dataset.shopTab === shopState.tab));
    });

    // Живое превью того, как игрок выглядит в Топе Циников прямо сейчас
    const c = getActiveCosmetics();
    const myAnon = typeof anonLabel === 'function' ? anonLabel((typeof player !== 'undefined' && player.uid) || 'guest') : 'Аноним #1001';
    const fc = frameClassOf(c);
    const tl = titleLabelOf(c);
    const pts = typeof isPtsMode === 'function' && isPtsMode();

    if (prev) {
        const selfCat = currentSelfCatSpec();
        const selfDog = currentSelfDogSpec();
        const myCatLabel = (selfCat && selfCat.coat && selfCat.coat.name) ? selfCat.coat.name : 'Кот-хранитель';
        const myDogLabel = (selfDog && selfDog.breed && selfDog.breed.name) ? selfDog.breed.name : 'Пёс-хранитель';
        const activeRoomPot = (typeof activeRoomPotSkin === 'function' ? activeRoomPotSkin(c.pot) : c.pot) || '';
        const gearBits = [];
        if (c.pager && SOMA_ITEM_MAP[c.pager]) gearBits.push(`📟 ${SOMA_ITEM_MAP[c.pager].name}`);
        if (activeRoomPot && SOMA_ITEM_MAP[activeRoomPot]) gearBits.push(`🏺 ${SOMA_ITEM_MAP[activeRoomPot].name}`);
        if (c.cat) gearBits.push(`🐈 ${myCatLabel}`);
        if (c.dog) gearBits.push(`🐕 ${myDogLabel}`);
        if (c.garland) gearBits.push('💡 Огни Эдисона');
        if (c.candles) gearBits.push('🕯 Свечи');
        if (c.steam) gearBits.push('☕ Чай и сандал');
        if (c.tape) gearBits.push('💿 Ночной экспресс');
        prev.className = `shop-preview-card ${fc}`.trim();
        prev.innerHTML = `
            <div class="flex justify-between items-center gap-2">
                <span class="top-row-name">${sealHtmlOf(c)}<span>${esc(myAnon)}</span>${shopState.preview ? '<span class="top-you-tag">ПРИМЕРКА</span>' : ''}</span>
                <span class="top-row-xp">${(typeof player !== 'undefined' && player.xp) || 0} XP</span>
            </div>
            ${tl ? `<div class="top-custom-title">${titleSpanOf(c, true)}</div>` : '<div class="text-[9.5px] text-gray-500">ОБЛИК В СОЗВЕЗДИИ СТАНЦИИ И КОМНАТЕ</div>'}
            ${c.epitaph ? `<p class="top-epitaph">«${esc(c.epitaph)}»</p>` : ''}
            ${gearBits.length ? `<div class="text-[9px] text-gray-400 pt-0.5">${gearBits.map(esc).join(' · ')}</div>` : ''}
        `;
    }

    if (note) {
        note.textContent = shopState.notice;
        note.classList.toggle('hidden', !shopState.notice);
    }

    const items = SOMA_CATALOG.filter(it => it.tab === shopState.tab);
    let html = '';

    // Редактор личной эпитафии во вкладке «Статус», если открыто право на эпитафию
    if (shopState.tab === 'status' && isOwned('perk_epitaph')) {
        const curEp = shopState.equipped.epitaph || '';
        html += `
        <div class="shop-item is-equipped">
            <div class="flex items-center justify-between gap-2 text-[10px] font-mono-tech text-amber-300 uppercase">
                <span>// ВАША ЭПИТАФИЯ В ТОПЕ (ДО 66 СИМВ.)</span>
                <span id="shop-epitaph-count" class="text-rose-200/80">${curEp.length} / 66</span>
            </div>
            <div class="flex gap-1.5">
                <input id="shop-epitaph-input" maxlength="66" value="${esc(curEp)}" oninput="(function(el){var c=document.getElementById('shop-epitaph-count');if(c)c.textContent=el.value.length+' / 66';})(this)" placeholder="Город горит — а у меня лучший вид..." class="flex-1 min-w-0 bg-[#080305] border border-red-500/35 focus:border-red-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono-tech">
                <button type="button" onclick="saveMyEpitaph()" class="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-500/50 rounded-lg text-[10px] font-mono-tech text-red-100 font-bold shrink-0">СОХР.</button>
            </div>
        </div>`;
    }

    let lastGroup = '';
    items.forEach(it => {
        if (it.group && it.group !== lastGroup && SHOP_GROUP_META[it.group]) {
            lastGroup = it.group;
            const gm = SHOP_GROUP_META[it.group];
            html += `<div class="shop-tier-head"><span>${esc(gm.title)}</span><span class="shop-tier-pill">${esc(gm.pill)}</span></div>`;
        }
        const owned = isOwned(it.id);
        const eq = isEquipped(it.id);
        const trying = shopState.preview === it.id;
        const sealBadge = SOMA_SEALS_SVG[it.id] ? `<span class="shop-seal-badge">${sealHtmlOf(it.id)}</span>` : '';
        let liveSwatch = '';
        if (it.slot === 'frame' && it.css) {
            liveSwatch = `
            <div class="shop-swatch-frame ${it.css}">
                <span class="top-row-name text-[11px]">${sealHtmlOf(c)}<span>${esc(myAnon)}</span></span>
                <span class="shop-swatch-tag">${esc(it.motion || 'ЖИВАЯ РАМКА')}</span>
            </div>`;
        } else if (it.slot === 'title') {
            liveSwatch = `
            <div class="shop-swatch-title">
                ${titleSpanOf(it.id, true)}
                <span class="text-[8.5px] text-gray-500 shrink-0">ЖИВОЙ ТИТУЛ</span>
            </div>`;
        } else if (it.slot === 'pager') {
            liveSwatch = `
            <div class="soma-pager shop-swatch-pager" data-skin="${it.id}">
                <div class="pager-lcd">
                    <span class="pager-lcd-main flex items-center gap-1.5"><i class="pager-led" aria-hidden="true"></i>${esc(it.sample || 'NEEOSOMA // NMAV-04')}</span>
                    <span class="pager-carrier text-[8.5px]">${esc(it.motion || '')}</span>
                </div>
            </div>`;
        } else if (it.slot === 'pot' && SOMA_POT_META[it.id]) {
            liveSwatch = `
            <div class="shop-swatch-pot shop-swatch-pot--${it.id}">
                <span class="shop-swatch-pot-gem"><i class="shop-swatch-pot-dot" aria-hidden="true"></i><span>${esc(SOMA_POT_META[it.id].badge)}</span></span>
                <span class="opacity-70 shrink-0">ОРАНЖЕРЕЯ</span>
            </div>`;
        }
        const buyLabel = shopState.buying === it.id
            ? 'СЧЁТ...'
            : pts
                ? `PTS · ВЗЯТЬ (${it.stars} ⭐)`
                : `ОТКРЫТЬ ЗА ${it.stars} ⭐`;
        const eqLabel = it.slot === 'epitaph_unlock'
            ? '✓ ПРАВО АКТИВНО (ПОЛЕ ВЫШЕ)'
            : (eq ? '✓ НАДЕТО (СНЯТЬ)' : 'НАДЕТЬ');
        const tryLabel = (it.tab === 'room' || it.tab === 'pager')
            ? 'В КОМНАТЕ'
            : (trying ? 'СБРОС' : 'ПРИМЕРИТЬ');
        const motionNote = (it.slot === 'seal' && it.motion)
            ? `<span class="text-[8.5px] font-mono-tech text-rose-300/75">· ${esc(it.motion)}</span>`
            : '';
        const cardCat = it.id === 'room_cat' ? currentSelfCatSpec() : null;
        const cardDog = it.id === 'room_dog' ? currentSelfDogSpec() : null;
        const personalPet = (cardCat && cardCat.summary)
            ? `<div class="text-[9.5px] font-mono-tech text-amber-300/95 mt-1">✦ ВАШ КОТ: ${esc(cardCat.summary.toUpperCase())}</div>`
            : (cardDog && cardDog.summary)
                ? `<div class="text-[9.5px] font-mono-tech text-amber-300/95 mt-1">✦ ВАШ ПЁС: ${esc(cardDog.summary.toUpperCase())}</div>`
                : '';
        const petKind = it.id === 'room_cat' ? 'cat' : (it.id === 'room_dog' ? 'dog' : '');
        const hasPetName = petKind && owned && !!getPetName(petKind);
        const petNameBtn = (petKind && owned)
            ? `<button type="button" class="shop-btn shop-btn--petname" onclick="openPetNamePrompt('${petKind}')">${hasPetName ? '✎ ИМЯ' : '✎ ДАТЬ ИМЯ'}</button>`
            : '';
        const petNameEditor = (petKind && owned && shopState.namingPet === petKind)
            ? `
            <div class="shop-petname-box">
                <div class="shop-petname-title">${petKind === 'cat' ? '✦ КАК НАЗОВЁТЕ ВАШЕГО КОТА-ХРАНИТЕЛЯ?' : '✦ КАК НАЗОВЁТЕ ВАШЕГО ПСА-ХРАНИТЕЛЯ?'}</div>
                <div class="shop-petname-sub">Имя знаете только вы — оно оживёт лишь в журнале комнаты, когда вы гладите питомца.</div>
                <div class="shop-petname-row">
                    <input id="shop-petname-input" type="text" maxlength="20" class="shop-petname-input"
                        placeholder="${petKind === 'cat' ? 'Напр. Нокс, Луна, Уголёк...' : 'Напр. Юки, Марс, Облачко...'}"
                        value="${esc(getPetName(petKind))}"
                        onkeydown="if(event.key==='Enter'){event.preventDefault();saveMyPetName('${petKind}');}">
                    <button type="button" class="shop-btn shop-btn--buy" style="flex:0 0 auto;padding-inline:11px" onclick="saveMyPetName('${petKind}')">СОХРАНИТЬ</button>
                </div>
                <div class="flex justify-end">
                    <button type="button" class="text-[9.5px] font-mono-tech text-gray-400 hover:text-gray-200 transition" onclick="skipMyPetName()">ПОЗЖЕ</button>
                </div>
            </div>`
            : '';
        html += `
        <div class="shop-item ${eq ? 'is-equipped' : ''}">
            ${liveSwatch}
            <div class="shop-item-top">
                <div class="flex items-start gap-2.5 min-w-0">
                    ${sealBadge}
                    <div class="min-w-0">
                        <div class="shop-item-name flex-wrap"><span>${esc(it.name)}</span>${motionNote}</div>
                        <p class="shop-item-desc">${esc(it.desc)}</p>
                        ${personalPet}
                    </div>
                </div>
                <span class="shop-price ${owned ? 'is-owned' : ''}">${owned ? 'В КОЛЛЕКЦИИ' : `${it.stars} ⭐`}</span>
            </div>
            <div class="shop-actions">
                ${owned
                    ? `<button type="button" class="shop-btn shop-btn--equip" ${it.slot === 'epitaph_unlock' ? 'disabled' : `onclick="toggleEquipCosmetic('${it.id}')"`}>${eqLabel}</button>${petNameBtn}`
                    : `<button type="button" class="shop-btn shop-btn--buy" onclick="purchaseCosmetic('${it.id}')">${buyLabel}</button>
                       <button type="button" class="shop-btn shop-btn--try" onclick="tryCosmetic('${it.id}')">${tryLabel}</button>`}
            </div>
            ${petNameEditor}
        </div>`;
    });

    body.innerHTML = html;
}

// ===== ПАФОСНЫЙ ТРИБУНАЛ «СОЗВЕЗДИЕ СТАНЦИИ» + ДОСЬЕ СВИДЕТЕЛЯ =====
function switchTopMode(mode) {
    shopState.topMode = mode === 'week' ? 'week' : 'all';
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    renderLeaderboard();
}

function rankTitleForXp(xp) {
    const val = Math.max(0, Number(xp) || 0);
    if (typeof ranks === 'undefined' || !ranks.length) return 'УР. 1 // СЛУЧАЙНЫЙ ПРОХОЖИЙ';
    let cur = ranks[0];
    for (let i = 0; i < ranks.length; i++) if (val >= ranks[i].minXp) cur = ranks[i];
    return cur.title;
}

function starsForXp(xp) {
    const val = Math.max(0, Number(xp) || 0);
    if (typeof ranks === 'undefined' || !ranks.length) return 1;
    let idx = 0;
    ranks.forEach((r, i) => { if (val >= r.minXp) idx = i; });
    return idx + 1;
}

function entryCosmetics(row) {
    const me = typeof player !== 'undefined' && row.username === player.uid;
    if (me) return getActiveCosmetics();
    return normalizeEquipped(row.cosmetics, null);
}

const LEADERBOARD_LIMIT = 13;

async function renderLeaderboard() {
    const isWeek = shopState.topMode === 'week';
    const wk = currentWeekKey();

    document.querySelectorAll('[data-top-mode]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.dataset.topMode === shopState.topMode));
    });
    const subnote = document.getElementById('top-subnote');
    if (subnote) {
        subnote.textContent = isWeek
            ? `ОПЫТ НЕДЕЛИ · ОБНОВЛЕНИЕ ЧЕРЕЗ ${weekResetCountdown()} · ЭТО ИГРОВОЙ ОПЫТ, НЕ ОЦЕНКА ЭМПАТИИ`
            : 'СОЗВЕЗДИЕ СТАНЦИИ · ИГРОВОЙ ОПЫТ, НЕ РЕЙТИНГ ДОБРОТЫ';
    }

    let data = null, myRank = null, weekSupported = isWeek;
    try {
        if (supabaseClient) {
            if (isWeek) {
                const wRes = await supabaseClient
                    .from('soma_users')
                    .select('username,xp,weekly_xp,weekly_key,help_attempts,reacts,seen,cosmetics')
                    .eq('weekly_key', wk)
                    .gt('weekly_xp', 0)
                    .order('weekly_xp', { ascending: false })
                    .limit(LEADERBOARD_LIMIT);
                if (!wRes.error && Array.isArray(wRes.data)) {
                    data = wRes.data.map(r => ({ ...r, score: r.weekly_xp || 0 }));
                } else {
                    weekSupported = false;
                }
            }
            if (!data) {
                // Пробуем расширенный запрос с cosmetics, а если колонка ещё не добавлена — мгновенный фолбэк!
                let res = await supabaseClient
                    .from('soma_users')
                    .select('username,xp,help_attempts,reacts,seen,cosmetics')
                    .order('xp', { ascending: false })
                    .limit(LEADERBOARD_LIMIT);
                if (res.error) {
                    res = await supabaseClient
                        .from('soma_users')
                        .select('username,xp,help_attempts')
                        .order('xp', { ascending: false })
                        .limit(LEADERBOARD_LIMIT);
                }
                if (Array.isArray(res.data)) {
                    data = res.data.map(r => ({ ...r, score: r.xp || 0 }));
                }
                const c = await supabaseClient.from('soma_users').select('username', { count: 'exact', head: true }).gt('xp', player.xp || 0);
                if (typeof c.count === 'number') myRank = c.count + 1;
            }
        }
    } catch (_) {}

    const myScore = (isWeek && weekSupported) ? getMyWeeklyXp() : (player.xp || 0);
    const meEntry = {
        username: player.uid || 'local_me',
        xp: player.xp || 0,
        score: myScore,
        help_attempts: typeof getWhisperBreachCount === 'function' ? getWhisperBreachCount() : (player.whispersSent || 0),
        reacts: player.reacts || 0,
        seen: player.seen || 0,
        cosmetics: getActiveCosmetics()
    };

    if (!data || !data.length) {
        data = [meEntry];
    } else {
        const idx = data.findIndex(x => x.username === player.uid);
        if (idx >= 0) {
            data[idx] = { ...data[idx], score: Math.max(data[idx].score || 0, myScore), xp: Math.max(data[idx].xp || 0, player.xp || 0), cosmetics: getActiveCosmetics() };
        } else if (isWeek && weekSupported && myScore > 0) {
            data.push(meEntry);
        }
        data.sort((a, b) => (b.score || 0) - (a.score || 0));
        data = data.slice(0, LEADERBOARD_LIMIT);
    }

    const myIdx = data.findIndex(x => x.username === player.uid);
    const resolvedRank = myIdx >= 0 ? myIdx + 1 : (myRank || data.length + 1);
    shopState.lastBoard = data.map((r, i) => ({ ...r, place: i + 1 }));
    shopState.myRank = resolvedRank;

    // 1) Плашка погони (мощнейший крючок азарта: сколько XP до соседа выше!)
    const chaseEl = document.getElementById('top-chase');
    if (chaseEl) {
        let gapText = '', pct = 100;
        if (resolvedRank === 1) {
            const second = data[1];
            const lead = second ? Math.max(0, myScore - (second.score || 0)) : myScore;
            gapText = second ? `ОТРЫВ ОТ #2: +${lead} XP` : 'ТРОН СВОБОДЕН — УДЕРЖИТЕ #1';
            pct = 100;
        } else if (myIdx > 0) {
            const rival = data[myIdx - 1];
            const prevScore = myIdx + 1 < data.length ? (data[myIdx + 1].score || 0) : 0;
            const need = Math.max(1, (rival.score || 0) - myScore + 1);
            const span = Math.max(1, (rival.score || 0) - prevScore);
            pct = Math.max(10, Math.min(96, Math.round(((myScore - prevScore) / span) * 100)));
            gapText = `ДО #${myIdx} (${anonLabel(rival.username)}): ${need} XP`;
        } else {
            const gate = data[data.length - 1];
            const need = gate ? Math.max(1, (gate.score || 0) - myScore + 1) : 10;
            pct = gate && gate.score > 0 ? Math.max(8, Math.min(94, Math.round((myScore / gate.score) * 100))) : 12;
            gapText = `ДО ВХОДА В ТОП-${data.length}: ${need} XP`;
        }
        chaseEl.onclick = () => openDossierByUid(player.uid || 'local_me', resolvedRank);
        chaseEl.innerHTML = `
            <div class="top-chase-row">
                <span class="top-chase-me">ВАШЕ МЕСТО: #${resolvedRank} · ${myScore} XP</span>
                <span class="top-chase-gap">${esc(gapText)}</span>
            </div>
            <div class="top-chase-bar"><div class="top-chase-fill" style="width:${pct}%"></div></div>
        `;
    }

    // 2) Пьедестал Топ-3 (Трон #1 + Верхняя триада #2 и #3)
    const podiumEl = document.getElementById('top-podium');
    if (podiumEl) {
        const first = shopState.lastBoard[0];
        const runners = shopState.lastBoard.slice(1, 3);
        let pHtml = '';
        if (first) {
            const c1 = entryCosmetics(first);
            const me1 = first.username === player.uid;
            const t1 = titleLabelOf(c1) || 'ВЕРХОВНЫЙ НАБЛЮДАТЕЛЬ';
            const ep1 = c1.epitaph || 'Смотрит сверху на чужие огни и не моргает.';
            pHtml += `
            <div class="top-throne ${frameClassOf(c1)}" onclick="openDossierByIndex(0)">
                <span class="top-throne-crown">${THRONE_CROWN_SVG}<span>#1 // ТРОН ПАНОПТИКУМА</span></span>
                <div class="top-throne-name">
                    ${sealHtmlOf(c1)}
                    <span>${esc(anonLabel(first.username))}</span>
                    ${me1 ? '<span class="top-you-tag">ВЫ</span>' : ''}
                </div>
                <div class="top-custom-title">${titleSpanOf(c1, true) || `✦ ${esc(t1)}`}</div>
                <p class="top-epitaph">«${esc(ep1)}»</p>
                <div class="top-throne-stats">
                    <span class="top-throne-xp">${first.score || 0} XP</span>
                    <span>·</span>
                    <span>ШЁПОТОВ: ${first.help_attempts || 0}</span>
                </div>
            </div>`;
        }
        if (runners.length) {
            pHtml += `<div class="top-podium-grid">` + runners.map((r, idx) => {
                const pl = idx + 2;
                const cr = entryCosmetics(r);
                const meR = r.username === player.uid;
                const tr = titleLabelOf(cr) || (pl === 2 ? 'ПРАВАЯ РУКА ЭФИРА' : 'ХРАНИТЕЛЬ ЭКРАНА');
                return `
                <div class="top-runner top-runner--${pl} ${frameClassOf(cr)}" onclick="openDossierByIndex(${pl - 1})">
                    <div class="top-runner-place">#0${pl} // ТРИАДА ${meR ? '· ВЫ' : ''}</div>
                    <div class="top-runner-name">${sealHtmlOf(cr)}<span>${esc(anonLabel(r.username))}</span></div>
                    <div class="top-custom-title truncate">${titleSpanOf(cr, false) || esc(tr)}</div>
                    <div class="top-runner-xp">${r.score || 0} XP</div>
                </div>`;
            }).join('') + `</div>`;
        }
        podiumEl.innerHTML = pHtml;
    }

    // 3) Ещё 10 мест под пьедесталом: #4–#13.
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    const rest = shopState.lastBoard.slice(3);
    const renderRow = (b, clickExpr) => {
        const me = b.username === player.uid;
        const cb = entryCosmetics(b);
        const lodge = b.place <= 10;
        const tb = titleSpanOf(cb, true);
        const sub = cb.epitaph
            ? `«${esc(cb.epitaph)}»`
            : tb
                ? tb
                : `Шёпотов: ${b.help_attempts || 0}`;
        return `
        <div class="top-row ${lodge ? 'top-row--lodge' : ''} ${me ? 'top-row--me' : ''} ${frameClassOf(cb)}" onclick="${clickExpr}">
            <div class="top-row-left">
                <span class="top-rank-num">#${b.place < 10 ? '0' + b.place : b.place}</span>
                <div class="top-row-info">
                    <div class="top-row-name">
                        ${sealHtmlOf(cb)}
                        <span>${esc(anonLabel(b.username))}</span>
                        ${me ? '<span class="top-you-tag">ВЫ</span>' : ''}
                    </div>
                    <div class="top-row-sub">${sub}</div>
                </div>
            </div>
            <div class="top-row-xp">${b.score || 0} XP</div>
        </div>`;
    };

    let lHtml = '';
    const lodgeRows = rest.filter(x => x.place <= 10);
    const parterreRows = rest.filter(x => x.place > 10);
    if (lodgeRows.length) {
        lHtml += `<div class="top-section-label">// ВЫСШАЯ ЛОЖА (#04–#10)</div>`;
        lHtml += lodgeRows.map(b => renderRow(b, `openDossierByIndex(${b.place - 1})`)).join('');
    }
    if (parterreRows.length) {
        lHtml += `<div class="top-section-label">// ПАРТЕР НАБЛЮДАТЕЛЕЙ (#11–#13)</div>`;
        lHtml += parterreRows.map(b => renderRow(b, `openDossierByIndex(${b.place - 1})`)).join('');
    }
    // Своя позиция вне топа доступна в плашке погони, без лишней 14-й строки.
    list.innerHTML = lHtml;
}

function openDossierByIndex(idx) {
    const entry = shopState.lastBoard[idx];
    if (!entry) return;
    openDossier(entry);
}

function openDossierByUid(uid, place) {
    const found = shopState.lastBoard.find(x => x.username === uid);
    if (found) { openDossier(found); return; }
    openDossier({
        username: player.uid || 'local_me',
        place: place || shopState.myRank || 1,
        xp: player.xp || 0,
        score: player.xp || 0,
        help_attempts: typeof getWhisperBreachCount === 'function' ? getWhisperBreachCount() : (player.whispersSent || 0),
        reacts: player.reacts || 0,
        seen: player.seen || 0,
        cosmetics: getActiveCosmetics()
    });
}

function openDossier(entry) {
    const card = document.getElementById('dossier-card');
    const body = document.getElementById('dossier-body');
    const modal = document.getElementById('dossier-modal');
    if (!body || !modal) return;
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();

    const me = entry.username === player.uid || entry.username === 'local_me';
    const c = entryCosmetics(entry);
    const fc = frameClassOf(c);
    if (card) {
        card.className = `w-full max-w-sm bg-[#100508] border border-red-500/50 p-5 rounded-2xl space-y-3.5 shadow-2xl ${fc}`.trim();
    }
    const tl = titleLabelOf(c);
    const totalXp = entry.xp ?? entry.score ?? 0;
    const stCnt = starsForXp(totalXp);
    const starRow = '★'.repeat(stCnt) + '☆'.repeat(Math.max(0, 6 - stCnt));

    const gear = [];
    if (c.frame && SOMA_ITEM_MAP[c.frame]) gear.push(SOMA_ITEM_MAP[c.frame].name);
    if (c.pager && SOMA_ITEM_MAP[c.pager]) gear.push('Пейджер: ' + SOMA_ITEM_MAP[c.pager].name);
    if (c.pot && SOMA_ITEM_MAP[c.pot]) gear.push('Сосуд: ' + SOMA_ITEM_MAP[c.pot].name);
    if (c.cat) {
        const dCat = me ? currentSelfCatSpec() : (typeof catSpec === 'function' ? catSpec(entry.username) : null);
        const catName = (dCat && dCat.coat && dCat.coat.name) ? dCat.coat.name : 'Кот-хранитель';
        gear.push('Кот: ' + catName);
    }
    if (c.dog) {
        const dDog = me ? currentSelfDogSpec() : (typeof dogSpec === 'function' ? dogSpec(entry.username) : null);
        const dogName = (dDog && dDog.breed && dDog.breed.name) ? dDog.breed.name : 'Пёс-хранитель';
        gear.push('Пёс: ' + dogName);
    }
    if (c.garland) gear.push('Огни Эдисона');
    if (c.candles) gear.push('Свечи станции');
    if (c.tape) gear.push('Ночной экспресс');
    if (c.steam) gear.push('Чай и сандал');

    const placeBadge = entry.place === 1
        ? '#1 // ВЕРХОВНЫЙ НАБЛЮДАТЕЛЬ'
        : entry.place <= 3
            ? `#0${entry.place} // ВЕРХНЯЯ ТРИАДА`
            : entry.place <= 10
                ? `#${entry.place < 10 ? '0' + entry.place : entry.place} // ВЫСШАЯ ЛОЖА`
                : `МЕСТО #${entry.place} В ПАНТЕОНЕ`;

    body.innerHTML = `
        <div class="text-[10px] font-mono-tech text-amber-300/90 tracking-widest uppercase">${esc(placeBadge)}</div>
        <div>
            <div class="flex items-center gap-2 text-lg font-bold font-mono-tech text-white">
                ${sealHtmlOf(c)}<span>${esc(anonLabel(entry.username))}</span>${me ? '<span class="top-you-tag">ВЫ</span>' : ''}
            </div>
            ${tl ? `<div class="top-custom-title mt-0.5">${titleSpanOf(c, true)}</div>` : ''}
            <div class="text-[10.5px] font-mono-tech text-red-400/90 mt-0.5">${esc(rankTitleForXp(totalXp))}</div>
        </div>
        ${c.epitaph ? `<p class="top-epitaph bg-black/40 border border-red-500/20 rounded-xl px-3 py-2">«${esc(c.epitaph)}»</p>` : ''}
        <div class="grid grid-cols-3 gap-1.5 font-mono-tech text-center">
            <div class="bg-black/50 border border-red-950 rounded-xl p-2">
                <div class="text-[8.5px] text-gray-500">ОПЫТ</div>
                <div class="text-xs font-bold text-white">${totalXp} XP</div>
            </div>
            <div class="bg-black/50 border border-red-950 rounded-xl p-2">
                <div class="text-[8.5px] text-gray-500">СОЗВЕЗДИЕ</div>
                <div class="text-[10px] font-bold text-red-300 tracking-tighter">${starRow}</div>
            </div>
            <div class="bg-black/50 border border-red-950 rounded-xl p-2">
                <div class="text-[8.5px] text-gray-500">СРЫВОВ</div>
                <div class="text-xs font-bold text-red-400">${entry.help_attempts || 0}</div>
            </div>
        </div>
        ${gear.length ? `<div><div class="text-[9px] font-mono-tech text-gray-500 mb-1.5 uppercase">АТРИБУТЫ СВИДЕТЕЛЯ:</div><div class="dossier-gear">${gear.map(g => `<span class="dossier-chip">${esc(g)}</span>`).join('')}</div></div>` : ''}
        <div class="space-y-1.5 pt-1">
            ${me
                ? `<button type="button" onclick="closeDossier(); openShop()" class="w-full py-2.5 bg-red-950/80 hover:bg-red-900 border border-amber-400/45 text-amber-200 text-[11px] font-mono-tech font-bold rounded-xl transition">✦ НАСТРОИТЬ ОБЛИК И ТИТУЛ</button>
                   <button type="button" onclick="shareTopFlex(${entry.place || 1}, ${totalXp})" class="w-full py-2 bg-black/50 hover:bg-red-950/40 border border-red-500/35 text-red-200 text-[10.5px] font-mono-tech rounded-xl transition">ПОДЕЛИТЬСЯ ОТКРЫТКОЙ ТОПА</button>`
                : `<button type="button" onclick="closeDossier(); openShop()" class="w-full py-2.5 bg-red-950/60 hover:bg-red-900/70 border border-amber-400/40 text-amber-200 text-[10.5px] font-mono-tech rounded-xl transition">✦ ХОЧУ ВЫДЕЛЯТЬСЯ ТАК ЖЕ</button>`}
            <button type="button" onclick="closeDossier()" class="w-full py-1.5 text-gray-500 hover:text-gray-300 text-xs font-mono-tech">ЗАКРЫТЬ</button>
        </div>
    `;
    modal.classList.remove('hidden');
}

function closeDossier() {
    const m = document.getElementById('dossier-modal');
    if (m) m.classList.add('hidden');
}

function shareTopFlex(place, xpVal) {
    if (typeof window !== 'undefined' && window.SOMA_SHARE && typeof window.SOMA_SHARE.shareRank === 'function') {
        window.SOMA_SHARE.shareRank(place, xpVal);
        return;
    }
    const c = getActiveCosmetics();
    const tl = titleLabelOf(c);
    const ep = c.epitaph ? `\n«${c.epitaph}»` : '';
    const text = `SOMA~LINK // ПАНТЕОН NEEO~CITY\nМесто: #${place} (${xpVal} XP)${tl ? ` · ${tl}` : ''}${ep}\n\nПопробуй сдвинуть меня с места:`;
    if (typeof window !== 'undefined' && window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) {
        Telegram.WebApp.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(BOT_LINK) + '&text=' + encodeURIComponent(text));
        return;
    }
    try { navigator.clipboard.writeText(text + ' ' + BOT_LINK); notify('Карточка триумфа скопирована!'); }
    catch (_) { notify(text + ' ' + BOT_LINK); }
}

loadCosmeticsLocal();
