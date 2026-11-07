/* Login and register forms. */
(function () {
  'use strict';
  const PG = window.PG;
  const form = document.getElementById('auth-form');
  if (!form) return;
  const errBox = document.getElementById('form-error');
  const mode = form.dataset.mode; // "login" or "register"
  const btn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.textContent = '';
    const body = {};
    new FormData(form).forEach((v, k) => { body[k] = String(v); });

    if (mode === 'register') {
      if (body.password !== body.confirm) { errBox.textContent = 'The two passwords do not match.'; return; }
      delete body.confirm;
    }

    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'One moment...';
    try {
      const res = await PG.api('/api/' + mode + '.php', { body, noRedirect: true });
      location.href = res.role === 'admin' ? '/admin/dashboard.html' : '/adventure.html';
    } catch (err) {
      errBox.textContent = err.message;
      btn.disabled = false;
      btn.textContent = label;
    }
  });
})();
