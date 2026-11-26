// Run with NODE_PATH pointing to a temporary @electric-sql/pglite installation.
// Regression test for browser signal/cassette save: save_soma_journal_entry used to
// fail with "Profile not bound" for sessions whose profile was never bound.
// Fix: optional p_uid — when valid, the RPC auto-binds the session and saves.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
(async () => {
    const db = new PGlite();
    try {
        await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
          create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
          grant usage on schema auth to anon, authenticated;`);
        await db.exec(readFileSync(require.resolve('../billing/setup_stars.sql'), 'utf8'));
        const sql = readFileSync(require.resolve('../billing/setup_journal.sql'), 'utf8');
        await db.exec(sql); await db.exec(sql); // idempotent
        await db.exec('grant usage on schema soma_private to authenticated; grant select on soma_private.user_profile_bindings to authenticated');
        const user = async (role, id = '') => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); await db.exec(`set role ${role}`); };
        await user('authenticated', A);
        // 1) save without p_uid on an unbound session -> must still fail "Profile not bound"
        await assert.rejects(
            db.query("select * from public.save_soma_journal_entry('e_nobind1','entry','note',null,1,false,null)"),
            /Profile not bound/i, 'unbound save without p_uid fails as before');
        // 2) save with valid p_uid -> auto-binds the session and saves
        const r = await db.query("select * from public.save_soma_journal_entry('e_auto1','entry','note from auto-bind',null,1,false,null,'u_cafebabe')");
        assert.equal(r.rows.length, 1, 'save with p_uid succeeds');
        // 3) the session is now bound to that profile
        assert.deepEqual(
            (await db.query("select profile_uid from soma_private.user_profile_bindings where auth_id=$1", [A])).rows.map(x => x.profile_uid),
            ['u_cafebabe'], 'session auto-bound to p_uid profile');
        // 4) subsequent save without p_uid now works via the existing binding (backward compat)
        const r2 = await db.query("select * from public.save_soma_journal_entry('e_afterbind','entry','note after bind',null,2,false,null)");
        assert.equal(r2.rows.length, 1, 'save without p_uid works after binding');
        // 5) both entries are visible to the profile through the journal read path
        const titles = (await db.query("select id from public.get_my_soma_journal() order by id")).rows.map(x => x.id);
        assert.deepEqual(titles, ['e_afterbind', 'e_auto1'], 'saved entries are visible via journal read');
        // 6) invalid p_uid is ignored: on an unbound session it falls back to the
        //    binding lookup and still fails; on a bound session it saves via binding
        const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        await user('authenticated', B);
        await assert.rejects(
            db.query("select * from public.save_soma_journal_entry('e_bad1','entry','note',null,1,false,null,'not-a-uid')"),
            /Profile not bound/i, 'invalid p_uid on unbound session falls back to binding lookup');
        await user('authenticated', A);
        const r3 = await db.query("select * from public.save_soma_journal_entry('e_bad2','entry','note',null,3,false,null,'not-a-uid')");
        assert.equal(r3.rows.length, 1, 'invalid p_uid on bound session saves via existing binding');
        // 7) anon role cannot call the RPC
        await user('anon');
        await assert.rejects(
            db.query("select * from public.save_soma_journal_entry('e_anon1','entry','note',null,1,false,null,null)"),
            /permission denied/i, 'anon cannot save journal entries');
        console.log('Journal profile save regression passed');
    } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
