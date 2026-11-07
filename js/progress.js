/* Progress page: rank, XP bar, streak, concept mastery, milestones. */
(function () {
  'use strict';
  const PG = window.PG;
  const root = document.getElementById('progress-root');
  if (!root) return;
  const $ = (id) => document.getElementById(id);
  const ICON = { lessons_done: 'leaf', xp: 'star', streak: 'flame' };

  function render(d) {
    PG.setStats({ seeds: d.seeds, xp: d.xp, streak: d.streak });
    const r = PG.rankFor(d.xp);
    $('rank-name').textContent = r.rank.name;
    const bar = $('xp-bar');
    if (r.next) {
      bar.max = r.next.xp - r.rank.xp;
      bar.value = d.xp - r.rank.xp;
      $('xp-text').textContent = d.xp + ' XP. ' + (r.next.xp - d.xp) + ' more to reach ' + r.next.name + '.';
    } else {
      bar.max = 1; bar.value = 1;
      $('xp-text').textContent = d.xp + ' XP. You reached the top rank!';
    }
    $('stat-done').textContent = d.lessons_done + ' / ' + d.lessons_total;
    $('stat-streak').textContent = d.streak;
    $('stat-seeds').textContent = d.seeds;

    const m = $('mastery');
    m.textContent = '';
    d.mastery.forEach((c, i) => {
      const row = PG.el('div');
      const id = 'mastery-' + i;
      const lab = PG.el('label', 'm-label');
      lab.htmlFor = id;
      lab.appendChild(PG.el('span', null, c.concept));
      lab.appendChild(PG.el('span', null, c.done + ' / ' + c.total));
      const p = PG.el('progress', 'px-bar px-bar--sun');
      p.id = id; p.max = c.total; p.value = c.done;
      row.appendChild(lab); row.appendChild(p);
      m.appendChild(row);
    });
    if (!d.mastery.length) m.appendChild(PG.el('p', 'muted', 'Finish a level to start filling these bars.'));

    const ms = $('milestones');
    ms.textContent = '';
    d.achievements.forEach((a) => {
      const li = PG.el('li', 'px-card milestone' + (a.earned ? '' : ' is-locked'));
      li.appendChild(PG.spriteEl(ICON[a.rule_key] || 'trophy'));
      const t = PG.el('div');
      t.appendChild(PG.el('h3', null, a.title));
      t.appendChild(PG.el('p', 'muted', a.description + (a.earned ? ' (earned)' : ' (not yet)')));
      li.appendChild(t);
      ms.appendChild(li);
    });
  }

  PG.ready.then((me) => {
    if (!me) return;
    PG.api('/api/progress.php').then(render).catch((e) => PG.toast(e.message, true));
  });
})();
