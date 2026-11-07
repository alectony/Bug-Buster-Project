/* My Garden: 12 plots and a seed shop. */
(function () {
  'use strict';
  const PG = window.PG;
  const plotsEl = document.getElementById('plots');
  if (!plotsEl) return;
  const shopEl = document.getElementById('shop');
  const msg = document.getElementById('garden-msg');
  let items = [], plots = {}, seeds = 0, selected = null;

  const byId = (id) => items.find((i) => i.id === id);

  function renderPlots() {
    plotsEl.textContent = '';
    for (let s = 0; s < 12; s++) {
      const filled = plots[s] ? byId(plots[s]) : null;
      if (filled) {
        const d = PG.el('div', 'plot');
        d.setAttribute('role', 'img');
        d.setAttribute('aria-label', 'Plot ' + (s + 1) + ': ' + filled.name);
        d.appendChild(PG.spriteEl(filled.sprite));
        plotsEl.appendChild(d);
      } else {
        const b = PG.el('button', 'plot is-empty');
        b.type = 'button';
        b.setAttribute('aria-label', 'Plot ' + (s + 1) + ', empty');
        b.appendChild(PG.el('span', 'plot-plus', '+'));
        b.addEventListener('click', () => plant(s));
        plotsEl.appendChild(b);
      }
    }
  }

  function renderShop() {
    shopEl.textContent = '';
    items.forEach((it) => {
      const poor = seeds < it.cost_seeds;
      const card = PG.el('div', 'px-card shop-item' + (selected === it.id ? ' is-selected' : '') + (poor ? ' is-poor' : ''));
      card.appendChild(PG.spriteEl(it.sprite));
      const text = PG.el('div');
      text.appendChild(PG.el('h3', null, it.name));
      text.appendChild(PG.el('p', 'muted', it.cost_seeds + ' seeds · ' + it.kind));
      card.appendChild(text);
      const b = PG.el('button', 'px-btn px-btn--small ' + (selected === it.id ? 'px-btn--sun' : 'px-btn--ghost'), selected === it.id ? 'Chosen' : 'Choose');
      b.type = 'button';
      b.setAttribute('aria-pressed', selected === it.id ? 'true' : 'false');
      b.setAttribute('aria-label', (selected === it.id ? 'Chosen: ' : 'Choose ') + it.name);
      b.disabled = poor;
      b.addEventListener('click', () => { selected = selected === it.id ? null : it.id; hint(); renderShop(); });
      card.appendChild(b);
      shopEl.appendChild(card);
    });
  }

  function hint() {
    const it = selected ? byId(selected) : null;
    msg.textContent = it ? 'Now pick an empty plot to plant the ' + it.name.toLowerCase() + '.' : 'Choose something from the shop, then tap an empty plot.';
  }

  async function plant(slot) {
    if (!selected) { PG.toast('Choose something from the shop first.', true); return; }
    const it = byId(selected);
    try {
      const r = await PG.api('/api/garden.php', { body: { item_id: it.id, slot } });
      plots[slot] = it.id;
      seeds = r.seeds;
      PG.setStats({ seeds });
      if (seeds < it.cost_seeds) selected = null;
      renderPlots(); renderShop(); hint();
      PG.toast('Planted: ' + it.name);
    } catch (e) { PG.toast(e.message, true); }
  }

  PG.ready.then((me) => {
    if (!me) return;
    PG.api('/api/garden.php').then((d) => {
      items = d.items; seeds = d.seeds;
      d.plots.forEach((p) => { plots[p.slot] = p.item_id; });
      renderPlots(); renderShop(); hint();
    }).catch((e) => PG.toast(e.message, true));
  });
})();
