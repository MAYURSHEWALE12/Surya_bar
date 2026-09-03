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
}
