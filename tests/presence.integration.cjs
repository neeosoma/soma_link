// Run with NODE_PATH pointing to a temporary @electric-sql/pglite installation.
// Checks PostgreSQL permissions, idempotent marks, reader privacy, and the boolean-only atmosphere RPC.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const D = '44444444-4444-4444-8444-444444444444';

(async () => {
    const db = new PGlite();
    try {
        await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
            create function auth.uid() returns uuid language sql stable as $$
            select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
            grant usage on schema auth to authenticated, anon;`);
        await db.exec(readFileSync(require.resolve('../billing/setup_stars.sql'), 'utf8'));
        const witnessMigration = readFileSync(require.resolve('../billing/setup_witness_marks.sql'), 'utf8');
        const atmosphereMigration = readFileSync(require.resolve('../billing/setup_station_presence.sql'), 'utf8');
        await db.exec(witnessMigration);
        await db.exec(witnessMigration); // Additive SQL Editor migration must be repeatable.
        await db.exec(atmosphereMigration);
        await db.exec(atmosphereMigration);
        await db.exec('grant insert on public.soma_posts to authenticated, anon');

        const asRole = async (role, id = '') => {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
            await db.exec(`set role ${role}`);
        };
        const asUser = id => asRole('authenticated', id);
        const post = async id => db.query(
            "insert into public.soma_posts(id,text) values ($1,'История для проверки тихого присутствия.')", [id]);
        const scalar = async (query, args = []) => Object.values((await db.query(query, args)).rows[0])[0];
        const status = async ids => (await db.query(
            'select * from public.my_soma_post_witness_status($1::text[])', [ids])).rows;
        const atmosphere = async () => (await db.query(
            'select * from public.station_presence_atmosphere_status()')).rows[0];
        const mark = async id => scalar('select public.mark_soma_post_witness($1)', [id]);

        await asUser(A);
        assert.doesNotReject(db.query('select id,author,tag,text,created_at from public.soma_posts'));
        assert.doesNotReject(db.query('select username,xp,warmth,help_attempts,whispers_sent,weekly_xp,weekly_key,cosmetics,owned_cosmetics from public.soma_users'));
        await db.query("insert into public.soma_users(username,xp,help_attempts) values('u_abcd',0,0)");
        await db.query("update public.soma_users set warmth = 0 where username = 'u_abcd'");
        assert.equal(await scalar('select public.bind_my_soma_profile($1)', ['u_abcd']), true,
            'the authenticated app binds its private player profile for warmth delivery');
        await assert.rejects(db.query("insert into public.soma_users(username,reacts) values('u_efaa',1)"), /permission denied/i,
            'clients cannot recreate removed engagement counters');
        await assert.rejects(db.query("update public.soma_users set reacts = 1 where username = 'u_abcd'"), /permission denied/i,
            'clients cannot mutate removed engagement counters');
        await assert.rejects(db.query('select likes from public.soma_posts'), /permission denied/i,
            'legacy post reaction totals are not exposed to clients');
        await assert.rejects(db.query('update public.soma_posts set likes = 1'), /permission denied/i,
            'the old public likes mutation is disabled');
        await assert.rejects(db.query('select seen,reacts from public.soma_users'), /permission denied/i,
            'legacy engagement counters are not exposed to clients');
        await assert.rejects(db.query('select * from public.soma_users'), /permission denied/i,
            'wildcard profile reads cannot recover hidden counters');

        const targetIds = Array.from({ length: 31 }, (_, i) => `witness_post_${String(i).padStart(2, '0')}`);
        const ownId = 'witness_post_b';
        const unverifiedId = 'witness_post_anon';
        await asUser(A);
        for (const id of targetIds) await post(id);

        await asUser(B);
        await post(ownId);
        let rows = await status([targetIds[0], ownId, 'missing_post']);
        assert.deepEqual(rows.map(r => r.post_id), [targetIds[0], ownId]);
        assert.deepEqual(Object.keys(rows[0]).sort(), ['author_warmth', 'can_mark', 'has_witness', 'i_marked', 'is_author', 'post_id']);
        assert.deepEqual(rows[0], {
            post_id: targetIds[0], is_author: false, can_mark: true, has_witness: false, i_marked: false, author_warmth: null
        });
        assert.equal(rows[1].is_author, true, 'owner identity is resolved from private Auth ownership');
        assert.equal(rows[1].can_mark, false);
        assert.equal(await atmosphere().then(row => row.is_lit), false);
        await assert.rejects(mark(ownId), /Cannot mark own post/);

        assert.equal(await mark(targetIds[0]), true, 'first mark is persisted');
        assert.equal(await mark(targetIds[0]), false, 'repeated mark is idempotent');
        assert.equal(await scalar("select warmth from public.soma_users where username = 'u_abcd'"), 2,
            'one new Я рядом mark awards exactly +2 warmth to the author, but a duplicate adds nothing');
        rows = await status([targetIds[0]]);
        assert.equal(rows[0].can_mark, false);
        assert.equal(rows[0].i_marked, true);
        assert.equal(rows[0].has_witness, false, 'reader cannot see whether other readers marked the story');
        assert.equal(rows[0].author_warmth, null, 'reader cannot see the author’s private warmth total');

        await asUser(C);
        rows = await status([targetIds[0]]);
        assert.equal(rows[0].can_mark, true, 'a different reader can leave their own mark');
        assert.equal(rows[0].i_marked, false);
        assert.equal(rows[0].has_witness, false, 'non-authors never learn that another reader left a mark');
        assert.equal(await mark(targetIds[0]), true, 'a second reader may independently mark the same story');
        assert.equal(await scalar("select warmth from public.soma_users where username = 'u_abcd'"), 4,
            'each distinct reader mark adds +2 warmth to the author');
        assert.equal((await status([targetIds[0]]))[0].author_warmth, null);

        await asUser(B);
        for (let i = 1; i < 5; i++) assert.equal(await mark(targetIds[i]), true);
        assert.equal(await scalar("select warmth from public.soma_users where username = 'u_abcd'"), 12,
            'six distinct reader marks yield six +2 awards, without exposing a count');
        assert.deepEqual(await atmosphere(), { is_lit: true }, 'a privacy floor turns on atmosphere without returning a count or target');

        await asUser(A);
        rows = await status(targetIds.slice(0, 5));
        assert.ok(rows.every(r => r.is_author && r.has_witness && !r.can_mark && !r.i_marked && r.author_warmth === 12),
            'authors see only a boolean quiet-sign state and their own warmth, never a mark count');
        await assert.rejects(mark(targetIds[0]), /Cannot mark own post/);
        await assert.rejects(db.query('select * from soma_private.post_witness_marks'), /permission denied/);
        await assert.rejects(db.query('insert into soma_private.post_witness_marks(post_id,reader_id) values($1,$2)', [targetIds[5], A]), /permission denied/);
        await assert.rejects(db.query('select * from public.my_soma_post_witness_status($1::text[])', [new Array(51).fill(targetIds[0])]), /Too many post IDs/);

        await asRole('anon');
        await post(unverifiedId); // Legacy/anonymous story has no Auth-backed owner.
        await assert.rejects(db.query('select public.mark_soma_post_witness($1)', [targetIds[0]]), /permission denied/);
        await assert.rejects(db.query('select * from public.my_soma_post_witness_status($1::text[])', [[targetIds[0]]]), /permission denied/);
        await assert.rejects(db.query('select * from public.station_presence_atmosphere_status()'), /permission denied/);

        await asUser(D);
        rows = await status([unverifiedId]);
        assert.equal(rows[0].is_author, false);
        assert.equal(rows[0].can_mark, false, 'unverified legacy posts do not expose a broken sign action');

        await db.query("insert into public.soma_users(username,xp,help_attempts) values('u_d000',0,0)");
        await post('witness_post_unbound');
        await asUser(C);
        assert.equal(await mark('witness_post_unbound'), true, 'a mark to an offline/unbound author is still saved');
        await asUser(D);
        assert.equal(await scalar('select public.bind_my_soma_profile($1)', ['u_d000']), true);
        assert.equal(await scalar("select warmth from public.soma_users where username = 'u_d000'"), 2,
            'pending warmth is delivered exactly once when the author returns and binds their profile');

        await asUser(B);
        for (let i = 5; i < 30; i++) assert.equal(await mark(targetIds[i]), true);
        await assert.rejects(mark(targetIds[30]), /Daily witness mark limit reached/);

        // Person-days aggregate: global sum of full days since each user's created_at.
        const daysTotal = async () => (await db.query('select * from public.station_days_in_app_total()')).rows[0].station_days_in_app_total;
        await asUser(A);
        assert.equal(await daysTotal(), 0, 'no users means zero person-days');
        await db.exec('reset role');
        await db.query("insert into public.soma_users(username,xp,help_attempts,created_at) values('u_dea1',0,0, now() - interval '3 days')");
        await db.query("insert into public.soma_users(username,xp,help_attempts,created_at) values('u_beef',0,0, now() - interval '5 days')");
        await asUser(A);
        assert.equal(await daysTotal(), 8, 'three-day and five-day users sum to eight person-days');
        await asRole('anon');
        assert.equal(await daysTotal(), 8, 'the public aggregate is callable without authentication');
        await assert.rejects(db.query("insert into public.soma_users(username,xp,help_attempts,created_at) values('u_days3',0,0, now())"), /permission denied/i,
            'clients still cannot insert rows with a custom created_at');

        console.log('Presence integration passed: repeatable migrations, restricted legacy counter ACLs, Auth-only RPCs, private RLS tables, +2 author warmth with duplicate safety and offline delivery, author-only status, reader isolation, unverified-post handling, no public counts/story targets, daily abuse cap, and the public person-days aggregate.');
    } finally { await db.close(); }
})().catch(error => { console.error(error); process.exit(1); });
