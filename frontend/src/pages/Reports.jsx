import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";
import {
    BarChart3,
    CheckCircle2,
    Boxes,
    FileSpreadsheet,
    RefreshCw,
    Download,
    Calendar,
    Layers,
    AlertTriangle,
    ShieldCheck,
    Cpu,
    Coins,
    TrendingUp
} from "lucide-react";
import "./Customers.css";

export default function Reports() {
    const location = useLocation();

    // Determine initial tab from route
    const getTabFromRoute = () => {
        if (location.pathname.includes("quality")) return "quality";
        if (location.pathname.includes("inventory")) return "inventory";
        return "production";
    };

    const [activeTab, setActiveTab] = useState(getTabFromRoute);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [error, setError] = useState("");

    // Date range
    const [dateRange, setDateRange] = useState({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        to: new Date().toISOString().slice(0, 10)
    });

    useEffect(() => {
        setActiveTab(getTabFromRoute());
    }, [location.pathname]);

    useEffect(() => {
        fetchReport();
    }, [activeTab]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            setError("");
            let endpoint = `/inventory/reports/${activeTab}`;
            const res = await api.get(endpoint, {
                params: {
                    from_date: dateRange.from,
                    to_date: dateRange.to
                }
            });
            if (res.data?.success) {
                setReportData(res.data.data);
            }
        } catch (err) {
            console.error("Report fetch error:", err);
            setError("Failed to generate report from database.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="customers-page">
            {/* Header */}
            <div className="customers-header-card">
                <div className="customers-header-info">
                    <h1>Manufacturing Intelligence & Reports</h1>
                    <p>Comprehensive analytics on plant production, quality yield and material inventory valuation.</p>
                </div>

                <div className="customers-header-actions">
                    <button
                        className="cust-refresh-btn"
                        onClick={fetchReport}
                        title="Reload Analytics"
                        type="button"
                    >
                        <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Segmented Report Tabs */}
            <div className="customers-toolbar-card" style={{ justifyContent: "space-between" }}>
                <div className="cust-segmented-control" style={{ width: "fit-content" }}>
                    <button
                        type="button"
                        className={activeTab === "production" ? "active" : ""}
                        onClick={() => setActiveTab("production")}
                    >
                        <BarChart3 size={15} style={{ display: "inline", marginRight: "6px" }} />
                        Production Output
                    </button>
                    <button
                        type="button"
                        className={activeTab === "quality" ? "active" : ""}
                        onClick={() => setActiveTab("quality")}
                    >
                        <ShieldCheck size={15} style={{ display: "inline", marginRight: "6px" }} />
                        Quality & Yield
                    </button>
                    <button
                        type="button"
                        className={activeTab === "inventory" ? "active" : ""}
                        onClick={() => setActiveTab("inventory")}
                    >
                        <Boxes size={15} style={{ display: "inline", marginRight: "6px" }} />
                        Inventory Valuation
                    </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                        style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>to</span>
                    <input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                        style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                    <button type="button" className="cust-search-btn" onClick={fetchReport}>
                        Apply
                    </button>
                </div>
            </div>

            {error && (
                <div className="cust-alert error">
                    <span>{error}</span>
                </div>
            )}

            {/* 1. PRODUCTION REPORT VIEW */}
            {activeTab === "production" && reportData && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div className="customers-table-card" style={{ padding: "20px" }}>
                        <h2 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "16px", color: "#0f172a" }}>
                            Output By Product Variant
                        </h2>
                        <table className="customers-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Product Name</th>
                                    <th>Category</th>
                                    <th>Input Quantity</th>
                                    <th>Good Output</th>
                                    <th>Scrap / Rejected</th>
                                    <th>Downtime (Min)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.by_product?.length === 0 ? (
                                    <tr><td colSpan="7" className="cust-table-empty">No production logs in selected date range.</td></tr>
                                ) : (
                                    reportData.by_product?.map((p, idx) => (
                                        <tr key={idx}>
                                            <td><span className="cust-code-badge">{p.product_code}</span></td>
                                            <td><strong>{p.product_name}</strong></td>
                                            <td>{p.carpet_type || "PVC Carpet"}</td>
                                            <td>{Number(p.total_input || 0).toLocaleString()} {p.unit}</td>
                                            <td><strong style={{ color: "#16a34a" }}>{Number(p.total_good || 0).toLocaleString()} {p.unit}</strong></td>
                                            <td><span style={{ color: "#dc2626" }}>{Number(p.total_rejected || 0).toLocaleString()}</span></td>
                                            <td>{Number(p.total_downtime || 0)} min</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                        <div className="customers-table-card" style={{ padding: "20px" }}>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "16px", color: "#0f172a" }}>Machine Utilization</h2>
                            <table className="customers-table">
                                <thead>
                                    <tr>
                                        <th>Machine</th>
                                        <th>Total Output</th>
                                        <th>Downtime</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.by_machine?.map((m, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{m.machine_name}</strong> <small>({m.machine_code})</small></td>
                                            <td>{Number(m.total_output || 0).toLocaleString()}</td>
                                            <td>{Number(m.total_downtime || 0)} min</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="customers-table-card" style={{ padding: "20px" }}>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "16px", color: "#0f172a" }}>Shift-Wise Production</h2>
                            <table className="customers-table">
                                <thead>
                                    <tr>
                                        <th>Shift</th>
                                        <th>Runs</th>
                                        <th>Good Output</th>
                                        <th>Scrap</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.by_shift?.map((s, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{s.shift_name} SHIFT</strong></td>
                                            <td>{s.total_runs}</td>
                                            <td style={{ color: "#16a34a", fontWeight: "700" }}>{Number(s.total_good || 0).toLocaleString()}</td>
                                            <td style={{ color: "#dc2626" }}>{Number(s.total_rejected || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. QUALITY REPORT VIEW */}
            {activeTab === "quality" && reportData && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div className="customers-stats-grid">
                        <div className="cust-stat-card">
                            <div className="cust-stat-icon green">
                                <TrendingUp size={22} />
                            </div>
                            <div className="cust-stat-content">
                                <span className="cust-stat-label">First Pass Yield (FPY)</span>
                                <span className="cust-stat-value">{reportData.kpis?.first_pass_yield_pct}%</span>
                            </div>
                        </div>

                        <div className="cust-stat-card">
                            <div className="cust-stat-icon blue">
                                <CheckCircle2 size={22} />
                            </div>
                            <div className="cust-stat-content">
                                <span className="cust-stat-label">Approved Rolls</span>
                                <span className="cust-stat-value">{reportData.kpis?.approved_rolls || 0}</span>
                            </div>
                        </div>

                        <div className="cust-stat-card">
                            <div className="cust-stat-icon amber">
                                <AlertTriangle size={22} />
                            </div>
                            <div className="cust-stat-content">
                                <span className="cust-stat-label">Grade B / Discount</span>
                                <span className="cust-stat-value">{reportData.kpis?.grade_b_rolls || 0}</span>
                            </div>
                        </div>

                        <div className="cust-stat-card">
                            <div className="cust-stat-icon red">
                                <AlertTriangle size={22} />
                            </div>
                            <div className="cust-stat-content">
                                <span className="cust-stat-label">Rejected Scrap</span>
                                <span className="cust-stat-value">{reportData.kpis?.rejected_rolls || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="customers-table-card" style={{ padding: "20px" }}>
                        <h2 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "16px", color: "#0f172a" }}>Recent Laboratory Inspections</h2>
                        <table className="customers-table">
                            <thead>
                                <tr>
                                    <th>Report #</th>
                                    <th>Roll Number</th>
                                    <th>Product</th>
                                    <th>Measured GSM</th>
                                    <th>Thickness</th>
                                    <th>Grade</th>
                                    <th>Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.recent_inspections?.length === 0 ? (
                                    <tr><td colSpan="7" className="cust-table-empty">No laboratory inspection records in database.</td></tr>
                                ) : (
                                    reportData.recent_inspections?.map((cri) => (
                                        <tr key={cri.id}>
                                            <td><strong>{cri.inspection_number}</strong></td>
                                            <td><span className="cust-code-badge">{cri.roll_number}</span></td>
                                            <td>{cri.product_name}</td>
                                            <td>{cri.actual_gsm || "—"} GSM</td>
                                            <td>{cri.avg_thickness_mm || "—"} mm</td>
                                            <td><strong>Grade {cri.assigned_grade || "A"}</strong></td>
                                            <td>
                                                <span className={`cust-status-pill ${cri.overall_result === "PASS" ? "active" : "inactive"}`}>
                                                    {cri.overall_result || "PASS"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 3. INVENTORY REPORT VIEW */}
            {activeTab === "inventory" && reportData && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div className="customers-stats-grid">
                        <div className="cust-stat-card">
                            <div className="cust-stat-icon purple">
                                <Coins size={22} />
                            </div>
                            <div className="cust-stat-content">
                                <span className="cust-stat-label">Total Plant Valuation</span>
                                <span className="cust-stat-value">₹{Number(reportData.kpis?.total_plant_valuation_inr || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="cust-stat-card">
                            <div className="cust-stat-icon blue">
                                <Boxes size={22} />
                            </div>
                            <div className="cust-stat-content">
                                <span className="cust-stat-label">Raw Material Stock Valuation</span>
                                <span className="cust-stat-value">₹{Number(reportData.kpis?.raw_material_valuation_inr || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="cust-stat-card">
                            <div className="cust-stat-icon green">
                                <Layers size={22} />
                            </div>
                            <div className="cust-stat-content">
                                <span className="cust-stat-label">Finished Goods Valuation</span>
                                <span className="cust-stat-value">₹{Number(reportData.kpis?.finished_goods_valuation_inr || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="customers-table-card" style={{ padding: "20px" }}>
                        <h2 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "16px", color: "#0f172a" }}>Finished Goods Stock Valuation by Product</h2>
                        <table className="customers-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Product Name</th>
                                    <th>Carpet Type</th>
                                    <th>Available Stock</th>
                                    <th>Estimated Value (INR)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.finished_goods?.map((fg, idx) => (
                                    <tr key={idx}>
                                        <td><span className="cust-code-badge">{fg.product_code}</span></td>
                                        <td><strong>{fg.product_name}</strong></td>
                                        <td>{fg.carpet_type}</td>
                                        <td>{Number(fg.available_stock || 0).toLocaleString()} {fg.unit}</td>
                                        <td><strong style={{ color: "#16a34a" }}>₹{Number(fg.estimated_stock_value_inr || 0).toLocaleString()}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
