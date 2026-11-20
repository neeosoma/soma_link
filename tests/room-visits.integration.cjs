// NODE_PATH may point to a temporary @electric-sql/pglite installation.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

const C = '33333333-3333-4333-8333-333333333333';
const D = '44444444-4444-4444-8444-444444444444';
(async () => {
    const db = new PGlite();
    try {
        await db.exec(`create role anon; create role authenticated; create schema auth;
            create function auth.uid() returns uuid language sql stable as $$
              select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
        const migration = readFileSync(require.resolve('../billing/setup_room_visits.sql'), 'utf8');
        await db.exec(migration);
        await db.exec(migration);
        const user = async (role, id = '') => {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
            await db.exec(`set role ${role}`);
        };
        const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
        const scene = { room: { plant_kind: 2, plant_stage: 3, plant_seed: 42, phase: 2, cat: 'none', dog: '1', name: 'secret' },
            greenhouse: { open: true, bloomed: [2, 1, 2], pots: { 1: 'pot_moon', alien: 'not allowed', username: 'secret' } },
            cosmetics: { pot: 'pot_cinnabar', epitaph: 'secret' }, identity: 'secret' };
        await user('anon');
        await assert.rejects(scalar('select public.random_room_visit()'), /permission denied/i);
        await user('authenticated', A);
        assert.equal(await scalar('select public.my_room_visit_consent()'), false);
        assert.equal(await scalar('select public.update_room_visit_scene($1::jsonb)', [JSON.stringify(scene)]), false);
        assert.equal(await scalar('select public.random_room_visit()'), null);
        assert.equal(await scalar('select public.set_room_visit_consent(true,$1::jsonb)', [JSON.stringify(scene)]), true);
        assert.equal(await scalar('select public.random_room_visit()'), null, 'own room is excluded');
        await assert.rejects(db.query('select * from soma_private.room_visits'), /permission denied/i);
        await user('authenticated', B);
        const got = await scalar('select public.random_room_visit()');
        assert.deepEqual(got, { room: { plant_kind: 2, plant_stage: 3, plant_seed: 42, phase: 2, cat: 'none', dog: '1',
            alien_kind: null, leaf: 0, bloom: 0, pot_shape: 0, pot_index: 0, lean: 0 },
            greenhouse: { open: true, bloomed: [1, 2], pots: { 1: 'pot_moon' },
                active_seed: { kind: null, stage: -1, seed: 0, leaf: 0, bloom: 0, pot_shape: 0, pot_index: 0, lean: 0 },
                alien_seed: { kind: null, stage: -1, seed: 0, leaf: 0, bloom: 0, pot_shape: 0, pot_index: 0, lean: 0 }, placed: null },
            cosmetics: { pot: 'pot_cinnabar', garland: false, tape: false, steam: false, candles: false } });
        await user('authenticated', A);
        const activeScene = {
            ...scene,
            greenhouse: {
                open: true, bloomed: [0], pots: { 0: 'pot_moon' },
                active_kind: 3, active_stage: 2, active_seed: 99, active_leaf: 1, active_bloom: 2,
                active_pot_shape: 1, active_pot_index: 2, active_lean: -1,
                alien_kind: 1, alien_stage: 4, alien_seed: 77, alien_leaf: 2, alien_bloom: 1,
                alien_pot_shape: 2, alien_pot_index: 3, alien_lean: 1, placed: 'seed'
            }
        };
        assert.equal(await scalar('select public.update_room_visit_scene($1::jsonb)', [JSON.stringify(activeScene)]), true);
        await user('authenticated', C);
        const active = (await scalar('select public.random_room_visit()')).greenhouse;
        assert.equal(active.active_seed.kind, 3, 'active greenhouse seed is preserved');
        assert.equal(active.active_seed.stage, 2, 'active greenhouse stage is preserved');
        assert.equal(active.active_seed.seed, 99, 'active greenhouse seed number is preserved');
        assert.equal(active.active_seed.leaf, 1, 'active greenhouse leaf palette is preserved');
        assert.equal(active.active_seed.bloom, 2, 'active greenhouse bloom palette is preserved');
        assert.equal(active.active_seed.lean, -1, 'active greenhouse lean is preserved');
        assert.equal(active.alien_seed.kind, 1, 'owner alien kind is preserved');
        assert.equal(active.alien_seed.stage, 4, 'alien stage is preserved');
        assert.equal(active.placed, 'seed', 'active seed placement is preserved');
        assert.deepEqual(active.bloomed, [0], 'open greenhouse bloomed collection is preserved');
        assert.deepEqual(active.pots, { 0: 'pot_moon' }, 'per-flower pots are preserved');
        await user('authenticated', A);
        assert.equal(await scalar('select public.update_room_visit_scene($1::jsonb)', [JSON.stringify({ ...scene, greenhouse: { ...scene.greenhouse, open: false } })]), true);
        await user('authenticated', D);
        assert.deepEqual((await scalar('select public.random_room_visit()')).greenhouse, { open: false, bloomed: [], pots: {}, active_seed: null, alien_seed: null, placed: null }, 'locked greenhouse does not disclose its contents');
        await user('authenticated', A);
        await assert.rejects(scalar('select public.set_room_visit_consent(true,$1::jsonb)', [JSON.stringify({ ...scene, room: { ...scene.room, plant_stage: 99 } })]), /Invalid room scene/);
        assert.equal(await scalar('select public.my_room_visit_consent()'), true, 'invalid updates do not erase consent');
        assert.equal(await scalar('select public.set_room_visit_consent(false)'), false);
        await user('authenticated', B);
        assert.equal(await scalar('select public.random_room_visit()'), null, 'withdrawal removes the room from selection');
        console.log('Room visit privacy integration passed');
    } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
