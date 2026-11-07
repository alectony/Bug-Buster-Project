<?php
require __DIR__ . '/_bootstrap.php';
method_is('POST');
session_clear();
json_out(['ok' => true]);
