import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
    RefreshCw,
    Layers,
    Plus,
    Search,
    Tag,
    Barcode,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    Award,
    Edit3,
    Trash2,
    Printer,
    X,
    Filter,
    Package,
    Scale,
    Ruler,
    Maximize2,
    Calendar,
    Warehouse,
    ShieldCheck
} from "lucide-react";

const initialRollForm = {
    production_order_id: "",
    product_id: "",
    process_id: "",
    machine_id: "",
    operator_id: "",
    roll_number: "",
    width_m: "2.00",
    length_m: "30.00",
    thickness_mm: "",
    gsm: "",
    gross_weight_kg: "",
    core_weight_kg: "2.50",
    grade: "GRADE_A",
    defect_type: "",
    status: "PRODUCED",
    warehouse_location: "WIP-ROLL-BAY-1",
    notes: ""
};

const initialBulkForm = {
    production_order_id: "",
    product_id: "",
    process_id: "",
    machine_id: "",
    roll_count: "5",
    width_m: "2.00",
    length_m: "30.00",
    thickness_mm: "",
    gsm: "",
    gross_weight_kg: "",
    core_weight_kg: "2.50",
    grade: "GRADE_A",
    warehouse_location: "WIP-ROLL-BAY-1",
    notes: ""
};

const CarpetRolls = () => {
    const navigate = useNavigate();
    // --------------------------------------------------
    // STATE
    // --------------------------------------------------
    const [rolls, setRolls] = useState([]);
    const [stats, setStats] = useState(null);
    const [orders, setOrders] = useState([]);
    const [machines, setMachines] = useState([]);
    const [processes, setProcesses] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [gradeFilter, setGradeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [orderFilter, setOrderFilter] = useState("");

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [editingRoll, setEditingRoll] = useState(null);
    const [selectedRollForLabel, setSelectedRollForLabel] = useState(null);

    const [form, setForm] = useState(initialRollForm);
    const [bulkForm, setBulkForm] = useState(initialBulkForm);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    // --------------------------------------------------
    // LOAD DATA
    // --------------------------------------------------
    const loadRolls = async () => {
        try {
            setLoading(true);
            setError("");

            const [rollsRes, statsRes] = await Promise.all([
                api.get("/carpet-rolls", {
                    params: {
                        search: search.trim() || undefined,
                        grade: gradeFilter || undefined,
                        status: statusFilter || undefined,
                        production_order_id: orderFilter || undefined
                    }
                }),
                api.get("/carpet-rolls/stats", {
                    params: {
                        production_order_id: orderFilter || undefined
                    }
                })
            ]);

            if (rollsRes.data.success) {
                setRolls(rollsRes.data.data || []);
            }
            if (statsRes.data.success) {
                setStats(statsRes.data.data || null);
            }
        } catch (err) {
            console.error("LOAD ROLLS ERROR:", err);
            setError(err.response?.data?.message || "Failed to load carpet rolls.");
        } finally {
            setLoading(false);
        }
    };

    const loadMeta = async () => {
        try {
            const [ordersRes, machinesRes, processesRes] = await Promise.allSettled([
                api.get("/production-orders"),
                api.get("/machines"),
                api.get("/processes")
            ]);

            if (ordersRes.status === "fulfilled" && ordersRes.value.data.success) {
                setOrders(ordersRes.value.data.data || []);
            }
            if (machinesRes.status === "fulfilled" && machinesRes.value.data.success) {
                setMachines(machinesRes.value.data.data || []);
            }
            if (processesRes.status === "fulfilled" && processesRes.value.data.success) {
                setProcesses(processesRes.value.data.data || []);
            }
        } catch (err) {
            console.error("LOAD META ERROR:", err);
        }
    };

    useEffect(() => {
        loadMeta();
    }, []);

    useEffect(() => {
        loadRolls();
    }, [gradeFilter, statusFilter, orderFilter]);

    // --------------------------------------------------
    // LIVE CALCULATIONS FOR FORM
    // --------------------------------------------------
    const singleArea = useMemo(() => {
        const w = parseFloat(form.width_m) || 0;
        const l = parseFloat(form.length_m) || 0;
        return (w * l).toFixed(2);
    }, [form.width_m, form.length_m]);

    const singleNetWeight = useMemo(() => {
        const gross = parseFloat(form.gross_weight_kg) || 0;
        const core = parseFloat(form.core_weight_kg) || 0;
        if (!gross) return "";
        return Math.max(0, gross - core).toFixed(2);
    }, [form.gross_weight_kg, form.core_weight_kg]);

    const singleEstWeight = useMemo(() => {
        const gsm = parseFloat(form.gsm) || 0;
        const area = parseFloat(singleArea) || 0;
        if (!gsm || !area) return null;
        return ((area * gsm) / 1000).toFixed(2);
    }, [form.gsm, singleArea]);

    // --------------------------------------------------
    // HANDLERS
    // --------------------------------------------------
    const handleOrderSelect = (orderId, isBulk = false) => {
        const targetOrder = orders.find((o) => String(o.id) === String(orderId));
        if (targetOrder) {
            if (isBulk) {
                setBulkForm((prev) => ({
                    ...prev,
                    production_order_id: orderId,
                    product_id: targetOrder.product_id || "",
                    width_m: targetOrder.width_mm ? (parseFloat(targetOrder.width_mm) / 1000).toFixed(2) : prev.width_m,
                    thickness_mm: targetOrder.thickness_mm || prev.thickness_mm,
                    gsm: targetOrder.gsm || prev.gsm
                }));
            } else {
                setForm((prev) => ({
                    ...prev,
                    production_order_id: orderId,
                    product_id: targetOrder.product_id || "",
                    width_m: targetOrder.width_mm ? (parseFloat(targetOrder.width_mm) / 1000).toFixed(2) : prev.width_m,
                    thickness_mm: targetOrder.thickness_mm || prev.thickness_mm,
                    gsm: targetOrder.gsm || prev.gsm
                }));
            }
        } else {
            if (isBulk) {
                setBulkForm((prev) => ({ ...prev, production_order_id: orderId }));
            } else {
                setForm((prev) => ({ ...prev, production_order_id: orderId }));
            }
        }
    };

    const openAddModal = () => {
        setEditingRoll(null);
        setForm(initialRollForm);
        setShowModal(true);
    };

    const openEditModal = (roll) => {
        setEditingRoll(roll);
        setForm({
            production_order_id: roll.production_order_id,
            product_id: roll.product_id,
            process_id: roll.process_id || "",
            machine_id: roll.machine_id || "",
            operator_id: roll.operator_id || "",
            roll_number: roll.roll_number,
            width_m: roll.width_m || "2.00",
            length_m: roll.length_m || "30.00",
            thickness_mm: roll.thickness_mm || "",
            gsm: roll.gsm || "",
            gross_weight_kg: roll.gross_weight_kg || "",
            core_weight_kg: roll.core_weight_kg || "2.50",
            grade: roll.grade || "GRADE_A",
            defect_type: roll.defect_type || "",
            status: roll.status || "PRODUCED",
            warehouse_location: roll.warehouse_location || "",
            notes: roll.notes || ""
        });
        setShowModal(true);
    };

    const handleSaveRoll = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError("");
            setMessage("");

            if (editingRoll) {
                await api.put(`/carpet-rolls/${editingRoll.id}`, form);
                setMessage(`Roll ${editingRoll.roll_number} updated successfully.`);
            } else {
                const res = await api.post("/carpet-rolls", form);
                setMessage(res.data.message || "Carpet roll logged successfully.");
            }

            setShowModal(false);
            loadRolls();
        } catch (err) {
            console.error("SAVE ROLL ERROR:", err);
            setError(err.response?.data?.message || "Failed to save carpet roll.");
        } finally {
            setSaving(false);
        }
    };

    const handleBulkSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError("");
            setMessage("");

            const res = await api.post("/carpet-rolls/bulk", bulkForm);
            setMessage(res.data.message || "Bulk rolls generated successfully.");
            setShowBulkModal(false);
            loadRolls();
        } catch (err) {
            console.error("BULK ROLL ERROR:", err);
            setError(err.response?.data?.message || "Failed to bulk generate rolls.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRoll = async (roll) => {
        if (!window.confirm(`Are you sure you want to delete roll ${roll.roll_number}?`)) {
            return;
        }

        try {
            await api.delete(`/carpet-rolls/${roll.id}`);
            setMessage(`Roll ${roll.roll_number} deleted successfully.`);
            loadRolls();
        } catch (err) {
            console.error("DELETE ROLL ERROR:", err);
            setError(err.response?.data?.message || "Failed to delete carpet roll.");
        }
    };

    const handleQuickStockIn = async (roll) => {
        try {
            setError("");
            setMessage("");
            const res = await api.post("/finished-goods/stock-in", {
                roll_ids: [roll.id],
                warehouse_location: roll.warehouse_location || "FG-BAY-01"
            });
            setMessage(res.data.message || `Roll ${roll.roll_number} successfully stocked into Finished Goods Warehouse.`);
            loadRolls();
        } catch (err) {
            console.error("QUICK STOCK-IN ERROR:", err);
            setError(err.response?.data?.message || "Failed to transfer roll to warehouse.");
        }
    };

    const clearFilters = () => {
        setSearch("");
        setGradeFilter("");
        setStatusFilter("");
        setOrderFilter("");
    };

    // Grade styling badge helper
    const getGradeBadge = (grade) => {
        switch (grade) {
            case "GRADE_A":
                return (
                    <span className="cr-grade-badge grade-a">
                        <Award size={12} /> Grade A Prime
                    </span>
                );
            case "GRADE_B":
                return (
                    <span className="cr-grade-badge grade-b">
                        <span className="cr-grade-dot b"></span> Grade B (Sec)
                    </span>
                );
            case "GRADE_C":
                return (
                    <span className="cr-grade-badge grade-c">
                        <span className="cr-grade-dot c"></span> Grade C
                    </span>
                );
            case "SCRAP":
                return (
                    <span className="cr-grade-badge grade-scrap">
                        <AlertTriangle size={11} /> Scrap / Re-melt
                    </span>
                );
            default:
                return <span className="cr-grade-badge">{grade}</span>;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "PRODUCED":
                return <span className="cr-status-badge status-produced">Produced</span>;
            case "QC_INSPECTION":
                return <span className="cr-status-badge status-qc">QC Inspecting</span>;
            case "APPROVED":
                return <span className="cr-status-badge status-approved">Approved</span>;
            case "IN_WAREHOUSE":
                return <span className="cr-status-badge status-warehouse">In Warehouse</span>;
            case "DISPATCHED":
                return <span className="cr-status-badge status-dispatched">Dispatched</span>;
            default:
                return <span className="cr-status-badge">{status}</span>;
        }
    };

    return (
        <div className="cr-page">
            {/* =================================================
               HEADER
            ================================================= */}
            <div className="cr-header">
                <div className="cr-header-title">
                    <div className="cr-eyebrow">MANUFACTURING • PVC CARPET MES</div>
                    <h1>Carpet Roll Tracking & Serialization</h1>
                    <p>
                        Track individual PVC carpet rolls by serialized Roll #, length (m), area (m²), weight (kg), and quality grading.
                    </p>
                </div>

                <div className="cr-header-actions">
                    <button
                        type="button"
                        className="cr-btn-secondary"
                        onClick={loadRolls}
                        disabled={loading}
                    >
                        <RefreshCw size={14} className={loading ? "cr-spin" : ""} /> Refresh
                    </button>
                    <a
                        href="/roll-scanner"
                        className="cr-btn-secondary"
                        style={{ textDecoration: "none" }}
                    >
                        <Barcode size={14} /> Roll Scanner
                    </a>
                    <a
                        href="/finished-goods"
                        className="cr-btn-secondary"
                        style={{ textDecoration: "none" }}
                    >
                        <Warehouse size={14} /> Finished Goods Stock
                    </a>
                    <button
                        type="button"
                        className="cr-btn-secondary"
                        onClick={() => {
                            setBulkForm(initialBulkForm);
                            setShowBulkModal(true);
                        }}
                    >
                        <Layers size={14} /> Bulk Generate
                    </button>
                    <button
                        type="button"
                        className="cr-btn-primary"
                        onClick={openAddModal}
                    >
                        <Plus size={15} /> Log Carpet Roll
                    </button>
                </div>
            </div>

            {/* =================================================
               ALERTS
            ================================================= */}
            {message && (
                <div className="cr-alert cr-alert-success">
                    <CheckCircle2 size={16} className="cr-alert-icon" />
                    <span>{message}</span>
                </div>
            )}
            {error && !showModal && !showBulkModal && (
                <div className="cr-alert cr-alert-error">
                    <AlertTriangle size={16} className="cr-alert-icon" />
                    <span>{error}</span>
                </div>
            )}

            {/* =================================================
               KPI STATS SUMMARY
            ================================================= */}
            <div className="cr-summary-grid">
                <div className="cr-summary-card blue">
                    <div className="cr-summary-top">
                        <div className="cr-summary-label">Total Rolls Produced</div>
                        <div className="cr-icon-bubble blue"><Package size={16} /></div>
                    </div>
                    <div className="cr-summary-value">{stats?.total_rolls || 0}</div>
                    <div className="cr-summary-meta">Serialized active rolls</div>
                </div>

                <div className="cr-summary-card sky">
                    <div className="cr-summary-top">
                        <div className="cr-summary-label">Total Running Metres</div>
                        <div className="cr-icon-bubble sky"><Ruler size={16} /></div>
                    </div>
                    <div className="cr-summary-value">
                        {parseFloat(stats?.total_length_m || 0).toLocaleString()} <span className="cr-unit">m</span>
                    </div>
                    <div className="cr-summary-meta">Linear production length</div>
                </div>

                <div className="cr-summary-card purple">
                    <div className="cr-summary-top">
                        <div className="cr-summary-label">Total Surface Area</div>
                        <div className="cr-icon-bubble purple"><Maximize2 size={16} /></div>
                    </div>
                    <div className="cr-summary-value">
                        {parseFloat(stats?.total_area_sqm || 0).toLocaleString()} <span className="cr-unit">m²</span>
                    </div>
                    <div className="cr-summary-meta">Covered square metres</div>
                </div>

                <div className="cr-summary-card teal">
                    <div className="cr-summary-top">
                        <div className="cr-summary-label">Total Net Weight</div>
                        <div className="cr-icon-bubble teal"><Scale size={16} /></div>
                    </div>
                    <div className="cr-summary-value">
                        {parseFloat(stats?.total_net_weight_kg || 0).toLocaleString()} <span className="cr-unit">kg</span>
                    </div>
                    <div className="cr-summary-meta">Net finished product weight</div>
                </div>

                <div className="cr-summary-card emerald">
                    <div className="cr-summary-top">
                        <div className="cr-summary-label">Grade A Yield Rate</div>
                        <div className="cr-icon-bubble emerald"><Award size={16} /></div>
                    </div>
                    <div className="cr-summary-value highlight-green">
                        {stats?.grade_a_yield_pct || 0}%
                    </div>
                    <div className="cr-summary-meta">
                        {stats?.grade_a_count || 0} Prime / {stats?.grade_b_count || 0} Sec / {stats?.scrap_count || 0} Scrap
                    </div>
                </div>
            </div>

            {/* =================================================
               FILTER & SEARCH TOOLBAR
            ================================================= */}
            <div className="cr-filter-card">
                <div className="cr-filter-grid">
                    <div className="cr-filter-field cr-search-field">
                        <label>Search Roll or Product</label>
                        <div className="cr-input-icon-wrap">
                            <Search size={15} className="cr-input-icon" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && loadRolls()}
                                placeholder="Search ROL-..., product code, name..."
                            />
                        </div>
                    </div>

                    <div className="cr-filter-field">
                        <label>Quality Grade</label>
                        <select
                            value={gradeFilter}
                            onChange={(e) => setGradeFilter(e.target.value)}
                        >
                            <option value="">All Grades</option>
                            <option value="GRADE_A">Grade A (Prime)</option>
                            <option value="GRADE_B">Grade B (Commercial)</option>
                            <option value="GRADE_C">Grade C</option>
                            <option value="SCRAP">Scrap</option>
                        </select>
                    </div>

                    <div className="cr-filter-field">
                        <label>Lifecycle Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="PRODUCED">Produced</option>
                            <option value="QC_INSPECTION">QC Inspection</option>
                            <option value="APPROVED">Approved</option>
                            <option value="IN_WAREHOUSE">In Warehouse</option>
                            <option value="DISPATCHED">Dispatched</option>
                        </select>
                    </div>

                    <div className="cr-filter-field">
                        <label>Production Order</label>
                        <select
                            value={orderFilter}
                            onChange={(e) => setOrderFilter(e.target.value)}
                        >
                            <option value="">All Orders</option>
                            {orders.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.production_order_number} ({o.product_name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="cr-filter-actions">
                        <button
                            type="button"
                            className="cr-btn-apply"
                            onClick={loadRolls}
                        >
                            <Filter size={13} /> Filter
                        </button>
                        {(search || gradeFilter || statusFilter || orderFilter) && (
                            <button
                                type="button"
                                className="cr-btn-clear"
                                onClick={clearFilters}
                                title="Clear All Filters"
                            >
                                <X size={13} /> Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* =================================================
               DATA TABLE
            ================================================= */}
            <div className="cr-table-card">
                <div className="cr-table-header">
                    <div>
                        <h2>Serialized Roll Inventory</h2>
                        <p>Showing {rolls.length} verified production rolls</p>
                    </div>
                    <div className="cr-count-pill">{rolls.length} Rolls</div>
                </div>

                <div className="cr-table-wrapper">
                    {loading ? (
                        <div className="cr-empty-state">
                            <div className="cr-spinner"></div>
                            <p>Loading carpet rolls database...</p>
                        </div>
                    ) : rolls.length === 0 ? (
                        <div className="cr-empty-state">
                            <Package size={44} strokeWidth={1.4} color="#94a3b8" style={{ marginBottom: "12px" }} />
                            <h3>No Carpet Rolls Found</h3>
                            <p>
                                No PVC carpet rolls match the current filter criteria. Log rolls individually or generate a batch in bulk.
                            </p>
                            <button type="button" className="cr-btn-primary" onClick={openAddModal}>
                                <Plus size={15} /> Log First Carpet Roll
                            </button>
                        </div>
                    ) : (
                        <table className="cr-table">
                            <colgroup>
                                <col style={{ width: "230px" }} />
                                <col style={{ width: "240px" }} />
                                <col style={{ width: "170px" }} />
                                <col style={{ width: "130px" }} />
                                <col style={{ width: "220px" }} />
                                <col style={{ width: "160px" }} />
                                <col style={{ width: "130px" }} />
                                <col style={{ width: "130px" }} />
                                <col style={{ width: "240px" }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className="col-roll">Roll Identifier</th>
                                    <th className="col-product">Order / Product</th>
                                    <th className="col-dim">Dimensions (W × L)</th>
                                    <th className="col-area">Surface Area</th>
                                    <th className="col-weight">Weight (Net / Gross)</th>
                                    <th className="col-grade">Quality Grade</th>
                                    <th className="col-loc">Location</th>
                                    <th className="col-status">Status</th>
                                    <th className="col-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rolls.map((roll) => (
                                    <tr key={roll.id}>
                                        <td className="col-roll">
                                            <div className="cr-roll-number-pill">
                                                <Barcode size={14} className="cr-roll-icon" />
                                                <span>{roll.roll_number}</span>
                                            </div>
                                            <div className="cr-subtext">
                                                <Calendar size={11} /> {new Date(roll.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="col-product">
                                            <div className="cr-product-title">{roll.product_name}</div>
                                            <div className="cr-subtext">
                                                <span className="cr-po-tag">PO: {roll.production_order_number}</span>
                                                {roll.colour && <span className="cr-spec-tag">{roll.colour}</span>}
                                                {roll.carpet_type && <span className="cr-spec-tag">{roll.carpet_type}</span>}
                                            </div>
                                        </td>
                                        <td className="col-dim">
                                            <div className="cr-dim-text">
                                                {roll.width_m} m × {roll.length_m} m
                                            </div>
                                            <div className="cr-subtext">
                                                {roll.thickness_mm ? `${roll.thickness_mm} mm` : "—"} {roll.gsm ? `• ${roll.gsm} GSM` : ""}
                                            </div>
                                        </td>
                                        <td className="col-area">
                                            <div className="cr-area-value">{roll.area_sqm} m²</div>
                                            <div className="cr-subtext">
                                                {(parseFloat(roll.area_sqm || 0) * 10.764).toFixed(1)} sq.ft
                                            </div>
                                        </td>
                                        <td className="col-weight">
                                            <div className="cr-weight-net">
                                                {roll.net_weight_kg ? `${roll.net_weight_kg} kg` : "—"}
                                            </div>
                                            {roll.gross_weight_kg && (
                                                <div className="cr-subtext">
                                                    Gross: {roll.gross_weight_kg}kg • Core: {roll.core_weight_kg || 0}kg
                                                </div>
                                            )}
                                        </td>
                                        <td className="col-grade">
                                            {getGradeBadge(roll.grade)}
                                            {roll.defect_type ? (
                                                <div className="cr-defect-tag" title={roll.defect_type}>
                                                    <AlertCircle size={11} /> {roll.defect_type}
                                                </div>
                                            ) : (
                                                <div className="cr-subtext">
                                                    <CheckCircle2 size={11} style={{ color: "#10b981" }} /> Passed QA
                                                </div>
                                            )}
                                        </td>
                                        <td className="col-loc">
                                            <span className="cr-loc-badge">
                                                <Warehouse size={12} />
                                                <span>{roll.warehouse_location || "WIP Floor"}</span>
                                            </span>
                                            <div className="cr-subtext">Storage Bin</div>
                                        </td>
                                        <td className="col-status">
                                            {getStatusBadge(roll.status)}
                                            <div className="cr-subtext">
                                                {roll.status === "PRODUCED" ? "Awaiting QC" :
                                                 roll.status === "QC_INSPECTION" ? "In Review" :
                                                 roll.status === "APPROVED" ? "Ready" :
                                                 roll.status === "IN_WAREHOUSE" ? "Stocked" : "Shipped"}
                                            </div>
                                        </td>
                                        <td className="col-actions">
                                            <div className="cr-row-actions">
                                                <button
                                                    type="button"
                                                    className="cr-btn-action label"
                                                    onClick={() => setSelectedRollForLabel(roll)}
                                                    title="Print Roll Label / Barcode Tag"
                                                >
                                                    <Tag size={12} /> Tag
                                                </button>
                                                <button
                                                    type="button"
                                                    className="cr-btn-action qc"
                                                    onClick={() => navigate(`/quality/roll-inspection?roll=${encodeURIComponent(roll.roll_number)}`)}
                                                    title="Lab QC Inspection & Certificate of Analysis"
                                                >
                                                    <ShieldCheck size={12} /> QC
                                                </button>
                                                {roll.status !== "IN_WAREHOUSE" && roll.status !== "DISPATCHED" && (
                                                    <button
                                                        type="button"
                                                        className="cr-btn-action stock"
                                                        onClick={() => handleQuickStockIn(roll)}
                                                        title="Stock roll into Finished Goods Warehouse"
                                                    >
                                                        <Warehouse size={12} /> Stock
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="cr-btn-action edit"
                                                    onClick={() => openEditModal(roll)}
                                                    title="Edit Roll Details"
                                                >
                                                    <Edit3 size={12} /> Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="cr-btn-action delete"
                                                    onClick={() => handleDeleteRoll(roll)}
                                                    title="Delete Roll"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* =================================================
               MODAL: LOG / EDIT SINGLE ROLL
            ================================================= */}
            {showModal && (
                <div className="cr-modal-backdrop" onClick={(e) => e.target.classList.contains("cr-modal-backdrop") && setShowModal(false)}>
                    <div className="cr-modal-card">
                        <div className="cr-modal-header">
                            <div>
                                <div className="cr-eyebrow">PVC ROLL SPECIFICATION</div>
                                <h2>{editingRoll ? `Edit Roll: ${editingRoll.roll_number}` : "Log Finished Carpet Roll"}</h2>
                            </div>
                            <button
                                type="button"
                                className="cr-modal-close"
                                onClick={() => setShowModal(false)}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {error && (
                            <div className="cr-alert cr-alert-error" style={{ margin: "16px 24px 0" }}>
                                <AlertTriangle size={15} /> {error}
                            </div>
                        )}

                        <form onSubmit={handleSaveRoll} className="cr-modal-form">
                            {/* Section 1: Order */}
                            <div className="cr-form-section">
                                <div className="cr-form-section-title">1. Order Association & Identification</div>
                                <div className="cr-form-grid-2">
                                    <div className="cr-field">
                                        <label>Production Order *</label>
                                        <select
                                            required
                                            value={form.production_order_id}
                                            onChange={(e) => handleOrderSelect(e.target.value)}
                                        >
                                            <option value="">Select Production Order</option>
                                            {orders.map((o) => (
                                                <option key={o.id} value={o.id}>
                                                    {o.production_order_number} ({o.product_name})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="cr-field">
                                        <label>Custom Roll # (Optional)</label>
                                        <input
                                            type="text"
                                            value={form.roll_number}
                                            onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
                                            placeholder="Auto-generated if left blank"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Dimensions */}
                            <div className="cr-form-section">
                                <div className="cr-form-section-title">2. Roll Dimensions & Surface Area</div>
                                <div className="cr-form-grid-3">
                                    <div className="cr-field">
                                        <label>Width (m) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={form.width_m}
                                            onChange={(e) => setForm({ ...form, width_m: e.target.value })}
                                        />
                                    </div>

                                    <div className="cr-field">
                                        <label>Length (m) *</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            required
                                            value={form.length_m}
                                            onChange={(e) => setForm({ ...form, length_m: e.target.value })}
                                        />
                                    </div>

                                    <div className="cr-field">
                                        <label>Calculated Area</label>
                                        <div className="cr-calc-box">
                                            <span className="cr-calc-num">{singleArea}</span> m²
                                        </div>
                                    </div>
                                </div>

                                <div className="cr-form-grid-2" style={{ marginTop: "12px" }}>
                                    <div className="cr-field">
                                        <label>Thickness (mm)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={form.thickness_mm}
                                            onChange={(e) => setForm({ ...form, thickness_mm: e.target.value })}
                                            placeholder="e.g. 1.20"
                                        />
                                    </div>

                                    <div className="cr-field">
                                        <label>GSM (g/m²)</label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={form.gsm}
                                            onChange={(e) => setForm({ ...form, gsm: e.target.value })}
                                            placeholder="e.g. 1400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Weight */}
                            <div className="cr-form-section">
                                <div className="cr-form-section-title">3. Scale Weights & Yield Verification</div>
                                <div className="cr-form-grid-3">
                                    <div className="cr-field">
                                        <label>Gross Scale Weight (kg)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={form.gross_weight_kg}
                                            onChange={(e) => setForm({ ...form, gross_weight_kg: e.target.value })}
                                            placeholder="Scale display weight"
                                        />
                                    </div>

                                    <div className="cr-field">
                                        <label>Core Pipe Weight (kg)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={form.core_weight_kg}
                                            onChange={(e) => setForm({ ...form, core_weight_kg: e.target.value })}
                                        />
                                    </div>

                                    <div className="cr-field">
                                        <label>Net Product Weight</label>
                                        <div className="cr-calc-box highlight-green">
                                            <span className="cr-calc-num">{singleNetWeight || "—"}</span> kg
                                            {singleEstWeight && (
                                                <span className="cr-calc-sub">Theor: {singleEstWeight} kg</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Quality & Storage */}
                            <div className="cr-form-section">
                                <div className="cr-form-section-title">4. Quality Grade, Defects & Storage</div>
                                <div className="cr-form-grid-2">
                                    <div className="cr-field">
                                        <label>Quality Grade *</label>
                                        <select
                                            value={form.grade}
                                            onChange={(e) => setForm({ ...form, grade: e.target.value })}
                                        >
                                            <option value="GRADE_A">Grade A (Prime / Export Grade)</option>
                                            <option value="GRADE_B">Grade B (Minor Blemish / Seconds)</option>
                                            <option value="GRADE_C">Grade C (Sub-standard)</option>
                                            <option value="SCRAP">Scrap (To Granulator / Re-melt)</option>
                                        </select>
                                    </div>

                                    <div className="cr-field">
                                        <label>Defect Classification</label>
                                        <select
                                            value={form.defect_type}
                                            onChange={(e) => setForm({ ...form, defect_type: e.target.value })}
                                        >
                                            <option value="">None / Flawless</option>
                                            <option value="Pinholes / Surface Voids">Pinholes / Surface Voids</option>
                                            <option value="Thickness Uneven / Gauge Variation">Thickness Uneven / Gauge Variation</option>
                                            <option value="Edge Trimming Defect / Waviness">Edge Trimming Defect / Waviness</option>
                                            <option value="Color Streak / Pigment Dispersal">Color Streak / Pigment Dispersal</option>
                                            <option value="Surface Scratch / Roll Impression">Surface Scratch / Roll Impression</option>
                                            <option value="Backing Delamination">Backing Delamination</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="cr-form-grid-2" style={{ marginTop: "12px" }}>
                                    <div className="cr-field">
                                        <label>Machine (Winder / Calender)</label>
                                        <select
                                            value={form.machine_id}
                                            onChange={(e) => setForm({ ...form, machine_id: e.target.value })}
                                        >
                                            <option value="">Select Machine</option>
                                            {machines.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.machine_code} - {m.machine_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="cr-field">
                                        <label>Warehouse Storage Location</label>
                                        <input
                                            type="text"
                                            value={form.warehouse_location}
                                            onChange={(e) => setForm({ ...form, warehouse_location: e.target.value })}
                                            placeholder="e.g. ROLL-RACK-A1"
                                        />
                                    </div>
                                </div>

                                <div className="cr-field" style={{ marginTop: "12px" }}>
                                    <label>Inspection Notes & Remarks</label>
                                    <textarea
                                        rows="2"
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        placeholder="Optional operator notes, roll condition, inspection results..."
                                    />
                                </div>
                            </div>

                            <div className="cr-modal-footer">
                                <button
                                    type="button"
                                    className="cr-btn-secondary"
                                    onClick={() => setShowModal(false)}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="cr-btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : (editingRoll ? "Update Roll" : "Save Roll")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =================================================
               MODAL: BULK GENERATE ROLLS
            ================================================= */}
            {showBulkModal && (
                <div className="cr-modal-backdrop" onClick={(e) => e.target.classList.contains("cr-modal-backdrop") && setShowBulkModal(false)}>
                    <div className="cr-modal-card" style={{ maxWidth: "560px" }}>
                        <div className="cr-modal-header">
                            <div>
                                <div className="cr-eyebrow">CONTINUOUS LINE EXECUTION</div>
                                <h2>Bulk Generate Rolls</h2>
                            </div>
                            <button
                                type="button"
                                className="cr-modal-close"
                                onClick={() => setShowBulkModal(false)}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <p className="cr-modal-desc">
                            Quickly serialize and log a batch of standard production rolls produced during this extrusion or winding shift.
                        </p>

                        <form onSubmit={handleBulkSubmit} className="cr-modal-form">
                            <div className="cr-field">
                                <label>Production Order *</label>
                                <select
                                    required
                                    value={bulkForm.production_order_id}
                                    onChange={(e) => handleOrderSelect(e.target.value, true)}
                                >
                                    <option value="">Select Production Order</option>
                                    {orders.map((o) => (
                                        <option key={o.id} value={o.id}>
                                            {o.production_order_number} ({o.product_name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="cr-form-grid-3" style={{ marginTop: "14px" }}>
                                <div className="cr-field">
                                    <label>Roll Count (1-50) *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        required
                                        value={bulkForm.roll_count}
                                        onChange={(e) => setBulkForm({ ...bulkForm, roll_count: e.target.value })}
                                    />
                                </div>
                                <div className="cr-field">
                                    <label>Width (m) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={bulkForm.width_m}
                                        onChange={(e) => setBulkForm({ ...bulkForm, width_m: e.target.value })}
                                    />
                                </div>
                                <div className="cr-field">
                                    <label>Length / Roll (m) *</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={bulkForm.length_m}
                                        onChange={(e) => setBulkForm({ ...bulkForm, length_m: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="cr-form-grid-2" style={{ marginTop: "14px" }}>
                                <div className="cr-field">
                                    <label>Default Quality Grade</label>
                                    <select
                                        value={bulkForm.grade}
                                        onChange={(e) => setBulkForm({ ...bulkForm, grade: e.target.value })}
                                    >
                                        <option value="GRADE_A">Grade A (Prime)</option>
                                        <option value="GRADE_B">Grade B (Commercial)</option>
                                    </select>
                                </div>

                                <div className="cr-field">
                                    <label>Storage Bay Location</label>
                                    <input
                                        type="text"
                                        value={bulkForm.warehouse_location}
                                        onChange={(e) => setBulkForm({ ...bulkForm, warehouse_location: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="cr-modal-footer">
                                <button
                                    type="button"
                                    className="cr-btn-secondary"
                                    onClick={() => setShowBulkModal(false)}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="cr-btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? "Generating..." : `Generate ${bulkForm.roll_count || 1} Serialized Rolls`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =================================================
               MODAL: PRINTABLE ROLL LABEL / BARCODE PREVIEW
            ================================================= */}
            {selectedRollForLabel && (
                <div className="cr-modal-backdrop" onClick={(e) => e.target.classList.contains("cr-modal-backdrop") && setSelectedRollForLabel(null)}>
                    <div className="cr-label-modal">
                        <div className="cr-label-ticket">
                            <div className="cr-label-brand">
                                <div className="cr-label-logo">RAINBOW POLYMERS ERP</div>
                                <div className="cr-label-sublogo">PVC CARPET IDENTIFICATION TAG</div>
                            </div>

                            <div className="cr-label-serial-box">
                                <div className="cr-label-serial-caption">SERIALIZED ROLL IDENTIFIER</div>
                                <div className="cr-label-serial-id">{selectedRollForLabel.roll_number}</div>
                                <div className="cr-barcode-simulation">
                                    ||| | ||||| || |||||| | |||| ||| |||| | ||| |||| |
                                </div>
                                <div className="cr-label-barcode-text">*{selectedRollForLabel.barcode || selectedRollForLabel.roll_number}*</div>
                            </div>

                            <table className="cr-label-specs-table">
                                <tbody>
                                    <tr>
                                        <td>Product:</td>
                                        <td className="cr-val"><strong>{selectedRollForLabel.product_name}</strong> ({selectedRollForLabel.product_code})</td>
                                    </tr>
                                    <tr>
                                        <td>Production Order:</td>
                                        <td className="cr-val">{selectedRollForLabel.production_order_number}</td>
                                    </tr>
                                    <tr>
                                        <td>Dimensions:</td>
                                        <td className="cr-val">{selectedRollForLabel.width_m} m Width × {selectedRollForLabel.length_m} m Length</td>
                                    </tr>
                                    <tr>
                                        <td>Surface Area:</td>
                                        <td className="cr-val"><strong>{selectedRollForLabel.area_sqm} m²</strong></td>
                                    </tr>
                                    <tr>
                                        <td>Specs (Thk / GSM):</td>
                                        <td className="cr-val">{selectedRollForLabel.thickness_mm ? `${selectedRollForLabel.thickness_mm} mm` : "—"} • {selectedRollForLabel.gsm ? `${selectedRollForLabel.gsm} GSM` : "—"}</td>
                                    </tr>
                                    <tr>
                                        <td>Net Product Wt:</td>
                                        <td className="cr-val"><strong>{selectedRollForLabel.net_weight_kg || "—"} kg</strong> (Gross: {selectedRollForLabel.gross_weight_kg || "—"} kg)</td>
                                    </tr>
                                    <tr>
                                        <td>Quality Grade:</td>
                                        <td className="cr-val"><strong style={{ color: "#059669" }}>{selectedRollForLabel.grade.replace("_", " ")}</strong></td>
                                    </tr>
                                    <tr>
                                        <td>Manufacture Date:</td>
                                        <td className="cr-val">{new Date(selectedRollForLabel.created_at).toLocaleDateString()} • {selectedRollForLabel.warehouse_location || "Plant Floor"}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="cr-label-stamp-wrap">
                                <div className="cr-label-stamp">
                                    <ShieldCheck size={14} /> VERIFIED QA PASSED
                                </div>
                            </div>
                        </div>

                        <div className="cr-label-actions">
                            <button
                                type="button"
                                className="cr-btn-secondary"
                                onClick={() => setSelectedRollForLabel(null)}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                className="cr-btn-primary"
                                onClick={() => window.print()}
                            >
                                <Printer size={15} /> Print Label Tag
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
               PAGE EMBEDDED STYLES (Light Industrial Theme)
            ================================================= */}
            <style>{`
                .cr-page {
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    padding-bottom: 40px;
                }

                /* Header */
                .cr-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                }

                .cr-eyebrow {
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: #4f46e5;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                }

                .cr-header-title h1 {
                    font-size: 24px;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0 0 6px 0;
                    letter-spacing: -0.02em;
                }

                .cr-header-title p {
                    margin: 0;
                    font-size: 13px;
                    color: #64748b;
                    max-width: 650px;
                    line-height: 1.5;
                }

                .cr-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                }

                /* Buttons */
                .cr-btn-primary {
                    background: linear-gradient(135deg, #4f46e5, #4338ca);
                    color: #ffffff;
                    border: 1px solid #4338ca;
                    border-radius: 8px;
                    padding: 9px 16px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
                    transition: all 0.15s ease;
                    white-space: nowrap;
                }

                .cr-btn-primary:hover {
                    background: linear-gradient(135deg, #4338ca, #3730a3);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
                }

                .cr-btn-secondary {
                    background: #ffffff;
                    color: #334155;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    padding: 9px 14px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    transition: all 0.15s ease;
                    white-space: nowrap;
                }

                .cr-btn-secondary:hover {
                    background: #f8fafc;
                    border-color: #94a3b8;
                    color: #0f172a;
                    transform: translateY(-1px);
                }

                /* Alerts */
                .cr-alert {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 20px;
                }

                .cr-alert-success {
                    background: #ecfdf5;
                    border: 1px solid #a7f3d0;
                    color: #065f46;
                }

                .cr-alert-error {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #991b1b;
                }

                .cr-alert-icon {
                    flex-shrink: 0;
                }

                /* Summary Cards */
                .cr-summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .cr-summary-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 18px 20px;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.03);
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                }

                .cr-summary-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(15, 23, 42, 0.06);
                }

                .cr-summary-card::before {
                    content: "";
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                }

                .cr-summary-card.blue::before { background: #2563eb; }
                .cr-summary-card.sky::before { background: #0284c7; }
                .cr-summary-card.purple::before { background: #8b5cf6; }
                .cr-summary-card.teal::before { background: #0d9488; }
                .cr-summary-card.emerald::before { background: #10b981; }

                .cr-summary-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }

                .cr-summary-label {
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #64748b;
                }

                .cr-icon-bubble {
                    width: 30px;
                    height: 30px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .cr-icon-bubble.blue { background: #eff6ff; color: #2563eb; }
                .cr-icon-bubble.sky { background: #f0f9ff; color: #0284c7; }
                .cr-icon-bubble.purple { background: #f5f3ff; color: #8b5cf6; }
                .cr-icon-bubble.teal { background: #f0fdfa; color: #0d9488; }
                .cr-icon-bubble.emerald { background: #ecfdf5; color: #10b981; }

                .cr-summary-value {
                    font-size: 26px;
                    font-weight: 700;
                    color: #0f172a;
                    line-height: 1.1;
                    margin-bottom: 6px;
                    letter-spacing: -0.02em;
                    white-space: nowrap;
                }

                .cr-summary-value .cr-unit {
                    font-size: 14px;
                    font-weight: 600;
                    color: #64748b;
                }

                .cr-summary-value.highlight-green {
                    color: #059669;
                }

                .cr-summary-meta {
                    font-size: 11px;
                    color: #94a3b8;
                    font-weight: 500;
                    white-space: nowrap;
                }

                /* Filters */
                .cr-filter-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 16px 20px;
                    margin-bottom: 24px;
                    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.03);
                }

                .cr-filter-grid {
                    display: flex;
                    align-items: flex-end;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .cr-filter-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    min-width: 170px;
                }

                .cr-search-field {
                    flex: 1;
                    min-width: 240px;
                }

                .cr-filter-field label {
                    font-size: 11px;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }

                .cr-input-icon-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .cr-input-icon {
                    position: absolute;
                    left: 10px;
                    color: #94a3b8;
                    pointer-events: none;
                }

                .cr-search-field input {
                    width: 100%;
                    height: 38px;
                    padding: 0 12px 0 34px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 13px;
                    background: #ffffff;
                    color: #0f172a;
                    outline: none;
                    transition: border-color 0.15s, box-shadow 0.15s;
                }

                .cr-filter-field select {
                    height: 38px;
                    padding: 0 12px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 13px;
                    background: #ffffff;
                    color: #0f172a;
                    outline: none;
                    cursor: pointer;
                    transition: border-color 0.15s, box-shadow 0.15s;
                }

                .cr-search-field input:focus,
                .cr-filter-field select:focus {
                    border-color: #4f46e5;
                    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
                }

                .cr-filter-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .cr-btn-apply {
                    height: 38px;
                    background: #0f172a;
                    color: #ffffff;
                    border: 1px solid #0f172a;
                    border-radius: 8px;
                    padding: 0 16px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: background 0.15s;
                    white-space: nowrap;
                }

                .cr-btn-apply:hover {
                    background: #1e293b;
                }

                .cr-btn-clear {
                    height: 38px;
                    background: #f1f5f9;
                    color: #64748b;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    padding: 0 12px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    white-space: nowrap;
                }

                .cr-btn-clear:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }

                /* =================================================
                   TABLE CARD & RESPONSIVE GRID
                   ================================================= */
                .cr-table-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.03);
                    overflow: hidden;
                }

                .cr-table-header {
                    padding: 18px 24px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .cr-table-header h2 {
                    margin: 0 0 4px 0;
                    font-size: 16px;
                    font-weight: 700;
                    color: #0f172a;
                }

                .cr-table-header p {
                    margin: 0;
                    font-size: 12px;
                    color: #64748b;
                }

                .cr-count-pill {
                    background: #eef2ff;
                    color: #4f46e5;
                    font-size: 12px;
                    font-weight: 700;
                    padding: 4px 10px;
                    border-radius: 999px;
                    border: 1px solid #c7d2fe;
                }

                .cr-table-wrapper {
                    overflow-x: auto;
                    width: 100%;
                    -webkit-overflow-scrolling: touch;
                }

                /* Table layout */
                .cr-table {
                    width: 100%;
                    min-width: 1650px;
                    border-collapse: collapse;
                    text-align: left;
                    table-layout: fixed;
                }

                .cr-table th {
                    background: #f8fafc;
                    padding: 14px 18px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    border-bottom: 1px solid #e2e8f0;
                    white-space: nowrap;
                    vertical-align: middle;
                }

                .cr-table td {
                    padding: 14px 18px;
                    font-size: 13px;
                    color: #1e293b;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }

                .cr-table tr:hover td {
                    background: #fafbfc;
                }

                /* Column specific widths & styling */
                .cr-table th.col-roll,
                .cr-table td.col-roll {
                    width: 230px;
                    min-width: 230px;
                }

                .cr-table th.col-product,
                .cr-table td.col-product {
                    width: 240px;
                    min-width: 240px;
                }

                .cr-table th.col-dim,
                .cr-table td.col-dim {
                    width: 170px;
                    min-width: 170px;
                }

                .cr-table th.col-area,
                .cr-table td.col-area {
                    width: 130px;
                    min-width: 130px;
                }

                .cr-table th.col-weight,
                .cr-table td.col-weight {
                    width: 220px;
                    min-width: 220px;
                }

                .cr-table th.col-grade,
                .cr-table td.col-grade {
                    width: 160px;
                    min-width: 160px;
                }

                .cr-table th.col-loc,
                .cr-table td.col-loc {
                    width: 130px;
                    min-width: 130px;
                }

                .cr-table th.col-status,
                .cr-table td.col-status {
                    width: 130px;
                    min-width: 130px;
                }

                .cr-table th.col-actions,
                .cr-table td.col-actions {
                    width: 240px;
                    min-width: 240px;
                    text-align: right;
                }

                /* Roll Identifier pill - strictly non-wrapping */
                .cr-roll-number-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    font-size: 12px;
                    font-weight: 700;
                    color: #1e40af;
                    background: #eff6ff;
                    padding: 5px 10px;
                    border-radius: 6px;
                    border: 1px solid #bfdbfe;
                    white-space: nowrap !important;
                    word-break: keep-all !important;
                    overflow-wrap: normal !important;
                    flex-shrink: 0;
                    line-height: 1.2;
                }

                .cr-roll-number-pill span {
                    white-space: nowrap !important;
                    word-break: keep-all !important;
                }

                .cr-roll-icon {
                    color: #2563eb;
                    flex-shrink: 0;
                }

                .cr-product-title {
                    font-weight: 600;
                    color: #0f172a;
                    margin-bottom: 4px;
                    line-height: 1.3;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .cr-subtext {
                    font-size: 11px;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    margin-top: 4px;
                    white-space: nowrap !important;
                    line-height: 1.3;
                }

                .cr-po-tag {
                    color: #475569;
                    font-weight: 500;
                    white-space: nowrap !important;
                }

                .cr-spec-tag {
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: 500;
                    white-space: nowrap !important;
                }

                .cr-dim-text {
                    font-weight: 600;
                    color: #1e293b;
                    white-space: nowrap !important;
                }

                .cr-area-value {
                    font-weight: 700;
                    color: #0f172a;
                    font-size: 14px;
                    white-space: nowrap !important;
                }

                .cr-weight-net {
                    font-weight: 700;
                    color: #059669;
                    font-size: 14px;
                    white-space: nowrap !important;
                }

                /* Quality Badges */
                .cr-grade-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 4px 10px;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 700;
                    white-space: nowrap !important;
                    word-break: keep-all !important;
                    line-height: 1.2;
                    flex-shrink: 0;
                }

                .cr-grade-badge.grade-a {
                    background: #ecfdf5;
                    color: #065f46;
                    border: 1px solid #a7f3d0;
                }

                .cr-grade-badge.grade-b {
                    background: #fffbeb;
                    color: #92400e;
                    border: 1px solid #fde68a;
                }

                .cr-grade-badge.grade-c {
                    background: #fff7ed;
                    color: #9a3412;
                    border: 1px solid #fed7aa;
                }

                .cr-grade-badge.grade-scrap {
                    background: #fef2f2;
                    color: #991b1b;
                    border: 1px solid #fecaca;
                }

                .cr-grade-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .cr-grade-dot.b { background: #f59e0b; }
                .cr-grade-dot.c { background: #ea580c; }

                .cr-defect-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    color: #b91c1c;
                    font-size: 11px;
                    font-weight: 600;
                    margin-top: 4px;
                    white-space: nowrap !important;
                }

                /* Status & Location badges */
                .cr-status-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: capitalize;
                    white-space: nowrap !important;
                    word-break: keep-all !important;
                    flex-shrink: 0;
                }

                .cr-status-badge.status-produced {
                    background: #e0f2fe;
                    color: #0369a1;
                }

                .cr-status-badge.status-qc {
                    background: #fef3c7;
                    color: #92400e;
                }

                .cr-status-badge.status-approved {
                    background: #dcfce7;
                    color: #15803d;
                }

                .cr-status-badge.status-warehouse {
                    background: #f3e8ff;
                    color: #6b21a8;
                }

                .cr-status-badge.status-dispatched {
                    background: #f1f5f9;
                    color: #475569;
                }

                .cr-loc-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    color: #334155;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    padding: 4px 9px;
                    border-radius: 6px;
                    white-space: nowrap !important;
                    word-break: keep-all !important;
                    overflow-wrap: normal !important;
                    flex-shrink: 0;
                }

                .cr-loc-badge span {
                    white-space: nowrap !important;
                    word-break: keep-all !important;
                }

                .cr-loc-badge svg {
                    color: #64748b;
                    flex-shrink: 0;
                }

                /* Actions */
                .cr-row-actions {
                    display: inline-flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 6px;
                    white-space: nowrap !important;
                    flex-shrink: 0;
                }

                .cr-btn-action {
                    padding: 5px 9px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    border: 1px solid #cbd5e1;
                    background: #ffffff;
                    color: #334155;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    transition: all 0.15s ease;
                    white-space: nowrap;
                }

                .cr-btn-action:hover {
                    background: #f8fafc;
                    border-color: #94a3b8;
                    color: #0f172a;
                }

                .cr-btn-action.label {
                    background: #eef2ff;
                    border-color: #c7d2fe;
                    color: #4338ca;
                }

                .cr-btn-action.label:hover {
                    background: #e0e7ff;
                    color: #3730a3;
                }

                .cr-btn-action.qc {
                    background: #ecfdf5;
                    border-color: #a7f3d0;
                    color: #065f46;
                }

                .cr-btn-action.qc:hover {
                    background: #d1fae5;
                    color: #047857;
                }

                .cr-btn-action.stock {
                    background: #f3e8ff;
                    border-color: #d8b4fe;
                    color: #7e22ce;
                }

                .cr-btn-action.stock:hover {
                    background: #e9d5ff;
                    color: #6b21a8;
                }

                .cr-btn-action.delete {
                    color: #ef4444;
                    border-color: #fecaca;
                }

                .cr-btn-action.delete:hover {
                    background: #fee2e2;
                    color: #b91c1c;
                }

                /* Empty & Loading */
                .cr-empty-state {
                    padding: 60px 20px;
                    text-align: center;
                    color: #64748b;
                }

                .cr-empty-state h3 {
                    margin: 0 0 6px 0;
                    color: #0f172a;
                    font-size: 16px;
                }

                .cr-empty-state p {
                    margin: 0 auto 20px auto;
                    max-width: 400px;
                    font-size: 13px;
                }

                .cr-spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid #e2e8f0;
                    border-top-color: #4f46e5;
                    border-radius: 50%;
                    animation: cr-spin 0.8s linear infinite;
                    margin: 0 auto 12px auto;
                }

                .cr-spin {
                    animation: cr-spin 0.8s linear infinite;
                }

                @keyframes cr-spin {
                    to { transform: rotate(360deg); }
                }

                /* Modals */
                .cr-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                }

                .cr-modal-card {
                    background: #ffffff;
                    border-radius: 16px;
                    width: 100%;
                    max-width: 680px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
                    border: 1px solid #e2e8f0;
                }

                .cr-modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                }

                .cr-modal-header h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 700;
                    color: #0f172a;
                }

                .cr-modal-close {
                    background: #f1f5f9;
                    border: none;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    color: #64748b;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.15s;
                }

                .cr-modal-close:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }

                .cr-modal-desc {
                    padding: 16px 24px 0 24px;
                    margin: 0;
                    font-size: 13px;
                    color: #64748b;
                }

                .cr-modal-form {
                    padding: 20px 24px;
                }

                .cr-form-section {
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #f1f5f9;
                }

                .cr-form-section:last-of-type {
                    border-bottom: none;
                    margin-bottom: 0;
                    padding-bottom: 0;
                }

                .cr-form-section-title {
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: #4f46e5;
                    margin-bottom: 12px;
                }

                .cr-form-grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                }

                .cr-form-grid-3 {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 14px;
                }

                .cr-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .cr-field label {
                    font-size: 12px;
                    font-weight: 600;
                    color: #334155;
                }

                .cr-field input,
                .cr-field select,
                .cr-field textarea {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 8px 12px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 13px;
                    color: #0f172a;
                    background: #ffffff;
                    outline: none;
                    transition: border-color 0.15s, box-shadow 0.15s;
                }

                .cr-field input:focus,
                .cr-field select:focus,
                .cr-field textarea:focus {
                    border-color: #4f46e5;
                    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
                }

                .cr-calc-box {
                    padding: 8px 12px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #334155;
                    min-height: 38px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .cr-calc-num {
                    font-size: 15px;
                    font-weight: 700;
                    color: #4f46e5;
                }

                .cr-calc-box.highlight-green .cr-calc-num {
                    color: #059669;
                }

                .cr-calc-sub {
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 400;
                    margin-top: 2px;
                }

                .cr-modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 24px;
                    padding-top: 16px;
                    border-top: 1px solid #e2e8f0;
                }

                /* Label Tag Ticket Modal */
                .cr-label-modal {
                    background: #ffffff;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 500px;
                    padding: 24px;
                    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
                    border: 1px solid #e2e8f0;
                }

                .cr-label-ticket {
                    border: 2px dashed #94a3b8;
                    border-radius: 8px;
                    padding: 20px;
                    background: #ffffff;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    position: relative;
                }

                .cr-label-brand {
                    text-align: center;
                    border-bottom: 2px solid #0f172a;
                    padding-bottom: 8px;
                    margin-bottom: 14px;
                }

                .cr-label-logo {
                    font-size: 15px;
                    font-weight: 900;
                    letter-spacing: 0.1em;
                    color: #0f172a;
                }

                .cr-label-sublogo {
                    font-size: 10px;
                    font-weight: 600;
                    color: #64748b;
                }

                .cr-label-serial-box {
                    text-align: center;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 10px;
                    margin-bottom: 14px;
                }

                .cr-label-serial-caption {
                    font-size: 9px;
                    color: #64748b;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                }

                .cr-label-serial-id {
                    font-size: 20px;
                    font-weight: 900;
                    color: #0f172a;
                    letter-spacing: 0.08em;
                    margin: 4px 0;
                }

                .cr-barcode-simulation {
                    font-size: 16px;
                    letter-spacing: 4px;
                    font-weight: 900;
                    color: #1e293b;
                }

                .cr-label-barcode-text {
                    font-size: 10px;
                    color: #64748b;
                }

                .cr-label-specs-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    margin-bottom: 14px;
                }

                .cr-label-specs-table td {
                    padding: 5px 0;
                    border-bottom: 1px solid #f1f5f9;
                    color: #334155;
                }

                .cr-label-specs-table .cr-val {
                    text-align: right;
                    color: #0f172a;
                }

                .cr-label-stamp-wrap {
                    text-align: center;
                    margin-top: 10px;
                }

                .cr-label-stamp {
                    border: 2px solid #059669;
                    color: #059669;
                    font-weight: 900;
                    font-size: 12px;
                    padding: 4px 12px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    border-radius: 4px;
                    transform: rotate(-2deg);
                }

                .cr-label-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 20px;
                }

                @media (max-width: 768px) {
                    .cr-form-grid-2,
                    .cr-form-grid-3 {
                        grid-template-columns: 1fr;
                    }
                    .cr-header {
                        flex-direction: column;
                    }
                    .cr-header-actions {
                        width: 100%;
                        justify-content: flex-start;
                    }
                }
            `}</style>
        </div>
    );
};

export default CarpetRolls;
