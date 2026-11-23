/* ==========================================================================
   A Magical 3rd Wedding Anniversary — script.js
   Vanilla JavaScript only. Modules (IIFE-style, in order):
     CONFIG · helpers · FX (particles/fireworks) · Music · Globe ·
     Gallery/Lightbox · Reveals · Letter · Miracle · Flow (intro/replay)
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG — safe to edit
     ------------------------------------------------------------------------ */
  const CONFIG = {
    // Set to e.g. '2023-11-23' to also show an exact "days of love" line.
    // Leave null and NO day counter is shown (nothing is invented).
    weddingDate: null,
    storageKey: 'anniv-music-position',
    singapore: { lat: 1.3521, lon: 103.8198 },
    india: { lat: 15.0, lon: 78.0 }
  };

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMQ = window.matchMedia('(max-width: 700px)');
  const reduced = () => reducedMQ.matches;
  const isMobile = () => mobileMQ.matches;
  const mob = () => (isMobile() ? 0.55 : 1);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };
  const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  /* ========================================================================
     FX — ambient particles + hearts / sparkles / fireworks
     ======================================================================== */
  const FX = (() => {
    const ambient = $('#ambient'), burst = $('#burst');
    const actx = ambient.getContext('2d'), bctx = burst.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    const sprites = {};

    // --- sprite factory (pre-rendered glows keep drawing cheap) ---
    function sprite(size, draw) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      draw(c.getContext('2d'), size);
      return c;
    }
    function glowDot(rgb) {
      return sprite(32, (g, s) => {
        const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        r.addColorStop(0, 'rgba(255,255,255,1)');
        r.addColorStop(0.22, `rgba(${rgb},.75)`);
        r.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = r; g.fillRect(0, 0, s, s);
      });
    }
    function heartPath(g, s) {
      g.beginPath();
      g.moveTo(0, s * 0.9);
      g.bezierCurveTo(-s * 1.3, 0, -s * 1.0, -s * 1.0, 0, -s * 0.4);
      g.bezierCurveTo(s * 1.0, -s * 1.0, s * 1.3, 0, 0, s * 0.9);
      g.closePath();
    }
    function heartSprite(c1, c2, glow) {
      return sprite(64, (g, s) => {
        g.translate(s / 2, s / 2 - 2);
        g.shadowColor = glow; g.shadowBlur = 12;
        const gr = g.createLinearGradient(-14, -14, 14, 16);
        gr.addColorStop(0, c1); gr.addColorStop(1, c2);
        g.fillStyle = gr; heartPath(g, 17); g.fill();
      });
    }
    function starSprite() {
      return sprite(48, (g, s) => {
        g.translate(s / 2, s / 2);
        const r = g.createRadialGradient(0, 0, 0, 0, 0, s / 2);
        r.addColorStop(0, 'rgba(255,243,201,.9)'); r.addColorStop(0.3, 'rgba(245,217,139,.25)'); r.addColorStop(1, 'rgba(245,217,139,0)');
        g.fillStyle = r; g.fillRect(-s / 2, -s / 2, s, s);
        g.fillStyle = '#FFF8ED';
        g.beginPath();
        g.moveTo(0, -s / 2 + 2); g.quadraticCurveTo(1.5, -1.5, s / 2 - 2, 0);
        g.quadraticCurveTo(1.5, 1.5, 0, s / 2 - 2); g.quadraticCurveTo(-1.5, 1.5, -s / 2 + 2, 0);
        g.quadraticCurveTo(-1.5, -1.5, 0, -s / 2 + 2); g.fill();
      });
    }
    sprites.gold = glowDot('245,217,139');
    sprites.rose = glowDot('217,140,155');
    sprites.ivory = glowDot('255,248,237');
    sprites.star = starSprite();
    sprites.heartGold = heartSprite('#FFF3C9', '#D6B46A', 'rgba(245,217,139,.9)');
    sprites.heartRose = heartSprite('#FFD9DE', '#D98C9B', 'rgba(217,140,155,.9)');

    // --- sizing ---
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2);
      W = window.innerWidth; H = window.innerHeight;
      [ambient, burst].forEach((c) => { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
      actx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced()) drawAmbient();
    }

    // --- ambient layer: golden dust, twinkling stars, a few hearts ---
    const amb = [];
    function newAmb(init) {
      const r = Math.random();
      const type = r < 0.55 ? 'gold' : r < 0.9 ? 'star' : 'heartGold';
      const size = type === 'heartGold' ? rand(8, 13) : type === 'star' ? rand(8, 18) : rand(6, 16);
      return {
        type, size, x: rand(0, W), y: init ? rand(0, H) : H + 20,
        vx: rand(-0.12, 0.12) * 60, vy: -rand(0.1, 0.45) * 40,
        a: rand(0.35, 0.95), ph: rand(0, 6.28), sp: rand(0.6, 2.2)
      };
    }
    function seedAmbient() {
      amb.length = 0;
      const n = reduced() ? 30 : Math.round(95 * mob());
      for (let i = 0; i < n; i++) amb.push(newAmb(true));
    }
    function drawAmbient(t = 0) {
      actx.clearRect(0, 0, W, H);
      for (const p of amb) {
        const tw = 0.65 + 0.35 * Math.sin(p.ph + t * p.sp);
        actx.globalAlpha = p.a * tw;
        actx.drawImage(sprites[p.type], p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      actx.globalAlpha = 1;
    }
    function updateAmbient(dt) {
      for (const p of amb) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y < -24 || p.x < -24 || p.x > W + 24) Object.assign(p, newAmb(false), { x: rand(0, W) });
      }
    }

    // --- burst layer ---
    const bp = [];
    const cap = () => (isMobile() ? 260 : 520);
    function spawn(p) {
      if (bp.length >= cap()) return;
      p.max = p.life;
      bp.push(p);
    }
    const base = () => ({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 1, life: 1, size: 10, rot: 0, vr: 0, spr: 'gold', shrink: false, fadeIn: 0 });

    function heartBurst(x, y, n = 24) {
      if (reduced()) return;
      n = Math.round(n * mob());
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), s = rand(70, 300);
        spawn(Object.assign(base(), {
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90, g: 120, drag: 0.975,
          life: rand(1.6, 2.8), size: rand(11, 26), rot: rand(-0.5, 0.5), vr: rand(-1.5, 1.5),
          spr: Math.random() < 0.6 ? 'heartGold' : 'heartRose'
        }));
      }
      sparkle(x, y, 14);
    }
    function sparkle(x, y, n = 18, spread = 40) {
      if (reduced()) return;
      n = Math.round(n * mob());
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), s = rand(20, 160);
        spawn(Object.assign(base(), {
          x: x + rand(-spread, spread) * 0.3, y: y + rand(-spread, spread) * 0.3,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, g: 40, drag: 0.96,
          life: rand(0.8, 1.8), size: rand(10, 22), spr: Math.random() < 0.7 ? 'star' : 'ivory', shrink: true
        }));
      }
    }
    // rising hearts / stars (gentle, ambient-like emitter)
    function rise(x, y, n = 1, spr = 'heartGold') {
      if (reduced()) return;
      for (let i = 0; i < n; i++) {
        spawn(Object.assign(base(), {
          x: x + rand(-10, 10), y, vx: rand(-14, 14), vy: -rand(36, 90), life: rand(3, 4.6), size: rand(9, 16),
          spr: Math.random() < 0.25 ? 'heartRose' : spr, fadeIn: 0.5, vr: rand(-0.4, 0.4)
        }));
      }
    }
    // falling heart confetti
    function confetti(n = 6) {
      if (reduced()) return;
      n = Math.round(n * mob());
      for (let i = 0; i < n; i++) {
        spawn(Object.assign(base(), {
          x: rand(0, W), y: -20, vx: rand(-24, 24), vy: rand(50, 130), life: (H + 60) / 70 + 1, size: rand(10, 20),
          spr: Math.random() < 0.55 ? 'heartGold' : 'heartRose', rot: rand(-1, 1), vr: rand(-1.8, 1.8)
        }));
      }
    }
    // firework: explodes at (x,y). Ring or heart-shaped burst.
    function firework(x, y, opts = {}) {
      if (reduced()) return;
      const heart = opts.heart !== undefined ? opts.heart : Math.random() < 0.35;
      const n = Math.round((heart ? 64 : 84) * mob());
      const pal = ['gold', 'gold', 'ivory', 'rose'];
      const power = opts.power || rand(150, 230);
      for (let i = 0; i < n; i++) {
        let vx, vy;
        if (heart) {
          const t = (i / n) * Math.PI * 2;
          vx = 16 * Math.pow(Math.sin(t), 3);
          vy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          const k = power / 14;
          vx *= k; vy *= k;
        } else {
          const a = (i / n) * Math.PI * 2 + rand(-0.05, 0.05), s = power * rand(0.45, 1);
          vx = Math.cos(a) * s; vy = Math.sin(a) * s;
        }
        spawn(Object.assign(base(), {
          x, y, vx, vy, g: 70, drag: 0.972, life: rand(1.3, 2.2), size: rand(9, 16),
          spr: heart ? 'gold' : pal[(Math.random() * pal.length) | 0], shrink: true
        }));
      }
      sparkle(x, y, 10, 10);
    }
    function launch(x, targetY, opts = {}) {
      if (reduced()) return;
      const life = rand(0.8, 1.1), y0 = H + 10;
      spawn(Object.assign(base(), {
        x, y: y0, vx: rand(-14, 14), vy: (targetY - y0) / life, life, size: 14, spr: 'ivory', rocket: true,
        onEnd: (p) => firework(p.x, p.y, opts)
      }));
    }

    function updateBurst(dt) {
      for (let i = bp.length - 1; i >= 0; i--) {
        const p = bp[i];
        p.life -= dt;
        if (p.life <= 0) { if (p.onEnd) p.onEnd(p); bp.splice(i, 1); continue; }
        const d = Math.pow(p.drag, dt * 60);
        p.vx *= d; p.vy = p.vy * d + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.rocket && Math.random() < 0.8) {
          spawn(Object.assign(base(), { x: p.x, y: p.y, vx: rand(-14, 14), vy: rand(10, 50), life: rand(0.3, 0.6), size: rand(5, 9), spr: 'gold', shrink: true }));
        }
      }
    }
    let burstDirty = false;
    function drawBurst() {
      if (!bp.length) { if (burstDirty) { bctx.globalCompositeOperation = 'source-over'; bctx.clearRect(0, 0, W, H); burstDirty = false; } return; }
      burstDirty = true;
      bctx.globalCompositeOperation = 'destination-out';
      bctx.fillStyle = 'rgba(0,0,0,.24)';
      bctx.fillRect(0, 0, W, H);
      bctx.globalCompositeOperation = 'lighter';
      for (const p of bp) {
        const f = p.life / p.max;
        let a = clamp(p.life / (p.max * 0.35), 0, 1);
        if (p.fadeIn) a = Math.min(a, clamp((p.max - p.life) / p.fadeIn, 0, 1));
        const s = p.shrink ? p.size * Math.pow(f, 0.6) + 2 : p.size;
        bctx.globalAlpha = a;
        if (p.rot) {
          bctx.save(); bctx.translate(p.x, p.y); bctx.rotate(p.rot);
          bctx.drawImage(sprites[p.spr], -s / 2, -s / 2, s, s); bctx.restore();
        } else {
          bctx.drawImage(sprites[p.spr], p.x - s / 2, p.y - s / 2, s, s);
        }
      }
      bctx.globalAlpha = 1;
      bctx.globalCompositeOperation = 'source-over';
    }

    // --- master loop ---
    let last = 0, raf = 0, running = false;
    function tick(now) {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      updateAmbient(dt); drawAmbient(now / 1000);
      updateBurst(dt); drawBurst();
    }
    function start() { if (running || reduced()) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
    window.addEventListener('resize', () => { resize(); });
    reducedMQ.addEventListener && reducedMQ.addEventListener('change', () => { seedAmbient(); resize(); reduced() ? stop() : start(); });

    resize(); seedAmbient(); drawAmbient(); start();

    return { heartBurst, sparkle, rise, confetti, firework, launch, heartPath, get W() { return W; }, get H() { return H; } };
  })();

  /* ========================================================================
     Music — floating player. Never autoplays; resumes from saved position.
     ======================================================================== */
  const Music = (() => {
    const audio = $('#song'), player = $('#player');
    const playBtn = $('#playBtn'), muteBtn = $('#muteBtn'), info = $('#playerInfo');
    const seek = $('#seek'), tCur = $('#tCur'), tDur = $('#tDur'), status = $('#audioStatus');
    const viz = $('#viz'), vctx = viz.getContext('2d');
    let failed = false, seeking = false, autoCloseT = 0, vizRaf = 0, lastSave = 0;
    const sources = $$('source', audio);
    let sourceErrors = 0;

    const fmt = (s) => { if (!isFinite(s)) return '0:00'; s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
    const setProgress = (v) => { v = isFinite(v) ? clamp(v, 0, 1000) : 0; seek.value = v; seek.style.setProperty('--p', (v / 10) + '%'); };

    function fail() {
      failed = true;
      audio.pause(); player.classList.remove('is-playing'); setProgress(0);
      status.hidden = false;
      status.textContent = 'Add your song to assets/audio/un-paarvayil.mp3 to hear the music ♪';
      playBtn.setAttribute('aria-label', 'Music file not found');
    }
    sources.forEach((s) => s.addEventListener('error', () => { if (++sourceErrors >= sources.length) fail(); }));

    audio.addEventListener('durationchange', () => { tDur.textContent = fmt(audio.duration); });
    audio.addEventListener('loadedmetadata', () => {
      tDur.textContent = fmt(audio.duration);
      const saved = parseFloat(store.get(CONFIG.storageKey));
      if (saved > 0 && saved < audio.duration - 3) audio.currentTime = saved; // remember position
    });
    audio.addEventListener('timeupdate', () => {
      if (!seeking && isFinite(audio.duration) && audio.duration > 0) {
        if (tDur.textContent === '0:00') tDur.textContent = fmt(audio.duration); setProgress((audio.currentTime / audio.duration) * 1000); tCur.textContent = fmt(audio.currentTime); }
      const now = Date.now();
      if (now - lastSave > 1000) { lastSave = now; store.set(CONFIG.storageKey, String(audio.currentTime)); }
    });
    audio.addEventListener('play', () => { player.classList.add('is-playing'); playBtn.setAttribute('aria-label', 'Pause music'); startViz(); });
    audio.addEventListener('pause', () => { player.classList.remove('is-playing'); playBtn.setAttribute('aria-label', 'Play music'); store.set(CONFIG.storageKey, String(audio.currentTime)); });
    window.addEventListener('pagehide', () => store.set(CONFIG.storageKey, String(audio.currentTime)));

    function play() {
      if (failed) return Promise.resolve();
      const p = audio.play();
      return p && p.catch ? p.catch(() => { /* blocked or unavailable — user can press play */ }) : Promise.resolve();
    }
    function toggle() { if (failed) { fail(); return; } audio.paused ? play() : audio.pause(); }

    playBtn.addEventListener('click', toggle);
    muteBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      player.classList.toggle('is-muted', audio.muted);
      muteBtn.setAttribute('aria-pressed', String(audio.muted));
      muteBtn.setAttribute('aria-label', audio.muted ? 'Unmute music' : 'Mute music');
    });
    seek.addEventListener('input', () => {
      seeking = true; seek.style.setProperty('--p', (seek.value / 10) + '%');
      if (audio.duration) tCur.textContent = fmt((seek.value / 1000) * audio.duration);
    });
    seek.addEventListener('change', () => { if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration; seeking = false; });

    function setOpen(open) { player.classList.toggle('is-open', open); info.setAttribute('aria-expanded', String(open)); if (open) startViz(); }
    info.addEventListener('click', () => { clearTimeout(autoCloseT); setOpen(!player.classList.contains('is-open')); });
    function peek() { setOpen(true); clearTimeout(autoCloseT); autoCloseT = setTimeout(() => setOpen(false), 7000); }

    // Simulated visualiser (Web Audio is avoided so it also works when opened from a local file)
    const BARS = 30, levels = new Array(BARS).fill(0);
    function startViz() { if (!vizRaf && !reduced()) vizRaf = requestAnimationFrame(drawViz); }
    function drawViz(t) {
      vizRaf = 0;
      if (!player.classList.contains('is-open')) return; // only animate while the panel is visible
      const w = viz.clientWidth, h = viz.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
      if (viz.width !== Math.round(w * d)) { viz.width = Math.round(w * d); viz.height = Math.round(h * d); }
      vctx.setTransform(d, 0, 0, d, 0, 0); vctx.clearRect(0, 0, w, h);
      const playing = !audio.paused, bw = w / BARS;
      const g = vctx.createLinearGradient(0, h, 0, 0); g.addColorStop(0, '#B98B3E'); g.addColorStop(1, '#FFF3C9');
      vctx.fillStyle = g;
      for (let i = 0; i < BARS; i++) {
        const target = playing ? (0.25 + 0.75 * Math.abs(Math.sin(t / 380 + i * 0.7) * Math.cos(t / 910 + i * 0.31))) * (0.55 + 0.45 * Math.sin(t / 1300 + i)) : 0.06;
        levels[i] += (target - levels[i]) * 0.18;
        const bh = Math.max(2, levels[i] * h);
        vctx.beginPath(); vctx.roundRect ? vctx.roundRect(i * bw + bw * 0.2, h - bh, bw * 0.6, bh, 2) : vctx.rect(i * bw + bw * 0.2, h - bh, bw * 0.6, bh);
        vctx.fill();
      }
      vizRaf = requestAnimationFrame(drawViz);
    }

    return { play, peek, show() { player.classList.add('is-visible'); } };
  })();

  /* ========================================================================
     Globe — dotted world with Singapore ⇄ India golden connection
     ======================================================================== */
  const Globe = (() => {
    /* Land as 1° dots. rows[i] = flat [start,len,...] runs; lat = 64.5 - i, lon = 30.5 + start (+ index) */
    const LAND_ROWS = [[0,5,7,113],[0,120],[0,120],[0,120],[0,120],[0,119],[0,111],[0,110],[0,108],[0,106],[0,107],[0,111],[0,111,112,1],[0,111,112,1],[0,110,112,2],[0,110,112,2],[0,110,112,1],[0,109,112,1],[0,1,2,4,8,11,23,85,113,1],[3,2,8,10,23,84],[8,9,20,86,112,1],[10,8,21,84,111,4],[12,6,23,78,112,1],[2,4,11,8,24,76],[0,20,23,68,92,7,110,2],[0,19,23,66,91,2,95,3,110,2],[0,19,24,64,95,3,110,2],[0,19,24,65,90,2,97,2,109,2],[0,1,2,2,6,85,97,2,106,5],[6,84,96,3,104,6],[6,84,96,1,101,3,105,2],[5,86,96,1,100,4],[5,86,101,1],[4,87,100,1],[0,91],[0,2,3,15,21,71],[0,18,21,71],[0,4,6,13,23,68],[0,4,6,14,27,63],[0,5,7,13,29,7,37,53],[0,5,7,14,25,2,37,51,91,1],[0,6,9,20,38,49,90,1],[0,6,9,21,40,44,90,1],[0,7,9,20,40,2,43,14,62,16,80,1],[0,7,10,19,43,14,63,14,80,1],[0,7,11,17,43,12,64,12,79,2],[0,8,11,16,43,11,64,12,79,1],[0,9,12,13,43,10,65,12,90,2],[0,9,13,10,43,9,64,2,68,10,90,2],[0,10,13,9,44,6,68,11,90,1],[0,11,13,6,44,6,68,11,90,2],[0,12,13,4,45,5,68,2,71,8,90,1,92,2],[0,13,23,1,45,5,69,1,72,7,94,1],[0,13,20,1,46,4,69,1,73,6,92,1,94,2],[0,14,15,6,46,4,68,1,74,3,89,1],[0,21,46,3,50,1,68,1,75,1,88,1,95,1],[0,20,47,1,50,1,68,2,93,3],[0,20,50,2,69,1,94,3],[0,19,50,2,70,2,86,2,94,2],[0,19,65,1,70,3,85,4],[0,18,66,2,71,2,84,5],[0,17,67,2,71,2,83,4],[0,16,68,2,72,2,81,7,98,1],[0,14,69,3,73,1,79,9,98,1],[0,13,69,4,79,9,91,3,98,1],[0,12,70,3,74,1,79,9,97,1,100,1,102,1],[0,12,71,3,80,7,89,3,97,1,102,2],[0,11,71,6,80,7,89,3,106,5],[0,10,72,4,85,1,89,1,91,1,96,1,100,1,103,11],[0,9,73,3,106,9],[0,9,74,2,89,1,104,1,108,8,118,1],[0,9,76,3,104,1,109,9],[0,9,77,6,101,1,108,9],[0,9,85,6,92,2,96,1,110,3,116,2],[0,10,89,1,94,1,117,2],[0,10],[0,10,100,1,102,1,112,1],[0,11,19,1,101,6,112,1],[0,11,18,2,100,6,112,2],[0,11,18,2,96,2,100,6,112,3],[0,11,16,4,94,12,111,4],[0,10,14,6,93,15,109,1,111,4],[0,8,14,5,92,18,111,5],[0,7,14,5,92,24],[0,5,14,5,91,27],[0,5,14,5,27,1,88,31],[0,5,13,5,85,34],[0,6,13,5,84,36],[0,5,14,4,84,36],[0,5,14,3,83,37],[0,3,15,1,84,36],[0,3,83,37],[0,3,84,36],[0,2,85,35],[0,1,85,35],[0,1,85,35],[86,34],[86,10,104,16],[86,8,105,2,108,12],[86,3,105,1,107,13],[108,12],[110,10],[110,10],[113,1,115,2],[],[],[115,3],[115,3],[116,1],[]];
    const LAT0 = 64.5, LON0 = 30.5, DEG = Math.PI / 180;

    const canvas = $('#globe'), ctx = canvas.getContext('2d');
    const feelBtn = $('#feelBtn');
    const pts = [];
    LAND_ROWS.forEach((runs, i) => {
      const lat = (LAT0 - i) * DEG;
      for (let k = 0; k < runs.length; k += 2) {
        for (let j = runs[k]; j < runs[k] + runs[k + 1]; j++) {
          pts.push({ cl: Math.cos(lat), sl: Math.sin(lat), lon: (LON0 + j) * DEG, ph: Math.random() * 6.28 });
        }
      }
    });
    const stars = Array.from({ length: 36 }, () => ({ x: Math.random(), y: Math.random(), ph: Math.random() * 6.28, s: rand(0.8, 2) }));

    const sg = { lat: CONFIG.singapore.lat * DEG, lon: CONFIG.singapore.lon * DEG };
    const ind = { lat: CONFIG.india.lat * DEG, lon: CONFIG.india.lon * DEG };
    const lat0 = 8 * DEG, lon0Base = 91 * DEG;
    let lon0 = lon0Base;

    // glow sprite
    const glow = document.createElement('canvas'); glow.width = glow.height = 64;
    { const g = glow.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,248,237,1)'); r.addColorStop(0.2, 'rgba(245,217,139,.85)'); r.addColorStop(1, 'rgba(245,217,139,0)');
      g.fillStyle = r; g.fillRect(0, 0, 64, 64); }

    // great-circle arc, lifted off the surface
    const N = 90;
    const toVec = (p) => [Math.cos(p.lat) * Math.cos(p.lon), Math.cos(p.lat) * Math.sin(p.lon), Math.sin(p.lat)];
    const v0 = toVec(sg), v1 = toVec(ind);
    const omega = Math.acos(clamp(v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2], -1, 1));
    const arcPts = Array.from({ length: N + 1 }, (_, i) => {
      const t = i / N, a = Math.sin((1 - t) * omega) / Math.sin(omega), b = Math.sin(t * omega) / Math.sin(omega);
      const v = [a * v0[0] + b * v1[0], a * v0[1] + b * v1[1], a * v0[2] + b * v1[2]];
      return { lat: Math.asin(clamp(v[2], -1, 1)), lon: Math.atan2(v[1], v[0]), r: 1 + 0.2 * Math.sin(Math.PI * t) };
    });

    let S = 0, R = 0, cx = 0, cy = 0, dpr = 1;
    let active = false, raf = 0;
    let prog = 1, boost = 0, connecting = false, exploded = false, cStart = 0, heartU = 0, lastT = 0;
    const out = { x: 0, y: 0 }; // reused projection result

    function resize() {
      const r = canvas.getBoundingClientRect(); S = r.width; if (!S) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(S * dpr); canvas.height = Math.round(S * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = S * 0.72; cx = S / 2; cy = S / 2;
      if (!active) render(performance.now());
    }
    function project(lat, lon, rr = 1) {
      const dl = lon - lon0, cl = Math.cos(lat), sl = Math.sin(lat);
      out.x = cx + R * rr * cl * Math.sin(dl);
      out.y = cy - R * rr * (Math.cos(lat0) * sl - Math.sin(lat0) * cl * Math.cos(dl));
      return out;
    }
    function arcScreen(i) { const p = arcPts[i]; const o = project(p.lat, p.lon, p.r); return { x: o.x, y: o.y }; }

    function heartAt(x, y, size, alpha) {
      ctx.save(); ctx.translate(x, y);
      ctx.globalAlpha = alpha * 0.9; ctx.drawImage(glow, -size * 2.2, -size * 2.2, size * 4.4, size * 4.4);
      ctx.globalAlpha = alpha;
      const gr = ctx.createLinearGradient(-size, -size, size, size); gr.addColorStop(0, '#FFE9E9'); gr.addColorStop(1, '#D98C9B');
      ctx.fillStyle = gr; FX.heartPath(ctx, size); ctx.fill(); ctx.restore();
    }

    function render(now) {
      const t = now / 1000;
      ctx.clearRect(0, 0, S, S);
      if (!reduced()) lon0 = lon0Base + Math.sin(t * 0.18) * 3 * DEG;

      // twinkling stars around the globe
      ctx.fillStyle = '#FFF8ED';
      for (const s of stars) {
        ctx.globalAlpha = 0.2 + 0.6 * (0.5 + 0.5 * Math.sin(s.ph + t * s.s));
        const sz = s.s; ctx.fillRect(s.x * S, s.y * S, sz, sz);
      }

      // graticule
      ctx.strokeStyle = 'rgba(214,180,106,.09)'; ctx.lineWidth = 1; ctx.globalAlpha = 1;
      for (let la = -20; la <= 50; la += 10) { ctx.beginPath(); for (let lo = 30; lo <= 150; lo += 4) { const o = project(la * DEG, lo * DEG); lo === 30 ? ctx.moveTo(o.x, o.y) : ctx.lineTo(o.x, o.y); } ctx.stroke(); }
      for (let lo = 40; lo <= 140; lo += 10) { ctx.beginPath(); for (let la = -30; la <= 60; la += 4) { const o = project(la * DEG, lo * DEG); la === -30 ? ctx.moveTo(o.x, o.y) : ctx.lineTo(o.x, o.y); } ctx.stroke(); }

      // land dots
      const dot = Math.max(1.3, S * 0.0042), half = S * 0.5;
      ctx.fillStyle = '#D6B46A';
      for (const p of pts) {
        const dl = p.lon - lon0, cdl = Math.cos(dl);
        const cosc = Math.sin(lat0) * p.sl + Math.cos(lat0) * p.cl * cdl;
        if (cosc <= 0) continue;
        const x = cx + R * p.cl * Math.sin(dl), y = cy - R * (Math.cos(lat0) * p.sl - Math.sin(lat0) * p.cl * cdl);
        const d = Math.hypot(x - cx, y - cy) / half;
        if (d > 1.02) continue;
        const edge = 1 - clamp((d - 0.55) / 0.45, 0, 1);
        ctx.globalAlpha = (0.25 + 0.5 * edge) * (0.82 + 0.18 * Math.sin(p.ph + t * 1.4));
        ctx.fillRect(x - dot / 2, y - dot / 2, dot, dot);
      }
      ctx.globalAlpha = 1;

      // animate connection progress
      if (connecting) {
        const k = clamp((now - cStart) / 2800, 0, 1);
        prog = 1 - Math.pow(1 - k, 3);
        if (k >= 1 && !exploded) { exploded = true; explode(); setTimeout(() => { connecting = false; }, 1500); }
      }
      const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
      boost = Math.max(0, boost - dt / 7);
      const intensity = 0.4 + 0.6 * boost;

      // arc (3 strokes = cheap glow)
      const upto = Math.max(1, Math.floor(prog * N));
      const pathTo = (n) => { ctx.beginPath(); for (let i = 0; i <= n; i++) { const o = project(arcPts[i].lat, arcPts[i].lon, arcPts[i].r); i ? ctx.lineTo(o.x, o.y) : ctx.moveTo(o.x, o.y); } };
      const a = arcScreen(0), b = arcScreen(N);
      const lg = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      lg.addColorStop(0, '#F5D98B'); lg.addColorStop(0.5, '#FFF3C9'); lg.addColorStop(1, '#D98C9B');
      ctx.lineCap = 'round'; ctx.strokeStyle = lg;
      pathTo(upto); ctx.globalAlpha = 0.12 * (0.5 + intensity); ctx.lineWidth = S * 0.022; ctx.stroke();
      ctx.globalAlpha = 0.28 * (0.5 + intensity); ctx.lineWidth = S * 0.009; ctx.stroke();
      ctx.globalAlpha = 0.5 + 0.5 * intensity; ctx.lineWidth = Math.max(1.4, S * 0.0038); ctx.stroke();
      ctx.globalAlpha = 1;

      // markers
      const mk = [{ p: sg, name: 'Anna', place: 'SINGAPORE', side: 1 }, { p: ind, name: 'Anni', place: 'INDIA', side: -1 }];
      const fs = Math.max(10, S * 0.034);
      for (const m of mk) {
        const o = project(m.p.lat, m.p.lon), mx = o.x, my = o.y, pulse = (t * 0.6) % 1;
        ctx.globalAlpha = 0.55 * (1 - pulse); ctx.strokeStyle = '#F5D98B'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(mx, my, S * 0.012 + pulse * S * 0.05, 0, 6.283); ctx.stroke();
        ctx.globalAlpha = 1; const gs = S * (0.09 + 0.02 * Math.sin(t * 2.4));
        ctx.drawImage(glow, mx - gs / 2, my - gs / 2, gs, gs);
        ctx.fillStyle = '#FFF8ED'; ctx.beginPath(); ctx.arc(mx, my, Math.max(2.4, S * 0.0085), 0, 6.283); ctx.fill();
        // label
        ctx.textAlign = m.side > 0 ? 'left' : 'right';
        const lx = mx + m.side * (S * 0.028), ly = my + (m.side > 0 ? S * 0.045 : -S * 0.045);
        ctx.fillStyle = '#FFF8ED'; ctx.font = `italic 500 ${fs * 1.25}px "Cormorant Garamond", Georgia, serif`;
        ctx.fillText(m.name, lx, ly);
        ctx.fillStyle = '#D6B46A'; ctx.font = `400 ${fs * 0.5}px Poppins, sans-serif`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
        ctx.fillText(m.place, lx, ly + fs * 0.85);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      }

      // travelling heart (ping-pong along the arc)
      heartU += dt * (connecting ? 0.34 : 0.14) * (reduced() ? 0 : 1);
      const tri = 1 - Math.abs(((heartU % 2) + 2) % 2 - 1);
      const idx = clamp(Math.round(tri * N), 0, Math.min(N, upto));
      for (let k = 6; k >= 1; k--) { // sparkle trail
        const ti = clamp(idx - k * 2 * (((heartU % 2) < 1) ? 1 : -1), 0, N); const o = arcScreen(ti);
        ctx.globalAlpha = (1 - k / 7) * 0.5; const ts = S * 0.018 * (1 - k / 8);
        ctx.drawImage(glow, o.x - ts, o.y - ts, ts * 2, ts * 2);
      }
      const hp = arcScreen(idx); ctx.globalAlpha = 1;
      heartAt(hp.x, hp.y, S * 0.026, 1);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }

    function screenOf(i) {
      const r = canvas.getBoundingClientRect(), o = arcScreen(i);
      return { x: r.left + o.x, y: r.top + o.y };
    }
    function explode() {
      const mid = screenOf(Math.floor(N / 2)), s = screenOf(0), e = screenOf(N);
      FX.heartBurst(mid.x, mid.y, 34);
      setTimeout(() => { FX.sparkle(s.x, s.y, 20); FX.sparkle(e.x, e.y, 20); FX.firework(mid.x, mid.y - 20, { heart: true, power: 190 }); }, 350);
      setTimeout(() => FX.heartBurst(mid.x, mid.y - 10, 22), 900);
      boost = 1;
    }
    function connect() {
      if (connecting) return;
      connecting = true; exploded = false; prog = 0; cStart = performance.now(); boost = 0.6;
      if (reduced()) { prog = 1; connecting = false; boost = 1; render(performance.now()); return; }
      if (!active) loop();
    }
    function loop() { if (!active && !connecting) return; raf = requestAnimationFrame((n) => { render(n); loop(); }); }
    function setActive(v) {
      if (v === active) return; active = v;
      if (v && !reduced()) { cancelAnimationFrame(raf); loop(); } else cancelAnimationFrame(raf);
    }

    feelBtn.addEventListener('click', connect);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize);
    resize();

    // live clocks for both cities
    const clockSG = $('#clockSG'), clockIN = $('#clockIN');
    function clocks() {
      try {
        const f = (tz) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(new Date());
        clockSG.textContent = f('Asia/Singapore'); clockIN.textContent = f('Asia/Kolkata');
      } catch (e) { $('#clocks').hidden = true; }
    }
    clocks(); setInterval(clocks, 30000);

    return { setActive, resize, redraw: () => render(performance.now()) };
  })();

  /* ========================================================================
     Gallery lightbox
     ======================================================================== */
  const Lightbox = (() => {
    const lb = $('#lightbox'), img = $('#lbImg'), cap = $('#lbCap'), count = $('#lbCount');
    const tiles = $$('.tile');
    const items = tiles.map((t) => { const i = $('img', t); return { src: i.currentSrc || i.src, alt: i.alt, cap: $('figcaption', t).textContent, round: t.classList.contains('tile--round') }; });
    let idx = 0, opener = null, touchX = null;

    function show(i, instant) {
      idx = (i + items.length) % items.length;
      const it = items[idx];
      const apply = () => {
        img.src = it.src; img.alt = it.alt; img.classList.toggle('is-round', it.round);
        cap.textContent = it.cap; count.textContent = `${idx + 1} / ${items.length}`;
        img.classList.remove('is-swap');
      };
      if (instant || reduced()) apply();
      else { img.classList.add('is-swap'); setTimeout(apply, 280); }
    }
    function open(i, from) {
      opener = from; lb.hidden = false; document.body.classList.add('no-scroll');
      show(i, true);
      void lb.offsetWidth; // ensure the fade-in transition runs
      lb.classList.add('is-open');
      $('.lb__close', lb).focus({ preventScroll: true });
    }
    function close() {
      lb.classList.remove('is-open'); document.body.classList.remove('no-scroll');
      setTimeout(() => { lb.hidden = true; }, 450);
      if (opener) opener.focus({ preventScroll: true });
    }
    tiles.forEach((t, i) => {
      $('.tile__btn', t).addEventListener('click', (e) => {
        const btn = e.currentTarget; // capture: currentTarget is cleared after the handler returns
        const c = e.detail === 0 ? center(btn) : { x: e.clientX, y: e.clientY };
        FX.heartBurst(c.x, c.y, 14);
        setTimeout(() => open(i, btn), reduced() ? 0 : 260);
      });
    });
    $('.lb__close', lb).addEventListener('click', close);
    $('.lb__prev', lb).addEventListener('click', () => show(idx - 1));
    $('.lb__next', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1);
    });
    lb.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX; touchX = null;
      if (Math.abs(dx) > 50) show(dx < 0 ? idx + 1 : idx - 1);
    }, { passive: true });
    return { close };
  })();

  /* ========================================================================
     Scroll reveals (IntersectionObserver), parallax, counters
     ======================================================================== */
  const Reveals = (() => {
    const targets = $$('.reveal, .tile');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('is-in'); });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((t) => io.observe(t));

    // counters
    const nums = $$('[data-count]');
    function countUp(el) {
      const to = +el.dataset.count;
      if (reduced()) { el.textContent = to; return; }
      const t0 = performance.now(), dur = 2400;
      (function step(n) {
        const k = clamp((n - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }
    let counted = false;
    const cio = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting && !counted) { counted = true; setTimeout(() => nums.forEach(countUp), 700); } });
    }, { threshold: 0.6 });
    cio.observe($('#counter'));

    // optional exact day counter — only if a wedding date is configured
    if (CONFIG.weddingDate) {
      const d = new Date(CONFIG.weddingDate + 'T00:00:00');
      if (!isNaN(d)) {
        const days = Math.floor((Date.now() - d.getTime()) / 86400000);
        if (days > 0) { const el = $('#dayCounter'); el.textContent = `${days.toLocaleString()} days of love and counting`; el.hidden = false; }
      }
    }

    // parallax: sets --py on elements near the viewport
    const par = $$('[data-parallax]');
    let ticking = false;
    function parallax() {
      ticking = false;
      if (reduced()) return;
      const vh = window.innerHeight;
      par.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        el.style.setProperty('--py', ((r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax)).toFixed(1) + 'px');
      });
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
    window.addEventListener('resize', parallax);

    function reset() {
      $$('.reveal.is-in, .tile.is-in').forEach((el) => el.classList.remove('is-in'));
      counted = false; nums.forEach((n) => { n.textContent = '0'; });
    }
    return { reset };
  })();

  /* ========================================================================
     Letter — word-by-word "handwritten" reveal, line by line as you scroll
     ======================================================================== */
  const Letter = (() => {
    const lines = $$('#letter .line'), heart = $('#letterHeart'), last = $('#lastLine');
    lines.forEach((ln) => {
      const words = ln.textContent.trim().split(/\s+/);
      ln.textContent = '';
      words.forEach((w, i) => {
        const s = document.createElement('span');
        s.className = 'w'; s.style.setProperty('--i', i);
        s.textContent = w;
        ln.appendChild(s);
        if (i < words.length - 1) ln.appendChild(document.createTextNode(' '));
      });
    });
    let heartT = 0;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || e.target.classList.contains('is-in')) return;
        const ln = e.target; ln.classList.add('is-in');
        if (ln === last) {
          const n = ln.querySelectorAll('.w').length;
          heartT = setTimeout(() => {
            heart.classList.add('is-on');
            const c = center(heart); setTimeout(() => { FX.heartBurst(c.x, c.y, 26); FX.rise(c.x, c.y, 6); }, reduced() ? 0 : 900);
          }, reduced() ? 0 : n * 70 + 900);
        }
      });
    }, { threshold: 0.9, rootMargin: '0px 0px -8% 0px' });
    lines.forEach((l) => io.observe(l));
    function reset() { clearTimeout(heartT); lines.forEach((l) => l.classList.remove('is-in')); heart.classList.remove('is-on'); }
    return { reset };
  })();

  /* ========================================================================
     Little miracle reveal
     ======================================================================== */
  const Miracle = (() => {
    const btn = $('#revealBtn'), art = $('#miracleArt'), box = $('#miracleReveal');
    let emit = 0, active = false, revealed = false;
    function reveal() {
      if (revealed) return; revealed = true;
      btn.classList.add('is-gone');
      art.classList.add('is-lit');
      const c = center(art);
      FX.sparkle(c.x, c.y, 30, 80); FX.heartBurst(c.x, c.y - 30, 16);
      setTimeout(() => {
        btn.hidden = true; box.hidden = false;
        requestAnimationFrame(() => { box.classList.add('is-on'); });
        const r = art.getBoundingClientRect();
        if (r.top < 0 || r.bottom > innerHeight * 0.7) art.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      }, reduced() ? 0 : 700);
      clearInterval(emit);
      emit = setInterval(() => {
        if (!active || document.hidden) return;
        const r = art.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
        FX.rise(r.left + rand(0.2, 0.8) * r.width, r.top + r.height * rand(0.3, 0.9), 1);
        if (Math.random() < 0.6) FX.sparkle(r.left + rand(0, 1) * r.width, r.top + rand(0, 1) * r.height, 2, 10);
      }, 650);
    }
    btn.addEventListener('click', reveal);
    function reset() { revealed = false; clearInterval(emit); btn.hidden = false; btn.classList.remove('is-gone'); art.classList.remove('is-lit'); box.classList.remove('is-on'); box.hidden = true; }
    return { reset, setActive(v) { active = v; } };
  })();

  /* ========================================================================
     Section activity (pause heavy work off-screen) + hero / finale emitters
     ======================================================================== */
  const Sections = (() => {
    const state = { hero: false, finale: false };
    const map = { hero: 'hero', connection: 'globe', miracle: 'miracle', finale: 'finale' };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const id = e.target.id, on = e.isIntersecting;
        if (id === 'hero') state.hero = on;
        if (id === 'connection') Globe.setActive(on);
        if (id === 'miracle') Miracle.setActive(on);
        if (id === 'finale') { state.finale = on; if (on) finaleShow(); }
      });
    }, { threshold: 0.15 });
    Object.keys(map).forEach((id) => io.observe($('#' + id)));

    // hero: hearts float up around the portrait
    const portrait = $('#portrait');
    setInterval(() => {
      if (!state.hero || document.hidden || reduced()) return;
      const c = center(portrait), r = portrait.offsetWidth / 2, a = rand(0, Math.PI * 2), d = r * rand(0.85, 1.1);
      FX.rise(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, 1);
      if (Math.random() < 0.5) FX.sparkle(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, 2, 10);
    }, 520);

    // finale: fireworks + heart confetti while visible
    let fwT = 0, cfT = 0, firstShow = true;
    function finaleShow() {
      if (reduced() || fwT) return;
      if (firstShow) { firstShow = false; setTimeout(() => { if (state.finale) { FX.heartBurst(innerWidth / 2, innerHeight * 0.4, 30); FX.firework(innerWidth / 2, innerHeight * 0.3, { heart: true, power: 210 }); } }, 600); }
      fwT = setInterval(() => {
        if (!state.finale || document.hidden) { return; }
        const x = rand(0.15, 0.85) * innerWidth, y = rand(0.15, 0.5) * innerHeight;
        Math.random() < 0.6 ? FX.launch(x, y) : FX.firework(x, y);
      }, isMobile() ? 1500 : 1000);
      cfT = setInterval(() => { if (state.finale && !document.hidden) FX.confetti(isMobile() ? 2 : 3); }, 650);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInterval(fwT); clearInterval(cfT); fwT = cfT = 0; } else if (state.finale) finaleShow(); });
    // stop timers when finale leaves view
    new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) { clearInterval(fwT); clearInterval(cfT); fwT = cfT = 0; } }), { threshold: 0 }).observe($('#finale'));
  })();

  /* ========================================================================
     Buttons: ripple + sparkle click effect
     ======================================================================== */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.btn');
    if (!b) return;
    const r = b.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2;
    const rp = document.createElement('span');
    rp.className = 'ripple';
    const x = e.detail === 0 ? r.width / 2 : e.clientX - r.left, y = e.detail === 0 ? r.height / 2 : e.clientY - r.top;
    rp.style.cssText = `width:${size}px;height:${size}px;left:${x - size / 2}px;top:${y - size / 2}px`;
    b.appendChild(rp); setTimeout(() => rp.remove(), 800);
    FX.sparkle(r.left + x, r.top + y, 10, 10);
  });

  /* ========================================================================
     Flow — loader → intro → opening cinematic → experience → replay
     ======================================================================== */
  const Flow = (() => {
    const loader = $('#loader'), intro = $('#intro'), exp = $('#experience');
    const openBtn = $('#openBtn'), skipIntro = $('#skipIntroBtn'), skipOpening = $('#skipOpeningBtn'), replayBtn = $('#replayBtn');
    let timers = [], started = false;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    // 1) elegant loader, then fade into the intro
    const minLoad = new Promise((r) => setTimeout(r, reduced() ? 200 : 1500));
    const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })));
    Promise.all([minLoad, loaded, document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve()]).then(() => {
      loader.classList.add('is-done'); intro.classList.add('is-ready');
      setTimeout(() => { loader.hidden = true; }, 1100);
    });
    // safety: never leave the loader up
    setTimeout(() => { loader.classList.add('is-done'); intro.classList.add('is-ready'); }, 6000);

    // 2) opening
    function begin(skip) {
      if (started) return; started = true;
      Music.play(); // inside the user's tap → allowed by browsers
      if (skip || reduced()) { finish(); return; }
      intro.classList.add('is-opening');
      const cx = innerWidth / 2, cy = innerHeight / 2;
      later(() => FX.rise(cx, cy + 40, 10), 300);
      later(() => { FX.sparkle(cx, cy, 36, 80); FX.firework(cx, cy - 60, { heart: true, power: 200 }); }, 900);
      later(() => { FX.heartBurst(cx, cy, 30); FX.launch(cx * 0.5, cy * 0.7); FX.launch(cx * 1.5, cy * 0.7); }, 1800);
      later(() => FX.heartBurst(cx, cy, 26), 2500);
      later(finish, 3500);
    }
    // 3) reveal the experience
    function finish() {
      clearTimers();
      if (exp.hidden === false && intro.classList.contains('is-leaving')) return;
      exp.hidden = false;
      window.scrollTo(0, 0);
      document.body.classList.remove('is-locked');
      intro.classList.add('is-leaving');
      Music.show();
      later(() => Music.peek(), 1800);
    }
    openBtn.addEventListener('click', () => begin(false));
    skipIntro.addEventListener('click', () => begin(true));
    skipOpening.addEventListener('click', () => { started = true; finish(); });

    // 4) replay — back to the very beginning; music keeps playing, position is kept
    replayBtn.addEventListener('click', () => {
      Lightbox.close();
      const prev = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      clearTimers(); Letter.reset(); Miracle.reset(); Reveals.reset();
      exp.hidden = true; window.scrollTo(0, 0);
      document.body.classList.add('is-locked');
      intro.classList.remove('is-leaving', 'is-opening', 'is-ready');
      void intro.offsetWidth; // restart the intro animations
      intro.classList.add('is-ready');
      started = false;
      document.documentElement.style.scrollBehavior = prev;
    });
  })();
})();
