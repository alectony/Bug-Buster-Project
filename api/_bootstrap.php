<?php
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

/* ---------- environment ---------- */
(function () {
    $file = dirname(__DIR__) . '/.env'; // local development only (.env is git-ignored)
    if (is_file($file)) {
        foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            if ($line[0] === '#' || strpos($line, '=') === false) continue;
            [$k, $v] = explode('=', $line, 2);
            putenv(trim($k) . '=' . trim($v));
        }
    }
})();

function env_get(string $k): string {
    $v = getenv($k);
    if ($v === false || $v === '') $v = $_ENV[$k] ?? ($_SERVER[$k] ?? '');
    return (string)$v;
}

/* ---------- output / input ---------- */
function json_out($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $code = 400): void {
    json_out(['error' => $message], $code);
}

function method_is(string ...$allowed): string {
    $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($m, $allowed, true)) fail('Method not allowed', 405);
    return $m;
}

function read_json(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    return is_array($data) ? $data : [];
}

/* ---------- HTTP ---------- */
function http_call(string $method, string $url, ?array $body, array $headers): array {
    $h = array_merge(['Content-Type: application/json', 'Accept: application/json'], $headers);
    $payload = $body === null ? null : json_encode($body);
    $raw = false;
    $code = 0;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $h,
            CURLOPT_TIMEOUT => 15,
        ]);
        if ($payload !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        $raw = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => [
            'method' => $method, 'header' => implode("\r\n", $h),
            'content' => $payload ?? '', 'ignore_errors' => true, 'timeout' => 15,
        ]]);
        $raw = @file_get_contents($url, false, $ctx);
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
            $code = (int)$m[1];
        }
    }
    $data = ($raw === false || $raw === '') ? null : json_decode($raw, true);
    return [$code, $data];
}

/* ---------- Supabase REST ---------- */
function sb_raw(string $method, string $path, ?array $body = null, array $prefer = []): array {
    $base = rtrim(env_get('SUPABASE_URL') ?: env_get('NEXT_PUBLIC_SUPABASE_URL'), '/');
    $key = env_get('SUPABASE_SERVICE_KEY') ?: env_get('SUPABASE_SECRET_KEY');
    if ($base === '' || $key === '') fail('Server is missing Supabase settings', 500);
    $h = ['apikey: ' . $key, 'Authorization: Bearer ' . $key];
    if ($method !== 'GET' && !$prefer) $prefer = ['return=representation'];
    if ($prefer) $h[] = 'Prefer: ' . implode(',', $prefer);
    return http_call($method, $base . '/rest/v1' . $path, $body, $h);
}

function sb(string $method, string $path, ?array $body = null, array $prefer = []): array {
    [$code, $data] = sb_raw($method, $path, $body, $prefer);
    if ($code < 200 || $code >= 300) {
        error_log('Supabase ' . $code . ' on ' . $method . ' ' . $path . ': ' . json_encode($data));
        fail('Database error', 500);
    }
    return is_array($data) ? $data : [];
}

function sb_auth(string $path, ?array $body, string $method = 'POST'): array {
    $base = rtrim(env_get('SUPABASE_URL') ?: env_get('NEXT_PUBLIC_SUPABASE_URL'), '/');
    $key = env_get('SUPABASE_SERVICE_KEY') ?: env_get('SUPABASE_SECRET_KEY');
    if ($base === '' || $key === '') fail('Server is missing Supabase settings', 500);
    return http_call($method, $base . '/auth/v1' . $path, $body, ['apikey: ' . $key, 'Authorization: Bearer ' . $key]);
}

function q(string $v): string { return rawurlencode($v); }

/* ---------- session cookie ---------- */
const SESSION_COOKIE = 'pg_session';
const SESSION_DAYS = 7;

function b64u(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64u_dec(string $s): string { return (string)base64_decode(strtr($s, '-_', '+/')); }

function session_secret(): string {
    $s = env_get('SESSION_SECRET');
    if (strlen($s) < 32) fail('Server is missing SESSION_SECRET', 500);
    return $s;
}

function is_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function session_set(string $uid, string $role): void {
    $payload = b64u(json_encode(['uid' => $uid, 'role' => $role, 'exp' => time() + SESSION_DAYS * 86400]));
    $sig = b64u(hash_hmac('sha256', $payload, session_secret(), true));
    setcookie(SESSION_COOKIE, $payload . '.' . $sig, [
        'expires' => time() + SESSION_DAYS * 86400, 'path' => '/',
        'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax',
    ]);
}

function session_clear(): void {
    setcookie(SESSION_COOKIE, '', [
        'expires' => time() - 3600, 'path' => '/',
        'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax',
    ]);
}

function session_read(): ?array {
    $c = $_COOKIE[SESSION_COOKIE] ?? '';
    if (substr_count($c, '.') !== 1) return null;
    [$payload, $sig] = explode('.', $c);
    $expect = b64u(hash_hmac('sha256', $payload, session_secret(), true));
    if (!hash_equals($expect, $sig)) return null;
    $data = json_decode(b64u_dec($payload), true);
    if (!is_array($data) || ($data['exp'] ?? 0) < time() || empty($data['uid'])) return null;
    return $data;
}

/* ---------- guards (role is always re-checked in the database) ---------- */
function require_user(): array {
    $s = session_read();
    if (!$s) fail('Please log in', 401);
    $rows = sb('GET', '/profiles?id=eq.' . q((string)$s['uid']) . '&select=*');
    if (!$rows) { session_clear(); fail('Please log in', 401); }
    $p = $rows[0];
    if (!empty($p['is_suspended'])) { session_clear(); fail('This account is suspended', 403); }
    return $p;
}

function require_admin(): array {
    $p = require_user();
    if (($p['role'] ?? '') !== 'admin') fail('Admins only', 403);
    return $p;
}

/* ---------- lessons in play order ---------- */
/** Returns [list, doneMap]. Each list item is a lesson row plus chapter_title and status. */
function lessons_for(string $userId): array {
    $progress = sb('GET', '/user_progress?user_id=eq.' . q($userId) . '&select=lesson_id,status');
    $done = [];
    foreach ($progress as $p) if ($p['status'] === 'done') $done[(int)$p['lesson_id']] = true;

    $chapters = sb('GET', '/chapters?is_published=eq.true&order=sort_order.asc,id.asc&select=*');
    $lessons = sb('GET', '/lessons?order=sort_order.asc,id.asc&select=*');
    $byChapter = [];
    foreach ($lessons as $l) $byChapter[(int)$l['chapter_id']][] = $l;

    $list = [];
    $openTaken = false;
    foreach ($chapters as $c) {
        foreach ($byChapter[(int)$c['id']] ?? [] as $l) {
            $id = (int)$l['id'];
            if (isset($done[$id])) $status = 'done';
            elseif (!$openTaken) { $status = 'open'; $openTaken = true; }
            else $status = 'locked';
            $l['status'] = $status;
            $l['chapter_title'] = $c['title'];
            $list[] = $l;
        }
    }
    return [$list, $done, $chapters];
}

function int_in(array $src, string $key, int $min, int $max, int $default): int {
    if (!isset($src[$key])) return $default;
    $v = filter_var($src[$key], FILTER_VALIDATE_INT);
    if ($v === false || $v < $min || $v > $max) fail("Invalid $key", 422);
    return $v;
}
?>