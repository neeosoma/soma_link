const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { stationState, equipStationPhase } = runInNewContext(
    readFileSync(require.resolve('../room.js'), 'utf8') + ';({ stationState, equipStationPhase });',
    { player: { warmth: 4 }, roomPreview: false }
);

test('atmospheres unlock exactly at warmth thresholds', () => {
    for (const [warmth, index, next] of [[0,0,5],[4,0,5],[5,1,15],[14,1,15],[15,2,30],[29,2,30],[30,3,undefined],[50,3,undefined]]) {
        const state = stationState(warmth);
        assert.equal(state.unlocked, index);
        assert.equal(state.active, index);
        assert.equal(state.next?.at, next);
    }
});

test('a previously unlocked atmosphere can stay selected; invalid choices fall back', () => {
    assert.equal(stationState(30, 0).active, 0);
    assert.equal(stationState(5, 3).active, 1);
    assert.equal(stationState(15, -1).active, 2);
    assert.equal(stationState(15, NaN).active, 2);
    assert.doesNotThrow(() => equipStationPhase(1));
});
