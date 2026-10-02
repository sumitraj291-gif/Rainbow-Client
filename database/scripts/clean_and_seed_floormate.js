const path = require('path');
const mysql = require(path.join(__dirname, '../../backend/node_modules/mysql2/promise'));

async function cleanAndSeedFloormate() {
    console.log('Connecting to database...');
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'production_management'
    });

    console.log('Disabling foreign key checks...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. CLEAR TRANSACTIONAL TEST ENTRIES
    console.log('Clearing transactional test entries...');
    const transactionalTables = [
        'carpet_roll_inspections',
        'quality_inspection_results',
        'quality_inspections',
        'carpet_rolls',
        'dispatch_challan_items',
        'dispatch_challans',
        'dispatch_items',
        'dispatches',
        'finished_goods',
        'stock_transactions',
        'material_receipt_items',
        'material_receipts',
        'material_issue_items',
        'material_issues',
        'paste_mixing_batches',
        'machine_breakdowns',
        'machine_maintenance',
        'corrugation_entries',
        'die_cutting_entries',
        'folding_gluing_entries',
        'printing_entries',
        'rework_entries',
        'production_entries',
        'production_materials',
        'production_order_processes',
        'production_orders',
        'sales_order_items',
        'sales_orders',
        'purchase_order_items',
        'purchase_orders',
        'activity_logs',
        'notifications'
    ];

    for (const table of transactionalTables) {
        try {
            await conn.query(`TRUNCATE TABLE \`${table}\``);
            console.log(`  - Truncated table: ${table}`);
        } catch (err) {
            console.warn(`  - Note on ${table}: ${err.message}`);
        }
    }

    // 2. CLEAR OLD DUMMY PRODUCTS AND PROCESS ROUTINGS
    console.log('Clearing old product routings and dummy products...');
    await conn.query('TRUNCATE TABLE product_processes');
    await conn.query('TRUNCATE TABLE products');

    // Remove legacy corrugated box categories if desired, or replace with Floormate categories
    console.log('Updating product categories...');
    await conn.query('DELETE FROM product_categories WHERE name IN ("Corrugated Box", "Printed Box", "Die Cut Box", "Special Packaging")');
    
    // Ensure Floormate categories exist
    await conn.query(`
        INSERT INTO product_categories (id, name, description) VALUES
        (5, 'PVC Mat Rolls', 'Continuous PVC Anti-Slip & Drainage Mat Rolls (Zig Zag, Snake, Pool, Grass)'),
        (6, 'PVC Door Mats', 'Pre-cut Vinyl Loop Spike & Royal Doormats with Anti-Slip Backing')
        ON DUPLICATE KEY UPDATE 
            name = VALUES(name),
            description = VALUES(description)
    `);

    // Ensure Square Feet unit exists
    console.log('Ensuring Square Feet unit exists...');
    await conn.query(`
        INSERT INTO units (name, symbol)
        SELECT 'Square Feet', 'SQFT'
        WHERE NOT EXISTS (
            SELECT 1 FROM units WHERE symbol IN ('SQFT', 'SQ.FT')
        )
    `);

    const [[sqftUnit]] = await conn.query("SELECT id FROM units WHERE symbol IN ('SQFT', 'SQ.FT') LIMIT 1");
    const [[pcsUnit]] = await conn.query("SELECT id FROM units WHERE symbol = 'PCS' LIMIT 1");
    const [[rollUnit]] = await conn.query("SELECT id FROM units WHERE symbol = 'ROLL' LIMIT 1");

    const sqftId = sqftUnit ? sqftUnit.id : 5;
    const pcsId = pcsUnit ? pcsUnit.id : 1;
    const rollId = rollUnit ? rollUnit.id : 8;

    // 3. CLEAN UP UNWANTED DUMMY MACHINES
    console.log('Cleaning up dummy machines...');
    await conn.query('DELETE FROM machines WHERE machine_code IN ("CORR-001", "110sr", "PVC-MCH-001")');

    // Ensure Floormate specific machines exist
    await conn.query(`
        INSERT INTO machines (id, machine_code, machine_name, machine_type, capacity_per_hour, status) VALUES
        (20, 'EXTRUDER-01', 'PVC Extrusion & S-Grid / Zig-Zag Forming Line', 'Extrusion Line', 400.00, 'RUNNING'),
        (21, 'LOOP-TUFT-01', 'Vinyl Loop Extrusion & Tufting Line', 'Loop Forming Machine', 350.00, 'RUNNING'),
        (22, 'DIE-CUT-01', 'Heavy Duty Hydraulic Door Mat Die-Cutting Press', 'Die Cutting Press', 500.00, 'RUNNING')
        ON DUPLICATE KEY UPDATE 
            machine_name = VALUES(machine_name),
            machine_type = VALUES(machine_type)
    `);

    // 4. CLEAN UP UNWANTED DUMMY PROCESSES
    console.log('Setting up standardized Floormate manufacturing processes...');
    await conn.query('DELETE FROM processes WHERE process_code IN ("110sr", "TEST-PVC-001", "PVC-CARPET-001")');

    const standardProcesses = [
        { code: 'PROC-001', name: 'Raw Material Plastisol Mixing', dept: 'Compounding', machineReq: 1, stdOut: 600 },
        { code: 'PROC-002', name: 'PVC Extrusion & Grid/Loop Forming', dept: 'Production', machineReq: 1, stdOut: 350 },
        { code: 'PROC-003', name: 'Curing & Backing Lamination', dept: 'Production', machineReq: 1, stdOut: 400 },
        { code: 'PROC-004', name: 'Door Mat Die-Cutting (38x60cm)', dept: 'Finishing', machineReq: 1, stdOut: 500 },
        { code: 'PROC-005', name: 'Roll Continuous Winding & Slitting', dept: 'Finishing', machineReq: 1, stdOut: 450 },
        { code: 'PROC-006', name: 'Quality Inspection & Thickness Test', dept: 'Quality Control', machineReq: 0, stdOut: 500 },
        { code: 'PROC-007', name: 'Final Packing (Carton / Shrink Wrap)', dept: 'Packing', machineReq: 0, stdOut: 600 }
    ];

    for (const p of standardProcesses) {
        await conn.query(`
            INSERT INTO processes (process_code, process_name, department, machine_required, standard_output_per_hour, status)
            VALUES (?, ?, ?, ?, ?, 'ACTIVE')
            ON DUPLICATE KEY UPDATE
                process_name = VALUES(process_name),
                department = VALUES(department),
                machine_required = VALUES(machine_required),
                standard_output_per_hour = VALUES(standard_output_per_hour)
        `, [p.code, p.name, p.dept, p.machineReq, p.stdOut]);
    }

    // 5. INSERT REAL FLOORMATE PRODUCT CATALOG
    console.log('Seeding real Floormate products...');
    const products = [
        // A. DOOR MATS (Piece Packing, 38 x 60 cm)
        {
            code: 'FM-MAT-3860-BLU',
            catId: 6,
            name: 'Floormate Spike Door Mat 38x60cm (Blue)',
            type: 'Vinyl Loop Mat',
            pattern: 'Resilient Vinyl Loop / Spike',
            color: 'Blue',
            width: 380.00,
            length: 0.60,
            thickness: 12.000,
            gsm: 2800.00,
            finish: 'Vinyl Loop Pile',
            backing: 'Anti-Slip PVC Solid Backing',
            packing: 'Carton Box (250 Pcs)',
            stdCost: 75.00,
            sellingPrice: 125.00,
            unitId: pcsId
        },
        {
            code: 'FM-MAT-3860-BRN',
            catId: 6,
            name: 'Floormate Spike Door Mat 38x60cm (Brown)',
            type: 'Vinyl Loop Mat',
            pattern: 'Resilient Vinyl Loop / Spike',
            color: 'Brown',
            width: 380.00,
            length: 0.60,
            thickness: 12.000,
            gsm: 2800.00,
            finish: 'Vinyl Loop Pile',
            backing: 'Anti-Slip PVC Solid Backing',
            packing: 'Carton Box (250 Pcs)',
            stdCost: 75.00,
            sellingPrice: 125.00,
            unitId: pcsId
        },
        {
            code: 'FM-MAT-3860-GRY',
            catId: 6,
            name: 'Floormate Royal PVC Door Mat 38x60cm (Grey)',
            type: 'Vinyl Loop Mat',
            pattern: 'Heather Melange Loop',
            color: 'Heather Grey',
            width: 380.00,
            length: 0.60,
            thickness: 14.000,
            gsm: 3200.00,
            finish: 'Heavy Duty Loop Pile',
            backing: 'Anti-Slip PVC Solid Backing',
            packing: 'Carton Box (250 Pcs)',
            stdCost: 80.00,
            sellingPrice: 125.00,
            unitId: pcsId
        },
        {
            code: 'FM-MAT-3860-RED',
            catId: 6,
            name: 'Floormate Spike Door Mat 38x60cm (Red)',
            type: 'Vinyl Loop Mat',
            pattern: 'Resilient Vinyl Loop / Spike',
            color: 'Red',
            width: 380.00,
            length: 0.60,
            thickness: 12.000,
            gsm: 2800.00,
            finish: 'Vinyl Loop Pile',
            backing: 'Anti-Slip PVC Solid Backing',
            packing: 'Carton Box (250 Pcs)',
            stdCost: 75.00,
            sellingPrice: 125.00,
            unitId: pcsId
        },
        {
            code: 'FM-MAT-3860-GRN',
            catId: 6,
            name: 'Floormate Spike Door Mat 38x60cm (Green)',
            type: 'Vinyl Loop Mat',
            pattern: 'Resilient Vinyl Loop / Spike',
            color: 'Green',
            width: 380.00,
            length: 0.60,
            thickness: 12.000,
            gsm: 2800.00,
            finish: 'Vinyl Loop Pile',
            backing: 'Anti-Slip PVC Solid Backing',
            packing: 'Carton Box (250 Pcs)',
            stdCost: 75.00,
            sellingPrice: 125.00,
            unitId: pcsId
        },
        {
            code: 'FM-MAT-3860-BLK',
            catId: 6,
            name: 'Floormate Spike Door Mat 38x60cm (Black)',
            type: 'Vinyl Loop Mat',
            pattern: 'Resilient Vinyl Loop / Spike',
            color: 'Black',
            width: 380.00,
            length: 0.60,
            thickness: 12.000,
            gsm: 2800.00,
            finish: 'Vinyl Loop Pile',
            backing: 'Anti-Slip PVC Solid Backing',
            packing: 'Carton Box (250 Pcs)',
            stdCost: 75.00,
            sellingPrice: 125.00,
            unitId: pcsId
        },

        // B. ROLL PRODUCTS (Selling Unit: Per Sq Ft)
        {
            code: 'FM-ROLL-ZZ-12GRY',
            catId: 5,
            name: 'Floormate PVC Zig Zag Mat Roll 1.2m x 15m (Grey)',
            type: 'Zig Zag Mesh Roll',
            pattern: 'Zig Zag Open Grid',
            color: 'Grey',
            width: 1200.00,
            length: 15.00,
            thickness: 5.000,
            gsm: 2400.00,
            finish: 'Anti-Slip Open Grid',
            backing: 'Hollow Drainage (Through-flow)',
            packing: 'Roll with Core & Wrap',
            stdCost: 22.00,
            sellingPrice: 38.00,
            unitId: sqftId
        },
        {
            code: 'FM-ROLL-ZZ-12BLU',
            catId: 5,
            name: 'Floormate PVC Zig Zag Mat Roll 1.2m x 15m (Blue)',
            type: 'Zig Zag Mesh Roll',
            pattern: 'Zig Zag Open Grid',
            color: 'Blue',
            width: 1200.00,
            length: 15.00,
            thickness: 5.000,
            gsm: 2400.00,
            finish: 'Anti-Slip Open Grid',
            backing: 'Hollow Drainage (Through-flow)',
            packing: 'Roll with Core & Wrap',
            stdCost: 22.00,
            sellingPrice: 38.00,
            unitId: sqftId
        },
        {
            code: 'FM-ROLL-POOL-06BLU',
            catId: 5,
            name: 'Floormate PVC Swimming Pool Mat Roll 0.6m x 15m (Blue)',
            type: 'Swimming Pool Mat Roll',
            pattern: 'Porous Drainage Mesh',
            color: 'Blue',
            width: 600.00,
            length: 15.00,
            thickness: 5.000,
            gsm: 2200.00,
            finish: 'Water-Drainage Porous Mesh',
            backing: 'Open Water-Flow Base',
            packing: 'Roll Wrapped',
            stdCost: 22.00,
            sellingPrice: 38.00,
            unitId: sqftId
        },
        {
            code: 'FM-ROLL-SNK-06PUR',
            catId: 5,
            name: 'Floormate PVC Snake Carpet Roll 0.6m x 15m (Purple)',
            type: 'Snake Pattern Mat Roll',
            pattern: 'S-Grid Snake Hollow Mesh',
            color: 'Light Purple',
            width: 600.00,
            length: 15.00,
            thickness: 4.000,
            gsm: 2000.00,
            finish: 'Snake Pattern Mesh',
            backing: 'Drainage Base',
            packing: 'Roll Wrapped',
            stdCost: 20.00,
            sellingPrice: 38.00,
            unitId: sqftId
        },
        {
            code: 'FM-ROLL-SNK-06RED',
            catId: 5,
            name: 'Floormate PVC Snake Carpet Roll 0.6m x 15m (Red)',
            type: 'Snake Pattern Mat Roll',
            pattern: 'S-Grid Snake Hollow Mesh',
            color: 'Red',
            width: 600.00,
            length: 15.00,
            thickness: 5.000,
            gsm: 2300.00,
            finish: 'Snake Pattern Mesh',
            backing: 'Drainage Base',
            packing: 'Roll Wrapped',
            stdCost: 22.00,
            sellingPrice: 38.00,
            unitId: sqftId
        },
        {
            code: 'FM-ROLL-SNK-06GRN',
            catId: 5,
            name: 'Floormate PVC Snake Carpet Roll 0.6m x 15m (Green)',
            type: 'Snake Pattern Mat Roll',
            pattern: 'S-Grid Snake Hollow Mesh',
            color: 'Green',
            width: 600.00,
            length: 15.00,
            thickness: 5.000,
            gsm: 2300.00,
            finish: 'Snake Pattern Mesh',
            backing: 'Drainage Base',
            packing: 'Roll Wrapped',
            stdCost: 22.00,
            sellingPrice: 38.00,
            unitId: sqftId
        },
        {
            code: 'FM-ROLL-FLR-06GRY',
            catId: 5,
            name: 'Floormate PVC Flooring Mat Roll 0.6m x 15m (Grey)',
            type: 'Flooring Mat Roll',
            pattern: 'Fine Ribbed Grid',
            color: 'Grey',
            width: 600.00,
            length: 15.00,
            thickness: 5.000,
            gsm: 2500.00,
            finish: 'Fine Ribbed Anti-Slip',
            backing: 'Cushioned Base',
            packing: 'Roll Wrapped',
            stdCost: 23.00,
            sellingPrice: 38.00,
            unitId: sqftId
        },
        {
            code: 'FM-ROLL-TURF-06GRY',
            catId: 5,
            name: 'Floormate Plastic Bristle Turf Mat Roll 0.6m x 15m (Grey)',
            type: 'Bristle Turf Mat Roll',
            pattern: 'Artificial Grass / Bristle',
            color: 'Grey',
            width: 600.00,
            length: 15.00,
            thickness: 5.000,
            gsm: 2600.00,
            finish: 'Bristle Top',
            backing: 'Flexible Solid Base',
            packing: 'Roll Wrapped',
            stdCost: 24.00,
            sellingPrice: 38.00,
            unitId: sqftId
        },
        {
            code: 'FM-ROLL-TURF-06GRN',
            catId: 5,
            name: 'Floormate Green PVC Anti Slip Mat Roll 0.6m x 15m',
            type: 'Anti Slip Mat Roll',
            pattern: 'Anti-Slip Porous Grid',
            color: 'Green',
            width: 600.00,
            length: 15.00,
            thickness: 5.000,
            gsm: 2300.00,
            finish: 'Anti-Slip Porous',
            backing: 'Drainage Base',
            packing: 'Roll Wrapped',
            stdCost: 22.00,
            sellingPrice: 38.00,
            unitId: sqftId
        }
    ];

    const insertedProductIds = [];

    for (const p of products) {
        const [res] = await conn.query(`
            INSERT INTO products (
                product_code, category_id, product_name, carpet_type, design_pattern,
                colour, width_mm, length_m, thickness_mm, gsm, surface_finish,
                backing_type, packing_type, standard_cost, selling_price, unit_id, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        `, [
            p.code, p.catId, p.name, p.type, p.pattern,
            p.color, p.width, p.length, p.thickness, p.gsm, p.finish,
            p.backing, p.packing, p.stdCost, p.sellingPrice, p.unitId
        ]);
        insertedProductIds.push({ id: res.insertId, code: p.code, catId: p.catId });
        console.log(`  + Created Product [${res.insertId}]: ${p.name}`);
    }

    // 6. SETUP PROCESS ROUTING FOR EACH PRODUCT
    console.log('Attaching production routing to Floormate products...');
    const [procRows] = await conn.query('SELECT id, process_code FROM processes');
    const procMap = {};
    procRows.forEach(r => { procMap[r.process_code] = r.id; });

    for (const prod of insertedProductIds) {
        if (prod.catId === 6) {
            // Door Mat Routing:
            // 1. Plastisol Mixing (MIX-COWLES-01)
            // 2. Loop Extrusion & Tufting (LOOP-TUFT-01)
            // 3. Curing & Backing Lamination (COAT-LINE-01)
            // 4. Door Mat Die-Cutting 38x60 (DIE-CUT-01)
            // 5. Quality Inspection
            // 6. Final Packing (Carton Box)
            const matSteps = [
                { proc: 'PROC-001', seq: 1, mch: 12, out: 600, setup: 15 },
                { proc: 'PROC-002', seq: 2, mch: 21, out: 350, setup: 20 },
                { proc: 'PROC-003', seq: 3, mch: 10, out: 400, setup: 15 },
                { proc: 'PROC-004', seq: 4, mch: 22, out: 500, setup: 10 },
                { proc: 'PROC-006', seq: 5, mch: null, out: 500, setup: 0 },
                { proc: 'PROC-007', seq: 6, mch: null, out: 600, setup: 0 }
            ];

            for (const s of matSteps) {
                if (procMap[s.proc]) {
                    await conn.query(`
                        INSERT INTO product_processes (
                            product_id, process_id, sequence_no, machine_id,
                            standard_output_per_hour, setup_minutes, mandatory
                        ) VALUES (?, ?, ?, ?, ?, ?, 1)
                    `, [prod.id, procMap[s.proc], s.seq, s.mch, s.out, s.setup]);
                }
            }
        } else {
            // Roll Product Routing:
            // 1. Plastisol Mixing (MIX-COWLES-01)
            // 2. Extrusion & Grid Forming (EXTRUDER-01)
            // 3. Curing & Cooling
            // 4. Continuous Winding & Slitting (INSPECT-SLIT-01)
            // 5. Visual QC & Roll Inspection (INSPECT-SLIT-01)
            // 6. Shrink Wrap Packaging
            const rollSteps = [
                { proc: 'PROC-001', seq: 1, mch: 12, out: 600, setup: 15 },
                { proc: 'PROC-002', seq: 2, mch: 20, out: 400, setup: 25 },
                { proc: 'PROC-003', seq: 3, mch: 10, out: 400, setup: 15 },
                { proc: 'PROC-005', seq: 4, mch: 15, out: 450, setup: 10 },
                { proc: 'PROC-006', seq: 5, mch: 15, out: 500, setup: 0 },
                { proc: 'PROC-007', seq: 6, mch: null, out: 600, setup: 0 }
            ];

            for (const s of rollSteps) {
                if (procMap[s.proc]) {
                    await conn.query(`
                        INSERT INTO product_processes (
                            product_id, process_id, sequence_no, machine_id,
                            standard_output_per_hour, setup_minutes, mandatory
                        ) VALUES (?, ?, ?, ?, ?, ?, 1)
                    `, [prod.id, procMap[s.proc], s.seq, s.mch, s.out, s.setup]);
                }
            }
        }
    }

    console.log('Re-enabling foreign key checks...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n======================================================');
    console.log('CLEANUP & SEEDING COMPLETED SUCCESSFULLY!');
    console.log(`Total Floormate Products Seeded: ${products.length}`);
    console.log('All transactional test entries cleared.');
    console.log('Standardized routing attached to all products.');
    console.log('======================================================\n');

    await conn.end();
}

cleanAndSeedFloormate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
