-- =========================================================
-- PVC CARPET PHASE 8: INBOUND MATERIAL RECEIPT (GRN) & SUPPLIERS
-- =========================================================

USE production_management;

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
