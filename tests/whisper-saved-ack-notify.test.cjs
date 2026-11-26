// Regression test for the client-side cassette-ack notification path.
// syncPagerWhispers step 2 (my_soma_whisper_acks — server-side ack-events) delivers
// ONLY the incoming "echo" notice via notifyCassetteAck — warmth is credited
// server-side by the credit_soma_whisper_saved_ack trigger. Ack-events are
// independent of the whisper status: even if the recipient replied (saved→answered),
// the ack-event remains and the notice still arrives. The notice must be added once
// and not duplicated on every sync.
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
        roomCode + ';({ ...pagerApi, roomAnim, syncPagerWhispers, getPendingInboxWhispers, notifyCassetteAck })',
        { player: { uid: 'u_sender1234567890', warmth: 0 }, roomPreview: false, localStorage, ...env }
    );
}

// ackEvents — rows returned by my_soma_whisper_acks: { id, whisper_id, day_key, created_at }.
function makeCloud(ackEvents = []) {
    const calls = [];
    const supabaseClient = {
        rpc: async (name, args) => {
            calls.push({ name, args });
            if (name === 'get_my_pending_whispers') return { data: [], error: null };
            if (name === 'get_my_whisper_replies') return { data: [], error: null };
            if (name === 'my_soma_whisper_acks') return { data: ackEvents, error: null };
            if (name === 'mark_soma_whisper_ack_read') return { data: true, error: null };
            if (name === 'set_soma_whisper_status') {
                return { data: [{ id: args.p_id, status: args.p_status }], error: null };
            }
            return { data: null, error: null };
        }
    };
    return { calls, supabaseClient };
}

const settle = () => new Promise(r => setTimeout(r, 20));

test('syncPagerWhispers delivers the cassette-ack inbox notice for a saved whisper', async () => {
    const { calls, supabaseClient } = makeCloud([{ id: 1, whisper_id: 'w_s1', day_key: '2026-11-25', created_at: new Date().toISOString() }]);
    const ls = makeStorage({
        'soma_my_posts': JSON.stringify(['p_1']),
        'soma_handled_whispers': '{}',
        'soma_acked_whispers': '[]',
        'soma_warmth_ledger': '{}',
        'soma_warmth': '0'
    });
    const room = loadRoom({ localStorage: ls, supabaseClient });

    await room.syncPagerWhispers();
    await settle();

    assert.ok(calls.some(c => c.name === 'my_soma_whisper_acks'),
        'my_soma_whisper_acks RPC must be called');

    // Inbox notice added (echo that the whisper was saved on cassette).
    const inbox = JSON.parse(ls.getItem('soma_inbox_whispers') || '[]');
    const ack = inbox.find(x => x.id === 'ack_w_s1');
    assert.ok(ack, `inbox must contain ack_w_s1, got: ${JSON.stringify(inbox.map(x => x.id))}`);
    assert.equal(ack.is_ack, true, 'notice must be flagged is_ack');
    assert.match(ack.text, /согрели человека/, 'notice text must describe the echo');
});

test('syncPagerWhispers does not credit warmth client-side (server-side trigger does)', async () => {
    const { supabaseClient } = makeCloud([{ id: 1, whisper_id: 'w_s1', day_key: '2026-11-25', created_at: new Date().toISOString() }]);
    const ls = makeStorage({
        'soma_my_posts': JSON.stringify(['p_1']),
        'soma_handled_whispers': '{}',
        'soma_acked_whispers': '[]',
        'soma_warmth_ledger': '{}',
        'soma_warmth': '0'
    });
    const room = loadRoom({ localStorage: ls, supabaseClient });

    await room.syncPagerWhispers();
    await settle();

    // Warmth is credited server-side — the client must NOT touch soma_warmth.
    assert.equal(ls.getItem('soma_warmth'), '0',
        'client must not credit warmth (server-side trigger owns it)');
});

test('syncPagerWhispers does not duplicate the ack notice on repeat syncs', async () => {
    const { supabaseClient } = makeCloud([{ id: 1, whisper_id: 'w_s1', day_key: '2026-11-25', created_at: new Date().toISOString() }]);
    const ls = makeStorage({
        'soma_my_posts': JSON.stringify(['p_1']),
        'soma_handled_whispers': '{}',
        'soma_acked_whispers': '[]',
        'soma_warmth_ledger': '{}',
        'soma_warmth': '0'
    });
    const room = loadRoom({ localStorage: ls, supabaseClient });

    await room.syncPagerWhispers();
    await settle();
    await room.syncPagerWhispers();
    await settle();

    const inbox = JSON.parse(ls.getItem('soma_inbox_whispers') || '[]');
    const acks = inbox.filter(x => x.id === 'ack_w_s1');
    assert.equal(acks.length, 1, `ack notice must appear exactly once, got ${acks.length}`);
});

test('notifyCassetteAck is idempotent via the handled map', async () => {
    const ls = makeStorage({ 'soma_handled_whispers': '{}' });
    const room = loadRoom({ localStorage: ls });

    const first = await room.notifyCassetteAck('w_x');
    assert.ok(first, 'first notify returns the notice');

    // Mark it read (as the "ПРОЧИТАНО" button does) — subsequent notifies skip.
    const handled = JSON.parse(ls.getItem('soma_handled_whispers') || '{}');
    handled['ack_w_x'] = 'ack_read';
    ls.setItem('soma_handled_whispers', JSON.stringify(handled));

    const second = await room.notifyCassetteAck('w_x');
    assert.equal(second, null, 'second notify after read is skipped');
});
