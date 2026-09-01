/* =========================================================
   TRANSLITERATION -> CUNEIFORM  (client-side sign generator)
   Most dictionary entries have no stored cuneiform glyph (only ~6% do). This
   fills the gap: it segments a transliteration into cuneiform signs using the
   sign table in data/akkadian/cuneiform_signs.js (built from Unicode names,
   mirroring the engine's transliteration_to_cuneiform + base-reading aliases).
   Words already hyphenated are split on '-'; plain citation forms are segmented
   greedily (longest sign first). The result is an approximate syllabic spelling.
   Exposed as window.translitToCuneiform(text).
   ========================================================= */
(function () {
  const FOLD = { 'š':'sh','ṣ':'s','ṭ':'t','ḫ':'h','ĝ':'g','ŋ':'g',
    'à':'a','á':'a','â':'a','ā':'a','è':'e','é':'e','ê':'e','ē':'e',
    'ì':'i','í':'i','î':'i','ī':'i','ù':'u','ú':'u','û':'u','ū':'u',
    'ʾ':'','ʿ':'',"'":'','’':'' };
  function norm(s) {
    s = String(s).normalize('NFC').toLowerCase();
    let out = '';
    for (const ch of s) out += (Object.prototype.hasOwnProperty.call(FOLD, ch) ? FOLD[ch] : ch);
    return out.replace(/[^a-z0-9]/g, '');
  }
  function numeral(n) {   // Old-Babylonian 1..59: U(10)*tens + DIŠ(1)*ones
    if (!(n >= 1 && n <= 59)) return '';
    return '\u{1230B}'.repeat(Math.floor(n / 10)) + '\u{12079}'.repeat(n % 10);
  }
  function signOf(k) {
    const S = window.CUNEIFORM_SIGNS || {};
    if (!k) return '';
    if (/^\d+$/.test(k)) return numeral(parseInt(k, 10));
    const homo = { p:'b', t:'d', k:'g', q:'k' };            // voiced/voiceless homophones
    const cands = [k, k.replace(/\d+$/, '')];
    if (homo[k[0]]) cands.push(homo[k[0]] + k.slice(1));
    for (const c of cands) if (S[c]) return S[c];
    return '';
  }
  function segment(word) {                                   // greedy longest-sign-first
    const out = []; let i = 0; const MAX = 4;
    while (i < word.length) {
      let matched = false;
      for (let len = Math.min(MAX, word.length - i); len >= 1; len--) {
        const g = signOf(word.slice(i, i + len));
        if (g) { out.push(g); i += len; matched = true; break; }
      }
      if (!matched) i++;                                     // drop a char with no sign
    }
    return out.join('');
  }
  window.translitToCuneiform = function (t) {
    if (!t) return '';
    const raw = String(t);
    if (/[-–.]/.test(raw)) {                                 // already segmented into signs
      return raw.split(/\s+/).map((w) =>
        w.split(/[-–.]/).filter(Boolean).map((syl) => signOf(norm(syl))).join('')
      ).join(' ').trim();
    }
    return raw.split(/\s+/).map((w) => segment(norm(w))).join(' ').trim();
  };
  /* reverse: cuneiform glyphs -> transliteration (best-effort, via CUNEIFORM_SIGNS). */
  let _rev = null;
  window.cuneiformToTranslit = function (text) {
    if (!_rev) { _rev = {}; const S = window.CUNEIFORM_SIGNS || {}; for (const k in S) { const g = S[k]; if (g && !(g in _rev)) _rev[g] = k; } }
    return Array.from(String(text || '')).map((ch) => _rev[ch] || '').join(' ').replace(/\s+/g, ' ').trim();
  };
  window.isCuneiform = function (s) { return /[\u{12000}-\u{1254F}]/u.test(String(s || '')); };
})();

/* =========================================================
   MOBILE NAV TOGGLE
   ========================================================= */
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  // allow tapping a nav item with a dropdown to expand it on mobile
  document.querySelectorAll('.nav-list > li').forEach((item) => {
    const link = item.querySelector('a');
    const dropdown = item.querySelector('.dropdown');
    if (dropdown && link) {
      link.addEventListener('click', (e) => {
        if (window.innerWidth <= 760) {
          e.preventDefault();
          item.classList.toggle('is-open');
        }
      });
    }
  });
}

/* =========================================================
   HERO ACCORDION
   Matches the reference site: the first panel is expanded by
   default; hovering (or keyboard-focusing) another panel expands
   it and the rest collapse back to narrow strips. No autoplay,
   no arrows, no dots — purely hover/focus driven.
   ========================================================= */
(function () {
  const accordion = document.getElementById('mainAccordion');
  if (!accordion) return;

  const items = Array.from(accordion.querySelectorAll('.accordion-item'));
  const defaultItem = items.find((i) => i.classList.contains('is-active')) || items[0];

  function activate(item) {
    items.forEach((i) => i.classList.toggle('is-active', i === item));
  }

  items.forEach((item) => {
    item.addEventListener('mouseenter', () => activate(item));
    item.addEventListener('focus', () => activate(item));
  });

  // revert to the default panel once the mouse leaves the whole strip
  accordion.addEventListener('mouseleave', () => activate(defaultItem));

  // revert once keyboard focus leaves the strip entirely
  accordion.addEventListener('focusout', (e) => {
    if (!accordion.contains(e.relatedTarget)) activate(defaultItem);
  });
})();

/* =========================================================
   ACCORDION DETAIL PANELS
   Clicking an accordion item opens its matching panel below
   the strip with a fade-in. Only one panel is open at a time.
   ========================================================= */
(function () {
  const items = document.querySelectorAll('.accordion-item[data-panel]');
  const panels = document.querySelectorAll('.detail-panel');
  if (!items.length || !panels.length) return;

  function openPanel(targetId) {
    panels.forEach((panel) => {
      const isTarget = panel.id === targetId;
      panel.classList.toggle('is-open', isTarget);
      if (!isTarget) panel.classList.remove('is-visible');
    });
    // wait a frame so the browser registers display:block before fading in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.getElementById(targetId);
        if (target) target.classList.add('is-visible');
      });
    });
  }

  items.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.dataset.panel;
      openPanel(targetId);
      const target = document.getElementById(targetId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
})();

/* =========================================================
   TRANSLATE TOOL (Akkadian dictionary)
   - akk->en : tap the cuneiform keyboard; the TOP box shows
     cuneiform (with the transliteration underneath), the BOTTOM
     box shows the English meaning live.
   - en->akk : type English in the TOP box; the BOTTOM box shows
     the Akkadian equivalent(s), word-by-word for phrases.
   - dictionary lazy-loaded from data/akkadian/akkadian_dictionary.js
     (works over file://); keys from cuneiform_keys.js.
   ========================================================= */
(function () {
  const tool = document.getElementById('translateTool');
  if (!tool) return;

  const cuneBox   = document.getElementById('trCuneBox');
  const cuneLine  = document.getElementById('trCuneLine');
  const translitLine = document.getElementById('trTranslitLine');
  const input     = document.getElementById('trInput');   // English textarea
  const kb        = document.getElementById('trKeyboard');
  const output    = document.getElementById('trOutput');
  const toggleBtn = document.getElementById('trToggle');
  const copyBtn   = document.getElementById('trCopy');
  const clearBtn  = document.getElementById('trClear');
  const fromEl    = document.getElementById('trFrom');
  const toEl      = document.getElementById('trTo');
  const topLabel  = document.getElementById('trTopLabel');
  const botLabel  = document.getElementById('trBotLabel');
  const accItem   = document.querySelector('.accordion-item[data-panel="panel-translation"]');
  const speakBtn  = document.getElementById('trSpeak');
  const voiceSel  = document.getElementById('trVoice');
  const rateInput = document.getElementById('trRate');
  const sylChk    = document.getElementById('trSyl');

  let tokens = [];                 // cuneiform input: [{c:'𒁀', t:'ba'}, ...]
  let caret = 0;                   // insertion index (mouse/keyboard editable)
  let DICT = null, loaded = false, loading = false;
  let timer = null;
  let lastEnglish = '', lastEntry = null, lastAkk = [];   // lastAkk: full Akkadian phrase to carry on Swap
  let savedEn = '', savedAkk = [], sideEdited = false;    // Swap memory: original source per side + user-edit flag

  /* ---------- keyboard ---------- */
  function baseReading(k) {
    if (k.label.length === 1 && 'aeiu'.includes(k.label)) return k.label; // vowel sign
    if (k.label === 'ʾ') return 'ʾ';
    return k.label + 'a';           // consonant base key = the "Ca" syllable
  }
  function makeKey(k) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tr-key';
    b.innerHTML = (k.c ? '<span class="tr-kc">' + k.c + '</span>' : '') +
                  '<span class="tr-kl">' + k.label + '</span>';
    b.addEventListener('click', () => pushToken(k.c || '', baseReading(k)));
    if (k.v && k.v.length) {
      const pop = document.createElement('span');
      pop.className = 'tr-pop';
      k.v.forEach(([r, c]) => {
        const vi = document.createElement('button');
        vi.type = 'button'; vi.className = 'tr-pi';
        vi.innerHTML = (c ? '<span class="tr-pc">' + c + '</span>' : '') +
                       '<span class="tr-pr">' + r + '</span>';
        vi.addEventListener('click', (ev) => { ev.stopPropagation(); pushToken(c || '', r); });
        pop.appendChild(vi);
      });
      b.appendChild(pop);
    }
    return b;
  }
  function buildKeyboard() {
    kb.innerHTML = '';
    const keys = window.AKKADIAN_KEYS;
    if (keys && keys.length) {
      keys.forEach((k) => kb.appendChild(makeKey(k)));
    } else {
      'a e i u b d g ḫ k l m n p q r s ṣ š t ṭ w y z'.split(' ')
        .forEach((ch) => kb.appendChild(makeKey({ label: ch, c: '', v: [] })));
    }
    const sp = document.createElement('button');
    sp.type = 'button'; sp.className = 'tr-key tr-key--wide tr-key--util'; sp.textContent = 'Space';
    sp.addEventListener('click', () => pushToken(' ', ' '));
    kb.appendChild(sp);
    const bs = document.createElement('button');
    bs.type = 'button'; bs.className = 'tr-key tr-key--util'; bs.textContent = '⌫';
    bs.setAttribute('aria-label', 'Backspace');
    bs.addEventListener('click', popToken);
    kb.appendChild(bs);
  }
  buildKeyboard();

  function pushToken(c, t) { tokens.splice(caret, 0, { c: c, t: t }); caret++; sideEdited = true; renderCuneBox(); schedule(); cuneBox.focus(); }
  function popToken() { if (caret > 0) { tokens.splice(caret - 1, 1); caret--; sideEdited = true; renderCuneBox(); schedule(); cuneBox.focus(); } }
  function delTokenFwd() { if (caret < tokens.length) { tokens.splice(caret, 1); sideEdited = true; renderCuneBox(); schedule(); cuneBox.focus(); } }
  function moveTokenCaret(d) { caret = Math.max(0, Math.min(tokens.length, caret + d)); renderCuneBox(); }
  function setTokenCaret(clientX) {
    const spans = [].slice.call(cuneLine.querySelectorAll('[data-idx]'));
    if (!spans.length) { caret = 0; renderCuneBox(); return; }
    let best = tokens.length, bestDist = Infinity;
    spans.forEach((sp) => {
      const r = sp.getBoundingClientRect(), idx = +sp.dataset.idx;
      let d = Math.abs(clientX - r.left); if (d < bestDist) { bestDist = d; best = idx; }
      d = Math.abs(clientX - r.right); if (d < bestDist) { bestDist = d; best = idx + 1; }
    });
    caret = Math.max(0, Math.min(tokens.length, best));
    renderCuneBox();
  }
  function renderCuneBox() {
    if (caret > tokens.length) caret = tokens.length;
    const parts = [];
    tokens.forEach((t, i) => {
      if (i === caret) parts.push('<span class="tr-caret"></span>');
      parts.push('<span class="tr-sign" data-idx="' + i + '" data-i="' + i + '" title="' + esc(t.t) + '">' + esc(t.c || t.t) + '</span>');
    });
    if (caret >= tokens.length) parts.push('<span class="tr-caret"></span>');
    cuneLine.innerHTML = parts.join('');
    const tl = tokens.map((t) => t.t).join('').replace(/\s+/g, ' ').trim();
    translitLine.textContent = tl ? '(' + tl + ')' : '';
    cuneBox.classList.toggle('is-empty', tokens.length === 0);
  }
  renderCuneBox();

  /* ---------- helpers ---------- */
  const FOLD = {
    'ā':'a','â':'a','á':'a','à':'a','ē':'e','ê':'e','é':'e','è':'e',
    'ī':'i','î':'i','í':'i','ì':'i','ū':'u','û':'u','ú':'u','ù':'u',
    'ō':'o','ô':'o','š':'s','ṣ':'s','ṭ':'t','ḫ':'h','ḥ':'h','ḏ':'d','ṯ':'t','ŋ':'g','ʾ':'','ʿ':''
  };
  function norm(str) {
    let out = '';
    for (const c of str.toLowerCase()) out += (Object.prototype.hasOwnProperty.call(FOLD, c) ? FOLD[c] : c);
    return out.replace(/[^a-z ]/g, '').replace(/sh/g, 's').replace(/kh/g, 'h').trim();
  }
  function collapse(s) { return s.replace(/(.)\1+/g, '$1'); }   // fuzzy: drop doubled letters
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  const POS = { N:'noun', V:'verb', AJ:'adj.', AV:'adv.', PRP:'prep.', NU:'number', CNJ:'conj.',
                DET:'det.', REL:'rel.', MOD:'mod.', IP:'pron.', QP:'q.', 'PN':'name' };

  /* ---------- precise grammatical role, from part of speech + position ----------
     Each word in a phrase is given a syntactic role (subject / verb / object /
     modifier / preposition / …), not just a lexical part of speech. The same role
     applies to a word and its translation, so it is shown on BOTH the English and
     the Akkadian side of every row. In Akkadian the verb encodes its own subject
     (person & number), so when no independent subject word is present we say so. */
  function looksLikeName(w) { const s = String(w || '').trim(); return /^[A-Z]/.test(s) && !/\s/.test(s); }

  function assignRoles(toks) {
    const p = toks.map((t) => t.entry ? (t.entry.p || '') : (looksLikeName(t.w) ? 'PN' : ''));
    const vIdx = p.findIndex((x) => x === 'V');
    const roles = [];
    for (let i = 0; i < toks.length; i++) {
      const pi = p[i];
      if (i === vIdx) { roles.push('verb'); continue; }
      const afterPrep = i > 0 && p[i - 1] === 'PRP';
      switch (pi) {
        case 'IP': roles.push('subject'); break;
        case 'AJ': roles.push('modifier · adj.'); break;
        case 'AV': roles.push('modifier · adv.'); break;
        case 'MOD': roles.push('modifier'); break;
        case 'PRP': roles.push('preposition'); break;
        case 'DET': roles.push('determiner'); break;
        case 'CNJ': roles.push('conjunction'); break;
        case 'NU': roles.push('number'); break;
        case 'REL': roles.push('relative'); break;
        case 'QP': roles.push('question'); break;
        case 'N': case 'PN':
          if (afterPrep) roles.push('object · of prep.');
          else if (vIdx === -1) roles.push(i === 0 ? 'subject' : 'object');
          else roles.push(i < vIdx ? 'subject' : 'object');
          break;
        default: roles.push(pi ? (POS[pi] || pi) : '—');
      }
    }
    return roles;
  }

  function roleChip(role, atEnd) {
    if (!role || role === '—') return '';
    const key = role.split(' ')[0];
    const cls = (key === 'verb' ? ' is-verb' : key === 'subject' ? ' is-subj' : key === 'object' ? ' is-obj' : '')
      + (atEnd ? ' tr-grole--end' : '');
    return '<span class="tr-grole' + cls + '" title="grammatical role in the phrase">' + esc(role) + '</span>';
  }

  /* rich summary under a phrase: subject / verb / object, with English + Akkadian */
  function grammarSummary(toks, roles, dir) {
    const engOf = (t) => dir === 'en2akk' ? (t.w || '') : ((t.entry && t.entry.e && t.entry.e[0]) || '');
    const akkOf = (t) => dir === 'en2akk' ? (t.entry ? t.entry.t : '') : (t.w || '');
    const pair = (t) => { const en = esc(engOf(t)), ak = esc(akkOf(t)); return ak ? en + ' (<i>' + ak + '</i>)' : en; };
    const pick = (kind) => toks.filter((t, i) => (roles[i] || '').split(' ')[0] === kind);
    const subj = pick('subject'), verbs = pick('verb'), obj = pick('object');
    const parts = [];
    if (subj.length) parts.push('<b>Subject:</b> ' + subj.map(pair).join(', '));
    if (verbs.length) parts.push('<b>Verb:</b> ' + verbs.map(pair).join(', ') +
      ' <span class="tr-gnote-sub">— the Akkadian verb encodes its subject (person &amp; number).</span>');
    if (obj.length) parts.push('<b>Object:</b> ' + obj.map(pair).join(', '));
    if (verbs.length && !subj.length) parts.push('<span class="tr-gnote-sub">The subject is carried inside the verb (no independent subject word).</span>');
    if (!parts.length) return '';
    return '<div class="tr-gnote">' + parts.join('<br>') + '</div>';
  }

  /* mirror the per-word grammar to CSV/grammar.csv (debounced, so typing never floods it) */
  let _grammarTimer = null;
  function logGrammar(phrase, dir, toks, roles) {
    const words = toks.map((t, i) => ({
      english: dir === 'en2akk' ? (t.w || '') : ((t.entry && t.entry.e && t.entry.e[0]) || ''),
      akkadian: dir === 'en2akk' ? (t.entry ? t.entry.t : '') : (t.w || ''),
      pos: t.entry ? (POS[t.entry.p] || t.entry.p || '') : '',
      role: roles[i] || ''
    })).filter((w) => w.english || w.akkadian);
    if (!words.length) return;
    clearTimeout(_grammarTimer);
    _grammarTimer = setTimeout(function () {
      const summary = words.map((w) => (w.english || w.akkadian) + ' = ' + (w.role || '?')).join(', ');
      if (window.AkkLog) window.AkkLog.log('Grammar', dir === 'en2akk' ? 'analyze en→akk' : 'analyze akk→en', summary);
      try {
        const base = (location.port === '3000') ? '' : 'http://127.0.0.1:3000';
        fetch(base + '/api/grammar', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phrase: phrase, direction: dir, words: words }), keepalive: true
        }).catch(function () {});
      } catch (e) {}
    }, 1200);
  }

  /* expose the analyzer so the Gap Reconstruction tool can label its output too */
  window.AkkGrammar = {
    ensure: function () { ensure(); },
    ready: function () { return loaded; },
    analyze: function (words, dir) {
      if (!loaded || !words || !words.length) return null;
      const d = dir === 'akk2en' ? 'akk2en' : 'en2akk';
      const toks = words.map(function (w) {
        return { w: w, entry: (d === 'akk2en' ? searchAkk(w) : searchEng(w))[0] || null };
      });
      const roles = assignRoles(toks);
      return {
        summaryHTML: grammarSummary(toks, roles, d),
        inlineHTML: toks.map(function (t, i) {
          return '<span class="tr-gword">' + esc(t.w) + roleChip(roles[i]) + '</span>';
        }).join(''),
        log: function (phrase) { logGrammar(phrase || words.join(' '), d, toks, roles); }
      };
    }
  };

  /* ---------- lazy dictionary ---------- */
  function ensure() {
    if (loaded || loading) return;
    loading = true;
    output.innerHTML = '<span class="tr-hint">Loading dictionary…</span>';
    const s = document.createElement('script');
    s.src = 'data/akkadian/akkadian_dictionary.js';
    s.charset = 'utf-8';
    s.onload = () => {
      DICT = (window.AKKADIAN_DICT && window.AKKADIAN_DICT.entries) || [];
      let stored = 0, gen = 0;
      for (const e of DICT) {
        e._t = norm(e.t).replace(/\s+/g, '');
        e._tc = collapse(e._t);
        e._e = (e.e || []).join(' ; ').toLowerCase();
        // fill a cuneiform glyph for the ~94% of entries that lack one in the data
        if (e.c) stored++;
        else if (window.translitToCuneiform) { e.c = window.translitToCuneiform(e.t); if (e.c) gen++; }
      }
      loaded = true; loading = false;
      if (window.AkkLog) window.AkkLog.log('Dictionary', 'load', DICT.length + ' entries · cuneiform: ' + stored + ' authentic + ' + gen + ' generated');
      translate();
    };
    s.onerror = () => {
      loading = false;
      output.innerHTML = '<span class="tr-hint">Could not load the dictionary file. Try opening the page through a local server.</span>';
    };
    document.head.appendChild(s);
  }

  /* ---------- search ---------- */
  function searchAkk(buffer) {
    const q = norm(buffer).replace(/\s+/g, '');
    if (!q) return [];
    const qc = collapse(q);
    const res = [];
    for (const e of DICT) {
      const t = e._t, tc = e._tc; let rank = -1;
      if (t === q) rank = 0; else if (t.startsWith(q)) rank = 1; else if (t.includes(q)) rank = 2;
      else if (tc === qc) rank = 3; else if (tc.startsWith(qc)) rank = 4; else if (tc.includes(qc)) rank = 5;
      if (rank >= 0) res.push([rank, e]);
    }
    res.sort((a, b) => (a[0] - b[0]) || ((b[1].f || 0) - (a[1].f || 0)));
    return res.map((m) => m[1]);
  }
  function searchEng(word) {
    const q = word.toLowerCase();
    const res = [];
    for (const e of DICT) {
      const words = e._e.split(/[^a-z]+/).filter(Boolean); let rank = -1;
      if (words.includes(q)) rank = 0;
      else if (words.some((w) => w.startsWith(q))) rank = 1;
      else if (e._e.includes(q)) rank = 2;
      if (rank >= 0) res.push([rank, e]);
    }
    res.sort((a, b) => (a[0] - b[0]) || ((b[1].f || 0) - (a[1].f || 0)));
    return res.map((m) => m[1]);
  }
  let _cMap = null;
  function cuneToWord(glyphs) {   // recover a whole dictionary word from pasted cuneiform glyphs
    if (!loaded) return null;
    if (!_cMap) { _cMap = {}; for (const e of DICT) { if (e.c && !(e.c in _cMap)) _cMap[e.c] = e; } }
    return _cMap[glyphs] || null;
  }

  /* ---------- render ---------- */
  function meaningHTML(e, re) {
    let m = esc((e.e || []).join('; '));
    if (re) m = m.replace(re, '<mark>$1</mark>');
    return m;
  }
  function primaryHTML(e, re) {
    return '<div class="tr-primary"><span class="tr-term">' + esc(e.t) + '</span>' +
           (e.c ? '<span class="tr-cuneiform">' + e.c + '</span>' : '') +
           (e.p ? '<span class="tr-pos">' + (POS[e.p] || e.p) + '</span>' : '') +
           '<span class="tr-mean">' + meaningHTML(e, re) + '</span></div>';
  }
  function moreHTML(list, re) {
    if (!list.length) return '';
    let h = '<div class="tr-more">';
    for (const e of list) {
      h += '<div class="tr-result" data-copy="' + esc(e.t) + '"><span class="tr-term">' + esc(e.t) + '</span>' +
           (e.c ? '<span class="tr-cuneiform">' + e.c + '</span>' : '') +
           (e.p ? '<span class="tr-pos">' + (POS[e.p] || e.p) + '</span>' : '') +
           '<span class="tr-mean">' + meaningHTML(e, re) + '</span></div>';
    }
    return h + '</div>';
  }
  function countHTML(n) { return n > 1 ? '<div class="tr-count">' + n + ' matches</div>' : ''; }
  function hint(dir) {
    output.innerHTML = dir === 'akk2en'
      ? '<span class="tr-hint">The English meaning appears here as you type in cuneiform.</span>'
      : '<span class="tr-hint">The Akkadian equivalent appears here as you type.</span>';
  }

  function renderAkk(list, buffer) {
    if (!list.length) {
      output.innerHTML = '<span class="tr-hint">No match yet for “' + esc(norm(buffer)) + '”. Keep building the word, or use Swap.</span>';
      lastEnglish = ''; lastEntry = null; lastAkk = [];
      return;
    }
    const first = list[0];
    lastEntry = first; lastEnglish = (first.e && first.e[0]) || '';
    lastAkk = [{ c: first.c || '', t: first.t }];
    output.innerHTML = primaryHTML(first, null) + moreHTML(list.slice(1, 8), null) + countHTML(list.length);
  }
  /* Akkadian phrase (several signs/words in the box) -> English, word by word.
     Mirrors renderWordByWord so a swapped-in phrase reads back correctly. */
  function renderAkkWordByWord(words) {
    const toks = words.map((w) => ({ w: w, entry: searchAkk(w)[0] || null }));
    const roles = assignRoles(toks);
    let html = '<div class="tr-wbw">'; let firstFound = null; const engParts = [];
    toks.forEach((tk, i) => {
      if (tk.entry) {
        const best = tk.entry;
        if (!firstFound) firstFound = best;
        if (best.e && best.e[0]) engParts.push(best.e[0]);
        html += '<div class="tr-wrow"><span class="tr-wen">' + esc(tk.w) + '</span>' + roleChip(roles[i]) +
                '<span class="tr-warr">&rarr;</span>' +
                (best.c ? '<span class="tr-cuneiform">' + best.c + '</span>' : '') +
                '<span class="tr-mean">' + esc((best.e || []).slice(0, 3).join('; ')) + '</span>' + roleChip(roles[i], true) + '</div>';
      } else {
        html += '<div class="tr-wrow"><span class="tr-wen">' + esc(tk.w) + '</span>' + roleChip(roles[i]) +
                '<span class="tr-warr">&rarr;</span>' +
                '<span class="tr-none">— not in lexicon</span></div>';
      }
    });
    html += '</div>';
    lastEntry = firstFound; lastEnglish = engParts.join(' ');
    output.innerHTML = html + grammarSummary(toks, roles, 'akk2en');
    logGrammar(words.join(' '), 'akk2en', toks, roles);
  }
  function renderEngSingle(list, raw) {
    if (!list.length) {
      output.innerHTML = '<span class="tr-hint">No Akkadian word found for “' + esc(raw) + '”.</span>';
      lastEntry = null; lastAkk = [];
      return;
    }
    const re = new RegExp('(' + escRe(raw) + ')', 'ig');
    lastEntry = list[0];
    lastAkk = [{ c: list[0].c || '', t: list[0].t }];
    output.innerHTML = primaryHTML(list[0], re) + moreHTML(list.slice(1, 8), re) + countHTML(list.length);
  }
  function renderWordByWord(words) {
    const toks = words.map((w) => ({ w: w, entry: searchEng(w)[0] || null }));
    const roles = assignRoles(toks);
    let html = '<div class="tr-wbw">'; let firstFound = null; const akkTokens = [];
    toks.forEach((tk, i) => {
      const re = new RegExp('(' + escRe(tk.w) + ')', 'ig');
      if (tk.entry) {
        const best = tk.entry;
        if (!firstFound) firstFound = best;
        if (akkTokens.length) akkTokens.push({ c: ' ', t: ' ' });
        akkTokens.push({ c: best.c || '', t: best.t });
        html += '<div class="tr-wrow"><span class="tr-wen">' + esc(tk.w) + '</span>' + roleChip(roles[i]) +
                '<span class="tr-warr">&rarr;</span>' +
                '<span class="tr-term">' + esc(best.t) + '</span>' +
                (best.c ? '<span class="tr-cuneiform">' + best.c + '</span>' : '') +
                '<span class="tr-mean">' + esc((best.e || []).slice(0, 3).join('; ')).replace(re, '<mark>$1</mark>') + '</span>' + roleChip(roles[i], true) + '</div>';
      } else {
        html += '<div class="tr-wrow"><span class="tr-wen">' + esc(tk.w) + '</span>' + roleChip(roles[i]) +
                '<span class="tr-warr">&rarr;</span>' +
                '<span class="tr-none">— no Akkadian word (name / not in lexicon)</span></div>';
      }
    });
    html += '</div>';
    lastEntry = firstFound; lastAkk = akkTokens;
    output.innerHTML = html + grammarSummary(toks, roles, 'en2akk');
    logGrammar(words.join(' '), 'en2akk', toks, roles);
  }

  /* ---------- main ---------- */
  function schedule() { clearTimeout(timer); timer = setTimeout(translate, 160); }

  function translate() {
    const dir = tool.dataset.dir;
    const hasInput = dir === 'akk2en' ? tokens.length > 0 : input.value.trim().length > 0;
    if (!hasInput) { hint(dir); lastEnglish = ''; lastEntry = null; lastAkk = []; return; }
    if (!loaded) { ensure(); return; }

    if (dir === 'akk2en') {
      const buffer = tokens.map((t) => t.t).join('');
      const words = buffer.trim().split(/\s+/).filter(Boolean);
      if (words.length <= 1) renderAkk(searchAkk(buffer), buffer);
      else renderAkkWordByWord(words);
    } else {
      const raw = input.value.trim();
      const words = raw.split(/\s+/);
      if (words.length <= 1) renderEngSingle(searchEng(raw), raw);
      else renderWordByWord(words);
    }
  }

  /* ---------- clipboard ---------- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else { fallbackCopy(text); }
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  function flash(btn, msg) {
    const old = btn.innerHTML; btn.innerHTML = msg;
    setTimeout(() => { btn.innerHTML = old; }, 1000);
  }

  /* ---------- text-to-speech: approximate (reconstructed) Akkadian pronunciation ---------- */
  const synth = window.speechSynthesis || null;
  let voices = [];
  function rankLang(lang) {
    const order = ['en', 'it', 'es', 'pt', 'de', 'tr', 'nl'];
    const i = order.indexOf((lang || '').slice(0, 2).toLowerCase());
    return i < 0 ? 99 : i;
  }
  const voiceMirrors = [];   // extra <select>s (e.g. the Gap tool's) kept populated with the same voices
  function fillVoiceSelect(sel) {
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '';
    voices.slice().sort((a, b) => rankLang(a.lang) - rankLang(b.lang)).forEach((v) => {
      const o = document.createElement('option');
      o.value = v.name; o.textContent = v.name + ' (' + v.lang + ')';
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
    sel.style.display = voices.length ? '' : 'none';
  }
  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices() || [];
    fillVoiceSelect(voiceSel);
    voiceMirrors.forEach((m) => { fillVoiceSelect(m); if (voiceSel && voiceSel.value) m.value = voiceSel.value; });
  }
  /* let another tool (Gap Reconstruction) drive the same voice/rate/syllable settings:
     its controls mirror into the master Translate controls (single source of truth the
     speech engine reads), and stay in sync both ways. */
  function linkVoiceControls(g) {
    g = g || {};
    if (g.voice) {
      voiceMirrors.push(g.voice);
      fillVoiceSelect(g.voice);
      if (voiceSel && voiceSel.value) g.voice.value = voiceSel.value;
      g.voice.addEventListener('change', () => { if (voiceSel) voiceSel.value = g.voice.value; });
      if (voiceSel) voiceSel.addEventListener('change', () => { g.voice.value = voiceSel.value; });
    }
    if (g.rate) {
      if (rateInput) g.rate.value = rateInput.value;
      g.rate.addEventListener('input', () => { if (rateInput) rateInput.value = g.rate.value; });
      if (rateInput) rateInput.addEventListener('input', () => { g.rate.value = rateInput.value; });
    }
    if (g.syl) {
      if (sylChk) g.syl.checked = sylChk.checked;
      g.syl.addEventListener('change', () => { if (sylChk) sylChk.checked = g.syl.checked; });
      if (sylChk) sylChk.addEventListener('change', () => { g.syl.checked = sylChk.checked; });
    }
  }
  if (synth) {
    loadVoices();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
  }
  function chosenVoice() {
    if (!voices.length) return null;
    if (voiceSel && voiceSel.value) {
      const v = voices.find((x) => x.name === voiceSel.value);
      if (v) return v;
    }
    return voices.slice().sort((a, b) => rankLang(a.lang) - rankLang(b.lang))[0];
  }
  function rate() { return rateInput ? (parseFloat(rateInput.value) || 0.85) : 0.85; }

  // transliteration -> approximate English-phonics respelling
  function phonetic(str) {
    return str.toLowerCase()
      .replace(/ā|â/g, 'A').replace(/ē|ê/g, 'E').replace(/ī|î/g, 'I').replace(/ū|û/g, 'U')
      .replace(/š/g, 'sh').replace(/ṣ/g, 'ts').replace(/ṭ/g, 't')
      .replace(/ḫ|ḥ/g, 'kh').replace(/q/g, 'k').replace(/ʾ|ʿ/g, ' ')
      .replace(/a/g, 'ah').replace(/e/g, 'eh').replace(/i/g, 'ee').replace(/o/g, 'oh').replace(/u/g, 'oo')
      .replace(/A/g, 'aah').replace(/E/g, 'ehh').replace(/I/g, 'eee').replace(/U/g, 'ooo')
      .trim();
  }

  function clearSigns() {
    cuneLine.querySelectorAll('.tr-sign.is-speaking').forEach((s) => s.classList.remove('is-speaking'));
  }
  function highlightSign(i) {
    clearSigns();
    const el = cuneLine.querySelector('.tr-sign[data-i="' + i + '"]');
    if (el) el.classList.add('is-speaking');
  }

  let speaking = false, speakRun = 0;
  function stopSpeak() { if (synth) synth.cancel(); speaking = false; speakRun++; clearSigns(); }

  function speakSyllables(items, hl, clr, onDone) {
    hl = hl || highlightSign; clr = clr || clearSigns;   // callbacks let other tools reuse this
    stopSpeak(); clr(); speaking = true;
    const myRun = speakRun;                 // guards against overlapping runs on re-click
    if (!voices.length) flash(speakBtn, '🔇 visual');
    let idx = 0;
    const safety = voices.length ? 2000 : 620;
    (function step() {
      if (myRun !== speakRun) return;
      if (idx >= items.length) { clr(); speaking = false; if (onDone) onDone(); return; }
      hl(items[idx].i);
      let advanced = false;
      const adv = () => { if (advanced || myRun !== speakRun) return; advanced = true; idx++; step(); };
      if (synth && voices.length) {
        const u = new SpeechSynthesisUtterance(phonetic(items[idx].read));
        const v = chosenVoice(); if (v) { u.voice = v; u.lang = v.lang; }
        u.rate = rate(); u.onend = adv; u.onerror = adv;
        try { synth.speak(u); } catch (e) {}
      }
      setTimeout(adv, safety / rate());   // drives the visual walk even with no audio
    })();
  }
  function speakWord(text) {
    stopSpeak();
    if (!(synth && voices.length)) { flash(speakBtn, '🔇 no voice'); return; }
    speaking = true;
    const u = new SpeechSynthesisUtterance(phonetic(text));
    const v = chosenVoice(); if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = rate(); u.onend = () => { speaking = false; };
    try { synth.speak(u); } catch (e) {}
  }

  /* ---------- direction / wiring ---------- */
  function setDir(dir) {
    tool.dataset.dir = dir;
    if (dir === 'akk2en') {
      fromEl.textContent = 'Akkadian'; toEl.textContent = 'English';
      topLabel.textContent = 'Akkadian (cuneiform)'; botLabel.textContent = 'English';
      kb.classList.remove('is-hidden');
      cuneBox.classList.remove('is-hidden'); input.classList.add('is-hidden');
    } else {
      fromEl.textContent = 'English'; toEl.textContent = 'Akkadian';
      topLabel.textContent = 'English'; botLabel.textContent = 'Akkadian';
      kb.classList.add('is-hidden');
      cuneBox.classList.add('is-hidden'); input.classList.remove('is-hidden');
    }
  }

  /* Swap is a lossless toggle: leaving a side remembers its exact source, so a
     swap back restores the original text instead of a lossy re-translation
     (English -> Akkadian -> English is not a 1:1 mapping). We only regenerate by
     lookup when the swapped-in side was actually edited. */
  toggleBtn.addEventListener('click', () => {
    if (tool.dataset.dir === 'akk2en') {
      savedAkk = tokens.map((t) => ({ c: t.c, t: t.t }));   // remember the Akkadian source
      setDir('en2akk');
      input.value = (!sideEdited && savedEn) ? savedEn : (lastEnglish || '');
    } else {
      savedEn = input.value;                                // remember the English source
      setDir('akk2en');
      tokens = (!sideEdited && savedAkk.length) ? savedAkk.map((t) => ({ c: t.c, t: t.t }))
             : (lastAkk.length ? lastAkk.map((t) => ({ c: t.c, t: t.t }))
             : (lastEntry ? [{ c: lastEntry.c || '', t: lastEntry.t }] : []));
      caret = tokens.length;
      renderCuneBox();
    }
    sideEdited = false;                                     // the swapped-in side starts pristine
    ensure();
    translate();
    (tool.dataset.dir === 'en2akk' ? input : cuneBox).focus();
    if (window.AkkLog) window.AkkLog.log('Dictionary', 'swap', 'direction → ' + tool.dataset.dir);
  });

  copyBtn.addEventListener('click', () => {
    copyText(tool.dataset.dir === 'akk2en' ? cuneLine.textContent : input.value);
    flash(copyBtn, 'Copied!');
  });
  const pasteBtn = document.getElementById('trPaste');
  if (pasteBtn) pasteBtn.addEventListener('click', async () => {
    let t = ''; try { t = await navigator.clipboard.readText(); } catch (e) { flash(pasteBtn, 'allow paste'); return; }
    if (!t || !t.trim()) return;
    if (tool.dataset.dir === 'akk2en') insertAkkPaste(t);
    else { input.value = (input.value ? input.value + ' ' : '') + t.trim(); sideEdited = true; input.focus(); schedule(); }
    flash(pasteBtn, 'Pasted!');
  });
  clearBtn.addEventListener('click', () => {
    stopSpeak();
    if (tool.dataset.dir === 'akk2en') { tokens = []; caret = 0; renderCuneBox(); cuneBox.focus(); }
    else { input.value = ''; input.focus(); }
    lastEnglish = ''; lastEntry = null; lastAkk = [];
    savedEn = ''; savedAkk = []; sideEdited = false;
    hint(tool.dataset.dir);
  });

  if (speakBtn) speakBtn.addEventListener('click', () => {
    if (tool.dataset.dir === 'akk2en') {
      const items = tokens
        .map((t, i) => ({ i: i, read: t.t }))
        .filter((x) => x.read.trim() !== '');
      if (!items.length) { flash(speakBtn, 'type first'); return; }
      if (sylChk && !sylChk.checked) speakWord(tokens.map((t) => t.t).join(''));
      else speakSyllables(items);
      if (window.AkkLog) window.AkkLog.log('Voice', 'speak', 'dictionary: ' + tokens.map((t) => t.t).join('').trim());
    } else {
      if (lastEntry) { speakWord(lastEntry.t); if (window.AkkLog) window.AkkLog.log('Voice', 'speak', 'dictionary: ' + lastEntry.t); }
      else flash(speakBtn, 'no word');
    }
  });

  input.addEventListener('input', () => { savedEn = input.value; sideEdited = true; schedule(); });
  input.addEventListener('focus', ensure);
  cuneBox.addEventListener('focus', ensure);
  cuneBox.addEventListener('click', (e) => { setTokenCaret(e.clientX); cuneBox.focus(); });
  cuneBox.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') { e.preventDefault(); popToken(); }
    else if (e.key === 'Delete') { e.preventDefault(); delTokenFwd(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); moveTokenCaret(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); moveTokenCaret(1); }
    else if (e.key === 'Home') { e.preventDefault(); caret = 0; renderCuneBox(); }
    else if (e.key === 'End') { e.preventDefault(); caret = tokens.length; renderCuneBox(); }
  });
  /* paste transliteration text (typed above or copied elsewhere) -> tokens at the caret */
  /* invert CUNEIFORM_SIGNS (translit -> glyph) so pasted cuneiform can be read back
     to transliteration; without this, pasted Akkadian shows "not in lexicon". */
  let _cuneRev = null;
  function cuneRev() {
    if (!_cuneRev) { _cuneRev = {}; const S = window.CUNEIFORM_SIGNS || {};
      for (const k in S) { const g = S[k]; if (g && !(g in _cuneRev)) _cuneRev[g] = k; } }
    return _cuneRev;
  }
  const isCune = (s) => /[\u{12000}-\u{1254F}]/u.test(s);
  function insertAkkPaste(text) {
    if (!text || !text.trim()) return;
    text = text.replace(/[\u{12470}-\u{1247F}]/gu, ' ');   // cuneiform word dividers / punctuation -> word breaks
    text.trim().split(/\s+/).forEach((w) => {
      const start = caret; let added = 0;
      const put = (tok) => { tokens.splice(caret, 0, tok); caret++; added++; };
      if (isCune(w)) {                     // pasted cuneiform
        const dw = cuneToWord(w);          // recover the whole dictionary word (clean transliteration)
        if (dw) put({ c: w, t: dw.t });
        else { const R = cuneRev(); for (const ch of Array.from(w)) { if (R[ch]) put({ c: ch, t: R[ch] }); } }   // skip signs with no transliteration (no empty "--")
      } else {
        put({ c: (window.translitToCuneiform ? window.translitToCuneiform(w) : ''), t: w });
      }
      if (added && start > 0 && tokens[start - 1] && tokens[start - 1].t !== ' ') { tokens.splice(start, 0, { c: ' ', t: ' ' }); caret++; }
    });
    sideEdited = true;
    renderCuneBox(); ensure(); schedule();
  }
  cuneBox.addEventListener('paste', (e) => {
    e.preventDefault();
    const cd = e.clipboardData || window.clipboardData;
    insertAkkPaste(cd ? cd.getData('text') : '');
  });
  if (accItem) accItem.addEventListener('click', ensure);

  output.addEventListener('click', (ev) => {
    const row = ev.target.closest('.tr-result');
    if (!row) return;
    copyText(row.dataset.copy || '');
    row.style.borderColor = 'var(--red)';
    setTimeout(() => { row.style.borderColor = ''; }, 500);
  });

  /* shared API so other tools (Gap Reconstruction) can reuse this dictionary + voice */
  window.AkkTool = {
    ensure: ensure,
    ready: function () { return loaded; },
    searchEng: function (w) { return loaded ? searchEng(w) : []; },
    searchAkk: function (b) { return loaded ? searchAkk(b) : []; },
    cuneToWord: function (g) { return loaded ? cuneToWord(g) : null; },
    speakSyllables: speakSyllables,
    speakWord: speakWord,
    stopSpeak: stopSpeak,
    sylEnabled: function () { return sylChk ? sylChk.checked : true; },
    linkVoiceControls: linkVoiceControls
  };
})();

/* =========================================================
   GAP RECONSTRUCTION  (Translate slide)
   A cuneiform-keyboard fragment editor: transcribe a broken tablet, mark the
   illegible spots with small/big gaps, then Reconstruct. The ByT5 engine fills
   each gap; because the model outputs English, each fill's Akkadian form is
   looked up in the shared dictionary (window.AkkTool). The output box shows the
   completed Akkadian; Swap flips it to the model's English translation.

   Backend contract  ->  POST /api/reconstruct  { prompt }
     { reconstructedText, modelUsed, globalConfidence,
       tokens: [ { token, isMissing, confidence, alternatives:[{token,confidence}] } ] }
   Works offline as a graceful message.
   ========================================================= */
(function () {
  const card = document.getElementById('gapCard');
  if (!card) return;

  const cuneBox   = document.getElementById('gapCuneBox');
  const cuneLine  = document.getElementById('gapCuneLine');
  const translitLine = document.getElementById('gapTranslitLine');
  const kb        = document.getElementById('gapKeyboard');
  const runBtn    = document.getElementById('gapRun');
  const clearBtn  = document.getElementById('gapClear');
  const exBtn     = document.getElementById('gapExample');
  const swapBtn   = document.getElementById('gapSwap');
  const speakBtn  = document.getElementById('gapSpeak');
  const copyBtn   = document.getElementById('gapCopy');
  const insSmall  = document.getElementById('gapInsSmall');
  const insBig    = document.getElementById('gapInsBig');
  const resBox    = document.getElementById('gapResult');
  const resTitle  = document.getElementById('gapResTitle');
  const modelEl   = document.getElementById('gapModel');
  const outEl     = document.getElementById('gapModelText');
  const resCopyBtn= document.getElementById('gapResCopy');
  const resSpeakBtn= document.getElementById('gapResSpeak');
  const fillsBlock= document.getElementById('gapFillsBlock');
  const fillsEl   = document.getElementById('gapFills');
  const gaugeEl   = document.getElementById('gapGauge');
  const evidenceEl= document.getElementById('gapEvidence');
  const engineStatusEl = document.getElementById('gapEngineStatus');
  const demoBtn   = document.getElementById('gapDemo');
  const samplesEl = document.getElementById('gapSamples');

  /* wire this tool's own Voice / Speed / syllable controls into the shared speech
     engine (they mirror the Translate controls, which the engine reads). */
  if (window.AkkTool && window.AkkTool.linkVoiceControls) {
    window.AkkTool.linkVoiceControls({
      voice: document.getElementById('gapVoice'),
      rate:  document.getElementById('gapRate'),
      syl:   document.getElementById('gapSyl')
    });
  }

  /* same-origin when the pipeline serves the site (--ui-dir), else :3000 (CORS). */
  const AI_BASE = (location.port === '3000') ? '' : 'http://127.0.0.1:3000';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }
  function pct(c) { return Math.round((Number(c) || 0) * 100) + '%'; }
  function confClass(c) { c = Number(c) || 0; return c >= 0.75 ? 'is-hi' : (c >= 0.45 ? 'is-mid' : 'is-lo'); }
  function warmDict() { if (window.AkkTool && window.AkkTool.ensure) window.AkkTool.ensure(); }

  /* engine status pill: reassures during a live demo — "ready" once the model is
     loaded, "starting" while it warms up, "offline" if the server is not running.
     Best-effort: any failure just shows offline and never breaks the page. */
  async function checkEngine(tries) {
    if (!engineStatusEl) return;
    try {
      const r = await fetch(AI_BASE + '/api/health', { cache: 'no-store' });
      if (!r.ok) throw 0;
      engineStatusEl.textContent = '● AI engine: ready';
      engineStatusEl.className = 'gap-engine-status is-ready';
    } catch (e) {
      if (tries > 0) {
        engineStatusEl.textContent = '● AI engine: starting…';
        engineStatusEl.className = 'gap-engine-status is-wait';
        setTimeout(() => checkEngine(tries - 1), 4000);
      } else {
        engineStatusEl.textContent = '● AI engine: offline';
        engineStatusEl.className = 'gap-engine-status is-off';
        engineStatusEl.title = 'Start the engine with RUN_INNOVERSE.bat';
      }
    }
  }

  /* input tokens: {c,t} sign · {c:' ',t:' '} space · {gap:true,big,t,c} gap */
  let tokens = [];
  let caret = 0;            // insertion index into tokens (mouse/keyboard editable)
  let gapsData = [];        // per gap: { alts:[{en,t,c,conf}], chosen }
  let lastEnglish = '';     // model reconstructedText
  let lastAkkTranslit = ''; // reconstructed Akkadian transliteration (gaps filled) — for Copy
  let curEnglish = '';      // live English meaning; updates when a gap word is swapped
  let engBusy = false, refineSeq = 0;   // re-translation state when a gap word is changed
  let showEnglish = false;

  function log(cat, act, det) { if (window.AkkLog) window.AkkLog.log(cat, act, det); }

  /* ---- animated confidence gauge (ring + grade + risk) from globalConfidence ---- */
  function gradeOf(p) { return p >= 90 ? 'A+' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 55 ? 'C' : p >= 40 ? 'D' : 'E'; }
  function bandOf(p) { return p >= 75 ? 'hi' : p >= 50 ? 'mid' : 'lo'; }
  function riskOf(p) { return p >= 75 ? 'low risk' : p >= 50 ? 'moderate risk' : 'high risk'; }
  function renderGauge(pct100) {
    if (!gaugeEl) return;
    const p = Math.max(0, Math.min(100, Math.round(pct100)));
    const R = 52, C = 2 * Math.PI * R;
    gaugeEl.hidden = false;
    gaugeEl.className = 'gap-gauge band-' + bandOf(p);
    gaugeEl.innerHTML =
      '<svg class="gauge-svg" viewBox="0 0 120 120" aria-hidden="true">' +
        '<circle class="gauge-bg" cx="60" cy="60" r="' + R + '"></circle>' +
        '<circle class="gauge-fg" cx="60" cy="60" r="' + R + '" transform="rotate(-90 60 60)" ' +
          'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '"></circle>' +
        '<text class="gauge-pct" x="60" y="64">0%</text>' +
      '</svg>' +
      '<div class="gauge-meta"><span class="gauge-grade">' + gradeOf(p) + '</span>' +
      '<span class="gauge-risk">' + riskOf(p) + '</span></div>' +
      '<div class="gauge-cap">model confidence</div>';
    const fg = gaugeEl.querySelector('.gauge-fg'), txt = gaugeEl.querySelector('.gauge-pct');
    setTimeout(() => { fg.style.strokeDashoffset = (C * (1 - p / 100)).toFixed(1); }, 30);   // animate ring
    let n = 0; const step = Math.max(1, Math.round(p / 24));
    const t = setInterval(() => { n += step; if (n >= p) { n = p; clearInterval(t); } txt.textContent = n + '%'; }, 28);
  }

  /* ---- "decipher" reveal: each filled gap scrambles cuneiform then settles ---- */
  const SCRAMBLE = '𒀀𒁀𒂊𒄿𒅔𒆠𒈠𒈾𒉡𒊒𒋫𒌋𒌝𒐊𒃻𒁲';
  function decipherSlots() {
    outEl.querySelectorAll('.gap-slot').forEach((el) => {
      const finalText = el.textContent;
      if (!finalText) return;
      let frame = 0; const frames = 9;
      const iv = setInterval(() => {
        frame++;
        if (frame >= frames) { clearInterval(iv); el.textContent = finalText; el.classList.add('is-revealed'); return; }
        let s = ''; for (let i = 0; i < finalText.length; i++) s += SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
        el.textContent = s;
      }, 45);
    });
  }

  /* ---- load a transliteration string (with gap markers) into the box as tokens ---- */
  function parseInto(str, append) {
    if (!append) tokens = [];
    String(str).replace(/[\u{12470}-\u{1247F}]/gu, ' ').trim().split(/\s+/).forEach((p) => {
      const low = p.toLowerCase();
      if (low === '<big_gap>' || low === '[……]' || /^\.{5,}$/.test(p)) addGapToken(true);
      else if (low === '<gap>' || low === '[…]' || low === '...' || low === '…' || /^x+$/.test(low)) addGapToken(false);
      else if (window.isCuneiform && window.isCuneiform(p)) {   // pasted cuneiform
        const before = tokens.length;
        const dw = (window.AkkTool && window.AkkTool.cuneToWord) ? window.AkkTool.cuneToWord(p) : null;
        if (dw) tokens.push({ c: p, t: dw.t });   // recover the whole dictionary word (clean transliteration)
        else for (const ch of Array.from(p)) { const syl = window.cuneiformToTranslit ? window.cuneiformToTranslit(ch) : ''; if (syl) tokens.push({ c: ch, t: syl }); }   // skip signs with no transliteration
        if (tokens.length > before && before > 0 && tokens[before - 1].t !== ' ') tokens.splice(before, 0, { c: ' ', t: ' ' });
      }
      else { if (tokens.length && tokens[tokens.length - 1].t !== ' ') tokens.push({ c: ' ', t: ' ' }); tokens.push({ c: (window.translitToCuneiform ? window.translitToCuneiform(p) : ''), t: p }); }
    });
    caret = tokens.length;
    renderBox();
  }

  const SAMPLES = [
    { label: 'Silver to a merchant', text: '1 ma-na kaspum a-na <gap> a-na-kam' },
    { label: 'Opening of a letter', text: 'a-na <gap> qi-bi-ma' },
    { label: 'He gave …', text: '<big_gap> i-din' },
    { label: 'A tablet of …', text: 'tup-pu-um sza <gap>' }
  ];

  /* ---------- cuneiform keyboard (same signs as the dictionary tool) ---------- */
  function baseReading(k) {
    if (k.label.length === 1 && 'aeiu'.includes(k.label)) return k.label;
    if (k.label === 'ʾ') return 'ʾ';
    return k.label + 'a';
  }
  function makeKey(k) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tr-key';
    b.innerHTML = (k.c ? '<span class="tr-kc">' + k.c + '</span>' : '') +
                  '<span class="tr-kl">' + k.label + '</span>';
    b.addEventListener('click', () => pushSign(k.c || '', baseReading(k)));
    if (k.v && k.v.length) {
      const pop = document.createElement('span'); pop.className = 'tr-pop';
      k.v.forEach(([r, c]) => {
        const vi = document.createElement('button');
        vi.type = 'button'; vi.className = 'tr-pi';
        vi.innerHTML = (c ? '<span class="tr-pc">' + c + '</span>' : '') +
                       '<span class="tr-pr">' + r + '</span>';
        vi.addEventListener('click', (ev) => { ev.stopPropagation(); pushSign(c || '', r); });
        pop.appendChild(vi);
      });
      b.appendChild(pop);
    }
    return b;
  }
  function buildKeyboard() {
    kb.innerHTML = '';
    const keys = window.AKKADIAN_KEYS;
    if (keys && keys.length) keys.forEach((k) => kb.appendChild(makeKey(k)));
    else 'a e i u b d g ḫ k l m n p q r s ṣ š t ṭ w y z'.split(' ')
      .forEach((ch) => kb.appendChild(makeKey({ label: ch, c: '', v: [] })));
    const sp = document.createElement('button');
    sp.type = 'button'; sp.className = 'tr-key tr-key--wide tr-key--util'; sp.textContent = 'Space';
    sp.addEventListener('click', pushSpace); kb.appendChild(sp);
    const bs = document.createElement('button');
    bs.type = 'button'; bs.className = 'tr-key tr-key--util'; bs.textContent = '⌫';
    bs.setAttribute('aria-label', 'Backspace'); bs.addEventListener('click', popSign); kb.appendChild(bs);
  }

  /* keyboard input inserts at the caret; Backspace/Delete remove around it */
  function pushSign(c, t) { tokens.splice(caret, 0, { c: c, t: t }); caret++; renderBox(); if (cuneBox) cuneBox.focus(); }
  function pushSpace() { if (caret > 0 && tokens[caret - 1] && tokens[caret - 1].t !== ' ') { tokens.splice(caret, 0, { c: ' ', t: ' ' }); caret++; renderBox(); } }
  function popSign() { if (caret > 0) { tokens.splice(caret - 1, 1); caret--; renderBox(); if (cuneBox) cuneBox.focus(); } }
  function delForward() { if (caret < tokens.length) { tokens.splice(caret, 1); renderBox(); if (cuneBox) cuneBox.focus(); } }
  function moveCaret(d) { caret = Math.max(0, Math.min(tokens.length, caret + d)); renderBox(); }
  /* append a gap (used when loading a whole fragment / example) */
  function addGapToken(big) {
    if (tokens.length && tokens[tokens.length - 1].t !== ' ') tokens.push({ c: ' ', t: ' ' });
    tokens.push({ gap: true, big: !!big, t: big ? '<big_gap>' : '<gap>', c: big ? '⬚⬚' : '⬚' });
    tokens.push({ c: ' ', t: ' ' });
  }
  /* insert a gap at the caret (toolbar buttons) */
  function insertGap(big) {
    if (caret > 0 && tokens[caret - 1] && tokens[caret - 1].t !== ' ') { tokens.splice(caret, 0, { c: ' ', t: ' ' }); caret++; }
    tokens.splice(caret, 0, { gap: true, big: !!big, t: big ? '<big_gap>' : '<gap>', c: big ? '⬚⬚' : '⬚' }); caret++;
    tokens.splice(caret, 0, { c: ' ', t: ' ' }); caret++;
    renderBox(); if (cuneBox) cuneBox.focus();
  }
  /* click to place the caret at the nearest sign boundary */
  function setCaretFromClick(clientX) {
    const spans = [].slice.call(cuneLine.querySelectorAll('[data-idx]'));
    if (!spans.length) { caret = 0; renderBox(); return; }
    let best = tokens.length, bestDist = Infinity;
    spans.forEach((sp) => {
      const r = sp.getBoundingClientRect(), idx = +sp.dataset.idx;
      let d = Math.abs(clientX - r.left); if (d < bestDist) { bestDist = d; best = idx; }
      d = Math.abs(clientX - r.right); if (d < bestDist) { bestDist = d; best = idx + 1; }
    });
    caret = Math.max(0, Math.min(tokens.length, best));
    renderBox();
  }

  function renderBox() {
    if (caret > tokens.length) caret = tokens.length;
    const parts = []; let si = -1;
    tokens.forEach((tk, idx) => {
      if (idx === caret) parts.push('<span class="tr-caret"></span>');
      if (tk.gap) parts.push('<span class="gap-mark" data-idx="' + idx + '" title="' + (tk.big ? 'big gap' : 'small gap') + '">' + (tk.big ? '⬚⬚' : '⬚') + '</span>');
      else if (tk.t === ' ') parts.push('<span class="tr-space" data-idx="' + idx + '"> </span>');
      else { si++; parts.push('<span class="tr-sign" data-idx="' + idx + '" data-i="' + si + '" title="' + esc(tk.t) + '">' + esc(tk.c || tk.t) + '</span>'); }
    });
    if (caret >= tokens.length) parts.push('<span class="tr-caret"></span>');
    cuneLine.innerHTML = parts.join('');
    translitLine.textContent = tokens.length ? '(' + translit(true) + ')' : '';
    cuneBox.classList.toggle('is-empty', tokens.length === 0);
  }

  /* ---------- speak (voice assistant) + copy ---------- */
  function speakItems() {
    const items = []; let si = -1;
    for (const tk of tokens) {
      if (tk.gap || tk.t === ' ') continue;
      si++;
      items.push({ i: si, read: tk.t });
    }
    return items;
  }
  function gapClearSigns() { cuneLine.querySelectorAll('.tr-sign.is-speaking').forEach((s) => s.classList.remove('is-speaking')); }
  function gapHighlight(i) { gapClearSigns(); const el = cuneLine.querySelector('.tr-sign[data-i="' + i + '"]'); if (el) el.classList.add('is-speaking'); }
  function speak() {
    if (!window.AkkTool || !window.AkkTool.speakSyllables) return;
    const items = speakItems();
    if (!items.length) return;
    if (window.AkkTool.sylEnabled && !window.AkkTool.sylEnabled()) {
      window.AkkTool.speakWord(items.map((x) => x.read).join(' '));
    } else {
      window.AkkTool.speakSyllables(items, gapHighlight, gapClearSigns);
    }
  }
  /* the reconstructed (gap-filled) transliteration, brackets and ellipses stripped —
     this is the guessed text the result-box Speak button pronounces. */
  function reconstructedReading() {
    return (lastAkkTranslit || '')
      .replace(/\[|\]/g, ' ').replace(/…+/g, ' ').replace(/\.\.\./g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function reconstructedItems() {
    const items = []; let i = 0;
    reconstructedReading().split(/\s+/).filter(Boolean).forEach((w) => {
      w.split('-').filter(Boolean).forEach((syl) => items.push({ i: i++, read: syl }));
    });
    return items;
  }
  function speakReconstruction() {
    const reading = reconstructedReading();
    if (!reading) { if (resSpeakBtn) flash(resSpeakBtn, 'reconstruct first'); return; }
    if (!window.AkkTool || !window.AkkTool.speakSyllables) return;
    const hl = () => outEl.classList.add('gap-speaking');
    const clr = () => outEl.classList.remove('gap-speaking');
    if (window.AkkTool.sylEnabled && !window.AkkTool.sylEnabled()) {
      window.AkkTool.speakWord(reading);
    } else {
      window.AkkTool.speakSyllables(reconstructedItems(), hl, clr);
    }
    log('Voice', 'speak', 'reconstructed: ' + reading);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  function flash(btn, msg) { const old = btn.innerHTML; btn.innerHTML = msg; setTimeout(() => { btn.innerHTML = old; }, 1000); }

  /* transliteration: words hyphenated; gaps pretty ([…]) or as tokens (<gap>) */
  function translit(pretty) {
    const out = []; let cur = [];
    const flush = () => { if (cur.length) { out.push(cur.join('-')); cur = []; } };
    for (const tk of tokens) {
      if (tk.gap) { flush(); out.push(pretty ? (tk.big ? '[……]' : '[…]') : (tk.big ? '<big_gap>' : '<gap>')); }
      else if (tk.t === ' ') flush();
      else cur.push(tk.t.trim());
    }
    flush();
    return out.join(' ').trim();
  }

  /* prompt for re-translation: like translit(false) but each gap replaced by its
     chosen dictionary Akkadian word, so the model re-reads the fragment grounded in
     real lexicon words instead of a blank gap. */
  function promptWithGapsFilled() {
    const out = []; let cur = []; let gi = -1;
    const flush = () => { if (cur.length) { out.push(cur.join('-')); cur = []; } };
    for (const tk of tokens) {
      if (tk.gap) { flush(); gi++; const f = gapsData[gi] ? gapsData[gi].alts[gapsData[gi].chosen] : null;
        out.push((f && f.t) ? f.t : (tk.big ? '<big_gap>' : '<gap>')); }
      else if (tk.t === ' ') flush();
      else cur.push(tk.t.trim());
    }
    flush();
    return out.join(' ').trim();
  }

  /* English fill from the model -> Akkadian form via the shared dictionary */
  function engToAkk(en) {
    const look = (window.AkkTool && window.AkkTool.searchEng) ? window.AkkTool.searchEng(en) : [];
    if (look && look.length) return { en: en, t: look[0].t, c: look[0].c || '' };
    return { en: en, t: '', c: '' };
  }

  /* ---- context-aware gap filling: subtract the meanings of the KNOWN Akkadian
     words from the model's English translation; the leftover meaning words are
     what the gaps must be, then mapped back to real dictionary Akkadian. This
     replaces blind position-splitting so gaps get sensible, distinct fills. ---- */
  const GAP_STOP = new Set(('the a an of to and or in on at for from by with as is are was were be been being this ' +
    'that these those it its he she they them his her their our your my me we you i not no do did does have has had ' +
    'will would shall should may might can could into over under out up down off then than so but if there here god').split(/\s+/));
  function engContentWords(text) {
    const out = [];
    (text || '').toLowerCase().replace(/<[^>]*gap[^>]*>/g, ' ').split(/[^a-z']+/).forEach((w) => {
      if (w.length > 1 && !GAP_STOP.has(w)) out.push(w);
    });
    return out;
  }
  function akkToEngWords(word) {
    const dh = (word || '').replace(/-/g, '');
    const forms = [word, dh, dh.replace(/(um|am|im|m)$/, '')];   // try hyphenated, plain, mimation-stripped
    for (const f of forms) {
      if (!f) continue;
      const look = (window.AkkTool && window.AkkTool.searchAkk) ? window.AkkTool.searchAkk(f) : [];
      if (look && look.length && look[0].e && look[0].e.length) return engContentWords(look[0].e.join(' '));
    }
    return [];
  }
  function toAkkAlts(engWords) {
    const alts = [];
    engWords.forEach((en, i) => { const m = engToAkk(en); if (m.t) alts.push({ en: en, t: m.t, c: m.c, conf: Math.max(0.45, 0.82 - i * 0.12) }); });
    return alts;
  }
  function computeGapFills(englishText, backendGaps) {
    const gapList = tokens.filter((t) => t.gap);
    const G = gapList.length;
    if (!G) return [];
    // group the syllable tokens into whole words (split on spaces and gaps) so the
    // Akkadian->English lookup sees "ma-na"/"kaspum", not lone signs.
    const knownWords = []; { let cur = [];
      const flush = () => { if (cur.length) { knownWords.push(cur.join('-')); cur = []; } };
      tokens.forEach((t) => { if (t.gap || t.t === ' ') flush(); else cur.push((t.t || '').trim()); });
      flush(); }
    let leftover = engContentWords(englishText);
    knownWords.forEach((kw) => {
      const meanings = akkToEngWords(kw);
      for (const m of meanings) { const idx = leftover.indexOf(m); if (idx >= 0) { leftover.splice(idx, 1); break; } }
    });
    const weights = gapList.map((g) => (g.big ? 2 : 1));
    const totalW = weights.reduce((a, b) => a + b, 0) || 1;
    const out = []; let pos = 0;
    for (let gi = 0; gi < G; gi++) {
      const take = Math.max(1, Math.round(leftover.length * weights[gi] / totalW));
      let alts = toAkkAlts(leftover.slice(pos, pos + take)); pos += take;
      if (!alts.length) {                       // fallback: backend's own suggestion, else '…'
        const bg = backendGaps[gi];
        const be = (bg && Array.isArray(bg.alternatives) && bg.alternatives.length) ? bg.alternatives
                 : (bg ? [{ token: bg.token, confidence: bg.confidence }] : []);
        alts = be.map((a) => { const m = engToAkk(a.token); return { en: a.token, t: m.t, c: m.c, conf: a.confidence }; }).filter((a) => a.t);
      }
      out.push({ alts: alts.length ? alts : [{ en: '…', t: '', c: '', conf: 0.3 }], chosen: 0 });
    }
    return out;
  }

  /* ---------- output ---------- */
  function showMsg(html, cls) {
    outEl.className = 'gap-model-text';
    outEl.innerHTML = '<span class="gap-loading' + (cls ? ' ' + cls : '') + '">' + html + '</span>';
  }
  /* ---- English meaning built the SAME way the Translate tool does it: gloss every
     known Akkadian word from the shared dictionary and drop in the chosen word for
     each gap. This keeps the meaning correct and consistent with the Translate panel,
     instead of trusting the raw model translation — which drifts badly on constructed
     input (e.g. a phrase you built word-by-word in Translate and pasted back here). ---- */
  function dictEnglish(gd) {
    gd = gd || gapsData;
    const A = (window.AkkTool && window.AkkTool.searchAkk) ? window.AkkTool.searchAkk : null;
    const parts = []; let cur = []; let gi = -1; let hit = false;
    const flushWord = () => {
      if (!cur.length) return;
      const w = cur.join('-'); cur = [];
      let en = '';
      if (A) { const best = (A(w) || [])[0]; if (best && best.e && best.e[0]) { en = best.e[0]; hit = true; } }
      parts.push(en || w);                       // keep the reading (e.g. a proper name) when it is not in the lexicon
    };
    for (const tk of tokens) {
      if (tk.gap) { flushWord(); gi++;
        const f = gd[gi] ? gd[gi].alts[gd[gi].chosen] : null;
        parts.push((f && f.en) ? f.en : (tk.big ? '……' : '…'));
      } else if (tk.t === ' ') { flushWord(); }
      else { cur.push((tk.t || '').trim()); }
    }
    flushWord();
    return hit ? parts.join(' ').replace(/\s+/g, ' ').trim() : '';
  }
  /* rebuild the English meaning so it tracks the Akkadian you actually see: the
     dictionary gloss first (matches Translate), the raw model text only as a fallback. */
  function updateEnglish() {
    curEnglish = dictEnglish() || cleanEng(lastEnglish);
  }
  /* grammatical roles of the reconstructed meaning (subject / verb / object …),
     reusing the same analyzer the dictionary uses; shows English + Akkadian and
     mirrors the per-word roles to CSV/grammar.csv. */
  function appendGrammar() {
    if (!window.AkkGrammar || engBusy) return;
    window.AkkGrammar.ensure();
    const words = (curEnglish || '').split(/\s+/).filter(Boolean);
    if (!words.length) return;
    const g = window.AkkGrammar.analyze(words, 'en2akk');
    if (!g) return;
    // per-word role chips on each reconstructed word (subject / verb / object …)
    if (g.inlineHTML) {
      const engEl = outEl.querySelector('.gap-akk-eng');
      if (engEl) {
        const lbl = engEl.querySelector('.gap-akk-eng-lbl');
        engEl.innerHTML = (lbl ? lbl.outerHTML : '') + '<span class="gap-eng-roles">' + g.inlineHTML + '</span>';
      } else {
        outEl.innerHTML = '<span class="gap-eng-roles">' + g.inlineHTML + '</span>';
      }
    }
    if (g.summaryHTML) outEl.innerHTML += g.summaryHTML;
    g.log('gap reconstruction');
  }
  function renderOut() {
    outEl.className = 'gap-model-text';
    if (showEnglish) {
      resTitle.innerHTML = '&#127760; English translation';
      outEl.textContent = curEnglish || cleanEng(lastEnglish) || '(no output)';
      appendGrammar();
      return;
    }
    resTitle.innerHTML = '&#129513; Reconstructed Akkadian';
    let gi = -1;
    const cune = tokens.map((tk) => {
      if (tk.gap) {
        gi++;
        const f = gapsData[gi] ? gapsData[gi].alts[gapsData[gi].chosen] : null;
        const glyph = (f && f.c) ? f.c : ((f && (f.t || f.en)) ? (f.t || f.en) : (tk.big ? '……' : '…'));
        return '<span class="gap-slot">' + esc(glyph) + '</span>';
      }
      if (tk.t === ' ') return ' ';
      return '<span class="gap-word">' + esc(tk.c || tk.t) + '</span>';
    }).join('');
    gi = -1;
    const tl = []; let cur = [];
    const flush = () => { if (cur.length) { tl.push(cur.join('-')); cur = []; } };
    for (const tk of tokens) {
      if (tk.gap) { flush(); gi++; const f = gapsData[gi] ? gapsData[gi].alts[gapsData[gi].chosen] : null;
        tl.push('[' + ((f && f.t) ? f.t : (f && f.en ? f.en : '…')) + ']'); }
      else if (tk.t === ' ') flush();
      else cur.push(tk.t.trim());
    }
    flush();
    lastAkkTranslit = tl.join(' ');
    const engHtml = engBusy
      ? '<div class="gap-akk-eng"><span class="gap-akk-eng-lbl">&#127760; meaning</span><em class="gap-eng-busy">re-reading with the model&hellip;</em></div>'
      : (curEnglish ? '<div class="gap-akk-eng"><span class="gap-akk-eng-lbl">&#127760; meaning</span>' + esc(curEnglish) + '</div>' : '');
    outEl.innerHTML = '<div class="gap-akk-cune">' + cune + '</div>' +
                      '<div class="gap-akk-translit">(' + esc(lastAkkTranslit) + ')</div>' + engHtml;
    appendGrammar();
    decipherSlots();   // animate the filled gaps "resolving" into place
  }

  function renderFills() {
    fillsEl.innerHTML = '';
    if (!gapsData.length) {
      fillsEl.innerHTML = '<p class="gap-none">No gaps in this fragment — add a small or big gap, then reconstruct.</p>';
      return;
    }
    gapsData.forEach((g, gi) => {
      const wrap = document.createElement('div'); wrap.className = 'gap-fill';
      wrap.innerHTML =
        '<div class="gap-fill-head"><span class="gap-fill-n">Gap ' + (gi + 1) + '</span></div>' +
        '<div class="gap-alts">' +
        g.alts.map((a, ai) =>
          '<button type="button" class="gap-alt' + (ai === g.chosen ? ' is-on' : '') +
          '" data-gi="' + gi + '" data-ai="' + ai + '">' +
          (a.c ? '<span class="gap-alt-cune">' + a.c + '</span>' : '') +
          '<span class="gap-alt-tok">' + esc(a.t || a.en) + '</span>' +
          (a.t && a.en ? '<span class="gap-alt-en">' + esc(a.en) + '</span>' : '') +
          '<span class="gap-alt-conf ' + confClass(a.conf) + '">' + pct(a.conf) + '</span>' +
          '</button>'
        ).join('') +
        '</div>';
      fillsEl.appendChild(wrap);
    });
    fillsEl.querySelectorAll('.gap-alt').forEach((b) => {
      b.addEventListener('click', async () => {
        const gi = Number(b.dataset.gi), ai = Number(b.dataset.ai);
        gapsData[gi].chosen = ai;
        b.parentElement.querySelectorAll('.gap-alt').forEach((x) => x.classList.toggle('is-on', x === b));
        updateEnglish();                       // instant best-effort preview
        // let the model re-read the fragment with the chosen dictionary word filled in
        const my = ++refineSeq; engBusy = true; renderOut();
        try {
          const res = await fetch(AI_BASE + '/api/reconstruct', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptWithGapsFilled() })
          });
          await res.json();                     // let the model re-read the fragment (the "brain" thinks)
          if (my !== refineSeq) return;         // a newer tap superseded this one
          engBusy = false; updateEnglish(); renderOut();   // meaning stays dictionary-grounded, not the raw model text
          log('Gap', 'refine', 'gap ' + (gi + 1) + ' = ' + (gapsData[gi].alts[ai].t || gapsData[gi].alts[ai].en));
        } catch (e) {
          if (my === refineSeq) { engBusy = false; updateEnglish(); renderOut(); }   // offline: keep the instant swap
        }
      });
    });
  }

  /* ---- multiple candidate readings: each a full Akkadian line + its English,
     separately copyable. Fills come from fresh samples of the model. ---- */
  const candEl = document.getElementById('gapCandidates');
  function cleanEng(s) { return (s || '').replace(/<big_gap>/g, '……').replace(/<gap>/g, '…'); }
  function buildAkkFromGaps(gd) {
    let gi = -1; const tl = []; let cur = [];
    const flush = () => { if (cur.length) { tl.push(cur.join('-')); cur = []; } };
    for (const tk of tokens) {
      if (tk.gap) { flush(); gi++; const f = gd[gi] ? gd[gi].alts[gd[gi].chosen] : null;
        tl.push('[' + ((f && f.t) ? f.t : (f && f.en ? f.en : '…')) + ']'); }
      else if (tk.t === ' ') flush();
      else cur.push(tk.t.trim());
    }
    flush();
    return tl.join(' ');
  }
  function renderCandidates(cands) {
    if (!candEl) return;
    candEl.hidden = false;
    candEl.innerHTML = '<span class="gap-res-sub">Candidate readings — several close reconstructions, each copyable</span>' +
      cands.map((c, i) =>
        '<div class="gap-cand">' +
          '<div class="gap-cand-top"><span class="gap-cand-n">Reading ' + (i + 1) + '</span>' +
            '<span class="gap-alt-conf ' + confClass(c.conf / 100) + '">' + c.conf + '%</span>' +
            '<button type="button" class="gap-cand-copy" data-i="' + i + '" title="Copy this reading (Akkadian + English)">&#128203; Copy</button></div>' +
          '<div class="gap-cand-akk">' + esc(c.akk) + '</div>' +
          '<div class="gap-cand-eng">' + esc(c.eng) + '</div>' +
        '</div>'
      ).join('');
    candEl.querySelectorAll('.gap-cand-copy').forEach((b) => {
      b.addEventListener('click', () => {
        const c = cands[Number(b.dataset.i)];
        copyText(c.akk + '\n' + c.eng); flash(b, 'Copied!');
        log('Gap', 'copy-candidate', 'reading ' + (Number(b.dataset.i) + 1));
      });
    });
  }
  async function moreCandidates(prompt, first) {
    const cands = [first];
    for (let n = 0; n < 2; n++) {
      try {
        const res = await fetch(AI_BASE + '/api/reconstruct', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt })
        });
        const data = await res.json();
        const eng = data.reconstructedText || '';
        const bg = (Array.isArray(data.tokens) ? data.tokens : []).filter((t) => t && t.isMissing);
        const gd = computeGapFills(eng, bg);
        const cand = { akk: buildAkkFromGaps(gd), eng: dictEnglish(gd) || cleanEng(eng),
          conf: (typeof data.globalConfidence === 'number') ? Math.round(data.globalConfidence * 100) : 0 };
        if (!cands.some((x) => x.akk === cand.akk && x.eng === cand.eng)) { cands.push(cand); renderCandidates(cands); }
      } catch (e) { break; }
    }
  }

  /* evidence & method: show which layer answered (attested match / cited parallel /
     model estimate) and cite the closest real tablet line — the "citation narrative". */
  function sourceBadge(source) {
    if (source === 'translation_memory') return '<span class="gap-badge gap-badge--attested">&#9989; Attested match</span>';
    if (source === 'attested_parallel')  return '<span class="gap-badge gap-badge--parallel">&#128206; Cited attested parallel</span>';
    return '<span class="gap-badge gap-badge--model">&#129504; Model estimate</span>';
  }
  function renderEvidence(data) {
    if (!evidenceEl) return;
    const source = data.source || 'model_estimate';
    const sim = typeof data.retrievalSimilarity === 'number' ? data.retrievalSimilarity : 0;
    const parSrc = data.topParallelSrc || '', parEn = data.topParallel || '', parNote = data.topParallelNote || '';
    const attested = data.attestedReconstruction || '';
    let html = '<div class="gap-ev-head">' + sourceBadge(source) +
      (source !== 'model_estimate' && sim > 0 ? '<span class="gap-ev-sim">similarity ' + sim.toFixed(2) + '</span>' : '') + '</div>';
    if (source === 'model_estimate') {
      html += '<p class="gap-ev-line gap-ev-guess">No close attested parallel was found, so this reconstruction is the models’ estimate — read it as a scholarly guess shown with its confidence, not a certainty.</p>';
    } else {
      if (attested) html += '<p class="gap-ev-line"><span class="gap-ev-lbl">Evidence-based reading</span><b class="gap-ev-akk">' + esc(attested) + '</b></p>';
      if (parSrc) html += '<p class="gap-ev-line"><span class="gap-ev-lbl">Closest attested tablet line</span><b class="gap-ev-akk">' + esc(parSrc) + '</b> <span class="gap-ev-arr">&rarr;</span> <span class="gap-ev-en">' + esc(parEn) + '</span>' + (parNote ? '<span class="gap-ev-note">' + esc(parNote) + '</span>' : '') + '</p>';
    }
    evidenceEl.innerHTML = html;
    evidenceEl.hidden = false;
  }

  async function run() {
    const prompt = translit(false);
    if (!prompt) { if (cuneBox) cuneBox.focus(); return; }
    warmDict();
    resBox.hidden = false; fillsBlock.hidden = true; swapBtn.hidden = true;
    if (gaugeEl) gaugeEl.hidden = true;
    modelEl.textContent = '';
    resTitle.innerHTML = '&#129513; Reconstructed Akkadian';
    showMsg('Reconstructing the gaps with the AI model…');
    runBtn.disabled = true;
    const t0 = performance.now();
    try {
      const res = await fetch(AI_BASE + '/api/reconstruct', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
      });
      const data = await res.json();
      lastEnglish = data.reconstructedText || '';
      const seq = Array.isArray(data.tokens) ? data.tokens : [];
      const backendGaps = seq.filter((t) => t && t.isMissing);
      gapsData = computeGapFills(lastEnglish, backendGaps);
      updateEnglish();
      modelEl.textContent = data.modelUsed ? ('· ' + data.modelUsed) : '';
      const conf = (typeof data.globalConfidence === 'number') ? Math.round(data.globalConfidence * 100) : null;
      showEnglish = false;
      renderOut();
      renderFills();
      fillsBlock.hidden = false;
      swapBtn.hidden = false;
      if (conf != null) renderGauge(conf); else if (gaugeEl) gaugeEl.hidden = true;
      const first = { akk: lastAkkTranslit, eng: curEnglish || cleanEng(lastEnglish), conf: conf != null ? conf : 0 };
      renderCandidates([first]);
      moreCandidates(prompt, first);
      renderEvidence(data);
      const ms = data.inferenceTimeMs != null ? data.inferenceTimeMs : Math.round(performance.now() - t0);
      log('AI', 'reconstruct', 'prompt="' + prompt + '"; model=' + (data.modelUsed || '?') +
        '; confidence=' + (conf != null ? conf + '%' : 'n/a') + '; gaps=' + gapsData.length +
        '; ms=' + ms + '; english="' + (lastEnglish || '').slice(0, 80) + '"');
    } catch (err) {
      gapsData = []; lastEnglish = ''; fillsBlock.hidden = true; swapBtn.hidden = true;
      if (gaugeEl) gaugeEl.hidden = true;
      if (candEl) candEl.hidden = true;
      if (evidenceEl) evidenceEl.hidden = true;
      modelEl.textContent = 'offline';
      showMsg('AI backend is offline. Start it with:\n' +
        'python innoverse_pipeline_final.py --serve ' +
        '--model-path models/model_1 --model-path models/model_2 --model-path models/model_3', 'gap-off');
      log('AI', 'reconstruct-offline', 'prompt="' + prompt + '"; server not reachable at ' + (AI_BASE || 'same-origin'));
    } finally {
      runBtn.disabled = false;
    }
  }

  /* canned example: 1 ma-na <gap> a-na  (real cuneiform signs) */
  const EXAMPLE = [
    { c: '𒁹', t: '1' }, { c: ' ', t: ' ' },
    { c: '𒈠', t: 'ma' }, { c: '𒈾', t: 'na' }, { c: ' ', t: ' ' },
    { gap: true, big: false, t: '<gap>', c: '⬚' }, { c: ' ', t: ' ' },
    { c: '𒀀', t: 'a' }, { c: '𒈾', t: 'na' }
  ];

  function reset() {
    tokens = []; caret = 0; gapsData = []; lastEnglish = ''; showEnglish = false;
    renderBox(); resBox.hidden = true; swapBtn.hidden = true;
    if (gaugeEl) gaugeEl.hidden = true;
    if (candEl) candEl.hidden = true;
    if (evidenceEl) evidenceEl.hidden = true;
  }

  buildKeyboard();
  renderBox();
  checkEngine(8);   // show the engine status pill (ready / starting / offline)

  /* one-click demo + sample gallery */
  if (demoBtn) demoBtn.addEventListener('click', () => {
    parseInto('1 ma-na kaspum a-na <gap> a-na-kam'); warmDict();
    log('Gap', 'demo-run', 'flagship broken-tablet demo'); run();
  });
  if (samplesEl) SAMPLES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'gap-sample'; b.textContent = s.label; b.title = s.text;
    b.addEventListener('click', () => { parseInto(s.text); warmDict(); if (cuneBox) cuneBox.focus(); log('Gap', 'sample-loaded', s.label + ' :: ' + s.text); });
    samplesEl.appendChild(b);
  });

  insSmall.addEventListener('click', () => insertGap(false));
  insBig.addEventListener('click', () => insertGap(true));
  exBtn.addEventListener('click', () => { tokens = EXAMPLE.map((t) => Object.assign({}, t)); caret = tokens.length; warmDict(); renderBox(); if (cuneBox) cuneBox.focus(); });
  clearBtn.addEventListener('click', () => { reset(); if (cuneBox) cuneBox.focus(); });
  swapBtn.addEventListener('click', () => { showEnglish = !showEnglish; renderOut(); log('Gap', 'swap-view', showEnglish ? 'show English translation' : 'show reconstructed Akkadian'); });
  if (resCopyBtn) resCopyBtn.addEventListener('click', () => {
    const txt = showEnglish
      ? (lastEnglish || '').replace(/<big_gap>/g, '……').replace(/<gap>/g, '…')
      : lastAkkTranslit;
    if (txt) { copyText(txt); flash(resCopyBtn, 'Copied!'); log('Gap', 'copy-result', (showEnglish ? 'english' : 'akkadian') + ': ' + txt.slice(0, 60)); }
  });
  runBtn.addEventListener('click', run);
  if (resSpeakBtn) resSpeakBtn.addEventListener('click', speakReconstruction);
  if (copyBtn) copyBtn.addEventListener('click', () => { const t = translit(true); if (t) { copyText(t); flash(copyBtn, 'Copied!'); log('Gap', 'copy', t); } });
  const gapPasteBtn = document.getElementById('gapPaste');
  if (gapPasteBtn) gapPasteBtn.addEventListener('click', async () => {
    let t = ''; try { t = await navigator.clipboard.readText(); } catch (e) { flash(gapPasteBtn, 'allow paste'); return; }
    if (t && t.trim()) { warmDict(); parseInto(t, true); if (cuneBox) cuneBox.focus(); flash(gapPasteBtn, 'Pasted!'); log('Gap', 'paste-btn', t.trim().slice(0, 60)); }
  });
  if (cuneBox) {
    cuneBox.addEventListener('focus', warmDict);
    cuneBox.addEventListener('click', (e) => { setCaretFromClick(e.clientX); cuneBox.focus(); });
    cuneBox.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') { e.preventDefault(); popSign(); }
      else if (e.key === 'Delete') { e.preventDefault(); delForward(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); moveCaret(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); moveCaret(1); }
      else if (e.key === 'Home') { e.preventDefault(); caret = 0; renderBox(); }
      else if (e.key === 'End') { e.preventDefault(); caret = tokens.length; renderBox(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    });
    /* paste transliteration (with optional gap markers) -> tokens */
    cuneBox.addEventListener('paste', (e) => {
      e.preventDefault();
      const cd = e.clipboardData || window.clipboardData;
      const text = cd ? cd.getData('text') : '';
      if (!text || !text.trim()) return;
      parseInto(text, true); warmDict();
      log('Gap', 'paste', text.trim().slice(0, 80));
    });
  }
})();

/* =========================================================
   MASTERS OF AKKADIAN
   Each scholar card carries a hidden .master-detail. Clicking (or
   Enter/Space on) a card fades in a full-screen profile sheet built
   from that detail; the ✕, a background click, or Esc closes it.
   ========================================================= */
(function () {
  const overlay = document.getElementById('masterOverlay');
  if (!overlay) return;
  const body = document.getElementById('masterOverlayBody');
  const closeBtn = overlay.querySelector('.master-overlay-close');
  const html = document.documentElement;
  let fadeTimer = null;

  function open(card) {
    const detail = card.querySelector('.master-detail');
    if (!detail) return;
    clearTimeout(fadeTimer);
    body.innerHTML = detail.innerHTML;
    overlay.hidden = false;
    html.style.overflow = 'hidden';                 // lock the page behind the sheet
    overlay.scrollTop = 0;
    setTimeout(() => overlay.classList.add('is-open'), 15);   // fade in (robust even when tab is backgrounded)
    if (window.AkkLog) {
      const t = (card.querySelector('.master-name, h3') || {}).textContent || 'profile';
      window.AkkLog.log(card.classList.contains('about-card') ? 'About' : 'Masters', 'open-profile', t.trim());
    }
  }
  function close() {
    overlay.classList.remove('is-open');            // fade out
    html.style.overflow = '';
    fadeTimer = setTimeout(() => { overlay.hidden = true; body.innerHTML = ''; }, 360);
  }

  document.querySelectorAll('.master-card, .about-card').forEach((card) => {
    card.addEventListener('click', () => open(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card); }
    });
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) close(); });
})();

/* =========================================================
   TOP-NAV ROUTING  (Home / About / AI Engine / Support Us)
   Each nav item swaps the whole view: opening a section HIDES the main
   view (hero + accordion + panels) and shows only that section from the
   top — sections never stack under the main content. Home restores the
   main view in place (no reload, so the intro splash is not replayed).
   ========================================================= */
(function () {
  const siteNav = document.querySelector('.site-nav');
  const sections = document.querySelectorAll('.nav-section');
  const mainView = document.querySelectorAll('.hero-title, .hero-accordion, .panel-details');

  function showMain(show) { mainView.forEach((s) => s.classList.toggle('is-hidden', !show)); }

  function showSection(id) {
    showMain(false);                                          // hide the main view (no stacking)
    sections.forEach((s) => s.classList.toggle('is-open', s.id === id));
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (window.AkkLog) window.AkkLog.log('Nav', 'open-section', id);
  }

  function goHome() {
    sections.forEach((s) => s.classList.remove('is-open'));   // close any open section
    showMain(true);                                           // bring the main view back
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  document.querySelectorAll('.nav-list a[data-nav]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const which = a.dataset.nav;
      if (siteNav) siteNav.classList.remove('is-open');       // close mobile menu
      e.preventDefault();
      if (which === 'home') { goHome(); return; }             // no reload -> intro is not replayed
      showSection(which);
    });
  });

  /* ---------- Support form -> sends the email DIRECTLY (no email app) ----------
     Uses the free Web3Forms relay so a static site can send mail. The destination
     address is NOT in this page — it is tied to the access key on Web3Forms' side.
     >>> Paste your free access key from https://web3forms.com below. <<< */
  const WEB3FORMS_KEY = '0657071a-70c5-4db7-96c7-a491e114f9ae';

  const form = document.getElementById('supportForm');
  const statusEl = document.getElementById('sfStatus');
  const sendBtn = document.getElementById('sfSend');
  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'sf-status' + (kind ? ' ' + kind : '');
  }
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (document.getElementById('sfName').value || '').trim();
      const email = (document.getElementById('sfEmail').value || '').trim();
      const msg = (document.getElementById('sfMsg').value || '').trim();
      if (!email) { document.getElementById('sfEmail').focus(); setStatus('Please add your email so we can reply.', 'err'); return; }
      if (!msg) { document.getElementById('sfMsg').focus(); setStatus('Please write a message.', 'err'); return; }
      if (WEB3FORMS_KEY === 'YOUR_WEB3FORMS_ACCESS_KEY') {
        setStatus('Sending is not set up yet — a Web3Forms access key is needed.', 'err');
        return;
      }
      setStatus('Sending…', '');
      if (sendBtn) sendBtn.disabled = true;
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: 'Support message — Akkadian Encyclopedia',
            from_name: name || 'Site visitor',
            name: name,
            email: email,
            message: msg
          })
        });
        const data = await res.json();
        if (data.success) { setStatus('Message sent — thank you!', 'ok'); form.reset(); }
        else { setStatus('Could not send: ' + (data.message || 'unknown error'), 'err'); }
      } catch (err) {
        setStatus('Network error — please try again.', 'err');
      } finally {
        if (sendBtn) sendBtn.disabled = false;
      }
    });
  }
})();
