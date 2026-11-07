/* Shared helpers: API wrapper, pixel sprites, DOM and toast helpers. */
(function () {
  'use strict';
  const PG = (window.PG = window.PG || {});

  /* 8x8 pixel sprites. Letters map to .c-* classes in pixel.css; "." is empty. */
  const SPRITES = {
    sunflower: ['..yyyy..', '.yyssyy.', '.yyssyy.', '..yyyy..', '...gg...', '.g.gg.g.', '..gggg..', '...gg...'],
    tulip: ['..r..r..', '..rrrr..', '..rrrr..', '...rr...', '...gg...', '.g.gg...', '..gggg..', '...gg...'],
    mushroom: ['..rrrr..', '.rwrrwr.', 'rrrrrrrr', 'rwrrrrwr', '..wwww..', '..wwww..', '..wwww..', '........'],
    cactus: ['...ff...', '...ff...', '.f.ff.f.', '.f.ff.f.', '.ffffff.', '...ff...', '...ff...', '...ff...'],
    can: ['......bb', '.bbbb.bb', 'bbbbbbb.', 'bbbbbb..', 'bbbbbb..', 'bbbbbb..', '.bbbbb..', '........'],
    fence: ['s..s..s.', 'sssssss.', 's..s..s.', 's..s..s.', 'sssssss.', 's..s..s.', 's..s..s.', '........'],
    pond: ['........', '..bbbb..', '.bbwbbb.', 'bbbbbbbb', 'bbbbbwbb', '.bbbbbb.', '..bbbb..', '........'],
    lantern: ['...yy...', '..tttt..', '..tyyt..', '..tyyt..', '..tttt..', '...ss...', '...ss...', '..ssss..'],
    seed: ['........', '........', '...ss...', '..ssss..', '..ssss..', '...ss...', '........', '........'],
    star: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '..yyyy..', '.yy..yy.', '.y....y.'],
    leaf: ['......gg', '....gggg', '...ggfgg', '..ggfgg.', '.ggfgg..', 'gfgg....', 'fg......', 'f.......'],
    flame: ['...r....', '...rr...', '..rrry..', '.rrryyr.', '.rryyyr.', '.rryyyr.', '..rrrr..', '........'],
    trophy: ['yyyyyyyy', 'y.yyyy.y', 'y.yyyy.y', '.yyyyyy.', '..yyyy..', '...yy...', '..yyyy..', '.yyyyyy.'],
  };

  const TURTLE = [
    '<rect class="c-o" x="2" y="0" width="10" height="1"/>',
    '<rect class="c-f" x="3" y="1" width="8" height="1"/>',
    '<rect class="c-f" x="2" y="2" width="10" height="6"/>',
    '<rect class="c-g" x="4" y="3" width="2" height="2"/>',
    '<rect class="c-g" x="8" y="3" width="2" height="2"/>',
    '<rect class="c-g" x="6" y="5" width="2" height="2"/>',
    '<rect class="c-g" x="12" y="4" width="3" height="3"/>',
    '<rect class="c-o" x="14" y="5" width="1" height="1"/>',
    '<rect class="c-g" x="3" y="8" width="3" height="3"/>',
    '<rect class="c-g" x="9" y="8" width="3" height="3"/>',
    '<rect class="c-g" x="0" y="6" width="2" height="1"/>',
  ].join('');

  PG.SPRITE_NAMES = Object.keys(SPRITES);

  PG.sprite = function (name) {
    const rows = SPRITES[name];
    if (!rows) return '';
    let r = '';
    rows.forEach((row, y) => {
      Array.from(row).forEach((ch, x) => {
        if (ch !== '.') r += '<rect class="c-' + ch + '" x="' + x + '" y="' + y + '" width="1" height="1"/>';
      });
    });
    return '<svg viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' + r + '</svg>';
  };

  PG.turtle = function () {
    return '<svg viewBox="0 0 16 12" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' + TURTLE + '</svg>';
  };

  PG.hydrate = function (root) {
    (root || document).querySelectorAll('[data-sprite]').forEach((el) => {
      el.innerHTML = el.dataset.sprite === 'turtle' ? PG.turtle() : PG.sprite(el.dataset.sprite);
    });
  };
  document.addEventListener('DOMContentLoaded', () => PG.hydrate());

  /* Make an element with text (textContent only, so user data is never parsed as HTML). */
  PG.el = function (tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  };

  PG.spriteEl = function (name, extraClass) {
    const s = PG.el('span', 'spr' + (extraClass ? ' ' + extraClass : ''));
    s.innerHTML = PG.sprite(name);
    return s;
  };

  PG.api = async function (path, opts) {
    opts = opts || {};
    const init = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opts.body !== undefined) {
      init.method = opts.method || 'POST';
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    let res;
    try { res = await fetch(path, init); }
    catch (e) { const err = new Error('Could not reach the server. Check your connection.'); err.status = 0; throw err; }
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (res.status === 401 && !opts.noRedirect) {
      if (!location.pathname.endsWith('/login.html')) location.href = '/login.html';
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || 'Something went wrong');
      err.status = res.status;
      throw err;
    }
    return data;
  };

  let toastTimer = null;
  PG.toast = function (msg, isError) {
    let t = document.getElementById('toast');
    if (!t) {
      t = PG.el('div', 'px-toast');
      t.id = 'toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'px-toast' + (isError ? ' px-toast--error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 3500);
  };

  PG.RANKS = [
    { xp: 0, name: 'Seedling' }, { xp: 100, name: 'Sprout' }, { xp: 250, name: 'Gardener' },
    { xp: 500, name: 'Botanist' }, { xp: 1000, name: 'Master gardener' },
  ];
  PG.rankFor = function (xp) {
    let i = 0;
    PG.RANKS.forEach((r, k) => { if (xp >= r.xp) i = k; });
    return { rank: PG.RANKS[i], next: PG.RANKS[i + 1] || null };
  };

  PG.setStats = function (s) {
    Object.keys(s).forEach((k) => {
      document.querySelectorAll('[data-bind="' + k + '"]').forEach((el) => { el.textContent = s[k]; });
    });
  };
})();
