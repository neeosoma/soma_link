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
        // Teпло уже зачислено — не теряется при ответе.
        assert.equal(await scalar("select warmth from public.soma_users where username='u_bbbb'"), 4,
            'warmth credited at save time survives the reply');
        // my_saved_soma_whispers уже не видит откликнутый шёпот (источник исчез),
        // но это не влияет на зачисленное тепло.
        await asUser(B);
        const savedRows = (await db.query('select * from public.my_saved_soma_whispers()')).rows;
        assert.equal(savedRows.length, 0, 'answered whisper is no longer in the ack source');

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
