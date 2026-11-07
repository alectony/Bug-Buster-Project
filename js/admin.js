/* Admin pages. body[data-page] is "dashboard", "lessons" or "users". */
(function () {
  'use strict';
  const PG = window.PG;
  const page = document.body.dataset.page;
  if (!page) return;
  const $ = (id) => document.getElementById(id);
  const td = (child) => { const c = PG.el('td'); if (child instanceof Node) c.appendChild(child); else c.textContent = child; return c; };
  const btn = (label, cls, fn, aria) => {
    const b = PG.el('button', 'px-btn px-btn--small ' + cls, label);
    b.type = 'button';
    if (aria) b.setAttribute('aria-label', aria);
    b.addEventListener('click', fn);
    return b;
  };

  /* ---------- dashboard ---------- */
  function dashboard() {
    PG.api('/api/admin/stats.php').then((s) => {
      const k = $('kpis');
      k.textContent = '';
      [['Learners', s.users], ['New this week', s.new_users_7d], ['Levels', s.lessons], ['Completions', s.completions], ['Admins', s.admins], ['Suspended', s.suspended]]
        .forEach(([label, v]) => {
          const c = PG.el('div', 'px-card kpi');
          c.appendChild(PG.el('strong', null, String(v)));
          c.appendChild(PG.el('span', 'muted', label));
          k.appendChild(c);
        });
      const list = $('per-level');
      list.textContent = '';
      const max = Math.max(1, ...s.per_lesson.map((l) => l.done));
      s.per_lesson.forEach((l, i) => {
        const row = PG.el('div');
        const lab = PG.el('label', 'b-label');
        const id = 'bar-' + i;
        lab.htmlFor = id;
        lab.appendChild(PG.el('span', null, (i + 1) + '. ' + l.title));
        lab.appendChild(PG.el('span', null, l.done + (l.done === 1 ? ' completion' : ' completions')));
        const p = PG.el('progress', 'px-bar');
        p.id = id; p.max = max; p.value = l.done;
        row.appendChild(lab); row.appendChild(p);
        list.appendChild(row);
      });
      if (!s.per_lesson.length) list.appendChild(PG.el('p', 'muted', 'No levels yet. Add one on the Levels page.'));
    }).catch((e) => PG.toast(e.message, true));
  }

  /* ---------- levels ---------- */
  let data = { chapters: [], lessons: [] };
  const F = {};

  function fillForm(l) {
    $('form-title').textContent = l ? 'Edit level' : 'New level';
    F.id.value = l ? l.id : '';
    F.chapter.value = l ? l.chapter_id : (data.chapters[0] ? data.chapters[0].id : '');
    F.title.value = l ? l.title : '';
    F.concept.value = l ? (l.concept || '') : '';
    F.goals.value = l ? (l.goals || []).join('\n') : '';
    F.starter.value = l ? (l.starter_code || '') : '';
    F.expected.value = l ? (l.expected_output || '') : '';
    const rules = (l && l.rules) || {};
    F.must.value = (rules.mustContain || []).join('\n');
    F.hint.value = rules.hint || '';
    F.seeds.value = l ? l.reward_seeds : 15;
    F.xp.value = l ? l.reward_xp : 40;
    F.order.value = l ? l.sort_order : (data.lessons.length + 1);
    if (l) F.title.focus();
  }

  function renderLessons() {
    F.chapter.textContent = '';
    data.chapters.forEach((c) => { const o = PG.el('option', null, c.title); o.value = c.id; F.chapter.appendChild(o); });
    const host = $('chapter-list');
    host.textContent = '';
    data.chapters.forEach((c) => {
      const block = PG.el('section', 'chapter-block');
      const head = PG.el('div', 'row row--between');
      const h = PG.el('h2', null, c.title);
      head.appendChild(h);
      const status = PG.el('span', 'px-chip ' + (c.is_published ? 'px-chip--done' : 'px-chip--draft'), c.is_published ? 'Published' : 'Draft');
      const toggle = btn(c.is_published ? 'Move to draft' : 'Publish', 'px-btn--ghost', async () => {
        try { await PG.api('/api/admin/lessons.php', { body: { action: 'chapter_publish', chapter_id: c.id, is_published: !c.is_published } }); PG.toast(c.is_published ? 'Chapter is now a draft' : 'Chapter published'); load(); }
        catch (e) { PG.toast(e.message, true); }
      }, (c.is_published ? 'Move to draft: ' : 'Publish: ') + c.title);
      const right = PG.el('div', 'row'); right.appendChild(status); right.appendChild(toggle);
      head.appendChild(right);
      block.appendChild(head);

      const wrap = PG.el('div', 'table-wrap');
      const table = PG.el('table', 'px-table');
      const thead = PG.el('thead'); const hr = PG.el('tr');
      ['#', 'Level', 'Concept', 'Rewards', 'Actions'].forEach((t) => hr.appendChild(PG.el('th', null, t)));
      thead.appendChild(hr); table.appendChild(thead);
      const tb = PG.el('tbody');
      data.lessons.filter((l) => l.chapter_id === c.id).forEach((l) => {
        const tr = PG.el('tr');
        tr.appendChild(td(String(l.sort_order)));
        tr.appendChild(td(l.title));
        tr.appendChild(td(l.concept || ''));
        tr.appendChild(td(l.reward_seeds + ' seeds, ' + l.reward_xp + ' XP'));
        const act = PG.el('div', 'actions');
        act.appendChild(btn('Edit', 'px-btn--ghost', () => fillForm(l), 'Edit ' + l.title));
        act.appendChild(btn('Delete', 'px-btn--danger', async () => {
          if (!confirm('Delete "' + l.title + '"? Learner progress for it is deleted too.')) return;
          try { await PG.api('/api/admin/lessons.php', { body: { action: 'delete', id: l.id } }); PG.toast('Level deleted'); load(); }
          catch (e) { PG.toast(e.message, true); }
        }, 'Delete ' + l.title));
        tr.appendChild(td(act));
        tb.appendChild(tr);
      });
      if (!tb.children.length) { const tr = PG.el('tr'); const c1 = td('No levels in this chapter yet.'); c1.colSpan = 5; tr.appendChild(c1); tb.appendChild(tr); }
      table.appendChild(tb); wrap.appendChild(table); block.appendChild(wrap);
      host.appendChild(block);
    });
    if (!data.chapters.length) host.appendChild(PG.el('p', 'muted', 'Create a chapter first, then add levels to it.'));
  }

  function load() {
    return PG.api('/api/admin/lessons.php').then((d) => { data = d; renderLessons(); }).catch((e) => PG.toast(e.message, true));
  }

  function lessonsPage() {
    ['id', 'chapter', 'title', 'concept', 'goals', 'starter', 'expected', 'must', 'hint', 'seeds', 'xp', 'order'].forEach((k) => { F[k] = $('f-' + k); });
    const lines = (v) => v.split('\n').map((s) => s.trim()).filter(Boolean);
    $('lesson-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        action: 'save', id: F.id.value ? parseInt(F.id.value, 10) : undefined,
        chapter_id: parseInt(F.chapter.value, 10), title: F.title.value, concept: F.concept.value,
        goals: lines(F.goals.value), starter_code: F.starter.value, expected_output: F.expected.value,
        must_contain: lines(F.must.value), hint: F.hint.value,
        reward_seeds: parseInt(F.seeds.value, 10), reward_xp: parseInt(F.xp.value, 10), sort_order: parseInt(F.order.value, 10),
      };
      try { await PG.api('/api/admin/lessons.php', { body }); PG.toast('Level saved'); fillForm(null); load(); }
      catch (err) { PG.toast(err.message, true); }
    });
    $('btn-new').addEventListener('click', () => fillForm(null));
    $('chapter-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = { action: 'chapter_save', title: $('c-title').value, slug: $('c-slug').value, blurb: $('c-blurb').value, sort_order: data.chapters.length + 1 };
      try { await PG.api('/api/admin/lessons.php', { body }); PG.toast('Chapter added as a published chapter'); e.target.reset(); load(); }
      catch (err) { PG.toast(err.message, true); }
    });
    load().then(() => fillForm(null));
  }

  /* ---------- users ---------- */
  let users = [], meId = '';

  async function act(u, action, confirmText) {
    if (confirmText && !confirm(confirmText)) return;
    try { await PG.api('/api/admin/users.php', { body: { id: u.id, action } }); PG.toast('Done'); loadUsers(); }
    catch (e) { PG.toast(e.message, true); }
  }

  function renderUsers() {
    const term = $('user-search').value.trim().toLowerCase();
    const tb = $('user-rows');
    tb.textContent = '';
    const shown = users.filter((u) => u.username.toLowerCase().includes(term));
    shown.forEach((u) => {
      const tr = PG.el('tr');
      tr.appendChild(td(u.username + (u.id === meId ? ' (you)' : '')));
      tr.appendChild(td(PG.el('span', 'px-chip ' + (u.role === 'admin' ? 'px-chip--draft' : ''), u.role)));
      tr.appendChild(td(u.xp + ' XP / ' + u.seeds + ' seeds'));
      tr.appendChild(td(u.is_suspended ? PG.el('span', 'px-chip px-chip--locked', 'Suspended') : 'Active'));
      tr.appendChild(td(new Date(u.created_at).toLocaleDateString()));
      const a = PG.el('div', 'actions');
      if (u.role === 'user') a.appendChild(btn('Make admin', 'px-btn--ghost', () => act(u, 'promote', 'Make ' + u.username + ' an admin?'), 'Make ' + u.username + ' an admin'));
      else if (u.id !== meId) a.appendChild(btn('Make user', 'px-btn--ghost', () => act(u, 'demote'), 'Make ' + u.username + ' a regular user'));
      if (u.id !== meId) {
        if (u.is_suspended) a.appendChild(btn('Unsuspend', 'px-btn--ghost', () => act(u, 'unsuspend'), 'Unsuspend ' + u.username));
        else a.appendChild(btn('Suspend', 'px-btn--ghost', () => act(u, 'suspend', 'Suspend ' + u.username + '? They will not be able to log in.'), 'Suspend ' + u.username));
      }
      a.appendChild(btn('Reset progress', 'px-btn--danger', () => act(u, 'reset', 'Reset all progress, seeds, XP and garden for ' + u.username + '? This cannot be undone.'), 'Reset progress for ' + u.username));
      tr.appendChild(td(a));
      tb.appendChild(tr);
    });
    $('user-count').textContent = shown.length + (shown.length === 1 ? ' person' : ' people');
  }

  function loadUsers() {
    return PG.api('/api/admin/users.php').then((d) => { users = d.users; meId = d.me; renderUsers(); }).catch((e) => PG.toast(e.message, true));
  }

  function usersPage() {
    $('user-search').addEventListener('input', renderUsers);
    loadUsers();
  }

  PG.ready.then((me) => {
    if (!me) return;
    if (page === 'dashboard') dashboard();
    else if (page === 'lessons') lessonsPage();
    else if (page === 'users') usersPage();
  });
})();
