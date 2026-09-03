<?php
require_once __DIR__ . "/../config/database.php";

class AuditController {
    public static function getAll() {
        $db = (new Database())->getConnection();
        $stmt = $db->query("
            SELECT a.id as _id, a.action, a.entity, a.details, a.ip, a.created_at as createdAt,
                   JSON_OBJECT('id', u.id, 'name', u.name) as user
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.id DESC LIMIT 100
        ");
        $logs = $stmt->fetchAll();
        foreach ($logs as &$l) {
            $l['_id'] = (string)$l['_id'];
            $l['user'] = json_decode($l['user'], true);
        }
        echo json_encode($logs);
    }
}
