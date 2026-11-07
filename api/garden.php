<?php
require __DIR__ . '/_bootstrap.php';
$method = method_is('GET', 'POST');
$me = require_user();
$uid = q($me['id']);

if ($method === 'GET') {
    $items = sb('GET', '/shop_items?is_active=eq.true&order=cost_seeds.asc&select=id,name,kind,cost_seeds,sprite');
    $plots = sb('GET', "/garden_plots?user_id=eq.$uid&select=slot,item_id");
    json_out(['items' => $items, 'plots' => $plots, 'seeds' => (int)$me['seeds']]);
}

$in = read_json();
$itemId = (int)($in['item_id'] ?? 0);
$slot = filter_var($in['slot'] ?? null, FILTER_VALIDATE_INT);
if ($slot === false || $slot < 0 || $slot > 11) fail('Pick a plot from 1 to 12');

$item = sb('GET', "/shop_items?id=eq.$itemId&is_active=eq.true&select=*");
if (!$item) fail('That item is not for sale', 404);
$cost = (int)$item[0]['cost_seeds'];
$balance = (int)$me['seeds'];
if ($balance < $cost) fail('Not enough seeds yet', 402);
if (sb('GET', "/garden_plots?user_id=eq.$uid&slot=eq.$slot&select=id")) fail('That plot is already planted', 409);

/* spend seeds first, guarded by the old balance so two requests cannot both pay */
$paid = sb('PATCH', "/profiles?id=eq.$uid&seeds=eq.$balance", ['seeds' => $balance - $cost]);
if (!$paid) fail('Your balance changed. Try again.', 409);

[$code] = sb_raw('POST', '/garden_plots', ['user_id' => $me['id'], 'slot' => $slot, 'item_id' => $itemId]);
if ($code < 200 || $code >= 300) {
    sb('PATCH', "/profiles?id=eq.$uid", ['seeds' => $balance]); // refund
    fail('That plot is already planted', 409);
}
json_out(['ok' => true, 'seeds' => $balance - $cost, 'slot' => $slot, 'item_id' => $itemId], 201);
