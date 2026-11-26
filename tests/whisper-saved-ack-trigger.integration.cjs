// Regression test for the server-side whisper-saved ack trigger.
// When a whisper transitions to 'saved', the trigger credits warmth to the
// sender (server-authoritative) and updates the ledger — independent of the
// client's polling and of later status changes (a reply flips the whisper to
// 'answered' but the warmth was already credited at save time).
// Run with NODE_PATH pointing to a temporary @electric-sql/pglite installation.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

(async () => {
    const db = new PGlite();
    try {
        await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
            create function auth.uid() returns uuid language sql stable as $$\n            select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
            grant usage on schema auth to authenticated, anon;`);
        const stars = readFileSync(require.resolve('../billing/setup_stars.sql'), 'utf8');
        await db.exec(stars);
        await db.exec(stars); // Repeatability matters for SQL Editor users.
        const pipeline = readFileSync(require.resolve('../billing/setup_signal_pipeline.sql'), 'utf8');
        await db.exec(pipeline);
        await db.exec(pipeline); // Repeatability.
        // ack-events SQL — server-side ack-события (независимо от статуса шёпота).
        // PGlite's db.exec() не парсит $$ dollar-quotes в plpgsql-функциях из
        // отдельного SQL-блока (хотя setup_stars.sql с $$ грузится — разные кодовые
        // пути PGlite). SQL-файл setup_whisper_acks.sql содержит $$ для production
        // (Supabase — реальный PostgreSQL). Здесь создаём ack-объекты через
        // отдельные db.exec()-вызовы с string-literal '...' телами функций —
        // стандартный PostgreSQL, поддерживается PGlite.

        // 1) таблицы ack-событий.
        await db.exec(`create table if not exists public.soma_whisper_acks (
            id bigserial primary key,
            whisper_id text not null,
            sender_auth_id uuid not null,
            day_key text not null,
            created_at timestamptz not null default now(),
            unique (whisper_id, sender_auth_id)
        )`);
        await db.exec('grant select, insert, update on public.soma_whisper_acks to authenticated, anon');
        await db.exec(`create table if not exists public.soma_whisper_acks_read (
            ack_id bigint not null references public.soma_whisper_acks(id) on delete cascade,
            reader_auth_id uuid not null,
            created_at timestamptz not null default now(),
            primary key (ack_id, reader_auth_id)
        )`);
        await db.exec('grant select, insert on public.soma_whisper_acks_read to authenticated, anon');

        // 2) trigger-функция: запись ack-события при transition → saved.
        await db.exec(`create or replace function public.record_soma_whisper_ack()
returns trigger language plpgsql as '
begin
    if new.status = ''saved'' and old.status is distinct from ''saved'' then
        insert into public.soma_whisper_acks (whisper_id, sender_auth_id, day_key)
        values (new.id, new.sender_auth_id, coalesce(new.day_key, to_char(now() at time zone ''UTC'', ''YYYY-MM-DD'')))
        on conflict (whisper_id, sender_auth_id) do nothing;
    end if;
    return new;
exception
    when insufficient_privilege then
        return new;
end;
'`);
        await db.exec(`drop trigger if exists trg_soma_whisper_ack_event on public.soma_whispers`);
        await db.exec(`create trigger trg_soma_whisper_ack_event
    after update on public.soma_whispers
    for each row execute function public.record_soma_whisper_ack()`);

        // 3) my_soma_whisper_acks — непрочитаные ack-события отправителя.
        await db.exec(`create or replace function public.my_soma_whisper_acks()
returns table(id bigint, whisper_id text, day_key text, created_at timestamptz)
language sql stable security definer set search_path = '' as '
    select a.id, a.whisper_id, a.day_key, a.created_at
    from public.soma_whisper_acks a
    where a.sender_auth_id = auth.uid()
    and not exists (
        select 1 from public.soma_whisper_acks_read r
        where r.ack_id = a.id and r.reader_auth_id = auth.uid()
    )
    order by a.created_at desc
    limit 20;
'`);
        await db.exec('revoke all on function public.my_soma_whisper_acks() from public');
        await db.exec('grant execute on function public.my_soma_whisper_acks() to anon, authenticated');

        // 4) mark_soma_whisper_ack_read — отметка прочитанным.
        await db.exec(`create or replace function public.mark_soma_whisper_ack_read(p_ack_id bigint)
returns boolean language plpgsql security definer set search_path = public, pg_temp as '
begin
    insert into public.soma_whisper_acks_read (ack_id, reader_auth_id)
    values (p_ack_id, auth.uid())
    on conflict (ack_id, reader_auth_id) do nothing;
    return true;
end;
'`);
        await db.exec('revoke all on function public.mark_soma_whisper_ack_read(bigint) from public');
        await db.exec('grant execute on function public.mark_soma_whisper_ack_read(bigint) to anon, authenticated');
        await db.exec('grant select, insert on public.soma_posts to authenticated');
        // soma_users privileges (fix_cross_device_sync.sql grants these in production) —
        // the trigger credits warmth to the sender's soma_users row.
        await db.exec('grant select, insert, update on public.soma_users to authenticated');

        // ledger column (added by fix_cross_device_sync.sql in production) —
        // the trigger uses it for the daily cap; test the full path.
        await db.exec("alter table public.soma_users add column if not exists ledger jsonb not null default '{}'::jsonb");

        const asUser = async id => {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
            await db.exec('set role authenticated');
        };
        const post = async id => db.query("insert into public.soma_posts(id,text) values ($1,'История для проверки ack-триггера.')", [id]);
        const send = async (id, postId, uid) => db.query(
            "insert into public.soma_whispers(id,post_id,sender_uid,text) values($1,$2,$3,'Пусть сегодня станет немного легче.')",
            [id, postId, uid]);
        const scalar = async (query, args) => Object.values((await db.query(query, args)).rows[0])[0];
        const status = id => scalar("select status from public.soma_whispers where id=$1", [id]);
        const setStatus = async (id, st) => db.query(
            "select * from public.set_soma_whisper_status($1,$2)", [id, st]);
        const todayUtc = async () => {
            const r = Object.values((await db.query(
                "select to_char(now() at time zone 'UTC', 'YYYY-MM-DD') as d")).rows[0])[0];
            return r;
        };

        // A — владелец постов; B — отправитель шёпота (имеет профиль в soma_users).
        await asUser(A); await post('post_a1');
        await asUser(B);
        await db.query("insert into public.soma_users(username, warmth, ledger) values ('u_bbbb', 0, '{}'::jsonb)");
        await send('whisper_ack1', 'post_a1', 'u_bbbb');

        // 1) Сохранение шёпота на кассету → триггер зачисляет тепло отправителю.
        await asUser(A);
        assert.equal(await scalar("select status from public.set_soma_whisper_status('whisper_ack1','saved')"), 'saved');
        const today = await todayUtc();
        assert.equal(await scalar("select warmth from public.soma_users where username='u_bbbb'"), 4,
            'sender warmth must be credited +4 on save');
        const ledger = (await db.query("select ledger from public.soma_users where username='u_bbbb'")).rows[0].ledger;
        assert.equal(ledger.whisperAcks, 1, 'ledger.whisperAcks must be 1');
        assert.equal(ledger.whisperAckDay, today, 'ledger.whisperAckDay must be today');
        assert.equal(ledger.total, 4, 'ledger.total must be 4');

        // 2) Повторное сохранение (saved → saved) — не удваивает тепло (триггер
        //    срабатывает только на переход в saved).
        await asUser(A);
        await setStatus('whisper_ack1', 'saved');
        assert.equal(await scalar("select warmth from public.soma_users where username='u_bbbb'"), 4,
            're-save must not double-credit warmth');

        // 3) Ответ recipient (A — владелец поста) переключает статус в answered —
        //    ack-источник (my_saved_soma_whispers, фильтр saved) исчезает, но тепло
        //    УЖЕ зачислено серверным триггером при сохранении.
        await asUser(A);
        await db.query("select * from public.send_soma_whisper('whisper_rep2','post_a1','ЛИЧНАЯ БОЛЬ','Исходный шёпот для ответа','u_aaaa','Ответ на ваш шёпот, чтобы он стал немного светлее.','whisper_ack1')");
        assert.equal(await status('whisper_ack1'), 'answered', 'reply flips original to answered');
        // Тепло уже зачислено — не теряется при ответе.
        assert.equal(await scalar("select warmth from public.soma_users where username='u_bbbb'"), 4,
            'warmth credited at save time survives the reply');
        // my_saved_soma_whispers уже не видит откликнутый шёпот (источник исчез),
        // но это не влияет на зачисленное тепло.
        await asUser(B);
        const savedRows = (await db.query('select * from public.my_saved_soma_whispers()')).rows;
        assert.equal(savedRows.length, 0, 'answered whisper is no longer in the ack source');

        // 3a) Ack-событие ОСТАЁТСЯ после ответа: ack-источник (my_soma_whisper_acks)
        //     независим от статуса шёпота — отправитель всё равно получает сообщение.
        await asUser(B);
        const ackRows = (await db.query('select * from public.my_soma_whisper_acks()')).rows;
        assert.equal(ackRows.length, 1, 'ack-event must survive the answered transition');
        assert.equal(String(ackRows[0].whisper_id), 'whisper_ack1', 'ack-event points to the saved whisper');

        // 3b) Отметка прочитанного — ack-событие исчезает из my_soma_whisper_acks.
        await asUser(B);
        await db.query("select * from public.mark_soma_whisper_ack_read($1)", [ackRows[0].id]);
        const ackRows2 = (await db.query('select * from public.my_soma_whisper_acks()')).rows;
        assert.equal(ackRows2.length, 0, 'ack-event disappears after marking read');

        // 4) Ак-тепло — строго один раз в сутки (whisperAckDay): второй сохранённый
        //    шёпот в тот же день не даёт доп. тепло.
        await asUser(A); await post('post_a2');
        await asUser(B); await send('whisper_ack2', 'post_a2', 'u_bbbb');
        await asUser(A);
        await setStatus('whisper_ack2', 'saved');
        assert.equal(await scalar("select warmth from public.soma_users where username='u_bbbb'"), 4,
            'second save same day does not double-credit (once per day)');

        console.log('Whisper saved-ack trigger integration passed: server-side warmth on save, no double-credit, survives reply.');
    } catch (e) {
        console.error('Whisper saved-ack trigger integration FAILED:', e.message);
        process.exit(1);
    } finally {
        await db.close();
    }
})();
