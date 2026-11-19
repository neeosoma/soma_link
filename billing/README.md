# Как включить реальную оплату в SOMA_LINK без своего сервера (0 ₽/мес)

Вся витрина **«✦ Атрибуты // Бутик станции»** уже встроена в игру:
- На **PTS** любой атрибут открывается бесплатно в один клик — можно проверить каждую рамку, печать, титул, эпитафию, корпус пейджера, сосуд Кинцуги, пар над кружкой, кассету и спящего чёрного кота.
- В **проде** (`ENV: 'prod'`), пока касса не подключена, все предметы работают в режиме честной **живой примерки**.
- Как только вы пройдёте 4 шага ниже (займёт **~10 минут прямо в браузере**, никакой VPS/хостинг/ИП для старта Telegram Stars не нужен), кнопки автоматически начнут принимать настоящие **Telegram Stars (⭐)**.

---

## Шаг 1. Обновите базу в Supabase (1 минута)

1. Откройте ваш проект **Supabase** → слева **SQL Editor** → **New query**.
2. Вставьте содержимое файла [`billing/setup_stars.sql`](./setup_stars.sql) и нажмите **Run**.
3. Это добавит колонки косметики, недельного рейтинга («Охота недели»), журнал платежей `soma_purchases` и защиту от подмены покупок из браузера.

---

## Шаг 2. Создайте бесплатную функцию `soma-stars` в Supabase (3 минуты)

Supabase уже даёт вам бесплатный серверный модуль (**Edge Functions** — до 500 000 вызовов в месяц бесплатно):

1. В Supabase откройте **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Имя функции укажите точно: `soma-stars`
3. Вставьте код из [`billing/supabase/functions/soma-stars/index.ts`](./supabase/functions/soma-stars/index.ts).
4. В настройках функции **отключите** галочку `Verify JWT with legacy secret` (потому что Telegram присылает вебхук со своим секретным заголовком, а запросы игроков функция сама проверяет по криптографической подписи Telegram `initData`).
5. Нажмите **Deploy function**.
6. Зайдите в **Edge Functions → Secrets** и добавьте два секрета:
   - `TG_BOT_TOKEN` — токен вашего бота из `@BotFather` (вида `123456789:AAH...`). *Никогда не вставляйте его в `config.js` — только в Secrets!*
   - `TG_WEBHOOK_SECRET` — придумайте любой длинный пароль из латинских букв и цифр (например: `soma_stars_secret_847291x`).

Скопируйте URL функции — он выглядит так:
`https://ВАШ_ПРОЕКТ.supabase.co/functions/v1/soma-stars`

---

## Шаг 3. Привяжите вебхук Telegram одним переходом в браузере (1 минута)

Подставьте в ссылку ниже ваш `TG_BOT_TOKEN`, `ВАШ_ПРОЕКТ` и `TG_WEBHOOK_SECRET` и просто откройте её один раз в адресной строке браузера:

```text
https://api.telegram.org/bot<TG_BOT_TOKEN>/setWebhook?url=https://<ВАШ_ПРОЕКТ>.supabase.co/functions/v1/soma-stars/webhook&secret_token=<TG_WEBHOOK_SECRET>&allowed_updates=["message","pre_checkout_query"]
```

Если браузер показал `{"ok":true,"result":true,"description":"Webhook was set"}` — касса подключена!

*(Примечание: если ваш бот параллельно отвечает на `/start` через отдельный конструктор, вместо этого просто создайте второго бота-кассира или перенесите ответ на `/start` внутрь этой же функции в 5 строк.)*

---

## Шаг 4. Добавьте одну строку в `config.js`

В вашем `config.js` добавьте поле `STARS_FUNCTION_URL`:

```js
window.SOMA_CONFIG = {
    ENV: 'prod',
    SUPABASE_URL: 'https://ВАШ_ПРОЕКТ.supabase.co',
    SUPABASE_KEY: 'sb_publishable_...',
    BOT_LINK: 'https://t.me/ваш_бот',
    STARS_FUNCTION_URL: 'https://ВАШ_ПРОЕКТ.supabase.co/functions/v1/soma-stars'
};
```

**Готово!** Все покупки игроков:
- проверяются по HMAC-подписи Telegram и серверному прайс-листу;
- мгновенно и навсегда привязываются к игроку в `soma_users.owned_cosmetics`;
- записываются в таблицу `soma_purchases`;
- копятся на балансе вашего бота в `@BotFather → Bot Settings → Balance` (выводятся через **Fragment в TON** от 1000 ⭐ после 21 дня холда Telegram или тратятся на рекламу Telegram Ads).
