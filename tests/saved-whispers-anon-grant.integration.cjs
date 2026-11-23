// Run with NODE_PATH pointing to a temporary @electric-sql/pglite installation.
// This checks real PostgreSQL SQL/roles/RLS, not Supabase Auth transport or concurrency.
// Регрессионная проверка корневой причины бага «ack-notice и тепло не приходят
// при сохранении шёпота на кассету» (PR #147/#148 deployed, live-баг остался):
// RPC my_saved_soma_whispers() был grant-ed только для authenticated, а приложение
// использует анонимный вход (роль anon) — каждый вызов RPC падал с
// «permission denied» и молча поглощался try/catch в syncPagerWhispers.
// Регрессионный фикс: grant execute для anon (billing/fix_saved_whispers_anon_grant.sql).
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
        await db.exec(stars); // Repeatability.
        const pipeline = readFileSync(require.resolve('../billing/setup_signal_pipeline.sql'), 'utf8');
        await db.exec(pipeline);
        await db.exec(pipeline); // Repeatability.
        // Deploy-фикс: grant anon на RPC чтения сохранённых шёпотов
        // (billing/fix_saved_whispers_anon_grant.sql) — без него RPC
        // недоступен для anon и ack-notice/тепло не срабатывают.
        const fix = readFileSync(require.resolve('../billing/fix_saved_whispers_anon_grant.sql'), 'utf8');
        await db.exec(fix);
        await db.exec(fix); // Repeatability.
        await db.exec('grant select, insert on public.soma_posts to authenticated, anon');

        const asUser = async (role, id = '') => {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
            await db.exec(`set role ${role}`);
        };
        const scalar = async (query, args) => Object.values((await db.query(query, args)).rows[0])[0];

        // 1) A публикует пост; B шепчет на него.
        await asUser('authenticated', A);
        await db.query("insert into public.soma_posts(id,text) values ('post_a1','История для аккаунта A.')");
        await asUser('authenticated', B);
        await db.query("insert into public.soma_posts(id,text) values ('post_b1','История для аккаунта B.')");

        // B шепчет на пост A — вкладка anon (как в live-приложении).
        await asUser('anon', B);
        const sent = (await db.query(
            "select * from public.send_soma_whisper('whisper_w1','post_a1','ЛИЧНАЯ БОЛЬ','Пусть сегодня станет немного легче.','u_bbbb','Тёплое слово этому человеку.', null, null)")).rows;
        assert.equal(sent.length, 1, 'anon can send a whisper (send_soma_whisper is granted to anon)');

        // 2) A (anon, как в live-приложении) сохраняет шёпот на кассету —
        //    save-RPC должен быть доступен для anon (guard on save works).
        await asUser('anon', A);
        assert.equal(await scalar("select status from public.set_soma_whisper_status('whisper_w1','saved')"), 'saved',
            'anon can save a whisper via set_soma_whisper_status');

        // 3) REGRESSION: чтение сохранённых шёпотов отправителем через
        //    my_saved_soma_whispers должно быть доступно для anon.
        //    Без фикса (grant только authenticated) — падает permission denied,
        //    и ack-notice + тепло в syncPagerWhispers никогда не срабатывали.
        await asUser('anon', B);
        const savedRows = (await db.query('select * from public.my_saved_soma_whispers()')).rows;
        assert.equal(savedRows.length, 1, 'anon can read saved whispers via my_saved_soma_whispers (the ack/warmth source)');
        assert.equal(savedRows[0].id, 'whisper_w1', 'saved whisper row is visible to its sender');
        assert.equal(savedRows[0].status, 'saved');

        // 4) RPC, спасающий ack-notice: ack уже выдан — повторный вызов
        //    (через getAckedWhispers) пропускает, но RPC должен вернуть строку.
        assert.equal((await db.query('select * from public.my_saved_soma_whispers()')).rows.length, 1,
            'saved-whisper read stays available for the ack dedupe path');

        // 5) Anonymous read of another user's saved whisper must NOT leak.
        await asUser('anon', A);
        assert.equal((await db.query('select * from public.my_saved_soma_whispers()')).rows.length, 0,
            'saved-whisper read is scoped to the sender (auth.uid())');

        console.log('Saved-whispers anon-grant integration passed: ack/warmth RPC is reachable for anon role, scoped by sender.');
    } catch (e) {
        console.error('Saved-whispers anon-grant integration FAILED:', e.message);
        process.exit(1);
    } finally {
        await db.close();
    }
})();
