-- =========================================================
-- PVC CARPET PHASE 6: RAW MATERIALS, FORMULATIONS & PASTE MIXING
-- =========================================================

USE production_management;

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
