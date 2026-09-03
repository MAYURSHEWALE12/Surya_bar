<?php
require_once __DIR__ . "/../config/database.php";

class PurchaseController {
    public static function getAll() {
        $db = (new Database())->getConnection();

        $stmt = $db->query("
            SELECT 
                p.id as _id,
                p.purchase_number as invoiceNumber,
                p.purchase_number as purchaseNumber,
                p.invoice_date as invoiceDate,
                p.total_amount as grandTotal,
                p.total_amount as subtotal,
                p.total_amount as totalAmount,
                p.payment_status as paymentStatus,
                p.payment_method as paymentMethod,
                p.notes,
                p.created_at as createdAt,
                CASE WHEN v.id IS NOT NULL THEN JSON_OBJECT('id', v.id, 'name', v.name) ELSE NULL END as vendor
            FROM purchases p
            LEFT JOIN vendors v ON p.vendor_id = v.id
            ORDER BY p.id DESC
        ");

        $purchases = $stmt->fetchAll();
        foreach ($purchases as &$p) {
            $p['_id'] = (string)$p['_id'];
            $p['grandTotal'] = (float)$p['grandTotal'];
            $p['subtotal'] = (float)$p['subtotal'];
            $p['totalAmount'] = (float)$p['totalAmount'];
            $p['createdAt'] = date('c', strtotime($p['createdAt']));
            $p['vendor'] = !empty($p['vendor']) ? json_decode($p['vendor'], true) : null;

            $stmtItems = $db->prepare("
                SELECT 
                    pi.product_id as productId,
                    pi.product_id as product,
                    pi.stock_type as stockType,
                    pi.quantity,
                    pi.purchase_price as purchasePrice,
                    pi.selling_price as sellingPrice,
                    pi.total,
                    JSON_OBJECT('id', pr.id, 'name', pr.name, 'size', pr.size) as productObj
                FROM purchase_items pi
                LEFT JOIN products pr ON pi.product_id = pr.id
                WHERE pi.purchase_id = :pid
            ");
            $stmtItems->execute([':pid' => $p['_id']]);
            $items = $stmtItems->fetchAll();
            foreach ($items as &$it) {
                $it['quantity'] = (int)$it['quantity'];
                $it['purchasePrice'] = (float)$it['purchasePrice'];
                $it['sellingPrice'] = (float)$it['sellingPrice'];
                $it['total'] = (float)$it['total'];
                $it['product'] = !empty($it['productObj']) ? json_decode($it['productObj'], true) : ["name" => "Item"];
            }
            $p['items'] = $items;
        }

        echo json_encode($purchases);
    }

    public static function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();

        try {
            $db->beginTransaction();

            $purchNumber = !empty($data['invoiceNumber']) ? $data['invoiceNumber'] : ("PO-" . date("Ymd") . "-" . rand(1000, 9999));
            $totalAmount = (float)($data['grandTotal'] ?? $data['totalAmount'] ?? $data['subtotal'] ?? 0);
            
            $vendorId = null;
            if (!empty($data['vendor'])) {
                $vendorId = is_array($data['vendor']) ? ($data['vendor']['_id'] ?? $data['vendor']['id'] ?? null) : $data['vendor'];
            } elseif (!empty($data['vendorId'])) {
                $vendorId = $data['vendorId'];
            }

            $stmt = $db->prepare("INSERT INTO purchases (purchase_number, vendor_id, invoice_date, total_amount, payment_status, payment_method, notes) VALUES (:pnum, :vid, :idate, :tot, :pstat, :pmeth, :notes)");
            $stmt->execute([
                ':pnum' => $purchNumber,
                ':vid' => !empty($vendorId) ? (int)$vendorId : null,
                ':idate' => $data['invoiceDate'] ?? date("Y-m-d"),
                ':tot' => $totalAmount,
                ':pstat' => $data['paymentStatus'] ?? 'PAID',
                ':pmeth' => $data['paymentMethod'] ?? 'BANK_TRANSFER',
                ':notes' => $data['notes'] ?? null,
            ]);

            $purchaseId = $db->lastInsertId();

            $items = $data['items'] ?? [];
            foreach ($items as $item) {
                $pid = (int)($item['product'] ?? $item['productId'] ?? $item['id'] ?? 0);
                $stockType = $item['stockType'] ?? 'TP';
                $qty = (int)($item['quantity'] ?? 1);
                $pp = (float)($item['purchasePrice'] ?? 0);
                $sp = (float)($item['sellingPrice'] ?? 0);
                $tot = (float)($item['total'] ?? ($qty * $pp));

                $stmtItem = $db->prepare("INSERT INTO purchase_items (purchase_id, product_id, stock_type, quantity, purchase_price, selling_price, total) VALUES (:puid, :pid, :stype, :qty, :pp, :sp, :tot)");
                $stmtItem->execute([
                    ':puid' => $purchaseId,
                    ':pid' => $pid,
                    ':stype' => $stockType,
                    ':qty' => $qty,
                    ':pp' => $pp,
                    ':sp' => $sp,
                    ':tot' => $tot
                ]);

                // Increase stock in inventories table
                $stmtStock = $db->prepare("
                    INSERT INTO inventories (product_id, stock_type, enabled, quantity, purchase_price, selling_price)
                    VALUES (:pid, :stype, 1, :qty, :pp, :sp)
                    ON DUPLICATE KEY UPDATE 
                        quantity = quantity + :qty2, 
                        purchase_price = :pp2,
                        selling_price = CASE WHEN :sp2 > 0 THEN :sp3 ELSE selling_price END
                ");
                $stmtStock->execute([
                    ':pid' => $pid,
                    ':stype' => $stockType,
                    ':qty' => $qty,
                    ':pp' => $pp,
                    ':sp' => $sp,
                    ':qty2' => $qty,
                    ':pp2' => $pp,
                    ':sp2' => $sp,
                    ':sp3' => $sp
                ]);
            }

            $db->commit();
            http_response_code(201);
            echo json_encode(["message" => "Purchase order recorded successfully", "purchaseNumber" => $purchNumber, "id" => (string)$purchaseId]);
        } catch (Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["message" => "Purchase entry failed: " . $e->getMessage()]);
        }
    }
}
