USE production_management;

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
