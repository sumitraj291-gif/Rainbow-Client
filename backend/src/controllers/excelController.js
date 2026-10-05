const pool = require("../config/database");
const XLSX = require("xlsx");

// ================================================================
// DATE & VALUE HELPERS
// ================================================================

/**
 * Robust date parser handling Excel serials, ISO dates, DD/MM/YYYY, etc.
 */
function parseExcelDate(val) {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) {
        return val.toISOString().slice(0, 10);
    }
    // Excel numeric serial date (e.g. 45123)
    if (typeof val === "number") {
        const utcDays = Math.floor(val - 25569);
        const utcValue = utcDays * 86400;
        const dateInfo = new Date(utcValue * 1000);
        if (!isNaN(dateInfo.getTime())) {
            return dateInfo.toISOString().slice(0, 10);
        }
    }
    const str = String(val).trim();
    if (!str) return null;

    // Matches YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return str.slice(0, 10);
    }
    // Matches DD/MM/YYYY or DD-MM-YYYY
    const parts = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (parts) {
        const day = parts[1].padStart(2, "0");
        const month = parts[2].padStart(2, "0");
        const year = parts[3];
        return `${year}-${month}-${day}`;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
    }
    return null;
}

function parseNumeric(val, fallback = 0) {
    if (val === null || val === undefined || val === "") return fallback;
    const clean = String(val).replace(/[^0-9.-]/g, "");
    const num = parseFloat(clean);
    return isNaN(num) ? fallback : num;
}

function cleanString(val, fallback = "") {
    if (val === null || val === undefined) return fallback;
    return String(val).trim();
}

function cleanEnum(val, allowedValues, defaultValue) {
    if (!val) return defaultValue;
    const upper = String(val).trim().toUpperCase().replace(/[\s-]/g, "_");
    return allowedValues.includes(upper) ? upper : defaultValue;
}

// ================================================================
// XLSX BUFFER BUILDER & PARSER
// ================================================================

function buildExcelBuffer(rows, columns, sheetName = "Sheet1") {
    const header = columns.map((c) => c.label);
    const data = rows.map((row) =>
        columns.map((c) => {
            let val = row[c.key];
            if (val === null || val === undefined) return "";
            if (c.type === "date" && val) {
                const parsed = parseExcelDate(val);
                return parsed || val;
            }
            return val;
        })
    );

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

    // Compute pleasant column widths
    ws["!cols"] = columns.map((c, idx) => {
        let maxLen = c.label.length;
        data.forEach((r) => {
            const cellVal = String(r[idx] || "");
            if (cellVal.length > maxLen) maxLen = cellVal.length;
        });
        return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function parseExcelBuffer(buffer, columns) {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

    // Build map of lowercase header name -> key
    const labelToKey = {};
    columns.forEach((c) => {
        labelToKey[c.label.toLowerCase().trim()] = c.key;
        labelToKey[c.key.toLowerCase().trim()] = c.key;
    });

    return raw.map((row) => {
        const mapped = {};
        Object.keys(row).forEach((header) => {
            const cleanHeader = header.toLowerCase().trim();
            const key = labelToKey[cleanHeader];
            if (key) {
                mapped[key] = row[header];
            }
        });
        return mapped;
    });
}

function sendExcel(res, buffer, filename) {
    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
}

// ================================================================
// COLUMN DEFINITIONS FOR ALL 12 MODULES
// ================================================================

const MODULE_COLUMNS = {

    customers: [
        { key: "customer_code", label: "Customer Code" },
        { key: "company_name", label: "Company Name" },
        { key: "contact_person", label: "Contact Person" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "gst_number", label: "GST Number" },
        { key: "billing_address", label: "Billing Address" },
        { key: "shipping_address", label: "Shipping Address" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "pincode", label: "Pincode" },
        { key: "credit_limit", label: "Credit Limit" },
        { key: "payment_terms", label: "Payment Terms" },
        { key: "status", label: "Status" }
    ],

    suppliers: [
        { key: "supplier_code", label: "Supplier Code" },
        { key: "company_name", label: "Company Name" },
        { key: "contact_person", label: "Contact Person" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "gst_number", label: "GST Number" },
        { key: "address", label: "Address" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "pincode", label: "Pincode" },
        { key: "payment_terms", label: "Payment Terms" },
        { key: "status", label: "Status" }
    ],

    products: [
        { key: "product_code", label: "Product Code" },
        { key: "category_name", label: "Category" },
        { key: "product_name", label: "Product Name" },
        { key: "carpet_type", label: "Carpet Type" },
        { key: "design_pattern", label: "Design Pattern" },
        { key: "colour", label: "Colour" },
        { key: "width_mm", label: "Width (mm)" },
        { key: "length_m", label: "Length (m)" },
        { key: "thickness_mm", label: "Thickness (mm)" },
        { key: "gsm", label: "GSM" },
        { key: "surface_finish", label: "Surface Finish" },
        { key: "backing_type", label: "Backing Type" },
        { key: "packing_type", label: "Packing Type" },
        { key: "standard_production_time", label: "Std Production Time (mins)" },
        { key: "standard_cost", label: "Standard Cost (INR)" },
        { key: "selling_price", label: "Selling Price (INR)" },
        { key: "unit_symbol", label: "Unit" },
        { key: "status", label: "Status" }
    ],

    raw_materials: [
        { key: "material_code", label: "Material Code" },
        { key: "category_name", label: "Category" },
        { key: "material_name", label: "Material Name" },
        { key: "grade", label: "Grade" },
        { key: "gsm", label: "GSM" },
        { key: "width_mm", label: "Width (mm)" },
        { key: "unit_symbol", label: "Unit" },
        { key: "current_stock", label: "Opening / Current Stock" },
        { key: "minimum_stock", label: "Minimum Stock" },
        { key: "reorder_level", label: "Reorder Level" },
        { key: "standard_purchase_rate", label: "Unit Purchase Rate (INR)" },
        { key: "status", label: "Status" }
    ],

    employees: [
        { key: "employee_code", label: "Employee Code" },
        { key: "name", label: "Full Name" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "department", label: "Department" },
        { key: "designation", label: "Designation" },
        { key: "joining_date", label: "Joining Date", type: "date" },
        { key: "shift", label: "Shift (DAY/NIGHT/ROTATIONAL/GENERAL)" },
        { key: "status", label: "Status" }
    ],

    machines: [
        { key: "machine_code", label: "Machine Code" },
        { key: "machine_name", label: "Machine Name" },
        { key: "machine_type", label: "Machine Type" },
        { key: "location", label: "Location / Bay" },
        { key: "manufacturer", label: "Manufacturer" },
        { key: "model_number", label: "Model Number" },
        { key: "installation_date", label: "Installation Date", type: "date" },
        { key: "capacity_per_hour", label: "Capacity Per Hour" },
        { key: "status", label: "Status (RUNNING/IDLE/MAINTENANCE/BREAKDOWN)" }
    ],

    sales_orders: [
        { key: "order_number", label: "Order Number" },
        { key: "customer_name", label: "Customer Name" },
        { key: "order_date", label: "Order Date", type: "date" },
        { key: "expected_delivery_date", label: "Delivery Date", type: "date" },
        { key: "priority", label: "Priority (LOW/NORMAL/HIGH/URGENT)" },
        { key: "total_amount", label: "Total Amount (INR)" },
        { key: "status", label: "Status (DRAFT/CONFIRMED/IN_PRODUCTION/COMPLETED)" },
        { key: "notes", label: "Remarks / Notes" }
    ],

    production_orders: [
        { key: "production_order_number", label: "Production Order No" },
        { key: "product_name", label: "Product Name" },
        { key: "planned_quantity", label: "Planned Quantity" },
        { key: "target_quantity", label: "Target Quantity" },
        { key: "production_date", label: "Production Date", type: "date" },
        { key: "expected_completion_date", label: "Expected Completion Date", type: "date" },
        { key: "priority", label: "Priority (LOW/NORMAL/HIGH/URGENT)" },
        { key: "shift", label: "Shift (DAY/NIGHT/GENERAL)" },
        { key: "status", label: "Status (PLANNED/READY/IN_PROGRESS/COMPLETED)" },
        { key: "remarks", label: "Remarks" }
    ],

    production_entries: [
        { key: "production_order_number", label: "Production Order No" },
        { key: "machine_name", label: "Machine Name" },
        { key: "operator_name", label: "Operator Name" },
        { key: "production_date", label: "Production Date", type: "date" },
        { key: "shift", label: "Shift (DAY/NIGHT)" },
        { key: "input_quantity", label: "Input Quantity" },
        { key: "good_quantity", label: "Good Quantity" },
        { key: "rejected_quantity", label: "Rejected Quantity" },
        { key: "wastage_quantity", label: "Wastage Quantity" },
        { key: "downtime_minutes", label: "Downtime (mins)" },
        { key: "remarks", label: "Remarks" }
    ],

    maintenance: [
        { key: "breakdown_ticket_no", label: "Ticket Number" },
        { key: "machine_name", label: "Machine Name" },
        { key: "severity", label: "Severity (LOW/MEDIUM/HIGH/CRITICAL)" },
        { key: "breakdown_category", label: "Category (MECHANICAL/ELECTRICAL/PNEUMATIC/THERMAL_OIL)" },
        { key: "breakdown_start", label: "Breakdown Date & Time" },
        { key: "reason", label: "Problem / Breakdown Reason" },
        { key: "action_taken", label: "Action Taken" },
        { key: "technician_name", label: "Technician Name" },
        { key: "reported_by_name", label: "Reported By" },
        { key: "downtime_minutes", label: "Downtime (mins)" },
        { key: "status", label: "Status (OPEN/IN_REPAIR/RESOLVED/CLOSED)" }
    ],

    dispatches: [
        { key: "challan_number", label: "Challan Number" },
        { key: "gate_pass_number", label: "Gate Pass Number" },
        { key: "customer_name", label: "Customer Name" },
        { key: "dispatch_date", label: "Dispatch Date", type: "date" },
        { key: "vehicle_number", label: "Vehicle Number" },
        { key: "driver_name", label: "Driver Name" },
        { key: "driver_phone", label: "Driver Phone" },
        { key: "total_rolls", label: "Total Rolls" },
        { key: "total_linear_meters", label: "Total Linear Meters" },
        { key: "status", label: "Status (PREPARING/LOADED/DISPATCHED/DELIVERED)" },
        { key: "remarks", label: "Remarks" }
    ],

    material_receipts: [
        { key: "grn_number", label: "GRN Number" },
        { key: "supplier_name", label: "Supplier Name" },
        { key: "receipt_date", label: "Receipt Date", type: "date" },
        { key: "invoice_number", label: "Invoice Number" },
        { key: "supplier_challan_no", label: "Challan Number" },
        { key: "vehicle_number", label: "Vehicle Number" },
        { key: "total_packages", label: "Total Packages" },
        { key: "total_amount_inr", label: "Total Amount (INR)" },
        { key: "status", label: "Status (RECEIVED/QC_PENDING/APPROVED/REJECTED)" },
        { key: "remarks", label: "Remarks" }
    ]
};

// ================================================================
// REALISTIC SAMPLE TEMPLATE DATA PER MODULE
// (Pre-fills 1-2 rows so downloaded templates are immediately useful)
// ================================================================

const SAMPLE_TEMPLATE_ROWS = {
    customers: [
        {
            customer_code: "CUST-DEMO-01",
            company_name: "Apex Flooring Solutions Pvt Ltd",
            contact_person: "Rajesh Kumar",
            phone: "+91 98765 43210",
            email: "info@apexflooring.com",
            gst_number: "24AAACA1234A1Z5",
            billing_address: "Plot 42, GIDC Phase 2, Vatva",
            shipping_address: "Plot 42, GIDC Phase 2, Vatva",
            city: "Ahmedabad",
            state: "Gujarat",
            pincode: "382445",
            credit_limit: "500000",
            payment_terms: "Net 30 Days",
            status: "ACTIVE"
        }
    ],
    suppliers: [
        {
            supplier_code: "SUP-DEMO-01",
            company_name: "National Chemical Suppliers Ltd",
            contact_person: "Anil Patel",
            phone: "+91 98250 11223",
            email: "sales@nationalchem.com",
            gst_number: "24AABCN1234D1Z2",
            address: "Survey 108, Petrochem Zone",
            city: "Surat",
            state: "Gujarat",
            pincode: "394510",
            payment_terms: "Net 45 Days",
            status: "ACTIVE"
        }
    ],
    products: [
        {
            product_code: "PRD-CARPET-01",
            category_name: "Printed Vinyl Carpet",
            product_name: "Royal Persian Embossed Vinyl Carpet 2.0mm",
            carpet_type: "Embossed Vinyl",
            design_pattern: "Persian Floral Gold",
            colour: "Burgundy / Gold",
            width_mm: "2000",
            length_m: "30",
            thickness_mm: "2.00",
            gsm: "1450",
            surface_finish: "Matt Anti-Skid",
            backing_type: "Non-Woven Polyester Felt",
            packing_type: "Heavy Gauge Shrink Polywrap",
            standard_production_time: "45",
            standard_cost: "280.00",
            selling_price: "420.00",
            unit_symbol: "M",
            status: "ACTIVE"
        }
    ],
    raw_materials: [
        {
            material_code: "RM-PVC-K67",
            category_name: "PVC Resin",
            material_name: "PVC Suspension Resin K-67 Grade",
            grade: "Suspension K-67",
            gsm: "",
            width_mm: "",
            unit_symbol: "KG",
            current_stock: "25000",
            minimum_stock: "5000",
            reorder_level: "10000",
            standard_purchase_rate: "115.00",
            status: "ACTIVE"
        }
    ],
    employees: [
        {
            employee_code: "EMP-OP-01",
            name: "Ramesh Sharma",
            phone: "+91 99887 76655",
            email: "ramesh.sharma@factory.local",
            department: "Coating Line 01",
            designation: "Senior Line Operator",
            joining_date: "2023-01-15",
            shift: "DAY",
            status: "ACTIVE"
        }
    ],
    machines: [
        {
            machine_code: "MC-COAT-01",
            machine_name: "Continuous PVC Knife Coating Line #1",
            machine_type: "Coating & Gelling Line",
            location: "Bay 1 - Main Floor",
            manufacturer: "Bruckner Machinery",
            model_number: "MAGNO-3200",
            installation_date: "2021-04-10",
            capacity_per_hour: "450",
            status: "RUNNING"
        }
    ],
    sales_orders: [
        {
            order_number: "SO-2026-DEMO",
            customer_name: "Apex Flooring Solutions Pvt Ltd",
            order_date: "2026-10-01",
            expected_delivery_date: "2026-10-15",
            priority: "NORMAL",
            total_amount: "150000.00",
            status: "CONFIRMED",
            notes: "Immediate dispatch upon roll batch QA clearance"
        }
    ],
    production_orders: [
        {
            production_order_number: "PO-2026-DEMO",
            product_name: "Royal Persian Embossed Vinyl Carpet 2.0mm",
            planned_quantity: "500",
            target_quantity: "500",
            production_date: "2026-10-06",
            expected_completion_date: "2026-10-08",
            priority: "HIGH",
            shift: "DAY",
            status: "READY",
            remarks: "Standard 2.0mm plastisol formula run"
        }
    ],
    production_entries: [
        {
            production_order_number: "PO-2026-DEMO",
            machine_name: "Continuous PVC Knife Coating Line #1",
            operator_name: "Ramesh Sharma",
            production_date: "2026-10-06",
            shift: "DAY",
            input_quantity: "250",
            good_quantity: "245",
            rejected_quantity: "3",
            wastage_quantity: "2",
            downtime_minutes: "15",
            remarks: "Smooth production roll run, minimal trim scrap"
        }
    ],
    maintenance: [
        {
            breakdown_ticket_no: "BD-2026-DEMO",
            machine_name: "Continuous PVC Knife Coating Line #1",
            severity: "HIGH",
            breakdown_category: "THERMAL_OIL",
            breakdown_start: "2026-10-05 08:30:00",
            reason: "Oven zone 2 temperature fluctuation",
            action_taken: "Calibrated pneumatic temperature modulating actuator",
            technician_name: "Sanjay Solanki",
            reported_by_name: "Ramesh Sharma",
            downtime_minutes: "45",
            status: "RESOLVED"
        }
    ],
    dispatches: [
        {
            challan_number: "DC-2026-DEMO",
            gate_pass_number: "GP-2026-DEMO",
            customer_name: "Apex Flooring Solutions Pvt Ltd",
            dispatch_date: "2026-10-05",
            vehicle_number: "GJ-05-BX-1234",
            driver_name: "Suresh Yadav",
            driver_phone: "+91 97123 45678",
            total_rolls: "12",
            total_linear_meters: "360.00",
            status: "DISPATCHED",
            remarks: "Loaded with security seal #88192"
        }
    ],
    material_receipts: [
        {
            grn_number: "GRN-2026-DEMO",
            supplier_name: "National Chemical Suppliers Ltd",
            receipt_date: "2026-10-05",
            invoice_number: "INV-99018",
            supplier_challan_no: "CH-99018",
            vehicle_number: "GJ-06-AX-5544",
            total_packages: "500",
            total_amount_inr: "575000.00",
            status: "APPROVED",
            remarks: "Weight verified on gate weighbridge, COA attached"
        }
    ]
};

// ================================================================
// EXPORT QUERIES PER MODULE
// ================================================================

const EXPORT_QUERIES = {
    customers: `SELECT * FROM customers ORDER BY id DESC`,

    suppliers: `SELECT * FROM suppliers ORDER BY id DESC`,

    products: `
        SELECT p.*, 
               COALESCE(pc.name, 'General PVC') AS category_name,
               COALESCE(u.symbol, 'M') AS unit_symbol
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        LEFT JOIN units u ON p.unit_id = u.id
        ORDER BY p.id DESC
    `,

    raw_materials: `
        SELECT rm.*,
               COALESCE(mc.name, 'Chemicals') AS category_name,
               COALESCE(u.symbol, 'KG') AS unit_symbol,
               COALESCE((
                   SELECT SUM(mb.current_quantity) 
                   FROM material_batches mb 
                   WHERE mb.material_id = rm.id AND mb.qc_status = 'APPROVED'
               ), 0) AS current_stock
        FROM raw_materials rm
        LEFT JOIN material_categories mc ON rm.category_id = mc.id
        LEFT JOIN units u ON rm.unit_id = u.id
        ORDER BY rm.id DESC
    `,

    employees: `SELECT * FROM employees ORDER BY id DESC`,

    machines: `SELECT * FROM machines ORDER BY id DESC`,

    sales_orders: `
        SELECT so.*,
               c.company_name AS customer_name,
               COALESCE((
                   SELECT SUM(soi.ordered_quantity * soi.unit_price)
                   FROM sales_order_items soi
                   WHERE soi.sales_order_id = so.id
               ), 0) AS total_amount
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        ORDER BY so.id DESC
    `,

    production_orders: `
        SELECT po.*,
               p.product_name
        FROM production_orders po
        LEFT JOIN products p ON po.product_id = p.id
        ORDER BY po.id DESC
    `,

    production_entries: `
        SELECT pe.*,
               po.production_order_number,
               p.product_name,
               m.machine_name,
               e.name AS operator_name
        FROM production_entries pe
        LEFT JOIN production_orders po ON pe.production_order_id = po.id
        LEFT JOIN products p ON po.product_id = p.id
        LEFT JOIN machines m ON pe.machine_id = m.id
        LEFT JOIN employees e ON pe.operator_id = e.id
        ORDER BY pe.id DESC
    `,

    maintenance: `
        SELECT mb.*,
               m.machine_name,
               m.machine_code
        FROM machine_breakdowns mb
        LEFT JOIN machines m ON mb.machine_id = m.id
        ORDER BY mb.id DESC
    `,

    dispatches: `
        SELECT dc.*,
               COALESCE(dc.customer_name, c.company_name) AS customer_name
        FROM dispatch_challans dc
        LEFT JOIN customers c ON dc.customer_id = c.id
        ORDER BY dc.id DESC
    `,

    material_receipts: `
        SELECT mr.*,
               s.company_name AS supplier_name
        FROM material_receipts mr
        LEFT JOIN suppliers s ON mr.supplier_id = s.id
        ORDER BY mr.id DESC
    `
};

// ================================================================
// EXPORT HANDLER
// ================================================================

const exportModule = async (req, res) => {
    try {
        const { module } = req.params;

        const columns = MODULE_COLUMNS[module];
        const query = EXPORT_QUERIES[module];

        if (!columns || !query) {
            return res.status(400).json({
                success: false,
                message: `Unknown or unsupported module: ${module}`
            });
        }

        const [rows] = await pool.query(query);

        const sheetTitle = module.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const buffer = buildExcelBuffer(rows, columns, sheetTitle);

        const timestamp = new Date().toISOString().slice(0, 10);
        sendExcel(res, buffer, `${module}_export_${timestamp}.xlsx`);

    } catch (error) {
        console.error("Excel export error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to export Excel file",
            error: error.message
        });
    }
};

// ================================================================
// DOWNLOAD TEMPLATE HANDLER
// ================================================================

const downloadTemplate = async (req, res) => {
    try {
        const { module } = req.params;

        const columns = MODULE_COLUMNS[module];
        if (!columns) {
            return res.status(400).json({
                success: false,
                message: `Unknown module: ${module}`
            });
        }

        // Include sample realistic row for instant user clarity
        const sampleRows = SAMPLE_TEMPLATE_ROWS[module] || [];
        const sheetTitle = `${module.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Template`;
        const buffer = buildExcelBuffer(sampleRows, columns, sheetTitle);

        sendExcel(res, buffer, `${module}_template.xlsx`);

    } catch (error) {
        console.error("Template download error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate template",
            error: error.message
        });
    }
};

// ================================================================
// SMART RESOLVERS (Categories, Units, Foreign Keys)
// ================================================================

async function resolveProductCategory(connection, name) {
    if (!name || !String(name).trim()) return null;
    const cleanName = String(name).trim();
    const [rows] = await connection.query(
        `SELECT id FROM product_categories WHERE name = ? LIMIT 1`,
        [cleanName]
    );
    if (rows.length > 0) return rows[0].id;
    // Auto-create category if absent
    const [result] = await connection.query(
        `INSERT INTO product_categories (name, description) VALUES (?, ?)`,
        [cleanName, `Imported category: ${cleanName}`]
    );
    return result.insertId;
}

async function resolveMaterialCategory(connection, name) {
    if (!name || !String(name).trim()) return null;
    const cleanName = String(name).trim();
    const [rows] = await connection.query(
        `SELECT id FROM material_categories WHERE name = ? LIMIT 1`,
        [cleanName]
    );
    if (rows.length > 0) return rows[0].id;
    const [result] = await connection.query(
        `INSERT INTO material_categories (name, description) VALUES (?, ?)`,
        [cleanName, `Imported category: ${cleanName}`]
    );
    return result.insertId;
}

async function resolveUnit(connection, symbol) {
    const cleanSym = (symbol && String(symbol).trim()) ? String(symbol).trim().toUpperCase() : "M";
    const [rows] = await connection.query(
        `SELECT id FROM units WHERE symbol = ? OR name = ? LIMIT 1`,
        [cleanSym, cleanSym]
    );
    if (rows.length > 0) return rows[0].id;
    // Fallback: pick first available unit or create
    const [first] = await connection.query(`SELECT id FROM units LIMIT 1`);
    if (first.length > 0) return first[0].id;
    const [res] = await connection.query(
        `INSERT INTO units (name, symbol) VALUES (?, ?)`,
        [cleanSym, cleanSym]
    );
    return res.insertId;
}

async function resolveCustomerId(connection, nameOrCode) {
    if (!nameOrCode || !String(nameOrCode).trim()) return null;
    const clean = String(nameOrCode).trim();
    const [rows] = await connection.query(
        `SELECT id FROM customers WHERE company_name = ? OR customer_code = ? LIMIT 1`,
        [clean, clean]
    );
    return rows.length > 0 ? rows[0].id : null;
}

async function resolveSupplierId(connection, nameOrCode) {
    if (!nameOrCode || !String(nameOrCode).trim()) return null;
    const clean = String(nameOrCode).trim();
    const [rows] = await connection.query(
        `SELECT id FROM suppliers WHERE company_name = ? OR supplier_code = ? LIMIT 1`,
        [clean, clean]
    );
    return rows.length > 0 ? rows[0].id : null;
}

async function resolveProductId(connection, nameOrCode) {
    if (!nameOrCode || !String(nameOrCode).trim()) return null;
    const clean = String(nameOrCode).trim();
    const [rows] = await connection.query(
        `SELECT id FROM products WHERE product_name = ? OR product_code = ? LIMIT 1`,
        [clean, clean]
    );
    return rows.length > 0 ? rows[0].id : null;
}

async function resolveMachineId(connection, nameOrCode) {
    if (!nameOrCode || !String(nameOrCode).trim()) return null;
    const clean = String(nameOrCode).trim();
    const [rows] = await connection.query(
        `SELECT id FROM machines WHERE machine_name = ? OR machine_code = ? LIMIT 1`,
        [clean, clean]
    );
    return rows.length > 0 ? rows[0].id : null;
}

async function resolveEmployeeId(connection, nameOrCode) {
    if (!nameOrCode || !String(nameOrCode).trim()) return null;
    const clean = String(nameOrCode).trim();
    const [rows] = await connection.query(
        `SELECT id FROM employees WHERE name = ? OR employee_code = ? LIMIT 1`,
        [clean, clean]
    );
    return rows.length > 0 ? rows[0].id : null;
}

async function resolveProductionOrderId(connection, orderNo) {
    if (!orderNo || !String(orderNo).trim()) return null;
    const clean = String(orderNo).trim();
    const [rows] = await connection.query(
        `SELECT id, product_id FROM production_orders WHERE production_order_number = ? LIMIT 1`,
        [clean]
    );
    return rows.length > 0 ? rows[0] : null;
}

// ================================================================
// MODULE IMPORT PROCESSORS
// ================================================================

const MODULE_IMPORTERS = {

    customers: async (connection, row) => {
        const code = cleanString(row.customer_code);
        const name = cleanString(row.company_name);
        if (!code || !name) throw new Error("Customer Code and Company Name are required.");

        const payload = {
            customer_code: code,
            company_name: name,
            contact_person: cleanString(row.contact_person),
            phone: cleanString(row.phone),
            email: cleanString(row.email),
            gst_number: cleanString(row.gst_number),
            billing_address: cleanString(row.billing_address),
            shipping_address: cleanString(row.shipping_address),
            city: cleanString(row.city),
            state: cleanString(row.state),
            pincode: cleanString(row.pincode),
            credit_limit: parseNumeric(row.credit_limit, 0),
            payment_terms: cleanString(row.payment_terms, "Net 30 Days"),
            status: cleanEnum(row.status, ["ACTIVE", "INACTIVE"], "ACTIVE")
        };

        const [existing] = await connection.query(
            `SELECT id FROM customers WHERE customer_code = ? LIMIT 1`,
            [code]
        );

        if (existing.length > 0) {
            await connection.query(
                `UPDATE customers SET ? WHERE customer_code = ?`,
                [payload, code]
            );
            return { action: "updated", id: existing[0].id };
        } else {
            const [res] = await connection.query(
                `INSERT INTO customers SET ?`,
                [payload]
            );
            return { action: "inserted", id: res.insertId };
        }
    },

    suppliers: async (connection, row) => {
        const code = cleanString(row.supplier_code);
        const name = cleanString(row.company_name);
        if (!code || !name) throw new Error("Supplier Code and Company Name are required.");

        const payload = {
            supplier_code: code,
            company_name: name,
            contact_person: cleanString(row.contact_person),
            phone: cleanString(row.phone),
            email: cleanString(row.email),
            gst_number: cleanString(row.gst_number),
            address: cleanString(row.address),
            city: cleanString(row.city),
            state: cleanString(row.state),
            pincode: cleanString(row.pincode),
            payment_terms: cleanString(row.payment_terms, "Net 30 Days"),
            status: cleanEnum(row.status, ["ACTIVE", "INACTIVE"], "ACTIVE")
        };

        const [existing] = await connection.query(
            `SELECT id FROM suppliers WHERE supplier_code = ? LIMIT 1`,
            [code]
        );

        if (existing.length > 0) {
            await connection.query(
                `UPDATE suppliers SET ? WHERE supplier_code = ?`,
                [payload, code]
            );
            return { action: "updated", id: existing[0].id };
        } else {
            const [res] = await connection.query(
                `INSERT INTO suppliers SET ?`,
                [payload]
            );
            return { action: "inserted", id: res.insertId };
        }
    },

    products: async (connection, row) => {
        const code = cleanString(row.product_code);
        const name = cleanString(row.product_name);
        if (!code || !name) throw new Error("Product Code and Product Name are required.");

        const categoryId = await resolveProductCategory(connection, row.category_name);
        const unitId = await resolveUnit(connection, row.unit_symbol);

        const payload = {
            product_code: code,
            category_id: categoryId,
            product_name: name,
            carpet_type: cleanString(row.carpet_type, "PVC Carpet"),
            design_pattern: cleanString(row.design_pattern),
            colour: cleanString(row.colour),
            width_mm: parseNumeric(row.width_mm, 2000),
            length_m: parseNumeric(row.length_m, 30),
            thickness_mm: parseNumeric(row.thickness_mm, 1.5),
            gsm: parseNumeric(row.gsm, 1200),
            surface_finish: cleanString(row.surface_finish, "Matt"),
            backing_type: cleanString(row.backing_type, "Non-Woven Felt"),
            packing_type: cleanString(row.packing_type, "Roll Shrink Wrapped"),
            standard_production_time: parseNumeric(row.standard_production_time, 30),
            standard_cost: parseNumeric(row.standard_cost, 0),
            selling_price: parseNumeric(row.selling_price, 0),
            unit_id: unitId,
            status: cleanEnum(row.status, ["ACTIVE", "INACTIVE"], "ACTIVE")
        };

        const [existing] = await connection.query(
            `SELECT id FROM products WHERE product_code = ? LIMIT 1`,
            [code]
        );

        if (existing.length > 0) {
            await connection.query(
                `UPDATE products SET ? WHERE product_code = ?`,
                [payload, code]
            );
            return { action: "updated", id: existing[0].id };
        } else {
            const [res] = await connection.query(
                `INSERT INTO products SET ?`,
                [payload]
            );
            return { action: "inserted", id: res.insertId };
        }
    },

    raw_materials: async (connection, row) => {
        const code = cleanString(row.material_code);
        const name = cleanString(row.material_name);
        if (!code || !name) throw new Error("Material Code and Material Name are required.");

        const categoryId = await resolveMaterialCategory(connection, row.category_name);
        const unitId = await resolveUnit(connection, row.unit_symbol || "KG");

        const minStock = parseNumeric(row.minimum_stock, 100);
        const reorder = parseNumeric(row.reorder_level, 200);
        const rate = parseNumeric(row.standard_purchase_rate, 0);

        const payload = {
            material_code: code,
            category_id: categoryId,
            material_name: name,
            grade: cleanString(row.grade),
            gsm: parseNumeric(row.gsm, 0) || null,
            width_mm: parseNumeric(row.width_mm, 0) || null,
            unit_id: unitId,
            minimum_stock: minStock,
            reorder_level: reorder,
            standard_purchase_rate: rate,
            status: cleanEnum(row.status, ["ACTIVE", "INACTIVE"], "ACTIVE")
        };

        const [existing] = await connection.query(
            `SELECT id FROM raw_materials WHERE material_code = ? LIMIT 1`,
            [code]
        );

        let materialId;
        let action = "inserted";

        if (existing.length > 0) {
            materialId = existing[0].id;
            await connection.query(
                `UPDATE raw_materials SET ? WHERE material_code = ?`,
                [payload, code]
            );
            action = "updated";
        } else {
            const [res] = await connection.query(
                `INSERT INTO raw_materials SET ?`,
                [payload]
            );
            materialId = res.insertId;
        }

        // If opening / current stock is provided > 0, ensure an approved batch exists
        const openingStock = parseNumeric(row.current_stock, 0);
        if (openingStock > 0) {
            const [batch] = await connection.query(
                `SELECT id FROM material_batches WHERE material_id = ? LIMIT 1`,
                [materialId]
            );
            if (batch.length === 0) {
                const batchNum = `BATCH-INIT-${code}`;
                await connection.query(
                    `INSERT INTO material_batches (material_id, batch_number, received_date, quantity_received, current_quantity, purchase_rate, qc_status)
                     VALUES (?, ?, CURDATE(), ?, ?, ?, 'APPROVED')`,
                    [materialId, batchNum, openingStock, openingStock, rate]
                );
            }
        }

        return { action, id: materialId };
    },

    employees: async (connection, row) => {
        const code = cleanString(row.employee_code);
        const name = cleanString(row.name);
        if (!code || !name) throw new Error("Employee Code and Full Name are required.");

        const payload = {
            employee_code: code,
            name: name,
            phone: cleanString(row.phone),
            email: cleanString(row.email),
            department: cleanString(row.department, "Production"),
            designation: cleanString(row.designation, "Operator"),
            joining_date: parseExcelDate(row.joining_date) || new Date().toISOString().slice(0, 10),
            shift: cleanEnum(row.shift, ["GENERAL", "DAY", "NIGHT", "ROTATIONAL"], "GENERAL"),
            status: cleanEnum(row.status, ["ACTIVE", "INACTIVE"], "ACTIVE")
        };

        const [existing] = await connection.query(
            `SELECT id FROM employees WHERE employee_code = ? LIMIT 1`,
            [code]
        );

        if (existing.length > 0) {
            await connection.query(
                `UPDATE employees SET ? WHERE employee_code = ?`,
                [payload, code]
            );
            return { action: "updated", id: existing[0].id };
        } else {
            const [res] = await connection.query(
                `INSERT INTO employees SET ?`,
                [payload]
            );
            return { action: "inserted", id: res.insertId };
        }
    },

    machines: async (connection, row) => {
        const code = cleanString(row.machine_code);
        const name = cleanString(row.machine_name);
        if (!code || !name) throw new Error("Machine Code and Machine Name are required.");

        const payload = {
            machine_code: code,
            machine_name: name,
            machine_type: cleanString(row.machine_type, "Production Line"),
            manufacturer: cleanString(row.manufacturer),
            model_number: cleanString(row.model_number),
            capacity_per_hour: parseNumeric(row.capacity_per_hour, 500),
            installation_date: parseExcelDate(row.installation_date) || new Date().toISOString().slice(0, 10),
            status: cleanEnum(row.status, ["RUNNING", "IDLE", "BREAKDOWN", "MAINTENANCE", "INACTIVE"], "IDLE")
        };

        const [existing] = await connection.query(
            `SELECT id FROM machines WHERE machine_code = ? LIMIT 1`,
            [code]
        );

        if (existing.length > 0) {
            await connection.query(
                `UPDATE machines SET ? WHERE machine_code = ?`,
                [payload, code]
            );
            return { action: "updated", id: existing[0].id };
        } else {
            const [res] = await connection.query(
                `INSERT INTO machines SET ?`,
                [payload]
            );
            return { action: "inserted", id: res.insertId };
        }
    },

    sales_orders: async (connection, row) => {
        const orderNo = cleanString(row.order_number);
        if (!orderNo) throw new Error("Order Number is required.");

        const customerId = await resolveCustomerId(connection, row.customer_name);
        if (!customerId) throw new Error(`Customer "${row.customer_name}" not found in database.`);

        const payload = {
            order_number: orderNo,
            customer_id: customerId,
            order_date: parseExcelDate(row.order_date) || new Date().toISOString().slice(0, 10),
            expected_delivery_date: parseExcelDate(row.expected_delivery_date) || null,
            priority: cleanEnum(row.priority, ["LOW", "NORMAL", "HIGH", "URGENT"], "NORMAL"),
            status: cleanEnum(row.status, ["DRAFT", "CONFIRMED", "PARTIAL", "IN_PRODUCTION", "COMPLETED", "CANCELLED"], "DRAFT"),
            notes: cleanString(row.notes)
        };

        const [existing] = await connection.query(
            `SELECT id FROM sales_orders WHERE order_number = ? LIMIT 1`,
            [orderNo]
        );

        if (existing.length > 0) {
            await connection.query(
                `UPDATE sales_orders SET ? WHERE order_number = ?`,
                [payload, orderNo]
            );
            return { action: "updated", id: existing[0].id };
        } else {
            const [res] = await connection.query(
                `INSERT INTO sales_orders SET ?`,
                [payload]
            );
            return { action: "inserted", id: res.insertId };
        }
    },

    production_orders: async (connection, row) => {
        const orderNo = cleanString(row.production_order_number);
        if (!orderNo) throw new Error("Production Order Number is required.");

        const productId = await resolveProductId(connection, row.product_name);
        if (!productId) throw new Error(`Product "${row.product_name}" not found in database.`);

        const planned = parseNumeric(row.planned_quantity, 100);
        const target = parseNumeric(row.target_quantity, planned);

        const payload = {
            production_order_number: orderNo,
            product_id: productId,
            planned_quantity: planned,
            target_quantity: target,
            production_date: parseExcelDate(row.production_date) || new Date().toISOString().slice(0, 10),
            expected_completion_date: parseExcelDate(row.expected_completion_date) || null,
            priority: cleanEnum(row.priority, ["LOW", "NORMAL", "HIGH", "URGENT"], "NORMAL"),
            shift: cleanEnum(row.shift, ["GENERAL", "DAY", "NIGHT"], "DAY"),
            status: cleanEnum(row.status, ["PLANNED", "MATERIAL_PENDING", "READY", "IN_PROGRESS", "QC_PENDING", "COMPLETED", "CANCELLED"], "PLANNED"),
            remarks: cleanString(row.remarks)
        };

        const [existing] = await connection.query(
            `SELECT id FROM production_orders WHERE production_order_number = ? LIMIT 1`,
            [orderNo]
        );

        if (existing.length > 0) {
            await connection.query(
                `UPDATE production_orders SET ? WHERE production_order_number = ?`,
                [payload, orderNo]
            );
            return { action: "updated", id: existing[0].id };
        } else {
            const [res] = await connection.query(
                `INSERT INTO production_orders SET ?`,
                [payload]
            );
            return { action: "inserted", id: res.insertId };
        }
    },

    production_entries: async (connection, row) => {
        const poOrder = await resolveProductionOrderId(connection, row.production_order_number);
        if (!poOrder) throw new Error(`Production Order "${row.production_order_number}" not found.`);

        const machineId = await resolveMachineId(connection, row.machine_name);
        const operatorId = await resolveEmployeeId(connection, row.operator_name);

        const inputQty = parseNumeric(row.input_quantity, 0);
        const goodQty = parseNumeric(row.good_quantity, 0);
        const rejQty = parseNumeric(row.rejected_quantity, 0);
        const wasteQty = parseNumeric(row.wastage_quantity, 0);
        const downtime = parseNumeric(row.downtime_minutes, 0);

        const payload = {
            production_order_id: poOrder.id,
            machine_id: machineId,
            operator_id: operatorId,
            production_date: parseExcelDate(row.production_date) || new Date().toISOString().slice(0, 10),
            shift: cleanEnum(row.shift, ["DAY", "NIGHT"], "DAY"),
            input_quantity: inputQty,
            good_quantity: goodQty,
            rejected_quantity: rejQty,
            wastage_quantity: wasteQty,
            downtime_minutes: downtime,
            remarks: cleanString(row.remarks)
        };

        const [res] = await connection.query(
            `INSERT INTO production_entries SET ?`,
            [payload]
        );
        return { action: "inserted", id: res.insertId };
    },

    maintenance: async (connection, row) => {
        const ticketNo = cleanString(row.breakdown_ticket_no);
        const machineId = await resolveMachineId(connection, row.machine_name);
        if (!machineId) throw new Error(`Machine "${row.machine_name}" not found.`);

        const payload = {
            breakdown_ticket_no: ticketNo || `BD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
            machine_id: machineId,
            severity: cleanEnum(row.severity, ["LOW", "MEDIUM", "HIGH", "CRITICAL"], "MEDIUM"),
            breakdown_category: cleanEnum(row.breakdown_category, ["MECHANICAL", "ELECTRICAL", "PNEUMATIC", "THERMAL_OIL", "ELECTRONIC_DRIVE", "OPERATOR_ERROR"], "MECHANICAL"),
            breakdown_start: parseExcelDate(row.breakdown_start) || new Date().toISOString().slice(0, 19).replace("T", " "),
            reason: cleanString(row.reason, "Equipment breakdown reported"),
            action_taken: cleanString(row.action_taken),
            technician_name: cleanString(row.technician_name),
            reported_by_name: cleanString(row.reported_by_name, "Line Supervisor"),
            downtime_minutes: parseNumeric(row.downtime_minutes, 0),
            status: cleanEnum(row.status, ["OPEN", "IN_REPAIR", "RESOLVED", "CLOSED"], "RESOLVED")
        };

        if (ticketNo) {
            const [existing] = await connection.query(
                `SELECT id FROM machine_breakdowns WHERE breakdown_ticket_no = ? LIMIT 1`,
                [ticketNo]
            );
            if (existing.length > 0) {
                await connection.query(
                    `UPDATE machine_breakdowns SET ? WHERE breakdown_ticket_no = ?`,
                    [payload, ticketNo]
                );
                return { action: "updated", id: existing[0].id };
            }
        }

        const [res] = await connection.query(
            `INSERT INTO machine_breakdowns SET ?`,
            [payload]
        );
        return { action: "inserted", id: res.insertId };
    },

    dispatches: async (connection, row) => {
        const challanNo = cleanString(row.challan_number);
        if (!challanNo) throw new Error("Challan Number is required.");

        const custName = cleanString(row.customer_name);
        const customerId = await resolveCustomerId(connection, custName);

        const payload = {
            challan_number: challanNo,
            gate_pass_number: cleanString(row.gate_pass_number) || `GP-${challanNo}`,
            customer_id: customerId,
            customer_name: custName || "Standard Customer",
            vehicle_number: cleanString(row.vehicle_number, "GJ-05-TR-0000"),
            driver_name: cleanString(row.driver_name),
            driver_phone: cleanString(row.driver_phone),
            dispatch_date: parseExcelDate(row.dispatch_date) || new Date().toISOString().slice(0, 10),
            total_rolls: parseNumeric(row.total_rolls, 0),
            total_linear_meters: parseNumeric(row.total_linear_meters, 0),
            status: cleanEnum(row.status, ["PREPARING", "LOADED", "DISPATCHED", "DELIVERED", "CANCELLED"], "DISPATCHED"),
            remarks: cleanString(row.remarks)
        };

        const [existing] = await connection.query(
            `SELECT id FROM dispatch_challans WHERE challan_number = ? LIMIT 1`,
            [challanNo]
        );

        if (existing.length > 0) {
            await connection.query(
                `UPDATE dispatch_challans SET ? WHERE challan_number = ?`,
                [payload, challanNo]
            );
            return { action: "updated", id: existing[0].id };
        } else {
            const [res] = await connection.query(
                `INSERT INTO dispatch_challans SET ?`,
                [payload]
            );
            return { action: "inserted", id: res.insertId };
        }
    },

    material_receipts: async (connection, row) => {
        const grnNo = cleanString(row.grn_number);
        if (!grnNo) throw new Error("GRN Number is required.");

        const supplierId = await resolveSupplierId(connection, row.supplier_name);
        if (!supplierId) throw new Error(`Supplier "${row.supplier_name}" not found in database.`);

        const payload = {
            grn_number: grnNo,
            supplier_id: supplierId,
            receipt_date: parseExcelDate(row.receipt_date) || new Date().toISOString().slice(0, 10),
            invoice_number: cleanString(row.invoice_number),
            supplier_challan_no: cleanString(row.supplier_challan_no),
            vehicle_number: cleanString(row.vehicle_number),
            total_packages: parseNumeric(row.total_packages, 0),
            total_amount_inr: parseNumeric(row.total_amount_inr, 0),
            status: cleanEnum(row.status, ["RECEIVED", "QC_PENDING", "APPROVED", "REJECTED"], "APPROVED"),
            remarks: cleanString(row.remarks)
        };

        const [existing] = await connection.query(
            `SELECT id FROM material_receipts WHERE grn_number = ? LIMIT 1`,
            [grnNo]
        );

        if (existing.length > 0) {
            await connection.query(
                `UPDATE material_receipts SET ? WHERE grn_number = ?`,
                [payload, grnNo]
            );
            return { action: "updated", id: existing[0].id };
        } else {
            const [res] = await connection.query(
                `INSERT INTO material_receipts SET ?`,
                [payload]
            );
            return { action: "inserted", id: res.insertId };
        }
    }
};

// ================================================================
// ROBUST IMPORT HANDLER
// ================================================================

const importModule = async (req, res) => {
    let connection;
    try {
        const { module } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No Excel file uploaded. Please upload a valid .xlsx or .xls file."
            });
        }

        const columns = MODULE_COLUMNS[module];
        const importer = MODULE_IMPORTERS[module];

        if (!columns || !importer) {
            return res.status(400).json({
                success: false,
                message: `Import is not supported for module: "${module}".`
            });
        }

        const rows = parseExcelBuffer(req.file.buffer, columns);

        if (!rows.length) {
            return res.status(400).json({
                success: false,
                message: "The uploaded file contains no data rows (empty sheet)."
            });
        }

        connection = await pool.getConnection();

        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        const errors = [];

        // Process row by row with dedicated error handling per row
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // Row 1 is header in Excel

            try {
                // Ensure row has at least one non-empty value
                const hasData = Object.values(row).some((v) => v !== "" && v !== null && v !== undefined);
                if (!hasData) {
                    skipped++;
                    continue;
                }

                await connection.beginTransaction();
                const result = await importer(connection, row);
                await connection.commit();

                if (result.action === "inserted") inserted++;
                else if (result.action === "updated") updated++;
                else skipped++;

            } catch (rowErr) {
                if (connection) {
                    try { await connection.rollback(); } catch (_) {}
                }
                skipped++;
                errors.push(`Row ${rowNum}: ${rowErr.message}`);
            }
        }

        connection.release();
        connection = null;

        const isFullSuccess = skipped === 0;
        const message = isFullSuccess
            ? `Successfully imported ${inserted} new records and updated ${updated} records.`
            : `Import completed with notes: ${inserted} inserted, ${updated} updated, ${skipped} skipped.`;

        res.json({
            success: true,
            message,
            summary: {
                total: rows.length,
                inserted,
                updated,
                skipped
            },
            errors: errors.slice(0, 25)
        });

    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (_) {}
            connection.release();
        }
        console.error("Excel import error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process Excel import",
            error: error.message
        });
    }
};

// ================================================================
// EXPORTS
// ================================================================

module.exports = {
    exportModule,
    importModule,
    downloadTemplate
};
