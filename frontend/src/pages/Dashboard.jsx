import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Dashboard.css";

const number = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });

const percent = (value) => `${Number(value || 0).toFixed(1)}%`;

const formatTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
    });
};

const statusClass = (status = "") =>
    `status-pill status-${status.toLowerCase().replace(/[\s_]+/g, "-")}`;

function StatCard({ icon, label, value, unit, meta, tone, onClick, title }) {
    return (
        <div 
            className={`monitor-stat-card ${onClick ? "clickable" : ""}`}
            onClick={onClick}
            title={title}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={(e) => {
                if (onClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <div className={`monitor-stat-icon ${tone}`}>
                {icon}
            </div>

            <div className="monitor-stat-content">
                <span>{label}</span>
                <strong>
                    {value}
                    {unit && <small>{unit}</small>}
                </strong>
                {meta && <em>{meta}</em>}
            </div>

            {onClick && (
                <div className="stat-card-link-icon" title={title}>
                    ↗
                </div>
            )}
        </div>
    );
}

function Dashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const loadDashboard = useCallback(async (silent = false) => {
        try {
            if (silent) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const response = await api.get("/dashboard/overview");

            if (!response.data.success) {
                throw new Error(
                    response.data.message || "Unable to load dashboard"
                );
            }

            setData(response.data.data);
            setError("");
        } catch (err) {
            console.error("Dashboard load error:", err);
            setError(
                err?.response?.data?.message ||
                err.message ||
                "Unable to load production dashboard"
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();

        const timer = setInterval(() => {
            loadDashboard(true);
        }, 5000);

        const onFocus = () => loadDashboard(true);
        window.addEventListener("focus", onFocus);

        return () => {
            clearInterval(timer);
            window.removeEventListener("focus", onFocus);
        };
    }, [loadDashboard]);

    const stageRows = useMemo(
        () => data?.stages || [],
        [data]
    );

    if (loading) {
        return (
            <div className="monitor-page">
                <div className="monitor-loading">
                    <div className="monitor-spinner"></div>
                    <strong>Loading live production data...</strong>
                    <span>Connecting to the production database.</span>
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="monitor-page">
                <div className="monitor-error">
                    <strong>Production dashboard unavailable</strong>
                    <p>{error}</p>
                    <button onClick={() => loadDashboard()}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const kpis = data?.kpis || {};
    const productionEfficiency = Number(
        kpis.production_efficiency || 0
    );

    return (
        <div className="monitor-page">
            <div className="monitor-header">
                <div>
                    <h1>Live Production Monitor</h1>
                    <p>
                        Track production orders, process output, quality and
                        shop-floor activity in real time.
                    </p>
                </div>

                <div className="monitor-header-actions">
                    <div className="monitor-date">
                        <span>●</span>
                        {new Date().toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                        })}
                    </div>

                    <button
                        className="refresh-button"
                        onClick={() => loadDashboard(true)}
                        disabled={refreshing}
                    >
                        ↻ {refreshing ? "Refreshing..." : "Refresh"}
                    </button>

                    <div className="live-indicator">
                        <span></span>
                        Auto Refresh: On
                    </div>
                </div>
            </div>

            {error && (
                <div className="monitor-inline-error">
                    {error}
                </div>
            )}

            <div className="monitor-kpi-grid">
                <StatCard
                    icon="▣"
                    label="Active Production Orders"
                    value={number(kpis.active_orders)}
                    meta="Currently open"
                    tone="blue"
                    onClick={() => navigate("/production-orders")}
                    title="Click to view and manage Active Production Orders"
                />

                <StatCard
                    icon="◈"
                    label="Good Output Today"
                    value={number(kpis.good_today)}
                    meta={`Planned ${number(kpis.planned_today)}`}
                    tone="green"
                    onClick={() => navigate("/production-entry")}
                    title="Click to view Production Output & Entries"
                />

                <StatCard
                    icon="◔"
                    label="Production Efficiency"
                    value={percent(productionEfficiency)}
                    meta="Good output / planned output"
                    tone="orange"
                    onClick={() => navigate("/reports/oee")}
                    title="Click to view OEE & Efficiency Reports"
                />

                <StatCard
                    icon="✓"
                    label="Rejected Output"
                    value={number(kpis.rejected_today)}
                    meta={`${percent(
                        kpis.good_today + kpis.rejected_today > 0
                            ? (kpis.rejected_today /
                                (kpis.good_today + kpis.rejected_today)) *
                              100
                            : 0
                    )} of final output`}
                    tone="purple"
                    onClick={() => navigate("/quality/roll-inspection")}
                    title="Click to view Quality Inspection & Rejections"
                />

                <StatCard
                    icon="!"
                    label="Downtime Today"
                    value={number(kpis.downtime_today)}
                    unit=" min"
                    meta={`${number(kpis.wastage_today)} wastage`}
                    tone="red"
                    onClick={() => navigate("/machine-breakdown")}
                    title="Click to view Machine Breakdown & Maintenance"
                />
            </div>

            <section className="monitor-panel">
                <div className="panel-heading">
                    <div>
                        <h2>Production Stages</h2>
                        <p>Current process status and output from the database.</p>
                    </div>
                    <span className="panel-live">
                        {stageRows.length} active stages
                    </span>
                </div>

                {stageRows.length === 0 ? (
                    <div className="empty-stage">
                        No production stage execution has been recorded today.
                    </div>
                ) : (
                    <>
                        <div className="stage-flow">
                            {stageRows.map((stage, index) => (
                                <div
                                    className="stage-flow-item"
                                    key={stage.process_id}
                                >
                                    <div 
                                        className="stage-card clickable"
                                        onClick={() => {
                                            const code = String(stage.process_code || "").toUpperCase();
                                            if (code === "PROC-001" || code.includes("MIX")) {
                                                navigate("/chemical-mixing");
                                            } else if (code === "PROC-006" || code.includes("QC") || code.includes("INSPECT")) {
                                                navigate("/quality/roll-inspection");
                                            } else {
                                                navigate("/production-entry");
                                            }
                                        }}
                                        title={`Click to open ${stage.process_name} execution`}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div className="stage-top">
                                            <span className="stage-number">
                                                {index + 1}
                                            </span>
                                            <span className={statusClass(stage.status)}>
                                                {stage.status}
                                            </span>
                                        </div>

                                        <h3>{stage.process_name}</h3>
                                        <small>{stage.process_code}</small>

                                        <div className="stage-metrics">
                                            <div>
                                                <span>Good Output</span>
                                                <strong>
                                                    {number(stage.good_quantity)}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>Reject</span>
                                                <strong>
                                                    {number(stage.rejected_quantity)}
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="stage-progress">
                                            <div
                                                style={{
                                                    width: `${Math.min(
                                                        100,
                                                        Number(stage.good_quantity) > 0 &&
                                                            Number(stage.input_quantity) > 0
                                                            ? (Number(stage.good_quantity) /
                                                                  Number(stage.input_quantity)) *
                                                              100
                                                            : stage.status === "COMPLETED"
                                                            ? 100
                                                            : stage.status === "RUNNING"
                                                            ? 50
                                                            : 0
                                                    )}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>

            <div className="monitor-main-grid">
                <section className="monitor-panel chart-panel">
                    <div className="panel-heading">
                        <div>
                            <h2>Output vs Target</h2>
                            <p>Final process good output for today's orders.</p>
                        </div>
                    </div>

                    <div className="target-visual">
                        <div
                            className="target-ring"
                            style={{
                                "--progress": `${Math.min(
                                    100,
                                    productionEfficiency
                                )}%`
                            }}
                        >
                            <div>
                                <strong>{percent(productionEfficiency)}</strong>
                                <span>Completed</span>
                            </div>
                        </div>

                        <div className="target-values">
                            <strong>
                                {number(kpis.good_today)}
                                <small> / {number(kpis.planned_today)}</small>
                            </strong>
                            <span>Good output / planned quantity</span>
                        </div>
                    </div>
                </section>

                <section className="monitor-panel">
                    <div className="panel-heading">
                        <div>
                            <h2>Stage Wise Output</h2>
                            <p>Good quantity recorded by process.</p>
                        </div>
                    </div>

                    <div className="bar-chart">
                        {stageRows.map((stage) => {
                            const max = Math.max(
                                ...stageRows.map((item) =>
                                    Number(item.good_quantity || 0)
                                ),
                                1
                            );

                            const height =
                                (Number(stage.good_quantity || 0) / max) * 100;

                            return (
                                <div className="bar-item" key={stage.process_id}>
                                    <div className="bar-value">
                                        {number(stage.good_quantity)}
                                    </div>

                                    <div className="bar-track">
                                        <div
                                            className="bar-fill"
                                            style={{ height: `${height}%` }}
                                        ></div>
                                    </div>

                                    <span title={stage.process_name}>
                                        {stage.process_name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="monitor-panel">
                    <div className="panel-heading">
                        <div>
                            <h2>Rejection by Stage</h2>
                            <p>Rejected quantity by production process.</p>
                        </div>
                    </div>

                    <div className="rejection-list">
                        {stageRows.map((stage) => {
                            const input = Number(stage.input_quantity || 0);
                            const reject = Number(stage.rejected_quantity || 0);
                            const rate =
                                input > 0 ? (reject / input) * 100 : 0;

                            return (
                                <div className="rejection-row" key={stage.process_id}>
                                    <div className="rejection-label">
                                        <span>{stage.process_name}</span>
                                        <strong>{number(reject)}</strong>
                                    </div>

                                    <div className="rejection-track">
                                        <div
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    rate * 2
                                                )}%`
                                            }}
                                        ></div>
                                    </div>

                                    <small>{rate.toFixed(1)}%</small>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>

            <section className="monitor-panel alerts-panel">
                <div className="panel-heading">
                    <div>
                        <h2>Operational Alerts</h2>
                        <p>Alerts derived from current production execution data.</p>
                    </div>

                    <span className="alert-count">
                        {data?.alerts?.length || 0}
                    </span>
                </div>

                {data?.alerts?.length ? (
                    <div className="alert-list">
                        {data.alerts.map((alert, index) => (
                            <div className="alert-row" key={`${alert.title}-${index}`}>
                                <span className={`alert-icon ${alert.type}`}>
                                    {alert.type === "danger" ? "!" : "⚠"}
                                </span>

                                <div>
                                    <strong>{alert.title}</strong>
                                    <p>{alert.message}</p>
                                </div>

                                <time>{formatTime(alert.time)}</time>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-alerts">
                        No active production alerts.
                    </div>
                )}
            </section>

            <section className="monitor-panel orders-panel">
                <div className="panel-heading">
                    <div>
                        <h2>Active Production Orders</h2>
                        <p>Live production orders from the production database.</p>
                    </div>
                </div>

                <div className="orders-table-wrap">
                    <table className="monitor-table">
                        <thead>
                            <tr>
                                <th>Production Order</th>
                                <th>Product</th>
                                <th>Planned Qty</th>
                                <th>Produced Qty</th>
                                <th>Progress</th>
                                <th>Status</th>
                                <th>Start</th>
                                <th>Expected End</th>
                            </tr>
                        </thead>

                        <tbody>
                            {data?.orders?.length ? (
                                data.orders.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <strong>
                                                {item.production_order_number}
                                            </strong>
                                        </td>

                                        <td>
                                            <div className="product-cell">
                                                <strong>{item.product_name}</strong>
                                                <span>{item.product_code}</span>
                                            </div>
                                        </td>

                                        <td>{number(item.planned_quantity)}</td>
                                        <td>{number(item.produced_quantity)}</td>

                                        <td>
                                            <div className="table-progress">
                                                <div>
                                                    <span
                                                        style={{
                                                            width: `${Math.min(
                                                                100,
                                                                Number(item.progress_percentage || 0)
                                                            )}%`
                                                        }}
                                                    ></span>
                                                </div>
                                                <strong>
                                                    {percent(item.progress_percentage)}
                                                </strong>
                                            </div>
                                        </td>

                                        <td>
                                            <span className={statusClass(item.status)}>
                                                {item.status.replaceAll("_", " ")}
                                            </span>
                                        </td>

                                        <td>{formatTime(item.start_time)}</td>
                                        <td>
                                            {item.expected_completion_date
                                                ? new Date(
                                                      item.expected_completion_date
                                                  ).toLocaleDateString("en-IN", {
                                                      day: "2-digit",
                                                      month: "short"
                                                  })
                                                : "—"}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="table-empty">
                                        No active production orders.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default Dashboard;
