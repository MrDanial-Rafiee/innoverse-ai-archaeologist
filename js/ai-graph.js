/* =========================================================
   AI ENGINE — reusable interactive graph (force-directed, self-contained).
   makeGraph(mount, NODES, FLOW, opts) builds one graph with:
     • zoom (wheel) + pan (drag background)
     • directional arrows on every edge (input → output)
     • hover tooltip · click → side panel with role, I/O and the code
     • draggable nodes ; distance from centre ~ processing weight
   The MAIN graph explains the Translate script; double-clicking its black
   background opens a META graph below that explains this graph itself.
   ========================================================= */
(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';
  const stack = document.getElementById('aiGraphStack');
  if (!stack) return;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }
  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function sv(tag) { return document.createElementNS(SVGNS, tag); }

  /* =============== DATA: translate engine =============== */
  const T_NODES = [
    { id: 'engine', type: 'root', title: 'Frontend Tools', weight: 1,
      desc: 'The whole on-page frontend in js/script.js: the Translate tool and the Gap Reconstruction tool. It wires the keyboard, dictionary, matcher, renderer, speech and gap engine together, with the two tools sharing one dictionary and one voice engine through window.AkkTool.',
      inputs: ['user taps / typing', 'akkadian_dictionary.js', 'cuneiform_keys.js', '/api/reconstruct'],
      outputs: ['live translation', 'gap reconstruction + evidence', 'spoken pronunciation'],
      code: "(function () {\n  const tool = document.getElementById('translateTool');\n  if (!tool) return;\n  // …keyboard, dictionary, search, render, voice, wiring…\n})();" },

    { id: 'keyboard', type: 'hub', title: 'Cuneiform Keyboard', weight: .7,
      desc: 'Builds the on-screen syllable keyboard from OGSL and turns taps into input.',
      inputs: ['AKKADIAN_KEYS (OGSL)'], outputs: ['tokens { sign, reading }'] },
    { id: 'input', type: 'hub', title: 'Input & Tokens', weight: .7,
      desc: 'Holds the typed word as a list of { cuneiform, reading } tokens and renders the top box.',
      inputs: ['key taps'], outputs: ['tokens[]', 'cuneiform display'] },
    { id: 'norm', type: 'hub', title: 'Normalization', weight: .7,
      desc: 'Folds diacritics and collapses doubles so approximate spelling still matches.',
      inputs: ['transliteration'], outputs: ['normalized key'] },
    { id: 'dict', type: 'hub', title: 'Dictionary', weight: .8,
      desc: '11,154 Akkadian entries (Oracc + OGSL), lazy-loaded and pre-indexed.',
      inputs: ['akkadian_dictionary.js'], outputs: ['DICT[] with _t / _tc / _e'] },
    { id: 'match', type: 'hub', title: 'Matching & Ranking', weight: .85,
      desc: 'Scans the dictionary and ranks candidates by match quality then frequency.',
      inputs: ['normalized query', 'DICT'], outputs: ['ranked entries'] },
    { id: 'render', type: 'hub', title: 'Output / Render', weight: .7,
      desc: 'Turns the matches into the live result shown in the bottom box.',
      inputs: ['ranked entries'], outputs: ['result HTML', 'lastEntry'] },
    { id: 'voice', type: 'hub', title: 'Voice Assistant', weight: .8,
      desc: 'Speaks the Akkadian pronunciation and highlights each sign in sync.',
      inputs: ['transliteration', 'tokens'], outputs: ['audio', 'red sign highlight'] },
    { id: 'controls', type: 'hub', title: 'Controls & Direction', weight: .65,
      desc: 'Swap direction, Copy, Clear and the Speak button.',
      inputs: ['button clicks'], outputs: ['direction / actions'] },

    { id: 'OGSL', type: 'leaf', group: 'keyboard', title: 'AKKADIAN_KEYS (OGSL)', weight: .7,
      desc: 'The sign data: for each base key a main cuneiform sign plus a family of syllable signs, generated from the Oracc Global Sign List.',
      inputs: ['ogsl-sl.json (build time)'], outputs: ['window.AKKADIAN_KEYS'],
      code: "window.AKKADIAN_KEYS = [\n  { b:'b', label:'b', c:'𒁀',\n    v:[['ba','𒁀'],['bi','𒁉'],['bu','𒁍'],['ab','𒀊'],['ib','𒅁'],['ub','𒌒']] },\n  …\n];" },
    { id: 'buildKeyboard', type: 'leaf', group: 'keyboard', title: 'buildKeyboard()', weight: .55,
      desc: 'Creates every key button plus Space and Backspace.',
      inputs: ['AKKADIAN_KEYS'], outputs: ['keyboard DOM'],
      code: "function buildKeyboard() {\n  kb.innerHTML = '';\n  const keys = window.AKKADIAN_KEYS;\n  keys.forEach((k) => kb.appendChild(makeKey(k)));\n  // + Space and ⌫\n}" },
    { id: 'makeKey', type: 'leaf', group: 'keyboard', title: 'makeKey(k)', weight: .5,
      desc: 'Builds one key: shows the cuneiform sign + label, and a hover popup with the sign family.',
      inputs: ['a key object k'], outputs: ['<button> with popup'],
      code: "function makeKey(k) {\n  const b = document.createElement('button');\n  b.className = 'tr-key';\n  b.innerHTML = (k.c?'<span class=\"tr-kc\">'+k.c+'</span>':'')\n              + '<span class=\"tr-kl\">'+k.label+'</span>';\n  b.addEventListener('click', () => pushToken(k.c||'', baseReading(k)));\n  // …append popup of variants (k.v)…\n  return b;\n}" },
    { id: 'baseReading', type: 'leaf', group: 'keyboard', title: 'baseReading(k)', weight: .2,
      desc: 'The transliteration a base key inserts: a vowel, or the "Ca" syllable for a consonant.',
      inputs: ['key object'], outputs: ['reading string'],
      code: "function baseReading(k) {\n  if (k.label.length === 1 && 'aeiu'.includes(k.label)) return k.label;\n  if (k.label === 'ʾ') return 'ʾ';\n  return k.label + 'a';\n}" },
    { id: 'popup', type: 'leaf', group: 'keyboard', title: 'Hover sign-family', weight: .35,
      desc: 'The little popup over a key showing the extra syllable signs that do not fit on the key (ba, bi, bu, ab…). Clicking one inserts that syllable.',
      inputs: ['k.v (variants)'], outputs: ['pushToken(sign, reading)'],
      code: "k.v.forEach(([r, c]) => {\n  const vi = document.createElement('button');\n  vi.className = 'tr-pi';\n  vi.innerHTML = '<span class=\"tr-pc\">'+c+'</span><span class=\"tr-pr\">'+r+'</span>';\n  vi.addEventListener('click', (e) => { e.stopPropagation(); pushToken(c, r); });\n  pop.appendChild(vi);\n});" },

    { id: 'tokens', type: 'leaf', group: 'input', title: 'tokens[]', weight: .45,
      desc: 'The state of the current word: an array of { c: cuneiform sign, t: reading }.',
      inputs: ['pushToken / popToken'], outputs: ['the current word'],
      code: "let tokens = [];   // [{ c:'𒁀', t:'ba' }, …]" },
    { id: 'pushToken', type: 'leaf', group: 'input', title: 'pushToken(c, t)', weight: .4,
      desc: 'Adds one sign+reading to the word and re-renders.',
      inputs: ['sign c', 'reading t'], outputs: ['updated tokens', 'search'],
      code: "function pushToken(c, t) {\n  tokens.push({ c: c, t: t });\n  renderCuneBox();\n  schedule();\n}" },
    { id: 'popToken', type: 'leaf', group: 'input', title: 'popToken()', weight: .25,
      desc: 'Backspace — removes the last sign.',
      inputs: ['tokens'], outputs: ['updated tokens'],
      code: "function popToken() {\n  tokens.pop();\n  renderCuneBox();\n  schedule();\n}" },
    { id: 'renderCuneBox', type: 'leaf', group: 'input', title: 'renderCuneBox()', weight: .5,
      desc: 'Draws the top box: each sign as a span (so it can be highlighted) plus the (transliteration) line.',
      inputs: ['tokens'], outputs: ['top-box DOM'],
      code: "function renderCuneBox() {\n  cuneLine.innerHTML = tokens.map((t, i) =>\n    '<span class=\"tr-sign\" data-i=\"'+i+'\">'+esc(t.c)+'</span>').join('');\n  const tl = tokens.map((t) => t.t).join('').trim();\n  translitLine.textContent = tl ? '('+tl+')' : '';\n}" },

    { id: 'normFn', type: 'leaf', group: 'norm', title: 'norm(str)', weight: .6,
      desc: 'Folds diacritics to plain ascii (š→s, ḫ→h, long vowels→base) so typing without special letters still matches.',
      inputs: ['transliteration'], outputs: ['folded key'],
      code: "function norm(str) {\n  let out = '';\n  for (const c of str.toLowerCase())\n    out += (FOLD.hasOwnProperty(c) ? FOLD[c] : c);\n  return out.replace(/[^a-z ]/g,'').replace(/sh/g,'s').replace(/kh/g,'h').trim();\n}" },
    { id: 'collapse', type: 'leaf', group: 'norm', title: 'collapse(s)', weight: .45,
      desc: 'Fuzzy helper: removes doubled letters so a syllabic spelling (šaru) can still reach a doubled lemma (šarru).',
      inputs: ['folded key'], outputs: ['collapsed key'],
      code: "function collapse(s) { return s.replace(/(.)\\1+/g, '$1'); }" },
    { id: 'FOLD', type: 'leaf', group: 'norm', title: 'FOLD map', weight: .3,
      desc: 'The character map used by norm().',
      inputs: ['—'], outputs: ['fold table'],
      code: "const FOLD = { 'ā':'a','â':'a','ē':'e','ī':'i','ū':'u',\n  'š':'s','ṣ':'s','ṭ':'t','ḫ':'h','ḥ':'h','ʾ':'','ʿ':'' };" },

    { id: 'ensure', type: 'leaf', group: 'dict', title: 'ensure()', weight: .6,
      desc: 'Lazy-loads the dictionary (a 0.76 MB JS file) the first time the tool is used, then pre-indexes each entry.',
      inputs: ['first use'], outputs: ['DICT loaded + indexed'],
      code: "function ensure() {\n  if (loaded || loading) return;\n  loading = true;\n  const s = document.createElement('script');\n  s.src = 'data/akkadian/akkadian_dictionary.js';\n  s.onload = () => {\n    DICT = window.AKKADIAN_DICT.entries;\n    for (const e of DICT) {\n      e._t = norm(e.t).replace(/\\s+/g,'');\n      e._tc = collapse(e._t);\n      e._e = (e.e||[]).join(' ; ').toLowerCase();\n    }\n    loaded = true; translate();\n  };\n  document.head.appendChild(s);\n}" },
    { id: 'DICT', type: 'leaf', group: 'dict', title: 'DICT (11,154)', weight: .85,
      desc: 'The whole lexicon in memory: each entry has transliteration, cuneiform, part of speech, meanings and frequency.',
      inputs: ['akkadian_dictionary.js'], outputs: ['searchable entries'],
      code: "// each entry:\n// { t:'šarru', p:'N', e:['king'], c:'𒈗', l:['LUGAL'], f:21601 }\n// plus indexes added at load: _t, _tc, _e" },
    { id: 'precompute', type: 'leaf', group: 'dict', title: 'pre-index', weight: .6,
      desc: 'Once, at load, every entry gets a folded key (_t), a collapsed key (_tc) and a lowercased meanings blob (_e) so search is fast.',
      inputs: ['raw entries'], outputs: ['_t / _tc / _e'],
      code: "for (const e of DICT) {\n  e._t = norm(e.t).replace(/\\s+/g, '');\n  e._tc = collapse(e._t);\n  e._e = (e.e || []).join(' ; ').toLowerCase();\n}" },

    { id: 'searchAkk', type: 'leaf', group: 'match', title: 'searchAkk(buffer)', weight: .9,
      desc: 'Akkadian→English: scans all 11,154 entries, scoring exact / prefix / contains (then the same on collapsed keys), and sorts by score then frequency.',
      inputs: ['transliteration buffer', 'DICT'], outputs: ['ranked entries'],
      code: "function searchAkk(buffer) {\n  const q = norm(buffer).replace(/\\s+/g,''); if (!q) return [];\n  const qc = collapse(q); const res = [];\n  for (const e of DICT) {\n    const t = e._t, tc = e._tc; let rank = -1;\n    if (t === q) rank = 0; else if (t.startsWith(q)) rank = 1;\n    else if (t.includes(q)) rank = 2;\n    else if (tc === qc) rank = 3; else if (tc.startsWith(qc)) rank = 4;\n    else if (tc.includes(qc)) rank = 5;\n    if (rank >= 0) res.push([rank, e]);\n  }\n  res.sort((a,b)=>(a[0]-b[0])||((b[1].f||0)-(a[1].f||0)));\n  return res.map((m) => m[1]);\n}" },
    { id: 'searchEng', type: 'leaf', group: 'match', title: 'searchEng(word)', weight: .85,
      desc: 'English→Akkadian: finds entries whose meanings contain the word, ranked whole-word > prefix > substring, then frequency.',
      inputs: ['an English word', 'DICT'], outputs: ['ranked entries'],
      code: "function searchEng(word) {\n  const q = word.toLowerCase(); const res = [];\n  for (const e of DICT) {\n    const words = e._e.split(/[^a-z]+/).filter(Boolean); let rank = -1;\n    if (words.includes(q)) rank = 0;\n    else if (words.some((w) => w.startsWith(q))) rank = 1;\n    else if (e._e.includes(q)) rank = 2;\n    if (rank >= 0) res.push([rank, e]);\n  }\n  res.sort((a,b)=>(a[0]-b[0])||((b[1].f||0)-(a[1].f||0)));\n  return res.map((m) => m[1]);\n}" },

    { id: 'renderAkk', type: 'leaf', group: 'render', title: 'renderAkk(list)', weight: .5,
      desc: 'Shows the best Akkadian match + a few alternates in the bottom box, and remembers the English gloss for Swap.',
      inputs: ['ranked entries'], outputs: ['result HTML', 'lastEnglish'],
      code: "function renderAkk(list, buffer) {\n  const first = list[0];\n  lastEntry = first; lastEnglish = (first.e && first.e[0]) || '';\n  output.innerHTML = primaryHTML(first, null)\n                   + moreHTML(list.slice(1, 8), null)\n                   + countHTML(list.length);\n}" },
    { id: 'renderEngSingle', type: 'leaf', group: 'render', title: 'renderEngSingle(list)', weight: .45,
      desc: 'Shows results for a single English word, with the query highlighted.',
      inputs: ['ranked entries'], outputs: ['result HTML'],
      code: "function renderEngSingle(list, raw) {\n  const re = new RegExp('('+escRe(raw)+')', 'ig');\n  lastEntry = list[0];\n  output.innerHTML = primaryHTML(list[0], re)\n                   + moreHTML(list.slice(1, 8), re);\n}" },
    { id: 'renderWordByWord', type: 'leaf', group: 'render', title: 'renderWordByWord(words)', weight: .55,
      desc: 'For an English phrase: translates each word to its best Akkadian match; unknown words / names show "— no Akkadian word".',
      inputs: ['English words[]'], outputs: ['per-word rows'],
      code: "function renderWordByWord(words) {\n  let html = '<div class=\"tr-wbw\">';\n  for (const w of words) {\n    const best = searchEng(w)[0];\n    html += best\n      ? '<div class=\"tr-wrow\">'+w+' → '+best.t+' '+(best.c||'')+'</div>'\n      : '<div class=\"tr-wrow\">'+w+' → — no Akkadian word</div>';\n  }\n  output.innerHTML = html + '</div>';\n}" },
    { id: 'primaryHTML', type: 'leaf', group: 'render', title: 'primaryHTML(e)', weight: .3,
      desc: 'Formats the top result: transliteration, cuneiform, part of speech and meaning.',
      inputs: ['an entry'], outputs: ['HTML string'],
      code: "function primaryHTML(e, re) {\n  return '<div class=\"tr-primary\">'\n    + '<span class=\"tr-term\">'+esc(e.t)+'</span>'\n    + (e.c ? '<span class=\"tr-cuneiform\">'+e.c+'</span>' : '')\n    + '<span class=\"tr-mean\">'+meaningHTML(e, re)+'</span></div>';\n}" },
    { id: 'moreHTML', type: 'leaf', group: 'render', title: 'moreHTML(list)', weight: .3,
      desc: 'Formats the list of alternate matches under the primary result.',
      inputs: ['entries[]'], outputs: ['HTML string'],
      code: "function moreHTML(list, re) {\n  if (!list.length) return '';\n  let h = '<div class=\"tr-more\">';\n  for (const e of list) h += '<div class=\"tr-result\">…'+esc(e.t)+'…</div>';\n  return h + '</div>';\n}" },

    { id: 'phonetic', type: 'leaf', group: 'voice', title: 'phonetic(str)', weight: .55,
      desc: 'Rewrites the transliteration to an approximate, speakable spelling (š→sh, ḫ→kh, ṣ→ts, ṭ→t, q→k, long vowels held).',
      inputs: ['transliteration'], outputs: ['speakable text'],
      code: "function phonetic(str) {\n  return str.toLowerCase()\n    .replace(/ā|â/g,'A').replace(/ē|ê/g,'E').replace(/ī|î/g,'I').replace(/ū|û/g,'U')\n    .replace(/š/g,'sh').replace(/ṣ/g,'ts').replace(/ṭ/g,'t')\n    .replace(/ḫ|ḥ/g,'kh').replace(/q/g,'k').replace(/ʾ|ʿ/g,' ')\n    .replace(/a/g,'ah').replace(/e/g,'eh').replace(/i/g,'ee').replace(/o/g,'oh').replace(/u/g,'oo')\n    .replace(/A/g,'aah').replace(/E/g,'ehh').replace(/I/g,'eee').replace(/U/g,'ooo').trim();\n}" },
    { id: 'voices', type: 'leaf', group: 'voice', title: 'voices / chosenVoice', weight: .5,
      desc: 'Loads the browser speech voices (async) and picks the best one, preferring an English voice for the respelling.',
      inputs: ['speechSynthesis'], outputs: ['a SpeechSynthesisVoice'],
      code: "function loadVoices() { voices = synth.getVoices() || []; /* fill <select> */ }\nfunction chosenVoice() {\n  if (voiceSel && voiceSel.value)\n    return voices.find((x) => x.name === voiceSel.value) || null;\n  return voices.slice().sort((a,b)=>rankLang(a.lang)-rankLang(b.lang))[0];\n}" },
    { id: 'speakSyllables', type: 'leaf', group: 'voice', title: 'speakSyllables(items)', weight: .75,
      desc: 'Speaks the word one syllable at a time, highlighting each cuneiform sign in red in sync — advancing on each sound’s end (with a silent fallback timer).',
      inputs: ['syllable items', 'voice, rate'], outputs: ['audio', 'red highlight'],
      code: "function speakSyllables(items) {\n  stopSpeak(); speaking = true; const myRun = speakRun;\n  let idx = 0;\n  (function step() {\n    if (myRun !== speakRun || idx >= items.length) { clearSigns(); return; }\n    highlightSign(items[idx].i);\n    const adv = () => { idx++; step(); };\n    const u = new SpeechSynthesisUtterance(phonetic(items[idx].read));\n    u.voice = chosenVoice(); u.rate = rate();\n    u.onend = adv; u.onerror = adv;\n    synth.speak(u);\n    setTimeout(adv, 2000 / rate());   // fallback\n  })();\n}" },
    { id: 'highlightSign', type: 'leaf', group: 'voice', title: 'highlightSign(i)', weight: .4,
      desc: 'Adds the red highlight to the i-th cuneiform sign while it is being spoken.',
      inputs: ['sign index'], outputs: ['red glow on a sign'],
      code: "function highlightSign(i) {\n  clearSigns();\n  const el = cuneLine.querySelector('.tr-sign[data-i=\"'+i+'\"]');\n  if (el) el.classList.add('is-speaking');\n}" },
    { id: 'rate', type: 'leaf', group: 'voice', title: 'rate()', weight: .2,
      desc: 'Reads the speed slider (slow for learning).',
      inputs: ['speed slider'], outputs: ['a rate number'],
      code: "function rate() {\n  return rateInput ? (parseFloat(rateInput.value) || 0.85) : 0.85;\n}" },
    { id: 'speakWord', type: 'leaf', group: 'voice', title: 'speakWord(text)', weight: .45,
      desc: 'Speaks a whole word at once (used for English→Akkadian, or when syllable mode is off).',
      inputs: ['transliteration'], outputs: ['audio'],
      code: "function speakWord(text) {\n  stopSpeak();\n  const u = new SpeechSynthesisUtterance(phonetic(text));\n  u.voice = chosenVoice(); u.rate = rate();\n  synth.speak(u);\n}" },

    { id: 'setDir', type: 'leaf', group: 'controls', title: 'setDir / Swap', weight: .45,
      desc: 'Swaps the direction and carries the shown translation up into the input for a true round-trip (šarru ↔ king).',
      inputs: ['Swap click'], outputs: ['new direction', 'carried term'],
      code: "toggleBtn.addEventListener('click', () => {\n  if (tool.dataset.dir === 'akk2en') {\n    setDir('en2akk'); input.value = lastEnglish || '';\n  } else {\n    setDir('akk2en');\n    tokens = lastEntry ? [{ c: lastEntry.c||'', t: lastEntry.t }] : [];\n    renderCuneBox();\n  }\n  translate();\n});" },
    { id: 'copyC', type: 'leaf', group: 'controls', title: 'Copy', weight: .25,
      desc: 'Copies the cuneiform (Akkadian mode) or the typed text (English mode) to the clipboard.',
      inputs: ['Copy click'], outputs: ['clipboard text'],
      code: "copyBtn.addEventListener('click', () => {\n  copyText(tool.dataset.dir === 'akk2en' ? cuneLine.textContent : input.value);\n  flash(copyBtn, 'Copied!');\n});" },
    { id: 'clearC', type: 'leaf', group: 'controls', title: 'Clear', weight: .25,
      desc: 'Empties the input and stops any speech.',
      inputs: ['Clear click'], outputs: ['empty state'],
      code: "clearBtn.addEventListener('click', () => {\n  stopSpeak();\n  if (tool.dataset.dir === 'akk2en') { tokens = []; renderCuneBox(); }\n  else input.value = '';\n  hint(tool.dataset.dir);\n});" },
    { id: 'speakBtn', type: 'leaf', group: 'controls', title: 'Speak button', weight: .35,
      desc: 'Starts pronunciation: syllable-by-syllable in Akkadian mode, or the whole matched word in English mode.',
      inputs: ['Speak click'], outputs: ['calls speakSyllables / speakWord'],
      code: "speakBtn.addEventListener('click', () => {\n  if (tool.dataset.dir === 'akk2en') {\n    const items = tokens.map((t, i) => ({ i, read: t.t })).filter((x) => x.read.trim());\n    sylChk.checked ? speakSyllables(items) : speakWord(tokens.map((t)=>t.t).join(''));\n  } else if (lastEntry) speakWord(lastEntry.t);\n});" },

    { id: 'gap', type: 'hub', title: 'Gap Reconstruction (tool)', weight: .85,
      desc: 'The broken-tablet tool: transcribe a fragment with <gap>/<big_gap>, call the backend to reconstruct it, then show the reading, its English meaning, the cited evidence and a voice read-back. It shares the dictionary and the voice engine with the translator through window.AkkTool.',
      inputs: ['fragment + gaps', '/api/reconstruct'], outputs: ['reconstructed line', 'meaning', 'evidence', 'audio'] },

    { id: 'dictEnglish', type: 'leaf', group: 'gap', title: 'dictEnglish()', weight: .6,
      desc: 'Builds the reconstruction’s English meaning the same way the translator does: it glosses each Akkadian word from the shared dictionary and drops in the chosen gap word, so the meaning is correct and consistent instead of the raw model text (which drifts on constructed input).',
      inputs: ['tokens', 'chosen gap words', 'AkkTool.searchAkk'], outputs: ['grounded English meaning'],
      code: "function dictEnglish(gd) {\n  // gloss every known word + the chosen gap word,\n  // exactly like the Translate tool does\n  return hit ? parts.join(' ') : '';\n}" },
    { id: 'computeGapFills', type: 'leaf', group: 'gap', title: 'computeGapFills / promptWithGapsFilled', weight: .55,
      desc: 'Context-aware gap fills: subtracts the meaning of the known words from the model translation, maps the leftover meaning back to real dictionary Akkadian, and re-reads the fragment with the chosen word filled in.',
      inputs: ['model English', 'tokens', 'dictionary'], outputs: ['per-gap Akkadian candidates'] },
    { id: 'renderEvidence', type: 'leaf', group: 'gap', title: 'renderEvidence / sourceBadge', weight: .55,
      desc: 'Shows the backend’s citation: a badge for which layer answered (attested match / cited parallel with a cos score / model estimate) plus the closest attested tablet line - the honest “why” behind the reading.',
      inputs: ['source, similarity, topParallel'], outputs: ['evidence block'],
      code: "renderEvidence(data);  // reads data.source,\n// data.retrievalSimilarity, data.topParallelSrc" },
    { id: 'speakRecon', type: 'leaf', group: 'gap', title: 'speakReconstruction / linkVoiceControls', weight: .5,
      desc: 'The voice assistant for the result: it speaks the reconstructed (gap-filled) line - not the input - using the tool’s own Voice / Speed / syllable controls, which mirror the translator’s and drive the shared speech engine.',
      inputs: ['lastAkkTranslit', 'AkkTool speech'], outputs: ['audio of the reconstructed text'] }
  ];
  const T_FLOW = [
    ['engine','keyboard'],['engine','input'],['engine','norm'],['engine','dict'],
    ['engine','match'],['engine','render'],['engine','voice'],['engine','controls'],
    ['keyboard','input'],['input','norm'],['norm','match'],['dict','match'],
    ['match','render'],['render','voice'],['controls','render'],['controls','voice'],
    ['engine','gap'],['gap','dict'],['gap','voice'],['gap','render'],
    ['OGSL','makeKey'],['DICT','searchAkk'],['DICT','searchEng'],['norm','searchAkk'],
    ['phonetic','speakSyllables'],['voices','speakSyllables'],['tokens','renderCuneBox']
  ];

  /* =============== DATA: meta — this graph explaining itself =============== */
  const M_NODES = [
    { id: 'g_engine', type: 'root', title: 'Graph Engine', weight: 1,
      desc: 'js/ai-graph.js — it draws this very diagram. A factory (makeGraph) builds each graph from node + link data: physics, rendering, interaction, zoom, and the meta hook that opened this one.',
      inputs: ['nodes[] + flow[]'], outputs: ['an interactive SVG graph'],
      code: "function makeGraph(mount, NODES, FLOW, opts) {\n  // build svg + panel, model, force sim,\n  // render, interactions, zoom, dbl-click hook\n  return { start, stop, wrap };\n}" },

    { id: 'g_data', type: 'hub', title: 'Graph Data', weight: .7,
      desc: 'The node and link definitions, and how edges are derived.',
      inputs: ['hand-written data'], outputs: ['NODES, links'] },
    { id: 'g_sim', type: 'hub', title: 'Force Simulation', weight: .85,
      desc: 'A tiny physics loop that positions the nodes into clusters.',
      inputs: ['nodes, links'], outputs: ['x / y positions'] },
    { id: 'g_render', type: 'hub', title: 'Rendering', weight: .75,
      desc: 'Draws edges (with arrows) and nodes as SVG each frame.',
      inputs: ['positions, zoom'], outputs: ['an SVG frame'] },
    { id: 'g_interact', type: 'hub', title: 'Interaction', weight: .7,
      desc: 'Hover tooltip, click side-panel, and dragging nodes.',
      inputs: ['mouse events'], outputs: ['tooltip, panel, drag'] },
    { id: 'g_zoom', type: 'hub', title: 'Zoom & Pan', weight: .65,
      desc: 'Wheel zoom toward the cursor and background panning via a group transform.',
      inputs: ['wheel / drag'], outputs: ['k, tx, ty transform'] },
    { id: 'g_meta', type: 'hub', title: 'Meta hook', weight: .6,
      desc: 'Double-clicking the main graph background builds THIS meta-graph.',
      inputs: ['dbl-click'], outputs: ['this graph'] },

    { id: 'm_nodes', type: 'leaf', group: 'g_data', title: 'nodes[] data', weight: .6,
      desc: 'Each node: id, type (root/hub/leaf), title, weight (heavier = nearer centre), desc, inputs, outputs and a code snippet.',
      inputs: ['—'], outputs: ['a node object'],
      code: "{ id:'searchAkk', type:'leaf', group:'match',\n  title:'searchAkk(buffer)', weight:.9,\n  desc:'…', inputs:[…], outputs:[…], code:'…' }" },
    { id: 'm_links', type: 'leaf', group: 'g_data', title: 'build links', weight: .5,
      desc: 'Edges = every hub→leaf pair, plus the FLOW list (module→module and a few cross links).',
      inputs: ['NODES, FLOW'], outputs: ['links[]'],
      code: "NODES.forEach((n) => {\n  if (n.type === 'leaf' && byId[n.group]) links.push([n.group, n.id]);\n});\nFLOW.forEach((f) => { if (byId[f[0]] && byId[f[1]]) links.push(f); });" },

    { id: 'm_tick', type: 'leaf', group: 'g_sim', title: 'tick()', weight: .85,
      desc: 'One physics step: node–node repulsion, a spring pull along each edge toward its rest length, gravity to the centre, then damped integration with a velocity cap.',
      inputs: ['positions'], outputs: ['new positions'],
      code: "function tick() {\n  // repulsion between every pair (Coulomb-like)\n  // spring force along each link toward restLen\n  // gravity toward the centre, then integrate:\n  n.vx = (n.vx + n.fx) * DAMP;\n  n.x += n.vx;   // (clamped to the canvas)\n}" },
    { id: 'm_restLen', type: 'leaf', group: 'g_sim', title: 'restLen(a, b)', weight: .5,
      desc: 'The ideal length of each edge. For hub→leaf it is 52 + (1 − weight)·120, so heavier functions sit closer to the centre.',
      inputs: ['two node ids'], outputs: ['a length'],
      code: "function restLen(a, b) {\n  const s = byId[a], t = byId[b];\n  if (s.type === 'root') return 130;\n  if (s.type === 'hub' && t.type === 'leaf')\n    return 52 + (1 - t.weight) * 120;   // weight → distance\n  return s.type === 'hub' ? 165 : 95;\n}" },
    { id: 'm_radius', type: 'leaf', group: 'g_sim', title: 'radius(n)', weight: .3,
      desc: 'Node size: 26 for the root, 15 for a hub, and 5–11 for a function by its weight.',
      inputs: ['a node'], outputs: ['radius in px'],
      code: "function radius(n) {\n  return n.type === 'leaf' ? (5 + n.weight * 6) : R[n.type];\n}" },

    { id: 'm_paint', type: 'leaf', group: 'g_render', title: 'paint()', weight: .7,
      desc: 'Each frame: sets every edge’s endpoints (pulled back to the node border so the arrow shows), every node’s position, then applies the zoom/pan transform.',
      inputs: ['positions, k/tx/ty'], outputs: ['updated SVG'],
      code: "function paint() {\n  edgeEls.forEach((ln) => { /* x1,y1 → x2,y2 shortened by radius */ });\n  NODES.forEach((n) => nodeEls[n.id].setAttribute('cx', n.x));\n  gRoot.setAttribute('transform', 'translate('+tx+','+ty+') scale('+k+')');\n}" },
    { id: 'm_marker', type: 'leaf', group: 'g_render', title: 'arrow markers', weight: .4,
      desc: 'The arrowhead drawn at the end of every edge, showing the input → output direction.',
      inputs: ['—'], outputs: ['marker-end on edges'],
      code: "<marker id=\"gharrow\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\"\n        markerWidth=\"7\" markerHeight=\"7\" orient=\"auto\">\n  <path d=\"M0,0 L10,5 L0,10 z\" fill=\"#b8afe0\" />\n</marker>\n// line.setAttribute('marker-end', 'url(#gharrow)')" },
    { id: 'm_create', type: 'leaf', group: 'g_render', title: 'create elements', weight: .5,
      desc: 'Once: builds one <line> per edge and one <circle> per node inside the zoom group, and wires their events.',
      inputs: ['NODES, links'], outputs: ['SVG elements'],
      code: "const edgeEls = links.map((l) => {\n  const ln = sv('line');\n  ln.setAttribute('marker-end', 'url(#'+mid+')');\n  gRoot.appendChild(ln); return ln;\n});\nNODES.forEach((n) => { const c = sv('circle'); c.dataset.id = n.id; gRoot.appendChild(c); });" },

    { id: 'm_hover', type: 'leaf', group: 'g_interact', title: 'hover tooltip', weight: .45,
      desc: 'On mouse-enter a node it glows (red hub / green function) and a small chip shows its name next to it.',
      inputs: ['mouseenter'], outputs: ['tooltip + glow'],
      code: "function hover(n) {\n  hoverNode = n; tipNode = n;\n  if (n) { tip.innerHTML = esc(n.title) + '<small>…</small>'; tip.hidden = false; positionTip(n); }\n  else tip.hidden = true;\n  applyClasses();\n}" },
    { id: 'm_select', type: 'leaf', group: 'g_interact', title: 'select → panel', weight: .55,
      desc: 'On click it fills the side panel with the node’s role, inputs, outputs and its actual code — the box you are reading right now.',
      inputs: ['click'], outputs: ['side panel'],
      code: "function select(n) {\n  pTitle.textContent = n.title;\n  pDesc.textContent = n.desc || '';\n  pIn.innerHTML  = (n.inputs ||['—']).map((x)=>'<li>'+esc(x)+'</li>').join('');\n  pOut.innerHTML = (n.outputs||['—']).map((x)=>'<li>'+esc(x)+'</li>').join('');\n  pCode.textContent = n.code || '// (module)';\n  panel.hidden = false;\n}" },
    { id: 'm_drag', type: 'leaf', group: 'g_interact', title: 'drag node', weight: .5,
      desc: 'Pointer-drag moves a node; its position is converted from screen to graph space through the current zoom.',
      inputs: ['pointer drag'], outputs: ['moved node'],
      code: "function onMove(e) {\n  if (dragNode) { const p = graphPt(e); dragNode.x = p.x; dragNode.y = p.y; }\n}\nfunction graphPt(e) { const p = svgPix(e); return { x:(p.x-tx)/k, y:(p.y-ty)/k }; }" },

    { id: 'm_wheel', type: 'leaf', group: 'g_zoom', title: 'wheel zoom', weight: .6,
      desc: 'Scrolling zooms toward the cursor by keeping the point under the mouse fixed while scaling.',
      inputs: ['wheel'], outputs: ['new k, tx, ty'],
      code: "svg.addEventListener('wheel', (e) => {\n  e.preventDefault();\n  const p = svgPix(e), gx = (p.x-tx)/k, gy = (p.y-ty)/k;\n  const nk = Math.max(0.4, Math.min(4, k * Math.exp(-e.deltaY*0.0015)));\n  tx = p.x - gx*nk; ty = p.y - gy*nk; k = nk;\n  applyTransform();\n});" },
    { id: 'm_pan', type: 'leaf', group: 'g_zoom', title: 'pan', weight: .45,
      desc: 'Dragging the empty background slides the whole graph (translate), so you can move around after zooming in.',
      inputs: ['background drag'], outputs: ['new tx, ty'],
      code: "// on background pointer-move:\ntx = panStart.tx + (e.clientX - panStart.x) * sx;\nty = panStart.ty + (e.clientY - panStart.y) * sy;\napplyTransform();" },

    { id: 'm_dbl', type: 'leaf', group: 'g_meta', title: 'double-click hook', weight: .55,
      desc: 'Double-clicking the main graph’s background calls openMeta(), which builds this meta-graph below it — one level only. On this graph, double-click resets the zoom.',
      inputs: ['dbl-click on main bg'], outputs: ['this meta-graph'],
      code: "svg.addEventListener('dblclick', (e) => {\n  if (e.target.classList.contains('gnode')) return;\n  if (opts.onDblBg) opts.onDblBg();   // main → openMeta()\n  else { k=1; tx=0; ty=0; applyTransform(); }  // meta → reset zoom\n});\nfunction openMeta() {\n  metaInst = makeGraph(stack, M_NODES, M_FLOW,\n                       { title:'Meta…', closable:true });\n  metaInst.start();\n}" }
  ];
  const M_FLOW = [
    ['g_engine','g_data'],['g_engine','g_sim'],['g_engine','g_render'],
    ['g_engine','g_interact'],['g_engine','g_zoom'],['g_engine','g_meta'],
    ['g_data','g_sim'],['g_sim','g_render'],['g_interact','g_render'],
    ['g_zoom','g_render'],['g_meta','g_engine'],
    ['m_nodes','m_tick'],['m_tick','m_paint'],['m_wheel','m_paint'],['m_select','m_paint']
  ];

  /* =============== DATA: the BACKEND ENGINE — innoverse_pipeline_final.py =============== */
  const E_NODES = [
    { id:'e_root', type:'root', title:'INNOVERSE Engine', weight:1,
      desc:'The backend brain — innoverse_pipeline_final.py (~3,000 lines, 54/54 tests). It turns broken Akkadian transliteration into English: a fine-tuned ByT5 model soup decodes candidates, which are re-ranked, gap-filled, grounded in an attested corpus, hallucination-filtered and confidence-scored, then served over a small JSON API.',
      inputs:['Akkadian transliteration (with <gap>)','3x ByT5 checkpoints','optional train/test/lexicon CSVs'],
      outputs:['English reconstruction','per-gap fills + confidence','grade / risk / decision + reports','JSON API'],
      code:"python innoverse_pipeline_final.py --serve \\\n  --model-path models/model_1 \\\n  --model-path models/model_2 \\\n  --model-path models/model_3" },

    { id:'e_soup', type:'hub', title:'Model Soup & Inference', weight:.95,
      desc:'Weight-averages three same-architecture ByT5-base checkpoints into one soup, then decodes with beam search on CPU.',
      inputs:['3x ByT5 checkpoints'], outputs:['best text + top-k beams'] },
    { id:'e_decode', type:'hub', title:'MBR Decoding & Re-rank', weight:.9,
      desc:'Picks the best hypothesis from the beams by consensus + fluency, not just the single top beam.',
      inputs:['top-k beams'], outputs:['selected reconstruction'] },
    { id:'e_rag', type:'hub', title:'RAG - Parallel Retrieval', weight:.75,
      desc:'Retrieves the closest attested parallel from a curated corpus of real, published tablet formulae to ground the gap reconstruction and cite it as evidence.',
      inputs:['source fragment','attested corpus'], outputs:['nearest attested line + similarity'] },
    { id:'e_lex', type:'hub', title:'Translation Memory & Lexicon', weight:.75,
      desc:'Exact recall of previously-seen fragments, and correct spelling of proper names from the lexicon.',
      inputs:['train pairs','lexicon'], outputs:['TM hits','normalized names'] },
    { id:'e_gap', type:'hub', title:'Gap Reconstruction', weight:.9,
      desc:'Detects broken spots (<gap>/<big_gap>) and proposes fills with a confidence and alternatives.',
      inputs:['fragment with gaps'], outputs:['per-gap fills'] },
    { id:'e_halluc', type:'hub', title:'Hallucination Filter', weight:.85,
      desc:'Flags / limits over-reconstruction that is not supported by the source (archaeological caution).',
      inputs:['source','prediction'], outputs:['safe text + risk'] },
    { id:'e_post', type:'hub', title:'Post-processing', weight:.8,
      desc:'The per-sample chain that wires every stage together and cleans the final text.',
      inputs:['raw prediction'], outputs:['final reconstruction row'] },
    { id:'e_conf', type:'hub', title:'Confidence Analytics', weight:.9,
      desc:'Turns beam behaviour + calibration into an overall 0-100 index, a letter grade, a risk band and a review decision.',
      inputs:['beam scores','calibrated conf'], outputs:['grade / risk / decision'] },
    { id:'e_eval', type:'hub', title:'Evaluation & Metrics', weight:.7,
      desc:'chrF scoring, ablation of each component, and confidence calibration.',
      inputs:['hyps + refs'], outputs:['chrF, ablation, calibration'] },
    { id:'e_report', type:'hub', title:'Reports & Outputs', weight:.7,
      desc:'Writes an interactive Plotly chart, a Markdown explainability report, a one-page HTML and the CSV outputs.',
      inputs:['report dataframe'], outputs:['HTML / MD / CSV / plot'] },
    { id:'e_cache', type:'hub', title:'Cache (fast reload)', weight:.6,
      desc:'Caches the soup and the lexical resources, keyed by a signature of the inputs, so the second run is fast.',
      inputs:['paths / weights / files'], outputs:['cached soup + resources'] },
    { id:'e_cune', type:'hub', title:'Cuneiform & Knowledge Graph', weight:.75,
      desc:'Renders cuneiform from transliteration / English, and builds entity + timeline graphs from a reconstruction.',
      inputs:['text'], outputs:['signs','graph nodes/edges'] },
    { id:'e_api', type:'hub', title:'Web Server / API', weight:.85,
      desc:'A threaded HTTP server with CORS that serves the reconstruct / cuneiform / graph endpoints (and the site with --ui-dir).',
      inputs:['HTTP requests'], outputs:['JSON responses'] },
    { id:'e_test', type:'hub', title:'Testing & CLI', weight:.65,
      desc:'54 self-running unit tests, an end-to-end selftest on a tiny model, and the command-line interface.',
      inputs:['CLI args'], outputs:['test results / actions'] },

    { id:'e_build', type:'leaf', group:'e_soup', title:'build_model_soup()', weight:.7,
      desc:'Streams checkpoint state-dicts and weight-averages them (peak RAM ~2x one model). Weights: CONFIG.model_perf_weights = [0.98, 1.00, 0.40].',
      inputs:['model_paths','weights'], outputs:['one averaged model'],
      code:"def build_model_soup(model_paths, weights, device):\n    # streaming weighted average of same-arch checkpoints\n    for p, w in zip(model_paths, norm(weights)):\n        sd = load_state_dict(resolve_model_dir(p))\n        for k in sd: soup[k] += w * sd[k]\n    return model_from(soup), tokenizer" },
    { id:'e_infer', type:'leaf', group:'e_soup', title:'run_inference()', weight:.6,
      desc:'A single generation pass returning (best_text, best_score, top-k [(text, score)]) per input. Beam search by default; with sample=True it switches to nucleus sampling (do_sample, temperature, top_p) so the reconstruction can be re-rolled for a different plausible reading.',
      inputs:['model','texts','sample?'], outputs:['best + top-k hypotheses'],
      code:"best_texts, scores, topk = run_inference(\n    model, tokenizer, [replace_gaps(prompt)], cfg, device, sample=True)" },
    { id:'e_ens', type:'leaf', group:'e_soup', title:'ensemble_topk()', weight:.4,
      desc:'Alternative to souping: run each checkpoint separately and pool their hypotheses (union, keep max score). Enabled with --ensemble.',
      inputs:['model_paths','texts'], outputs:['pooled hypotheses'] },

    { id:'e_mbr', type:'leaf', group:'e_decode', title:'mbr_select()', weight:.6,
      desc:'Minimum Bayes Risk: pick the hypothesis with the highest expected chrF against all the others (consensus) instead of the top beam.',
      inputs:['hypotheses'], outputs:['consensus pick'],
      code:"def mbr_select(hyps):\n    # utility = mean chrF vs every other hypothesis\n    u = _mbr_utilities([h for h,_ in hyps], weights)\n    return hyps[argmax(u)]" },
    { id:'e_select', type:'leaf', group:'e_decode', title:'select_best()', weight:.7,
      desc:'Re-ranks the top-k beams by a weighted blend: model score + LM fluency + english_consistency + MBR consensus + back-translation.',
      inputs:['top-k','resources'], outputs:['final hypothesis'],
      code:"score = ( w1*model + w2*lm_fluency + w3*eng_consistency\n        + w4*mbr_utility + w5*back_translation )" },
    { id:'e_lm', type:'leaf', group:'e_decode', title:'NgramLM . english_consistency', weight:.45,
      desc:'A tiny add-k word-bigram LM rewards fluent output; english_consistency = fraction of tokens attested in the training English vocab.',
      inputs:['train translations'], outputs:['fluency scores'] },
    { id:'e_bt', type:'leaf', group:'e_decode', title:'back_translation_consistency()', weight:.4,
      desc:'Corpus-based round-trip consistency in [0, 1] - no reverse model needed.',
      inputs:['source','hyp','index'], outputs:['0..1 consistency'] },

    { id:'e_pidx', type:'leaf', group:'e_rag', title:'ParallelIndex', weight:.6,
      desc:'Semantic parallel retriever (RAG) over the attested corpus - finds the closest real translations to lean on.',
      inputs:['corpus'], outputs:['retriever'],
      code:"class ParallelIndex:   # RAG over attested pairs\n    def query(self, src, k=3): return top_k_parallels" },
    { id:'e_pbuild', type:'leaf', group:'e_rag', title:'build_parallel_index()', weight:.4,
      desc:'Builds the ParallelIndex from the training pairs.',
      inputs:['train_df'], outputs:['ParallelIndex'] },
    { id:'e_attload', type:'leaf', group:'e_rag', title:'load_attested_parallels . build_attested_index', weight:.55,
      desc:'Loads a curated corpus of real, published Akkadian formulae (data/akkadian/attested_parallels.tsv, CC BY-SA) and indexes it, so a fragment can be matched against genuinely attested tablet lines instead of only guessed. Injected at serve time; absent file simply turns the feature off.',
      inputs:['attested_parallels.tsv'], outputs:['attested index + pairs'],
      code:"pairs = load_attested_parallels('data/akkadian/attested_parallels.tsv')\nresources['attested_index'], resources['attested_pairs'] = build_attested_index(pairs)" },

    { id:'e_tm', type:'leaf', group:'e_lex', title:'build_translation_memory()', weight:.5,
      desc:'Exact-match memory of previously-seen fragments -> their gold translation (highest-precision path).',
      inputs:['train pairs'], outputs:['{src: translation}'] },
    { id:'e_name', type:'leaf', group:'e_lex', title:'lexicon_name_normalize()', weight:.55,
      desc:'Rewrites proper-name spellings in the output to their attested lexicon form (e.g. Kanesh, Assur).',
      inputs:['prediction','name targets'], outputs:['normalized text'],
      code:"pred = lexicon_name_normalize(pred,\n    extract_name_targets(norm, targets))" },
    { id:'e_lexidx', type:'leaf', group:'e_lex', title:'build_lexicon_index . learn_surface_forms', weight:.35,
      desc:'Token->lexeme index and learned surface->normal spellings + frequencies used for name detection.',
      inputs:['lexicon_df','train_df'], outputs:['indexes'] },

    { id:'e_replace', type:'leaf', group:'e_gap', title:'replace_gaps()', weight:.45,
      desc:'Normalises fragmentation markers (..., x, xx, [..]) to <gap> / <big_gap> tokens the model understands.',
      inputs:['raw transliteration'], outputs:['normalized with gap tokens'],
      code:"replace_gaps('a ... b')     -> 'a <gap> b'\nreplace_gaps('a ..... b')   -> 'a <big_gap> b'\nreplace_gaps('a x b')       -> 'a <gap> b'" },
    { id:'e_gapeng', type:'leaf', group:'e_gap', title:'reconstruct_gaps_english()', weight:.5,
      desc:'Fills literal <gap> tokens left in the English output using neighbourhood cue words + corpus frequency + a historical prior.',
      inputs:['reconstruction','freq'], outputs:['filled text + confidence'] },
    { id:'e_recon', type:'leaf', group:'e_gap', title:'reconstruct_fragment()', weight:.65,
      desc:'The /api/reconstruct handler. Runs the model with random sampling (re-rolled each call), keeps the most coherent translation, and fills each gap from the content words of that translation - aligned by position. It also grounds the fragment in the attested corpus, so the reply carries the evidence: which source answered, the cited parallel and the attested reading.',
      inputs:['prompt','resources','model'], outputs:['tokens[] + reconstructedText + evidence'],
      code:"return { originalFragment, reconstructedText, tokens,\n         globalConfidence, inferenceTimeMs, modelUsed,\n         source, retrievalSimilarity, topParallel,\n         topParallelSrc, attestedReconstruction }" },
    { id:'e_ground', type:'leaf', group:'e_gap', title:'_attested_grounding()', weight:.55,
      desc:'Evidence-based reconstruction: retrieves the closest attested tablet line and, when it is close enough, fills the gaps from that real parallel and cites it. Every result is labelled by source - attested match, cited parallel (with a similarity score) or model estimate - so a gap is never shown as more certain than it is.',
      inputs:['fragment','attested_index'], outputs:['source, similarity, cited parallel, gap fills'],
      code:"g = _attested_grounding(prompt, words, resources)\n# source: attested_parallel | model_estimate\n# a-na <gap> qi-bi-ma -> cites 'a-na be-li-ia qi-bi-ma'" },
    { id:'e_pick', type:'leaf', group:'e_gap', title:'_pick_coherent()', weight:.5,
      desc:'From the several sampled translations, picks the most coherent one: fewest leftover gap markers, a sensible length and the least degenerate repetition.',
      inputs:['sampled hypotheses'], outputs:['best English reading'] },
    { id:'e_content', type:'leaf', group:'e_gap', title:'_content_words()', weight:.45,
      desc:'Pulls the ordered content words out of the model translation (stopwords dropped) - the raw material for context-aware, per-gap fills that are split across the gaps and mapped back to real dictionary Akkadian.',
      inputs:['model translation'], outputs:['content words for gaps'] },

    { id:'e_filter', type:'leaf', group:'e_halluc', title:'archaeological_filter()', weight:.6,
      desc:'If hallucination risk exceeds a threshold it trims / flags the over-reconstruction so the output stays faithful to the tablet.',
      inputs:['source','prediction'], outputs:['{text, risk, flagged}'],
      code:"arch = archaeological_filter(fragment, reconstruction,\n                            cfg.arch_risk_threshold)" },
    { id:'e_risk', type:'leaf', group:'e_halluc', title:'archaeological_hallucination_risk()', weight:.5,
      desc:'0-100 risk blending invented entities, over-expansion, repetition and weak source linkage.',
      inputs:['source','prediction'], outputs:['risk 0..100'] },

    { id:'e_postrow', type:'leaf', group:'e_post', title:'postprocess_row()', weight:.65,
      desc:'The full per-sample chain: TM -> parallel retrieval -> model soup -> gap-fill -> hallucination filter -> grammar/semantic notes -> calibrated confidence.',
      inputs:['fragment','raw pred'], outputs:['final row'],
      code:"# TM -> retrieval -> soup -> gap -> filter -> confidence\nreconstruction, source = pick_best_source(...)\nfinal = archaeological_filter(fragment, reconstruction)['text']" },
    { id:'e_calib', type:'leaf', group:'e_post', title:'calibrated_confidence()', weight:.5,
      desc:'Raw model score minus gap and length penalties, adjusted by the evidence source (TM / retrieval / model).',
      inputs:['raw score','src','recon'], outputs:['calibrated 0..1'] },
    { id:'e_sem', type:'leaf', group:'e_post', title:'extract_semantic_relationship . analyze_grammar_pattern', weight:.4,
      desc:'Derives an agent / action / domain summary and a plain-language note on how fragmented the grammar is.',
      inputs:['reconstruction'], outputs:['semantic + grammar notes'] },

    { id:'e_boot', type:'leaf', group:'e_conf', title:'bootstrap_ci()', weight:.5,
      desc:'Percentile bootstrap confidence interval for the mean of a set of scores.',
      inputs:['values'], outputs:['(low, high)'] },
    { id:'e_beam', type:'leaf', group:'e_conf', title:'beam_stability . beam_agreement . confidence_drift', weight:.5,
      desc:'How tight the beam scores are, how much the beams agree, and whether headline confidence drifts from the beam mean.',
      inputs:['beam scores'], outputs:['stability / agreement / drift'] },
    { id:'e_fci', type:'leaf', group:'e_conf', title:'final_confidence_index()', weight:.7,
      desc:'Aggregates every sub-metric (reliability, quality, consistency, stability, agreement) into one 0-100 index.',
      inputs:['sub-metrics'], outputs:['0..100 index'],
      code:"idx = final_confidence_index(conf100, reliability,\n        quality, consistency, stability, agreement)" },
    { id:'e_grade', type:'leaf', group:'e_conf', title:'confidence_grade . risk_level . review_decision', weight:.6,
      desc:'Maps the index to a letter grade (A+ ... F), a risk band, and a reviewer decision (accept / review / reject).',
      inputs:['index'], outputs:['grade, risk, decision'],
      code:"grade    = confidence_grade(idx)   # A+ / A / B ...\nrisk     = risk_level(idx)\ndecision = review_decision(idx)" },

    { id:'e_chrf', type:'leaf', group:'e_eval', title:'sentence_chrf . corpus_chrf', weight:.5,
      desc:'chrF (character n-gram F-beta) at sentence and corpus level - the main quality metric, also used inside MBR.',
      inputs:['hyp','ref'], outputs:['chrF score'] },
    { id:'e_abl', type:'leaf', group:'e_eval', title:'evaluate_ablation()', weight:.4,
      desc:'Measures each component contribution by turning it off and re-scoring.',
      inputs:['records','resources'], outputs:['per-component chrF'] },
    { id:'e_cal', type:'leaf', group:'e_eval', title:'calibration_report()', weight:.4,
      desc:'Checks that confidence actually tracks chrF (are 90%-confident outputs really better?).',
      inputs:['confidences','chrfs'], outputs:['calibration bins'] },

    { id:'e_plot', type:'leaf', group:'e_report', title:'make_confidence_plot()', weight:.5,
      desc:'Writes an interactive Plotly bar chart of the final confidence index -> output/confidence_distribution.html.',
      inputs:['report_df'], outputs:['plotly HTML'] },
    { id:'e_md', type:'leaf', group:'e_report', title:'write_markdown_report()', weight:.45,
      desc:'Per-segment Markdown explainability report -> output/explainability_report.md.',
      inputs:['report_df'], outputs:['Markdown'] },
    { id:'e_html', type:'leaf', group:'e_report', title:'generate_report . save_outputs', weight:.45,
      desc:'A printable one-page HTML (evidence tables + summary) and the CSV report + submission file.',
      inputs:['outputs'], outputs:['HTML + CSV'] },

    { id:'e_csoup', type:'leaf', group:'e_cache', title:'load_or_build_soup()', weight:.5,
      desc:'Returns the soup, reusing a cached copy when paths/weights are unchanged so the average runs only once.',
      inputs:['paths','weights'], outputs:['(model, tokenizer)'],
      code:"models/_cache/model_soup/    # cached average\n# key = signature(paths, weights)" },
    { id:'e_cres', type:'leaf', group:'e_cache', title:'load_or_build_resources()', weight:.4,
      desc:'Pickles the lexical resources (TM, lexicon, parallel index, freqs), keyed by the train/lexicon file signatures.',
      inputs:['train/lexicon'], outputs:['resources.pkl'] },

    { id:'e_t2c', type:'leaf', group:'e_cune', title:'transliteration_to_cuneiform()', weight:.5,
      desc:'Splits a transliteration into syllables and looks up each cuneiform sign (Unicode sign map + homophones + Babylonian numerals).',
      inputs:['transliteration'], outputs:['signs per syllable'],
      code:"lookup_cuneiform_sign('ma') -> 'ma-sign'\n# sign map built from Unicode CUNEIFORM SIGN names" },
    { id:'e_e2c', type:'leaf', group:'e_cune', title:'english_to_cuneiform()', weight:.4,
      desc:'English -> Akkadian gloss -> cuneiform, powering the /api/cuneiform en->akk direction.',
      inputs:['English'], outputs:['Akkadian + signs'] },
    { id:'e_kg', type:'leaf', group:'e_cune', title:'build_archaeological_graph . build_temporal_graph', weight:.5,
      desc:'Extracts entities/relations and a light timeline from a reconstruction -> knowledge & temporal graphs (render_graph_html).',
      inputs:['reconstruction'], outputs:['nodes/edges'] },

    { id:'e_serve', type:'leaf', group:'e_api', title:'serve()', weight:.6,
      desc:'Starts a ThreadingHTTPServer, loads the soup + resources (demo mode on synthetic data if CSVs are missing), and blocks until Ctrl+C.',
      inputs:['cfg, host, port, ui_dir'], outputs:['running server'],
      code:"httpd = ThreadingHTTPServer((host, port), _make_handler(state))\nlogger.info('INNOVERSE UI on http://%s:%d (model: %s)', ...)" },
    { id:'e_handler', type:'leaf', group:'e_api', title:'_make_handler() . CORS', weight:.5,
      desc:'Routes GET/POST, adds Access-Control-Allow-* headers and handles the OPTIONS preflight so the site can fetch cross-origin.',
      inputs:['request'], outputs:['response + CORS'] },
    { id:'e_ep', type:'leaf', group:'e_api', title:'API endpoints', weight:.55,
      desc:'GET /api/health, POST /api/reconstruct, POST /api/cuneiform, POST /api/graph, POST /api/grammar (per-word roles -> CSV/grammar.csv), POST /api/log.',
      inputs:['JSON body'], outputs:['JSON'],
      code:"POST /api/reconstruct  { prompt }\n  -> { reconstructedText, tokens[], globalConfidence,\n       inferenceTimeMs, modelUsed }" },

    { id:'e_tests', type:'leaf', group:'e_test', title:'run_tests()', weight:.5,
      desc:'Auto-discovers and runs every _test_* function - 54/54 passing.',
      inputs:['--test'], outputs:['54 passed / 54'],
      code:"python innoverse_pipeline_final.py --test\n# ==== 54 passed, 0 failed / 54 total ====" },
    { id:'e_self', type:'leaf', group:'e_test', title:'run_selftest()', weight:.4,
      desc:'End-to-end run on a tiny built checkpoint + synthetic data - exercises the whole pipeline offline.',
      inputs:['--selftest'], outputs:['report_df'] },
    { id:'e_cli', type:'leaf', group:'e_test', title:'parse_args() . main()', weight:.4,
      desc:'CLI: --serve/--host/--port/--ui-dir, --model-path (repeatable), --test/--selftest/--report, --ensemble, --tune-soup-weights.',
      inputs:['argv'], outputs:['dispatch'] }
  ];

  const E_FLOW = [
    ['e_root','e_soup'],['e_root','e_decode'],['e_root','e_rag'],['e_root','e_lex'],
    ['e_root','e_gap'],['e_root','e_halluc'],['e_root','e_post'],['e_root','e_conf'],
    ['e_root','e_eval'],['e_root','e_report'],['e_root','e_cache'],['e_root','e_cune'],
    ['e_root','e_api'],['e_root','e_test'],
    ['e_soup','e_decode'],['e_decode','e_post'],['e_gap','e_post'],['e_rag','e_post'],
    ['e_lex','e_post'],['e_post','e_halluc'],['e_halluc','e_conf'],['e_conf','e_report'],
    ['e_eval','e_conf'],['e_cache','e_soup'],['e_api','e_recon'],['e_api','e_soup'],
    ['e_build','e_infer'],['e_infer','e_mbr'],['e_mbr','e_select'],['e_select','e_postrow'],
    ['e_recon','e_gapeng'],['e_recon','e_pick'],['e_recon','e_content'],['e_infer','e_pick'],
    ['e_recon','e_ground'],['e_ground','e_pidx'],['e_attload','e_pidx'],['e_rag','e_gap'],
    ['e_fci','e_grade'],['e_chrf','e_mbr'],['e_serve','e_handler'],
    ['e_handler','e_ep'],['e_t2c','e_e2c']
  ];

  /* =============== the reusable graph factory =============== */
  let gid = 0;
  function makeGraph(mount, NODES, FLOW, opts) {
    opts = opts || {};
    const id = ++gid;

    /* ---- DOM ---- */
    const wrap = el('div', 'ai-graph-wrap');
    const graph = el('div', 'ai-graph');
    const svg = sv('svg'); svg.setAttribute('aria-label', opts.title || 'engine graph');
    const defs = sv('defs');
    const marker = sv('marker'); const mid = 'gharrow' + id;
    marker.setAttribute('id', mid);
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9'); marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '7'); marker.setAttribute('markerHeight', '7');
    marker.setAttribute('orient', 'auto');
    const mpath = sv('path'); mpath.setAttribute('d', 'M0,0 L10,5 L0,10 z'); mpath.setAttribute('fill', '#b8afe0');
    marker.appendChild(mpath); defs.appendChild(marker); svg.appendChild(defs);
    const gRoot = sv('g'); svg.appendChild(gRoot);
    graph.appendChild(svg);

    if (opts.title) {
      const t = el('div', 'ai-graph-title');
      t.innerHTML = '<b>' + esc(opts.title) + '</b>' + (opts.subtitle ? '<span>' + esc(opts.subtitle) + '</span>' : '');
      graph.appendChild(t);
    }
    if (opts.closable) {
      const cb = el('button', 'ai-graph-close'); cb.type = 'button'; cb.innerHTML = '&times;'; cb.title = 'Close';
      cb.addEventListener('click', () => { stop(); wrap.remove(); if (opts.onClose) opts.onClose(); });
      graph.appendChild(cb);
    }
    const tip = el('div', 'ai-tip'); tip.hidden = true; graph.appendChild(tip);
    const legend = el('div', 'ai-legend');
    legend.innerHTML = '<span><i class="lg-dot lg-hub"></i> module</span><span><i class="lg-dot lg-leaf"></i> function</span>' +
      '<span class="ai-legend-hint">wheel = zoom · drag bg = pan' + (opts.onDblBg ? ' · dbl-click bg = meta-graph' : ' · dbl-click = reset') + '</span>';
    graph.appendChild(legend);
    wrap.appendChild(graph);

    const panel = el('aside', 'ai-panel'); panel.hidden = true;
    panel.innerHTML =
      '<button type="button" class="ai-panel-close" aria-label="Close">&times;</button>' +
      '<h4></h4><p class="ai-panel-role"></p><p class="ai-panel-desc"></p>' +
      '<div class="ai-io"><div class="ai-io-col"><span class="ai-io-h ai-io-in">Inputs</span><ul data-in></ul></div>' +
      '<div class="ai-io-col"><span class="ai-io-h ai-io-out">Outputs</span><ul data-out></ul></div></div>' +
      '<div class="ai-code-wrap"><span class="ai-code-label">Script</span><pre class="ai-code"><code></code></pre></div>';
    wrap.appendChild(panel);
    mount.appendChild(wrap);

    const pClose = panel.querySelector('.ai-panel-close');
    const pTitle = panel.querySelector('h4');
    const pRole = panel.querySelector('.ai-panel-role');
    const pDesc = panel.querySelector('.ai-panel-desc');
    const pIn = panel.querySelector('[data-in]');
    const pOut = panel.querySelector('[data-out]');
    const pCode = panel.querySelector('code');

    /* ---- model ---- */
    const byId = {}; NODES.forEach((n) => { byId[n.id] = n; });
    const links = [];
    NODES.forEach((n) => { if (n.type === 'leaf' && byId[n.group]) links.push([n.group, n.id]); });
    FLOW.forEach((f) => { if (byId[f[0]] && byId[f[1]]) links.push(f); });

    const R = { root: 26, hub: 15 };
    function radius(n) { return n.type === 'leaf' ? (5 + n.weight * 6) : R[n.type]; }
    function restLen(a, b) {
      const s = byId[a], t = byId[b];
      if (s.type === 'root') return 130;
      if (s.type === 'hub' && t.type === 'leaf') return 52 + (1 - t.weight) * 120;
      return s.type === 'hub' ? 165 : 95;
    }

    let W = 0, H = 0, cx = 0, cy = 0;
    function measure() { W = graph.clientWidth || 800; H = graph.clientHeight || 520; cx = W / 2; cy = H / 2; svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); }
    function seed() {
      NODES.forEach((n, i) => {
        if (n.type === 'root') { n.x = cx; n.y = cy; }
        else {
          const a = (i / NODES.length) * Math.PI * 2;
          const r = n.type === 'hub' ? 120 : 200;
          n.x = cx + Math.cos(a) * r + (Math.random() - .5) * 30;
          n.y = cy + Math.sin(a) * r + (Math.random() - .5) * 30;
        }
        n.vx = 0; n.vy = 0;
      });
    }

    /* ---- zoom / pan transform ---- */
    let k = 1, tx = 0, ty = 0;
    function applyTransform() { gRoot.setAttribute('transform', 'translate(' + tx + ',' + ty + ') scale(' + k + ')'); }

    /* ---- create elements ---- */
    const edgeEls = links.map((l) => {
      const ln = sv('line'); ln.setAttribute('class', 'gedge'); ln.setAttribute('marker-end', 'url(#' + mid + ')');
      ln.dataset.s = l[0]; ln.dataset.t = l[1]; gRoot.appendChild(ln); return ln;
    });
    const nodeEls = {};
    NODES.forEach((n) => {
      const c = sv('circle'); c.setAttribute('class', 'gnode ' + n.type); c.setAttribute('r', radius(n)); c.dataset.id = n.id;
      gRoot.appendChild(c); nodeEls[n.id] = c;
      c.addEventListener('mouseenter', () => hover(n));
      c.addEventListener('mouseleave', () => hover(null));
      c.addEventListener('click', (e) => { e.stopPropagation(); select(n); });
      c.addEventListener('pointerdown', (e) => startDrag(e, n));
    });

    function paint() {
      edgeEls.forEach((ln) => {
        const s = byId[ln.dataset.s], t = byId[ln.dataset.t];
        let dx = t.x - s.x, dy = t.y - s.y; const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / d, uy = dy / d;
        ln.setAttribute('x1', s.x + ux * radius(s)); ln.setAttribute('y1', s.y + uy * radius(s));
        ln.setAttribute('x2', t.x - ux * (radius(t) + 5)); ln.setAttribute('y2', t.y - uy * (radius(t) + 5));
      });
      NODES.forEach((n) => { const c = nodeEls[n.id]; c.setAttribute('cx', n.x); c.setAttribute('cy', n.y); });
      applyTransform();
      if (tipNode) positionTip(tipNode);
    }

    /* ---- force simulation ---- */
    const K_REP = 2800, K_SPRING = 0.02, K_GRAV = 0.008, DAMP = 0.86, MAXV = 22;
    function tick() {
      for (const n of NODES) { n.fx = 0; n.fy = 0; }
      for (let i = 0; i < NODES.length; i++) {
        for (let j = i + 1; j < NODES.length; j++) {
          const a = NODES[i], b = NODES[j];
          let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy || 0.01;
          const f = K_REP / d2, d = Math.sqrt(d2), ux = dx / d, uy = dy / d;
          a.fx += ux * f; a.fy += uy * f; b.fx -= ux * f; b.fy -= uy * f;
        }
      }
      for (const l of links) {
        const a = byId[l[0]], b = byId[l[1]];
        let dx = b.x - a.x, dy = b.y - a.y; const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = K_SPRING * (d - restLen(l[0], l[1])), ux = dx / d, uy = dy / d;
        a.fx += ux * f; a.fy += uy * f; b.fx -= ux * f; b.fy -= uy * f;
      }
      for (const n of NODES) {
        if (n === dragNode) continue;
        if (n.type === 'root') { n.x = cx; n.y = cy; n.vx = n.vy = 0; continue; }
        n.fx += (cx - n.x) * K_GRAV; n.fy += (cy - n.y) * K_GRAV;
        n.vx = (n.vx + n.fx) * DAMP + (Math.random() - .5) * 0.06;
        n.vy = (n.vy + n.fy) * DAMP + (Math.random() - .5) * 0.06;
        n.vx = Math.max(-MAXV, Math.min(MAXV, n.vx));
        n.vy = Math.max(-MAXV, Math.min(MAXV, n.vy));
        n.x += n.vx; n.y += n.vy;
        const r = radius(n) + 3;
        n.x = Math.max(r, Math.min(W - r, n.x)); n.y = Math.max(r, Math.min(H - r, n.y));
      }
    }

    let running = false, rafId = 0;
    function loop() { tick(); paint(); if (running) rafId = requestAnimationFrame(loop); }
    function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }

    /* ---- interactions ---- */
    let tipNode = null, selectedNode = null, hoverNode = null, dragNode = null;
    function neighbors(idn) { const set = new Set([idn]); links.forEach((l) => { if (l[0] === idn) set.add(l[1]); if (l[1] === idn) set.add(l[0]); }); return set; }
    function applyClasses() {
      const focus = hoverNode || selectedNode;
      const near = focus ? neighbors(focus.id) : null;
      NODES.forEach((n) => {
        const c = nodeEls[n.id]; const hot = (n === hoverNode) || (n === selectedNode);
        c.classList.toggle('hot', hot); c.classList.toggle('dim', !!near && !near.has(n.id) && !hot);
      });
      edgeEls.forEach((ln) => {
        const on = focus && (ln.dataset.s === focus.id || ln.dataset.t === focus.id);
        ln.classList.toggle('hot', !!on); ln.classList.toggle('dim', !!focus && !on);
      });
    }
    function positionTip(n) { tip.style.left = (n.x * k + tx) + 'px'; tip.style.top = (n.y * k + ty) + 'px'; }
    function hover(n) {
      hoverNode = n; tipNode = n;
      if (n) {
        const sub = n.type === 'leaf' ? ('function · ' + (byId[n.group] ? byId[n.group].title : '')) : (n.type === 'root' ? 'engine core' : 'module');
        tip.innerHTML = esc(n.title) + '<small>' + esc(sub) + '</small>'; tip.hidden = false; positionTip(n);
      } else { tip.hidden = true; }
      applyClasses();
    }
    function select(n) {
      selectedNode = n;
      pTitle.textContent = n.title;
      pRole.textContent = n.type === 'root' ? 'Engine core' : (n.type === 'hub' ? 'Module (hub)' : 'Function');
      pDesc.textContent = n.desc || '';
      pIn.innerHTML = (n.inputs || ['—']).map((x) => '<li>' + esc(x) + '</li>').join('');
      pOut.innerHTML = (n.outputs || ['—']).map((x) => '<li>' + esc(x) + '</li>').join('');
      // prefer the REAL source of the node's primary function (accuracy); else the snippet
      const fn = n.title ? (n.title.match(/[A-Za-z_]\w+/) || [])[0] : '';
      const realSrc = (window.ENGINE_SRC && fn && window.ENGINE_SRC[fn]) ? window.ENGINE_SRC[fn] : '';
      pCode.textContent = realSrc || n.code || '// (module — open its functions for code)';
      panel.hidden = false;
      applyClasses();
    }
    function deselect() { selectedNode = null; panel.hidden = true; applyClasses(); }
    pClose.addEventListener('click', deselect);

    /* ---- drag + pan + zoom ---- */
    function svgPix(e) {
      const r = svg.getBoundingClientRect();
      const rw = r.width || W || 1, rh = r.height || H || 1;   // guard against a 0-size (hidden) rect
      return { x: (e.clientX - r.left) * (W / rw), y: (e.clientY - r.top) * (H / rh) };
    }
    function graphPt(e) { const p = svgPix(e); return { x: (p.x - tx) / k, y: (p.y - ty) / k }; }
    function startDrag(e, n) {
      if (n.type === 'root') return;
      e.preventDefault(); e.stopPropagation();
      dragNode = n; svg.classList.add('dragging');
      window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    }
    let panning = false, panStart = null, moved = false;
    svg.addEventListener('pointerdown', (e) => {
      if (dragNode) return;
      panning = true; moved = false; panStart = { x: e.clientX, y: e.clientY, tx: tx, ty: ty };
      window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    });
    function onMove(e) {
      if (dragNode) {
        const p = graphPt(e); dragNode.x = p.x; dragNode.y = p.y; dragNode.vx = 0; dragNode.vy = 0;
        if (!running) paint();
        return;
      }
      if (panning) {
        const r = svg.getBoundingClientRect(); const sx = W / (r.width || W || 1), sy = H / (r.height || H || 1);
        const ddx = (e.clientX - panStart.x) * sx, ddy = (e.clientY - panStart.y) * sy;
        if (Math.abs(ddx) + Math.abs(ddy) > 3) moved = true;
        tx = panStart.tx + ddx; ty = panStart.ty + ddy; applyTransform();
        if (tipNode) positionTip(tipNode);
      }
    }
    function onUp() {
      if (dragNode) { dragNode = null; svg.classList.remove('dragging'); }
      panning = false;
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
    }
    svg.addEventListener('click', (e) => {
      if (e.target.classList && e.target.classList.contains('gnode')) return;
      if (moved) { moved = false; return; }
      deselect();
    });
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = svgPix(e), gx = (p.x - tx) / k, gy = (p.y - ty) / k;
      const nk = Math.max(0.4, Math.min(4, k * Math.exp(-e.deltaY * 0.0015)));
      tx = p.x - gx * nk; ty = p.y - gy * nk; k = nk; applyTransform();
      if (tipNode) positionTip(tipNode);
    }, { passive: false });
    svg.addEventListener('dblclick', (e) => {
      if (e.target.classList && e.target.classList.contains('gnode')) return;
      if (opts.onDblBg) opts.onDblBg();
      else { k = 1; tx = 0; ty = 0; applyTransform(); }
    });

    /* ---- start ---- */
    let started = false;
    function start() {
      if (started) return; started = true;
      measure(); seed(); paint();
      running = true; rafId = requestAnimationFrame(loop);
    }
    let rz;
    window.addEventListener('resize', () => { if (!started) return; clearTimeout(rz); rz = setTimeout(measure, 150); });

    return { start: start, stop: stop, wrap: wrap };
  }

  /* =============== instantiate =============== */
  let metaInst = null;
  function openMeta() {
    if (metaInst) { metaInst.wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    metaInst = makeGraph(stack, M_NODES, M_FLOW, {
      title: 'Meta — how this graph is built',
      subtitle: 'the visualization explaining itself',
      closable: true,
      onClose: () => { metaInst = null; }
    });
    metaInst.start();
    metaInst.wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* toggle: backend engine graph (primary) <-> frontend tool graph */
  let mainInst = null, currentKind = null;
  function showGraph(kind) {
    if (kind === currentKind && mainInst) {
      mainInst.wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (mainInst) {
      mainInst.stop();
      if (mainInst.wrap && mainInst.wrap.parentNode) mainInst.wrap.parentNode.removeChild(mainInst.wrap);
    }
    currentKind = kind;
    const opts = { onDblBg: openMeta };
    if (kind === 'engine') {
      opts.title = 'AI Engine — the backend brain';
      opts.subtitle = 'innoverse_pipeline_final.py · click a node for its role, I/O and real code · double-click the background for the meta-graph';
      mainInst = makeGraph(stack, E_NODES, E_FLOW, opts);
    } else {
      opts.title = 'Translate tool — the frontend';
      opts.subtitle = 'js/script.js · the on-page dictionary + voice tool';
      mainInst = makeGraph(stack, T_NODES, T_FLOW, opts);
    }
    if (stack.firstChild !== mainInst.wrap) stack.insertBefore(mainInst.wrap, stack.firstChild); // keep main above any meta graph
    mainInst.start();
    document.querySelectorAll('.aieng-toggle [data-graph]').forEach((b) =>
      b.classList.toggle('is-on', b.dataset.graph === kind));
    if (window.AkkLog) window.AkkLog.log('AI Engine', 'open-graph', kind === 'engine' ? 'backend engine graph' : 'frontend tool graph');
  }

  document.querySelectorAll('.aieng-toggle [data-graph]').forEach((b) =>
    b.addEventListener('click', () => showGraph(b.dataset.graph)));

  const trigger = document.querySelector('.nav-list a[data-nav="ai-engine"]');
  if (trigger) trigger.addEventListener('click', () => setTimeout(() => {
    if (!mainInst) showGraph('engine'); else mainInst.start();
  }, 0));
  const section = document.getElementById('ai-engine');
  if (section && section.classList.contains('is-open')) showGraph('engine');

  /* capability catalog: each red function chip -> a modal with the real source */
  (function wireCaps() {
    const caps = document.querySelector('.aieng-caps');
    if (!caps) return;
    const modal = document.createElement('div');
    modal.className = 'cap-modal'; modal.hidden = true;
    modal.innerHTML =
      '<div class="cap-modal-box">' +
        '<div class="cap-modal-head"><span class="cap-modal-title"></span>' +
        '<button type="button" class="cap-modal-close" aria-label="Close">&#10005;</button></div>' +
        '<pre class="cap-modal-code"><code></code></pre>' +
      '</div>';
    document.body.appendChild(modal);
    const mTitle = modal.querySelector('.cap-modal-title');
    const mCode = modal.querySelector('.cap-modal-code code');
    function openFn(fn) {
      const src = (window.ENGINE_SRC && window.ENGINE_SRC[fn]) || '';
      mTitle.textContent = fn + '  —  innoverse_pipeline_final.py';
      mCode.textContent = src || '(source not found)';
      modal.hidden = false;
      if (window.AkkLog) window.AkkLog.log('AI Engine', 'view-source', fn + '()');
    }
    function close() { modal.hidden = true; }
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('.cap-modal-close')) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });
    caps.querySelectorAll('.cap-fn').forEach((b) =>
      b.addEventListener('click', () => openFn(b.dataset.fn)));
  })();
})();
