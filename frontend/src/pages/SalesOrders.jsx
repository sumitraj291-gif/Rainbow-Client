import React, { useEffect, useMemo, useState } from "react";
import {
    ShoppingCart,
    Clock,
    Layers,
    CheckCircle2,
    IndianRupee,
    Plus,
    RefreshCw,
    Sparkles,
    Search,
    Edit2,
    Trash2,
    X,
    AlertCircle,
    Calendar,
    Building2,
    Package,
    ArrowLeft,
    Check,
    Eye
} from "lucide-react";
import api from "../services/api";
import "./SalesOrders.css";

const emptyItem = {
    product_id: "",
    ordered_quantity: "",
    unit_price: "",
    delivery_date: "",
    specification: ""
};

const initialForm = {
    order_number: "",
    customer_id: "",
    order_date: new Date().toISOString().split("T")[0],
    expected_delivery_date: "",
    priority: "NORMAL",
    status: "DRAFT",
    notes: "",
    items: [{ ...emptyItem }]
};

function SalesOrders() {
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);

    const [form, setForm] = useState(initialForm);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [showForm, setShowForm] = useState(false);

    // View Order Details Modal
    const [viewingOrder, setViewingOrder] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    const handleViewOrder = async (id) => {
        try {
            setViewLoading(true);
            const res = await api.get(`/sales-orders/${id}`);
            if (res.data?.success) {
                setViewingOrder(res.data.data);
            }
        } catch (err) {
            console.error("View order error:", err);
            setError("Failed to fetch order details");
        } finally {
            setViewLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            const [ordersResponse, optionsResponse] = await Promise.all([
                api.get("/sales-orders"),
                api.get("/sales-orders/options")
            ]);

            if (ordersResponse.data.success) {
                setOrders(ordersResponse.data.data || []);
            }

            if (optionsResponse.data.success) {
                setCustomers(optionsResponse.data.data.customers || []);
                setProducts(optionsResponse.data.data.products || []);
            }

        } catch (err) {
            console.error(err);
            setError(
                err.response?.data?.message ||
                "Failed to load sales order data"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSeed = async () => {
        try {
            setSeeding(true);
            setError("");
            const res = await api.post("/sales-orders/seed");
            if (res.data.success) {
                setSuccess(res.data.message);
                await loadData();
            }
        } catch (err) {
            console.error("Seed error:", err);
            setError(err.response?.data?.message || "Failed to seed sales orders");
        } finally {
            setSeeding(false);
        }
    };

    // Filtered orders
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const searchText = search.toLowerCase();

            const matchesSearch =
                !search ||
                order.order_number?.toLowerCase().includes(searchText) ||
                order.customer_name?.toLowerCase().includes(searchText);

            const matchesStatus =
                statusFilter === "ALL" ||
                order.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [orders, search, statusFilter]);

    // KPI Summary Stats
    const stats = useMemo(() => {
        const totalOrders = orders.length;
        const confirmedOrders = orders.filter(o => o.status === "CONFIRMED" || o.status === "DRAFT").length;
        const inProductionOrders = orders.filter(o => o.status === "IN_PRODUCTION" || o.status === "PARTIAL").length;
        const completedOrders = orders.filter(o => o.status === "COMPLETED").length;
        const totalAmount = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        return { totalOrders, confirmedOrders, inProductionOrders, completedOrders, totalAmount };
    }, [orders]);

    const calculateLineTotal = (item) => {
        const quantity = Number(item.ordered_quantity) || 0;
        const price = Number(item.unit_price) || 0;
        return quantity * price;
    };

    const totalQuantity = form.items.reduce(
        (sum, item) => sum + (Number(item.ordered_quantity) || 0),
        0
    );

    const subtotal = form.items.reduce(
        (sum, item) => sum + calculateLineTotal(item),
        0
    );

    const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(value || 0);
    };

    const resetForm = () => {
        setForm({
            ...initialForm,
            order_number: ""
        });
        setEditingId(null);
        setShowForm(false);
        setError("");
    };

    const openCreateForm = () => {
        setSuccess("");
        setError("");

        const generatedNumber = `SO-${new Date().getFullYear()}-${String(
            orders.length + 1
        ).padStart(4, "0")}`;

        setForm({
            ...initialForm,
            order_number: generatedNumber
        });

        setEditingId(null);
        setShowForm(true);
    };

    const handleHeaderChange = (e) => {
        const { name, value } = e.target;
        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleItemChange = (index, field, value) => {
        setForm((previous) => {
            const items = [...previous.items];
            items[index] = {
                ...items[index],
                [field]: value
            };

            if (field === "product_id") {
                const product = products.find(
                    (p) => String(p.id) === String(value)
                );
                if (product) {
                    items[index].unit_price = product.selling_price || "0.00";
                }
            }

            if (field === "delivery_date" && !value && form.expected_delivery_date) {
                items[index].delivery_date = form.expected_delivery_date;
            }

            return {
                ...previous,
                items
            };
        });
    };

    const addItem = () => {
        setForm((previous) => ({
            ...previous,
            items: [
                ...previous.items,
                {
                    ...emptyItem,
                    delivery_date: previous.expected_delivery_date || ""
                }
            ]
        }));
    };

    const removeItem = (index) => {
        if (form.items.length === 1) return;
        setForm((previous) => ({
            ...previous,
            items: previous.items.filter((_, itemIndex) => itemIndex !== index)
        }));
    };

    const validateForm = () => {
        if (!form.order_number.trim()) return "Order number is required";
        if (!form.customer_id) return "Please select a customer";
        if (!form.order_date) return "Order date is required";
        if (form.items.length === 0) return "Add at least one product";

        for (let i = 0; i < form.items.length; i++) {
            const item = form.items[i];
            if (!item.product_id) return `Please select a product in row ${i + 1}`;
            if (!item.ordered_quantity || Number(item.ordered_quantity) <= 0) {
                return `Enter a valid quantity in row ${i + 1}`;
            }
            if (item.unit_price === "" || Number(item.unit_price) < 0) {
                return `Enter a valid unit price in row ${i + 1}`;
            }
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setSaving(true);

            const payload = {
                order_number: form.order_number.trim(),
                customer_id: Number(form.customer_id),
                order_date: form.order_date,
                expected_delivery_date: form.expected_delivery_date || null,
                priority: form.priority,
                status: form.status,
                notes: form.notes.trim() || null,
                items: form.items.map((item) => ({
                    product_id: Number(item.product_id),
                    ordered_quantity: Number(item.ordered_quantity),
                    unit_price: Number(item.unit_price),
                    delivery_date: item.delivery_date || form.expected_delivery_date || null,
                    specification: item.specification?.trim() || null
                }))
            };

            if (editingId) {
                await api.put(`/sales-orders/${editingId}`, payload);
                setSuccess("Sales order updated successfully.");
            } else {
                await api.post("/sales-orders", payload);
                setSuccess("Sales order created successfully.");
            }

            await loadData();
            setTimeout(() => {
                resetForm();
            }, 700);

        } catch (err) {
            console.error(err);
            setError(
                err.response?.data?.message ||
                "Failed to save sales order"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async (id) => {
        try {
            setError("");
            setSuccess("");

            const response = await api.get(`/sales-orders/${id}`);
            if (!response.data.success) {
                throw new Error("Unable to load sales order");
            }

            const order = response.data.data;

            setForm({
                order_number: order.order_number,
                customer_id: String(order.customer_id),
                order_date: order.order_date ? order.order_date.substring(0, 10) : "",
                expected_delivery_date: order.expected_delivery_date ? order.expected_delivery_date.substring(0, 10) : "",
                priority: order.priority || "NORMAL",
                status: order.status || "DRAFT",
                notes: order.notes || "",
                items: order.items?.length
                    ? order.items.map((item) => ({
                          product_id: String(item.product_id),
                          ordered_quantity: item.ordered_quantity,
                          unit_price: item.unit_price,
                          delivery_date: item.delivery_date ? item.delivery_date.substring(0, 10) : "",
                          specification: item.specification || ""
                      }))
                    : [{ ...emptyItem }]
            });

            setEditingId(id);
            setShowForm(true);

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to load sales order");
        }
    };

    const handleDelete = async (id) => {
        const confirmed = window.confirm("Are you sure you want to delete this sales order?");
        if (!confirmed) return;

        try {
            setError("");
            setSuccess("");
            await api.delete(`/sales-orders/${id}`);
            setSuccess("Sales order deleted successfully.");
            await loadData();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to delete sales order");
        }
    };

    return (
        <div className="so-page">
            {!showForm ? (
                <>
                    {/* Header Card */}
                    <div className="so-header-card">
                        <div className="so-header-info">
                            <h1>Sales Orders</h1>
                            <p>Manage customer sales orders, track demand, and trigger production planning.</p>
                        </div>
                        <div className="so-header-actions">
                            <button
                                type="button"
                                className="so-refresh-btn"
                                onClick={loadData}
                                title="Refresh List"
                            >
                                <RefreshCw size={14} className={loading ? "so-spin" : ""} />
                            </button>
                            <button
                                type="button"
                                className="so-btn secondary"
                                onClick={handleSeed}
                                disabled={seeding}
                                title="Load sample sales orders"
                            >
                                <Sparkles size={13} /> {seeding ? "Seeding..." : "Seed Orders"}
                            </button>
                            <button
                                type="button"
                                className="so-btn primary"
                                onClick={openCreateForm}
                            >
                                <Plus size={14} /> New Sales Order
                            </button>
                        </div>
                    </div>

                    {/* Notifications */}
                    {error && (
                        <div className="so-alert error">
                            <div className="so-alert-content">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                            <button type="button" className="so-alert-close" onClick={() => setError("")}><X size={14} /></button>
                        </div>
                    )}
                    {success && (
                        <div className="so-alert success">
                            <div className="so-alert-content">
                                <CheckCircle2 size={16} />
                                <span>{success}</span>
                            </div>
                            <button type="button" className="so-alert-close" onClick={() => setSuccess("")}><X size={14} /></button>
                        </div>
                    )}

                    {/* KPI Summary Cards */}
                    <div className="so-stats-grid">
                        <div className="so-stat-card">
                            <div className="so-stat-icon-wrap blue">
                                <ShoppingCart size={20} />
                            </div>
                            <div className="so-stat-content">
                                <span className="so-stat-label">Total Orders</span>
                                <div className="so-stat-val">{stats.totalOrders}</div>
                            </div>
                        </div>

                        <div className="so-stat-card">
                            <div className="so-stat-icon-wrap amber">
                                <Clock size={20} />
                            </div>
                            <div className="so-stat-content">
                                <span className="so-stat-label">Pending / Confirmed</span>
                                <div className="so-stat-val">{stats.confirmedOrders}</div>
                            </div>
                        </div>

                        <div className="so-stat-card">
                            <div className="so-stat-icon-wrap indigo">
                                <Layers size={20} />
                            </div>
                            <div className="so-stat-content">
                                <span className="so-stat-label">In Production</span>
                                <div className="so-stat-val">{stats.inProductionOrders}</div>
                            </div>
                        </div>

                        <div className="so-stat-card">
                            <div className="so-stat-icon-wrap emerald">
                                <CheckCircle2 size={20} />
                            </div>
                            <div className="so-stat-content">
                                <span className="so-stat-label">Completed Orders</span>
                                <div className="so-stat-val">{stats.completedOrders}</div>
                            </div>
                        </div>

                        <div className="so-stat-card">
                            <div className="so-stat-icon-wrap purple">
                                <IndianRupee size={20} />
                            </div>
                            <div className="so-stat-content">
                                <span className="so-stat-label">Total Demand</span>
                                <div className="so-stat-val">₹{(stats.totalAmount / 100000).toFixed(2)} Lakhs</div>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filters Toolbar */}
                    <div className="so-controls-card">
                        <div className="so-search-box">
                            <Search size={16} className="so-search-icon" />
                            <input
                                type="text"
                                placeholder="Search by order number or customer name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <select
                            className="so-filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">All Status</option>
                            <option value="DRAFT">Draft</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="PARTIAL">Partial</option>
                            <option value="IN_PRODUCTION">In Production</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>

                    {/* Table View */}
                    <div className="so-table-card">
                        <div className="so-table-header">
                            <h3>Customer Orders</h3>
                            <span className="so-table-count">
                                {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
                            </span>
                        </div>

                        {loading ? (
                            <div className="so-empty-state">
                                <RefreshCw size={28} className="so-spin" style={{ color: "#0284c7", margin: "0 auto 10px" }} />
                                <h3>Loading Sales Orders...</h3>
                                <p>Fetching customer demand records from the database.</p>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="so-empty-state">
                                <ShoppingCart size={36} style={{ color: "#94a3b8", margin: "0 auto 10px" }} />
                                <h3>No Sales Orders Found</h3>
                                <p>
                                    {search || statusFilter !== "ALL"
                                        ? "No orders match your filter criteria."
                                        : "Create your first sales order or seed sample PVC mat factory orders to begin planning."}
                                </p>
                                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                                    <button type="button" className="so-btn primary" onClick={openCreateForm}>
                                        <Plus size={15} /> New Sales Order
                                    </button>
                                    <button type="button" className="so-btn secondary" onClick={handleSeed} disabled={seeding}>
                                        <Sparkles size={14} /> Seed Sample Orders
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <table className="so-table">
                                <thead>
                                    <tr>
                                        <th style={{ minWidth: "125px" }}>Order #</th>
                                        <th>Customer</th>
                                        <th>Order Date</th>
                                        <th>Delivery</th>
                                        <th>Items</th>
                                        <th style={{ textAlign: "right" }}>Total Qty</th>
                                        <th style={{ textAlign: "right" }}>Amount</th>
                                        <th style={{ textAlign: "center" }}>Priority</th>
                                        <th style={{ textAlign: "center" }}>Status</th>
                                        <th style={{ textAlign: "right", minWidth: "150px" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((order) => (
                                        <tr key={order.id}>
                                            <td>
                                                <span
                                                    className="so-order-code"
                                                    onClick={() => handleViewOrder(order.id)}
                                                    title="Click to view order details"
                                                >
                                                    {order.order_number}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="so-customer-name">{order.customer_name}</span>
                                            </td>
                                            <td>{formatDate(order.order_date)}</td>
                                            <td>{formatDate(order.expected_delivery_date)}</td>
                                            <td>
                                                {order.item_count || 1} {Number(order.item_count || 1) === 1 ? "item" : "items"}
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                <strong>{Number(order.total_quantity || 0).toLocaleString("en-IN")} pcs</strong>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                <strong>{formatCurrency(order.total_amount)}</strong>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <span className={`so-priority ${String(order.priority || 'NORMAL').toLowerCase()}`}>
                                                    {order.priority || "NORMAL"}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <span className={`so-badge ${String(order.status || 'DRAFT').toLowerCase().replace('_', '-')}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="so-actions-row">
                                                    <button
                                                        type="button"
                                                        className="so-tbl-btn"
                                                        onClick={() => handleViewOrder(order.id)}
                                                        title="View Order Details"
                                                    >
                                                        <Eye size={13} /> View
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="so-tbl-btn"
                                                        onClick={() => handleEdit(order.id)}
                                                        title="Edit Sales Order"
                                                    >
                                                        <Edit2 size={13} /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="so-tbl-btn delete"
                                                        onClick={() => handleDelete(order.id)}
                                                        title="Delete Sales Order"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            ) : (
                /* Form View */
                <form className="so-form-card" onSubmit={handleSubmit}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
                        <div>
                            <h2 style={{ margin: "0 0 4px", fontSize: "1.35rem", fontWeight: "700", color: "#0f172a" }}>
                                {editingId ? "Edit Sales Order" : "New Sales Order"}
                            </h2>
                            <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748b" }}>
                                Specify customer demand, delivery commitments, and product line items.
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button type="button" className="so-btn secondary" onClick={resetForm}>
                                Cancel
                            </button>
                            <button type="submit" className="so-btn primary" disabled={saving}>
                                <CheckCircle2 size={16} /> {saving ? "Saving..." : editingId ? "Update Sales Order" : "Save Sales Order"}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="so-alert error">
                            <div className="so-alert-content">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                            <button type="button" className="so-alert-close" onClick={() => setError("")}><X size={14} /></button>
                        </div>
                    )}

                    {/* Order Information Section */}
                    <div>
                        <div className="so-form-section-title">
                            Order Information
                        </div>
                        <div className="so-form-grid-3">
                            <div className="so-field">
                                <label>Order Number *</label>
                                <input
                                    type="text"
                                    required
                                    name="order_number"
                                    value={form.order_number}
                                    onChange={handleHeaderChange}
                                    placeholder="SO-2026-0001"
                                />
                            </div>

                            <div className="so-field">
                                <label>Customer *</label>
                                <select
                                    required
                                    name="customer_id"
                                    value={form.customer_id}
                                    onChange={handleHeaderChange}
                                >
                                    <option value="">Select Customer</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.company_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="so-field">
                                <label>Order Date *</label>
                                <input
                                    type="date"
                                    required
                                    name="order_date"
                                    value={form.order_date}
                                    onChange={handleHeaderChange}
                                />
                            </div>

                            <div className="so-field">
                                <label>Expected Delivery Date</label>
                                <input
                                    type="date"
                                    name="expected_delivery_date"
                                    value={form.expected_delivery_date}
                                    onChange={handleHeaderChange}
                                />
                            </div>

                            <div className="so-field">
                                <label>Priority</label>
                                <select
                                    name="priority"
                                    value={form.priority}
                                    onChange={handleHeaderChange}
                                >
                                    <option value="LOW">Low</option>
                                    <option value="NORMAL">Normal</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                            </div>

                            <div className="so-field">
                                <label>Status</label>
                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleHeaderChange}
                                >
                                    <option value="DRAFT">Draft</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="PARTIAL">Partial</option>
                                    <option value="IN_PRODUCTION">In Production</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Line Items Section */}
                    <div>
                        <div className="so-form-section-title">
                            <span>Order Products & Quantities</span>
                            <button
                                type="button"
                                className="so-btn secondary"
                                onClick={addItem}
                                style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                            >
                                <Plus size={14} /> Add Product
                            </button>
                        </div>

                        <table className="so-items-table">
                            <thead>
                                <tr>
                                    <th style={{ width: "35%" }}>Product *</th>
                                    <th style={{ width: "15%" }}>Quantity (pcs) *</th>
                                    <th style={{ width: "15%" }}>Unit Price (₹) *</th>
                                    <th style={{ width: "15%" }}>Delivery Date</th>
                                    <th style={{ width: "15%" }}>Line Total</th>
                                    <th style={{ width: "5%" }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {form.items.map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <select
                                                required
                                                value={item.product_id}
                                                onChange={(e) => handleItemChange(index, "product_id", e.target.value)}
                                            >
                                                <option value="">Select Product</option>
                                                {products.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.product_code} — {p.product_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                required
                                                placeholder="0"
                                                value={item.ordered_quantity}
                                                onChange={(e) => handleItemChange(index, "ordered_quantity", e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                required
                                                placeholder="0.00"
                                                value={item.unit_price}
                                                onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="date"
                                                value={item.delivery_date}
                                                onChange={(e) => handleItemChange(index, "delivery_date", e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <strong>{formatCurrency(calculateLineTotal(item))}</strong>
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            {form.items.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="so-tbl-btn delete"
                                                    onClick={() => removeItem(index)}
                                                    title="Remove item"
                                                    style={{ padding: "4px 8px" }}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Order Notes & Summary Panel */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                        <div className="so-field">
                            <label>Order Notes / Special Instructions</label>
                            <textarea
                                rows="4"
                                name="notes"
                                value={form.notes}
                                onChange={handleHeaderChange}
                                placeholder="Enter customer instructions, delivery specifications, packaging requirements..."
                            />
                        </div>

                        <div className="so-summary-panel">
                            <div className="so-summary-stats">
                                <div className="so-summary-item">
                                    <span>Total Items</span>
                                    <strong>{form.items.length}</strong>
                                </div>
                                <div className="so-summary-item">
                                    <span>Total Quantity</span>
                                    <strong>{totalQuantity.toLocaleString("en-IN")} pcs</strong>
                                </div>
                                <div className="so-summary-item">
                                    <span>Order Total</span>
                                    <strong style={{ color: "#0284c7" }}>{formatCurrency(subtotal)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Save & Cancel Buttons */}
                    <div className="so-form-bottom-actions">
                        <button type="button" className="so-btn secondary" onClick={resetForm}>
                            Cancel
                        </button>
                        <button type="submit" className="so-btn primary" disabled={saving}>
                            <CheckCircle2 size={16} /> {saving ? "Saving..." : editingId ? "Update Sales Order" : "Save Sales Order"}
                        </button>
                    </div>
                </form>
            )}

            {/* VIEW ORDER DETAILS MODAL */}
            {viewingOrder && (
                <div className="so-modal-backdrop" onClick={() => setViewingOrder(null)}>
                    <div className="so-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="so-modal-header">
                            <div>
                                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#0284c7", textTransform: "uppercase" }}>
                                    SALES ORDER DETAILS
                                </span>
                                <h2>{viewingOrder.order_number}</h2>
                            </div>
                            <button type="button" className="so-modal-close" onClick={() => setViewingOrder(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="so-modal-body">
                            <div className="so-modal-meta-grid">
                                <div className="so-modal-meta-item">
                                    <span className="so-modal-meta-lbl">Customer</span>
                                    <span className="so-modal-meta-val">{viewingOrder.customer_name}</span>
                                </div>
                                <div className="so-modal-meta-item">
                                    <span className="so-modal-meta-lbl">Order Date</span>
                                    <span className="so-modal-meta-val">{formatDate(viewingOrder.order_date)}</span>
                                </div>
                                <div className="so-modal-meta-item">
                                    <span className="so-modal-meta-lbl">Expected Delivery</span>
                                    <span className="so-modal-meta-val">{formatDate(viewingOrder.expected_delivery_date)}</span>
                                </div>
                                <div className="so-modal-meta-item">
                                    <span className="so-modal-meta-lbl">Priority & Status</span>
                                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                                        <span className={`so-priority ${String(viewingOrder.priority || 'NORMAL').toLowerCase()}`}>
                                            {viewingOrder.priority}
                                        </span>
                                        <span className={`so-badge ${String(viewingOrder.status || 'DRAFT').toLowerCase().replace('_', '-')}`}>
                                            {viewingOrder.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ margin: "0 0 8px", fontSize: "0.86rem", fontWeight: 700, color: "#0f172a" }}>
                                    Ordered Items & Specifications
                                </h4>
                                <table className="so-table" style={{ border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Product</th>
                                            <th>Specification</th>
                                            <th style={{ textAlign: "right" }}>Quantity</th>
                                            <th style={{ textAlign: "right" }}>Unit Price</th>
                                            <th style={{ textAlign: "right" }}>Line Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewingOrder.items?.map((item, idx) => (
                                            <tr key={item.id || idx}>
                                                <td>{idx + 1}</td>
                                                <td>
                                                    <strong>{item.product_name}</strong>
                                                    {item.product_code && (
                                                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                                            {item.product_code}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>{item.specification || "Standard Factory Spec"}</td>
                                                <td style={{ textAlign: "right" }}>
                                                    <strong>{Number(item.ordered_quantity).toLocaleString("en-IN")} pcs</strong>
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    {formatCurrency(item.unit_price)}
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    <strong>{formatCurrency(item.line_total || (item.ordered_quantity * item.unit_price))}</strong>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {viewingOrder.notes && (
                                <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "6px", fontSize: "0.82rem", color: "#475569" }}>
                                    <strong>Notes:</strong> {viewingOrder.notes}
                                </div>
                            )}
                        </div>

                        <div className="so-modal-actions">
                            <button type="button" className="so-btn secondary" onClick={() => setViewingOrder(null)}>
                                Close
                            </button>
                            <button
                                type="button"
                                className="so-btn primary"
                                onClick={() => {
                                    const id = viewingOrder.id;
                                    setViewingOrder(null);
                                    handleEdit(id);
                                }}
                            >
                                <Edit2 size={13} /> Edit Order
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SalesOrders;