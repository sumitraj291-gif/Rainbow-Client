import React, { useEffect, useMemo, useState } from "react";
import {
    Layers,
    Package,
    CheckCircle2,
    AlertTriangle,
    TrendingDown,
    Clock,
    Plus,
    RefreshCw,
    Sparkles,
    Search,
    Edit2,
    Trash2,
    X,
    AlertCircle,
    Calendar,
    Cpu
} from "lucide-react";
import api from "../services/api";
import "./ProductionEntries.css";

const initialForm = {
    production_order_id: "",
    machine_id: "",
    production_date: new Date().toISOString().slice(0, 10),
    shift: "DAY",
    start_time: "",
    end_time: "",
    input_quantity: "",
    good_quantity: "",
    rejected_quantity: "",
    wastage_quantity: "",
    downtime_minutes: "0",
    remarks: ""
};

function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

export default function ProductionEntry() {
    const [entries, setEntries] = useState([]);
    const [options, setOptions] = useState({
        productionOrders: [],
        machines: []
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);

    const [search, setSearch] = useState("");
    const [shiftFilter, setShiftFilter] = useState("ALL");

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(initialForm);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadEntries = async () => {
        try {
            setLoading(true);
            const response = await api.get("/production-entries");
            if (response.data?.success) {
                setEntries(response.data.data || []);
            }
        } catch (err) {
            console.error("Production Entries Load Error:", err);
            setError(err.response?.data?.message || "Unable to load production entries.");
        } finally {
            setLoading(false);
        }
    };

    const loadOptions = async () => {
        try {
            const response = await api.get("/production-entries/options");
            if (response.data?.success) {
                setOptions({
                    productionOrders: response.data.data?.productionOrders || [],
                    machines: response.data.data?.machines || []
                });
            }
        } catch (err) {
            console.error("Production Entry Options Error:", err);
        }
    };

    const handleSeed = async () => {
        try {
            setSeeding(true);
            setError("");
            const res = await api.post("/production-entries/seed");
            if (res.data?.success) {
                setSuccess(res.data.message);
                await loadEntries();
                await loadOptions();
                setTimeout(() => setSuccess(""), 3500);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to seed production entries");
        } finally {
            setSeeding(false);
        }
    };

    useEffect(() => {
        loadEntries();
        loadOptions();
    }, []);

    const filteredEntries = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return entries.filter((entry) => {
            const matchesSearch =
                !keyword ||
                String(entry.production_order_number || "").toLowerCase().includes(keyword) ||
                String(entry.product_code || "").toLowerCase().includes(keyword) ||
                String(entry.machine_code || "").toLowerCase().includes(keyword) ||
                String(entry.machine_name || "").toLowerCase().includes(keyword);

            const matchesShift = shiftFilter === "ALL" || entry.shift === shiftFilter;

            return matchesSearch && matchesShift;
        });
    }, [entries, search, shiftFilter]);

    const stats = useMemo(() => {
        return {
            entries: entries.length,
            input: entries.reduce((sum, item) => sum + Number(item.input_quantity || 0), 0),
            good: entries.reduce((sum, item) => sum + Number(item.good_quantity || 0), 0),
            rejected: entries.reduce((sum, item) => sum + Number(item.rejected_quantity || 0), 0),
            wastage: entries.reduce((sum, item) => sum + Number(item.wastage_quantity || 0), 0),
            downtime: entries.reduce((sum, item) => sum + Number(item.downtime_minutes || 0), 0)
        };
    }, [entries]);

    const openCreate = () => {
        setEditingId(null);
        setForm(initialForm);
        setError("");
        setShowModal(true);
    };

    const openEdit = (entry) => {
        setEditingId(entry.id);
        setForm({
            production_order_id: entry.production_order_id || "",
            machine_id: entry.machine_id || "",
            production_date: entry.production_date ? String(entry.production_date).slice(0, 10) : "",
            shift: entry.shift || "DAY",
            start_time: entry.start_time ? String(entry.start_time).slice(0, 8) : "",
            end_time: entry.end_time ? String(entry.end_time).slice(0, 8) : "",
            input_quantity: entry.input_quantity || "",
            good_quantity: entry.good_quantity || "",
            rejected_quantity: entry.rejected_quantity || "",
            wastage_quantity: entry.wastage_quantity || "",
            downtime_minutes: entry.downtime_minutes || "0",
            remarks: entry.remarks || ""
        });
        setError("");
        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;
        setShowModal(false);
        setEditingId(null);
        setForm(initialForm);
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const input = Number(form.input_quantity || 0);
        const good = Number(form.good_quantity || 0);
        const rejected = Number(form.rejected_quantity || 0);
        const wastage = Number(form.wastage_quantity || 0);

        if (!form.production_order_id) {
            setError("Please select a Production Order.");
            return;
        }

        if (input <= 0) {
            setError("Input quantity must be greater than zero.");
            return;
        }

        if (good + rejected + wastage > input) {
            setError("Sum of Good, Rejected, and Wastage output cannot exceed total Input quantity.");
            return;
        }

        const payload = {
            production_order_id: Number(form.production_order_id),
            machine_id: form.machine_id ? Number(form.machine_id) : null,
            production_date: form.production_date,
            shift: form.shift,
            start_time: form.start_time || null,
            end_time: form.end_time || null,
            input_quantity: input,
            good_quantity: good,
            rejected_quantity: rejected,
            wastage_quantity: wastage,
            downtime_minutes: Number(form.downtime_minutes || 0),
            remarks: form.remarks.trim() || null
        };

        try {
            setSaving(true);
            let response;
            if (editingId) {
                response = await api.put(`/production-entries/${editingId}`, payload);
            } else {
                response = await api.post("/production-entries", payload);
            }

            if (!response.data?.success) {
                throw new Error(response.data?.message || "Unable to save production entry.");
            }

            setSuccess(editingId ? "Production entry updated successfully." : "Production entry recorded successfully.");
            closeModal();
            await loadEntries();
            await loadOptions();
            setTimeout(() => setSuccess(""), 3500);
        } catch (err) {
            console.error("Save Production Entry Error:", err);
            setError(err.response?.data?.message || err.message || "Failed to record production entry.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (entry) => {
        const confirmed = window.confirm(`Are you sure you want to delete production entry #${entry.id}?`);
        if (!confirmed) return;

        try {
            setError("");
            setSuccess("");
            const response = await api.delete(`/production-entries/${entry.id}`);
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Unable to delete production entry.");
            }

            setSuccess("Production entry deleted successfully.");
            await loadEntries();
            await loadOptions();
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Delete Production Entry Error:", err);
            setError(err.response?.data?.message || err.message || "Unable to delete production entry.");
        }
    };

    const selectedOrder = options.productionOrders.find(
        (o) => String(o.id) === String(form.production_order_id)
    );

    const balanceQuantity = selectedOrder
        ? Math.max(Number(selectedOrder.planned_quantity || 0) - Number(selectedOrder.good_quantity || 0), 0)
        : 0;

    return (
        <div className="pe-page">
            {/* Header Card */}
            <div className="pe-header-card">
                <div className="pe-header-info">
                    <h1>Production Entry</h1>
                    <p>Record actual shop-floor production, quality losses, and machine downtime.</p>
                </div>
                <div className="pe-header-actions">
                    <button
                        type="button"
                        className="pe-refresh-btn"
                        onClick={() => {
                            loadEntries();
                            loadOptions();
                        }}
                        title="Refresh List"
                    >
                        <RefreshCw size={17} className={loading ? "pe-spin" : ""} />
                    </button>
                    <button
                        type="button"
                        className="pe-btn secondary"
                        onClick={handleSeed}
                        disabled={seeding}
                        title="Load sample production logs"
                    >
                        <Sparkles size={14} /> {seeding ? "Seeding..." : "Seed Entries"}
                    </button>
                    <button
                        type="button"
                        className="pe-btn primary"
                        onClick={openCreate}
                    >
                        <Plus size={16} /> Record Production
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {success && (
                <div className="pe-alert success">
                    <div className="pe-alert-content">
                        <CheckCircle2 size={16} />
                        <span>{success}</span>
                    </div>
                    <button type="button" className="pe-alert-close" onClick={() => setSuccess("")}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {error && !showModal && (
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

            {/* KPI Summary Stat Cards */}
            <div className="pe-stats-grid">
                <div className="pe-stat-card">
                    <div className="pe-stat-icon-wrap blue">
                        <Layers size={20} />
                    </div>
                    <div className="pe-stat-content">
                        <span className="pe-stat-label">Total Entries</span>
                        <div className="pe-stat-val">{stats.entries}</div>
                    </div>
                </div>

                <div className="pe-stat-card">
                    <div className="pe-stat-icon-wrap indigo">
                        <Package size={20} />
                    </div>
                    <div className="pe-stat-content">
                        <span className="pe-stat-label">Material Input</span>
                        <div className="pe-stat-val">{formatNumber(stats.input)}</div>
                    </div>
                </div>

                <div className="pe-stat-card">
                    <div className="pe-stat-icon-wrap emerald">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="pe-stat-content">
                        <span className="pe-stat-label">Good Output</span>
                        <div className="pe-stat-val" style={{ color: "#16a34a" }}>
                            {formatNumber(stats.good)}
                        </div>
                    </div>
                </div>

                <div className="pe-stat-card">
                    <div className="pe-stat-icon-wrap rose">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="pe-stat-content">
                        <span className="pe-stat-label">Rejected Output</span>
                        <div className="pe-stat-val" style={{ color: "#e11d48" }}>
                            {formatNumber(stats.rejected)}
                        </div>
                    </div>
                </div>

                <div className="pe-stat-card">
                    <div className="pe-stat-icon-wrap amber">
                        <TrendingDown size={20} />
                    </div>
                    <div className="pe-stat-content">
                        <span className="pe-stat-label">Process Wastage</span>
                        <div className="pe-stat-val">{formatNumber(stats.wastage)}</div>
                    </div>
                </div>

                <div className="pe-stat-card">
                    <div className="pe-stat-icon-wrap purple">
                        <Clock size={20} />
                    </div>
                    <div className="pe-stat-content">
                        <span className="pe-stat-label">Total Downtime</span>
                        <div className="pe-stat-val">{stats.downtime} <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b" }}>mins</span></div>
                    </div>
                </div>
            </div>

            {/* Controls Toolbar */}
            <div className="pe-controls-card">
                <div className="pe-search-box">
                    <Search size={16} className="pe-search-icon" />
                    <input
                        type="text"
                        placeholder="Search by production order, product or machine..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <select
                    value={shiftFilter}
                    onChange={(e) => setShiftFilter(e.target.value)}
                    className="pe-filter-select"
                >
                    <option value="ALL">All Shifts</option>
                    <option value="DAY">Day Shift</option>
                    <option value="NIGHT">Night Shift</option>
                </select>
            </div>

            {/* Table Card */}
            <div className="pe-table-card">
                <div className="pe-table-header">
                    <div>
                        <h3>Production Entry Register</h3>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="pe-table-count">
                            {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
                        </span>
                        <span style={{ fontSize: "0.76rem", fontWeight: "600", color: "#16a34a", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a" }}></span> Live Database
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="pe-empty-state">
                        <RefreshCw size={28} className="pe-spin" style={{ color: "#0284c7", margin: "0 auto 10px" }} />
                        <h3>Loading Production Entries...</h3>
                        <p>Fetching shop-floor machine run logs from the manufacturing plant.</p>
                    </div>
                ) : filteredEntries.length === 0 ? (
                    <div className="pe-empty-state">
                        <Layers size={36} style={{ color: "#94a3b8", margin: "0 auto 10px" }} />
                        <h3>No Production Entries Found</h3>
                        <p>
                            {search || shiftFilter !== "ALL"
                                ? "No production entries match your filter criteria."
                                : "Start recording shopfloor daily output against active production orders."}
                        </p>
                        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                            <button type="button" className="pe-btn primary" onClick={openCreate}>
                                <Plus size={15} /> Record Production
                            </button>
                            <button type="button" className="pe-btn secondary" onClick={handleSeed} disabled={seeding}>
                                <Sparkles size={14} /> Seed Sample Entries
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="pe-table-wrapper">
                        <table className="pe-table">
                            <thead>
                                <tr>
                                    <th>Entry</th>
                                    <th>Production Order</th>
                                    <th>Product</th>
                                    <th>Machine</th>
                                    <th>Date</th>
                                    <th>Shift</th>
                                    <th>Input</th>
                                    <th>Good Output</th>
                                    <th>Rejected</th>
                                    <th>Wastage</th>
                                    <th>Downtime</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td>
                                            <span className="pe-entry-badge">
                                                #{String(entry.id).padStart(3, "0")}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="pe-po-badge">
                                                {entry.production_order_number}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="pe-product-cell">
                                                <span className="pe-product-code">
                                                    {entry.product_code || "—"}
                                                </span>
                                                <span className="pe-product-name" title={entry.product_name}>
                                                    {entry.product_name || "Product"}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="pe-machine-name">
                                                {entry.machine_code || entry.machine_name || "—"}
                                            </span>
                                        </td>
                                        <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>
                                            {formatDate(entry.production_date)}
                                        </td>
                                        <td>
                                            <span className={`pe-shift-pill ${(entry.shift || 'day').toLowerCase()}`}>
                                                {entry.shift || "DAY"}
                                            </span>
                                        </td>
                                        <td>
                                            <strong>{formatNumber(entry.input_quantity)}</strong>
                                        </td>
                                        <td>
                                            <strong style={{ color: "#16a34a", fontSize: "0.92rem" }}>
                                                {formatNumber(entry.good_quantity)}
                                            </strong>
                                        </td>
                                        <td>
                                            <span style={{ color: Number(entry.rejected_quantity) > 0 ? "#e11d48" : "#64748b", fontWeight: "600" }}>
                                                {formatNumber(entry.rejected_quantity)}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ color: Number(entry.wastage_quantity) > 0 ? "#d97706" : "#64748b" }}>
                                                {formatNumber(entry.wastage_quantity)}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: "600", color: Number(entry.downtime_minutes) > 0 ? "#9333ea" : "#64748b" }}>
                                                {entry.downtime_minutes || 0}m
                                            </span>
                                        </td>
                                        <td>
                                            <div className="pe-actions-row">
                                                <button
                                                    type="button"
                                                    className="pe-tbl-btn"
                                                    onClick={() => openEdit(entry)}
                                                    title="Edit Entry"
                                                >
                                                    <Edit2 size={13} /> Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="pe-tbl-btn delete"
                                                    onClick={() => handleDelete(entry)}
                                                    title="Delete Entry"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* RECORD / EDIT MODAL */}
            {showModal && (
                <div className="pe-modal-backdrop" onClick={closeModal}>
                    <div className="pe-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pe-modal-header">
                            <h2>{editingId ? "Edit Production Entry" : "Record Shop-Floor Production"}</h2>
                            <button
                                type="button"
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
                                onClick={closeModal}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="pe-modal-body">
                                {error && (
                                    <div className="pe-alert error" style={{ margin: "0 0 10px" }}>
                                        <div className="pe-alert-content">
                                            <AlertCircle size={15} />
                                            <span>{error}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="pe-form-grid">
                                    <div className="pe-form-group full-width">
                                        <label>Production Order *</label>
                                        <select
                                            value={form.production_order_id}
                                            onChange={(e) => setForm({ ...form, production_order_id: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Select Active Production Order --</option>
                                            {options.productionOrders.map((o) => (
                                                <option key={o.id} value={o.id}>
                                                    {o.production_order_number} — {o.product_code} (Planned: {formatNumber(o.planned_quantity)} | Bal: {formatNumber(Math.max(0, o.planned_quantity - o.good_quantity))})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedOrder && (
                                        <div className="pe-form-group full-width" style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "10px 14px", fontSize: "0.8rem", color: "#0369a1" }}>
                                            <strong>Target Product:</strong> {selectedOrder.product_name} ({selectedOrder.product_code}) | <strong>Remaining to produce:</strong> {formatNumber(balanceQuantity)} units
                                        </div>
                                    )}

                                    <div className="pe-form-group">
                                        <label>Machine Line *</label>
                                        <select
                                            value={form.machine_id}
                                            onChange={(e) => setForm({ ...form, machine_id: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Select Machine --</option>
                                            {options.machines.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.machine_code} — {m.machine_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pe-form-group">
                                        <label>Shift *</label>
                                        <select
                                            value={form.shift}
                                            onChange={(e) => setForm({ ...form, shift: e.target.value })}
                                        >
                                            <option value="DAY">Day Shift (08:00 - 17:00)</option>
                                            <option value="NIGHT">Night Shift (20:00 - 05:00)</option>
                                            <option value="GENERAL">General Shift</option>
                                        </select>
                                    </div>

                                    <div className="pe-form-group">
                                        <label>Production Date *</label>
                                        <input
                                            type="date"
                                            value={form.production_date}
                                            onChange={(e) => setForm({ ...form, production_date: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="pe-form-group">
                                        <label>Downtime (Minutes)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.downtime_minutes}
                                            onChange={(e) => setForm({ ...form, downtime_minutes: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="pe-form-group">
                                        <label>Total Material Input *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={form.input_quantity}
                                            onChange={(e) => setForm({ ...form, input_quantity: e.target.value })}
                                            placeholder="e.g. 200"
                                            required
                                        />
                                    </div>

                                    <div className="pe-form-group">
                                        <label>Good Accepted Output *</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.good_quantity}
                                            onChange={(e) => setForm({ ...form, good_quantity: e.target.value })}
                                            placeholder="e.g. 195"
                                            required
                                        />
                                    </div>

                                    <div className="pe-form-group">
                                        <label>Rejected Output</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.rejected_quantity}
                                            onChange={(e) => setForm({ ...form, rejected_quantity: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="pe-form-group">
                                        <label>Process Wastage</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.wastage_quantity}
                                            onChange={(e) => setForm({ ...form, wastage_quantity: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="pe-form-group full-width">
                                        <label>Shift Remarks / Machine Log</label>
                                        <textarea
                                            rows="2"
                                            value={form.remarks}
                                            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                            placeholder="Optional line notes, blade changes, temperature settings..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pe-modal-footer">
                                <button
                                    type="button"
                                    className="pe-btn"
                                    onClick={closeModal}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="pe-btn primary"
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : editingId ? "Update Entry" : "Save Production Entry"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}