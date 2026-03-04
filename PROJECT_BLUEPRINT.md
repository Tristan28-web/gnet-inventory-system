# GNet Inventory: System Blueprint & Workflow Guide

Welcome to the **GNet Inventory Solutions Manager**. This document outlines the application's structure, user roles, and operational workflows to provide a clear understanding of how the system manages assets and field operations.

---

## 🚀 1. Project Overview
GNet Inventory is a high-performance, real-time management system designed to track network equipment, tools, and materials. It bridges the gap between the warehouse and the field by allowing Technicians to manage their "Van Stock" while providing Administrators with total visibility over assets.

---

## 👥 2. User Roles & Access

### **A. Administrator (Operations Manager)**
*   **Access**: Full system control.
*   **Key Responsibilities**:
    *   Managing the Master Inventory list.
    *   Onboarding and managing Technicians.
    *   Overseeing all system-wide transactions.
    *   Performing audits and stock adjustments.
    *   Viewing high-level analytics and reports.

### **B. Technician (Field Personnel)**
*   **Access**: Personal dashboard and activity logs.
*   **Key Responsibilities**:
    *   Checking out tools/materials (ISSUE).
    *   Returning tools/materials (RETURN).
    *   Monitoring personal "Van Stock".
    *   Reviewing personal transaction history.

---

## 🏗️ 3. Core Modules

### **📊 Dashboard (The Command Center)**
*   **Admin View**: Displays real-time charts analysis of equipment availability, inventory mix, and global recent activity.
*   **Technician View**: Focuses on "Van Stock" totals, quick checkout/return buttons, and personal activity history.

### **📦 Inventory Management (Admin Only)**
*   **Asset Tracking**: Each item tracks `Total Quantity`, `Available Quantity`, and `Defective Quantity`.
*   **Thresholds**: Items have a `Low Stock Threshold` to alert managers when reordering is needed.
*   **Categories**: Organized by type (e.g., Tools, Cables, Network Devices).

### **🔧 Technician Management (Admin Only)**
*   **Personnel Tracking**: List of registered technicians with their department and contact details.
*   **Accountability**: Every tool issued is linked to a specific technician profile.

### **🔄 Transactions & QR Workflow**
This is the heart of the application, managing how items move:
1.  **ISSUE (Checkout)**: Moving an item from the warehouse to a technician's van.
2.  **RETURN**: Moving an item from a technician's van back to the warehouse.
3.  **ADJUSTMENT**: Administrative overrides for stock corrections (e.g., after physical counting).

---

## 🛠️ 4. Typical Workflows

### **Scenario A: A Technician arrives at the Warehouse**
1.  Technician logs into the app.
2.  Uses the **Quick Action: Checkout (Scanner)**.
3.  Scans the asset QR code or selects the item manually.
4.  Enters the quantity being taken.
5.  The system automatically:
    *   Decreases **Global Availability**.
    *   Increases the Technician's **Van Stock**.
    *   Creates a permanent **Transaction Log**.

### **Scenario B: End of Day Returns**
1.  Technician selects **Quick Action: Return (Scanner)** on the Dashboard.
2.  Selects items being returned.
3.  Technician can mark items as **Defective** if they were damaged during the job.
4.  The system updates the inventory status accordingly.

### **Scenario C: Monthly Audit (Admin)**
1.  Admin navigates to the **Audit / Sync** page.
2.  Performs a physical count of warehouse items.
3.  Uses the **Adjust stock** button to sync the digital records with physical reality, providing a "Reason" for any discrepancies found.

---

## 💻 5. Technical Architecture
*   **Frontend**: React (Vite) for a fast, responsive UI.
*   **Database**: Firebase Firestore (Real-time updates across all devices).
*   **Authentication**: Hybrid system (Firebase Auth for Admins, Secure Keys for Technicians).
*   **QR Integration**: `html5-qrcode` for high-speed asset scanning.
*   **Analytics**: `Recharts` for visual data insights.

---

## 🎨 6. Design Philosophy
The app uses a **Premium Dark/Light UI** with high-contrast elements and micro-animations to ensure usability in both low-light environments and bright field conditions. It is optimized for mobile-first use, recognizing that most technicians coordinate via smartphones.

---
*Created for Miss Nelle to understand the GNet Inventory ecosystem.*
*Last Updated: 2026-02-13 - Real-time Stock Sync implemented.*
