CREATE DATABASE IF NOT EXISTS gnet_inventory;
USE gnet_inventory;

CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    totalQuantity INT NOT NULL DEFAULT 0,
    availableQuantity INT NOT NULL DEFAULT 0,
    defectiveQuantity INT NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    lowStockThreshold INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS technicians (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    itemId VARCHAR(50),
    technicianId VARCHAR(50),
    type ENUM('ISSUE', 'RETURN', 'ADJUSTMENT') NOT NULL,
    quantity INT NOT NULL,
    timestamp DATETIME NOT NULL,
    itemName VARCHAR(255),
    technicianName VARCHAR(255),
    jobId VARCHAR(100),
    customerName VARCHAR(255),
    serialNumber VARCHAR(255),
    `condition` ENUM('GOOD', 'DEFECTIVE'),
    adjustmentReason VARCHAR(255),
    difference INT,
    FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY (technicianId) REFERENCES technicians(id) ON DELETE SET NULL
);
