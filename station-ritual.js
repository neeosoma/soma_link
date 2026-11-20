/* Privacy-preserving client contract for the station's shared atmosphere. */
(function (root) {
    'use strict';

    function normalizeStatus(response) {
        const row = Array.isArray(response) ? response[0] : response;
        if (!row || typeof row !== 'object' || typeof row.is_lit !== 'boolean') return null;
        return Object.freeze({ lit: row.is_lit });
    }

    function describeStatus(status) {
        if (!status || typeof status.lit !== 'boolean') {
            return {
                state: 'unavailable',
                copy: 'Общий фон станции сейчас недоступен. Ничего делать не нужно.'
            };
        }
        if (status.lit) {
            return {
                state: 'lit',
                copy: 'В окнах станции — мягкий общий свет. Он не указывает на конкретную историю.'
            };
        }
        return {
            state: 'quiet',
            copy: 'Станция отдыхает. Читать, оставить знак или пройти мимо — одинаково нормально.'
        };
    }

    const api = Object.freeze({ normalizeStatus, describeStatus });
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root && root.document) root.SOMA_RITUAL = api;
})(typeof window !== 'undefined' ? window : globalThis);
