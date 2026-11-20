/* Intent and reader boundaries. Existing tag column, no author identity attached. */
(function (root) {
    'use strict';
    const INTENTS = Object.freeze([
        { id: 'N', title: 'Побудь рядом', hint: 'Хочется быть услышанным. Без советов, если автор сам их не попросит.', light: false },
        { id: 'V', title: 'Хочу взгляд со стороны', hint: 'Автор открыт к вашему взгляду. Говорите от себя, без диагнозов и указаний.', light: false },
        { id: 'W', title: 'Маленькая победа', hint: 'Разделите радость. Здесь не нужно искать проблему или давать совет.', light: true },
        { id: 'S', title: 'Просто делюсь', hint: 'Можно откликнуться или просто прочитать. Советы не запрошены.', light: true }
    ]);
    function packTag(intentId, rawTopic) {
        const intent = INTENTS.find(x => x.id === intentId);
        if (!intent) throw new Error('Выберите, какой отклик вам сейчас нужен.');
        const topic = String(rawTopic || '').replace(/[^\p{L}\p{N} _#-]/gu, '').trim().toUpperCase().slice(0, 24);
        return `S1:${intent.id}|${topic}`;
    }
    function unpackTag(raw) {
        const tag = String(raw || '');
        const match = /^S1:([NVWS])\|([\s\S]*)$/.exec(tag);
        const intent = match ? INTENTS.find(x => x.id === match[1]) : null;
        return { intent, topic: intent ? match[2] : tag, legacy: !intent };
    }
    function readPrefs(storage) {
        try {
            const p = JSON.parse(storage.getItem('soma_contact_prefs_v1') || '{}');
            return {
                light: !!p && p.light === true,
                hidden: p && Array.isArray(p.hidden) ? p.hidden.filter(x => typeof x === 'string').slice(-500) : []
            };
        } catch (_) { return { light: false, hidden: [] }; }
    }
    function writePrefs(storage, prefs) {
        storage.setItem('soma_contact_prefs_v1', JSON.stringify({ light: prefs.light === true, hidden: [...new Set(prefs.hidden)].slice(-500) }));
    }
    function filterPosts(posts, prefs, intentId = 'all') {
        const hidden = new Set(prefs.hidden);
        return (Array.isArray(posts) ? posts : []).filter(p => {
            if (!p || !p.id || hidden.has(String(p.id))) return false;
            const { intent } = unpackTag(p.tag);
            // Self-selected labels are not content moderation or a safety classifier.
            if (prefs.light && (!intent || !intent.light)) return false;
            return intentId === 'all' || (intent && intent.id === intentId);
        });
    }
    function tagLabel(raw) {
        const { intent, topic } = unpackTag(raw);
        return [intent && intent.title, topic].filter(Boolean).join(' · ') || 'Без темы';
    }
    function visiblePosts(posts) {
        let prefs;
        try { prefs = readPrefs(root.localStorage); } catch (_) { prefs = { light: false, hidden: [] }; }
        return filterPosts(posts, prefs);
    }
    const api = { INTENTS, packTag, unpackTag, readPrefs, writePrefs, filterPosts, tagLabel, visiblePosts };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root.document) root.SOMA_SIGNALS = api;
})(typeof window !== 'undefined' ? window : globalThis);
