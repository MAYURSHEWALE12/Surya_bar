<?php
require_once __DIR__ . "/../config/database.php";

class InventoryController {
    public static function getAll() {
        $db = (new Database())->getConnection();

        $stmt = $db->query("
            SELECT 
                i.id as _id,
                i.product_id as productId,
                p.name as productName,
                p.size,
                p.unit,
                JSON_OBJECT(
                    'id', p.id,
                    '_id', p.id,
                    'name', p.name,
                    'size', p.size,
                    'unit', p.unit,
                    'category', JSON_OBJECT('id', c.id, 'name', c.name),
                    'brand', JSON_OBJECT('id', b.id, 'name', b.name)
                ) as product,
                i.stock_type as stockType,
                i.enabled,
                i.quantity,
                i.purchase_price as purchasePrice,
                i.selling_price as sellingPrice,
                i.min_stock as minStock,
                i.min_stock as minimumStock,
                i.updated_at as updatedAt
            FROM inventories i
            JOIN products p ON i.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.active = 1
            ORDER BY p.name ASC, i.stock_type ASC
        ");

        $invs = $stmt->fetchAll();
        foreach ($invs as &$inv) {
            $inv['_id'] = (string)$inv['_id'];
            $inv['productId'] = (string)$inv['productId'];
            $inv['product'] = json_decode($inv['product'], true);
            $inv['quantity'] = (int)$inv['quantity'];
            $inv['minStock'] = (int)$inv['minStock'];
            $inv['minimumStock'] = (int)$inv['minStock'];
            $inv['purchasePrice'] = (float)$inv['purchasePrice'];
            $inv['sellingPrice'] = (float)$inv['sellingPrice'];
            $inv['enabled'] = (bool)$inv['enabled'];
        }
        echo json_encode($invs);
    }

    public static function adjust($currentUser) {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();

        $productId = (int)($data['productId'] ?? 0);
        $stockType = $data['stockType'] ?? 'TP';
        $reason = $data['reason'] ?? 'Manual Adjustment';

        if (!$productId) {
            http_response_code(400);
            echo json_encode(["message" => "Product ID is required"]);
            return;
        }

        // Fetch current quantity
        $stmtCur = $db->prepare("SELECT quantity FROM inventories WHERE product_id = :pid AND stock_type = :stype");
        $stmtCur->execute([':pid' => $productId, ':stype' => $stockType]);
        $curQty = (int)($stmtCur->fetchColumn() ?: 0);

        if (isset($data['newQuantity']) && is_numeric($data['newQuantity'])) {
            $finalQty = max(0, (int)$data['newQuantity']);
        } elseif (isset($data['adjustmentQuantity']) && is_numeric($data['adjustmentQuantity'])) {
            $finalQty = max(0, $curQty + (int)$data['adjustmentQuantity']);
        } elseif (isset($data['quantity']) && is_numeric($data['quantity'])) {
            $finalQty = max(0, (int)$data['quantity']);
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Please provide newQuantity, adjustmentQuantity, or quantity"]);
            return;
        }

        $stmt = $db->prepare("
            INSERT INTO inventories (product_id, stock_type, quantity, min_stock, enabled)
            VALUES (:pid, :stype, :qty, 5, 1)
            ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)
        ");
        $stmt->execute([':qty' => $finalQty, ':pid' => $productId, ':stype' => $stockType]);

        // Log audit
        $stmtAudit = $db->prepare("INSERT INTO audit_logs (user_id, action, entity, details) VALUES (:uid, 'INVENTORY_ADJUST', 'Inventory', :details)");
        $stmtAudit->execute([
            ':uid' => $currentUser['id'] ?? 1,
            ':details' => "Product ID: $productId ($stockType) adjusted from $curQty to $finalQty. Reason: $reason"
        ]);

        echo json_encode([
            "message" => "Stock adjusted successfully",
            "productId" => (string)$productId,
            "stockType" => $stockType,
            "previousQuantity" => $curQty,
            "newQuantity" => $finalQty
        ]);
    }
}
