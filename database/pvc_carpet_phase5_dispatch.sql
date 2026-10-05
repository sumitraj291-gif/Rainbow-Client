-- =========================================================
-- PVC CARPET PHASE 5: DISPATCH CHALLANS & OUTWARD GATE PASS
-- =========================================================

-- USE production_management;

-- 1. Create table for Dispatch Delivery Challans & Gate Passes
CREATE TABLE IF NOT EXISTS dispatch_challans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    challan_number VARCHAR(50) NOT NULL UNIQUE,
    gate_pass_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT UNSIGNED NULL,
    customer_name VARCHAR(200) NOT NULL,
    consignee_name VARCHAR(200) NULL,
    delivery_address TEXT NULL,
    customer_gst VARCHAR(30) NULL,
    sales_order_id BIGINT UNSIGNED NULL,
    sales_order_number VARCHAR(50) NULL,
    
    -- Logistics & Transport
    transporter_name VARCHAR(150) NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    driver_name VARCHAR(100) NULL,
    driver_phone VARCHAR(30) NULL,
    driver_license VARCHAR(50) NULL,
    lr_number VARCHAR(50) NULL,
    lr_date DATE NULL,
    eway_bill_number VARCHAR(50) NULL,
    
    -- Manifest & Measurements
    dispatch_date DATE NOT NULL,
    dispatch_time TIME NULL,
    total_rolls INT NOT NULL DEFAULT 0,
    total_linear_meters DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_sqm DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_net_weight_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_gross_weight_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Operational Status
    status ENUM('PREPARING', 'LOADED', 'DISPATCHED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PREPARING',
    created_by VARCHAR(100) DEFAULT 'Dispatch Incharge',
    security_officer_name VARCHAR(100) DEFAULT 'Main Gate Security Officer',
    remarks TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_dc_cust (customer_id),
    INDEX idx_dc_order (sales_order_id),
    INDEX idx_dc_status (status),
    INDEX idx_dc_date (dispatch_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Create table for itemized rolls loaded onto each challan
CREATE TABLE IF NOT EXISTS dispatch_challan_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    challan_id BIGINT NOT NULL,
    carpet_roll_id BIGINT UNSIGNED NOT NULL,
    roll_number VARCHAR(50) NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    product_code VARCHAR(50) NULL,
    carpet_type VARCHAR(100) NULL,
    color VARCHAR(50) NULL,
    width_m DECIMAL(6,2) NOT NULL,
    length_m DECIMAL(6,2) NOT NULL,
    area_sqm DECIMAL(10,2) NOT NULL,
    net_weight_kg DECIMAL(10,2) NOT NULL,
    gross_weight_kg DECIMAL(10,2) NOT NULL,
    grade VARCHAR(20) DEFAULT 'GRADE_A',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_dci_challan (challan_id),
    INDEX idx_dci_roll (carpet_roll_id),
    CONSTRAINT fk_dci_challan FOREIGN KEY (challan_id) REFERENCES dispatch_challans (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Add dispatch reference columns to carpet_rolls if missing
ALTER TABLE carpet_rolls 
    ADD COLUMN IF NOT EXISTS dispatch_challan_id BIGINT NULL AFTER dispatched_at;

-- 4. Seed initial mock customers for realistic PVC roll delivery destinations if empty
INSERT IGNORE INTO customers (id, customer_code, company_name, contact_person, phone, email, gst_number, shipping_address, city, state, pincode, status) 
VALUES 
(2, 'CUST-002', 'Deco Floorings & Interiors Pvt Ltd', 'Vikram Mehta', '+91 98250 11223', 'dispatch@decofloor.com', '24AABBD1234F1Z8', 'Plot 18, Commercial Hub, SG Highway', 'Ahmedabad', 'Gujarat', '380015', 'ACTIVE'),
(3, 'CUST-003', 'Apex Furnishings & Carpets India', 'Suresh Patel', '+91 97120 44556', 'sales@apexfurnish.com', '27AABCA5678B1Z2', 'Gala 4, Logistics Park, Bhiwandi', 'Mumbai', 'Maharashtra', '421302', 'ACTIVE');
