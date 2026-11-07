/* Toolbox: searchable Python topics, unlocked by finishing levels. */
(function () {
  'use strict';
  const PG = window.PG;
  const list = document.getElementById('topics');
  if (!list) return;
  const search = document.getElementById('search');
  const count = document.getElementById('topic-count');
  let topics = [];

  function render() {
    const term = search.value.trim().toLowerCase();
    list.textContent = '';
    const shown = topics.filter((t) => {
      if (!term) return true;
      const hay = (t.title + ' ' + (t.unlocked ? t.summary + ' ' + t.example_code : '')).toLowerCase();
      return hay.includes(term);
    });
    shown.forEach((t) => {
      const card = PG.el('article', 'px-card topic' + (t.unlocked ? '' : ' is-locked'));
      card.appendChild(PG.el('h2', null, t.title));
      if (t.unlocked) {
        card.appendChild(PG.el('p', null, t.summary || ''));
        const pre = PG.el('pre');
        pre.appendChild(PG.el('code', null, t.example_code || ''));
        pre.tabIndex = 0;
        pre.setAttribute('aria-label', 'Example code for ' + t.title);
        card.appendChild(pre);
      } else {
        const chip = PG.el('span', 'px-chip px-chip--locked', 'Locked');
        card.appendChild(chip);
        card.appendChild(PG.el('p', 'muted', t.unlock_hint));
      }
      list.appendChild(card);
    });
    count.textContent = shown.length === 0 ? 'No topics match "' + search.value + '".' : shown.length + (shown.length === 1 ? ' topic' : ' topics');
  }

  search.addEventListener('input', render);
  PG.ready.then((me) => {
    if (!me) return;
    PG.api('/api/toolbox.php').then((d) => { topics = d.topics; render(); }).catch((e) => PG.toast(e.message, true));
  });
})();
