<?php
require_once __DIR__ . "/../config/database.php";

class ProductController {
    public static function getAll() {
        $db = (new Database())->getConnection();
        
        $sql = "
            SELECT 
                p.id as _id,
                p.name,
                p.size,
                p.unit,
                p.barcode,
                p.sku,
                p.description,
                p.active,
                p.created_at as createdAt,
                CASE WHEN c.id IS NOT NULL THEN JSON_OBJECT('id', c.id, 'name', c.name) ELSE NULL END as category,
                CASE WHEN b.id IS NOT NULL THEN JSON_OBJECT('id', b.id, 'name', b.name) ELSE NULL END as brand,
                (
                    SELECT JSON_OBJECT(
                        'enabled', i_tp.enabled = 1,
                        'quantity', i_tp.quantity,
                        'purchasePrice', i_tp.purchase_price,
                        'sellingPrice', i_tp.selling_price,
                        'minStock', i_tp.min_stock
                    ) FROM inventories i_tp WHERE i_tp.product_id = p.id AND i_tp.stock_type = 'TP' LIMIT 1
                ) as tp,
                (
                    SELECT JSON_OBJECT(
                        'enabled', i_ntp.enabled = 1,
                        'quantity', i_ntp.quantity,
                        'purchasePrice', i_ntp.purchase_price,
                        'sellingPrice', i_ntp.selling_price,
                        'minStock', i_ntp.min_stock
                    ) FROM inventories i_ntp WHERE i_ntp.product_id = p.id AND i_ntp.stock_type = 'NON_TP' LIMIT 1
                ) as nonTp
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.active = 1
            ORDER BY p.name ASC
        ";

        $stmt = $db->query($sql);
        $products = $stmt->fetchAll();

        // Format JSON fields cleanly for React
        foreach ($products as &$prod) {
            $prod['_id'] = (string)$prod['_id'];
            $prod['category'] = !empty($prod['category']) ? json_decode($prod['category'], true) : null;
            $prod['brand'] = !empty($prod['brand']) ? json_decode($prod['brand'], true) : null;
            
            $tp = !empty($prod['tp']) ? json_decode($prod['tp'], true) : null;
            if ($tp) {
                $tp['quantity'] = (int)($tp['quantity'] ?? 0);
                $tp['purchasePrice'] = (float)($tp['purchasePrice'] ?? 0);
                $tp['sellingPrice'] = (float)($tp['sellingPrice'] ?? 0);
                $tp['minStock'] = (int)($tp['minStock'] ?? 5);
                $tp['enabled'] = !empty($tp['enabled']);
            }
            $prod['tp'] = $tp ?: ["enabled" => false, "quantity" => 0, "purchasePrice" => 0, "sellingPrice" => 0, "minStock" => 5];

            $ntp = !empty($prod['nonTp']) ? json_decode($prod['nonTp'], true) : null;
            if ($ntp) {
                $ntp['quantity'] = (int)($ntp['quantity'] ?? 0);
                $ntp['purchasePrice'] = (float)($ntp['purchasePrice'] ?? 0);
                $ntp['sellingPrice'] = (float)($ntp['sellingPrice'] ?? 0);
                $ntp['minStock'] = (int)($ntp['minStock'] ?? 5);
                $ntp['enabled'] = !empty($ntp['enabled']);
            }
            $prod['nonTp'] = $ntp ?: ["enabled" => false, "quantity" => 0, "purchasePrice" => 0, "sellingPrice" => 0, "minStock" => 5];
        }

        echo json_encode($products);
    }

    public static function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();

        try {
            $db->beginTransaction();

            $stmt = $db->prepare("INSERT INTO products (name, brand_id, category_id, size, unit, barcode, sku, description) VALUES (:name, :brand_id, :category_id, :size, :unit, :barcode, :sku, :description)");
            $stmt->execute([
                ':name' => $data['name'],
                ':brand_id' => !empty($data['brand']) ? $data['brand'] : null,
                ':category_id' => !empty($data['category']) ? $data['category'] : null,
                ':size' => !empty($data['size']) ? $data['size'] : '750ml',
                ':unit' => !empty($data['unit']) ? $data['unit'] : 'bottle',
                ':barcode' => !empty($data['barcode']) ? $data['barcode'] : null,
                ':sku' => !empty($data['sku']) ? $data['sku'] : null,
                ':description' => !empty($data['description']) ? $data['description'] : null,
            ]);

            $productId = $db->lastInsertId();

            // Insert TP inventory
            if (isset($data['tp'])) {
                $tp = $data['tp'];
                $stmtTp = $db->prepare("INSERT INTO inventories (product_id, stock_type, enabled, quantity, purchase_price, selling_price, min_stock) VALUES (:pid, 'TP', :enabled, :qty, :pp, :sp, :ms)");
                $stmtTp->execute([
                    ':pid' => $productId,
                    ':enabled' => !empty($tp['enabled']) ? 1 : 0,
                    ':qty' => (int)($tp['quantity'] ?? 0),
                    ':pp' => (float)($tp['purchasePrice'] ?? 0),
                    ':sp' => (float)($tp['sellingPrice'] ?? 0),
                    ':ms' => (int)($tp['minStock'] ?? 5),
                ]);
            }

            // Insert Non-TP inventory
            if (isset($data['nonTp'])) {
                $ntp = $data['nonTp'];
                $stmtNtp = $db->prepare("INSERT INTO inventories (product_id, stock_type, enabled, quantity, purchase_price, selling_price, min_stock) VALUES (:pid, 'NON_TP', :enabled, :qty, :pp, :sp, :ms)");
                $stmtNtp->execute([
                    ':pid' => $productId,
                    ':enabled' => !empty($ntp['enabled']) ? 1 : 0,
                    ':qty' => (int)($ntp['quantity'] ?? 0),
                    ':pp' => (float)($ntp['purchasePrice'] ?? 0),
                    ':sp' => (float)($ntp['sellingPrice'] ?? 0),
                    ':ms' => (int)($ntp['minStock'] ?? 5),
                ]);
            }

            $db->commit();
            http_response_code(201);
            echo json_encode(["message" => "Product created successfully", "id" => (string)$productId]);
        } catch (Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["message" => "Failed to create product: " . $e->getMessage()]);
        }
    }

    public static function getById($id) {
        $db = (new Database())->getConnection();
        $stmt = $db->prepare("
            SELECT 
                p.id as _id,
                p.name,
                p.size,
                p.unit,
                p.barcode,
                p.sku,
                p.description,
                p.active,
                p.created_at as createdAt,
                JSON_OBJECT('id', c.id, 'name', c.name) as category,
                JSON_OBJECT('id', b.id, 'name', b.name) as brand,
                (
                    SELECT JSON_OBJECT(
                        'enabled', i_tp.enabled = 1,
                        'quantity', i_tp.quantity,
                        'purchasePrice', i_tp.purchase_price,
                        'sellingPrice', i_tp.selling_price,
                        'minStock', i_tp.min_stock
                    ) FROM inventories i_tp WHERE i_tp.product_id = p.id AND i_tp.stock_type = 'TP' LIMIT 1
                ) as tp,
                (
                    SELECT JSON_OBJECT(
                        'enabled', i_ntp.enabled = 1,
                        'quantity', i_ntp.quantity,
                        'purchasePrice', i_ntp.purchase_price,
                        'sellingPrice', i_ntp.selling_price,
                        'minStock', i_ntp.min_stock
                    ) FROM inventories i_ntp WHERE i_ntp.product_id = p.id AND i_ntp.stock_type = 'NON_TP' LIMIT 1
                ) as nonTp
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.id = :id AND p.active = 1 LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $prod = $stmt->fetch();

        if (!$prod) {
            http_response_code(404);
            echo json_encode(["message" => "Product not found"]);
            return;
        }

        $prod['_id'] = (string)$prod['_id'];
        $prod['category'] = json_decode($prod['category'], true);
        $prod['brand'] = json_decode($prod['brand'], true);
        $prod['tp'] = json_decode($prod['tp'], true) ?: ["enabled" => false, "quantity" => 0, "purchasePrice" => 0, "sellingPrice" => 0, "minStock" => 5];
        $prod['nonTp'] = json_decode($prod['nonTp'], true) ?: ["enabled" => false, "quantity" => 0, "purchasePrice" => 0, "sellingPrice" => 0, "minStock" => 5];

        echo json_encode($prod);
    }

    public static function update($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();

        try {
            $db->beginTransaction();

            $stmt = $db->prepare("
                UPDATE products 
                SET name = :name, 
                    brand_id = :brand_id, 
                    category_id = :category_id, 
                    size = :size, 
                    description = :description,
                    active = :active
                WHERE id = :id
            ");
            $stmt->execute([
                ':name' => $data['name'],
                ':brand_id' => !empty($data['brand']) ? $data['brand'] : null,
                ':category_id' => !empty($data['category']) ? $data['category'] : null,
                ':size' => !empty($data['size']) ? $data['size'] : '750ml',
                ':description' => !empty($data['description']) ? $data['description'] : null,
                ':active' => isset($data['active']) ? ($data['active'] ? 1 : 0) : 1,
                ':id' => $id,
            ]);

            // Update TP inventory
            if (isset($data['tp'])) {
                $tp = $data['tp'];
                $stmtTp = $db->prepare("
                    INSERT INTO inventories (product_id, stock_type, enabled, quantity, purchase_price, selling_price, min_stock)
                    VALUES (:pid, 'TP', :enabled, :qty, :pp, :sp, :ms)
                    ON DUPLICATE KEY UPDATE 
                        enabled = VALUES(enabled),
                        quantity = VALUES(quantity),
                        purchase_price = VALUES(purchase_price),
                        selling_price = VALUES(selling_price),
                        min_stock = VALUES(min_stock)
                ");
                $stmtTp->execute([
                    ':pid' => $id,
                    ':enabled' => !empty($tp['enabled']) ? 1 : 0,
                    ':qty' => (int)($tp['quantity'] ?? 0),
                    ':pp' => (float)($tp['purchasePrice'] ?? 0),
                    ':sp' => (float)($tp['sellingPrice'] ?? 0),
                    ':ms' => (int)($tp['minStock'] ?? 5),
                ]);
            }

            // Update Non-TP inventory
            if (isset($data['nonTp'])) {
                $ntp = $data['nonTp'];
                $stmtNtp = $db->prepare("
                    INSERT INTO inventories (product_id, stock_type, enabled, quantity, purchase_price, selling_price, min_stock)
                    VALUES (:pid, 'NON_TP', :enabled, :qty, :pp, :sp, :ms)
                    ON DUPLICATE KEY UPDATE 
                        enabled = VALUES(enabled),
                        quantity = VALUES(quantity),
                        purchase_price = VALUES(purchase_price),
                        selling_price = VALUES(selling_price),
                        min_stock = VALUES(min_stock)
                ");
                $stmtNtp->execute([
                    ':pid' => $id,
                    ':enabled' => !empty($ntp['enabled']) ? 1 : 0,
                    ':qty' => (int)($ntp['quantity'] ?? 0),
                    ':pp' => (float)($ntp['purchasePrice'] ?? 0),
                    ':sp' => (float)($ntp['sellingPrice'] ?? 0),
                    ':ms' => (int)($ntp['minStock'] ?? 5),
                ]);
            }

            $db->commit();
            echo json_encode(["message" => "Product updated successfully", "id" => (string)$id]);
        } catch (Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["message" => "Failed to update product: " . $e->getMessage()]);
        }
    }

    public static function delete($id) {
        $db = (new Database())->getConnection();
        $stmt = $db->prepare("UPDATE products SET active = 0 WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(["message" => "Product deleted successfully"]);
    }
}
