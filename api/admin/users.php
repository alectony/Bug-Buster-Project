<?php
require __DIR__ . '/../_bootstrap.php';
$method = method_is('GET', 'POST');
$admin = require_admin();

if ($method === 'GET') {
    $rows = sb('GET', '/profiles?order=created_at.desc&limit=200&select=id,username,role,xp,seeds,streak,is_suspended,created_at');
    json_out(['users' => $rows, 'me' => $admin['id']]);
}

$in = read_json();
$id = (string)($in['id'] ?? '');
$action = (string)($in['action'] ?? '');
if (!preg_match('/^[0-9a-f-]{36}$/i', $id)) fail('Invalid user', 422);
$self = $id === $admin['id'];

switch ($action) {
    case 'promote':   $patch = ['role' => 'admin']; break;
    case 'demote':
        if ($self) fail('You cannot demote yourself', 422);
        $patch = ['role' => 'user']; break;
    case 'suspend':
        if ($self) fail('You cannot suspend yourself', 422);
        $patch = ['is_suspended' => true]; break;
    case 'unsuspend': $patch = ['is_suspended' => false]; break;
    case 'reset':
        sb('DELETE', '/user_progress?user_id=eq.' . q($id));
        sb('DELETE', '/garden_plots?user_id=eq.' . q($id));
        $patch = ['xp' => 0, 'seeds' => 0, 'streak' => 0]; break;
    default: fail('Unknown action', 422);
}
$res = sb('PATCH', '/profiles?id=eq.' . q($id), $patch);
if (!$res) fail('User not found', 404);
json_out(['ok' => true, 'user' => $res[0]]);
?>