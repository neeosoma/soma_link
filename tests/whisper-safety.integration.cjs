// Run with NODE_PATH pointing to a temporary @electric-sql/pglite installation.
// This checks real PostgreSQL SQL/roles/RLS, not Supabase Auth transport or concurrency.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const D = '44444444-4444-4444-8444-444444444444';
const E = '55555555-5555-4555-8555-555555555555';
(async () => {
    const db = new PGlite();
    try {
        await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
            create function auth.uid() returns uuid language sql stable as $$
            select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
            grant usage on schema auth to authenticated, anon;`);
        await db.exec(readFileSync(require.resolve('../billing/setup_stars.sql'), 'utf8'));
        const sql = readFileSync(require.resolve('../billing/setup_whisper_safety.sql'), 'utf8');
        await db.exec(sql);
        await db.exec(sql); // Repeatability matters for SQL Editor users.
        await db.exec(readFileSync(require.resolve('../billing/setup_stars.sql'), 'utf8')); // Base rerun must not drop block enforcement.
        await db.exec('grant select, insert on public.soma_posts to authenticated');
        const asUser = async id => {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
            await db.exec('set role authenticated');
        };
        const post = async id => db.query("insert into public.soma_posts(id,text) values ($1,'История для проверки канала.')", [id]);
        const send = async (id, postId, uid) => db.query("insert into public.soma_whispers(id,post_id,sender_uid,text) values($1,$2,$3,'Пусть сегодня станет немного легче.')", [id,postId,uid]);
        const scalar = async (query, args) => Object.values((await db.query(query, args)).rows[0])[0];
        await asUser(B); await post('post_b1'); await post('post_b2');
        await asUser(C); await post('post_c1');
        await asUser(A); await send('whisper_ab', 'post_b1', 'u_aaaa'); await send('whisper_ac', 'post_c1', 'u_aaaa');
        await assert.rejects(db.query("select public.report_soma_whisper('whisper_ab','spam')"), /Message unavailable/);
        await asUser(C);
        await assert.rejects(db.query("select public.block_soma_whisper_sender('whisper_ab')"), /Message unavailable/);
        assert.equal((await db.query("select id from public.soma_whispers where id='whisper_ab'")).rows.length, 0);
        await asUser(B);
        await assert.rejects(db.query('select sender_auth_id from public.soma_whispers'), /permission denied/);
        await assert.rejects(db.query('select * from soma_private.whisper_reports'), /permission denied/);
        await assert.rejects(db.query("select public.report_soma_whisper('whisper_ab','unknown')"), /Invalid reason/);
        assert.equal(await scalar("select public.report_soma_whisper('whisper_ab','harassment')"), true);
        assert.equal(await scalar("select public.report_soma_whisper('whisper_ab','spam')"), false);
        assert.deepEqual(await scalar("select public.block_soma_whisper_sender('whisper_ab')"), ['whisper_ab']);
        assert.deepEqual(await scalar("select public.block_soma_whisper_sender('whisper_ab')"), []);
        const blocks = (await db.query('select * from public.my_soma_whisper_blocks()')).rows;
        assert.equal(blocks.length, 1);
        assert.deepEqual(Object.keys(blocks[0]).sort(), ['anchor_id', 'created_at']);
        await asUser(C);
        assert.equal(await scalar("select status from public.soma_whispers where id='whisper_ac'"), 'pending');
        assert.equal((await db.query('select * from public.my_soma_whisper_blocks()')).rows.length, 0);
        assert.equal(await scalar("select public.unblock_soma_whisper_sender('whisper_ab')"), false);
        await asUser(A);
        await assert.rejects(send('whisper_ab2', 'post_b2', 'u_aaaa'), /Whisper unavailable/);
        await asUser(B);
        assert.equal(await scalar("select public.unblock_soma_whisper_sender('whisper_ab')"), true);
        assert.equal(await scalar("select status from public.soma_whispers where id='whisper_ab'"), 'dismissed');
        await asUser(A); await send('whisper_ab2', 'post_b2', 'u_aaaa');
        await assert.rejects(send('whisper_fourth', 'post_b1', 'u_aaaa'), /Daily whisper limit/);
        await asUser(B);
        await db.query("update public.soma_whispers set status='saved' where id='whisper_ab2'");
        assert.deepEqual(await scalar("select public.block_soma_whisper_sender('whisper_ab')"), []);
        assert.equal(await scalar("select status from public.soma_whispers where id='whisper_ab2'"), 'saved');
        // More independent recipients' messages for the report rate-cap check.
        await asUser(B);
        for (let i = 0; i < 6; i++) await post('post_rate_' + i);
        for (let i = 0; i < 6; i++) {
            await asUser(i < 3 ? D : E);
            await send('whisper_rate_' + i, 'post_rate_' + i, i < 3 ? 'u_dddd' : 'u_eeee');
        }
        await asUser(B);
        for (let i = 0; i < 4; i++) assert.equal(await scalar('select public.report_soma_whisper($1,$2)', ['whisper_rate_' + i, 'spam']), true);
        await assert.rejects(db.query("select public.report_soma_whisper('whisper_rate_4','spam')"), /Report limit/);
        assert.equal(await scalar("select public.report_soma_whisper('whisper_ab','spam')"), false);
        await db.exec('reset role; set role anon');
        await assert.rejects(db.query("select public.report_soma_whisper('whisper_ab','spam')"), /permission denied/);
        await assert.rejects(db.query("select public.block_soma_whisper_sender('whisper_ab')"), /permission denied/);
        console.log('PostgreSQL safety integration passed: repeat migration, recipient-only report/block, hidden identity, private tables, duplicate/rate caps, block/unblock, other recipient isolation, unchanged send cap, anon denial.');
    } finally { await db.close(); }
})().catch(error => { console.error(error.message); process.exit(1); });
