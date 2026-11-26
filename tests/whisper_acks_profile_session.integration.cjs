// Regression test for the browser/desktop "whisper saved on cassette" notification
// not arriving when the profile is bound to several sessions.
//
// Bug: my_soma_whisper_acks() filtered strictly by sender_auth_id = auth.uid().
// A profile can be bound to MULTIPLE auth-IDs (old session + new session after the
// anonymous session is recreated / cache cleared). The whisper was sent by the OLD
// session (sender_auth_id = old), but the app now runs on the NEW session — the
// strict filter returned nothing, so the sender never got the "your whisper was
// saved on cassette" incoming message, even though the server recorded the ack.
//
// Fix: filter by the profile — my_profile_auth_ids() returns ALL auth-IDs bound to
// the current profile, so an ack for a whisper sent by any profile session is
// delivered to the current session.
//
// Run with NODE_PATH pointing to a temporary @electric-sql/pglite installation.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; // old session that sent the whisper
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; // new session, same profile
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'; // unrelated session
(async () => {
    const db = new PGlite();
    try {
        await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
          create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
          grant usage on schema auth to authenticated, anon;`);
        const stars = readFileSync(require.resolve('../billing/setup_stars.sql'), 'utf8');
        await db.exec(stars); await db.exec(stars); // idempotent
        const pipeline = readFileSync(require.resolve('../billing/setup_signal_pipeline.sql'), 'utf8');
        await db.exec(pipeline); await db.exec(pipeline); // idempotent
        const acks = readFileSync(require.resolve('../billing/setup_whisper_acks.sql'), 'utf8');
        await db.exec(acks); await db.exec(acks); // idempotent (creates tables, trigger, OLD my_soma_whisper_acks)

        // Profile-based my_profile_auth_ids() + bindings table (production: applied via
        // fix_whisper_profile_sessions.sql / pager fix). Needed by the fix migration.
        await db.exec(`create schema if not exists soma_private;
          create table if not exists soma_private.user_profile_bindings (
            auth_id uuid not null primary key,
            profile_uid text not null
          )`);
        await db.exec(`create or replace function public.my_profile_auth_ids()
returns uuid[] language sql stable security definer set search_path = '' as $$\n    select coalesce(array_agg(b.auth_id), '{}'::uuid[])\n      from soma_private.user_profile_bindings b\n     where b.profile_uid = (select b2.profile_uid from soma_private.user_profile_bindings b2 where b2.auth_id = auth.uid() limit 1)\n$$`);
        await db.exec('revoke all on function public.my_profile_auth_ids() from public');
        await db.exec('grant execute on function public.my_profile_auth_ids() to anon, authenticated');

        // Apply the fix — profile-based my_soma_whisper_acks.
        const fix = readFileSync(require.resolve('../billing/fix_whisper_acks_profile.sql'), 'utf8');
        await db.exec(fix); await db.exec(fix); // idempotent

        await db.exec('grant select, insert on public.soma_posts to authenticated');
        const asUser = async id => {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
            await db.exec('set role authenticated');
        };

        // Profile U bound to OLD session A and NEW session B.
        await db.query("insert into soma_private.user_profile_bindings(auth_id, profile_uid) values ($1,'u_cafebabecafebabe') on conflict (auth_id) do nothing", [A]);
        await db.query("insert into soma_private.user_profile_bindings(auth_id, profile_uid) values ($1,'u_cafebabecafebabe') on conflict (auth_id) do nothing", [B]);

        // B owns a post; A (same profile, old session) sends a whisper to it.
        await asUser(B);
        await db.query("insert into public.soma_posts(id,text) values ('post_b1','История для шёпота.')");
        await asUser(A);
        await db.query("select * from public.send_soma_whisper('whisper_u1','post_b1','ЛИЧНАЯ БОЛЬ','Шёпот','u_cafebabecafebabe','Пусть сегодня станет немного светлее.',null)");

        // B (recipient) saves the whisper on cassette → ack recorded for sender A.
        await asUser(B);
        await db.query("select * from public.set_soma_whisper_status('whisper_u1','saved')");

        // FIX: the NEW session B (same profile) must receive the ack for the whisper
        // sent by the OLD session A. (Old strict auth.uid() filter returned nothing.)
        await asUser(B);
        const ackRows = (await db.query('select * from public.my_soma_whisper_acks()')).rows;
        assert.equal(ackRows.length, 1, 'new session of the profile receives the ack for the whisper sent by the old session');
        assert.equal(String(ackRows[0].whisper_id), 'whisper_u1', 'ack points to the saved whisper');

        // The old session A also still sees it.
        await asUser(A);
        const ackRowsA = (await db.query('select * from public.my_soma_whisper_acks()')).rows;
        assert.equal(ackRowsA.length, 1, 'old session still sees the ack');

        // Security: an unrelated session C (not bound to the profile) must NOT see it.
        await asUser(C);
        const ackRowsC = (await db.query('select * from public.my_soma_whisper_acks()')).rows;
        assert.equal(ackRowsC.length, 0, 'unrelated session does not see another profile ack');

        // Read-tracking is profile-scoped: the ack is the profile's notice, so
        // marking it read on one session hides it from every session of the profile
        // (no duplicate notifications across the profile's sessions).
        await asUser(B);
        await db.query("select * from public.mark_soma_whisper_ack_read($1)", [ackRows[0].id]);
        await asUser(B);
        assert.equal((await db.query('select * from public.my_soma_whisper_acks()')).rows.length, 0,
            'ack hidden from B after marking read');
        await asUser(A);
        assert.equal((await db.query('select * from public.my_soma_whisper_acks()')).rows.length, 0,
            'ack hidden from the whole profile after one session reads it (profile-scoped read)');

        console.log('Whisper ack profile-session regression passed: ack delivered across profile sessions.');
    } catch (e) {
        console.error('Whisper ack profile-session regression FAILED:', e.message);
        process.exit(1);
    } finally { await db.close(); }
})();
