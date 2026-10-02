import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Activity,
    Play,
    CheckCircle2,
    Clock,
    Layers,
    Package,
    AlertCircle,
    Check,
    X,
    RefreshCw,
    Gauge,
    Cpu,
    ArrowRight,
    TrendingUp,
    ShieldAlert,
    SlidersHorizontal,
    Box
} from "lucide-react";
import api from "../services/api";
import "./ProductionExecution.css";

export default function ProductionExecution() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState("");

    const [order, setOrder] = useState(null);
    const [processes, setProcesses] = useState([]);

    const [loadingOrders, setLoadingOrders] = useState(true);
    const [loadingExecution, setLoadingExecution] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // Modal state for recording stage completion
    const [completeModal, setCompleteModal] = useState(null);
    const [form, setForm] = useState({
        input_quantity: "",
        good_quantity: "",
        rejected_quantity: "",
        wastage_quantity: "",
        remarks: ""
    });

    // Auto-dismiss alert notifications
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(""), 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(""), 6000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // Initial load
    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async (selectSpecificId = null) => {
        try {
            setLoadingOrders(true);
            const res = await api.get("/production-orders");
            if (res.data?.success) {
                const list = res.data.data || [];
                setOrders(list);

                // Auto-select order if none is selected
                const targetId = selectSpecificId || selectedOrderId;
                if (targetId && list.some(o => String(o.id) === String(targetId))) {
                    loadProductionExecution(targetId);
                } else if (list.length > 0) {
                    const defaultOrder = list.find(o => o.status === "IN_PROGRESS") || list[0];
                    setSelectedOrderId(defaultOrder.id);
                    loadProductionExecution(defaultOrder.id);
                }
            }
        } catch (err) {
            console.error("Failed to load production orders", err);
            setError("Could not load production orders.");
        } finally {
            setLoadingOrders(false);
        }
    };

    const loadProductionExecution = useCallback(async (orderId) => {
        if (!orderId) {
            setOrder(null);
            setProcesses([]);
            return;
        }

        try {
            setLoadingExecution(true);
            setError("");

            const [orderResponse, processResponse] = await Promise.all([
                api.get(`/production-orders/${orderId}`),
                api.get(`/production-order-processes/order/${orderId}`)
            ]);

            if (orderResponse.data?.success) {
                setOrder(orderResponse.data.data);
            }

            if (processResponse.data?.success && processResponse.data.data?.length > 0) {
                setProcesses(processResponse.data.data);
            } else {
                // Auto-generate if missing
                try {
                    const genRes = await api.post(`/production-order-processes/order/${orderId}/generate`);
                    if (genRes.data?.success) {
                        const refreshed = await api.get(`/production-order-processes/order/${orderId}`);
                        if (refreshed.data?.success) {
                            setProcesses(refreshed.data.data || []);
                        }
                    }
                } catch {
                    setProcesses([]);
                }
            }
        } catch (err) {
            console.error("Execution load error", err);
            setError("Unable to load execution process stages.");
        } finally {
            setLoadingExecution(false);
        }
    }, []);

    const handleSelectOrder = (orderId) => {
        if (!orderId || String(orderId) === String(selectedOrderId)) return;
        setSelectedOrderId(orderId);
        loadProductionExecution(orderId);
    };

    // Calculate shop-floor KPIs
    const floorKpis = useMemo(() => {
        const activeCount = orders.filter(o => o.status === "IN_PROGRESS").length;
        const totalGoodProduced = orders.reduce((sum, o) => sum + (Number(o.good_quantity) || 0), 0);
        const avgYield = orders.length > 0
            ? (orders.reduce((sum, o) => sum + (Number(o.yield_percentage) || 100), 0) / orders.length).toFixed(1)
            : "100";
        const totalDowntime = orders.reduce((sum, o) => sum + (Number(o.downtime_minutes) || 0), 0);

        return {
            activeCount,
            totalGoodProduced,
            avgYield,
            totalDowntime
        };
    }, [orders]);

    // Start Process
    const handleStartProcess = async (processId) => {
        try {
            setActionLoading(true);
            setError("");
            setMessage("");

            const res = await api.post(`/production-order-processes/${processId}/start`);
            if (res.data?.success) {
                setMessage("Process stage started. Workstation timer activated.");
                await loadProductionExecution(selectedOrderId);
                await loadOrders(selectedOrderId);
            }
        } catch (err) {
            console.error("Start process error", err);
            setError(err.response?.data?.message || "Unable to start process.");
        } finally {
            setActionLoading(false);
        }
    };

    // Open Complete Modal
    const openCompleteModal = (proc) => {
        setCompleteModal(proc);
        const defaultInput = Number(proc.input_quantity || 0) > 0
            ? proc.input_quantity
            : (order?.planned_quantity || proc.planned_quantity || "");

        setForm({
            input_quantity: String(defaultInput),
            good_quantity: proc.good_quantity && Number(proc.good_quantity) > 0 ? String(proc.good_quantity) : String(defaultInput),
            rejected_quantity: proc.rejected_quantity ? String(proc.rejected_quantity) : "0",
            wastage_quantity: proc.wastage_quantity ? String(proc.wastage_quantity) : "0",
            remarks: proc.remarks || ""
        });
    };

    // Submit Complete Process
    const handleCompleteSubmit = async (e) => {
        e.preventDefault();
        if (!completeModal) return;

        const input = Number(form.input_quantity || 0);
        const good = Number(form.good_quantity || 0);
        const rejected = Number(form.rejected_quantity || 0);
        const wastage = Number(form.wastage_quantity || 0);

        if (input <= 0) {
            setError("Input quantity must be greater than zero.");
            return;
        }

        if (good < 0 || rejected < 0 || wastage < 0) {
            setError("Quantities cannot be negative.");
            return;
        }

        if ((good + rejected + wastage) > input) {
            setError("Good + Rejected + Wastage quantity cannot exceed input quantity.");
            return;
        }

        try {
            setActionLoading(true);
            setError("");

            const res = await api.post(`/production-order-processes/${completeModal.id}/complete`, {
                input_quantity: input,
                good_quantity: good,
                rejected_quantity: rejected,
                wastage_quantity: wastage,
                remarks: form.remarks
            });

            if (res.data?.success) {
                setMessage(`Stage #${completeModal.sequence_no} (${completeModal.process_name}) recorded as completed.`);
                setCompleteModal(null);
                await loadProductionExecution(selectedOrderId);
                await loadOrders(selectedOrderId);
            }
        } catch (err) {
            console.error("Complete process error", err);
            setError(err.response?.data?.message || "Failed to complete process.");
        } finally {
            setActionLoading(false);
        }
    };

    // Check if stage is eligible to start
    const canStartStage = (stage, idx) => {
        if (stage.process_status !== "PENDING") return false;
        if (idx === 0) return true;
        const prev = processes[idx - 1];
        return prev && prev.process_status === "COMPLETED";
    };

    const formatNum = (val) => {
        if (!val || Number(val) === 0) return "0";
        const n = Number(val);
        return n % 1 === 0 ? n.toLocaleString("en-IN") : n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
    };

    return (
        <div className="pe-page">
            {/* Header Card */}
            <div className="pe-header-card">
                <div className="pe-header-info">
                    <div className="pe-eyebrow">
                        <Activity size={14} /> MANUFACTURING / SHOP FLOOR EXECUTION
                    </div>
                    <h1>Production Execution & Line Tracking</h1>
                    <p>
                        Track stage-by-stage line execution, record workstation input/output, and manage shift changeovers in real time.
                    </p>
                </div>

                <div className="pe-header-actions">
                    <button
                        type="button"
                        className="pe-refresh-btn"
                        onClick={() => loadOrders(selectedOrderId)}
                        title="Refresh Execution Status"
                        disabled={loadingOrders || loadingExecution}
                    >
                        <RefreshCw size={14} className={loadingOrders || loadingExecution ? "pe-spin" : ""} />
                    </button>

                    <button
                        type="button"
                        className="pe-btn secondary"
                        onClick={() => navigate("/production-planning")}
                        title="View Production Schedule & Plans"
                    >
                        <SlidersHorizontal size={14} /> Production Planning
                    </button>

                    <button
                        type="button"
                        className="pe-btn primary"
                        onClick={() => navigate("/production-entry")}
                        title="Quick Daily Production Entry"
                    >
                        <TrendingUp size={14} /> Production Entry
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div className="pe-alert error">
                    <div className="pe-alert-content">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                    <button type="button" className="pe-alert-close" onClick={() => setError("")}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {message && (
                <div className="pe-alert success">
                    <div className="pe-alert-content">
                        <CheckCircle2 size={16} />
                        <span>{message}</span>
                    </div>
                    <button type="button" className="pe-alert-close" onClick={() => setMessage("")}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Shop Floor KPI Summary */}
            <div className="pe-stats-grid">
                <div className="pe-stat-card">
                    <div className="pe-stat-icon-wrap blue">
                        <Package size={20} />
                    </div>
                    <div className="pe-stat-content">
                        <span className="pe-stat-label">Active Orders</span>
                        <div className="pe-stat-val">{floorKpis.activeCount} In Production</div>
                        <span className="pe-stat-sub">{orders.length} total scheduled orders</span>
                    </div>
                </div>

                <div className="pe-stat-card">
                    <div className="pe-stat-icon-wrap emerald">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="pe-stat-content">
                        <span className="pe-stat-label">Good Output Produced</span>
                        <div className="pe-stat-val">{formatNum(floorKpis.totalGoodProduced)} pcs</div>
                        <span className="pe-stat-sub">Across all factory lines</span>
                    </div>
                </div>

                <div className="pe-stat-card">
                    <div className="pe-stat-icon-wrap amber">
                        <Gauge size={20} />
                    </div>
                    <div className="pe-stat-content">
                        <span className="pe-stat-label">Average Line Yield</span>
                        <div className="pe-stat-val">{floorKpis.avgYield}%</div>
                        <span className="pe-stat-sub">Quality compliance rate</span>
                    </div>
                </div>

                <div className="pe-stat-card">
                    <div className="pe-stat-icon-wrap purple">
                        <Clock size={20} />
                    </div>
                    <div className="pe-stat-content">
                        <span className="pe-stat-label">Factory Downtime</span>
                        <div className="pe-stat-val">{floorKpis.totalDowntime} min</div>
                        <span className="pe-stat-sub">Logged changeover / stoppage</span>
                    </div>
                </div>
            </div>

            {/* Order Selector & Quick Tabs Card */}
            <div className="pe-order-picker-card">
                <div className="pe-picker-header">
                    <div className="pe-picker-title">
                        <label>Select Production Order to Execute</label>
                        <span>Choose an order to view workstations, start operations, or record completed quantities</span>
                    </div>

                    <select
                        className="pe-select-input"
                        value={selectedOrderId}
                        onChange={(e) => handleSelectOrder(e.target.value)}
                        disabled={loadingOrders}
                    >
                        <option value="">-- Choose Production Order --</option>
                        {orders.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.production_order_number} | {o.product_code || o.product_name} | {o.status}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Quick Switch Order Cards */}
                {orders.length > 0 && (
                    <div className="pe-order-chips">
                        {orders.map((o) => {
                            const isSelected = String(o.id) === String(selectedOrderId);
                            const pct = Number(o.production_percentage) || 0;
                            return (
                                <div
                                    key={o.id}
                                    className={`pe-order-chip ${isSelected ? "active" : ""}`}
                                    onClick={() => handleSelectOrder(o.id)}
                                >
                                    <div className="pe-chip-top">
                                        <span className="pe-chip-num">{o.production_order_number}</span>
                                        <span className={`pe-chip-status ${String(o.status || 'PLANNED').toLowerCase().replace('_', '-')}`}>
                                            {o.status}
                                        </span>
                                    </div>
                                    <div className="pe-chip-prod" title={o.product_name}>
                                        {o.product_code ? `[${o.product_code}] ` : ""}{o.product_name}
                                    </div>
                                    <div className="pe-chip-bar">
                                        <div
                                            className="pe-chip-bar-fill"
                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ACTIVE ORDER EXECUTION WORKSPACE */}
            {order && (
                <>
                    {/* Active Order Executive Banner */}
                    <div className="pe-banner-card">
                        <div className="pe-banner-main">
                            <div className="pe-banner-title">
                                <h2>{order.product_name}</h2>
                                {order.product_code && (
                                    <span className="pe-banner-sku">{order.product_code}</span>
                                )}
                            </div>
                            <div className="pe-banner-meta">
                                <span>Order: <strong>{order.production_order_number}</strong></span>
                                {order.sales_order_number && (
                                    <span>Sales Ref: <strong>{order.sales_order_number}</strong></span>
                                )}
                                <span>Shift: <strong>{order.shift || "DAY"}</strong></span>
                                <span>Target: <strong>{formatNum(order.planned_quantity || order.target_quantity)} pcs</strong></span>
                                <span>Good Output: <strong style={{ color: "#16a34a" }}>{formatNum(order.good_quantity)} pcs</strong></span>
                                {Number(order.rejected_quantity) > 0 && (
                                    <span style={{ color: "#dc2626" }}>Scrap: <strong>{formatNum(order.rejected_quantity)} pcs</strong></span>
                                )}
                            </div>
                        </div>

                        <div className="pe-banner-progress-wrap">
                            <div className="pe-banner-prog-text">
                                <span style={{ color: "#64748b" }}>Progress</span>
                                <span style={{ color: "#0284c7" }}>
                                    {Number(order.production_percentage || 0).toFixed(1)}% Complete
                                </span>
                            </div>
                            <div className="pe-prog-track">
                                <div
                                    className="pe-prog-fill"
                                    style={{ width: `${Math.min(Number(order.production_percentage) || 0, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Interactive Sequence Flow Ribbon */}
                    {processes.length > 0 && (
                        <div className="pe-pipeline-card">
                            <div className="pe-pipeline-title">
                                <h3>
                                    <Layers size={16} color="#0284c7" /> Sequential Stage Progression
                                </h3>
                                <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                                    {processes.filter(p => p.process_status === "COMPLETED").length} of {processes.length} stages completed
                                </span>
                            </div>

                            <div className="pe-pipeline-flow">
                                {processes.map((p, idx) => (
                                    <React.Fragment key={p.id}>
                                        <div className={`pe-flow-step ${p.process_status.toLowerCase()}`}>
                                            <div className="pe-flow-num">
                                                <span>STAGE {String(p.sequence_no).padStart(2, "0")}</span>
                                                {p.process_status === "RUNNING" && <span className="pe-pulse-dot" />}
                                                {p.process_status === "COMPLETED" && <Check size={12} color="#16a34a" />}
                                            </div>
                                            <div className="pe-flow-name">{p.process_name}</div>
                                            <div className="pe-flow-machine">
                                                {p.machine_code ? `[${p.machine_code}] ` : ""}{p.machine_name || "Any Station"}
                                            </div>
                                        </div>
                                        {idx < processes.length - 1 && (
                                            <ArrowRight size={16} className="pe-flow-arrow" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Process Stages Execution List */}
                    <div className="pe-stages-card">
                        <div className="pe-stages-header">
                            <h3>Manufacturing Workstations & Step Execution</h3>
                            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                                Start machines sequentially; output transfers to subsequent downstream stages.
                            </span>
                        </div>

                        {loadingExecution ? (
                            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                                <RefreshCw size={24} className="pe-spin" style={{ margin: "0 auto 8px" }} />
                                <strong>Loading Live Execution Stages...</strong>
                            </div>
                        ) : processes.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                                <Box size={32} color="#cbd5e1" style={{ margin: "0 auto 8px" }} />
                                <strong>No Process Flow Generated</strong>
                                <p style={{ fontSize: "0.8rem", margin: "4px 0 12px" }}>
                                    Process routing stages have not been linked to this production order.
                                </p>
                                <button
                                    type="button"
                                    className="pe-btn primary"
                                    onClick={() => loadProductionExecution(selectedOrderId)}
                                >
                                    Generate Process Flow
                                </button>
                            </div>
                        ) : (
                            processes.map((proc, idx) => {
                                const isRunning = proc.process_status === "RUNNING";
                                const isCompleted = proc.process_status === "COMPLETED";
                                const isPending = proc.process_status === "PENDING";
                                const eligibleToStart = canStartStage(proc, idx);

                                return (
                                    <div
                                        key={proc.id}
                                        className={`pe-stage-card ${proc.process_status.toLowerCase()}`}
                                    >
                                        <div className="pe-stage-num-wrap">
                                            {isCompleted ? <Check size={16} /> : String(proc.sequence_no).padStart(2, "0")}
                                        </div>

                                        <div className="pe-stage-main">
                                            <div className="pe-stage-top">
                                                <span className="pe-stage-name">{proc.process_name}</span>
                                                {proc.department && (
                                                    <span className="pe-stage-dept">{proc.department}</span>
                                                )}
                                                <span className={`pe-status-pill ${proc.process_status.toLowerCase()}`}>
                                                    {isRunning && <span className="pe-pulse-dot" />}
                                                    {proc.process_status}
                                                </span>
                                            </div>

                                            <div className="pe-stage-machine">
                                                {proc.machine_name ? (
                                                    <>
                                                        <span className="pe-machine-tag">{proc.machine_code || "WORK-CTR"}</span>
                                                        <span>{proc.machine_name}</span>
                                                    </>
                                                ) : (
                                                    <span style={{ fontStyle: "italic", color: "#94a3b8" }}>Manual / Unassigned Station</span>
                                                )}
                                            </div>

                                            <div className="pe-stage-metrics">
                                                <div className="pe-metric-item">
                                                    <span className="pe-metric-lbl">Target</span>
                                                    <span className="pe-metric-val">{formatNum(proc.planned_quantity)} pcs</span>
                                                </div>
                                                <div className="pe-metric-item">
                                                    <span className="pe-metric-lbl">Input</span>
                                                    <span className="pe-metric-val">{formatNum(proc.input_quantity)} pcs</span>
                                                </div>
                                                <div className="pe-metric-item">
                                                    <span className="pe-metric-lbl">Good Output</span>
                                                    <span className="pe-metric-val" style={{ color: "#16a34a" }}>
                                                        {formatNum(proc.good_quantity)} pcs
                                                    </span>
                                                </div>
                                                <div className="pe-metric-item">
                                                    <span className="pe-metric-lbl">Rejected</span>
                                                    <span className="pe-metric-val" style={{ color: Number(proc.rejected_quantity) > 0 ? "#dc2626" : "#64748b" }}>
                                                        {formatNum(proc.rejected_quantity)} pcs
                                                    </span>
                                                </div>
                                                {proc.remarks && (
                                                    <div className="pe-metric-item" style={{ maxWidth: "200px" }}>
                                                        <span className="pe-metric-lbl">Remarks</span>
                                                        <span className="pe-metric-val" style={{ fontWeight: 500, fontSize: "0.74rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                            {proc.remarks}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pe-stage-actions">
                                            {isPending && (
                                                <button
                                                    type="button"
                                                    className="pe-action-btn start"
                                                    disabled={!eligibleToStart || actionLoading}
                                                    onClick={() => handleStartProcess(proc.id)}
                                                    title={eligibleToStart ? "Start this manufacturing stage" : "Previous stage must be completed first"}
                                                >
                                                    <Play size={14} /> Start Stage
                                                </button>
                                            )}

                                            {isRunning && (
                                                <button
                                                    type="button"
                                                    className="pe-action-btn complete"
                                                    disabled={actionLoading}
                                                    onClick={() => openCompleteModal(proc)}
                                                    title="Record output and complete stage"
                                                >
                                                    <CheckCircle2 size={14} /> Record & Complete
                                                </button>
                                            )}

                                            {isCompleted && (
                                                <span style={{ fontSize: "0.76rem", color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                                                    <CheckCircle2 size={16} /> Stage Finished
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {/* COMPLETE & RECORD OUTPUT MODAL */}
            {completeModal && (
                <div className="pe-modal-backdrop" onClick={() => setCompleteModal(null)}>
                    <div className="pe-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="pe-modal-header">
                            <div>
                                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#0284c7", textTransform: "uppercase" }}>
                                    STAGE #{completeModal.sequence_no} COMPLETION
                                </span>
                                <h2>{completeModal.process_name}</h2>
                            </div>
                            <button
                                type="button"
                                className="pe-modal-close"
                                onClick={() => setCompleteModal(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCompleteSubmit}>
                            <div className="pe-modal-body">
                                <div style={{
                                    background: "#f0f9ff",
                                    padding: "10px 14px",
                                    borderRadius: "6px",
                                    fontSize: "0.78rem",
                                    color: "#0369a1",
                                    border: "1px solid #bae6fd"
                                }}>
                                    Record finished units from this machine. Good output will be forwarded to the next workstation.
                                </div>

                                <div className="pe-form-grid-2">
                                    <div className="pe-field">
                                        <label>Input Quantity (pcs / rolls) *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={form.input_quantity}
                                            onChange={(e) => setForm({ ...form, input_quantity: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="pe-field">
                                        <label>Good Finished Quantity *</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.good_quantity}
                                            onChange={(e) => setForm({ ...form, good_quantity: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="pe-form-grid-2">
                                    <div className="pe-field">
                                        <label>Rejected / Defective (pcs)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.rejected_quantity}
                                            onChange={(e) => setForm({ ...form, rejected_quantity: e.target.value })}
                                        />
                                    </div>

                                    <div className="pe-field">
                                        <label>Scrap / Edge Trim Wastage (pcs)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.wastage_quantity}
                                            onChange={(e) => setForm({ ...form, wastage_quantity: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pe-field">
                                    <label>Operator & Quality Remarks (Optional)</label>
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Clean knife cut, standard cure temperature maintained at 180°C."
                                        value={form.remarks}
                                        onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pe-modal-actions">
                                <button
                                    type="button"
                                    className="pe-btn secondary"
                                    onClick={() => setCompleteModal(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="pe-action-btn complete"
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? "Saving Output..." : "Confirm & Complete Stage"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}