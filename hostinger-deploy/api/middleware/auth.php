<?php
require_once __DIR__ . "/../utils/jwt.php";

function authenticate($allowedRoles = []) {
    $authHeader = '';

    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) $authHeader = $headers['Authorization'];
        elseif (isset($headers['authorization'])) $authHeader = $headers['authorization'];
    }

    if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (!$authHeader && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(["message" => "No token provided, authorization denied"]);
        exit;
    }

    $token = $matches[1];
    $decoded = SimpleJWT::verifyToken($token);

    if (!$decoded) {
        http_response_code(401);
        echo json_encode(["message" => "Token is invalid or expired"]);
        exit;
    }

    if (!empty($allowedRoles)) {
        $userRole = isset($decoded['role']) ? $decoded['role'] : '';
        if (!in_array($userRole, $allowedRoles)) {
            http_response_code(403);
            echo json_encode(["message" => "Forbidden: Insufficient permissions"]);
            exit;
        }
    }

    return $decoded;
}
