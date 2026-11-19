// ===== ПАНТЕОН ЦИНИКОВ, КОСМЕТИЧЕСКИЙ БУТИК И TELEGRAM STARS (SOMA_LINK v6) =====
// Принцип SOMA_LINK: продаётся СТРОГО эстетика. Живое Тепло и рост цветка не продаются никогда.

const SOMA_SEALS_SVG = {
    seal_eye: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.35"><path d="M1.4 8C3.2 4.6 5.5 3.2 8 3.2S12.8 4.6 14.6 8C12.8 11.4 10.5 12.8 8 12.8S3.2 11.4 1.4 8Z"/><circle cx="8" cy="8" r="2.1" fill="currentColor"/></svg>',
    seal_crown: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M2 12.5L3.2 4.8L6.2 8.2L8 3.2L9.8 8.2L12.8 4.8L14 12.5H2Z"/><line x1="2.5" y1="14.2" x2="13.5" y2="14.2"/></svg>',
    seal_eclipse: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.35"><circle cx="8" cy="8" r="5.3"/><path d="M9.6 3.1A4.7 4.7 0 0 0 9.6 12.9A5.2 5.2 0 1 1 9.6 3.1Z" fill="currentColor"/></svg>',
    seal_moth: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"><path d="M8 4.5C5.6 2.5 2 3.2 2.2 6.8C2.4 9.3 5.2 9.8 8 8.2C10.8 9.8 13.6 9.3 13.8 6.8C14 3.2 10.4 2.5 8 4.5Z"/><path d="M8 8.2L5 12.6L8 11.2L11 12.6L8 8.2Z"/><line x1="8" y1="3.4" x2="8" y2="13.2"/></svg>',
    seal_signal: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.2,8.5 4.4,8.5 6.2,3.2 8.4,13 10.3,6.2 11.6,8.5 14.8,8.5"/></svg>'
};

const THRONE_CROWN_SVG = '<svg viewBox="0 0 18 14" width="14" height="11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M1.5 11.5L3 3.5L6.5 7.2L9 1.8L11.5 7.2L15 3.5L16.5 11.5H1.5Z"/></svg>';

const SOMA_CATALOG = [
    // 1. РАМКИ ТОПА, ДОСЬЕ И КАРТОЧКИ СВИДЕТЕЛЯ
    { id: 'frame_ember',   tab: 'frames', slot: 'frame', css: 'soma-frame--ember',   stars: 75,  name: 'Тлеющий уголь',   desc: 'Живое багрово-угольное дыхание рамки в Топе Циников, Досье и профиле.' },
    { id: 'frame_glitch',  tab: 'frames', slot: 'frame', css: 'soma-frame--glitch',  stars: 120, name: 'Сбой протокола',  desc: 'Хроматический ЭЛТ-сдвиг и тонкая развёртка перехваченного сигнала.' },
    { id: 'frame_neon',    tab: 'frames', slot: 'frame', css: 'soma-frame--neon',    stars: 150, name: 'Багровый неон',   desc: 'Высоковольтный рубиновый контур ночных вывесок верхнего NEEO_CITY.' },
    { id: 'frame_gold',    tab: 'frames', slot: 'frame', css: 'soma-frame--gold',    stars: 190, name: 'Чёрное золото',   desc: 'Парадный обсидиан с золотым отливом для завсегдатаев Высшей ложи.' },
    { id: 'frame_phantom', tab: 'frames', slot: 'frame', css: 'soma-frame--phantom', stars: 250, name: 'Призрак эфира',   desc: 'Редкое серебристо-алое свечение на границе видимого спектра.' },

    // 2. ПЕЧАТИ, ТИТУЛЫ И ЛИЧНАЯ ЭПИТАФИЯ В ТОПЕ
    { id: 'seal_eye',        tab: 'status', slot: 'seal',  stars: 60,  name: 'Печать «Око»',          desc: 'Знак немигающего наблюдателя рядом с вашим номером в Топе.' },
    { id: 'seal_eclipse',    tab: 'status', slot: 'seal',  stars: 90,  name: 'Печать «Затмение»',     desc: 'Тёмный серп ночного неба рядом с именем Свидетеля.' },
    { id: 'seal_moth',       tab: 'status', slot: 'seal',  stars: 90,  name: 'Печать «Мотылёк»',      desc: 'Символ тех, кто летит на чужой огонёк в темноте сети.' },
    { id: 'seal_crown',      tab: 'status', slot: 'seal',  stars: 110, name: 'Печать «Венец»',        desc: 'Острая корона трибунала для претендентов на пьедестал.' },
    { id: 'seal_signal',     tab: 'status', slot: 'seal',  stars: 140, name: 'Печать «Импульс»',      desc: 'Кардиограмма живой частоты рядом с вашим позывным.' },
    { id: 'title_architect', tab: 'status', slot: 'title', label: 'АРХИТЕКТОР ТИШИНЫ',   stars: 80,  name: 'Титул «Архитектор тишины»',   desc: 'Заменяет стандартную подпись в Топе, Досье и карточке профиля.' },
    { id: 'title_collector', tab: 'status', slot: 'title', label: 'КОЛЛЕКЦИОНЕР ДРАМ',   stars: 80,  name: 'Титул «Коллекционер драм»',   desc: 'Ироничный статус искушённого зрителя чужих катастроф.' },
    { id: 'title_patrician', tab: 'status', slot: 'title', label: 'ПАТРИЦИЙ ЭФИРА',      stars: 120, name: 'Титул «Патриций эфира»',      desc: 'Привилегированный чин закрытой ложи Паноптикума.' },
    { id: 'title_ghost',     tab: 'status', slot: 'title', label: 'ПРИЗРАК NEEO_CITY',   stars: 120, name: 'Титул «Призрак NEEO_CITY»',   desc: 'Присутствует в каждой ленте, но не оставляет следов.' },
    { id: 'title_oracle',    tab: 'status', slot: 'title', label: 'ПОСЛЕДНИЙ СВИДЕТЕЛЬ', stars: 180, name: 'Титул «Последний свидетель»', desc: 'Высший коллекционный титул ночной станции.' },
    { id: 'perk_epitaph',    tab: 'status', slot: 'epitaph_unlock', stars: 150, name: 'Право на эпитафию', desc: 'Ваша личная фраза (до 42 символов) на Троне #1, в строке Топа и в Досье.' },

    // 3. КОРПУСА ПЕЙДЖЕРА SOMA // PGR-04
    { id: 'pager_amber', tab: 'pager', slot: 'pager', stars: 110, name: 'Янтарный фосфор',     desc: 'Тёплый монохромный дисплей 1986 года и тёмно-бронзовый крепёж.' },
    { id: 'pager_clear', tab: 'pager', slot: 'pager', stars: 140, name: 'Дымчатый рубин 90-х', desc: 'Полупрозрачный багровый пластик, сквозь который просвечивают дорожки платы.' },
    { id: 'pager_ghost', tab: 'pager', slot: 'pager', stars: 150, name: 'Белый шум',           desc: 'Холодный тёмный хром и бледно-серебристое свечение матрицы.' },
    { id: 'pager_brass', tab: 'pager', slot: 'pager', stars: 175, name: 'Воронёная сталь',     desc: 'Тяжёлый оружейный корпус с латунными винтами и мягким золотистым кантом.' },

    // 4. АВТОРСКАЯ КЕРАМИКА И ЖИВОЙ УЮТ КОМНАТЫ
    { id: 'room_steam',   tab: 'room', slot: 'steam', stars: 95,  name: 'Горячий чай у терминала', desc: 'Над кружкой на столе поднимается тонкий тёплый пар в свете лампы.' },
    { id: 'room_tape',    tab: 'room', slot: 'tape',  stars: 110, name: 'Плёнка «Ночной экспресс»', desc: 'Мягкий виниловый шорох и далёкий стук ночного поезда (при включённом звуке).' },
    { id: 'pot_cinnabar', tab: 'room', slot: 'pot',   stars: 130, name: 'Киноварный лак',          desc: 'Глубокая императорская киноварь ручного обжига. Вид и рост цветка неизменны.' },
    { id: 'pot_moon',     tab: 'room', slot: 'pot',   stars: 140, name: 'Лунный пепел',            desc: 'Дымчатый тёмный фарфор, тонко ловящий алые отблески ковра и рассвета.' },
    { id: 'pot_kintsugi', tab: 'room', slot: 'pot',   stars: 190, name: 'Керамика Кинцуги',        desc: 'Чёрная японская глина, бережно склеенная швами чистого золота — символ исцеления.' },
    { id: 'room_cat',     tab: 'room', slot: 'cat',   stars: 250, name: 'Чёрный кот на кушетке',   desc: 'Спит клубком у пледа, тихо дышит, изредка ведёт хвостом и мурчит от касания.' }
];

const SOMA_ITEM_MAP = Object.fromEntries(SOMA_CATALOG.map(it => [it.id, it]));

const shopState = {
    tab: 'frames',
    owned: [],
    equipped: { frame: '', seal: '', title: '', epitaph: '', pager: '', pot: '', cat: false, steam: false, tape: false },
    preview: null, // временная примерка любого предмета до покупки
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
        if (Array.isArray(ow)) shopState.owned = [...new Set(ow.filter(id => SOMA_ITEM_MAP[id]))];
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
function sanitizeEpitaph(raw) {
    const str = String(raw || '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 42);
    if (!str) return { ok: true, value: '' };
    if (/(https?:\/\/|www\.|t\.me\/|telegram\.me|\.ru\b|\.com\b|\.net\b|\.org\b|\.io\b|@\w{2,})/i.test(str)) {
        return { ok: false, error: 'Протокол запрещает ссылки, домены и @контакты.' };
    }
    if (/(?:\d[\s\-().]*){5,}/.test(str)) {
        return { ok: false, error: 'Протокол блокирует номера телефонов и карт.' };
    }
    if (/(пиш[иу]\s*в\s*лс|личк[ауе]|ватсап|whatsapp|viber|discord|инст[ауе]?)/i.test(str)) {
        return { ok: false, error: 'Прямые контакты запрещены протоколом SOMA_LINK.' };
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
        steam: hasFlag(r.steam, 'room_steam'),
        tape: hasFlag(r.tape, 'room_tape')
    };
}

// Возвращает активный облик игрока (с учётом живой примерки, если она включена)
function getActiveCosmetics() {
    const base = { ...shopState.equipped };
    const p = shopState.preview && SOMA_ITEM_MAP[shopState.preview];
    if (!p) return base;
    if (p.slot === 'cat') base.cat = true;
    else if (p.slot === 'steam') base.steam = true;
    else if (p.slot === 'tape') base.tape = true;
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
    if (it.slot === 'cat') return !!eq.cat;
    if (it.slot === 'steam') return !!eq.steam;
    if (it.slot === 'tape') return !!eq.tape;
    if (it.slot === 'epitaph_unlock') return isOwned('perk_epitaph');
    return eq[it.slot] === id;
}

function frameClassOf(cosm) {
    const it = cosm && cosm.frame && SOMA_ITEM_MAP[cosm.frame];
    return it && it.css ? it.css : '';
}

function sealHtmlOf(cosm) {
    const svg = cosm && cosm.seal && SOMA_SEALS_SVG[cosm.seal];
    return svg ? `<span class="soma-seal" aria-hidden="true">${svg}</span>` : '';
}

function titleLabelOf(cosm) {
    const it = cosm && cosm.title && SOMA_ITEM_MAP[cosm.title];
    return it && it.label ? it.label : '';
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
        const merged = new Set([...shopState.owned, ...row.owned_cosmetics.filter(id => SOMA_ITEM_MAP[id])]);
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

// Звуковая плёнка «Ночной экспресс»: тихий виниловый шорох + далёкий мягкий перестук колёс раз в 6.5 с
function syncAmbientTape(enabled) {
    if (!enabled) {
        if (tapeTimer) { clearInterval(tapeTimer); tapeTimer = null; }
        return;
    }
    if (tapeTimer || typeof setInterval !== 'function') return;
    tapeTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        if (typeof soundOn !== 'undefined' && !soundOn) return;
        const prof = typeof document !== 'undefined' && document.getElementById('view-profile');
        if (!prof || prof.classList.contains('hidden')) return;
        if (typeof tone === 'function') {
            tone(68, 0.11, 'sine', 0.016, 0, 56);
            tone(64, 0.11, 'sine', 0.013, 0.19, 54);
            tone(66, 0.1, 'sine', 0.011, 0.85, 55);
            tone(62, 0.1, 'sine', 0.009, 1.04, 52);
        }
        if (typeof noise === 'function') noise(0.06, 0.006, 0.4, 1900);
    }, 6500);
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
        ['soma-frame--ember', 'soma-frame--glitch', 'soma-frame--gold', 'soma-frame--neon', 'soma-frame--phantom']
            .forEach(cls => card.classList.remove(cls));
        const fc = frameClassOf(c);
        if (fc) card.classList.add(fc);
    }
    const sealSlot = document.getElementById('card-seal');
    if (sealSlot) sealSlot.innerHTML = sealHtmlOf(c);
    const titleSlot = document.getElementById('card-custom-title');
    if (titleSlot) {
        const tl = titleLabelOf(c);
        titleSlot.textContent = tl ? `✦ ${tl}` : '';
        titleSlot.classList.toggle('hidden', !tl);
    }
    const epSlot = document.getElementById('card-epitaph');
    if (epSlot) {
        epSlot.textContent = c.epitaph ? `«${c.epitaph}»` : '';
        epSlot.classList.toggle('hidden', !c.epitaph);
    }

    // 3) Звуковая плёнка и перерисовка комнаты (кот, пар над кружкой, горшок Кинцуги)
    syncAmbientTape(!!c.tape);
    if (typeof ensureStationLoop === 'function') ensureStationLoop();
}

// ===== БУТИК ПРИВИЛЕГИЙ SOMA (ПРИМЕРКА, ЭКИПИРОВКА, ОПЛАТА TELEGRAM STARS) =====
function openShop(tab) {
    if (tab) shopState.tab = tab;
    shopState.notice = '';
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    renderShop();
    const m = document.getElementById('shop-modal');
    if (m) m.classList.remove('hidden');
}

function closeShop() {
    shopState.preview = null;
    shopState.notice = '';
    const m = document.getElementById('shop-modal');
    if (m) m.classList.add('hidden');
    applyCosmeticsToUI();
    const topView = document.getElementById('view-top');
    if (topView && !topView.classList.contains('hidden') && typeof renderLeaderboard === 'function') {
        renderLeaderboard();
    }
}

function switchShopTab(tab) {
    shopState.tab = tab;
    shopState.notice = '';
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    renderShop();
}

function tryCosmetic(id) {
    if (!SOMA_ITEM_MAP[id]) return;
    shopState.preview = shopState.preview === id ? null : id;
    const it = SOMA_ITEM_MAP[id];
    if (shopState.preview) {
        shopState.notice = (it.tab === 'room' || it.tab === 'pager')
            ? `Примерка: «${it.name}» уже показан на вашем пейджере / в комнате.`
            : `Примерка: «${it.name}» показан на образце строки Топа выше.`;
    } else {
        shopState.notice = '';
    }
    if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap();
    applyCosmeticsToUI();
    renderShop();
}

function toggleEquipCosmetic(id) {
    const it = SOMA_ITEM_MAP[id];
    if (!it || !isOwned(id)) return;
    shopState.preview = null;
    const eq = shopState.equipped;
    if (it.slot === 'cat') eq.cat = !eq.cat;
    else if (it.slot === 'steam') eq.steam = !eq.steam;
    else if (it.slot === 'tape') eq.tape = !eq.tape;
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

function grantOwnedItem(id) {
    if (!SOMA_ITEM_MAP[id]) return;
    if (!shopState.owned.includes(id)) shopState.owned.push(id);
    shopState.preview = null;
    const it = SOMA_ITEM_MAP[id];
    if (it.slot === 'cat') shopState.equipped.cat = true;
    else if (it.slot === 'steam') shopState.equipped.steam = true;
    else if (it.slot === 'tape') shopState.equipped.tape = true;
    else if (it.slot !== 'epitaph_unlock') shopState.equipped[it.slot] = id;
    saveCosmeticsLocal();
    syncCosmeticsCloud();
    applyCosmeticsToUI();
}

async function purchaseCosmetic(id) {
    const it = SOMA_ITEM_MAP[id];
    if (!it || shopState.buying) return;
    if (isOwned(id)) { toggleEquipCosmetic(id); return; }

    const pts = typeof isPtsMode === 'function' && isPtsMode();
    if (pts) {
        grantOwnedItem(id);
        shopState.notice = `✓ PTS: «${it.name}» открыт и надет (в релизе — ${it.stars} ⭐ Telegram Stars).`;
        try { Telegram.WebApp.HapticFeedback.notificationOccurred('success'); } catch (_) {}
        if (typeof SFX !== 'undefined' && SFX.react) SFX.react();
        renderShop();
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
                // Подтверждаем список покупок из Supabase (записанный вебхуком бота)
                try {
                    const { data: row } = await supabaseClient.from('soma_users').select('owned_cosmetics').eq('username', player.uid).single();
                    if (row) hydrateCosmeticsFromCloud(row);
                } catch (_) {}
                shopState.notice = `✓ Оплачено (${it.stars} ⭐): «${it.name}» навсегда в вашей коллекции!`;
                try { tg.HapticFeedback.notificationOccurred('success'); } catch (_) {}
                if (typeof SFX !== 'undefined' && SFX.egg) SFX.egg();
            } else if (status === 'cancelled') {
                shopState.notice = 'Оплата отменена.';
            } else {
                shopState.notice = 'Не удалось завершить оплату. Попробуйте позже.';
            }
            renderShop();
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
        const gearBits = [];
        if (c.pager && SOMA_ITEM_MAP[c.pager]) gearBits.push(`📟 ${SOMA_ITEM_MAP[c.pager].name}`);
        if (c.pot && SOMA_ITEM_MAP[c.pot]) gearBits.push(`🏺 ${SOMA_ITEM_MAP[c.pot].name}`);
        if (c.cat) gearBits.push('🐈‍⬛ Чёрный кот');
        if (c.steam) gearBits.push('☕ Горячий чай');
        if (c.tape) gearBits.push('📼 Ночной экспресс');
        prev.className = `shop-preview-card ${fc}`.trim();
        prev.innerHTML = `
            <div class="flex justify-between items-center gap-2">
                <span class="top-row-name">${sealHtmlOf(c)}<span>${esc(myAnon)}</span>${shopState.preview ? '<span class="top-you-tag">ПРИМЕРКА</span>' : ''}</span>
                <span class="top-row-xp">${(typeof player !== 'undefined' && player.xp) || 0} XP</span>
            </div>
            ${tl ? `<div class="top-custom-title">✦ ${esc(tl)}</div>` : '<div class="text-[9.5px] text-gray-500">ОБЛИК В ТОПЕ ЦИНИКОВ И КОМНАТЕ</div>'}
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
        html += `
        <div class="shop-item is-equipped">
            <div class="text-[10px] font-mono-tech text-amber-300 uppercase">// ВАША ЭПИТАФИЯ В ТОПЕ (ДО 42 СИМВ.)</div>
            <div class="flex gap-1.5">
                <input id="shop-epitaph-input" maxlength="42" value="${esc(shopState.equipped.epitaph || '')}" placeholder="Город горит — а у меня лучший вид..." class="flex-1 min-w-0 bg-[#080305] border border-red-500/35 focus:border-red-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono-tech">
                <button type="button" onclick="saveMyEpitaph()" class="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-500/50 rounded-lg text-[10px] font-mono-tech text-red-100 font-bold">СОХР.</button>
            </div>
        </div>`;
    }

    html += items.map(it => {
        const owned = isOwned(it.id);
        const eq = isEquipped(it.id);
        const trying = shopState.preview === it.id;
        const icon = SOMA_SEALS_SVG[it.id] ? `<span class="soma-seal">${SOMA_SEALS_SVG[it.id]}</span>` : '';
        const buyLabel = shopState.buying === it.id
            ? 'СЧЁТ...'
            : pts
                ? `PTS · ВЗЯТЬ (${it.stars} ⭐)`
                : `ОТКРЫТЬ ЗА ${it.stars} ⭐`;
        const eqLabel = it.slot === 'epitaph_unlock'
            ? '✓ ПРАВО АКТИВНО (ПОЛЕ ВЫШЕ)'
            : (eq ? '✓ НАДЕТО (СНЯТЬ)' : 'НАДЕТЬ');
        return `
        <div class="shop-item ${eq ? 'is-equipped' : ''}">
            <div class="shop-item-top">
                <div>
                    <div class="shop-item-name">${icon}<span>${esc(it.name)}</span></div>
                    <p class="shop-item-desc">${esc(it.desc)}</p>
                </div>
                <span class="shop-price ${owned ? 'is-owned' : ''}">${owned ? 'В КОЛЛЕКЦИИ' : `${it.stars} ⭐`}</span>
            </div>
            <div class="shop-actions">
                ${owned
                    ? `<button type="button" class="shop-btn shop-btn--equip" ${it.slot === 'epitaph_unlock' ? 'disabled' : `onclick="toggleEquipCosmetic('${it.id}')"`}>${eqLabel}</button>`
                    : `<button type="button" class="shop-btn shop-btn--buy" onclick="purchaseCosmetic('${it.id}')">${buyLabel}</button>
                       <button type="button" class="shop-btn shop-btn--try" onclick="tryCosmetic('${it.id}')">${trying ? 'СБРОС' : 'ПРИМЕРИТЬ'}</button>`}
            </div>
        </div>`;
    }).join('');

    body.innerHTML = html;
}

// ===== ПАФОСНЫЙ ТРИБУНАЛ «ТОП ЦИНИКОВ» + ДОСЬЕ СВИДЕТЕЛЯ =====
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

async function renderLeaderboard() {
    const isWeek = shopState.topMode === 'week';
    const wk = currentWeekKey();

    document.querySelectorAll('[data-top-mode]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.dataset.topMode === shopState.topMode));
    });
    const subnote = document.getElementById('top-subnote');
    if (subnote) {
        subnote.textContent = isWeek
            ? `ОХОТА НЕДЕЛИ · СБРОС ТРОНА ЧЕРЕЗ ${weekResetCountdown()} · НАЖМИТЕ НА ИГРОКА ДЛЯ ДОСЬЕ`
            : 'ВЕЧНЫЙ ПАНТЕОН NEEO_CITY · НАЖМИТЕ НА ЛЮБОГО СВИДЕТЕЛЯ ДЛЯ ДОСЬЕ';
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
                    .limit(50);
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
                    .limit(50);
                if (res.error) {
                    res = await supabaseClient
                        .from('soma_users')
                        .select('username,xp,help_attempts')
                        .order('xp', { ascending: false })
                        .limit(50);
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
        help_attempts: player.helpAttempts || 0,
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
        data = data.slice(0, 50);
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
                <div class="top-custom-title">✦ ${esc(t1)}</div>
                <p class="top-epitaph">«${esc(ep1)}»</p>
                <div class="top-throne-stats">
                    <span class="top-throne-xp">${first.score || 0} XP</span>
                    <span>·</span>
                    <span>СРЫВОВ ПРОТОКОЛА: ${first.help_attempts || 0}</span>
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
                    <div class="top-custom-title truncate">${esc(tr)}</div>
                    <div class="top-runner-xp">${r.score || 0} XP</div>
                </div>`;
            }).join('') + `</div>`;
        }
        podiumEl.innerHTML = pHtml;
    }

    // 3) Высшая ложа (#4–#10) и Партер (#11–#50)
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    const rest = shopState.lastBoard.slice(3);
    const renderRow = (b, clickExpr) => {
        const me = b.username === player.uid;
        const cb = entryCosmetics(b);
        const lodge = b.place <= 10;
        const tb = titleLabelOf(cb);
        const sub = cb.epitaph
            ? `«${esc(cb.epitaph)}»`
            : tb
                ? `✦ ${esc(tb)}`
                : `Срывов протокола: ${b.help_attempts || 0}`;
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
        lHtml += `<div class="top-section-label">// ПАРТЕР НАБЛЮДАТЕЛЕЙ</div>`;
        lHtml += parterreRows.map(b => renderRow(b, `openDossierByIndex(${b.place - 1})`)).join('');
    }
    if (myIdx < 0) {
        lHtml += `<div class="text-center text-[10px] text-gray-600 font-mono-tech py-1">· · ·</div>`;
        lHtml += renderRow({ ...meEntry, place: resolvedRank }, `openDossierByUid('${safeId(meEntry.username)}', ${resolvedRank})`);
    }
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
        help_attempts: player.helpAttempts || 0,
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
    if (c.cat) gear.push('Чёрный кот');
    if (c.steam) gear.push('Ночной чай');

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
            ${tl ? `<div class="top-custom-title mt-0.5">✦ ${esc(tl)}</div>` : ''}
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
                   <button type="button" onclick="shareTopFlex(${entry.place || 1}, ${totalXp})" class="w-full py-2 bg-black/50 hover:bg-red-950/40 border border-red-500/35 text-red-200 text-[10.5px] font-mono-tech rounded-xl transition">КОЗЫРНУТЬ МЕСТОМ В ТОПЕ</button>`
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
    const c = getActiveCosmetics();
    const tl = titleLabelOf(c);
    const ep = c.epitaph ? `\n«${c.epitaph}»` : '';
    const text = `SOMA_LINK // ПАНТЕОН ЦИНИКОВ\nМесто: #${place} (${xpVal} XP)${tl ? ` · ${tl}` : ''}${ep}\n\nПопробуй сдвинуть меня с места:`;
    if (typeof window !== 'undefined' && window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) {
        Telegram.WebApp.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(BOT_LINK) + '&text=' + encodeURIComponent(text));
        return;
    }
    try { navigator.clipboard.writeText(text + ' ' + BOT_LINK); notify('Карточка триумфа скопирована!'); }
    catch (_) { notify(text + ' ' + BOT_LINK); }
}

loadCosmeticsLocal();
