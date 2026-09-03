<?php
require_once __DIR__ . "/../config/database.php";

class UserController {
    public static function getAll() {
        $db = (new Database())->getConnection();
        $stmt = $db->query("SELECT id as _id, name, email, role, status, created_at as createdAt FROM users ORDER BY name ASC");
        $users = $stmt->fetchAll();
        foreach ($users as &$u) $u['_id'] = (string)$u['_id'];
        echo json_encode($users);
    }

    public static function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();

        $hash = password_hash($data['password'] ?? 'admin123', PASSWORD_DEFAULT);
        $stmt = $db->prepare("INSERT INTO users (name, email, password, role, status) VALUES (:name, :email, :pass, :role, 'ACTIVE')");
        $stmt->execute([
            ':name' => $data['name'],
            ':email' => $data['email'],
            ':pass' => $hash,
            ':role' => $data['role'] ?? 'CASHIER'
        ]);

        http_response_code(201);
        echo json_encode(["message" => "Staff member created", "id" => (string)$db->lastInsertId()]);
    }
}
