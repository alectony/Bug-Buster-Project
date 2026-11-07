<?php
require __DIR__ . '/_bootstrap.php';
$method = method_is('GET', 'POST');
$me = require_user();
[$list, $done] = lessons_for($me['id']);

if ($method === 'GET') {
    $achievements = sb('GET', '/achievements?order=id.asc&select=*');
    $doneCount = count($done);
    $metrics = ['lessons_done' => $doneCount, 'xp' => (int)$me['xp'], 'streak' => (int)$me['streak']];
    foreach ($achievements as &$a) {
        $a['earned'] = ($metrics[$a['rule_key']] ?? 0) >= (int)$a['threshold'];
    }
    unset($a);
    $concepts = [];
    foreach ($list as $l) {
        $name = $l['concept'] ?: $l['title'];
        $concepts[$name]['total'] = ($concepts[$name]['total'] ?? 0) + 1;
        $concepts[$name]['done'] = ($concepts[$name]['done'] ?? 0) + ($l['status'] === 'done' ? 1 : 0);
    }
    $mastery = [];
    foreach ($concepts as $name => $c) $mastery[] = ['concept' => $name, 'done' => $c['done'], 'total' => $c['total']];
    json_out([
        'xp' => (int)$me['xp'], 'seeds' => (int)$me['seeds'], 'streak' => (int)$me['streak'],
        'lessons_done' => $doneCount, 'lessons_total' => count($list),
        'mastery' => $mastery, 'achievements' => $achievements,
    ]);
}

/* POST: save a passed level. The browser runs the checker, so this trusts the
   "passed" claim; it still refuses locked levels and only pays out once. */
$in = read_json();
$lessonId = (int)($in['lesson_id'] ?? 0);
$code = substr((string)($in['code'] ?? ''), 0, 5000);

$lesson = null; $next = null;
foreach ($list as $i => $l) {
    if ((int)$l['id'] === $lessonId) { $lesson = $l; $next = $list[$i + 1] ?? null; break; }
}
if (!$lesson) fail('Level not found', 404);
if ($lesson['status'] === 'locked') fail('That level is still locked', 403);

$uid = q($me['id']);
if ($lesson['status'] === 'done') {
    sb('PATCH', "/user_progress?user_id=eq.$uid&lesson_id=eq.$lessonId", ['best_code' => $code]);
    json_out(['awarded' => false, 'seeds' => (int)$me['seeds'], 'xp' => (int)$me['xp'],
        'streak' => (int)$me['streak'], 'next_id' => $next ? (int)$next['id'] : null]);
}

/* streak: compare with the last completion date (UTC) */
$last = sb('GET', "/user_progress?user_id=eq.$uid&status=eq.done&order=completed_at.desc&limit=1&select=completed_at");
$streak = 1;
if ($last && !empty($last[0]['completed_at'])) {
    $lastDay = new DateTime(substr($last[0]['completed_at'], 0, 10), new DateTimeZone('UTC'));
    $today = new DateTime('today', new DateTimeZone('UTC'));
    $gap = (int)$lastDay->diff($today)->format('%r%a');
    if ($gap === 0) $streak = max(1, (int)$me['streak']);
    elseif ($gap === 1) $streak = (int)$me['streak'] + 1;
}

$attempts = sb('GET', "/user_progress?user_id=eq.$uid&lesson_id=eq.$lessonId&select=attempts");
sb('POST', '/user_progress?on_conflict=user_id,lesson_id', [
    'user_id' => $me['id'], 'lesson_id' => $lessonId, 'status' => 'done', 'best_code' => $code,
    'attempts' => ((int)($attempts[0]['attempts'] ?? 0)) + 1, 'completed_at' => gmdate('c'),
], ['resolution=merge-duplicates', 'return=representation']);

$seeds = (int)$me['seeds'] + (int)$lesson['reward_seeds'];
$xp = (int)$me['xp'] + (int)$lesson['reward_xp'];
sb('PATCH', "/profiles?id=eq.$uid", ['seeds' => $seeds, 'xp' => $xp, 'streak' => $streak]);

json_out(['awarded' => true, 'seeds' => $seeds, 'xp' => $xp, 'streak' => $streak,
    'reward_seeds' => (int)$lesson['reward_seeds'], 'reward_xp' => (int)$lesson['reward_xp'],
    'next_id' => $next ? (int)$next['id'] : null]);
