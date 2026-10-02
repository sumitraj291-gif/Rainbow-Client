import React, { useEffect, useState, useMemo } from "react";
import api from "../api";
import {
    Package,
    Warehouse,
    Truck,
    CheckCircle2,
    Calendar,
    Search,
    Filter,
    Plus,
    RefreshCw,
    X,
    Barcode,
    FileText,
    Ruler,
    Scale,
    Maximize2,
    Printer,
    ChevronDown,
    ChevronRight,
    Tag,
    Clock,
    AlertCircle,
    UserCheck,
    Send
} from "lucide-react";

export default function FinishedGoods() {
    // Data states
    const [activeTab, setActiveTab] = useState("inventory"); // "inventory" | "rolls" | "dispatches"
    const [loading, setLoading] = useState(false);
    const [kpis, setKpis] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [rolls, setRolls] = useState([]);
    const [dispatches, setDispatches] = useState([]);
    const [locations, setLocations] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [orders, setOrders] = useState([]);

    // Filters
    const [search, setSearch] = useState("");
    const [locationFilter, setLocationFilter] = useState("");
    const [expandedProduct, setExpandedProduct] = useState({});

    // Alerts
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // Modals
    const [showStockInModal, setShowStockInModal] = useState(false);
    const [awaitingRolls, setAwaitingRolls] = useState([]);
    const [selectedStockRolls, setSelectedStockRolls] = useState([]);
    const [stockTargetLocation, setStockTargetLocation] = useState("FG-BAY-01");
    const [stockingInProgress, setStockingInProgress] = useState(false);

    // Dispatch Modal
    const [showDispatchModal, setShowDispatchModal] = useState(false);
    const [dispatchingInProgress, setDispatchingInProgress] = useState(false);
    const [dispatchForm, setDispatchForm] = useState({
        customer_id: "",
        sales_order_id: "",
        dispatch_date: new Date().toISOString().slice(0, 10),
        invoice_number: "",
        vehicle_number: "",
        driver_name: "",
        driver_phone: "",
        transporter_name: "",
        remarks: ""
    });
    const [selectedDispatchRolls, setSelectedDispatchRolls] = useState([]);

    // View Challan Modal
    const [viewingChallan, setViewingChallan] = useState(null);
    const [loadingChallan, setLoadingChallan] = useState(false);

    // Load initial data
    useEffect(() => {
        loadAllData();
        loadAuxiliaryData();
    }, []);

    const loadAllData = async () => {
        try {
            setLoading(true);
            setError("");

            const [kpiRes, invRes, rollsRes, dispRes] = await Promise.all([
                api.get("/finished-goods/kpis"),
                api.get("/finished-goods/inventory"),
                api.get("/carpet-rolls?status=IN_WAREHOUSE"),
                api.get("/finished-goods/dispatches")
            ]);

            setKpis(kpiRes.data.data);
            setInventory(invRes.data.data || []);
            setRolls(rollsRes.data.data || []);
            setDispatches(dispRes.data.data || []);
        } catch (err) {
            console.error("LOAD FINISHED GOODS ERROR:", err);
            setError("Failed to load finished goods data.");
        } finally {
            setLoading(false);
        }
    };

    const loadAuxiliaryData = async () => {
        try {
            const [locRes, custRes, ordRes] = await Promise.all([
                api.get("/finished-goods/locations"),
                api.get("/customers"),
                api.get("/production-orders")
            ]);
            setLocations(locRes.data.data || []);
            setCustomers(custRes.data.data || []);
            setOrders(ordRes.data.data || []);
        } catch (err) {
            console.error("LOAD AUX DATA ERROR:", err);
        }
    };

    // Open Stock-In Modal
    const openStockInModal = async () => {
        try {
            setError("");
            const res = await api.get("/carpet-rolls?status=APPROVED,PRODUCED");
            const eligible = (res.data.data || []).filter(
                (r) => r.status === "APPROVED" || r.status === "PRODUCED"
            );
            setAwaitingRolls(eligible);
            setSelectedStockRolls(eligible.map((r) => r.id)); // select all by default
            setStockTargetLocation(locations[0]?.location_code || "FG-BAY-01");
            setShowStockInModal(true);
        } catch (err) {
            console.error("LOAD AWAITING ROLLS ERROR:", err);
            setError("Failed to load rolls awaiting warehouse transfer.");
        }
    };

    // Submit Stock-In
    const handleStockInSubmit = async (e) => {
        e.preventDefault();
        if (selectedStockRolls.length === 0) {
            setError("Please select at least one roll to transfer into Finished Goods.");
            return;
        }

        try {
            setStockingInProgress(true);
            setError("");
            setMessage("");

            const res = await api.post("/finished-goods/stock-in", {
                roll_ids: selectedStockRolls,
                warehouse_id: 3,
                warehouse_location: stockTargetLocation
            });

            setMessage(res.data.message || "Rolls stocked successfully.");
            setShowStockInModal(false);
            loadAllData();
        } catch (err) {
            console.error("STOCK-IN SUBMIT ERROR:", err);
            setError(err.response?.data?.message || "Failed to stock in rolls.");
        } finally {
            setStockingInProgress(false);
        }
    };

    // Open Dispatch Modal
    const openDispatchModal = () => {
        setSelectedDispatchRolls([]);
        setDispatchForm({
            customer_id: customers[0]?.id || "",
            sales_order_id: "",
            dispatch_date: new Date().toISOString().slice(0, 10),
            invoice_number: `INV-${Date.now().toString().slice(-6)}`,
            vehicle_number: "",
            driver_name: "",
            driver_phone: "",
            transporter_name: "",
            remarks: ""
        });
        setShowDispatchModal(true);
    };

    // Submit Dispatch
    const handleDispatchSubmit = async (e) => {
        e.preventDefault();
        if (!dispatchForm.customer_id) {
            setError("Please select a customer for dispatch.");
            return;
        }
        if (selectedDispatchRolls.length === 0) {
            setError("Please select at least one roll to include in the dispatch shipment.");
            return;
        }

        try {
            setDispatchingInProgress(true);
            setError("");
            setMessage("");

            const res = await api.post("/finished-goods/dispatches", {
                ...dispatchForm,
                roll_ids: selectedDispatchRolls
            });

            setMessage(res.data.message || "Dispatch Challan generated successfully.");
            setShowDispatchModal(false);
            loadAllData();

            // Automatically open challan for printing
            if (res.data.dispatch_id) {
                openChallanModal(res.data.dispatch_id);
            }
        } catch (err) {
            console.error("DISPATCH SUBMIT ERROR:", err);
            setError(err.response?.data?.message || "Failed to create dispatch.");
        } finally {
            setDispatchingInProgress(false);
        }
    };

    // Open Challan View
    const openChallanModal = async (dispatchId) => {
        try {
            setLoadingChallan(true);
            const res = await api.get(`/finished-goods/dispatches/${dispatchId}`);
            setViewingChallan(res.data.data);
        } catch (err) {
            console.error("FETCH CHALLAN ERROR:", err);
            setError("Failed to fetch dispatch delivery challan.");
        } finally {
            setLoadingChallan(false);
        }
    };

    // Toggle product accordion
    const toggleProductExpand = (productId) => {
        setExpandedProduct((prev) => ({
            ...prev,
            [productId]: !prev[productId]
        }));
    };

    // Filtered inventory
    const filteredInventory = useMemo(() => {
        return inventory.filter((item) => {
            const matchesSearch =
                !search ||
                item.product_name.toLowerCase().includes(search.toLowerCase()) ||
                item.product_code.toLowerCase().includes(search.toLowerCase()) ||
                (item.colour && item.colour.toLowerCase().includes(search.toLowerCase()));

            const matchesLocation =
                !locationFilter ||
                (item.warehouse_locations &&
                    item.warehouse_locations.toLowerCase().includes(locationFilter.toLowerCase()));

            return matchesSearch && matchesLocation;
        });
    }, [inventory, search, locationFilter]);

    // Available rolls for dispatch selection (status === IN_WAREHOUSE)
    const availableWarehouseRolls = useMemo(() => {
        return rolls.filter((r) => r.status === "IN_WAREHOUSE");
    }, [rolls]);

    return (
        <div className="fg-page">
            {/* =================================================
               HEADER
            ================================================= */}
            <div className="fg-header">
                <div className="fg-header-title">
                    <div className="fg-eyebrow">WAREHOUSE & LOGISTICS • FINISHED GOODS</div>
                    <h1>Finished Goods Stock & Warehouse Dispatch</h1>
                    <p>
                        Real-time stock of serialized PVC carpet rolls, warehouse bay inventory, and customer dispatch delivery challans.
                    </p>
                </div>

                <div className="fg-header-actions">
                    <button
                        type="button"
                        className="fg-btn-secondary"
                        onClick={loadAllData}
                        disabled={loading}
                    >
                        <RefreshCw size={14} className={loading ? "fg-spin" : ""} /> Refresh
                    </button>
                    <a
                        href="/roll-scanner"
                        className="fg-btn-secondary"
                        style={{ textDecoration: "none" }}
                    >
                        <Barcode size={14} /> Roll Scanner
                    </a>
                    <button
                        type="button"
                        className="fg-btn-secondary"
                        onClick={openStockInModal}
                    >
                        <Warehouse size={14} /> Stock-In Rolls
                    </button>
                    <button
                        type="button"
                        className="fg-btn-primary"
                        onClick={openDispatchModal}
                    >
                        <Truck size={15} /> Create Dispatch Challan
                    </button>
                </div>
            </div>

            {/* =================================================
               ALERTS
            ================================================= */}
            {message && (
                <div className="fg-alert fg-alert-success">
                    <CheckCircle2 size={16} className="fg-alert-icon" />
                    <span>{message}</span>
                </div>
            )}
            {error && (
                <div className="fg-alert fg-alert-error">
                    <AlertCircle size={16} className="fg-alert-icon" />
                    <span>{error}</span>
                </div>
            )}

            {/* =================================================
               KPI STATS SUMMARY
            ================================================= */}
            <div className="fg-summary-grid">
                <div className="fg-summary-card indigo">
                    <div className="fg-summary-top">
                        <div className="fg-summary-label">Total Rolls in Warehouse</div>
                        <div className="fg-icon-bubble indigo"><Package size={16} /></div>
                    </div>
                    <div className="fg-summary-value">{kpis?.total_rolls_in_stock || 0}</div>
                    <div className="fg-summary-meta">{kpis?.total_length_m || 0} linear metres</div>
                </div>

                <div className="fg-summary-card purple">
                    <div className="fg-summary-top">
                        <div className="fg-summary-label">Stocked Surface Area</div>
                        <div className="fg-icon-bubble purple"><Maximize2 size={16} /></div>
                    </div>
                    <div className="fg-summary-value">
                        {parseFloat(kpis?.total_area_sqm || 0).toLocaleString()} <span className="fg-unit">m²</span>
                    </div>
                    <div className="fg-summary-meta">
                        {parseFloat(kpis?.total_area_sqft || 0).toLocaleString()} sq.ft coverage
                    </div>
                </div>

                <div className="fg-summary-card teal">
                    <div className="fg-summary-top">
                        <div className="fg-summary-label">Total Net Weight</div>
                        <div className="fg-icon-bubble teal"><Scale size={16} /></div>
                    </div>
                    <div className="fg-summary-value">
                        {parseFloat(kpis?.total_weight_kg || 0).toLocaleString()} <span className="fg-unit">kg</span>
                    </div>
                    <div className="fg-summary-meta">
                        {(parseFloat(kpis?.total_weight_kg || 0) / 1000).toFixed(2)} metric tons
                    </div>
                </div>

                <div className="fg-summary-card emerald">
                    <div className="fg-summary-top">
                        <div className="fg-summary-label">Ready for Dispatch</div>
                        <div className="fg-icon-bubble emerald"><CheckCircle2 size={16} /></div>
                    </div>
                    <div className="fg-summary-value highlight-green">
                        {kpis?.ready_for_dispatch || 0}
                    </div>
                    <div className="fg-summary-meta">Prime QA verified rolls</div>
                </div>

                <div className="fg-summary-card amber">
                    <div className="fg-summary-top">
                        <div className="fg-summary-label">Dispatched Shipments</div>
                        <div className="fg-icon-bubble amber"><Truck size={16} /></div>
                    </div>
                    <div className="fg-summary-value">{kpis?.total_challans || 0}</div>
                    <div className="fg-summary-meta">
                        {kpis?.total_dispatched_rolls || 0} rolls shipped ({kpis?.dispatched_today_rolls || 0} today)
                    </div>
                </div>
            </div>

            {/* =================================================
               TAB NAVIGATION
            ================================================= */}
            <div className="fg-tabs-bar">
                <button
                    type="button"
                    className={`fg-tab-btn ${activeTab === "inventory" ? "active" : ""}`}
                    onClick={() => setActiveTab("inventory")}
                >
                    <Package size={14} /> Stock By Product ({inventory.length})
                </button>
                <button
                    type="button"
                    className={`fg-tab-btn ${activeTab === "rolls" ? "active" : ""}`}
                    onClick={() => setActiveTab("rolls")}
                >
                    <Barcode size={14} /> Serialized Roll Register ({rolls.length})
                </button>
                <button
                    type="button"
                    className={`fg-tab-btn ${activeTab === "dispatches" ? "active" : ""}`}
                    onClick={() => setActiveTab("dispatches")}
                >
                    <Truck size={14} /> Dispatch Challans ({dispatches.length})
                </button>
            </div>

            {/* =================================================
               TAB 1: FINISHED GOODS INVENTORY (BY PRODUCT)
            ================================================= */}
            {activeTab === "inventory" && (
                <div className="fg-tab-content">
                    {/* Search toolbar */}
                    <div className="fg-filter-card">
                        <div className="fg-filter-grid">
                            <div className="fg-filter-field fg-search-field">
                                <label>Search Product / Spec</label>
                                <div className="fg-input-icon-wrap">
                                    <Search size={14} className="fg-input-icon" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by product name, code, colour..."
                                    />
                                </div>
                            </div>

                            <div className="fg-filter-field">
                                <label>Warehouse Bay Location</label>
                                <select
                                    value={locationFilter}
                                    onChange={(e) => setLocationFilter(e.target.value)}
                                >
                                    <option value="">All Warehouse Bays</option>
                                    {locations.map((loc) => (
                                        <option key={loc.id} value={loc.location_code}>
                                            {loc.location_code} ({loc.location_name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {(search || locationFilter) && (
                                <button
                                    type="button"
                                    className="fg-btn-clear"
                                    onClick={() => {
                                        setSearch("");
                                        setLocationFilter("");
                                    }}
                                >
                                    <X size={13} /> Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {filteredInventory.length === 0 ? (
                        <div className="fg-empty-state">
                            <Package size={44} strokeWidth={1.3} color="#94a3b8" />
                            <h3>No Finished Goods In Warehouse</h3>
                            <p>
                                There are currently no PVC carpet rolls stocked in the Finished Goods Warehouse.
                                {kpis?.awaiting_stock_rolls > 0 && (
                                    <span> You have {kpis.awaiting_stock_rolls} produced roll(s) ready to be transferred.</span>
                                )}
                            </p>
                            <button
                                type="button"
                                className="fg-btn-primary"
                                onClick={openStockInModal}
                            >
                                <Warehouse size={14} /> Stock In Rolls
                            </button>
                        </div>
                    ) : (
                        <div className="fg-product-grid">
                            {filteredInventory.map((item) => {
                                const isExpanded = !!expandedProduct[item.product_id];
                                return (
                                    <div key={item.product_id} className="fg-product-card">
                                        <div className="fg-product-card-header">
                                            <div className="fg-product-main">
                                                <div className="fg-product-code">{item.product_code}</div>
                                                <h3>{item.product_name}</h3>
                                                <div className="fg-product-tags">
                                                    {item.colour && <span className="fg-tag">{item.colour}</span>}
                                                    {item.carpet_type && <span className="fg-tag">{item.carpet_type}</span>}
                                                    {item.design_pattern && <span className="fg-tag">{item.design_pattern}</span>}
                                                </div>
                                            </div>

                                            <div className="fg-product-metrics">
                                                <div className="fg-metric-box">
                                                    <div className="fg-metric-val">{item.total_rolls}</div>
                                                    <div className="fg-metric-lbl">Rolls in Stock</div>
                                                </div>
                                                <div className="fg-metric-box">
                                                    <div className="fg-metric-val">{item.total_area_sqm} m²</div>
                                                    <div className="fg-metric-lbl">{(parseFloat(item.total_area_sqm) * 10.764).toFixed(1)} sq.ft</div>
                                                </div>
                                                <div className="fg-metric-box">
                                                    <div className="fg-metric-val">{item.total_weight_kg} kg</div>
                                                    <div className="fg-metric-lbl">Net Weight</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="fg-product-card-footer">
                                            <div className="fg-loc-chips">
                                                <Warehouse size={13} />
                                                <span>Stored in: <strong>{item.warehouse_locations || "FG-BAY-01"}</strong></span>
                                            </div>

                                            <button
                                                type="button"
                                                className="fg-btn-expand"
                                                onClick={() => toggleProductExpand(item.product_id)}
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <span>Hide Roll Serials</span> <ChevronDown size={14} />
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>View {item.rolls?.length || 0} Serialized Rolls</span> <ChevronRight size={14} />
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* EXPANDABLE ACCORDION OF SERIALIZED ROLLS */}
                                        {isExpanded && (
                                            <div className="fg-rolls-drawer">
                                                <table className="fg-subtable">
                                                    <thead>
                                                        <tr>
                                                            <th>Roll Number</th>
                                                            <th>Dimensions</th>
                                                            <th>Area</th>
                                                            <th>Net Weight</th>
                                                            <th>Grade</th>
                                                            <th>Location</th>
                                                            <th>Stocked Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(item.rolls || []).map((roll) => (
                                                            <tr key={roll.id}>
                                                                <td>
                                                                    <div className="fg-roll-pill">
                                                                        <Barcode size={12} />
                                                                        <span>{roll.roll_number}</span>
                                                                    </div>
                                                                </td>
                                                                <td>{roll.width_m}m × {roll.length_m}m</td>
                                                                <td><strong>{roll.area_sqm} m²</strong></td>
                                                                <td>{roll.net_weight_kg ? `${roll.net_weight_kg} kg` : "—"}</td>
                                                                <td>
                                                                    <span className={`fg-grade-pill ${roll.grade?.toLowerCase()}`}>
                                                                        {roll.grade === "GRADE_A" ? "Grade A Prime" : roll.grade}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span className="fg-loc-badge">
                                                                        <Warehouse size={11} /> {roll.warehouse_location || "FG-BAY-01"}
                                                                    </span>
                                                                </td>
                                                                <td>{roll.stocked_at ? new Date(roll.stocked_at).toLocaleDateString() : "Just now"}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* =================================================
               TAB 2: SERIALIZED ROLL REGISTER
            ================================================= */}
            {activeTab === "rolls" && (
                <div className="fg-tab-content">
                    <div className="fg-table-card">
                        <div className="fg-table-header">
                            <div>
                                <h2>Warehouse Serialized Roll Registry</h2>
                                <p>All individual rolls currently verified and stored in finished goods</p>
                            </div>
                            <div className="fg-count-badge">{rolls.length} Rolls In Warehouse</div>
                        </div>

                        <div className="fg-table-wrapper">
                            {rolls.length === 0 ? (
                                <div className="fg-empty-state">
                                    <Package size={38} color="#94a3b8" />
                                    <p>No rolls currently in warehouse.</p>
                                </div>
                            ) : (
                                <table className="fg-table">
                                    <thead>
                                        <tr>
                                            <th>Roll Identifier</th>
                                            <th>Product / Order</th>
                                            <th>Dimensions (W × L)</th>
                                            <th>Surface Area</th>
                                            <th>Net Weight</th>
                                            <th>Quality Grade</th>
                                            <th>Warehouse Bay</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rolls.map((roll) => (
                                            <tr key={roll.id}>
                                                <td>
                                                    <div className="fg-roll-pill">
                                                        <Barcode size={13} />
                                                        <span>{roll.roll_number}</span>
                                                    </div>
                                                    <div className="fg-subtext">
                                                        <Calendar size={11} /> {new Date(roll.created_at).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="fg-prod-title">{roll.product_name}</div>
                                                    <div className="fg-subtext">PO: {roll.production_order_number}</div>
                                                </td>
                                                <td>
                                                    <div className="fg-dim-text">{roll.width_m} m × {roll.length_m} m</div>
                                                    <div className="fg-subtext">{roll.thickness_mm ? `${roll.thickness_mm} mm` : "—"}</div>
                                                </td>
                                                <td>
                                                    <div className="fg-area-text">{roll.area_sqm} m²</div>
                                                    <div className="fg-subtext">{(parseFloat(roll.area_sqm || 0) * 10.764).toFixed(1)} sq.ft</div>
                                                </td>
                                                <td>
                                                    <div className="fg-weight-text">{roll.net_weight_kg ? `${roll.net_weight_kg} kg` : "—"}</div>
                                                </td>
                                                <td>
                                                    <span className={`fg-grade-pill ${roll.grade?.toLowerCase()}`}>
                                                        {roll.grade === "GRADE_A" ? "Grade A Prime" : roll.grade}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="fg-loc-badge">
                                                        <Warehouse size={11} /> {roll.warehouse_location || "FG-BAY-01"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="fg-status-pill stocked">In Warehouse</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
               TAB 3: DISPATCH CHALLANS
            ================================================= */}
            {activeTab === "dispatches" && (
                <div className="fg-tab-content">
                    <div className="fg-table-card">
                        <div className="fg-table-header">
                            <div>
                                <h2>Customer Dispatch Delivery Challans</h2>
                                <p>Outward shipment records, transporter details, and printable gate passes</p>
                            </div>
                            <button
                                type="button"
                                className="fg-btn-primary"
                                onClick={openDispatchModal}
                            >
                                <Truck size={14} /> New Dispatch
                            </button>
                        </div>

                        <div className="fg-table-wrapper">
                            {dispatches.length === 0 ? (
                                <div className="fg-empty-state">
                                    <Truck size={42} color="#94a3b8" />
                                    <h3>No Dispatches Yet</h3>
                                    <p>No customer delivery challans have been created yet.</p>
                                    <button
                                        type="button"
                                        className="fg-btn-primary"
                                        onClick={openDispatchModal}
                                    >
                                        <Truck size={14} /> Create First Dispatch
                                    </button>
                                </div>
                            ) : (
                                <table className="fg-table">
                                    <thead>
                                        <tr>
                                            <th>Challan #</th>
                                            <th>Customer Name</th>
                                            <th>Dispatch Date</th>
                                            <th>Vehicle & Driver</th>
                                            <th>Invoice / Order</th>
                                            <th>Total Rolls</th>
                                            <th>Total Area & Weight</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: "right" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dispatches.map((disp) => (
                                            <tr key={disp.id}>
                                                <td>
                                                    <div className="fg-challan-badge">
                                                        <FileText size={13} />
                                                        <span>{disp.dispatch_number}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="fg-prod-title">{disp.customer_name}</div>
                                                    <div className="fg-subtext">{disp.customer_city || "Delivery Address"}</div>
                                                </td>
                                                <td>
                                                    <div>{new Date(disp.dispatch_date).toLocaleDateString()}</div>
                                                    <div className="fg-subtext"><Clock size={11} /> Logged</div>
                                                </td>
                                                <td>
                                                    <div><strong>{disp.vehicle_number || "Direct Carrier"}</strong></div>
                                                    <div className="fg-subtext">
                                                        {disp.driver_name ? `${disp.driver_name} (${disp.driver_phone || "—"})` : (disp.transporter_name || "Self")}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div>{disp.invoice_number ? `Inv: ${disp.invoice_number}` : "—"}</div>
                                                    {disp.sales_order_number && (
                                                        <div className="fg-subtext">SO: {disp.sales_order_number}</div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="fg-area-text">{disp.total_rolls} Rolls</div>
                                                    <div className="fg-subtext">{disp.total_length_m} m length</div>
                                                </td>
                                                <td>
                                                    <div className="fg-area-text">{disp.total_area_sqm} m²</div>
                                                    <div className="fg-subtext">{disp.total_weight_kg} kg net</div>
                                                </td>
                                                <td>
                                                    <span className="fg-status-pill dispatched">{disp.status || "DISPATCHED"}</span>
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    <button
                                                        type="button"
                                                        className="fg-btn-action print"
                                                        onClick={() => openChallanModal(disp.id)}
                                                        title="View & Print Delivery Challan / Gate Pass"
                                                    >
                                                        <Printer size={13} /> Print Challan
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
               MODAL: STOCK-IN ROLLS INTO FINISHED GOODS
            ================================================= */}
            {showStockInModal && (
                <div className="fg-modal-backdrop" onClick={(e) => e.target.classList.contains("fg-modal-backdrop") && setShowStockInModal(false)}>
                    <div className="fg-modal-card">
                        <div className="fg-modal-header">
                            <div>
                                <div className="fg-eyebrow">WAREHOUSE INWARD TRANSFER</div>
                                <h2>Stock Rolls into Finished Goods</h2>
                            </div>
                            <button
                                type="button"
                                className="fg-btn-close"
                                onClick={() => setShowStockInModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleStockInSubmit}>
                            <div className="fg-modal-body">
                                <div className="fg-form-group">
                                    <label>Target Warehouse Storage Bay</label>
                                    <select
                                        value={stockTargetLocation}
                                        onChange={(e) => setStockTargetLocation(e.target.value)}
                                        required
                                    >
                                        {locations.map((loc) => (
                                            <option key={loc.id} value={loc.location_code}>
                                                {loc.location_code} — {loc.location_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="fg-form-group">
                                    <div className="fg-select-header">
                                        <label>Select Rolls to Stock ({selectedStockRolls.length} / {awaitingRolls.length})</label>
                                        <button
                                            type="button"
                                            className="fg-btn-link"
                                            onClick={() => {
                                                if (selectedStockRolls.length === awaitingRolls.length) {
                                                    setSelectedStockRolls([]);
                                                } else {
                                                    setSelectedStockRolls(awaitingRolls.map((r) => r.id));
                                                }
                                            }}
                                        >
                                            {selectedStockRolls.length === awaitingRolls.length ? "Deselect All" : "Select All"}
                                        </button>
                                    </div>

                                    {awaitingRolls.length === 0 ? (
                                        <div className="fg-mini-empty">
                                            <CheckCircle2 size={24} color="#10b981" />
                                            <p>All produced rolls are already transferred into Finished Goods warehouse!</p>
                                        </div>
                                    ) : (
                                        <div className="fg-checkbox-list">
                                            {awaitingRolls.map((roll) => {
                                                const checked = selectedStockRolls.includes(roll.id);
                                                return (
                                                    <label key={roll.id} className={`fg-checkbox-item ${checked ? "selected" : ""}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedStockRolls((prev) => [...prev, roll.id]);
                                                                } else {
                                                                    setSelectedStockRolls((prev) => prev.filter((id) => id !== roll.id));
                                                                }
                                                            }}
                                                        />
                                                        <div className="fg-check-info">
                                                            <strong>{roll.roll_number}</strong>
                                                            <span>{roll.product_name} • {roll.area_sqm} m² • {roll.net_weight_kg || 0} kg</span>
                                                        </div>
                                                        <span className={`fg-grade-pill ${roll.grade?.toLowerCase()}`}>
                                                            {roll.grade === "GRADE_A" ? "Prime" : roll.grade}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="fg-modal-footer">
                                <button
                                    type="button"
                                    className="fg-btn-secondary"
                                    onClick={() => setShowStockInModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="fg-btn-primary"
                                    disabled={stockingInProgress || selectedStockRolls.length === 0}
                                >
                                    {stockingInProgress ? "Transferring..." : `Transfer ${selectedStockRolls.length} Rolls to Warehouse`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =================================================
               MODAL: CREATE DISPATCH SHIPMENT
            ================================================= */}
            {showDispatchModal && (
                <div className="fg-modal-backdrop" onClick={(e) => e.target.classList.contains("fg-modal-backdrop") && setShowDispatchModal(false)}>
                    <div className="fg-modal-card wide">
                        <div className="fg-modal-header">
                            <div>
                                <div className="fg-eyebrow">OUTWARD LOGISTICS</div>
                                <h2>Generate Customer Delivery Challan</h2>
                            </div>
                            <button
                                type="button"
                                className="fg-btn-close"
                                onClick={() => setShowDispatchModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleDispatchSubmit}>
                            <div className="fg-modal-body">
                                <div className="fg-form-grid-2">
                                    <div className="fg-form-group">
                                        <label>Consignee / Customer *</label>
                                        <select
                                            value={dispatchForm.customer_id}
                                            onChange={(e) => setDispatchForm({ ...dispatchForm, customer_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Customer</option>
                                            {customers.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.company_name} ({c.customer_code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="fg-form-group">
                                        <label>Dispatch Date</label>
                                        <input
                                            type="date"
                                            value={dispatchForm.dispatch_date}
                                            onChange={(e) => setDispatchForm({ ...dispatchForm, dispatch_date: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="fg-form-group">
                                        <label>Invoice Number (Optional)</label>
                                        <input
                                            type="text"
                                            value={dispatchForm.invoice_number}
                                            onChange={(e) => setDispatchForm({ ...dispatchForm, invoice_number: e.target.value })}
                                            placeholder="e.g. INV-2026-089"
                                        />
                                    </div>

                                    <div className="fg-form-group">
                                        <label>Vehicle / Truck Number</label>
                                        <input
                                            type="text"
                                            value={dispatchForm.vehicle_number}
                                            onChange={(e) => setDispatchForm({ ...dispatchForm, vehicle_number: e.target.value })}
                                            placeholder="e.g. MH-04-AB-1234"
                                        />
                                    </div>

                                    <div className="fg-form-group">
                                        <label>Driver Name</label>
                                        <input
                                            type="text"
                                            value={dispatchForm.driver_name}
                                            onChange={(e) => setDispatchForm({ ...dispatchForm, driver_name: e.target.value })}
                                            placeholder="Driver full name"
                                        />
                                    </div>

                                    <div className="fg-form-group">
                                        <label>Driver Phone Number</label>
                                        <input
                                            type="text"
                                            value={dispatchForm.driver_phone}
                                            onChange={(e) => setDispatchForm({ ...dispatchForm, driver_phone: e.target.value })}
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                </div>

                                <div className="fg-form-group">
                                    <label>Transporter / Logistics Partner</label>
                                    <input
                                        type="text"
                                        value={dispatchForm.transporter_name}
                                        onChange={(e) => setDispatchForm({ ...dispatchForm, transporter_name: e.target.value })}
                                        placeholder="e.g. V-Trans Logistics, Safexpress"
                                    />
                                </div>

                                <div className="fg-form-group">
                                    <div className="fg-select-header">
                                        <label>Select Rolls to Dispatch ({selectedDispatchRolls.length} Selected)</label>
                                        <span className="fg-subtext">
                                            Only verified rolls currently in Finished Goods Warehouse are available
                                        </span>
                                    </div>

                                    {availableWarehouseRolls.length === 0 ? (
                                        <div className="fg-mini-empty">
                                            <AlertCircle size={22} color="#f59e0b" />
                                            <p>No rolls currently available in Finished Goods warehouse. Stock in rolls first.</p>
                                        </div>
                                    ) : (
                                        <div className="fg-checkbox-list scrollable">
                                            {availableWarehouseRolls.map((roll) => {
                                                const checked = selectedDispatchRolls.includes(roll.id);
                                                return (
                                                    <label key={roll.id} className={`fg-checkbox-item ${checked ? "selected" : ""}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedDispatchRolls((prev) => [...prev, roll.id]);
                                                                } else {
                                                                    setSelectedDispatchRolls((prev) => prev.filter((id) => id !== roll.id));
                                                                }
                                                            }}
                                                        />
                                                        <div className="fg-check-info">
                                                            <strong>{roll.roll_number}</strong>
                                                            <span>{roll.product_name} • {roll.area_sqm} m² • {roll.net_weight_kg || 0} kg • {roll.warehouse_location || "FG"}</span>
                                                        </div>
                                                        <span className="fg-grade-pill grade_a">
                                                            {roll.grade || "Prime"}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="fg-modal-footer">
                                <button
                                    type="button"
                                    className="fg-btn-secondary"
                                    onClick={() => setShowDispatchModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="fg-btn-primary"
                                    disabled={dispatchingInProgress || selectedDispatchRolls.length === 0}
                                >
                                    {dispatchingInProgress ? "Processing Dispatch..." : `Issue Challan for ${selectedDispatchRolls.length} Rolls`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =================================================
               MODAL: PRINTABLE DELIVERY CHALLAN / GATE PASS
            ================================================= */}
            {viewingChallan && (
                <div className="fg-modal-backdrop" onClick={(e) => e.target.classList.contains("fg-modal-backdrop") && setViewingChallan(null)}>
                    <div className="fg-modal-card challan-doc">
                        <div className="fg-modal-header no-print">
                            <div>
                                <div className="fg-eyebrow">OFFICIAL DISPATCH DOCUMENT</div>
                                <h2>Delivery Challan: {viewingChallan.dispatch_number}</h2>
                            </div>
                            <div className="fg-header-buttons">
                                <button
                                    type="button"
                                    className="fg-btn-primary"
                                    onClick={() => window.print()}
                                >
                                    <Printer size={14} /> Print Gate Pass / Challan
                                </button>
                                <button
                                    type="button"
                                    className="fg-btn-close"
                                    onClick={() => setViewingChallan(null)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* PRINTABLE SHEET */}
                        <div className="fg-challan-sheet" id="printable-challan">
                            <div className="fg-sheet-header">
                                <div>
                                    <h1>RAINBOW POLYMERS & PACKAGING</h1>
                                    <p>Plot 42, Industrial Manufacturing Zone, Phase II</p>
                                    <p>GSTIN: 27AABCR1234F1Z9 • State Code: 27</p>
                                </div>
                                <div className="fg-sheet-title-box">
                                    <div className="fg-doc-title">DELIVERY CHALLAN</div>
                                    <div className="fg-doc-subtitle">FINISHED GOODS DISPATCH</div>
                                </div>
                            </div>

                            <div className="fg-sheet-meta-grid">
                                <div className="fg-sheet-meta-box">
                                    <h4>CONSIGNEE / BILLED TO:</h4>
                                    <strong>{viewingChallan.customer_name}</strong>
                                    <div>{viewingChallan.shipping_address || viewingChallan.billing_address || "Factory Delivery"}</div>
                                    <div>{viewingChallan.city}, {viewingChallan.state} - {viewingChallan.pincode}</div>
                                    <div>Contact: {viewingChallan.contact_person} ({viewingChallan.customer_phone})</div>
                                    <div>GSTIN: {viewingChallan.customer_gst || "Unregistered"}</div>
                                </div>

                                <div className="fg-sheet-meta-box">
                                    <h4>CHALLAN PARTICULARS:</h4>
                                    <div><strong>Challan No:</strong> {viewingChallan.dispatch_number}</div>
                                    <div><strong>Date:</strong> {new Date(viewingChallan.dispatch_date).toLocaleDateString()}</div>
                                    <div><strong>Invoice No:</strong> {viewingChallan.invoice_number || "To Follow"}</div>
                                    <div><strong>Vehicle No:</strong> {viewingChallan.vehicle_number || "Direct Pickup"}</div>
                                    <div><strong>Transporter:</strong> {viewingChallan.transporter_name || "Self"}</div>
                                    <div><strong>Driver:</strong> {viewingChallan.driver_name} ({viewingChallan.driver_phone || "—"})</div>
                                </div>
                            </div>

                            <table className="fg-sheet-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Roll Serial Number</th>
                                        <th>Description of Goods</th>
                                        <th>Dimensions</th>
                                        <th>Area (m²)</th>
                                        <th>Net Wt (kg)</th>
                                        <th>Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(viewingChallan.items || []).map((item, idx) => (
                                        <tr key={item.id || idx}>
                                            <td>{idx + 1}</td>
                                            <td>
                                                <strong>{item.roll_number}</strong>
                                            </td>
                                            <td>
                                                <div>{item.product_name}</div>
                                                <small style={{ color: "#64748b" }}>
                                                    {item.colour && `${item.colour} • `}{item.carpet_type}
                                                </small>
                                            </td>
                                            <td>{item.length_m} m length</td>
                                            <td><strong>{item.area_sqm} m²</strong></td>
                                            <td>{item.weight_kg} kg</td>
                                            <td>{item.grade || "Prime"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th colSpan="4" style={{ textAlign: "right" }}>Total Summary:</th>
                                        <th>
                                            {viewingChallan.items?.reduce((acc, cur) => acc + parseFloat(cur.area_sqm || 0), 0).toFixed(2)} m²
                                        </th>
                                        <th>
                                            {viewingChallan.items?.reduce((acc, cur) => acc + parseFloat(cur.weight_kg || 0), 0).toFixed(2)} kg
                                        </th>
                                        <th>{viewingChallan.items?.length || 0} Rolls</th>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="fg-sheet-signatures">
                                <div className="fg-sig-box">
                                    <div className="fg-sig-line"></div>
                                    <div>Prepared By (Store Incharge)</div>
                                </div>
                                <div className="fg-sig-box">
                                    <div className="fg-sig-line"></div>
                                    <div>Quality Inspector Signature</div>
                                </div>
                                <div className="fg-sig-box">
                                    <div className="fg-sig-line"></div>
                                    <div>Driver / Carrier Signature</div>
                                </div>
                                <div className="fg-sig-box">
                                    <div className="fg-sig-line"></div>
                                    <div>Receiver Signature & Stamp</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
               STYLES
            ================================================= */}
            <style>{`
                .fg-page {
                    padding: 24px 32px;
                    max-width: 1680px;
                    margin: 0 auto;
                }

                .fg-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                }

                .fg-eyebrow {
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    color: #4f46e5;
                    margin-bottom: 4px;
                }

                .fg-header-title h1 {
                    margin: 0 0 6px 0;
                    font-size: 26px;
                    font-weight: 800;
                    color: #0f172a;
                    letter-spacing: -0.02em;
                }

                .fg-header-title p {
                    margin: 0;
                    font-size: 13px;
                    color: #64748b;
                }

                .fg-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .fg-btn-primary {
                    background: #4f46e5;
                    color: #ffffff;
                    border: none;
                    border-radius: 8px;
                    padding: 9px 16px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: background 0.15s ease;
                }

                .fg-btn-primary:hover {
                    background: #4338ca;
                }

                .fg-btn-secondary {
                    background: #ffffff;
                    color: #334155;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    padding: 9px 15px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s ease;
                }

                .fg-btn-secondary:hover {
                    background: #f8fafc;
                    border-color: #94a3b8;
                }

                .fg-spin {
                    animation: fgSpin 1s linear infinite;
                }

                @keyframes fgSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                /* Alerts */
                .fg-alert {
                    padding: 12px 16px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 13px;
                    font-weight: 500;
                }

                .fg-alert-success {
                    background: #ecfdf5;
                    color: #065f46;
                    border: 1px solid #a7f3d0;
                }

                .fg-alert-error {
                    background: #fef2f2;
                    color: #991b1b;
                    border: 1px solid #fecaca;
                }

                /* KPI Grid */
                .fg-summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .fg-summary-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 18px 20px;
                    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.03);
                    border-top: 3px solid transparent;
                }

                .fg-summary-card.indigo { border-top-color: #4f46e5; }
                .fg-summary-card.purple { border-top-color: #8b5cf6; }
                .fg-summary-card.teal { border-top-color: #0d9488; }
                .fg-summary-card.emerald { border-top-color: #10b981; }
                .fg-summary-card.amber { border-top-color: #f59e0b; }

                .fg-summary-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }

                .fg-summary-label {
                    font-size: 11px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .fg-icon-bubble {
                    width: 30px;
                    height: 30px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .fg-icon-bubble.indigo { background: #eef2ff; color: #4f46e5; }
                .fg-icon-bubble.purple { background: #f5f3ff; color: #8b5cf6; }
                .fg-icon-bubble.teal { background: #f0fdfa; color: #0d9488; }
                .fg-icon-bubble.emerald { background: #ecfdf5; color: #10b981; }
                .fg-icon-bubble.amber { background: #fffbeb; color: #d97706; }

                .fg-summary-value {
                    font-size: 26px;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.1;
                    margin-bottom: 6px;
                    letter-spacing: -0.02em;
                }

                .fg-summary-value .fg-unit {
                    font-size: 14px;
                    font-weight: 600;
                    color: #64748b;
                }

                .fg-summary-value.highlight-green {
                    color: #059669;
                }

                .fg-summary-meta {
                    font-size: 11px;
                    color: #94a3b8;
                    font-weight: 500;
                }

                /* Tabs Bar */
                .fg-tabs-bar {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 8px;
                }

                .fg-tab-btn {
                    padding: 9px 18px;
                    border-radius: 8px;
                    border: 1px solid transparent;
                    background: transparent;
                    font-size: 13px;
                    font-weight: 600;
                    color: #64748b;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    transition: all 0.15s ease;
                }

                .fg-tab-btn:hover {
                    color: #0f172a;
                    background: #f1f5f9;
                }

                .fg-tab-btn.active {
                    color: #4f46e5;
                    background: #eef2ff;
                    border-color: #c7d2fe;
                }

                /* Product Cards View */
                .fg-product-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .fg-product-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.03);
                    overflow: hidden;
                    transition: box-shadow 0.15s ease;
                }

                .fg-product-card:hover {
                    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06);
                }

                .fg-product-card-header {
                    padding: 20px 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    flex-wrap: wrap;
                }

                .fg-product-code {
                    font-size: 11px;
                    font-weight: 700;
                    color: #4f46e5;
                    font-family: ui-monospace, monospace;
                    margin-bottom: 2px;
                }

                .fg-product-main h3 {
                    margin: 0 0 6px 0;
                    font-size: 17px;
                    font-weight: 700;
                    color: #0f172a;
                }

                .fg-product-tags {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex-wrap: wrap;
                }

                .fg-tag {
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 11px;
                    padding: 2px 7px;
                    border-radius: 4px;
                    font-weight: 500;
                }

                .fg-product-metrics {
                    display: flex;
                    align-items: center;
                    gap: 24px;
                }

                .fg-metric-box {
                    text-align: right;
                }

                .fg-metric-val {
                    font-size: 18px;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.2;
                }

                .fg-metric-lbl {
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 500;
                }

                .fg-product-card-footer {
                    background: #f8fafc;
                    border-top: 1px solid #e2e8f0;
                    padding: 12px 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .fg-loc-chips {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    color: #475569;
                }

                .fg-btn-expand {
                    background: transparent;
                    border: none;
                    color: #4f46e5;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }

                .fg-btn-expand:hover {
                    text-decoration: underline;
                }

                /* Rolls Drawer */
                .fg-rolls-drawer {
                    padding: 16px 24px;
                    background: #ffffff;
                    border-top: 1px solid #f1f5f9;
                }

                .fg-subtable {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }

                .fg-subtable th {
                    background: #f1f5f9;
                    color: #475569;
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 10px;
                    padding: 8px 12px;
                    text-align: left;
                    border-radius: 4px;
                }

                .fg-subtable td {
                    padding: 10px 12px;
                    border-bottom: 1px solid #f8fafc;
                    color: #1e293b;
                }

                /* Standard Tables */
                .fg-table-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.03);
                    overflow: hidden;
                }

                .fg-table-header {
                    padding: 18px 24px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .fg-table-header h2 {
                    margin: 0 0 4px 0;
                    font-size: 16px;
                    font-weight: 700;
                    color: #0f172a;
                }

                .fg-table-header p {
                    margin: 0;
                    font-size: 12px;
                    color: #64748b;
                }

                .fg-count-badge {
                    background: #eef2ff;
                    color: #4f46e5;
                    font-size: 12px;
                    font-weight: 700;
                    padding: 4px 10px;
                    border-radius: 999px;
                    border: 1px solid #c7d2fe;
                }

                .fg-table-wrapper {
                    overflow-x: auto;
                    width: 100%;
                }

                .fg-table {
                    width: 100%;
                    min-width: 1100px;
                    border-collapse: collapse;
                    text-align: left;
                }

                .fg-table th {
                    background: #f8fafc;
                    padding: 13px 18px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    border-bottom: 1px solid #e2e8f0;
                    white-space: nowrap;
                }

                .fg-table td {
                    padding: 14px 18px;
                    font-size: 13px;
                    color: #1e293b;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }

                .fg-table tr:hover td {
                    background: #fafbfc;
                }

                .fg-roll-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-family: ui-monospace, monospace;
                    font-size: 12px;
                    font-weight: 700;
                    color: #1e40af;
                    background: #eff6ff;
                    padding: 4px 8px;
                    border-radius: 6px;
                    border: 1px solid #bfdbfe;
                    white-space: nowrap;
                }

                .fg-challan-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-family: ui-monospace, monospace;
                    font-size: 12px;
                    font-weight: 700;
                    color: #0f172a;
                    background: #f8fafc;
                    padding: 4px 8px;
                    border-radius: 6px;
                    border: 1px solid #cbd5e1;
                    white-space: nowrap;
                }

                .fg-prod-title {
                    font-weight: 600;
                    color: #0f172a;
                }

                .fg-subtext {
                    font-size: 11px;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-top: 3px;
                    white-space: nowrap;
                }

                .fg-dim-text {
                    font-weight: 600;
                    color: #334155;
                    white-space: nowrap;
                }

                .fg-area-text {
                    font-weight: 700;
                    color: #0f172a;
                    white-space: nowrap;
                }

                .fg-weight-text {
                    font-weight: 700;
                    color: #059669;
                    white-space: nowrap;
                }

                .fg-grade-pill {
                    display: inline-flex;
                    align-items: center;
                    padding: 3px 8px;
                    border-radius: 999px;
                    font-size: 10px;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .fg-grade-pill.grade_a { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
                .fg-grade-pill.grade_b { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }

                .fg-loc-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #334155;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    padding: 3px 7px;
                    border-radius: 6px;
                    white-space: nowrap;
                }

                .fg-status-pill {
                    display: inline-block;
                    padding: 3px 8px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 600;
                    white-space: nowrap;
                }

                .fg-status-pill.stocked { background: #f3e8ff; color: #6b21a8; }
                .fg-status-pill.dispatched { background: #e0f2fe; color: #0369a1; }

                .fg-btn-action {
                    padding: 5px 10px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    border: 1px solid #cbd5e1;
                    background: #ffffff;
                    color: #334155;
                    transition: all 0.15s ease;
                }

                .fg-btn-action:hover {
                    background: #f8fafc;
                    border-color: #94a3b8;
                }

                .fg-btn-action.print {
                    background: #eef2ff;
                    border-color: #c7d2fe;
                    color: #4338ca;
                }

                .fg-btn-action.print:hover {
                    background: #e0e7ff;
                }

                /* Empty States */
                .fg-empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: #64748b;
                }

                .fg-empty-state h3 {
                    margin: 12px 0 6px 0;
                    font-size: 16px;
                    color: #0f172a;
                }

                .fg-empty-state p {
                    margin: 0 0 16px 0;
                    font-size: 13px;
                }

                /* Modals */
                .fg-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999;
                    padding: 20px;
                }

                .fg-modal-card {
                    background: #ffffff;
                    border-radius: 14px;
                    width: 100%;
                    max-width: 580px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                    overflow: hidden;
                }

                .fg-modal-card.wide {
                    max-width: 760px;
                }

                .fg-modal-card.challan-doc {
                    max-width: 860px;
                }

                .fg-modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .fg-modal-header h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 700;
                    color: #0f172a;
                }

                .fg-header-buttons {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .fg-btn-close {
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 6px;
                }

                .fg-btn-close:hover {
                    color: #0f172a;
                    background: #f1f5f9;
                }

                .fg-modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .fg-modal-footer {
                    padding: 16px 24px;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 10px;
                    background: #f8fafc;
                }

                .fg-form-grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                }

                .fg-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .fg-form-group label {
                    font-size: 12px;
                    font-weight: 700;
                    color: #334155;
                }

                .fg-form-group input,
                .fg-form-group select {
                    height: 38px;
                    padding: 0 12px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 13px;
                    color: #0f172a;
                    background: #ffffff;
                    outline: none;
                }

                .fg-form-group input:focus,
                .fg-form-group select:focus {
                    border-color: #4f46e5;
                    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
                }

                .fg-select-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .fg-btn-link {
                    background: transparent;
                    border: none;
                    color: #4f46e5;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .fg-btn-link:hover {
                    text-decoration: underline;
                }

                .fg-checkbox-list {
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    max-height: 220px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                }

                .fg-checkbox-list.scrollable {
                    max-height: 260px;
                }

                .fg-checkbox-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 14px;
                    border-bottom: 1px solid #f1f5f9;
                    cursor: pointer;
                    transition: background 0.1s ease;
                }

                .fg-checkbox-item:hover {
                    background: #f8fafc;
                }

                .fg-checkbox-item.selected {
                    background: #f0fdf4;
                }

                .fg-checkbox-item input[type="checkbox"] {
                    width: 16px;
                    height: 16px;
                    accent-color: #4f46e5;
                }

                .fg-check-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .fg-check-info strong {
                    font-size: 12px;
                    font-family: ui-monospace, monospace;
                    color: #0f172a;
                }

                .fg-check-info span {
                    font-size: 11px;
                    color: #64748b;
                }

                .fg-mini-empty {
                    padding: 24px;
                    text-align: center;
                    background: #f8fafc;
                    border-radius: 8px;
                    color: #64748b;
                    font-size: 12px;
                }

                /* Printable Challan Styles */
                .fg-challan-sheet {
                    padding: 28px 32px;
                    background: #ffffff;
                    color: #0f172a;
                    font-size: 12px;
                    line-height: 1.4;
                    overflow-y: auto;
                }

                .fg-sheet-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    border-bottom: 2px solid #0f172a;
                    padding-bottom: 16px;
                    margin-bottom: 16px;
                }

                .fg-sheet-header h1 {
                    margin: 0 0 4px 0;
                    font-size: 20px;
                    font-weight: 800;
                    letter-spacing: -0.01em;
                }

                .fg-sheet-header p {
                    margin: 0 0 2px 0;
                    color: #475569;
                    font-size: 11px;
                }

                .fg-sheet-title-box {
                    text-align: right;
                }

                .fg-doc-title {
                    font-size: 18px;
                    font-weight: 800;
                    color: #4f46e5;
                    letter-spacing: 0.05em;
                }

                .fg-doc-subtitle {
                    font-size: 10px;
                    font-weight: 700;
                    color: #64748b;
                    letter-spacing: 0.05em;
                }

                .fg-sheet-meta-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    padding: 14px 16px;
                    margin-bottom: 20px;
                }

                .fg-sheet-meta-box h4 {
                    margin: 0 0 6px 0;
                    font-size: 11px;
                    font-weight: 800;
                    color: #4f46e5;
                    letter-spacing: 0.04em;
                }

                .fg-sheet-meta-box strong {
                    font-size: 13px;
                    color: #0f172a;
                }

                .fg-sheet-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 24px;
                }

                .fg-sheet-table th {
                    background: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    padding: 8px 10px;
                    font-size: 11px;
                    text-align: left;
                    font-weight: 700;
                }

                .fg-sheet-table td {
                    border: 1px solid #cbd5e1;
                    padding: 8px 10px;
                    font-size: 12px;
                }

                .fg-sheet-table tfoot th {
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    padding: 8px 10px;
                    font-size: 12px;
                    font-weight: 800;
                }

                .fg-sheet-signatures {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    margin-top: 40px;
                    padding-top: 20px;
                }

                .fg-sig-box {
                    text-align: center;
                    font-size: 10px;
                    color: #475569;
                    font-weight: 600;
                }

                .fg-sig-line {
                    border-bottom: 1px solid #94a3b8;
                    margin-bottom: 8px;
                    height: 35px;
                }

                /* Print Media Query */
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-challan, #printable-challan * {
                        visibility: visible;
                    }
                    #printable-challan {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 0;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
