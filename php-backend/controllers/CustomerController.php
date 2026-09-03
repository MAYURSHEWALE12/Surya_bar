<?php
require_once __DIR__ . "/../config/database.php";

class CustomerController {
    public static function getAll() {
        $db = (new Database())->getConnection();
        $stmt = $db->query("
            SELECT 
                c.id as _id, 
                c.name, 
                c.phone, 
                c.email, 
                c.address, 
                c.credit_limit as creditLimit, 
                c.current_balance as currentBalance, 
                c.active, 
                c.created_at as createdAt,
                COALESCE((SELECT SUM(amount) FROM credit_transactions WHERE customer_id = c.id AND type IN ('BORROW', 'DEBIT_SALE')), 0) as totalBorrowed,
                COALESCE((SELECT SUM(amount) FROM credit_transactions WHERE customer_id = c.id AND type IN ('PAYMENT', 'CREDIT_PAYMENT')), 0) as totalPaid
            FROM customers c 
            WHERE c.active = 1 
            ORDER BY c.current_balance DESC, c.name ASC
        ");
        $custs = $stmt->fetchAll();

        $totalMarketOutstanding = 0;
        $totalWithDue = 0;
        $totalPaid = 0;

        foreach ($custs as &$c) {
            $c['_id'] = (string)$c['_id'];
            $c['currentBalance'] = (float)$c['currentBalance'];
            $c['creditLimit'] = (float)$c['creditLimit'];
            $c['totalBorrowed'] = (float)$c['totalBorrowed'];
            $c['totalPaid'] = (float)$c['totalPaid'];

            $totalMarketOutstanding += $c['currentBalance'];
            if ($c['currentBalance'] > 0) $totalWithDue++;
            $totalPaid += $c['totalPaid'];
        }

        echo json_encode([
            "customers" => $custs,
            "metrics" => [
                "totalMarketOutstanding" => $totalMarketOutstanding,
                "totalWithDue" => $totalWithDue,
                "totalCustomers" => count($custs),
                "totalPaid" => $totalPaid
            ]
        ]);
    }

    public static function getStatement($id) {
        $db = (new Database())->getConnection();
        $stmt = $db->prepare("SELECT id as _id, name, phone, email, address, credit_limit as creditLimit, current_balance as currentBalance, active, created_at as createdAt FROM customers WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $customer = $stmt->fetch();

        if (!$customer) {
            http_response_code(404);
            echo json_encode(["message" => "Customer not found"]);
            return;
        }

        $customer['_id'] = (string)$customer['_id'];
        $customer['currentBalance'] = (float)$customer['currentBalance'];

        $stmtTx = $db->prepare("
            SELECT 
                t.id as _id, 
                t.type, 
                t.amount, 
                t.balance_after as balanceAfter, 
                t.payment_method as paymentMethod, 
                t.notes, 
                t.created_at as createdAt,
                JSON_OBJECT('id', s.id, 'invoiceNumber', s.invoice_number, 'grandTotal', s.grand_total) as sale
            FROM credit_transactions t
            LEFT JOIN sales s ON t.sale_id = s.id
            WHERE t.customer_id = :cid
            ORDER BY t.id DESC
        ");
        $stmtTx->execute([':cid' => $id]);
        $txs = $stmtTx->fetchAll();

        foreach ($txs as &$tx) {
            $tx['_id'] = (string)$tx['_id'];
            $tx['amount'] = (float)$tx['amount'];
            $tx['balanceAfter'] = (float)$tx['balanceAfter'];
            $tx['createdAt'] = date('c', strtotime($tx['createdAt']));
            $tx['sale'] = json_decode($tx['sale'], true);
        }

        echo json_encode([
            "customer" => $customer,
            "transactions" => $txs
        ]);
    }

    public static function recordPayment($id, $currentUser) {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();

        $amount = (float)($data['amount'] ?? 0);
        $paymentMethod = $data['paymentMethod'] ?? 'CASH';
        $notes = $data['notes'] ?? 'Settlement payment';

        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(["message" => "Please enter a valid repayment amount"]);
            return;
        }

        try {
            $db->beginTransaction();

            $stmt = $db->prepare("SELECT current_balance, name, phone FROM customers WHERE id = :id FOR UPDATE");
            $stmt->execute([':id' => $id]);
            $customerRow = $stmt->fetch();

            if (!$customerRow) {
                $db->rollBack();
                http_response_code(404);
                echo json_encode(["message" => "Customer not found"]);
                return;
            }

            $prevBalance = (float)$customerRow['current_balance'];

            if ($prevBalance <= 0) {
                $db->rollBack();
                http_response_code(400);
                echo json_encode(["message" => "Customer has zero outstanding balance. No settlement required."]);
                return;
            }

            if ($amount > $prevBalance) {
                $amount = $prevBalance; // Cap repayment to exact outstanding balance
            }

            $newBalance = max(0, $prevBalance - $amount);

            $stmtUpdate = $db->prepare("UPDATE customers SET current_balance = :nbal WHERE id = :id");
            $stmtUpdate->execute([':nbal' => $newBalance, ':id' => $id]);

            $stmtTx = $db->prepare("
                INSERT INTO credit_transactions (customer_id, type, amount, balance_after, payment_method, notes, cashier_id)
                VALUES (:cid, 'PAYMENT', :amt, :bal, :pmeth, :notes, :uid)
            ");
            $stmtTx->execute([
                ':cid' => $id,
                ':amt' => $amount,
                ':bal' => $newBalance,
                ':pmeth' => $paymentMethod,
                ':notes' => !empty($notes) ? $notes : "Repayment received via $paymentMethod",
                ':uid' => $currentUser['id'] ?? 1
            ]);

            $db->commit();
            echo json_encode([
                "message" => "Repayment recorded successfully",
                "newBalance" => $newBalance,
                "settlementReceipt" => [
                    "customerName" => $customerRow['name'],
                    "customerPhone" => $customerRow['phone'],
                    "amountPaid" => $amount,
                    "previousBalance" => $prevBalance,
                    "remainingBalance" => $newBalance,
                    "paymentMethod" => $paymentMethod,
                    "date" => date("Y-m-d H:i:s")
                ]
            ]);
        } catch (Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["message" => "Failed to record payment: " . $e->getMessage()]);
        }
    }

    public static function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();

        $phone = preg_replace('/\\D/', '', $data['phone'] ?? '');

        // Check if customer with phone already exists
        $stmtCheck = $db->prepare("SELECT id FROM customers WHERE phone = :phone LIMIT 1");
        $stmtCheck->execute([':phone' => $phone]);
        $existingId = $stmtCheck->fetchColumn();

        if ($existingId) {
            echo json_encode(["message" => "Customer found", "customer" => ["_id" => (string)$existingId, "name" => $data['name'], "phone" => $phone], "isNew" => false]);
            return;
        }

        $stmt = $db->prepare("INSERT INTO customers (name, phone, email, address, credit_limit) VALUES (:name, :phone, :email, :address, :limit)");
        $stmt->execute([
            ':name' => $data['name'],
            ':phone' => $phone,
            ':email' => !empty($data['email']) ? $data['email'] : null,
            ':address' => !empty($data['address']) ? $data['address'] : null,
            ':limit' => !empty($data['creditLimit']) ? (float)$data['creditLimit'] : 10000.00
        ]);

        $newId = (string)$db->lastInsertId();
        http_response_code(201);
        echo json_encode([
            "message" => "Customer created",
            "customer" => ["_id" => $newId, "name" => $data['name'], "phone" => $phone],
            "isNew" => true
        ]);
    }
}
