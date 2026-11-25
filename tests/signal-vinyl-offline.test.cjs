// Verifies the signal-vinyl robustness fix: a signal is ALWAYS saved on the
// vinyl (local journal store) even when the cloud is unavailable, and local
// entries merge into the diary archive and sync back to the cloud later.
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
        roomCode + ';({ saveJournalEntry, loadDiaryArchive, syncJournalEntriesToCloud, loadLocalJournalEntries, loadCassettes });',
        { player: { uid: 'u_0123456789abcdef', name: 'AGENT_1001', warmth: 0 }, roomPreview: false, localStorage, ...env }
    );
}

test('saveJournalEntry writes to the local vinyl store even when cloud is absent', async () => {
    const storage = makeStorage();
    const room = loadRoom({ localStorage: storage, supabaseClient: undefined });
    const res = await room.saveJournalEntry('e_test1', 'Это тестовый сигнал для винила', '2026-11-25', 'радость');
    assert.equal(res.offline, true, 'returns offline when no client');
    assert.equal(res.id, 'e_test1');
    const local = room.loadLocalJournalEntries();
    assert.equal(local.length, 1, 'entry saved locally');
    assert.equal(local[0].id, 'e_test1');
    assert.equal(local[0].text, 'Это тестовый сигнал для винила');
    assert.ok(local[0].num >= 1, 'entry got a number');
});

test('loadDiaryArchive shows local entries when cloud is unavailable', async () => {
    const storage = makeStorage();
    const room = loadRoom({ localStorage: storage, supabaseClient: undefined });
    await room.saveJournalEntry('e_test2', 'Сигнал离线 сохранён локально', '2026-11-25', 'радость');
    const archive = await room.loadDiaryArchive();
    const entry = archive.find(it => it.id === 'e_test2');
    assert.ok(entry, 'local entry appears in diary archive');
    assert.equal(entry.kind, 'entry');
    assert.equal(entry.text, 'Сигнал离线 сохранён локально');
});

test('syncJournalEntriesToCloud pushes local entries to the cloud RPC', async () => {
    const storage = makeStorage();
    let savedToCloud = null;
    const supabaseClient = {
        rpc: (name, args) => {
            if (name === 'save_soma_journal_entry') {
                savedToCloud = args;
                return Promise.resolve({ data: [{ id: args.p_id }], error: null });
            }
            return Promise.resolve({ data: [], error: null });
        }
    };
    const room = loadRoom({ localStorage: storage, supabaseClient });
    await room.saveJournalEntry('e_sync1', 'Сигнал для синхронизации в облако', '2026-11-25', 'радость');
    // Ensure a local entry exists before syncing
    assert.equal(room.loadLocalJournalEntries().length, 1, 'local entry exists');
    await room.syncJournalEntriesToCloud();
    assert.ok(savedToCloud, 'cloud RPC was called');
    assert.equal(savedToCloud.p_id, 'e_sync1');
    assert.equal(savedToCloud.p_kind, 'entry');
    assert.equal(savedToCloud.p_text, 'Сигнал для синхронизации в облако');
});

test('saveJournalEntry still syncs to cloud when client is available', async () => {
    const storage = makeStorage();
    let saved = null;
    const supabaseClient = {
        rpc: (name, args) => {
            if (name === 'get_my_soma_journal') return Promise.resolve({ data: [], error: null });
            if (name === 'save_soma_journal_entry') { saved = args; return Promise.resolve({ data: [{ id: args.p_id }], error: null }); }
            return Promise.resolve({ data: [], error: null });
        }
    };
    const room = loadRoom({ localStorage: storage, supabaseClient });
    const res = await room.saveJournalEntry('e_cloud1', 'Сигнал с облаком', '2026-11-25', 'радость');
    assert.equal(res.ok, true, 'cloud save ok');
    assert.ok(saved, 'cloud RPC called');
    assert.equal(saved.p_id, 'e_cloud1');
    // Also present locally (cache)
    assert.equal(room.loadLocalJournalEntries().length, 1, 'still cached locally');
});
