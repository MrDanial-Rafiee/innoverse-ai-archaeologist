/* =========================================================
   ACTIVITY LOG  (professional · CSV-exportable · viewable in the UI)
   window.AkkLog.log(category, action, detail) records every meaningful
   process the app runs (translations, reconstructions, cuneiform
   generation, voice, profile views, navigation …). A floating button
   opens a table view with Download CSV + Clear; entries persist to
   localStorage across reloads. Load this BEFORE js/script.js.
   ========================================================= */
(function () {
  const KEY = 'akkadian_activity_log_v1';
  const MAX = 1000;
  let rows = [];
  try { rows = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(rows)) rows = []; } catch (e) { rows = []; }

  function persist() { try { localStorage.setItem(KEY, JSON.stringify(rows.slice(-MAX))); } catch (e) {} }
  function fmt(iso) { try { return new Date(iso).toLocaleString(); } catch (e) { return iso; } }

  /* best-effort mirror of each event into the server-side CSV/ folder.
     When the engine isn't running we only probe every ~15s so a down
     server never spams the console with failed requests. */
  let serverUp = false, lastProbe = 0;
  function syncToServer(row) {
    // Never write to the CSV folder for events that fire automatically on page
    // load (session-start, dictionary lazy-load). A file-watching dev server
    // (e.g. VS Code Live Server) would see the write and reload the page, which
    // would fire the load events again … an infinite refresh loop. Only explicit
    // user actions (translate, reconstruct, …) are mirrored to the server CSV.
    if (!row) return;
    if (row.category === 'System') return;
    if (row.category === 'Dictionary' && row.action === 'load') return;
    try {
      const base = (location.port === '3000') ? '' : 'http://127.0.0.1:3000';
      if (!serverUp && (Date.now() - lastProbe) < 15000) return;   // known down: wait for next probe window
      if (!serverUp) lastProbe = Date.now();
      fetch(base + '/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row), keepalive: true })
        .then(function () { serverUp = true; })
        .catch(function () { serverUp = false; });
    } catch (e) {}
  }

  const API = {
    log: function (category, action, detail) {
      const row = { ts: new Date().toISOString(), category: String(category || ''), action: String(action || ''), detail: (detail == null ? '' : String(detail)) };
      rows.push(row);
      if (rows.length > MAX) rows = rows.slice(-MAX);
      persist();
      document.dispatchEvent(new CustomEvent('akklog:add', { detail: row }));
      syncToServer(row);   // best-effort append to the server-side CSV/ folder
      return row;
    },
    all: function () { return rows.slice(); },
    count: function () { return rows.length; },
    clear: function () { rows = []; persist(); document.dispatchEvent(new CustomEvent('akklog:clear')); },
    toCSV: function () {
      const esc = (s) => '"' + String(s).replace(/"/g, '""') + '"';
      const head = ['timestamp', 'category', 'action', 'detail'].map(esc).join(',');
      const body = rows.map((r) => [r.ts, r.category, r.action, r.detail].map(esc).join(',')).join('\r\n');
      return head + '\r\n' + body + '\r\n';
    },
    download: function () {
      const blob = new Blob(['﻿' + API.toCSV()], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'akkadian_activity_log.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  };
  window.AkkLog = API;

  /* ---------- floating button + modal table ---------- */
  function build() {
    if (document.querySelector('.log-fab')) return;

    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'log-fab'; btn.setAttribute('aria-label', 'Open the activity log');
    btn.innerHTML = '<span class="log-fab-ico">&#128202;</span><span class="log-fab-txt">Activity log</span><span class="log-fab-n"></span>';
    document.body.appendChild(btn);
    const nEl = btn.querySelector('.log-fab-n');

    const modal = document.createElement('div');
    modal.className = 'log-modal'; modal.hidden = true;
    modal.innerHTML =
      '<div class="log-modal-box">' +
        '<div class="log-modal-head">' +
          '<div class="log-modal-titles"><span class="log-modal-title">&#128202; Activity log</span>' +
          '<span class="log-modal-sub">every process the app runs — exportable to CSV</span></div>' +
          '<div class="log-modal-actions">' +
            '<button type="button" class="log-btn log-btn--csv" data-act="csv">&#8681; Download CSV</button>' +
            '<button type="button" class="log-btn" data-act="clear">Clear</button>' +
            '<button type="button" class="log-modal-close" aria-label="Close">&#10005;</button>' +
          '</div>' +
        '</div>' +
        '<div class="log-table-wrap"><table class="log-table"><thead><tr>' +
          '<th>Time</th><th>Category</th><th>Action</th><th>Detail</th>' +
        '</tr></thead><tbody></tbody></table></div>' +
      '</div>';
    document.body.appendChild(modal);
    const tbody = modal.querySelector('tbody');

    function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
    function rowHTML(r) {
      const catKey = r.category.toLowerCase().replace(/[^a-z]/g, '');
      return '<tr><td class="lt-time">' + esc(fmt(r.ts)) + '</td>' +
             '<td><span class="lt-cat lt-cat-' + catKey + '">' + esc(r.category) + '</span></td>' +
             '<td class="lt-act">' + esc(r.action) + '</td>' +
             '<td class="lt-detail">' + esc(r.detail) + '</td></tr>';
    }
    function renderAll() {
      tbody.innerHTML = rows.length
        ? rows.slice().reverse().map(rowHTML).join('')
        : '<tr><td colspan="4" class="lt-empty">No activity yet — use the translator or reconstruct a broken tablet.</td></tr>';
    }
    function badge() { nEl.textContent = rows.length ? String(rows.length) : ''; nEl.style.display = rows.length ? '' : 'none'; }
    badge();

    let openState = false;
    function open() { openState = true; renderAll(); modal.hidden = false; setTimeout(() => modal.classList.add('is-open'), 10); }
    function close() { openState = false; modal.classList.remove('is-open'); setTimeout(() => { modal.hidden = true; }, 260); }

    btn.addEventListener('click', open);
    modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('.log-modal-close')) close(); });
    modal.querySelector('[data-act="csv"]').addEventListener('click', API.download);
    modal.querySelector('[data-act="clear"]').addEventListener('click', () => API.clear());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

    document.addEventListener('akklog:add', (e) => {
      badge();
      if (openState) {
        const empty = tbody.querySelector('.lt-empty');
        if (empty) empty.closest('tr').remove();
        tbody.insertAdjacentHTML('afterbegin', rowHTML(e.detail));
      }
    });
    document.addEventListener('akklog:clear', () => { badge(); if (openState) renderAll(); });

    API.log('System', 'session-start', 'page loaded');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
