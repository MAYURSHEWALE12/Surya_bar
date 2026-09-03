<?php
require_once __DIR__ . "/../config/database.php";

class VendorController {
    public static function getAll() {
        $db = (new Database())->getConnection();
        $stmt = $db->query("SELECT id as _id, name, contact_person as contactPerson, phone, email, address, gstin, active, created_at as createdAt FROM vendors WHERE active = 1 ORDER BY name ASC");
        $vendors = $stmt->fetchAll();
        foreach ($vendors as &$v) $v['_id'] = (string)$v['_id'];
        echo json_encode($vendors);
    }

    public static function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();

        $stmt = $db->prepare("INSERT INTO vendors (name, contact_person, phone, email, address, gstin) VALUES (:name, :cp, :phone, :email, :address, :gstin)");
        $stmt->execute([
            ':name' => $data['name'],
            ':cp' => $data['contactPerson'] ?? null,
            ':phone' => $data['phone'] ?? null,
            ':email' => $data['email'] ?? null,
            ':address' => $data['address'] ?? null,
            ':gstin' => $data['gstin'] ?? null,
        ]);

        http_response_code(201);
        echo json_encode(["message" => "Vendor created", "id" => (string)$db->lastInsertId()]);
    }
}
