import React, { useEffect, useState } from "react";
import api from "../services/api";
import {
    Activity,
    RefreshCw,
    Layers,
    Clock,
    CheckCircle2,
    PlayCircle,
    Boxes,
    Cpu,
    Sparkles,
    ChevronRight,
    FlaskConical
} from "lucide-react";
import "./Customers.css";

export default function WIP() {
    const [data, setData] = useState({
        active_orders: [],
        active_paste_mixes: [],
        kpis: {
            total_wip_orders: 0,
            total_wip_quantity: 0,
            active_mix_batches: 0
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchWIP = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await api.get("/inventory/wip");
            if (res.data?.success) {
                setData(res.data.data);
            }
        } catch (err) {
            console.error("WIP fetch error:", err);
            setError("Failed to load WIP status.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWIP();
        const interval = setInterval(fetchWIP, 10000);
        return () => clearInterval(interval);
    }, []);

    const { active_orders = [], active_paste_mixes = [], kpis = {} } = data;

    return (
        <div className="customers-page">
            {/* Header */}
            <div className="customers-header-card">
                <div className="customers-header-info">
                    <h1>Work In Progress (WIP) Tracking</h1>
                    <p>Live plant floor batches moving across Plastisol Mixing, Extrusion, Curing, Die-Cutting, and Winding.</p>
                </div>

                <div className="customers-header-actions">
                    <button
                        className="cust-refresh-btn"
                        onClick={fetchWIP}
                        title="Refresh WIP Status"
                        type="button"
                    >
                        <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="cust-alert error">
                    <span>{error}</span>
                </div>
            )}

            {/* KPI Summary Cards */}
            <div className="customers-stats-grid">
                <div className="cust-stat-card">
                    <div className="cust-stat-icon blue">
                        <Activity size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Active WIP Orders</span>
                        <span className="cust-stat-value">{kpis.total_wip_orders || 0}</span>
                    </div>
                </div>

                <div className="cust-stat-card">
                    <div className="cust-stat-icon green">
                        <Boxes size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">In-Flight Production Qty</span>
                        <span className="cust-stat-value">{Number(kpis.total_wip_quantity || 0).toLocaleString()}</span>
                    </div>
                </div>

                <div className="cust-stat-card">
                    <div className="cust-stat-icon purple">
                        <FlaskConical size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Paste Mixing Batches</span>
                        <span className="cust-stat-value">{kpis.active_mix_batches || 0}</span>
                    </div>
                </div>
            </div>

            {/* Active Production Orders WIP Pipeline */}
            <div className="customers-table-card" style={{ padding: "20px" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a", marginBottom: "16px" }}>
                    Active Order Stage Pipelines ({active_orders.length})
                </h2>

                {loading && active_orders.length === 0 ? (
                    <div className="cust-table-empty">
                        <RefreshCw size={24} className="animate-spin text-slate-400" />
                        <p>Scanning shopfloor pipelines...</p>
                    </div>
                ) : active_orders.length === 0 ? (
                    <div className="cust-table-empty">
                        <Activity size={36} className="text-slate-300" />
                        <p>No active production orders currently in WIP. Create a new order to initiate the line.</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {active_orders.map((order) => (
                            <div
                                key={order.id}
                                style={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "10px",
                                    padding: "16px 20px",
                                    background: "#f8fafc"
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                    <div>
                                        <span className="cust-code-badge" style={{ marginRight: "8px" }}>{order.production_order_number}</span>
                                        <strong style={{ fontSize: "1rem", color: "#0f172a" }}>{order.product_name}</strong>
                                        <span style={{ fontSize: "0.85rem", color: "#64748b", marginLeft: "10px" }}>
                                            Target: {Number(order.target_quantity).toLocaleString()} {order.unit_symbol || "PCS"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <span className="cust-status-pill active">{order.order_status}</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#2563eb" }}>
                                            {order.progress_percentage}% Done
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden", marginBottom: "14px" }}>
                                    <div
                                        style={{
                                            width: `${order.progress_percentage}%`,
                                            height: "100%",
                                            background: "linear-gradient(90deg, #3b82f6, #10b981)",
                                            transition: "width 0.3s ease"
                                        }}
                                    />
                                </div>

                                {/* Multi-stage Stepper */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                    {order.stages && order.stages.map((stg) => (
                                        <div
                                            key={stg.id}
                                            style={{
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                fontSize: "0.8rem",
                                                fontWeight: "600",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                border: "1px solid",
                                                borderColor: stg.process_status === "COMPLETED" ? "#86efac" : stg.process_status === "RUNNING" ? "#93c5fd" : "#cbd5e1",
                                                background: stg.process_status === "COMPLETED" ? "#f0fdf4" : stg.process_status === "RUNNING" ? "#eff6ff" : "#ffffff",
                                                color: stg.process_status === "COMPLETED" ? "#166534" : stg.process_status === "RUNNING" ? "#1e40af" : "#64748b"
                                            }}
                                        >
                                            {stg.process_status === "COMPLETED" ? (
                                                <CheckCircle2 size={13} className="text-emerald-600" />
                                            ) : stg.process_status === "RUNNING" ? (
                                                <PlayCircle size={13} className="text-blue-600 animate-pulse" />
                                            ) : (
                                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#94a3b8" }} />
                                            )}
                                            <span>{stg.sequence_no}. {stg.process_name}</span>
                                            {stg.machine_code && <small style={{ opacity: 0.8 }}>({stg.machine_code})</small>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
