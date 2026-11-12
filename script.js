// Debounce Search — github.com/veraetogrex-portfolio · zero dependencies
// One search box, two strategies. Top: every keystroke fires a request.
// Bottom: keystrokes collect in a drop; 300 ms of quiet and the drop leaves as ONE request.

const root   = document.querySelector('#search');
const canvas = root.querySelector('.db-canvas');
const input  = root.querySelector('.db-in');
const mirror = root.querySelector('.db-mirror');
const rows   = [...root.querySelectorAll('.db-row')].map(row => ({
  server: row.querySelector('.db-server'), count: row.querySelector('.db-server b'),
  load: row.querySelector('.db-load i'), note: row.querySelector('.db-note'), n: 0,
}));
const score  = root.querySelector('.db-score');

const WAIT = 300;                                        // the debounce delay, ms
const W = 1180, H = 500, ctx = canvas.getContext('2d');
canvas.width = W * 2; canvas.height = H * 2; ctx.scale(2, 2);
const Y = [125, 375], FROM = 452, DROP = 560, SERVER = 880, SPEED = 1050, C = { raw: '#ff7a45', deb: '#3fe0d0', key: '#a69bff' };

// the debounce itself: restart the timer on every keystroke, fire once it runs out
function debounce(fn, ms) {
  let id;
  const d = (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); };
  d.cancel = () => clearTimeout(id);
  return d;
}

let balls, chips, sparks, drop, last;
const fireOnce = debounce(q => launchDrop(q), WAIT);

function reset() {
  fireOnce.cancel();
  balls = []; chips = []; sparks = []; drop = null;
  input.value = ''; mirror.value = '';
  rows.forEach(r => { r.n = 0; paint(r); r.note.textContent = '—'; r.note.className = 'db-note'; r.server.classList.remove('is-hot', 'is-hit'); });
  root.classList.remove('is-done');
}

function paint(r) { r.count.textContent = r.n; r.load.style.width = Math.min(100, r.n * 11) + '%'; }
const bump = el => { el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); };

// every keystroke: top lane fires now, bottom lane drops the key into the waiting drop
input.addEventListener('input', () => {
  const q = input.value, now = performance.now();
  mirror.value = q;
  if (root.classList.contains('is-done')) root.classList.remove('is-done');
  balls.push({ lane: 0, x: FROM, y: Y[0], q, c: C.raw });
  if (!drop || drop.s !== 'wait') drop = { s: 'wait', r: 10, x: DROP, y: Y[1], t0: now, n: 0 };
  chips.push({ ch: q.slice(-1) || '⌫', x: FROM + 14, y: Y[1] - 4, t0: now });
  drop.t0 = now;                                         // the timer restarts: draw it from zero again
  rows[1].note.textContent = 'waiting…'; rows[1].note.className = 'db-note';
  fireOnce(q);
});

function launchDrop(q) {
  if (!drop) return;
  drop.s = 'morph'; drop.tm = performance.now(); drop.q = q;
}

function arrive(b, now) {
  const r = rows[b.lane];
  r.n++; paint(r); bump(r.count);
  if (b.lane === 0) {
    r.server.classList.toggle('is-hot', r.n >= 5);
    if (r.n >= 5) { r.server.classList.remove('is-shake'); void r.server.offsetWidth; r.server.classList.add('is-shake'); }
    r.note.textContent = `searching “${b.q}”`;
  } else {
    r.server.classList.add('is-hit');
    r.note.textContent = `12 results for “${b.q}”`; r.note.className = 'db-note is-hit';
    rows[0].note.textContent = `${rows[0].n - 1} answers thrown away`;
    for (let k = 0; k < 26; k++) {                       // the one request lands: a burst
      const a = Math.random() * Math.PI * 2, v = 160 + Math.random() * 320;
      sparks.push({ x: SERVER, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: now, life: 500 + Math.random() * 400 });
    }
    score.innerHTML = `<span class="r">${rows[0].n}</span> requests<span class="a">→</span><span class="g">${r.n}</span>`;
    root.classList.add('is-done');
  }
}

function step(now) {
  const dt = Math.min(40, now - last) / 1000; last = now;

  for (const b of balls) { b.x += SPEED * dt; if (b.x >= SERVER && !b.done) { b.done = true; arrive(b, now); } }
  balls = balls.filter(b => !b.done);

  for (const c of chips) {                                // a key slides into the drop, the drop swells
    const p = Math.min(1, (now - c.t0) / 220);
    c.p = p; if (p === 1 && !c.in) { c.in = true; if (drop) { drop.n++; drop.r = 12 + Math.min(8, drop.n) * 2.4; } }
  }
  chips = chips.filter(c => !c.in);

  if (drop && drop.s === 'morph' && now - drop.tm > 240) {  // the drop stretches, then leaves as one ball
    balls.push({ lane: 1, x: DROP, y: Y[1], q: drop.q, c: C.deb, r: 15 });
    drop = null;
  }
  for (const s of sparks) { s.vx *= .92; s.vy *= .92; s.x += s.vx * dt; s.y += s.vy * dt; }
  sparks = sparks.filter(s => now - s.t0 < s.life);

  draw(now);
  requestAnimationFrame(step);
}

// ── drawing ──────────────────────────────────────────
function ball(x, y, r, color, glow = 18) {
  ctx.shadowColor = color; ctx.shadowBlur = glow;
  const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
  g.addColorStop(0, '#fff'); g.addColorStop(.35, color); g.addColorStop(1, color);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
}

function draw(now) {
  ctx.clearRect(0, 0, W, H);
  ctx.lineWidth = 2; ctx.setLineDash([4, 10]); ctx.lineCap = 'round';
  [[0, 'rgba(255,122,69,.35)'], [1, 'rgba(63,224,208,.35)']].forEach(([k, c]) => {
    ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(FROM + 16, Y[k]); ctx.lineTo(SERVER - 12, Y[k]); ctx.stroke();
  });
  ctx.setLineDash([]);

  chips.forEach(c => {                                   // keystroke chips on the bottom lane
    const x = c.x + (DROP - c.x) * c.p, y = c.y - Math.sin(Math.PI * c.p) * 26;
    ctx.globalAlpha = 1 - c.p * .6;
    ctx.fillStyle = '#1a1c27'; ctx.strokeStyle = C.key; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x - 13, y - 15, 26, 30, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2f3f7'; ctx.font = '600 17px ' + mono(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.ch === ' ' ? '␣' : c.ch, x, y + 1);
    ctx.globalAlpha = 1;
  });

  if (drop) {                                            // the waiting drop with its 300 ms timer ring
    const age = now - drop.t0, p = Math.min(1, age / WAIT);
    let rx = drop.r, ry = drop.r, x = drop.x;
    if (drop.s === 'morph') { const m = Math.min(1, (now - drop.tm) / 240); rx = drop.r * (1 + .5 * m); ry = drop.r * (1 - .35 * m); x += 14 * m; }
    else { const wob = Math.sin(now / 90) * 1.2; rx += wob; ry -= wob; }
    ctx.shadowColor = C.deb; ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(63,224,208,.22)'; ctx.strokeStyle = C.deb; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, drop.y, rx, ry, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    if (drop.s === 'wait') {
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(drop.x, drop.y, drop.r + 14, 0, 7); ctx.stroke();
      ctx.strokeStyle = C.deb; ctx.beginPath(); ctx.arc(drop.x, drop.y, drop.r + 14, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#a4a7b6'; ctx.font = '500 14px ' + mono(); ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(p * WAIT)} ms`, drop.x, drop.y + drop.r + 34);
    }
  }

  balls.forEach(b => ball(b.x, b.y, b.r || 12, b.c, 22));

  sparks.forEach(s => {
    const a = 1 - (now - s.t0) / s.life;
    ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = C.deb;
    ctx.beginPath(); ctx.arc(s.x, s.y, 2.5 + a * 2, 0, 7); ctx.fill();
  });
  ctx.globalAlpha = 1;
}
const mono = () => getComputedStyle(root).getPropertyValue('--mono');

// empty the box and roll the counters back (used when a demo loops)
function clear() {
  fireOnce.cancel(); drop = null; chips = []; balls = [];
  const from = rows.map(r => r.n), t0 = performance.now();
  root.classList.remove('is-done');
  const roll = now => {
    const p = Math.min(1, (now - t0) / 420);
    rows.forEach((r, k) => { r.n = Math.round(from[k] * (1 - p)); paint(r); });
    const len = Math.round(input.dataset.len * (1 - p)); input.value = input.value.slice(0, len); mirror.value = input.value;
    if (p < 1) requestAnimationFrame(roll);
    else { rows.forEach(r => { r.note.textContent = '—'; r.note.className = 'db-note'; r.server.classList.remove('is-hot', 'is-hit'); }); }
  };
  input.dataset.len = input.value.length;
  requestAnimationFrame(roll);
}

reset();
last = performance.now();
requestAnimationFrame(step);
root.debounce = { reset, clear, input };                 // for scripted demos
