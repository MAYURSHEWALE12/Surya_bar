<?php
require_once __DIR__ . "/../config/database.php";

class CustomerController {
    public static function getAll() {
        $db = (new Database())->getConnection();
        $stmt = $db->query("SELECT id as _id, name, phone, email, address, credit_limit as creditLimit, current_balance as currentBalance, active, created_at as createdAt FROM customers WHERE active = 1 ORDER BY name ASC");
        $custs = $stmt->fetchAll();
        foreach ($custs as &$c) $c['_id'] = (string)$c['_id'];
        echo json_encode($custs);
    }

    public static function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();

        $stmt = $db->prepare("INSERT INTO customers (name, phone, email, address, credit_limit) VALUES (:name, :phone, :email, :address, :limit)");
        $stmt->execute([
            ':name' => $data['name'],
            ':phone' => $data['phone'],
            ':email' => !empty($data['email']) ? $data['email'] : null,
            ':address' => !empty($data['address']) ? $data['address'] : null,
            ':limit' => !empty($data['creditLimit']) ? $data['creditLimit'] : 10000.00
        ]);

        http_response_code(201);
        echo json_encode(["message" => "Customer created", "id" => (string)$db->lastInsertId()]);
    }
}
