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
          create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
          grant usage on schema auth to anon, authenticated;`);
        await db.exec(readFileSync(require.resolve('../billing/setup_stars.sql'), 'utf8'));
        await db.exec(readFileSync(require.resolve('../billing/setup_witness_marks.sql'), 'utf8'));
        const sql = readFileSync(require.resolve('../billing/setup_pager.sql'), 'utf8');
        await db.exec(sql); await db.exec(sql);
        await db.exec('grant insert on public.soma_posts to authenticated');
        const user = async (role, id = '') => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); await db.exec(`set role ${role}`); };
        const next = async () => (await db.query('select * from public.next_soma_pager_story()')).rows;
        const decide = async id => (await db.query('select public.decide_soma_pager_story($1) as ok', [id])).rows[0].ok;
        await user('authenticated', A);
        await db.exec("insert into public.soma_posts(id,text,created_at) values ('post_a1','Проверка первого сигнала.', now() - interval '2 hours'),('post_a2','Проверка второго сигнала.', now() - interval '1 hour')");
        assert.equal((await next()).length, 0, 'own posts are not suggested');
        assert.deepEqual((await db.query('select id from public.my_soma_pager_stories() order by id')).rows.map(r => r.id), ['post_a1', 'post_a2']);
        await user('authenticated', B);
        await db.exec("insert into public.soma_posts(id,text) values ('post_b1','Собственная история читателя.')");
        let first = await next();
        assert.equal(first.length, 1);
        assert.notEqual(first[0].id, 'post_b1');
        // Хронологический порядок: самый старый непрочитанный пост предлагается первым
        assert.equal(first[0].id, 'post_a1', 'oldest undecided post is offered first');
        assert.deepEqual(await next(), first, 'current story persists until a decision');
        await assert.rejects(decide('post_b1'), /not current/i);
        await assert.rejects(db.query('select * from soma_private.pager_decisions'), /permission denied/i);
        assert.equal(await decide(first[0].id), true);
        assert.equal(await decide(first[0].id), false, 'retry is idempotent');
        const second = await next();
        assert.equal(second.length, 1);
        assert.notEqual(second[0].id, first[0].id);
        await decide(second[0].id);
        assert.equal((await next()).length, 0);
        await user('authenticated', A);
        assert.equal((await next())[0].id, 'post_b1', 'decisions are per-reader');
        await user('anon');
        await assert.rejects(next(), /permission denied/i);
        console.log('Pager integration passed');
    } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
