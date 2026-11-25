// Run with NODE_PATH pointing to a temporary @electric-sql/pglite installation.
// This checks real PostgreSQL SQL/roles/RLS, not Supabase Auth transport or concurrency.
// Механика ответов на входящие шёпоты: 1 ответ на шёпот, без дневного лимита.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
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

        const asUser = async id => {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
            await db.exec('set role authenticated');
        };
        const post = async id => db.query("insert into public.soma_posts(id,text) values ($1,'История для проверки ответа.')", [id]);
        const send = async (id, postId, uid, as) => db.query(
            "insert into public.soma_whispers(id,post_id,sender_uid,text) values($1,$2,$3,'Пусть сегодня станет немного легче.')",
            [id, postId, uid]);
        const scalar = async (query, args) => Object.values((await db.query(query, args)).rows[0])[0];
        const whisperStatus = id => scalar("select status from public.soma_whispers where id=$1", [id]);

        // A — владелец постов; B, C — отправляющие шёпоты (один шёпот на пост на пользователя).
        await asUser(A); await post('post_a1'); await post('post_a2'); await post('post_a3');
        await asUser(B); await post('post_b1'); await post('post_b2'); await post('post_b3');

        // 1) B шепчет на пост A — A получает входящий шёпот.
        await asUser(B); await send('whisper_w1', 'post_a1', 'u_bbbb');
        await asUser(A);
        assert.equal(await whisperStatus('whisper_w1'), 'pending');

        // 2) A отвечает на шёпот — RPC с p_reply_to. Ответ: 1 на шёпот, без дневного лимита.
        const replyRows = (await db.query(
            "select * from public.send_soma_whisper('w_reply1','post_a1','ЛИЧНАЯ БОЛЬ','Пусть сегодня станет немного легче.','u_aaaa','Тёплый ответ на ваше сообщение.','whisper_w1')")).rows;
        assert.equal(replyRows.length, 1);
        assert.equal(replyRows[0].reply_to_id, 'whisper_w1');
        assert.equal(replyRows[0].status, 'pending');

        // Оригинальный шёпот переведён в статус answered.
        assert.equal(await whisperStatus('whisper_w1'), 'answered');

        // 3) Отправитель видит ответ через get_my_whisper_replies.
        await asUser(B);
        const replies = (await db.query('select * from public.get_my_whisper_replies()')).rows;
        assert.equal(replies.length, 1);
        assert.equal(replies[0].id, 'w_reply1');
        assert.equal(replies[0].reply_to_id, 'whisper_w1');
        // Preview ответа — текст исходного сообщения отправителя.
        assert.equal(replies[0].post_preview, 'Пусть сегодня станет немного легче.');

        // 4) Получатель ответа не видит свой ответ в входящих (пост его own, sender = он).
        await asUser(A);
        const aInbox = (await db.query("select * from public.get_my_pending_whispers(ARRAY['post_a1','post_a2','post_a3'])")).rows;
        assert.equal(aInbox.length, 0, 'recipient inbox must not contain own reply');
        assert.equal(await scalar("select count(*) from public.get_my_whisper_replies()"), 0);

        // 5) Второй ответ на тот же шёпот — только один ответ.
        await asUser(A);
        await assert.rejects(db.query(
            "select * from public.send_soma_whisper('w_reply2','post_a1','ЛИЧНАЯ БОЛЬ','Пусть сегодня станет немного легче.','u_aaaa','Ещё один тёплый ответ на ваше сообщение.','whisper_w1')"),
            /Reply already sent/);

        // 6) Ответ на сохранённый (saved) шёпот — разрешён по дизайну: guard
        //    разрешает ответы на saved, приложение сохраняет шёпот на кассету
        //    и оставляет возможность ответить.
        await asUser(B); await send('whisper_w2', 'post_a2', 'u_bbbb');
        await asUser(A);
        assert.equal(await scalar("select status from public.set_soma_whisper_status('whisper_w2','saved')"), 'saved');
        const replySaved = (await db.query(
            "select * from public.send_soma_whisper('w_reply3','post_a2','ЛИЧНАЯ БОЛЬ','Пусть сегодня станет немного легче.','u_aaaa','Тёплый ответ на ваше сообщение.','whisper_w2')")).rows;
        assert.equal(replySaved.length, 1);
        assert.equal(replySaved[0].reply_to_id, 'whisper_w2');
        assert.equal(await whisperStatus('whisper_w2'), 'answered');

        // 7) Обычный шёпот без p_reply_to (null) — сигнатура 7 аргументов.
        await asUser(A);
        const norm = (await db.query(
            "select * from public.send_soma_whisper('w_norm1','post_b1','ЛИЧНАЯ БОЛЬ','Просто проверка','u_aaaa','Обычный шёпот без ответа на кого-либо.', null)")).rows;
        assert.equal(norm.length, 1);
        assert.equal(norm[0].reply_to_id, '');
        // Повторная отправка на тот же пост — уникальный индекс запрещает (23505).
        await assert.rejects(db.query(
            "select * from public.send_soma_whisper('w_norm2','post_b1','ЛИЧНАЯ БОЛЬ','Просто проверка','u_aaaa','Обновлённое тёплое слово этому человеку.', null)"),
            /duplicate key/i);

        // 8) Дневного лимита на шёпоты нет: обычные шёпоты приходят в неограниченном количестве.
        await asUser(A);
        await db.query("select * from public.send_soma_whisper('w_n1','post_b2','ЛИЧНАЯ БОЛЬ','Просто проверка','u_aaaa','Первое тёплое слово этому человеку.', null)");
        await db.query("select * from public.send_soma_whisper('w_n2','post_b3','ЛИЧНАЯ БОЛЬ','Просто проверка','u_aaaa','Второе тёплое слово этому человеку.', null)");
        await asUser(B); await post('post_b4');
        await asUser(A);
        const n3 = (await db.query("select * from public.send_soma_whisper('w_n3','post_b4','ЛИЧНАЯ БОЛЬ','Просто проверка','u_aaaa','Третье тёплое слово этому человеку.', null)")).rows;
        assert.equal(n3.length, 1, 'a third regular whisper in the same day passes — no daily cap');

        // 9) Ответ на входящий шёпот: 1 ответ на шёпот, независимо от числа отправленных шёпотов.
        await asUser(B); await send('whisper_w3', 'post_a3', 'u_bbbb');
        await asUser(A);
        const reply2 = (await db.query(
            "select * from public.send_soma_whisper('w_reply4','post_a3','ЛИЧНАЯ БОЛЬ','Пусть сегодня станет немного легче.','u_aaaa','Ответ без дневного лимита на ваше сообщение.','whisper_w3')")).rows;
        assert.equal(reply2.length, 1);
        assert.equal(reply2[0].reply_to_id, 'whisper_w3');
        assert.equal(await whisperStatus('whisper_w3'), 'answered');

        // 10) Ответ проходит тот же фильтр токсичного текста.
        await asUser(C); await send('whisper_w4', 'post_a1', 'u_cccc');
        await asUser(A);
        await assert.rejects(db.query(
            "select * from public.send_soma_whisper('w_reply5','post_a1','ЛИЧНАЯ БОЛЬ','Пусть сегодня станет немного легче.','u_aaaa','Пиши, сука, не молчи.','whisper_w4')"),
            /запрещённую лексику/i);

        // 11) Ответ не виден в get_my_pending_whispers отправителя (не на его пост).
        await asUser(B);
        const bInbox = (await db.query("select * from public.get_my_pending_whispers(ARRAY['post_b1','post_b2','post_b3','post_b4'])")).rows;
        // B видит четыре обычных шёпота от A на своих постах (w_norm1/w_n1/w_n2/w_n3);
        // ответы w_reply1/w_reply4 находятся на постах A — не входят в список B.
        assert.equal(bInbox.length, 4, 'sender must see all whispers on own posts');
        assert.ok(!bInbox.some(r => r.id === 'w_reply1' || r.id === 'w_reply4'), 'replies must not appear in sender inbox by post id');

        // 12) Guard: сохранённый шёпот (saved) необратим — от него зависит отклик
        //     отправителю (тепло + сообщение во входящие). saved → dismissed/pending
        //     должно падать; saved → saved (no-op) и saved → answered — работать.
        //     (whisper_w2 уже ответён на шаге 6 — проверяем на whisper_w4.)
        await asUser(A);
        assert.equal(await scalar("select status from public.set_soma_whisper_status('whisper_w4','saved')"), 'saved',
            'whisper_w4 is saved before guard checks');
        await assert.rejects(db.query(
            "select * from public.set_soma_whisper_status('whisper_w4','dismissed')"),
            /Invalid whisper transition/);
        assert.equal(await whisperStatus('whisper_w4'), 'saved',
            'saved → dismissed rejected, status stays saved (ack/warmth intact)');
        await assert.rejects(db.query(
            "select * from public.set_soma_whisper_status('whisper_w4','pending')"),
            /Invalid whisper transition/);
        assert.equal(await scalar("select status from public.set_soma_whisper_status('whisper_w4','saved')"), 'saved',
            'saved → saved no-op still allowed');
        assert.equal(await scalar("select status from public.set_soma_whisper_status('whisper_w4','answered')"), 'answered',
            'saved → answered still allowed');

        console.log('Whisper reply integration passed: 1 answer per whisper, free of daily cap, answered status, reply delivery to sender.');
    } catch (e) {
        console.error('Whisper reply integration FAILED:', e.message);
        process.exit(1);
    } finally {
        await db.close();
    }
})();
