import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    Layers,
    Clock,
    Cog,
    CheckCircle2,
    Package,
    ShieldCheck,
    Plus,
    RefreshCw,
    Sparkles,
    Search,
    Edit2,
    Trash2,
    X,
    AlertCircle,
    Calendar,
    TrendingUp,
    FileDown
} from "lucide-react";
import api from "../services/api";
import "./ProductionOrders.css";
import ExcelToolbar from "../components/ExcelToolbar";
import PdfExportModal from "../components/PdfExportModal";

const initialForm = {
    production_order_number: "",
    sales_order_id: "",
    product_id: "",
    planned_quantity: "",
    target_quantity: "",
    production_date: "",
    expected_completion_date: "",
    priority: "NORMAL",
    shift: "DAY",
    supervisor_id: "",
    status: "PLANNED",
    remarks: ""
};

const statusOptions = [
    "PLANNED",
    "MATERIAL_PENDING",
    "READY",
    "IN_PROGRESS",
    "QC_PENDING",
    "COMPLETED",
    "CANCELLED"
];

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

function getStatusClass(status) {
    return String(status || "")
        .toLowerCase()
        .replace(/_/g, "-");
}

export default function ProductionOrders() {
    const location = useLocation();
    const isPlanning = location.pathname.includes("planning");

    const [orders, setOrders] = useState([]);
    const [options, setOptions] = useState({
        salesOrders: [],
        products: [],
        supervisors: []
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState(initialForm);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // PDF Job Card Modal State
    const [pdfModal, setPdfModal] = useState({
        isOpen: false,
        endpoint: "",
        title: "",
        docNumber: ""
    });

    const handleOpenJobCardPdf = (order) => {
        setPdfModal({
            isOpen: true,
            endpoint: `/pdf/production-order/${order.id}`,
            title: `Job Card – ${order.production_order_number} (${order.product_name})`,
            docNumber: order.production_order_number
        });
    };

    const loadOrders = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/production-orders");

            if (response.data?.success) {
                setOrders(response.data.data || []);
            } else {
                setOrders([]);
                setError(
                    response.data?.message ||
                    "Unable to load production orders."
                );
            }
        } catch (err) {
            console.error("Production Orders Load Error:", err);
            setError(
                err.response?.data?.message ||
                "Unable to connect to the production order API."
            );
        } finally {
            setLoading(false);
        }
    };

    const loadOptions = async () => {
        try {
            const response = await api.get("/production-orders/options");
            if (response.data?.success) {
                setOptions({
                    salesOrders: response.data.data?.salesOrders || [],
                    products: response.data.data?.products || [],
                    supervisors: response.data.data?.supervisors || []
                });
            }
        } catch (err) {
            console.error("Production Order Options Error:", err);
        }
    };

    const handleSeed = async () => {
        try {
            setSeeding(true);
            setError("");
            const res = await api.post("/production-orders/seed");
            if (res.data?.success) {
                setSuccess(res.data.message);
                await loadOrders();
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to seed production orders");
        } finally {
            setSeeding(false);
        }
    };

    useEffect(() => {
        loadOrders();
        loadOptions();
    }, []);

    const filteredOrders = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return orders.filter((order) => {
            const matchesSearch =
                !keyword ||
                String(order.production_order_number || "")
                    .toLowerCase()
                    .includes(keyword) ||
                String(order.product_code || "")
                    .toLowerCase()
                    .includes(keyword) ||
                String(order.product_name || "")
                    .toLowerCase()
                    .includes(keyword) ||
                String(order.sales_order_number || "")
                    .toLowerCase()
                    .includes(keyword);

            const matchesStatus =
                statusFilter === "ALL" ||
                order.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [orders, search, statusFilter]);

    const statistics = useMemo(() => {
        const total = orders.length;
        const planned = orders.filter((item) => item.status === "PLANNED" || item.status === "READY").length;
        const inProgress = orders.filter((item) => item.status === "IN_PROGRESS").length;
        const completed = orders.filter((item) => item.status === "COMPLETED").length;
        const totalPlanned = orders.reduce((sum, item) => sum + Number(item.planned_quantity || 0), 0);
        const totalProduced = orders.reduce((sum, item) => sum + Number(item.good_quantity || 0), 0);

        return {
            total,
            planned,
            inProgress,
            completed,
            totalPlanned,
            totalProduced
        };
    }, [orders]);

    const openCreateModal = () => {
        setEditingId(null);
        setForm({
            ...initialForm,
            production_order_number: generateOrderNumber(),
            production_date: new Date().toISOString().split("T")[0]
        });
        setError("");
        setSuccess("");
        setShowModal(true);
    };

    const openEditModal = (order) => {
        setEditingId(order.id);
        setForm({
            production_order_number: order.production_order_number || "",
            sales_order_id: order.sales_order_id || "",
            product_id: order.product_id || "",
            planned_quantity: order.planned_quantity || "",
            target_quantity: order.target_quantity || "",
            production_date: order.production_date ? String(order.production_date).slice(0, 10) : "",
            expected_completion_date: order.expected_completion_date ? String(order.expected_completion_date).slice(0, 10) : "",
            priority: order.priority || "NORMAL",
            shift: order.shift || "DAY",
            supervisor_id: order.supervisor_id || "",
            status: order.status || "PLANNED",
            remarks: order.remarks || ""
        });
        setError("");
        setSuccess("");
        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;
        setShowModal(false);
        setEditingId(null);
        setForm(initialForm);
        setError("");
    };

    const generateOrderNumber = () => {
        const year = new Date().getFullYear();
        const numbers = orders
            .map((order) => {
                const match = String(order.production_order_number || "").match(/(\d+)$/);
                return match ? Number(match[1]) : 0;
            })
            .filter(Boolean);

        const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : orders.length + 1;
        return `PO-${year}-${String(nextNumber).padStart(4, "0")}`;
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleProductChange = (event) => {
        const productId = event.target.value;
        setForm((previous) => ({
            ...previous,
            product_id: productId,
            target_quantity: previous.target_quantity || previous.planned_quantity || ""
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!form.production_order_number.trim()) {
            setError("Production Order Number is required.");
            return;
        }

        if (!form.product_id) {
            setError("Please select a product.");
            return;
        }

        if (!form.planned_quantity || Number(form.planned_quantity) <= 0) {
            setError("Planned quantity must be greater than zero.");
            return;
        }

        if (!form.target_quantity || Number(form.target_quantity) <= 0) {
            setError("Target quantity must be greater than zero.");
            return;
        }

        const payload = {
            production_order_number: form.production_order_number.trim(),
            sales_order_id: form.sales_order_id ? Number(form.sales_order_id) : null,
            product_id: Number(form.product_id),
            planned_quantity: Number(form.planned_quantity),
            target_quantity: Number(form.target_quantity),
            production_date: form.production_date || null,
            expected_completion_date: form.expected_completion_date || null,
            priority: form.priority,
            shift: form.shift,
            supervisor_id: form.supervisor_id ? Number(form.supervisor_id) : null,
            status: form.status,
            remarks: form.remarks.trim() || null
        };

        try {
            setSaving(true);
            let response;
            if (editingId) {
                response = await api.put(`/production-orders/${editingId}`, payload);
            } else {
                response = await api.post("/production-orders", payload);
            }

            if (!response.data?.success) {
                throw new Error(response.data?.message || "Production order could not be saved.");
            }

            setSuccess(editingId ? "Production order updated successfully." : "Production order created successfully.");
            setShowModal(false);
            setEditingId(null);
            setForm(initialForm);

            await loadOrders();
            setTimeout(() => {
                setSuccess("");
            }, 3000);
        } catch (err) {
            console.error("Production Order Save Error:", err);
            setError(err.response?.data?.message || err.message || "Unable to save production order.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (order) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete production order "${order.production_order_number}"?`
        );
        if (!confirmed) return;

        try {
            setError("");
            setSuccess("");
            const response = await api.delete(`/production-orders/${order.id}`);
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Unable to delete production order.");
            }

            setSuccess("Production order deleted successfully.");
            await loadOrders();
            setTimeout(() => {
                setSuccess("");
            }, 3000);
        } catch (err) {
            console.error("Production Order Delete Error:", err);
            setError(err.response?.data?.message || err.message || "Unable to delete production order.");
        }
    };

    return (
        <div className="po-page">
            {/* Header Card */}
            <div className="po-header-card">
                <div className="po-header-info">
                    <h1>Production Orders</h1>
                    <p>Manage shopfloor work orders, track good output, remaining balance, and batch progress.</p>
                </div>
                <div className="po-header-actions">
                    <button
                        type="button"
                        className="po-refresh-btn"
                        onClick={() => {
                            loadOrders();
                            loadOptions();
                        }}
                        title="Refresh List"
                    >
                        <RefreshCw size={17} className={loading ? "po-spin" : ""} />
                    </button>
                    <ExcelToolbar
                        moduleName="production_orders"
                        displayName="Production Orders"
                        onImportDone={loadOrders}
                    />
                    <button
                        type="button"
                        className="po-btn secondary"
                        onClick={handleSeed}
                        disabled={seeding}
                        title="Load sample production orders"
                    >
                        <Sparkles size={14} /> {seeding ? "Seeding..." : "Seed Orders"}
                    </button>
                    <button
                        type="button"
                        className="po-btn primary"
                        onClick={openCreateModal}
                    >
                        <Plus size={16} /> Create Production Order
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {success && (
                <div className="po-alert success">
                    <div className="po-alert-content">
                        <CheckCircle2 size={16} />
                        <span>{success}</span>
                    </div>
                    <button type="button" className="po-alert-close" onClick={() => setSuccess("")}><X size={14} /></button>
                </div>
            )}

            {error && !showModal && (
                <div className="po-alert error">
                    <div className="po-alert-content">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                    <button type="button" className="po-alert-close" onClick={() => setError("")}><X size={14} /></button>
                </div>
            )}

            {/* KPI Summary Stat Cards */}
            <div className="po-stats-grid">
                <div className="po-stat-card">
                    <div className="po-stat-icon-wrap blue">
                        <Layers size={20} />
                    </div>
                    <div className="po-stat-content">
                        <span className="po-stat-label">Total Orders</span>
                        <div className="po-stat-val">{statistics.total}</div>
                    </div>
                </div>

                <div className="po-stat-card">
                    <div className="po-stat-icon-wrap amber">
                        <Clock size={20} />
                    </div>
                    <div className="po-stat-content">
                        <span className="po-stat-label">Planned</span>
                        <div className="po-stat-val">{statistics.planned}</div>
                    </div>
                </div>

                <div className="po-stat-card">
                    <div className="po-stat-icon-wrap indigo">
                        <Cog size={20} />
                    </div>
                    <div className="po-stat-content">
                        <span className="po-stat-label">In Progress</span>
                        <div className="po-stat-val">{statistics.inProgress}</div>
                    </div>
                </div>

                <div className="po-stat-card">
                    <div className="po-stat-icon-wrap emerald">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="po-stat-content">
                        <span className="po-stat-label">Completed</span>
                        <div className="po-stat-val">{statistics.completed}</div>
                    </div>
                </div>

                <div className="po-stat-card">
                    <div className="po-stat-icon-wrap purple">
                        <Package size={20} />
                    </div>
                    <div className="po-stat-content">
                        <span className="po-stat-label">Planned Qty</span>
                        <div className="po-stat-val">{formatNumber(statistics.totalPlanned)}</div>
                    </div>
                </div>

                <div className="po-stat-card">
                    <div className="po-stat-icon-wrap teal">
                        <ShieldCheck size={20} />
                    </div>
                    <div className="po-stat-content">
                        <span className="po-stat-label">Good Output</span>
                        <div className="po-stat-val">{formatNumber(statistics.totalProduced)}</div>
                    </div>
                </div>
            </div>

            {/* Controls Toolbar */}
            <div className="po-controls-card">
                <div className="po-search-box">
                    <Search size={16} className="po-search-icon" />
                    <input
                        type="text"
                        placeholder="Search by order number, product code, product name, or sales order..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="po-filter-select"
                >
                    <option value="ALL">All Status</option>
                    {statusOptions.map((status) => (
                        <option key={status} value={status}>
                            {status.replace(/_/g, " ")}
                        </option>
                    ))}
                </select>
            </div>

            {/* Table Card */}
            <div className="po-table-card">
                <div className="po-table-header">
                    <div>
                        <h3>Production Order Register</h3>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="po-table-count">
                            {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
                        </span>
                        <span style={{ fontSize: "0.76rem", fontWeight: "600", color: "#16a34a", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a" }}></span> Live Database
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="po-empty-state">
                        <RefreshCw size={28} className="po-spin" style={{ color: "#0284c7", margin: "0 auto 10px" }} />
                        <h3>Loading Production Orders...</h3>
                        <p>Fetching scheduled orders and progress data from the manufacturing plant.</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="po-empty-state">
                        <Layers size={36} style={{ color: "#94a3b8", margin: "0 auto 10px" }} />
                        <h3>No Production Orders Found</h3>
                        <p>
                            {search || statusFilter !== "ALL"
                                ? "No production orders match your filter criteria."
                                : "Create your first production order or seed sample manufacturing orders to start scheduling."}
                        </p>
                        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                            <button type="button" className="po-btn primary" onClick={openCreateModal}>
                                <Plus size={15} /> Create Production Order
                            </button>
                            <button type="button" className="po-btn secondary" onClick={handleSeed} disabled={seeding}>
                                <Sparkles size={14} /> Seed Sample Orders
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="po-table-wrapper">
                        <table className="po-table">
                            <thead>
                                <tr>
                                    <th className="po-col-po">Production Order</th>
                                    <th className="po-col-so">Sales Order</th>
                                    <th className="po-col-product">Product</th>
                                    <th className="po-col-num">Planned</th>
                                    <th className="po-col-num">Good Output</th>
                                    <th className="po-col-num">Remaining</th>
                                    <th className="po-col-progress">Progress</th>
                                    <th className="po-col-priority">Priority</th>
                                    <th className="po-col-status">Status</th>
                                    <th className="po-col-date">Target Date</th>
                                    <th className="po-col-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => {
                                    const planned = Number(order.planned_quantity || 0);
                                    const good = Number(order.good_quantity || 0);
                                    const remaining = Math.max(0, planned - good);
                                    const percentage = planned > 0 ? Math.min(100, (good / planned) * 100) : 0;

                                    return (
                                        <tr key={order.id}>
                                            <td className="po-col-po">
                                                <span className="po-order-code">
                                                    {order.production_order_number}
                                                </span>
                                            </td>
                                            <td className="po-col-so">
                                                {order.sales_order_number ? (
                                                    <span className="po-so-badge">
                                                        {order.sales_order_number}
                                                    </span>
                                                ) : (
                                                    <span className="po-so-empty">—</span>
                                                )}
                                            </td>
                                            <td className="po-col-product">
                                                <div className="po-product-cell">
                                                    <span className="po-product-code">
                                                        {order.product_code || "—"}
                                                    </span>
                                                    <span className="po-product-name" title={order.product_name}>
                                                        {order.product_name || "Product"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="po-col-num">
                                                <strong>{formatNumber(planned)}</strong>
                                            </td>
                                            <td className="po-col-num">
                                                <strong style={{ color: "#16a34a" }}>{formatNumber(good)}</strong>
                                            </td>
                                            <td className="po-col-num">
                                                {formatNumber(remaining)}
                                            </td>
                                            <td className="po-col-progress">
                                                <div className="po-progress-wrapper">
                                                    <div className="po-progress-bar-bg">
                                                        <div
                                                            className={`po-progress-bar-fill ${percentage >= 100 ? "complete" : ""}`}
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="po-progress-text">{percentage.toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td className="po-col-priority">
                                                <span className={`po-priority ${String(order.priority || 'NORMAL').toLowerCase()}`}>
                                                    {order.priority || "NORMAL"}
                                                </span>
                                            </td>
                                            <td className="po-col-status">
                                                <span className={`po-badge ${getStatusClass(order.status)}`}>
                                                    {String(order.status || "").replace(/_/g, " ")}
                                                </span>
                                            </td>
                                            <td className="po-col-date">
                                                {formatDate(order.expected_completion_date)}
                                            </td>
                                            <td className="po-col-actions">
                                                <div className="po-actions-row">
                                                    <button
                                                        type="button"
                                                        className="po-tbl-btn job-card"
                                                        onClick={() => handleOpenJobCardPdf(order)}
                                                        title="Configure paper size (A4 / A5 / Letter) & download Job Card PDF"
                                                    >
                                                        <FileDown size={12} /> Job Card
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="po-tbl-btn"
                                                        onClick={() => openEditModal(order)}
                                                        title="Edit Order"
                                                    >
                                                        <Edit2 size={12} /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="po-tbl-btn delete"
                                                        onClick={() => handleDelete(order)}
                                                        title="Delete Order"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CREATE / EDIT MODAL */}
            {showModal && (
                <div
                    className="po-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeModal();
                        }
                    }}
                >
                    <div className="po-modal">
                        <div className="po-modal-header">
                            <h3>{editingId ? "Edit Production Order" : "Create Production Order"}</h3>
                            <button
                                type="button"
                                className="po-modal-close"
                                onClick={closeModal}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="po-modal-body">
                                {error && (
                                    <div className="po-alert error">
                                        <div className="po-alert-content">
                                            <AlertCircle size={16} />
                                            <span>{error}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="po-form-grid-2">
                                    <div className="po-field">
                                        <label>Production Order Number *</label>
                                        <input
                                            type="text"
                                            required
                                            name="production_order_number"
                                            value={form.production_order_number}
                                            onChange={handleChange}
                                            placeholder="PO-2026-0001"
                                        />
                                    </div>

                                    <div className="po-field">
                                        <label>Linked Sales Order</label>
                                        <select
                                            name="sales_order_id"
                                            value={form.sales_order_id}
                                            onChange={handleChange}
                                        >
                                            <option value="">Independent Manufacturing (No Sales Order)</option>
                                            {options.salesOrders.map((so) => (
                                                <option key={so.id} value={so.id}>
                                                    {so.order_number} — {so.customer_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="po-field">
                                    <label>Finished Product to Manufacture *</label>
                                    <select
                                        required
                                        name="product_id"
                                        value={form.product_id}
                                        onChange={handleProductChange}
                                    >
                                        <option value="">Select Target Finished Product</option>
                                        {options.products.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.product_code} — {p.product_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="po-form-grid-2">
                                    <div className="po-field">
                                        <label>Planned Quantity (Units) *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            required
                                            name="planned_quantity"
                                            value={form.planned_quantity}
                                            onChange={handleChange}
                                            placeholder="e.g. 500"
                                        />
                                    </div>

                                    <div className="po-field">
                                        <label>Target Quantity (Good Output) *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            required
                                            name="target_quantity"
                                            value={form.target_quantity}
                                            onChange={handleChange}
                                            placeholder="e.g. 500"
                                        />
                                    </div>
                                </div>

                                <div className="po-form-grid-2">
                                    <div className="po-field">
                                        <label>Scheduled Start Date</label>
                                        <input
                                            type="date"
                                            name="production_date"
                                            value={form.production_date}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="po-field">
                                        <label>Expected Completion Date</label>
                                        <input
                                            type="date"
                                            name="expected_completion_date"
                                            value={form.expected_completion_date}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="po-form-grid-2">
                                    <div className="po-field">
                                        <label>Priority</label>
                                        <select
                                            name="priority"
                                            value={form.priority}
                                            onChange={handleChange}
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="NORMAL">Normal</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent</option>
                                        </select>
                                    </div>

                                    <div className="po-field">
                                        <label>Assigned Shift</label>
                                        <select
                                            name="shift"
                                            value={form.shift}
                                            onChange={handleChange}
                                        >
                                            <option value="DAY">Day Shift</option>
                                            <option value="NIGHT">Night Shift</option>
                                            <option value="GENERAL">General Shift</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="po-form-grid-2">
                                    <div className="po-field">
                                        <label>Assigned Supervisor / Lead</label>
                                        <select
                                            name="supervisor_id"
                                            value={form.supervisor_id}
                                            onChange={handleChange}
                                        >
                                            <option value="">Unassigned</option>
                                            {options.supervisors.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} ({s.designation || "Supervisor"})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="po-field">
                                        <label>Production Order Status</label>
                                        <select
                                            name="status"
                                            value={form.status}
                                            onChange={handleChange}
                                        >
                                            {statusOptions.map((status) => (
                                                <option key={status} value={status}>
                                                    {status.replace(/_/g, " ")}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="po-field">
                                    <label>Manufacturing Remarks / Line Notes</label>
                                    <textarea
                                        rows="3"
                                        name="remarks"
                                        value={form.remarks}
                                        onChange={handleChange}
                                        placeholder="Add machine allocation, calendering specs, embossing roller notes..."
                                    />
                                </div>
                            </div>

                            <div className="po-modal-footer">
                                <button
                                    type="button"
                                    className="po-btn secondary"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="po-btn primary"
                                    disabled={saving}
                                >
                                    <CheckCircle2 size={16} /> {saving ? "Saving..." : editingId ? "Update Order" : "Release Order"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PDF EXPORT MODAL */}
            <PdfExportModal
                isOpen={pdfModal.isOpen}
                onClose={() => setPdfModal(prev => ({ ...prev, isOpen: false }))}
                apiEndpoint={pdfModal.endpoint}
                documentTitle={pdfModal.title}
                referenceNumber={pdfModal.docNumber}
            />
        </div>
    );
}