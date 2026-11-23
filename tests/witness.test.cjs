const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const witness = require('../witness.js');
const indexHtml = readFileSync(require.resolve('../index.html'), 'utf8');
const migration = readFileSync(require.resolve('../billing/setup_witness_marks.sql'), 'utf8');
const shareJs = readFileSync(require.resolve('../share.js'), 'utf8');
const cosmeticsJs = readFileSync(require.resolve('../cosmetics.js'), 'utf8');

test('witness IDs and status rows are strictly normalized without exposing identity or counts', () => {
    assert.equal(witness.safePostId('post_1234'), 'post_1234');
    assert.equal(witness.safePostId('bad id'), '');
    assert.equal(witness.safePostId('abc'), '');
    assert.deepEqual(witness.normalizePostIds(['post_1234', 'post_1234', 'bad id', 'post_5678']), ['post_1234', 'post_5678']);

    const statuses = witness.normalizeStatuses([
        { post_id: 'post_1234', is_author: false, can_mark: true, has_witness: true, i_marked: false, reader_id: 'private', count: 987, author_warmth: 987 },
        { post_id: 'post_5678', is_author: true, can_mark: false, has_witness: true, i_marked: false, owner_id: 'private', author_warmth: 12 },
        { post_id: 'post_9012', is_author: false, can_mark: true, has_witness: false, i_marked: false, author_warmth: 0 }
    ], ['post_1234', 'post_5678']);
    assert.deepEqual([...statuses.keys()], ['post_1234', 'post_5678']);
    assert.deepEqual({ ...statuses.get('post_1234') }, {
        isAuthor: false, canMark: true, hasWitness: false, iMarked: false, authorWarmth: null
    }, 'a reader cannot learn another reader mark, author warmth, or a count');
    assert.deepEqual({ ...statuses.get('post_5678') }, {
        isAuthor: true, canMark: false, hasWitness: true, iMarked: false, authorWarmth: 12
    }, 'the author learns only a yes/no presence state and their own warmth total');
    assert.equal(witness.normalizeStatuses({ post_id: 'post_1234' }, ['post_1234']), null);
    assert.equal(witness.normalizeStatuses([{ post_id: 'post_1234', can_mark: true }], ['post_1234']).has('post_1234'), false,
        'incomplete server records fail closed');
    assert.equal(witness.normalizeStatuses([{ post_id: 'post_1234', is_author: false, can_mark: true, has_witness: false, i_marked: true }], ['post_1234']).get('post_1234').canMark, false);
});

test('mark results are idempotent booleans and RPC errors are reduced to safe client codes', () => {
    assert.deepEqual({ ...witness.normalizeMarkResult(true) }, { inserted: true, alreadyMarked: false });
    assert.deepEqual({ ...witness.normalizeMarkResult(false) }, { inserted: false, alreadyMarked: true });
    assert.equal(witness.normalizeMarkResult({ inserted: true }), null);
    assert.equal(witness.classifyError({ message: 'Daily witness mark limit reached' }), 'daily-limit');
    assert.equal(witness.classifyError({ message: 'Cannot mark own post' }), 'own-post');
    assert.equal(witness.classifyError({ code: 'PGRST202', message: 'function not found' }), 'migration');
    assert.equal(witness.classifyError({ message: 'network timeout' }), 'unavailable');
});

test('Supabase client is called only through the authenticated RPC contract', async () => {
    const calls = [];
    const client = {
        async rpc(name, args) {
            calls.push({ name, args });
            if (name === 'my_soma_post_witness_status') {
                return { data: [{ post_id: 'post_1234', is_author: false, can_mark: true, has_witness: false, i_marked: false }], error: null };
            }
            return { data: true, error: null };
        }
    };
    const fetched = await witness.fetchStatuses(client, ['post_1234', 'bad id']);
    assert.equal(fetched.ok, true);
    assert.equal(fetched.statuses.get('post_1234').canMark, true);
    assert.deepEqual(calls[0], { name: 'my_soma_post_witness_status', args: { p_post_ids: ['post_1234'] } });

    const marked = await witness.markPost(client, 'post_1234');
    assert.deepEqual({ ...marked }, { ok: true, inserted: true, alreadyMarked: false });
    assert.deepEqual(calls[1], { name: 'mark_soma_post_witness', args: { p_post_id: 'post_1234' } });

    const invalid = await witness.markPost(client, 'bad id');
    assert.equal(invalid.code, 'invalid-post');
    assert.equal(calls.length, 2, 'invalid IDs never reach Supabase');

    const unavailable = await witness.markPost({ rpc: async () => ({ error: { message: 'Daily witness mark limit reached' } }) }, 'post_1234');
    assert.deepEqual({ ...unavailable }, { ok: false, code: 'daily-limit' });
    const malformed = await witness.fetchStatuses({ rpc: async () => ({ data: null, error: null }) }, ['post_1234']);
    assert.equal(malformed.ok, false);
    assert.equal(malformed.code, 'invalid-response');
});

test('feed presents a real anonymous sign separately from private Whisper and silent reading', () => {
    assert.match(indexHtml, /<script src="witness\.js\?v=2"><\/script>/);
    assert.match(indexHtml, /ОСТАВИТЬ ЗНАК «Я РЯДОМ»/);
    assert.match(indexHtml, /Кто-то оставил тихий знак\./);
    assert.match(indexHtml, /Автор увидит только факт знака/);
    assert.match(indexHtml, /Это не обещание помощи, продолжения общения или ответа/);
    // Истории удалены из вкладки «ПЕЙДЖЕР» — рендер карт с сигналами больше не присутствует.
    assert.doesNotMatch(indexHtml, /ОТВЕТИТЬ ЛИЧНЫМ ШЁПОТОМ/);
    assert.match(indexHtml, /Читать молча или пропустить/);
    assert.doesNotMatch(indexHtml, /function reactToPost|Реакций:|Откликов:|post\.likes\s*\|\||\.update\(\{\s*likes:/);
    assert.doesNotMatch(indexHtml, /onclick="reactToPost\(/);
    assert.match(indexHtml, /rpc\('next_soma_pager_story'\)/);
    assert.match(indexHtml, /rpc\('my_soma_pager_stories'\)/);
    assert.doesNotMatch(indexHtml, /id="stat-seen"|id="stat-reacts"/);
    assert.doesNotMatch(indexHtml, /seen: data\.seen|reacts: data\.reacts|seen: player\.seen|reacts: player\.reacts/);
    assert.doesNotMatch(shareJs, /ВСТРЕЧ С ИСТОРИЯМИ|ОТКЛИКОВ/);
    assert.doesNotMatch(cosmeticsJs, /help_attempts,reacts,seen|reacts: player\.reacts|seen: player\.seen/);

    const markAction = indexHtml.match(/async function markPostWitness\(postId, button\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';
    assert.ok(markAction, 'the feed has a concrete server-backed mark action');
    assert.doesNotMatch(markAction, /player\.xp|addWeeklyXp|addWarmth|updateCloudProfile|likes|seen|reacts/);

    const holdDone = indexHtml.match(/function holdDone\(id\)\s*\{[\s\S]*?\n    \}/)[0];
    assert.doesNotMatch(holdDone, /player\.xp|addWeeklyXp|updateCloudProfile/);
    assert.match(holdDone, /addWarmth\(res\.granted, false\)/);
    assert.match(indexHtml, /function addWarmth\(n, syncCloud = true\)/);
    assert.match(indexHtml, /if \(syncCloud && typeof supabaseClient !== 'undefined' && supabaseClient\)/);
    assert.match(indexHtml, /soma_server_warmth_seen/);
    // Кнопка паузы была частью рендера историй — удалена вместе с историями из вкладки.
    assert.doesNotMatch(indexHtml, /Автор её не увидит/);
});

test('SQL mark storage is private, Auth-only, duplicate-safe, and rewards authors without returning mark counts', () => {
    assert.match(migration, /create table if not exists soma_private\.post_witness_marks/);
    assert.match(migration, /revoke select on table public\.soma_posts from public, anon, authenticated/);
    assert.match(migration, /grant select \(id, author, tag, text, created_at\)/);
    assert.match(migration, /drop policy if exists "soma_posts_update_likes"/);
    assert.match(migration, /revoke select on table public\.soma_users from public, anon, authenticated/);
    assert.match(migration, /revoke select \(seen, reacts\)/);
    assert.match(migration, /primary key \(post_id, reader_id\)/);
    assert.match(migration, /enable row level security/);
    assert.match(migration, /revoke all on soma_private\.post_witness_marks from public, anon, authenticated/);
    assert.match(migration, /grant execute on function public\.mark_soma_post_witness\(text\) to authenticated/);
    assert.match(migration, /on conflict \(post_id, reader_id\) do nothing/);
    const statusSignature = migration.match(/returns table\s*\(([^)]*)\)/i)?.[1] || '';
    assert.match(statusSignature, /is_author boolean[\s\S]*can_mark boolean[\s\S]*has_witness boolean[\s\S]*i_marked boolean[\s\S]*author_warmth integer/i);
    assert.match(migration, /set warmth = warmth \+ 2/);
    assert.match(migration, /create or replace function public\.bind_my_soma_profile/);
    assert.doesNotMatch(statusSignature, /reader_id|owner_id|mark_count|witness_count/i);
});

test('the witness room snapshot shows a concise presence counter instead of atmosphere', () => {
    // The 4th stats block replaced АТМОСФЕРА with the server-side person-days aggregate.
    assert.match(shareJs, /ПРИСУТСТВИЕ/);
    assert.doesNotMatch(shareJs, /k: 'АТМОСФЕРА'/);
    assert.match(shareJs, /supabaseClient\.rpc\('station_days_in_app_total'\)/);
    assert.match(shareJs, /typeof supabaseClient !== 'undefined' && supabaseClient/);
    // The value renders as «N# ДНЕЙ» with a dash fallback when the RPC is unavailable.
    assert.match(shareJs, /\$\{presenceDays\}# ДНЕЙ/);
    // The old atmosphere subtitle above the callsign is gone from the witness card.
    assert.doesNotMatch(shareJs, /АТМОСФЕРА: \$\{snap\.phaseName/);
});

test('the person-days RPC is a public aggregate over registration dates only', () => {
    const presence = readFileSync(require.resolve('../billing/setup_station_presence.sql'), 'utf8');
    assert.match(presence, /create or replace function public\.station_days_in_app_total\(\)/);
    assert.match(presence, /returns integer/);
    assert.match(presence, /security definer/);
    assert.match(presence, /sum\(extract\(day from now\(\) - u\.created_at\)\)/);
    assert.match(presence, /from public\.soma_users u/);
    assert.match(presence, /grant execute on function public\.station_days_in_app_total\(\) to anon, authenticated/);
    // A global aggregate: no per-user column, no identity, no per-user exposure.
    assert.doesNotMatch(presence, /station_days_in_app_total[\s\S]{0,400}username/);
});
