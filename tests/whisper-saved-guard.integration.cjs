// Guard regression test: a whisper saved to a cassette (status 'saved') is
// irreversible. saved → dismissed / saved → pending must be rejected, because
// the saved status is what feeds the sender's ack (warmth + incoming message
// via my_saved_soma_whispers). saved → saved (no-op) and saved → answered stay
// allowed.
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
            create function auth.uid() returns uuid language sql stable as $$
            select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
            grant usage on schema auth to authenticated, anon;`);
        const stars = readFileSync(require.resolve('../billing/setup_stars.sql'), 'utf8');
        await db.exec(stars);
        await db.exec(stars); // Repeatability matters for SQL Editor users.
        const pipeline = readFileSync(require.resolve('../billing/setup_signal_pipeline.sql'), 'utf8');
        await db.exec(pipeline);
        await db.exec(pipeline); // Repeatability.
        await db.exec('grant select, insert on public.soma_posts to authenticated');

        const asUser = async id => {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
            await db.exec('set role authenticated');
        };
        const post = async id => db.query("insert into public.soma_posts(id,text) values ($1,'История для проверки guard.')", [id]);
        const send = async (id, postId, uid) => db.query(
            "insert into public.soma_whispers(id,post_id,sender_uid,text) values($1,$2,$3,'Пусть сегодня станет немного легче.')",
            [id, postId, uid]);
        const scalar = async (query, args) => Object.values((await db.query(query, args)).rows[0])[0];
        const status = id => scalar("select status from public.soma_whispers where id=$1", [id]);
        const setStatus = async (id, st) => db.query(
            "select * from public.set_soma_whisper_status($1,$2)", [id, st]);

        // A — владелец постов; B — отправитель шёпотов.
        await asUser(A); await post('post_a1'); await post('post_a2');
        await asUser(B); await send('whisper_g1', 'post_a1', 'u_bbbb');
        await asUser(B); await send('whisper_g2', 'post_a2', 'u_bbbb');

        // 1) pending → saved проходит (базовое сохранение на кассету).
        await asUser(A);
        assert.equal(await scalar("select status from public.set_soma_whisper_status('whisper_g1','saved')"), 'saved');

        // 2) saved → dismissed должно падать (иначе отклик/тепло отправителю снимается).
        await assert.rejects(setStatus('whisper_g1', 'dismissed'), /Invalid whisper transition/);
        assert.equal(await status('whisper_g1'), 'saved', 'status stays saved after rejected dismiss');

        // 3) saved → pending тоже должно падать.
        await assert.rejects(setStatus('whisper_g1', 'pending'), /Invalid whisper transition/);
        assert.equal(await status('whisper_g1'), 'saved', 'status stays saved after rejected revert');

        // 4) saved → saved (no-op) и saved → answered — разрешены.
        assert.equal(await scalar("select status from public.set_soma_whisper_status('whisper_g1','saved')"), 'saved');
        assert.equal(await scalar("select status from public.set_soma_whisper_status('whisper_g1','answered')"), 'answered');

        // 5) Отправитель видит сохранённый шёпот в my_saved_soma_whispers (источник отклика):
        //    второй saved-шёпот остаётся в списке, отклонённый — нет.
        await asUser(A);
        assert.equal(await scalar("select status from public.set_soma_whisper_status('whisper_g2','saved')"), 'saved');
        await asUser(B);
        const savedRows = (await db.query('select * from public.my_saved_soma_whispers()')).rows;
        assert.equal(savedRows.length, 1, 'only the still-saved whisper is visible to its sender');
        assert.equal(savedRows[0].id, 'whisper_g2', 'saved whisper feeds the ack/warmth path');
        assert.equal(savedRows[0].status, 'saved');

        console.log('Whisper saved-guard integration passed: saved is irreversible, ack source intact.');
    } catch (e) {
        console.error('Whisper saved-guard integration FAILED:', e.message);
        process.exit(1);
    } finally {
        await db.close();
    }
})();
