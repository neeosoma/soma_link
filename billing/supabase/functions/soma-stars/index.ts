// =====================================================================
// SOMA_LINK v6 // Supabase Edge Function: soma-stars (БЕЗ СВОЕГО СЕРВЕРА)
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
    // 1. Рамки Топа Циников, Досье и карточки Свидетеля
    frame_ember:     { title: 'Тлеющий уголь',              description: 'Живое багрово-угольное дыхание рамки в Топе, Досье и профиле.', stars: 75 },
    frame_glitch:    { title: 'Сбой протокола',             description: 'Хроматический ЭЛТ-сдвиг и развёртка сигнала в Топе и профиле.', stars: 120 },
    frame_neon:      { title: 'Багровый неон',              description: 'Высоковольтный рубиновый контур ночного NEEO_CITY.', stars: 150 },
    frame_gold:      { title: 'Чёрное золото',              description: 'Парадный обсидиан с золотым отливом для Высшей ложи.', stars: 190 },
    frame_phantom:   { title: 'Призрак эфира',              description: 'Редкое серебристо-алое свечение на границе спектра.', stars: 250 },
    // 2. Печати, титулы и право на личную эпитафию
    seal_eye:        { title: 'Печать «Око»',               description: 'Знак немигающего наблюдателя рядом с номером в Топе.', stars: 60 },
    seal_eclipse:    { title: 'Печать «Затмение»',          description: 'Тёмный серп ночного неба рядом с именем Свидетеля.', stars: 90 },
    seal_moth:       { title: 'Печать «Мотылёк»',           description: 'Символ тех, кто летит на чужой огонёк в темноте сети.', stars: 90 },
    seal_crown:      { title: 'Печать «Венец»',             description: 'Острая корона трибунала для претендентов на пьедестал.', stars: 110 },
    seal_signal:     { title: 'Печать «Импульс»',           description: 'Кардиограмма живой частоты рядом с позывным.', stars: 140 },
    title_architect: { title: 'Титул «Архитектор тишины»',  description: 'Особый титул в Топе Циников, Досье и карточке профиля.', stars: 80 },
    title_collector: { title: 'Титул «Коллекционер драм»',  description: 'Статус искушённого зрителя чужих катастроф в Топе.', stars: 80 },
    title_patrician: { title: 'Титул «Патриций эфира»',     description: 'Привилегированный чин закрытой ложи Паноптикума.', stars: 120 },
    title_ghost:     { title: 'Титул «Призрак NEEO_CITY»',  description: 'Особый титул наблюдателя ночного NEEO_CITY.', stars: 120 },
    title_oracle:    { title: 'Титул «Последний свидетель»', description: 'Высший коллекционный титул ночной станции.', stars: 180 },
    perk_epitaph:    { title: 'Право на эпитафию',          description: 'Ваша личная фраза (до 42 симв.) на Троне #1, в Топе и Досье.', stars: 150 },
    // 3. Корпуса пейджера SOMA // PGR-04
    pager_amber:     { title: 'Пейджер: Янтарный фосфор',   description: 'Тёплый монохромный дисплей 1986 года и бронзовый крепёж.', stars: 110 },
    pager_clear:     { title: 'Пейджер: Дымчатый рубин 90-х', description: 'Полупрозрачный багровый корпус с дорожками платы.', stars: 140 },
    pager_ghost:     { title: 'Пейджер: Белый шум',         description: 'Холодный тёмный хром и серебристое свечение матрицы.', stars: 150 },
    pager_brass:     { title: 'Пейджер: Воронёная сталь',   description: 'Тяжёлый корпус с латунными винтами и золотистым кантом.', stars: 175 },
    // 4. Авторская керамика и живой уют комнаты
    room_steam:      { title: 'Горячий чай у терминала',    description: 'Живой тёплый пар над кружкой на столе у терминала.', stars: 95 },
    room_tape:       { title: 'Плёнка «Ночной экспресс»',   description: 'Мягкий виниловый шорох и далёкий стук ночного поезда.', stars: 110 },
    pot_cinnabar:    { title: 'Киноварный лак',             description: 'Императорская киноварь ручного обжига для вашего сосуда.', stars: 130 },
    pot_moon:        { title: 'Лунный пепел',               description: 'Дымчатый тёмный фарфор, ловящий алые отблески ковра.', stars: 140 },
    pot_kintsugi:    { title: 'Керамика Кинцуги',           description: 'Чёрная японская глина со швами чистого золота.', stars: 190 },
    room_cat:        { title: 'Чёрный кот на кушетке',      description: 'Спит клубком у пледа, тихо дышит и мурчит от касания.', stars: 250 },
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
