import React, { useEffect, useMemo, useState } from "react";
import {
    Calendar,
    Clock,
    TrendingUp,
    Cpu,
    Layers,
    Package,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    Plus,
    RefreshCw,
    Sparkles,
    ChevronRight,
    ArrowRight,
    Zap,
    Factory,
    BarChart3,
    Search,
    X,
    Filter,
    Flame
} from "lucide-react";
import api from "../services/api";
import "./ProductionPlanning.css";

function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

const initialPlanForm = {
    production_order_number: "",
    sales_order_id: "",
    product_id: "",
    planned_quantity: "",
    target_quantity: "",
    production_date: new Date().toISOString().substring(0, 10),
    expected_completion_date: "",
    priority: "HIGH",
    shift: "DAY",
    supervisor_id: "",
    remarks: "Scheduled via Production Planning Control"
};

export default function ProductionPlanning() {
    const [activeTab, setActiveTab] = useState("timeline"); // "timeline" | "machines" | "backlog" | "inventory"
    const [shiftFilter, setShiftFilter] = useState("ALL"); // "ALL" | "DAY" | "NIGHT"

    const [orders, setOrders] = useState([]);
    const [machines, setMachines] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [materialAnalysis, setMaterialAnalysis] = useState([]);
    const [materialSummary, setMaterialSummary] = useState(null);
    const [materialSearch, setMaterialSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [planForm, setPlanForm] = useState(initialPlanForm);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadAllPlanningData = async () => {
        try {
            setLoading(true);
            setError("");

            const [ordersRes, machinesRes, soRes, optionsRes, prodRes, matRes] = await Promise.allSettled([
                api.get("/production-orders"),
                api.get("/machines"),
                api.get("/sales-orders"),
                api.get("/production-orders/options"),
                api.get("/products"),
                api.get("/raw-materials/analysis")
            ]);

            if (ordersRes.status === "fulfilled" && ordersRes.value.data?.success) {
                setOrders(ordersRes.value.data.data || []);
            }

            if (machinesRes.status === "fulfilled" && machinesRes.value.data?.success) {
                setMachines(machinesRes.value.data.data || []);
            }

            if (soRes.status === "fulfilled" && soRes.value.data?.success) {
                setSalesOrders(soRes.value.data.data || []);
            }

            if (optionsRes.status === "fulfilled" && optionsRes.value.data?.success) {
                setSupervisors(optionsRes.value.data.data?.supervisors || []);
            }

            if (prodRes.status === "fulfilled" && prodRes.value.data?.success) {
                setProducts(prodRes.value.data.data || []);
            }

            if (matRes.status === "fulfilled" && matRes.value.data?.success) {
                setMaterialAnalysis(matRes.value.data.data || []);
                setMaterialSummary(matRes.value.data.summary || null);
            }
        } catch (err) {
            console.error("Planning Load Error:", err);
            setError("Unable to sync planning data from plant server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllPlanningData();
    }, []);

    // Planning Metrics
    const metrics = useMemo(() => {
        const totalDemand = salesOrders.reduce((sum, so) => sum + Number(so.total_quantity || 0), 0);
        const totalPlanned = orders.reduce((sum, po) => sum + Number(po.planned_quantity || 0), 0);
        const unscheduledGap = Math.max(0, totalDemand - totalPlanned);

        const runningMachines = machines.filter((m) => m.status === "RUNNING").length;
        const totalMachines = machines.length || 1;
        const machineUtilization = Math.round((runningMachines / totalMachines) * 100);

        const goodOutput = orders.reduce((sum, po) => sum + Number(po.good_quantity || 0), 0);

        return {
            totalDemand,
            totalPlanned,
            unscheduledGap,
            runningMachines,
            totalMachines,
            machineUtilization,
            goodOutput
        };
    }, [salesOrders, orders, machines]);

    const filteredMaterials = useMemo(() => {
        if (!materialSearch) return materialAnalysis;
        const q = materialSearch.toLowerCase();
        return materialAnalysis.filter(
            (m) =>
                m.material_name?.toLowerCase().includes(q) ||
                m.material_code?.toLowerCase().includes(q) ||
                m.category_name?.toLowerCase().includes(q)
        );
    }, [materialAnalysis, materialSearch]);

    // Generate 6 Calendar Days for Weekly Timeline
    const weekDays = useMemo(() => {
        const days = [];
        const baseDate = new Date();
        baseDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < 6; i++) {
            const current = new Date(baseDate);
            current.setDate(baseDate.getDate() + i);

            const dateStr = current.toISOString().substring(0, 10);
            const dayName = current.toLocaleDateString("en-IN", { weekday: "short" });
            const dayDisplay = current.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

            // Orders matching this day
            const dayOrders = orders.filter((o) => {
                if (shiftFilter !== "ALL" && o.shift !== shiftFilter) return false;
                if (!o.production_date && !o.expected_completion_date) {
                    return i === 0; // Default to today if unassigned
                }
                const pDate = o.production_date ? o.production_date.substring(0, 10) : "";
                const eDate = o.expected_completion_date ? o.expected_completion_date.substring(0, 10) : "";
                return pDate === dateStr || (i === 0 && !pDate && eDate >= dateStr);
            });

            days.push({
                dateStr,
                dayName,
                dayDisplay,
                isToday: i === 0,
                orders: dayOrders
            });
        }
        return days;
    }, [orders, shiftFilter]);

    // Quick Plan Modal Open
    const openQuickPlan = (salesOrder = null) => {
        const nextOrderNum = `PO-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, "0")}`;
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + 7);

        let defaultProductId = "";
        let defaultQty = "";

        if (salesOrder) {
            defaultQty = salesOrder.total_quantity || "";
        }

        setPlanForm({
            production_order_number: nextOrderNum,
            sales_order_id: salesOrder ? String(salesOrder.id) : "",
            product_id: defaultProductId,
            planned_quantity: defaultQty,
            target_quantity: defaultQty,
            production_date: new Date().toISOString().substring(0, 10),
            expected_completion_date: completionDate.toISOString().substring(0, 10),
            priority: salesOrder?.priority || "HIGH",
            shift: "DAY",
            supervisor_id: supervisors.length ? String(supervisors[0].id) : "",
            remarks: salesOrder ? `Scheduled for Sales Order #${salesOrder.order_number}` : "Scheduled via Production Planning Control"
        });
        setError("");
        setShowModal(true);
    };

    const handleSavePlan = async (e) => {
        e.preventDefault();
        if (!planForm.production_order_number.trim()) {
            setError("Production order number is required.");
            return;
        }
        if (!planForm.product_id) {
            setError("Please select a target product to manufacture.");
            return;
        }
        if (!planForm.planned_quantity || Number(planForm.planned_quantity) <= 0) {
            setError("Planned quantity must be greater than zero.");
            return;
        }

        const payload = {
            production_order_number: planForm.production_order_number.trim(),
            sales_order_id: planForm.sales_order_id ? Number(planForm.sales_order_id) : null,
            product_id: Number(planForm.product_id),
            planned_quantity: Number(planForm.planned_quantity),
            target_quantity: Number(planForm.target_quantity || planForm.planned_quantity),
            production_date: planForm.production_date || null,
            expected_completion_date: planForm.expected_completion_date || null,
            priority: planForm.priority,
            shift: planForm.shift,
            supervisor_id: planForm.supervisor_id ? Number(planForm.supervisor_id) : null,
            status: "PLANNED",
            remarks: planForm.remarks?.trim() || null
        };

        try {
            setSaving(true);
            const res = await api.post("/production-orders", payload);
            if (res.data?.success) {
                setSuccess(`Plan scheduled successfully: Order ${payload.production_order_number}`);
                setShowModal(false);
                await loadAllPlanningData();
                setTimeout(() => setSuccess(""), 3500);
            } else {
                throw new Error(res.data?.message || "Failed to schedule plan.");
            }
        } catch (err) {
            console.error("Save Plan Error:", err);
            setError(err.response?.data?.message || err.message || "Failed to schedule production plan.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pp-page">
            {/* Header Card */}
            <div className="pp-header-card">
                <div className="pp-header-info">
                    <h1>
                        Production Planning & Scheduling Control
                        <span className="pp-header-badge">Control Center</span>
                    </h1>
                    <p>
                        Align customer demand with floor machinery, shift schedules, and daily line capacity.
                    </p>
                </div>
                <div className="pp-header-actions">
                    <button
                        type="button"
                        className="pp-refresh-btn"
                        onClick={loadAllPlanningData}
                        title="Sync Live Planning Data"
                    >
                        <RefreshCw size={17} className={loading ? "pp-spin" : ""} />
                    </button>
                    <button
                        type="button"
                        className="pp-btn primary"
                        onClick={() => openQuickPlan()}
                    >
                        <Plus size={16} /> Schedule New Plan
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {success && (
                <div className="pp-alert success">
                    <div className="pp-alert-content">
                        <CheckCircle2 size={16} />
                        <span>{success}</span>
                    </div>
                    <button type="button" className="pp-alert-close" onClick={() => setSuccess("")}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {error && (
                <div className="pp-alert error">
                    <div className="pp-alert-content">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                    <button type="button" className="pp-alert-close" onClick={() => setError("")}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* KPI Summary Stat Cards */}
            <div className="pp-stats-grid">
                <div className="pp-stat-card">
                    <div className="pp-stat-icon-wrap blue">
                        <TrendingUp size={20} />
                    </div>
                    <div className="pp-stat-content">
                        <span className="pp-stat-label">Sales Demand</span>
                        <div className="pp-stat-val">{formatNumber(metrics.totalDemand)}</div>
                        <span className="pp-stat-sub">From active sales orders</span>
                    </div>
                </div>

                <div className="pp-stat-card">
                    <div className="pp-stat-icon-wrap indigo">
                        <Layers size={20} />
                    </div>
                    <div className="pp-stat-content">
                        <span className="pp-stat-label">Scheduled in POs</span>
                        <div className="pp-stat-val">{formatNumber(metrics.totalPlanned)}</div>
                        <span className="pp-stat-sub">Allocated to production</span>
                    </div>
                </div>

                <div className="pp-stat-card">
                    <div className="pp-stat-icon-wrap amber">
                        <Clock size={20} />
                    </div>
                    <div className="pp-stat-content">
                        <span className="pp-stat-label">Unscheduled Gap</span>
                        <div className="pp-stat-val">{formatNumber(metrics.unscheduledGap)}</div>
                        <span className="pp-stat-sub">Pending machine assignment</span>
                    </div>
                </div>

                <div className="pp-stat-card">
                    <div className="pp-stat-icon-wrap emerald">
                        <Cpu size={20} />
                    </div>
                    <div className="pp-stat-content">
                        <span className="pp-stat-label">Line Utilization</span>
                        <div className="pp-stat-val">{metrics.machineUtilization}%</div>
                        <span className="pp-stat-sub">{metrics.runningMachines} of {metrics.totalMachines} machines running</span>
                    </div>
                </div>

                <div className="pp-stat-card">
                    <div className="pp-stat-icon-wrap purple">
                        <ShieldCheck size={20} />
                    </div>
                    <div className="pp-stat-content">
                        <span className="pp-stat-label">Good Output Yield</span>
                        <div className="pp-stat-val">{formatNumber(metrics.goodOutput)}</div>
                        <span className="pp-stat-sub">Completed finished units</span>
                    </div>
                </div>
            </div>

            {/* View Navigation Strip */}
            <div className="pp-nav-strip">
                <div className="pp-tabs">
                    <button
                        type="button"
                        className={`pp-tab-btn ${activeTab === "timeline" ? "active" : ""}`}
                        onClick={() => setActiveTab("timeline")}
                    >
                        <Calendar size={15} /> Weekly Timeline & Shifts
                        <span className="pp-tab-badge">{orders.length}</span>
                    </button>
                    <button
                        type="button"
                        className={`pp-tab-btn ${activeTab === "machines" ? "active" : ""}`}
                        onClick={() => setActiveTab("machines")}
                    >
                        <Cpu size={15} /> Machine Line Capacity
                        <span className="pp-tab-badge">{machines.length}</span>
                    </button>
                    <button
                        type="button"
                        className={`pp-tab-btn ${activeTab === "backlog" ? "active" : ""}`}
                        onClick={() => setActiveTab("backlog")}
                    >
                        <BarChart3 size={15} /> Sales Demand Backlog
                        <span className="pp-tab-badge">{salesOrders.length}</span>
                    </button>
                    <button
                        type="button"
                        className={`pp-tab-btn ${activeTab === "inventory" ? "active" : ""}`}
                        onClick={() => setActiveTab("inventory")}
                    >
                        <Layers size={15} /> Reels & 39-Margin Check
                        <span className="pp-tab-badge">{materialAnalysis.length}</span>
                    </button>
                </div>

                {activeTab === "timeline" && (
                    <div className="pp-nav-extra">
                        <span style={{ fontWeight: 600 }}>Filter Shift:</span>
                        <select
                            value={shiftFilter}
                            onChange={(e) => setShiftFilter(e.target.value)}
                            style={{
                                padding: "5px 10px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                background: "#f8fafc",
                                color: "#0f172a",
                                outline: "none"
                            }}
                        >
                            <option value="ALL">All Shifts (Day & Night)</option>
                            <option value="DAY">Day Shift Only</option>
                            <option value="NIGHT">Night Shift Only</option>
                        </select>
                    </div>
                )}
            </div>

            {/* TAB 1: WEEKLY TIMELINE & SHIFT ROSTER */}
            {activeTab === "timeline" && (
                <div className="pp-timeline-card">
                    <div className="pp-card-header">
                        <div>
                            <h3>
                                <Calendar size={18} style={{ color: "#0284c7" }} />
                                Weekly Production Scheduling Matrix
                            </h3>
                            <p>Daily shift allocation, target batch quantities, and active execution lines</p>
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <span style={{ fontSize: "0.76rem", color: "#16a34a", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a" }}></span> Live Plant Dispatch
                            </span>
                        </div>
                    </div>

                    <div className="pp-timeline-grid">
                        {weekDays.map((day) => (
                            <div key={day.dateStr} className={`pp-day-col ${day.isToday ? "is-today" : ""}`}>
                                <div className="pp-day-header">
                                    <div className="pp-day-title">
                                        <span className="pp-day-name">{day.dayName}</span>
                                        <span className="pp-day-date">{day.dayDisplay}</span>
                                    </div>
                                    {day.isToday && <span className="pp-day-badge-today">Today</span>}
                                </div>

                                {day.orders.length === 0 ? (
                                    <div className="pp-day-empty">
                                        No production scheduled
                                    </div>
                                ) : (
                                    day.orders.map((po) => {
                                        const isUrgent = po.priority === "URGENT";
                                        const isHigh = po.priority === "HIGH";
                                        return (
                                            <div
                                                key={po.id}
                                                className={`pp-order-schedule-card ${isUrgent ? "urgent-priority" : isHigh ? "high-priority" : ""}`}
                                            >
                                                <div className="pp-card-top-row">
                                                    <span className="pp-card-po">{po.production_order_number}</span>
                                                    <span className="pp-card-shift">{po.shift || "DAY"} SHIFT</span>
                                                </div>
                                                <div className="pp-card-product" title={po.product_name}>
                                                    {po.product_code}
                                                </div>
                                                <div className="pp-card-details">
                                                    <span>Target Qty</span>
                                                    <span className="pp-card-target">
                                                        <strong>{formatNumber(po.planned_quantity)}</strong> units
                                                    </span>
                                                </div>
                                                {po.sales_order_number && (
                                                    <div style={{ fontSize: "0.7rem", color: "#0284c7", fontWeight: "600", marginTop: "2px" }}>
                                                        SO: {po.sales_order_number}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: MACHINE LINE CAPACITY */}
            {activeTab === "machines" && (
                <div className="pp-machines-grid">
                    {machines.map((machine) => {
                        const statusClass = (machine.status || "IDLE").toLowerCase();
                        const isRunning = machine.status === "RUNNING";
                        const capacityPerHour = Number(machine.capacity_per_hour || 500);
                        const estimatedLoad = isRunning ? 75 : 0;

                        return (
                            <div key={machine.id} className="pp-machine-card">
                                <div className="pp-machine-head">
                                    <div className="pp-machine-title">
                                        <span className="pp-machine-code">{machine.machine_code}</span>
                                        <span className="pp-machine-name">{machine.machine_name}</span>
                                        <span className="pp-machine-type">{machine.machine_type || "Production Line"}</span>
                                    </div>
                                    <span className={`pp-status-pill ${statusClass}`}>
                                        <span className="pp-status-dot"></span>
                                        {machine.status || "IDLE"}
                                    </span>
                                </div>

                                <div className="pp-machine-metrics">
                                    <div className="pp-metric-item">
                                        <span className="pp-metric-label">Rated Capacity</span>
                                        <span className="pp-metric-val">{formatNumber(capacityPerHour)} /hr</span>
                                    </div>
                                    <div className="pp-metric-item">
                                        <span className="pp-metric-label">Model Series</span>
                                        <span className="pp-metric-val">{machine.model_number || "STD-2024"}</span>
                                    </div>
                                </div>

                                <div className="pp-utilization-wrap">
                                    <div className="pp-util-label-row">
                                        <span>Current Line Load</span>
                                        <span>{estimatedLoad}% Capacity</span>
                                    </div>
                                    <div className="pp-util-bar-bg">
                                        <div
                                            className={`pp-util-bar-fill ${estimatedLoad > 85 ? "high" : "optimal"}`}
                                            style={{ width: `${estimatedLoad}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TAB 3: SALES DEMAND & BACKLOG REGISTER */}
            {activeTab === "backlog" && (
                <div className="pp-timeline-card">
                    <div className="pp-card-header">
                        <div>
                            <h3>
                                <BarChart3 size={18} style={{ color: "#0284c7" }} />
                                Customer Demand Backlog & Planning Pipeline
                            </h3>
                            <p>Directly convert confirmed customer orders into plant production schedules</p>
                        </div>
                    </div>

                    <div className="pp-demand-table-wrap">
                        <table className="pp-table">
                            <thead>
                                <tr>
                                    <th>Sales Order</th>
                                    <th>Customer</th>
                                    <th>Order Date</th>
                                    <th>Target Delivery</th>
                                    <th>Ordered Qty</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                                            No sales orders found in the backlog.
                                        </td>
                                    </tr>
                                ) : (
                                    salesOrders.map((so) => (
                                        <tr key={so.id}>
                                            <td style={{ fontWeight: "700", color: "#0284c7" }}>
                                                {so.order_number}
                                            </td>
                                            <td>
                                                <strong style={{ color: "#0f172a" }}>{so.customer_name}</strong>
                                            </td>
                                            <td>{formatDate(so.order_date)}</td>
                                            <td style={{ color: "#475569", fontWeight: "600" }}>
                                                {formatDate(so.expected_delivery_date)}
                                            </td>
                                            <td>
                                                <strong style={{ fontSize: "0.92rem", color: "#0f172a" }}>
                                                    {formatNumber(so.total_quantity)}
                                                </strong> units
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontSize: "0.72rem",
                                                    fontWeight: "700",
                                                    padding: "2px 7px",
                                                    borderRadius: "4px",
                                                    background: so.priority === "URGENT" ? "#fee2e2" : so.priority === "HIGH" ? "#fef3c7" : "#e0f2fe",
                                                    color: so.priority === "URGENT" ? "#b91c1c" : so.priority === "HIGH" ? "#b45309" : "#0369a1"
                                                }}>
                                                    {so.priority || "NORMAL"}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontSize: "0.72rem",
                                                    fontWeight: "700",
                                                    padding: "3px 8px",
                                                    borderRadius: "20px",
                                                    background: so.status === "IN_PRODUCTION" ? "#e0e7ff" : "#f1f5f9",
                                                    color: so.status === "IN_PRODUCTION" ? "#3730a3" : "#475569"
                                                }}>
                                                    {so.status || "CONFIRMED"}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="pp-action-btn-plan"
                                                    onClick={() => openQuickPlan(so)}
                                                >
                                                    <Zap size={13} /> Plan Production
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: MATERIAL REELS & 39-MARGIN CHECK (PLANNING SECTION VIEW) */}
            {activeTab === "inventory" && (
                <div className="pp-timeline-card">
                    <div className="pp-card-header" style={{ flexWrap: "wrap", gap: "14px" }}>
                        <div>
                            <h3>
                                <Layers size={18} style={{ color: "#7c3aed" }} />
                                Raw Material Inventory & 39-Day Margin Verification
                            </h3>
                            <p>Verify live raw material stock, physical reels/nos on hand, and 15-day burn rates before committing production runs</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ position: "relative", minWidth: "260px" }}>
                                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                                <input
                                    type="text"
                                    placeholder="Search material code or name..."
                                    value={materialSearch}
                                    onChange={(e) => setMaterialSearch(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "6px 10px 6px 32px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "0.82rem",
                                        outline: "none"
                                    }}
                                />
                            </div>
                            <button
                                type="button"
                                className="pp-btn-refresh"
                                onClick={loadAllPlanningData}
                                title="Refresh inventory analysis"
                            >
                                <RefreshCw size={14} /> Sync
                            </button>
                        </div>
                    </div>

                    {/* Planning Material KPI Summary Strip */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "12px",
                        padding: "16px 20px",
                        background: "#f8fafc",
                        borderBottom: "1px solid #e2e8f0"
                    }}>
                        <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Reels / Nos in Stock</div>
                            <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#7c3aed", marginTop: "4px" }}>
                                {Number(materialSummary?.total_reels_nos || 0).toLocaleString()} <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b" }}>Reels / Nos</span>
                            </div>
                        </div>

                        <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Till Date Net Available Stock</div>
                            <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#0284c7", marginTop: "4px" }}>
                                {formatNumber(materialSummary?.total_stock_qty)} <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b" }}>Units</span>
                            </div>
                        </div>

                        <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>15-Day Inward vs Burn</div>
                            <div style={{ fontSize: "1.1rem", fontWeight: "800", marginTop: "4px", display: "flex", gap: "10px" }}>
                                <span style={{ color: "#16a34a" }}>+{materialSummary?.total_inward_15d_reels || 0} In</span>
                                <span style={{ color: "#dc2626" }}>-{materialSummary?.total_outward_15d_reels || 0} Out</span>
                            </div>
                        </div>

                        <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: "6px", border: "1px solid #e2e8f0", borderLeft: "4px solid #f59e0b" }}>
                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>39-Margin Standard Buffer</div>
                            <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#d97706", marginTop: "4px" }}>
                                {materialSummary?.avg_margin_days || 39} <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b" }}>Days</span>
                            </div>
                        </div>
                    </div>

                    <div className="pp-demand-table-wrap">
                        <table className="pp-table">
                            <thead>
                                <tr>
                                    <th>Material / Code</th>
                                    <th>Category</th>
                                    <th style={{ textAlign: "center" }}>Reels / Nos Count</th>
                                    <th style={{ textAlign: "right" }}>Net Available Stock</th>
                                    <th style={{ textAlign: "center" }}>15-Day Inward (Add)</th>
                                    <th style={{ textAlign: "center" }}>15-Day Burn</th>
                                    <th style={{ textAlign: "right" }}>Daily Burn Rate</th>
                                    <th style={{ textAlign: "center" }}>Margin Buffer</th>
                                    <th style={{ textAlign: "center" }}>Line Feasibility</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMaterials.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                                            No raw materials found matching filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMaterials.map((mat) => {
                                        const isCritical = mat.margin_days < 20 || mat.status === "CRITICAL";
                                        const isWarning = !isCritical && mat.margin_days < 39;
                                        return (
                                            <tr key={mat.id}>
                                                <td>
                                                    <strong style={{ color: "#0f172a" }}>{mat.material_name}</strong>
                                                    <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "2px" }}>
                                                        <span style={{ fontWeight: "700", color: "#7c3aed" }}>{mat.material_code}</span>
                                                        {mat.grade && ` • ${mat.grade}`}
                                                        {mat.gsm && ` • ${mat.gsm} GSM`}
                                                        {mat.width_mm && ` • ${mat.width_mm}mm`}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: "0.75rem", padding: "2px 7px", borderRadius: "4px", background: "#f1f5f9", color: "#475569", fontWeight: "600" }}>
                                                        {mat.category_name}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: "center" }}>
                                                    <span style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                        padding: "3px 8px",
                                                        borderRadius: "12px",
                                                        background: "#ede9fe",
                                                        color: "#6d28d9",
                                                        fontWeight: "700",
                                                        fontSize: "0.8rem"
                                                    }}>
                                                        <Package size={12} />
                                                        {mat.current_reels_nos} Nos / Reels
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    <strong style={{ color: isCritical ? "#dc2626" : "#0f172a", fontSize: "0.9rem" }}>
                                                        {formatNumber(mat.current_stock_qty)}
                                                    </strong>{" "}
                                                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{mat.unit_symbol}</span>
                                                </td>
                                                <td style={{ textAlign: "center" }}>
                                                    <span style={{ color: "#16a34a", fontWeight: "700", fontSize: "0.82rem" }}>
                                                        +{mat.inward_15d_reels} Reels
                                                    </span>
                                                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                                        +{formatNumber(mat.inward_15d_qty)} {mat.unit_symbol}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: "center" }}>
                                                    <span style={{ color: "#dc2626", fontWeight: "700", fontSize: "0.82rem" }}>
                                                        -{mat.outward_15d_reels} Reels
                                                    </span>
                                                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                                        -{formatNumber(mat.outward_15d_qty)} {mat.unit_symbol}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: "right", fontSize: "0.82rem", color: "#475569" }}>
                                                    <strong>{mat.daily_consumption}</strong> {mat.unit_symbol}/d
                                                </td>
                                                <td style={{ textAlign: "center" }}>
                                                    <span style={{
                                                        padding: "3px 8px",
                                                        borderRadius: "4px",
                                                        fontWeight: "700",
                                                        fontSize: "0.8rem",
                                                        background: isCritical ? "#fee2e2" : isWarning ? "#fef3c7" : "#dcfce7",
                                                        color: isCritical ? "#b91c1c" : isWarning ? "#b45309" : "#15803d"
                                                    }}>
                                                        {mat.margin_days} Days
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: "center" }}>
                                                    <span style={{
                                                        fontSize: "0.72rem",
                                                        fontWeight: "700",
                                                        padding: "3px 9px",
                                                        borderRadius: "20px",
                                                        background: isCritical ? "#fee2e2" : isWarning ? "#fef3c7" : "#dcfce7",
                                                        color: isCritical ? "#991b1b" : isWarning ? "#92400e" : "#166534"
                                                    }}>
                                                        {isCritical ? "REORDER REQUIRED" : isWarning ? "BUFFER TIGHT" : "READY TO SCHEDULE"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* QUICK PLAN SCHEDULING MODAL */}
            {showModal && (
                <div className="pp-modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pp-modal-header">
                            <h2>Schedule Production Work Order</h2>
                            <button
                                type="button"
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
                                onClick={() => setShowModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan}>
                            <div className="pp-modal-body">
                                <div className="pp-form-grid">
                                    <div className="pp-form-group">
                                        <label>Production Order # *</label>
                                        <input
                                            type="text"
                                            value={planForm.production_order_number}
                                            onChange={(e) => setPlanForm({ ...planForm, production_order_number: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="pp-form-group">
                                        <label>Linked Sales Order</label>
                                        <select
                                            value={planForm.sales_order_id}
                                            onChange={(e) => setPlanForm({ ...planForm, sales_order_id: e.target.value })}
                                        >
                                            <option value="">None (Independent Stock Build)</option>
                                            {salesOrders.map((so) => (
                                                <option key={so.id} value={so.id}>
                                                    {so.order_number} — {so.customer_name} ({formatNumber(so.total_quantity)} units)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pp-form-group full-width">
                                        <label>Target Product to Manufacture *</label>
                                        <select
                                            value={planForm.product_id}
                                            onChange={(e) => setPlanForm({ ...planForm, product_id: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Select Product --</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.product_code} — {p.product_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pp-form-group">
                                        <label>Planned Batch Quantity *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={planForm.planned_quantity}
                                            onChange={(e) => setPlanForm({
                                                ...planForm,
                                                planned_quantity: e.target.value,
                                                target_quantity: e.target.value
                                            })}
                                            required
                                        />
                                    </div>

                                    <div className="pp-form-group">
                                        <label>Allocated Shift *</label>
                                        <select
                                            value={planForm.shift}
                                            onChange={(e) => setPlanForm({ ...planForm, shift: e.target.value })}
                                        >
                                            <option value="DAY">Day Shift (08:00 - 17:00)</option>
                                            <option value="NIGHT">Night Shift (20:00 - 05:00)</option>
                                            <option value="GENERAL">General Shift</option>
                                        </select>
                                    </div>

                                    <div className="pp-form-group">
                                        <label>Production Start Date *</label>
                                        <input
                                            type="date"
                                            value={planForm.production_date}
                                            onChange={(e) => setPlanForm({ ...planForm, production_date: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="pp-form-group">
                                        <label>Target Completion Date</label>
                                        <input
                                            type="date"
                                            value={planForm.expected_completion_date}
                                            onChange={(e) => setPlanForm({ ...planForm, expected_completion_date: e.target.value })}
                                        />
                                    </div>

                                    <div className="pp-form-group">
                                        <label>Priority</label>
                                        <select
                                            value={planForm.priority}
                                            onChange={(e) => setPlanForm({ ...planForm, priority: e.target.value })}
                                        >
                                            <option value="NORMAL">Normal</option>
                                            <option value="HIGH">High Priority</option>
                                            <option value="URGENT">Urgent (Express Line)</option>
                                        </select>
                                    </div>

                                    <div className="pp-form-group">
                                        <label>Shift Supervisor</label>
                                        <select
                                            value={planForm.supervisor_id}
                                            onChange={(e) => setPlanForm({ ...planForm, supervisor_id: e.target.value })}
                                        >
                                            <option value="">-- Assign Supervisor --</option>
                                            {supervisors.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pp-form-group full-width">
                                        <label>Scheduling Remarks / Machine Routing Notes</label>
                                        <textarea
                                            rows="2"
                                            value={planForm.remarks}
                                            onChange={(e) => setPlanForm({ ...planForm, remarks: e.target.value })}
                                            placeholder="Enter any line or tooling instructions..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pp-modal-footer">
                                <button
                                    type="button"
                                    className="pp-btn"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="pp-btn primary"
                                    disabled={saving}
                                >
                                    {saving ? "Scheduling..." : "Confirm & Schedule Order"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
