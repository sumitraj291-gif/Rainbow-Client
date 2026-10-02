// =========================================================
// ROLE-BASED ACCESS CONTROL (RBAC) CONFIGURATION
// RAINBOW MANUFACTURING ERP
// =========================================================

export const ROLE_PERMISSIONS = {
    // 1. Super Administrator (Owner / MD / GM) — Complete Full Access
    SUPER_ADMIN: ["*"],

    // 2. Administrator (Plant GM / IT Admin) — Complete Full Access
    ADMIN: ["*"],

    // 3. Production Manager (Plant Head / Shift Planning Incharge)
    PRODUCTION_MANAGER: [
        "/",
        "/suppliers",
        "/products",
        "/processes",
        "/machines",
        "/employees",
        "/product-routing",
        "/sales-orders",
        "/production-planning",
        "/production-orders",
        "/production-entry",
        "/production-execution",
        "/carpet-rolls",
        "/roll-scanner",
        "/chemical-mixing",
        "/wip",
        "/stock-transactions",
        "/reports/oee",
        "/reports/production",
        "/machine-breakdown",
        "/maintenance"
    ],

    // 4. Production Supervisor (Line Lead / Floor Supervisor like Dinesh Joshi)
    SUPERVISOR: [
        "/",
        "/machines",
        "/production-orders",
        "/production-entry",
        "/production-execution",
        "/carpet-rolls",
        "/roll-scanner",
        "/machine-breakdown",
        "/maintenance",
        "/reports/oee",
        "/reports/production"
    ],

    // 5. Machine Operator (Machine Line Workers)
    OPERATOR: [
        "/production-entry",
        "/production-execution",
        "/carpet-rolls",
        "/roll-scanner",
        "/machine-breakdown",
        "/maintenance"
    ],

    // 6. Quality Control Manager & Lab Inspector (QA / QC)
    QC_MANAGER: [
        "/",
        "/roll-scanner",
        "/quality",
        "/inspections",
        "/quality/roll-inspection",
        "/carpet-rolls",
        "/finished-goods",
        "/reports/quality"
    ],

    // 7. Store & Warehouse Manager / Inventory Head (Strictly Inventory Only)
    STORE_MANAGER: [
        "/material-receipt",
        "/material-receipts",
        "/material-issue",
        "/raw-material-stock",
        "/wip",
        "/finished-goods",
        "/stock-transactions",
        "/reports/inventory"
    ],

    // 8. Commercial & Sales Team
    SALES: [
        "/",
        "/customers",
        "/products",
        "/sales-orders",
        "/dispatch",
        "/dispatches"
    ]
};

export const getDefaultRoute = (roleName) => {
    const normalized = normalizeRoleName(roleName);
    switch (normalized) {
        case "STORE_MANAGER":
            return "/material-receipt";
        case "OPERATOR":
            return "/production-entry";
        default:
            return "/";
    }
};

const normalizeRoleName = (roleName) => {
    return String(roleName || "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_")
        .replace(/[^A-Z0-9_]/g, "");
};

// Check if a role has access to a specific route
export const hasPermission = (roleName, path) => {
    if (!roleName) return false;

    const cleanRole = normalizeRoleName(roleName);
    const allowed = ROLE_PERMISSIONS[cleanRole];

    if (!allowed) return false;
    if (allowed.includes("*")) return true;
    return allowed.includes(path);
};

// Default landing page for each role upon login
export const getDefaultPathForRole = (roleName) => {
    if (!roleName) return "/";

    const cleanRole = normalizeRoleName(roleName);

    if (cleanRole === "OPERATOR") return "/production-entry";
    if (cleanRole === "QC_MANAGER") return "/quality/roll-inspection";
    if (cleanRole === "STORE_MANAGER") return "/finished-goods";
    return "/";
};
