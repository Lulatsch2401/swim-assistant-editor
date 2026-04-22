'use strict';

// ============================================================
// Swim Assistant Workout Editor
// Generiert und parst Workout-Definitionen im Semikolon-Format
//
// Format:  <Distanz>[*<Wiederholungen>][-][:<Beschreibung>]
//   200                 -> 1x 200m
//   100*4               -> 4x 100m
//   50-                 -> 1x 50m Pause
//   25*8-:Erholung      -> 8x 25m Pause "Erholung"
//   100*4:Kraul Faust   -> 4x 100m "Kraul Faust"
// ============================================================

// In-Memory State
let intervals = [];

// DOM Refs
const intervalsEl = document.getElementById('intervals');
const addBtn = document.getElementById('addInterval');
const outputEl = document.getElementById('output');
const copyBtn = document.getElementById('copyBtn');
const copyStatus = document.getElementById('copyStatus');
const summaryEl = document.getElementById('summary');
const importInput = document.getElementById('importInput');
const importBtn = document.getElementById('importBtn');
const importStatus = document.getElementById('importStatus');

// ------------------------------------------------------------
// Render
// ------------------------------------------------------------
function render() {
    intervalsEl.innerHTML = '';
    intervals.forEach((iv, idx) => {
        const row = document.createElement('div');
        row.className = 'interval-row' + (iv.rest ? ' rest' : '');

        row.innerHTML = `
            <input type="number" min="1" max="50" value="${iv.reps}" data-idx="${idx}" data-field="reps" aria-label="Wiederholungen">
            <input type="number" min="1" max="5000" value="${iv.dist}" data-idx="${idx}" data-field="dist" aria-label="Distanz in Metern">
            <label class="rest-toggle">
                <input type="checkbox" data-idx="${idx}" data-field="rest" ${iv.rest ? 'checked' : ''}>
                Pause
            </label>
            <input type="text" maxlength="40" value="${escapeHtml(iv.desc)}" placeholder="Beschreibung (optional)" data-idx="${idx}" data-field="desc">
            <button class="btn-danger" data-idx="${idx}" data-action="remove" aria-label="Entfernen">×</button>
        `;

        intervalsEl.appendChild(row);
    });

    renderOutput();
    renderSummary();
}

function renderOutput() {
    outputEl.value = generateString(intervals);
}

function renderSummary() {
    const totalSegments = intervals.length;
    if (totalSegments === 0) {
        summaryEl.textContent = 'Noch keine Intervalle.';
        return;
    }
    let totalM = 0;
    let activeM = 0;
    intervals.forEach(iv => {
        const m = iv.reps * iv.dist;
        totalM += m;
        if (!iv.rest) { activeM += m; }
    });
    summaryEl.textContent = `${totalSegments} Segment${totalSegments === 1 ? '' : 'e'}  ·  ${totalM}m gesamt  ·  ${activeM}m schwimmaktiv`;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

// ------------------------------------------------------------
// Generator: Array -> String
// ------------------------------------------------------------
function generateString(arr) {
    return arr.map(iv => {
        let seg = String(iv.dist);
        if (iv.reps > 1) { seg += '*' + iv.reps; }
        if (iv.rest) { seg += '-'; }
        if (iv.desc && iv.desc.trim().length > 0) {
            seg += ':' + iv.desc.trim();
        }
        return seg;
    }).join(';');
}

// ------------------------------------------------------------
// Parser: String -> Array
// ------------------------------------------------------------
function parseString(str) {
    const result = [];
    if (!str) { return result; }

    const segments = str.split(';');
    for (const rawSeg of segments) {
        const seg = rawSeg.trim();
        if (seg.length === 0) { continue; }
        const parsed = parseSegment(seg);
        if (parsed) { result.push(parsed); }
    }
    return result;
}

function parseSegment(seg) {
    let desc = '';
    let main = seg;

    // Beschreibung nach dem ersten ':' abspalten
    const colonIdx = main.indexOf(':');
    if (colonIdx >= 0) {
        desc = main.substring(colonIdx + 1).trim();
        main = main.substring(0, colonIdx);
    }
    main = main.trim();

    // Rest-Marker '-' am Ende
    let isRest = false;
    if (main.endsWith('-')) {
        isRest = true;
        main = main.substring(0, main.length - 1).trim();
    }

    // Reps-Teil abspalten (nach '*')
    let reps = 1;
    let distStr = main;
    const starIdx = main.indexOf('*');
    if (starIdx >= 0) {
        distStr = main.substring(0, starIdx).trim();
        const repStr = main.substring(starIdx + 1).trim();
        const r = parseInt(repStr, 10);
        if (r > 0) { reps = r; }
    }

    const dist = parseInt(distStr, 10);
    if (!Number.isFinite(dist) || dist <= 0) {
        return null;
    }

    return {
        reps: reps,
        dist: dist,
        rest: isRest,
        desc: desc
    };
}

// ------------------------------------------------------------
// Events
// ------------------------------------------------------------
addBtn.addEventListener('click', () => {
    intervals.push({
        reps: 1,
        dist: 100,
        rest: false,
        desc: ''
    });
    render();
    // Focus letztes Feld
    const inputs = intervalsEl.querySelectorAll('.interval-row:last-child input');
    if (inputs.length > 1) { inputs[1].focus(); }
});

intervalsEl.addEventListener('input', e => {
    const t = e.target;
    const idx = Number(t.dataset.idx);
    const field = t.dataset.field;
    if (!field || isNaN(idx)) { return; }

    if (t.type === 'checkbox') {
        intervals[idx][field] = t.checked;
        render();  // re-render fuer Rest-Farbe
        return;
    }
    if (t.type === 'number') {
        const v = parseInt(t.value, 10);
        intervals[idx][field] = Number.isFinite(v) && v > 0 ? v : 0;
    } else {
        intervals[idx][field] = t.value;
    }
    renderOutput();
    renderSummary();
});

intervalsEl.addEventListener('click', e => {
    const t = e.target;
    if (t.dataset.action === 'remove') {
        const idx = Number(t.dataset.idx);
        intervals.splice(idx, 1);
        render();
    }
});

copyBtn.addEventListener('click', async () => {
    const str = outputEl.value;
    if (str.length === 0) {
        showStatus(copyStatus, 'Keine Definition zum Kopieren.', true);
        return;
    }
    try {
        await navigator.clipboard.writeText(str);
        showStatus(copyStatus, '✓ Kopiert! Jetzt in Garmin Connect einfügen.', false);
    } catch (err) {
        // Fallback fuer alte Browser
        outputEl.select();
        document.execCommand('copy');
        showStatus(copyStatus, '✓ Kopiert (Fallback).', false);
    }
});

importBtn.addEventListener('click', () => {
    const str = importInput.value.trim();
    if (str.length === 0) {
        showStatus(importStatus, 'Bitte einen String einfügen.', true);
        return;
    }
    const parsed = parseString(str);
    if (parsed.length === 0) {
        showStatus(importStatus, 'Konnte den String nicht parsen. Syntax prüfen.', true);
        return;
    }
    intervals = parsed;
    render();
    showStatus(importStatus, `✓ ${parsed.length} Intervall${parsed.length === 1 ? '' : 'e'} geladen.`, false);
});

function showStatus(el, msg, isError) {
    el.textContent = msg;
    el.className = 'copy-status' + (isError ? ' error' : '');
    setTimeout(() => { el.textContent = ''; }, 4000);
}

// ------------------------------------------------------------
// Initial State: Beispiel-Workout
// ------------------------------------------------------------
intervals = [
    { reps: 1, dist: 200, rest: false, desc: 'Einschwimmen' },
    { reps: 4, dist: 100, rest: false, desc: 'Kraul' },
    { reps: 1, dist: 50, rest: true, desc: 'Pause' },
    { reps: 1, dist: 200, rest: false, desc: 'Ausschwimmen' }
];

render();
