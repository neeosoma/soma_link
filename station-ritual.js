/* Privacy-preserving client contract for the shared night ritual. */
(function (root) {
    'use strict';

    const GOAL = 12;
    const PROGRESS_BUCKETS = Object.freeze([0, 5, 10, 12]);
    const POST_ID_RE = /^[A-Za-z0-9_-]{4,48}$/;

    function normalizeStatus(response) {
        const row = Array.isArray(response) ? response[0] : response;
        if (!row || typeof row !== 'object' || Number(row.goal) !== GOAL) return null;

        const progress = Number(row.progress_bucket);
        const complete = row.is_complete === true;
        if (!PROGRESS_BUCKETS.includes(progress) || complete !== (progress === GOAL)) return null;

        const candidate = typeof row.candidate_post_id === 'string' && POST_ID_RE.test(row.candidate_post_id)
            ? row.candidate_post_id
            : '';
        return Object.freeze({
            progressBucket: progress,
            goal: GOAL,
            complete,
            candidatePostId: candidate
        });
    }

    function describeStatus(status) {
        if (!status) {
            return {
                state: 'unavailable',
                copy: 'Общий счёт пока недоступен: серверные данные не получены. Число не показываем.'
            };
        }

        const progress = status.progressBucket;
        if (progress === 0) {
            return {
                state: 'quiet',
                copy: 'Меньше пяти разных историй получили отклик; счёт скрыт.'
            };
        }
        if (progress === 5) {
            return {
                state: 'warming',
                copy: 'За последние 24 часа отклик получили 5+ разных историй.'
            };
        }
        if (progress === 10) {
            return {
                state: 'near',
                copy: 'За последние 24 часа отклик получили 10+ разных историй.'
            };
        }
        return {
            state: 'complete',
            copy: 'За последние 24 часа отклик получили 12+ разных историй. Окно станции светится.'
        };
    }

    const api = Object.freeze({ GOAL, PROGRESS_BUCKETS, normalizeStatus, describeStatus });
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root && root.document) root.SOMA_RITUAL = api;
})(typeof window !== 'undefined' ? window : globalThis);
