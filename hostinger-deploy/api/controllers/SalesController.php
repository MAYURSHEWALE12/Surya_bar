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
            $sale['createdAt'] = date('c', strtotime($sale['createdAt']));
            $sale['customer'] = json_decode($sale['customer'], true);
            $sale['cashier'] = json_decode($sale['cashier'], true);

            // Fetch items with inventory cost for profit margin
            $stmtItems = $db->prepare("
                SELECT 
                    si.product_id as productId, 
                    si.product_name as productName, 
                    si.stock_type as stockType, 
                    si.size, 
                    si.quantity, 
                    si.unit_price as unitPrice, 
                    si.unit_price as price, 
                    si.total,
                    COALESCE(i.purchase_price, 0.00) as purchasePrice
                FROM sale_items si
                LEFT JOIN inventories i ON i.product_id = si.product_id AND i.stock_type = si.stock_type
                WHERE si.sale_id = :sid
            ");
            $stmtItems->execute([':sid' => $sale['_id']]);
            $items = $stmtItems->fetchAll();
            foreach ($items as &$item) {
                $item['productId'] = (string)$item['productId'];
                $item['quantity'] = (int)$item['quantity'];
                $item['unitPrice'] = (float)$item['unitPrice'];
                $item['price'] = (float)$item['unitPrice'];
                $item['purchasePrice'] = (float)$item['purchasePrice'];
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
            $discountAmount = (float)($data['discountAmount'] ?? $data['discount'] ?? 0);
            $grandTotal = (float)($data['grandTotal'] ?? ($subtotal - $discountAmount));
            $paymentMethod = $data['paymentMethod'] ?? 'CASH';
            $customerId = !empty($data['customerId']) ? (int)$data['customerId'] : null;
            $customerName = trim($data['customerName'] ?? '');
            $customerPhone = preg_replace('/\D/', '', $data['customerPhone'] ?? '');
            $cashierId = $currentUser['id'] ?? 1;

            // Auto-create or link customer if name & phone provided (Borrow billing)
            if (!$customerId && !empty($customerPhone)) {
                $stmtCustCheck = $db->prepare("SELECT id FROM customers WHERE phone = :phone LIMIT 1");
                $stmtCustCheck->execute([':phone' => $customerPhone]);
                $foundId = $stmtCustCheck->fetchColumn();

                if ($foundId) {
                    $customerId = (int)$foundId;
                } else {
                    $stmtNewCust = $db->prepare("INSERT INTO customers (name, phone, credit_limit, current_balance) VALUES (:name, :phone, 10000.00, 0)");
                    $stmtNewCust->execute([
                        ':name' => !empty($customerName) ? $customerName : 'Borrow Customer',
                        ':phone' => $customerPhone
                    ]);
                    $customerId = (int)$db->lastInsertId();
                }
            }

            $stmt = $db->prepare("
                INSERT INTO sales (invoice_number, customer_id, cashier_id, subtotal, discount_type, discount_value, discount_amount, grand_total, payment_method, status, created_at)
                VALUES (:inv, :cid, :uid, :sub, :dtype, :dval, :damt, :grand, :pay, 'ACTIVE', :created)
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
                ':created' => date('Y-m-d H:i:s'),
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
                    "price" => $unitPrice,
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

    public static function voidSale($saleId, $currentUser) {
        $data = json_decode(file_get_contents("php://input"), true);
        $reason = $data['reason'] ?? 'Voided by Admin';
        $db = (new Database())->getConnection();

        try {
            $db->beginTransaction();

            $stmt = $db->prepare("SELECT * FROM sales WHERE id = :id FOR UPDATE");
            $stmt->execute([':id' => $saleId]);
            $sale = $stmt->fetch();

            if (!$sale) {
                $db->rollBack();
                http_response_code(404);
                echo json_encode(["message" => "Sale invoice not found"]);
                return;
            }

            if ($sale['status'] === 'VOIDED') {
                $db->rollBack();
                http_response_code(400);
                echo json_encode(["message" => "Invoice is already voided"]);
                return;
            }

            // Fetch sale items to restore inventory
            $stmtItems = $db->prepare("SELECT * FROM sale_items WHERE sale_id = :sid");
            $stmtItems->execute([':sid' => $saleId]);
            $items = $stmtItems->fetchAll();

            foreach ($items as $item) {
                $stmtRestore = $db->prepare("
                    UPDATE inventories 
                    SET quantity = quantity + :qty 
                    WHERE product_id = :pid AND stock_type = :stype
                ");
                $stmtRestore->execute([
                    ':qty' => (int)$item['quantity'],
                    ':pid' => (int)$item['product_id'],
                    ':stype' => $item['stock_type']
                ]);
            }

            // If borrow sale, reverse customer balance
            if (!empty($sale['customer_id']) && in_array($sale['payment_method'], ['BORROW', 'CREDIT'])) {
                $stmtCust = $db->prepare("UPDATE customers SET current_balance = GREATEST(0, current_balance - :amt) WHERE id = :cid");
                $stmtCust->execute([
                    ':amt' => (float)$sale['grand_total'],
                    ':cid' => (int)$sale['customer_id']
                ]);
            }

            // Mark invoice VOIDED
            $stmtVoid = $db->prepare("
                UPDATE sales 
                SET status = 'VOIDED', void_reason = :reason, voided_at = :now 
                WHERE id = :id
            ");
            $stmtVoid->execute([
                ':reason' => $reason,
                ':now' => date('Y-m-d H:i:s'),
                ':id' => $saleId
            ]);

            // Log in audit trail
            $stmtAudit = $db->prepare("INSERT INTO audit_logs (user_id, action, entity, details) VALUES (:uid, 'VOID_SALE', 'Sales', :details)");
            $stmtAudit->execute([
                ':uid' => $currentUser['id'] ?? 1,
                ':details' => "Invoice #{$sale['invoice_number']} (₹{$sale['grand_total']}) voided. Reason: $reason"
            ]);

            $db->commit();
            echo json_encode([
                "message" => "Invoice voided successfully & stock restored to inventory",
                "invoiceNumber" => $sale['invoice_number']
            ]);
        } catch (Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["message" => "Failed to void invoice: " . $e->getMessage()]);
        }
    }
}
