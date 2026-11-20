const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ritual = require('../station-ritual.js');
const indexHtml = readFileSync(require.resolve('../index.html'), 'utf8');

test('station atmosphere client accepts only a boolean; no goals, counts, or story targets', () => {
    assert.deepEqual({ ...ritual.normalizeStatus([{ is_lit: true }]) }, { lit: true });
    assert.deepEqual({ ...ritual.normalizeStatus({ is_lit: false }) }, { lit: false });
    assert.equal(ritual.normalizeStatus({ is_lit: 1 }), null);
    assert.equal(ritual.normalizeStatus({ is_lit: true, raw_count: 999, candidate_post_id: 'p_1234' }).lit, true);
    assert.equal(ritual.normalizeStatus({ is_lit: 'true' }), null);
    assert.equal(ritual.normalizeStatus(null), null);
});

test('ritual UI is an atmospheric note, not a score, goal, progress bar, or target story', () => {
    assert.match(indexHtml, /id="night-ritual-card" class="night-ritual-strip"/);
    assert.match(indexHtml, /station_presence_atmosphere_status/);
    assert.doesNotMatch(indexHtml, /night-ritual-meter|night-ritual-count|role="progressbar"|night-ritual-fill|night-ritual-track/);
    assert.doesNotMatch(indexHtml, /stationRitualState\.candidatePostId|progressBucket|12\+ ИСТОРИЙ ПОЛУЧИЛИ ОТКЛИК/);
});

test('shared atmosphere copy never reveals a count or claims that a particular story was noticed', () => {
    const quiet = ritual.describeStatus(ritual.normalizeStatus({ is_lit: false }));
    assert.equal(quiet.state, 'quiet');
    assert.match(quiet.copy, /пройти мимо/i);
    assert.match(quiet.copy, /одинаково нормально/i);
    assert.doesNotMatch(quiet.copy, /\d+\s*\+/);

    const lit = ritual.describeStatus(ritual.normalizeStatus({ is_lit: true }));
    assert.equal(lit.state, 'lit');
    assert.match(lit.copy, /мягкий общий свет/i);
    assert.match(lit.copy, /не указывает на конкретную историю/i);
    assert.doesNotMatch(lit.copy, /\d+|цель|наберите/i);

    const unavailable = ritual.describeStatus(null);
    assert.match(unavailable.copy, /недоступен/i);
    assert.match(unavailable.copy, /ничего делать не нужно/i);
});
