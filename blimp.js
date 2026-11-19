/* ==========================================================================
   NEEOSOMA // SKY-01 — НАТИВНЫЙ ПРОДАКТ-ПЛЕЙСМЕНТ (ДИРИЖАБЛЬ НАД NEEO~CITY)
   --------------------------------------------------------------------------
   0% навязчивости: никаких баннеров, таймеров и всплывающих окон!
   За круглым окном высоко в небе NEEO~CITY неспешно проплывает дирижабль
   с цифровой световой вывеской (логотип и/или название партнёра).
   Интерфейс партнёра открывается ТОЛЬКО если игрок сам успел нажать на борт,
   пока дирижабль не скрылся за небоскрёбом.

   КАК ДОБАВИТЬ ПРОДАННУЮ РЕКЛАМНУЮ ИНТЕГРАЦИЮ (за 30 секунд):
   Добавьте объект в массив window.SOMA_ADS.campaigns ниже с active: true:
   {
     id: 'partner_2026_01',
     active: true,
     startsAt: '',              // опционально '2026-12-01'
     endsAt: '',                // опционально '2026-12-31'
     brand: 'CYBER BREW',       // название компании
     signText: 'CYBER BREW',    // короткий текст на вывеске дирижабля (до 14 симв.)
     logoUrl: '',               // опционально: 'assets/ads/logo.png' или 'https://.../logo.png'
     accent: '#ff6b7d',         // фирменный неоновый оттенок вывески
     tagline: 'Ночная обжарка для тех, кто не спит в NEEO~CITY',
     description: 'Скидка 20% на первый заказ спешелти-кофе для свидетелей SOMA~LINK.',
     promoCode: 'NEEOSOMA',     // опциональный промокод (копируется в 1 клик)
     ctaLabel: 'ОТКРЫТЬ ПРЕДЛОЖЕНИЕ ↗',
     ctaUrl: 'https://example.com',
     legalLabel: 'СПЕЦПРОЕКТ · РЕКЛАМА',
     erid: ''                   // опциональный токен маркировки рекламы (erid)
   }
   Пока в PROD нет кампаний с active: true — небо остаётся полностью чистым.
   ========================================================================== */

window.SOMA_ADS = window.SOMA_ADS || {
    firstDelaySec: 32,       // через сколько секунд прилетает первый дирижабль
    intervalSec: 185,        // пауза между пролётами (сек), чтобы никогда не надоедать
    flightDurationSec: 24,   // длительность пролёта через окно (сек) — игрок успевает нажать!
    campaigns: [
        // Добавляйте сюда партнёрские интеграции с active: true
    ]
};

(function () {
    'use strict';

    // Встроенный демо-дирижабль ТОЛЬКО для тестового сервера PTS (чтобы тестировать и показывать рекламодателям!)
    const PTS_DEMO_CAMPAIGN = {
        id: 'pts_demo_neeo',
        active: true,
        brand: 'NEEOSOMA LAB',
        signText: 'NEEOSOMA',
        logoUrl: '',
        accent: '#ffa873',
        tagline: 'Демонстрационный эфирный борт над NEEO~CITY',
        description: 'Так выглядит нативная партнёрская интеграция в SOMA~LINK: дирижабль бесшумно плывёт за круглым окном с логотипом или именем бренда и открывается только по желанию игрока — если успеть коснуться борта до того, как он скроется за высоткой.',
        promoCode: 'NEEOCITY',
        ctaLabel: 'ПРИМЕР ПЕРЕХОДА ПАРТНЁРА ↗',
        ctaUrl: '',
        legalLabel: 'PTS · ДЕМО ПРОДАКТ-ПЛЕЙСМЕНТА',
        erid: ''
    };

    const ROOM_W = 793;
    const ROOM_H = 496;
    const START_X = 222;
    const END_X = 556;
    const BASE_Y = 74;

    const state = {
        flight: null,          // { campaign, startMs, durationMs, dir, yBase, loggedImpression }
        nextFlightAt: 0,
        rotationIdx: 0,
        logoCache: new Map(),  // url -> { img, ok }
        overlay: null,
        openCampaign: null,
        lastHitVisible: false
    };

    function isCampaignLive(c, nowDate) {
        if (!c || !c.active) return false;
        const ts = nowDate.getTime();
        if (c.startsAt) {
            const s = Date.parse(c.startsAt);
            if (Number.isFinite(s) && ts < s) return false;
        }
        if (c.endsAt) {
            const raw = String(c.endsAt).trim();
            const e = Date.parse(raw.length === 10 ? raw + 'T23:59:59Z' : raw);
            if (Number.isFinite(e) && ts > e) return false;
        }
        return Boolean(c.brand || c.signText || c.logoUrl);
    }

    function getActiveCampaigns() {
        const cfg = window.SOMA_ADS || {};
        const list = Array.isArray(cfg.campaigns) ? cfg.campaigns : [];
        const now = new Date();
        return list.filter(c => isCampaignLive(c, now));
    }

    function emitAdEvent(type, campaign) {
        if (!campaign) return;
        try {
            const key = 'soma_ad_stats';
            const raw = JSON.parse(localStorage.getItem(key) || '{}') || {};
            const id = String(campaign.id || campaign.brand || 'ad');
            if (!raw[id]) raw[id] = { impressions: 0, clicks: 0, cta: 0, promo: 0 };
            if (type === 'impression') raw[id].impressions += 1;
            else if (type === 'click') raw[id].clicks += 1;
            else if (type === 'cta') raw[id].cta += 1;
            else if (type === 'promo') raw[id].promo += 1;
            localStorage.setItem(key, JSON.stringify(raw));
        } catch (_) {}
        try {
            if (typeof window.onSomaAdEvent === 'function') {
                window.onSomaAdEvent({ type, campaignId: campaign.id || '', brand: campaign.brand || '' });
            }
        } catch (_) {}
    }

    function getLogoEntry(url) {
        if (!url || typeof Image === 'undefined') return null;
        const clean = String(url).trim();
        if (!clean) return null;
        if (state.logoCache.has(clean)) return state.logoCache.get(clean);
        const entry = { img: new Image(), ok: false };
        entry.img.crossOrigin = 'anonymous';
        entry.img.onload = () => { entry.ok = true; };
        entry.img.onerror = () => { entry.ok = false; };
        entry.img.src = clean;
        state.logoCache.set(clean, entry);
        return entry;
    }

    function safeHex(col, fallback) {
        const s = String(col || '').trim();
        return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : fallback;
    }

    function safeExternalUrl(url) {
        const s = String(url || '').trim();
        if (!s) return '';
        try {
            const u = new URL(s);
            if (u.protocol === 'https:' || u.protocol === 'http:') return u.href;
        } catch (_) {}
        return '';
    }

    function launchFlight(campaign, nowMs, opts) {
        if (!campaign) return null;
        const cfg = window.SOMA_ADS || {};
        const durSec = Math.max(8, Math.min(90, Number((opts && opts.durationSec) || cfg.flightDurationSec) || 24));
        const t0 = Number.isFinite(nowMs) ? nowMs : (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (campaign.logoUrl) getLogoEntry(campaign.logoUrl);
        state.flight = {
            campaign,
            startMs: t0 - ((opts && opts.startProgress) ? opts.startProgress * durSec * 1000 : 0),
            durationMs: durSec * 1000,
            dir: (opts && opts.dir === -1) ? -1 : 1,
            yBase: BASE_Y,
            loggedImpression: false
        };
        const gapSec = Math.max(45, Number(cfg.intervalSec) || 185);
        state.nextFlightAt = t0 + (durSec + gapSec) * 1000;
        if (typeof ensureStationLoop === 'function') ensureStationLoop();
        return state.flight;
    }

    function computeFlightPose(nowMs) {
        const cfg = window.SOMA_ADS || {};
        if (!state.flight) {
            const active = getActiveCampaigns();
            if (!active.length) return null;
            if (!state.nextFlightAt) {
                const firstSec = Math.max(5, Number(cfg.firstDelaySec) || 32);
                state.nextFlightAt = nowMs + firstSec * 1000;
                return null;
            }
            if (nowMs >= state.nextFlightAt) {
                const pick = active[state.rotationIdx % active.length];
                state.rotationIdx += 1;
                launchFlight(pick, nowMs, { dir: state.rotationIdx % 2 === 1 ? 1 : -1 });
            } else {
                return null;
            }
        }
        const fl = state.flight;
        const prog = (nowMs - fl.startMs) / fl.durationMs;
        if (prog < 0) return null;
        if (prog >= 1) {
            state.flight = null;
            syncHitbox(null);
            return null;
        }
        const x = fl.dir > 0
            ? START_X + prog * (END_X - START_X)
            : END_X - prog * (END_X - START_X);
        const bob = Math.sin(nowMs * 0.0014) * 1.65;
        const y = fl.yBase + bob;
        if (!fl.loggedImpression && x > 305 && x < 490) {
            fl.loggedImpression = true;
            emitAdEvent('impression', fl.campaign);
        }
        return { x, y, dir: fl.dir, prog, campaign: fl.campaign };
    }

    function syncHitbox(pose) {
        if (typeof document === 'undefined') return;
        const btn = document.getElementById('station-hit-blimp');
        if (!btn) return;
        // Хотспот активен СТРОГО пока дирижабль виден в открытом небе круглого окна (x = 264..518)!
        const visible = !!(pose && pose.x >= 264 && pose.x <= 518);
        if (!visible) {
            if (state.lastHitVisible) {
                btn.classList.add('hidden');
                state.lastHitVisible = false;
            }
            return;
        }
        state.lastHitVisible = true;
        btn.classList.remove('hidden');
        const hitW = 86, hitH = 44;
        btn.style.left = `${(((pose.x - hitW * 0.5) / ROOM_W) * 100).toFixed(2)}%`;
        btn.style.top = `${(((pose.y - hitH * 0.42) / ROOM_H) * 100).toFixed(2)}%`;
        btn.style.width = `${((hitW / ROOM_W) * 100).toFixed(2)}%`;
        btn.style.height = `${((hitH / ROOM_H) * 100).toFixed(2)}%`;
        const label = `Дирижабль ${pose.campaign.brand || pose.campaign.signText || ''} — нажать, пока не улетел`;
        if (btn.getAttribute('aria-label') !== label) {
            btn.setAttribute('aria-label', label);
            btn.title = label;
        }
    }

    // Живописный рендер дирижабля в круглом окне (стиль Blade Runner × NEEO~CITY)
    function drawInWindow(g, now, phase) {
        const pose = computeFlightPose(now);
        syncHitbox(pose);
        if (!pose) return;

        const { x, y, dir, campaign } = pose;
        const accent = safeHex(campaign.accent, '#ff7a8a');
        const sign = String(campaign.signText || campaign.brand || 'NEEO~CITY').toUpperCase().slice(0, 14);
        const logo = campaign.logoUrl ? getLogoEntry(campaign.logoUrl) : null;
        const t = now * 0.001;
        const blink = 0.5 + 0.5 * Math.sin(t * 4.2);

        g.save();
        g.translate(x, y);

        // 1. Мягкий поисковый луч прожектора из-под гондолы сквозь ночную дымку NEEO~CITY
        if (g.createLinearGradient) {
            g.save();
            g.globalCompositeOperation = 'screen';
            const sweep = Math.sin(t * 0.85) * 8;
            const beam = g.createLinearGradient(dir * 12, 14, dir * 38 + sweep, 58);
            beam.addColorStop(0, phase === 3 ? 'rgba(255, 232, 178, 0.22)' : 'rgba(255, 206, 168, 0.26)');
            beam.addColorStop(1, 'rgba(255, 140, 120, 0)');
            g.fillStyle = beam;
            g.beginPath();
            g.moveTo(dir * 11, 14);
            g.lineTo(dir * 16, 14);
            g.lineTo(dir * 46 + sweep, 58);
            g.lineTo(dir * 18 + sweep, 58);
            g.closePath();
            g.fill();
            g.restore();
        }

        // 2. Мягкое неоновое облако свечения от цифровой вывески на корпусе
        if (g.createRadialGradient) {
            g.save();
            g.globalCompositeOperation = 'screen';
            const glow = g.createRadialGradient(0, 2, 3, 0, 3, 46);
            glow.addColorStop(0, accent);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            g.globalAlpha = phase === 3 ? 0.22 : 0.34;
            g.fillStyle = glow;
            g.beginPath(); g.ellipse(0, 3, 46, 22, 0, 0, Math.PI * 2); g.fill();
            g.restore();
        }

        // 3. Хвостовое оперение цеппелина (с противоположной от носа стороны)
        const tailX = -dir * 32;
        g.fillStyle = phase === 3 ? '#2c0b16' : '#16050a';
        g.beginPath();
        g.moveTo(tailX + dir * 8, -4);
        g.lineTo(tailX - dir * 7, -12.5);
        g.lineTo(tailX - dir * 4, -1);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(tailX + dir * 8, 4);
        g.lineTo(tailX - dir * 7, 11.5);
        g.lineTo(tailX - dir * 4, 1);
        g.closePath();
        g.fill();

        // 4. Аэродинамический ребристый купол дирижабля
        if (g.createLinearGradient) {
            const hg = g.createLinearGradient(0, -14, 0, 14);
            hg.addColorStop(0, phase === 3 ? '#6d1d2f' : '#3e101c');
            hg.addColorStop(0.42, phase === 3 ? '#3b0d19' : '#22070e');
            hg.addColorStop(1, '#0d0206');
            g.fillStyle = hg;
        } else g.fillStyle = '#240810';
        g.beginPath();
        g.ellipse(0, 0, 36.5, 13.8, 0, 0, Math.PI * 2);
        g.fill();

        // Тёплый контровой свет неба по верхней спинке дирижабля
        g.strokeStyle = phase === 3 ? 'rgba(255, 222, 148, 0.72)' : 'rgba(255, 128, 138, 0.52)';
        g.lineWidth = 1.05;
        g.beginPath();
        g.ellipse(0, 0, 35.8, 13.2, 0, Math.PI * 1.12, Math.PI * 1.88);
        g.stroke();

        // Продольные металлические нервюры обшивки
        g.strokeStyle = 'rgba(255, 180, 170, 0.14)';
        g.lineWidth = 0.65;
        [-5.5, 5.5].forEach(ry => {
            g.beginPath();
            g.moveTo(-31, ry * 0.5);
            g.quadraticCurveTo(0, ry * 1.45, 31, ry * 0.5);
            g.stroke();
        });

        // 5. Подвесная гондола с тёплыми иллюминаторами под брюхом дирижабля
        g.fillStyle = '#120408';
        g.beginPath();
        g.moveTo(-11, 12.5); g.lineTo(13, 12.5); g.lineTo(10, 17.2); g.lineTo(-9, 17.2);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255, 214, 152, 0.85)';
        for (let wx = -6; wx <= 7; wx += 4.2) {
            g.fillRect(wx, 14.0, 2.2, 1.5);
        }

        // 6. ЦИФРОВАЯ СВЕТОВАЯ ВЫВЕСКА НА БОРТУ ДИРИЖАБЛЯ (ЛОГОТИП И/ИЛИ НАЗВАНИЕ БРЕНДА!)
        const bw = 52, bh = 13.2, bx = -bw * 0.5, by = -bh * 0.5 + 0.4;
        g.fillStyle = 'rgba(9, 2, 6, 0.92)';
        g.fillRect(bx, by, bw, bh);
        g.strokeStyle = accent;
        g.lineWidth = 0.95;
        g.strokeRect(bx, by, bw, bh);

        // Логотип + текст (или крупный чёткий текст на всё табло)
        g.save();
        g.beginPath();
        g.rect(bx + 1, by + 1, bw - 2, bh - 2);
        g.clip();
        if (logo && logo.ok) {
            try {
                if (campaign.signText) {
                    g.drawImage(logo.img, bx + 2.2, by + 1.6, 10, 10);
                    g.fillStyle = '#fff8f6';
                    g.font = '700 6.2px "JetBrains Mono", monospace';
                    g.textAlign = 'center';
                    g.textBaseline = 'middle';
                    g.fillText(sign.slice(0, 10), bx + 13 + (bw - 14) * 0.5, by + bh * 0.54);
                } else {
                    g.drawImage(logo.img, bx + (bw - 28) * 0.5, by + 1.2, 28, bh - 2.4);
                }
            } catch (_) {}
        } else {
            const fontSize = sign.length > 10 ? 5.6 : (sign.length > 7 ? 6.4 : 7.2);
            g.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillStyle = accent;
            g.globalAlpha = 0.45;
            g.fillText(sign, 0, by + bh * 0.55 + 0.4);
            g.globalAlpha = 1;
            g.fillStyle = '#fff9f5';
            g.fillText(sign, 0, by + bh * 0.54);
        }
        g.restore();

        // 7. Живые мигающие авиационные огни на носу и хвосте
        const noseX = dir * 36.2, aftX = -dir * 37.5;
        g.fillStyle = `rgba(255, 82, 104, ${(0.35 + blink * 0.65).toFixed(3)})`;
        g.beginPath(); g.arc(aftX, -11.5, 1.7, 0, Math.PI * 2); g.fill();
        g.fillStyle = `rgba(255, 232, 168, ${(0.95 - blink * 0.55).toFixed(3)})`;
        g.beginPath(); g.arc(noseX, 0.5, 1.5, 0, Math.PI * 2); g.fill();

        g.restore();
    }

    function ensureOverlay() {
        if (state.overlay) return state.overlay;
        const ov = document.createElement('div');
        ov.id = 'blimp-overlay';
        ov.className = 'blimp-overlay';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-label', 'Небесный сигнал NEEOSOMA SKY-01');
        ov.innerHTML = `
            <div class="blimp-card" id="blimp-card">
                <div class="blimp-head">
                    <span class="blimp-model"><i class="blimp-led" aria-hidden="true"></i>NEEOSOMA // SKY-01</span>
                    <button type="button" class="blimp-close" id="blimp-close" aria-label="Закрыть">✕</button>
                </div>
                <div class="blimp-marquee">
                    <img class="blimp-logo hidden" id="blimp-logo" alt="">
                    <div class="blimp-brand-wrap">
                        <div class="blimp-brand" id="blimp-brand"></div>
                        <div class="blimp-tagline" id="blimp-tagline"></div>
                    </div>
                </div>
                <p class="blimp-desc" id="blimp-desc"></p>
                <button type="button" class="blimp-promo hidden" id="blimp-promo">
                    <span>ПРОМОКОД: <b class="blimp-promo-code" id="blimp-promo-code"></b></span>
                    <span class="blimp-promo-hint" id="blimp-promo-hint">СКОПИРОВАТЬ</span>
                </button>
                <div class="blimp-actions">
                    <button type="button" class="blimp-cta" id="blimp-cta">ОТКРЫТЬ ↗</button>
                </div>
                <div class="blimp-foot">
                    <span id="blimp-legal">СПЕЦПРОЕКТ</span>
                    <span id="blimp-erid"></span>
                </div>
            </div>
        `;
        ov.addEventListener('click', (e) => {
            if (e.target === ov) closeModal();
        });
        ov.querySelector('#blimp-close').addEventListener('click', closeModal);
        document.addEventListener('keydown', (e) => {
            if (state.openCampaign && e.key === 'Escape') closeModal();
        });
        document.body.appendChild(ov);
        state.overlay = ov;
        return ov;
    }

    function mountOverlay() {
        const ov = ensureOverlay();
        const scene = document.getElementById('station-scene');
        const station = document.getElementById('station');
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        const inFs = !!((fsEl && scene && (fsEl === scene || scene.contains(fsEl)))
            || (typeof roomAnim !== 'undefined' && roomAnim && roomAnim.isFullscreen)
            || (station && station.classList.contains('is-fullscreen')));
        const target = (inFs && scene) ? scene : document.body;
        if (ov.parentElement !== target) target.appendChild(ov);
        ov.classList.toggle('is-in-fs', target === scene);
    }

    function openCampaignModal(campaign) {
        if (!campaign) return false;
        state.openCampaign = campaign;
        mountOverlay();
        const ov = state.overlay;
        const card = ov.querySelector('#blimp-card');
        card.style.setProperty('--blimp-accent', safeHex(campaign.accent, '#ff6b7d'));

        const logoEl = ov.querySelector('#blimp-logo');
        if (campaign.logoUrl) {
            logoEl.src = String(campaign.logoUrl);
            logoEl.alt = String(campaign.brand || '');
            logoEl.classList.remove('hidden');
        } else {
            logoEl.removeAttribute('src');
            logoEl.classList.add('hidden');
        }

        ov.querySelector('#blimp-brand').textContent = campaign.brand || campaign.signText || 'NEEO~CITY';
        const tagEl = ov.querySelector('#blimp-tagline');
        tagEl.textContent = campaign.tagline || '';
        tagEl.classList.toggle('hidden', !campaign.tagline);

        const descEl = ov.querySelector('#blimp-desc');
        descEl.textContent = campaign.description || '';
        descEl.classList.toggle('hidden', !campaign.description);

        const promoBtn = ov.querySelector('#blimp-promo');
        const promoHint = ov.querySelector('#blimp-promo-hint');
        if (campaign.promoCode) {
            const code = String(campaign.promoCode).trim();
            ov.querySelector('#blimp-promo-code').textContent = code;
            promoHint.textContent = 'СКОПИРОВАТЬ';
            promoBtn.classList.remove('hidden');
            promoBtn.onclick = () => {
                emitAdEvent('promo', campaign);
                try { navigator.clipboard.writeText(code); } catch (_) {}
                try { Telegram.WebApp.HapticFeedback.notificationOccurred('success'); } catch (_) {}
                promoHint.textContent = '✓ СКОПИРОВАНО';
            };
        } else {
            promoBtn.classList.add('hidden');
        }

        const ctaBtn = ov.querySelector('#blimp-cta');
        const href = safeExternalUrl(campaign.ctaUrl);
        if (href) {
            ctaBtn.textContent = campaign.ctaLabel || 'ПЕРЕЙТИ К ПАРТНЁРУ ↗';
            ctaBtn.onclick = () => {
                emitAdEvent('cta', campaign);
                try {
                    if (window.Telegram && Telegram.WebApp && typeof Telegram.WebApp.openLink === 'function') {
                        Telegram.WebApp.openLink(href);
                        return;
                    }
                } catch (_) {}
                window.open(href, '_blank', 'noopener,noreferrer');
            };
        } else {
            ctaBtn.textContent = 'ВЕРНУТЬСЯ В КОМНАТУ';
            ctaBtn.onclick = closeModal;
        }

        ov.querySelector('#blimp-legal').textContent = campaign.legalLabel || 'СПЕЦПРОЕКТ · NEEO~CITY';
        ov.querySelector('#blimp-erid').textContent = campaign.erid ? `erid: ${campaign.erid}` : 'SKY-01';

        try { if (typeof SFX !== 'undefined' && SFX.tap) SFX.tap(); } catch (_) {}
        try { Telegram.WebApp.HapticFeedback.impactOccurred('light'); } catch (_) {}
        emitAdEvent('click', campaign);
        ov.classList.add('is-open');
        return true;
    }

    function closeModal() {
        state.openCampaign = null;
        if (state.overlay) state.overlay.classList.remove('is-open');
    }

    function catchActiveBlimp(ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        if (!state.flight || !state.flight.campaign) return false;
        return openCampaignModal(state.flight.campaign);
    }

    // PTS-кнопка: мгновенно выпускает дирижабль за круглым окном для проверки и показа партнёрам!
    function triggerPtsFlight() {
        if (typeof isPtsMode === 'function' && !isPtsMode()) return false;
        const active = getActiveCampaigns();
        const camp = active.length ? active[0] : PTS_DEMO_CAMPAIGN;
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        launchFlight(camp, now, { startProgress: 0.22, dir: 1, durationSec: 22 });
        if (typeof renderRoom === 'function') renderRoom();
        return true;
    }

    document.addEventListener('fullscreenchange', () => {
        if (state.openCampaign) mountOverlay();
    });

    window.SOMA_BLIMP = {
        drawInWindow,
        catchActive: catchActiveBlimp,
        openCampaign: openCampaignModal,
        close: closeModal,
        launchFlight,
        triggerPtsFlight,
        remount: () => { if (state.openCampaign) mountOverlay(); },
        getActiveCampaigns,
        isFlying: () => !!state.flight,
        isOpen: () => !!state.openCampaign
    };
})();
