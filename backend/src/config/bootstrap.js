const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("./database");

const DEFAULT_ADMIN = {
    name: "System Administrator",
    email: "admin@rainbowcarpet.com",
    phone: "+91 90000 00000",
    password: "Rainbow@123",
    role: "SUPER_ADMIN"
};

async function ensureSchemaPatches() {
    try {
        // 1. users.employee_id
        try {
            const [uCols] = await pool.query("SHOW COLUMNS FROM users LIKE 'employee_id'");
            if (uCols.length === 0) {
                await pool.query("ALTER TABLE users ADD COLUMN employee_id BIGINT UNSIGNED NULL AFTER role_id");
                console.log("[bootstrap] Added employee_id column to users table.");
            }
        } catch (e) {
            console.warn("[bootstrap] users.employee_id patch:", e.message);
        }

        // 2. material_batches.reel_count
        try {
            const [mbCols] = await pool.query("SHOW COLUMNS FROM material_batches LIKE 'reel_count'");
            if (mbCols.length === 0) {
                await pool.query("ALTER TABLE material_batches ADD COLUMN reel_count INT NULL DEFAULT 1 AFTER current_quantity");
                console.log("[bootstrap] Added reel_count column to material_batches table.");
            }
        } catch (e) {
            console.warn("[bootstrap] material_batches.reel_count patch:", e.message);
        }

        // 3. stock_transactions.reel_count
        try {
            const [stCols] = await pool.query("SHOW COLUMNS FROM stock_transactions LIKE 'reel_count'");
            if (stCols.length === 0) {
                await pool.query("ALTER TABLE stock_transactions ADD COLUMN reel_count INT NULL DEFAULT 1 AFTER quantity");
                console.log("[bootstrap] Added reel_count column to stock_transactions table.");
            }
        } catch (e) {
            console.warn("[bootstrap] stock_transactions.reel_count patch:", e.message);
        }

        // 4. material_receipt_items.reel_count
        try {
            const [mriCols] = await pool.query("SHOW COLUMNS FROM material_receipt_items LIKE 'reel_count'");
            if (mriCols.length === 0) {
                await pool.query("ALTER TABLE material_receipt_items ADD COLUMN reel_count INT NULL DEFAULT 1 AFTER quantity_received");
                console.log("[bootstrap] Added reel_count column to material_receipt_items table.");
            }
        } catch (e) {
            console.warn("[bootstrap] material_receipt_items.reel_count patch:", e.message);
        }
    } catch (err) {
        console.error("[bootstrap] Schema patch error:", err.message);
    }
}

async function autoMigrateDatabase() {
    try {
        // Query existing tables in connected MySQL database
        const [tables] = await pool.query(
            "SELECT TABLE_NAME as name FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE()"
        );
        const tableNames = new Set(tables.map(t => (t.name || "").toLowerCase()));

        // Always ensure auxiliary schema patches (columns) exist
        await ensureSchemaPatches();

        // Check if key phase tables exist
        const criticalTables = ["product_processes", "carpet_rolls", "dispatch_challans", "machine_breakdowns", "material_receipts"];
        const missing = criticalTables.filter(t => !tableNames.has(t));

        if (missing.length === 0) {
            console.log("[bootstrap] Database schema is verified and up-to-date.");
            return { migrated: false, message: "Schema already complete and patched" };
        }

        console.log(`[bootstrap] Missing tables detected (${missing.join(", ")}). Running auto-migration...`);

        const migrationFiles = [
            "database.sql",
            "add_pvc_carpet_category.sql",
            "pvc_carpet_phase1.sql",
            "pvc_carpet_phase2.sql",
            "pvc_carpet_phase3_finished_goods.sql",
            "pvc_carpet_phase4_quality.sql",
            "pvc_carpet_phase5_dispatch.sql",
            "pvc_carpet_phase6_formulations.sql",
            "pvc_carpet_phase7_maintenance.sql",
            "pvc_carpet_phase8_grn.sql",
            "pvc_carpet_phase9_employees_seed.sql"
        ];

        const possibleDirs = [
            path.resolve(__dirname, "../../../database"),
            path.resolve(__dirname, "../../database"),
            path.resolve(process.cwd(), "database")
        ];
        const dbDir = possibleDirs.find(d => fs.existsSync(d));

        if (!dbDir) {
            console.warn("[bootstrap] Could not locate database directory for auto-migration.");
            return { migrated: false, error: "database folder not found" };
        }

        let executedQueries = 0;
        for (const file of migrationFiles) {
            const filePath = path.join(dbDir, file);
            if (!fs.existsSync(filePath)) continue;

            const content = fs.readFileSync(filePath, "utf8");
            const queries = content
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .replace(/--.*$/gm, "")
                .split(";")
                .map(q => q.trim())
                .filter(q => q.length > 0);

            for (const q of queries) {
                try {
                    await pool.query(q);
                    executedQueries++;
                } catch (err) {
                    const ignorable = [
                        "already exists",
                        "Duplicate column",
                        "Duplicate key",
                        "Duplicate entry",
                        "Multiple primary key",
                        "doesn't exist in table"
                    ];
                    if (!ignorable.some(ig => err.message.includes(ig))) {
                        console.warn(`[migration] (${file}): ${err.message.slice(0, 100)}`);
                    }
                }
            }
        }

        console.log(`[bootstrap] Auto-migration successfully executed ${executedQueries} statements.`);
        return { migrated: true, executedQueries };
    } catch (error) {
        console.error("[bootstrap] Auto-migration error:", error.message);
        return { migrated: false, error: error.message };
    }
}

async function ensureDefaultAdminUser() {
    try {
        const [roleRows] = await pool.query(
            "SELECT id FROM roles WHERE name = ? LIMIT 1",
            [DEFAULT_ADMIN.role]
        );

        if (roleRows.length === 0) {
            console.warn("[bootstrap] SUPER_ADMIN role not found. Skipping default admin creation.");
            return;
        }

        const [existing] = await pool.query(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [DEFAULT_ADMIN.email]
        );

        if (existing.length > 0) {
            return;
        }

        const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);

        await pool.query(
            `
            INSERT INTO users (
                role_id,
                name,
                email,
                phone,
                password_hash,
                status
            ) VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                roleRows[0].id,
                DEFAULT_ADMIN.name,
                DEFAULT_ADMIN.email,
                DEFAULT_ADMIN.phone,
                passwordHash,
                "ACTIVE"
            ]
        );

        console.log("[bootstrap] Default admin account created successfully.");
        console.log("[bootstrap] Login: admin@rainbowcarpet.com / Rainbow@123");
    } catch (error) {
        console.error("[bootstrap] Default admin seed failed:", error.message);
    }
}

module.exports = {
    autoMigrateDatabase,
    ensureSchemaPatches,
    ensureDefaultAdminUser,
    DEFAULT_ADMIN
};
