import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
    Plus,
    Search,
    RefreshCw,
    Building2,
    Truck,
    CheckCircle2,
    XCircle,
    MapPin,
    Eye,
    Edit2,
    Trash2,
    X,
    Sparkles,
    AlertCircle,
    FileText,
    Receipt
} from "lucide-react";
import "./Customers.css";
import ExcelToolbar from "../components/ExcelToolbar";

const initialForm = {
    supplier_code: "",
    company_name: "",
    contact_person: "",
    phone: "",
    email: "",
    gst_number: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    payment_terms: "Net 30 Days",
    status: "ACTIVE"
};

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
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
    const [selectedSupplier, setSelectedSupplier] = useState(null);

    // Delete Modal State
    const [supplierToDelete, setSupplierToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Notifications
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            setError("");

            const params = {};
            if (statusFilter !== "ALL") params.status = statusFilter;
            if (search.trim()) params.search = search.trim();

            const response = await api.get("/suppliers", { params });

            if (response.data && response.data.success) {
                setSuppliers(response.data.data || []);
                if (response.data.stats) {
                    setStats(response.data.stats);
                }
            }
        } catch (err) {
            console.error("Error fetching suppliers:", err);
            setError(err.response?.data?.message || "Failed to load suppliers from server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, [statusFilter]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchSuppliers();
    };

    const handleOpenAddModal = () => {
        setEditingId(null);
        setForm({
            ...initialForm,
            supplier_code: `SUP-${Math.floor(1000 + Math.random() * 9000)}`
        });
        setError("");
        setShowModal(true);
    };

    const handleOpenEditModal = (s) => {
        setEditingId(s.id);
        setForm({
            supplier_code: s.supplier_code || "",
            company_name: s.company_name || "",
            contact_person: s.contact_person || "",
            phone: s.phone || "",
            email: s.email || "",
            gst_number: s.gst_number || "",
            address: s.address || "",
            city: s.city || "",
            state: s.state || "",
            pincode: s.pincode || "",
            payment_terms: s.payment_terms || "Net 30 Days",
            status: s.status || "ACTIVE"
        });
        setError("");
        setShowModal(true);
    };

    const handleGenerateCode = () => {
        setForm((prev) => ({
            ...prev,
            supplier_code: `SUP-${Math.floor(1000 + Math.random() * 9000)}`
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSaveSupplier = async (e) => {
        e.preventDefault();
        if (!form.company_name.trim()) {
            setError("Supplier company name is required.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            if (editingId) {
                const response = await api.put(`/suppliers/${editingId}`, form);
                if (response.data && response.data.success) {
                    setSuccess("Supplier updated successfully!");
                }
            } else {
                const response = await api.post("/suppliers", form);
                if (response.data && response.data.success) {
                    setSuccess("Supplier created successfully!");
                }
            }

            setShowModal(false);
            fetchSuppliers();
            setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
            console.error("Save supplier error:", err);
            setError(err.response?.data?.message || "Failed to save supplier record.");
        } finally {
            setSaving(false);
        }
    };

    const handleViewDetails = async (s) => {
        try {
            const res = await api.get(`/suppliers/${s.id}`);
            if (res.data?.success) {
                setSelectedSupplier(res.data.data);
            } else {
                setSelectedSupplier(s);
            }
        } catch (e) {
            setSelectedSupplier(s);
        }
        setShowDetailModal(true);
    };

    const confirmDelete = async () => {
        if (!supplierToDelete) return;

        try {
            setDeleting(true);
            setError("");
            await api.delete(`/suppliers/${supplierToDelete.id}`);
            setSuccess(`Supplier ${supplierToDelete.company_name} deleted successfully.`);
            setSupplierToDelete(null);
            fetchSuppliers();
            setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
            console.error("Delete supplier error:", err);
            setError(err.response?.data?.message || "Failed to delete supplier.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="customers-page">
            {/* Header */}
            <div className="customers-header-card">
                <div className="customers-header-info">
                    <h1>Suppliers & Raw Material Vendors</h1>
                    <p>Manage chemical, PVC resin, plasticizer and packaging suppliers.</p>
                </div>

                <div className="customers-header-actions">
                    <button
                        className="cust-refresh-btn"
                        onClick={fetchSuppliers}
                        title="Refresh List"
                        type="button"
                    >
                        <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                    </button>

                    <ExcelToolbar
                        moduleName="suppliers"
                        displayName="Suppliers"
                        onImportDone={fetchSuppliers}
                    />

                    <button
                        className="primary-button cust-primary-btn"
                        onClick={handleOpenAddModal}
                        type="button"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        Add Supplier
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
                        <Truck size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Total Suppliers</span>
                        <span className="cust-stat-value">{stats.total || suppliers.length}</span>
                    </div>
                </div>

                <div className="cust-stat-card">
                    <div className="cust-stat-icon green">
                        <CheckCircle2 size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Active Vendors</span>
                        <span className="cust-stat-value">{stats.active_count || suppliers.filter(s => s.status === "ACTIVE").length}</span>
                    </div>
                </div>

                <div className="cust-stat-card">
                    <div className="cust-stat-icon amber">
                        <XCircle size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Inactive</span>
                        <span className="cust-stat-value">{stats.inactive_count || suppliers.filter(s => s.status === "INACTIVE").length}</span>
                    </div>
                </div>

                <div className="cust-stat-card">
                    <div className="cust-stat-icon purple">
                        <MapPin size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Cities / Hubs</span>
                        <span className="cust-stat-value">{stats.city_count || new Set(suppliers.map(s => s.city).filter(Boolean)).size}</span>
                    </div>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="customers-toolbar-card">
                <form className="cust-search-form" onSubmit={handleSearchSubmit}>
                    <div className="cust-search-input-wrapper">
                        <Search size={16} className="cust-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by company name, supplier code, GST or city..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                type="button"
                                className="cust-clear-search"
                                onClick={() => { setSearch(""); fetchSuppliers(); }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button type="submit" className="cust-search-btn">
                        Search
                    </button>
                </form>

                <div className="cust-filter-group">
                    <span className="cust-filter-label">Status:</span>
                    <div className="cust-segmented-control">
                        <button
                            type="button"
                            className={statusFilter === "ALL" ? "active" : ""}
                            onClick={() => setStatusFilter("ALL")}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            className={statusFilter === "ACTIVE" ? "active" : ""}
                            onClick={() => setStatusFilter("ACTIVE")}
                        >
                            Active
                        </button>
                        <button
                            type="button"
                            className={statusFilter === "INACTIVE" ? "active" : ""}
                            onClick={() => setStatusFilter("INACTIVE")}
                        >
                            Inactive
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="customers-table-card">
                <div className="cust-table-responsive">
                    <table className="cust-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Supplier Company</th>
                                <th>Contact Person</th>
                                <th>Location</th>
                                <th>GST Number</th>
                                <th>Payment Terms</th>
                                <th>Status</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="cust-table-empty">
                                        <RefreshCw size={24} className="animate-spin text-slate-400" />
                                        <p>Loading suppliers...</p>
                                    </td>
                                </tr>
                            ) : suppliers.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="cust-table-empty">
                                        <Truck size={36} className="text-slate-300" />
                                        <p>No suppliers found matching your query.</p>
                                    </td>
                                </tr>
                            ) : (
                                suppliers.map((s) => (
                                    <tr key={s.id}>
                                        <td>
                                            <span className="cust-code-badge">{s.supplier_code}</span>
                                        </td>
                                        <td>
                                            <div className="cust-company-cell">
                                                <strong>{s.company_name}</strong>
                                                <small>{s.email || "No email"}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="cust-contact-cell">
                                                <span>{s.contact_person || "—"}</span>
                                                <small>{s.phone || "—"}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="cust-city-badge">
                                                <MapPin size={12} />
                                                {s.city ? `${s.city}${s.state ? `, ${s.state}` : ""}` : "—"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="cust-gst-text">{s.gst_number || "—"}</span>
                                        </td>
                                        <td>
                                            <span className="cust-terms-badge">{s.payment_terms || "Net 30"}</span>
                                        </td>
                                        <td>
                                            <span className={`cust-status-pill ${s.status === "ACTIVE" ? "active" : "inactive"}`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            <div className="cust-actions-cell">
                                                <button
                                                    type="button"
                                                    className="cust-action-btn view"
                                                    title="View Details"
                                                    onClick={() => handleViewDetails(s)}
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="cust-action-btn edit"
                                                    title="Edit Supplier"
                                                    onClick={() => handleOpenEditModal(s)}
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="cust-action-btn delete"
                                                    title="Delete Supplier"
                                                    onClick={() => setSupplierToDelete(s)}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="cust-modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="cust-modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="cust-modal-header">
                            <div>
                                <h2>{editingId ? "Edit Supplier" : "Add New Supplier"}</h2>
                                <p>{editingId ? "Update supplier contact and billing information." : "Register a new raw material vendor in ERP."}</p>
                            </div>
                            <button type="button" className="cust-modal-close" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSupplier}>
                            <div className="cust-modal-body">
                                {error && (
                                    <div className="cust-alert error" style={{ margin: "0 0 16px 0" }}>
                                        <AlertCircle size={16} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="cust-form-grid">
                                    <div className="cust-form-group span-2">
                                        <label>Company / Supplier Name *</label>
                                        <input
                                            type="text"
                                            name="company_name"
                                            value={form.company_name}
                                            onChange={handleChange}
                                            placeholder="e.g. Reliance Industries Ltd (Petrochemicals)"
                                            required
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>Supplier Code *</label>
                                        <div className="cust-input-with-button">
                                            <input
                                                type="text"
                                                name="supplier_code"
                                                value={form.supplier_code}
                                                onChange={handleChange}
                                                placeholder="e.g. SUP-RIL-01"
                                                required
                                            />
                                            {!editingId && (
                                                <button
                                                    type="button"
                                                    className="cust-gen-code-btn"
                                                    onClick={handleGenerateCode}
                                                    title="Auto Generate Code"
                                                >
                                                    <Sparkles size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="cust-form-group">
                                        <label>Status</label>
                                        <select name="status" value={form.status} onChange={handleChange}>
                                            <option value="ACTIVE">ACTIVE</option>
                                            <option value="INACTIVE">INACTIVE</option>
                                        </select>
                                    </div>

                                    <div className="cust-form-group">
                                        <label>Contact Person</label>
                                        <input
                                            type="text"
                                            name="contact_person"
                                            value={form.contact_person}
                                            onChange={handleChange}
                                            placeholder="e.g. Rajesh Ambani"
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>Phone Number</label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={form.phone}
                                            onChange={handleChange}
                                            placeholder="e.g. +91 98250 12345"
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="e.g. pvc.sales@supplier.com"
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>GST Number</label>
                                        <input
                                            type="text"
                                            name="gst_number"
                                            value={form.gst_number}
                                            onChange={handleChange}
                                            placeholder="e.g. 24AAACR7192G1ZV"
                                        />
                                    </div>

                                    <div className="cust-form-group span-2">
                                        <label>Factory / Office Address</label>
                                        <textarea
                                            name="address"
                                            value={form.address}
                                            onChange={handleChange}
                                            rows="2"
                                            placeholder="Enter complete supplier street address..."
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>City</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={form.city}
                                            onChange={handleChange}
                                            placeholder="e.g. Surat"
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>State</label>
                                        <input
                                            type="text"
                                            name="state"
                                            value={form.state}
                                            onChange={handleChange}
                                            placeholder="e.g. Gujarat"
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>Pincode</label>
                                        <input
                                            type="text"
                                            name="pincode"
                                            value={form.pincode}
                                            onChange={handleChange}
                                            placeholder="e.g. 394510"
                                        />
                                    </div>

                                    <div className="cust-form-group">
                                        <label>Payment Terms</label>
                                        <select name="payment_terms" value={form.payment_terms} onChange={handleChange}>
                                            <option value="Immediate LC">Immediate LC</option>
                                            <option value="Net 15 Days">Net 15 Days</option>
                                            <option value="Net 30 Days">Net 30 Days</option>
                                            <option value="Net 45 Days">Net 45 Days</option>
                                            <option value="Net 60 Days">Net 60 Days</option>
                                            <option value="Advance Payment">Advance Payment</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="cust-modal-footer">
                                <button type="button" className="cust-cancel-btn" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="primary-button" disabled={saving}>
                                    {saving ? "Saving..." : editingId ? "Save Changes" : "Create Supplier"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {showDetailModal && selectedSupplier && (
                <div className="cust-modal-backdrop" onClick={() => setShowDetailModal(false)}>
                    <div className="cust-modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="cust-modal-header">
                            <div>
                                <h2>{selectedSupplier.company_name}</h2>
                                <p>Supplier Code: <strong>{selectedSupplier.supplier_code}</strong></p>
                            </div>
                            <button type="button" className="cust-modal-close" onClick={() => setShowDetailModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="cust-modal-body">
                            <div className="cust-detail-grid">
                                <div><strong>Contact Person:</strong> <span>{selectedSupplier.contact_person || "—"}</span></div>
                                <div><strong>Phone:</strong> <span>{selectedSupplier.phone || "—"}</span></div>
                                <div><strong>Email:</strong> <span>{selectedSupplier.email || "—"}</span></div>
                                <div><strong>GST Number:</strong> <span>{selectedSupplier.gst_number || "—"}</span></div>
                                <div><strong>City / State:</strong> <span>{selectedSupplier.city || "—"}, {selectedSupplier.state || "—"}</span></div>
                                <div><strong>Payment Terms:</strong> <span>{selectedSupplier.payment_terms || "—"}</span></div>
                                <div><strong>Address:</strong> <span>{selectedSupplier.address || "—"}</span></div>
                                <div><strong>Status:</strong> <span className={`cust-status-pill ${selectedSupplier.status === "ACTIVE" ? "active" : "inactive"}`}>{selectedSupplier.status}</span></div>
                            </div>

                            {selectedSupplier.recent_receipts && selectedSupplier.recent_receipts.length > 0 && (
                                <div style={{ marginTop: "24px" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "12px", color: "#0f172a" }}>Recent Inward Receipts (GRN)</h3>
                                    <table className="customers-table" style={{ fontSize: "0.85rem" }}>
                                        <thead>
                                            <tr>
                                                <th>GRN #</th>
                                                <th>Date</th>
                                                <th>Invoice</th>
                                                <th>Amount</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedSupplier.recent_receipts.map(r => (
                                                <tr key={r.id}>
                                                    <td><strong>{r.grn_number}</strong></td>
                                                    <td>{new Date(r.receipt_date).toLocaleDateString()}</td>
                                                    <td>{r.invoice_number || "—"}</td>
                                                    <td>₹{Number(r.total_amount_inr || 0).toLocaleString()}</td>
                                                    <td><span className="cust-status-pill active">{r.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="cust-modal-footer">
                            <button type="button" className="primary-button" onClick={() => setShowDetailModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Dialog */}
            {supplierToDelete && (
                <div className="cust-modal-backdrop" onClick={() => setSupplierToDelete(null)}>
                    <div className="cust-confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="cust-confirm-icon">
                            <AlertCircle size={28} />
                        </div>
                        <h3>Delete Supplier?</h3>
                        <p>Are you sure you want to delete <strong>{supplierToDelete.company_name}</strong>? This action cannot be undone.</p>
                        <div className="cust-confirm-actions">
                            <button type="button" className="cust-cancel-btn" onClick={() => setSupplierToDelete(null)}>
                                Cancel
                            </button>
                            <button type="button" className="cust-delete-btn" onClick={confirmDelete} disabled={deleting}>
                                {deleting ? "Deleting..." : "Delete Supplier"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
