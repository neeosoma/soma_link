const stationPhases = [
    { at: 0, name: 'Дождь', entry: 'Город шумит. Здесь можно остановиться.' },
    { at: 5, name: 'Оттепель', entry: 'От стекла больше не тянет холодом.' },
    { at: 15, name: 'Очаг', entry: 'Тёплый свет доходит до самого пола.' },
    { at: 30, name: 'Рассвет', entry: 'Ночь ещё видна, но она уже отступает.' }
];

function stationState(warmth, equipped) {
    const unlocked = stationPhases.reduce((last, phase, i) => warmth >= phase.at ? i : last, 0);
    const active = Number.isInteger(equipped) && equipped >= 0 && equipped <= unlocked ? equipped : unlocked;
    return { unlocked, active, next: stationPhases[unlocked + 1] };
}

function renderRoom() {
    const room = document.getElementById('station');
    const warmth = roomPreview ? 30 : Math.max(0, player.warmth || 0);
    let equipped;
    try { const saved = localStorage.getItem('soma_station_phase'); if (saved !== null) equipped = Number(saved); } catch (_) {}
    const { unlocked, active, next } = stationState(warmth, roomPreview ? undefined : equipped);
    const stars = (roomPreview ? ranks.length - 1 : rankIdx()) + 1;
    const phase = stationPhases[active];
    room.dataset.phase = active;
    document.getElementById('warmth-val').textContent = warmth;
    document.getElementById('station-mode').textContent = roomPreview ? 'ДЕМОНСТРАЦИЯ // 01' : 'ЛИЧНАЯ СТАНЦИЯ // 01';
    document.getElementById('station-entry').textContent = phase.entry;
    document.getElementById('station-next').textContent = next ? `До атмосферы «${next.name}»: ещё ${next.at - warmth} тепла.` : 'Все атмосферы открыты. Можно выбрать любую.';
    const meter = document.getElementById('station-meter');
    meter.hidden = !next;
    if (next) { meter.max = next.at - stationPhases[unlocked].at; meter.value = warmth - stationPhases[unlocked].at; }
    room.querySelectorAll('[data-preset]').forEach((button, i) => {
        button.disabled = roomPreview || i > unlocked;
        button.setAttribute('aria-pressed', String(i === active));
        button.querySelector('span').textContent = i > unlocked ? `${stationPhases[i].at} тепла` : i === active ? 'выбрано' : 'открыто';
    });
    room.querySelectorAll('.station-sky circle, .station-sky line').forEach(el => {
        el.style.opacity = Number(el.dataset.star) <= stars ? 1 : 0;
    });
    document.getElementById('station-stars').textContent = `Карта неба: ${stars}/6. С каждым новым рангом загорается звезда.`;
    document.getElementById('app-radio').style.opacity = musicFound() ? 1 : 0.65;
}

function equipStationPhase(i) {
    if (roomPreview || !Number.isInteger(i) || !stationPhases[i] || (player.warmth || 0) < stationPhases[i].at) return;
    try { localStorage.setItem('soma_station_phase', String(i)); } catch (_) { notify('Не удалось сохранить атмосферу на этом устройстве.'); }
    renderRoom();
}
