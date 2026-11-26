// Anti-profanity / toxic-text filter: server-side soma_text_blocked + all write RPCs.
// Run with NODE_PATH pointing to a temporary @electric-sql/pglite installation.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const A = '11111111-1111-4111-8111-111111111111';
(async () => {
    const db = new PGlite();
    try {
        await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
            create function auth.uid() returns uuid language sql stable as $$
            select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
            grant usage on schema auth to authenticated, anon;`);
        await db.exec(readFileSync(require.resolve('../billing/setup_stars.sql'), 'utf8'));
        await db.exec(readFileSync(require.resolve('../billing/setup_signal_pipeline.sql'), 'utf8'));
        await db.exec(readFileSync(require.resolve('../billing/setup_journal.sql'), 'utf8'));
        await db.exec('grant insert on public.soma_posts to authenticated');
        await db.exec('grant insert on public.soma_whispers to authenticated');
        await db.exec('grant insert on public.soma_journal to authenticated');
        // Журнал привязан к профилю (author_profile_uid). Подготавливаем привязку
        // для пользователя A, чтобы save_soma_journal_entry работал как в проде.
        await db.exec('insert into soma_private.user_profile_bindings (auth_id, profile_uid) values (\'' + A + '\', \'u_aaaaaaaaaaaaaaaa\')');
        const scalar = async q => { const r = (await db.query(q)).rows[0]; return r ? r[Object.keys(r)[0]] : undefined; };
        const asUser = async id => {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
            await db.exec('set role authenticated');
        };
        await asUser(A);

        // 1) soma_text_blocked: normalization defeats obfuscation.
        assert.equal(await scalar("select public.soma_text_blocked('Ты ублюдок, иди на хуй!')"), true);
        assert.equal(await scalar("select public.soma_text_blocked('х——у…..—-й')"), true);
        assert.equal(await scalar("select public.soma_text_blocked('ХУЙ')"), true);
        assert.equal(await scalar("select public.soma_text_blocked('просто хороший день')"), false);
        assert.equal(await scalar("select public.soma_text_blocked(null)"), false);

        // 1b) короткие термины блокируются только как самостоятельные слова
        assert.equal(await scalar("select public.soma_text_blocked('дурачишься')"), false);
        assert.equal(await scalar("select public.soma_text_blocked('расслаблять тело')"), false);
        assert.equal(await scalar("select public.soma_text_blocked('геймер играет')"), false);
        assert.equal(await scalar("select public.soma_text_blocked('д-ура')"), true);
        assert.equal(await scalar("select public.soma_text_blocked('блять, давай')"), true);
        assert.equal(await scalar("select public.soma_text_blocked('дура!')"), true);
        assert.equal(await scalar("select public.soma_text_blocked('гей')"), true);

        // 2) submit_soma_post rejects blocked text.
        await assert.rejects(
            db.query("select * from public.submit_soma_post('p_f1','Аноним','ТЕМА','Ты хуй ке го, давай поговорим.', '{}'::jsonb)"),
            /запрещённую лексику/i
        );
        await assert.rejects(
            db.query("select * from public.submit_soma_post('p_f2','Аноним','ТЕМА','Пиши, не юли, хуйня ето.', '{}'::jsonb)"),
            /запрещённую лексику/i
        );
        // clean signal still works.
        const clean = await db.query("select * from public.submit_soma_post('p_f_ok','Аноним','ТЕМА','Просто хороший день в эфире.', '{\"seal\":\"seal_eye\"}'::jsonb)");
        assert.equal(clean.rows.length, 1);
        assert.deepEqual(clean.rows[0].cosmetics, { seal: 'seal_eye' }, 'cosmetics stored on the signal');

        // 3) send_soma_whisper rejects blocked text.
        await asUser(A);
        await db.exec("insert into public.soma_posts(id,text) values ('post_f1','История для проверки фильтра.')");
        // Владелец поста — другой пользователь, чтобы шёпот допустим.
        const B = '22222222-2222-4222-8222-222222222222';
        await asUser(B);
        await db.exec("insert into public.soma_posts(id,text) values ('post_f2','История другого владельца.')");
        await asUser(A);
        await assert.rejects(
            db.query("select * from public.send_soma_whisper('w_f1','post_f2','ЛИЧНАЯ БОЛЬ','Просто проверка','u_aaa1','Пиши, сука, не молчи.', null)"),
            /запрещённую лексику/i
        );
        const cleanWhisper = await db.query("select * from public.send_soma_whisper('w_f_ok','post_f2','ЛИЧНАЯ БОЛЬ','Просто проверка','u_aaa2','Пусть сегодня станет легче.', null)");
        assert.equal(cleanWhisper.rows.length, 1);

        // 4) save_soma_journal_entry rejects blocked text.
        await assert.rejects(
            db.query("select * from public.save_soma_journal_entry('e_f1','entry','Тут дурень пишет мат','2026-11-21',0,false,null)"),
            /запрещённую лексику/i
        );
        const cleanJournal = await db.query("select * from public.save_soma_journal_entry('e_f_ok','entry','Просто запись в дневник','2026-11-21',0,false,'тема')");
        assert.equal(cleanJournal.rows.length, 1);

        console.log('Anti-profanity filter integration passed: soma_text_blocked normalization + submit_soma_post/send_soma_whisper/save_soma_journal_entry rejection.');
    } finally { await db.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
