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
    AlertCircle,
    Layers,
    Sparkles,
    FlaskConical
} from "lucide-react";
import "./Products.css";
import ExcelToolbar from "../components/ExcelToolbar";

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

    // BOM Modal State
    const [showBOMModal, setShowBOMModal] = useState(false);
    const [selectedBOMProduct, setSelectedBOMProduct] = useState(null);
    const [bomItems, setBomItems] = useState([]);
    const [availableMaterials, setAvailableMaterials] = useState([]);
    const [bomLoading, setBomLoading] = useState(false);
    const [bomSaving, setBomSaving] = useState(false);
    const [newBOMItem, setNewBOMItem] = useState({
        material_id: "",
        quantity_per_unit: "",
        wastage_percentage: "1.0"
    });

    const openBOMModal = async (product) => {
        setSelectedBOMProduct(product);
        setShowBOMModal(true);
        setBomLoading(true);
        try {
            const res = await api.get(`/products/${product.id}/bom`);
            if (res.data?.success) {
                setBomItems(res.data.data || []);
                setAvailableMaterials(res.data.available_materials || []);
                if (res.data.available_materials?.length > 0) {
                    setNewBOMItem(prev => ({ ...prev, material_id: String(res.data.available_materials[0].id) }));
                }
            }
        } catch (err) {
            console.error("Load BOM error:", err);
            setError("Failed to load product BOM.");
        } finally {
            setBomLoading(false);
        }
    };

    const handleAddBOMItem = (e) => {
        e.preventDefault();
        if (!newBOMItem.material_id || !newBOMItem.quantity_per_unit) return;
        const mat = availableMaterials.find(m => String(m.id) === String(newBOMItem.material_id));
        if (!mat) return;

        if (bomItems.some(i => String(i.material_id) === String(newBOMItem.material_id))) {
            alert("This material is already in the BOM. Remove it first to update quantity.");
            return;
        }

        const qty = parseFloat(newBOMItem.quantity_per_unit);
        const waste = parseFloat(newBOMItem.wastage_percentage || 0);
        const cost = (qty * (1 + waste / 100) * (mat.standard_purchase_rate || 0)).toFixed(2);

        setBomItems([
            ...bomItems,
            {
                material_id: mat.id,
                material_name: mat.material_name,
                material_code: mat.material_code,
                category_name: mat.category_name,
                unit_symbol: mat.unit_symbol,
                quantity_per_unit: qty,
                wastage_percentage: waste,
                unit_cost_inr: cost
            }
        ]);

        setNewBOMItem(prev => ({
            ...prev,
            quantity_per_unit: ""
        }));
    };

    const handleRemoveBOMItem = (index) => {
        setBomItems(bomItems.filter((_, idx) => idx !== index));
    };

    const handleSaveBOM = async () => {
        if (!selectedBOMProduct) return;
        setBomSaving(true);
        try {
            const res = await api.post(`/products/${selectedBOMProduct.id}/bom`, {
                items: bomItems.map(i => ({
                    material_id: i.material_id,
                    quantity_per_unit: i.quantity_per_unit,
                    wastage_percentage: i.wastage_percentage
                }))
            });
            if (res.data?.success) {
                setSuccess(`BOM for ${selectedBOMProduct.product_name} saved! Standard cost: ₹${res.data.bom_cost}`);
                setShowBOMModal(false);
                await loadProducts();
            } else {
                setError(res.data?.message || "Failed to save BOM");
            }
        } catch (err) {
            console.error("Save BOM error:", err);
            setError("Server error while saving BOM.");
        } finally {
            setBomSaving(false);
        }
    };

    const handleSeedBOM = async () => {
        if (!window.confirm("Seed default industry-standard BOM formulations for all PVC carpets and rolls?")) return;
        try {
            setLoading(true);
            const res = await api.post("/products/seed-bom");
            if (res.data?.success) {
                setSuccess(res.data.message);
                await loadProducts();
            }
        } catch (err) {
            console.error("Seed BOM error:", err);
            setError("Failed to seed BOM.");
        } finally {
            setLoading(false);
        }
    };

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

        const categoriesCount = new Set(
            products.map((p) => p.category_name || p.category_code).filter(Boolean)
        ).size;

        return {
            total: products.length,
            active,
            inactive,
            categoriesCount: categoriesCount || categories.length || 0
        };
    }, [products, categories]);

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

    const formatDimensions = (product) => {
        const w = Number(product.width_mm || 0);
        const l = Number(product.length_m || 0);
        const t = Number(product.thickness_mm || 0);
        const gsm = product.gsm ? `${formatNumber(product.gsm, 0)} GSM` : null;

        let dim = "";
        if (w > 0 && t > 0) {
            dim = `${formatNumber(w, 0)} × ${formatNumber(t)} mm`;
        } else if (w > 0 && l > 0) {
            dim = `${formatNumber(w, 0)} mm × ${formatNumber(l, 1)} m`;
        } else if (t > 0) {
            dim = `${formatNumber(t)} mm thick`;
        } else if (w > 0) {
            dim = `${formatNumber(w, 0)} mm width`;
        }

        if (dim && gsm) {
            return `${dim} / ${gsm}`;
        }
        return dim || gsm || "Standard Spec";
    };

    return (
        <div className="products-page">

            <div className="prd-header-card">
                <div className="prd-header-info">
                    <div className="prd-eyebrow">
                        <Package size={13} /> PVC MANUFACTURING ERP
                    </div>
                    <h1>Products</h1>
                    <p>Manage PVC carpet products, specifications, routing and pricing.</p>
                </div>
                <div className="prd-header-actions">
                    <button
                        className="prd-refresh-btn"
                        onClick={loadProducts}
                        title="Refresh List"
                        type="button"
                    >
                        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        type="button"
                        className="prd-btn seed"
                        onClick={handleSeedBOM}
                        title="Seed Standard BOM Formulations"
                    >
                        <Sparkles size={14} />
                        Seed Standard BOM
                    </button>

                    <ExcelToolbar
                        moduleName="products"
                        displayName="Products"
                        onImportDone={loadProducts}
                    />

                    <button
                        type="button"
                        className="prd-btn primary"
                        onClick={openAddForm}
                    >
                        <Plus size={15} strokeWidth={2.5} />
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

            <div className="prd-stats-grid">
                <div className="prd-stat-card">
                    <div className="prd-stat-icon blue">
                        <Package size={22} />
                    </div>
                    <div className="prd-stat-content">
                        <span className="prd-stat-label">Total Products</span>
                        <span className="prd-stat-value">{summary.total}</span>
                    </div>
                </div>

                <div className="prd-stat-card">
                    <div className="prd-stat-icon green">
                        <CheckCircle2 size={22} />
                    </div>
                    <div className="prd-stat-content">
                        <span className="prd-stat-label">Active</span>
                        <span className="prd-stat-value">{summary.active}</span>
                    </div>
                </div>

                <div className="prd-stat-card">
                    <div className="prd-stat-icon amber">
                        <XCircle size={22} />
                    </div>
                    <div className="prd-stat-content">
                        <span className="prd-stat-label">Inactive</span>
                        <span className="prd-stat-value">{summary.inactive}</span>
                    </div>
                </div>

                <div className="prd-stat-card">
                    <div className="prd-stat-icon purple">
                        <Layers size={22} />
                    </div>
                    <div className="prd-stat-content">
                        <span className="prd-stat-label">Categories</span>
                        <span className="prd-stat-value">{summary.categoriesCount}</span>
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

            <div className="prd-toolbar">
                <div className="prd-search-box">
                    <Search size={15} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Search product code, name, carpet type, colour..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    {search && (
                        <button
                            type="button"
                            className="prd-clear-btn"
                            onClick={() => { setSearch(""); loadProducts(); }}
                            title="Clear search"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                <div className="prd-filter-group">
                    <select
                        className="prd-filter-select"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>
            </div>

            <div className="prd-table-card">
                <div className="prd-table-responsive">
                    <table className="prd-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Product Details</th>
                                <th>Category</th>
                                <th>Specifications</th>
                                <th>Commercial Price</th>
                                <th>Status</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="table-state">
                                        Loading products...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="table-state">
                                        <div className="products-empty">
                                            <strong>No products found</strong>
                                            <span>Add a PVC carpet product or change your filters.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id}>
                                        <td>
                                            <span className="prd-code-badge">
                                                {product.product_code}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="prd-name-cell">
                                                <strong>{product.product_name}</strong>
                                                {product.design_pattern && (
                                                    <span>{product.design_pattern}</span>
                                                )}
                                            </div>
                                        </td>

                                        <td>
                                            <span style={{ color: "#334155", fontWeight: 500 }}>
                                                {product.category_name || product.category_code || "—"}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="prd-spec-cell">
                                                <span className="spec-main">{product.carpet_type || "PVC Carpet"}</span>
                                                {product.colour && <span className="spec-sub">{product.colour}</span>}
                                                <span className="spec-sub" style={{ color: "#2563eb", fontWeight: 600 }}>
                                                    {formatDimensions(product)}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <div className="prd-price-cell">
                                                <span className="price-sell">
                                                    {formatMoney(product.selling_price)}
                                                </span>
                                                <span className="price-cost">
                                                    Cost {formatMoney(product.standard_cost)}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <span className={`prd-status-pill ${product.status === "ACTIVE" ? "active" : "inactive"}`}>
                                                {product.status}
                                            </span>
                                        </td>

                                        <td style={{ textAlign: "right" }}>
                                            <div className="prd-actions-cell">
                                                <button
                                                    type="button"
                                                    className="prd-action-btn bom"
                                                    title="View / Configure Bill of Materials (BOM Formulation)"
                                                    onClick={() => openBOMModal(product)}
                                                >
                                                    <Layers size={13} />
                                                    <span>BOM</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="prd-action-btn edit"
                                                    title="Edit Product Details"
                                                    onClick={() => openEditForm(product)}
                                                >
                                                    <Edit2 size={13} />
                                                    <span>Edit</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="prd-action-btn delete"
                                                    title="Delete Product"
                                                    onClick={() => handleDelete(product)}
                                                >
                                                    <Trash2 size={13} />
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

            <div style={{ marginTop: 10, color: "#64748b", fontSize: "0.78rem" }}>
                Showing <strong>{products.length}</strong> product{products.length === 1 ? "" : "s"}
            </div>

            {/* BILL OF MATERIALS (BOM) CONFIGURATION MODAL */}
            {showBOMModal && selectedBOMProduct && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(15, 23, 42, 0.65)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: "20px"
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowBOMModal(false);
                    }}
                >
                    <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
                        maxWidth: "860px",
                        width: "100%",
                        maxHeight: "90vh",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden"
                    }}>
                        <div style={{
                            padding: "20px 24px",
                            borderBottom: "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            background: "#ffffff"
                        }}>
                            <div>
                                <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    FORMULATION & INGREDIENT RECIPE
                                </span>
                                <h2 style={{ margin: "4px 0 2px", fontSize: "1.25rem", color: "#0f172a" }}>
                                    Bill of Materials (BOM): {selectedBOMProduct.product_name}
                                </h2>
                                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                    Product Code: <strong style={{ color: "#0f172a" }}>{selectedBOMProduct.product_code}</strong> • Standard Cost: <strong style={{ color: "#16a34a" }}>₹{selectedBOMProduct.standard_cost || 0}</strong>
                                </span>
                            </div>
                            <button
                                type="button"
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
                                onClick={() => setShowBOMModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
                            {/* Summary Card */}
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "12px 16px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                marginBottom: "16px"
                            }}>
                                <div>
                                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>TOTAL FORMULATION INGREDIENTS</div>
                                    <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a" }}>{bomItems.length} Raw Materials</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>TOTAL ESTIMATED BOM COST</div>
                                    <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#16a34a" }}>
                                        ₹{bomItems.reduce((sum, item) => sum + parseFloat(item.unit_cost_inr || 0), 0).toFixed(2)} <span style={{ fontSize: "0.8rem", color: "#64748b" }}>/ unit</span>
                                    </div>
                                </div>
                            </div>

                            {/* Add Ingredient Form */}
                            <form onSubmit={handleAddBOMItem} style={{
                                display: "grid",
                                gridTemplateColumns: "2fr 1fr 1fr auto",
                                gap: "10px",
                                alignItems: "flex-end",
                                background: "#f1f5f9",
                                padding: "12px",
                                borderRadius: "8px",
                                marginBottom: "16px"
                            }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                                        Raw Material / Chemical *
                                    </label>
                                    <select
                                        value={newBOMItem.material_id}
                                        onChange={(e) => setNewBOMItem({ ...newBOMItem, material_id: e.target.value })}
                                        style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", background: "#fff" }}
                                        required
                                    >
                                        <option value="">Select Material...</option>
                                        {availableMaterials.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.material_name} ({m.material_code}) - {m.unit_symbol} [₹{m.standard_purchase_rate}/{m.unit_symbol}]
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                                        Qty per Unit *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        min="0.001"
                                        placeholder="e.g. 0.450"
                                        value={newBOMItem.quantity_per_unit}
                                        onChange={(e) => setNewBOMItem({ ...newBOMItem, quantity_per_unit: e.target.value })}
                                        style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                                        required
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                                        Wastage %
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="e.g. 1.5"
                                        value={newBOMItem.wastage_percentage}
                                        onChange={(e) => setNewBOMItem({ ...newBOMItem, wastage_percentage: e.target.value })}
                                        style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    style={{
                                        padding: "8px 14px",
                                        borderRadius: "6px",
                                        border: "none",
                                        background: "#7c3aed",
                                        color: "#fff",
                                        fontWeight: "700",
                                        fontSize: "0.82rem",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        height: "36px"
                                    }}
                                >
                                    <Plus size={14} /> Add
                                </button>
                            </form>

                            {/* BOM Items Table */}
                            <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                                    <thead style={{ background: "#f8fafc", position: "sticky", top: 0, borderBottom: "1px solid #e2e8f0" }}>
                                        <tr>
                                            <th style={{ textAlign: "left", padding: "8px 12px", color: "#475569" }}>Material</th>
                                            <th style={{ textAlign: "left", padding: "8px 12px", color: "#475569" }}>Category</th>
                                            <th style={{ textAlign: "right", padding: "8px 12px", color: "#475569" }}>Qty / Unit</th>
                                            <th style={{ textAlign: "right", padding: "8px 12px", color: "#475569" }}>Wastage %</th>
                                            <th style={{ textAlign: "right", padding: "8px 12px", color: "#475569" }}>Est. Cost (₹)</th>
                                            <th style={{ textAlign: "center", padding: "8px 12px", color: "#475569" }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bomLoading ? (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                                                    Loading BOM ingredients...
                                                </td>
                                            </tr>
                                        ) : bomItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                                                    No ingredients in this Bill of Materials yet. Add one above or click "Seed Standard BOM".
                                                </td>
                                            </tr>
                                        ) : (
                                            bomItems.map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                    <td style={{ padding: "8px 12px" }}>
                                                        <strong style={{ color: "#0f172a" }}>{item.material_name}</strong>
                                                        <div style={{ fontSize: "0.72rem", color: "#7c3aed", fontWeight: "600" }}>{item.material_code}</div>
                                                    </td>
                                                    <td style={{ padding: "8px 12px", color: "#64748b" }}>{item.category_name}</td>
                                                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: "700" }}>
                                                        {item.quantity_per_unit} {item.unit_symbol}
                                                    </td>
                                                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#d97706", fontWeight: "600" }}>
                                                        {item.wastage_percentage}%
                                                    </td>
                                                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: "700", color: "#16a34a" }}>
                                                        ₹{item.unit_cost_inr}
                                                    </td>
                                                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveBOMItem(idx)}
                                                            style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}
                                                            title="Remove ingredient"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Modal Footer Actions */}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "18px" }}>
                                <button
                                    type="button"
                                    onClick={() => setShowBOMModal(false)}
                                    style={{
                                        height: "34px",
                                        padding: "0 14px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        background: "#fff",
                                        color: "#475569",
                                        fontSize: "12.5px",
                                        fontWeight: "600",
                                        cursor: "pointer"
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveBOM}
                                    disabled={bomSaving}
                                    style={{
                                        height: "34px",
                                        padding: "0 16px",
                                        borderRadius: "6px",
                                        border: "none",
                                        background: "#16a34a",
                                        color: "#fff",
                                        fontSize: "12.5px",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px"
                                    }}
                                >
                                    <CheckCircle2 size={15} />
                                    {bomSaving ? "Saving..." : "Save Bill of Materials"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Products;
