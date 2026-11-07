<?php
require __DIR__ . '/../_bootstrap.php';
$method = method_is('GET', 'POST');
require_admin();

if ($method === 'GET') {
    json_out([
        'chapters' => sb('GET', '/chapters?order=sort_order.asc,id.asc&select=*'),
        'lessons' => sb('GET', '/lessons?order=sort_order.asc,id.asc&select=*'),
    ]);
}

$in = read_json();
$action = (string)($in['action'] ?? 'save');

if ($action === 'chapter_publish') {
    $cid = (int)($in['chapter_id'] ?? 0);
    $res = sb('PATCH', "/chapters?id=eq.$cid", ['is_published' => (bool)($in['is_published'] ?? false)]);
    if (!$res) fail('Chapter not found', 404);
    json_out(['ok' => true]);
}

if ($action === 'chapter_save') {
    $title = trim((string)($in['title'] ?? ''));
    $slug = strtolower(trim((string)($in['slug'] ?? '')));
    if ($title === '' || strlen($title) > 80) fail('Chapter title: 1 to 80 characters', 422);
    if (!preg_match('/^[a-z0-9-]{2,40}$/', $slug)) fail('Slug: lowercase letters, numbers and dashes', 422);
    $row = ['title' => $title, 'slug' => $slug, 'blurb' => substr((string)($in['blurb'] ?? ''), 0, 300),
            'sort_order' => int_in($in, 'sort_order', 0, 999, 0)];
    $res = sb('POST', '/chapters', $row);
    json_out(['ok' => true, 'chapter' => $res[0] ?? null], 201);
}

if ($action === 'delete') {
    $id = (int)($in['id'] ?? 0);
    sb('DELETE', "/lessons?id=eq.$id");
    json_out(['ok' => true]);
}

if ($action !== 'save') fail('Unknown action', 422);

$title = trim((string)($in['title'] ?? ''));
if ($title === '' || strlen($title) > 120) fail('Title: 1 to 120 characters', 422);
$chapterId = (int)($in['chapter_id'] ?? 0);
if (!sb('GET', "/chapters?id=eq.$chapterId&select=id")) fail('Pick a chapter', 422);

$goals = [];
foreach ((array)($in['goals'] ?? []) as $g) {
    $g = trim((string)$g);
    if ($g !== '') $goals[] = substr($g, 0, 200);
}
$must = [];
foreach ((array)($in['must_contain'] ?? []) as $m) {
    $m = trim((string)$m);
    if ($m !== '') $must[] = substr($m, 0, 60);
}
$rules = ['mustContain' => $must];
$hint = trim((string)($in['hint'] ?? ''));
if ($hint !== '') $rules['hint'] = substr($hint, 0, 300);

$row = [
    'chapter_id' => $chapterId, 'title' => $title,
    'concept' => substr(trim((string)($in['concept'] ?? '')), 0, 80),
    'goals' => $goals,
    'starter_code' => substr((string)($in['starter_code'] ?? ''), 0, 3000),
    'expected_output' => substr((string)($in['expected_output'] ?? ''), 0, 1000),
    'rules' => $rules,
    'reward_seeds' => int_in($in, 'reward_seeds', 0, 1000, 15),
    'reward_xp' => int_in($in, 'reward_xp', 0, 1000, 40),
    'sort_order' => int_in($in, 'sort_order', 0, 9999, 0),
];

if (!empty($in['id'])) {
    $id = (int)$in['id'];
    $res = sb('PATCH', "/lessons?id=eq.$id", $row);
    if (!$res) fail('Level not found', 404);
    json_out(['ok' => true, 'lesson' => $res[0]]);
}
$res = sb('POST', '/lessons', $row);
json_out(['ok' => true, 'lesson' => $res[0] ?? null], 201);
?>