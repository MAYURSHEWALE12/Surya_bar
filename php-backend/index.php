<?php
// Surya Bar POS - Universal REST API Gateway for cPanel / PHP Hosting

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/controllers/AuthController.php";
require_once __DIR__ . "/controllers/ProductController.php";
require_once __DIR__ . "/controllers/SalesController.php";
require_once __DIR__ . "/controllers/CustomerController.php";
require_once __DIR__ . "/controllers/MetaController.php";
require_once __DIR__ . "/middleware/auth.php";

// Parse URL path
$requestUri = $_SERVER['REQUEST_URI'];
$basePath = dirname($_SERVER['SCRIPT_NAME']);
$route = '/' . trim(str_replace($basePath, '', parse_url($requestUri, PHP_URL_PATH)), '/');

$method = $_SERVER['REQUEST_METHOD'];

// Health check
if ($route === '/api/health' || $route === '/health') {
    echo json_encode(["status" => "UP", "engine" => "PHP " . phpversion(), "time" => date("Y-m-d H:i:s")]);
    exit;
}

// Auth routes
if ($route === '/api/auth/login' && $method === 'POST') {
    AuthController::login();
    exit;
}

if ($route === '/api/auth/me' && $method === 'GET') {
    $user = authenticate();
    AuthController::me($user);
    exit;
}

// Product routes
if ($route === '/api/products') {
    if ($method === 'GET') {
        ProductController::getAll();
    } elseif ($method === 'POST') {
        $user = authenticate(['ADMIN']);
        ProductController::create();
    }
    exit;
}

// Categories & Brands
if ($route === '/api/categories' && $method === 'GET') {
    MetaController::getCategories();
    exit;
}

if ($route === '/api/brands' && $method === 'GET') {
    MetaController::getBrands();
    exit;
}

// Sales routes
if ($route === '/api/sales') {
    if ($method === 'GET') {
        SalesController::getAll();
    } elseif ($method === 'POST') {
        $user = authenticate();
        SalesController::create($user);
    }
    exit;
}

// Customers Khata
if ($route === '/api/customers') {
    if ($method === 'GET') {
        CustomerController::getAll();
    } elseif ($method === 'POST') {
        $user = authenticate();
        CustomerController::create();
    }
    exit;
}

// 404 fallback
http_response_code(404);
echo json_encode(["message" => "Endpoint not found: " . $route]);
