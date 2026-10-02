-- ====================================================================
-- SCRIPT: CLEAR TRANSACTIONAL DUMMY / TEST DATA
-- Preserves Master Data: users, roles, machines, processes,
-- product_categories, products, suppliers, customers, raw_materials,
-- chemical_formulations, chemical_formulation_items, units, warehouses.
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Quality & Carpet Rolls
TRUNCATE TABLE carpet_roll_inspections;
TRUNCATE TABLE quality_inspection_results;
TRUNCATE TABLE quality_inspections;
TRUNCATE TABLE carpet_rolls;

-- 2. Dispatch & Gate Pass
TRUNCATE TABLE dispatch_challan_items;
TRUNCATE TABLE dispatch_challans;
TRUNCATE TABLE dispatch_items;
TRUNCATE TABLE dispatches;

-- 3. Inbound Material Receipt (GRN) & Stock
TRUNCATE TABLE material_receipt_items;
TRUNCATE TABLE material_receipts;
TRUNCATE TABLE material_issue_items;
TRUNCATE TABLE material_issues;
TRUNCATE TABLE material_batches;
TRUNCATE TABLE finished_goods;
TRUNCATE TABLE stock_transactions;

-- 4. Chemical Paste Mixing Batches
TRUNCATE TABLE paste_mixing_batches;

-- 5. Plant Maintenance & Breakdowns
TRUNCATE TABLE machine_breakdowns;
TRUNCATE TABLE machine_maintenance;

-- 6. Production & Sales Orders
TRUNCATE TABLE corrugation_entries;
TRUNCATE TABLE die_cutting_entries;
TRUNCATE TABLE folding_gluing_entries;
TRUNCATE TABLE printing_entries;
TRUNCATE TABLE rework_entries;
TRUNCATE TABLE production_entries;
TRUNCATE TABLE production_materials;
TRUNCATE TABLE production_order_processes;
TRUNCATE TABLE production_orders;
TRUNCATE TABLE sales_order_items;
TRUNCATE TABLE sales_orders;
TRUNCATE TABLE purchase_order_items;
TRUNCATE TABLE purchase_orders;

-- 7. Reset completed (raw material stock is derived directly from material_batches)

-- 8. Activity logs & notifications
TRUNCATE TABLE activity_logs;
TRUNCATE TABLE notifications;

SET FOREIGN_KEY_CHECKS = 1;
