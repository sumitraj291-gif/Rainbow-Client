import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
    Plus,
    Search,
    RefreshCw,
    Building2,
    Users,
    CheckCircle2,
    XCircle,
    MapPin,
    Eye,
    Edit2,
    Trash2,
    X,
    Sparkles,
    ShieldAlert,
    AlertCircle
} from "lucide-react";
import ExcelToolbar from "../components/ExcelToolbar";
import "./Customers.css";

const initialForm = {
    customer_code: "",
    company_name: "",
    contact_person: "",
    phone: "",
    email: "",
    gst_number: "",
    billing_address: "",
    shipping_address: "",
    city: "",
    state: "",
    pincode: "",
    credit_limit: "0",
    payment_terms: "Net 30 Days",
    status: "ACTIVE"
};

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        active_count: 0,
        inactive_count: 0,
        city_count: 0
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);

    // Detail Modal State
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Delete Modal State
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Notifications
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            setError("");

            const params = {};
            if (statusFilter !== "ALL") params.status = statusFilter;
            if (search.trim()) params.search = search.trim();

            const response = await api.get("/customers", { params });

            if (response.data && response.data.success) {
                setCustomers(response.data.data || []);
                if (response.data.stats) {
                    setStats(response.data.stats);
                }
            } else if (Array.isArray(response.data)) {
                setCustomers(response.data);
            }
        } catch (err) {
            console.error("Error fetching customers:", err);
            setError(err.response?.data?.message || "Failed to load customers from server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [statusFilter]);

    // Handle Search Submit
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchCustomers();
    };

    // Open Modal for Create
    const handleOpenAddModal = () => {
        setEditingId(null);
        setForm({
            ...initialForm,
            customer_code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`
        });
        setError("");
        setShowModal(true);
    };

    // Open Modal for Edit
    const handleOpenEditModal = (customer) => {
        setEditingId(customer.id);
        setForm({
            customer_code: customer.customer_code || "",
            company_name: customer.company_name || "",
            contact_person: customer.contact_person || "",
            phone: customer.phone || "",
            email: customer.email || "",
            gst_number: customer.gst_number || "",
            billing_address: customer.billing_address || "",
            shipping_address: customer.shipping_address || "",
            city: customer.city || "",
            state: customer.state || "",
            pincode: customer.pincode || "",
            credit_limit: customer.credit_limit || "0",
            payment_terms: customer.payment_terms || "Net 30 Days",
            status: customer.status || "ACTIVE"
        });
        setError("");
        setShowModal(true);
    };

    // Generate random code helper
    const handleGenerateCode = () => {
        setForm((prev) => ({
            ...prev,
            customer_code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`
        }));
    };

    // Handle Form Change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Handle Save Form (Add or Edit)
    const handleSaveCustomer = async (e) => {
        e.preventDefault();
        if (!form.company_name.trim()) {
            setError("Company name is required.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            if (editingId) {
                // Update
                const response = await api.put(`/customers/${editingId}`, form);
                if (response.data && response.data.success) {
                    setSuccess("Customer updated successfully!");
                } else {
                    setSuccess("Customer updated.");
                }
            } else {
                // Create
                const response = await api.post("/customers", form);
                if (response.data && response.data.success) {
                    setSuccess("Customer created successfully!");
                } else {
                    setSuccess("Customer created.");
                }
            }

            setShowModal(false);
            fetchCustomers();
            setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
            console.error("Save customer error:", err);
            setError(err.response?.data?.message || "Failed to save customer record.");
        } finally {
            setSaving(false);
        }
    };

    // View Details
    const handleViewDetails = (customer) => {
        setSelectedCustomer(customer);
        setShowDetailModal(true);
    };

    // Delete Customer
    const handleDeleteClick = (customer) => {
        setCustomerToDelete(customer);
    };

    const confirmDelete = async () => {
        if (!customerToDelete) return;

        try {
            setDeleting(true);
            setError("");
            await api.delete(`/customers/${customerToDelete.id}`);
            setSuccess(`Customer ${customerToDelete.company_name} deleted successfully.`);
            setCustomerToDelete(null);
            fetchCustomers();
            setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
            console.error("Delete customer error:", err);
            setError(err.response?.data?.message || "Failed to delete customer.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="customers-page">
            {/* Header matching screenshot with functional Add button */}
            <div className="customers-header-card">
                <div className="customers-header-info">
                    <h1>Customers</h1>
                    <p>Manage wholesale buyers, retail distributors, and institutional clients.</p>
                </div>

                <div className="customers-header-actions">
                    <button
                        className="cust-refresh-btn"
                        onClick={fetchCustomers}
                        title="Refresh List"
                        type="button"
                    >
                        <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                    </button>

                    <ExcelToolbar
                        moduleName="customers"
                        displayName="Customers"
                        onImportDone={fetchCustomers}
                    />

                    <button
                        id="add-customer-button"
                        className="primary-button cust-primary-btn"
                        onClick={handleOpenAddModal}
                        type="button"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        Add Customer
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {success && (
                <div className="cust-alert success">
                    <CheckCircle2 size={18} />
                    <span>{success}</span>
                </div>
            )}

            {error && (
                <div className="cust-alert error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* Metric KPI Cards */}
            <div className="customers-stats-grid">
                <div className="cust-stat-card">
                    <div className="cust-stat-icon blue">
                        <Building2 size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Total Accounts</span>
                        <span className="cust-stat-value">{stats.total || customers.length}</span>
                    </div>
                </div>

                <div className="cust-stat-card">
                    <div className="cust-stat-icon green">
                        <CheckCircle2 size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Active Clients</span>
                        <span className="cust-stat-value">{stats.active_count || customers.filter(c => c.status === "ACTIVE").length}</span>
                    </div>
                </div>

                <div className="cust-stat-card">
                    <div className="cust-stat-icon amber">
                        <XCircle size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Inactive</span>
                        <span className="cust-stat-value">{stats.inactive_count || customers.filter(c => c.status === "INACTIVE").length}</span>
                    </div>
                </div>

                <div className="cust-stat-card">
                    <div className="cust-stat-icon purple">
                        <MapPin size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Territories / Cities</span>
                        <span className="cust-stat-value">{stats.city_count || new Set(customers.map(c => c.city).filter(Boolean)).size || 0}</span>
                    </div>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="customers-filter-bar">
                <form className="cust-search-wrap" onSubmit={handleSearchSubmit}>
                    <Search size={16} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Search by company, code, contact or city..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>

                <div className="cust-filter-group">
                    <select
                        className="cust-filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="ACTIVE">Active Only</option>
                        <option value="INACTIVE">Inactive Only</option>
                    </select>

                    <button
                        className="cust-primary-btn"
                        style={{ height: "36px", padding: "0 14px", fontSize: "0.82rem" }}
                        onClick={fetchCustomers}
                        type="button"
                    >
                        Apply Filter
                    </button>
                </div>
            </div>

            {/* Main Customers Table */}
            <div className="customers-table-card">
                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
                        <p>Loading customers...</p>
                    </div>
                ) : customers.length === 0 ? (
                    <div style={{ padding: "50px", textAlign: "center", color: "#64748b" }}>
                        <Building2 size={36} color="#cbd5e1" style={{ margin: "0 auto 12px" }} />
                        <h3 style={{ margin: "0 0 6px 0", color: "#334155" }}>No Customers Found</h3>
                        <p style={{ margin: 0, fontSize: "0.85rem" }}>
                            {search ? "No records matched your search query." : "Click '+ Add Customer' to register your first client."}
                        </p>
                    </div>
                ) : (
                    <table className="cust-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Company</th>
                                <th>Contact</th>
                                <th>Phone</th>
                                <th>City</th>
                                <th>Status</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {customers.map((customer) => (
                                <tr key={customer.id}>
                                    <td>
                                        <span className="cust-code-badge">
                                            {customer.customer_code}
                                        </span>
                                    </td>

                                    <td>
                                        <div className="cust-company-name">
                                            {customer.company_name}
                                        </div>
                                        {customer.gst_number && (
                                            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                                                GST: {customer.gst_number}
                                            </div>
                                        )}
                                    </td>

                                    <td>{customer.contact_person || "—"}</td>

                                    <td>{customer.phone || "—"}</td>

                                    <td>{customer.city || "—"}</td>

                                    <td>
                                        <span
                                            className={`cust-status-badge ${
                                                customer.status === "ACTIVE" ? "active" : "inactive"
                                            }`}
                                        >
                                            {customer.status || "ACTIVE"}
                                        </span>
                                    </td>

                                    <td style={{ textAlign: "right" }}>
                                        <div className="cust-actions-cell" style={{ justifyContent: "flex-end" }}>
                                            <button
                                                className="cust-action-btn"
                                                onClick={() => handleViewDetails(customer)}
                                                title="View Details"
                                                type="button"
                                            >
                                                <Eye size={15} />
                                            </button>
                                            <button
                                                className="cust-action-btn edit"
                                                onClick={() => handleOpenEditModal(customer)}
                                                title="Edit Customer"
                                                type="button"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button
                                                className="cust-action-btn delete"
                                                onClick={() => handleDeleteClick(customer)}
                                                title="Delete Customer"
                                                type="button"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add / Edit Customer Modal */}
            {showModal && (
                <div className="cust-modal-overlay">
                    <div className="cust-modal-card">
                        <div className="cust-modal-header">
                            <div className="cust-modal-title">
                                <Building2 size={20} color="#2563eb" />
                                <h2>{editingId ? "Edit Customer Details" : "Add New Customer"}</h2>
                            </div>
                            <button
                                className="cust-modal-close"
                                onClick={() => setShowModal(false)}
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCustomer}>
                            <div className="cust-modal-body">
                                <div className="cust-form-section-title">General Information</div>
                                <div className="cust-form-row">
                                    <div className="cust-form-group">
                                        <label>Customer Code *</label>
                                        <div className="cust-code-input-wrap">
                                            <input
                                                type="text"
                                                name="customer_code"
                                                value={form.customer_code}
                                                onChange={handleChange}
                                                placeholder="e.g. CUST-3282"
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="cust-gen-code-btn"
                                                onClick={handleGenerateCode}
                                                title="Generate Unique Code"
                                            >
                                                <Sparkles size={13} style={{ display: "inline", marginRight: 4 }} />
                                                Auto
                                            </button>
                                        </div>
                                    </div>

                                    <div className="cust-form-group">
                                        <label>Company / Client Name *</label>
                                        <input
                                            type="text"
                                            name="company_name"
                                            value={form.company_name}
                                            onChange={handleChange}
                                            placeholder="e.g. Premier Commercial Flooring Pvt Ltd"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="cust-form-row three">
                                    <div className="cust-form-group">
                                        <label>Contact Person</label>
                                        <input
                                            type="text"
                                            name="contact_person"
                                            value={form.contact_person}
                                            onChange={handleChange}
                                            placeholder="e.g. Vikram Singhania"
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>Phone Number</label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={form.phone}
                                            onChange={handleChange}
                                            placeholder="+91 98251 11223"
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="contact@company.com"
                                        />
                                    </div>
                                </div>

                                <div className="cust-form-section-title">Tax & Location</div>
                                <div className="cust-form-row three">
                                    <div className="cust-form-group">
                                        <label>GST Number</label>
                                        <input
                                            type="text"
                                            name="gst_number"
                                            value={form.gst_number}
                                            onChange={handleChange}
                                            placeholder="24AAACP1234A1Z5"
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>City</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={form.city}
                                            onChange={handleChange}
                                            placeholder="Surat"
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>State</label>
                                        <input
                                            type="text"
                                            name="state"
                                            value={form.state}
                                            onChange={handleChange}
                                            placeholder="Gujarat"
                                        />
                                    </div>
                                </div>

                                <div className="cust-form-row">
                                    <div className="cust-form-group">
                                        <label>Billing Address</label>
                                        <textarea
                                            rows="2"
                                            name="billing_address"
                                            value={form.billing_address}
                                            onChange={handleChange}
                                            placeholder="Full billing address..."
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>Shipping / Factory Address</label>
                                        <textarea
                                            rows="2"
                                            name="shipping_address"
                                            value={form.shipping_address}
                                            onChange={handleChange}
                                            placeholder="Delivery destination..."
                                        />
                                    </div>
                                </div>

                                <div className="cust-form-section-title">Commercial & Status</div>
                                <div className="cust-form-row three">
                                    <div className="cust-form-group">
                                        <label>Credit Limit (₹)</label>
                                        <input
                                            type="number"
                                            name="credit_limit"
                                            value={form.credit_limit}
                                            onChange={handleChange}
                                            placeholder="500000"
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>Payment Terms</label>
                                        <select
                                            name="payment_terms"
                                            value={form.payment_terms}
                                            onChange={handleChange}
                                        >
                                            <option value="Immediate / Advance">Immediate / Advance</option>
                                            <option value="Net 15 Days">Net 15 Days</option>
                                            <option value="Net 30 Days">Net 30 Days</option>
                                            <option value="Net 45 Days">Net 45 Days</option>
                                            <option value="Net 60 Days">Net 60 Days</option>
                                        </select>
                                    </div>

                                    <div className="cust-form-group">
                                        <label>Account Status</label>
                                        <select
                                            name="status"
                                            value={form.status}
                                            onChange={handleChange}
                                        >
                                            <option value="ACTIVE">ACTIVE</option>
                                            <option value="INACTIVE">INACTIVE</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="cust-modal-footer">
                                <button
                                    type="button"
                                    className="cust-cancel-btn"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="cust-submit-btn"
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : editingId ? "Update Customer" : "Create Customer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Customer Details Modal */}
            {showDetailModal && selectedCustomer && (
                <div className="cust-modal-overlay">
                    <div className="cust-modal-card detail-card">
                        <div className="cust-modal-header">
                            <div className="cust-modal-title">
                                <Building2 size={20} color="#2563eb" />
                                <h2>Customer Account Dossier</h2>
                            </div>
                            <button
                                className="cust-modal-close"
                                onClick={() => setShowDetailModal(false)}
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="cust-modal-body">
                            <div className="cust-detail-grid">
                                <div className="cust-detail-item">
                                    <span className="cust-detail-label">Customer Code</span>
                                    <span className="cust-detail-val">{selectedCustomer.customer_code}</span>
                                </div>
                                <div className="cust-detail-item">
                                    <span className="cust-detail-label">Account Status</span>
                                    <span className="cust-detail-val" style={{ color: selectedCustomer.status === "ACTIVE" ? "#16a34a" : "#dc2626" }}>
                                        {selectedCustomer.status}
                                    </span>
                                </div>
                                <div className="cust-detail-item" style={{ gridColumn: "span 2" }}>
                                    <span className="cust-detail-label">Company Name</span>
                                    <span className="cust-detail-val" style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                                        {selectedCustomer.company_name}
                                    </span>
                                </div>
                                <div className="cust-detail-item">
                                    <span className="cust-detail-label">Contact Person</span>
                                    <span className="cust-detail-val">{selectedCustomer.contact_person || "—"}</span>
                                </div>
                                <div className="cust-detail-item">
                                    <span className="cust-detail-label">Phone</span>
                                    <span className="cust-detail-val">{selectedCustomer.phone || "—"}</span>
                                </div>
                                <div className="cust-detail-item">
                                    <span className="cust-detail-label">Email</span>
                                    <span className="cust-detail-val">{selectedCustomer.email || "—"}</span>
                                </div>
                                <div className="cust-detail-item">
                                    <span className="cust-detail-label">GST Number</span>
                                    <span className="cust-detail-val">{selectedCustomer.gst_number || "—"}</span>
                                </div>
                                <div className="cust-detail-item">
                                    <span className="cust-detail-label">City & State</span>
                                    <span className="cust-detail-val">
                                        {[selectedCustomer.city, selectedCustomer.state].filter(Boolean).join(", ") || "—"}
                                    </span>
                                </div>
                                <div className="cust-detail-item">
                                    <span className="cust-detail-label">Credit Limit</span>
                                    <span className="cust-detail-val">
                                        ₹ {Number(selectedCustomer.credit_limit || 0).toLocaleString("en-IN")}
                                    </span>
                                </div>
                                <div className="cust-detail-item">
                                    <span className="cust-detail-label">Payment Terms</span>
                                    <span className="cust-detail-val">{selectedCustomer.payment_terms || "—"}</span>
                                </div>
                                <div className="cust-detail-item" style={{ gridColumn: "span 2" }}>
                                    <span className="cust-detail-label">Billing Address</span>
                                    <span className="cust-detail-val">{selectedCustomer.billing_address || "—"}</span>
                                </div>
                                <div className="cust-detail-item" style={{ gridColumn: "span 2" }}>
                                    <span className="cust-detail-label">Shipping Address</span>
                                    <span className="cust-detail-val">{selectedCustomer.shipping_address || "—"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="cust-modal-footer">
                            <button
                                type="button"
                                className="cust-submit-btn"
                                onClick={() => {
                                    setShowDetailModal(false);
                                    handleOpenEditModal(selectedCustomer);
                                }}
                            >
                                Edit Profile
                            </button>
                            <button
                                type="button"
                                className="cust-cancel-btn"
                                onClick={() => setShowDetailModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {customerToDelete && (
                <div className="cust-modal-overlay">
                    <div className="cust-modal-card" style={{ maxWidth: "440px" }}>
                        <div className="cust-modal-header">
                            <div className="cust-modal-title">
                                <ShieldAlert size={20} color="#dc2626" />
                                <h2>Delete Customer</h2>
                            </div>
                            <button
                                className="cust-modal-close"
                                onClick={() => setCustomerToDelete(null)}
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="cust-modal-body">
                            <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155" }}>
                                Are you sure you want to delete{" "}
                                <strong>{customerToDelete.company_name}</strong> (
                                {customerToDelete.customer_code})?
                            </p>
                            <p style={{ margin: "8px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                                This action will remove the customer from master records. Any linked historical orders will retain their snapshot references.
                            </p>
                        </div>

                        <div className="cust-modal-footer">
                            <button
                                type="button"
                                className="cust-cancel-btn"
                                onClick={() => setCustomerToDelete(null)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="cust-submit-btn"
                                style={{ background: "#dc2626" }}
                                onClick={confirmDelete}
                                disabled={deleting}
                            >
                                {deleting ? "Deleting..." : "Delete Permanently"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;