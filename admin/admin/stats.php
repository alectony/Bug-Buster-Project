<?php
require __DIR__ . '/../_bootstrap.php';
method_is('GET');
require_admin();

$profiles = sb('GET', '/profiles?select=id,role,created_at,is_suspended');
$lessons = sb('GET', '/lessons?order=sort_order.asc,id.asc&select=id,title,chapter_id');
$done = sb('GET', '/user_progress?status=eq.done&select=lesson_id');

$perLesson = [];
foreach ($done as $d) $perLesson[(int)$d['lesson_id']] = ($perLesson[(int)$d['lesson_id']] ?? 0) + 1;

$weekAgo = strtotime('-7 days');
$newUsers = 0; $admins = 0; $suspended = 0;
foreach ($profiles as $p) {
    if (strtotime($p['created_at']) >= $weekAgo) $newUsers++;
    if ($p['role'] === 'admin') $admins++;
    if (!empty($p['is_suspended'])) $suspended++;
}

$rows = [];
foreach ($lessons as $l) $rows[] = ['id' => (int)$l['id'], 'title' => $l['title'], 'done' => $perLesson[(int)$l['id']] ?? 0];

json_out([
    'users' => count($profiles), 'admins' => $admins, 'suspended' => $suspended, 'new_users_7d' => $newUsers,
    'lessons' => count($lessons), 'completions' => count($done), 'per_lesson' => $rows,
]);
?>