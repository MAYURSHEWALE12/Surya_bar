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

    public static function restoreBackup($currentUser) {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();

        $backupData = $data['backupData'] ?? $data;
        if (empty($backupData) || empty($backupData['data'])) {
            http_response_code(400);
            echo json_encode(["message" => "Invalid backup snapshot payload"]);
            return;
        }

        try {
            $db->exec("SET FOREIGN_KEY_CHECKS = 0;");
            $db->beginTransaction();

            $tables = [
                'users', 'categories', 'brands', 'products', 'inventories', 
                'customers', 'credit_transactions', 'sales', 'sale_items', 
                'vendors', 'purchases', 'purchase_items', 'audit_logs'
            ];

            $restoredCounts = [];

            foreach ($tables as $tbl) {
                if (isset($backupData['data'][$tbl]) && is_array($backupData['data'][$tbl])) {
                    $rows = $backupData['data'][$tbl];
                    $db->exec("DELETE FROM `$tbl`");

                    if (!empty($rows)) {
                        $firstRow = $rows[0];
                        $columns = array_keys($firstRow);
                        $colList = implode("`, `", $columns);
                        $paramList = implode(", ", array_map(fn($c) => ":$c", $columns));

                        $stmt = $db->prepare("INSERT INTO `$tbl` (`$colList`) VALUES ($paramList)");
                        foreach ($rows as $row) {
                            $stmt->execute($row);
                        }
                    }
                    $restoredCounts[$tbl] = count($rows);
                }
            }

            $db->commit();
            $db->exec("SET FOREIGN_KEY_CHECKS = 1;");

            echo json_encode([
                "success" => true,
                "message" => "Database successfully restored from JSON backup snapshot.",
                "meta" => $backupData['meta'] ?? null,
                "restoredCounts" => $restoredCounts
            ]);
        } catch (Exception $e) {
            $db->rollBack();
            $db->exec("SET FOREIGN_KEY_CHECKS = 1;");
            http_response_code(500);
            echo json_encode(["message" => "Database restore failed: " . $e->getMessage()]);
        }
    }

    public static function resetDatabase($currentUser) {
        $db = (new Database())->getConnection();

        try {
            $db->exec("SET FOREIGN_KEY_CHECKS = 0;");

            $wipeTables = [
                'credit_transactions',
                'sale_items',
                'sales',
                'purchase_items',
                'purchases',
                'inventories',
                'products',
                'categories',
                'brands',
                'customers',
                'vendors',
                'audit_logs'
            ];

            foreach ($wipeTables as $tbl) {
                $db->exec("DELETE FROM `$tbl`");
                $db->exec("ALTER TABLE `$tbl` AUTO_INCREMENT = 1");
            }

            // Log this wipe action in audit_logs
            $stmtAudit = $db->prepare("INSERT INTO audit_logs (user_id, action, entity, details) VALUES (:uid, 'RESET_DATABASE', 'System', 'Database reset: All sales, inventory, and transactions cleared. Logins preserved.')");
            $stmtAudit->execute([
                ':uid' => $currentUser['id'] ?? 1
            ]);

            $db->exec("SET FOREIGN_KEY_CHECKS = 1;");

            header('Content-Type: application/json');
            echo json_encode([
                "success" => true,
                "message" => "Database reset complete! All sample sales, stock, and transaction logs have been wiped clean. Your Admin & Cashier accounts are preserved and active."
            ]);
        } catch (Exception $e) {
            $db->exec("SET FOREIGN_KEY_CHECKS = 1;");
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(["message" => "Database reset failed: " . $e->getMessage()]);
        }
    }
}
