import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
    Package,
    CheckCircle2,
    XCircle,
    Search,
    RefreshCw,
    Plus,
    Edit2,
    Trash2,
    X,
    AlertCircle
} from "lucide-react";
import "./Customers.css";

const initialForm = {
    product_code: "",
    category_id: "",
    product_name: "",
    carpet_type: "",
    design_pattern: "",
    colour: "",
    width_mm: "",
    length_m: "",
    thickness_mm: "",
    gsm: "",
    surface_finish: "",
    backing_type: "",
    packing_type: "",
    standard_production_time: "",
    standard_cost: "",
    selling_price: "",
    unit_id: "",
    status: "ACTIVE"
};

const Products = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [optionsLoading, setOptionsLoading] = useState(true);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [form, setForm] = useState(initialForm);

    const loadProducts = async () => {
        try {
            setLoading(true);
            setError("");

            const params = {};

            if (search.trim()) {
                params.search = search.trim();
            }

            if (statusFilter !== "ALL") {
                params.status = statusFilter;
            }

            const response = await api.get("/products", { params });

            if (response.data.success) {
                setProducts(response.data.data || []);
            } else {
                throw new Error(
                    response.data.message || "Unable to load products"
                );
            }
        } catch (err) {
            console.error("LOAD PRODUCTS ERROR:", err);

            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to load products."
            );
        } finally {
            setLoading(false);
        }
    };

    const loadOptions = async () => {
        try {
            setOptionsLoading(true);

            const response = await api.get("/products/options");

            if (!response.data.success) {
                throw new Error(
                    response.data.message ||
                    "Unable to load product options"
                );
            }

            const data = response.data.data || {};

            setCategories(data.categories || []);
            setUnits(data.units || []);
        } catch (err) {
            console.error("LOAD PRODUCT OPTIONS ERROR:", err);

            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to load product options."
            );
        } finally {
            setOptionsLoading(false);
        }
    };

    useEffect(() => {
        loadOptions();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadProducts();
        }, 250);

        return () => clearTimeout(timer);
    }, [search, statusFilter]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const openAddForm = () => {
        setEditingId(null);
        setForm(initialForm);
        setError("");
        setSuccess("");
        setShowForm(true);
    };

    const openEditForm = (product) => {
        setEditingId(product.id);

        setForm({
            product_code: product.product_code || "",
            category_id: product.category_id || "",
            product_name: product.product_name || "",
            carpet_type: product.carpet_type || "",
            design_pattern: product.design_pattern || "",
            colour: product.colour || "",
            width_mm: product.width_mm ?? "",
            length_m: product.length_m ?? "",
            thickness_mm: product.thickness_mm ?? "",
            gsm: product.gsm ?? "",
            surface_finish: product.surface_finish || "",
            backing_type: product.backing_type || "",
            packing_type: product.packing_type || "",
            standard_production_time:
                product.standard_production_time ?? "",
            standard_cost: product.standard_cost ?? "",
            selling_price: product.selling_price ?? "",
            unit_id: product.unit_id || "",
            status: product.status || "ACTIVE"
        });

        setError("");
        setSuccess("");
        setShowForm(true);
    };

    const closeForm = () => {
        if (saving) return;

        setShowForm(false);
        setEditingId(null);
        setForm(initialForm);
    };

    const toNumberOrNull = (value) => {
        if (value === "" || value === null || value === undefined) {
            return null;
        }

        return Number(value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!form.product_code.trim()) {
            setError("Product code is required.");
            return;
        }

        if (!form.product_name.trim()) {
            setError("Product name is required.");
            return;
        }

        try {
            setSaving(true);

            const payload = {
                product_code: form.product_code.trim(),
                category_id:
                    form.category_id === ""
                        ? null
                        : Number(form.category_id),
                product_name: form.product_name.trim(),

                carpet_type: form.carpet_type.trim() || null,
                design_pattern: form.design_pattern.trim() || null,
                colour: form.colour.trim() || null,

                width_mm: toNumberOrNull(form.width_mm),
                length_m: toNumberOrNull(form.length_m),
                thickness_mm: toNumberOrNull(form.thickness_mm),
                gsm: toNumberOrNull(form.gsm),

                surface_finish:
                    form.surface_finish.trim() || null,
                backing_type:
                    form.backing_type.trim() || null,
                packing_type:
                    form.packing_type.trim() || null,

                standard_production_time:
                    toNumberOrNull(form.standard_production_time),

                standard_cost:
                    form.standard_cost === ""
                        ? 0
                        : Number(form.standard_cost),

                selling_price:
                    form.selling_price === ""
                        ? 0
                        : Number(form.selling_price),

                unit_id:
                    form.unit_id === ""
                        ? null
                        : Number(form.unit_id),

                status: form.status
            };

            let response;

            if (editingId) {
                response = await api.put(
                    `/products/${editingId}`,
                    payload
                );
            } else {
                response = await api.post(
                    "/products",
                    payload
                );
            }

            if (!response.data.success) {
                throw new Error(
                    response.data.message ||
                    "Unable to save product."
                );
            }

            setSuccess(
                editingId
                    ? "Product updated successfully."
                    : "Product created successfully."
            );

            setShowForm(false);
            setEditingId(null);
            setForm(initialForm);

            await loadProducts();
        } catch (err) {
            console.error("SAVE PRODUCT ERROR:", err);

            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to save product."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (product) => {
        const confirmed = window.confirm(
            `Delete product "${product.product_name}"?`
        );

        if (!confirmed) return;

        try {
            setError("");
            setSuccess("");

            const response = await api.delete(
                `/products/${product.id}`
            );

            if (!response.data.success) {
                throw new Error(
                    response.data.message ||
                    "Unable to delete product."
                );
            }

            setSuccess("Product deleted successfully.");
            await loadProducts();
        } catch (err) {
            console.error("DELETE PRODUCT ERROR:", err);

            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to delete product."
            );
        }
    };

    const summary = useMemo(() => {
        const active = products.filter(
            (product) => product.status === "ACTIVE"
        ).length;

        const inactive = products.filter(
            (product) => product.status === "INACTIVE"
        ).length;

        return {
            total: products.length,
            active,
            inactive
        };
    }, [products]);

    const formatMoney = (value) => {
        const amount = Number(value || 0);

        return `₹${amount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    const formatNumber = (value, decimals = 2) => {
        if (value === null || value === undefined || value === "") {
            return "—";
        }

        return Number(value).toLocaleString("en-IN", {
            maximumFractionDigits: decimals
        });
    };

    return (
        <div className="customers-page products-page">

            <div className="customers-header-card">
                <div className="customers-header-info">
                    <h1>Products</h1>
                    <p>Manage PVC carpet products, specifications, routing and pricing.</p>
                </div>
                <div className="customers-header-actions">
                    <button
                        className="cust-refresh-btn"
                        onClick={loadProducts}
                        title="Refresh List"
                        type="button"
                    >
                        <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        type="button"
                        className="primary-button cust-primary-btn"
                        onClick={openAddForm}
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        Add Product
                    </button>
                </div>
            </div>

            {error && (
                <div className="cust-alert error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="cust-alert success">
                    <CheckCircle2 size={18} />
                    <span>{success}</span>
                </div>
            )}

            <div className="customers-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="cust-stat-card">
                    <div className="cust-stat-icon blue">
                        <Package size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Total Products</span>
                        <span className="cust-stat-value">{summary.total}</span>
                    </div>
                </div>

                <div className="cust-stat-card">
                    <div className="cust-stat-icon green">
                        <CheckCircle2 size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Active</span>
                        <span className="cust-stat-value">{summary.active}</span>
                    </div>
                </div>

                <div className="cust-stat-card">
                    <div className="cust-stat-icon amber">
                        <XCircle size={22} />
                    </div>
                    <div className="cust-stat-content">
                        <span className="cust-stat-label">Inactive</span>
                        <span className="cust-stat-value">{summary.inactive}</span>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="module-form-panel products-form-panel">

                    <div className="module-form-header">
                        <div>
                            <div className="module-eyebrow">
                                PRODUCT MASTER
                            </div>

                            <h3>
                                {editingId
                                    ? "Edit Product"
                                    : "Create Product"}
                            </h3>

                            <p>
                                Enter the PVC carpet product
                                specifications and commercial details.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={closeForm}
                            disabled={saving}
                        >
                            Close
                        </button>
                    </div>

                    <form
                        className="product-form"
                        onSubmit={handleSubmit}
                    >

                        <div className="form-section">
                            <div className="form-section-title">
                                Basic Information
                            </div>

                            <div className="form-grid">

                                <div className="form-field">
                                    <label>
                                        Product Code *
                                    </label>

                                    <input
                                        name="product_code"
                                        value={form.product_code}
                                        onChange={handleChange}
                                        placeholder="e.g. PVC-CARPET-001"
                                        required
                                        disabled={saving}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Product Name *
                                    </label>

                                    <input
                                        name="product_name"
                                        value={form.product_name}
                                        onChange={handleChange}
                                        placeholder="Enter product name"
                                        required
                                        disabled={saving}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Category
                                    </label>

                                    <select
                                        name="category_id"
                                        value={form.category_id}
                                        onChange={handleChange}
                                        disabled={
                                            saving ||
                                            optionsLoading
                                        }
                                    >
                                        <option value="">
                                            Select Category
                                        </option>

                                        {categories.map((category) => (
                                            <option
                                                key={category.id}
                                                value={category.id}
                                            >
                                                {category.category_name ||
                                                    category.name ||
                                                    category.category_code}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>
                                        Unit
                                    </label>

                                    <select
                                        name="unit_id"
                                        value={form.unit_id}
                                        onChange={handleChange}
                                        disabled={
                                            saving ||
                                            optionsLoading
                                        }
                                    >
                                        <option value="">
                                            Select Unit
                                        </option>

                                        {units.map((unit) => (
                                            <option
                                                key={unit.id}
                                                value={unit.id}
                                            >
                                                {unit.unit_name ||
                                                    unit.name ||
                                                    unit.unit_code}
                                                {unit.unit_code
                                                    ? ` (${unit.unit_code})`
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>
                                        Status
                                    </label>

                                    <select
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        disabled={saving}
                                    >
                                        <option value="ACTIVE">
                                            Active
                                        </option>

                                        <option value="INACTIVE">
                                            Inactive
                                        </option>
                                    </select>
                                </div>

                            </div>
                        </div>

                        <div className="form-section">

                            <div className="form-section-title">
                                PVC Carpet Specifications
                            </div>

                            <div className="form-grid">

                                <div className="form-field">
                                    <label>
                                        Carpet Type
                                    </label>

                                    <input
                                        name="carpet_type"
                                        value={form.carpet_type}
                                        onChange={handleChange}
                                        placeholder="e.g. PVC Carpet"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Design / Pattern
                                    </label>

                                    <input
                                        name="design_pattern"
                                        value={form.design_pattern}
                                        onChange={handleChange}
                                        placeholder="Enter design or pattern"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Colour
                                    </label>

                                    <input
                                        name="colour"
                                        value={form.colour}
                                        onChange={handleChange}
                                        placeholder="Enter colour"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Width (mm)
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="width_mm"
                                        value={form.width_mm}
                                        onChange={handleChange}
                                        placeholder="0"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Length (m)
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="length_m"
                                        value={form.length_m}
                                        onChange={handleChange}
                                        placeholder="0"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Thickness (mm)
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="thickness_mm"
                                        value={form.thickness_mm}
                                        onChange={handleChange}
                                        placeholder="0"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        GSM
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="gsm"
                                        value={form.gsm}
                                        onChange={handleChange}
                                        placeholder="0"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Surface Finish
                                    </label>

                                    <input
                                        name="surface_finish"
                                        value={form.surface_finish}
                                        onChange={handleChange}
                                        placeholder="Enter surface finish"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Backing Type
                                    </label>

                                    <input
                                        name="backing_type"
                                        value={form.backing_type}
                                        onChange={handleChange}
                                        placeholder="Enter backing type"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Packing Type
                                    </label>

                                    <input
                                        name="packing_type"
                                        value={form.packing_type}
                                        onChange={handleChange}
                                        placeholder="Enter packing type"
                                        disabled={saving}
                                    />
                                </div>

                            </div>
                        </div>

                        <div className="form-section">

                            <div className="form-section-title">
                                Production & Commercial Details
                            </div>

                            <div className="form-grid">

                                <div className="form-field">
                                    <label>
                                        Standard Production Time
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="standard_production_time"
                                        value={form.standard_production_time}
                                        onChange={handleChange}
                                        placeholder="Enter time"
                                        disabled={saving}
                                    />

                                    <small className="form-help">
                                        Standard time for producing one unit/defined quantity.
                                    </small>
                                </div>

                                <div className="form-field">
                                    <label>
                                        Standard Cost
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="standard_cost"
                                        value={form.standard_cost}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Selling Price
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="selling_price"
                                        value={form.selling_price}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        disabled={saving}
                                    />
                                </div>

                            </div>
                        </div>

                        <div className="form-actions">

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={closeForm}
                                disabled={saving}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="primary-button"
                                disabled={saving}
                            >
                                {saving
                                    ? "Saving..."
                                    : editingId
                                        ? "Update Product"
                                        : "Create Product"}
                            </button>

                        </div>

                    </form>
                </div>
            )}

            <div className="customers-filter-bar">
                <div className="cust-search-wrap">
                    <Search size={16} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Search product code, name, carpet type, colour..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    {search && (
                        <button
                            type="button"
                            className="cust-clear-search"
                            onClick={() => { setSearch(""); loadProducts(); }}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="cust-filter-group">
                    <select
                        className="cust-filter-select"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>
            </div>

            <div className="customers-table-card">

                <table className="cust-table products-table">

                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Specifications</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>

                    <tbody>

                        {loading ? (
                            <tr>
                                <td
                                    colSpan="7"
                                    className="table-state"
                                >
                                    Loading products...
                                </td>
                            </tr>
                        ) : products.length === 0 ? (
                            <tr>
                                <td
                                    colSpan="7"
                                    className="table-state"
                                >
                                    <div className="products-empty">
                                        <strong>
                                            No products found
                                        </strong>

                                        <span>
                                            Add a PVC carpet product
                                            or change your filters.
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            products.map((product) => (
                                <tr key={product.id}>

                                    <td>
                                        <span className="cust-code-badge">
                                            {product.product_code}
                                        </span>
                                    </td>

                                    <td>
                                        <div className="cust-company-cell">
                                            <strong>{product.product_name}</strong>
                                            {product.design_pattern && (
                                                <small>{product.design_pattern}</small>
                                            )}
                                        </div>
                                    </td>

                                    <td>
                                        {product.category_name ||
                                            product.category_code ||
                                            "—"}
                                    </td>

                                    <td>
                                        <div className="cust-company-cell">
                                            <strong style={{ fontWeight: 500 }}>{product.carpet_type || "PVC carpet"}</strong>
                                            <small>{product.colour || "—"}</small>
                                            <small>{formatNumber(product.width_mm)} × {formatNumber(product.thickness_mm)} mm{product.gsm != null && ` / ${formatNumber(product.gsm, 0)} GSM`}</small>
                                        </div>
                                    </td>

                                    <td>
                                        <strong>
                                            {formatMoney(
                                                product.selling_price
                                            )}
                                        </strong>

                                        <div className="table-secondary">
                                            Cost{" "}
                                            {formatMoney(
                                                product.standard_cost
                                            )}
                                        </div>
                                    </td>

                                    <td>
                                        <span className={`cust-status-pill ${product.status === "ACTIVE" ? "active" : "inactive"}`}>
                                            {product.status}
                                        </span>
                                    </td>

                                    <td style={{ textAlign: 'right' }}>
                                        <div className="cust-actions-cell" style={{ justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                className="cust-action-btn edit"
                                                title="Edit Product"
                                                onClick={() => openEditForm(product)}
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                className="cust-action-btn delete"
                                                title="Delete Product"
                                                onClick={() => handleDelete(product)}
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

            <div style={{ marginTop: 10, color: '#64748b', fontSize: '0.78rem' }}>
                Showing <strong>{products.length}</strong> product{products.length === 1 ? '' : 's'}
            </div>

            <style>{`
                .products-page {
                    width: 100%;
                    max-width: 100%;
                }

                .products-header {
                    align-items: flex-start;
                }

                .products-header h2 {
                    margin: 0;
                }

                .products-add-button {
                    flex-shrink: 0;
                    min-width: 130px;
                }

                .products-summary-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 16px;
                    margin-bottom: 18px;
                }

                .products-summary-card {
                    position: relative;
                    overflow: hidden;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 17px 20px;
                }

                .products-summary-card::before {
                    content: "";
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 3px;
                    background: #2563eb;
                }

                .products-summary-card span {
                    display: block;
                    margin-bottom: 8px;
                    color: #64748b;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: .06em;
                    text-transform: uppercase;
                }

                .products-summary-card strong {
                    color: #0f2747;
                    font-size: 25px;
                    line-height: 1;
                }

                .products-toolbar {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 210px;
                    gap: 16px;
                    align-items: end;
                    padding: 16px;
                    margin-bottom: 16px;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                }

                .products-search-wrapper,
                .products-status-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                }

                .products-search-wrapper label,
                .products-status-wrapper label {
                    color: #475569;
                    font-size: 11px;
                    font-weight: 600;
                }

                .products-search-wrapper .search-box {
                    width: 100%;
                }

                .products-search-wrapper .search-box input,
                .products-status-wrapper .status-filter {
                    width: 100%;
                    height: 42px;
                    box-sizing: border-box;
                    border: 1px solid #d7dee8;
                    border-radius: 8px;
                    background: #fff;
                    color: #172033;
                    font-family: inherit;
                    font-size: 12px;
                    outline: none;
                }

                .products-search-wrapper .search-box input {
                    padding: 0 12px;
                }

                .products-search-wrapper .search-box input::placeholder {
                    color: #94a3b8;
                }

                .products-search-wrapper .search-box input:focus,
                .products-status-wrapper .status-filter:focus {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, .08);
                }

                .products-status-wrapper .status-filter {
                    padding: 0 11px;
                }

                .products-table-container {
                    width: 100%;
                    overflow-x: auto;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                }

                .products-table {
                    min-width: 980px;
                    width: 100%;
                }

                .products-table th {
                    height: 44px;
                    padding: 0 13px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    color: #64748b;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: .05em;
                    text-align: left;
                    text-transform: uppercase;
                    white-space: nowrap;
                }

                .products-table td {
                    min-height: 58px;
                    padding: 10px 13px;
                    border-bottom: 1px solid #edf1f5;
                    color: #344054;
                    font-size: 12px;
                    vertical-align: middle;
                }

                .products-table tbody tr:hover {
                    background: #fafcff;
                }

                .products-table tbody tr:last-child td {
                    border-bottom: none;
                }

                .product-code {
                    display: inline-block;
                    padding: 5px 7px;
                    border-radius: 5px;
                    background: #eff6ff;
                    color: #2563eb;
                    font-size: 11px;
                    font-weight: 700;
                }

                .products-table .table-primary {
                    color: #172033;
                    font-size: 12px;
                    font-weight: 600;
                }

                .products-table .table-secondary {
                    margin-top: 3px;
                    color: #98a2b3;
                    font-size: 10px;
                }

                .products-table .table-actions {
                    display: flex;
                    gap: 6px;
                }

                .products-table .table-action {
                    min-width: 48px;
                    height: 30px;
                    padding: 0 9px;
                    border: 1px solid #dbe2ea;
                    border-radius: 6px;
                    background: #fff;
                    font-family: inherit;
                    font-size: 10px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .products-table .table-action.edit {
                    color: #2563eb;
                }

                .products-table .table-action.edit:hover {
                    background: #eff6ff;
                    border-color: #bfdbfe;
                }

                .products-table .table-action.delete {
                    color: #dc2626;
                }

                .products-table .table-action.delete:hover {
                    background: #fef2f2;
                    border-color: #fecaca;
                }

                .products-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 5px;
                }

                .products-empty strong {
                    color: #475569;
                    font-size: 12px;
                }

                .products-empty span {
                    color: #94a3b8;
                    font-size: 10px;
                }

                .products-form-panel {
                    margin-bottom: 18px;
                    border: 1px solid #dfe6ee;
                    background: #fff;
                }

                .products-form-panel .form-section {
                    padding: 18px 20px;
                    border-bottom: 1px solid #edf1f5;
                }

                .products-form-panel .form-section-title {
                    margin-bottom: 16px;
                    color: #0f2747;
                    font-size: 12px;
                    font-weight: 700;
                }

                .products-form-panel .form-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 15px;
                }

                .products-form-panel .form-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .products-form-panel .form-field label {
                    color: #475569;
                    font-size: 10px;
                    font-weight: 600;
                }

                .products-form-panel .form-field input,
                .products-form-panel .form-field select {
                    width: 100%;
                    height: 40px;
                    box-sizing: border-box;
                    padding: 0 10px;
                    border: 1px solid #d7dee8;
                    border-radius: 7px;
                    background: #fff;
                    color: #172033;
                    font-family: inherit;
                    font-size: 11px;
                    outline: none;
                }

                .products-form-panel .form-field input:focus,
                .products-form-panel .form-field select:focus {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, .08);
                }

                .products-form-panel .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 9px;
                    padding: 16px 20px;
                }

                .products-form-panel .primary-button,
                .products-form-panel .secondary-button,
                .products-header .primary-button {
                    min-height: 40px;
                    padding: 0 15px;
                    border-radius: 7px;
                    font-family: inherit;
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .products-form-panel .primary-button,
                .products-header .primary-button {
                    border: 1px solid #2563eb;
                    background: #2563eb;
                    color: #fff;
                }

                .products-form-panel .primary-button:hover,
                .products-header .primary-button:hover {
                    background: #1d4ed8;
                    border-color: #1d4ed8;
                }

                .products-form-panel .secondary-button {
                    border: 1px solid #d7dee8;
                    background: #fff;
                    color: #475569;
                }

                .products-form-panel .secondary-button:hover {
                    background: #f8fafc;
                }

                .products-footer {
                    margin-top: 10px;
                    color: #64748b;
                    font-size: 10px;
                }

                @media (max-width: 900px) {
                    .products-summary-grid {
                        grid-template-columns: 1fr;
                    }

                    .products-form-panel .form-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }

                @media (max-width: 650px) {
                    .products-header {
                        flex-direction: column;
                    }

                    .products-add-button {
                        width: 100%;
                    }

                    .products-toolbar {
                        grid-template-columns: 1fr;
                    }

                    .products-form-panel .form-grid {
                        grid-template-columns: 1fr;
                    }

                    .products-form-panel .form-actions {
                        flex-direction: column-reverse;
                    }

                    .products-form-panel .form-actions button {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default Products;
