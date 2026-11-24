// =========================================================================
// NEEOSOMA // AV-88 — ЛАМПОВЫЙ HI-FI ПРИЁМНИК И КОЛЛЕКЦИОННАЯ ФОНОТЕКА CD
// 0% рекламы · 0% pay-to-win · 100% сохранение Fullscreen (включая поворот ±90°)
// Поддержка прямого <audio>, встроенного аналогового синтеза, Spotify,
// Яндекс Музыки и коллекционных дисков ($1 · 50 ⭐ Telegram Stars).
// =========================================================================
(function () {
    'use strict';

    const PREVIEW_SEC = 30;
    const VOL_KEY = 'soma_rx_vol';
    const LAST_KEY = 'soma_rx_track';

    const state = {
        open: false,
        playing: false,
        source: 'cd', // 'cd' | 'spotify' | 'yandex'
        tab: 'all',      // 'all' | 'radio' | 'collect' | 'owned'
        trackId: '',
        currentTime: 0,
        duration: 180,
        loop: false,
        muted: false,
        volume: 0.72,
        buying: '',
        notice: '',
        noticeTimer: null,
        tray: 'closed',   // 'closed' | 'open'
        trayTimer: null,
        dragging: false,
        energy: 0,
        mountedEmbedUrl: ''
    };

    // Аудио-движок (HTML5 <audio> для реальных файлов + многослойный тёплый WebAudio-синтез)
    let rxCtx = null;
    let masterGain = null;
    let toneFilter = null;
    let analyser = null;
    let freqBuf = null;
    let waveBuf = null;
    let audioEl = null;
    let mediaNode = null;
    let mediaNodeFailed = false;
    let synthTimer = null;
    let synthStep = 0;
    let lastTickMs = 0;
    let uiRaf = 0;
    let noiseBuffer = null;

    // ===== ОФЛАЙН-КЭШ АУДИО (IndexedDB) =====
    // Купленные треки/альбомы кэшируются локально, чтобы звучали без сети.
    // Продаём право на прослушивание в игре — файл не выдаётся пользователю.
    const AUDIO_DB = 'soma_rx_audio';
    const AUDIO_STORE = 'tracks';
    let audioDbPromise = null;
    const cachedAudioUrls = {}; // trackId -> objectURL

    function openAudioCache() {
        if (audioDbPromise) return audioDbPromise;
        if (typeof indexedDB === 'undefined') {
            audioDbPromise = Promise.resolve(null);
            return audioDbPromise;
        }
        audioDbPromise = new Promise((resolve) => {
            try {
                const req = indexedDB.open(AUDIO_DB, 1);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(AUDIO_STORE)) db.createObjectStore(AUDIO_STORE);
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            } catch (_) {
                resolve(null);
            }
        });
        return audioDbPromise;
    }

    function cacheAudio(trackId, blob) {
        return openAudioCache().then(db => {
            if (!db) return false;
            return new Promise(resolve => {
                try {
                    const tx = db.transaction(AUDIO_STORE, 'readwrite');
                    tx.objectStore(AUDIO_STORE).put(blob, trackId);
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch (_) {
                    resolve(false);
                }
            });
        });
    }

    function getCachedAudio(trackId) {
        return openAudioCache().then(db => {
            if (!db) return null;
            return new Promise(resolve => {
                try {
                    const tx = db.transaction(AUDIO_STORE, 'readonly');
                    const req = tx.objectStore(AUDIO_STORE).get(trackId);
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror = () => resolve(null);
                } catch (_) {
                    resolve(null);
                }
            });
        });
    }

    // Прайм: скачать аудио купленного трека/альбома в локальный кэш сразу
    async function primeAudio(track) {
        if (!track || !track.audioUrl || typeof fetch !== 'function') return;
        try {
            const res = await fetch(track.audioUrl);
            if (!res.ok) return;
            const blob = await res.blob();
            if (blob && blob.size > 0) await cacheAudio(track.id, blob);
        } catch (_) { /* offline или ошибка — проигрывание пойдёт из сети/синтеза */ }
    }

    async function primeAlbumAudio(album) {
        if (!album || !Array.isArray(album.tracks)) return;
        for (const t of album.tracks) {
            if (t && t.audioUrl) await primeAudio({ id: `album.${album.id}.${album.tracks.indexOf(t)}`, audioUrl: t.audioUrl });
        }
    }

    // Очистка object URL при смене трека
    function revokeCachedAudioUrl(trackId) {
        if (trackId && cachedAudioUrls[trackId] && typeof URL !== 'undefined' && URL.revokeObjectURL) {
            try { URL.revokeObjectURL(cachedAudioUrls[trackId]); } catch (_) {}
            delete cachedAudioUrls[trackId];
        }
    }

    function clearAudioCacheUrls(keepTrackId) {
        Object.keys(cachedAudioUrls).forEach(id => {
            if (id !== keepTrackId) revokeCachedAudioUrl(id);
        });
    }

    function escHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, ch => (
            ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;'
        ));
    }

    function hexToRgbTriplet(hex, fallback) {
        const m = String(hex || '').trim().match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (!m) return fallback || '255, 107, 125';
        return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
    }

    function fmtTime(sec) {
        const n = Math.max(0, Math.floor(Number(sec) || 0));
        const m = Math.floor(n / 60);
        const s = n % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    // ===== АЛЬБОМЫ: разворачиваем albums из SOMA_ALBUMS в диски фонотеки =====
    // Каждый трек альбома — отдельный диск (id album.<albumId>.<ti>).
    // collectible: false — трек альбома не продаётся поодиночке; доступ к нему
    // даёт покупка альбома целиком (право на прослушивание в игре, не владение).
    function getAlbums() {
        return (typeof window !== 'undefined' && Array.isArray(window.SOMA_ALBUMS)) ? window.SOMA_ALBUMS : [];
    }

    function albumTracks() {
        const out = [];
        getAlbums().forEach(album => {
            if (!album || typeof album.id !== 'string' || !album.id || !Array.isArray(album.tracks)) return;
            album.tracks.forEach((t, ti) => {
                if (!t || !t.title) return;
                out.push({
                    id: `album.${album.id}.${ti}`,
                    albumId: album.id,
                    albumTitle: album.title || album.id,
                    title: t.title,
                    subtitle: `Альбом · ${album.title || album.id}`,
                    note: t.note || album.note || '',
                    freq: t.freq || album.freq || '88.4',
                    duration: t.duration || album.duration || 180,
                    collectible: false,
                    priceUsd: album.priceUsd || '$4',
                    stars: album.stars || 200,
                    buyUrl: album.buyUrl || '',
                    wax: t.wax || album.wax || 'crimson',
                    accent: t.accent || album.accent || '#ff6b7d',
                    glow: t.glow || album.glow || '#c81e3e',
                    audioUrl: t.audioUrl || '',
                    spotifyUrl: t.spotifyUrl || '',
                    yandexUrl: t.yandexUrl || '',
                    coverUrl: t.coverUrl || album.coverUrl || '',
                    synth: t.synth || album.synth || undefined
                });
            });
        });
        return out;
    }

    function isAlbumOwned(albumId) {
        if (!albumId || typeof albumId !== 'string') return false;
        if (typeof isOwned === 'function' && isOwned(albumId)) return true;
        try {
            const raw = JSON.parse(localStorage.getItem('soma_owned') || '[]');
            return Array.isArray(raw) && raw.includes(albumId);
        } catch (_) {
            return false;
        }
    }

    function getTracks() {
        const list = (typeof window !== 'undefined' && Array.isArray(window.SOMA_TRACKS)) ? window.SOMA_TRACKS : [];
        const base = list.filter(t => t && typeof t.id === 'string' && t.title);
        return base.concat(albumTracks());
    }

    function getStreamingCfg() {
        return (typeof window !== 'undefined' && window.SOMA_STREAMING && typeof window.SOMA_STREAMING === 'object')
            ? window.SOMA_STREAMING
            : {};
    }

    function getTrackById(id) {
        const all = getTracks();
        return all.find(t => t.id === id) || all[0] || null;
    }

    function currentTrack() {
        const tr = getTrackById(state.trackId);
        if (tr && state.trackId !== tr.id) state.trackId = tr.id;
        return tr;
    }

    function isTrackOwned(tr) {
        if (!tr) return false;
        // Трек из альбома — доступен, если куплен альбом целиком
        if (tr.albumId) return isAlbumOwned(tr.albumId);
        if (!tr.collectible) return true;
        if (typeof isOwned === 'function' && isOwned(tr.id)) return true;
        try {
            const raw = JSON.parse(localStorage.getItem('soma_owned') || '[]');
            return Array.isArray(raw) && raw.includes(tr.id);
        } catch (_) {
            return false;
        }
    }

    // Персональный номер коллекционного экземпляра по UID слушателя (#0017..#0998)
    function collectorSerial(trackId) {
        const uid = (typeof player !== 'undefined' && player && player.uid) ? String(player.uid) : 'guest';
        const key = `${uid}:${trackId}`;
        let h = 2166136261;
        for (let i = 0; i < key.length; i++) {
            h ^= key.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        const num = 12 + ((h >>> 0) % 986);
        return '#' + String(num).padStart(4, '0');
    }

    function priceLabel(tr) {
        if (!tr) return 'ЭФИР';
        if (tr.albumId) {
            const usd = tr.priceUsd || '$4';
            const stars = Math.max(1, Math.trunc(Number(tr.stars) || 200));
            return `${usd} · ${stars} ⭐`;
        }
        if (!tr.collectible) return 'ЭФИР';
        const usd = tr.priceUsd || '$1';
        const stars = Math.max(1, Math.trunc(Number(tr.stars) || 50));
        return `${usd} · ${stars} ⭐`;
    }

    // ===== БЕЗОПАСНЫЙ ПАРСИНГ ССЫЛОК SPOTIFY И ЯНДЕКС МУЗЫКИ ВО ВСТРОЕННЫЙ ПЛЕЕР =====
    function parseSpotifyEmbed(rawUrl) {
        const str = String(rawUrl || '').trim();
        if (!str) return null;
        try {
            const u = new URL(str);
            if (!/(^|\.)spotify\.com$/i.test(u.hostname)) return null;
            const clean = u.pathname.replace(/^\/intl-[a-z-]+\//i, '/').replace(/^\/embed\//i, '/');
            const m = clean.match(/^\/(track|album|playlist|artist)\/([A-Za-z0-9]+)/);
            if (!m) return null;
            const kind = m[1].toLowerCase();
            const id = m[2];
            return {
                service: 'spotify',
                label: 'Spotify',
                kind,
                embedUrl: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`,
                openUrl: `https://open.spotify.com/${kind}/${id}`,
                height: kind === 'track' ? 80 : 152
            };
        } catch (_) {
            return null;
        }
    }

    function parseYandexEmbed(rawUrl) {
        const str = String(rawUrl || '').trim();
        if (!str) return null;
        try {
            const u = new URL(str);
            if (!/^music\.yandex\.(ru|com|kz|by|uz)$/i.test(u.hostname)) return null;
            const p = u.pathname;
            let m = p.match(/^\/album\/(\d+)\/track\/(\d+)/);
            if (m) {
                return {
                    service: 'yandex',
                    label: 'Яндекс Музыка',
                    kind: 'track',
                    embedUrl: `https://music.yandex.ru/iframe/track/${m[2]}/${m[1]}`,
                    openUrl: `https://music.yandex.ru/album/${m[1]}/track/${m[2]}`,
                    height: 82
                };
            }
            m = p.match(/^\/iframe\/track\/(\d+)\/(\d+)/);
            if (m) {
                return {
                    service: 'yandex',
                    label: 'Яндекс Музыка',
                    kind: 'track',
                    embedUrl: `https://music.yandex.ru/iframe/track/${m[1]}/${m[2]}`,
                    openUrl: `https://music.yandex.ru/album/${m[2]}/track/${m[1]}`,
                    height: 82
                };
            }
            m = p.match(/^\/album\/(\d+)/);
            if (m) {
                return {
                    service: 'yandex',
                    label: 'Яндекс Музыка',
                    kind: 'album',
                    embedUrl: `https://music.yandex.ru/iframe/album/${m[1]}`,
                    openUrl: `https://music.yandex.ru/album/${m[1]}`,
                    height: 152
                };
            }
            m = p.match(/^\/users\/([A-Za-z0-9._-]+)\/playlists\/(\d+)/);
            if (m) {
                return {
                    service: 'yandex',
                    label: 'Яндекс Музыка',
                    kind: 'playlist',
                    embedUrl: `https://music.yandex.ru/iframe/playlist/${encodeURIComponent(m[1])}/${m[2]}`,
                    openUrl: `https://music.yandex.ru/users/${encodeURIComponent(m[1])}/playlists/${m[2]}`,
                    height: 152
                };
            }
            return null;
        } catch (_) {
            return null;
        }
    }

    function resolveStreamForTrack(tr, service) {
        const sc = getStreamingCfg();
        if (service === 'spotify') {
            return parseSpotifyEmbed((tr && tr.spotifyUrl) || sc.spotifyPlaylist || '');
        }
        if (service === 'yandex') {
            return parseYandexEmbed((tr && tr.yandexUrl) || sc.yandexPlaylist || '');
        }
        return null;
    }

    function loadPrefs() {
        try {
            const v = parseFloat(localStorage.getItem(VOL_KEY));
            if (Number.isFinite(v)) state.volume = Math.max(0, Math.min(1, v));
        } catch (_) {}
        try {
            const saved = localStorage.getItem(LAST_KEY);
            if (saved && getTracks().some(t => t.id === saved)) state.trackId = saved;
        } catch (_) {}
        const tr = currentTrack();
        if (tr) state.duration = Math.max(30, Number(tr.duration) || 180);
    }

    function savePrefs() {
        try {
            localStorage.setItem(VOL_KEY, String(Number(state.volume.toFixed(2))));
            if (state.trackId) localStorage.setItem(LAST_KEY, state.trackId);
        } catch (_) {}
    }

    function showNotice(text, ms) {
        state.notice = text || '';
        if (state.noticeTimer && typeof clearTimeout === 'function') clearTimeout(state.noticeTimer);
        updateNoticeDom();
        if (text && ms !== 0 && typeof setTimeout === 'function') {
            state.noticeTimer = setTimeout(() => {
                state.notice = '';
                updateNoticeDom();
            }, ms || 5200);
        }
    }

    // ===== АУДИО-ШИНА HI-FI RX-88 =====
    function ensureAudioGraph() {
        const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return null;
        if (!rxCtx) {
            try {
                rxCtx = new AC();
                masterGain = rxCtx.createGain();
                masterGain.gain.value = effectiveVolume();

                toneFilter = rxCtx.createBiquadFilter();
                toneFilter.type = 'lowpass';
                toneFilter.frequency.value = 3400;
                toneFilter.Q.value = 0.65;

                analyser = rxCtx.createAnalyser();
                analyser.fftSize = 128;
                analyser.smoothingTimeConstant = 0.82;
                freqBuf = new Uint8Array(analyser.frequencyBinCount);
                waveBuf = new Uint8Array(analyser.fftSize);

                toneFilter.connect(masterGain);
                masterGain.connect(analyser);
                analyser.connect(rxCtx.destination);
            } catch (_) {
                rxCtx = null;
                return null;
            }
        }
        if (rxCtx && rxCtx.state === 'suspended') {
            try { rxCtx.resume(); } catch (_) {}
        }
        return rxCtx;
    }

    function effectiveVolume() {
        return state.muted ? 0 : Math.max(0, Math.min(1, state.volume));
    }

    function applyVolume() {
        const v = effectiveVolume();
        if (masterGain && rxCtx) {
            try { masterGain.gain.setTargetAtTime(v, rxCtx.currentTime, 0.04); } catch (_) { masterGain.gain.value = v; }
        }
        if (audioEl) {
            audioEl.volume = mediaNode ? 1 : v;
            audioEl.muted = state.muted;
        }
    }

    function ensureNoiseBuffer(ctx) {
        if (noiseBuffer || !ctx) return noiseBuffer;
        try {
            const len = Math.floor(ctx.sampleRate * 1.4);
            const buf = ctx.createBuffer(1, len, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < len; i++) {
                const r = Math.random();
                // Мягкий шёлк CD-дорожки + редкие уютные микро-потрескивания иглы
                d[i] = (r * 2 - 1) * 0.16 + (r > 0.9985 ? (Math.random() * 2 - 1) * 0.85 : 0);
            }
            noiseBuffer = buf;
        } catch (_) {}
        return noiseBuffer;
    }

    function playTuningChime() {
        const ctx = ensureAudioGraph();
        if (!ctx || !toneFilter || state.muted || state.volume < 0.02) return;
        try {
            const t0 = ctx.currentTime;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(520, t0);
            o.frequency.exponentialRampToValueAtTime(390, t0 + 0.08);
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.linearRampToValueAtTime(0.035, t0 + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.095);
            o.connect(g);
            g.connect(toneFilter);
            o.start(t0);
            o.stop(t0 + 0.1);
        } catch (_) {}
    }

    function playUnlockChord() {
        const ctx = ensureAudioGraph();
        if (!ctx || !toneFilter || state.muted) return;
        try {
            const notes = [293.66, 369.99, 440.00, 554.37, 659.25];
            notes.forEach((f, idx) => {
                const t0 = ctx.currentTime + idx * 0.065;
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'triangle';
                o.frequency.setValueAtTime(f, t0);
                g.gain.setValueAtTime(0.0001, t0);
                g.gain.linearRampToValueAtTime(0.06, t0 + 0.03);
                g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
                o.connect(g);
                g.connect(toneFilter);
                o.start(t0);
                o.stop(t0 + 1.15);
            });
        } catch (_) {}
    }

    // Живой многослойный ламповый синтезатор для треков без внешнего .mp3 (или при недоступности файла)
    function scheduleSynthStep(tr, stepIdx, stepDur) {
        const ctx = ensureAudioGraph();
        if (!ctx || !toneFilter || !tr) return;
        const spec = tr.synth || {
            bpm: 66,
            padType: 'sine',
            leadType: 'triangle',
            crackle: 0.011,
            chords: [[110, 220, 261.63, 329.63, 392]],
            melody: [523.25, 493.88, 440, 392]
        };
        const t0 = ctx.currentTime + 0.02;
        const beatInBar = stepIdx % 8;
        const barIdx = Math.floor(stepIdx / 8);
        const chords = spec.chords && spec.chords.length ? spec.chords : [[110, 220, 261.63, 329.63]];
        const chord = chords[barIdx % chords.length];

        try {
            // 1) На сильной доле такта — глубокий бархатный аккорд Rhodes + аналоговый саб-бас
            if (beatInBar === 0) {
                const barDur = stepDur * 8.2;
                chord.forEach((freq, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    const isBass = i === 0;
                    o.type = isBass ? 'sine' : (spec.padType || 'sine');
                    // Едва заметное тёплое аналоговое расхождение строя (эффект живой плёнки!)
                    const detune = isBass ? 0 : ((i % 2 === 0 ? 1 : -1) * (1.4 + i * 0.45));
                    o.frequency.setValueAtTime(freq, t0 + i * 0.045);
                    if (o.detune) o.detune.setValueAtTime(detune, t0);
                    const amp = isBass ? 0.14 : (0.048 / Math.sqrt(i + 0.6));
                    g.gain.setValueAtTime(0.0001, t0 + i * 0.045);
                    g.gain.linearRampToValueAtTime(amp, t0 + i * 0.045 + 0.18);
                    g.gain.exponentialRampToValueAtTime(amp * 0.42, t0 + barDur * 0.65);
                    g.gain.exponentialRampToValueAtTime(0.0001, t0 + barDur);
                    o.connect(g);
                    g.connect(toneFilter);
                    o.start(t0 + i * 0.045);
                    o.stop(t0 + barDur + 0.05);
                });
            }

            // 2) Мягкий полуночный трип-хоп / лоу-фай пульс (на коллекционных Dubplate и в середине такта)
            if (spec.pulse && (beatInBar === 0 || beatInBar === 3 || beatInBar === 4)) {
                const ko = ctx.createOscillator();
                const kg = ctx.createGain();
                const isSnare = beatInBar === 4;
                ko.type = 'sine';
                ko.frequency.setValueAtTime(isSnare ? 148 : 92, t0);
                ko.frequency.exponentialRampToValueAtTime(isSnare ? 68 : 42, t0 + 0.16);
                kg.gain.setValueAtTime(0.0001, t0);
                kg.gain.linearRampToValueAtTime(isSnare ? 0.055 : 0.11, t0 + 0.008);
                kg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
                ko.connect(kg);
                kg.connect(toneFilter);
                ko.start(t0);
                ko.stop(t0 + 0.24);
            }

            // 3) Певучая камерная мелодия с мягким затуханием
            const mel = spec.melody || [];
            if (mel.length && (beatInBar === 0 || beatInBar === 2 || beatInBar === 5 || (beatInBar === 7 && barIdx % 2 === 1))) {
                const mIdx = (barIdx * 4 + Math.floor(beatInBar / 2)) % mel.length;
                const mf = mel[mIdx];
                if (mf) {
                    const lo = ctx.createOscillator();
                    const lg = ctx.createGain();
                    lo.type = spec.leadType || 'triangle';
                    lo.frequency.setValueAtTime(mf * 0.997, t0);
                    lo.frequency.exponentialRampToValueAtTime(mf, t0 + 0.06);
                    const noteDur = stepDur * 2.7;
                    lg.gain.setValueAtTime(0.0001, t0);
                    lg.gain.linearRampToValueAtTime(0.044, t0 + 0.035);
                    lg.gain.exponentialRampToValueAtTime(0.014, t0 + noteDur * 0.55);
                    lg.gain.exponentialRampToValueAtTime(0.0001, t0 + noteDur);
                    lo.connect(lg);
                    lg.connect(toneFilter);
                    lo.start(t0);
                    lo.stop(t0 + noteDur + 0.04);
                }
            }

            // 4) Тёплый шёпот CD-дорожки
            if (beatInBar % 2 === 0 && spec.crackle) {
                const nb = ensureNoiseBuffer(ctx);
                if (nb) {
                    const ns = ctx.createBufferSource();
                    const nf = ctx.createBiquadFilter();
                    const ng = ctx.createGain();
                    ns.buffer = nb;
                    nf.type = 'bandpass';
                    nf.frequency.value = 1950;
                    nf.Q.value = 0.8;
                    ng.gain.setValueAtTime(spec.crackle, t0);
                    ng.gain.linearRampToValueAtTime(spec.crackle * 0.85, t0 + stepDur * 2);
                    ns.connect(nf);
                    nf.connect(ng);
                    ng.connect(toneFilter);
                    ns.start(t0);
                    ns.stop(t0 + Math.min(1.35, stepDur * 2.05));
                }
            }
        } catch (_) {}
    }

    function stopSynth() {
        if (synthTimer && typeof clearInterval === 'function') {
            clearInterval(synthTimer);
            synthTimer = null;
        }
    }

    function stopHtmlAudio() {
        if (audioEl) {
            try { audioEl.pause(); } catch (_) {}
        }
    }

    function ensureAudioEl() {
        if (audioEl || typeof document === 'undefined') return audioEl;
        audioEl = document.createElement('audio');
        audioEl.preload = 'metadata';
        audioEl.crossOrigin = 'anonymous';
        audioEl.addEventListener('loadedmetadata', () => {
            const tr = currentTrack();
            if (tr && tr.audioUrl && Number.isFinite(audioEl.duration) && audioEl.duration > 1) {
                state.duration = audioEl.duration;
                updateProgressDom();
            }
        });
        audioEl.addEventListener('timeupdate', () => {
            if (!state.playing || state.dragging) return;
            const tr = currentTrack();
            if (!tr || !tr.audioUrl) return;
            state.currentTime = audioEl.currentTime || 0;
            checkPreviewGate(tr);
        });
        audioEl.addEventListener('ended', () => {
            handleTrackEnd();
        });
        audioEl.addEventListener('error', () => {
            const tr = currentTrack();
            if (state.playing && tr && tr.audioUrl) {
                // Мягкий бесшовный фолбэк на ламповый синтезатор при недоступном аудиофайле
                startSynthPlayback(tr);
            }
        });
        return audioEl;
    }

    function startSynthPlayback(tr) {
        stopSynth();
        ensureAudioGraph();
        applyVolume();
        const bpm = Math.max(46, Math.min(132, Number(tr && tr.synth && tr.synth.bpm) || 68));
        const stepDur = (60 / bpm) * 0.5; // восьмые ноты
        state.duration = Math.max(30, Number(tr && tr.duration) || 180);
        synthStep = Math.max(0, Math.floor(state.currentTime / stepDur));
        lastTickMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
        scheduleSynthStep(tr, synthStep++, stepDur);
        if (typeof setInterval === 'function') {
            synthTimer = setInterval(() => {
                if (!state.playing || state.source !== 'cd') { stopSynth(); return; }
                const cur = currentTrack();
                if (!cur) { stopPlayback(); return; }
                scheduleSynthStep(cur, synthStep++, stepDur);
            }, Math.round(stepDur * 1000));
        }
    }

    function startPlayback() {
        const tr = currentTrack();
        if (!tr) return;
        state.source = 'cd';
        const owned = isTrackOwned(tr);
        if (!owned && state.currentTime >= PREVIEW_SEC - 0.4) {
            state.currentTime = 0;
        }
        stopSynth();
        stopHtmlAudio();
        state.playing = true;
        lastTickMs = typeof performance !== 'undefined' ? performance.now() : Date.now();

        if (tr.audioUrl) {
            const el = ensureAudioEl();
            const ctx = ensureAudioGraph();
            if (el && ctx && !mediaNode && !mediaNodeFailed && typeof ctx.createMediaElementSource === 'function') {
                try {
                    mediaNode = ctx.createMediaElementSource(el);
                    mediaNode.connect(toneFilter);
                } catch (_) {
                    mediaNodeFailed = true;
                }
            }
            if (el) {
                // Загружаем локальный кэш аудио (офлайн), иначе — из сети
                loadCachedAudioThenPlay(tr, el);
            } else {
                startSynthPlayback(tr);
            }
        } else {
            startSynthPlayback(tr);
        }

        // Загружаем кэш аудио (если есть) и запускаем <audio> из него или из сети
        async function loadCachedAudioThenPlay(tr, el) {
            try {
                const blob = await getCachedAudio(tr.id);
                if (blob && typeof URL !== 'undefined' && URL.createObjectURL) {
                    if (!cachedAudioUrls[tr.id]) {
                        cachedAudioUrls[tr.id] = URL.createObjectURL(blob);
                    }
                }
            } catch (_) { /* кэш недоступен — играем из сети */ }

            const useCached = !!cachedAudioUrls[tr.id];
            if (el.dataset.trackId && el.dataset.trackId !== tr.id) revokeCachedAudioUrl(el.dataset.trackId);
            el.dataset.trackId = tr.id;
            el.src = useCached ? cachedAudioUrls[tr.id] : tr.audioUrl;
            try { el.currentTime = state.currentTime || 0; } catch (_) {}
            applyVolume();
            const p = el.play();
            if (p && typeof p.catch === 'function') {
                p.catch(() => { if (state.playing) startSynthPlayback(tr); });
            }
            // Купленный трек, проигрываемый из сети — качаем в кэш в фоне для офлайна
            if (!useCached && isTrackOwned(tr)) {
                primeAudio(tr);
            }
        }

        syncMediaSession(tr);
        syncRoomRadioState();
        renderAll();
        ensureUiLoop();
    }

    function pausePlayback() {
        state.playing = false;
        state.energy = 0;
        stopSynth();
        stopHtmlAudio();
        syncRoomRadioState();
        renderAll();
    }

    function stopPlayback() {
        pausePlayback();
        state.currentTime = 0;
        updateProgressDom();
    }

    function togglePlay() {
        if (state.playing) pausePlayback();
        else startPlayback();
    }

    function checkPreviewGate(tr) {
        if (!tr || isTrackOwned(tr)) return false;
        if (state.currentTime >= PREVIEW_SEC) {
            pausePlayback();
            state.currentTime = 0;
            updateProgressDom();
            playTuningChime();
            const what = tr.albumId ? `альбом «${tr.albumTitle}» целиком` : `«${tr.title}»`;
            showNotice(`Фрагмент 0:${PREVIEW_SEC} завершён. Заберите ${what} (${priceLabel(tr)}) навсегда в фонотеку.`, 7000);
            return true;
        }
        return false;
    }

    function handleTrackEnd() {
        const tr = currentTrack();
        if (!tr) return;
        if (state.loop) {
            state.currentTime = 0;
            startPlayback();
            return;
        }
        // Автопереход к следующей полностью доступной пластинке — чтобы атмосфера комнаты не прерывалась!
        const all = getTracks();
        const playable = all.filter(t => isTrackOwned(t));
        const pool = playable.length ? playable : all;
        const idx = pool.findIndex(t => t.id === tr.id);
        const next = pool[(idx + 1) % pool.length];
        if (next) {
            state.trackId = next.id;
            state.currentTime = 0;
            state.duration = Math.max(30, Number(next.duration) || 180);
            savePrefs();
            startPlayback();
        } else {
            stopPlayback();
        }
    }

    // ===== CD-ЛОТОК: выезд / закрытие. При смене песни лоток выезжает и закрывается =====
    function trayEl() { return typeof document !== 'undefined' ? document.getElementById('rx-cd-tray') : null; }
    function setTray(state_) {
        state.tray = state_ === 'open' ? 'open' : 'closed';
        const el = trayEl();
        if (el) el.classList.toggle('is-ejected', state.tray === 'open');
    }
    function toggleTray() {
        setTray(state.tray === 'open' ? 'closed' : 'open');
        playTuningChime();
    }
    function ejectTray() { setTray('open'); }
    function closeTray() { setTray('closed'); }
    // Механика смены диска: лоток выезжает, диск меняется, лоток закрывается
    function cycleTrayForNewDisc() {
        if (state.trayTimer) { clearTimeout(state.trayTimer); state.trayTimer = null; }
        ejectTray();
        state.trayTimer = setTimeout(() => { closeTray(); state.trayTimer = null; }, 820);
    }

    function selectTrack(id, autoPlay) {
        const tr = getTrackById(id);
        if (!tr) return;
        const changed = state.trackId !== tr.id;
        state.trackId = tr.id;
        state.notice = '';
        if (changed) {
            state.currentTime = 0;
            state.duration = Math.max(30, Number(tr.duration) || 180);
            savePrefs();
            playTuningChime();
            if (state.source === 'cd') cycleTrayForNewDisc(); // лоток выезжает и закрывается — смена диска
        }
        if (state.source !== 'cd') {
            // Если выбран Spotify/Яндекс, но у нового диска нет потока — мягко возвращаем на CD
            if (!resolveStreamForTrack(tr, state.source)) state.source = 'cd';
        }
        if (autoPlay && state.source === 'cd') {
            startPlayback();
        } else {
            if (changed && state.playing) startPlayback();
            else renderAll();
        }
    }

    function stepTrack(delta) {
        const list = visibleTracks();
        const pool = list.length ? list : getTracks();
        if (!pool.length) return;
        const cur = currentTrack();
        const idx = Math.max(0, pool.findIndex(t => cur && t.id === cur.id));
        const next = pool[(idx + delta + pool.length) % pool.length];
        if (next) selectTrack(next.id, state.playing);
    }

    function seekToRatio(ratio) {
        const tr = currentTrack();
        if (!tr) return;
        const dur = Math.max(1, state.duration || tr.duration || 180);
        const maxSec = isTrackOwned(tr) ? dur : Math.min(dur, PREVIEW_SEC);
        const target = Math.max(0, Math.min(maxSec - 0.2, clamp01Local(ratio) * dur));
        state.currentTime = target;
        if (tr.audioUrl && audioEl && audioEl.dataset.trackId === tr.id) {
            try { audioEl.currentTime = target; } catch (_) {}
        }
        lastTickMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
        updateProgressDom();
        if (!isTrackOwned(tr) && clamp01Local(ratio) * dur > PREVIEW_SEC) {
            showNotice(`До покупки доступен фрагмент 0:${PREVIEW_SEC} — полная запись (${priceLabel(tr)}) открывается навсегда.`, 4200);
        }
    }

    function clamp01Local(x) {
        return x < 0 ? 0 : x > 1 ? 1 : x;
    }

    // Точный расчёт прокрутки даже при повороте Fullscreen-сцены на ±90° на портретном смартфоне!
    function pointerRatioOnRail(ev, el) {
        if (!el || !el.getBoundingClientRect) return 0;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return 0;
        const room = typeof document !== 'undefined' && document.getElementById('station');
        const isRot = !!(state.open && room && room.classList && room.classList.contains('is-fs-active') && room.classList.contains('is-rotated'));
        if (isRot) {
            const ny = (ev.clientY - r.top) / r.height;
            const flipped = typeof roomAnim !== 'undefined' && !!roomAnim.fsFlip;
            return clamp01Local(flipped ? (1 - ny) : ny);
        }
        return clamp01Local((ev.clientX - r.left) / r.width);
    }

    function setSource(src) {
        const tr = currentTrack();
        if (src === 'cd') {
            state.source = 'cd';
            state.mountedEmbedUrl = '';
            state.notice = '';
            playTuningChime();
            renderAll();
            return;
        }
        const info = resolveStreamForTrack(tr, src);
        if (!info) {
            playTuningChime();
            const svc = src === 'spotify' ? 'Spotify' : 'Яндекс Музыке';
            if (tr && tr.collectible) {
                showNotice(`«${tr.title}» — закрытый CD-тираж: звучит напрямую с мастера NEEOSOMA // AV-88 (вне ${svc}).`, 5200);
            } else {
                showNotice(`Поток в ${svc} скоро подключится — сейчас диск играет напрямую с лампового мастера NEEOSOMA // AV-88.`, 4800);
            }
            return;
        }
        // Переключаемся на встроенный плеер стриминга прямо внутри NEEOSOMA // AV-88 (не выходя из Fullscreen!)
        if (state.playing) pausePlayback();
        state.source = src;
        state.notice = '';
        syncRoomRadioState();
        renderAll();
    }

    // ===== ПОКУПКА КОЛЛЕКЦИОННОЙ ДИСКОВ ($1 · 50 ⭐, 0% PAY-TO-WIN, БЕЗ ВЫХОДА ИЗ FULLSCREEN!) =====
    async function buyTrack(id) {
        const tr = getTrackById(id);
        if (!tr || state.buying) return;

        // АЛЬБОМ: покупка альбома раздаёт право на все его треки сразу.
        if (tr.albumId) {
            const album = getAlbums().find(a => a && a.id === tr.albumId);
            if (!album) return;
            if (isAlbumOwned(tr.albumId)) {
                selectTrack(tr.id, true);
                return;
            }
            return buyAlbum(album);
        }

        if (!tr.collectible) {
            selectTrack(tr.id, true);
            return;
        }
        if (isTrackOwned(tr)) {
            selectTrack(tr.id, true);
            return;
        }

        const stars = Math.max(1, Math.trunc(Number(tr.stars) || 50));
        const usd = tr.priceUsd || '$1';
        const serial = collectorSerial(tr.id);
        const pts = typeof isPtsMode === 'function' && isPtsMode();

        // 1) На PTS — мгновенное открытие коллекционной пластинки в 1 клик прямо в приёмнике (и в Fullscreen!)
        if (pts) {
            if (typeof grantOwnedTrack === 'function') grantOwnedTrack(tr.id);
            try { Telegram.WebApp.HapticFeedback.notificationOccurred('success'); } catch (_) {}
            playUnlockChord();
            state.trackId = tr.id;
            state.currentTime = 0;
            savePrefs();
            startPlayback();
            showNotice(`✓ PTS: CD «${tr.title}» (экз. ${serial}) навсегда в вашей фонотеке! В релизе — ${usd} (${stars} ⭐).`, 6500);
            return;
        }

        // 2) Боевая оплата в Telegram Mini App через Telegram Stars (нативное окно поверх Fullscreen!)
        const fnUrl = (typeof cfg !== 'undefined' && cfg && cfg.STARS_FUNCTION_URL) || '';
        const tg = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp;
        const inTg = !!(tg && typeof tg.initData === 'string' && tg.initData.length > 0 && typeof tg.openInvoice === 'function');

        if (fnUrl && inTg) {
            state.buying = tr.id;
            showNotice(`Подготовка коллекционного конверта (${usd} · ${stars} ⭐)...`, 0);
            renderAll();
            try {
                const res = await fetch(fnUrl.replace(/\/$/, '') + '/create-invoice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        itemId: tr.id,
                        uid: (typeof player !== 'undefined' && player && player.uid) || '',
                        initData: tg.initData
                    })
                });
                const data = await res.json();
                if (!res.ok || !data || !data.invoiceUrl) {
                    throw new Error((data && data.error) || 'Счёт временно недоступен');
                }
                tg.openInvoice(data.invoiceUrl, async status => {
                    state.buying = '';
                    if (status === 'paid') {
                        if (typeof grantOwnedTrack === 'function') grantOwnedTrack(tr.id);
                        try {
                            if (typeof supabaseClient !== 'undefined' && supabaseClient && typeof player !== 'undefined' && player.uid) {
                                const { data: row } = await supabaseClient.from('soma_users').select('owned_cosmetics').eq('username', player.uid).single();
                                if (row && typeof hydrateCosmeticsFromCloud === 'function') hydrateCosmeticsFromCloud(row);
                            }
                        } catch (_) {}
                        try { tg.HapticFeedback.notificationOccurred('success'); } catch (_) {}
                        playUnlockChord();
                        state.trackId = tr.id;
                        state.currentTime = 0;
                        savePrefs();
                        startPlayback();
                        showNotice(`✦ «${tr.title}» (экз. ${serial}) навсегда в вашей коллекции! Приятного прослушивания.`, 7000);
                    } else if (status === 'cancelled') {
                        showNotice('Покупка отменена — вы всегда можете послушать фрагмент 0:30.', 4200);
                        renderAll();
                    } else {
                        showNotice('Оплата не завершилась. Попробуйте ещё раз чуть позже.', 5000);
                        renderAll();
                    }
                });
            } catch (e) {
                state.buying = '';
                showNotice('Касса временно недоступна: ' + ((e && e.message) || 'ошибка связи'), 5500);
                renderAll();
            }
            return;
        }

        // 3) Опциональная прямая ссылка автора (Bandcamp / Tribute / Boosty) для обычного браузера
        if (tr.buyUrl && /^https:\/\//i.test(String(tr.buyUrl).trim())) {
            try { window.open(String(tr.buyUrl).trim(), '_blank', 'noopener,noreferrer'); } catch (_) {}
            showNotice(`Открыта страница коллекционного релиза «${tr.title}» (${usd}).`, 5200);
            return;
        }

        // 4) Честное прослушивание 30-секундного фрагмента, если открыто вне Telegram или до подключения кассы
        state.trackId = tr.id;
        state.currentTime = 0;
        startPlayback();
        showNotice(
            !fnUrl
                ? `Звучит фрагмент 0:${PREVIEW_SEC}. Касса коллекционного CD (${usd} · ${stars} ⭐) подключается.`
                : `Звучит фрагмент 0:${PREVIEW_SEC}. Покупка навсегда (${usd} · ${stars} ⭐) доступна в Telegram Mini App.`,
            6200
        );
    }

    // ===== ПОКУПКА АЛЬБОМА ($4 · 200 ⭐): право на прослушивание всех его треков, не владение файлом =====
    async function buyAlbum(album) {
        if (!album || state.buying) return;
        const stars = Math.max(1, Math.trunc(Number(album.stars) || 200));
        const usd = album.priceUsd || '$4';
        const serial = collectorSerial(album.id);
        const pts = typeof isPtsMode === 'function' && isPtsMode();

        // 1) PTS — мгновенное открытие альбома в 1 клик
        if (pts) {
            if (typeof grantOwnedTrack === 'function') grantOwnedTrack(album.id);
            try { Telegram.WebApp.HapticFeedback.notificationOccurred('success'); } catch (_) {}
            playUnlockChord();
            const firstTrack = albumTracks().find(t => t.albumId === album.id);
            state.trackId = firstTrack ? firstTrack.id : '';
            state.currentTime = 0;
            savePrefs();
            primeAlbumAudio(album);
            startPlayback();
            showNotice(`✓ PTS: альбом «${album.title}» (${album.tracks.length} треков, экз. ${serial}) навсегда в вашей фонотеке! В релизе — ${usd} (${stars} ⭐).`, 7000);
            return;
        }

        // 2) Оплата через Telegram Stars
        const fnUrl = (typeof cfg !== 'undefined' && cfg && cfg.STARS_FUNCTION_URL) || '';
        const tg = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp;
        const inTg = !!(tg && typeof tg.initData === 'string' && tg.initData.length > 0 && typeof tg.openInvoice === 'function');

        if (fnUrl && inTg) {
            state.buying = album.id;
            showNotice(`Подготовка конверта альбома «${album.title}» (${usd} · ${stars} ⭐)...`, 0);
            renderAll();
            try {
                const res = await fetch(fnUrl.replace(/\/$/, '') + '/create-invoice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        itemId: album.id,
                        uid: (typeof player !== 'undefined' && player && player.uid) || '',
                        initData: tg.initData
                    })
                });
                const data = await res.json();
                if (!res.ok || !data || !data.invoiceUrl) {
                    throw new Error((data && data.error) || 'Счёт временно недоступен');
                }
                tg.openInvoice(data.invoiceUrl, async status => {
                    state.buying = '';
                    if (status === 'paid') {
                        if (typeof grantOwnedTrack === 'function') grantOwnedTrack(album.id);
                        try {
                            if (typeof supabaseClient !== 'undefined' && supabaseClient && typeof player !== 'undefined' && player.uid) {
                                const { data: row } = await supabaseClient.from('soma_users').select('owned_cosmetics').eq('username', player.uid).single();
                                if (row && typeof hydrateCosmeticsFromCloud === 'function') hydrateCosmeticsFromCloud(row);
                            }
                        } catch (_) {}
                        try { tg.HapticFeedback.notificationOccurred('success'); } catch (_) {}
                        playUnlockChord();
                        // Прайм аудио альбома в локальный кэш (офлайн)
                        primeAlbumAudio(album);
                        const firstTrack = albumTracks().find(t => t.albumId === album.id);
                        if (firstTrack) {
                            state.trackId = firstTrack.id;
                            state.currentTime = 0;
                            savePrefs();
                            startPlayback();
                        }
                        showNotice(`✦ Альбом «${album.title}» (${album.tracks.length} треков, экз. ${serial}) навсегда в вашей фонотеке! Приятного прослушивания.`, 7000);
                    } else if (status === 'cancelled') {
                        showNotice('Покупка отменена — вы всегда можете послушать фрагмент 0:30.', 4200);
                        renderAll();
                    } else {
                        showNotice('Оплата не завершилась. Попробуйте ещё раз чуть позже.', 5000);
                        renderAll();
                    }
                });
            } catch (e) {
                state.buying = '';
                showNotice('Касса временно недоступна: ' + ((e && e.message) || 'ошибка связи'), 5500);
                renderAll();
            }
            return;
        }

        // 3) Внешняя ссылка автора (Bandcamp / Tribute / Boosty) для обычного браузера
        if (album.buyUrl && /^https:\/\//i.test(String(album.buyUrl).trim())) {
            try { window.open(String(album.buyUrl).trim(), '_blank', 'noopener', 'noreferrer'); } catch (_) {}
            showNotice(`Открыта страница коллекционного релиза альбома «${album.title}» (${usd}).`, 5200);
            return;
        }

        // 4) Честное прослушивание фрагмента, если открыто вне Telegram или до подключения кассы
        const firstTrack = albumTracks().find(t => t.albumId === album.id);
        if (firstTrack) {
            state.trackId = firstTrack.id;
            state.currentTime = 0;
            startPlayback();
        }
        showNotice(
            !fnUrl
                ? `Звучит фрагмент 0:${PREVIEW_SEC}. Касса альбома (${usd} · ${stars} ⭐) подключается.`
                : `Звучит фрагмент 0:${PREVIEW_SEC}. Покупка альбома навсегда (${usd} · ${stars} ⭐) доступна в Telegram Mini App.`,
            6200
        );
    }

    function syncMediaSession(tr) {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !tr) return;
        try {
            if (typeof MediaMetadata === 'function') {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: tr.title,
                    artist: tr.subtitle || 'AV-88 Hi-Fi',
                    album: 'NEEOSOMA // AV-88'
                });
            }
            navigator.mediaSession.setActionHandler('play', () => startPlayback());
            navigator.mediaSession.setActionHandler('pause', () => pausePlayback());
            navigator.mediaSession.setActionHandler('previoustrack', () => stepTrack(-1));
            navigator.mediaSession.setActionHandler('nexttrack', () => stepTrack(1));
        } catch (_) {}
    }

    function syncRoomRadioState() {
        if (typeof document === 'undefined') return;
        const room = document.getElementById('station');
        if (room && room.dataset) {
            room.dataset.radio = isAudioActive() ? 'on' : 'off';
        }
        syncMiniPlayers();
        if (typeof ensureStationLoop === 'function') ensureStationLoop();
    }

    function isAudioActive() {
        return !!(state.playing || (state.source !== 'cd' && resolveStreamForTrack(currentTrack(), state.source)));
    }

    function isSceneFullscreen() {
        if (typeof roomAnim !== 'undefined' && roomAnim && roomAnim.isFullscreen && !roomAnim.fsClosing) return true;
        if (typeof document !== 'undefined') {
            const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
            const room = document.getElementById('station');
            if (fsEl && room && (fsEl === room || room.contains(fsEl))) return true;
        }
        return false;
    }

    // ===== DOM КОНСОЛИ SOMA // RX-88 + МИНИ-ПИЛЮЛИ В FULLSCREEN И ПРОФИЛЕ =====
    function ensureDom() {
        if (typeof document === 'undefined' || !document.body) return null;
        let ov = document.getElementById('rx-overlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'rx-overlay';
            ov.className = 'rx-overlay hidden';
            ov.setAttribute('role', 'dialog');
            ov.setAttribute('aria-modal', 'true');
            ov.setAttribute('aria-label', 'Ламповый приёмник NEEOSOMA AV-88');
            ov.innerHTML = `
                <div class="rx-chassis soma-modal-chassis" id="rx-chassis">
                    <div class="rx-head">
                        <div class="rx-head-top">
                            <div class="rx-brand">
                                <span class="rx-pilot" aria-hidden="true"></span>
                                <span class="rx-model">NEEOSOMA // AV-88</span>
                            </div>
                            <div class="rx-head-right">
                                <span class="rx-stereo-lamp" aria-hidden="true">STEREO</span>
                                <span class="rx-freq-readout" id="rx-freq">88.4 FM</span>
                                <button type="button" class="rx-close-btn" id="rx-close" title="Свернуть приёмник (музыка продолжит играть)" aria-label="Свернуть приёмник">✕</button>
                            </div>
                        </div>
                        <div class="rx-dial" aria-hidden="true">
                            <span>88</span><span>92</span><span>96</span><span>100</span><span>104</span><span>108 MHz</span>
                            <div class="rx-dial-needle" id="rx-needle"></div>
                        </div>
                    </div>

                    <div class="rx-body">
                        <div class="rx-stage">
                            <div class="rx-deck-row">
                                <div class="rx-cd-deck" id="rx-cd-tap" title="Пуск / Пауза">
                                    <div class="rx-cd-slot" aria-hidden="true"></div>
                                    <div class="rx-cd-tray" id="rx-cd-tray">
                                        <div class="rx-cd" id="rx-cd">
                                            <div class="rx-cd-spin">
                                                <div class="rx-cd-shine" aria-hidden="true"></div>
                                                <div class="rx-cd-label" id="rx-label"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" class="rx-cd-eject" id="rx-cd-eject" title="Открыть лоток" aria-label="Открыть лоток">⏏</button>
                                </div>
                                <div class="rx-meta">
                                    <div class="rx-kicker-row" id="rx-badges"></div>
                                    <div class="rx-title" id="rx-title">—</div>
                                    <div class="rx-subtitle" id="rx-subtitle">—</div>
                                    <div class="rx-note" id="rx-note"></div>
                                </div>
                            </div>

                            <div class="rx-scope-box" id="rx-scope-box">
                                <canvas class="rx-scope" id="rx-scope" width="320" height="44" aria-hidden="true"></canvas>
                                <div class="rx-scrub-wrap">
                                    <span class="rx-time" id="rx-time-cur">0:00</span>
                                    <div class="rx-scrub" id="rx-scrub" role="slider" aria-label="Позиция на пластинке" tabindex="0">
                                        <div class="rx-scrub-rail">
                                            <div class="rx-scrub-fill" id="rx-scrub-fill"></div>
                                            <div class="rx-scrub-gate hidden" id="rx-scrub-gate" title="Граница бесплатного фрагмента 0:30"></div>
                                        </div>
                                    </div>
                                    <span class="rx-time rx-time--end" id="rx-time-dur">0:00</span>
                                </div>
                            </div>

                            <div class="rx-embed-drawer hidden" id="rx-embed-drawer">
                                <iframe class="rx-embed-frame" id="rx-embed-frame" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Потоковый плеер"></iframe>
                                <div class="rx-embed-foot">
                                    <span id="rx-embed-label">ПОТОК</span>
                                    <a class="rx-embed-link" id="rx-embed-link" href="#" target="_blank" rel="noopener noreferrer">ОТКРЫТЬ В ПРИЛОЖЕНИИ ↗</a>
                                </div>
                            </div>

                            <div class="rx-controls" id="rx-controls">
                                <div class="rx-transport">
                                    <button type="button" class="rx-btn" id="rx-prev" aria-label="Предыдущий диск" title="Предыдущая">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/></svg>
                                    </button>
                                    <button type="button" class="rx-btn rx-btn--play" id="rx-play" aria-label="Воспроизвести или поставить на паузу">
                                        <svg id="rx-play-ico" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                    </button>
                                    <button type="button" class="rx-btn" id="rx-next" aria-label="Следующий диск" title="Следующая">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2V6zM6 18l8.5-6L6 6v12z"/></svg>
                                    </button>
                                    <button type="button" class="rx-btn" id="rx-loop" aria-pressed="false" aria-label="Повтор пластинки" title="Повтор пластинки">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                                    </button>
                                </div>
                                <div class="rx-vol">
                                    <button type="button" class="rx-vol-btn" id="rx-mute" aria-label="Приглушить звук">
                                        <svg id="rx-vol-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>
                                    </button>
                                    <input type="range" class="rx-vol-slider" id="rx-vol" min="0" max="100" value="72" aria-label="Громкость приёмника">
                                </div>
                            </div>

                            <div class="rx-collect-bar hidden" id="rx-collect-bar">
                                <div class="rx-collect-copy">
                                    <span id="rx-collect-title">✦ КОЛЛЕКЦИОННЫЙ CD-ТИРАЖ</span>
                                    <small id="rx-collect-sub">Фрагмент 0:30 бесплатно · навсегда в фонотеке</small>
                                </div>
                                <button type="button" class="rx-buy-btn" id="rx-buy-btn">ЗАБРАТЬ · $1</button>
                            </div>

                            <div class="rx-notice hidden" id="rx-notice"></div>
                        </div>

                        <div class="rx-crate">
                            <div class="rx-shelf-bar">
                                <div class="rx-tabs" role="tablist" aria-label="Разделы фонотеки">
                                    <button type="button" class="rx-tab" data-rx-tab="all" aria-pressed="true">ВСЕ</button>
                                    <button type="button" class="rx-tab" data-rx-tab="radio" aria-pressed="false">ЭФИР</button>
                                    <button type="button" class="rx-tab rx-tab--gold" data-rx-tab="collect" aria-pressed="false">✦ CD</button>
                                    <button type="button" class="rx-tab" data-rx-tab="owned" aria-pressed="false" id="rx-tab-owned">МОИ</button>
                                </div>
                                <div class="rx-sources" aria-label="Источник звука">
                                    <button type="button" class="rx-src-chip" data-rx-src="cd" aria-pressed="true" title="CD-ROM приёмник NEEOSOMA AV-88">◉ CD</button>
                                    <button type="button" class="rx-src-chip rx-src-chip--spotify" data-rx-src="spotify" aria-pressed="false" title="Слушать через Spotify">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.58 14.42a.62.62 0 0 1-.86.2c-2.35-1.43-5.3-1.76-8.79-.96a.62.62 0 0 1-.27-1.21c3.82-.88 7.09-.5 9.72 1.11.3.18.39.57.2.86zm1.22-2.72a.78.78 0 0 1-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 1 1-.45-1.49c3.64-1.1 8.15-.57 11.23 1.33.37.22.49.7.26 1.07zm.1-2.83C14.68 8.96 9.36 8.78 6.28 9.72a.93.93 0 1 1-.54-1.78c3.54-1.08 9.42-.87 13.13 1.33a.93.93 0 0 1-.96 1.6z"/></svg>
                                        <span>SPOTIFY</span>
                                    </button>
                                    <button type="button" class="rx-src-chip rx-src-chip--yandex" data-rx-src="yandex" aria-pressed="false" title="Слушать через Яндекс Музыку">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14.8 6.5h-2.1c-2.2 0-3.7 1.3-3.7 3.4 0 1.5.7 2.5 2.1 3.1l-2.4 4.5h1.9l2.2-4.2h.5v4.2h1.7V6.5h-.2zm-1.5 5.1h-.6c-1.2 0-2-.7-2-1.8 0-1.2.8-1.9 2-1.9h.6v3.7z"/></svg>
                                        <span>Я.МУЗЫКА</span>
                                    </button>
                                </div>
                            </div>
                            <div class="rx-list" id="rx-list" role="listbox" aria-label="Список пластинок"></div>
                        </div>
                    </div>
                </div>
            `;
        document.body.appendChild(ov);
        if (typeof window !== 'undefined' && typeof window.bindSomaSceneScroll === 'function') {
            window.bindSomaSceneScroll(ov.querySelector('#rx-list'));
            window.bindSomaSceneScroll(ov.querySelector('.rx-stage'));
        }
            wireEvents(ov);
        }

        // Мини-пилюля живого эфира внутри Fullscreen (#station-scene) — управление музыкой без выхода из Fullscreen!
        const scene = document.getElementById('station-scene');
        if (scene && !document.getElementById('station-rx-pill')) {
            const pill = document.createElement('div');
            pill.id = 'station-rx-pill';
            pill.className = 'rx-fs-pill';
            pill.innerHTML = `
                <span class="rx-fs-pill-disc" aria-hidden="true"></span>
                <button type="button" class="rx-fs-pill-open" id="rx-fs-pill-open" title="Открыть приёмник NEEOSOMA AV-88">AV-88</button>
                <button type="button" class="rx-fs-pill-toggle" id="rx-fs-pill-toggle" aria-label="Пауза или воспроизведение">❚❚</button>
            `;
            pill.addEventListener('click', e => e.stopPropagation());
            scene.appendChild(pill);
            const openBtn = pill.querySelector('#rx-fs-pill-open');
            const togBtn = pill.querySelector('#rx-fs-pill-toggle');
            if (openBtn) openBtn.addEventListener('click', e => { e.stopPropagation(); openReceiver(); });
            if (togBtn) togBtn.addEventListener('click', e => {
                e.stopPropagation();
                if (state.source !== 'cd') openReceiver();
                else togglePlay();
            });
        }

        // Компактная полоска «В ЭФИРЕ RX-88» в журнале станции (когда музыка играет вне Fullscreen)
        const log = document.querySelector('#station .station-log');
        if (log && !document.getElementById('station-rx-inline')) {
            const bar = document.createElement('div');
            bar.id = 'station-rx-inline';
            bar.className = 'rx-inline-bar hidden';
            bar.innerHTML = `
                <button type="button" class="rx-inline-open" id="rx-inline-open">
                    <span class="rx-eq" aria-hidden="true"><i></i><i></i><i></i></span>
                    <span class="rx-inline-title" id="rx-inline-title">AV-88</span>
                </button>
                <div class="rx-inline-actions">
                    <button type="button" class="rx-inline-btn" id="rx-inline-toggle">ПАУЗА</button>
                    <button type="button" class="rx-inline-btn" id="rx-inline-show">ФОНОТЕКА</button>
                </div>
            `;
            log.insertBefore(bar, log.firstChild);
            bar.querySelector('#rx-inline-open').addEventListener('click', () => openReceiver());
            bar.querySelector('#rx-inline-show').addEventListener('click', () => openReceiver());
            bar.querySelector('#rx-inline-toggle').addEventListener('click', () => {
                if (state.source !== 'cd') openReceiver();
                else togglePlay();
            });
        }

        return ov;
    }

    function wireEvents(ov) {
        // Клик по затемнённому фону сворачивает деку, оставляя и музыку, и Fullscreen нетронутыми!
        ov.addEventListener('click', e => {
            e.stopPropagation();
            if (e.target === ov) closeReceiver();
        });
        const ch = ov.querySelector('#rx-chassis');
        if (ch) ch.addEventListener('click', e => e.stopPropagation());

        ov.querySelector('#rx-close').addEventListener('click', () => closeReceiver());
        ov.querySelector('#rx-play').addEventListener('click', () => togglePlay());
        ov.querySelector('#rx-cd-tap').addEventListener('click', () => togglePlay());
        ov.querySelector('#rx-cd-eject').addEventListener('click', e => { e.stopPropagation(); toggleTray(); });
        ov.querySelector('#rx-prev').addEventListener('click', () => stepTrack(-1));
        ov.querySelector('#rx-next').addEventListener('click', () => stepTrack(1));
        ov.querySelector('#rx-loop').addEventListener('click', () => {
            state.loop = !state.loop;
            playTuningChime();
            renderAll();
        });
        ov.querySelector('#rx-mute').addEventListener('click', () => {
            state.muted = !state.muted;
            applyVolume();
            renderAll();
        });
        const volEl = ov.querySelector('#rx-vol');
        volEl.addEventListener('input', () => {
            state.volume = Math.max(0, Math.min(1, Number(volEl.value) / 100));
            if (state.volume > 0 && state.muted) state.muted = false;
            applyVolume();
            savePrefs();
            updateVolumeDom();
        });
        ov.querySelector('#rx-buy-btn').addEventListener('click', () => {
            const tr = currentTrack();
            if (tr && (tr.collectible || tr.albumId)) buyTrack(tr.id);
        });

        ov.querySelectorAll('[data-rx-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                state.tab = btn.dataset.rxTab || 'all';
                renderAll();
            });
        });

        ov.querySelectorAll('[data-rx-src]').forEach(btn => {
            btn.addEventListener('click', () => setSource(btn.dataset.rxSrc || 'cd'));
        });

        // Тактильная прокрутка по дорожке пластинки (поддерживает и мышь, и тач, и повёрнутый ±90° Fullscreen!)
        const scrub = ov.querySelector('#rx-scrub');
        const onScrubStart = ev => {
            ev.stopPropagation();
            state.dragging = true;
            const pt = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
            seekToRatio(pointerRatioOnRail(pt, scrub));
        };
        const onScrubMove = ev => {
            if (!state.dragging) return;
            const pt = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
            seekToRatio(pointerRatioOnRail(pt, scrub));
        };
        const onScrubEnd = () => { state.dragging = false; };
        scrub.addEventListener('pointerdown', ev => {
            onScrubStart(ev);
            try { scrub.setPointerCapture(ev.pointerId); } catch (_) {}
        });
        scrub.addEventListener('pointermove', onScrubMove);
        scrub.addEventListener('pointerup', onScrubEnd);
        scrub.addEventListener('pointercancel', onScrubEnd);
        scrub.addEventListener('click', ev => {
            ev.stopPropagation();
            seekToRatio(pointerRatioOnRail(ev, scrub));
        });

        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
            document.addEventListener('keydown', ev => {
                if (ev.key === 'Escape' && state.open && !isSceneFullscreen()) {
                    ev.preventDefault();
                    closeReceiver();
                }
            });
        }
    }

    // Бесшовное переподключение деки между #station-scene (в Fullscreen!) и document.body (в профиле)
    function syncMount() {
        if (typeof document === 'undefined') return;
        const ov = document.getElementById('rx-overlay');
        if (!ov) { syncMiniPlayers(); return; }
        const inFs = isSceneFullscreen();
        const scene = document.getElementById('station-scene');
        const target = (inFs && scene) ? scene : document.body;
        if (target && ov.parentElement !== target) {
            target.appendChild(ov);
        }
        ov.classList.toggle('is-in-scene', !!(inFs && scene));
        syncMiniPlayers();
    }

    function openReceiver(trackId) {
        loadOnce();
        const ov = ensureDom();
        if (!ov) return;
        if (trackId) selectTrack(trackId, false);
        state.open = true;
        syncMount();
        if (typeof _somaKbBind === 'function') _somaKbBind(ov);
        ov.classList.remove('hidden');
        if (typeof _somaKbUpdate === 'function') _somaKbUpdate(ov);
        playTuningChime();
        if (typeof roomAnim !== 'undefined' && roomAnim && roomAnim.isFullscreen && typeof bumpFullscreenHud === 'function') {
            bumpFullscreenHud();
        }
        renderAll();
        ensureUiLoop();
    }

    function closeReceiver() {
        state.open = false;
        if (state.trayTimer) { clearTimeout(state.trayTimer); state.trayTimer = null; }
        setTray('closed');
        // Очистка object URL аудиокэша (free память); текущий трек остаётся (звук продолжается)
        const cur = currentTrack();
        clearAudioCacheUrls(cur ? cur.id : undefined);
        const ov = typeof document !== 'undefined' && document.getElementById('rx-overlay');
        if (ov) {
            ov.classList.add('hidden');
            ov.classList.remove('is-kb-open');
            if (ov.__somaKbOff) { ov.__somaKbOff(); ov.__somaKbOff = null; ov.__somaKbBound = false; }
        }
        syncMiniPlayers();
        if (state.playing && typeof roomAnim !== 'undefined' && roomAnim && roomAnim.isFullscreen && typeof showFullscreenCaption === 'function') {
            const tr = currentTrack();
            if (tr) showFullscreenCaption(`♪ В эфире: «${tr.title}» · ${tr.freq || '88.4'} FM`);
        }
        if (typeof window !== 'undefined' && typeof window.restoreSomaScroll === 'function') {
            window.restoreSomaScroll();
        }
    }

    function visibleTracks() {
        const all = getTracks();
        // Альбомные диски — платный товар (через альбом целиком), не «свободный эфир»
        if (state.tab === 'radio') return all.filter(t => !t.collectible && !t.albumId);
        if (state.tab === 'collect') return all.filter(t => !!(t.collectible || t.albumId));
        if (state.tab === 'owned') return all.filter(t => isTrackOwned(t));
        return all;
    }

    function updateNoticeDom() {
        const el = typeof document !== 'undefined' && document.getElementById('rx-notice');
        if (!el) return;
        el.textContent = state.notice || '';
        el.classList.toggle('hidden', !state.notice);
    }

    function updateVolumeDom() {
        if (typeof document === 'undefined') return;
        const volEl = document.getElementById('rx-vol');
        const ico = document.getElementById('rx-vol-ico');
        const eff = effectiveVolume();
        if (volEl && document.activeElement !== volEl) volEl.value = String(Math.round(eff * 100));
        if (ico) {
            ico.innerHTML = eff < 0.01
                ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
                : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>';
        }
    }

    function updateProgressDom() {
        if (typeof document === 'undefined') return;
        const tr = currentTrack();
        const dur = Math.max(1, state.duration || (tr && tr.duration) || 180);
        const cur = Math.max(0, Math.min(dur, state.currentTime || 0));
        const curEl = document.getElementById('rx-time-cur');
        const durEl = document.getElementById('rx-time-dur');
        const fillEl = document.getElementById('rx-scrub-fill');
        const gateEl = document.getElementById('rx-scrub-gate');
        if (curEl) curEl.textContent = fmtTime(cur);
        if (durEl) durEl.textContent = fmtTime(dur);
        if (fillEl) fillEl.style.width = `${((cur / dur) * 100).toFixed(2)}%`;
        if (gateEl) {
            const locked = !!(tr && (tr.collectible || tr.albumId) && !isTrackOwned(tr) && dur > PREVIEW_SEC);
            gateEl.classList.toggle('hidden', !locked);
            if (locked) {
                gateEl.style.left = `${((PREVIEW_SEC / dur) * 100).toFixed(2)}%`;
                const colSub = document.getElementById('rx-collect-sub');
                if (colSub && state.playing && state.source === 'cd') {
                    const left = Math.max(0, Math.ceil(PREVIEW_SEC - cur));
                    colSub.textContent = `♪ Звучит фрагмент · ещё ${fmtTime(left)}` +
                        (tr.albumId ? ' · альбом целиком' : ` · экз. ${collectorSerial(tr.id)}`);
                }
            }
        }
    }

    function syncMiniPlayers() {
        if (typeof document === 'undefined') return;
        const tr = currentTrack();
        const active = isAudioActive();
        const inFs = isSceneFullscreen();

        const pill = document.getElementById('station-rx-pill');
        if (pill) {
            const showPill = !!(inFs && !state.open && active && tr);
            pill.classList.toggle('is-visible', showPill);
            pill.classList.toggle('is-playing', !!state.playing);
            const openBtn = pill.querySelector('#rx-fs-pill-open');
            const togBtn = pill.querySelector('#rx-fs-pill-toggle');
            if (openBtn && tr) openBtn.textContent = `${tr.freq || '88.4'} · ${tr.title}`;
            if (togBtn) togBtn.textContent = state.playing ? '❚❚' : '▶';
        }

        const inlineBar = document.getElementById('station-rx-inline');
        if (inlineBar) {
            const showInline = !!(!inFs && !state.open && active && tr);
            inlineBar.classList.toggle('hidden', !showInline);
            const tEl = inlineBar.querySelector('#rx-inline-title');
            const bEl = inlineBar.querySelector('#rx-inline-toggle');
            if (tEl && tr) tEl.textContent = `${tr.freq || '88.4'} FM · ${tr.title}`;
            if (bEl) bEl.textContent = state.playing ? 'ПАУЗА' : 'ПУСК';
        }
    }

    function renderAll() {
        if (typeof document === 'undefined') return;
        syncMiniPlayers();
        const ov = document.getElementById('rx-overlay');
        if (!ov) return;
        const ch = ov.querySelector('#rx-chassis');
        const tr = currentTrack();
        if (!tr || !ch) return;

        const owned = isTrackOwned(tr);
        const pts = typeof isPtsMode === 'function' && isPtsMode();
        const accent = tr.accent || '#ff6b7d';
        const glow = tr.glow || '#c81e3e';
        ov.style.setProperty('--rx-accent', accent);
        ov.style.setProperty('--rx-glow', glow);
        ov.style.setProperty('--rx-accent-rgb', hexToRgbTriplet(accent, '255, 107, 125'));
        ov.style.setProperty('--rx-glow-rgb', hexToRgbTriplet(glow, '200, 30, 62'));
        ch.classList.toggle('is-playing', isAudioActive());
        ch.classList.toggle('is-spinning', !!(state.playing && state.source === 'cd'));
        const cdSpin = ov.querySelector('#rx-cd');
        if (cdSpin) cdSpin.classList.toggle('is-spinning', !!(state.playing && state.source === 'cd'));

        // FM-шкала и ламповая стрелка настройки (88.0 .. 108.0 MHz)
        const freqNum = Math.max(88, Math.min(108, parseFloat(tr.freq) || 88.4));
        const freqEl = ov.querySelector('#rx-freq');
        const needle = ov.querySelector('#rx-needle');
        if (freqEl) freqEl.textContent = `${freqNum.toFixed(1)} FM`;
        if (needle) {
            const pct = 5 + ((freqNum - 88) / 20) * 90;
            needle.style.left = `${pct.toFixed(1)}%`;
        }

        // CD-диск и обложка
        const cd = ov.querySelector('#rx-cd');
        const label = ov.querySelector('#rx-label');
        if (cd) cd.dataset.wax = tr.wax || 'obsidian';
        if (label) {
            label.style.backgroundImage = tr.coverUrl
                ? `url("${String(tr.coverUrl).replace(/["\\]/g, '')}")`
                : `radial-gradient(circle at 35% 30%, ${accent}, ${glow} 88%)`;
        }

        // Бейджи статуса пластинки
        const badges = ov.querySelector('#rx-badges');
        if (badges) {
            if (tr.albumId) {
                badges.innerHTML = owned
                    ? `<span class="rx-badge rx-badge--owned">✦ Альбом · ${escHtml(tr.albumTitle || '')}</span>`
                    : `<span class="rx-badge rx-badge--gold">✦ Альбом · ${escHtml(tr.albumTitle || '')}</span><span class="rx-badge">ПРЕВЬЮ 0:${PREVIEW_SEC}</span>`;
            } else if (!tr.collectible) {
                badges.innerHTML = `<span class="rx-badge">СВОБОДНЫЙ ЭФИР</span>`;
            } else if (owned) {
                badges.innerHTML = `<span class="rx-badge rx-badge--owned">✦ В КОЛЛЕКЦИИ · ЭКЗ. ${escHtml(collectorSerial(tr.id))}</span>`;
            } else {
                badges.innerHTML = `<span class="rx-badge rx-badge--gold">✦ ${escHtml(tr.edition || 'КОЛЛЕКЦИОННЫЙ CD')}</span><span class="rx-badge">ПРЕВЬЮ 0:${PREVIEW_SEC}</span>`;
            }
        }

        ov.querySelector('#rx-title').textContent = tr.title;
        ov.querySelector('#rx-subtitle').textContent = tr.subtitle || '';
        ov.querySelector('#rx-note').textContent = tr.note || '';

        // Кнопки транспорта
        const playIco = ov.querySelector('#rx-play-ico');
        if (playIco) {
            playIco.innerHTML = state.playing
                ? '<path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/>'
                : '<path d="M8 5v14l11-7z"/>';
        }
        ov.querySelector('#rx-loop').setAttribute('aria-pressed', String(!!state.loop));
        updateVolumeDom();
        updateProgressDom();

        // Переключение между CD-лотом и встроенным плеером Spotify / Яндекс Музыки
        const streamInfo = state.source !== 'cd' ? resolveStreamForTrack(tr, state.source) : null;
        const scopeBox = ov.querySelector('#rx-scope-box');
        const ctrlBox = ov.querySelector('#rx-controls');
        const embedDrawer = ov.querySelector('#rx-embed-drawer');
        const embedFrame = ov.querySelector('#rx-embed-frame');
        const embedLabel = ov.querySelector('#rx-embed-label');
        const embedLink = ov.querySelector('#rx-embed-link');
        if (streamInfo) {
            scopeBox.classList.add('hidden');
            ctrlBox.classList.add('hidden');
            embedDrawer.classList.remove('hidden');
            embedFrame.style.height = `${streamInfo.height || 82}px`;
            if (state.mountedEmbedUrl !== streamInfo.embedUrl) {
                state.mountedEmbedUrl = streamInfo.embedUrl;
                embedFrame.src = streamInfo.embedUrl;
            }
            if (embedLabel) embedLabel.textContent = `ПОТОК // ${streamInfo.label.toUpperCase()}`;
            if (embedLink) embedLink.href = streamInfo.openUrl;
        } else {
            scopeBox.classList.remove('hidden');
            ctrlBox.classList.remove('hidden');
            embedDrawer.classList.add('hidden');
            if (state.mountedEmbedUrl) {
                state.mountedEmbedUrl = '';
                embedFrame.removeAttribute('src');
            }
        }

        // Коллекционная плашка покупки ($1 · 50 ⭐ для трека, $4 · 200 ⭐ для альбома)
        const colBar = ov.querySelector('#rx-collect-bar');
        const buyBtn = ov.querySelector('#rx-buy-btn');
        const colSub = ov.querySelector('#rx-collect-sub');
        const showBuy = !!((tr.collectible || tr.albumId) && !owned);
        colBar.classList.toggle('hidden', !showBuy);
        if (showBuy && buyBtn) {
            const busy = state.buying === tr.id || state.buying === tr.albumId;
            buyBtn.disabled = busy;
            buyBtn.textContent = busy
                ? 'СЧЁТ...'
                : (pts ? `ЗАБРАТЬ · ${priceLabel(tr)} [PTS]` : (tr.albumId ? `В КОЛЛЕКЦИЮ · ${priceLabel(tr)}` : `В КОЛЛЕКЦИЮ · ${priceLabel(tr)}`));
            if (colSub) {
                colSub.textContent = `Фрагмент 0:${PREVIEW_SEC} бесплатно · ваш номер ${collectorSerial(tr.id)} навсегда`;
            }
        }

        updateNoticeDom();

        // Вкладки фонотеки и чипы стримингов
        const all = getTracks();
        const ownedCount = all.filter(t => isTrackOwned(t)).length;
        const ownedTab = ov.querySelector('#rx-tab-owned');
        if (ownedTab) ownedTab.textContent = `МОИ ${ownedCount}/${all.length}`;
        ov.querySelectorAll('[data-rx-tab]').forEach(btn => {
            btn.setAttribute('aria-pressed', String(btn.dataset.rxTab === state.tab));
        });
        ov.querySelectorAll('[data-rx-src]').forEach(btn => {
            const s = btn.dataset.rxSrc;
            btn.setAttribute('aria-pressed', String(s === state.source));
            if (s === 'spotify' || s === 'yandex') {
                btn.classList.toggle('is-dim', !resolveStreamForTrack(tr, s));
            }
        });

        // Полка пластинок
        const listEl = ov.querySelector('#rx-list');
        const shown = visibleTracks();
        if (!shown.length) {
            listEl.innerHTML = `<div class="rx-empty">На этой полке пока тихо.</div>`;
        } else {
            listEl.innerHTML = shown.map(item => {
                const isCur = item.id === tr.id;
                const isPlay = isCur && state.playing && state.source === 'cd';
                const itemOwned = isTrackOwned(item);
                const hasSp = !!parseSpotifyEmbed(item.spotifyUrl);
                const hasYa = !!parseYandexEmbed(item.yandexUrl);
                const svcBits = `${hasSp ? ' · SP' : ''}${hasYa ? ' · ЯМ' : ''}`;
                let tagHtml = '';
                if (item.albumId) {
                    tagHtml = itemOwned
                        ? `<span class="rx-tag rx-tag--owned">✦ Альбом</span>`
                        : `<span class="rx-tag rx-tag--price">${escHtml(priceLabel(item))}</span>`;
                } else if (!item.collectible) {
                    tagHtml = `<span class="rx-tag rx-tag--free">ЭФИР</span>`;
                } else if (itemOwned) {
                    tagHtml = `<span class="rx-tag rx-tag--owned">✦ ${escHtml(collectorSerial(item.id))}</span>`;
                } else {
                    tagHtml = `<span class="rx-tag rx-tag--price">${escHtml(priceLabel(item))}</span>`;
                }
                return `
                    <button type="button" class="rx-row ${isCur ? 'is-active' : ''}" role="option" aria-selected="${isCur}" data-rx-pick="${escHtml(item.id)}">
                        <span class="rx-row-disc" data-wax="${escHtml(item.wax || 'obsidian')}" style="--disc-color:${escHtml(item.accent || '#ff6b7d')}" aria-hidden="true"></span>
                        <span class="rx-row-main">
                            <span class="rx-row-title">
                                ${isPlay ? '<span class="rx-eq" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}
                                <span>${escHtml(item.title)}</span>
                            </span>
                            <span class="rx-row-sub">${escHtml((item.freq || '88.4') + ' FM · ' + (item.subtitle || '') + svcBits)}</span>
                        </span>
                        <span class="rx-row-right">
                            ${tagHtml}
                            <span class="rx-row-dur">${(item.collectible || item.albumId) && !itemOwned ? '0:30 / ' : ''}${fmtTime(item.duration || 180)}</span>
                        </span>
                    </button>
                `;
            }).join('');
            listEl.querySelectorAll('[data-rx-pick]').forEach(row => {
                row.addEventListener('click', () => {
                    const id = row.dataset.rxPick;
                    if (id === state.trackId && state.source === 'cd') togglePlay();
                    else selectTrack(id, true);
                });
            });
        }
    }

    // ===== КАТОДНЫЙ ОСЦИЛЛОГРАФ И СПЕКТРОАНАЛИЗАТОР В РЕАЛЬНОМ ВРЕМЕНИ =====
    function drawScope(now) {
        const cv = typeof document !== 'undefined' && document.getElementById('rx-scope');
        if (!cv || !cv.getContext) return;
        const g = cv.getContext('2d');
        if (!g) return;
        const W = cv.width, H = cv.height;
        g.clearRect(0, 0, W, H);

        // Тонкая измерительная сетка катодного экрана
        g.strokeStyle = 'rgba(255, 178, 146, 0.08)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(0, H * 0.5); g.lineTo(W, H * 0.5);
        g.stroke();

        const tr = currentTrack();
        const accent = (tr && tr.accent) || '#ff6b7d';
        let hasLiveFft = false;
        let sum = 0;

        if (state.playing && analyser && freqBuf && waveBuf && rxCtx && rxCtx.state === 'running') {
            try {
                analyser.getByteFrequencyData(freqBuf);
                analyser.getByteTimeDomainData(waveBuf);
                for (let i = 0; i < 24; i++) sum += freqBuf[i];
                hasLiveFft = sum > 18;
            } catch (_) {}
        }

        const bars = 28;
        const gap = 3;
        const bw = (W - gap * (bars - 1)) / bars;

        if (state.playing) {
            state.energy = hasLiveFft
                ? Math.min(1, (sum / (24 * 155)))
                : (0.42 + 0.28 * Math.abs(Math.sin(now * 0.0034)));
        } else {
            state.energy *= 0.88;
        }

        for (let i = 0; i < bars; i++) {
            let v = 0.06;
            if (state.playing) {
                if (hasLiveFft) {
                    const fi = Math.min(freqBuf.length - 1, Math.floor((i / bars) * 36));
                    v = Math.max(0.08, (freqBuf[fi] / 255) * 0.92);
                } else {
                    const center = 1 - Math.abs((i / (bars - 1)) * 2 - 1) * 0.55;
                    v = Math.max(0.08, center * (0.28 + 0.58 * Math.abs(Math.sin(now * 0.0042 + i * 0.52) * Math.cos(now * 0.0021 - i * 0.27))));
                }
            }
            const bh = Math.max(2, Math.round(v * (H - 6)));
            const x = i * (bw + gap);
            const y = H - bh - 1;
            g.fillStyle = i % 3 === 0 ? 'rgba(255, 214, 146, 0.78)' : accent;
            g.globalAlpha = state.playing ? (0.38 + v * 0.58) : 0.22;
            g.fillRect(x, y, bw, bh);
        }
        g.globalAlpha = 1;

        // Шёлковая фосфорная нить осциллографа поверх тёплого спектра
        g.strokeStyle = 'rgba(255, 236, 198, 0.72)';
        g.lineWidth = 1.25;
        g.beginPath();
        const pts = 48;
        for (let i = 0; i <= pts; i++) {
            const x = (i / pts) * W;
            let dy = 0;
            if (state.playing) {
                if (hasLiveFft && waveBuf) {
                    const wi = Math.min(waveBuf.length - 1, Math.floor((i / pts) * (waveBuf.length - 1)));
                    dy = ((waveBuf[wi] - 128) / 128) * (H * 0.42);
                } else {
                    const env = Math.sin((i / pts) * Math.PI);
                    dy = Math.sin(now * 0.006 + i * 0.36) * env * (H * 0.24);
                }
            }
            const y = H * 0.48 + dy;
            if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
    }

    function uiTick(now) {
        uiRaf = 0;
        const tr = currentTrack();
        if (state.playing && state.source === 'cd' && tr) {
            if (!tr.audioUrl || !audioEl || audioEl.paused) {
                const dt = Math.max(0, Math.min(0.25, (now - (lastTickMs || now)) * 0.001));
                lastTickMs = now;
                if (!state.dragging) {
                    state.currentTime += dt;
                    if (!checkPreviewGate(tr) && state.currentTime >= state.duration) {
                        handleTrackEnd();
                    }
                }
            } else if (analyser && freqBuf) {
                try {
                    analyser.getByteFrequencyData(freqBuf);
                    let s = 0;
                    for (let i = 0; i < 20; i++) s += freqBuf[i];
                    state.energy = Math.min(1, s / (20 * 160));
                } catch (_) {
                    state.energy = 0.5;
                }
            }
            if (state.open) updateProgressDom();
        }
        if (state.open) drawScope(now);
        if ((state.open || state.playing) && typeof requestAnimationFrame === 'function') {
            uiRaf = requestAnimationFrame(uiTick);
        }
    }

    function ensureUiLoop() {
        if (!uiRaf && typeof requestAnimationFrame === 'function') {
            uiRaf = requestAnimationFrame(uiTick);
        }
    }

    let inited = false;
    function loadOnce() {
        if (inited) return;
        inited = true;
        loadPrefs();
    }

    if (typeof window !== 'undefined') {
        window.SOMA_RECEIVER = {
            open: openReceiver,
            close: closeReceiver,
            toggle: togglePlay,
            play: startPlayback,
            pause: pausePlayback,
            select: selectTrack,
            next: () => stepTrack(1),
            prev: () => stepTrack(-1),
            buy: buyTrack,
            setSource,
            setTab: tab => { state.tab = tab || 'all'; renderAll(); },
            syncMount,
            refresh: () => { ensureDom(); renderAll(); },
            isOpen: () => !!state.open,
            isPlaying: () => !!(state.playing && state.source === 'cd'),
            isAudioActive,
            isTrackOwned: idOrTrack => isTrackOwned(typeof idOrTrack === 'string' ? getTrackById(idOrTrack) : idOrTrack),
            getEnergy: () => state.playing ? Math.max(0.22, state.energy || 0.45) : 0,
            getCurrentTrack: currentTrack,
            parseSpotifyEmbed,
            parseYandexEmbed
        };
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => { loadOnce(); ensureDom(); });
        } else {
            loadOnce();
            ensureDom();
        }
    }
})();
