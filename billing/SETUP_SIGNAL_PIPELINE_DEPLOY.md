# SOMA~LINK // SIGNAL PIPELINE — Деплой RPC-контура

## Что это

Полная перестройка контура сигнала и шёпота на **server-side RPC-функции**
(`security definer`). Клиент перестал писать в таблицы `soma_posts` и
`soma_whispers` напрямую — все write-операции выполняются серверными
функциями, которые работают с правами владельца и **не зависят от RLS-политик**.

Это решает проблему `42501 New row violates row-level security policy`
на глубине: даже если RLS-политики сбились или не настроены, RPC-функции
как `security definer` обходят их напрямую.

**v2 (SETOF):** функции возвращают `RETURNS SETOF public.soma_posts` /
`RETURNS SETOF public.soma_whispers` — тип берётся из реальной таблицы.
Это исключает ошибку `42804 structure of query does not match function result type`,
которая возникала при `RETURNS TABLE(...)` из-за расхождения типов колонок
(например, `created_at`) между локальной схемой и реальной в Supabase.

**v3 (owner capture):** `submit_soma_post` записывает владельца поста в
`soma_private.post_owners`. Без этого `next_soma_pager_story()` не находит
пост для пейджера других игроков — он читает посты через join с
`post_owners` и фильтр `owner_id <> auth.uid()`.

## SQL-миграция

Файл: `billing/setup_signal_pipeline.sql`

### Что создаёт миграция

Все функции возвращают `SETOF` реальной таблицы (тип берётся из схемы —
не вызывает `42804`):

1. **`submit_soma_post(p_id, p_author, p_tag, p_text)`** — вставка сигнала
   (`soma_posts`). Возвращает созданную строку (`SETOF soma_posts`).
2. **`send_soma_whisper(p_id, p_post_id, p_post_tag, p_post_preview, p_sender_uid, p_text)`** —
   вставка шёпота (`soma_whispers`). Возвращает созданный шёпот (`SETOF soma_whispers`).
3. **`set_soma_whisper_status(p_id, p_status)`** — обновление статуса
   шёпота (`pending → saved/dismissed`). Возвращает обновлённую строку.
4. **`get_my_pending_whispers(p_post_ids)`** — чтение входящих pending-шёпотов
   на посты игрока (read-алтернатива прямому SELECT'у).
5. **`get_my_saved_whispers()`** — чтение сохранённых шёпотов
   текущего Auth-пользователя (read-алтернатива `my_saved_soma_whispers`).

Все функции: `security definer`, `set search_path = public, pg_temp`.
Grant execute — `anon, authenticated` (и revoke from `public`).

## Деплой

### 1. Применить SQL

В Supabase → **SQL Editor** → **New query** → вставить содержимое
`billing/setup_signal_pipeline.sql` → **Run** (как project owner).

Миграция идемпотентна: повторный запуск ничего не ломает
(`create or replace function`).

### 2. Проверить функции

После применения в SQL Editor'е:

```sql
select proname, prokind
from pg_proc
where proname in ('submit_soma_post', 'send_soma_whisper',
                  'set_soma_whisper_status', 'get_my_pending_whispers',
                  'get_my_saved_whispers')
order by proname;
```

Должно быть 5 строк, `prokind = 'f'`.

### 3. Проверить права

```sql
select p.proname, n.nspname,
       r.rolname as granted_to
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(p.proacl) r
where p.proname in ('submit_soma_post', 'send_soma_whisper',
                    'set_soma_whisper_status', 'get_my_pending_whispers',
                    'get_my_saved_whispers')
order by p.proname, r.rolname;
```

Должны быть grants на `anon` и `authenticated`.

## Клиентские изменения

### `index.html` — `submitPainPost()`

Было: `supabaseClient.from('soma_posts').insert([insertRow])`
→ Теперь: `supabaseClient.rpc('submit_soma_post', { p_id, p_author, p_tag, p_text })`

### `room.js` — `sendWhisperToPostOnce()`

Было: `supabaseClient.from('soma_whispers').insert([wRow])`
→ Теперь: `supabaseClient.rpc('send_soma_whisper', { p_id, p_post_id, p_post_tag, p_post_preview, p_sender_uid, p_text })`

### `room.js` — `persistWhisperStatus()`

Было: `supabaseClient.from('soma_whispers').update({ status }).eq('id', id)`
→ Теперь: `supabaseClient.rpc('set_soma_whisper_status', { p_id, p_status })`

### `room.js` — `syncPagerWhispers()`

Inbox-read:
Было: `supabaseClient.from('soma_whispers').select(...).in('post_id', myPosts)`
→ Теперь: `supabaseClient.rpc('get_my_pending_whispers', { p_post_ids: myPosts })`

Saved-ack (уже был RPC): `supabaseClient.rpc('my_saved_soma_whispers')` —
можно оставить как есть или переключить на `get_my_saved_whispers()`.

## Верификация контура (A→B→A)

1. **A отправляет сигнал** — пост появляется в ленте (через RPC `submit_soma_post`).
2. **B получает сигнал на пейджер** — `syncPagerWhispers()` читает
   pending-шёпоты через RPC `get_my_pending_whispers`.
3. **B отвечает шёпотом** — шёпот отправляется через RPC `send_soma_whisper`.
4. **A получает шёпот на пейджер** — `syncPagerWhispers()` читает pending.
5. **A сохраняет шёпот в кассету** — `acceptIncomingWhisper()` →
   `persistWhisperStatus(w.id, 'saved')` (RPC `set_soma_whisper_status`) →
   `saveWhisperCassette(...)` (localStorage).
6. **B получает +Тепло (ack)** — `syncPagerWhispers()` читает
   `my_saved_soma_whispers` (или `get_my_saved_whispers`).

## Откат

Функции можно удалить:

```sql
drop function if exists public.submit_soma_post(text, text, text, text);
drop function if exists public.send_soma_whisper(text, text, text, text, text, text);
drop function if exists public.set_soma_whisper_status(text, text);
drop function if exists public.get_my_pending_whispers(text[]);
drop function if exists public.get_my_saved_whispers();
```

Но тогда клиентский код, переписанный на RPC, не будет работать —
откат требует отката клиентских правок.
