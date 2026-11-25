// Regression test for the "save whisper to cassette, then dismiss" bug.
// When a whisper was already saved to a cassette (status saved), pressing
// "ОТПУСТИТЬ" must NOT flip the cloud status to 'dismissed': the saved status
// is what triggers the sender's ack (warmth + incoming message,
// my_saved_soma_whispers). It must also show the correct notice.
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
        roomCode + ';({ ...pagerApi, roomAnim, acceptIncomingWhisper, dismissIncomingWhisper, getPendingInboxWhispers })',
        { player: { uid: 'u_0123456789abcdef', name: 'AGENT_1001', warmth: 0 }, roomPreview: false, localStorage, ...env }
    );
}

// supabaseClient mock that records every RPC call.
function makeCloud() {
    const calls = [];
    const rows = new Map();
    const supabaseClient = {
        rpc: async (name, args) => {
            calls.push({ name, args });
            if (name === 'set_soma_whisper_status') {
                const row = rows.get(args.p_id);
                if (row) row.status = args.p_status;
                return { data: [{ id: args.p_id, status: args.p_status }], error: null };
            }
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
            return { data: null, error: null };
        }
    };
    return { calls, rows, supabaseClient };
}

const settle = () => new Promise(r => setTimeout(r, 10));

function seedInbox(ls, id, extra = {}) {
    ls.setItem('soma_inbox_whispers', JSON.stringify([{
        id, post_id: 'p_1', post_tag: 'ЛИЧНАЯ БОЛЬ', post_preview: 'превью',
        text: 'Тёплое слово, которое должно быть сохранено на кассету.',
        created_at: new Date().toISOString(), status: 'pending', ...extra
    }]));
}

function notice(room) {
    return room.roomAnim && room.roomAnim.pagerModalNotice || '';
}

test('dismiss of an unsaved whisper still flips the cloud status to dismissed', async () => {
    const { calls, supabaseClient } = makeCloud();
    const ls = makeStorage();
    seedInbox(ls, 'w_in_1');
    const room = loadRoom({ localStorage: ls, supabaseClient });

    const res = await room.dismissIncomingWhisper('w_in_1');
    assert.equal(res.ok, true, 'dismiss succeeds');
    assert.ok(calls.some(c => c.name === 'set_soma_whisper_status' && c.args.p_status === 'dismissed'),
        'cloud status set to dismissed for an unsaved whisper');
    assert.match(notice(room), /без записи на кассету/, 'notice mentions no cassette recording');
});

test('dismiss after save does NOT flip the cloud status and shows the saved notice', async () => {
    const { calls, supabaseClient } = makeCloud();
    const ls = makeStorage();
    seedInbox(ls, 'w_in_2');
    const room = loadRoom({ localStorage: ls, supabaseClient });

    // 1) Save the whisper to the cassette (as in the game).
    const saved = await room.acceptIncomingWhisper('w_in_2');
    assert.equal(saved.ok, true, 'save succeeds');
    assert.ok(calls.some(c => c.name === 'set_soma_whisper_status' && c.args.p_status === 'saved'),
        'cloud status set to saved on accept');

    // 2) Press «ОТПУСТИТЬ» — the whisper was already saved.
    const res = await room.dismissIncomingWhisper('w_in_2');
    assert.equal(res.ok, true, 'dismiss succeeds');
    assert.ok(!calls.some(c => c.name === 'set_soma_whisper_status' && c.args.p_status === 'dismissed'),
        'NO cloud flip to dismissed after the cassette was saved (ack/warmth intact)');
    assert.match(notice(room), /записан на кассету/, 'notice says the cassette was saved');
});

test('dismiss of a whisper already marked cassetteSaved skips the cloud write', async () => {
    const { calls, supabaseClient } = makeCloud();
    const ls = makeStorage();
    seedInbox(ls, 'w_in_3', { cassetteSaved: true, status: 'saved' });
    const room = loadRoom({ localStorage: ls, supabaseClient });

    const res = await room.dismissIncomingWhisper('w_in_3');
    assert.equal(res.ok, true, 'dismiss succeeds');
    assert.equal(calls.filter(c => c.name === 'set_soma_whisper_status').length, 0,
        'no status RPC at all for an already-saved whisper');
    assert.match(notice(room), /записан на кассету/, 'notice says the cassette was saved');
});
