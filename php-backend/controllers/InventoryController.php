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
        $newQuantity = (int)($data['quantity'] ?? 0);
        $reason = $data['reason'] ?? 'Manual Adjustment';

        $stmt = $db->prepare("UPDATE inventories SET quantity = :qty WHERE product_id = :pid AND stock_type = :stype");
        $stmt->execute([':qty' => $newQuantity, ':pid' => $productId, ':stype' => $stockType]);

        // Log audit
        $stmtAudit = $db->prepare("INSERT INTO audit_logs (user_id, action, entity, details) VALUES (:uid, 'INVENTORY_ADJUST', 'Inventory', :details)");
        $stmtAudit->execute([
            ':uid' => $currentUser['id'] ?? 1,
            ':details' => "Product ID: $productId ($stockType) adjusted to $newQuantity qty. Reason: $reason"
        ]);

        echo json_encode(["message" => "Stock adjusted successfully"]);
    }
}
