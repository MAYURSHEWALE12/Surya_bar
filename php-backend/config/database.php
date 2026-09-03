<?php
// Surya Bar POS - MySQL Database Configuration

class Database {
    private $host = "localhost";
    private $db_name = "surya_bar"; // Change to your cPanel database name (e.g. u123456_suryabar)
    private $username = "root";      // Change to your cPanel database username
    private $password = "";          // Change to your cPanel database password
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $this->conn = new PDO($dsn, $this->username, $this->password, $options);
        } catch(PDOException $exception) {
            http_response_code(500);
            echo json_encode(["message" => "Database connection error: " . $exception->getMessage()]);
            exit;
        }
        return $this->conn;
    }
}
