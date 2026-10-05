import React, { useState, useMemo } from "react";

import {
    BrowserRouter,
    Routes,
    Route,
    NavLink,
    useLocation,
    useNavigate
} from "react-router-dom";

// ================================
// AUTH & PERMISSIONS
// ================================

import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import { hasPermission } from "./config/permissions";

// ================================
// PAGES
// ================================

import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import SalesOrders from "./pages/SalesOrders";
import ProductionPlanning from "./pages/ProductionPlanning";
import ProductionOrders from "./pages/ProductionOrders";
import Machines from "./pages/Machines";
import ProductionEntries from "./pages/ProductionEntries";
import Processes from "./pages/Processes";
import ProductRouting from "./pages/ProductRouting";
import ProductionExecution from "./pages/ProductionExecution";
import OEEReports from "./pages/OEEReports";
import CarpetRolls from "./pages/CarpetRolls";
import FinishedGoods from "./pages/FinishedGoods";
import RollScanner from "./pages/RollScanner";
import RollInspection from "./pages/RollInspection";
import Dispatch from "./pages/Dispatch";
import RawMaterials from "./pages/RawMaterials";
import Maintenance from "./pages/Maintenance";
import MaterialReceipt from "./pages/MaterialReceipt";
import Employees from "./pages/Employees";
import Users from "./pages/Users";
import Suppliers from "./pages/Suppliers";
import StockTransactions from "./pages/StockTransactions";
import WIP from "./pages/WIP";
import Reports from "./pages/Reports";

import "./App.css";

// ================================
// ERP MENU STRUCTURE
// ================================

const menuSections = [

    {
        title: "OVERVIEW",

        items: [
            {
                name: "Dashboard",
                path: "/"
            }
        ]
    },

    {
        title: "MASTER DATA",

        items: [

            {
                name: "Customers",
                path: "/customers"
            },

            {
                name: "Suppliers",
                path: "/suppliers"
            },

            {
                name: "Products",
                path: "/products"
            },

            {
                name: "Processes",
                path: "/processes"
            },

            {
                name: "Raw Materials",
                path: "/raw-materials"
            },

            {
                name: "Machines",
                path: "/machines"
            },

            {
                name: "Employees",
                path: "/employees"
            },

            {
                name: "Users & Roles",
                path: "/users"
            },

            {
                name: "Product Routing",
                path: "/product-routing"
            }

        ]
    },

    {
        title: "SALES & PLANNING",

        items: [

            {
                name: "Sales Orders",
                path: "/sales-orders"
            },

            {
                name: "Production Planning",
                path: "/production-planning"
            },

            {
                name: "Production Orders",
                path: "/production-orders"
            }

        ]
    },

{
    title: "MANUFACTURING",
    items: [
        {
            name: "Production Entry",
            path: "/production-entry"
        },
        {
            name: "Production Execution",
            path: "/production-execution"
        },
        {
            name: "Process Master",
            path: "/processes"
        },
        {
            name: "Carpet Rolls",
            path: "/carpet-rolls"
        },
        {
            name: "Roll Scanner",
            path: "/roll-scanner"
        },
        {
            name: "Plastisol Paste Mixing",
            path: "/chemical-mixing"
        },
        {
            name: "Product Routing",
            path: "/product-routing"
        }
    ]
},

    {
        title: "QUALITY",

        items: [

            {
                name: "Roll Lab Inspection",
                path: "/quality/roll-inspection"
            },

            {
                name: "Inspections Log & COA",
                path: "/inspections"
            }

        ]
    },

    {
        title: "INVENTORY",

        items: [

            {
                name: "Material Receipt",
                path: "/material-receipt"
            },

            {
                name: "Material Issue",
                path: "/material-issue"
            },

            {
                name: "Raw Material Stock",
                path: "/raw-material-stock"
            },

            {
                name: "Work In Progress",
                path: "/wip"
            },

            {
                name: "Finished Goods",
                path: "/finished-goods"
            },

            {
                name: "Stock Transactions",
                path: "/stock-transactions"
            }

        ]
    },

    {
        title: "MAINTENANCE",

        items: [

            {
                name: "Machine Breakdown",
                path: "/machine-breakdown"
            },

            {
                name: "Maintenance",
                path: "/maintenance"
            }

        ]
    },

    {
        title: "DISPATCH",

        items: [

            {
                name: "Delivery Challans & Gate Pass",
                path: "/dispatch"
            }

        ]
    },

    {
        title: "REPORTS",

        items: [

            {
                name: "Production Reports",
                path: "/reports/production"
            },

            {
                name: "OEE Reports",
                path: "/reports/oee"
            },

            {
                name: "Quality Reports",
                path: "/reports/quality"
            },

            {
                name: "Inventory Reports",
                path: "/reports/inventory"
            }

        ]
    }

];

// ================================
// LAYOUT
// ================================

function AppLayout() {

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    // Automatically close mobile sidebar on route change
    React.useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const toggleSidebar = () => {
        if (typeof window !== "undefined" && window.innerWidth <= 768) {
            setMobileMenuOpen(prev => !prev);
        } else {
            setSidebarOpen(prev => !prev);
        }
    };

    const {
        user,
        logout
    } = useAuth();

    const userRole = user?.role_name || "";

    // Strictly filter sidebar sections and menu items by user role
    const filteredMenuSections = useMemo(() => {
        return menuSections
            .map((section) => ({
                ...section,
                items: section.items.filter((item) => hasPermission(userRole, item.path))
            }))
            .filter((section) => section.items.length > 0);
    }, [userRole]);

    // ================================
    // CURRENT PAGE
    // ================================

    const currentItem = filteredMenuSections
        .flatMap((section) => section.items)
        .find((item) => item.path === location.pathname);

    const pageTitle =
        currentItem?.name || (location.pathname === "/" ? "Dashboard" : "Operations");

    // ================================
    // USER INITIALS
    // ================================

    const getUserInitials = () => {

        if (!user?.name) {
            return "US";
        }

        return user.name
            .split(" ")
            .filter(Boolean)
            .map(word => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    };

    // ================================
    // LOGOUT
    // ================================

    const handleLogout = () => {

        logout();
        navigate("/login", { replace: true });
    };

    // ================================
    // LAYOUT
    // ================================

    return (

        <div
            className={
                `erp-layout ${
                    sidebarOpen
                        ? ""
                        : "sidebar-collapsed"
                } ${
                    mobileMenuOpen
                        ? "sidebar-mobile-open"
                        : ""
                }`
            }
        >

            {/* MOBILE BACKDROP */}
            {mobileMenuOpen && (
                <div
                    className="erp-sidebar-backdrop"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* ================================
                SIDEBAR
            ================================= */}

            <aside className="erp-sidebar">

                {/* BRAND */}

                <div className="brand-area">

                    <div className="brand-mark">
                        R
                    </div>

                    <div className="brand-text">

                        <strong>
                            RAINBOW
                        </strong>

                        <span>
                            Manufacturing ERP
                        </span>

                    </div>

                </div>

                {/* COMPANY */}

                <div className="company-info">

                    <span className="company-label">
                        PLANT
                    </span>

                    <strong>
                        Production Unit
                    </strong>

                </div>

                {/* NAVIGATION */}

                <nav className="erp-navigation">
                    {filteredMenuSections.map(section => (

                            <div
                                className="menu-section"
                                key={section.title}
                            >

                                <div className="menu-section-title">
                                    {section.title}
                                </div>

                                {
                                    section.items.map(item => (

                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            end={
                                                item.path === "/"
                                            }
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={
                                                ({ isActive }) =>
                                                    `menu-link ${
                                                        isActive
                                                            ? "active"
                                                            : ""
                                                    }`
                                            }
                                        >

                                            <span className="menu-indicator"></span>

                                            <span>
                                                {item.name}
                                            </span>

                                        </NavLink>

                                    ))
                                }

                            </div>

                        ))
                    }

                </nav>

                {/* SIDEBAR FOOTER */}

                <div className="sidebar-footer">

                    <div className="system-status">

                        <span className="status-dot"></span>

                        <span>
                            System Online
                        </span>

                    </div>

                    <small>
                        v1.0.0
                    </small>

                </div>

            </aside>

            {/* ================================
                MAIN
            ================================= */}

            <main className="erp-main">

                {/* HEADER */}

                <header className="erp-header">

                    <div className="header-left">

                        {/* SIDEBAR BUTTON */}

                        <button
                            className="sidebar-toggle"
                            onClick={toggleSidebar}
                            type="button"
                            aria-label="Toggle sidebar"
                        >

                            <span></span>
                            <span></span>
                            <span></span>

                        </button>

                        <div className="header-breadcrumbs">
                            <span className="breadcrumb-root">RAINBOW ERP</span>
                            <span className="breadcrumb-sep">/</span>
                            <span className="breadcrumb-current">{pageTitle}</span>
                        </div>

                    </div>

                    {/* HEADER RIGHT */}

                    <div className="header-right">

                        {/* PLANT */}

                        <div className="plant-selector">

                            <span className="selector-label">
                                Plant
                            </span>

                            <strong>
                                Production Unit 01
                            </strong>

                        </div>

                        <div className="header-divider"></div>

                        {/* USER */}

                        <div className="user-profile">

                            <div className="user-avatar">
                                {getUserInitials()}
                            </div>

                            <div className="user-details">

                                <strong>
                                    {user?.name || "User"}
                                </strong>

                                <span>
                                    {user?.role_name || "User"}
                                </span>

                            </div>

                            <button
                                type="button"
                                className="logout-button"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>

                        </div>

                    </div>

                </header>

                {/* CONTENT */}

                <div className="erp-content">

                    <Routes>

                        {/* DASHBOARD */}

                        {/* DASHBOARD */}

                        <Route
                            path="/"
                            element={<RoleRoute path="/" element={<Dashboard />} />}
                        />

                        {/* CUSTOMERS */}

                        <Route
                            path="/customers"
                            element={<RoleRoute path="/customers" element={<Customers />} />}
                        />

                        {/* SUPPLIERS */}

                        <Route
                            path="/suppliers"
                            element={<RoleRoute path="/suppliers" element={<Suppliers />} />}
                        />

                        {/* PRODUCTS */}

                        <Route
                            path="/products"
                            element={<RoleRoute path="/products" element={<Products />} />}
                        />

                        {/* PROCESSES */}

                        <Route
                            path="/processes"
                            element={<RoleRoute path="/processes" element={<Processes />} />}
                        />

                        {/* SALES ORDERS */}

                        <Route
                            path="/sales-orders"
                            element={<RoleRoute path="/sales-orders" element={<SalesOrders />} />}
                        />

                        {/* PRODUCTION PLANNING & ORDERS */}

                        <Route
                            path="/production-planning"
                            element={<RoleRoute path="/production-planning" element={<ProductionPlanning />} />}
                        />

                        <Route
                            path="/production-orders"
                            element={<RoleRoute path="/production-orders" element={<ProductionOrders />} />}
                        />

                        {/* MACHINES */}

                        <Route
                            path="/machines"
                            element={<RoleRoute path="/machines" element={<Machines />} />}
                        />

                        {/* EMPLOYEES */}

                        <Route
                            path="/employees"
                            element={<RoleRoute path="/employees" element={<Employees />} />}
                        />

                        {/* USERS & ROLES */}

                        <Route
                            path="/users"
                            element={<RoleRoute path="/users" element={<Users />} />}
                        />

                        {/* PRODUCTION ENTRY */}

                        <Route
                            path="/production-entry"
                            element={<RoleRoute path="/production-entry" element={<ProductionEntries />} />}
                        />

                        <Route
                            path="/carpet-rolls"
                            element={<RoleRoute path="/carpet-rolls" element={<CarpetRolls />} />}
                        />

                        <Route
                            path="/finished-goods"
                            element={<RoleRoute path="/finished-goods" element={<FinishedGoods />} />}
                        />

                        <Route
                            path="/dispatches"
                            element={<RoleRoute path="/dispatch" element={<Dispatch />} />}
                        />

                        <Route
                            path="/dispatch"
                            element={<RoleRoute path="/dispatch" element={<Dispatch />} />}
                        />

                        <Route
                            path="/roll-scanner"
                            element={<RoleRoute path="/roll-scanner" element={<RollScanner />} />}
                        />

                        <Route
                            path="/quality/roll-inspection"
                            element={<RoleRoute path="/quality/roll-inspection" element={<RollInspection />} />}
                        />

                        <Route
                            path="/quality"
                            element={<RoleRoute path="/quality" element={<RollInspection />} />}
                        />

                        <Route
                            path="/inspections"
                            element={<RoleRoute path="/inspections" element={<RollInspection />} />}
                        />

                        <Route
                            path="/raw-materials"
                            element={<RoleRoute path="/raw-materials" element={<RawMaterials />} />}
                        />

                        <Route
                            path="/raw-material-stock"
                            element={<RoleRoute path="/raw-material-stock" element={<RawMaterials />} />}
                        />

                        <Route
                            path="/chemical-mixing"
                            element={<RoleRoute path="/chemical-mixing" element={<RawMaterials />} />}
                        />

                        <Route
                            path="/material-receipt"
                            element={<RoleRoute path="/material-receipt" element={<MaterialReceipt />} />}
                        />

                        <Route
                            path="/material-receipts"
                            element={<RoleRoute path="/material-receipts" element={<MaterialReceipt />} />}
                        />

                        <Route
                            path="/material-issue"
                            element={<RoleRoute path="/material-issue" element={<RawMaterials />} />}
                        />

                        <Route
                            path="/wip"
                            element={<RoleRoute path="/wip" element={<WIP />} />}
                        />

                        <Route
                            path="/stock-transactions"
                            element={<RoleRoute path="/stock-transactions" element={<StockTransactions />} />}
                        />

                        {/* PRODUCT ROUTING */}

                        <Route
                            path="/product-routing"
                            element={<RoleRoute path="/product-routing" element={<ProductRouting />} />}
                        />

                        {/* PRODUCTION EXECUTION */}

                        <Route
                            path="/production-execution"
                            element={<RoleRoute path="/production-execution" element={<ProductionExecution />} />}
                        />
                        <Route
                            path="/reports/oee"
                            element={<RoleRoute path="/reports/oee" element={<OEEReports />} />}
                        />

                        <Route
                            path="/reports/production"
                            element={<RoleRoute path="/reports/production" element={<Reports />} />}
                        />

                        <Route
                            path="/reports/quality"
                            element={<RoleRoute path="/reports/quality" element={<Reports />} />}
                        />

                        <Route
                            path="/reports/inventory"
                            element={<RoleRoute path="/reports/inventory" element={<Reports />} />}
                        />

                        <Route
                            path="/machine-breakdown"
                            element={<RoleRoute path="/machine-breakdown" element={<Maintenance />} />}
                        />

                        <Route
                            path="/maintenance"
                            element={<RoleRoute path="/maintenance" element={<Maintenance />} />}
                        />

                        {/* FUTURE MODULES */}

                        <Route
                            path="*"
                            element={<ComingSoon />}
                        />

                    </Routes>

                </div>

            </main>

        </div>
    );
}

// ================================
// COMING SOON
// ================================

function ComingSoon() {

    return (

        <div className="coming-soon">

            <div className="coming-soon-content">

                <h2>
                    Module Under Configuration
                </h2>

                <p>
                    This manufacturing module is being prepared
                    for integration with production database.
                </p>

            </div>

        </div>

    );
}

// ================================
// APP
// ================================

function App() {

    return (

        <BrowserRouter>

            <Routes>

                {/* PUBLIC LOGIN */}

                <Route
                    path="/login"
                    element={<Login />}
                />

                {/* PROTECTED ERP */}

                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }
                />

            </Routes>

        </BrowserRouter>
    );
}

export default App;