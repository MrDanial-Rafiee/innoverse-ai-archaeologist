/* =========================================================
   INTRO SPLASH
   Full-screen cover image. On click it is sliced into a grid of
   puzzle pieces that spiral inward — like water sucked down a
   drain — into the site logo, shrinking and fading as they go.
   Then the overlay is removed and the site is revealed.
   ========================================================= */
(function () {
  const overlay = document.getElementById('introSplash');
  if (!overlay) return;
  const img = overlay.querySelector('.intro-img');
  const stage = overlay.querySelector('.intro-stage');
  const glow = overlay.querySelector('.intro-glow');
  const hint = overlay.querySelector('.intro-hint');
  const IMG_URL = img ? img.getAttribute('src') : '';

  // lock page scroll while the splash is up
  const html = document.documentElement;
  html.style.overflow = 'hidden';

  let wantStart = false, started = false;
  function imgReady() { return img.complete && img.naturalWidth > 0; }
  img.addEventListener('load', () => { if (wantStart) start(); });
  img.addEventListener('error', dismiss);   // if the image is missing, just reveal the site
  overlay.addEventListener('click', () => { if (imgReady()) start(); else wantStart = true; });

  function logoTarget() {
    const logo = document.querySelector('.logo img') || document.querySelector('.logo');
    if (logo) { const r = logo.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    return { x: 62, y: 46 };
  }

  function start() {
    if (started) return;
    started = true;
    if (hint) hint.classList.add('hide');
    overlay.classList.add('revealing');   // fade the blurred backdrop so the site shows behind the pieces

    const W = window.innerWidth || html.clientWidth || 0;
    const H = window.innerHeight || html.clientHeight || 0;
    if (!W || !H) { dismiss(); return; }   // no measurable viewport -> just reveal the site
    const iw = img.naturalWidth, ih = img.naturalHeight;
    // reproduce object-fit:contain so the tiles line up exactly with the whole shown image
    const scale = Math.min(W / iw, H / ih);
    const dispW = iw * scale, dispH = ih * scale;
    const offX = (W - dispW) / 2, offY = (H - dispH) / 2;   // centre the whole image

    // tiles cover only the image rectangle (not the letterbox around it)
    const cols = Math.max(6, Math.min(16, Math.round(dispW / 90)));
    const tileW = dispW / cols;
    const rows = Math.max(6, Math.min(20, Math.round(dispH / tileW)));
    const tileH = dispH / rows;

    const tgt = logoTarget();
    if (glow) { glow.style.left = tgt.x + 'px'; glow.style.top = tgt.y + 'px'; glow.classList.add('on'); }

    const tiles = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const left = offX + c * tileW, top = offY + r * tileH;
        const d = document.createElement('div');
        d.className = 'intro-tile';
        d.style.left = left + 'px';
        d.style.top = top + 'px';
        d.style.width = tileW + 'px';
        d.style.height = tileH + 'px';
        d.style.backgroundImage = 'url("' + IMG_URL + '")';
        d.style.backgroundSize = dispW + 'px ' + dispH + 'px';
        d.style.backgroundPosition = (offX - left) + 'px ' + (offY - top) + 'px';
        stage.appendChild(d);

        const cxo = left + tileW / 2, cyo = top + tileH / 2;
        const vx = cxo - tgt.x, vy = cyo - tgt.y;
        const dist = Math.hypot(vx, vy);
        tiles.push({
          el: d, cxo: cxo, cyo: cyo,
          ang0: Math.atan2(vy, vx), r0: dist,
          spin: (Math.random() - 0.5) * 900,
          delay: dist * 0.32 + Math.random() * 140,   // nearer pieces drain first
          dur: 950 + Math.random() * 550
        });
      }
    }
    // hide the single cover image now that tiles replace it
    img.style.opacity = '0';

    animate(tiles, tgt);
    // hard safety: never leave the site blocked
    setTimeout(dismiss, 6500);
  }

  function easeInCubic(x) { return x * x * x; }

  function animate(tiles, tgt) {
    const t0 = performance.now();
    const SWIRL = Math.PI * 2.3;   // how much the vortex twists
    function frame(now) {
      let done = 0;
      for (const p of tiles) {
        let lt = (now - t0 - p.delay) / p.dur;
        if (lt <= 0) continue;
        if (lt >= 1) { lt = 1; done++; if (p.el.parentNode) p.el.style.opacity = '0'; continue; }
        const e = easeInCubic(lt);
        const rad = p.r0 * (1 - e);                 // radius shrinks to 0 at the drain
        const ang = p.ang0 + SWIRL * e;             // and twists inward = whirlpool
        const cx = tgt.x + rad * Math.cos(ang);
        const cy = tgt.y + rad * Math.sin(ang);
        const s = 1 - e * 0.95;                     // shrink
        const op = lt < 0.72 ? 1 : (1 - (lt - 0.72) / 0.28);
        p.el.style.opacity = op;
        p.el.style.transform =
          'translate(' + (cx - p.cxo) + 'px,' + (cy - p.cyo) + 'px) scale(' + s + ') rotate(' + (p.spin * e) + 'deg)';
      }
      if (done < tiles.length) requestAnimationFrame(frame);
      else finish();
    }
    requestAnimationFrame(frame);
  }

  function finish() { overlay.classList.add('out'); setTimeout(dismiss, 520); }

  function dismiss() {
    if (overlay.classList.contains('gone')) return;
    overlay.classList.add('gone');
    html.style.overflow = '';
  }
})();
