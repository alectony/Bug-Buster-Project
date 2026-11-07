/* Level page: loads a level, runs the code, checks it, saves progress. */
(function () {
  'use strict';
  const PG = window.PG;
  const $ = (id) => document.getElementById(id);
  const code = $('code');
  if (!code) return;

  const gutter = $('gutter'), out = $('console'), scene = $('scene'), win = $('win');
  const btnRun = $('btn-run'), btnCheck = $('btn-check'), btnHint = $('btn-hint'), btnReset = $('btn-reset');
  const hintBox = $('hint');
  const lessonId = parseInt(new URLSearchParams(location.search).get('id'), 10);
  let lesson = null;
  let tabOff = false;

  function renderGutter(errLine) {
    const n = code.value.split('\n').length;
    gutter.textContent = '';
    for (let i = 1; i <= n; i++) gutter.appendChild(PG.el('span', 'ln' + (i === errLine ? ' is-error' : ''), String(i)));
    gutter.scrollTop = code.scrollTop;
  }

  function writeConsole(lines, errorMsg, notes) {
    out.textContent = '';
    if (lines.length) out.appendChild(document.createTextNode(lines.join('\n')));
    if (errorMsg) {
      if (lines.length) out.appendChild(document.createTextNode('\n'));
      out.appendChild(PG.el('span', 'is-err', errorMsg));
    }
    if (notes && notes.length) {
      if (out.textContent) out.appendChild(document.createTextNode('\n\n'));
      out.appendChild(PG.el('span', 'is-err', notes.join('\n')));
    }
    if (!out.textContent) out.textContent = 'Your code ran, but nothing was printed. Use print(...) to show something.';
  }

  function show(res) {
    const e = res.error;
    renderGutter(e ? e.line : 0);
    writeConsole(res.output, e ? 'Line ' + e.line + ': ' + e.message : '');
  }

  function run() { show(PyRunner.run(code.value)); }

  async function check() {
    const c = PyRunner.check(code.value, lesson.rules);
    renderGutter(c.result.error ? c.result.error.line : 0);
    writeConsole(c.result.output, c.result.error ? 'Line ' + c.result.error.line + ': ' + c.result.error.message : '', c.passed ? [] : c.messages);
    if (!c.passed) return;
    btnCheck.disabled = true;
    scene.classList.add('is-bloom');
    document.querySelectorAll('#goals li').forEach((li) => li.classList.add('is-done'));
    try {
      const r = await PG.api('/api/progress.php', { body: { lesson_id: lesson.id, code: code.value } });
      PG.setStats({ seeds: r.seeds, xp: r.xp, streak: r.streak });
      showWin(r);
    } catch (err) {
      PG.toast(err.message, true);
      btnCheck.disabled = false;
    }
  }

  function showWin(r) {
    win.classList.remove('is-hidden');
    const rewards = $('win-rewards');
    rewards.textContent = '';
    if (r.awarded) {
      $('win-title').textContent = 'Level complete!';
      $('win-text').textContent = 'Your garden grew. Here is what you earned:';
      const s = PG.el('span', 'px-chip'); s.appendChild(PG.spriteEl('seed', 'spr--sm')); s.appendChild(document.createTextNode('+' + r.reward_seeds + ' seeds'));
      const x = PG.el('span', 'px-chip'); x.appendChild(PG.spriteEl('star', 'spr--sm')); x.appendChild(document.createTextNode('+' + r.reward_xp + ' XP'));
      rewards.appendChild(s); rewards.appendChild(x);
    } else {
      $('win-title').textContent = 'Nice, still correct!';
      $('win-text').textContent = 'You already finished this level, so there are no extra rewards. Your best code is saved.';
    }
    const next = $('next-link');
    if (r.next_id) { next.href = '/level.html?id=' + r.next_id; next.textContent = 'Next level'; }
    else { next.href = '/adventure.html'; next.textContent = 'Back to the map'; }
    $('win-title').focus();
    btnCheck.disabled = false;
  }

  function showHint() {
    const h = (lesson.rules && lesson.rules.hint) || 'Read each quest goal again, then run your code and compare the console with what the goal asks for.';
    hintBox.textContent = 'Hint: ' + h;
    hintBox.classList.remove('is-hidden');
  }

  function fill(l) {
    lesson = l;
    document.title = l.title + ' | Python Garden';
    $('chapter-name').textContent = l.chapter_title;
    $('lesson-title').textContent = l.title;
    $('concept').textContent = l.concept || '';
    const ul = $('goals');
    ul.textContent = '';
    (l.goals || []).forEach((g) => ul.appendChild(PG.el('li', l.status === 'done' ? 'is-done' : '', g)));
    code.value = l.best_code || l.starter_code || '';
    renderGutter(0);
    $('level-loading').classList.add('is-hidden');
    $('level-body').classList.remove('is-hidden');
    if (l.status === 'done') scene.classList.add('is-bloom');
  }

  code.addEventListener('input', () => renderGutter(0));
  code.addEventListener('scroll', () => { gutter.scrollTop = code.scrollTop; });
  code.addEventListener('blur', () => { tabOff = false; });
  code.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { tabOff = true; return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); return; }
    if (e.key === 'Tab' && !tabOff && !e.shiftKey) {
      e.preventDefault();
      const s = code.selectionStart;
      code.setRangeText('    ', s, code.selectionEnd, 'end');
      renderGutter(0);
    } else if (e.key !== 'Tab') tabOff = false;
  });
  btnRun.addEventListener('click', run);
  btnCheck.addEventListener('click', check);
  btnHint.addEventListener('click', showHint);
  btnReset.addEventListener('click', () => {
    if (!lesson || !confirm('Put the starter code back? Your changes will be lost.')) return;
    code.value = lesson.starter_code || '';
    renderGutter(0);
    writeConsole([], '');
    out.textContent = 'Starter code restored.';
  });

  PG.ready.then((me) => {
    if (!me) return;
    if (!lessonId) { location.replace('/adventure.html'); return; }
    PG.api('/api/lessons.php?id=' + lessonId).then(fill).catch((err) => {
      if (err.status === 403 || err.status === 404) {
        PG.toast(err.message, true);
        setTimeout(() => location.replace('/adventure.html'), 900);
      } else PG.toast(err.message, true);
    });
  });
})();
