<?php
require __DIR__ . '/_bootstrap.php';
method_is('GET');
$p = require_user();
json_out([
    'id' => $p['id'], 'username' => $p['username'], 'role' => $p['role'],
    'xp' => (int)$p['xp'], 'seeds' => (int)$p['seeds'], 'streak' => (int)$p['streak'],
]);
