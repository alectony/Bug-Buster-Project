<?php
require __DIR__ . '/_bootstrap.php';
method_is('POST');
$in = read_json();

$email = strtolower(trim((string)($in['email'] ?? '')));
$password = (string)($in['password'] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') fail('Enter your email and password');

[$code, $auth] = sb_auth('/token?grant_type=password', ['email' => $email, 'password' => $password]);
if ($code !== 200 || empty($auth['user']['id'])) fail('Wrong email or password', 401);

$rows = sb('GET', '/profiles?id=eq.' . q($auth['user']['id']) . '&select=id,role,is_suspended');
if (!$rows) fail('No profile found for this account', 404);
if (!empty($rows[0]['is_suspended'])) fail('This account is suspended', 403);

session_set($rows[0]['id'], $rows[0]['role']);
json_out(['ok' => true, 'role' => $rows[0]['role']]);
