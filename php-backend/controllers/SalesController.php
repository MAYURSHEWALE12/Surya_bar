<?php
require_once __DIR__ . "/../config/database.php";

class SalesController {
    public static function getAll() {
        $db = (new Database())->getConnection();

        $stmt = $db->query("
            SELECT 
                s.id as _id,
                s.invoice_number as invoiceNumber,
                s.subtotal,
                s.discount_type as discountType,
                s.discount_value as discountValue,
                s.discount_amount as discountAmount,
                s.tax,
                s.grand_total as grandTotal,
                s.payment_method as paymentMethod,
                s.status,
                s.void_reason as voidReason,
                s.voided_at as voidedAt,
                s.created_at as createdAt,
                JSON_OBJECT('id', c.id, 'name', c.name, 'phone', c.phone) as customer,
                JSON_OBJECT('id', u.id, 'name', u.name) as cashier
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.cashier_id = u.id
            ORDER BY s.id DESC
        ");

        $sales = $stmt->fetchAll();

        foreach ($sales as &$sale) {
            $sale['_id'] = (string)$sale['_id'];
            $sale['subtotal'] = (float)$sale['subtotal'];
            $sale['discount'] = (float)$sale['discountAmount'];
            $sale['discountValue'] = (float)$sale['discountValue'];
            $sale['discountAmount'] = (float)$sale['discountAmount'];
            $sale['tax'] = (float)$sale['tax'];
            $sale['grandTotal'] = (float)$sale['grandTotal'];
            $sale['customer'] = json_decode($sale['customer'], true);
            $sale['cashier'] = json_decode($sale['cashier'], true);

            // Fetch items
            $stmtItems = $db->prepare("SELECT product_id as productId, product_name as productName, stock_type as stockType, size, quantity, unit_price as unitPrice, total FROM sale_items WHERE sale_id = :sid");
            $stmtItems->execute([':sid' => $sale['_id']]);
            $items = $stmtItems->fetchAll();
            foreach ($items as &$item) {
                $item['productId'] = (string)$item['productId'];
                $item['quantity'] = (int)$item['quantity'];
                $item['unitPrice'] = (float)$item['unitPrice'];
                $item['total'] = (float)$item['total'];
            }
            $sale['items'] = $items;
        }

        echo json_encode($sales);
    }

    public static function create($currentUser) {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();

        try {
            $db->beginTransaction();

            $invoiceNum = "INV-" . date("Ymd") . "-" . rand(1000, 9999);
            $subtotal = (float)($data['subtotal'] ?? 0);
            $discountType = $data['discountType'] ?? 'PERCENT';
            $discountVal = (float)($data['discountValue'] ?? 0);
            $discountAmount = (float)($data['discountAmount'] ?? 0);
            $grandTotal = (float)($data['grandTotal'] ?? 0);
            $paymentMethod = $data['paymentMethod'] ?? 'CASH';
            $customerId = !empty($data['customerId']) ? $data['customerId'] : null;
            $cashierId = $currentUser['id'] ?? 1;

            $stmt = $db->prepare("
                INSERT INTO sales (invoice_number, customer_id, cashier_id, subtotal, discount_type, discount_value, discount_amount, grand_total, payment_method, status)
                VALUES (:inv, :cid, :uid, :sub, :dtype, :dval, :damt, :grand, :pay, 'ACTIVE')
            ");
            $stmt->execute([
                ':inv' => $invoiceNum,
                ':cid' => $customerId,
                ':uid' => $cashierId,
                ':sub' => $subtotal,
                ':dtype' => $discountType,
                ':dval' => $discountVal,
                ':damt' => $discountAmount,
                ':grand' => $grandTotal,
                ':pay' => $paymentMethod,
            ]);

            $saleId = $db->lastInsertId();

            // Insert items and deduct stock
            $items = $data['items'] ?? [];
            $savedItems = [];

            foreach ($items as $item) {
                $pid = (int)($item['productId'] ?? $item['product'] ?? $item['id'] ?? 0);
                $stockType = $item['stockType'] ?? 'TP';
                $qty = (int)($item['quantity'] ?? 1);

                // Fetch product details if not supplied
                $stmtProd = $db->prepare("
                    SELECT p.name, p.size, i.selling_price 
                    FROM products p 
                    LEFT JOIN inventories i ON i.product_id = p.id AND i.stock_type = :stype
                    WHERE p.id = :pid LIMIT 1
                ");
                $stmtProd->execute([':pid' => $pid, ':stype' => $stockType]);
                $prodRow = $stmtProd->fetch();

                $pName = $item['productName'] ?? $item['name'] ?? ($prodRow['name'] ?? 'Liquor Bottle');
                $size = $item['size'] ?? ($prodRow['size'] ?? '750ml');
                $unitPrice = (float)($item['unitPrice'] ?? ($prodRow['selling_price'] ?? 0));
                $total = (float)($item['total'] ?? ($qty * $unitPrice));

                $stmtItem = $db->prepare("
                    INSERT INTO sale_items (sale_id, product_id, stock_type, product_name, size, quantity, unit_price, total)
                    VALUES (:sid, :pid, :stype, :pname, :size, :qty, :up, :tot)
                ");
                $stmtItem->execute([
                    ':sid' => $saleId,
                    ':pid' => $pid,
                    ':stype' => $stockType,
                    ':pname' => $pName,
                    ':size' => $size,
                    ':qty' => $qty,
                    ':up' => $unitPrice,
                    ':tot' => $total,
                ]);

                // Deduct stock from inventories table
                $stmtStock = $db->prepare("UPDATE inventories SET quantity = GREATEST(0, quantity - :qty) WHERE product_id = :pid AND stock_type = :stype");
                $stmtStock->execute([':qty' => $qty, ':pid' => $pid, ':stype' => $stockType]);

                $savedItems[] = [
                    "productId" => (string)$pid,
                    "productName" => $pName,
                    "size" => $size,
                    "stockType" => $stockType,
                    "quantity" => $qty,
                    "unitPrice" => $unitPrice,
                    "total" => $total
                ];
            }

            // Customer Khata (Credit Borrow Handling)
            if ($customerId && $paymentMethod === 'BORROW') {
                $stmtCust = $db->prepare("UPDATE customers SET current_balance = current_balance + :amt WHERE id = :cid");
                $stmtCust->execute([':amt' => $grandTotal, ':cid' => $customerId]);

                $stmtBal = $db->prepare("SELECT current_balance FROM customers WHERE id = :cid");
                $stmtBal->execute([':cid' => $customerId]);
                $newBal = $stmtBal->fetchColumn();

                $stmtTx = $db->prepare("
                    INSERT INTO credit_transactions (customer_id, sale_id, type, amount, balance_after, payment_method, notes, cashier_id)
                    VALUES (:cid, :sid, 'BORROW', :amt, :bal, 'CREDIT', :notes, :uid)
                ");
                $stmtTx->execute([
                    ':cid' => $customerId,
                    ':sid' => $saleId,
                    ':amt' => $grandTotal,
                    ':bal' => $newBal,
                    ':notes' => "Invoice #$invoiceNum",
                    ':uid' => $cashierId
                ]);
            }

            $db->commit();
            http_response_code(201);
            echo json_encode([
                "_id" => (string)$saleId,
                "id" => (string)$saleId,
                "invoiceNumber" => $invoiceNum,
                "subtotal" => $subtotal,
                "discount" => $discountAmount,
                "discountType" => $discountType,
                "discountValue" => $discountVal,
                "discountAmount" => $discountAmount,
                "tax" => 0,
                "grandTotal" => $grandTotal,
                "paymentMethod" => $paymentMethod,
                "status" => "ACTIVE",
                "items" => $savedItems,
                "createdAt" => date("Y-m-d H:i:s")
            ]);
        } catch (Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["message" => "Checkout failed: " . $e->getMessage()]);
        }
    }
}
