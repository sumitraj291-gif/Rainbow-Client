USE production_management;

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
