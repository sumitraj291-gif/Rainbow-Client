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
    Package
} from "lucide-react";
import "./RawMaterials.css";

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
            const [matRes, statsRes, formRes, mixRes] = await Promise.all([
                fetch(`${API_BASE}/raw-materials`),
                fetch(`${API_BASE}/raw-materials/stats`),
                fetch(`${API_BASE}/raw-materials/formulations`),
                fetch(`${API_BASE}/raw-materials/mixing-batches`)
            ]);

            const [mJson, sJson, fJson, bJson] = await Promise.all([
                matRes.json(),
                statsRes.json(),
                formRes.json(),
                mixRes.json()
            ]);

            if (mJson.success) setMaterials(mJson.data || []);
            if (sJson.success) setStats(sJson.data || {});
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
                    <h1>Raw Materials</h1>
                    <p>Chemical inventory, plastisol formulations & paste mixing station.</p>
                </div>
                <div className="rm-header-actions">
                    <button
                        type="button"
                        className="rm-refresh-btn"
                        onClick={loadData}
                        title="Reload Data"
                    >
                        <RefreshCw size={17} className={loading ? "rm-spin" : ""} />
                    </button>
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
                        className="rm-tab-btn primary"
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
                        <Plus size={15} /> Log Mixing Batch
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
                    <Database size={15} /> Chemical Stock
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
                                placeholder="Search by Chemical Code, Name, Grade..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="rm-filter-selects">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="">All Chemical Categories</option>
                                {categories.map(c => (
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
                                    <th>Rate (₹ / kg)</th>
                                    <th>Total Valuation</th>
                                    <th>Stock Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && materials.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="rm-td-center">
                                            <RefreshCw className="rm-spin" size={18} /> Loading chemical catalog...
                                        </td>
                                    </tr>
                                ) : filteredMaterials.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="rm-td-center">
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
        </div>
    );
}
