// Regression test for the Supabase Realtime delivery path of whisper/ack
// notifications. setupWhisperRealtime() subscribes a channel to INSERT events
// on soma_whispers (incoming whisper to our post) and soma_whisper_acks
// (cassette ack). Events must be delivered immediately — without waiting for
// the poll tick — and must not duplicate what syncPagerWhispers delivers.
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
        roomCode + ';({ ...pagerApi, roomAnim, syncPagerWhispers, setupWhisperRealtime, getPendingInboxWhispers, notifyCassetteAck, receiveIncomingWhisperLocal })',
        { player: { uid: 'u_sender1234567890', warmth: 0 }, roomPreview: false, localStorage, ...env }
    );
}

// Channel mock: captures .on() handlers and lets the test fire events.
function makeChannel() {
    const handlers = [];
    const channel = {
        on(event, filter, cb) {
            handlers.push({ event, filter, cb });
            return channel;
        },
        subscribe(cb) { channel.subscribed = true; if (cb) cb('SUBSCRIBED'); return channel; },
        fire(table, payload) {
            const h = handlers.find(x => x.filter && x.filter.table === table);
            if (h) h.cb(payload);
        },
        handlers
    };
    return channel;
}

function makeCloud(channel) {
    const calls = [];
    const supabaseClient = {
        channel: () => channel,
        rpc: async (name, args) => {
            calls.push({ name, args });
            if (name === 'get_my_pending_whispers') return { data: [], error: null };
            if (name === 'get_my_whisper_replies') return { data: [], error: null };
            if (name === 'my_soma_whisper_acks') return { data: [], error: null };
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

test('setupWhisperRealtime subscribes to whisper and ack INSERT events', () => {
    const channel = makeChannel();
    const { supabaseClient } = makeCloud(channel);
    const room = loadRoom({ supabaseClient });

    room.setupWhisperRealtime();

    assert.equal(channel.subscribed, true, 'channel must be subscribed');
    const tables = channel.handlers.map(h => h.filter && h.filter.table).sort();
    assert.deepEqual(tables, ['soma_whisper_acks', 'soma_whispers'],
        'must subscribe to both whisper and ack tables');
    for (const h of channel.handlers) {
        assert.equal(h.filter.event, 'INSERT', 'must listen to INSERT events');
    }
});

test('setupWhisperRealtime is idempotent — one channel only', () => {
    const channel = makeChannel();
    const { supabaseClient } = makeCloud(channel);
    const room = loadRoom({ supabaseClient });

    room.setupWhisperRealtime();
    room.setupWhisperRealtime();

    assert.equal(channel.handlers.length, 2, 'second call must not add more handlers');
});

test('whisper INSERT for my post adds inbox item immediately', () => {
    const channel = makeChannel();
    const { supabaseClient } = makeCloud(channel);
    const ls = makeStorage({
        'soma_my_posts': JSON.stringify(['p_1']),
        'soma_handled_whispers': '{}',
        'soma_acked_whispers': '[]',
        'soma_warmth_ledger': '{}',
        'soma_warmth': '0'
    });
    const room = loadRoom({ localStorage: ls, supabaseClient });
    room.setupWhisperRealtime();

    channel.fire('soma_whispers', {
        new: {
            id: 'w_rt1', post_id: 'p_1', post_tag: 'СОН', post_preview: '',
            text: 'Спокойной ночи', created_at: new Date().toISOString()
        }
    });

    const inbox = JSON.parse(ls.getItem('soma_inbox_whispers') || '[]');
    const item = inbox.find(x => x.id === 'w_rt1');
    assert.ok(item, `inbox must contain w_rt1, got: ${JSON.stringify(inbox.map(x => x.id))}`);
    assert.equal(item.status, 'pending');
});

test('whisper INSERT for another post is ignored', () => {
    const channel = makeChannel();
    const { supabaseClient } = makeCloud(channel);
    const ls = makeStorage({
        'soma_my_posts': JSON.stringify(['p_1']),
        'soma_handled_whispers': '{}',
        'soma_acked_whispers': '[]',
        'soma_warmth_ledger': '{}',
        'soma_warmth': '0'
    });
    const room = loadRoom({ localStorage: ls, supabaseClient });
    room.setupWhisperRealtime();

    channel.fire('soma_whispers', {
        new: {
            id: 'w_other', post_id: 'p_other', post_tag: 'СОН', post_preview: '',
            text: 'Чужой шёпот', created_at: new Date().toISOString()
        }
    });

    const inbox = JSON.parse(ls.getItem('soma_inbox_whispers') || '[]');
    assert.equal(inbox.length, 0, 'whisper to another post must not enter the inbox');
});

test('ack INSERT delivers the cassette-ack notice immediately', () => {
    const channel = makeChannel();
    const { supabaseClient } = makeCloud(channel);
    const ls = makeStorage({
        'soma_my_posts': JSON.stringify(['p_1']),
        'soma_handled_whispers': '{}',
        'soma_acked_whispers': '[]',
        'soma_warmth_ledger': '{}',
        'soma_warmth': '0'
    });
    const room = loadRoom({ localStorage: ls, supabaseClient });
    room.setupWhisperRealtime();

    channel.fire('soma_whisper_acks', {
        new: { id: 42, whisper_id: 'w_rt_ack', sender_auth_id: 'x', day_key: '2026-11-27' }
    });

    const inbox = JSON.parse(ls.getItem('soma_inbox_whispers') || '[]');
    const ack = inbox.find(x => x.id === 'ack_w_rt_ack');
    assert.ok(ack, `inbox must contain ack_w_rt_ack, got: ${JSON.stringify(inbox.map(x => x.id))}`);
    assert.equal(ack.is_ack, true, 'notice must be flagged is_ack');
    assert.equal(ack.ack_event_id, 42, 'ack event id must be stored for server-side read');
    assert.match(ack.text, /согрели человека/, 'notice text must describe the echo');
});

test('realtime + poll do not duplicate the ack notice', async () => {
    const channel = makeChannel();
    const { supabaseClient } = makeCloud(channel);
    const ls = makeStorage({
        'soma_my_posts': JSON.stringify(['p_1']),
        'soma_handled_whispers': '{}',
        'soma_acked_whispers': '[]',
        'soma_warmth_ledger': '{}',
        'soma_warmth': '0'
    });
    const room = loadRoom({ localStorage: ls, supabaseClient });
    room.setupWhisperRealtime();

    // Realtime delivers the ack first.
    channel.fire('soma_whisper_acks', {
        new: { id: 7, whisper_id: 'w_rt_dup', sender_auth_id: 'x', day_key: '2026-11-27' }
    });
    // Then the poll would also see the same ack event.
    const { calls, supabaseClient: cloud2 } = makeCloud(channel);
    Object.assign(supabaseClient, {
        rpc: async (name, args) => {
            calls.push({ name, args });
            if (name === 'my_soma_whisper_acks') {
                return { data: [{ id: 7, whisper_id: 'w_rt_dup', day_key: '2026-11-27', created_at: new Date().toISOString() }], error: null };
            }
            return { data: [], error: null };
        }
    });
    await room.syncPagerWhispers();
    await settle();

    const inbox = JSON.parse(ls.getItem('soma_inbox_whispers') || '[]');
    const acks = inbox.filter(x => x.id === 'ack_w_rt_dup');
    assert.equal(acks.length, 1, `ack notice must appear exactly once, got ${acks.length}`);
});
