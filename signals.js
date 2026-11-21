/* Topic tags for signals. Existing tag column, no author identity attached. */
(function (root) {
    'use strict';
    function sanitizeTopic(rawTopic) {
        return String(rawTopic || '').replace(/[^\p{L}\p{N} _#-]/gu, '').trim().toUpperCase().slice(0, 24);
    }
    function packTag(rawTopic) {
        return sanitizeTopic(rawTopic);
    }
    function unpackTag(raw) {
        const tag = String(raw || '');
        // Legacy S1:<intent>|<topic> format from older releases — keep the topic, drop the intent.
        const match = /^S1:[^|]+\|([\s\S]*)$/.exec(tag);
        if (match) return { topic: match[1], legacy: true };
        return { topic: tag, legacy: false };
    }
    function readPrefs(storage) {
        try {
            const p = JSON.parse(storage.getItem('soma_contact_prefs_v1') || '{}');
            return {
                hidden: p && Array.isArray(p.hidden) ? p.hidden.filter(x => typeof x === 'string').slice(-500) : []
            };
        } catch (_) { return { hidden: [] }; }
    }
    function writePrefs(storage, prefs) {
        storage.setItem('soma_contact_prefs_v1', JSON.stringify({ hidden: [...new Set(prefs.hidden)].slice(-500) }));
    }
    function filterPosts(posts, prefs) {
        const hidden = new Set(prefs.hidden);
        return (Array.isArray(posts) ? posts : []).filter(p => {
            if (!p || !p.id || hidden.has(String(p.id))) return false;
            return true;
        });
    }
    function tagLabel(raw) {
        const { topic } = unpackTag(raw);
        return topic || 'Без темы';
    }
    function accentFor(raw) {
        return '#ff4d6d';
    }
    function visiblePosts(posts) {
        let prefs;
        try { prefs = readPrefs(root.localStorage); } catch (_) { prefs = { hidden: [] }; }
        return filterPosts(posts, prefs);
    }
    const api = { packTag, unpackTag, readPrefs, writePrefs, filterPosts, tagLabel, accentFor, visiblePosts };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root.document) root.SOMA_SIGNALS = api;
})(typeof window !== 'undefined' ? window : globalThis);
