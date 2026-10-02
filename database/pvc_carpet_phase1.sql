USE production_management;

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
