/* Adventure map: one dashed trail per chapter, nodes for each level. */
(function () {
  'use strict';
  const PG = window.PG;
  const host = document.getElementById('chapters');
  if (!host) return;
  const NS = 'http://www.w3.org/2000/svg';
  const W = 400, STEP = 130, TOP = 70, R = 36;

  function svgEl(tag, attrs, cls) {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k]));
    if (cls) e.setAttribute('class', cls);
    return e;
  }

  function trail(ch) {
    const n = ch.lessons.length;
    const H = TOP + (n - 1) * STEP + 100;
    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': ch.title + ' levels' }, 'map-svg');
    const pts = ch.lessons.map((_, i) => ({ x: Math.round(W / 2 + 110 * Math.sin(i * 1.35)), y: TOP + i * STEP }));
    if (n > 1) {
      let d = 'M' + pts[0].x + ' ' + pts[0].y;
      for (let i = 1; i < n; i++) {
        const a = pts[i - 1], b = pts[i];
        d += ' C' + a.x + ' ' + (a.y + 65) + ' ' + b.x + ' ' + (b.y - 65) + ' ' + b.x + ' ' + b.y;
      }
      svg.appendChild(svgEl('path', { d }, 'map-path'));
    }
    ch.lessons.forEach((l, i) => {
      const p = pts[i];
      const g = svgEl('g', {}, 'px-node is-' + l.status);
      const label = 'Level ' + (i + 1) + ': ' + l.title;
      let inner = g;
      if (l.status === 'locked') {
        g.setAttribute('role', 'img');
        g.setAttribute('aria-label', label + ', locked');
      } else {
        inner = svgEl('a', { href: '/level.html?id=' + l.id, 'aria-label': label + (l.status === 'done' ? ', completed. Replay' : ', open. Start') });
        g.appendChild(inner);
      }
      inner.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: R }));
      if (l.status === 'done') {
        inner.appendChild(svgEl('path', { d: 'M' + (p.x - 13) + ' ' + p.y + ' l9 10 l17 -20' }, 'node-mark'));
      } else if (l.status === 'locked') {
        inner.appendChild(svgEl('rect', { x: p.x - 11, y: p.y - 2, width: 22, height: 16 }, 'node-lock'));
        inner.appendChild(svgEl('path', { d: 'M' + (p.x - 6) + ' ' + (p.y - 2) + ' v-6 h12 v6' }, 'node-mark'));
      } else {
        const t = svgEl('text', { x: p.x, y: p.y }, 'node-num');
        t.textContent = String(i + 1);
        inner.appendChild(t);
      }
      const name = l.title.length > 22 ? l.title.slice(0, 21) + '…' : l.title;
      const lt = svgEl('text', { x: p.x, y: p.y + R + 24 }, 'node-label');
      lt.textContent = name;
      inner.appendChild(lt);
      svg.appendChild(g);
    });
    return svg;
  }

  function render(data) {
    PG.setStats(data.me);
    host.textContent = '';
    data.chapters.forEach((ch) => {
      const card = PG.el('section', 'px-card map-card');
      const done = ch.lessons.filter((l) => l.status === 'done').length;
      const head = PG.el('div', 'map-card__head');
      head.appendChild(PG.el('h2', null, ch.title));
      head.appendChild(PG.el('p', 'muted', (ch.blurb ? ch.blurb + ' ' : '') + done + ' of ' + ch.lessons.length + ' levels done.'));
      card.appendChild(head);
      const wrap = PG.el('div', 'map-wrap');
      if (ch.lessons.length) wrap.appendChild(trail(ch));
      else wrap.appendChild(PG.el('p', 'muted', 'Levels for this chapter are coming soon.'));
      card.appendChild(wrap);
      host.appendChild(card);
    });
    if (!data.chapters.length) host.appendChild(PG.el('p', 'px-card', 'No chapters are published yet. Check back soon.'));

    const say = document.getElementById('sprout-say');
    const go = document.getElementById('sprout-go');
    if (data.next) {
      say.textContent = 'Next up: ' + data.next.title + '. Ready to plant some code?';
      go.href = '/level.html?id=' + data.next.id;
      go.classList.remove('is-hidden');
    } else {
      say.textContent = 'You finished every level! More are on the way. Visit your garden to celebrate.';
      go.href = '/garden.html';
      go.textContent = 'Go to my garden';
      go.classList.remove('is-hidden');
    }
  }

  PG.ready.then((me) => {
    if (!me) return;
    PG.api('/api/lessons.php').then(render).catch((e) => PG.toast(e.message, true));
  });
})();
