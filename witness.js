/* Anonymous, server-backed presence marks for public SOMA~LINK stories. */
(function (root) {
    'use strict';

    const POST_ID_RE = /^[A-Za-z0-9_-]{4,48}$/;
    const MAX_STATUS_IDS = 50;

    function safePostId(value) {
        const id = typeof value === 'string' ? value : '';
        return POST_ID_RE.test(id) ? id : '';
    }

    function normalizePostIds(values) {
        if (!Array.isArray(values)) return [];
        return [...new Set(values.map(safePostId).filter(Boolean))].slice(0, MAX_STATUS_IDS);
    }

    function normalizeStatuses(rows, requestedIds) {
        if (!Array.isArray(rows)) return null;
        const requested = new Set(normalizePostIds(requestedIds));
        const statuses = new Map();

        for (const row of rows) {
            if (!row || typeof row !== 'object') continue;
            const postId = safePostId(row.post_id);
            if (!postId || !requested.has(postId)
                || typeof row.is_author !== 'boolean'
                || typeof row.can_mark !== 'boolean'
                || typeof row.has_witness !== 'boolean'
                || typeof row.i_marked !== 'boolean') continue;

            const isAuthor = row.is_author === true;
            const iMarked = !isAuthor && row.i_marked === true;
            const rawWarmth = row.author_warmth;
            const authorWarmth = isAuthor && rawWarmth !== null && rawWarmth !== undefined
                && Number.isSafeInteger(Number(rawWarmth)) && Number(rawWarmth) >= 0
                ? Number(rawWarmth) : null;
            statuses.set(postId, Object.freeze({
                isAuthor,
                canMark: !isAuthor && !iMarked && row.can_mark === true,
                hasWitness: isAuthor && row.has_witness === true,
                iMarked,
                authorWarmth
            }));
        }
        return statuses;
    }

    function normalizeMarkResult(data) {
        if (typeof data !== 'boolean') return null;
        return Object.freeze({
            inserted: data,
            alreadyMarked: !data
        });
    }

    function classifyError(error) {
        const message = String(error && error.message || '');
        const code = String(error && error.code || '');
        if (code === 'PGRST202' || /could not find the function|function .* does not exist/i.test(message)) return 'migration';
        if (/daily witness mark limit/i.test(message)) return 'daily-limit';
        if (/cannot mark own post/i.test(message)) return 'own-post';
        if (/post is not available|verified owner/i.test(message)) return 'post-unavailable';
        if (/authentication required|jwt/i.test(message)) return 'auth';
        return 'unavailable';
    }

    async function fetchStatuses(client, postIds) {
        const ids = normalizePostIds(postIds);
        if (!ids.length) return { ok: true, statuses: new Map() };
        if (!client || typeof client.rpc !== 'function') {
            return { ok: false, code: 'unavailable', statuses: new Map() };
        }
        try {
            const result = await client.rpc('my_soma_post_witness_status', { p_post_ids: ids });
            if (!result || result.error) {
                return { ok: false, code: classifyError(result && result.error), statuses: new Map() };
            }
            const statuses = normalizeStatuses(result.data, ids);
            if (!statuses) return { ok: false, code: 'invalid-response', statuses: new Map() };
            return { ok: true, statuses };
        } catch (error) {
            return { ok: false, code: classifyError(error), statuses: new Map() };
        }
    }

    async function markPost(client, postId) {
        const id = safePostId(postId);
        if (!id) return { ok: false, code: 'invalid-post' };
        if (!client || typeof client.rpc !== 'function') return { ok: false, code: 'unavailable' };
        try {
            const result = await client.rpc('mark_soma_post_witness', { p_post_id: id });
            if (!result || result.error) {
                return { ok: false, code: classifyError(result && result.error) };
            }
            const normalized = normalizeMarkResult(result.data);
            if (!normalized) return { ok: false, code: 'invalid-response' };
            return { ok: true, ...normalized };
        } catch (error) {
            return { ok: false, code: classifyError(error) };
        }
    }

    const api = Object.freeze({
        MAX_STATUS_IDS,
        safePostId,
        normalizePostIds,
        normalizeStatuses,
        normalizeMarkResult,
        classifyError,
        fetchStatuses,
        markPost
    });

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root && root.document) root.SOMA_WITNESS = api;
})(typeof window !== 'undefined' ? window : globalThis);
