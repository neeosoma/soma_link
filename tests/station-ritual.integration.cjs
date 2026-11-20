// Run with NODE_PATH pointing to a temporary @electric-sql/pglite installation.
// Exercises the aggregate function with PostgreSQL roles/RLS; not Supabase JWT transport.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const D = '44444444-4444-4444-8444-444444444444';
const E = '55555555-5555-4555-8555-555555555555';
const F = '66666666-6666-4666-8666-666666666666';

(async () => {
    const db = new PGlite();
    try {
        await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
            create function auth.uid() returns uuid language sql stable as $$
            select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
            grant usage on schema auth to authenticated, anon;`);
        await db.exec(readFileSync(require.resolve('../billing/setup_stars.sql'), 'utf8'));
        const migration = readFileSync(require.resolve('../billing/setup_station_ritual.sql'), 'utf8');
        await db.exec(migration);
        await db.exec(migration); // Reapplying the additive SQL Editor migration is safe.
        await db.exec('grant insert on public.soma_posts to authenticated');

        const asUser = async id => {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
            await db.exec('set role authenticated');
        };
        const post = async id => db.query(
            "insert into public.soma_posts(id,text) values ($1,'История для проверки ночного ритуала.')", [id]);
        const send = async (id, postId, senderUid) => db.query(
            "insert into public.soma_whispers(id,post_id,sender_uid,text) values($1,$2,$3,'Пусть сегодня станет немного легче.')",
            [id, postId, senderUid]);
        const status = async () => (await db.query('select * from public.station_night_ritual_status()')).rows[0];

        await asUser(E);
        for (let i = 0; i < 13; i++) await post(`ritual_post_${String(i).padStart(2, '0')}`);

        await asUser(F);
        let row = await status();
        assert.deepEqual(Object.keys(row).sort(), ['candidate_post_id', 'goal', 'is_complete', 'progress_bucket']);
        assert.equal(row.progress_bucket, 0, 'counts below five are not revealed');
        assert.equal(row.goal, 12);
        assert.equal(row.is_complete, false);
        assert.equal(row.candidate_post_id, 'ritual_post_00', 'only one public, unanswered post id is offered');

        await asUser(E);
        assert.equal((await status()).candidate_post_id, null, 'a reader never receives their own post as the ritual target');

        await asUser(A);
        for (let i = 0; i < 3; i++) await send(`ritual_whisper_${i}`, `ritual_post_${String(i).padStart(2, '0')}`, 'u_aaaa0000');
        await asUser(B);
        await send('ritual_whisper_3', 'ritual_post_03', 'u_bbbb0000');
        await asUser(F);
        row = await status();
        assert.equal(row.progress_bucket, 0, 'four responded-to stories remain hidden');
        assert.equal(row.candidate_post_id, 'ritual_post_04');

        await asUser(B);
        await send('ritual_whisper_4', 'ritual_post_04', 'u_bbbb0000');
        await asUser(E);
        await db.query("update public.soma_whispers set status='dismissed' where post_id='ritual_post_00'");
        await asUser(F);
        row = await status();
        assert.equal(row.progress_bucket, 5, 'five distinct real stories reveal only the 5+ bucket');
        assert.equal(row.candidate_post_id, 'ritual_post_05');

        await asUser(C);
        for (let i = 5; i < 8; i++) await send(`ritual_whisper_${i}`, `ritual_post_${String(i).padStart(2, '0')}`, 'u_cccc0000');
        await asUser(D);
        await send('ritual_whisper_8', 'ritual_post_08', 'u_dddd0000');
        await send('ritual_whisper_9', 'ritual_post_09', 'u_dddd0000');
        await asUser(F);
        row = await status();
        assert.equal(row.progress_bucket, 10, 'ten distinct stories reveal only the 10+ bucket');
        assert.equal(row.is_complete, false);

        await asUser(D);
        await send('ritual_whisper_10', 'ritual_post_10', 'u_dddd0000');
        await asUser(F);
        await send('ritual_whisper_11', 'ritual_post_11', 'u_ffff0000');
        row = await status();
        assert.equal(row.progress_bucket, 12);
        assert.equal(row.is_complete, true);
        assert.equal(row.candidate_post_id, null, 'completed ritual offers no further target');

        await db.exec('reset role; set role anon');
        await assert.rejects(db.query('select * from public.station_night_ritual_status()'), /permission denied/);
        console.log('Station ritual integration passed: repeatable migration, Auth-only RPC, own-post exclusion, hidden low counts, 5+/10+/12+ buckets, dismissed delivery, and no sender/message data.');
    } finally { await db.close(); }
})().catch(error => { console.error(error); process.exit(1); });
