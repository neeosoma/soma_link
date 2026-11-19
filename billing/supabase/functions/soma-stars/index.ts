// =====================================================================
// SOMA_LINK v10 // Supabase Edge Function: soma-stars (БЕЗ СВОЕГО СЕРВЕРА)
// Работает на бесплатном тарифе Supabase Edge Functions + Telegram Stars (XTR).
//
// Маршруты:
//   POST /soma-stars/create-invoice  — проверяет подпись Telegram initData и создаёт счёт в ⭐
//   POST /soma-stars/webhook         — принимает pre_checkout_query и successful_payment от Telegram
//
// Секреты в Supabase (Edge Functions → Secrets):
//   TG_BOT_TOKEN          — токен вашего бота от @BotFather
//   TG_WEBHOOK_SECRET     — любая длинная случайная строка (например: soma_wh_9f3a7c...)
//   (SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY Supabase подставляет автоматически!)
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Авторитетный серверный каталог цен в Telegram Stars (XTR) — 1:1 с cosmetics.js (клиент не может подменить цену)
const CATALOG: Record<string, { title: string; description: string; stars: number }> = {
    // 1. Коллекционные рамки Топа Циников, Досье и карточки Свидетеля (единый тир 150 ⭐)
    frame_ember:     { title: 'Тлеющий уголь',              description: 'Вулканический обсидиан с дыханием горна и живыми искрами пепла.', stars: 150 },
    frame_glitch:    { title: 'Сбой протокола',             description: 'Хроматический RGB-раскол, телеметрия и живой луч ЭЛТ-развёртки.', stars: 150 },
    frame_neon:      { title: 'Багровый неон',              description: 'Неоновая трубка NEEO_CITY с бегущей рубиновой плазменной дугой.', stars: 150 },
    frame_gold:      { title: 'Чёрное золото',              description: 'Оникс Ар-Деко с двойной золотой филигранью и бликом 24k золота.', stars: 150 },
    frame_phantom:   { title: 'Призрак эфира',              description: 'Спектральная призма лунного серебра, аметиста и орбиты авроры.', stars: 150 },
    frame_pulse:     { title: 'Пульс Станции',              description: 'Живой осциллограф SOMA_LINK с двойным сердцебиением и ЭКГ-лучом.', stars: 150 },
    // 2. Живые печати (100 ⭐), авторские титулы (110 ⭐) и право на личную эпитафию (150 ⭐)
    seal_eye:        { title: 'Печать «Око»',               description: 'Живое око наблюдателя с движением зрачка и редким морганием.', stars: 100 },
    seal_eclipse:    { title: 'Печать «Затмение»',          description: 'Солнечная корона затмения с мерцающей вспышкой на кромке.', stars: 100 },
    seal_moth:       { title: 'Печать «Мотылёк»',           description: 'Ночной мотылёк с мягко трепещущими крыльями рядом с именем.', stars: 100 },
    seal_crown:      { title: 'Печать «Венец»',             description: 'Золотая корона трибунала с мерцающими искрами на зубцах.', stars: 100 },
    seal_signal:     { title: 'Печать «Импульс»',           description: 'Живая бегущая волна кардиограммы рядом с позывным в Топе.', stars: 100 },
    title_architect: { title: 'Титул «Архитектор тишины»',  description: 'Платиново-стальной перелив титула в Топе, Досье и профиле.', stars: 110 },
    title_collector: { title: 'Титул «Коллекционер драм»',  description: 'Бархатный рубиново-розовый перелив титула в Топе и Досье.', stars: 110 },
    title_patrician: { title: 'Титул «Патриций эфира»',     description: 'Шампанско-золотой перелив титула закрытой ложи Паноптикума.', stars: 110 },
    title_ghost:     { title: 'Титул «Призрак NEEO_CITY»',  description: 'Спектральный опалово-серебряный перелив титула в Топе.', stars: 110 },
    title_oracle:    { title: 'Титул «Последний свидетель»', description: 'Рассветно-янтарный огненный перелив титула ночной станции.', stars: 110 },
    perk_epitaph:    { title: 'Право на эпитафию',          description: 'Ваша личная фраза (до 42 симв.) на Троне #1, в Топе и Досье.', stars: 150 },
    // 3. Живые корпуса пейджера SOMA // PGR-04 (единый тир 140 ⭐)
    pager_amber:     { title: 'Пейджер: Янтарный фосфор',   description: 'Катодный дисплей 1986 года с живой янтарной развёрткой.', stars: 140 },
    pager_clear:     { title: 'Пейджер: Дымчатый рубин 90-х', description: 'Полупрозрачный рубиновый корпус с живым импульсом по плате.', stars: 140 },
    pager_ghost:     { title: 'Пейджер: Белый шум',         description: 'Титановый хром с живой опалово-серебряной дымкой матрицы.', stars: 140 },
    pager_brass:     { title: 'Пейджер: Воронёная сталь',   description: 'Оружейный корпус с латунными винтами и золотым бликом.', stars: 140 },
    // 4. Сосуды мастера (160 ⭐), живая атмосфера комнаты (140 ⭐) и живые спутники — кот и пёс (единый тир 220 ⭐)
    pot_cinnabar:    { title: 'Киноварный лак',             description: 'Императорская киноварь с золотой печатью и лаковым переливом.', stars: 160 },
    pot_moon:        { title: 'Лунный селадон',             description: 'Фарфор с лунным серпом в ореоле и мерцающими созвездиями.', stars: 160 },
    pot_kintsugi:    { title: 'Керамика Кинцуги',           description: 'Чёрная глина раку, исцелённая дышащими швами 24k золота.', stars: 160 },
    room_steam:      { title: 'Чай и сандал у терминала',   description: 'Янтарный чай с густым паром и тлеющая палочка сандала на столе.', stars: 140 },
    room_tape:       { title: 'Винил «Ночной экспресс»',    description: 'Вращающийся винил, светящийся поезд за окном и лоу-фай саундтрек.', stars: 140 },
    room_garland:    { title: 'Гирлянда Эдисона у окна',    description: '13 тёплых винтажных лампочек по каменной арке круглого окна.', stars: 140 },
    room_candles:    { title: 'Живые свечи станции',        description: 'Шесть восковых свечей с живым пламенем у ковра и на полке радио.', stars: 140 },
    room_cat:        { title: 'Живой кот-хранитель',        description: 'Крупный тёплый кот одной из 7 мастей по вашему ID на кушетке.', stars: 220 },
    room_dog:        { title: 'Живой пёс-хранитель',        description: 'Настоящий пёс одной из 7 пород по вашему ID на персидском коврике у пледа рядом с котом.', stars: 220 },
    // 5. Эксклюзивные коллекционные пластинки 7" лампового приёмника SOMA // RX-88 (единый тир 50 ⭐ ≈ $1, навсегда в фонотеке)
    track_velvet:    { title: 'Винил 7": «Бархатный пепел»',    description: 'Dubplate #01 · Рубиновый воск. Эксклюзивная пластинка приёмника RX-88 навсегда в фонотеке.', stars: 50 },
    track_aurora:    { title: 'Винил 7": «Фосфорный рассвет»',  description: 'Dubplate #02 · Золото 24k. Эксклюзивная пластинка приёмника RX-88 навсегда в фонотеке.', stars: 50 },
    track_solstice:  { title: 'Винил 7": «Тишина двоих»',       description: 'Dubplate #03 · Лунный перламутр. Эксклюзивная пластинка приёмника RX-88 навсегда в фонотеке.', stars: 50 },
    track_rainline:  { title: 'Винил 7": «Последний трамвай»',  description: 'Dubplate #04 · Дымчатый аметист. Эксклюзивная пластинка приёмника RX-88 навсегда в фонотеке.', stars: 50 },
};

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const enc = new TextEncoder();

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
    });
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return crypto.subtle.sign('HMAC', cryptoKey, enc.encode(msg));
}

function toHex(buf: ArrayBuffer): string {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Вычисляем тот же анонимный uid, что и index.html: 'u_' + sha256('soma:' + tgId)[0..8]
async function makeUid(tgId: number): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', enc.encode('soma:' + String(tgId)));
    return 'u_' + Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Официальная проверка подлинности Telegram WebApp initData (HMAC-SHA256)
async function verifyTelegramInitData(initData: string, botToken: string): Promise<{ id: number } | null> {
    if (!initData || !botToken) return null;
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    const authDate = Number(params.get('auth_date') || '0');
    if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 86400) return null;

    const pairs: string[] = [];
    params.forEach((v, k) => { if (k !== 'hash') pairs.push(`${k}=${v}`); });
    pairs.sort();
    const secret = await hmacSha256(enc.encode('WebAppData'), botToken);
    const calc = toHex(await hmacSha256(secret, pairs.join('\n')));
    if (calc !== hash) return null;

    try {
        const user = JSON.parse(params.get('user') || '{}');
        return typeof user.id === 'number' ? { id: user.id } : null;
    } catch {
        return null;
    }
}

async function tgApi(botToken: string, method: string, payload: Record<string, unknown>) {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return res.json();
}

Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const botToken = Deno.env.get('TG_BOT_TOKEN') || '';
    const webhookSecret = Deno.env.get('TG_WEBHOOK_SECRET') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!botToken || !supabaseUrl || !serviceKey) {
        return json({ error: 'Не заданы секреты TG_BOT_TOKEN / SUPABASE_SERVICE_ROLE_KEY' }, 500);
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '');

    // 1. СОЗДАНИЕ СЧЁТА В TELEGRAM STARS (XTR)
    if (path.endsWith('/create-invoice')) {
        let body: { itemId?: string; initData?: string } = {};
        try { body = await req.json(); } catch { return json({ error: 'Некорректный запрос' }, 400); }

        const itemId = String(body.itemId || '');
        const item = CATALOG[itemId];
        if (!item) return json({ error: 'Неизвестный атрибут' }, 400);

        const tgUser = await verifyTelegramInitData(String(body.initData || ''), botToken);
        if (!tgUser) return json({ error: 'Откройте SOMA_LINK внутри Telegram' }, 401);

        const uid = await makeUid(tgUser.id);
        const payload = JSON.stringify({ v: 1, uid, itemId, tg: tgUser.id });

        const tgRes = await tgApi(botToken, 'createInvoiceLink', {
            title: item.title,
            description: item.description,
            payload,
            provider_token: '', // Для Telegram Stars всегда пустая строка
            currency: 'XTR',
            prices: [{ label: item.title, amount: item.stars }],
        });

        if (!tgRes?.ok || !tgRes.result) {
            return json({ error: tgRes?.description || 'Ошибка создания счёта Telegram' }, 502);
        }
        return json({ invoiceUrl: tgRes.result });
    }

    // 2. ВЕБХУК ОТ TELEGRAM (ПОДТВЕРЖДЕНИЕ И ЗАЧИСЛЕНИЕ ПОКУПКИ)
    if (path.endsWith('/webhook')) {
        if (webhookSecret) {
            const headerSecret = req.headers.get('x-telegram-bot-api-secret-token') || '';
            if (headerSecret !== webhookSecret) return json({ error: 'Forbidden' }, 403);
        }

        const update = await req.json().catch(() => ({}));

        // 2а. Предпроверка перед списанием Stars (нужно ответить за <10 сек)
        if (update.pre_checkout_query) {
            const q = update.pre_checkout_query;
            let ok = false;
            try {
                const p = JSON.parse(q.invoice_payload || '{}');
                const item = CATALOG[p.itemId];
                ok = Boolean(item && q.currency === 'XTR' && q.total_amount === item.stars && p.uid);
            } catch { ok = false; }

            await tgApi(botToken, 'answerPreCheckoutQuery', {
                pre_checkout_query_id: q.id,
                ok,
                error_message: ok ? undefined : 'Товар обновился — откройте бутик заново.',
            });
            return json({ ok: true });
        }

        // 2б. Успешный платёж — записываем покупку в Supabase навсегда
        const sp = update.message?.successful_payment;
        if (sp && sp.currency === 'XTR') {
            try {
                const p = JSON.parse(sp.invoice_payload || '{}');
                const item = CATALOG[p.itemId];
                if (item && p.uid && sp.telegram_payment_charge_id) {
                    const admin = createClient(supabaseUrl, serviceKey);
                    await admin.rpc('grant_soma_cosmetic', {
                        p_charge_id: String(sp.telegram_payment_charge_id),
                        p_username: String(p.uid),
                        p_tg_user_id: Number(update.message?.from?.id || p.tg || 0),
                        p_item_id: String(p.itemId),
                        p_stars: Number(sp.total_amount || item.stars),
                        p_payload: String(sp.invoice_payload),
                    });
                }
            } catch (e) {
                console.error('grant_soma_cosmetic error:', e);
                return json({ ok: false }, 500);
            }
        }

        return json({ ok: true });
    }

    return json({ error: 'Not found' }, 404);
});
