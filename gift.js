/* Standalone friend cassette. No network, Auth, rewards, or imported Whisper text. */
(function (root) {
    'use strict';
    const MAX_TOKEN = 2400;
    function validateText(raw) {
        const text = typeof raw === 'string' ? raw.replace(/\r\n/g, '\n').trim() : '';
        if (text.length < 13 || text.length > 333) throw new Error('Нужно от 13 до 333 символов.');
        if (/(https?:\/\/|www\.|t\.me\/|telegram\.me|\b[a-z0-9-]+\.(ru|com|net|org|io|me|gg)\b|@[a-z0-9_]{3,})/i.test(text)
            || /(?:\+?\d[\s\-().]*){9,}/.test(text)) {
            throw new Error('Не добавляйте ссылки, @контакты, номера телефонов и карт.');
        }
        return text;
    }
    function encode(payload) {
        const bytes = new TextEncoder().encode(JSON.stringify(payload));
        return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function decode(token) {
        if (typeof token !== 'string' || !/^[A-Za-z0-9_-]+$/.test(token) || token.length > MAX_TOKEN) {
            throw new Error('Ссылка на кассету повреждена или не поддерживается.');
        }
        try {
            const base = token.replace(/-/g, '+').replace(/_/g, '/');
            const bytes = Uint8Array.from(atob(base + '='.repeat((4 - base.length % 4) % 4)), c => c.charCodeAt(0));
            const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
            if (!payload || payload.v !== 1 || !/^[a-f0-9]{32}$/.test(payload.id)) throw new Error();
            return { v: 1, id: payload.id, text: validateText(payload.text) };
        } catch (_) { throw new Error('Ссылка на кассету повреждена или не поддерживается.'); }
    }
    function createLink(raw, base, cryptoSource = root.crypto) {
        const text = validateText(raw);
        const bytes = new Uint8Array(16);
        if (!cryptoSource || !cryptoSource.getRandomValues) throw new Error('Браузер не поддерживает безопасное создание ссылки.');
        cryptoSource.getRandomValues(bytes);
        const id = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        const url = new URL('gift.html', base);
        if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Откройте страницу через сайт.');
        url.search = '';
        url.hash = 't=' + encode({ v: 1, id, text });
        return url.href;
    }
    function saveGift(storage, gift, now = new Date()) {
        // Validate again even when invoked without the UI.
        if (!gift || !/^[a-f0-9]{32}$/.test(gift.id)) throw new Error('Некорректная кассета.');
        const text = validateText(gift.text);
        let list;
        try { list = JSON.parse(storage.getItem('soma_cassettes') || '[]'); }
        catch (_) { throw new Error('Архив не удалось прочитать. Существующие записи не изменены.'); }
        if (!Array.isArray(list)) throw new Error('Архив повреждён. Существующие записи не изменены.');
        const id = 'cas_gift_' + gift.id;
        const old = list.find(c => c && c.id === id);
        if (old) {
            if (old.text !== text) throw new Error('Кассета с этим номером уже содержит другой текст.');
            return { duplicate: true };
        }
        const max = list.reduce((n, c) => Math.max(n, c && Number.isSafeInteger(c.num) && c.num > 0 ? c.num : 0), 0);
        const date = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
        const item = { id, num: max + 1, date, ts: now.getTime(), text, fav: false };
        // Never silently evict an existing cassette to make room for an invitation.
        if (list.length >= 120) throw new Error('На полке 120 кассет. Освободите место в комнате перед сохранением.');
        storage.setItem('soma_cassettes', JSON.stringify([item, ...list]));
        return { duplicate: false };
    }
    function init() {
        const doc = root.document;
        if (!doc || !doc.getElementById('gift-compose')) return;
        const el = id => doc.getElementById(id);
        let incoming = null;
        const status = text => { el('gift-status').textContent = text; };
        function invalidate() {
            el('gift-output').hidden = true;
            el('gift-url').value = '';
            el('gift-count').textContent = `${el('gift-input').value.length} / 333 · минимум 13 символов`;
            status('');
        }
        function load() {
            incoming = null;
            el('gift-message').textContent = '';
            el('gift-message').hidden = true;
            el('gift-received-actions').hidden = true;
            el('gift-play').hidden = false;
            el('gift-received').hidden = true;
            el('gift-compose').hidden = false;
            invalidate();
            if (!root.location.hash) return;
            try {
                const hash = root.location.hash;
                if (!hash.startsWith('#t=')) throw new Error('Неизвестный формат ссылки.');
                incoming = decode(hash.slice(3));
                el('gift-received').hidden = false;
                el('gift-compose').hidden = true;
            } catch (error) { status(error.message + ' Можно записать новую кассету ниже.'); }
        }
        el('gift-input').oninput = invalidate;
        el('gift-consent').onchange = invalidate;
        el('gift-create').onclick = () => {
            invalidate();
            if (!el('gift-consent').checked) return status('Подтвердите, что это ваш текст и вы согласны передать его ссылкой.');
            try {
                el('gift-url').value = createLink(el('gift-input').value, root.location.href);
                el('gift-output').hidden = false;
                status('Кассета записана. Она ещё никому не отправлена.');
            } catch (error) { status(error.message); }
        };
        async function copy() {
            const url = el('gift-url').value;
            if (!url) return;
            try {
                if (!root.navigator.clipboard) throw new Error();
                await root.navigator.clipboard.writeText(url);
                status('Ссылка скопирована. Передайте её выбранному человеку.');
            } catch (_) {
                el('gift-url').focus();
                el('gift-url').select();
                status('Автокопирование недоступно. Скопируйте выделенную ссылку вручную.');
            }
        }
        el('gift-copy').onclick = copy;
        el('gift-share').onclick = async () => {
            const url = el('gift-url').value;
            if (!url) return;
            if (!root.navigator.share) return copy();
            try {
                await root.navigator.share({ title: 'Кассета для тебя · SOMA~LINK', text: 'Есть кое-что, что я редко говорю вслух. Открой кассету — регистрация не нужна.', url });
                status('Ссылка передана в выбранное приложение. Это не подтверждение доставки или прочтения.');
            } catch (error) { status(error.name === 'AbortError' ? 'Передача отменена. Кассета осталась у вас.' : 'Не удалось передать ссылку. Можно скопировать её вручную.'); }
        };
        el('gift-play').onclick = () => {
            if (!incoming) return;
            el('gift-message').textContent = incoming.text;
            el('gift-message').hidden = false;
            el('gift-received-actions').hidden = false;
            el('gift-play').hidden = true;
        };
        el('gift-save').onclick = () => {
            if (!incoming) return;
            try {
                const result = saveGift(root.localStorage, incoming);
                status(result.duplicate ? 'Эта кассета уже есть на вашей полке.' : 'Сохранено в этом браузере. Откройте комнату здесь же, чтобы найти кассету в VTR-90.');
            } catch (error) { status('Не удалось сохранить: ' + error.message); }
        };
        el('gift-reply').onclick = () => {
            el('gift-compose').hidden = false;
            el('gift-input').value = '';
            el('gift-consent').checked = false;
            invalidate();
            status('Напишите свой ответ и сами передайте новую ссылку отправителю. Его адрес нам неизвестен.');
            el('gift-input').focus();
        };
        root.addEventListener('hashchange', load);
        load();
    }
    const api = { validateText, encode, decode, createLink, saveGift, init };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root.document) {
        root.SOMA_GIFT = api;
        if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init, { once: true });
        else init();
    }
})(typeof window !== 'undefined' ? window : globalThis);
