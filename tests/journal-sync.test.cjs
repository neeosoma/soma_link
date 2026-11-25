// Regression tests for cross-device vinyl/cassette sync via the cloud journal.
// Mocks supabaseClient to simulate the cloud; verifies that saves push to the
// cloud, hydration merges cloud state, deletions on another device propagate,
// and offline (not-yet-synced) cassettes are kept.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

const roomCode = readFileSync(require.resolve('../room.js'), 'utf8');

function makeStorage(initial = {}) {
    const map = new Map(Object.entries(initial).map(([k, v]) => [k, String(v)]));
    return {
        getItem: k => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => { map.set(k, String(v)); },
        removeItem: k => { map.delete(k); },
        dump: () => Object.fromEntries(map)
    };
}

function loadRoom(env = {}) {
    const localStorage = env.localStorage || makeStorage();
    return runInNewContext(
        roomCode + ';({ ...pagerApi, loadCassettes, saveWhisperCassette, toggleCassetteFav, deleteCassette, hydrateJournalFromCloud, loadDiaryArchive })',
        { player: { uid: 'u_0123456789abcdef', name: 'AGENT_1001', warmth: 0 }, roomPreview: false, localStorage, ...env }
    );
}

// Cloud simulator: a Map of journal rows keyed by id.
function makeCloud() {
    const rows = new Map();
    const supabaseClient = {
        rpc: async (name, args) => {
            if (name === 'save_soma_journal_entry') {
                const row = {
                    id: args.p_id, kind: args.p_kind, text: args.p_text,
                    date_label: args.p_date, num: args.p_num, fav: args.p_fav,
                    created_at: new Date().toISOString(), author_auth_id: 'auth-uid'
                };
                rows.set(args.p_id, row);
                return { data: [row], error: null };
            }
            if (name === 'get_my_soma_journal') {
                return { data: [...rows.values()], error: null };
            }
            if (name === 'set_soma_journal_fav') {
                const r = rows.get(args.p_id);
                if (r) r.fav = args.p_fav;
                return { data: null, error: null };
            }
            if (name === 'delete_soma_journal_entry') {
                rows.delete(args.p_id);
                return { data: null, error: null };
            }
            return { data: null, error: null };
        }
    };
    return { rows, supabaseClient };
}

const settle = () => new Promise(r => setTimeout(r, 10));

test('cassette save pushes to cloud and marks local as synced', async () => {
    const { rows, supabaseClient } = makeCloud();
    const ls = makeStorage();
    const room = loadRoom({ localStorage: ls, supabaseClient });
    const { saveWhisperCassette, loadCassettes } = room;

    const cas = saveWhisperCassette('Сохранённый шёпот для синхронизации между устройствами.');
    assert.ok(cas && cas.id, 'cassette created');
    await settle();
    assert.ok(rows.has(cas.id), 'cassette pushed to cloud');
    const local = loadCassettes();
    assert.equal(local.find(c => c.id === cas.id).synced, true, 'local cassette marked synced');
});

test('hydration removes cassettes deleted on another device, keeps cloud cassettes', async () => {
    const { rows, supabaseClient } = makeCloud();
    const ls = makeStorage();
    const room = loadRoom({ localStorage: ls, supabaseClient });
    const { saveWhisperCassette, loadCassettes, hydrateJournalFromCloud } = room;

    const keep = saveWhisperCassette('Кассета, которая должна остаться.');
    const drop = saveWhisperCassette('Кассета, удалённая на другом устройстве.');
    await settle();
    assert.ok(rows.has(keep.id) && rows.has(drop.id), 'both pushed to cloud');

    // Simulate deletion on another device: removed from cloud, local still synced.
    rows.delete(drop.id);

    await hydrateJournalFromCloud();
    const local = loadCassettes();
    assert.ok(local.some(c => c.id === keep.id), 'synced cassette still in cloud is kept');
    assert.ok(!local.some(c => c.id === drop.id), 'deleted-in-cloud cassette removed from local');
});

test('offline unsynced cassette is kept after hydration', async () => {
    const { rows, supabaseClient } = makeCloud();
    const ls = makeStorage();
    // Pre-seed a local cassette that was never pushed (synced=false).
    const offline = {
        id: 'cas_offline_1', num: 99, date: '25.11.2026', ts: Date.now(),
        text: 'Offline-сохранение, ещё не пушено в облако.', fav: false, synced: false
    };
    ls.setItem('soma_cassettes', JSON.stringify([offline]));
    const room = loadRoom({ localStorage: ls, supabaseClient });
    const { hydrateJournalFromCloud, loadCassettes } = room;

    await hydrateJournalFromCloud();
    const local = loadCassettes();
    assert.ok(local.some(c => c.id === 'cas_offline_1'), 'offline unsynced cassette kept');
});

test('deleteCassette removes from local cache and cloud', async () => {
    const { rows, supabaseClient } = makeCloud();
    const ls = makeStorage();
    const room = loadRoom({ localStorage: ls, supabaseClient });
    const { saveWhisperCassette, deleteCassette, loadCassettes } = room;

    const cas = saveWhisperCassette('Кассета для удаления.');
    await settle();
    assert.ok(rows.has(cas.id), 'pushed to cloud');

    deleteCassette(cas.id);
    await settle();
    assert.ok(!rows.has(cas.id), 'removed from cloud');
    const local = loadCassettes();
    assert.ok(!local.some(c => c.id === cas.id), 'removed from local cache');
});

test('fav toggle propagates to cloud', async () => {
    const { rows, supabaseClient } = makeCloud();
    const ls = makeStorage();
    const room = loadRoom({ localStorage: ls, supabaseClient });
    const { saveWhisperCassette, toggleCassetteFav } = room;

    const cas = saveWhisperCassette('Кассета для переключения избранного.');
    await settle();
    assert.equal(rows.get(cas.id).fav, false, 'cloud fav starts false');

    const fav = toggleCassetteFav(cas.id);
    await settle();
    assert.equal(fav, true, 'local fav toggled');
    assert.equal(rows.get(cas.id).fav, true, 'cloud fav updated');
});
