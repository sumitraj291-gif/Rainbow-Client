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