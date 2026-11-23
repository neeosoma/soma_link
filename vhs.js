/* ==========================================================================
   NEEOSOMA // VTR-90 — ЛАМПОВЫЙ ВИДЕОАРХИВ АНОНИМНЫХ ТЁПЛЫХ СЛОВ (VHS)
   - Каждая запись хранится на номерной VHS-кассете с полной датой ДД.ММ.ГГГГ
   - Анимация и тёплый механический щелчок вставки VHS в деку -> ЭЛТ-экран
   - Мгновенный поиск по словам, #номеру и дате + фильтр «★ Избранные» + года + сортировка
   - Встроенная кнопка «Открытка» для отправки атмосферного снимка кассеты
   - Бесшовная работа внутри #station-scene без выхода из Fullscreen
   ========================================================================== */
(function () {
    'use strict';

    const state = {
        open: false,
        query: '',
        filter: 'all', // 'all' | 'fav' | 'year:YYYY'
        sort: 'newest', // 'newest' | 'oldest'
        trackingTimer: 0,
        loadAnimTimer: 0
    };

    const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    function isSceneFullscreen() {
        const scene = typeof document !== 'undefined' && document.getElementById('station-scene');
        const room = typeof document !== 'undefined' && document.getElementById('station');
        if (!scene) return false;
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (fsEl && (fsEl === scene || scene.contains(fsEl))) return true;
        if (typeof roomAnim !== 'undefined' && roomAnim && roomAnim.isFullscreen) return true;
        return !!(room && room.classList && room.classList.contains('is-fullscreen'));
    }

    function getTapes() {
        return typeof loadCassettes === 'function' ? loadCassettes() : [];
    }

    function padNum(n) {
        return typeof formatCassetteNum === 'function'
            ? formatCassetteNum(n)
            : String(Math.max(1, Number(n) || 1)).padStart(3, '0');
    }

    function activeId() {
        if (typeof getActiveCassetteId === 'function') return getActiveCassetteId();
        return (typeof roomAnim !== 'undefined' && roomAnim && roomAnim.activeCassetteId) || '';
    }

    // Тёплый аналоговый звук загрузки/извлечения VHS-кассеты (только если звук включён)
    function playVhsMech(kind) {
        try {
            if (typeof soundOn !== 'undefined' && !soundOn) return;
            if (typeof tone !== 'function') return;
            if (kind === 'insert') {
                tone(132, 0.08, 'triangle', 0.024, 0, 96);
                tone(240, 0.14, 'sine', 0.014, 0.07, 312);
                tone(528, 0.22, 'sine', 0.016, 0.19, 532);
            } else if (kind === 'eject') {
                tone(320, 0.12, 'sine', 0.015, 0, 198);
                tone(118, 0.09, 'triangle', 0.02, 0.1, 88);
            } else {
                tone(660, 0.09, 'sine', 0.014, 0, 740);
            }
        } catch (_) {}
    }

    function highlightSnippet(text, rawQuery) {
        const q = String(rawQuery || '').trim();
        if (!q) return escHtml(text);
        const cleanQ = q.replace(/^#/, '');
        if (!cleanQ) return escHtml(text);
        const escaped = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
            const re = new RegExp(`(${escaped})`, 'ig');
            return escHtml(text).replace(re, '<mark>$1</mark>');
        } catch (_) {
            return escHtml(text);
        }
    }

    function matchesQuery(tape, rawQuery) {
        const q = String(rawQuery || '').trim().toLowerCase();
        if (!q) return true;
        const numStr = padNum(tape.num);
        const hay = `#${numStr} #${tape.num} vhs ${numStr} ${tape.date} ${tape.text}`.toLowerCase();
        return hay.includes(q);
    }

    function filteredTapes(all) {
        let list = all.slice();
        if (state.filter === 'fav') {
            list = list.filter(t => !!t.fav);
        } else if (state.filter.startsWith('year:')) {
            const yr = state.filter.slice(5);
            list = list.filter(t => String(t.date || '').endsWith('.' + yr));
        }
        if (state.query.trim()) {
            list = list.filter(t => matchesQuery(t, state.query));
        }
        list.sort((a, b) => {
            const diff = (Number(b.ts) || 0) - (Number(a.ts) || 0) || (Number(b.num) || 0) - (Number(a.num) || 0);
            return state.sort === 'oldest' ? -diff : diff;
        });
        return list;
    }

    function tapeCounterFor(tape) {
        if (!tape) return '00:00:00';
        const n = Math.max(1, Number(tape.num) || 1);
        const words = String(tape.text || '').split(/\s+/).filter(Boolean).length;
        const mins = String(n % 60).padStart(2, '0');
        const hrs = String(Math.floor(n / 60) % 10).padStart(2, '0');
        const secs = String(Math.min(59, Math.max(8, words * 2))).padStart(2, '0');
        return `${hrs}:${mins}:${secs}`;
    }

    function ensureDom() {
        if (typeof document === 'undefined' || !document.body) return null;
        let ov = document.getElementById('vhs-overlay');
        if (ov) return ov;

        ov = document.createElement('div');
        ov.id = 'vhs-overlay';
        ov.className = 'vhs-overlay hidden';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-label', 'Видеоархив тёплых слов NEEOSOMA VTR-90');
        ov.innerHTML = `
            <div class="vhs-chassis soma-modal-chassis" id="vhs-chassis">
                <div class="vhs-head">
                    <div class="vhs-brand">
                        <span class="vhs-pilot" aria-hidden="true"></span>
                        <span class="vhs-model">NEEOSOMA // VTR-90</span>
                    </div>
                    <div class="vhs-head-right">
                        <span class="vhs-mode-lamp" id="vhs-mode-lamp" aria-hidden="true">SP · VHS</span>
                        <span class="vhs-counter" id="vhs-counter">00:00:00</span>
                        <button type="button" class="vhs-close-btn" id="vhs-close" aria-label="Закрыть видеоархив" title="Закрыть">✕</button>
                    </div>
                </div>

                <div class="vhs-body">
                    <div class="vhs-deck-stage">
                        <div class="vhs-crt-bezel">
                            <div class="vhs-crt" id="vhs-crt">
                                <div class="vhs-tracking-layer" aria-hidden="true"></div>
                                <div class="vhs-osd-top">
                                    <span class="vhs-osd-play" id="vhs-osd-play">STANDBY</span>
                                    <span class="vhs-osd-date" id="vhs-osd-date">--.--.----</span>
                                </div>
                                <div class="vhs-crt-scroll" id="vhs-crt-scroll"></div>
                                <div class="vhs-osd-bot">
                                    <span id="vhs-osd-chan">ШЁПОТ // АНОНИМНЫЙ АРХИВ</span>
                                    <span id="vhs-osd-pos">00 / 00</span>
                                </div>
                            </div>
                        </div>

                        <div class="vhs-slot-bay" id="vhs-slot-bay" aria-label="Кассетоприёмник VHS">
                            <div class="vhs-slot-flap" aria-hidden="true">▼ VHS · ВСТАВЬТЕ КАССЕТУ ▼</div>
                            <div class="vhs-carriage" id="vhs-carriage">
                                <div class="vhs-reel-win" aria-hidden="true"><span class="vhs-reel"></span></div>
                                <div class="vhs-slot-sticker">
                                    <span class="vhs-slot-num" id="vhs-slot-num">VHS #001</span>
                                    <span class="vhs-slot-date" id="vhs-slot-date">01.01.2026</span>
                                </div>
                                <div class="vhs-reel-win" aria-hidden="true"><span class="vhs-reel vhs-reel--right"></span></div>
                            </div>
                        </div>

                        <div class="vhs-transport">
                            <button type="button" class="vhs-tbtn" id="vhs-prev" aria-label="Предыдущая кассета" title="Предыдущая кассета">⏮</button>
                            <button type="button" class="vhs-tbtn vhs-tbtn--eject" id="vhs-eject">⏏ ИЗВЛЕЧЬ</button>
                            <button type="button" class="vhs-tbtn" id="vhs-next" aria-label="Следующая кассета" title="Следующая кассета">⏭</button>
                            <button type="button" class="vhs-tbtn vhs-tbtn--fav" id="vhs-fav" aria-label="Отметить кассету избранной" title="В избранное">★</button>
                            <button type="button" class="vhs-tbtn vhs-tbtn--share" id="vhs-share" aria-label="Поделиться снимком кассеты" title="Снимок кассеты">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 15-4.5-4.5L7 20"/></svg>
                                <span>СНИМОК</span>
                            </button>
                        </div>
                    </div>

                    <div class="vhs-shelf">
                        <div class="vhs-tools">
                            <div class="vhs-search-wrap">
                                <span class="vhs-search-ico" aria-hidden="true">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                                </span>
                                <input type="search" class="vhs-search" id="vhs-search" placeholder="Поиск по словам, #номеру или ДД.ММ.ГГГГ…" autocomplete="off" spellcheck="false">
                                <button type="button" class="vhs-search-clear hidden" id="vhs-search-clear" aria-label="Очистить поиск">✕</button>
                            </div>
                            <div class="vhs-filter-bar">
                                <div class="vhs-pills" id="vhs-pills"></div>
                                <button type="button" class="vhs-sort-btn" id="vhs-sort">НОВЫЕ ↓</button>
                            </div>
                        </div>
                        <div class="vhs-list soma-kb-scroll" id="vhs-list" role="listbox" aria-label="Полка VHS-кассет с тёплыми словами"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(ov);

        // Плавный поворот-зависимый тач-скролл и кассетницы, и ЭЛТ-экрана в Fullscreen (±90° / 180° / 0°)
        if (typeof window !== 'undefined' && typeof window.bindSomaSceneScroll === 'function') {
            window.bindSomaSceneScroll(ov.querySelector('#vhs-list'));
            window.bindSomaSceneScroll(ov.querySelector('#vhs-crt-scroll'));
        }
        // Клавиатура при поиске: часисы магнитофона и полка кассет не сжимаются
        // под клавиатуру — остаются на своих высотах, навигация по полке — скроллом.
        // Функции _somaKb* живут в index.html (загружается после vhs.js), поэтому проверка typeof.
        if (typeof _somaKbBind === 'function') _somaKbBind(ov);

        // Клик по фону — аккуратно свернуть деку
        ov.addEventListener('click', ev => {
            if (ev.target === ov) closeVhs();
        });
        const closeBtn = ov.querySelector('#vhs-close');
        if (closeBtn) closeBtn.addEventListener('click', closeVhs);

        const searchEl = ov.querySelector('#vhs-search');
        const clearEl = ov.querySelector('#vhs-search-clear');
        if (searchEl) {
            searchEl.addEventListener('input', () => {
                state.query = searchEl.value || '';
                if (clearEl) clearEl.classList.toggle('hidden', !state.query);
                renderShelfOnly();
            });
        }
        if (clearEl) {
            clearEl.addEventListener('click', () => {
                state.query = '';
                if (searchEl) { searchEl.value = ''; searchEl.focus(); }
                clearEl.classList.add('hidden');
                renderShelfOnly();
            });
        }

        const sortBtn = ov.querySelector('#vhs-sort');
        if (sortBtn) {
            sortBtn.addEventListener('click', () => {
                state.sort = state.sort === 'newest' ? 'oldest' : 'newest';
                playVhsMech('tap');
                renderAll(false);
            });
        }

        const prevBtn = ov.querySelector('#vhs-prev');
        const nextBtn = ov.querySelector('#vhs-next');
        const ejectBtn = ov.querySelector('#vhs-eject');
        const favBtn = ov.querySelector('#vhs-fav');
        const shareBtn = ov.querySelector('#vhs-share');

        if (prevBtn) prevBtn.addEventListener('click', () => stepTape(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => stepTape(1));
        if (ejectBtn) {
            ejectBtn.addEventListener('click', () => {
                const all = getTapes();
                if (!all.length) return;
                if (activeId()) {
                    playVhsMech('eject');
                    if (typeof ejectCassette === 'function') ejectCassette(true);
                    renderAll(false);
                } else {
                    const vis = filteredTapes(all);
                    insertTape((vis[0] || all[0]).id);
                }
            });
        }
        if (favBtn) {
            favBtn.addEventListener('click', () => {
                const cur = activeId();
                if (!cur || typeof toggleCassetteFav !== 'function') return;
                playVhsMech('tap');
                toggleCassetteFav(cur);
                renderAll(false);
            });
        }
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                const all = getTapes();
                const cur = all.find(t => t.id === activeId());
                if (!cur) return;
                if (typeof window !== 'undefined' && window.SOMA_SHARE && typeof window.SOMA_SHARE.shareVhs === 'function') {
                    window.SOMA_SHARE.shareVhs(cur);
                }
            });
        }

        return ov;
    }

    function triggerInsertAnimation() {
        const crt = document.getElementById('vhs-crt');
        const car = document.getElementById('vhs-carriage');
        if (crt) {
            crt.classList.remove('is-tracking');
            void crt.offsetWidth;
            crt.classList.add('is-tracking');
            clearTimeout(state.trackingTimer);
            state.trackingTimer = setTimeout(() => crt.classList.remove('is-tracking'), 450);
        }
        if (car) {
            car.classList.remove('is-loading');
            void car.offsetWidth;
            car.classList.add('is-loading');
            clearTimeout(state.loadAnimTimer);
            state.loadAnimTimer = setTimeout(() => car.classList.remove('is-loading'), 460);
        }
    }

    function insertTape(id) {
        if (!id) return;
        const changed = activeId() !== id;
        if (typeof playCassette === 'function') {
            playCassette(id, { silent: true });
        }
        playVhsMech('insert');
        renderAll(changed || true);
    }

    function revealLoadedTape() {
        const listEl = typeof document !== 'undefined' && document.getElementById('vhs-list');
        if (!listEl) return;
        const activeRow = listEl.querySelector('.vhs-tape.is-loaded');
        if (!activeRow) return;
        const top = activeRow.offsetTop - listEl.offsetTop;
        const bot = top + activeRow.offsetHeight;
        if (top < listEl.scrollTop) {
            listEl.scrollTop = Math.max(0, top - 4);
        } else if (bot > listEl.scrollTop + listEl.clientHeight) {
            listEl.scrollTop = Math.max(0, bot - listEl.clientHeight + 4);
        }
    }

    function stepTape(delta) {
        const all = getTapes();
        if (!all.length) return;
        const pool = filteredTapes(all);
        const seq = pool.length ? pool : all;
        const curIdx = seq.findIndex(t => t.id === activeId());
        const nextIdx = curIdx < 0 ? 0 : (curIdx + delta + seq.length) % seq.length;
        insertTape(seq[nextIdx].id);
        revealLoadedTape();
    }

    function renderScreen(all, current, animateInsert) {
        const chassis = document.getElementById('vhs-chassis');
        const counterEl = document.getElementById('vhs-counter');
        const playEl = document.getElementById('vhs-osd-play');
        const dateEl = document.getElementById('vhs-osd-date');
        const scrollEl = document.getElementById('vhs-crt-scroll');
        const chanEl = document.getElementById('vhs-osd-chan');
        const posEl = document.getElementById('vhs-osd-pos');
        const slotNum = document.getElementById('vhs-slot-num');
        const slotDate = document.getElementById('vhs-slot-date');
        const prevBtn = document.getElementById('vhs-prev');
        const nextBtn = document.getElementById('vhs-next');
        const ejectBtn = document.getElementById('vhs-eject');
        const favBtn = document.getElementById('vhs-fav');
        const shareBtn = document.getElementById('vhs-share');

        if (chassis) chassis.classList.toggle('has-tape', !!current);
        if (counterEl) counterEl.textContent = tapeCounterFor(current);

        if (current) {
            const num = padNum(current.num);
            if (playEl) playEl.textContent = `PLAY ►  VHS #${num}`;
            if (dateEl) dateEl.textContent = current.date;
            if (slotNum) slotNum.textContent = `VHS #${num}`;
            if (slotDate) slotDate.textContent = current.date;
            if (chanEl) chanEl.textContent = current.fav ? '★ ИЗБРАННАЯ ЗАПИСЬ · АНОНИМНО' : 'ШЁПОТ // АНОНИМНАЯ ЗАПИСЬ';
            const orderIdx = all.findIndex(t => t.id === current.id);
            if (posEl) posEl.textContent = `${String(Math.max(1, all.length - orderIdx)).padStart(2, '0')} / ${String(all.length).padStart(2, '0')}`;
            if (scrollEl) {
                scrollEl.innerHTML = `<p class="vhs-crt-text">«${escHtml(current.text)}»</p>`;
                scrollEl.scrollTop = 0;
            }
            if (animateInsert) triggerInsertAnimation();
        } else if (all.length > 0) {
            if (playEl) playEl.textContent = 'STOP ■  NO TAPE';
            if (dateEl) dateEl.textContent = '--.--.----';
            if (chanEl) chanEl.textContent = 'ДЕКА СВОБОДНА';
            if (posEl) posEl.textContent = `АРХИВ: ${String(all.length).padStart(2, '0')}`;
            if (scrollEl) {
                const newest = all[0];
                scrollEl.innerHTML = `
                    <div class="vhs-crt-empty">
                        <div class="vhs-crt-empty-title">ВСТАВЬТЕ VHS-КАССЕТУ</div>
                        <div class="vhs-crt-empty-sub">Нажмите на любую кассету на полке ниже — лента зайдёт в деку, и послание появится на экране.</div>
                        <button type="button" class="vhs-crt-insert-cta" id="vhs-quick-insert">▲ ВСТАВИТЬ VHS #${escHtml(padNum(newest.num))} · ${escHtml(newest.date)}</button>
                    </div>
                `;
                const qb = scrollEl.querySelector('#vhs-quick-insert');
                if (qb) qb.addEventListener('click', () => insertTape(newest.id));
            }
        } else {
            const d = new Date();
            const today = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
            if (playEl) playEl.textContent = 'STANDBY · ПУСТО';
            if (dateEl) dateEl.textContent = today;
            if (chanEl) chanEl.textContent = 'КАНАЛ «ШЁПОТ» · ОЖИДАНИЕ';
            if (posEl) posEl.textContent = '00 / 00';
            if (scrollEl) {
                scrollEl.innerHTML = `
                    <div class="vhs-crt-empty">
                        <div class="vhs-crt-empty-title">ПЛЁНКА ЧИСТА</div>
                        <div class="vhs-crt-empty-sub">Каждое анонимное тёплое послание для вас запишется на отдельную VHS-кассету с личным номером и полной датой ДД.ММ.ГГГГ.</div>
                    </div>
                `;
            }
        }

        if (prevBtn) prevBtn.disabled = all.length < 2;
        if (nextBtn) nextBtn.disabled = all.length < 2;
        if (ejectBtn) {
            ejectBtn.disabled = all.length === 0;
            ejectBtn.textContent = current ? '⏏ ИЗВЛЕЧЬ' : '▲ ВСТАВИТЬ';
        }
        if (favBtn) {
            favBtn.disabled = !current;
            favBtn.classList.toggle('is-active', !!(current && current.fav));
            favBtn.setAttribute('aria-pressed', String(!!(current && current.fav)));
        }
        if (shareBtn) {
            shareBtn.disabled = !current;
        }
    }

    function renderShelfOnly() {
        const all = getTapes();
        const curId = activeId();
        const pillsEl = document.getElementById('vhs-pills');
        const sortBtn = document.getElementById('vhs-sort');
        const listEl = document.getElementById('vhs-list');
        if (!listEl) return;

        // Годы из архива (если есть кассеты разных лет — показываем быстрые кнопки по годам!)
        const years = [];
        all.forEach(t => {
            const m = String(t.date || '').match(/\.(\d{4})$/);
            if (m && !years.includes(m[1])) years.push(m[1]);
        });
        years.sort((a, b) => Number(b) - Number(a));
        if (state.filter.startsWith('year:') && !years.includes(state.filter.slice(5))) {
            state.filter = 'all';
        }

        const favCount = all.filter(t => !!t.fav).length;
        if (pillsEl) {
            const pills = [
                { id: 'all', label: `ВСЕ (${all.length})` },
                { id: 'fav', label: `★ ИЗБРАННЫЕ (${favCount})` }
            ];
            if (years.length > 1) {
                years.slice(0, 3).forEach(y => pills.push({ id: `year:${y}`, label: y }));
            }
            pillsEl.innerHTML = pills.map(p => (
                `<button type="button" class="vhs-pill${state.filter === p.id ? ' is-active' : ''}" data-filter="${escHtml(p.id)}" aria-pressed="${state.filter === p.id}">${escHtml(p.label)}</button>`
            )).join('');
            pillsEl.querySelectorAll('[data-filter]').forEach(btn => {
                btn.addEventListener('click', () => {
                    state.filter = btn.getAttribute('data-filter') || 'all';
                    playVhsMech('tap');
                    renderShelfOnly();
                });
            });
        }

        if (sortBtn) {
            sortBtn.textContent = state.sort === 'newest' ? 'НОВЫЕ ↓' : 'СТАРЫЕ ↑';
        }

        const vis = filteredTapes(all);
        if (!all.length) {
            listEl.innerHTML = `<div class="vhs-list-empty">ПОЛКА ЖДЁТ ПЕРВУЮ КАССЕТУ · ЗДЕСЬ БУДУТ ХРАНИТЬСЯ ВСЕ ТЁПЛЫЕ СЛОВА С НОМЕРАМИ И ДАТАМИ</div>`;
            return;
        }
        if (!vis.length) {
            listEl.innerHTML = `<div class="vhs-list-empty">ПО ЭТОМУ ЗАПРОСУ КАССЕТ НЕ НАЙДЕНО · ПОПРОБУЙТЕ ДРУГОЕ СЛОВО, #НОМЕР ИЛИ ДАТУ</div>`;
            return;
        }

        listEl.innerHTML = vis.map(t => {
            const loaded = t.id === curId;
            const num = padNum(t.num);
            return `
                <div class="vhs-tape${loaded ? ' is-loaded' : ''}" role="option" tabindex="0" aria-selected="${loaded}" data-tape-id="${escHtml(t.id)}">
                    <div class="vhs-spine-label">
                        <span class="vhs-spine-num"><span>#${escHtml(num)}</span><span class="vhs-spine-tag">VHS</span></span>
                        <span class="vhs-spine-date">${escHtml(t.date)}</span>
                    </div>
                    <div class="vhs-tape-preview">
                        <div class="vhs-tape-snippet">${highlightSnippet(t.text, state.query)}</div>
                        <div class="vhs-tape-status">${loaded ? '► В ДЕКЕ · НА ЭКРАНЕ' : '▲ НАЖМИТЕ, ЧТОБЫ ВСТАВИТЬ'}</div>
                    </div>
                    <div class="vhs-tape-actions">
                        <button type="button" class="vhs-del-btn" data-del-id="${escHtml(t.id)}" aria-label="Удалить кассету" title="Удалить кассету">✕</button>
                        <button type="button" class="vhs-star-btn${t.fav ? ' is-fav' : ''}" data-fav-id="${escHtml(t.id)}" aria-label="${t.fav ? 'Убрать из избранного' : 'В избранное'}" title="${t.fav ? 'В избранном' : 'Отметить важной'}">${t.fav ? '★' : '☆'}</button>
                    </div>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('[data-del-id]').forEach(del => {
            del.addEventListener('click', ev => {
                ev.stopPropagation();
                const id = del.getAttribute('data-del-id');
                if (!id) return;
                if (typeof deleteCassette === 'function' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
                    const tape = getTapes().find(t => t.id === id);
                    const label = tape ? `#${padNum(tape.num)}` : '';
                    if (!window.confirm(`Удалить кассету ${label}?\nЗапись будет удалена из архива без возможности восстановления.`)) return;
                    playVhsMech('tap');
                    deleteCassette(id);
                    renderAll(false);
                }
            });
        });

        listEl.querySelectorAll('[data-fav-id]').forEach(star => {
            star.addEventListener('click', ev => {
                ev.stopPropagation();
                const id = star.getAttribute('data-fav-id');
                if (id && typeof toggleCassetteFav === 'function') {
                    playVhsMech('tap');
                    toggleCassetteFav(id);
                    renderAll(false);
                }
            });
        });

        listEl.querySelectorAll('[data-tape-id]').forEach(row => {
            const pick = () => {
                const id = row.getAttribute('data-tape-id');
                if (id) insertTape(id);
            };
            row.addEventListener('click', pick);
            row.addEventListener('keydown', ev => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    pick();
                }
            });
        });
    }

    function renderAll(animateInsert) {
        const all = getTapes();
        const current = all.find(t => t.id === activeId()) || null;
        renderScreen(all, current, !!animateInsert);
        renderShelfOnly();
    }

    function syncMount() {
        if (typeof document === 'undefined') return;
        const ov = document.getElementById('vhs-overlay');
        if (!ov) return;
        const inFs = isSceneFullscreen();
        const scene = document.getElementById('station-scene');
        const target = (inFs && scene) ? scene : document.body;
        if (target && ov.parentElement !== target) {
            target.appendChild(ov);
        }
        ov.classList.toggle('is-in-scene', !!(inFs && scene));
    }

    function openVhs(cassetteId) {
        const ov = ensureDom();
        if (!ov) return;
        const all = getTapes();
        let didInsert = false;
        if (cassetteId && all.some(t => t.id === cassetteId)) {
            if (typeof playCassette === 'function') playCassette(cassetteId, { silent: true });
            didInsert = true;
        } else if (!activeId() && all.length) {
            if (typeof playCassette === 'function') playCassette(all[0].id, { silent: true });
            didInsert = true;
        }
        state.open = true;
        syncMount();
        if (typeof _somaKbUpdate === 'function') _somaKbUpdate(ov);
        ov.classList.remove('hidden');
        if (didInsert) playVhsMech('insert');
        else playVhsMech('tap');
        if (typeof roomAnim !== 'undefined' && roomAnim && roomAnim.isFullscreen && typeof bumpFullscreenHud === 'function') {
            bumpFullscreenHud();
        }
        renderAll(didInsert);
        revealLoadedTape();
    }

    function closeVhs() {
        if (!state.open) return;
        state.open = false;
        const ov = typeof document !== 'undefined' && document.getElementById('vhs-overlay');
        if (ov) {
            ov.classList.add('hidden');
            ov.classList.remove('is-kb-open');
            if (ov.__somaKbOff) { ov.__somaKbOff(); ov.__somaKbOff = null; ov.__somaKbBound = false; }
        }
        if (typeof roomAnim !== 'undefined' && roomAnim && roomAnim.isFullscreen && typeof showFullscreenCaption === 'function') {
            const cur = getTapes().find(t => t.id === activeId());
            if (cur) showFullscreenCaption(`VHS #${padNum(cur.num)} · ${cur.date} · «${cur.text.slice(0, 58)}${cur.text.length > 58 ? '…' : ''}»`);
        }
        if (typeof window !== 'undefined' && typeof window.restoreSomaScroll === 'function') {
            window.restoreSomaScroll();
        }
    }

    function refresh() {
        if (!state.open) return;
        renderAll(false);
    }

    function isOpen() {
        return !!state.open;
    }

    // Клавиши внутри видеомагнитофона: Escape закрывает VTR-90 (не сбивая Fullscreen!), стрелки листают кассеты
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        document.addEventListener('keydown', ev => {
            if (!state.open) return;
            if (typeof window !== 'undefined' && window.SOMA_SHARE && typeof window.SOMA_SHARE.isOpen === 'function' && window.SOMA_SHARE.isOpen()) {
                return;
            }
            const tag = (ev.target && ev.target.tagName) ? ev.target.tagName.toUpperCase() : '';
            const inInput = tag === 'INPUT' || tag === 'TEXTAREA';
            if (ev.key === 'Escape') {
                ev.preventDefault();
                ev.stopImmediatePropagation();
                closeVhs();
            } else if (!inInput && ev.key === 'ArrowLeft') {
                ev.preventDefault();
                stepTape(-1);
            } else if (!inInput && ev.key === 'ArrowRight') {
                ev.preventDefault();
                stepTape(1);
            }
        }, true);
    }

    if (typeof window !== 'undefined') {
        window.SOMA_VHS = {
            open: openVhs,
            close: closeVhs,
            refresh,
            syncMount,
            isOpen,
            insertTape
        };
    }
})();
