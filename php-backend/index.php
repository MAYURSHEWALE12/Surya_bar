<?php
// Surya Bar POS - Universal REST API Gateway (100% Feature Parity with Node.js)
date_default_timezone_set('Asia/Kolkata');

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
require_once __DIR__ . "/controllers/BackupController.php";
require_once __DIR__ . "/middleware/auth.php";

$requestUri = $_SERVER['REQUEST_URI'];
$basePath = dirname($_SERVER['SCRIPT_NAME']);
$rawPath = trim(str_replace($basePath, '', parse_url($requestUri, PHP_URL_PATH)), '/');

// Normalize route so both '/api/...' and subfolder '/...' match consistently
if (strpos($rawPath, 'api/') === 0) {
    $route = '/' . $rawPath;
} elseif ($rawPath === 'api') {
    $route = '/api';
} else {
    $route = '/api/' . $rawPath;
}

$method = $_SERVER['REQUEST_METHOD'];

// Health & System
if ($route === '/api/health' || $route === '/api/' || $route === '/api') {
    echo json_encode(["status" => "UP", "engine" => "PHP " . phpversion(), "serverTime" => date("Y-m-d H:i:s")]);
    exit;
}

// 1. Auth
if ($route === '/api/auth/login' && $method === 'POST') {
    AuthController::login();
    exit;
}
if (($route === '/api/auth/me' || $route === '/api/auth/profile') && $method === 'GET') {
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

if (preg_match('#^/api/products/(\d+)$#', $route, $matches)) {
    $productId = (int)$matches[1];
    if ($method === 'GET') {
        $user = authenticate();
        ProductController::getById($productId);
    } elseif ($method === 'PUT') {
        $user = authenticate(['ADMIN']);
        ProductController::update($productId);
    } elseif ($method === 'DELETE') {
        $user = authenticate(['ADMIN']);
        ProductController::delete($productId);
    }
    exit;
}

// 3. Categories & Brands
if ($route === '/api/categories') {
    if ($method === 'POST') {
        $user = authenticate(['ADMIN']);
        MetaController::createCategory();
    } else {
        MetaController::getCategories();
    }
    exit;
}
if ($route === '/api/brands') {
    if ($method === 'POST') {
        $user = authenticate(['ADMIN']);
        MetaController::createBrand();
    } else {
        MetaController::getBrands();
    }
    exit;
}

// 4. Inventories & Stock
if ($route === '/api/inventory' || $route === '/api/inventory/adjust') {
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
        $user = authenticate();
        CustomerController::getAll();
    } elseif ($method === 'POST') {
        $user = authenticate();
        CustomerController::create();
    }
    exit;
}

if (preg_match('#^/api/customers/(\d+)/payments$#', $route, $matches) && $method === 'POST') {
    $user = authenticate();
    CustomerController::recordPayment((int)$matches[1], $user);
    exit;
}

if (preg_match('#^/api/customers/(\d+)$#', $route, $matches) && $method === 'GET') {
    $user = authenticate();
    CustomerController::getStatement((int)$matches[1]);
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

if (preg_match('#^/api/users/(\d+)$#', $route, $matches)) {
    $userId = (int)$matches[1];
    $user = authenticate(['ADMIN']);
    if ($method === 'PUT') {
        UserController::update($userId);
    } elseif ($method === 'DELETE') {
        UserController::delete($userId, $user);
    }
    exit;
}

if ($route === '/api/audit-logs' && $method === 'GET') {
    $user = authenticate(['ADMIN']);
    AuditController::getAll();
    exit;
}

// 9. Database Backup & Stats
if ($route === '/api/backup/stats' && $method === 'GET') {
    $user = authenticate(['ADMIN']);
    BackupController::getStats();
    exit;
}

if ($route === '/api/backup/export' && $method === 'GET') {
    $user = authenticate(['ADMIN']);
    BackupController::exportBackup($user);
    exit;
}

if ($route === '/api/backup/restore' && $method === 'POST') {
    $user = authenticate(['ADMIN']);
    BackupController::restoreBackup($user);
    exit;
}

// 404
http_response_code(404);
echo json_encode(["message" => "Endpoint not found: " . $route]);
