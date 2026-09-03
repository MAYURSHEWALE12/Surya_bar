<?php
// Surya Bar POS - Universal REST API Gateway (100% Feature Parity with Node.js)

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
require_once __DIR__ . "/controllers/InventoryController.php";
require_once __DIR__ . "/controllers/VendorController.php";
require_once __DIR__ . "/controllers/PurchaseController.php";
require_once __DIR__ . "/controllers/UserController.php";
require_once __DIR__ . "/controllers/AuditController.php";
require_once __DIR__ . "/middleware/auth.php";

$requestUri = $_SERVER['REQUEST_URI'];
$basePath = dirname($_SERVER['SCRIPT_NAME']);
$route = '/' . trim(str_replace($basePath, '', parse_url($requestUri, PHP_URL_PATH)), '/');
$method = $_SERVER['REQUEST_METHOD'];

// Health & System
if ($route === '/api/health' || $route === '/health' || $route === '/') {
    echo json_encode(["status" => "UP", "engine" => "PHP " . phpversion(), "serverTime" => date("Y-m-d H:i:s")]);
    exit;
}

// 1. Auth
if ($route === '/api/auth/login' && $method === 'POST') {
    AuthController::login();
    exit;
}
if ($route === '/api/auth/me' && $method === 'GET') {
    $user = authenticate();
    AuthController::me($user);
    exit;
}

// 2. Products
if ($route === '/api/products') {
    if ($method === 'GET') {
        ProductController::getAll();
    } elseif ($method === 'POST') {
        $user = authenticate(['ADMIN']);
        ProductController::create();
    }
    exit;
}

// 3. Categories & Brands
if ($route === '/api/categories') {
    MetaController::getCategories();
    exit;
}
if ($route === '/api/brands') {
    MetaController::getBrands();
    exit;
}

// 4. Inventories & Stock
if ($route === '/api/inventory') {
    if ($method === 'GET') {
        InventoryController::getAll();
    } elseif ($method === 'POST') {
        $user = authenticate(['ADMIN']);
        InventoryController::adjust($user);
    }
    exit;
}

// 5. Sales POS
if ($route === '/api/sales') {
    if ($method === 'GET') {
        SalesController::getAll();
    } elseif ($method === 'POST') {
        $user = authenticate();
        SalesController::create($user);
    }
    exit;
}

// 6. Customers Khata
if ($route === '/api/customers') {
    if ($method === 'GET') {
        CustomerController::getAll();
    } elseif ($method === 'POST') {
        $user = authenticate();
        CustomerController::create();
    }
    exit;
}

// 7. Vendors & Purchases
if ($route === '/api/vendors') {
    if ($method === 'GET') {
        VendorController::getAll();
    } elseif ($method === 'POST') {
        $user = authenticate(['ADMIN']);
        VendorController::create();
    }
    exit;
}

if ($route === '/api/purchases') {
    if ($method === 'GET') {
        PurchaseController::getAll();
    } elseif ($method === 'POST') {
        $user = authenticate(['ADMIN']);
        PurchaseController::create();
    }
    exit;
}

// 8. Staff / Users & Audit Logs
if ($route === '/api/users') {
    if ($method === 'GET') {
        $user = authenticate(['ADMIN']);
        UserController::getAll();
    } elseif ($method === 'POST') {
        $user = authenticate(['ADMIN']);
        UserController::create();
    }
    exit;
}

if ($route === '/api/audit-logs' && $method === 'GET') {
    $user = authenticate(['ADMIN']);
    AuditController::getAll();
    exit;
}

// 404
http_response_code(404);
echo json_encode(["message" => "Endpoint not found: " . $route]);
