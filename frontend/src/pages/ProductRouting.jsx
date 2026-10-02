import React, { useEffect, useState, useMemo, useCallback } from "react";
import api from "../services/api";
import {
    ArrowRight,
    Clock,
    Plus,
    RefreshCw,
    Copy,
    Edit2,
    Trash2,
    ChevronUp,
    ChevronDown,
    Layers,
    AlertCircle,
    CheckCircle2,
    X,
    ShieldCheck,
    Gauge,
    Workflow,
    SlidersHorizontal,
    Box
} from "lucide-react";
import "./ProductRouting.css";

export default function ProductRouting() {
    const [products, setProducts] = useState([]);
    const [processes, setProcesses] = useState([]);
    const [machines, setMachines] = useState([]);

    const [selectedProductId, setSelectedProductId] = useState("");
    const [routing, setRouting] = useState([]);

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

    // Form state
    const [currentStep, setCurrentStep] = useState(null);
    const [formData, setFormData] = useState({
        process_id: "",
        machine_id: "",
        sequence_no: 1,
        standard_output_per_hour: "",
        setup_minutes: 0,
        mandatory: true,
        remarks: ""
    });

    // Clone state
    const [targetProductId, setTargetProductId] = useState("");

    // Load initial dropdown options
    useEffect(() => {
        loadOptions();
    }, []);

    // Auto-dismiss alerts after 5 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(null), 7000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    const loadOptions = async () => {
        try {
            const res = await api.get("/product-routing/options");
            if (res.data?.success && res.data.data) {
                const prods = res.data.data.products || [];
                setProducts(prods);
                setProcesses(res.data.data.processes || []);
                setMachines(res.data.data.machines || []);

                // Select first product by default if none selected
                if (!selectedProductId && prods.length > 0) {
                    const firstId = prods[0].id;
                    setSelectedProductId(String(firstId));
                    loadRouting(firstId);
                }
            }
        } catch (err) {
            console.error("Failed to load options", err);
            setErrorMessage("Failed to load routing configuration data.");
        }
    };

    const loadRouting = useCallback(async (productId, showSpinner = true) => {
        if (!productId) {
            setRouting([]);
            return;
        }
        if (showSpinner) setLoading(true);
        try {
            const res = await api.get(`/product-routing/${productId}`);
            if (res.data?.success) {
                setRouting(res.data.data || []);
            }
        } catch (err) {
            console.error("Failed to load routing", err);
            setErrorMessage("Could not load manufacturing sequence for this product.");
        } finally {
            if (showSpinner) setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const handleProductChange = (e) => {
        const id = e.target.value;
        setSelectedProductId(id);
        if (id) {
            loadRouting(id);
        } else {
            setRouting([]);
        }
    };

    const handleRefresh = () => {
        if (!selectedProductId) return;
        setRefreshing(true);
        loadRouting(selectedProductId, false);
    };

    // Selected product details
    const selectedProduct = useMemo(() => {
        return products.find(p => String(p.id) === String(selectedProductId)) || null;
    }, [products, selectedProductId]);

    // KPI Calculations
    const kpis = useMemo(() => {
        const totalStages = routing.length;
        const totalSetup = routing.reduce((sum, item) => sum + (Number(item.setup_minutes) || 0), 0);

        let bottleneck = null;
        let minRate = Infinity;
        routing.forEach(item => {
            const rate = Number(item.standard_output_per_hour);
            if (rate > 0 && rate < minRate) {
                minRate = rate;
                bottleneck = {
                    rate: minRate,
                    process: item.process_name,
                    machine: item.machine_name || item.machine_code || "Dedicated Line"
                };
            }
        });

        const mandatoryStages = routing.filter(r => r.mandatory).length;

        return {
            totalStages,
            totalSetup,
            bottleneck,
            mandatoryStages
        };
    }, [routing]);

    // Move sequence up / down
    const handleMove = async (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= routing.length) return;

        const updated = [...routing];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;

        // Optimistically update sequence numbers
        const reordered = updated.map((item, idx) => ({
            ...item,
            sequence_no: idx + 1
        }));
        setRouting(reordered);

        try {
            const orderedIds = reordered.map(r => r.id);
            await api.put(`/product-routing/${selectedProductId}/reorder`, { orderedIds });
            setSuccessMessage("Sequence reordered successfully.");
        } catch (err) {
            console.error("Reorder failed", err);
            setErrorMessage("Failed to reorder sequence. Reverting.");
            loadRouting(selectedProductId, false);
        }
    };

    // Open Add Modal
    const handleOpenAdd = () => {
        const nextSeq = routing.length > 0 ? Math.max(...routing.map(r => Number(r.sequence_no) || 0)) + 1 : 1;
        setFormData({
            process_id: "",
            machine_id: "",
            sequence_no: nextSeq,
            standard_output_per_hour: "",
            setup_minutes: 15,
            mandatory: true,
            remarks: ""
        });
        setIsAddModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (step) => {
        setCurrentStep(step);
        setFormData({
            process_id: step.process_id,
            machine_id: step.machine_id || "",
            sequence_no: step.sequence_no,
            standard_output_per_hour: step.standard_output_per_hour || "",
            setup_minutes: step.setup_minutes || 0,
            mandatory: Boolean(step.mandatory),
            remarks: step.remarks || ""
        });
        setIsEditModalOpen(true);
    };

    // Handle process selection to auto-suggest output & setup
    const handleProcessSelect = (processId) => {
        const proc = processes.find(p => String(p.id) === String(processId));
        setFormData(prev => ({
            ...prev,
            process_id: processId,
            standard_output_per_hour: proc?.standard_output_per_hour || prev.standard_output_per_hour,
            setup_minutes: proc?.standard_setup_minutes !== undefined ? proc.standard_setup_minutes : prev.setup_minutes
        }));
    };

    // Submit Add
    const handleSubmitAdd = async (e) => {
        e.preventDefault();
        if (!selectedProductId) {
            setErrorMessage("Please select a product first.");
            return;
        }
        if (!formData.process_id) {
            setErrorMessage("Process selection is required.");
            return;
        }

        setActionLoading(true);
        try {
            await api.post("/product-routing", {
                product_id: selectedProductId,
                process_id: formData.process_id,
                sequence_no: formData.sequence_no,
                machine_id: formData.machine_id || null,
                standard_output_per_hour: formData.standard_output_per_hour || null,
                setup_minutes: formData.setup_minutes || 0,
                mandatory: formData.mandatory,
                remarks: formData.remarks || null
            });

            setIsAddModalOpen(false);
            setSuccessMessage("New manufacturing process step added to routing.");
            await loadRouting(selectedProductId, false);
        } catch (err) {
            console.error("Failed to add routing", err);
            setErrorMessage(err.response?.data?.message || "Failed to add process step.");
        } finally {
            setActionLoading(false);
        }
    };

    // Submit Edit
    const handleSubmitEdit = async (e) => {
        e.preventDefault();
        if (!currentStep) return;

        setActionLoading(true);
        try {
            await api.put(`/product-routing/${currentStep.id}`, {
                process_id: formData.process_id,
                sequence_no: formData.sequence_no,
                machine_id: formData.machine_id || null,
                standard_output_per_hour: formData.standard_output_per_hour || null,
                setup_minutes: formData.setup_minutes || 0,
                mandatory: formData.mandatory,
                remarks: formData.remarks || null
            });

            setIsEditModalOpen(false);
            setCurrentStep(null);
            setSuccessMessage("Manufacturing process step updated successfully.");
            await loadRouting(selectedProductId, false);
        } catch (err) {
            console.error("Failed to update routing", err);
            setErrorMessage(err.response?.data?.message || "Failed to update process step.");
        } finally {
            setActionLoading(false);
        }
    };

    // Delete Step
    const handleDeleteStep = async (step) => {
        if (!window.confirm(`Remove "${step.process_name}" (Step ${step.sequence_no}) from this routing?`)) {
            return;
        }

        try {
            await api.delete(`/product-routing/${step.id}`);
            setSuccessMessage(`Removed Step ${step.sequence_no} (${step.process_name})`);
            await loadRouting(selectedProductId, false);
        } catch (err) {
            console.error("Failed to delete routing step", err);
            setErrorMessage("Failed to remove process step.");
        }
    };

    // Clone Routing
    const handleCloneRouting = async (e) => {
        e.preventDefault();
        if (!selectedProductId || !targetProductId) {
            setErrorMessage("Select both source and target products to clone.");
            return;
        }

        if (String(selectedProductId) === String(targetProductId)) {
            setErrorMessage("Target product cannot be the same as the source product.");
            return;
        }

        setActionLoading(true);
        try {
            const res = await api.post("/product-routing/clone", {
                sourceProductId: selectedProductId,
                targetProductId: targetProductId
            });

            setIsCloneModalOpen(false);
            setSuccessMessage(res.data?.message || "Routing copied successfully.");
            // Switch to target product to view the newly cloned sequence
            setSelectedProductId(String(targetProductId));
            await loadRouting(targetProductId, true);
        } catch (err) {
            console.error("Failed to clone routing", err);
            setErrorMessage(err.response?.data?.message || "Failed to clone routing.");
        } finally {
            setActionLoading(false);
        }
    };

    // Format output rate without trailing zeros
    const formatOutputRate = (val) => {
        if (!val || Number(val) === 0) return "-";
        const num = Number(val);
        return num % 1 === 0 ? num.toLocaleString() : num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    return (
        <div className="page-container product-routing-page">
            {/* Header Card */}
            <div className="routing-header-card">
                <div className="routing-header-info">
                    <div className="routing-eyebrow">
                        <Workflow size={14} /> RAINBOW ERP / PRODUCT WORKFLOW
                    </div>
                    <h1>Process Routing & Sequence</h1>
                    <p>
                        Configure standardized manufacturing stages, assigned production machines, hourly output targets, and changeover setup times.
                    </p>
                </div>

                <div className="routing-header-actions">
                    <button
                        type="button"
                        className="routing-refresh-btn"
                        onClick={handleRefresh}
                        title="Refresh routing data"
                        disabled={refreshing || !selectedProductId}
                    >
                        <RefreshCw size={14} className={refreshing ? "routing-spin" : ""} />
                    </button>

                    <button
                        type="button"
                        className="routing-btn-secondary"
                        onClick={() => {
                            setTargetProductId("");
                            setIsCloneModalOpen(true);
                        }}
                        disabled={!selectedProductId || routing.length === 0}
                        title="Copy this routing to another product"
                    >
                        <Copy size={13} /> Clone Routing
                    </button>

                    <button
                        type="button"
                        className="routing-btn-primary"
                        onClick={handleOpenAdd}
                        disabled={!selectedProductId}
                    >
                        <Plus size={14} /> Add Stage
                    </button>
                </div>
            </div>

            {/* Alert Notifications */}
            {errorMessage && (
                <div className="routing-alert error">
                    <AlertCircle size={18} />
                    <span>{errorMessage}</span>
                    <button type="button" onClick={() => setErrorMessage(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {successMessage && (
                <div className="routing-alert success">
                    <CheckCircle2 size={18} />
                    <span>{successMessage}</span>
                    <button type="button" onClick={() => setSuccessMessage(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Product Selector Bar */}
            <div className="routing-select-card">
                <div className="routing-product-picker">
                    <label htmlFor="product-select">Select Finished Product</label>
                    <select
                        id="product-select"
                        className="routing-product-select"
                        value={selectedProductId}
                        onChange={handleProductChange}
                    >
                        <option value="">-- Choose Carpet Product --</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.product_code ? `[${p.product_code}] ` : ""}{p.product_name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedProduct && (
                    <div className="routing-product-quickmeta">
                        <div className="routing-meta-item">
                            <span className="routing-meta-lbl">Carpet Type</span>
                            <span className="routing-meta-val">{selectedProduct.carpet_type || "PVC Anti-Slip"}</span>
                        </div>
                        <div className="routing-meta-item">
                            <span className="routing-meta-lbl">Thickness / Weight</span>
                            <span className="routing-meta-val">
                                {selectedProduct.thickness_mm ? `${selectedProduct.thickness_mm} mm` : "-"} / {selectedProduct.gsm ? `${selectedProduct.gsm} GSM` : "-"}
                            </span>
                        </div>
                        <div className="routing-meta-item">
                            <span className="routing-meta-lbl">Colour</span>
                            <span className="routing-meta-val">{selectedProduct.colour || "Standard"}</span>
                        </div>
                        <div className="routing-meta-item">
                            <span className="routing-meta-lbl">Item Code</span>
                            <span className="routing-meta-val" style={{ color: "#7c3aed" }}>
                                {selectedProduct.product_code || `PRD-${selectedProduct.id}`}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {selectedProductId && (
                <>
                    {/* KPI Stat Cards */}
                    <div className="routing-stats-grid">
                        <div className="routing-stat-card">
                            <div className="routing-stat-icon-wrap indigo">
                                <Layers size={22} />
                            </div>
                            <div className="routing-stat-content">
                                <span className="routing-stat-label">Total Stages</span>
                                <div className="routing-stat-val">{kpis.totalStages} Steps</div>
                                <span className="routing-stat-sub">
                                    {kpis.mandatoryStages} mandatory production stages
                                </span>
                            </div>
                        </div>

                        <div className="routing-stat-card">
                            <div className="routing-stat-icon-wrap amber">
                                <Clock size={22} />
                            </div>
                            <div className="routing-stat-content">
                                <span className="routing-stat-label">Line Setup Time</span>
                                <div className="routing-stat-val">{kpis.totalSetup} min</div>
                                <span className="routing-stat-sub">Total changeover & calibration</span>
                            </div>
                        </div>

                        <div className="routing-stat-card">
                            <div className="routing-stat-icon-wrap blue">
                                <Gauge size={22} />
                            </div>
                            <div className="routing-stat-content">
                                <span className="routing-stat-label">Bottleneck Pace</span>
                                <div className="routing-stat-val">
                                    {kpis.bottleneck ? `${formatOutputRate(kpis.bottleneck.rate)} /hr` : "No limit"}
                                </div>
                                <span className="routing-stat-sub" title={kpis.bottleneck?.process}>
                                    {kpis.bottleneck ? kpis.bottleneck.process : "Standard line flow"}
                                </span>
                            </div>
                        </div>

                        <div className="routing-stat-card">
                            <div className="routing-stat-icon-wrap emerald">
                                <ShieldCheck size={22} />
                            </div>
                            <div className="routing-stat-content">
                                <span className="routing-stat-label">Standard SOP</span>
                                <div className="routing-stat-val" style={{ color: "#059669" }}>
                                    100% Quality
                                </div>
                                <span className="routing-stat-sub">Full traceability & roll tracking</span>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Visual Pipeline Ribbon */}
                    {routing.length > 0 && (
                        <div className="routing-pipeline-card">
                            <div className="routing-pipeline-title">
                                <h3>
                                    <Workflow size={17} color="#7c3aed" /> Production Execution Flow
                                </h3>
                                <span style={{ fontSize: "0.76rem", color: "#64748b" }}>
                                    Sequential transformation from raw plastisol to palletized rolls
                                </span>
                            </div>

                            <div className="routing-pipeline-flow">
                                {routing.map((step, idx) => (
                                    <React.Fragment key={step.id}>
                                        <div className="routing-stage-step" title={`Step ${step.sequence_no}: ${step.process_name}`}>
                                            <div className="routing-stage-num">
                                                STAGE {String(step.sequence_no).padStart(2, "0")}
                                            </div>
                                            <div className="routing-stage-name">{step.process_name}</div>
                                            <div className="routing-stage-machine">
                                                {step.machine_code ? `[${step.machine_code}] ` : ""}{step.machine_name || "Unassigned"}
                                            </div>
                                        </div>
                                        {idx < routing.length - 1 && (
                                            <ArrowRight size={18} className="routing-flow-arrow" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sequence Table */}
                    <div className="routing-table-card">
                        <div className="routing-table-header-strip">
                            <div>
                                <h3>Manufacturing Process Sequence</h3>
                                <p>Standard operation procedure sequence, assigned work stations, and production speed</p>
                            </div>
                            <button
                                type="button"
                                className="routing-btn-primary"
                                onClick={handleOpenAdd}
                                style={{ padding: "7px 13px", fontSize: "0.78rem" }}
                            >
                                <Plus size={14} /> Add Stage
                            </button>
                        </div>

                        <div className="routing-table-responsive">
                            <table className="routing-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: "95px" }}>Sequence</th>
                                        <th>Process Stage</th>
                                        <th>Work Center / Machine</th>
                                        <th style={{ textAlign: "right" }}>Output / Hour</th>
                                        <th style={{ textAlign: "center" }}>Setup Time</th>
                                        <th style={{ textAlign: "center" }}>Compliance</th>
                                        <th style={{ textAlign: "right", width: "110px" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="routing-empty-state">
                                                <RefreshCw size={24} className="routing-spin" style={{ margin: "0 auto 8px" }} />
                                                <strong>Loading Routing Sequence...</strong>
                                                <span>Fetching line speed and machine configurations</span>
                                            </td>
                                        </tr>
                                    ) : routing.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="routing-empty-state">
                                                <Box size={32} color="#cbd5e1" style={{ margin: "0 auto 8px" }} />
                                                <strong>No Process Stages Configured Yet</strong>
                                                <span>Click "+ Add Process Stage" or "Clone Routing" from another product to build workflow.</span>
                                            </td>
                                        </tr>
                                    ) : (
                                        routing.map((item, index) => (
                                            <tr key={item.id}>
                                                {/* Sequence Reorder Controls */}
                                                <td>
                                                    <div className="routing-seq-wrap">
                                                        <div className="routing-seq-pill">
                                                            {String(item.sequence_no).padStart(2, "0")}
                                                        </div>
                                                        <div className="routing-reorder-btns">
                                                            <button
                                                                type="button"
                                                                className="routing-btn-arrow"
                                                                onClick={() => handleMove(index, -1)}
                                                                disabled={index === 0}
                                                                title="Move Up in Sequence"
                                                            >
                                                                <ChevronUp size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="routing-btn-arrow"
                                                                onClick={() => handleMove(index, 1)}
                                                                disabled={index === routing.length - 1}
                                                                title="Move Down in Sequence"
                                                            >
                                                                <ChevronDown size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Process Name & Department */}
                                                <td>
                                                    <div className="routing-process-title">{item.process_name}</div>
                                                    {item.department && (
                                                        <span className="routing-dept-badge">{item.department}</span>
                                                    )}
                                                </td>

                                                {/* Assigned Machine */}
                                                <td>
                                                    {item.machine_name ? (
                                                        <>
                                                            <span className="routing-machine-code">
                                                                {item.machine_code || "WORK-CTR"}
                                                            </span>
                                                            <div className="routing-machine-name">{item.machine_name}</div>
                                                        </>
                                                    ) : (
                                                        <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "0.78rem" }}>
                                                            Manual / Any Station
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Output / Hr */}
                                                <td style={{ textAlign: "right" }}>
                                                    {item.standard_output_per_hour ? (
                                                        <span className="routing-rate-val">
                                                            {formatOutputRate(item.standard_output_per_hour)}{" "}
                                                            <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 400 }}>
                                                                rolls/hr
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: "#94a3b8" }}>-</span>
                                                    )}
                                                </td>

                                                {/* Setup Time */}
                                                <td style={{ textAlign: "center" }}>
                                                    <span className="routing-setup-badge">
                                                        <Clock size={12} color="#64748b" /> {item.setup_minutes || 0} min
                                                    </span>
                                                </td>

                                                {/* Mandatory Compliance Badge */}
                                                <td style={{ textAlign: "center" }}>
                                                    {item.mandatory ? (
                                                        <span style={{
                                                            padding: "3px 8px",
                                                            borderRadius: "4px",
                                                            background: "#ecfdf5",
                                                            color: "#047857",
                                                            fontWeight: 600,
                                                            fontSize: "0.72rem"
                                                        }}>
                                                            Mandatory
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            padding: "3px 8px",
                                                            borderRadius: "4px",
                                                            background: "#f8fafc",
                                                            color: "#64748b",
                                                            fontWeight: 500,
                                                            fontSize: "0.72rem"
                                                        }}>
                                                            Optional
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Action Buttons */}
                                                <td>
                                                    <div className="routing-action-group">
                                                        <button
                                                            type="button"
                                                            className="routing-btn-icon"
                                                            onClick={() => handleOpenEdit(item)}
                                                            title="Edit Stage Parameters"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="routing-btn-icon delete"
                                                            onClick={() => handleDeleteStep(item)}
                                                            title="Remove Stage"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {routing.length > 0 && (
                            <div className="routing-table-footer">
                                <span>Showing {routing.length} sequential manufacturing stages</span>
                                <span>Use ▲ and ▼ arrows to adjust the production schedule order</span>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ADD STAGE MODAL */}
            {isAddModalOpen && (
                <div className="routing-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
                    <div className="routing-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="routing-modal-header">
                            <div>
                                <span className="routing-eyebrow">NEW PROCESS STAGE</span>
                                <h2>Add Step to Production Workflow</h2>
                            </div>
                            <button
                                type="button"
                                className="routing-modal-close"
                                onClick={() => setIsAddModalOpen(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitAdd}>
                            <div className="routing-modal-form">
                                <div className="routing-form-row">
                                    <div className="routing-form-field">
                                        <label>Process Operation *</label>
                                        <select
                                            value={formData.process_id}
                                            onChange={(e) => handleProcessSelect(e.target.value)}
                                            required
                                        >
                                            <option value="">-- Choose Process --</option>
                                            {processes.map((proc) => (
                                                <option key={proc.id} value={proc.id}>
                                                    {proc.process_name} ({proc.department || "General"})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="routing-form-field">
                                        <label>Assigned Work Station / Machine</label>
                                        <select
                                            value={formData.machine_id}
                                            onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                                        >
                                            <option value="">-- Manual / Any Machine --</option>
                                            {machines.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    [{m.machine_code}] {m.machine_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="routing-form-row">
                                    <div className="routing-form-field">
                                        <label>Sequence Number *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.sequence_no}
                                            onChange={(e) => setFormData({ ...formData, sequence_no: Number(e.target.value) })}
                                            required
                                        />
                                    </div>

                                    <div className="routing-form-field">
                                        <label>Standard Output (Rolls or Units / Hr)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="e.g. 500"
                                            value={formData.standard_output_per_hour}
                                            onChange={(e) => setFormData({ ...formData, standard_output_per_hour: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="routing-form-row">
                                    <div className="routing-form-field">
                                        <label>Setup / Changeover Time (Minutes)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.setup_minutes}
                                            onChange={(e) => setFormData({ ...formData, setup_minutes: Number(e.target.value) })}
                                        />
                                    </div>

                                    <div className="routing-form-field" style={{ justifyContent: "center" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "18px" }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.mandatory}
                                                onChange={(e) => setFormData({ ...formData, mandatory: e.target.checked })}
                                                style={{ width: "16px", height: "16px", accentColor: "#7c3aed" }}
                                            />
                                            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>
                                                Mandatory Production Step
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div className="routing-form-field">
                                    <label>Quality & Operational Remarks (Optional)</label>
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Verify loop formation consistency and thickness tolerances."
                                        value={formData.remarks}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="routing-modal-actions">
                                <button
                                    type="button"
                                    className="routing-btn-cancel"
                                    onClick={() => setIsAddModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="routing-btn-primary"
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? "Adding..." : "Add Stage to Sequence"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT STAGE MODAL */}
            {isEditModalOpen && currentStep && (
                <div className="routing-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
                    <div className="routing-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="routing-modal-header">
                            <div>
                                <span className="routing-eyebrow">EDIT STAGE #{currentStep.sequence_no}</span>
                                <h2>Modify Process Configuration</h2>
                            </div>
                            <button
                                type="button"
                                className="routing-modal-close"
                                onClick={() => setIsEditModalOpen(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitEdit}>
                            <div className="routing-modal-form">
                                <div className="routing-form-row">
                                    <div className="routing-form-field">
                                        <label>Process Operation *</label>
                                        <select
                                            value={formData.process_id}
                                            onChange={(e) => setFormData({ ...formData, process_id: e.target.value })}
                                            required
                                        >
                                            {processes.map((proc) => (
                                                <option key={proc.id} value={proc.id}>
                                                    {proc.process_name} ({proc.department || "General"})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="routing-form-field">
                                        <label>Assigned Work Station / Machine</label>
                                        <select
                                            value={formData.machine_id}
                                            onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                                        >
                                            <option value="">-- Manual / Any Machine --</option>
                                            {machines.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    [{m.machine_code}] {m.machine_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="routing-form-row">
                                    <div className="routing-form-field">
                                        <label>Sequence Number *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.sequence_no}
                                            onChange={(e) => setFormData({ ...formData, sequence_no: Number(e.target.value) })}
                                            required
                                        />
                                    </div>

                                    <div className="routing-form-field">
                                        <label>Standard Output (Rolls or Units / Hr)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.standard_output_per_hour}
                                            onChange={(e) => setFormData({ ...formData, standard_output_per_hour: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="routing-form-row">
                                    <div className="routing-form-field">
                                        <label>Setup / Changeover Time (Minutes)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.setup_minutes}
                                            onChange={(e) => setFormData({ ...formData, setup_minutes: Number(e.target.value) })}
                                        />
                                    </div>

                                    <div className="routing-form-field" style={{ justifyContent: "center" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "18px" }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.mandatory}
                                                onChange={(e) => setFormData({ ...formData, mandatory: e.target.checked })}
                                                style={{ width: "16px", height: "16px", accentColor: "#7c3aed" }}
                                            />
                                            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>
                                                Mandatory Production Step
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div className="routing-form-field">
                                    <label>Quality & Operational Remarks</label>
                                    <textarea
                                        rows={2}
                                        value={formData.remarks}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="routing-modal-actions">
                                <button
                                    type="button"
                                    className="routing-btn-cancel"
                                    onClick={() => setIsEditModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="routing-btn-primary"
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CLONE ROUTING MODAL */}
            {isCloneModalOpen && (
                <div className="routing-modal-backdrop" onClick={() => setIsCloneModalOpen(false)}>
                    <div className="routing-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="routing-modal-header">
                            <div>
                                <span className="routing-eyebrow">CLONE WORKFLOW</span>
                                <h2>Copy Routing to Another Product</h2>
                            </div>
                            <button
                                type="button"
                                className="routing-modal-close"
                                onClick={() => setIsCloneModalOpen(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCloneRouting}>
                            <div className="routing-modal-form">
                                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0 }}>
                                    This will duplicate all <strong>{routing.length} process stages</strong>, machine allocations, and hourly line speeds from the current product into the target product.
                                </p>

                                <div className="routing-form-field">
                                    <label>Source Product (Current)</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={selectedProduct ? `[${selectedProduct.product_code || "PRD"}] ${selectedProduct.product_name}` : ""}
                                        style={{ background: "#f8fafc", color: "#475569" }}
                                    />
                                </div>

                                <div className="routing-form-field">
                                    <label>Target Product *</label>
                                    <select
                                        value={targetProductId}
                                        onChange={(e) => setTargetProductId(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Choose Target Product to Receive Routing --</option>
                                        {products
                                            .filter((p) => String(p.id) !== String(selectedProductId))
                                            .map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.product_code ? `[${p.product_code}] ` : ""}{p.product_name}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div style={{
                                    padding: "10px 14px",
                                    borderRadius: "6px",
                                    background: "#fffbeb",
                                    border: "1px solid #fef3c7",
                                    color: "#92400e",
                                    fontSize: "0.76rem"
                                }}>
                                    <strong>Caution:</strong> If the target product already has existing routing steps, they will be overwritten by this copy.
                                </div>
                            </div>

                            <div className="routing-modal-actions">
                                <button
                                    type="button"
                                    className="routing-btn-cancel"
                                    onClick={() => setIsCloneModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="routing-btn-primary"
                                    disabled={actionLoading || !targetProductId}
                                >
                                    {actionLoading ? "Cloning..." : "Copy Routing"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}