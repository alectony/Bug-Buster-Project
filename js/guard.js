/* Checks the session on page load, builds the top bar, redirects when needed.
   body[data-role]: "guest" (login/register), "user" (any signed-in person), "admin".
   This is only a convenience: every API endpoint checks the role on the server. */
(function () {
  'use strict';
  const PG = window.PG;
  const need = document.body.dataset.role || 'user';

  const USER_LINKS = [['/adventure.html', 'Adventure'], ['/garden.html', 'Garden'], ['/toolbox.html', 'Toolbox'], ['/progress.html', 'Progress']];
  const ADMIN_LINKS = [['/admin/dashboard.html', 'Dashboard'], ['/admin/lessons.html', 'Levels'], ['/admin/users.html', 'Users']];

  function chip(label, key, spriteName) {
    const c = PG.el('span', 'px-chip');
    c.appendChild(PG.spriteEl(spriteName, 'spr--sm'));
    const v = PG.el('span', null, '0');
    v.dataset.bind = key;
    c.appendChild(v);
    c.title = label;
    c.setAttribute('aria-label', label);
    return c;
  }

  function buildNav(me, isAdminPage) {
    const host = document.getElementById('app-nav');
    if (!host) return;
    const nav = PG.el('header', 'px-nav');
    const inner = PG.el('div', 'container px-nav__inner');

    const brand = PG.el('a', 'px-nav__brand');
    brand.href = isAdminPage ? '/admin/dashboard.html' : '/adventure.html';
    const t = PG.el('span', 'spr spr--turtle');
    t.innerHTML = PG.turtle();
    brand.appendChild(t);
    brand.appendChild(document.createTextNode(isAdminPage ? 'Python Garden admin' : 'Python Garden'));
    inner.appendChild(brand);

    const links = PG.el('nav', 'px-nav__links');
    links.setAttribute('aria-label', 'Main');
    let list = isAdminPage ? ADMIN_LINKS : USER_LINKS;
    if (me.role === 'admin') list = list.concat(isAdminPage ? [['/adventure.html', 'Play']] : [['/admin/dashboard.html', 'Admin']]);
    list.forEach(([href, label]) => {
      const a = PG.el('a', null, label);
      a.href = href;
      if (location.pathname === href || (href === '/adventure.html' && location.pathname === '/level.html')) a.setAttribute('aria-current', 'page');
      links.appendChild(a);
    });
    inner.appendChild(links);

    const stats = PG.el('div', 'px-nav__stats');
    if (!isAdminPage) {
      stats.appendChild(chip('Seeds', 'seeds', 'seed'));
      stats.appendChild(chip('XP', 'xp', 'star'));
      stats.appendChild(chip('Day streak', 'streak', 'flame'));
    }
    const out = PG.el('button', 'px-btn px-btn--ghost px-btn--small', 'Log out');
    out.type = 'button';
    out.addEventListener('click', async () => {
      try { await PG.api('/api/logout.php', { method: 'POST', body: {}, noRedirect: true }); } catch (e) { /* ignore */ }
      location.href = '/login.html';
    });
    stats.appendChild(out);
    inner.appendChild(stats);
    nav.appendChild(inner);
    host.replaceWith(nav);
    PG.setStats({ seeds: me.seeds, xp: me.xp, streak: me.streak });
  }

  PG.ready = PG.api('/api/me.php', { noRedirect: true }).then(
    (me) => {
      PG.me = me;
      if (need === 'guest') { location.replace(me.role === 'admin' ? '/admin/dashboard.html' : '/adventure.html'); return new Promise(() => {}); }
      if (need === 'admin' && me.role !== 'admin') { location.replace('/adventure.html'); return new Promise(() => {}); }
      buildNav(me, need === 'admin');
      return me;
    },
    (err) => {
      if (need === 'guest') return null;
      if (err.status === 401 || err.status === 403) { location.replace('/login.html'); return new Promise(() => {}); }
      PG.toast(err.message, true);
      return null;
    }
  );
})();
