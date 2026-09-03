<?php
require_once __DIR__ . "/../config/database.php";

class MetaController {
    public static function getCategories() {
        $db = (new Database())->getConnection();
        $stmt = $db->query("SELECT id as _id, name, description, active FROM categories WHERE active = 1 ORDER BY name ASC");
        $cats = $stmt->fetchAll();
        foreach ($cats as &$c) $c['_id'] = (string)$c['_id'];
        echo json_encode($cats);
    }

    public static function getBrands() {
        $db = (new Database())->getConnection();
        $stmt = $db->query("SELECT id as _id, name, description, active FROM brands WHERE active = 1 ORDER BY name ASC");
        $brands = $stmt->fetchAll();
        foreach ($brands as &$b) $b['_id'] = (string)$b['_id'];
        echo json_encode($brands);
    }

    public static function createCategory() {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();
        $name = trim($data['name'] ?? '');
        $desc = trim($data['description'] ?? '');

        if (!$name) {
            http_response_code(400);
            echo json_encode(["message" => "Category name is required"]);
            return;
        }

        $stmt = $db->prepare("INSERT INTO categories (name, description, active) VALUES (:name, :desc, 1)");
        $stmt->execute([':name' => $name, ':desc' => $desc]);
        $id = (string)$db->lastInsertId();

        http_response_code(201);
        echo json_encode(["_id" => $id, "id" => $id, "name" => $name, "description" => $desc, "active" => true]);
    }

    public static function createBrand() {
        $data = json_decode(file_get_contents("php://input"), true);
        $db = (new Database())->getConnection();
        $name = trim($data['name'] ?? '');
        $desc = trim($data['description'] ?? '');

        if (!$name) {
            http_response_code(400);
            echo json_encode(["message" => "Brand name is required"]);
            return;
        }

        $stmt = $db->prepare("INSERT INTO brands (name, description, active) VALUES (:name, :desc, 1)");
        $stmt->execute([':name' => $name, ':desc' => $desc]);
        $id = (string)$db->lastInsertId();

        http_response_code(201);
        echo json_encode(["_id" => $id, "id" => $id, "name" => $name, "description" => $desc, "active" => true]);
    }
}
