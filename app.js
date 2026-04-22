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
const charCountEl = document.getElementById('charCount');

// Garmin Connect alphaNumeric-Felder tolerieren zuverlaessig bis 255 Zeichen.
// Laengere Strings werden vom Save-Dialog verworfen.
const MAX_DEF_LENGTH = 255;
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
        row.draggable = true;
        row.dataset.idx = idx;

        row.innerHTML = `
            <span class="drag-handle" aria-hidden="true" title="Ziehen zum Verschieben">⋮⋮</span>
            <input type="number" min="1" max="50" value="${iv.reps}" data-idx="${idx}" data-field="reps" aria-label="Wiederholungen">
            <input type="number" min="1" max="5000" value="${iv.dist}" data-idx="${idx}" data-field="dist" aria-label="Distanz in Metern">
            <label class="rest-toggle">
                <input type="checkbox" data-idx="${idx}" data-field="rest" ${iv.rest ? 'checked' : ''}>
                Pause
            </label>
            <input type="text" maxlength="40" value="${escapeHtml(iv.desc)}" placeholder="Beschreibung (optional)" data-idx="${idx}" data-field="desc">
            <button class="btn-icon" data-idx="${idx}" data-action="duplicate" aria-label="Duplizieren" title="Duplizieren">⧉</button>
            <button class="btn-danger" data-idx="${idx}" data-action="remove" aria-label="Entfernen" title="Entfernen">×</button>
        `;

        intervalsEl.appendChild(row);
    });

    renderOutput();
    renderSummary();
}

function renderOutput() {
    const str = generateString(intervals);
    outputEl.value = str;
    renderCharCount(str.length);
}

function renderCharCount(len) {
    const over = len > MAX_DEF_LENGTH;
    charCountEl.textContent = `${len} / ${MAX_DEF_LENGTH} Zeichen` + (over ? ' — zu lang!' : '');
    charCountEl.classList.toggle('over-limit', over);
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
    const action = t.dataset.action;
    if (!action) { return; }
    const idx = Number(t.dataset.idx);
    if (isNaN(idx)) { return; }
    if (action === 'remove') {
        intervals.splice(idx, 1);
        render();
    } else if (action === 'duplicate') {
        // Flache Kopie reicht: alle Felder sind Primitives.
        intervals.splice(idx + 1, 0, { ...intervals[idx] });
        render();
    }
});

// ------------------------------------------------------------
// Drag & Drop — Intervalle umsortieren
// ------------------------------------------------------------
// dragFromIdx haelt den Start-Index einer laufenden Drag-Operation.
// Beim Drop wird das Element an dragOverIdx eingesetzt und ein einziges
// render() triggert das vollstaendige Neu-Rendering inkl. Output.
let dragFromIdx = null;

intervalsEl.addEventListener('dragstart', e => {
    const row = e.target.closest('.interval-row');
    if (!row) { return; }
    // Inputs duerfen weiterhin Text-Selektion erlauben, also Drag nur ab
    // Handle oder Row-Leerflaeche (nicht ab einem focussed Input).
    if (e.target.tagName === 'INPUT') {
        e.preventDefault();
        return;
    }
    dragFromIdx = Number(row.dataset.idx);
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    // Firefox braucht gesetzten dataTransfer damit dragstart feuert.
    e.dataTransfer.setData('text/plain', String(dragFromIdx));
});

intervalsEl.addEventListener('dragend', e => {
    const row = e.target.closest('.interval-row');
    if (row) { row.classList.remove('dragging'); }
    clearDropIndicator();
    dragFromIdx = null;
});

intervalsEl.addEventListener('dragover', e => {
    if (dragFromIdx === null) { return; }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const row = e.target.closest('.interval-row');
    clearDropIndicator();
    if (!row) { return; }
    const rect = row.getBoundingClientRect();
    const after = (e.clientY - rect.top) > rect.height / 2;
    row.classList.add(after ? 'drop-after' : 'drop-before');
});

intervalsEl.addEventListener('dragleave', e => {
    // Nur Indikator vom verlassenen Row entfernen, nicht global clearen
    // (sonst flackert es beim Wandern zwischen Rows).
    const row = e.target.closest('.interval-row');
    if (row && !row.contains(e.relatedTarget)) {
        row.classList.remove('drop-before', 'drop-after');
    }
});

intervalsEl.addEventListener('drop', e => {
    if (dragFromIdx === null) { return; }
    e.preventDefault();
    const row = e.target.closest('.interval-row');
    if (!row) { clearDropIndicator(); return; }
    const toIdx = Number(row.dataset.idx);
    const rect = row.getBoundingClientRect();
    const after = (e.clientY - rect.top) > rect.height / 2;
    let insertAt = after ? toIdx + 1 : toIdx;

    if (dragFromIdx !== insertAt && dragFromIdx !== insertAt - 1) {
        const [moved] = intervals.splice(dragFromIdx, 1);
        // Nach Splice kann sich der Ziel-Index verschoben haben.
        if (dragFromIdx < insertAt) { insertAt--; }
        intervals.splice(insertAt, 0, moved);
        render();
    }
    clearDropIndicator();
    dragFromIdx = null;
});

function clearDropIndicator() {
    intervalsEl.querySelectorAll('.drop-before, .drop-after')
        .forEach(el => el.classList.remove('drop-before', 'drop-after'));
}

copyBtn.addEventListener('click', async () => {
    const str = outputEl.value;
    if (str.length === 0) {
        showStatus(copyStatus, 'Keine Definition zum Kopieren.', true);
        return;
    }
    if (str.length > MAX_DEF_LENGTH) {
        showStatus(copyStatus, `String zu lang (${str.length}/${MAX_DEF_LENGTH}). Intervalle entfernen oder kürzere Beschreibungen.`, true);
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
