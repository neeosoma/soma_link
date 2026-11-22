/* ==========================================================================
   SOMA~LINK // АТМОСФЕРНЫЕ ИЛЛЮСТРИРОВАННЫЕ ОТКРЫТКИ ДОСТИЖЕНИЙ (share.js)
   Рендерит живые художественные карточки 1200×675 прямо на <canvas> вместо
   сухого текста:
     1. shareWitness()       — Личная станция (реальная комната, кот, пёс, цветок, небо, отчёт)
     3. shareEgg()           — Нарушитель Протокола (секрет 10 попыток помочь)
     4. shareSignal()        — Перехваченный сигнал (скрытая частота 7 касаний)
     5. shareVhs(tape)       — Кадр VHS-кассеты с тёплым анонимным посланием и датой ДД.ММ.ГГГГ
     6. sharePlant(kind)     — Ботаническая открытка Оранжереи станции
   Отправка файла в Telegram / соцсети (Web Share API Level 2), копирование
   PNG в буфер обмена, скачивание PNG и быстрый переход в Telegram.
   ========================================================================== */
(function () {
    'use strict';

    const CARD_W = 1200;
    const CARD_H = 675;
    const MONO = '"Share Tech Mono", "JetBrains Mono", "DejaVu Sans Mono", monospace';
    const SANS = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "DejaVu Sans", sans-serif';

    const imgCache = {};
    const state = {
        open: false,
        blob: null,
        dataUrl: '',
        filename: 'soma-link.png',
        caption: '',
        title: 'SOMA~LINK',
        jobId: 0
    };

    const FRAME_PALETTES = {
        frame_gold:    { edge: '#f5cb6e', edge2: '#a87424', glow: 'rgba(255, 206, 108, 0.34)', tag: 'ЧЁРНОЕ ЗОЛОТО 24K' },
        frame_neon:    { edge: '#ff4d6d', edge2: '#9e1432', glow: 'rgba(255, 72, 108, 0.38)',  tag: 'БАГРОВЫЙ НЕОН' },
        frame_phantom: { edge: '#d8cef8', edge2: '#6e5c9e', glow: 'rgba(202, 188, 255, 0.34)', tag: 'ПРИЗРАК ЭФИРА' },
        frame_ember:   { edge: '#ff9654', edge2: '#9c2d14', glow: 'rgba(255, 134, 68, 0.36)',  tag: 'ТЛЕЮЩИЙ УГОЛЬ' },
        frame_glitch:  { edge: '#ff647c', edge2: '#5ad8e6', glow: 'rgba(255, 96, 124, 0.34)',  tag: 'СБОЙ ПРОТОКОЛА' },
        frame_pulse:   { edge: '#ff7088', edge2: '#b81d38', glow: 'rgba(255, 98, 122, 0.36)',  tag: 'ПУЛЬС СТАНЦИИ' }
    };

    function makeCanvas(w, h) {
        if (typeof globalThis.__somaCreateCanvas === 'function') {
            return globalThis.__somaCreateCanvas(w, h);
        }
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        return cv;
    }

    function loadAsset(src) {
        if (imgCache[src]) return imgCache[src];
        if (typeof globalThis.__somaLoadImage === 'function') {
            imgCache[src] = Promise.resolve(globalThis.__somaLoadImage(src)).catch(() => null);
            return imgCache[src];
        }
        if (typeof Image === 'undefined') return Promise.resolve(null);
        imgCache[src] = new Promise(resolve => {
            const im = new Image();
            im.decoding = 'async';
            im.onload = () => resolve(im);
            im.onerror = () => resolve(null);
            im.src = src;
        });
        return imgCache[src];
    }

    function todayStamp() {
        if (typeof formatCassetteDate === 'function') return formatCassetteDate('', Date.now());
        const d = new Date();
        return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    }

    function getBotUrl() {
        try {
            if (typeof BOT_LINK === 'string' && BOT_LINK) return BOT_LINK;
            if (typeof window !== 'undefined' && window.SOMA_CONFIG && window.SOMA_CONFIG.BOT_LINK) {
                return window.SOMA_CONFIG.BOT_LINK;
            }
        } catch (_) {}
        return (typeof location !== 'undefined' && location.href) ? location.href : '';
    }

    function getPlayerSnapshot() {
        const p = (typeof player !== 'undefined' && player) ? player : {};
        const warmth = Math.max(0, Number(p.warmth) || 0);
        const cosm = (typeof getActiveCosmetics === 'function') ? getActiveCosmetics() : {};
        let title = '';
        let titleGlyph = '✦';
        if (cosm.title && typeof SOMA_ITEM_MAP !== 'undefined' && SOMA_ITEM_MAP[cosm.title]) {
            title = SOMA_ITEM_MAP[cosm.title].label || '';
            titleGlyph = SOMA_ITEM_MAP[cosm.title].glyph || '✦';
        }
        let callsign = p.name ? String(p.name).trim() : '';
        if (!callsign || callsign === 'Аноним') {
            callsign = (typeof anonLabel === 'function' && p.uid) ? anonLabel(p.uid) : 'Свидетель';
        }
        const phaseIdx = (typeof roomAnim !== 'undefined' && Number.isInteger(roomAnim.activePhase))
            ? Math.max(0, Math.min(3, roomAnim.activePhase))
            : 0;
        const phaseName = (typeof stationPhases !== 'undefined' && stationPhases[phaseIdx])
            ? stationPhases[phaseIdx].name
            : ['Ночь', 'Сумерки', 'Очаг', 'Рассвет'][phaseIdx];
        return {
            uid: p.uid || 'witness',
            callsign: callsign.slice(0, 26),
            warmth,
            trained: Math.max(0, Number(p.trained) || 0),
            whispersSent: Math.max(0, Number(p.whispersSent) || 0),
            signals: (typeof getMyPostIds === 'function') ? Math.max(0, getMyPostIds().length || 0) : 0,
            phaseIdx,
            phaseName,
            cosm,
            title,
            titleGlyph,
            seal: cosm.seal || '',
            frame: cosm.frame || '',
            epitaph: cosm.epitaph ? String(cosm.epitaph).trim() : ''
        };
    }

    // ---- ХУДОЖЕСТВЕННЫЕ ПРИМИТИВЫ CANVAS ----
    function rr(g, x, y, w, h, r) {
        const rad = Math.min(r, w * 0.5, h * 0.5);
        g.beginPath();
        g.moveTo(x + rad, y);
        g.arcTo(x + w, y, x + w, y + h, rad);
        g.arcTo(x + w, y + h, x, y + h, rad);
        g.arcTo(x, y + h, x, y, rad);
        g.arcTo(x, y, x + w, y, rad);
        g.closePath();
    }

    function wrapLines(g, text, maxW, maxLines) {
        const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
        if (!words.length) return [];
        const lines = [];
        let cur = '';
        for (let i = 0; i < words.length; i++) {
            const w = words[i];
            const test = cur ? (cur + ' ' + w) : w;
            if (g.measureText(test).width <= maxW) {
                cur = test;
            } else {
                if (cur) lines.push(cur);
                // Сверхдлинное слово — мягко переносим по символам
                if (g.measureText(w).width > maxW) {
                    let chunk = '';
                    for (const ch of w) {
                        if (g.measureText(chunk + ch).width > maxW && chunk) {
                            lines.push(chunk);
                            chunk = ch;
                        } else {
                            chunk += ch;
                        }
                    }
                    cur = chunk;
                } else {
                    cur = w;
                }
                if (maxLines && lines.length >= maxLines) {
                    const last = lines[maxLines - 1];
                    lines.length = maxLines;
                    lines[maxLines - 1] = last.replace(/[.,;:!?\s]*$/, '') + '…';
                    return lines;
                }
            }
        }
        if (cur) {
            if (maxLines && lines.length >= maxLines) {
                lines[maxLines - 1] = lines[maxLines - 1].replace(/[.,;:!?\s]*$/, '') + '…';
            } else {
                lines.push(cur);
            }
        }
        return lines;
    }

    function drawCornerBrackets(g, x, y, w, h, len, color, alpha) {
        g.save();
        g.strokeStyle = color;
        g.globalAlpha = alpha;
        g.lineWidth = 1.5;
        const pts = [
            [x, y + len, x, y, x + len, y],
            [x + w - len, y, x + w, y, x + w, y + len],
            [x + w, y + h - len, x + w, y + h, x + w - len, y + h],
            [x + len, y + h, x, y + h, x, y + h - len]
        ];
        pts.forEach(p => {
            g.beginPath();
            g.moveTo(p[0], p[1]);
            g.lineTo(p[2], p[3]);
            g.lineTo(p[4], p[5]);
            g.stroke();
        });
        g.restore();
    }

    function drawSubtleScanlinesAndGrain(g, w, h, strength) {
        g.save();
        g.fillStyle = `rgba(0, 0, 0, ${(0.11 * strength).toFixed(3)})`;
        for (let y = 0; y < h; y += 4) {
            g.fillRect(0, y, w, 1);
        }
        // Тёплые пылинки света в воздухе
        let seed = 9187;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
        for (let i = 0; i < 42; i++) {
            const px = rnd() * w;
            const py = rnd() * h;
            const r = 0.7 + rnd() * 1.6;
            g.fillStyle = i % 3 === 0
                ? `rgba(255, 214, 152, ${(0.08 + rnd() * 0.16).toFixed(3)})`
                : `rgba(255, 132, 146, ${(0.06 + rnd() * 0.12).toFixed(3)})`;
            g.beginPath();
            g.arc(px, py, r, 0, Math.PI * 2);
            g.fill();
        }
        g.restore();
    }

    // Ювелирная векторная печать игрока на открытке (Око / Затмение / Мотылёк / Венец / Импульс / По умолчанию)
    function drawSealEmblem(g, cx, cy, r, sealId, accent) {
        g.save();
        g.translate(cx, cy);
        const halo = g.createRadialGradient(0, 0, r * 0.15, 0, 0, r * 1.45);
        halo.addColorStop(0, 'rgba(255, 206, 138, 0.24)');
        halo.addColorStop(0.55, 'rgba(214, 58, 82, 0.12)');
        halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.fillStyle = halo;
        g.beginPath();
        g.arc(0, 0, r * 1.45, 0, Math.PI * 2);
        g.fill();

        g.fillStyle = 'rgba(14, 4, 8, 0.9)';
        g.strokeStyle = accent || '#f2c178';
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(0, 0, r, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        g.strokeStyle = accent || '#ffd898';
        g.fillStyle = accent || '#ffd898';
        g.lineWidth = 1.8;

        if (sealId === 'seal_eye') {
            g.beginPath();
            g.moveTo(-r * 0.58, 0);
            g.quadraticCurveTo(0, -r * 0.48, r * 0.58, 0);
            g.quadraticCurveTo(0, r * 0.48, -r * 0.58, 0);
            g.stroke();
            g.beginPath();
            g.arc(0, 0, r * 0.2, 0, Math.PI * 2);
            g.fill();
        } else if (sealId === 'seal_crown') {
            g.beginPath();
            g.moveTo(-r * 0.5, r * 0.34);
            g.lineTo(-r * 0.56, -r * 0.24);
            g.lineTo(-r * 0.2, r * 0.04);
            g.lineTo(0, -r * 0.44);
            g.lineTo(r * 0.2, r * 0.04);
            g.lineTo(r * 0.56, -r * 0.24);
            g.lineTo(r * 0.5, r * 0.34);
            g.closePath();
            g.stroke();
        } else if (sealId === 'seal_eclipse') {
            g.beginPath();
            g.arc(0, 0, r * 0.44, 0, Math.PI * 2);
            g.stroke();
            g.fillStyle = '#0e0408';
            g.beginPath();
            g.arc(r * 0.14, -r * 0.06, r * 0.38, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = '#fff0c8';
            g.beginPath();
            g.arc(-r * 0.34, r * 0.24, r * 0.11, 0, Math.PI * 2);
            g.fill();
        } else if (sealId === 'seal_moth') {
            g.beginPath();
            g.ellipse(-r * 0.28, -r * 0.04, r * 0.32, r * 0.2, -0.35, 0, Math.PI * 2);
            g.ellipse(r * 0.28, -r * 0.04, r * 0.32, r * 0.2, 0.35, 0, Math.PI * 2);
            g.stroke();
            g.beginPath();
            g.moveTo(0, -r * 0.36);
            g.lineTo(0, r * 0.36);
            g.stroke();
        } else {
            // Живой кардио-импульс SOMA_LINK
            g.beginPath();
            g.moveTo(-r * 0.58, 0);
            g.lineTo(-r * 0.24, 0);
            g.lineTo(-r * 0.1, -r * 0.42);
            g.lineTo(r * 0.08, r * 0.38);
            g.lineTo(r * 0.22, -r * 0.14);
            g.lineTo(r * 0.34, 0);
            g.lineTo(r * 0.58, 0);
            g.stroke();
        }
        g.restore();
    }

    // Рендерит ЖИВУЮ комнату игрока (окно, ЭЛТ, свет, гирлянда, свечи, кот, крупный спящий пёс, растение!)
    async function renderLiveRoomSurface(phaseOverride, plantKindOverride) {
        const [bg, lamp] = await Promise.all([
            loadAsset('assets/quiet-station.jpg'),
            loadAsset('assets/lamp.png')
        ]);
        const rw = 793, rh = 496;
        const cv = makeCanvas(rw * 2, rh * 2);
        const g = cv.getContext('2d');
        g.scale(2, 2);

        const phase = Number.isInteger(phaseOverride)
            ? phaseOverride
            : ((typeof roomAnim !== 'undefined' && Number.isInteger(roomAnim.activePhase)) ? roomAnim.activePhase : 0);

        if (bg) {
            const filters = [
                'brightness(1.04) contrast(1.05)',
                'brightness(1.07) contrast(1.05) saturate(1.04)',
                'brightness(1.08) contrast(1.06) saturate(1.10)',
                'brightness(0.99) contrast(1.08) saturate(1.10)'
            ];
            try { g.filter = filters[phase] || filters[0]; } catch (_) {}
            g.drawImage(bg, 0, 0, rw, rh);
            if (lamp) {
                g.drawImage(lamp, 0.201765 * rw, 0, 0.070618 * rw, 0.350806 * rh);
            }
            try { g.filter = 'none'; } catch (_) {}
        } else {
            const fallback = g.createRadialGradient(rw * 0.5, rh * 0.4, 20, rw * 0.5, rh * 0.5, rw * 0.7);
            fallback.addColorStop(0, '#3a0d18');
            fallback.addColorStop(1, '#090205');
            g.fillStyle = fallback;
            g.fillRect(0, 0, rw, rh);
        }

        const now = 4200;
        try { if (typeof drawWindowWorld === 'function') drawWindowWorld(g, now, phase, 0); } catch (_) {}
        try { if (typeof drawCrtMonitor === 'function') drawCrtMonitor(g, now, phase, 0); } catch (_) {}
        try { if (typeof drawRoomCosmetics === 'function') drawRoomCosmetics(g, now, phase); } catch (_) {}
        try { if (typeof drawWindowLightBeams === 'function') drawWindowLightBeams(g, now, phase, 0); } catch (_) {}
        try { if (typeof drawGreenhouseVines === 'function') drawGreenhouseVines(g, now, phase); } catch (_) {}

        // Живое растение игрока на ковре (440×460 с полями безопасности — 0% обрезки лепестков и свечения!)
        try {
            if (typeof drawPlantSprite === 'function' && typeof plantSpec === 'function') {
                const pcv = makeCanvas(440, 460);
                const pg = pcv.getContext('2d');
                const baseSpec = (typeof activeRoomPlantSpec === 'function' && !Number.isInteger(plantKindOverride))
                    ? activeRoomPlantSpec()
                    : plantSpec();
                const spec = Number.isInteger(plantKindOverride)
                    ? (typeof gallerySpecForKind === 'function' ? gallerySpecForKind(plantKindOverride, plantSpec()) : { ...baseSpec, kind: plantKindOverride })
                    : baseSpec;
                let stg = -1;
                if (typeof currentPlantStage === 'function') {
                    stg = currentPlantStage();
                } else if (typeof roomAnim !== 'undefined' && Number.isInteger(roomAnim.inspectStage)) {
                    stg = roomAnim.inspectStage;
                } else if (typeof roomPreview !== 'undefined' && roomPreview) {
                    stg = 5;
                }
                if (Number.isInteger(plantKindOverride)) stg = 5;
                const cosm = (typeof getActiveCosmetics === 'function') ? getActiveCosmetics() : {};
                const flies = (typeof silenceFirefliesCount === 'function') ? silenceFirefliesCount() : (stg >= 4 ? 5 : 2);
                const sharePot = typeof activeRoomPotSkin === 'function'
                    ? activeRoomPotSkin(cosm.pot || '', spec)
                    : (spec && spec.isAlien ? 'pot_kintsugi' : (cosm.pot || ''));
                drawPlantSprite(pg, spec, stg, {
                    phase,
                    now,
                    potSkin: sharePot,
                    fireflies: flies
                });
                g.drawImage(pcv, 0.35333 * rw, 0.47488 * rh, 0.29333 * rw, 0.4939 * rh);
            }
        } catch (_) {}

        return cv;
    }

    function drawFooterBar(g, leftText, dateStr, accent) {
        const y = CARD_H - 44;
        g.save();
        g.font = `700 12.5px ${MONO}`;
        g.fillStyle = 'rgba(255, 214, 206, 0.64)';
        g.textBaseline = 'middle';
        g.fillText(leftText, 54, y);

        const right = `${dateStr}  ·  SOMA~LINK`;
        const rw = g.measureText(right).width;
        g.fillStyle = accent || 'rgba(255, 214, 168, 0.82)';
        g.fillText(right, CARD_W - 54 - rw, y);
        g.restore();
    }

    // =========================================================================
    // 1. ЛИЧНЫЙ ОТЧЁТ СОУЧАСТИЯ И ЖИВАЯ КОМНАТА ИГРОКА (copyShareText)
    // =========================================================================
    async function paintWitnessCard(cv) {
        const g = cv.getContext('2d');
        const snap = getPlayerSnapshot();
        const dateStr = todayStamp();
        const roomCv = await renderLiveRoomSurface(snap.phaseIdx);
        const fp = FRAME_PALETTES[snap.frame] || { edge: '#f0b884', edge2: '#8f2438', glow: 'rgba(255, 138, 112, 0.26)' };

        // 1. Полноэкранная живая комната справа с кинематографическим виньетированием слева под досье
        g.fillStyle = '#070204';
        g.fillRect(0, 0, CARD_W, CARD_H);

        // Смещаем композицию комнаты правее, чтобы круглое окно, растение, кот и спящий пёс сияли целиком!
        const dstW = 972, dstH = 608;
        const dstX = CARD_W - dstW - 18;
        const dstY = 24;
        g.drawImage(roomCv, 0, 0, roomCv.width, roomCv.height, dstX, dstY, dstW, dstH);

        // Мягкий бархатный градиент слева и снизу (плавный переход комнаты в тёмный рубиновый постер)
        const leftFade = g.createLinearGradient(0, 0, 640, 0);
        leftFade.addColorStop(0, 'rgba(8, 2, 5, 0.99)');
        leftFade.addColorStop(0.62, 'rgba(10, 3, 6, 0.95)');
        leftFade.addColorStop(0.84, 'rgba(12, 3, 6, 0.62)');
        leftFade.addColorStop(1, 'rgba(12, 3, 6, 0)');
        g.fillStyle = leftFade;
        g.fillRect(0, 0, 660, CARD_H);

        const botFade = g.createLinearGradient(0, CARD_H - 135, 0, CARD_H);
        botFade.addColorStop(0, 'rgba(7, 2, 4, 0)');
        botFade.addColorStop(0.7, 'rgba(7, 2, 4, 0.85)');
        botFade.addColorStop(1, 'rgba(7, 2, 4, 0.98)');
        g.fillStyle = botFade;
        g.fillRect(0, CARD_H - 135, CARD_W, 135);

        const topFade = g.createLinearGradient(0, 0, 0, 80);
        topFade.addColorStop(0, 'rgba(7, 2, 4, 0.85)');
        topFade.addColorStop(1, 'rgba(7, 2, 4, 0)');
        g.fillStyle = topFade;
        g.fillRect(0, 0, CARD_W, 80);

        // Тонкая музейная рамка вокруг всей открытки
        g.strokeStyle = fp.edge;
        g.globalAlpha = 0.34;
        g.lineWidth = 1.5;
        rr(g, 20, 20, CARD_W - 40, CARD_H - 40, 18);
        g.stroke();
        g.globalAlpha = 1;
        drawCornerBrackets(g, 30, 30, CARD_W - 60, CARD_H - 60, 18, fp.edge, 0.72);

        // 2. Левая колонка: печать, кикер, позывной, титул, ранг, показатели, спутники
        drawSealEmblem(g, 74, 78, 24, snap.seal, fp.edge);

        g.font = `700 13px ${MONO}`;
        g.fillStyle = fp.edge;
        g.textBaseline = 'alphabetic';
        g.fillText('// ОТЧЁТ СОУЧАСТИЯ', 112, 73);
        g.font = `400 12px ${MONO}`;
        g.fillStyle = 'rgba(255, 204, 198, 0.68)';
        g.fillText(`АТМОСФЕРА: ${snap.phaseName.toUpperCase()}`, 112, 92);

        // Крупный позывной Свидетеля
        g.font = `700 40px ${SANS}`;
        g.fillStyle = '#fff5f3';
        const nameLines = wrapLines(g, snap.callsign, 430, 1);
        g.fillText(nameLines[0] || 'Свидетель', 50, 162);

        // Бейдж ранга и авторского титула (тепло уже есть в отдельном блоке)
        let curY = 184;
        const badgeText = snap.title
            ? `${snap.titleGlyph} ${snap.title}`
            : `ХРАНИТЕЛЬ СТАНЦИИ`;
        g.font = `700 13px ${MONO}`;
        const bw = Math.min(440, g.measureText(badgeText).width + 24);
        rr(g, 50, curY, bw, 30, 8);
        g.fillStyle = 'rgba(56, 14, 24, 0.78)';
        g.fill();
        g.strokeStyle = 'rgba(255, 192, 142, 0.44)';
        g.lineWidth = 1.2;
        g.stroke();
        g.fillStyle = '#ffe2b6';
        g.fillText(badgeText, 62, curY + 20);
        curY += 48;

        // Личная эпитафия до 66 символов (или тихая строка протокола)
        const quote = snap.epitaph
            ? `«${snap.epitaph}»`
            : '«Тишина слышит тех, мимо кого прошли остальные.»';
        g.font = `400 ${quote.length > 52 ? 14.5 : 15.5}px ${SANS}`;
        g.fillStyle = 'rgba(244, 214, 218, 0.84)';
        const qLines = wrapLines(g, quote, 428, 3);
        const qLh = qLines.length > 2 ? 20 : 23;
        qLines.forEach((ln, idx) => {
            g.fillText(ln, 50, curY + 15 + idx * qLh);
        });
        curY += qLines.length * qLh + (qLines.length > 2 ? 18 : 26);

        // Atmosphere and player's own activity counts.
        const stats = [
            { k: 'СИГНАЛОВ СДЕЛАНО', v: String(snap.signals), col: '#fff2f4' },
            { k: 'ТЕПЛО СТАНЦИИ', v: String(snap.warmth), col: '#ffd58e' },
            { k: 'ШЁПОТОВ ОТПРАВЛЕНО', v: String(snap.whispersSent), col: '#ff8597' },
            { k: 'АТМОСФЕРА', v: String(snap.phaseName || 'Ночь').toUpperCase(), col: '#ff5c74' }
        ];
        const boxW = 196, boxH = 74, gap = 12;
        stats.forEach((st, i) => {
            const bx = 50 + (i % 2) * (boxW + gap);
            const by = curY + Math.floor(i / 2) * (boxH + gap);
            rr(g, bx, by, boxW, boxH, 12);
            g.fillStyle = 'rgba(18, 5, 9, 0.84)';
            g.fill();
            g.strokeStyle = 'rgba(255, 158, 146, 0.24)';
            g.lineWidth = 1;
            g.stroke();

            g.font = `700 10.5px ${MONO}`;
            g.fillStyle = 'rgba(235, 188, 194, 0.66)';
            g.fillText(st.k, bx + 14, by + 23);

            g.font = `700 ${st.v.length > 8 ? 20 : 28}px ${MONO}`;
            g.fillStyle = st.col;
            g.fillText(st.v, bx + 14, by + 57);
        });
        curY += boxH * 2 + gap + 24;

        // Строка живых хранителей комнаты (если открыты кот / пёс / цветок)
        const keepers = [];
        try {
            const cIdx = (typeof roomAnim !== 'undefined' && Number.isInteger(roomAnim.inspectCatCoat)) ? roomAnim.inspectCatCoat : null;
            const dIdx = (typeof roomAnim !== 'undefined' && Number.isInteger(roomAnim.inspectDogBreed)) ? roomAnim.inspectDogBreed : null;
            if (snap.cosm.cat && typeof catSpec === 'function') keepers.push(`Кот: ${catSpec(undefined, cIdx).coat.name}`);
            if (snap.cosm.dog && typeof dogSpec === 'function') keepers.push(`Пёс: ${dogSpec(undefined, dIdx).breed.name}`);
            if (!keepers.length && typeof plantSpec === 'function') keepers.push(`Семя: ${plantSpec().kindName}`);
        } catch (_) {}
        if (keepers.length && curY < CARD_H - 68) {
            g.font = `700 12px ${MONO}`;
            g.fillStyle = 'rgba(255, 212, 174, 0.82)';
            const kLine = '✦ ' + keepers.join('  ·  ');
            g.fillText(wrapLines(g, kLine, 460, 1)[0] || '', 50, curY + 12);
        }

        // Подпись над живой комнатой в правом верхнем углу
        const roomTag = `ТИХАЯ СТАНЦИЯ · ${snap.warmth} ТЕПЛО`;
        g.font = `700 12px ${MONO}`;
        const rtw = g.measureText(roomTag).width + 22;
        rr(g, CARD_W - 48 - rtw, 46, rtw, 28, 8);
        g.fillStyle = 'rgba(12, 3, 6, 0.72)';
        g.fill();
        g.strokeStyle = 'rgba(255, 196, 152, 0.34)';
        g.stroke();
        g.fillStyle = '#ffe8d2';
        g.fillText(roomTag, CARD_W - 37 - rtw, 64);

        drawSubtleScanlinesAndGrain(g, CARD_W, CARD_H, 0.65);
        drawFooterBar(g, 'NEEOSOMA // NEEO~CITY', dateStr, fp.edge);
    }

    // =========================================================================
    // 3. НАРУШИТЕЛЬ ПРОТОКОЛА — 10 ПОПЫТОК ПОМОЧЬ (shareEgg)
    // =========================================================================
    async function paintEggCard(cv) {
        const g = cv.getContext('2d');
        const snap = getPlayerSnapshot();
        const dateStr = todayStamp();

        // Тёмный янтарно-багровый кибер-нуар фон
        const bgGrad = g.createRadialGradient(855, 330, 20, 600, 340, 760);
        bgGrad.addColorStop(0, '#3d1c08');
        bgGrad.addColorStop(0.45, '#1a0709');
        bgGrad.addColorStop(1, '#060204');
        g.fillStyle = bgGrad;
        g.fillRect(0, 0, CARD_W, CARD_H);

        const eggBg = await loadAsset('assets/quiet-station.jpg');
        if (eggBg) {
            g.save();
            g.globalAlpha = 0.13;
            g.drawImage(eggBg, 0, 0, CARD_W, CARD_H);
            g.restore();
        }

        // Тонкая сетка протокола безопасности
        g.save();
        g.strokeStyle = 'rgba(255, 184, 76, 0.055)';
        g.lineWidth = 1;
        for (let x = 40; x < CARD_W; x += 48) {
            g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CARD_H); g.stroke();
        }
        for (let y = 40; y < CARD_H; y += 48) {
            g.beginPath(); g.moveTo(0, y); g.lineTo(CARD_W, y); g.stroke();
        }
        g.restore();

        // ИЛЛЮСТРАЦИЯ СПРАВА: Расколотая печать Протокола Тишины + импульс живого сердца
        const cx = 868, cy = 334;
        g.save();
        const glow = g.createRadialGradient(cx, cy, 10, cx, cy, 250);
        glow.addColorStop(0, 'rgba(255, 192, 72, 0.38)');
        glow.addColorStop(0.5, 'rgba(224, 58, 68, 0.18)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.fillStyle = glow;
        g.beginPath();
        g.arc(cx, cy, 250, 0, Math.PI * 2);
        g.fill();

        // Восьмиугольный щит протокола с расколом
        const drawOct = (rad) => {
            g.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
                const px = cx + Math.cos(a) * rad;
                const py = cy + Math.sin(a) * rad;
                if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
            }
            g.closePath();
        };
        drawOct(168);
        g.fillStyle = 'rgba(15, 6, 6, 0.92)';
        g.fill();
        g.strokeStyle = '#ffbe55';
        g.lineWidth = 2.4;
        g.stroke();

        drawOct(144);
        g.strokeStyle = 'rgba(255, 112, 92, 0.45)';
        g.lineWidth = 1.2;
        g.stroke();

        // Разомкнутая дуга замка протокола
        g.strokeStyle = '#ffd278';
        g.lineWidth = 5;
        g.lineCap = 'round';
        g.beginPath();
        g.arc(cx + 12, cy - 42, 34, Math.PI * 1.08, Math.PI * 1.92);
        g.stroke();

        rr(g, cx - 44, cy - 18, 88, 72, 12);
        g.fillStyle = 'rgba(48, 20, 10, 0.92)';
        g.fill();
        g.strokeStyle = '#ffd278';
        g.lineWidth = 3;
        g.stroke();

        // Сияющая золотая трещина раскола сквозь щит и замок (чисто над подписью 10/10!)
        g.strokeStyle = '#fff2c6';
        g.shadowColor = '#ffae38';
        g.shadowBlur = 16;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(cx - 86, cy - 122);
        g.lineTo(cx - 30, cy - 50);
        g.lineTo(cx - 6, cy - 56);
        g.lineTo(cx + 12, cy + 12);
        g.lineTo(cx - 8, cy + 28);
        g.lineTo(cx + 38, cy + 74);
        g.stroke();
        g.shadowBlur = 0;

        // 10/10 под щитом
        g.font = `700 13.5px ${MONO}`;
        g.textAlign = 'center';
        g.fillStyle = '#ffd888';
        g.fillText('10 / 10 ПОПЫТОК ПОМОЧЬ', cx, cy + 108);
        g.textAlign = 'left';
        g.restore();

        // Рамка достижения
        g.strokeStyle = 'rgba(255, 194, 88, 0.42)';
        g.lineWidth = 1.8;
        rr(g, 20, 20, CARD_W - 40, CARD_H - 40, 18);
        g.stroke();
        drawCornerBrackets(g, 32, 32, CARD_W - 64, CARD_H - 64, 22, '#ffca68', 0.85);

        // Текстовая часть слева
        rr(g, 54, 68, 276, 30, 7);
        g.fillStyle = 'rgba(255, 186, 68, 0.14)';
        g.fill();
        g.strokeStyle = 'rgba(255, 198, 92, 0.55)';
        g.lineWidth = 1.2;
        g.stroke();
        g.font = `700 12.5px ${MONO}`;
        g.fillStyle = '#ffd57e';
        g.fillText('// СЕКРЕТНОЕ ДОСТИЖЕНИЕ', 68, 88);

        g.font = `700 50px ${SANS}`;
        g.fillStyle = '#fff8ee';
        g.fillText('НАРУШИТЕЛЬ', 54, 174);
        g.fillStyle = '#ffca68';
        g.fillText('ПРОТОКОЛА', 54, 230);

        g.font = `400 18px ${SANS}`;
        g.fillStyle = 'rgba(246, 224, 214, 0.86)';
        const desc = wrapLines(g, 'Система не рассчитана на тех, кто десять раз отказался просто молча смотреть на чужую боль.', 520, 3);
        desc.forEach((ln, idx) => g.fillText(ln, 54, 286 + idx * 27));

        // Плашка награды и позывного
        rr(g, 54, 404, 500, 82, 13);
        g.fillStyle = 'rgba(24, 10, 8, 0.88)';
        g.fill();
        g.strokeStyle = 'rgba(255, 194, 92, 0.4)';
        g.stroke();

        g.font = `700 11px ${MONO}`;
        g.fillStyle = 'rgba(255, 214, 162, 0.68)';
        g.fillText('СВИДЕТЕЛЬ // СТАТУС ПРИСВОЕН', 74, 432);
        g.font = `700 22px ${MONO}`;
        g.fillStyle = '#ffe29c';
        g.fillText(`${snap.callsign}  ·  +100 ТЕПЛО`, 74, 466);

        g.font = `700 13px ${MONO}`;
        g.fillStyle = 'rgba(255, 204, 148, 0.75)';
        g.fillText('КАК ОТКРЫТЬ — ЗАСЕКРЕЧЕНО. ПОПРОБУЙ САМ.', 54, 536);

        drawSubtleScanlinesAndGrain(g, CARD_W, CARD_H, 0.85);
        drawFooterBar(g, 'СБОЙ ПРОТОКОЛА', dateStr, '#ffca68');
    }

    // =========================================================================
    // 4. ПЕРЕХВАЧЕННЫЙ СИГНАЛ — СКРЫТАЯ ЧАСТОТА (shareMusic)
    // =========================================================================
    async function paintSignalCard(cv) {
        const g = cv.getContext('2d');
        const snap = getPlayerSnapshot();
        const dateStr = todayStamp();

        const bgGrad = g.createRadialGradient(850, 332, 16, 600, 340, 760);
        bgGrad.addColorStop(0, '#420c1c');
        bgGrad.addColorStop(0.48, '#17050b');
        bgGrad.addColorStop(1, '#060204');
        g.fillStyle = bgGrad;
        g.fillRect(0, 0, CARD_W, CARD_H);

        const sigBg = await loadAsset('assets/quiet-station.jpg');
        if (sigBg) {
            g.save();
            g.globalAlpha = 0.14;
            g.drawImage(sigBg, 0, 0, CARD_W, CARD_H);
            g.restore();
        }

        // ИЛЛЮСТРАЦИЯ СПРАВА: Виниловый диск + живая осциллограмма перехваченной частоты
        const cx = 866, cy = 332;
        g.save();
        const halo = g.createRadialGradient(cx, cy, 18, cx, cy, 255);
        halo.addColorStop(0, 'rgba(255, 78, 106, 0.42)');
        halo.addColorStop(0.55, 'rgba(255, 162, 102, 0.12)');
        halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.fillStyle = halo;
        g.beginPath();
        g.arc(cx, cy, 255, 0, Math.PI * 2);
        g.fill();

        // Обсидиановая пластинка 7" с шёлковыми рубиновыми дорожками
        g.fillStyle = '#0c0407';
        g.strokeStyle = 'rgba(255, 142, 152, 0.52)';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(cx, cy, 174, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        for (let r = 74; r <= 162; r += 11) {
            g.strokeStyle = r % 22 === 0 ? 'rgba(255, 118, 134, 0.24)' : 'rgba(255, 214, 198, 0.08)';
            g.lineWidth = 1;
            g.beginPath();
            g.arc(cx, cy, r, 0, Math.PI * 2);
            g.stroke();
        }

        // Яблоко пластинки
        const lbl = g.createRadialGradient(cx - 12, cy - 12, 4, cx, cy, 58);
        lbl.addColorStop(0, '#ff7282');
        lbl.addColorStop(0.6, '#9e1830');
        lbl.addColorStop(1, '#4a0916');
        g.fillStyle = lbl;
        g.beginPath();
        g.arc(cx, cy, 56, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#090205';
        g.beginPath();
        g.arc(cx, cy, 8, 0, Math.PI * 2);
        g.fill();

        // Сияющая волна перехваченного радиосигнала сквозь пластинку
        g.strokeStyle = '#ffd8b8';
        g.shadowColor = '#ff4d6d';
        g.shadowBlur = 16;
        g.lineWidth = 2.8;
        g.beginPath();
        for (let x = cx - 205; x <= cx + 205; x += 3) {
            const u = (x - cx) / 205;
            const env = Math.pow(Math.max(0, 1 - u * u), 1.4);
            const y = cy + Math.sin(u * 18) * Math.cos(u * 5) * 58 * env;
            if (x === cx - 205) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
        g.shadowBlur = 0;
        g.restore();

        // Рамка
        g.strokeStyle = 'rgba(255, 118, 134, 0.42)';
        g.lineWidth = 1.8;
        rr(g, 20, 20, CARD_W - 40, CARD_H - 40, 18);
        g.stroke();
        drawCornerBrackets(g, 32, 32, CARD_W - 64, CARD_H - 64, 22, '#ff7c92', 0.85);

        // Текст слева
        rr(g, 54, 68, 268, 30, 7);
        g.fillStyle = 'rgba(255, 82, 106, 0.15)';
        g.fill();
        g.strokeStyle = 'rgba(255, 122, 138, 0.55)';
        g.stroke();
        g.font = `700 12.5px ${MONO}`;
        g.fillStyle = '#ff9cae';
        g.fillText('// СКРЫТАЯ РАДИОЧАСТОТА', 68, 88);

        g.font = `700 50px ${SANS}`;
        g.fillStyle = '#fff6f6';
        g.fillText('ПЕРЕХВАЧЕН', 54, 174);
        g.fillStyle = '#ff788e';
        g.fillText('СИГНАЛ', 54, 230);

        g.font = `400 18px ${SANS}`;
        g.fillStyle = 'rgba(246, 218, 224, 0.86)';
        const desc = wrapLines(g, 'Сквозь ночной шум NEEO~CITY поймана тайная волна — там, где нет ленты, масок и обязательств.', 520, 3);
        desc.forEach((ln, idx) => g.fillText(ln, 54, 286 + idx * 27));

        rr(g, 54, 404, 500, 82, 13);
        g.fillStyle = 'rgba(24, 7, 12, 0.88)';
        g.fill();
        g.strokeStyle = 'rgba(255, 126, 142, 0.38)';
        g.stroke();
        g.font = `700 11px ${MONO}`;
        g.fillStyle = 'rgba(255, 192, 202, 0.68)';
        g.fillText('РАДИОПЕРЕХВАТ // ЧАСТОТА НАЙДЕНА', 74, 432);
        g.font = `700 22px ${MONO}`;
        g.fillStyle = '#ffd2b8';
        g.fillText(`${snap.callsign}  ·  +50 ТЕПЛО`, 74, 466);

        g.font = `700 13px ${MONO}`;
        g.fillStyle = 'rgba(255, 178, 188, 0.76)';
        g.fillText('КООРДИНАТЫ ВОЛНЫ ЗАСЕКРЕЧЕНЫ · НАЙДИ САМ', 54, 536);

        drawSubtleScanlinesAndGrain(g, CARD_W, CARD_H, 0.85);
        drawFooterBar(g, 'ТАЙНЫЙ ЭФИР // NEEO~CITY', dateStr, '#ff98aa');
    }

    // =========================================================================
    // 5. КАДР АНОНИМНОЙ ТЁПЛОЙ VHS-КАССЕТЫ (SOMA // VTR-90)
    // =========================================================================
    async function paintVhsCard(cv, tape) {
        const g = cv.getContext('2d');
        const num = (typeof formatCassetteNum === 'function')
            ? formatCassetteNum(tape && tape.num)
            : String((tape && tape.num) || 1).padStart(3, '0');
        const dateStr = (tape && tape.date) ? String(tape.date) : todayStamp();
        const msg = (tape && tape.text) ? String(tape.text).trim() : '';

        // Тёплый ламповый фон с мягким просветом ночной комнаты
        const bgGrad = g.createRadialGradient(600, 300, 30, 600, 340, 760);
        bgGrad.addColorStop(0, '#321019');
        bgGrad.addColorStop(0.55, '#130509');
        bgGrad.addColorStop(1, '#060204');
        g.fillStyle = bgGrad;
        g.fillRect(0, 0, CARD_W, CARD_H);

        const bg = await loadAsset('assets/quiet-station.jpg');
        if (bg) {
            g.save();
            g.globalAlpha = 0.14;
            g.drawImage(bg, 0, 0, CARD_W, CARD_H);
            g.restore();
        }

        // Рамка открытки
        g.strokeStyle = 'rgba(255, 196, 142, 0.36)';
        g.lineWidth = 1.6;
        rr(g, 20, 20, CARD_W - 40, CARD_H - 40, 18);
        g.stroke();
        drawCornerBrackets(g, 32, 32, CARD_W - 64, CARD_H - 64, 20, '#ffd08e', 0.78);

        // Большой ламповый ЭЛТ-экран сверху по центру
        const sx = 86, sy = 68, sw = CARD_W - 172, sh = 376;
        rr(g, sx - 10, sy - 10, sw + 20, sh + 20, 24);
        g.fillStyle = '#0d0407';
        g.fill();
        g.strokeStyle = 'rgba(255, 178, 142, 0.28)';
        g.lineWidth = 1.6;
        g.stroke();

        const crtG = g.createRadialGradient(sx + sw * 0.5, sy + sh * 0.45, 20, sx + sw * 0.5, sy + sh * 0.5, sw * 0.62);
        crtG.addColorStop(0, 'rgba(78, 22, 32, 0.94)');
        crtG.addColorStop(0.62, 'rgba(28, 8, 14, 0.97)');
        crtG.addColorStop(1, 'rgba(10, 3, 6, 0.99)');
        rr(g, sx, sy, sw, sh, 18);
        g.fillStyle = crtG;
        g.fill();
        g.strokeStyle = 'rgba(255, 198, 142, 0.34)';
        g.stroke();

        // OSD видеомагнитофона на экране
        g.font = `700 16px ${MONO}`;
        g.fillStyle = '#ffd588';
        g.fillText(`PLAY ►   VHS #${num}`, sx + 30, sy + 40);

        const osdDate = `ЗАПИСЬ: ${dateStr}`;
        const odw = g.measureText(osdDate).width;
        g.fillStyle = '#ffe8c8';
        g.fillText(osdDate, sx + sw - 30 - odw, sy + 40);

        // Тёплый текст анонимного послания
        const quote = `«${msg}»`;
        const fontSize = quote.length > 220 ? 22 : (quote.length > 130 ? 26 : 30);
        g.font = `400 ${fontSize}px ${SANS}`;
        g.fillStyle = '#fff5f0';
        const lines = wrapLines(g, quote, sw - 96, 6);
        const lh = Math.round(fontSize * 1.46);
        const totalH = lines.length * lh;
        const startY = sy + Math.round((sh - totalH) * 0.5) + fontSize;
        lines.forEach((ln, idx) => {
            g.fillText(ln, sx + 48, startY + idx * lh);
        });

        g.font = `700 12.5px ${MONO}`;
        g.fillStyle = 'rgba(255, 206, 194, 0.55)';
        g.fillText('КАНАЛ «ШЁПОТ» // АНОНИМНЫЕ ТЁПЛЫЕ СЛОВА', sx + 30, sy + sh - 22);
        const sp = 'NEEOSOMA // VTR-90 · SP HI-FI';
        g.fillText(sp, sx + sw - 30 - g.measureText(sp).width, sy + sh - 22);

        // ИЛЛЮСТРИРОВАННАЯ ФИЗИЧЕСКАЯ VHS-КАССЕТА ПОД ЭКРАНОМ С НАКЛЕЙКОЙ #НОМЕР + ДД.ММ.ГГГГ!
        const vx = 250, vy = 482, vw = 700, vh = 114;
        rr(g, vx, vy, vw, vh, 14);
        const shellG = g.createLinearGradient(vx, vy, vx, vy + vh);
        shellG.addColorStop(0, '#29131a');
        shellG.addColorStop(0.5, '#15080c');
        shellG.addColorStop(1, '#0b0306');
        g.fillStyle = shellG;
        g.fill();
        g.strokeStyle = 'rgba(255, 192, 152, 0.36)';
        g.lineWidth = 1.6;
        g.stroke();

        // Два окна с магнитными катушками VHS
        [vx + 96, vx + vw - 96].forEach(rx => {
            const ry = vy + vh * 0.5;
            rr(g, rx - 66, ry - 34, 132, 68, 34);
            g.fillStyle = '#090204';
            g.fill();
            g.strokeStyle = 'rgba(255, 174, 146, 0.25)';
            g.stroke();
            // Магнитная лента
            g.fillStyle = '#1e0b10';
            g.beginPath(); g.arc(rx, ry, 28, 0, Math.PI * 2); g.fill();
            // Белая ступица VHS с 6 спицами
            g.strokeStyle = '#f2dcc6';
            g.lineWidth = 2;
            g.beginPath(); g.arc(rx, ry, 16, 0, Math.PI * 2); g.stroke();
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2;
                g.beginPath();
                g.moveTo(rx + Math.cos(a) * 6, ry + Math.sin(a) * 6);
                g.lineTo(rx + Math.cos(a) * 16, ry + Math.sin(a) * 16);
                g.stroke();
            }
        });

        // Кремовая архивная этикетка по центру VHS-кассеты
        const lx = vx + 188, ly = vy + 18, lw = vw - 376, lhBox = vh - 36;
        rr(g, lx, ly, lw, lhBox, 7);
        g.fillStyle = '#f5e6d2';
        g.fill();
        // Винтажная алая полоса сверху наклейки
        g.save();
        rr(g, lx, ly, lw, lhBox, 7);
        g.clip();
        g.fillStyle = '#b8283c';
        g.fillRect(lx, ly, lw, 14);
        g.fillStyle = '#d97a38';
        g.fillRect(lx, ly + 14, lw, 4);
        g.restore();

        g.font = `700 22px ${MONO}`;
        g.fillStyle = '#22070c';
        g.fillText(`VHS #${num}`, lx + 18, ly + 47);

        g.font = `700 17px ${MONO}`;
        g.fillStyle = '#6e1d2c';
        const dw = g.measureText(dateStr).width;
        g.fillText(dateStr, lx + lw - 18 - dw, ly + 47);

        g.font = `700 11px ${MONO}`;
        g.fillStyle = 'rgba(72, 32, 38, 0.72)';
        g.fillText('ЛИЧНЫЙ ВИДЕОАРХИВ ТЁПЛЫХ СЛОВ', lx + 18, ly + 68);

        drawSubtleScanlinesAndGrain(g, CARD_W, CARD_H, 0.9);
        drawFooterBar(g, `АРХИВ ШЁПОТА // КАССЕТА #${num}`, dateStr, '#ffd58e');
    }

    // =========================================================================
    // 6. БОТАНИЧЕСКАЯ ОТКРЫТКА ОРАНЖЕРЕИ СТАНЦИИ (sharePlant)
    // =========================================================================
    async function paintPlantCard(cv, kindOverride) {
        const g = cv.getContext('2d');
        const snap = getPlayerSnapshot();
        const dateStr = todayStamp();
        const isAlienCard = kindOverride === 'alien';
        const spec = (typeof plantSpec === 'function') ? plantSpec() : { kind: 0, kindName: 'Растение станции' };
        const useSpec = isAlienCard && typeof alienSpec === 'function'
            ? alienSpec()
            : (Number.isInteger(kindOverride) && typeof gallerySpecForKind === 'function'
                ? gallerySpecForKind(kindOverride, spec)
                : spec);
        const roomCv = await renderLiveRoomSurface(snap.phaseIdx, isAlienCard ? undefined : useSpec.kind);

        g.fillStyle = '#070204';
        g.fillRect(0, 0, CARD_W, CARD_H);
        g.drawImage(roomCv, 0, 0, roomCv.width, roomCv.height, 210, 22, 972, 608);

        if (isAlienCard && typeof drawPlantSprite === 'function') {
            const spCv = makeCanvas(440, 460);
            const alPot = typeof potSkinForFlower === 'function' ? potSkinForFlower('alien', snap.cosm.pot || '') : 'pot_kintsugi';
            drawPlantSprite(spCv.getContext('2d'), useSpec, 5, { phase: snap.phaseIdx, glow: 0.72, now: 2400, potSkin: alPot });
            g.drawImage(spCv, 640, 86, 440, 460);
        }

        const fade = g.createLinearGradient(0, 0, 620, 0);
        fade.addColorStop(0, 'rgba(8, 2, 5, 0.99)');
        fade.addColorStop(0.65, 'rgba(10, 3, 6, 0.94)');
        fade.addColorStop(1, 'rgba(10, 3, 6, 0)');
        g.fillStyle = fade;
        g.fillRect(0, 0, 620, CARD_H);

        const frameAccent = isAlienCard ? '#d8b4fe' : '#ffd496';
        g.strokeStyle = isAlienCard ? 'rgba(216, 180, 254, 0.45)' : 'rgba(255, 204, 152, 0.38)';
        g.lineWidth = 1.6;
        rr(g, 20, 20, CARD_W - 40, CARD_H - 40, 18);
        g.stroke();
        drawCornerBrackets(g, 32, 32, CARD_W - 64, CARD_H - 64, 20, frameAccent, 0.8);

        g.font = `700 13px ${MONO}`;
        g.fillStyle = frameAccent;
        g.fillText(isAlienCard ? '// ✦ СЕКРЕТНЫЙ ВИД (1 ИЗ 7) · ОРАНЖЕРЕЯ' : '// NEEOSOMA · ОРАНЖЕРЕЯ ТИХОЙ СТАНЦИИ', 54, 88);

        g.font = `700 42px ${SANS}`;
        g.fillStyle = '#fff6f2';
        const nLines = wrapLines(g, useSpec.kindName || 'Цветение тишины', 440, 2);
        nLines.forEach((ln, idx) => g.fillText(ln, 54, 158 + idx * 50));

        const baseY = 158 + nLines.length * 50 + 24;
        g.font = `400 17px ${SANS}`;
        g.fillStyle = 'rgba(244, 216, 220, 0.84)';
        const descTxt = isAlienCard && useSpec.alien
            ? useSpec.alien.note
            : 'Выращено не кликами, а тихим человеческим вниманием в ночной комнате SOMA~LINK.';
        const sub = wrapLines(g, descTxt, 420, 4);
        sub.forEach((ln, idx) => g.fillText(ln, 54, baseY + idx * 25));

        rr(g, 54, 418, 410, 78, 12);
        g.fillStyle = 'rgba(20, 6, 10, 0.86)';
        g.fill();
        g.strokeStyle = isAlienCard ? 'rgba(216, 180, 254, 0.4)' : 'rgba(255, 196, 146, 0.34)';
        g.stroke();
        g.font = `700 11px ${MONO}`;
        g.fillStyle = 'rgba(255, 212, 186, 0.66)';
        g.fillText('ХРАНИТЕЛЬ ОРАНЖЕРЕИ', 72, 444);
        g.font = `700 21px ${MONO}`;
        g.fillStyle = frameAccent;
        g.fillText(`${snap.callsign} · ${snap.phaseName}`, 72, 476);

        drawSubtleScanlinesAndGrain(g, CARD_W, CARD_H, 0.65);
        drawFooterBar(g, 'NEEOSOMA // ОРАНЖЕРЕЯ · NEEO~CITY', dateStr, frameAccent);
    }

    // =========================================================================
    // 7. ПАНОРАМНАЯ ОТКРЫТКА СТЕКЛЯННОГО КУПОЛА ОРАНЖЕРЕИ (shareConservatory)
    // =========================================================================
    async function paintConservatoryCard(cv, opts) {
        const g = cv.getContext('2d');
        const snap = getPlayerSnapshot();
        const dateStr = todayStamp();
        const o = opts || {};

        g.fillStyle = '#06030f';
        g.fillRect(0, 0, CARD_W, CARD_H);

        // Рисуем живой стеклянный купол Оранжереи на весь панорамный холст 1200×675!
        if (typeof window !== 'undefined' && window.SOMA_GREENHOUSE && typeof window.SOMA_GREENHOUSE.paintScene === 'function') {
            window.SOMA_GREENHOUSE.paintScene(g, CARD_W, CARD_H, 4200, {
                moodIdx: o.moodIdx,
                snapshot: o.snapshot || null,
                hideSelection: true
            });
        }

        // Деликатная нижняя кинематографическая вуаль под типографику
        const botFade = g.createLinearGradient(0, CARD_H - 190, 0, CARD_H);
        botFade.addColorStop(0, 'rgba(6, 3, 14, 0)');
        botFade.addColorStop(0.62, 'rgba(6, 3, 14, 0.78)');
        botFade.addColorStop(1, 'rgba(5, 2, 12, 0.96)');
        g.fillStyle = botFade;
        g.fillRect(0, CARD_H - 190, CARD_W, 190);

        const ghData = (o.snapshot && o.snapshot.gh)
            ? o.snapshot.gh
            : (typeof loadGreenhouse === 'function' ? loadGreenhouse() : { bloomed: [] });
        const earthTotal = (typeof PLANT_KINDS !== 'undefined' && PLANT_KINDS.length) ? PLANT_KINDS.length : 8;
        const hasAlien = ghData.bloomed.length >= earthTotal && !!(ghData.alienSeed && ghData.alienSeed.bloomed);
        const accent = hasAlien ? '#e9d5ff' : '#fde68a';

        g.strokeStyle = hasAlien ? 'rgba(216, 180, 254, 0.44)' : 'rgba(253, 230, 138, 0.36)';
        g.lineWidth = 1.6;
        rr(g, 18, 18, CARD_W - 36, CARD_H - 36, 18);
        g.stroke();
        drawCornerBrackets(g, 30, 30, CARD_W - 60, CARD_H - 60, 20, accent, 0.85);

        // Верхний шильдик купола (до 8/8 — 0% спойлера 9-го секретного цветка!)
        rr(g, 46, 42, hasAlien ? 430 : 344, 34, 17);
        g.fillStyle = 'rgba(10, 5, 22, 0.76)';
        g.fill();
        g.strokeStyle = hasAlien ? 'rgba(216, 180, 254, 0.45)' : 'rgba(110, 231, 183, 0.4)';
        g.stroke();
        g.font = `700 12px ${MONO}`;
        g.fillStyle = accent;
        g.fillText(
            hasAlien
                ? `NEEOSOMA // ОРАНЖЕРЕЯ · ${earthTotal}/${earthTotal} + ✦ IX`
                : `NEEOSOMA // ОРАНЖЕРЕЯ · ${ghData.bloomed.length}/${earthTotal} ВИДОВ`,
            64,
            63
        );

        // Имя хранителя внизу слева
        g.font = `700 11px ${MONO}`;
        g.fillStyle = 'rgba(226, 232, 240, 0.72)';
        g.fillText('ХРАНИТЕЛЬ КУПОЛА НАД NEEO~CITY', 48, CARD_H - 96);
        g.font = `700 28px ${SANS}`;
        g.fillStyle = '#ffffff';
        g.fillText(`@${String(snap.callsign).replace(/^@/, '')}`, 48, CARD_H - 64);

        drawFooterBar(g, 'NEEOSOMA // NEEO~CITY', dateStr, accent);
    }

    // ---- ЭКСПОРТ CANVAS -> BLOB & DATA URL ----
    function canvasToBlobAndUrl(cv) {
        return new Promise(resolve => {
            let dataUrl = '';
            try { dataUrl = cv.toDataURL('image/png'); } catch (_) {}
            if (typeof cv.toBlob === 'function') {
                try {
                    cv.toBlob(blob => resolve({ blob, dataUrl }), 'image/png');
                    return;
                } catch (_) {}
            }
            resolve({ blob: null, dataUrl });
        });
    }

    // ---- МОДАЛЬНАЯ ФОТОЛАБОРАТОРИЯ (FULLSCREEN-SAFE!) ----
    function isSceneFullscreen() {
        const scene = typeof document !== 'undefined' && document.getElementById('station-scene');
        const room = typeof document !== 'undefined' && document.getElementById('station');
        if (!scene) return false;
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (fsEl && (fsEl === scene || scene.contains(fsEl))) return true;
        if (typeof roomAnim !== 'undefined' && roomAnim && roomAnim.isFullscreen) return true;
        return !!(room && room.classList && room.classList.contains('is-fullscreen'));
    }

    function syncMount() {
        if (typeof document === 'undefined') return;
        const ov = document.getElementById('soma-share-overlay');
        if (!ov) return;
        const inFs = isSceneFullscreen();
        const scene = document.getElementById('station-scene');
        const target = (inFs && scene) ? scene : document.body;
        if (target && ov.parentElement !== target) target.appendChild(ov);
        ov.classList.toggle('is-in-scene', !!(inFs && scene));
    }

    function setStatus(msg, isOk) {
        const el = typeof document !== 'undefined' && document.getElementById('soma-share-status');
        if (!el) return;
        el.textContent = msg || '';
        el.classList.toggle('is-ok', !!isOk);
    }

    function canNativeFileShare(blob, filename) {
        try {
            if (!blob || typeof File === 'undefined' || typeof navigator === 'undefined') return false;
            if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
            const f = new File([blob], filename || 'soma-link.png', { type: 'image/png' });
            return !!navigator.canShare({ files: [f] });
        } catch (_) {
            return false;
        }
    }

    async function copyImageToClipboard() {
        try {
            if (!state.blob || typeof navigator === 'undefined' || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
                return false;
            }
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': state.blob })]);
            return true;
        } catch (_) {
            return false;
        }
    }

    function triggerDownload() {
        if (!state.blob && !state.dataUrl) return false;
        try {
            const url = state.blob ? URL.createObjectURL(state.blob) : state.dataUrl;
            const a = document.createElement('a');
            a.href = url;
            a.download = state.filename || 'soma-link.png';
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();
            if (state.blob) setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 4000);
            return true;
        } catch (_) {
            return false;
        }
    }

    function openTelegramShareUrl() {
        const link = getBotUrl();
        const url = 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(state.caption || '');
        try {
            if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp
                && typeof window.Telegram.WebApp.openTelegramLink === 'function' && window.Telegram.WebApp.initData) {
                window.Telegram.WebApp.openTelegramLink(url);
                return;
            }
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (_) {}
    }

    async function handlePrimaryShare() {
        if (!state.blob && !state.dataUrl) return;
        const link = getBotUrl();
        const fullText = link ? `${state.caption}\n${link}` : state.caption;

        // 1) Мобильные устройства / Telegram iOS & Android / macOS: отправляем настоящий PNG-снимок напрямую в Telegram и соцсети!
        if (canNativeFileShare(state.blob, state.filename)) {
            try {
                const file = new File([state.blob], state.filename, { type: 'image/png' });
                await navigator.share({
                    files: [file],
                    title: state.title || 'SOMA~LINK',
                    text: fullText
                });
                setStatus('✓ Снимок отправлен!', true);
                return;
            } catch (err) {
                if (err && err.name === 'AbortError') return;
            }
        }

        // 2) Десктоп: кладём готовую PNG-картинку прямо в буфер обмена (Ctrl+V в любом чате Telegram сразу отправляет фото!)
        const copied = await copyImageToClipboard();
        if (copied) {
            setStatus('✓ Снимок в буфере обмена — вставьте (Ctrl+V / ⌘V) в любой чат Telegram!', true);
            return;
        }

        // 3) Запасной путь: сохраняем PNG-открытку на устройство
        if (triggerDownload()) {
            setStatus('✓ Открытка сохранена в PNG — прикрепите её в Telegram!', true);
        }
    }

    function ensureOverlay() {
        if (typeof document === 'undefined' || !document.body) return null;
        let ov = document.getElementById('soma-share-overlay');
        if (ov) return ov;

        ov = document.createElement('div');
        ov.id = 'soma-share-overlay';
        ov.className = 'soma-share-overlay hidden';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-label', 'Атмосферный снимок достижения SOMA~LINK');
        ov.innerHTML = `
            <div class="soma-share-card">
                <div class="soma-share-head">
                    <div class="soma-share-kicker">
                        <span class="soma-share-dot" aria-hidden="true"></span>
                        <span id="soma-share-heading">СНИМОК ДОСТИЖЕНИЯ</span>
                    </div>
                    <button type="button" class="soma-share-close" id="soma-share-close" aria-label="Закрыть">✕</button>
                </div>

                <div class="soma-share-frame">
                    <img class="soma-share-img" id="soma-share-img" alt="Атмосферная открытка SOMA~LINK">
                    <div class="soma-share-loading" id="soma-share-loading">ПРОЯВКА СНИМКА…</div>
                </div>

                <div class="soma-share-status" id="soma-share-status">Готовая открытка для отправки в Telegram и соцсети</div>

                <button type="button" class="soma-share-primary" id="soma-share-primary">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
                    <span id="soma-share-primary-label">ПОДЕЛИТЬСЯ СНИМКОМ</span>
                </button>

                <div class="soma-share-row">
                    <button type="button" class="soma-share-sec" id="soma-share-copy">КОПИРОВАТЬ</button>
                    <button type="button" class="soma-share-sec" id="soma-share-dl">СКАЧАТЬ PNG</button>
                    <button type="button" class="soma-share-sec soma-share-sec--tg" id="soma-share-tg">В TELEGRAM ↗</button>
                </div>
            </div>
        `;
        document.body.appendChild(ov);

        ov.addEventListener('click', ev => { if (ev.target === ov) closeModal(); });
        ov.querySelector('#soma-share-close').addEventListener('click', closeModal);
        ov.querySelector('#soma-share-primary').addEventListener('click', handlePrimaryShare);
        if (typeof window !== 'undefined' && typeof window.bindSomaSceneScroll === 'function') {
            window.bindSomaSceneScroll(ov.querySelector('.soma-share-card'));
        }
        ov.querySelector('#soma-share-copy').addEventListener('click', async () => {
            const ok = await copyImageToClipboard();
            if (ok) {
                setStatus('✓ Картинка скопирована — нажмите Ctrl+V / ⌘V в Telegram!', true);
            } else if (triggerDownload()) {
                setStatus('✓ Браузер сохранил PNG-файл открытки на устройство', true);
            }
        });
        ov.querySelector('#soma-share-dl').addEventListener('click', () => {
            if (triggerDownload()) setStatus('✓ PNG-открытка сохранена (1200×675)', true);
        });
        ov.querySelector('#soma-share-tg').addEventListener('click', async () => {
            if (canNativeFileShare(state.blob, state.filename)) {
                await handlePrimaryShare();
                return;
            }
            const copied = await copyImageToClipboard();
            openTelegramShareUrl();
            setStatus(
                copied
                    ? '✓ Снимок скопирован в буфер — вставьте его (Ctrl+V) прямо в открытом чате Telegram!'
                    : 'Открыт Telegram — сохраните PNG кнопкой слева, чтобы приложить снимок',
                copied
            );
        });

        return ov;
    }

    async function openWithPainter(meta, painterFn) {
        const ov = ensureOverlay();
        if (!ov) return null;
        const myJob = ++state.jobId;
        state.open = true;
        state.blob = null;
        state.dataUrl = '';
        state.filename = meta.filename || 'soma-link.png';
        state.caption = meta.caption || '';
        state.title = meta.title || 'SOMA~LINK';

        syncMount();
        ov.classList.remove('hidden');

        const headEl = document.getElementById('soma-share-heading');
        const loadEl = document.getElementById('soma-share-loading');
        const imgEl = document.getElementById('soma-share-img');
        const primLbl = document.getElementById('soma-share-primary-label');
        if (headEl) headEl.textContent = meta.heading || 'СНИМОК ДОСТИЖЕНИЯ';
        if (loadEl) loadEl.classList.remove('hidden');
        setStatus('Проявляем атмосферную открытку…', false);

        try {
            if (document.fonts && document.fonts.ready) {
                await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 350))]);
            }
        } catch (_) {}

        const cv = makeCanvas(CARD_W, CARD_H);
        await painterFn(cv);
        const { blob, dataUrl } = await canvasToBlobAndUrl(cv);
        if (myJob !== state.jobId) return cv;

        state.blob = blob;
        state.dataUrl = dataUrl;
        if (imgEl && dataUrl) imgEl.src = dataUrl;
        if (loadEl) loadEl.classList.add('hidden');

        const nativeOk = canNativeFileShare(blob, state.filename);
        if (primLbl) {
            primLbl.textContent = nativeOk ? 'ОТПРАВИТЬ СНИМОК В TELEGRAM' : 'ПОДЕЛИТЬСЯ СНИМКОМ';
        }
        setStatus(
            nativeOk
                ? 'Готово · выберите Telegram, чтобы отправить открытку картинкой'
                : 'Готово · отправьте, скопируйте в буфер (для Ctrl+V в TG) или скачайте PNG',
            false
        );
        return cv;
    }

    function closeModal() {
        if (!state.open) return;
        state.open = false;
        const ov = typeof document !== 'undefined' && document.getElementById('soma-share-overlay');
        if (ov) ov.classList.add('hidden');
        if (typeof window !== 'undefined' && typeof window.restoreSomaScroll === 'function') {
            window.restoreSomaScroll();
        }
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        document.addEventListener('keydown', ev => {
            if (!state.open) return;
            if (ev.key === 'Escape') {
                ev.preventDefault();
                ev.stopImmediatePropagation();
                closeModal();
            }
        }, true);
    }

    // ---- ПУБЛИЧНЫЕ ТОЧКИ ВЫЗОВА ДЛЯ ВСЕХ ДОСТИЖЕНИЙ ----
    function shareWitness() {
        const snap = getPlayerSnapshot();
        return openWithPainter({
            heading: 'СНИМОК СТАНЦИИ И ОТЧЁТА',
            title: 'SOMA~LINK // Личная станция',
            filename: `soma-station-${snap.phaseIdx}.png`,
            caption: `Моя тихая станция в SOMA~LINK · NEEO~CITY · ${snap.warmth} ТЕПЛО`
        }, paintWitnessCard);
    }


    function shareEggCard() {
        return openWithPainter({
            heading: 'ДОСТИЖЕНИЕ // СБОЙ ПРОТОКОЛА',
            title: 'SOMA~LINK // Нарушитель Протокола',
            filename: 'soma-protocol-breaker.png',
            caption: 'Я нарушил протокол SOMA~LINK в NEEO~CITY. Не скажу как — попробуй сам:'
        }, paintEggCard);
    }

    function shareSignal() {
        return openWithPainter({
            heading: 'ДОСТИЖЕНИЕ // ТАЙНАЯ ЧАСТОТА',
            title: 'SOMA~LINK // Перехвачен сигнал',
            filename: 'soma-secret-signal.png',
            caption: 'Я перехватил скрытую частоту NEEO~CITY в SOMA~LINK. Попробуй найти сам:'
        }, paintSignalCard);
    }

    function shareVhs(tape) {
        const num = (typeof formatCassetteNum === 'function')
            ? formatCassetteNum(tape && tape.num)
            : '001';
        const dt = (tape && tape.date) ? tape.date : todayStamp();
        return openWithPainter({
            heading: `NEEOSOMA // VTR-90 · VHS #${num}`,
            title: `SOMA~LINK // VHS #${num}`,
            filename: `soma-vhs-${num}.png`,
            caption: `VHS #${num} · ${dt} — анонимная тёплая кассета NEEOSOMA // VTR-90 в SOMA~LINK`
        }, cv => paintVhsCard(cv, tape));
    }

    function sharePlant(kindOverride) {
        const isAl = kindOverride === 'alien';
        return openWithPainter({
            heading: isAl ? '✦ СЕКРЕТНЫЙ ВИД ОРАНЖЕРЕИ' : 'СНИМОК ОРАНЖЕРЕИ',
            title: 'SOMA~LINK // Оранжерея станции',
            filename: isAl ? 'soma-alien-plant.png' : 'soma-greenhouse-plant.png',
            caption: isAl
                ? 'Мой единственный внеземной цветок (1 из 7) в SOMA~LINK · NEEO~CITY:'
                : 'Моё растение в тихой комнате SOMA~LINK · NEEO~CITY:'
        }, cv => paintPlantCard(cv, kindOverride));
    }

    function shareConservatory(opts) {
        return openWithPainter({
            heading: 'NEEOSOMA // КУПОЛ ОРАНЖЕРЕИ',
            title: 'SOMA~LINK // Оранжерея над NEEO~CITY',
            filename: 'soma-conservatory.png',
            caption: 'Моя живая Оранжерея под стеклянным куполом NEEO~CITY в SOMA~LINK:'
        }, cv => paintConservatoryCard(cv, opts));
    }

    const api = {
        shareWitness,
        shareEgg: shareEggCard,
        shareSignal,
        shareVhs,
        sharePlant,
        shareConservatory,
        close: closeModal,
        syncMount,
        isOpen: () => !!state.open,
        // Прямой рендер для автотестов и предпросмотра
        renderCard: async (kind, payload) => {
            const cv = makeCanvas(CARD_W, CARD_H);
            if (kind === 'witness') await paintWitnessCard(cv);
            else if (kind === 'egg') await paintEggCard(cv);
            else if (kind === 'signal') await paintSignalCard(cv);
            else if (kind === 'vhs') await paintVhsCard(cv, payload);
            else if (kind === 'plant') await paintPlantCard(cv, payload && payload.kind);
            else if (kind === 'conservatory') await paintConservatoryCard(cv, payload);
            return cv;
        }
    };

    if (typeof window !== 'undefined') window.SOMA_SHARE = api;
    if (typeof globalThis !== 'undefined') globalThis.SOMA_SHARE = api;
})();
