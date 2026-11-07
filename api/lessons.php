<?php
require __DIR__ . '/_bootstrap.php';
method_is('GET');
$me = require_user();
[$list, $done, $chapters] = lessons_for($me['id']);

if (isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    foreach ($list as $i => $l) {
        if ((int)$l['id'] !== $id) continue;
        if ($l['status'] === 'locked') fail('Finish the earlier levels first', 403);
        $best = sb('GET', '/user_progress?user_id=eq.' . q($me['id']) . '&lesson_id=eq.' . $id . '&select=best_code');
        $rules = is_array($l['rules']) ? $l['rules'] : [];
        $rules['expected_output'] = $l['expected_output'];
        json_out(['lesson' => [
            'id' => $id, 'title' => $l['title'], 'concept' => $l['concept'],
            'chapter_title' => $l['chapter_title'], 'goals' => $l['goals'] ?: [],
            'starter_code' => $l['starter_code'], 'best_code' => $best[0]['best_code'] ?? null,
            'rules' => $rules, 'status' => $l['status'],
            'reward_seeds' => (int)$l['reward_seeds'], 'reward_xp' => (int)$l['reward_xp'],
            'next_id' => isset($list[$i + 1]) ? (int)$list[$i + 1]['id'] : null,
        ]]);
    }
    fail('Level not found', 404);
}

$out = [];
foreach ($chapters as $c) {
    $items = [];
    foreach ($list as $l) {
        if ((int)$l['chapter_id'] !== (int)$c['id']) continue;
        $items[] = ['id' => (int)$l['id'], 'title' => $l['title'], 'concept' => $l['concept'], 'status' => $l['status']];
    }
    $out[] = ['id' => (int)$c['id'], 'title' => $c['title'], 'blurb' => $c['blurb'], 'lessons' => $items];
}
$next = null;
foreach ($list as $l) if ($l['status'] === 'open') { $next = ['id' => (int)$l['id'], 'title' => $l['title']]; break; }
json_out(['chapters' => $out, 'next' => $next,
    'me' => ['xp' => (int)$me['xp'], 'seeds' => (int)$me['seeds'], 'streak' => (int)$me['streak']]]);
