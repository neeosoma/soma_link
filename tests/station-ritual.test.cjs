const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ritual = require('../station-ritual.js');
const indexHtml = readFileSync(require.resolve('../index.html'), 'utf8');

test('ritual client accepts only coarse server buckets and a safe public post id', () => {
    const status = ritual.normalizeStatus([{
        progress_bucket: 5,
        goal: 12,
        is_complete: false,
        candidate_post_id: 'p_1763472000000'
    }]);
    assert.deepEqual({ ...status }, {
        progressBucket: 5,
        goal: 12,
        complete: false,
        candidatePostId: 'p_1763472000000'
    });
    assert.equal(ritual.normalizeStatus({ progress_bucket: 7, goal: 12, is_complete: false }), null);
    assert.equal(ritual.normalizeStatus({ progress_bucket: 5, goal: 12, is_complete: true }), null);
    assert.equal(ritual.normalizeStatus({ progress_bucket: 12, goal: 11, is_complete: true }), null);
    assert.equal(ritual.normalizeStatus({ progress_bucket: 0, goal: 12, is_complete: false, candidate_post_id: 'x<>"' }).candidatePostId, '');
    assert.equal(ritual.normalizeStatus({ progress_bucket: 12, goal: 12, is_complete: true, raw_count: 999 }).progressBucket, 12);
});

test('ritual UI exposes only a compact status line, with no interpolated counter', () => {
    assert.match(indexHtml, /id="night-ritual-card" class="night-ritual-strip"/);
    assert.doesNotMatch(indexHtml, /night-ritual-meter|night-ritual-count|role="progressbar"|night-ritual-fill|night-ritual-track/);
});

test('ritual copy reveals only honest coarse server ranges and hides totals below five', () => {
    const quiet = ritual.describeStatus(ritual.normalizeStatus({
        progress_bucket: 0, goal: 12, is_complete: false, candidate_post_id: null
    }));
    assert.equal(quiet.state, 'quiet');
    assert.match(quiet.copy, /меньше пяти/i);
    assert.match(quiet.copy, /скрыт/);
    assert.doesNotMatch(quiet.copy, /[0-4]\s*\//);

    const five = ritual.describeStatus(ritual.normalizeStatus({ progress_bucket: 5, goal: 12, is_complete: false }));
    assert.match(five.copy, /5\+ разных историй/);
    assert.equal('progressPercent' in five, false, 'coarse bands must not be turned into an exact-looking progress bar');
    assert.equal('bucketLabel' in five, false, 'do not convert a coarse bucket into a progress fraction');

    const ten = ritual.describeStatus(ritual.normalizeStatus({ progress_bucket: 10, goal: 12, is_complete: false }));
    assert.match(ten.copy, /10\+ разных историй/);

    const complete = ritual.describeStatus(ritual.normalizeStatus({ progress_bucket: 12, goal: 12, is_complete: true }));
    assert.equal(complete.state, 'complete');
    assert.match(complete.copy, /12\+ разных историй/);
    assert.match(complete.copy, /окно станции светится/i);

    const unavailable = ritual.describeStatus(null);
    assert.match(unavailable.copy, /серверные данные не получены/);
    assert.match(unavailable.copy, /число не показываем/i);
});
