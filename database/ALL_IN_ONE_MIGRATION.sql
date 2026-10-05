-- =========================================================
-- RAINBOW POLYMERS & CARPETS - CONSOLIDATED DATABASE SCHEMA
-- Run this in phpMyAdmin inside your database
-- =========================================================


-- ---------------------------------------------------------
-- FILE: database.sql
-- ---------------------------------------------------------
-- ============================================================
-- PRODUCTION MANAGEMENT SYSTEM
-- Corrugated Box / Gatta Packaging Plant
-- Database: MySQL 8+
-- Version: 1.0
-- ============================================================

-- CREATE DATABASE IF NOT EXISTS production_management
-- CHARACTER SET utf8mb4
-- COLLATE utf8mb4_unicode_ci;

-- USE production_management;

-- ============================================================
-- 1. ROLES
-- ============================================================

CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. USERS
-- ============================================================

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    last_login DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ============================================================
-- 3. CUSTOMERS
-- ============================================================

CREATE TABLE customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    gst_number VARCHAR(30),
    billing_address TEXT,
    shipping_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    payment_terms VARCHAR(100),
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. SUPPLIERS
-- ============================================================

CREATE TABLE suppliers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    gst_number VARCHAR(30),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    payment_terms VARCHAR(100),
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. EMPLOYEES
-- ============================================================

CREATE TABLE employees (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(150),
    department VARCHAR(100),
    designation VARCHAR(100),
    joining_date DATE,
    shift ENUM('GENERAL', 'DAY', 'NIGHT', 'ROTATIONAL') DEFAULT 'GENERAL',
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. UNITS
-- ============================================================

CREATE TABLE units (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. PRODUCT CATEGORIES
-- ============================================================

CREATE TABLE product_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. PRODUCTS
-- ============================================================

CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    category_id BIGINT UNSIGNED,
    product_name VARCHAR(200) NOT NULL,

    box_type VARCHAR(100),
    ply INT,
    length_mm DECIMAL(10,2),
    width_mm DECIMAL(10,2),
    height_mm DECIMAL(10,2),

    flute_type VARCHAR(50),
    paper_grade VARCHAR(100),
    gsm DECIMAL(10,2),

    printing_required BOOLEAN DEFAULT FALSE,
    lamination_required BOOLEAN DEFAULT FALSE,
    die_cutting_required BOOLEAN DEFAULT FALSE,
    folding_required BOOLEAN DEFAULT FALSE,
    gluing_required BOOLEAN DEFAULT FALSE,

    standard_production_time DECIMAL(10,2),
    standard_cost DECIMAL(15,2) DEFAULT 0,
    selling_price DECIMAL(15,2) DEFAULT 0,

    unit_id BIGINT UNSIGNED,

    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES product_categories(id),

    CONSTRAINT fk_products_unit
        FOREIGN KEY (unit_id) REFERENCES units(id)
);

-- ============================================================
-- 9. RAW MATERIAL CATEGORIES
-- ============================================================

CREATE TABLE material_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 10. RAW MATERIALS
-- ============================================================

CREATE TABLE raw_materials (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    material_code VARCHAR(50) NOT NULL UNIQUE,
    category_id BIGINT UNSIGNED,
    material_name VARCHAR(200) NOT NULL,

    grade VARCHAR(100),
    gsm DECIMAL(10,2),
    width_mm DECIMAL(10,2),

    unit_id BIGINT UNSIGNED NOT NULL,

    minimum_stock DECIMAL(15,3) DEFAULT 0,
    reorder_level DECIMAL(15,3) DEFAULT 0,

    standard_purchase_rate DECIMAL(15,2) DEFAULT 0,

    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_material_category
        FOREIGN KEY (category_id) REFERENCES material_categories(id),

    CONSTRAINT fk_material_unit
        FOREIGN KEY (unit_id) REFERENCES units(id)
);

-- ============================================================
-- 11. PRODUCT BOM
-- ============================================================

CREATE TABLE product_bom (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    product_id BIGINT UNSIGNED NOT NULL,
    material_id BIGINT UNSIGNED NOT NULL,

    quantity_per_unit DECIMAL(15,6) NOT NULL,
    wastage_percentage DECIMAL(8,3) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_bom_product
        FOREIGN KEY (product_id) REFERENCES products(id),

    CONSTRAINT fk_bom_material
        FOREIGN KEY (material_id) REFERENCES raw_materials(id)
);

-- ============================================================
-- 12. WAREHOUSES
-- ============================================================

CREATE TABLE warehouses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_code VARCHAR(50) NOT NULL UNIQUE,
    warehouse_name VARCHAR(150) NOT NULL,
    warehouse_type ENUM(
        'RAW_MATERIAL',
        'WIP',
        'FINISHED_GOODS',
        'GENERAL'
    ) DEFAULT 'GENERAL',
    location VARCHAR(255),
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 13. WAREHOUSE LOCATIONS
-- ============================================================

CREATE TABLE warehouse_locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    location_code VARCHAR(50) NOT NULL,
    location_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_warehouse_location
        (warehouse_id, location_code),

    CONSTRAINT fk_location_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

-- ============================================================
-- 14. MATERIAL BATCHES
-- ============================================================

CREATE TABLE material_batches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    material_id BIGINT UNSIGNED NOT NULL,
    supplier_id BIGINT UNSIGNED,

    batch_number VARCHAR(100) NOT NULL,
    supplier_batch_number VARCHAR(100),

    received_date DATE,
    manufacturing_date DATE,
    expiry_date DATE,

    quantity_received DECIMAL(15,3) DEFAULT 0,
    current_quantity DECIMAL(15,3) DEFAULT 0,

    purchase_rate DECIMAL(15,2) DEFAULT 0,

    qc_status ENUM('PENDING', 'APPROVED', 'REJECTED', 'HOLD')
        DEFAULT 'PENDING',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_material_batch
        (material_id, batch_number),

    CONSTRAINT fk_batch_material
        FOREIGN KEY (material_id) REFERENCES raw_materials(id),

    CONSTRAINT fk_batch_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- ============================================================
-- 15. MACHINES
-- ============================================================

CREATE TABLE machines (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    machine_code VARCHAR(50) NOT NULL UNIQUE,
    machine_name VARCHAR(150) NOT NULL,
    machine_type VARCHAR(100),

    manufacturer VARCHAR(150),
    model_number VARCHAR(100),
    serial_number VARCHAR(100),

    capacity_per_hour DECIMAL(15,2),

    status ENUM(
        'RUNNING',
        'IDLE',
        'BREAKDOWN',
        'MAINTENANCE',
        'INACTIVE'
    ) DEFAULT 'IDLE',

    installation_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 16. MACHINE MAINTENANCE
-- ============================================================

CREATE TABLE machine_maintenance (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    machine_id BIGINT UNSIGNED NOT NULL,

    maintenance_type ENUM(
        'PREVENTIVE',
        'BREAKDOWN',
        'SERVICE',
        'INSPECTION'
    ) NOT NULL,

    scheduled_date DATE,
    completed_date DATE,

    description TEXT,
    cost DECIMAL(15,2) DEFAULT 0,

    technician_name VARCHAR(150),

    status ENUM(
        'SCHEDULED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
    ) DEFAULT 'SCHEDULED',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_maintenance_machine
        FOREIGN KEY (machine_id) REFERENCES machines(id)
);

-- ============================================================
-- 17. MACHINE BREAKDOWNS
-- ============================================================

CREATE TABLE machine_breakdowns (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    machine_id BIGINT UNSIGNED NOT NULL,

    breakdown_start DATETIME NOT NULL,
    breakdown_end DATETIME,

    reason TEXT,
    action_taken TEXT,

    downtime_minutes INT DEFAULT 0,

    reported_by BIGINT UNSIGNED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_breakdown_machine
        FOREIGN KEY (machine_id) REFERENCES machines(id),

    CONSTRAINT fk_breakdown_user
        FOREIGN KEY (reported_by) REFERENCES users(id)
);

-- ============================================================
-- 18. SALES ORDERS
-- ============================================================

CREATE TABLE sales_orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_number VARCHAR(50) NOT NULL UNIQUE,

    customer_id BIGINT UNSIGNED NOT NULL,

    order_date DATE NOT NULL,
    expected_delivery_date DATE,

    priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT')
        DEFAULT 'NORMAL',

    status ENUM(
        'DRAFT',
        'CONFIRMED',
        'PARTIAL',
        'IN_PRODUCTION',
        'COMPLETED',
        'CANCELLED'
    ) DEFAULT 'DRAFT',

    notes TEXT,

    created_by BIGINT UNSIGNED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_sales_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id),

    CONSTRAINT fk_sales_user
        FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- 19. SALES ORDER ITEMS
-- ============================================================

CREATE TABLE sales_order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    sales_order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,

    ordered_quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) DEFAULT 0,

    delivery_date DATE,

    specification TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_so_item_order
        FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_so_item_product
        FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============================================================
-- 20. PURCHASE ORDERS
-- ============================================================

CREATE TABLE purchase_orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    po_number VARCHAR(50) NOT NULL UNIQUE,

    supplier_id BIGINT UNSIGNED NOT NULL,

    order_date DATE NOT NULL,
    expected_date DATE,

    status ENUM(
        'DRAFT',
        'ORDERED',
        'PARTIAL',
        'RECEIVED',
        'CANCELLED'
    ) DEFAULT 'DRAFT',

    notes TEXT,

    created_by BIGINT UNSIGNED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_po_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),

    CONSTRAINT fk_po_user
        FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- 21. PURCHASE ORDER ITEMS
-- ============================================================

CREATE TABLE purchase_order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    purchase_order_id BIGINT UNSIGNED NOT NULL,
    material_id BIGINT UNSIGNED NOT NULL,

    ordered_quantity DECIMAL(15,3) NOT NULL,
    rate DECIMAL(15,2) NOT NULL,

    received_quantity DECIMAL(15,3) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_po_item_order
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_po_item_material
        FOREIGN KEY (material_id) REFERENCES raw_materials(id)
);

-- ============================================================
-- 22. MATERIAL RECEIPTS / GRN
-- ============================================================

CREATE TABLE material_receipts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    grn_number VARCHAR(50) NOT NULL UNIQUE,

    purchase_order_id BIGINT UNSIGNED,
    supplier_id BIGINT UNSIGNED NOT NULL,

    receipt_date DATE NOT NULL,

    invoice_number VARCHAR(100),
    invoice_date DATE,

    vehicle_number VARCHAR(30),

    status ENUM(
        'RECEIVED',
        'QC_PENDING',
        'APPROVED',
        'REJECTED'
    ) DEFAULT 'RECEIVED',

    remarks TEXT,

    created_by BIGINT UNSIGNED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_grn_po
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),

    CONSTRAINT fk_grn_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),

    CONSTRAINT fk_grn_user
        FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- 23. MATERIAL RECEIPT ITEMS
-- ============================================================

CREATE TABLE material_receipt_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    receipt_id BIGINT UNSIGNED NOT NULL,
    material_id BIGINT UNSIGNED NOT NULL,

    batch_number VARCHAR(100) NOT NULL,

    received_quantity DECIMAL(15,3) NOT NULL,
    accepted_quantity DECIMAL(15,3) DEFAULT 0,
    rejected_quantity DECIMAL(15,3) DEFAULT 0,

    rate DECIMAL(15,2) DEFAULT 0,

    qc_status ENUM('PENDING', 'APPROVED', 'REJECTED', 'HOLD')
        DEFAULT 'PENDING',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_receipt_item_receipt
        FOREIGN KEY (receipt_id) REFERENCES material_receipts(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_receipt_item_material
        FOREIGN KEY (material_id) REFERENCES raw_materials(id)
);

-- ============================================================
-- 24. PRODUCTION ORDERS
-- ============================================================

CREATE TABLE production_orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    production_order_number VARCHAR(50) NOT NULL UNIQUE,

    sales_order_id BIGINT UNSIGNED,
    product_id BIGINT UNSIGNED NOT NULL,

    planned_quantity DECIMAL(15,3) NOT NULL,
    target_quantity DECIMAL(15,3) NOT NULL,

    production_date DATE,
    expected_completion_date DATE,

    priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT')
        DEFAULT 'NORMAL',

    shift ENUM('GENERAL', 'DAY', 'NIGHT') DEFAULT 'DAY',

    supervisor_id BIGINT UNSIGNED,

    status ENUM(
        'PLANNED',
        'MATERIAL_PENDING',
        'READY',
        'IN_PROGRESS',
        'QC_PENDING',
        'COMPLETED',
        'CANCELLED'
    ) DEFAULT 'PLANNED',

    remarks TEXT,

    created_by BIGINT UNSIGNED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_production_sales
        FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),

    CONSTRAINT fk_production_product
        FOREIGN KEY (product_id) REFERENCES products(id),

    CONSTRAINT fk_production_supervisor
        FOREIGN KEY (supervisor_id) REFERENCES employees(id),

    CONSTRAINT fk_production_user
        FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- 25. PRODUCTION MATERIAL REQUIREMENTS
-- ============================================================

CREATE TABLE production_materials (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    production_order_id BIGINT UNSIGNED NOT NULL,
    material_id BIGINT UNSIGNED NOT NULL,

    required_quantity DECIMAL(15,3) NOT NULL,
    issued_quantity DECIMAL(15,3) DEFAULT 0,
    consumed_quantity DECIMAL(15,3) DEFAULT 0,
    wastage_quantity DECIMAL(15,3) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pm_production
        FOREIGN KEY (production_order_id)
        REFERENCES production_orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_pm_material
        FOREIGN KEY (material_id)
        REFERENCES raw_materials(id)
);

-- ============================================================
-- 26. MATERIAL ISSUE
-- ============================================================

CREATE TABLE material_issues (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    issue_number VARCHAR(50) NOT NULL UNIQUE,

    production_order_id BIGINT UNSIGNED NOT NULL,

    issue_date DATETIME NOT NULL,

    issued_by BIGINT UNSIGNED,

    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_issue_production
        FOREIGN KEY (production_order_id)
        REFERENCES production_orders(id),

    CONSTRAINT fk_issue_user
        FOREIGN KEY (issued_by)
        REFERENCES users(id)
);

-- ============================================================
-- 27. MATERIAL ISSUE ITEMS
-- ============================================================

CREATE TABLE material_issue_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    issue_id BIGINT UNSIGNED NOT NULL,
    material_id BIGINT UNSIGNED NOT NULL,
    batch_id BIGINT UNSIGNED,

    quantity DECIMAL(15,3) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_issue_item_issue
        FOREIGN KEY (issue_id) REFERENCES material_issues(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_issue_item_material
        FOREIGN KEY (material_id) REFERENCES raw_materials(id),

    CONSTRAINT fk_issue_item_batch
        FOREIGN KEY (batch_id) REFERENCES material_batches(id)
);

-- ============================================================
-- 28. PRODUCTION ENTRIES
-- ============================================================

CREATE TABLE production_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    production_order_id BIGINT UNSIGNED NOT NULL,

    machine_id BIGINT UNSIGNED,
    operator_id BIGINT UNSIGNED,

    production_date DATE NOT NULL,

    shift ENUM('DAY', 'NIGHT') DEFAULT 'DAY',

    start_time DATETIME,
    end_time DATETIME,

    input_quantity DECIMAL(15,3) DEFAULT 0,
    good_quantity DECIMAL(15,3) DEFAULT 0,
    rejected_quantity DECIMAL(15,3) DEFAULT 0,
    wastage_quantity DECIMAL(15,3) DEFAULT 0,

    downtime_minutes INT DEFAULT 0,

    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_prod_entry_order
        FOREIGN KEY (production_order_id)
        REFERENCES production_orders(id),

    CONSTRAINT fk_prod_entry_machine
        FOREIGN KEY (machine_id)
        REFERENCES machines(id),

    CONSTRAINT fk_prod_entry_operator
        FOREIGN KEY (operator_id)
        REFERENCES employees(id)
);

-- ============================================================
-- 29. CORRUGATION ENTRIES
-- ============================================================

CREATE TABLE corrugation_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    production_order_id BIGINT UNSIGNED NOT NULL,

    machine_id BIGINT UNSIGNED NOT NULL,
    operator_id BIGINT UNSIGNED,

    paper_input_kg DECIMAL(15,3) DEFAULT 0,

    sheets_produced DECIMAL(15,3) DEFAULT 0,
    good_sheets DECIMAL(15,3) DEFAULT 0,
    rejected_sheets DECIMAL(15,3) DEFAULT 0,

    wastage_kg DECIMAL(15,3) DEFAULT 0,

    start_time DATETIME,
    end_time DATETIME,

    downtime_minutes INT DEFAULT 0,

    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_corr_order
        FOREIGN KEY (production_order_id)
        REFERENCES production_orders(id),

    CONSTRAINT fk_corr_machine
        FOREIGN KEY (machine_id)
        REFERENCES machines(id),

    CONSTRAINT fk_corr_operator
        FOREIGN KEY (operator_id)
        REFERENCES employees(id)
);

-- ============================================================
-- 30. PRINTING ENTRIES
-- ============================================================

CREATE TABLE printing_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    production_order_id BIGINT UNSIGNED NOT NULL,

    machine_id BIGINT UNSIGNED NOT NULL,
    operator_id BIGINT UNSIGNED,

    printing_type VARCHAR(100),
    colors VARCHAR(100),

    ink_consumption_kg DECIMAL(15,3) DEFAULT 0,

    input_quantity DECIMAL(15,3) DEFAULT 0,
    good_quantity DECIMAL(15,3) DEFAULT 0,
    rejected_quantity DECIMAL(15,3) DEFAULT 0,

    start_time DATETIME,
    end_time DATETIME,

    downtime_minutes INT DEFAULT 0,

    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_print_order
        FOREIGN KEY (production_order_id)
        REFERENCES production_orders(id),

    CONSTRAINT fk_print_machine
        FOREIGN KEY (machine_id)
        REFERENCES machines(id),

    CONSTRAINT fk_print_operator
        FOREIGN KEY (operator_id)
        REFERENCES employees(id)
);

-- ============================================================
-- 31. DIE CUTTING ENTRIES
-- ============================================================

CREATE TABLE die_cutting_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    production_order_id BIGINT UNSIGNED NOT NULL,

    machine_id BIGINT UNSIGNED NOT NULL,
    operator_id BIGINT UNSIGNED,

    die_number VARCHAR(100),

    input_quantity DECIMAL(15,3) DEFAULT 0,
    good_quantity DECIMAL(15,3) DEFAULT 0,
    rejected_quantity DECIMAL(15,3) DEFAULT 0,

    start_time DATETIME,
    end_time DATETIME,

    downtime_minutes INT DEFAULT 0,

    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_die_order
        FOREIGN KEY (production_order_id)
        REFERENCES production_orders(id),

    CONSTRAINT fk_die_machine
        FOREIGN KEY (machine_id)
        REFERENCES machines(id),

    CONSTRAINT fk_die_operator
        FOREIGN KEY (operator_id)
        REFERENCES employees(id)
);

-- ============================================================
-- 32. FOLDING / GLUING ENTRIES
-- ============================================================

CREATE TABLE folding_gluing_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    production_order_id BIGINT UNSIGNED NOT NULL,

    machine_id BIGINT UNSIGNED,
    operator_id BIGINT UNSIGNED,

    input_quantity DECIMAL(15,3) DEFAULT 0,
    good_quantity DECIMAL(15,3) DEFAULT 0,
    rejected_quantity DECIMAL(15,3) DEFAULT 0,

    glue_consumption_kg DECIMAL(15,3) DEFAULT 0,

    start_time DATETIME,
    end_time DATETIME,

    downtime_minutes INT DEFAULT 0,

    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fold_order
        FOREIGN KEY (production_order_id)
        REFERENCES production_orders(id),

    CONSTRAINT fk_fold_machine
        FOREIGN KEY (machine_id)
        REFERENCES machines(id),

    CONSTRAINT fk_fold_operator
        FOREIGN KEY (operator_id)
        REFERENCES employees(id)
);

-- ============================================================
-- 33. QUALITY PARAMETERS
-- ============================================================

CREATE TABLE quality_parameters (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,
    parameter_type VARCHAR(100),

    unit_id BIGINT UNSIGNED,

    min_value DECIMAL(15,4),
    max_value DECIMAL(15,4),

    description VARCHAR(255),

    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_quality_parameter_unit
        FOREIGN KEY (unit_id) REFERENCES units(id)
);

-- ============================================================
-- 34. QUALITY INSPECTIONS
-- ============================================================

CREATE TABLE quality_inspections (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    inspection_number VARCHAR(50) NOT NULL UNIQUE,

    production_order_id BIGINT UNSIGNED NOT NULL,

    inspection_date DATETIME NOT NULL,

    inspected_quantity DECIMAL(15,3) DEFAULT 0,
    accepted_quantity DECIMAL(15,3) DEFAULT 0,
    rejected_quantity DECIMAL(15,3) DEFAULT 0,

    result ENUM(
        'PASS',
        'FAIL',
        'HOLD',
        'REWORK'
    ) DEFAULT 'HOLD',

    inspector_id BIGINT UNSIGNED,

    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_qc_production
        FOREIGN KEY (production_order_id)
        REFERENCES production_orders(id),

    CONSTRAINT fk_qc_inspector
        FOREIGN KEY (inspector_id)
        REFERENCES employees(id)
);

-- ============================================================
-- 35. QUALITY INSPECTION RESULTS
-- ============================================================

CREATE TABLE quality_inspection_results (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    inspection_id BIGINT UNSIGNED NOT NULL,
    parameter_id BIGINT UNSIGNED NOT NULL,

    measured_value DECIMAL(15,4),
    text_value VARCHAR(255),

    result ENUM('PASS', 'FAIL', 'NA') DEFAULT 'NA',

    remarks VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_qir_inspection
        FOREIGN KEY (inspection_id)
        REFERENCES quality_inspections(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_qir_parameter
        FOREIGN KEY (parameter_id)
        REFERENCES quality_parameters(id)
);

-- ============================================================
-- 36. REWORK
-- ============================================================

CREATE TABLE rework_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    production_order_id BIGINT UNSIGNED NOT NULL,
    quality_inspection_id BIGINT UNSIGNED,

    quantity DECIMAL(15,3) NOT NULL,

    reason TEXT,
    action_taken TEXT,

    status ENUM(
        'PENDING',
        'IN_PROGRESS',
        'COMPLETED',
        'SCRAPPED'
    ) DEFAULT 'PENDING',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,

    CONSTRAINT fk_rework_production
        FOREIGN KEY (production_order_id)
        REFERENCES production_orders(id),

    CONSTRAINT fk_rework_qc
        FOREIGN KEY (quality_inspection_id)
        REFERENCES quality_inspections(id)
);

-- ============================================================
-- 37. FINISHED GOODS
-- ============================================================

CREATE TABLE finished_goods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    product_id BIGINT UNSIGNED NOT NULL,
    production_order_id BIGINT UNSIGNED NOT NULL,

    batch_number VARCHAR(100) NOT NULL,

    quantity_produced DECIMAL(15,3) DEFAULT 0,
    quantity_available DECIMAL(15,3) DEFAULT 0,

    warehouse_id BIGINT UNSIGNED,
    location_id BIGINT UNSIGNED,

    qc_status ENUM(
        'PENDING',
        'APPROVED',
        'REJECTED',
        'HOLD'
    ) DEFAULT 'PENDING',

    production_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_fg_batch
        (product_id, batch_number),

    CONSTRAINT fk_fg_product
        FOREIGN KEY (product_id) REFERENCES products(id),

    CONSTRAINT fk_fg_production
        FOREIGN KEY (production_order_id)
        REFERENCES production_orders(id),

    CONSTRAINT fk_fg_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),

    CONSTRAINT fk_fg_location
        FOREIGN KEY (location_id) REFERENCES warehouse_locations(id)
);

-- ============================================================
-- 38. STOCK TRANSACTIONS
-- ============================================================

CREATE TABLE stock_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    material_id BIGINT UNSIGNED,
    batch_id BIGINT UNSIGNED,

    product_id BIGINT UNSIGNED,

    warehouse_id BIGINT UNSIGNED,
    location_id BIGINT UNSIGNED,

    transaction_type ENUM(
        'PURCHASE',
        'MATERIAL_ISSUE',
        'PRODUCTION_RECEIPT',
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT',
        'DISPATCH',
        'RETURN',
        'WASTAGE',
        'REWORK',
        'SCRAP'
    ) NOT NULL,

    reference_type VARCHAR(100),
    reference_id BIGINT UNSIGNED,

    quantity DECIMAL(15,3) NOT NULL,

    transaction_date DATETIME NOT NULL,

    remarks TEXT,

    created_by BIGINT UNSIGNED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_stock_material
        FOREIGN KEY (material_id) REFERENCES raw_materials(id),

    CONSTRAINT fk_stock_batch
        FOREIGN KEY (batch_id) REFERENCES material_batches(id),

    CONSTRAINT fk_stock_product
        FOREIGN KEY (product_id) REFERENCES products(id),

    CONSTRAINT fk_stock_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),

    CONSTRAINT fk_stock_location
        FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),

    CONSTRAINT fk_stock_user
        FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- 39. DISPATCH
-- ============================================================

CREATE TABLE dispatches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    dispatch_number VARCHAR(50) NOT NULL UNIQUE,

    customer_id BIGINT UNSIGNED NOT NULL,

    sales_order_id BIGINT UNSIGNED,

    dispatch_date DATE NOT NULL,

    invoice_number VARCHAR(100),

    vehicle_number VARCHAR(30),
    driver_name VARCHAR(150),
    driver_phone VARCHAR(20),

    transporter_name VARCHAR(150),

    status ENUM(
        'READY',
        'DISPATCHED',
        'IN_TRANSIT',
        'DELIVERED',
        'CANCELLED'
    ) DEFAULT 'READY',

    remarks TEXT,

    created_by BIGINT UNSIGNED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_dispatch_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id),

    CONSTRAINT fk_dispatch_sales
        FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),

    CONSTRAINT fk_dispatch_user
        FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- 40. DISPATCH ITEMS
-- ============================================================

CREATE TABLE dispatch_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    dispatch_id BIGINT UNSIGNED NOT NULL,
    finished_good_id BIGINT UNSIGNED NOT NULL,

    quantity DECIMAL(15,3) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_dispatch_item_dispatch
        FOREIGN KEY (dispatch_id)
        REFERENCES dispatches(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_dispatch_item_fg
        FOREIGN KEY (finished_good_id)
        REFERENCES finished_goods(id)
);

-- ============================================================
-- 41. ACTIVITY LOGS
-- ============================================================

CREATE TABLE activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED,

    action VARCHAR(100) NOT NULL,
    module VARCHAR(100),

    reference_type VARCHAR(100),
    reference_id BIGINT UNSIGNED,

    description TEXT,

    ip_address VARCHAR(45),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_activity_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 42. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,

    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    type ENUM(
        'INFO',
        'SUCCESS',
        'WARNING',
        'ERROR'
    ) DEFAULT 'INFO',

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_customers_company
ON customers(company_name);

CREATE INDEX idx_suppliers_company
ON suppliers(company_name);

CREATE INDEX idx_products_name
ON products(product_name);

CREATE INDEX idx_materials_name
ON raw_materials(material_name);

CREATE INDEX idx_sales_customer
ON sales_orders(customer_id);

CREATE INDEX idx_sales_status
ON sales_orders(status);

CREATE INDEX idx_production_status
ON production_orders(status);

CREATE INDEX idx_production_date
ON production_orders(production_date);

CREATE INDEX idx_stock_transaction_date
ON stock_transactions(transaction_date);

CREATE INDEX idx_dispatch_date
ON dispatches(dispatch_date);

-- ============================================================
-- DEFAULT DATA
-- ============================================================

INSERT INTO roles (name, description) VALUES
('SUPER_ADMIN', 'Full system access'),
('ADMIN', 'Administrative access'),
('PRODUCTION_MANAGER', 'Production planning and management'),
('STORE_MANAGER', 'Raw material and inventory management'),
('QC_MANAGER', 'Quality control management'),
('SUPERVISOR', 'Production supervision'),
('OPERATOR', 'Production entry'),
('SALES', 'Customer and sales order management');

INSERT INTO units (name, symbol) VALUES
('Piece', 'PCS'),
('Kilogram', 'KG'),
('Gram', 'G'),
('Meter', 'M'),
('Square Meter', 'SQM'),
('Litre', 'LTR'),
('Box', 'BOX'),
('Roll', 'ROLL'),
('Sheet', 'SHEET');

INSERT INTO product_categories (name, description) VALUES
('Corrugated Box', 'Corrugated packaging boxes'),
('Printed Box', 'Printed corrugated packaging'),
('Die Cut Box', 'Die cut packaging boxes'),
('Special Packaging', 'Special/custom packaging products');

INSERT INTO material_categories (name, description) VALUES
('Kraft Paper', 'Kraft and liner papers'),
('Fluting Paper', 'Fluting paper'),
('Board', 'Duplex and other boards'),
('Ink', 'Printing inks'),
('Adhesive', 'Glue and adhesive materials'),
('Lamination', 'Lamination films'),
('Consumables', 'Other production consumables');

INSERT INTO warehouses
(warehouse_code, warehouse_name, warehouse_type, location)
VALUES
('RM-01', 'Raw Material Warehouse', 'RAW_MATERIAL', 'Plant'),
('WIP-01', 'Work In Progress', 'WIP', 'Production Floor'),
('FG-01', 'Finished Goods Warehouse', 'FINISHED_GOODS', 'Plant');

-- ============================================================
-- END OF DATABASE
-- ============================================================

-- ---------------------------------------------------------
-- FILE: add_pvc_carpet_category.sql
-- ---------------------------------------------------------
-- Run this once in phpMyAdmin if PVC Carpet is not already present.
INSERT INTO product_categories (name, description)
SELECT 'PVC Carpet', 'PVC Carpet Products'
WHERE NOT EXISTS (
    SELECT 1
    FROM product_categories
    WHERE name = 'PVC Carpet'
);


-- ---------------------------------------------------------
-- FILE: pvc_carpet_phase1.sql
-- ---------------------------------------------------------
-- USE production_management;

-- =========================================================
-- PVC CARPET ERP - PHASE 1 DATABASE MIGRATION
-- Safe migration: existing tables/data are preserved.
-- =========================================================

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS carpet_type VARCHAR(100) NULL AFTER product_name,
    ADD COLUMN IF NOT EXISTS design_pattern VARCHAR(150) NULL AFTER carpet_type,
    ADD COLUMN IF NOT EXISTS colour VARCHAR(100) NULL AFTER design_pattern,
    ADD COLUMN IF NOT EXISTS width_mm DECIMAL(10,2) NULL AFTER colour,
    ADD COLUMN IF NOT EXISTS length_m DECIMAL(10,2) NULL AFTER width_mm,
    ADD COLUMN IF NOT EXISTS thickness_mm DECIMAL(10,3) NULL AFTER length_m,
    ADD COLUMN IF NOT EXISTS gsm DECIMAL(10,2) NULL AFTER thickness_mm,
    ADD COLUMN IF NOT EXISTS surface_finish VARCHAR(100) NULL AFTER gsm,
    ADD COLUMN IF NOT EXISTS backing_type VARCHAR(100) NULL AFTER surface_finish,
    ADD COLUMN IF NOT EXISTS packing_type VARCHAR(100) NULL AFTER backing_type;

CREATE TABLE IF NOT EXISTS processes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    process_code VARCHAR(50) NOT NULL,
    process_name VARCHAR(150) NOT NULL,
    department VARCHAR(100) NULL,
    machine_required TINYINT(1) NOT NULL DEFAULT 0,
    standard_output_per_hour DECIMAL(15,3) NULL,
    standard_setup_minutes INT NULL DEFAULT 0,
    status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    remarks TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_process_code (process_code),
    KEY idx_process_name (process_name),
    KEY idx_process_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_processes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    process_id BIGINT UNSIGNED NOT NULL,
    sequence_no INT NOT NULL,
    machine_id BIGINT UNSIGNED NULL,
    standard_output_per_hour DECIMAL(15,3) NULL,
    setup_minutes INT NULL DEFAULT 0,
    mandatory TINYINT(1) NOT NULL DEFAULT 1,
    remarks TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_product_process_sequence (product_id, sequence_no),
    KEY idx_pp_product (product_id),
    KEY idx_pp_process (process_id),
    KEY idx_pp_machine (machine_id),
    CONSTRAINT fk_pp_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pp_process
        FOREIGN KEY (process_id) REFERENCES processes(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pp_machine
        FOREIGN KEY (machine_id) REFERENCES machines(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Initial generic PVC-carpet process examples.
-- These are configuration examples, NOT a claim about the client's exact process.
INSERT INTO processes
(process_code, process_name, department, machine_required, status)
VALUES
('PROC-001', 'Raw Material Preparation', 'Production', 0, 'ACTIVE'),
('PROC-002', 'Primary Production', 'Production', 1, 'ACTIVE'),
('PROC-003', 'Finishing', 'Production', 1, 'ACTIVE'),
('PROC-004', 'Cutting', 'Production', 1, 'ACTIVE'),
('PROC-005', 'Rolling & Packing', 'Packing', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE
    process_name = VALUES(process_name),
    department = VALUES(department);

-- IMPORTANT:
-- Do not assign these example processes to products automatically.
-- The client's actual PVC carpet routing must be configured from their process sheet.


-- ---------------------------------------------------------
-- FILE: pvc_carpet_phase2.sql
-- ---------------------------------------------------------
-- USE production_management;

-- =========================================================
-- PVC CARPET ERP - PHASE 2 DATABASE MIGRATION
-- Roll Serialization, Roll Tracking, and Process Linkage
-- =========================================================

-- 1. Ensure production_order_processes exists
CREATE TABLE IF NOT EXISTS production_order_processes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    production_order_id BIGINT UNSIGNED NOT NULL,
    product_process_id BIGINT UNSIGNED NOT NULL,
    sequence_no INT NOT NULL,
    process_status ENUM('PENDING', 'RUNNING', 'COMPLETED', 'ON_HOLD', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    machine_id BIGINT UNSIGNED NULL,
    planned_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    input_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    good_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    rejected_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    wastage_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    start_time DATETIME NULL,
    end_time DATETIME NULL,
    operator_id BIGINT UNSIGNED NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_pop_order (production_order_id),
    KEY idx_pop_process (product_process_id),
    KEY idx_pop_status (process_status),
    CONSTRAINT fk_pop_order
        FOREIGN KEY (production_order_id) REFERENCES production_orders(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pop_product_process
        FOREIGN KEY (product_process_id) REFERENCES product_processes(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pop_machine
        FOREIGN KEY (machine_id) REFERENCES machines(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Carpet Rolls Tracking & Serialization
CREATE TABLE IF NOT EXISTS carpet_rolls (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    roll_number VARCHAR(60) NOT NULL,
    production_order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    process_id BIGINT UNSIGNED NULL,
    machine_id BIGINT UNSIGNED NULL,
    operator_id BIGINT UNSIGNED NULL,
    
    -- Dimensions & Specs
    width_m DECIMAL(10,2) NOT NULL DEFAULT 2.00,
    length_m DECIMAL(10,2) NOT NULL,
    area_sqm DECIMAL(12,2) NOT NULL,
    thickness_mm DECIMAL(10,3) NULL,
    gsm DECIMAL(10,2) NULL,
    
    -- Weights
    gross_weight_kg DECIMAL(10,2) NULL,
    core_weight_kg DECIMAL(10,2) NULL DEFAULT 0.00,
    net_weight_kg DECIMAL(10,2) NULL,
    
    -- Quality & Grading
    grade ENUM('GRADE_A', 'GRADE_B', 'GRADE_C', 'SCRAP') NOT NULL DEFAULT 'GRADE_A',
    defect_type VARCHAR(150) NULL,
    
    -- Status & Lifecycle
    status ENUM('PRODUCED', 'QC_INSPECTION', 'APPROVED', 'REJECTED', 'IN_WAREHOUSE', 'DISPATCHED') NOT NULL DEFAULT 'PRODUCED',
    warehouse_location VARCHAR(100) NULL,
    barcode VARCHAR(100) NULL,
    notes TEXT NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_carpet_roll_number (roll_number),
    KEY idx_cr_order (production_order_id),
    KEY idx_cr_product (product_id),
    KEY idx_cr_grade (grade),
    KEY idx_cr_status (status),
    KEY idx_cr_created (created_at),
    
    CONSTRAINT fk_cr_order
        FOREIGN KEY (production_order_id) REFERENCES production_orders(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cr_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cr_process
        FOREIGN KEY (process_id) REFERENCES processes(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cr_machine
        FOREIGN KEY (machine_id) REFERENCES machines(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cr_operator
        FOREIGN KEY (operator_id) REFERENCES employees(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------
-- FILE: pvc_carpet_phase3_finished_goods.sql
-- ---------------------------------------------------------
-- USE production_management;

-- =========================================================
-- PVC CARPET ERP - PHASE 3 DATABASE MIGRATION
-- Connect Roll Tracking to Finished Goods Stock & Dispatches
-- =========================================================

-- 1. Insert default standard locations for Finished Goods Warehouse (warehouse_id = 3)
INSERT INTO warehouse_locations (warehouse_id, location_code, location_name)
SELECT 3, 'FG-BAY-01', 'Finished Goods Bay 1 (Heavy Duty Rolls)'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM warehouse_locations WHERE location_code = 'FG-BAY-01');

INSERT INTO warehouse_locations (warehouse_id, location_code, location_name)
SELECT 3, 'FG-BAY-02', 'Finished Goods Bay 2 (Standard Commercial)'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM warehouse_locations WHERE location_code = 'FG-BAY-02');

INSERT INTO warehouse_locations (warehouse_id, location_code, location_name)
SELECT 3, 'FG-BAY-03', 'Finished Goods Bay 3 (Residential Rolls)'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM warehouse_locations WHERE location_code = 'FG-BAY-03');

INSERT INTO warehouse_locations (warehouse_id, location_code, location_name)
SELECT 3, 'DISPATCH-DOCK', 'Outward Dispatch Staging Area'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM warehouse_locations WHERE location_code = 'DISPATCH-DOCK');

-- 2. Add columns to carpet_rolls for warehouse stock & dispatch tracking
SET @exist_warehouse_id := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='production_management' AND TABLE_NAME='carpet_rolls' AND COLUMN_NAME='warehouse_id');
SET @sql := IF(@exist_warehouse_id = 0, 'ALTER TABLE carpet_rolls ADD COLUMN warehouse_id BIGINT UNSIGNED NULL AFTER warehouse_location, ADD CONSTRAINT fk_cr_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_dispatch_id := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='production_management' AND TABLE_NAME='carpet_rolls' AND COLUMN_NAME='dispatch_id');
SET @sql := IF(@exist_dispatch_id = 0, 'ALTER TABLE carpet_rolls ADD COLUMN dispatch_id BIGINT UNSIGNED NULL AFTER warehouse_id, ADD CONSTRAINT fk_cr_dispatch FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_stocked_at := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='production_management' AND TABLE_NAME='carpet_rolls' AND COLUMN_NAME='stocked_at');
SET @sql := IF(@exist_stocked_at = 0, 'ALTER TABLE carpet_rolls ADD COLUMN stocked_at DATETIME NULL AFTER dispatch_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_dispatched_at := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='production_management' AND TABLE_NAME='carpet_rolls' AND COLUMN_NAME='dispatched_at');
SET @sql := IF(@exist_dispatched_at = 0, 'ALTER TABLE carpet_rolls ADD COLUMN dispatched_at DATETIME NULL AFTER stocked_at', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_customer_id := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='production_management' AND TABLE_NAME='carpet_rolls' AND COLUMN_NAME='customer_id');
SET @sql := IF(@exist_customer_id = 0, 'ALTER TABLE carpet_rolls ADD COLUMN customer_id BIGINT UNSIGNED NULL AFTER dispatched_at, ADD CONSTRAINT fk_cr_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Enhance dispatch_items to support serialized rolls
SET @exist_di_roll_id := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='production_management' AND TABLE_NAME='dispatch_items' AND COLUMN_NAME='roll_id');
SET @sql := IF(@exist_di_roll_id = 0, 'ALTER TABLE dispatch_items ADD COLUMN roll_id BIGINT UNSIGNED NULL AFTER finished_good_id, ADD CONSTRAINT fk_di_roll FOREIGN KEY (roll_id) REFERENCES carpet_rolls(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_di_roll_number := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='production_management' AND TABLE_NAME='dispatch_items' AND COLUMN_NAME='roll_number');
SET @sql := IF(@exist_di_roll_number = 0, 'ALTER TABLE dispatch_items ADD COLUMN roll_number VARCHAR(60) NULL AFTER roll_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_di_length := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='production_management' AND TABLE_NAME='dispatch_items' AND COLUMN_NAME='length_m');
SET @sql := IF(@exist_di_length = 0, 'ALTER TABLE dispatch_items ADD COLUMN length_m DECIMAL(10,2) NULL AFTER roll_number', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_di_area := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='production_management' AND TABLE_NAME='dispatch_items' AND COLUMN_NAME='area_sqm');
SET @sql := IF(@exist_di_area = 0, 'ALTER TABLE dispatch_items ADD COLUMN area_sqm DECIMAL(12,2) NULL AFTER length_m', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_di_weight := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='production_management' AND TABLE_NAME='dispatch_items' AND COLUMN_NAME='weight_kg');
SET @sql := IF(@exist_di_weight = 0, 'ALTER TABLE dispatch_items ADD COLUMN weight_kg DECIMAL(10,2) NULL AFTER area_sqm', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------
-- FILE: pvc_carpet_phase4_quality.sql
-- ---------------------------------------------------------
-- USE production_management;

-- =========================================================
-- PVC CARPET ERP - PHASE 4 DATABASE MIGRATION
-- Roll Quality Control, Lab Testing, 3-Point Thickness, COA
-- =========================================================

CREATE TABLE IF NOT EXISTS carpet_roll_inspections (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    inspection_number VARCHAR(50) NOT NULL UNIQUE,
    coa_number VARCHAR(60) NOT NULL UNIQUE,
    roll_id BIGINT UNSIGNED NOT NULL,
    production_order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    inspector_id BIGINT UNSIGNED NULL,
    inspector_name VARCHAR(150) NULL,
    inspection_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 1. 3-Point Thickness Profile (mm)
    target_thickness_mm DECIMAL(10,3) NOT NULL DEFAULT 1.500,
    edge_left_thickness_mm DECIMAL(10,3) NOT NULL,
    center_thickness_mm DECIMAL(10,3) NOT NULL,
    edge_right_thickness_mm DECIMAL(10,3) NOT NULL,
    avg_thickness_mm DECIMAL(10,3) NOT NULL,
    thickness_variance_mm DECIMAL(10,3) NOT NULL,
    thickness_result ENUM('PASS', 'FAIL') NOT NULL DEFAULT 'PASS',
    
    -- 2. GSM & Area Weight (g/m²)
    target_gsm DECIMAL(10,2) NOT NULL DEFAULT 1600.00,
    actual_gsm DECIMAL(10,2) NOT NULL,
    gsm_deviation_pct DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    gsm_result ENUM('PASS', 'FAIL') NOT NULL DEFAULT 'PASS',
    
    -- 3. Mechanical & Physical Properties
    tensile_md_n DECIMAL(10,2) NULL, -- Machine Direction (N/50mm)
    tensile_cd_n DECIMAL(10,2) NULL, -- Cross Direction (N/50mm)
    tensile_result ENUM('PASS', 'FAIL') NOT NULL DEFAULT 'PASS',
    elongation_pct DECIMAL(6,2) NULL,
    tear_resistance_n DECIMAL(10,2) NULL,
    heat_shrinkage_pct DECIMAL(6,2) NULL,
    
    -- 4. Aesthetics & Surface Quality
    emboss_depth_mm DECIMAL(10,3) NULL,
    color_shade_delta_e DECIMAL(6,2) NULL DEFAULT 0.50,
    pinholes_count INT NOT NULL DEFAULT 0,
    surface_scratches_count INT NOT NULL DEFAULT 0,
    air_bubbles_count INT NOT NULL DEFAULT 0,
    visual_defects_notes VARCHAR(255) NULL,
    
    -- 5. Final Decision & Grading
    assigned_grade ENUM('GRADE_A', 'GRADE_B', 'GRADE_C', 'SCRAP') NOT NULL DEFAULT 'GRADE_A',
    overall_result ENUM('PASS', 'FAIL', 'CONDITIONAL') NOT NULL DEFAULT 'PASS',
    remarks TEXT NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    KEY idx_cri_roll (roll_id),
    KEY idx_cri_order (production_order_id),
    KEY idx_cri_grade (assigned_grade),
    CONSTRAINT fk_cri_roll FOREIGN KEY (roll_id) REFERENCES carpet_rolls(id) ON DELETE CASCADE,
    CONSTRAINT fk_cri_order FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_cri_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------
-- FILE: pvc_carpet_phase5_dispatch.sql
-- ---------------------------------------------------------
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


-- ---------------------------------------------------------
-- FILE: pvc_carpet_phase6_formulations.sql
-- ---------------------------------------------------------
-- =========================================================
-- PVC CARPET PHASE 6: RAW MATERIALS, FORMULATIONS & PASTE MIXING
-- =========================================================

-- USE production_management;

-- 1. Insert realistic PVC Raw Material Categories
INSERT IGNORE INTO material_categories (id, name, description) VALUES
(10, 'PVC Resins', 'PVC Emulsion (Micro-suspension) and Suspension Resins for Coating'),
(11, 'Plasticizers', 'Primary & Secondary Plasticizers (DINP, DOTP, ESBO) for Flexibility'),
(12, 'Fillers & Modifiers', 'Micronized Calcium Carbonate (CaCO3), ATH Flame Retardants'),
(13, 'Blowing & Foaming Agents', 'Azodicarbonamide (ADC) Chemical Blowing Agents & Kickers'),
(14, 'Heat Stabilizers', 'Non-toxic Calcium-Zinc (Ca-Zn) Liquid & Paste Heat Stabilizers'),
(15, 'Backing Substrates', 'Non-Woven Polyester Needled Felt & Woven Jute Substrates'),
(16, 'Pigments & Masterbatches', 'Liquid Pigment Pastes & Color Dispersions for PVC Plastisol'),
(17, 'PU Topcoats & Lacquers', 'UV Curable Polyurethane Anti-Scratch Protective Lacquers');

-- 2. Insert PVC Manufacturing Raw Materials
INSERT IGNORE INTO raw_materials 
(id, material_code, category_id, material_name, grade, unit_id, minimum_stock, reorder_level, standard_purchase_rate, status) 
VALUES
(1, 'RM-PVC-E68', 10, 'PVC Emulsion Resin (K-68)', 'Paste Micro-suspension', 2, 2000.00, 5000.00, 115.00, 'ACTIVE'),
(2, 'RM-PVC-S65', 10, 'PVC Suspension Resin (K-65)', 'Standard S-PVC', 2, 3000.00, 6000.00, 95.00, 'ACTIVE'),
(3, 'RM-PLAST-DINP', 11, 'Diisononyl Phthalate (DINP)', 'Technical Liquid Grade', 2, 2500.00, 5000.00, 142.00, 'ACTIVE'),
(4, 'RM-PLAST-DOTP', 11, 'Dioctyl Terephthalate (DOTP)', 'Non-Phthalate Eco Grade', 2, 1500.00, 3000.00, 148.00, 'ACTIVE'),
(5, 'RM-PLAST-ESBO', 11, 'Epoxidized Soybean Oil (ESBO)', 'Co-Stabilizer Plasticizer', 2, 500.00, 1000.00, 175.00, 'ACTIVE'),
(6, 'RM-FILL-CACO3', 12, 'Precipitated Calcium Carbonate (CaCO3)', 'Calcite 5 Micron Powder', 2, 5000.00, 10000.00, 18.50, 'ACTIVE'),
(7, 'RM-FILL-ATH', 12, 'Aluminium Trihydrate (ATH)', 'Flame Retardant Filler', 2, 1000.00, 2000.00, 48.00, 'ACTIVE'),
(8, 'RM-BLOW-ADC', 13, 'Azodicarbonamide Blowing Agent', 'Modified Foam Exothermic', 2, 300.00, 600.00, 320.00, 'ACTIVE'),
(9, 'RM-STAB-ZNCA', 14, 'Liquid Calcium-Zinc Stabilizer', 'Non-Toxic Eco Stabilizer', 2, 400.00, 800.00, 260.00, 'ACTIVE'),
(10, 'RM-SUB-POLY', 15, 'Polyester Needle-Punch Felt Substrate (2m Width)', '180 GSM Non-Woven Grey', 4, 1500.00, 3000.00, 42.00, 'ACTIVE'),
(11, 'RM-PIG-RED', 16, 'Crimson Red Pigment Dispersion Paste', 'Concentrated Plastisol Color', 2, 100.00, 250.00, 450.00, 'ACTIVE'),
(12, 'RM-PIG-GREY', 16, 'Charcoal Grey Pigment Paste', 'Concentrated Plastisol Color', 2, 150.00, 300.00, 380.00, 'ACTIVE'),
(13, 'RM-PIG-BLU', 16, 'Royal Blue Pigment Paste', 'Concentrated Plastisol Color', 2, 100.00, 250.00, 420.00, 'ACTIVE'),
(14, 'RM-COAT-PU', 17, 'UV-Cured Matte Polyurethane Topcoat', 'Scratch Resistant Lacquer', 2, 300.00, 600.00, 520.00, 'ACTIVE');

-- 3. Seed Opening Inventory Batches with Real Stock Balances
INSERT IGNORE INTO material_batches 
(id, material_id, batch_number, supplier_batch_number, received_date, manufacturing_date, expiry_date, quantity_received, current_quantity, purchase_rate, qc_status) 
VALUES
(1, 1, 'BATCH-PVC-E68-01', 'LG-K68-9844', '2026-09-01', '2026-08-15', '2028-08-15', 10000.00, 8450.00, 115.00, 'APPROVED'),
(2, 2, 'BATCH-PVC-S65-01', 'REL-S65-4412', '2026-09-02', '2026-08-10', '2028-08-10', 12000.00, 9800.00, 95.00, 'APPROVED'),
(3, 3, 'BATCH-DINP-01', 'BASF-DINP-7721', '2026-09-05', '2026-08-20', '2027-08-20', 8000.00, 6200.00, 142.00, 'APPROVED'),
(4, 4, 'BATCH-DOTP-01', 'KLJ-DOTP-3310', '2026-09-06', '2026-08-25', '2027-08-25', 5000.00, 4100.00, 148.00, 'APPROVED'),
(5, 5, 'BATCH-ESBO-01', 'ADANI-ESBO-119', '2026-09-08', '2026-08-30', '2027-08-30', 2000.00, 1650.00, 175.00, 'APPROVED'),
(6, 6, 'BATCH-CACO3-01', '20MICRONS-098', '2026-09-03', '2026-08-15', '2029-08-15', 25000.00, 18500.00, 18.50, 'APPROVED'),
(7, 7, 'BATCH-ATH-01', 'ALU-ATH-445', '2026-09-10', '2026-08-20', '2028-08-20', 4000.00, 3200.00, 48.00, 'APPROVED'),
(8, 8, 'BATCH-ADC-01', 'KUMHO-ADC-91', '2026-09-12', '2026-08-22', '2027-08-22', 1200.00, 940.00, 320.00, 'APPROVED'),
(9, 9, 'BATCH-ZNCA-01', 'BAERLOCHER-01', '2026-09-08', '2026-08-18', '2027-08-18', 1500.00, 1250.00, 260.00, 'APPROVED'),
(10, 10, 'BATCH-POLY-01', 'SHREE-POLY-2M', '2026-09-01', '2026-08-20', '2028-08-20', 6000.00, 4800.00, 42.00, 'APPROVED'),
(11, 11, 'BATCH-PIG-RED-01', 'CLARIANT-RED-9', '2026-09-14', '2026-08-28', '2027-08-28', 500.00, 380.00, 450.00, 'APPROVED'),
(12, 12, 'BATCH-PIG-GRY-01', 'CLARIANT-GRY-2', '2026-09-14', '2026-08-28', '2027-08-28', 600.00, 490.00, 380.00, 'APPROVED'),
(13, 14, 'BATCH-PU-01', 'COVESTRO-PU-04', '2026-09-15', '2026-09-01', '2027-09-01', 1200.00, 980.00, 520.00, 'APPROVED');

-- 4. Create Chemical Formulations Table (Plastisol Recipes)
CREATE TABLE IF NOT EXISTS chemical_formulations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    formulation_code VARCHAR(50) NOT NULL UNIQUE,
    formulation_name VARCHAR(150) NOT NULL,
    formulation_type ENUM('WEAR_LAYER', 'FOAM_LAYER', 'COMPACT_BASE', 'PRIMER_ADHESIVE') NOT NULL,
    description TEXT NULL,
    standard_batch_size_kg DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    target_viscosity_cp INT NOT NULL DEFAULT 4500,
    viscosity_tolerance_cp INT NOT NULL DEFAULT 500,
    target_density_g_cm3 DECIMAL(5,3) NOT NULL DEFAULT 1.350,
    gelation_temp_c DECIMAL(5,1) NOT NULL DEFAULT 140.0,
    fusion_temp_c DECIMAL(5,1) NOT NULL DEFAULT 190.0,
    mixing_time_minutes INT NOT NULL DEFAULT 45,
    deaeration_time_minutes INT NOT NULL DEFAULT 30,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Create Chemical Formulation Items (BOM / Recipe Parts per Hundred Resin - PHR)
CREATE TABLE IF NOT EXISTS chemical_formulation_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    formulation_id BIGINT NOT NULL,
    material_id BIGINT UNSIGNED NOT NULL,
    phr_parts DECIMAL(8,2) NOT NULL,
    percentage_weight DECIMAL(6,2) NOT NULL,
    qty_kg_per_standard_batch DECIMAL(10,2) NOT NULL,
    addition_order INT NOT NULL DEFAULT 1,
    notes VARCHAR(200) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_cfi_form (formulation_id),
    CONSTRAINT fk_cfi_form FOREIGN KEY (formulation_id) REFERENCES chemical_formulations (id) ON DELETE CASCADE,
    CONSTRAINT fk_cfi_mat FOREIGN KEY (material_id) REFERENCES raw_materials (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Standard Industrial Plastisol Formulations
INSERT IGNORE INTO chemical_formulations 
(id, formulation_code, formulation_name, formulation_type, description, standard_batch_size_kg, target_viscosity_cp, viscosity_tolerance_cp, target_density_g_cm3, gelation_temp_c, fusion_temp_c, mixing_time_minutes, deaeration_time_minutes) 
VALUES
(1, 'FORM-WEAR-01', 'Clear Premium Wear Layer Plastisol', 'WEAR_LAYER', 'High-transparency, abrasion-resistant pure emulsion PVC wear layer for high-traffic PVC carpet flooring.', 500.00, 3800, 400, 1.250, 135.0, 195.0, 40, 35),
(2, 'FORM-FOAM-01', 'Cushion Foam Intermediate Layer Plastisol', 'FOAM_LAYER', 'Chemically blown expandable plastisol providing thermal insulation, sound dampening and resilient walking comfort.', 500.00, 4600, 500, 1.380, 140.0, 190.0, 45, 30),
(3, 'FORM-BASE-01', 'Heavy Filled Compact Undercoat Plastisol', 'COMPACT_BASE', 'High-density backing formulation with micronized calcium carbonate for dimensional stability and curling prevention.', 500.00, 6800, 600, 1.550, 145.0, 185.0, 50, 20);

-- Seed Formulation Ingredients (Wear Layer: 100phr Resin, 45phr DINP, 3phr ESBO, 2.5phr Zn-Ca Stabilizer)
INSERT IGNORE INTO chemical_formulation_items 
(id, formulation_id, material_id, phr_parts, percentage_weight, qty_kg_per_standard_batch, addition_order, notes) 
VALUES
(1, 1, 1, 100.00, 66.45, 332.25, 1, 'Primary PVC Emulsion K-68 Resin'),
(2, 1, 3, 45.00, 29.90, 149.50, 2, 'DINP Primary Liquid Plasticizer'),
(3, 1, 5, 3.00, 1.99, 9.95, 3, 'ESBO Secondary Stabilizing Plasticizer'),
(4, 1, 9, 2.50, 1.66, 8.30, 4, 'Liquid Ca-Zn Non-toxic Heat Stabilizer');

-- Seed Foam Layer: 100phr Resin, 60phr DINP, 25phr CaCO3, 3phr ADC Blowing Agent, 2.5phr Zn-Ca
INSERT IGNORE INTO chemical_formulation_items 
(id, formulation_id, material_id, phr_parts, percentage_weight, qty_kg_per_standard_batch, addition_order, notes) 
VALUES
(5, 2, 1, 100.00, 52.50, 262.50, 1, 'PVC Emulsion Resin K-68'),
(6, 2, 3, 60.00, 31.50, 157.50, 2, 'DINP Plasticizer for expansion elasticity'),
(7, 2, 6, 25.00, 13.12, 65.60, 3, 'Precipitated CaCO3 Filler'),
(8, 2, 8, 3.00, 1.57, 7.85, 4, 'Azodicarbonamide Chemical Foaming Agent'),
(9, 2, 9, 2.50, 1.31, 6.55, 5, 'Kicker Stabilizer');

-- Seed Base Undercoat: 100phr Resin, 50phr DINP, 80phr CaCO3, 3phr Zn-Ca
INSERT IGNORE INTO chemical_formulation_items 
(id, formulation_id, material_id, phr_parts, percentage_weight, qty_kg_per_standard_batch, addition_order, notes) 
VALUES
(10, 3, 2, 100.00, 42.92, 214.60, 1, 'S-PVC Suspension Base Resin'),
(11, 3, 3, 50.00, 21.46, 107.30, 2, 'DINP Plasticizer'),
(12, 3, 6, 80.00, 34.33, 171.65, 3, 'Heavy Calcium Carbonate Calcite'),
(13, 3, 9, 3.00, 1.29, 6.45, 4, 'Heat Stabilizer');

-- 6. Create Paste Mixing Batches Table (High-Speed Cowles Dissolver Station Logs)
CREATE TABLE IF NOT EXISTS paste_mixing_batches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_number VARCHAR(50) NOT NULL UNIQUE,
    formulation_id BIGINT NOT NULL,
    mixer_machine_name VARCHAR(100) NOT NULL DEFAULT 'High-Speed Dissolver Mixer #1',
    operator_name VARCHAR(100) NOT NULL,
    batch_date DATE NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    target_weight_kg DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    actual_weight_kg DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    
    -- Quality Control Readings
    measured_viscosity_cp INT NOT NULL DEFAULT 4200,
    measured_temp_c DECIMAL(5,1) NOT NULL DEFAULT 28.5,
    measured_density_g_cm3 DECIMAL(5,3) NOT NULL DEFAULT 1.280,
    deaeration_vacuum_bar DECIMAL(4,2) NOT NULL DEFAULT -0.85,
    fineness_hegman_microns INT NOT NULL DEFAULT 25,
    qc_viscosity_result ENUM('PASS', 'BORDERLINE', 'FAIL') NOT NULL DEFAULT 'PASS',
    
    -- Operational Status
    status ENUM('MIXING', 'DEAERATING', 'QC_CHECK', 'APPROVED', 'ISSUED_TO_LINE', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    destination_coating_line VARCHAR(100) DEFAULT 'PVC Coating Line 01',
    remarks TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_pmb_form (formulation_id),
    INDEX idx_pmb_status (status),
    CONSTRAINT fk_pmb_form FOREIGN KEY (formulation_id) REFERENCES chemical_formulations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Sample Completed Paste Mixing Batches
INSERT IGNORE INTO paste_mixing_batches 
(id, batch_number, formulation_id, mixer_machine_name, operator_name, batch_date, start_time, end_time, target_weight_kg, actual_weight_kg, measured_viscosity_cp, measured_temp_c, measured_density_g_cm3, deaeration_vacuum_bar, fineness_hegman_microns, qc_viscosity_result, status, destination_coating_line, remarks) 
VALUES
(1, 'PST-20260930-0001', 1, 'High-Speed Dissolver Mixer #1', 'Devendra Solanki (Mixing Master)', '2026-09-30', '07:30:00', '08:45:00', 500.00, 498.50, 3850, 27.8, 1.252, -0.88, 20, 'PASS', 'ISSUED_TO_LINE', 'PVC Coating Line 01', 'Clear wear layer paste ready for top knife coater.'),
(2, 'PST-20260930-0002', 2, 'High-Speed Dissolver Mixer #2', 'Karan Varma', '2026-09-30', '09:00:00', '10:15:00', 500.00, 501.20, 4620, 29.1, 1.385, -0.85, 25, 'PASS', 'APPROVED', 'Holding Tank #3', 'Foam layer paste deaerated, foaming kicker active.'),
(3, 'PST-20260930-0003', 3, 'High-Speed Dissolver Mixer #1', 'Devendra Solanki', '2026-09-30', '11:00:00', '12:15:00', 500.00, 499.00, 6750, 30.5, 1.545, -0.80, 30, 'PASS', 'APPROVED', 'Holding Tank #1', 'Heavy compact base paste for needle-punch felt impregnation.');


-- ---------------------------------------------------------
-- FILE: pvc_carpet_phase7_maintenance.sql
-- ---------------------------------------------------------
-- =========================================================
-- PVC CARPET PHASE 7: PLANT MAINTENANCE & MACHINE BREAKDOWNS
-- =========================================================

-- USE production_management;

-- 1. Seed Comprehensive PVC Carpet Manufacturing Equipment Roster
INSERT INTO machines (id, machine_code, machine_name, machine_type, manufacturer, model_number, serial_number, capacity_per_hour, status, installation_date)
VALUES 
(10, 'COAT-LINE-01', 'Multi-Layer PVC Knife Coating & Gelling Line 01', 'Coating & Gelling Line', 'Bruckner / Zimmer Austria', 'MAGNO-3200', 'BRK-2019-9482', 450.00, 'RUNNING', '2019-04-15'),
(11, 'COAT-LINE-02', 'Needle-Punch Felt Impregnation Line 02', 'Impregnation & Coating Line', 'Stork Prints B.V.', 'ROTAMAC-2400', 'STRK-2021-3310', 380.00, 'RUNNING', '2021-08-20'),
(12, 'MIX-COWLES-01', 'Cowles High-Speed Plastisol Dissolver 1500L #1', 'High-Speed Dissolver Mixer', 'Dispermat / VMA-Getzmann', 'TU-1500-EX', 'VMA-2020-0418', 600.00, 'RUNNING', '2020-02-10'),
(13, 'MIX-COWLES-02', 'Cowles High-Speed Plastisol Dissolver 1500L #2 with Vacuum', 'Vacuum Dissolver Mixer', 'Dispermat / VMA-Getzmann', 'VAC-1500-EX', 'VMA-2022-1102', 600.00, 'RUNNING', '2022-06-18'),
(14, 'CAL-EMBOSS-01', 'Rotary Texture Calender & Embossing Unit with Chiller', 'Embossing Calender', 'Ramisch Guarneri', 'NIPCO-FLEX-200', 'RMS-2018-8812', 500.00, 'RUNNING', '2018-11-05'),
(15, 'INSPECT-SLIT-01', 'Automated Carpet Roll Inspection, Slitter & Re-winder', 'Inspection & Slitting Station', 'Menzel Maschinenbau', 'SLIT-ROLL-2200', 'MNZ-2021-5509', 750.00, 'RUNNING', '2021-03-25')
ON DUPLICATE KEY UPDATE 
    machine_name = VALUES(machine_name),
    machine_type = VALUES(machine_type),
    status = VALUES(status);

-- 2. Enhance machine_breakdowns table with breakdown ticket details
ALTER TABLE machine_breakdowns
    ADD COLUMN IF NOT EXISTS breakdown_ticket_no VARCHAR(50) NULL AFTER id,
    ADD COLUMN IF NOT EXISTS severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM' AFTER machine_id,
    ADD COLUMN IF NOT EXISTS breakdown_category ENUM('MECHANICAL', 'ELECTRICAL', 'PNEUMATIC', 'THERMAL_OIL', 'ELECTRONIC_DRIVE', 'OPERATOR_ERROR') DEFAULT 'MECHANICAL' AFTER severity,
    ADD COLUMN IF NOT EXISTS root_cause_category VARCHAR(100) NULL AFTER reason,
    ADD COLUMN IF NOT EXISTS technician_name VARCHAR(150) NULL AFTER action_taken,
    ADD COLUMN IF NOT EXISTS reported_by_name VARCHAR(150) DEFAULT 'Line Supervisor' AFTER technician_name,
    ADD COLUMN IF NOT EXISTS spare_parts_used TEXT NULL AFTER downtime_minutes,
    ADD COLUMN IF NOT EXISTS status ENUM('OPEN', 'IN_REPAIR', 'RESOLVED', 'CLOSED') DEFAULT 'RESOLVED' AFTER spare_parts_used;

-- 3. Enhance machine_maintenance table for PM Work Orders
ALTER TABLE machine_maintenance
    ADD COLUMN IF NOT EXISTS work_order_no VARCHAR(50) NULL AFTER id,
    ADD COLUMN IF NOT EXISTS priority ENUM('LOW', 'NORMAL', 'HIGH', 'EMERGENCY') DEFAULT 'NORMAL' AFTER maintenance_type,
    ADD COLUMN IF NOT EXISTS frequency ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL') DEFAULT 'MONTHLY' AFTER priority,
    ADD COLUMN IF NOT EXISTS checklist_items TEXT NULL AFTER description,
    ADD COLUMN IF NOT EXISTS downtime_hours DECIMAL(6,2) DEFAULT 0.00 AFTER cost;

-- 4. Seed Historical Real Machine Breakdowns
INSERT IGNORE INTO machine_breakdowns 
(id, breakdown_ticket_no, machine_id, severity, breakdown_category, breakdown_start, breakdown_end, reason, root_cause_category, action_taken, technician_name, reported_by_name, downtime_minutes, spare_parts_used, status) 
VALUES
(1, 'BD-20260928-0001', 10, 'HIGH', 'THERMAL_OIL', '2026-09-28 09:15:00', '2026-09-28 10:45:00', 'Gelling Oven Zone 2 temperature dropped by 18°C below setpoint (175°C target). Thermal oil circulation valve stuck.', 'Thermal Modulating Actuator Sticking', 'Replaced pneumatic actuator solenoid and calibrated digital PID controller. Reheated zone to 175°C.', 'Sanjay Solanki (Senior Electrical Lead)', 'Vikram Desai (Line 1 Operator)', 90, 'Pneumatic 3-way modulating valve diaphragm, Solenoid coil 24V DC', 'RESOLVED'),
(2, 'BD-20260929-0001', 12, 'MEDIUM', 'MECHANICAL', '2026-09-29 14:00:00', '2026-09-29 14:40:00', 'Cowles Dissolver #1 main shaft excessive vibration and abnormal mechanical noise during high-speed dispersion (1200 RPM).', 'Bearing Greasing Depletion & Impeller Misalignment', 'Purged contaminated grease, re-packed with high-temp polyurea synthetic grease, and dynamically balanced Cowles dispersing disc.', 'Mahesh Prajapati (Mechanical Fitter)', 'Devendra Solanki (Mixing Master)', 40, 'Polyurea EP-2 high-temp grease, Locking shaft collar M40', 'RESOLVED'),
(3, 'BD-20260930-0001', 14, 'LOW', 'PNEUMATIC', '2026-09-30 08:30:00', '2026-09-30 09:05:00', 'Embossing calender pneumatic cylinder pressure drop causing uneven nip pressure on left carpet edge.', 'Pneumatic Quick Exhaust Valve Leak', 'Replaced leaking quick exhaust valve and recalibrated dual nip pressure gauges to 4.5 bar.', 'Sanjay Solanki', 'Karan Varma', 35, 'Quick exhaust valve 1/2" BSP, PU tubing 10mm', 'RESOLVED');

-- 5. Seed Scheduled & In-Progress Preventive Maintenance (PM) Work Orders
INSERT IGNORE INTO machine_maintenance 
(id, work_order_no, machine_id, maintenance_type, priority, frequency, scheduled_date, completed_date, description, checklist_items, cost, downtime_hours, technician_name, status) 
VALUES
(1, 'WO-20260930-0001', 10, 'PREVENTIVE', 'HIGH', 'MONTHLY', '2026-09-30', NULL, 'Monthly Gelling Oven & Doctor Blade Precision Calibration', '1. Calibrate gelling oven zone 1-3 thermocouple sensors\n2. Inspect doctor blade knife edge using dial indicator (run-out <0.02mm)\n3. Check thermal oil circulation pump pressure and mechanical seal leaks\n4. Clean air circulation filters and exhaust blower impellers\n5. Test emergency trip pull-cord wire along complete line length', 4500.00, 2.50, 'Sanjay Solanki & Team', 'IN_PROGRESS'),
(2, 'WO-20261005-0001', 13, 'SERVICE', 'NORMAL', 'QUARTERLY', '2026-10-05', NULL, 'Vacuum Dissolver Pump Overhaul & Seal Replacement', '1. Vacuum pump oil drain & refill with synthetic vacuum fluid\n2. Inspect double mechanical seal face wear\n3. Test vacuum chamber seal integrity (hold -0.90 bar for 15 mins)\n4. Check motor thermal overload relay trip settings', 8500.00, 3.00, 'External Service Engineer (Getzmann)', 'SCHEDULED'),
(3, 'WO-20260925-0001', 15, 'INSPECTION', 'NORMAL', 'WEEKLY', '2026-09-25', '2026-09-25', 'Roll Slitter Rotary Circular Knife Sharpening & Laser Sensor Alignment', '1. Rotary shear slitting blades inspected & sharpened\n2. Re-winder pneumatic tension load cell zero calibrated\n3. Ultrasonic edge guide sensor cleaned and tested', 1200.00, 1.00, 'Mahesh Prajapati', 'COMPLETED');


-- ---------------------------------------------------------
-- FILE: pvc_carpet_phase8_grn.sql
-- ---------------------------------------------------------
-- =========================================================
-- PVC CARPET PHASE 8: INBOUND MATERIAL RECEIPT (GRN) & SUPPLIERS
-- =========================================================

-- USE production_management;

-- 1. Seed Realistic PVC Chemical Suppliers
INSERT INTO suppliers (id, supplier_code, company_name, contact_person, phone, email, gst_number, address, city, state, pincode, payment_terms, status)
VALUES
(1, 'SUP-REL-01', 'Reliance Industries Ltd (Petrochemicals)', 'Rajesh Ambani / Sales Dept', '+91 261 2831200', 'pvc.sales@ril.com', '24AAACR7192G1ZV', 'Hazira Petrochemical Complex, PO Bhatha', 'Surat', 'Gujarat', '394510', 'Net 30 Days', 'ACTIVE'),
(2, 'SUP-BASF-01', 'BASF India Ltd (Plasticizers & Performance Chemicals)', 'Nitin Merchant', '+91 22 62327000', 'plasticizers.india@basf.com', '27AAACB2985B1ZT', 'Plot 12, TTC Industrial Area, Thane-Belapur Road', 'Navi Mumbai', 'Maharashtra', '400705', 'Net 45 Days', 'ACTIVE'),
(3, 'SUP-KLJ-01', 'KLJ Plasticizers Ltd', 'Anand Jain', '+91 260 2640191', 'dotp.sales@kljgroup.com', '26AABCK1092F1Z8', 'Plot 58, Danudyog Sahakari Mandli, Piparia', 'Silvassa', 'Dadra and Nagar Haveli', '396230', 'Net 30 Days', 'ACTIVE'),
(4, 'SUP-20MIC-01', '20 Microns Ltd (Industrial Minerals)', 'Dharmesh Parikh', '+91 265 3001000', 'calcite@20microns.com', '24AAACT1823B1ZU', '9-10, GIDC Industrial Estate, Waghodia', 'Vadodara', 'Gujarat', '391760', 'Net 30 Days', 'ACTIVE'),
(5, 'SUP-BAER-01', 'Baerlocher India Additives Pvt Ltd', 'Sunil Kulkarni', '+91 7272 258200', 'stabilizer.info@baerlocher.in', '23AABCB1892C1ZV', 'Plot 2, Sector 1, Industrial Area', 'Dewas', 'Madhya Pradesh', '455001', 'Net 30 Days', 'ACTIVE'),
(6, 'SUP-SHREE-01', 'Shree Balaji Non-Woven Fabrics Pvt Ltd', 'Manish Agrawal', '+91 98251 99882', 'felt.sales@shreebalaji.in', '24AABCS9821D1Z1', 'Plot 104, Sachin GIDC Industrial Area', 'Surat', 'Gujarat', '394230', 'Immediate LC', 'ACTIVE')
ON DUPLICATE KEY UPDATE 
    company_name = VALUES(company_name),
    city = VALUES(city),
    gst_number = VALUES(gst_number);

-- 2. Enhance material_receipts table
ALTER TABLE material_receipts
    ADD COLUMN IF NOT EXISTS supplier_challan_no VARCHAR(100) NULL AFTER invoice_number,
    ADD COLUMN IF NOT EXISTS weighbridge_gross_kg DECIMAL(12,2) DEFAULT 0.00 AFTER vehicle_number,
    ADD COLUMN IF NOT EXISTS weighbridge_tare_kg DECIMAL(12,2) DEFAULT 0.00 AFTER weighbridge_gross_kg,
    ADD COLUMN IF NOT EXISTS weighbridge_net_kg DECIMAL(12,2) DEFAULT 0.00 AFTER weighbridge_tare_kg,
    ADD COLUMN IF NOT EXISTS transporter_name VARCHAR(150) NULL AFTER weighbridge_net_kg,
    ADD COLUMN IF NOT EXISTS lr_number VARCHAR(50) NULL AFTER transporter_name,
    ADD COLUMN IF NOT EXISTS total_packages INT DEFAULT 0 AFTER lr_number,
    ADD COLUMN IF NOT EXISTS total_amount_inr DECIMAL(15,2) DEFAULT 0.00 AFTER total_packages,
    ADD COLUMN IF NOT EXISTS store_location VARCHAR(100) DEFAULT 'MAIN-RAW-WH-01' AFTER total_amount_inr;

-- 3. Enhance material_receipt_items table
ALTER TABLE material_receipt_items
    ADD COLUMN IF NOT EXISTS package_type VARCHAR(50) DEFAULT 'BAGS' AFTER batch_number,
    ADD COLUMN IF NOT EXISTS number_of_packages INT DEFAULT 0 AFTER package_type,
    ADD COLUMN IF NOT EXISTS total_item_amount DECIMAL(15,2) DEFAULT 0.00 AFTER rate,
    ADD COLUMN IF NOT EXISTS moisture_pct DECIMAL(5,2) DEFAULT 0.15 AFTER qc_status,
    ADD COLUMN IF NOT EXISTS coa_attached BOOLEAN DEFAULT TRUE AFTER moisture_pct;

-- 4. Seed Realistic Historical GRN Records
INSERT IGNORE INTO material_receipts 
(id, grn_number, supplier_id, receipt_date, invoice_number, invoice_date, supplier_challan_no, vehicle_number, weighbridge_gross_kg, weighbridge_tare_kg, weighbridge_net_kg, transporter_name, lr_number, total_packages, total_amount_inr, store_location, status, remarks)
VALUES
(1, 'GRN-20260920-0001', 1, '2026-09-20', 'RIL-PET-26-90412', '2026-09-18', 'CH-90412', 'GJ-05-BX-7781', 34500.00, 14500.00, 20000.00, 'Reliance Logistics Dedicated Fleet', 'LR-90118', 800, 2300000.00, 'SILO-BAY-01', 'APPROVED', '20 MT PVC Emulsion Resin K-68 in 25kg standard paper bags. Passed moisture and K-value test.'),
(2, 'GRN-20260922-0001', 2, '2026-09-22', 'BASF-INV-44120', '2026-09-20', 'CH-44120', 'MH-04-CP-8891', 28600.00, 12600.00, 16000.00, 'TCI Freight Tanker Services', 'TCI-BOM-881', 1, 2272000.00, 'LIQUID-TANK-DINP-01', 'APPROVED', '16 MT Liquid DINP Bulk Road Tanker. Density 0.975 g/cm3 verified.'),
(3, 'GRN-20260926-0001', 4, '2026-09-26', '20MIC-INV-1189', '2026-09-25', 'CH-1189', 'GJ-06-AX-3319', 42000.00, 17000.00, 25000.00, 'Gujarat Freight Carriers', 'GFC-BAR-449', 1000, 462500.00, 'RAW-WH-BAY-03', 'APPROVED', '25 MT Calcite Micronized Calcium Carbonate. Whiteness 96% and mesh 5-micron approved.');

-- Seed Receipt Items
INSERT IGNORE INTO material_receipt_items 
(id, receipt_id, material_id, batch_number, package_type, number_of_packages, received_quantity, accepted_quantity, rejected_quantity, rate, total_item_amount, qc_status, moisture_pct, coa_attached)
VALUES
(1, 1, 1, 'BATCH-PVC-E68-02', '25KG_BAGS', 800, 20000.000, 20000.000, 0.000, 115.00, 2300000.00, 'APPROVED', 0.12, 1),
(2, 2, 3, 'BATCH-DINP-02', 'ROAD_TANKER', 1, 16000.000, 16000.000, 0.000, 142.00, 2272000.00, 'APPROVED', 0.05, 1),
(3, 3, 6, 'BATCH-CACO3-02', '25KG_BAGS', 1000, 25000.000, 25000.000, 0.000, 18.50, 462500.00, 'APPROVED', 0.08, 1);


-- ---------------------------------------------------------
-- FILE: pvc_carpet_phase9_employees_seed.sql
-- ---------------------------------------------------------
-- ============================================================
-- PVC CARPET MANUFACTURING ERP - PHASE 9: EMPLOYEE & STAFF DIRECTORY
-- Seed script for plant personnel, operators, technicians and supervisors
-- ============================================================

INSERT INTO employees (employee_code, name, phone, email, department, designation, joining_date, shift, status)
VALUES
('EMP-001', 'Rajesh Sharma', '+91 98250 11221', 'rajesh.sharma@rainbowcarpet.com', 'PRODUCTION', 'Production Supervisor', '2023-01-15', 'DAY', 'ACTIVE'),
('EMP-002', 'Vikram Desai', '+91 98250 22334', 'vikram.desai@rainbowcarpet.com', 'PRODUCTION', 'PVC Coating Line Lead Operator', '2023-03-01', 'DAY', 'ACTIVE'),
('EMP-003', 'Ramesh Yadav', '+91 98250 33445', 'ramesh.yadav@rainbowcarpet.com', 'PRODUCTION', 'Plastisol Calendering Operator', '2023-04-10', 'ROTATIONAL', 'ACTIVE'),
('EMP-004', 'Amit Verma', '+91 98250 44556', 'amit.verma@rainbowcarpet.com', 'PRODUCTION', 'Gravure Rotogravure Printing Lead', '2023-06-20', 'DAY', 'ACTIVE'),
('EMP-005', 'Sanjay Solanki', '+91 98250 55667', 'sanjay.solanki@rainbowcarpet.com', 'MAINTENANCE', 'Senior Electrical & Automation Lead', '2022-11-01', 'GENERAL', 'ACTIVE'),
('EMP-006', 'Dinesh Joshi', '+91 98250 66778', 'dinesh.joshi@rainbowcarpet.com', 'MAINTENANCE', 'Mechanical & Thermal Oil Technician', '2023-02-15', 'GENERAL', 'ACTIVE'),
('EMP-007', 'Priya Nair', '+91 98250 77889', 'priya.nair@rainbowcarpet.com', 'QUALITY_CONTROL', 'Quality Assurance & Lab Inspector', '2023-05-18', 'DAY', 'ACTIVE'),
('EMP-008', 'Hardik Mehta', '+91 98250 88990', 'hardik.mehta@rainbowcarpet.com', 'QUALITY_CONTROL', 'Roll Final Inspection Officer', '2023-08-01', 'ROTATIONAL', 'ACTIVE'),
('EMP-009', 'Manoj Patel', '+91 98250 99001', 'manoj.patel@rainbowcarpet.com', 'WAREHOUSE', 'Dispatch & Finished Goods In-charge', '2022-09-10', 'GENERAL', 'ACTIVE'),
('EMP-010', 'Karan Patel', '+91 98250 10102', 'karan.patel@rainbowcarpet.com', 'PRODUCTION', 'Chemical Mixer & Compounder', '2023-09-01', 'DAY', 'ACTIVE'),
('EMP-011', 'Suresh Kumar', '+91 98250 11213', 'suresh.kumar@rainbowcarpet.com', 'PRODUCTION', 'Embossing & Lamination Tech', '2023-10-15', 'NIGHT', 'ACTIVE'),
('EMP-012', 'Mahesh Chawla', '+91 98250 12314', 'mahesh.chawla@rainbowcarpet.com', 'MAINTENANCE', 'Plant Shift Mechanic', '2024-01-05', 'NIGHT', 'ACTIVE')
ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), department=VALUES(department), designation=VALUES(designation);

