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
        roomCode + ';({ ...pagerApi, loadCassettes, saveWhisperCassette, syncJournalEntriesToCloud, saveJournalEntry, loadLocalJournalEntries, toggleCassetteFav, deleteCassette, hydrateJournalFromCloud, loadDiaryArchive })',
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

    const cas = await saveWhisperCassette('Сохранённый шёпот для синхронизации между устройствами.');
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

    const keep = await saveWhisperCassette('Кассета, которая должна остаться.');
    const drop = await saveWhisperCassette('Кассета, удалённая на другом устройстве.');
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

    const cas = await saveWhisperCassette('Кассета для удаления.');
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

    const cas = await saveWhisperCassette('Кассета для переключения избранного.');
    await settle();
    assert.equal(rows.get(cas.id).fav, false, 'cloud fav starts false');

    const fav = toggleCassetteFav(cas.id);
    await settle();
    assert.equal(fav, true, 'local fav toggled');
    assert.equal(rows.get(cas.id).fav, true, 'cloud fav updated');
});

test('cassette number accounts for the cloud — no duplicate numbers across devices', async () => {
    // Cloud already holds a cassette with num 8 and an entry with num 16,
    // but the local cache is empty (as on a fresh device before hydration).
    // The new cassette must NOT take 8 (duplicate) — it takes max(cloud) + 1.
    const { rows, supabaseClient } = makeCloud();
    rows.set('cas_remote', {
        id: 'cas_remote', kind: 'cassette', text: 'remote', date_label: '25.11.2026',
        num: 8, fav: false, created_at: new Date().toISOString(), author_auth_id: 'auth-uid'
    });
    rows.set('e_remote', {
        id: 'e_remote', kind: 'entry', text: 'remote signal', date_label: '25.11.2026',
        num: 16, fav: false, created_at: new Date().toISOString(), author_auth_id: 'auth-uid'
    });
    const ls = makeStorage();
    const room = loadRoom({ localStorage: ls, supabaseClient });
    const { saveWhisperCassette } = room;

    const cas = await saveWhisperCassette('Кассета, сохранённая с учётом облака.');
    assert.equal(cas.num, 17, 'new cassette number is max(cloud)+1, not a duplicate');
    await settle();
    assert.equal(rows.get(cas.id).num, 17, 'cloud row carries the unique number');
});

test('re-save of an existing cassette id keeps the cloud number', async () => {
    const { rows, supabaseClient } = makeCloud();
    rows.set('cas_known', {
        id: 'cas_known', kind: 'cassette', text: 'existing', date_label: '25.11.2026',
        num: 7, fav: false, created_at: new Date().toISOString(), author_auth_id: 'auth-uid'
    });
    const ls = makeStorage();
    const room = loadRoom({ localStorage: ls, supabaseClient });
    const { saveWhisperCassette } = room;

    // Re-save by the same id (e.g. re-accepting a whisper): keep cloud num 7,
    // not renumber to max+1.
    const cas = await saveWhisperCassette('Пересохранённая кассета.', undefined, { id: 'cas_known' });
    assert.equal(cas.num, 7, 'existing cloud id keeps its number');
});

test('syncJournalEntriesToCloud assigns cloud-unique numbers to offline entries', async () => {
    const { rows, supabaseClient } = makeCloud();
    // Cloud holds rows up to num 20.
    rows.set('e_cloud', {
        id: 'e_cloud', kind: 'entry', text: 'cloud entry', date_label: '25.11.2026',
        num: 20, fav: false, created_at: new Date().toISOString(), author_auth_id: 'auth-uid'
    });
    const ls = makeStorage();
    // Offline entry saved with a stale local number (5) that would collide in cloud.
    ls.setItem('soma_journal_entries', JSON.stringify([{
        id: 'e_offline', num: 5, date: '25.11.2026', ts: Date.now(),
        text: 'Offline запись-сигнал.', fav: false
    }]));
    const room = loadRoom({ localStorage: ls, supabaseClient });
    const { syncJournalEntriesToCloud, loadLocalJournalEntries } = room;

    await syncJournalEntriesToCloud();
    await settle();
    const row = rows.get('e_offline');
    assert.ok(row, 'offline entry pushed to cloud');
    assert.equal(row.num, 21, 'offline entry gets max(cloud)+1, not stale local num 5');
    assert.equal(loadLocalJournalEntries().find(e => e.id === 'e_offline').num, 21,
        'local cache number fixed to match cloud');
});

test('syncJournalEntriesToCloud does not downgrade cloud numbers of synced entries', async () => {
    const { rows, supabaseClient } = makeCloud();
    rows.set('e_synced', {
        id: 'e_synced', kind: 'entry', text: 'synced entry', date_label: '25.11.2026',
        num: 10, fav: false, created_at: new Date().toISOString(), author_auth_id: 'auth-uid'
    });
    const ls = makeStorage();
    // Local cache holds the same id with a stale (lower) number 3.
    ls.setItem('soma_journal_entries', JSON.stringify([{
        id: 'e_synced', num: 3, date: '25.11.2026', ts: Date.now(),
        text: 'synced entry', fav: false
    }]));
    const room = loadRoom({ localStorage: ls, supabaseClient });
    const { syncJournalEntriesToCloud } = room;

    await syncJournalEntriesToCloud();
    await settle();
    assert.equal(rows.get('e_synced').num, 10, 'cloud number not overwritten by stale local number');
});

test('saveJournalEntry takes the cloud maximum for the signal number', async () => {
    const { rows, supabaseClient } = makeCloud();
    rows.set('e_cloud', {
        id: 'e_cloud', kind: 'entry', text: 'cloud entry', date_label: '25.11.2026',
        num: 12, fav: false, created_at: new Date().toISOString(), author_auth_id: 'auth-uid'
    });
    const ls = makeStorage();
    // Local cache max is 3 — the signal must not take 4 (collides with cloud space).
    ls.setItem('soma_journal_entries', JSON.stringify([{
        id: 'e_local', num: 3, date: '25.11.2026', ts: Date.now(),
        text: 'локальная запись', fav: false
    }]));
    const room = loadRoom({ localStorage: ls, supabaseClient });
    const { saveJournalEntry, loadLocalJournalEntries } = room;

    const res = await saveJournalEntry('e_new', 'Новый сигнал для проверки номера.', '25.11.2026', 'тег');
    assert.ok(res && res.ok, 'entry saved to cloud');
    assert.equal(rows.get('e_new').num, 13, 'cloud row number is max(cloud)+1');
    assert.equal(loadLocalJournalEntries().find(e => e.id === 'e_new').num, 13,
        'local cache number matches cloud');
});
