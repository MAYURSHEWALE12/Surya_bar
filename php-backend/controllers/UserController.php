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

    public static function update($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();

        try {
            $params = [
                ':name' => $data['name'],
                ':email' => $data['email'],
                ':role' => $data['role'] ?? 'CASHIER',
                ':status' => $data['status'] ?? 'ACTIVE',
                ':id' => $id
            ];

            $passSql = "";
            if (!empty($data['password'])) {
                $passSql = ", password = :pass";
                $params[':pass'] = password_hash($data['password'], PASSWORD_DEFAULT);
            }

            $stmt = $db->prepare("UPDATE users SET name = :name, email = :email, role = :role, status = :status $passSql WHERE id = :id");
            $stmt->execute($params);

            echo json_encode(["message" => "User updated successfully", "id" => (string)$id]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Failed to update user: " . $e->getMessage()]);
        }
    }

    public static function delete($id, $currentUser) {
        if ($id == ($currentUser['id'] ?? 0)) {
            http_response_code(400);
            echo json_encode(["message" => "Cannot delete your own account"]);
            return;
        }

        $db = (new Database())->getConnection();
        $stmt = $db->prepare("DELETE FROM users WHERE id = :id");
        $stmt->execute([':id' => $id]);

        echo json_encode(["message" => "User deleted successfully"]);
    }
}
