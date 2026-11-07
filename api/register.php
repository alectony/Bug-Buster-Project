<?php
require __DIR__ . '/_bootstrap.php';
method_is('POST');
$in = read_json();

$username = strtolower(trim((string)($in['username'] ?? '')));
$email = strtolower(trim((string)($in['email'] ?? '')));
$password = (string)($in['password'] ?? '');

if (!preg_match('/^[a-z0-9_]{3,20}$/', $username)) fail('Username: 3 to 20 letters, numbers or underscores');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Enter a valid email address');
if (strlen($password) < 8 || strlen($password) > 72) fail('Password must be 8 to 72 characters');

if (sb('GET', '/profiles?username=eq.' . q($username) . '&select=id')) fail('That username is taken', 409);

[$code, $user] = sb_auth('/admin/users', ['email' => $email, 'password' => $password, 'email_confirm' => true]);
if ($code === 422 || $code === 409) fail('That email is already registered', 409);
if ($code < 200 || $code >= 300 || empty($user['id'])) {
    error_log('Auth signup failed: ' . $code . ' ' . json_encode($user));
    fail('Could not create the account', 500);
}

[$pc] = sb_raw('POST', '/profiles', ['id' => $user['id'], 'username' => $username, 'role' => 'user']);
if ($pc < 200 || $pc >= 300) {
    sb_auth('/admin/users/' . $user['id'], null, 'DELETE'); // roll back the auth user
    fail('Could not create the profile', 500);
}

session_set($user['id'], 'user');
json_out(['ok' => true, 'role' => 'user'], 201);
?>