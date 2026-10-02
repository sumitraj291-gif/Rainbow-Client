import React, { useEffect, useState } from "react";
import api from "../services/api";
import {
    Boxes,
    Search,
    RefreshCw,
    ArrowDownRight,
    ArrowUpRight,
    SlidersHorizontal,
    Calendar,
    Layers,
    Warehouse,
    Filter,
    X,
    FileSpreadsheet
} from "lucide-react";
import "./Customers.css";

export default function StockTransactions() {
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({
        total_transactions: 0,
        in_count: 0,
        out_count: 0,
        adj_count: 0
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [error, setError] = useState("");

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            setError("");

            const params = {};
            if (typeFilter !== "ALL") params.type = typeFilter;
            if (search.trim()) params.search = search.trim();

            const res = await api.get("/inventory/stock-transactions", { params });
            if (res.data?.success) {
                setTransactions(res.data.data || []);
                if (res.data.stats) setStats(res.data.stats);
            }
        } catch (err) {
            console.error("Stock transactions fetch error:", err);
            setError("Failed to load stock movements from server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [typeFilter]);

    return (
        <div className="customers-page">
            {/* Header */}
            <div className="customers-header-card">
                <div className="customers-header-info">
                    <h1>Inventory Stock Movements & Ledger</h1>
                    <p>Audit trail of raw material inwards, production issues, stock-ins and dispatches.</p>
                </div>

                <div className="customers-header-actions">
                    <button
                        className="cust-refresh-btn"
                        onClick={fetchTransactions}
                        title="Refresh Ledger"
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
                        <Boxes size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Total Movements</span>
                        <span className="cust-stat-value">{stats.total_transactions}</span>
                    </div>
                </div>

                <div className="cust-stat-card">
                    <div className="cust-stat-icon green">
                        <ArrowDownRight size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Inward Receipts (IN)</span>
                        <span className="cust-stat-value">{stats.in_count}</span>
                    </div>
                </div>

                <div className="cust-stat-card">
                    <div className="cust-stat-icon amber">
                        <ArrowUpRight size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Issues & Dispatches (OUT)</span>
                        <span className="cust-stat-value">{stats.out_count}</span>
                    </div>
                </div>

                <div className="cust-stat-card">
                    <div className="cust-stat-icon purple">
                        <SlidersHorizontal size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Adjustments</span>
                        <span className="cust-stat-value">{stats.adj_count}</span>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="customers-toolbar-card">
                <div className="cust-search-form">
                    <div className="cust-search-input-wrapper">
                        <Search size={16} className="cust-search-icon" />
                        <input
                            type="text"
                            placeholder="Filter by material code, product, batch or remarks..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && fetchTransactions()}
                        />
                        {search && (
                            <button
                                type="button"
                                className="cust-clear-search"
                                onClick={() => { setSearch(""); fetchTransactions(); }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button type="button" className="cust-search-btn" onClick={fetchTransactions}>
                        Filter
                    </button>
                </div>

                <div className="cust-filter-group">
                    <span className="cust-filter-label">Movement Type:</span>
                    <div className="cust-segmented-control">
                        {["ALL", "IN", "OUT", "ADJUSTMENT"].map((t) => (
                            <button
                                key={t}
                                type="button"
                                className={typeFilter === t ? "active" : ""}
                                onClick={() => setTypeFilter(t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Ledger Table */}
            <div className="customers-table-card">
                <div className="cust-table-responsive">
                    <table className="customers-table">
                        <thead>
                            <tr>
                                <th>Tx ID</th>
                                <th>Movement Type</th>
                                <th>Material / Item Description</th>
                                <th>Batch / Roll #</th>
                                <th>Quantity</th>
                                <th>Reference</th>
                                <th>Warehouse Location</th>
                                <th>Date & Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="cust-table-empty">
                                        <RefreshCw size={24} className="animate-spin text-slate-400" />
                                        <p>Loading stock movements...</p>
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="cust-table-empty">
                                        <Boxes size={36} className="text-slate-300" />
                                        <p>No stock movement logs recorded yet.</p>
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((t) => (
                                    <tr key={t.id}>
                                        <td>
                                            <span className="cust-code-badge">TX-{t.id}</span>
                                        </td>
                                        <td>
                                            <span className={`cust-status-pill ${t.transaction_type === "IN" ? "active" : t.transaction_type === "OUT" ? "inactive" : "amber"}`}>
                                                {t.transaction_type}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="cust-company-cell">
                                                <strong>{t.material_name || t.product_name || "Raw Material"}</strong>
                                                <small>{t.material_code || t.product_code || "—"}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <strong>{t.batch_number || "—"}</strong>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: "700", color: t.transaction_type === "IN" ? "#16a34a" : "#dc2626" }}>
                                                {t.transaction_type === "IN" ? "+" : "-"}{Number(t.quantity || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="cust-contact-cell">
                                                <span>{t.reference_type || "Direct Entry"}</span>
                                                <small>{t.remarks || `Ref #${t.reference_id || "—"}`}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="cust-city-badge">
                                                <Warehouse size={12} />
                                                {t.warehouse_name ? `${t.warehouse_name} ${t.location_name ? `(${t.location_name})` : ""}` : "Plant Store"}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                                                {new Date(t.transaction_date || t.created_at).toLocaleString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
