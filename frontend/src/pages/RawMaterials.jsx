import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
    FlaskConical,
    Layers,
    Scale,
    Activity,
    Plus,
    Search,
    Filter,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Check,
    X,
    Clock,
    ShieldCheck,
    Gauge,
    Flame,
    Droplet,
    Sparkles,
    ArrowRight,
    Database,
    Tag,
    ChevronRight,
    Package,
    BarChart3,
    TrendingUp
} from "lucide-react";
import "./RawMaterials.css";
import ExcelToolbar from "../components/ExcelToolbar";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function RawMaterials() {
    const location = useLocation();

    // Active Tab: "stock", "recipes", "mixing"
    const [activeTab, setActiveTab] = useState(() => {
        if (location.pathname === "/chemical-mixing" || location.pathname === "/material-issue") {
            return "mixing";
        }
        return "stock";
    });

    useEffect(() => {
        if (location.pathname === "/chemical-mixing" || location.pathname === "/material-issue") {
            setActiveTab("mixing");
        } else if (location.pathname === "/raw-materials" || location.pathname === "/raw-material-stock") {
            setActiveTab("stock");
        }
    }, [location.pathname]);

    // Data states
    const [materials, setMaterials] = useState([]);
    const [formulations, setFormulations] = useState([]);
    const [mixingBatches, setMixingBatches] = useState([]);
    const [dbCategories, setDbCategories] = useState([]);
    const [dbUnits, setDbUnits] = useState([]);
    const [stats, setStats] = useState({
        total_materials: 0,
        total_valuation_inr: "0.00",
        low_stock_items: 0,
        today_batches: 0,
        today_paste_kg: "0.00",
        active_formulations: 0
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Filters for materials
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");

    // Modal: Add New Material / Item
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({
        material_code: "",
        material_name: "",
        category_id: "",
        unit_id: "",
        grade: "",
        minimum_stock: "",
        reorder_level: "",
        standard_purchase_rate: "",
        initial_stock_qty: "",
        batch_number: "",
        location_rack: ""
    });
    const [addSubmitting, setAddSubmitting] = useState(false);

    // Modal: Quick Stock Adjustment (+Add / -Deduct)
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustTargetMaterial, setAdjustTargetMaterial] = useState(null);
    const [adjustForm, setAdjustForm] = useState({
        type: "ADD",
        quantity: "",
        reel_count: "",
        reason: "PURCHASE",
        batch_number: "",
        remarks: ""
    });
    const [adjustSubmitting, setAdjustSubmitting] = useState(false);

    // Modal: Edit Material
    const [showEditModal, setShowEditModal] = useState(false);
    const [editMaterial, setEditMaterial] = useState(null);
    const [editForm, setEditForm] = useState({
        material_name: "",
        category_id: "",
        unit_id: "",
        grade: "",
        minimum_stock: "",
        reorder_level: "",
        standard_purchase_rate: ""
    });
    const [editSubmitting, setEditSubmitting] = useState(false);

    // Modal: New Mixing Batch
    const [showMixingModal, setShowMixingModal] = useState(false);
    const [selectedFormulationId, setSelectedFormulationId] = useState("");
    const [mixingForm, setMixingForm] = useState({
        mixer_machine_name: "High-Speed Dissolver Mixer #1",
        operator_name: "Devendra Solanki (Mixing Master)",
        actual_weight_kg: "500",
        measured_viscosity_cp: "3850",
        measured_temp_c: "28.5",
        measured_density_g_cm3: "1.280",
        deaeration_vacuum_bar: "-0.85",
        fineness_hegman_microns: "25",
        destination_coating_line: "PVC Coating Line 01",
        remarks: "Smooth dispersion, no agglomerates"
    });
    const [mixingSubmitting, setMixingSubmitting] = useState(false);

    // Analysis States (Till Date Inventory & 15-day Inward/Consumption)
    const [inventoryAnalysis, setInventoryAnalysis] = useState([]);
    const [analysisSummary, setAnalysisSummary] = useState(null);
    const [analysisFilter, setAnalysisFilter] = useState("ALL");
    const [analysisSearch, setAnalysisSearch] = useState("");

    // =========================================================
    // INITIAL LOAD
    // =========================================================
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [matRes, statsRes, formRes, mixRes, metaRes, analysisRes] = await Promise.all([
                fetch(`${API_BASE}/raw-materials`),
                fetch(`${API_BASE}/raw-materials/stats`),
                fetch(`${API_BASE}/raw-materials/formulations`),
                fetch(`${API_BASE}/raw-materials/mixing-batches`),
                fetch(`${API_BASE}/raw-materials/metadata`),
                fetch(`${API_BASE}/raw-materials/analysis`)
            ]);

            const [mJson, sJson, fJson, bJson, metaJson, aJson] = await Promise.all([
                matRes.json(),
                statsRes.json(),
                formRes.json(),
                mixRes.json(),
                metaRes.json(),
                analysisRes.json()
            ]);

            if (mJson.success) setMaterials(mJson.data || []);
            if (sJson.success) setStats(sJson.data || {});
            if (aJson.success) {
                setInventoryAnalysis(aJson.data || []);
                setAnalysisSummary(aJson.summary || null);
            }
            if (metaJson.success && metaJson.data) {
                setDbCategories(metaJson.data.categories || []);
                setDbUnits(metaJson.data.units || []);
                if (metaJson.data.categories?.length > 0 && !addForm.category_id) {
                    setAddForm(prev => ({ ...prev, category_id: String(metaJson.data.categories[0].id) }));
                }
                if (metaJson.data.units?.length > 0 && !addForm.unit_id) {
                    const kgUnit = metaJson.data.units.find(u => u.symbol === "KG") || metaJson.data.units[0];
                    setAddForm(prev => ({ ...prev, unit_id: String(kgUnit.id) }));
                }
            }
            if (fJson.success) {
                setFormulations(fJson.data || []);
                if (fJson.data?.length > 0 && !selectedFormulationId) {
                    setSelectedFormulationId(String(fJson.data[0].id));
                }
            }
            if (bJson.success) setMixingBatches(bJson.data || []);
        } catch (err) {
            console.error("Failed to load raw material data:", err);
            setError("Failed to connect to chemical inventory database.");
        } finally {
            setLoading(false);
        }
    };

    // Selected Formulation for Recipe view or Mixing
    const activeFormulation = useMemo(() => {
        return formulations.find(f => String(f.id) === String(selectedFormulationId)) || formulations[0];
    }, [formulations, selectedFormulationId]);

    // Live Viscosity QC Evaluation
    const liveViscosityEvaluation = useMemo(() => {
        if (!activeFormulation) return { result: "PENDING", diff: 0 };
        const visc = parseInt(mixingForm.measured_viscosity_cp, 10) || 0;
        const target = activeFormulation.target_viscosity_cp;
        const tol = activeFormulation.viscosity_tolerance_cp;
        const diff = visc - target;

        let result = "PASS";
        if (Math.abs(diff) <= tol) {
            result = "PASS";
        } else if (Math.abs(diff) <= (tol * 1.5)) {
            result = "BORDERLINE";
        } else {
            result = "FAIL";
        }
        return { result, diff, target, tol };
    }, [activeFormulation, mixingForm.measured_viscosity_cp]);

    // =========================================================
    // SUBMIT NEW MIXING BATCH
    // =========================================================
    const handleSaveBatch = async (e) => {
        e.preventDefault();
        if (!selectedFormulationId) {
            setError("Please select a target formulation.");
            return;
        }

        setError(null);
        setMixingSubmitting(true);

        const payload = {
            ...mixingForm,
            formulation_id: selectedFormulationId
        };

        try {
            const res = await fetch(`${API_BASE}/raw-materials/mixing-batches`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.success) {
                setSuccessMessage(json.message);
                setShowMixingModal(false);
                await loadData();
                setActiveTab("mixing");
            } else {
                setError(json.message || "Failed to log mixing batch.");
            }
        } catch (err) {
            console.error("Error submitting mixing batch:", err);
            setError("Server error while processing paste mixing batch.");
        } finally {
            setMixingSubmitting(false);
        }
    };

    // =========================================================
    // CREATE NEW RAW MATERIAL
    // =========================================================
    const handleCreateMaterial = async (e) => {
        e.preventDefault();
        setError(null);
        setAddSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/raw-materials`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(addForm)
            });
            const json = await res.json();
            if (json.success) {
                setSuccessMessage(json.message || "Material added to inventory successfully!");
                setShowAddModal(false);
                setAddForm({
                    material_code: "",
                    material_name: "",
                    category_id: dbCategories[0]?.id ? String(dbCategories[0].id) : "",
                    unit_id: dbUnits[0]?.id ? String(dbUnits[0].id) : "",
                    grade: "",
                    minimum_stock: "",
                    reorder_level: "",
                    standard_purchase_rate: "",
                    initial_stock_qty: "",
                    batch_number: "",
                    location_rack: ""
                });
                await loadData();
            } else {
                setError(json.message || "Failed to create material");
            }
        } catch (err) {
            console.error("Create material error:", err);
            setError("Server error while adding new inventory item.");
        } finally {
            setAddSubmitting(false);
        }
    };

    // =========================================================
    // QUICK STOCK ADJUSTMENT (+ADD / -DEDUCT)
    // =========================================================
    const handleAdjustStock = async (e) => {
        e.preventDefault();
        if (!adjustTargetMaterial) return;
        setError(null);
        setAdjustSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/raw-materials/${adjustTargetMaterial.id}/adjust-stock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(adjustForm)
            });
            const json = await res.json();
            if (json.success) {
                setSuccessMessage(json.message || "Stock adjusted successfully!");
                setShowAdjustModal(false);
                setAdjustTargetMaterial(null);
                await loadData();
            } else {
                setError(json.message || "Failed to adjust stock");
            }
        } catch (err) {
            console.error("Adjust stock error:", err);
            setError("Server error while adjusting stock.");
        } finally {
            setAdjustSubmitting(false);
        }
    };

    // =========================================================
    // UPDATE MATERIAL DETAILS
    // =========================================================
    const handleUpdateMaterial = async (e) => {
        e.preventDefault();
        if (!editMaterial) return;
        setError(null);
        setEditSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/raw-materials/${editMaterial.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm)
            });
            const json = await res.json();
            if (json.success) {
                setSuccessMessage("Material updated successfully!");
                setShowEditModal(false);
                setEditMaterial(null);
                await loadData();
            } else {
                setError(json.message || "Failed to update material");
            }
        } catch (err) {
            console.error("Update material error:", err);
            setError("Server error while updating material.");
        } finally {
            setEditSubmitting(false);
        }
    };

    // =========================================================
    // DELETE MATERIAL
    // =========================================================
    const handleDeleteMaterial = async (id, name) => {
        if (!window.confirm(`Are you sure you want to deactivate "${name}" from inventory?`)) return;
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/raw-materials/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
                setSuccessMessage(`Material "${name}" removed.`);
                await loadData();
            } else {
                setError(json.message || "Failed to delete material");
            }
        } catch (err) {
            console.error("Delete material error:", err);
            setError("Server error while deleting material.");
        }
    };

    // Issue to Line
    const handleIssueBatch = async (batchId) => {
        try {
            const res = await fetch(`${API_BASE}/raw-materials/mixing-batches/${batchId}/issue`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ destination_line: "PVC Coating Line 01" })
            });
            const json = await res.json();
            if (json.success) {
                setSuccessMessage(json.message);
                loadData();
            }
        } catch (err) {
            console.error("Issue error:", err);
        }
    };

    // Filtered Materials
    const filteredMaterials = useMemo(() => {
        return materials.filter(m => {
            const q = searchQuery.toLowerCase();
            const matchesQuery = !q ||
                m.material_code.toLowerCase().includes(q) ||
                m.material_name.toLowerCase().includes(q) ||
                (m.grade && m.grade.toLowerCase().includes(q));

            const matchesCategory = !categoryFilter || String(m.category_id) === String(categoryFilter);
            return matchesQuery && matchesCategory;
        });
    }, [materials, searchQuery, categoryFilter]);

    // Categories list for filter
    const categories = useMemo(() => {
        const map = new Map();
        materials.forEach(m => {
            if (m.category_id && m.category_name) {
                map.set(m.category_id, m.category_name);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [materials]);

    const filteredAnalysis = useMemo(() => {
        return inventoryAnalysis.filter((item) => {
            const matchesSearch =
                !analysisSearch ||
                item.material_name?.toLowerCase().includes(analysisSearch.toLowerCase()) ||
                item.material_code?.toLowerCase().includes(analysisSearch.toLowerCase()) ||
                item.category_name?.toLowerCase().includes(analysisSearch.toLowerCase());

            if (!matchesSearch) return false;

            if (analysisFilter === "CRITICAL") {
                return item.margin_days < 20 || item.status === "CRITICAL";
            }
            if (analysisFilter === "REORDER") {
                return item.margin_days >= 20 && item.margin_days < 39;
            }
            if (analysisFilter === "HEALTHY") {
                return item.margin_days >= 39;
            }
            return true;
        });
    }, [inventoryAnalysis, analysisSearch, analysisFilter]);

    const handleSeedInventory = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/raw-materials/seed?force=true`, { method: "POST" });
            const json = await res.json();
            if (json.success) {
                setSuccessMessage("Approved inventory batches & sample mixing runs initialized successfully!");
                await loadData();
            } else {
                setError(json.message || "Failed to initialize batches.");
            }
        } catch (err) {
            console.error("Seed error:", err);
            setError("Server error while initializing inventory batches.");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrencyLakhs = (val) => {
        const num = Number(val || 0);
        if (num >= 10000000) {
            return `₹${(num / 10000000).toFixed(2)} Cr`;
        }
        return `₹${(num / 100000).toFixed(2)} Lakhs`;
    };

    return (
        <div className="rm-page">
            {/* ================================================= 
               HEADER & ACTIONS
            ================================================= */}
            <div className="rm-header-card">
                <div className="rm-header-info">
                    <h1>Inventory & Raw Materials</h1>
                    <p>Track raw materials, chemicals, consumables, formulations & warehouse stocks.</p>
                </div>
                <div className="rm-header-actions">
                    <button
                        type="button"
                        className="rm-tab-btn primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={15} /> Add New Material / Item
                    </button>
                    <button
                        type="button"
                        className="rm-refresh-btn"
                        onClick={loadData}
                        title="Reload Data"
                    >
                        <RefreshCw size={17} className={loading ? "rm-spin" : ""} />
                    </button>
                    <ExcelToolbar
                        moduleName="raw_materials"
                        displayName="Raw Materials"
                        onImportDone={loadData}
                    />
                    <button
                        type="button"
                        className="rm-seed-btn"
                        onClick={handleSeedInventory}
                        title="Seed / Reset realistic supplier inventory batches"
                    >
                        <Sparkles size={15} /> Seed Sample Inventory
                    </button>
                    <button
                        type="button"
                        className="rm-tab-btn"
                        onClick={() => {
                            if (activeFormulation) {
                                setMixingForm(prev => ({
                                    ...prev,
                                    measured_viscosity_cp: String(activeFormulation.target_viscosity_cp)
                                }));
                            }
                            setShowMixingModal(true);
                        }}
                    >
                        <FlaskConical size={15} /> Log Mixing Batch
                    </button>
                </div>
            </div>

            {/* TAB BAR */}
            <div className="rm-tab-bar">
                <button
                    type="button"
                    className={`rm-tab-item ${activeTab === "stock" ? "active" : ""}`}
                    onClick={() => setActiveTab("stock")}
                >
                    <Database size={15} /> Chemical & Raw Material Stock
                </button>
                <button
                    type="button"
                    className={`rm-tab-item ${activeTab === "recipes" ? "active" : ""}`}
                    onClick={() => setActiveTab("recipes")}
                >
                    <FlaskConical size={15} /> Plastisol Recipes
                </button>
                <button
                    type="button"
                    className={`rm-tab-item ${activeTab === "mixing" ? "active" : ""}`}
                    onClick={() => setActiveTab("mixing")}
                >
                    <Activity size={15} /> Mixing Logs
                </button>
                <button
                    type="button"
                    className={`rm-tab-item ${activeTab === "analysis" ? "active" : ""}`}
                    onClick={() => setActiveTab("analysis")}
                >
                    <TrendingUp size={15} /> Till Date Inventory & 39-Margin
                </button>
            </div>

            {/* Notification Alerts */}
            {successMessage && (
                <div className="rm-alert rm-alert-success">
                    <CheckCircle2 size={16} />
                    <span>{successMessage}</span>
                    <button type="button" onClick={() => setSuccessMessage(null)}><X size={14} /></button>
                </div>
            )}
            {error && (
                <div className="rm-alert rm-alert-error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                    <button type="button" onClick={() => setError(null)}><X size={14} /></button>
                </div>
            )}

            {/* =================================================
               METRIC SUMMARY CARDS
            ================================================= */}
            <div className="rm-stats-grid">
                <div className="rm-stat-card">
                    <div className="rm-stat-icon-wrap emerald">
                        <Database size={20} />
                    </div>
                    <div className="rm-stat-content">
                        <span className="rm-stat-label">Total Chemical Stock</span>
                        <div className="rm-stat-val">{formatCurrencyLakhs(stats.total_valuation_inr)}</div>
                        <span className="rm-stat-sub">{stats.total_materials} active chemicals</span>
                    </div>
                </div>

                <div className="rm-stat-card">
                    <div className="rm-stat-icon-wrap blue">
                        <Droplet size={20} />
                    </div>
                    <div className="rm-stat-content">
                        <span className="rm-stat-label">Today's Paste Mixed</span>
                        <div className="rm-stat-val">{Number(stats.today_paste_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</div>
                        <span className="rm-stat-sub">{stats.today_batches} batches prepared</span>
                    </div>
                </div>

                <div className="rm-stat-card">
                    <div className="rm-stat-icon-wrap purple">
                        <FlaskConical size={20} />
                    </div>
                    <div className="rm-stat-content">
                        <span className="rm-stat-label">Active Formulations</span>
                        <div className="rm-stat-val">{stats.active_formulations} Recipes</div>
                        <span className="rm-stat-sub">Wear, Foam & Compact Undercoat</span>
                    </div>
                </div>

                <div className="rm-stat-card">
                    <div className={`rm-stat-icon-wrap ${stats.low_stock_items > 0 ? "amber" : "emerald"}`}>
                        <ShieldCheck size={20} />
                    </div>
                    <div className="rm-stat-content">
                        <span className="rm-stat-label">Inventory Health</span>
                        <div className="rm-stat-val">
                            {stats.low_stock_items > 0 ? `${stats.low_stock_items} Low Items` : "Healthy Buffer"}
                        </div>
                        <span className="rm-stat-sub">
                            {stats.low_stock_items > 0 ? "Reorder alerts triggered" : "All critical resins in buffer"}
                        </span>
                    </div>
                </div>
            </div>

            {/* =================================================
               TAB 1: CHEMICAL RAW MATERIALS STOCK DIRECTORY
            ================================================= */}
            {activeTab === "stock" && (
                <div className="rm-card">
                    <div className="rm-filter-bar">
                        <div className="rm-search-wrap">
                            <Search size={15} />
                            <input
                                type="text"
                                placeholder="Search by Material Code, Name, Grade..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="rm-filter-selects">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {dbCategories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            {(searchQuery || categoryFilter) && (
                                <button
                                    type="button"
                                    className="rm-clear-btn"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setCategoryFilter("");
                                    }}
                                >
                                    Clear
                                </button>
                            )}

                            <button
                                type="button"
                                className="rm-tab-btn primary"
                                style={{ marginLeft: "auto" }}
                                onClick={() => setShowAddModal(true)}
                            >
                                <Plus size={14} /> Add Item
                            </button>
                        </div>
                    </div>

                    <div className="rm-table-responsive">
                        <table className="rm-table">
                            <thead>
                                <tr>
                                    <th>Material Code & Name</th>
                                    <th>Category</th>
                                    <th>Technical Grade / Spec</th>
                                    <th>Available Stock</th>
                                    <th>Reorder Level</th>
                                    <th>Rate (₹ / Unit)</th>
                                    <th>Total Valuation</th>
                                    <th>Stock Status</th>
                                    <th style={{ textAlign: "center", width: "170px" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && materials.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="rm-td-center">
                                            <RefreshCw className="rm-spin" size={18} /> Loading inventory catalog...
                                        </td>
                                    </tr>
                                ) : filteredMaterials.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="rm-td-center">
                                            No raw materials found matching filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMaterials.map(mat => {
                                        const stock = parseFloat(mat.current_stock_qty || 0);
                                        const reorder = parseFloat(mat.reorder_level || 0);
                                        const isLow = stock <= reorder;

                                        return (
                                            <tr key={mat.id}>
                                                <td>
                                                    <div className="rm-code-val">{mat.material_code}</div>
                                                    <strong>{mat.material_name}</strong>
                                                </td>
                                                <td>
                                                    <span className="rm-cat-badge">{mat.category_name || "General"}</span>
                                                </td>
                                                <td>
                                                    <span className="rm-grade-desc">{mat.grade || "Standard Grade"}</span>
                                                </td>
                                                <td>
                                                    <strong className="rm-stock-val">
                                                        {Number(mat.current_stock_qty).toLocaleString()} {mat.unit_symbol || "KG"}
                                                    </strong>
                                                </td>
                                                <td>
                                                    <span className="rm-sub-text">
                                                        Min: {Number(mat.reorder_level).toLocaleString()} {mat.unit_symbol || "KG"}
                                                    </span>
                                                </td>
                                                <td>
                                                    ₹{Number(mat.standard_purchase_rate).toFixed(2)}
                                                </td>
                                                <td>
                                                    <strong>₹{Number(mat.total_valuation_inr).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                                </td>
                                                <td>
                                                    <span className={`rm-stock-pill ${isLow ? "low" : "healthy"}`}>
                                                        {isLow ? "Reorder Alert" : "Healthy Buffer"}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                                                    <div style={{ display: "inline-flex", gap: "6px" }}>
                                                        <button
                                                            type="button"
                                                            className="rm-row-btn stock"
                                                            title="Quick Add / Deduct Stock"
                                                            onClick={() => {
                                                                setAdjustTargetMaterial(mat);
                                                                setAdjustForm({
                                                                    type: "ADD",
                                                                    quantity: "",
                                                                    reel_count: "",
                                                                    reason: "PURCHASE",
                                                                    batch_number: "",
                                                                    remarks: ""
                                                                });
                                                                setShowAdjustModal(true);
                                                            }}
                                                        >
                                                            <Plus size={12} /> Stock
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="rm-row-btn edit"
                                                            title="Edit Details"
                                                            onClick={() => {
                                                                setEditMaterial(mat);
                                                                setEditForm({
                                                                    material_name: mat.material_name,
                                                                    category_id: mat.category_id || "",
                                                                    unit_id: mat.unit_id || "",
                                                                    grade: mat.grade || "",
                                                                    minimum_stock: mat.minimum_stock || 0,
                                                                    reorder_level: mat.reorder_level || 0,
                                                                    standard_purchase_rate: mat.standard_purchase_rate || 0
                                                                });
                                                                setShowEditModal(true);
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="rm-row-btn delete"
                                                            title="Remove Item"
                                                            onClick={() => handleDeleteMaterial(mat.id, mat.material_name)}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* =================================================
               TAB 2: PLASTISOL FORMULATIONS (RECIPES & PHR)
            ================================================= */}
            {activeTab === "recipes" && (
                <div className="rm-recipe-layout">
                    {/* LEFT LIST OF RECIPES */}
                    <div className="rm-recipe-sidebar">
                        <div className="rm-recipe-sidebar-title">
                            <FlaskConical size={16} />
                            <span>Standard Formulations</span>
                        </div>
                        <div className="rm-recipe-nav-list">
                            {formulations.map(f => (
                                <div
                                    key={f.id}
                                    className={`rm-recipe-nav-item ${String(f.id) === String(selectedFormulationId) ? "active" : ""}`}
                                    onClick={() => setSelectedFormulationId(String(f.id))}
                                >
                                    <div className="rm-recipe-item-top">
                                        <strong>{f.formulation_code}</strong>
                                        <span className={`rm-type-badge ${f.formulation_type?.toLowerCase()}`}>
                                            {f.formulation_type?.replace("_", " ")}
                                        </span>
                                    </div>
                                    <div className="rm-recipe-name">{f.formulation_name}</div>
                                    <div className="rm-recipe-sub">Target Visc: {f.target_viscosity_cp} cP (±{f.viscosity_tolerance_cp})</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT FORMULATION DETAILS & INGREDIENT TABLE */}
                    {activeFormulation && (
                        <div className="rm-recipe-detail-pane">
                            <div className="rm-recipe-detail-header">
                                <div>
                                    <div className="rm-recipe-eyebrow">{activeFormulation.formulation_code} • {activeFormulation.formulation_type?.replace("_", " ")}</div>
                                    <h2>{activeFormulation.formulation_name}</h2>
                                    <p>{activeFormulation.description}</p>
                                </div>
                                <button
                                    type="button"
                                    className="rm-btn-mix-now"
                                    onClick={() => {
                                        setSelectedFormulationId(String(activeFormulation.id));
                                        setMixingForm(prev => ({
                                            ...prev,
                                            measured_viscosity_cp: String(activeFormulation.target_viscosity_cp)
                                        }));
                                        setShowMixingModal(true);
                                    }}
                                >
                                    <Droplet size={15} /> Batch Mix This Recipe
                                </button>
                            </div>

                            {/* Technical Specs Strip */}
                            <div className="rm-recipe-specs-strip">
                                <div className="rm-spec-box">
                                    <span className="lbl">Target Viscosity:</span>
                                    <strong>{activeFormulation.target_viscosity_cp} cP (±{activeFormulation.viscosity_tolerance_cp})</strong>
                                </div>
                                <div className="rm-spec-box">
                                    <span className="lbl">Target Density:</span>
                                    <strong>{activeFormulation.target_density_g_cm3} g/cm³</strong>
                                </div>
                                <div className="rm-spec-box">
                                    <span className="lbl">Gelation Temp:</span>
                                    <strong>{activeFormulation.gelation_temp_c} °C</strong>
                                </div>
                                <div className="rm-spec-box">
                                    <span className="lbl">Fusion Temp:</span>
                                    <strong>{activeFormulation.fusion_temp_c} °C</strong>
                                </div>
                                <div className="rm-spec-box">
                                    <span className="lbl">Std Batch Size:</span>
                                    <strong>{activeFormulation.standard_batch_size_kg} kg</strong>
                                </div>
                            </div>

                            {/* Ingredients Breakdown Table */}
                            <h3 className="rm-section-h3">Formulation BOM & Chemical Ingredients (PHR)</h3>
                            <div className="rm-table-responsive">
                                <table className="rm-table">
                                    <thead>
                                        <tr>
                                            <th>Seq</th>
                                            <th>Chemical Ingredient</th>
                                            <th>Code</th>
                                            <th style={{ textAlign: "right" }}>PHR (Parts / 100 Resin)</th>
                                            <th style={{ textAlign: "right" }}>Weight %</th>
                                            <th style={{ textAlign: "right" }}>Per 500kg Batch</th>
                                            <th>Available In Stock</th>
                                            <th>Role / Function</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(activeFormulation.ingredients || []).map((ing, idx) => (
                                            <tr key={ing.id}>
                                                <td>{idx + 1}</td>
                                                <td><strong>{ing.material_name}</strong></td>
                                                <td><span className="rm-code-val">{ing.material_code}</span></td>
                                                <td style={{ textAlign: "right" }}>
                                                    <strong>{Number(ing.phr_parts).toFixed(1)} phr</strong>
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    {Number(ing.percentage_weight).toFixed(2)}%
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    <strong>{Number(ing.qty_kg_per_standard_batch).toFixed(2)} kg</strong>
                                                </td>
                                                <td>
                                                    <span className={`rm-stock-tag ${parseFloat(ing.available_stock_kg) < parseFloat(ing.qty_kg_per_standard_batch) ? "danger" : "ok"}`}>
                                                        {Number(ing.available_stock_kg).toLocaleString()} kg available
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="rm-sub-text">{ing.notes || "Base Component"}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
                                            <td colSpan="3" style={{ textAlign: "right" }}>TOTAL FORMULATION BATCH WEIGHT:</td>
                                            <td style={{ textAlign: "right" }}>
                                                {(activeFormulation.ingredients || []).reduce((acc, i) => acc + parseFloat(i.phr_parts), 0).toFixed(1)} phr
                                            </td>
                                            <td style={{ textAlign: "right" }}>100.00%</td>
                                            <td style={{ textAlign: "right" }}>
                                                {Number(activeFormulation.standard_batch_size_kg).toFixed(2)} kg
                                            </td>
                                            <td colSpan="2"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* =================================================
               TAB 3: PASTE MIXING STATION LOGS
            ================================================= */}
            {activeTab === "mixing" && (
                <div className="rm-card">
                    <div className="rm-card-header-row">
                        <div>
                            <h2>High-Speed Dissolver Mixing Logs</h2>
                            <p>Cowles dissolver mixing, Brookfield viscosity verification, vacuum degassing & line issues</p>
                        </div>
                        <button
                            type="button"
                            className="rm-btn-mix-now"
                            onClick={() => setShowMixingModal(true)}
                        >
                            <Plus size={15} /> New Paste Mixing Batch
                        </button>
                    </div>

                    <div className="rm-table-responsive" style={{ marginTop: "16px" }}>
                        <table className="rm-table">
                            <thead>
                                <tr>
                                    <th>Batch Number</th>
                                    <th>Formulation Name</th>
                                    <th>Mixer Machine & Operator</th>
                                    <th>Target / Actual Wt</th>
                                    <th>Measured Viscosity (cP)</th>
                                    <th>Deaeration & Fineness</th>
                                    <th>QC Result</th>
                                    <th>Destination / Status</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mixingBatches.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="rm-td-center">
                                            No paste mixing batches logged yet. Click <strong>"New Paste Mixing Batch"</strong> to prepare plastisol.
                                        </td>
                                    </tr>
                                ) : (
                                    mixingBatches.map(b => (
                                        <tr key={b.id}>
                                            <td>
                                                <strong className="rm-batch-code">{b.batch_number}</strong>
                                                <div className="rm-sub-text">{b.batch_date ? new Date(b.batch_date).toLocaleDateString() : "—"}</div>
                                            </td>
                                            <td>
                                                <strong>{b.formulation_name}</strong>
                                                <div className="rm-sub-text">{b.formulation_code}</div>
                                            </td>
                                            <td>
                                                <div>{b.mixer_machine_name}</div>
                                                <div className="rm-sub-text">{b.operator_name}</div>
                                            </td>
                                            <td>
                                                <strong>{Number(b.actual_weight_kg).toFixed(1)} kg</strong>
                                            </td>
                                            <td>
                                                <div className="rm-visc-display">
                                                    <strong>{b.measured_viscosity_cp} cP</strong>
                                                    <span className="rm-sub-text">Target: {b.target_viscosity_cp} (±{b.viscosity_tolerance_cp})</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div>Vacuum: {b.deaeration_vacuum_bar} bar</div>
                                                <div className="rm-sub-text">Hegman: {b.fineness_hegman_microns} µm</div>
                                            </td>
                                            <td>
                                                <span className={`rm-qc-pill ${b.qc_viscosity_result?.toLowerCase()}`}>
                                                    {b.qc_viscosity_result === "PASS" ? <Check size={11} /> : null} {b.qc_viscosity_result}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="rm-dest-line">{b.destination_coating_line}</div>
                                                <span className={`rm-batch-status-badge ${b.status?.toLowerCase()}`}>
                                                    {b.status?.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                {b.status === "APPROVED" && (
                                                    <button
                                                        type="button"
                                                        className="rm-btn-issue-line"
                                                        onClick={() => handleIssueBatch(b.id)}
                                                        title="Transfer batch to PVC coating line feed tank"
                                                    >
                                                        <ArrowRight size={13} /> Feed to Line
                                                    </button>
                                                )}
                                                {b.status === "ISSUED_TO_LINE" && (
                                                    <span className="rm-tag-in-use">In Production</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* =================================================
               TAB 4: TILL DATE INVENTORY, 15-DAY INWARD/CONSUMPTION & 39-DAY MARGIN
            ================================================= */}
            {activeTab === "analysis" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Top KPI Cards (Based on Handwritten Inventory Note) */}
                    <div className="rm-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
                        <div className="rm-stat-card">
                            <div className="rm-stat-top">
                                <span className="rm-stat-label">CURRENT REELS / NOS</span>
                                <div className="rm-stat-icon-wrap" style={{ background: "#ede9fe", color: "#7c3aed" }}>
                                    <Package size={18} />
                                </div>
                            </div>
                            <div className="rm-stat-value">
                                {Number(analysisSummary?.total_reels_nos || 0).toLocaleString()} <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "#64748b" }}>Nos / Reels</span>
                            </div>
                            <span className="rm-stat-sub">
                                Hand-counted physical inventory rolls
                            </span>
                        </div>

                        <div className="rm-stat-card">
                            <div className="rm-stat-top">
                                <span className="rm-stat-label">TILL DATE NET STOCK</span>
                                <div className="rm-stat-icon-wrap" style={{ background: "#e0f2fe", color: "#0284c7" }}>
                                    <Database size={18} />
                                </div>
                            </div>
                            <div className="rm-stat-value">
                                {Number(analysisSummary?.total_stock_qty || 0).toLocaleString()} <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "#64748b" }}>Units</span>
                            </div>
                            <span className="rm-stat-sub">
                                Updated Net = Opening + Inward - Outward
                            </span>
                        </div>

                        <div className="rm-stat-card">
                            <div className="rm-stat-top">
                                <span className="rm-stat-label">15-DAY INWARD (ADD)</span>
                                <div className="rm-stat-icon-wrap" style={{ background: "#dcfce7", color: "#16a34a" }}>
                                    <TrendingUp size={18} />
                                </div>
                            </div>
                            <div className="rm-stat-value" style={{ color: "#16a34a" }}>
                                +{analysisSummary?.total_inward_15d_reels || 0} <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "#16a34a" }}>Reels</span>
                            </div>
                            <span className="rm-stat-sub" style={{ color: "#15803d", fontWeight: "600" }}>
                                +{Number(analysisSummary?.total_inward_15d_qty || 0).toLocaleString()} Units added
                            </span>
                        </div>

                        <div className="rm-stat-card">
                            <div className="rm-stat-top">
                                <span className="rm-stat-label">15-DAY CONSUMPTION</span>
                                <div className="rm-stat-icon-wrap" style={{ background: "#fee2e2", color: "#dc2626" }}>
                                    <ArrowRight size={18} />
                                </div>
                            </div>
                            <div className="rm-stat-value" style={{ color: "#dc2626" }}>
                                -{analysisSummary?.total_outward_15d_reels || 0} <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "#dc2626" }}>Reels</span>
                            </div>
                            <span className="rm-stat-sub" style={{ color: "#b91c1c", fontWeight: "600" }}>
                                -{Number(analysisSummary?.total_outward_15d_qty || 0).toLocaleString()} Units consumed
                            </span>
                        </div>

                        <div className="rm-stat-card" style={{ borderLeft: "4px solid #f59e0b" }}>
                            <div className="rm-stat-top">
                                <span className="rm-stat-label">SAFETY MARGIN BUFFER</span>
                                <div className="rm-stat-icon-wrap" style={{ background: "#fef3c7", color: "#d97706" }}>
                                    <BarChart3 size={18} />
                                </div>
                            </div>
                            <div className="rm-stat-value">
                                {analysisSummary?.avg_margin_days || 39} <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "#64748b" }}>Days</span>
                            </div>
                            <span className="rm-stat-sub" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ padding: "1px 6px", borderRadius: "4px", background: "#fef3c7", color: "#b45309", fontWeight: "700", fontSize: "0.75rem" }}>
                                    Target: 39 Margin
                                </span>
                                Run-rate buffer
                            </span>
                        </div>
                    </div>

                    {/* Analysis Table Card */}
                    <div className="rm-card">
                        <div className="rm-filter-bar">
                            <div className="rm-search-wrap">
                                <Search size={15} />
                                <input
                                    type="text"
                                    placeholder="Filter by material code, name, or category..."
                                    value={analysisSearch}
                                    onChange={(e) => setAnalysisSearch(e.target.value)}
                                />
                            </div>

                            <div className="rm-filter-selects">
                                <select
                                    value={analysisFilter}
                                    onChange={(e) => setAnalysisFilter(e.target.value)}
                                >
                                    <option value="ALL">All Margin Statuses</option>
                                    <option value="CRITICAL">Critical Stock (&lt; 20 Days Margin)</option>
                                    <option value="REORDER">Reorder Watch (20 - 38 Days Margin)</option>
                                    <option value="HEALTHY">Safe Buffer (&ge; 39 Days Margin)</option>
                                </select>

                                {analysisSearch && (
                                    <button
                                        type="button"
                                        className="rm-clear-btn"
                                        onClick={() => setAnalysisSearch("")}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="rm-table-responsive">
                            <table className="rm-table">
                                <thead>
                                    <tr>
                                        <th>Material Details</th>
                                        <th>Category</th>
                                        <th style={{ textAlign: "center" }}>Current Reels / Nos</th>
                                        <th style={{ textAlign: "right" }}>Net Available Stock</th>
                                        <th style={{ textAlign: "center" }}>15-Day Inward (Add)</th>
                                        <th style={{ textAlign: "center" }}>15-Day Consumption</th>
                                        <th style={{ textAlign: "right" }}>Daily Burn Rate</th>
                                        <th style={{ textAlign: "center" }}>Margin Buffer</th>
                                        <th style={{ textAlign: "center" }}>Status</th>
                                        <th style={{ textAlign: "right" }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAnalysis.length === 0 ? (
                                        <tr>
                                            <td colSpan="10" className="rm-empty-state">
                                                No materials found matching current analysis filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAnalysis.map((item) => {
                                            const isCritical = item.margin_days < 20 || item.status === "CRITICAL";
                                            const isWarning = !isCritical && item.margin_days < 39;
                                            return (
                                                <tr key={item.id}>
                                                    <td>
                                                        <div className="rm-mat-name">{item.material_name}</div>
                                                        <div className="rm-mat-code" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                            <span>{item.material_code}</span>
                                                            {item.grade && <span style={{ color: "#64748b" }}>• {item.grade}</span>}
                                                            {item.gsm && <span style={{ color: "#64748b" }}>• {item.gsm} GSM</span>}
                                                            {item.width_mm && <span style={{ color: "#64748b" }}>• {item.width_mm}mm</span>}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="rm-cat-badge">{item.category_name}</span>
                                                    </td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", background: "#f1f5f9", borderRadius: "16px", fontWeight: "700", color: "#334155" }}>
                                                            <Package size={13} color="#64748b" />
                                                            <span>{item.current_reels_nos} Nos / Reels</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: "right" }}>
                                                        <span className="rm-stock-val" style={{ fontWeight: "700", color: isCritical ? "#dc2626" : "#0f172a" }}>
                                                            {Number(item.current_stock_qty).toLocaleString()} {item.unit_symbol}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                                                            <span style={{ color: "#16a34a", fontWeight: "700", fontSize: "0.85rem" }}>
                                                                +{item.inward_15d_reels} Reels
                                                            </span>
                                                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                                                +{Number(item.inward_15d_qty).toLocaleString()} {item.unit_symbol}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                                                            <span style={{ color: "#dc2626", fontWeight: "700", fontSize: "0.85rem" }}>
                                                                -{item.outward_15d_reels} Reels
                                                            </span>
                                                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                                                -{Number(item.outward_15d_qty).toLocaleString()} {item.unit_symbol}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: "right", fontSize: "0.85rem", color: "#475569" }}>
                                                        <strong>{item.daily_consumption}</strong> {item.unit_symbol}/day
                                                    </td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <div style={{
                                                            display: "inline-block",
                                                            padding: "3px 8px",
                                                            borderRadius: "4px",
                                                            fontWeight: "700",
                                                            fontSize: "0.82rem",
                                                            background: isCritical ? "#fee2e2" : isWarning ? "#fef3c7" : "#dcfce7",
                                                            color: isCritical ? "#991b1b" : isWarning ? "#92400e" : "#166534"
                                                        }}>
                                                            {item.margin_days} Days
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <span className={`rm-status-pill ${isCritical ? "low" : isWarning ? "reorder" : "normal"}`}>
                                                            {isCritical ? "CRITICAL" : isWarning ? "REORDER" : "HEALTHY"}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                                        <button
                                                            type="button"
                                                            className="rm-row-btn stock"
                                                            title="Quick Add Inward Stock & Reels"
                                                            onClick={() => {
                                                                const foundMat = materials.find(m => m.id === item.id) || {
                                                                    id: item.id,
                                                                    material_name: item.material_name,
                                                                    material_code: item.material_code,
                                                                    current_stock_qty: item.current_stock_qty,
                                                                    unit_symbol: item.unit_symbol
                                                                };
                                                                setAdjustTargetMaterial(foundMat);
                                                                setAdjustForm({
                                                                    type: "ADD",
                                                                    quantity: "",
                                                                    reel_count: "",
                                                                    reason: "PURCHASE",
                                                                    batch_number: "",
                                                                    remarks: ""
                                                                });
                                                                setShowAdjustModal(true);
                                                            }}
                                                        >
                                                            <Plus size={12} /> Inward
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
               MODAL: PREPARE & LOG NEW PASTE MIXING BATCH
            ================================================= */}
            {showMixingModal && (
                <div className="rm-modal-backdrop" onClick={(e) => e.target.classList.contains("rm-modal-backdrop") && setShowMixingModal(false)}>
                    <div className="rm-modal-card">
                        <div className="rm-modal-header">
                            <div>
                                <span className="rm-eyebrow">COWLES HIGH-SPEED DISSOLVER STATION</span>
                                <h2>Log Plastisol Paste Mixing Batch</h2>
                            </div>
                            <button
                                type="button"
                                className="rm-modal-close"
                                onClick={() => setShowMixingModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveBatch} className="rm-modal-form">
                            {/* Step 1: Formulation Selection */}
                            <div className="rm-form-field">
                                <label>Target Chemical Formulation / Recipe *</label>
                                <select
                                    value={selectedFormulationId}
                                    onChange={(e) => {
                                        setSelectedFormulationId(e.target.value);
                                        const form = formulations.find(f => String(f.id) === String(e.target.value));
                                        if (form) {
                                            setMixingForm(prev => ({
                                                ...prev,
                                                measured_viscosity_cp: String(form.target_viscosity_cp)
                                            }));
                                        }
                                    }}
                                >
                                    {formulations.map(f => (
                                        <option key={f.id} value={f.id}>
                                            {f.formulation_code} - {f.formulation_name} ({f.formulation_type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Active Formulation Quick Spec */}
                            {activeFormulation && (
                                <div className="rm-modal-recipe-summary">
                                    <div className="rm-summary-item">
                                        <span className="lbl">Target Viscosity:</span>
                                        <strong>{activeFormulation.target_viscosity_cp} cP (±{activeFormulation.viscosity_tolerance_cp})</strong>
                                    </div>
                                    <div className="rm-summary-item">
                                        <span className="lbl">Standard Batch:</span>
                                        <strong>{activeFormulation.standard_batch_size_kg} kg</strong>
                                    </div>
                                    <div className="rm-summary-item">
                                        <span className="lbl">Gelation Temp:</span>
                                        <strong>{activeFormulation.gelation_temp_c} °C</strong>
                                    </div>
                                </div>
                            )}

                            {/* Mixing Equipment & Operator */}
                            <div className="rm-form-grid-2">
                                <div className="rm-form-field">
                                    <label>Mixer Machine Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={mixingForm.mixer_machine_name}
                                        onChange={(e) => setMixingForm({ ...mixingForm, mixer_machine_name: e.target.value })}
                                    />
                                </div>

                                <div className="rm-form-field">
                                    <label>Operator / Mixing Master Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={mixingForm.operator_name}
                                        onChange={(e) => setMixingForm({ ...mixingForm, operator_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Batch Weight & Viscosity Measurements */}
                            <div className="rm-form-grid-3">
                                <div className="rm-form-field">
                                    <label>Actual Batch Output (kg) *</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={mixingForm.actual_weight_kg}
                                        onChange={(e) => setMixingForm({ ...mixingForm, actual_weight_kg: e.target.value })}
                                    />
                                </div>

                                <div className="rm-form-field">
                                    <label>Measured Viscosity (cP) *</label>
                                    <input
                                        type="number"
                                        step="10"
                                        required
                                        value={mixingForm.measured_viscosity_cp}
                                        onChange={(e) => setMixingForm({ ...mixingForm, measured_viscosity_cp: e.target.value })}
                                    />
                                </div>

                                <div className="rm-form-field">
                                    <label>Paste Temp (°C)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={mixingForm.measured_temp_c}
                                        onChange={(e) => setMixingForm({ ...mixingForm, measured_temp_c: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Live Viscosity QC Indicator */}
                            <div className="rm-qc-live-banner">
                                <div>
                                    <span className="lbl">VISCOSITY COMPLIANCE:</span>
                                    <strong>
                                        {liveViscosityEvaluation.diff > 0 ? `+${liveViscosityEvaluation.diff}` : liveViscosityEvaluation.diff} cP from target ({liveViscosityEvaluation.target} cP)
                                    </strong>
                                </div>
                                <span className={`rm-qc-pill large ${liveViscosityEvaluation.result.toLowerCase()}`}>
                                    {liveViscosityEvaluation.result}
                                </span>
                            </div>

                            {/* Deaeration & Line Destination */}
                            <div className="rm-form-grid-3">
                                <div className="rm-form-field">
                                    <label>Deaeration Vacuum (bar)</label>
                                    <input
                                        type="text"
                                        value={mixingForm.deaeration_vacuum_bar}
                                        onChange={(e) => setMixingForm({ ...mixingForm, deaeration_vacuum_bar: e.target.value })}
                                        placeholder="-0.85"
                                    />
                                </div>

                                <div className="rm-form-field">
                                    <label>Hegman Fineness (µm)</label>
                                    <input
                                        type="number"
                                        value={mixingForm.fineness_hegman_microns}
                                        onChange={(e) => setMixingForm({ ...mixingForm, fineness_hegman_microns: e.target.value })}
                                        placeholder="25"
                                    />
                                </div>

                                <div className="rm-form-field">
                                    <label>Destination Coating Line</label>
                                    <input
                                        type="text"
                                        value={mixingForm.destination_coating_line}
                                        onChange={(e) => setMixingForm({ ...mixingForm, destination_coating_line: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="rm-form-field">
                                <label>Mixing Remarks & Dispersion Notes</label>
                                <input
                                    type="text"
                                    value={mixingForm.remarks}
                                    onChange={(e) => setMixingForm({ ...mixingForm, remarks: e.target.value })}
                                />
                            </div>

                            <div className="rm-modal-submit-row">
                                <span className="rm-deduct-notice">
                                    * Saving will automatically deduct {mixingForm.actual_weight_kg}kg of component chemicals from warehouse inventory.
                                </span>
                                <button
                                    type="submit"
                                    disabled={mixingSubmitting}
                                    className="rm-btn-save-batch"
                                >
                                    <CheckCircle2 size={16} /> Complete Batch & Update Inventory
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================================= 
               MODAL: ADD NEW RAW MATERIAL / INVENTORY ITEM
            ================================================= */}
            {showAddModal && (
                <div className="rm-modal-backdrop" onClick={() => setShowAddModal(false)}>
                    <div className="rm-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="rm-modal-header">
                            <div>
                                <span className="rm-eyebrow">INVENTORY MASTER</span>
                                <h2>Add New Material / Inventory Item</h2>
                            </div>
                            <button
                                type="button"
                                className="rm-modal-close"
                                onClick={() => setShowAddModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateMaterial} className="rm-modal-form">
                            <div className="rm-form-grid">
                                <div className="rm-form-field">
                                    <label>Material / Item Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. PVC Resin K-67, Red Pigment Paste, Wooden Pallet..."
                                        value={addForm.material_name}
                                        onChange={(e) => setAddForm({ ...addForm, material_name: e.target.value })}
                                    />
                                </div>

                                <div className="rm-form-field">
                                    <label>Material Code (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Auto-generated if empty (e.g. RM-1042)"
                                        value={addForm.material_code}
                                        onChange={(e) => setAddForm({ ...addForm, material_code: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="rm-form-grid-3">
                                <div className="rm-form-field">
                                    <label>Category *</label>
                                    <select
                                        value={addForm.category_id}
                                        onChange={(e) => setAddForm({ ...addForm, category_id: e.target.value })}
                                    >
                                        <option value="">Select Category</option>
                                        {dbCategories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="rm-form-field">
                                    <label>Unit of Measure *</label>
                                    <select
                                        value={addForm.unit_id}
                                        onChange={(e) => setAddForm({ ...addForm, unit_id: e.target.value })}
                                    >
                                        {dbUnits.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="rm-form-field">
                                    <label>Grade / Technical Spec</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Virgin K-67, 99.5% Pure"
                                        value={addForm.grade}
                                        onChange={(e) => setAddForm({ ...addForm, grade: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="rm-form-grid-3">
                                <div className="rm-form-field">
                                    <label>Purchase Rate (₹ / unit)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={addForm.standard_purchase_rate}
                                        onChange={(e) => setAddForm({ ...addForm, standard_purchase_rate: e.target.value })}
                                    />
                                </div>

                                <div className="rm-form-field">
                                    <label>Reorder Alert Level</label>
                                    <input
                                        type="number"
                                        step="1"
                                        placeholder="Minimum threshold"
                                        value={addForm.reorder_level}
                                        onChange={(e) => setAddForm({ ...addForm, reorder_level: e.target.value })}
                                    />
                                </div>

                                <div className="rm-form-field">
                                    <label>Minimum Buffer Stock</label>
                                    <input
                                        type="number"
                                        step="1"
                                        placeholder="Safety stock"
                                        value={addForm.minimum_stock}
                                        onChange={(e) => setAddForm({ ...addForm, minimum_stock: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Optional Initial Stock */}
                            <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "6px", border: "1px dashed #cbd5e1" }}>
                                <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "#334155", marginBottom: "8px" }}>
                                    📦 Initial Opening Stock (Optional)
                                </div>
                                <div className="rm-form-grid-3">
                                    <div className="rm-form-field">
                                        <label>Opening Quantity</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="e.g. 1000"
                                            value={addForm.initial_stock_qty}
                                            onChange={(e) => setAddForm({ ...addForm, initial_stock_qty: e.target.value })}
                                        />
                                    </div>
                                    <div className="rm-form-field">
                                        <label>Batch / Lot Number</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. LOT-2026-001"
                                            value={addForm.batch_number}
                                            onChange={(e) => setAddForm({ ...addForm, batch_number: e.target.value })}
                                        />
                                    </div>
                                    <div className="rm-form-field">
                                        <label>Storage Rack / Bay</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Rack A-12, Bin 3"
                                            value={addForm.location_rack}
                                            onChange={(e) => setAddForm({ ...addForm, location_rack: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="rm-modal-submit-row">
                                <button
                                    type="button"
                                    className="rm-tab-btn"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addSubmitting}
                                    className="rm-btn-save-batch"
                                >
                                    <Plus size={16} /> Save Item to Inventory
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================================= 
               MODAL: QUICK STOCK ADJUSTMENT (+ADD / -DEDUCT)
            ================================================= */}
            {showAdjustModal && adjustTargetMaterial && (
                <div className="rm-modal-backdrop" onClick={() => setShowAdjustModal(false)}>
                    <div className="rm-modal-card" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
                        <div className="rm-modal-header">
                            <div>
                                <span className="rm-eyebrow">STOCK ADJUSTMENT</span>
                                <h2>{adjustTargetMaterial.material_name}</h2>
                                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                                    Current Stock: <strong>{Number(adjustTargetMaterial.current_stock_qty).toLocaleString()} {adjustTargetMaterial.unit_symbol || "KG"}</strong>
                                </p>
                            </div>
                            <button
                                type="button"
                                className="rm-modal-close"
                                onClick={() => setShowAdjustModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAdjustStock} className="rm-modal-form">
                            {/* Toggle Add vs Deduct */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f1f5f9", padding: "4px", borderRadius: "6px" }}>
                                <button
                                    type="button"
                                    style={{
                                        padding: "8px",
                                        borderRadius: "5px",
                                        fontWeight: "700",
                                        fontSize: "0.82rem",
                                        border: "none",
                                        cursor: "pointer",
                                        background: adjustForm.type === "ADD" ? "#10b981" : "transparent",
                                        color: adjustForm.type === "ADD" ? "#ffffff" : "#64748b"
                                    }}
                                    onClick={() => setAdjustForm({ ...adjustForm, type: "ADD", reason: "PURCHASE" })}
                                >
                                    + Add Stock (Inward)
                                </button>
                                <button
                                    type="button"
                                    style={{
                                        padding: "8px",
                                        borderRadius: "5px",
                                        fontWeight: "700",
                                        fontSize: "0.82rem",
                                        border: "none",
                                        cursor: "pointer",
                                        background: adjustForm.type === "DEDUCT" ? "#ef4444" : "transparent",
                                        color: adjustForm.type === "DEDUCT" ? "#ffffff" : "#64748b"
                                    }}
                                    onClick={() => setAdjustForm({ ...adjustForm, type: "DEDUCT", reason: "PRODUCTION_ISSUE" })}
                                >
                                    - Deduct Stock (Used/Spill)
                                </button>
                            </div>

                            <div className="rm-form-grid-2">
                                <div className="rm-form-field">
                                    <label>Quantity to {adjustForm.type === "ADD" ? "Add" : "Deduct"} ({adjustTargetMaterial.unit_symbol || "KG"}) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="e.g. 220"
                                        value={adjustForm.quantity}
                                        onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                                    />
                                </div>
                                <div className="rm-form-field">
                                    <label>Reels / Nos Count (e.g. 20 Nos)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="e.g. 20"
                                        value={adjustForm.reel_count || ""}
                                        onChange={(e) => setAdjustForm({ ...adjustForm, reel_count: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="rm-form-field">
                                <label>Reason / Transaction Type</label>
                                <select
                                    value={adjustForm.reason}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                                >
                                    {adjustForm.type === "ADD" ? (
                                        <>
                                            <option value="PURCHASE">Supplier Inward / Purchase</option>
                                            <option value="PHYSICAL_AUDIT">Physical Audit Found Stock</option>
                                            <option value="RETURN">Customer / Production Floor Return</option>
                                            <option value="SAMPLE_INWARD">Free Sample Inward</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="PRODUCTION_ISSUE">Issued to Production Floor</option>
                                            <option value="DAMAGE_OR_SPILL">Spillage / Bag Damage</option>
                                            <option value="PHYSICAL_AUDIT_SHORTAGE">Physical Stock Audit Shortage</option>
                                            <option value="EXPIRED">Quality Rejected / Expired</option>
                                            <option value="RETURN_TO_VENDOR">Return to Vendor</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="rm-form-field">
                                <label>Batch / Lot Number (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Auto-generated if empty"
                                    value={adjustForm.batch_number}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, batch_number: e.target.value })}
                                />
                            </div>

                            <div className="rm-form-field">
                                <label>Remarks / Notes</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Challan #982 or Physical stock check"
                                    value={adjustForm.remarks}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
                                />
                            </div>

                            <div className="rm-modal-submit-row">
                                <button
                                    type="button"
                                    className="rm-tab-btn"
                                    onClick={() => setShowAdjustModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adjustSubmitting}
                                    className="rm-btn-save-batch"
                                    style={{
                                        background: adjustForm.type === "ADD" ? "#10b981" : "#ef4444"
                                    }}
                                >
                                    {adjustForm.type === "ADD" ? "Confirm Add Stock" : "Confirm Deduct Stock"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================================= 
               MODAL: EDIT MATERIAL DETAILS
            ================================================= */}
            {showEditModal && editMaterial && (
                <div className="rm-modal-backdrop" onClick={() => setShowEditModal(false)}>
                    <div className="rm-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="rm-modal-header">
                            <div>
                                <span className="rm-eyebrow">EDIT INVENTORY ITEM</span>
                                <h2>Edit {editMaterial.material_name}</h2>
                            </div>
                            <button
                                type="button"
                                className="rm-modal-close"
                                onClick={() => setShowEditModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateMaterial} className="rm-modal-form">
                            <div className="rm-form-field">
                                <label>Material / Item Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.material_name}
                                    onChange={(e) => setEditForm({ ...editForm, material_name: e.target.value })}
                                />
                            </div>

                            <div className="rm-form-grid-3">
                                <div className="rm-form-field">
                                    <label>Category</label>
                                    <select
                                        value={editForm.category_id}
                                        onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                                    >
                                        <option value="">Select Category</option>
                                        {dbCategories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="rm-form-field">
                                    <label>Unit of Measure</label>
                                    <select
                                        value={editForm.unit_id}
                                        onChange={(e) => setEditForm({ ...editForm, unit_id: e.target.value })}
                                    >
                                        {dbUnits.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="rm-form-field">
                                    <label>Grade / Specification</label>
                                    <input
                                        type="text"
                                        value={editForm.grade || ""}
                                        onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="rm-form-grid-3">
                                <div className="rm-form-field">
                                    <label>Purchase Rate (₹ / unit)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editForm.standard_purchase_rate}
                                        onChange={(e) => setEditForm({ ...editForm, standard_purchase_rate: e.target.value })}
                                    />
                                </div>

                                <div className="rm-form-field">
                                    <label>Reorder Alert Level</label>
                                    <input
                                        type="number"
                                        step="1"
                                        value={editForm.reorder_level}
                                        onChange={(e) => setEditForm({ ...editForm, reorder_level: e.target.value })}
                                    />
                                </div>

                                <div className="rm-form-field">
                                    <label>Minimum Buffer Stock</label>
                                    <input
                                        type="number"
                                        step="1"
                                        value={editForm.minimum_stock}
                                        onChange={(e) => setEditForm({ ...editForm, minimum_stock: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="rm-modal-submit-row">
                                <button
                                    type="button"
                                    className="rm-tab-btn"
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSubmitting}
                                    className="rm-btn-save-batch"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
