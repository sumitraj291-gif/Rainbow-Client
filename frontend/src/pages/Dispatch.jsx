import React, { useState, useEffect, useMemo } from "react";
import {
    Truck,
    FileText,
    ShieldCheck,
    CheckCircle2,
    Clock,
    AlertCircle,
    Search,
    Filter,
    Plus,
    Printer,
    X,
    RefreshCw,
    Layers,
    Scale,
    Ruler,
    Calendar,
    User,
    Check,
    ArrowRight,
    MapPin,
    Hash,
    Maximize2,
    Eye,
    PackageCheck,
    ChevronRight,
    Phone
} from "lucide-react";
import "./Dispatch.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Dispatch() {
    // Tabs: "list" or "new"
    const [activeTab, setActiveTab] = useState("list");

    // Data states
    const [challans, setChallans] = useState([]);
    const [stats, setStats] = useState({
        today_dispatches: 0,
        today_rolls: 0,
        today_sqm: "0.00",
        today_weight_kg: "0.00",
        pending_loading: 0,
        completed_dispatches: 0,
        total_dispatched_rolls: 0,
        total_dispatched_sqm: "0.00",
        active_transporters: 0,
        ready_rolls_count: 0,
        ready_sqm: "0.00"
    });
    const [readyRolls, setReadyRolls] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // List Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // New Challan Form State
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [formData, setFormData] = useState({
        customer_name: "",
        consignee_name: "",
        delivery_address: "",
        customer_gst: "",
        sales_order_number: "",
        transporter_name: "VRL Logistics Ltd",
        vehicle_number: "",
        driver_name: "",
        driver_phone: "",
        driver_license: "",
        lr_number: "",
        lr_date: new Date().toISOString().slice(0, 10),
        eway_bill_number: "",
        dispatch_date: new Date().toISOString().slice(0, 10),
        auto_dispatch: true,
        remarks: ""
    });

    // Selected Roll IDs for Loading
    const [selectedRollIds, setSelectedRollIds] = useState([]);

    // Print Modals
    const [selectedChallanForPrint, setSelectedChallanForPrint] = useState(null);
    const [showChallanModal, setShowChallanModal] = useState(false);
    const [showGatePassModal, setShowGatePassModal] = useState(false);

    // =========================================================
    // INITIAL LOAD
    // =========================================================
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [challansRes, statsRes, readyRes, custRes] = await Promise.all([
                fetch(`${API_BASE}/dispatches`),
                fetch(`${API_BASE}/dispatches/stats`),
                fetch(`${API_BASE}/dispatches/ready-rolls`),
                fetch(`${API_BASE}/customers`)
            ]);

            const [cJson, sJson, rJson, cuJson] = await Promise.all([
                challansRes.json(),
                statsRes.json(),
                readyRes.json(),
                custRes.json()
            ]);

            if (cJson.success) setChallans(cJson.data || []);
            if (sJson.success) setStats(sJson.data || {});
            if (rJson.success) setReadyRolls(rJson.data || []);
            if (cuJson.success) setCustomers(cuJson.data || []);
        } catch (err) {
            console.error("Failed to load dispatch data:", err);
            setError("Failed to connect to dispatch server.");
        } finally {
            setLoading(false);
        }
    };

    // Customer Selection Handler
    const handleCustomerChange = (custId) => {
        setSelectedCustomerId(custId);
        const cust = customers.find(c => String(c.id) === String(custId));
        if (cust) {
            setFormData(prev => ({
                ...prev,
                customer_name: cust.company_name || cust.name || "",
                consignee_name: cust.company_name || cust.name || "",
                delivery_address: cust.shipping_address || cust.billing_address || `${cust.city || ""}, ${cust.state || ""}`,
                customer_gst: cust.gst_number || ""
            }));
        }
    };

    // Toggle roll selection
    const toggleRollSelection = (rollId) => {
        setSelectedRollIds(prev => 
            prev.includes(rollId) ? prev.filter(id => id !== rollId) : [...prev, rollId]
        );
    };

    const selectAllReadyRolls = () => {
        setSelectedRollIds(readyRolls.map(r => r.id));
    };

    const clearRollSelection = () => {
        setSelectedRollIds([]);
    };

    // Live Aggregates for Selected Rolls
    const manifestAggregates = useMemo(() => {
        const selected = readyRolls.filter(r => selectedRollIds.includes(r.id));
        let linearMeters = 0;
        let sqm = 0;
        let netWeight = 0;
        let grossWeight = 0;

        for (const r of selected) {
            linearMeters += parseFloat(r.length_m || 0);
            sqm += parseFloat(r.area_sqm || (parseFloat(r.width_m) * parseFloat(r.length_m)) || 0);
            netWeight += parseFloat(r.net_weight_kg || 0);
            grossWeight += parseFloat(r.gross_weight_kg || (parseFloat(r.net_weight_kg) + parseFloat(r.core_weight_kg || 2.5)) || 0);
        }

        return {
            count: selected.length,
            linearMeters: linearMeters.toFixed(2),
            sqm: sqm.toFixed(2),
            netWeight: netWeight.toFixed(2),
            grossWeight: grossWeight.toFixed(2)
        };
    }, [readyRolls, selectedRollIds]);

    // =========================================================
    // CREATE CHALLAN & MANIFEST
    // =========================================================
    const handleCreateChallan = async (e) => {
        e.preventDefault();
        if (selectedRollIds.length === 0) {
            setError("Please select at least one Carpet Roll to load on this dispatch vehicle.");
            return;
        }

        if (!formData.vehicle_number.trim()) {
            setError("Vehicle Registration Number is mandatory.");
            return;
        }

        if (!formData.customer_name.trim()) {
            setError("Customer / Consignee name is required.");
            return;
        }

        setError(null);
        setSubmitting(true);

        const payload = {
            ...formData,
            customer_id: selectedCustomerId || null,
            roll_ids: selectedRollIds
        };

        try {
            const res = await fetch(`${API_BASE}/dispatches`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.success) {
                setSuccessMessage(`Delivery Challan ${json.data.challan_number} and Gate Pass ${json.data.gate_pass_number} created successfully!`);
                setSelectedRollIds([]);
                await loadData();
                // Open Challan print view directly
                openPrintView(json.data.id, "challan");
                setActiveTab("list");
            } else {
                setError(json.message || "Failed to create delivery challan.");
            }
        } catch (err) {
            console.error("Submit error:", err);
            setError("Server error while generating dispatch challan.");
        } finally {
            setSubmitting(false);
        }
    };

    // Confirm Gate Out
    const handleConfirmGateOut = async (challanId) => {
        try {
            const res = await fetch(`${API_BASE}/dispatches/${challanId}/confirm-dispatch`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ security_officer_name: "Security Head R. Rathod" })
            });
            const json = await res.json();
            if (json.success) {
                setSuccessMessage(json.message);
                loadData();
            } else {
                setError(json.message);
            }
        } catch (err) {
            console.error("Gate out confirmation failed:", err);
            setError("Failed to confirm vehicle gate out.");
        }
    };

    // Open Print Modal
    const openPrintView = async (challanId, modalType = "challan") => {
        try {
            const res = await fetch(`${API_BASE}/dispatches/${challanId}`);
            const json = await res.json();
            if (json.success && json.data) {
                setSelectedChallanForPrint(json.data);
                if (modalType === "challan") {
                    setShowChallanModal(true);
                    setShowGatePassModal(false);
                } else {
                    setShowGatePassModal(true);
                    setShowChallanModal(false);
                }
            }
        } catch (err) {
            console.error("Failed to load challan details:", err);
        }
    };

    // Filtered Challans
    const filteredChallans = useMemo(() => {
        return challans.filter(c => {
            const q = searchQuery.toLowerCase();
            const matchesQuery = !q ||
                (c.challan_number && c.challan_number.toLowerCase().includes(q)) ||
                (c.gate_pass_number && c.gate_pass_number.toLowerCase().includes(q)) ||
                (c.vehicle_number && c.vehicle_number.toLowerCase().includes(q)) ||
                (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
                (c.transporter_name && c.transporter_name.toLowerCase().includes(q));

            const matchesStatus = !statusFilter || c.status === statusFilter;
            return matchesQuery && matchesStatus;
        });
    }, [challans, searchQuery, statusFilter]);

    return (
        <div className="dp-page">
            {/* =================================================
               HEADER & NAVIGATION
            ================================================= */}
            <div className="dp-header-card">
                <div className="dp-header-info">
                    <div className="dp-eyebrow">
                        <Truck size={14} className="dp-eyebrow-icon" /> FINISHED GOODS DISPATCH & LOGISTICS
                    </div>
                    <h1>Carpet Roll Delivery Challans & Gate Passes</h1>
                    <p>
                        Vehicle Loading Manifest, Commercial Packing Slip, Rule 55 Delivery Challan & Security Gate Pass Issuance.
                    </p>
                </div>
                <div className="dp-header-actions">
                    <button
                        type="button"
                        className={`dp-tab-btn ${activeTab === "list" ? "active" : ""}`}
                        onClick={() => setActiveTab("list")}
                    >
                        <FileText size={15} /> All Challans & Gate Passes
                    </button>
                    <button
                        type="button"
                        className={`dp-tab-btn primary ${activeTab === "new" ? "active" : ""}`}
                        onClick={() => {
                            setActiveTab("new");
                            loadData();
                        }}
                    >
                        <Plus size={15} /> New Vehicle Loading & Challan
                    </button>
                    <button
                        type="button"
                        className="dp-refresh-btn"
                        onClick={loadData}
                        title="Reload Data"
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* Notification Alerts */}
            {successMessage && (
                <div className="dp-alert dp-alert-success">
                    <CheckCircle2 size={16} />
                    <span>{successMessage}</span>
                    <button type="button" onClick={() => setSuccessMessage(null)}><X size={14} /></button>
                </div>
            )}
            {error && (
                <div className="dp-alert dp-alert-error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                    <button type="button" onClick={() => setError(null)}><X size={14} /></button>
                </div>
            )}

            {/* =================================================
               METRIC SUMMARY CARDS
            ================================================= */}
            <div className="dp-stats-grid">
                <div className="dp-stat-card">
                    <div className="dp-stat-icon-wrap emerald">
                        <Truck size={20} />
                    </div>
                    <div className="dp-stat-content">
                        <span className="dp-stat-label">TODAY'S DISPATCHES</span>
                        <div className="dp-stat-val">{stats.today_dispatches || 0} Loads</div>
                        <span className="dp-stat-sub">{stats.today_rolls || 0} rolls ({stats.today_sqm} m²)</span>
                    </div>
                </div>

                <div className="dp-stat-card">
                    <div className="dp-stat-icon-wrap blue">
                        <Layers size={20} />
                    </div>
                    <div className="dp-stat-content">
                        <span className="dp-stat-label">WAREHOUSE READY STOCK</span>
                        <div className="dp-stat-val">{stats.ready_rolls_count || 0} Rolls</div>
                        <span className="dp-stat-sub">{stats.ready_sqm} m² approved for shipping</span>
                    </div>
                </div>

                <div className="dp-stat-card">
                    <div className="dp-stat-icon-wrap amber">
                        <Clock size={20} />
                    </div>
                    <div className="dp-stat-content">
                        <span className="dp-stat-label">VEHICLES LOADING</span>
                        <div className="dp-stat-val">{stats.pending_loading || 0} In Bay</div>
                        <span className="dp-stat-sub">Challans awaiting Gate-Out</span>
                    </div>
                </div>

                <div className="dp-stat-card">
                    <div className="dp-stat-icon-wrap purple">
                        <ShieldCheck size={20} />
                    </div>
                    <div className="dp-stat-content">
                        <span className="dp-stat-label">TOTAL SHIPPED VOLUME</span>
                        <div className="dp-stat-val">{stats.total_dispatched_rolls || 0} Rolls</div>
                        <span className="dp-stat-sub">{stats.total_dispatched_sqm} m² total dispatched</span>
                    </div>
                </div>
            </div>

            {/* =================================================
               TAB 1: ALL CHALLANS & GATE PASSES DIRECTORY
            ================================================= */}
            {activeTab === "list" && (
                <div className="dp-card">
                    {/* Filters */}
                    <div className="dp-filter-bar">
                        <div className="dp-search-wrap">
                            <Search size={15} />
                            <input
                                type="text"
                                placeholder="Search by Challan #, Gate Pass #, Vehicle #, Customer, Transporter..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="dp-filter-actions">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="PREPARING">Preparing</option>
                                <option value="LOADED">Loaded in Bay</option>
                                <option value="DISPATCHED">Gate Out / Dispatched</option>
                                <option value="DELIVERED">Delivered</option>
                            </select>

                            {(searchQuery || statusFilter) && (
                                <button
                                    type="button"
                                    className="dp-clear-btn"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setStatusFilter("");
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="dp-table-responsive">
                        <table className="dp-table">
                            <thead>
                                <tr>
                                    <th>Challan & Gate Pass</th>
                                    <th>Customer / Consignee</th>
                                    <th>Vehicle & Logistics</th>
                                    <th>Roll Manifest Tally</th>
                                    <th>LR & e-Way Bill</th>
                                    <th>Date & Status</th>
                                    <th style={{ textAlign: "right" }}>Documents & Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && challans.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="dp-td-center">
                                            <RefreshCw className="dp-spin" size={18} /> Loading dispatch records...
                                        </td>
                                    </tr>
                                ) : filteredChallans.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="dp-td-center">
                                            No dispatch challans found. Click <strong>"New Vehicle Loading & Challan"</strong> to create a shipment.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredChallans.map((ch) => (
                                        <tr key={ch.id}>
                                            <td>
                                                <div className="dp-num-pair">
                                                    <strong className="dp-dc-num">{ch.challan_number}</strong>
                                                    <span className="dp-gp-num">{ch.gate_pass_number}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="dp-cust-name">{ch.customer_name}</div>
                                                <div className="dp-sub-text">
                                                    {ch.destination_city ? `${ch.destination_city}, ${ch.destination_state}` : (ch.delivery_address?.slice(0, 30) || "Direct Delivery")}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="dp-veh-badge">{ch.vehicle_number}</div>
                                                <div className="dp-sub-text">{ch.transporter_name || "Self Fleet"}</div>
                                            </td>
                                            <td>
                                                <div className="dp-tally-cell">
                                                    <span><strong>{ch.total_rolls}</strong> Rolls ({ch.total_sqm} m²)</span>
                                                    <span className="dp-sub-text">{ch.total_net_weight_kg} kg net</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div>LR: <strong>{ch.lr_number || "Direct"}</strong></div>
                                                <div className="dp-sub-text">
                                                    {ch.eway_bill_number ? `EWB: ${ch.eway_bill_number}` : "No e-Way Bill"}
                                                </div>
                                            </td>
                                            <td>
                                                <div>{ch.dispatch_date ? new Date(ch.dispatch_date).toLocaleDateString() : "—"}</div>
                                                <span className={`dp-status-badge ${ch.status?.toLowerCase()}`}>
                                                    {ch.status === "DISPATCHED" ? (
                                                        <><CheckCircle2 size={11} /> Dispatched</>
                                                    ) : ch.status === "LOADED" ? (
                                                        <><Clock size={11} /> Loaded</>
                                                    ) : ch.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                <div className="dp-action-btns">
                                                    <button
                                                        type="button"
                                                        className="dp-doc-btn"
                                                        onClick={() => openPrintView(ch.id, "challan")}
                                                        title="Print Delivery Challan (Commercial Packing Slip)"
                                                    >
                                                        <FileText size={13} /> Challan
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="dp-doc-btn gate"
                                                        onClick={() => openPrintView(ch.id, "gate_pass")}
                                                        title="Print Security Gate Pass"
                                                    >
                                                        <ShieldCheck size={13} /> Gate Pass
                                                    </button>
                                                    {ch.status === "LOADED" && (
                                                        <button
                                                            type="button"
                                                            className="dp-gateout-btn"
                                                            onClick={() => handleConfirmGateOut(ch.id)}
                                                            title="Confirm Gate Out & Depart Vehicle"
                                                        >
                                                            Gate Out
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* =================================================
               TAB 2: NEW VEHICLE LOADING & CHALLAN CREATION
            ================================================= */}
            {activeTab === "new" && (
                <div className="dp-new-layout">
                    {/* LEFT COLUMN: VEHICLE & CUSTOMER DETAILS */}
                    <div className="dp-new-form-pane">
                        <form onSubmit={handleCreateChallan} className="dp-create-form">
                            {/* Step 1: Customer & Destination */}
                            <div className="dp-form-section">
                                <div className="dp-section-header">
                                    <User size={16} />
                                    <span>1. Consignee & Delivery Destination</span>
                                </div>

                                <div className="dp-form-grid-2">
                                    <div className="dp-field">
                                        <label>Select Registered Customer</label>
                                        <select
                                            value={selectedCustomerId}
                                            onChange={(e) => handleCustomerChange(e.target.value)}
                                        >
                                            <option value="">-- Choose Customer or Enter Below --</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.customer_code} - {c.company_name || c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="dp-field">
                                        <label>Customer / Consignee Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.customer_name}
                                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                            placeholder="e.g. Deco Floorings Pvt Ltd"
                                        />
                                    </div>
                                </div>

                                <div className="dp-form-grid-2" style={{ marginTop: "12px" }}>
                                    <div className="dp-field">
                                        <label>Delivery / Shipping Address</label>
                                        <input
                                            type="text"
                                            value={formData.delivery_address}
                                            onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                                            placeholder="Consignee warehouse or project site address"
                                        />
                                    </div>

                                    <div className="dp-field">
                                        <label>Customer GSTIN</label>
                                        <input
                                            type="text"
                                            value={formData.customer_gst}
                                            onChange={(e) => setFormData({ ...formData, customer_gst: e.target.value })}
                                            placeholder="24AABBD1234F1Z8"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Transport & Vehicle Logistics */}
                            <div className="dp-form-section">
                                <div className="dp-section-header">
                                    <Truck size={16} />
                                    <span>2. Transporter & Vehicle Logistics</span>
                                </div>

                                <div className="dp-form-grid-3">
                                    <div className="dp-field">
                                        <label>Vehicle Number *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.vehicle_number}
                                            onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                                            placeholder="e.g. GJ-06-AX-4821"
                                            style={{ textTransform: "uppercase", fontWeight: 700 }}
                                        />
                                    </div>

                                    <div className="dp-field">
                                        <label>Transporter Name</label>
                                        <input
                                            type="text"
                                            value={formData.transporter_name}
                                            onChange={(e) => setFormData({ ...formData, transporter_name: e.target.value })}
                                            placeholder="e.g. VRL / TCI / Self"
                                        />
                                    </div>

                                    <div className="dp-field">
                                        <label>LR (Bilty) Number</label>
                                        <input
                                            type="text"
                                            value={formData.lr_number}
                                            onChange={(e) => setFormData({ ...formData, lr_number: e.target.value })}
                                            placeholder="e.g. LR-98442"
                                        />
                                    </div>
                                </div>

                                <div className="dp-form-grid-3" style={{ marginTop: "12px" }}>
                                    <div className="dp-field">
                                        <label>Driver Name</label>
                                        <input
                                            type="text"
                                            value={formData.driver_name}
                                            onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                                            placeholder="Driver full name"
                                        />
                                    </div>

                                    <div className="dp-field">
                                        <label>Driver Contact Phone</label>
                                        <input
                                            type="text"
                                            value={formData.driver_phone}
                                            onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                                            placeholder="+91 98980 12345"
                                        />
                                    </div>

                                    <div className="dp-field">
                                        <label>12-Digit e-Way Bill Number</label>
                                        <input
                                            type="text"
                                            value={formData.eway_bill_number}
                                            onChange={(e) => setFormData({ ...formData, eway_bill_number: e.target.value })}
                                            placeholder="e.g. 5412 8904 1234"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Aggregates Summary Box */}
                            <div className="dp-manifest-tally-box">
                                <div className="dp-tally-header">
                                    <PackageCheck size={16} />
                                    <span>Selected Loading Manifest ({manifestAggregates.count} Rolls Selected)</span>
                                </div>
                                <div className="dp-tally-stats-row">
                                    <div className="dp-tally-item">
                                        <span className="lbl">Total Rolls:</span>
                                        <strong>{manifestAggregates.count}</strong>
                                    </div>
                                    <div className="dp-tally-item">
                                        <span className="lbl">Linear Meters:</span>
                                        <strong>{manifestAggregates.linearMeters} m</strong>
                                    </div>
                                    <div className="dp-tally-item">
                                        <span className="lbl">Total Area:</span>
                                        <strong>{manifestAggregates.sqm} m²</strong>
                                    </div>
                                    <div className="dp-tally-item">
                                        <span className="lbl">Net Weight:</span>
                                        <strong>{manifestAggregates.netWeight} kg</strong>
                                    </div>
                                    <div className="dp-tally-item">
                                        <span className="lbl">Gross Weight:</span>
                                        <strong>{manifestAggregates.grossWeight} kg</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Row */}
                            <div className="dp-submit-bar">
                                <label className="dp-checkbox-opt">
                                    <input
                                        type="checkbox"
                                        checked={formData.auto_dispatch}
                                        onChange={(e) => setFormData({ ...formData, auto_dispatch: e.target.checked })}
                                    />
                                    <span>Confirm Gate Out immediately (Mark as Dispatched)</span>
                                </label>

                                <button
                                    type="submit"
                                    disabled={submitting || selectedRollIds.length === 0}
                                    className="dp-btn-submit"
                                >
                                    <Truck size={16} /> Create Delivery Challan & Gate Pass
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* RIGHT COLUMN: SELECT AVAILABLE ROLLS IN WAREHOUSE */}
                    <div className="dp-rolls-picker-pane">
                        <div className="dp-picker-header">
                            <div>
                                <h3>Warehouse Rolls Ready for Loading</h3>
                                <p>{readyRolls.length} approved rolls in Finished Goods Bay</p>
                            </div>
                            <div className="dp-picker-actions">
                                <button
                                    type="button"
                                    className="dp-small-btn"
                                    onClick={selectAllReadyRolls}
                                >
                                    Select All ({readyRolls.length})
                                </button>
                                {selectedRollIds.length > 0 && (
                                    <button
                                        type="button"
                                        className="dp-small-btn clear"
                                        onClick={clearRollSelection}
                                    >
                                        Clear ({selectedRollIds.length})
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="dp-rolls-scroll-list">
                            {readyRolls.length === 0 ? (
                                <div className="dp-empty-rolls">
                                    <Layers size={36} color="#94a3b8" />
                                    <p>No rolls currently available for loading in warehouse.</p>
                                </div>
                            ) : (
                                readyRolls.map(roll => {
                                    const isSelected = selectedRollIds.includes(roll.id);
                                    return (
                                        <div
                                            key={roll.id}
                                            className={`dp-roll-select-card ${isSelected ? "selected" : ""}`}
                                            onClick={() => toggleRollSelection(roll.id)}
                                        >
                                            <div className="dp-roll-chk">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {}}
                                                />
                                            </div>
                                            <div className="dp-roll-info">
                                                <div className="dp-roll-top-line">
                                                    <strong className="dp-roll-no">{roll.roll_number}</strong>
                                                    <span className="dp-roll-grade">{roll.grade || "Grade A"}</span>
                                                    <span className="dp-roll-bay">{roll.warehouse_location || "FG-BAY"}</span>
                                                </div>
                                                <div className="dp-roll-prod-desc">
                                                    {roll.product_name} ({roll.carpet_type || "PVC Roll"})
                                                </div>
                                                <div className="dp-roll-metrics-line">
                                                    <span>{roll.width_m}m × {roll.length_m}m ({roll.area_sqm} m²)</span>
                                                    <span>•</span>
                                                    <span>{roll.net_weight_kg} kg</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
               MODAL: OFFICIAL DELIVERY CHALLAN (COMMERCIAL)
            ================================================= */}
            {showChallanModal && selectedChallanForPrint && (
                <div className="dp-modal-backdrop" onClick={(e) => e.target.classList.contains("dp-modal-backdrop") && setShowChallanModal(false)}>
                    <div className="dp-doc-card">
                        <div className="dp-modal-bar no-print">
                            <span className="title">Official Delivery Challan Preview</span>
                            <div className="actions">
                                <button
                                    type="button"
                                    className="dp-btn-print"
                                    onClick={() => window.print()}
                                >
                                    <Printer size={15} /> Print Delivery Challan
                                </button>
                                <button
                                    type="button"
                                    className="dp-btn-close"
                                    onClick={() => setShowChallanModal(false)}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* PRINTABLE DELIVERY CHALLAN */}
                        <div className="dp-printable-sheet" id="print-target">
                            <div className="dp-sheet-top-header">
                                <div className="dp-doc-type-badge">
                                    DELIVERY CHALLAN
                                    <small>(Prepared under Rule 55 of CGST Rules, 2017)</small>
                                </div>
                                <div className="dp-dc-meta-block">
                                    <div className="dp-meta-row">
                                        <span>CHALLAN NO:</span>
                                        <strong>{selectedChallanForPrint.challan_number}</strong>
                                    </div>
                                    <div className="dp-meta-row">
                                        <span>DATE:</span>
                                        <strong>{selectedChallanForPrint.dispatch_date ? new Date(selectedChallanForPrint.dispatch_date).toLocaleDateString() : new Date().toLocaleDateString()}</strong>
                                    </div>
                                    <div className="dp-meta-row">
                                        <span>GATE PASS NO:</span>
                                        <strong>{selectedChallanForPrint.gate_pass_number}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Company Consignor Header */}
                            <div className="dp-company-header">
                                <div className="dp-company-logo">R</div>
                                <div>
                                    <h2>RAINBOW FLOORINGS & CARPETS LTD.</h2>
                                    <p>Plot 42, GIDC Industrial Estate, Sector 3, Gujarat, India - 382010</p>
                                    <div className="dp-company-gst">
                                        <span>GSTIN: <strong>24AAACR1234P1Z4</strong></span>
                                        <span>•</span>
                                        <span>PAN: <strong>AAACR1234P</strong></span>
                                        <span>•</span>
                                        <span>CIN: <strong>U17220GJ2015PLC083120</strong></span>
                                    </div>
                                </div>
                            </div>

                            <div className="dp-divider-bold"></div>

                            {/* Consignee & Transport Grid */}
                            <div className="dp-consignee-transport-grid">
                                <div className="dp-consignee-box">
                                    <div className="dp-box-title">CONSIGNEE / BILLED TO:</div>
                                    <strong>{selectedChallanForPrint.customer_name}</strong>
                                    <p>{selectedChallanForPrint.delivery_address || "Delivery as per order agreement"}</p>
                                    {selectedChallanForPrint.dest_city && (
                                        <p>{selectedChallanForPrint.dest_city}, {selectedChallanForPrint.dest_state} - {selectedChallanForPrint.dest_pincode}</p>
                                    )}
                                    <div className="dp-gst-line">
                                        GSTIN: <strong>{selectedChallanForPrint.customer_gst || "URP (Unregistered Person)"}</strong>
                                    </div>
                                </div>

                                <div className="dp-transport-box">
                                    <div className="dp-box-title">TRANSPORT & DISPATCH DETAILS:</div>
                                    <div className="dp-trans-grid">
                                        <div>
                                            <span className="lbl">Vehicle Number:</span>
                                            <strong>{selectedChallanForPrint.vehicle_number}</strong>
                                        </div>
                                        <div>
                                            <span className="lbl">Transporter:</span>
                                            <strong>{selectedChallanForPrint.transporter_name || "Direct Logistics"}</strong>
                                        </div>
                                        <div>
                                            <span className="lbl">LR / Bilty No:</span>
                                            <strong>{selectedChallanForPrint.lr_number || "Direct Fleet"}</strong>
                                        </div>
                                        <div>
                                            <span className="lbl">e-Way Bill No:</span>
                                            <strong>{selectedChallanForPrint.eway_bill_number || "Self Assessment"}</strong>
                                        </div>
                                        <div>
                                            <span className="lbl">Driver Name:</span>
                                            <strong>{selectedChallanForPrint.driver_name || "—"} ({selectedChallanForPrint.driver_phone || "—"})</strong>
                                        </div>
                                        <div>
                                            <span className="lbl">Place of Supply:</span>
                                            <strong>{selectedChallanForPrint.dest_state || "Gujarat (24)"}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Itemized Roll Manifest Table */}
                            <table className="dp-print-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: "35px" }}>Sr.</th>
                                        <th>Roll Serial Number</th>
                                        <th>Product Description & PVC Carpet Grade</th>
                                        <th>HSN Code</th>
                                        <th>Dimensions (W × L)</th>
                                        <th style={{ textAlign: "right" }}>Total Area (m²)</th>
                                        <th style={{ textAlign: "right" }}>Net Wt (kg)</th>
                                        <th style={{ textAlign: "right" }}>Gross Wt (kg)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedChallanForPrint.items || []).map((it, idx) => (
                                        <tr key={it.id}>
                                            <td>{idx + 1}</td>
                                            <td><strong>{it.roll_number}</strong></td>
                                            <td>
                                                <div>{it.product_name}</div>
                                                <small style={{ color: "#64748b" }}>Grade: {it.grade?.replace("_", " ") || "Grade A"} | {it.carpet_type || "PVC Synthetic"}</small>
                                            </td>
                                            <td>570320</td>
                                            <td>{Number(it.width_m).toFixed(2)}m × {Number(it.length_m).toFixed(2)}m</td>
                                            <td style={{ textAlign: "right" }}>{Number(it.area_sqm).toFixed(2)}</td>
                                            <td style={{ textAlign: "right" }}>{Number(it.net_weight_kg).toFixed(2)}</td>
                                            <td style={{ textAlign: "right" }}>{Number(it.gross_weight_kg).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="dp-total-row">
                                        <td colSpan="5" style={{ textAlign: "right", fontWeight: 800 }}>
                                            GRAND TOTAL MANIFEST TALLY:
                                        </td>
                                        <td style={{ textAlign: "right", fontWeight: 800 }}>
                                            {Number(selectedChallanForPrint.total_sqm).toFixed(2)} m²
                                        </td>
                                        <td style={{ textAlign: "right", fontWeight: 800 }}>
                                            {Number(selectedChallanForPrint.total_net_weight_kg).toFixed(2)} kg
                                        </td>
                                        <td style={{ textAlign: "right", fontWeight: 800 }}>
                                            {Number(selectedChallanForPrint.total_gross_weight_kg).toFixed(2)} kg
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="dp-challan-terms">
                                <strong>Terms & Declaration:</strong> We declare that this delivery challan shows the actual quantity of goods described and that all particulars are true and correct. Goods dispatched are under statutory transit insurance.
                            </div>

                            {/* Signatures */}
                            <div className="dp-signatures-grid">
                                <div className="dp-sig-block">
                                    <div className="dp-sig-line"></div>
                                    <span>Prepared By</span>
                                    <strong>{selectedChallanForPrint.created_by || "Dispatch Officer"}</strong>
                                </div>
                                <div className="dp-sig-block">
                                    <div className="dp-sig-line"></div>
                                    <span>Transporter / Driver Acknowledgment</span>
                                    <strong>{selectedChallanForPrint.driver_name || "Vehicle Driver"}</strong>
                                </div>
                                <div className="dp-sig-block">
                                    <div className="dp-sig-line"></div>
                                    <span>For RAINBOW FLOORINGS & CARPETS LTD.</span>
                                    <strong>Authorized Signatory</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
               MODAL: SECURITY OUTWARD GATE PASS
            ================================================= */}
            {showGatePassModal && selectedChallanForPrint && (
                <div className="dp-modal-backdrop" onClick={(e) => e.target.classList.contains("dp-modal-backdrop") && setShowGatePassModal(false)}>
                    <div className="dp-doc-card">
                        <div className="dp-modal-bar no-print">
                            <span className="title">Outward Security Gate Pass Preview</span>
                            <div className="actions">
                                <button
                                    type="button"
                                    className="dp-btn-print"
                                    onClick={() => window.print()}
                                >
                                    <Printer size={15} /> Print Gate Pass
                                </button>
                                <button
                                    type="button"
                                    className="dp-btn-close"
                                    onClick={() => setShowGatePassModal(false)}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* PRINTABLE GATE PASS */}
                        <div className="dp-printable-sheet" id="print-target">
                            <div className="dp-sheet-top-header">
                                <div className="dp-doc-type-badge security">
                                    SECURITY OUTWARD GATE PASS
                                    <small>(Factory Main Gate Material Exit Permit)</small>
                                </div>
                                <div className="dp-dc-meta-block">
                                    <div className="dp-meta-row">
                                        <span>GATE PASS NO:</span>
                                        <strong>{selectedChallanForPrint.gate_pass_number}</strong>
                                    </div>
                                    <div className="dp-meta-row">
                                        <span>CHALLAN REF:</span>
                                        <strong>{selectedChallanForPrint.challan_number}</strong>
                                    </div>
                                    <div className="dp-meta-row">
                                        <span>DATE & TIME:</span>
                                        <strong>{new Date().toLocaleDateString()} {selectedChallanForPrint.dispatch_time || new Date().toLocaleTimeString()}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="dp-company-header">
                                <div className="dp-company-logo">R</div>
                                <div>
                                    <h2>RAINBOW FLOORINGS & CARPETS LTD. - PLANT 01</h2>
                                    <p>Main Security Gate Complex • Outward Logistics Bay</p>
                                </div>
                            </div>

                            <div className="dp-divider-bold"></div>

                            {/* Gate Pass Content */}
                            <div className="dp-gp-details-grid">
                                <div className="dp-gp-row">
                                    <span className="lbl">Vehicle Registration Number:</span>
                                    <strong className="val large">{selectedChallanForPrint.vehicle_number}</strong>
                                </div>
                                <div className="dp-gp-row">
                                    <span className="lbl">Transporter / Fleet Agency:</span>
                                    <strong className="val">{selectedChallanForPrint.transporter_name || "Self Logistics"}</strong>
                                </div>
                                <div className="dp-gp-row">
                                    <span className="lbl">Driver Name & Phone:</span>
                                    <strong className="val">{selectedChallanForPrint.driver_name || "—"} ({selectedChallanForPrint.driver_phone || "—"})</strong>
                                </div>
                                <div className="dp-gp-row">
                                    <span className="lbl">Destination Consignee:</span>
                                    <strong className="val">{selectedChallanForPrint.customer_name} ({selectedChallanForPrint.dest_city || "Commercial Site"})</strong>
                                </div>
                                <div className="dp-gp-row">
                                    <span className="lbl">Total Package Manifest:</span>
                                    <strong className="val highlight">{selectedChallanForPrint.total_rolls} Carpet Rolls ({selectedChallanForPrint.total_sqm} m² | {selectedChallanForPrint.total_gross_weight_kg} kg Gross)</strong>
                                </div>
                                <div className="dp-gp-row">
                                    <span className="lbl">e-Way Bill Reference:</span>
                                    <strong className="val">{selectedChallanForPrint.eway_bill_number || "Checked & Verified"}</strong>
                                </div>
                            </div>

                            {/* Security Verification Checklist */}
                            <div className="dp-gp-checklist-box">
                                <div className="dp-check-title">SECURITY GATE PHYSICAL INSPECTION CHECKLIST:</div>
                                <div className="dp-check-items">
                                    <div><Check size={14} /> Physical Roll Count verified against Delivery Challan</div>
                                    <div><Check size={14} /> Vehicle Cargo Bay sealed & strapped properly</div>
                                    <div><Check size={14} /> Driver Driving License & Photo ID inspected</div>
                                    <div><Check size={14} /> Weighbridge In/Out gross slip attached</div>
                                </div>
                            </div>

                            {/* Signatures */}
                            <div className="dp-signatures-grid" style={{ marginTop: "40px" }}>
                                <div className="dp-sig-block">
                                    <div className="dp-sig-line"></div>
                                    <span>Dispatch Store Incharge</span>
                                    <strong>{selectedChallanForPrint.created_by || "Store Officer"}</strong>
                                </div>
                                <div className="dp-sig-block">
                                    <div className="dp-sig-line"></div>
                                    <span>Vehicle Driver Sign</span>
                                    <strong>{selectedChallanForPrint.driver_name || "Driver"}</strong>
                                </div>
                                <div className="dp-sig-block">
                                    <div className="dp-sig-line"></div>
                                    <span>Main Gate Security Officer</span>
                                    <strong>{selectedChallanForPrint.security_officer_name || "Security Incharge"}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
