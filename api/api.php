<?php
require_once 'db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'items':
        handleItems($method);
        break;
    case 'technicians':
        handleTechnicians($method);
        break;
    case 'transactions':
        handleTransactions($method);
        break;
    case 'auth':
        handleAuth($method);
        break;
    default:
        echo json_encode(["status" => "error", "message" => "Invalid action"]);
        break;
}

function handleItems($method) {
    global $conn;
    if ($method === 'GET') {
        $stmt = $conn->prepare("SELECT * FROM items ORDER BY name ASC");
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($results);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['id'])) {
            // Update
            $sql = "UPDATE items SET name=?, category=?, totalQuantity=?, availableQuantity=?, defectiveQuantity=?, unit=?, lowStockThreshold=? WHERE id=?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$data['name'], $data['category'], $data['totalQuantity'], $data['availableQuantity'], $data['defectiveQuantity'] ?? 0, $data['unit'], $data['lowStockThreshold'], $data['id']]);
        } else {
            // Create
            $id = uniqid('item_');
            $sql = "INSERT INTO items (id, name, category, totalQuantity, availableQuantity, defectiveQuantity, unit, lowStockThreshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$id, $data['name'], $data['category'], $data['totalQuantity'], $data['availableQuantity'], $data['defectiveQuantity'] ?? 0, $data['unit'], $data['lowStockThreshold']]);
        }
        echo json_encode(["status" => "success"]);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'];
        $stmt = $conn->prepare("DELETE FROM items WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
}

function handleTechnicians($method) {
    global $conn;
    if ($method === 'GET') {
        $stmt = $conn->prepare("SELECT * FROM technicians ORDER BY name ASC");
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($results);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['id'])) {
            $sql = "UPDATE technicians SET name=?, department=?, phone=?, email=?, password=? WHERE id=?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$data['name'], $data['department'], $data['phone'] ?? '', $data['email'] ?? '', $data['password'] ?? '', $data['id']]);
        } else {
            $id = uniqid('tech_');
            $sql = "INSERT INTO technicians (id, name, department, phone, email, password) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$id, $data['name'], $data['department'], $data['phone'] ?? '', $data['email'] ?? '', $data['password'] ?? '']);
        }
        echo json_encode(["status" => "success"]);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'];
        $stmt = $conn->prepare("DELETE FROM technicians WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
}

function handleTransactions($method) {
    global $conn;
    if ($method === 'GET') {
        $stmt = $conn->prepare("SELECT * FROM transactions ORDER BY timestamp DESC");
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($results);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = uniqid('trans_');
        $sql = "INSERT INTO transactions (id, itemId, technicianId, type, quantity, timestamp, itemName, technicianName, jobId, customerName, serialNumber, `condition`, adjustmentReason, difference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $id, 
            $data['itemId'], 
            $data['technicianId'], 
            $data['type'], 
            $data['quantity'], 
            $data['timestamp'], 
            $data['itemName'], 
            $data['technicianName'], 
            $data['jobId'] ?? null, 
            $data['customerName'] ?? null, 
            $data['serialNumber'] ?? null, 
            $data['condition'] ?? null, 
            $data['adjustmentReason'] ?? null, 
            $data['difference'] ?? null
        ]);
        echo json_encode(["status" => "success"]);
    }
}

function handleAuth($method) {
    global $conn;
    if ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'];
        $password = $data['password'];

        // Special handling for built-in admin
        if ($email === 'admin@gnet.com' && $password === 'admin123') { // Assumption of default pass
             echo json_encode(["status" => "success", "user" => ["email" => "admin@gnet.com", "role" => "ADMIN", "name" => "Administrator"]]);
             return;
        }

        $stmt = $conn->prepare("SELECT * FROM technicians WHERE email = ? AND password = ?");
        $stmt->execute([$email, $password]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            echo json_encode(["status" => "success", "user" => ["email" => $user['email'], "role" => "TECHNICIAN", "name" => $user['name'], "id" => $user['id']]]);
        } else {
            echo json_encode(["status" => "error", "message" => "Invalid credentials"]);
        }
    }
}
?>
