<?php
require_once __DIR__ . "/../config/database.php";

class BackupController {
    public static function getStats() {
        $db = (new Database())->getConnection();

        try {
            $counts = [
                'products' => (int)$db->query("SELECT COUNT(*) FROM products")->fetchColumn(),
                'categories' => (int)$db->query("SELECT COUNT(*) FROM categories")->fetchColumn(),
                'brands' => (int)$db->query("SELECT COUNT(*) FROM brands")->fetchColumn(),
                'inventories' => (int)$db->query("SELECT COUNT(*) FROM inventories")->fetchColumn(),
                'customers' => (int)$db->query("SELECT COUNT(*) FROM customers")->fetchColumn(),
                'sales' => (int)$db->query("SELECT COUNT(*) FROM sales")->fetchColumn(),
                'purchases' => (int)$db->query("SELECT COUNT(*) FROM purchases")->fetchColumn(),
                'vendors' => (int)$db->query("SELECT COUNT(*) FROM vendors")->fetchColumn(),
                'creditTransactions' => (int)$db->query("SELECT COUNT(*) FROM credit_transactions")->fetchColumn(),
                'users' => (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn(),
            ];

            echo json_encode([
                "success" => true,
                "counts" => $counts,
                "databaseName" => "surya_bar",
                "serverTime" => date("c")
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Failed to get database stats: " . $e->getMessage()]);
        }
    }

    public static function exportBackup($currentUser) {
        $db = (new Database())->getConnection();

        try {
            $tables = [
                'users', 'categories', 'brands', 'products', 'inventories', 
                'customers', 'credit_transactions', 'sales', 'sale_items', 
                'vendors', 'purchases', 'purchase_items', 'audit_logs'
            ];

            $data = [];
            $recordCounts = [];

            foreach ($tables as $tbl) {
                $stmt = $db->query("SELECT * FROM `$tbl`");
                $rows = $stmt->fetchAll();
                $data[$tbl] = $rows;
                $recordCounts[$tbl] = count($rows);
            }

            $now = date("Y-m-d_H-i");
            $payload = [
                "meta" => [
                    "appName" => "Surya Bar & Restaurant POS",
                    "version" => "2.0",
                    "exportTimestamp" => date("c"),
                    "exportedBy" => $currentUser['name'] ?? $currentUser['email'] ?? "Admin",
                    "database" => "surya_bar",
                    "totalCollections" => count($tables),
                    "recordCounts" => $recordCounts
                ],
                "data" => $data
            ];

            header('Content-Type: application/json');
            header("Content-Disposition: attachment; filename=surya_bar_backup_{$now}.json");
            echo json_encode($payload, JSON_PRETTY_PRINT);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Backup export failed: " . $e->getMessage()]);
        }
    }
}
