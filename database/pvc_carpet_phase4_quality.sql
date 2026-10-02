USE production_management;

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
