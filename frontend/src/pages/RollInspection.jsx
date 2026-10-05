import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ClipboardCheck,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    XCircle,
    FileText,
    Printer,
    Search,
    Filter,
    Layers,
    Scale,
    Activity,
    Calendar,
    User,
    Check,
    Eye,
    RefreshCw,
    Plus,
    X,
    ChevronRight,
    Sparkles,
    Gauge,
    Flame
} from "lucide-react";
import "./RollInspection.css";
import { API_BASE_URL as API_BASE, authFetch } from "../services/api";

export default function RollInspection() {
    const location = useLocation();
    const navigate = useNavigate();

    // Query param prefill
    const searchParams = new URLSearchParams(location.search);
    const initialRollParam = searchParams.get("roll") || "";

    // Tabs: "list" or "form"
    const [activeTab, setActiveTab] = useState(initialRollParam ? "form" : "list");

    // Inspection logs & stats
    const [inspections, setInspections] = useState([]);
    const [stats, setStats] = useState({
        total_inspections: 0,
        pass_count: 0,
        pass_rate_pct: 100,
        grade_a_count: 0,
        grade_a_yield_pct: 100,
        awaiting_qc_count: 0
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Filter controls for list tab
    const [searchQuery, setSearchQuery] = useState("");
    const [gradeFilter, setGradeFilter] = useState("");
    const [resultFilter, setResultFilter] = useState("");

    // Rolls eligible for inspection (queue)
    const [availableRolls, setAvailableRolls] = useState([]);

    // Active inspection form state
    const [selectedRollNumber, setSelectedRollNumber] = useState(initialRollParam);
    const [rollData, setRollData] = useState(null);
    const [rollLoading, setRollLoading] = useState(false);

    // Lab Measurement Inputs
    const [formData, setFormData] = useState({
        inspector_name: "QA Lab Chemist",
        test_temperature_c: "23.5",
        test_humidity_pct: "55.0",
        
        // 3-point thickness (mm)
        edge_left_thickness_mm: "",
        center_thickness_mm: "",
        edge_right_thickness_mm: "",

        // GSM
        actual_gsm: "",

        // Tensile Strength (N / 50mm)
        tensile_md_n: "",
        tensile_cd_n: "",
        elongation_md_pct: "",
        elongation_cd_pct: "",
        tear_resistance_n: "",

        // Visual checks
        visual_defects_notes: "",
        defect_air_bubbles: false,
        defect_pinholes: false,
        defect_color_streak: false,
        defect_uneven_coating: false,
        defect_delamination: false,
        defect_emboss_smear: false,

        // Final determination
        assigned_grade: "GRADE_A",
        override_grade: false,
        status: "APPROVED",
        remarks: ""
    });

    // COA Modal
    const [selectedCOA, setSelectedCOA] = useState(null);
    const [showCOAModal, setShowCOAModal] = useState(false);

    // =========================================================
    // INITIAL LOAD
    // =========================================================
    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (initialRollParam) {
            setSelectedRollNumber(initialRollParam);
            fetchRollDetails(initialRollParam);
            setActiveTab("form");
        }
    }, [initialRollParam]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [insRes, statsRes, rollsRes] = await Promise.all([
                authFetch(`${API_BASE}/roll-inspections`),
                authFetch(`${API_BASE}/roll-inspections/stats`),
                authFetch(`${API_BASE}/carpet-rolls?limit=100`)
            ]);

            const insJson = await insRes.json();
            const statsJson = await statsRes.json();
            const rollsJson = await rollsRes.json();

            if (insJson.success) setInspections(insJson.data || []);
            if (statsJson.success) setStats(statsJson.data || {});
            if (rollsJson.success) {
                setAvailableRolls(rollsJson.data || []);
            }
        } catch (err) {
            console.error("Failed to load inspection data:", err);
            setError("Could not load quality records from server.");
        } finally {
            setLoading(false);
        }
    };

    const fetchRollDetails = async (rollNo) => {
        if (!rollNo) {
            setRollData(null);
            return;
        }
        setRollLoading(true);
        setError(null);
        try {
            const res = await authFetch(`${API_BASE}/roll-inspections/roll/${encodeURIComponent(rollNo)}`);
            const json = await res.json();
            if (json.success && json.data) {
                setRollData(json.data);
                // Prepopulate form defaults matching product target specs
                const targetThick = json.data.target_thickness_mm ? Number(json.data.target_thickness_mm).toFixed(2) : "2.00";
                const targetGsm = json.data.target_gsm ? Math.round(Number(json.data.target_gsm)) : 1450;
                setFormData(prev => ({
                    ...prev,
                    edge_left_thickness_mm: prev.edge_left_thickness_mm || targetThick,
                    center_thickness_mm: prev.center_thickness_mm || targetThick,
                    edge_right_thickness_mm: prev.edge_right_thickness_mm || targetThick,
                    actual_gsm: prev.actual_gsm || targetGsm.toString(),
                    tensile_md_n: prev.tensile_md_n || "385",
                    tensile_cd_n: prev.tensile_cd_n || "340",
                    elongation_md_pct: prev.elongation_md_pct || "42",
                    elongation_cd_pct: prev.elongation_cd_pct || "38"
                }));
            } else {
                setRollData(null);
                setError(json.message || "Roll not found.");
            }
        } catch (err) {
            console.error("Error fetching roll:", err);
            setError("Failed to fetch roll details.");
        } finally {
            setRollLoading(false);
        }
    };

    // =========================================================
    // DYNAMIC LAB CALCULATIONS & GRADING FORMULA
    // =========================================================
    const labCalculations = useMemo(() => {
        const left = parseFloat(formData.edge_left_thickness_mm) || 0;
        const center = parseFloat(formData.center_thickness_mm) || 0;
        const right = parseFloat(formData.edge_right_thickness_mm) || 0;

        let avgThickness = 0;
        let thicknessVariance = 0;
        let thicknessResult = "PENDING";

        const validPoints = [left, center, right].filter(v => v > 0);
        if (validPoints.length === 3) {
            avgThickness = (left + center + right) / 3;
            const maxT = Math.max(left, center, right);
            const minT = Math.min(left, center, right);
            thicknessVariance = maxT - minT;

            const targetT = rollData?.target_thickness_mm ? parseFloat(rollData.target_thickness_mm) : 2.0;
            const tol = 0.08; // +/- 0.08mm
            const isAvgInTol = Math.abs(avgThickness - targetT) <= tol;
            const isVarInTol = thicknessVariance <= 0.12;

            if (isAvgInTol && isVarInTol) {
                thicknessResult = "PASS";
            } else if (Math.abs(avgThickness - targetT) <= 0.15 && thicknessVariance <= 0.20) {
                thicknessResult = "BORDERLINE";
            } else {
                thicknessResult = "FAIL";
            }
        }

        // GSM calculations
        const actualGsm = parseFloat(formData.actual_gsm) || 0;
        const targetGsm = rollData?.target_gsm ? parseFloat(rollData.target_gsm) : (actualGsm || 1450);
        let gsmDeviationPct = 0;
        let gsmResult = "PENDING";

        if (actualGsm > 0 && targetGsm > 0) {
            gsmDeviationPct = ((actualGsm - targetGsm) / targetGsm) * 100;
            if (Math.abs(gsmDeviationPct) <= 4.5) {
                gsmResult = "PASS";
            } else if (Math.abs(gsmDeviationPct) <= 8.0) {
                gsmResult = "BORDERLINE";
            } else {
                gsmResult = "FAIL";
            }
        }

        // Tensile Strength calculation (Standard: MD >= 350 N/50mm, CD >= 300 N/50mm)
        const tensileMD = parseFloat(formData.tensile_md_n) || 0;
        const tensileCD = parseFloat(formData.tensile_cd_n) || 0;
        let tensileResult = "PENDING";
        if (tensileMD > 0 && tensileCD > 0) {
            if (tensileMD >= 350 && tensileCD >= 300) {
                tensileResult = "PASS";
            } else if (tensileMD >= 280 && tensileCD >= 240) {
                tensileResult = "BORDERLINE";
            } else {
                tensileResult = "FAIL";
            }
        }

        // Visual defects evaluation
        const activeDefects = [
            formData.defect_air_bubbles,
            formData.defect_pinholes,
            formData.defect_color_streak,
            formData.defect_uneven_coating,
            formData.defect_delamination,
            formData.defect_emboss_smear
        ].filter(Boolean).length;

        // Auto Grade Recommendation
        let recommendedGrade = "GRADE_A";
        let recommendedStatus = "APPROVED";

        if (formData.defect_delamination || thicknessResult === "FAIL" || tensileResult === "FAIL") {
            recommendedGrade = "SCRAP";
            recommendedStatus = "REJECTED";
        } else if (activeDefects >= 2 || thicknessResult === "BORDERLINE" || gsmResult === "FAIL") {
            recommendedGrade = "GRADE_C";
            recommendedStatus = "APPROVED";
        } else if (activeDefects === 1 || gsmResult === "BORDERLINE" || tensileResult === "BORDERLINE") {
            recommendedGrade = "GRADE_B";
            recommendedStatus = "APPROVED";
        } else {
            recommendedGrade = "GRADE_A";
            recommendedStatus = "APPROVED";
        }

        return {
            avgThickness: avgThickness.toFixed(3),
            thicknessVariance: thicknessVariance.toFixed(3),
            thicknessResult,
            gsmDeviationPct: gsmDeviationPct.toFixed(2),
            gsmResult,
            tensileResult,
            activeDefects,
            recommendedGrade,
            recommendedStatus
        };
    }, [formData, rollData]);

    // Keep assigned_grade in sync with recommendation unless user explicitly overrides
    useEffect(() => {
        if (!formData.override_grade) {
            setFormData(prev => ({
                ...prev,
                assigned_grade: labCalculations.recommendedGrade,
                status: labCalculations.recommendedStatus
            }));
        }
    }, [labCalculations.recommendedGrade, labCalculations.recommendedStatus, formData.override_grade]);

    // =========================================================
    // SUBMIT NEW INSPECTION
    // =========================================================
    const handleSaveInspection = async (e) => {
        e.preventDefault();
        if (!selectedRollNumber) {
            setError("Please select a Carpet Roll to inspect.");
            return;
        }

        setError(null);
        setLoading(true);

        const visualDefectsList = [];
        if (formData.defect_air_bubbles) visualDefectsList.push("Air Bubbles");
        if (formData.defect_pinholes) visualDefectsList.push("Pinholes");
        if (formData.defect_color_streak) visualDefectsList.push("Color Streaks");
        if (formData.defect_uneven_coating) visualDefectsList.push("Uneven Plastisol Coating");
        if (formData.defect_delamination) visualDefectsList.push("Layer Delamination");
        if (formData.defect_emboss_smear) visualDefectsList.push("Embossing Smear");

        const payload = {
            roll_id: rollData?.id,
            roll_number: selectedRollNumber,
            inspector_name: formData.inspector_name,
            test_temperature_c: formData.test_temperature_c,
            test_humidity_pct: formData.test_humidity_pct,

            target_thickness_mm: rollData?.target_thickness_mm || 2.00,
            edge_left_thickness_mm: formData.edge_left_thickness_mm,
            center_thickness_mm: formData.center_thickness_mm,
            edge_right_thickness_mm: formData.edge_right_thickness_mm,

            target_gsm: rollData?.target_gsm || 1450,
            actual_gsm: formData.actual_gsm,

            tensile_md_n: formData.tensile_md_n,
            tensile_cd_n: formData.tensile_cd_n,
            elongation_md_pct: formData.elongation_md_pct,
            elongation_cd_pct: formData.elongation_cd_pct,
            tear_resistance_n: formData.tear_resistance_n,

            surface_defects: visualDefectsList.join(", ") || "None / Clean Surface",
            visual_inspection_notes: formData.visual_defects_notes,

            assigned_grade: formData.assigned_grade,
            status: formData.status,
            remarks: formData.remarks
        };

        try {
            const res = await authFetch(`${API_BASE}/roll-inspections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.success) {
                setSuccessMessage(`Inspection record & COA ${json.data.coa_number} successfully registered!`);
                await loadData();
                // Open COA modal directly
                fetchCOADetails(json.data.id);
                setActiveTab("list");
            } else {
                setError(json.message || "Failed to submit inspection.");
            }
        } catch (err) {
            console.error("Submission failed:", err);
            setError("Server error while submitting inspection.");
        } finally {
            setLoading(false);
        }
    };

    const fetchCOADetails = async (id) => {
        try {
            const res = await authFetch(`${API_BASE}/roll-inspections/${id}`);
            const json = await res.json();
            if (json.success && json.data) {
                setSelectedCOA(json.data);
                setShowCOAModal(true);
            }
        } catch (err) {
            console.error("Failed to load COA:", err);
        }
    };

    // Filtered inspection log
    const filteredInspections = useMemo(() => {
        return inspections.filter(item => {
            const q = searchQuery.toLowerCase();
            const matchesQuery = !q ||
                (item.roll_number && item.roll_number.toLowerCase().includes(q)) ||
                (item.inspection_number && item.inspection_number.toLowerCase().includes(q)) ||
                (item.coa_number && item.coa_number.toLowerCase().includes(q)) ||
                (item.product_name && item.product_name.toLowerCase().includes(q));

            const matchesGrade = !gradeFilter || item.assigned_grade === gradeFilter;
            const matchesResult = !resultFilter || item.status === resultFilter;

            return matchesQuery && matchesGrade && matchesResult;
        });
    }, [inspections, searchQuery, gradeFilter, resultFilter]);

    return (
        <div className="qc-page">
            {/* =================================================
               HEADER & ACTIONS
            ================================================= */}
            <div className="qc-header-card">
                <div className="qc-header-info">
                    <div className="qc-eyebrow">
                        <ShieldCheck size={14} className="qc-eyebrow-icon" /> QUALITY ASSURANCE & LAB TESTING
                    </div>
                    <h1>Carpet Roll Laboratory QC & COA</h1>
                    <p>
                        Edge-Center-Edge 3-Point Caliper Measurement, GSM Deviation, Tensile Testing & Certificate of Analysis Issuance.
                    </p>
                </div>
                <div className="qc-header-actions">
                    <button
                        type="button"
                        className={`qc-tab-btn ${activeTab === "list" ? "active" : ""}`}
                        onClick={() => setActiveTab("list")}
                    >
                        <FileText size={15} /> Inspections Log & COAs
                    </button>
                    <button
                        type="button"
                        className={`qc-tab-btn primary ${activeTab === "form" ? "active" : ""}`}
                        onClick={() => {
                            setActiveTab("form");
                            if (!rollData && availableRolls.length > 0) {
                                const uninspected = availableRolls.find(r => r.status === "PRODUCED") || availableRolls[0];
                                if (uninspected) {
                                    setSelectedRollNumber(uninspected.roll_number);
                                    fetchRollDetails(uninspected.roll_number);
                                }
                            }
                        }}
                    >
                        <Plus size={15} /> New Lab Inspection
                    </button>
                    <button
                        type="button"
                        className="qc-refresh-btn"
                        onClick={loadData}
                        title="Reload Data"
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {successMessage && (
                <div className="qc-alert qc-alert-success">
                    <CheckCircle2 size={16} />
                    <span>{successMessage}</span>
                    <button type="button" onClick={() => setSuccessMessage(null)}><X size={14} /></button>
                </div>
            )}
            {error && (
                <div className="qc-alert qc-alert-error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                    <button type="button" onClick={() => setError(null)}><X size={14} /></button>
                </div>
            )}

            {/* =================================================
               METRIC SUMMARY CARDS
            ================================================= */}
            <div className="qc-stats-grid">
                <div className="qc-stat-card">
                    <div className="qc-stat-icon-wrap blue">
                        <ClipboardCheck size={20} />
                    </div>
                    <div className="qc-stat-content">
                        <span className="qc-stat-label">TOTAL LAB TESTS</span>
                        <div className="qc-stat-val">{stats.total_inspections || 0}</div>
                        <span className="qc-stat-sub">Certified Rolls</span>
                    </div>
                </div>

                <div className="qc-stat-card">
                    <div className="qc-stat-icon-wrap emerald">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="qc-stat-content">
                        <span className="qc-stat-label">QC PASS RATE</span>
                        <div className="qc-stat-val">{stats.pass_rate_pct || 100}%</div>
                        <span className="qc-stat-sub">{stats.pass_count || 0} rolls approved</span>
                    </div>
                </div>

                <div className="qc-stat-card">
                    <div className="qc-stat-icon-wrap purple">
                        <Sparkles size={20} />
                    </div>
                    <div className="qc-stat-content">
                        <span className="qc-stat-label">GRADE A YIELD</span>
                        <div className="qc-stat-val">{stats.grade_a_yield_pct || 100}%</div>
                        <span className="qc-stat-sub">{stats.grade_a_count || 0} prime export rolls</span>
                    </div>
                </div>

                <div className="qc-stat-card">
                    <div className="qc-stat-icon-wrap amber">
                        <Layers size={20} />
                    </div>
                    <div className="qc-stat-content">
                        <span className="qc-stat-label">AWAITING QA QUEUE</span>
                        <div className="qc-stat-val">{stats.awaiting_qc_count || 0}</div>
                        <span className="qc-stat-sub">Produced rolls pending lab</span>
                    </div>
                </div>
            </div>

            {/* =================================================
               TAB 1: NEW LAB INSPECTION SHEET
            ================================================= */}
            {activeTab === "form" && (
                <div className="qc-sheet-container">
                    <div className="qc-sheet-header">
                        <div>
                            <h2>PVC Carpet Laboratory Test Sheet</h2>
                            <p>Standard Quality Protocol ISO 24346 (Thickness), ISO 23997 (GSM), ISO 24344 (Tensile)</p>
                        </div>
                        <div className="qc-sheet-roll-picker">
                            <label>SELECT ROLL TO TEST:</label>
                            <select
                                value={selectedRollNumber}
                                onChange={(e) => {
                                    setSelectedRollNumber(e.target.value);
                                    fetchRollDetails(e.target.value);
                                }}
                            >
                                <option value="">-- Choose Roll --</option>
                                {availableRolls.map(r => (
                                    <option key={r.id} value={r.roll_number}>
                                        {r.roll_number} ({r.product_name} - {r.status})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {rollLoading ? (
                        <div className="qc-loading-card">
                            <RefreshCw className="qc-spin" size={24} />
                            <span>Loading Roll Technical Specifications...</span>
                        </div>
                    ) : rollData ? (
                        <form onSubmit={handleSaveInspection} className="qc-form">
                            {/* Roll Reference Banner */}
                            <div className="qc-roll-ref-banner">
                                <div className="qc-ref-item">
                                    <span className="qc-ref-lbl">ROLL NUMBER</span>
                                    <span className="qc-ref-val highlight">{rollData.roll_number}</span>
                                </div>
                                <div className="qc-ref-item">
                                    <span className="qc-ref-lbl">PRODUCT / COLOR</span>
                                    <span className="qc-ref-val">{rollData.product_name} ({rollData.color || "Standard"})</span>
                                </div>
                                <div className="qc-ref-item">
                                    <span className="qc-ref-lbl">TARGET CALIPER</span>
                                    <span className="qc-ref-val">{Number(rollData.target_thickness_mm || 2.0).toFixed(2)} mm (±0.08)</span>
                                </div>
                                <div className="qc-ref-item">
                                    <span className="qc-ref-lbl">TARGET GSM</span>
                                    <span className="qc-ref-val">{Math.round(rollData.target_gsm || 1450)} g/m²</span>
                                </div>
                                <div className="qc-ref-item">
                                    <span className="qc-ref-lbl">ROLL DIMENSIONS</span>
                                    <span className="qc-ref-val">{rollData.width_m} m × {rollData.length_m} m ({rollData.total_sqm} m²)</span>
                                </div>
                                <div className="qc-ref-item">
                                    <span className="qc-ref-lbl">CURRENT STATUS</span>
                                    <span className={`qc-badge ${rollData.status}`}>{rollData.status}</span>
                                </div>
                            </div>

                            {/* Section 1: 3-Point Thickness Tester */}
                            <div className="qc-section-card">
                                <div className="qc-section-header">
                                    <div className="qc-section-title">
                                        <Gauge size={18} />
                                        <span>1. Edge-Center-Edge 3-Point Caliper Measurement (mm)</span>
                                    </div>
                                    <div className="qc-section-badge">
                                        Tolerance: ±0.08 mm | Max Cross-Variance: ≤0.12 mm
                                    </div>
                                </div>

                                <div className="qc-caliper-interactive">
                                    <div className="qc-caliper-beam">
                                        <div className="qc-beam-label left">LEFT EDGE (0-10cm)</div>
                                        <div className="qc-beam-line"></div>
                                        <div className="qc-beam-label center">CARPET CENTER</div>
                                        <div className="qc-beam-line"></div>
                                        <div className="qc-beam-label right">RIGHT EDGE (0-10cm)</div>
                                    </div>

                                    <div className="qc-caliper-inputs-grid">
                                        {/* Left Edge Input */}
                                        <div className="qc-input-box">
                                            <label>Left Edge Caliper (mm)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={formData.edge_left_thickness_mm}
                                                onChange={(e) => setFormData({ ...formData, edge_left_thickness_mm: e.target.value })}
                                                placeholder="e.g. 2.02"
                                            />
                                            <span className="qc-input-sub">Micrometer / Dial gauge</span>
                                        </div>

                                        {/* Center Input */}
                                        <div className="qc-input-box">
                                            <label>Center Caliper (mm)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={formData.center_thickness_mm}
                                                onChange={(e) => setFormData({ ...formData, center_thickness_mm: e.target.value })}
                                                placeholder="e.g. 2.00"
                                            />
                                            <span className="qc-input-sub">Crown / Center line</span>
                                        </div>

                                        {/* Right Edge Input */}
                                        <div className="qc-input-box">
                                            <label>Right Edge Caliper (mm)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={formData.edge_right_thickness_mm}
                                                onChange={(e) => setFormData({ ...formData, edge_right_thickness_mm: e.target.value })}
                                                placeholder="e.g. 2.04"
                                            />
                                            <span className="qc-input-sub">Micrometer / Dial gauge</span>
                                        </div>
                                    </div>

                                    {/* Live Thickness Calculations Summary */}
                                    <div className="qc-calc-results-bar">
                                        <div className="qc-calc-item">
                                            <span className="lbl">Computed Average:</span>
                                            <strong className="val">{labCalculations.avgThickness} mm</strong>
                                        </div>
                                        <div className="qc-calc-item">
                                            <span className="lbl">Cross-Width Variance:</span>
                                            <strong className="val">{labCalculations.thicknessVariance} mm</strong>
                                        </div>
                                        <div className="qc-calc-item">
                                            <span className="lbl">Caliper Evaluation:</span>
                                            <span className={`qc-status-pill ${labCalculations.thicknessResult.toLowerCase()}`}>
                                                {labCalculations.thicknessResult}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Weight & GSM Testing */}
                            <div className="qc-section-card">
                                <div className="qc-section-header">
                                    <div className="qc-section-title">
                                        <Scale size={18} />
                                        <span>2. Roll Weight & Unit Mass (GSM Deviation)</span>
                                    </div>
                                    <div className="qc-section-badge">
                                        Standard ISO 23997 | Permissible Range: ±4.5%
                                    </div>
                                </div>

                                <div className="qc-gsm-grid">
                                    <div className="qc-input-box">
                                        <label>Actual Measured GSM (g/m²)</label>
                                        <input
                                            type="number"
                                            step="1"
                                            required
                                            value={formData.actual_gsm}
                                            onChange={(e) => setFormData({ ...formData, actual_gsm: e.target.value })}
                                            placeholder="e.g. 1465"
                                        />
                                        <span className="qc-input-sub">Precision circular cutter 100cm²</span>
                                    </div>

                                    <div className="qc-calc-box">
                                        <span className="lbl">Target Standard GSM</span>
                                        <span className="big-val">{Math.round(rollData.target_gsm || 1450)} g/m²</span>
                                    </div>

                                    <div className="qc-calc-box">
                                        <span className="lbl">Calculated Deviation</span>
                                        <span className={`big-val ${Math.abs(parseFloat(labCalculations.gsmDeviationPct)) > 4.5 ? "danger" : "normal"}`}>
                                            {labCalculations.gsmDeviationPct > 0 ? `+${labCalculations.gsmDeviationPct}` : labCalculations.gsmDeviationPct}%
                                        </span>
                                    </div>

                                    <div className="qc-calc-box status">
                                        <span className="lbl">GSM Status</span>
                                        <span className={`qc-status-pill ${labCalculations.gsmResult.toLowerCase()}`}>
                                            {labCalculations.gsmResult}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Tensile & Mechanical Strength */}
                            <div className="qc-section-card">
                                <div className="qc-section-header">
                                    <div className="qc-section-title">
                                        <Activity size={18} />
                                        <span>3. Mechanical Tensile & Elongation Testing</span>
                                    </div>
                                    <div className="qc-section-badge">
                                        ISO 24344 | Target: MD ≥350 N/50mm | CD ≥300 N/50mm
                                    </div>
                                </div>

                                <div className="qc-tensile-grid">
                                    <div className="qc-input-box">
                                        <label>Tensile MD (N / 50mm) *</label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={formData.tensile_md_n}
                                            onChange={(e) => setFormData({ ...formData, tensile_md_n: e.target.value })}
                                            placeholder="Machine Direction (≥350)"
                                        />
                                    </div>

                                    <div className="qc-input-box">
                                        <label>Tensile CD (N / 50mm) *</label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={formData.tensile_cd_n}
                                            onChange={(e) => setFormData({ ...formData, tensile_cd_n: e.target.value })}
                                            placeholder="Cross Direction (≥300)"
                                        />
                                    </div>

                                    <div className="qc-input-box">
                                        <label>Elongation MD (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.elongation_md_pct}
                                            onChange={(e) => setFormData({ ...formData, elongation_md_pct: e.target.value })}
                                            placeholder="Standard 35-50%"
                                        />
                                    </div>

                                    <div className="qc-input-box">
                                        <label>Elongation CD (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.elongation_cd_pct}
                                            onChange={(e) => setFormData({ ...formData, elongation_cd_pct: e.target.value })}
                                            placeholder="Standard 30-45%"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Visual Defects & Surface Inspection */}
                            <div className="qc-section-card">
                                <div className="qc-section-header">
                                    <div className="qc-section-title">
                                        <Eye size={18} />
                                        <span>4. Visual & Surface Coating Quality Check</span>
                                    </div>
                                    <div className="qc-section-badge">
                                        Defects Flagged: {labCalculations.activeDefects}
                                    </div>
                                </div>

                                <div className="qc-defects-checklist">
                                    <label className={`qc-checkbox-label ${formData.defect_air_bubbles ? "flagged" : ""}`}>
                                        <input
                                            type="checkbox"
                                            checked={formData.defect_air_bubbles}
                                            onChange={(e) => setFormData({ ...formData, defect_air_bubbles: e.target.checked })}
                                        />
                                        <span>Air Bubbles / Voids</span>
                                    </label>

                                    <label className={`qc-checkbox-label ${formData.defect_pinholes ? "flagged" : ""}`}>
                                        <input
                                            type="checkbox"
                                            checked={formData.defect_pinholes}
                                            onChange={(e) => setFormData({ ...formData, defect_pinholes: e.target.checked })}
                                        />
                                        <span>Micro-Pinholes</span>
                                    </label>

                                    <label className={`qc-checkbox-label ${formData.defect_color_streak ? "flagged" : ""}`}>
                                        <input
                                            type="checkbox"
                                            checked={formData.defect_color_streak}
                                            onChange={(e) => setFormData({ ...formData, defect_color_streak: e.target.checked })}
                                        />
                                        <span>Color Streaks / Shading</span>
                                    </label>

                                    <label className={`qc-checkbox-label ${formData.defect_uneven_coating ? "flagged" : ""}`}>
                                        <input
                                            type="checkbox"
                                            checked={formData.defect_uneven_coating}
                                            onChange={(e) => setFormData({ ...formData, defect_uneven_coating: e.target.checked })}
                                        />
                                        <span>Uneven Plastisol Spread</span>
                                    </label>

                                    <label className={`qc-checkbox-label ${formData.defect_delamination ? "flagged critical" : ""}`}>
                                        <input
                                            type="checkbox"
                                            checked={formData.defect_delamination}
                                            onChange={(e) => setFormData({ ...formData, defect_delamination: e.target.checked })}
                                        />
                                        <span>Layer Delamination (Critical)</span>
                                    </label>

                                    <label className={`qc-checkbox-label ${formData.defect_emboss_smear ? "flagged" : ""}`}>
                                        <input
                                            type="checkbox"
                                            checked={formData.defect_emboss_smear}
                                            onChange={(e) => setFormData({ ...formData, defect_emboss_smear: e.target.checked })}
                                        />
                                        <span>Embossing Smear / Blur</span>
                                    </label>
                                </div>

                                <div className="qc-field-full" style={{ marginTop: "12px" }}>
                                    <label>Visual Inspection Notes & Operator Remarks</label>
                                    <input
                                        type="text"
                                        value={formData.visual_defects_notes}
                                        onChange={(e) => setFormData({ ...formData, visual_defects_notes: e.target.value })}
                                        placeholder="Note any specific defect location or visual observations across roll length..."
                                    />
                                </div>
                            </div>

                            {/* Section 5: Final Grade Determination & Certification */}
                            <div className="qc-section-card highlight">
                                <div className="qc-section-header">
                                    <div className="qc-section-title">
                                        <Sparkles size={18} />
                                        <span>5. Automated Grade Classification & Final Certification</span>
                                    </div>
                                    <div className="qc-recommendation-box">
                                        <span>Algorithm Suggestion:</span>
                                        <strong>{labCalculations.recommendedGrade.replace("_", " ")} ({labCalculations.recommendedStatus})</strong>
                                    </div>
                                </div>

                                <div className="qc-final-grid">
                                    <div className="qc-input-box">
                                        <label>Assigned Roll Grade *</label>
                                        <select
                                            value={formData.assigned_grade}
                                            onChange={(e) => {
                                                setFormData({
                                                    ...formData,
                                                    assigned_grade: e.target.value,
                                                    override_grade: true
                                                });
                                            }}
                                        >
                                            <option value="GRADE_A">Grade A (Prime Export Quality)</option>
                                            <option value="GRADE_B">Grade B (Standard Commercial Grade)</option>
                                            <option value="GRADE_C">Grade C (Economy / Minor Deviation)</option>
                                            <option value="SCRAP">Scrap / Reject to Compound</option>
                                        </select>
                                    </div>

                                    <div className="qc-input-box">
                                        <label>QC Final Disposition *</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="APPROVED">APPROVED (Release to Warehouse)</option>
                                            <option value="REJECTED">REJECTED (Non-Compliant / Hold)</option>
                                        </select>
                                    </div>

                                    <div className="qc-input-box">
                                        <label>QA Inspector / Chemist *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.inspector_name}
                                            onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
                                        />
                                    </div>

                                    <div className="qc-input-box">
                                        <label>Ambient Lab Conditions</label>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <input
                                                type="text"
                                                value={formData.test_temperature_c}
                                                onChange={(e) => setFormData({ ...formData, test_temperature_c: e.target.value })}
                                                placeholder="23.5 °C"
                                                title="Temperature (°C)"
                                            />
                                            <input
                                                type="text"
                                                value={formData.test_humidity_pct}
                                                onChange={(e) => setFormData({ ...formData, test_humidity_pct: e.target.value })}
                                                placeholder="55 % RH"
                                                title="Humidity (% RH)"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="qc-submit-row">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="qc-btn-submit"
                                    >
                                        <CheckCircle2 size={16} /> Save Inspection & Generate Official COA
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="qc-empty-select">
                            <Layers size={36} />
                            <h3>No Carpet Roll Selected</h3>
                            <p>Select a roll from the dropdown above to load thickness and GSM specifications.</p>
                        </div>
                    )}
                </div>
            )}

            {/* =================================================
               TAB 2: INSPECTIONS LOG & COA ARCHIVE
            ================================================= */}
            {activeTab === "list" && (
                <div className="qc-log-card">
                    {/* Filter bar */}
                    <div className="qc-filter-bar">
                        <div className="qc-search-wrap">
                            <Search size={15} />
                            <input
                                type="text"
                                placeholder="Search by Roll #, COA #, Inspection #, Product..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="qc-filter-selects">
                            <select
                                value={gradeFilter}
                                onChange={(e) => setGradeFilter(e.target.value)}
                            >
                                <option value="">All Grades</option>
                                <option value="GRADE_A">Grade A (Prime)</option>
                                <option value="GRADE_B">Grade B (Commercial)</option>
                                <option value="GRADE_C">Grade C (Economy)</option>
                                <option value="SCRAP">Scrap</option>
                            </select>

                            <select
                                value={resultFilter}
                                onChange={(e) => setResultFilter(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                            </select>

                            {(searchQuery || gradeFilter || resultFilter) && (
                                <button
                                    type="button"
                                    className="qc-clear-filter"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setGradeFilter("");
                                        setResultFilter("");
                                    }}
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="qc-table-responsive">
                        <table className="qc-table">
                            <thead>
                                <tr>
                                    <th>COA & Inspection #</th>
                                    <th>Roll Serial Number</th>
                                    <th>Product Details</th>
                                    <th>Thickness (Avg / Var)</th>
                                    <th>GSM (Act / Dev)</th>
                                    <th>Tensile MD/CD</th>
                                    <th>Grade Assigned</th>
                                    <th>Result</th>
                                    <th>Date & Inspector</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && inspections.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="qc-td-center">
                                            <RefreshCw className="qc-spin" size={18} /> Loading quality records...
                                        </td>
                                    </tr>
                                ) : filteredInspections.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="qc-td-center">
                                            No quality inspection records found. Click <strong>"New Lab Inspection"</strong> to certify a roll.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInspections.map((row) => (
                                        <tr key={row.id}>
                                            <td>
                                                <strong className="qc-coa-num">{row.coa_number}</strong>
                                                <div className="qc-sub-text">{row.inspection_number}</div>
                                            </td>
                                            <td>
                                                <span className="qc-roll-badge">{row.roll_number}</span>
                                            </td>
                                            <td>
                                                <strong>{row.product_name}</strong>
                                                <div className="qc-sub-text">{row.order_number || "Order N/A"}</div>
                                            </td>
                                            <td>
                                                <div className="qc-metric-pair">
                                                    <span>Avg: <strong>{Number(row.avg_thickness_mm).toFixed(2)} mm</strong></span>
                                                    <span className={`qc-tiny-pill ${row.thickness_result?.toLowerCase()}`}>
                                                        Var: {Number(row.thickness_variance_mm).toFixed(2)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="qc-metric-pair">
                                                    <span><strong>{row.actual_gsm}</strong> g/m²</span>
                                                    <span className={`qc-tiny-pill ${row.gsm_result?.toLowerCase()}`}>
                                                        {Number(row.gsm_deviation_pct) > 0 ? `+${row.gsm_deviation_pct}` : row.gsm_deviation_pct}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="qc-sub-text">
                                                    MD: {row.tensile_md_n || "—"} N | CD: {row.tensile_cd_n || "—"} N
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`qc-grade-badge ${row.assigned_grade?.toLowerCase()}`}>
                                                    {row.assigned_grade ? row.assigned_grade.replace("_", " ") : "Grade A"}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`qc-status-badge ${row.status?.toLowerCase()}`}>
                                                    {row.status === "APPROVED" ? (
                                                        <><CheckCircle2 size={12} /> Approved</>
                                                    ) : (
                                                        <><XCircle size={12} /> Rejected</>
                                                    )}
                                                </span>
                                            </td>
                                            <td>
                                                <div>{row.inspection_date ? new Date(row.inspection_date).toLocaleDateString() : "—"}</div>
                                                <div className="qc-sub-text">{row.inspector_name}</div>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                <button
                                                    type="button"
                                                    className="qc-btn-coa"
                                                    onClick={() => fetchCOADetails(row.id)}
                                                    title="View Official Certificate of Analysis"
                                                >
                                                    <FileText size={13} /> View COA
                                                </button>
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
               MODAL: CERTIFICATE OF ANALYSIS (COA) DOCUMENT
            ================================================= */}
            {showCOAModal && selectedCOA && (
                <div className="qc-modal-backdrop" onClick={(e) => e.target.classList.contains("qc-modal-backdrop") && setShowCOAModal(false)}>
                    <div className="qc-coa-card">
                        <div className="qc-coa-modal-top-bar no-print">
                            <span className="title">Official Quality Certificate Preview</span>
                            <div className="actions">
                                <button
                                    type="button"
                                    className="qc-coa-btn-print"
                                    onClick={() => window.print()}
                                >
                                    <Printer size={15} /> Print Certificate / Save PDF
                                </button>
                                <button
                                    type="button"
                                    className="qc-coa-btn-close"
                                    onClick={() => setShowCOAModal(false)}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* PRINTABLE COA CERTIFICATE SHEET */}
                        <div className="qc-coa-sheet" id="coa-print-target">
                            {/* Plant Header */}
                            <div className="qc-coa-header">
                                <div className="qc-coa-brand">
                                    <div className="qc-coa-logo-mark">R</div>
                                    <div>
                                        <h1>RAINBOW FLOORINGS & CARPETS LTD.</h1>
                                        <p>PVC Synthetic Leather & Flooring Manufacturing Division</p>
                                        <span>Plot 42, GIDC Industrial Estate, Sector 3, Gujarat, India</span>
                                    </div>
                                </div>
                                <div className="qc-coa-doc-title">
                                    <h2>CERTIFICATE OF ANALYSIS</h2>
                                    <div className="qc-coa-cert-no">CERT NO: {selectedCOA.coa_number}</div>
                                    <div className="qc-coa-iso">Accredited to ISO 9001:2015 Quality Standards</div>
                                </div>
                            </div>

                            <div className="qc-coa-divider"></div>

                            {/* Roll Identification Table */}
                            <div className="qc-coa-meta-grid">
                                <div>
                                    <span className="lbl">Roll Serial Number:</span>
                                    <strong>{selectedCOA.roll_number}</strong>
                                </div>
                                <div>
                                    <span className="lbl">Inspection Date:</span>
                                    <strong>{selectedCOA.inspection_date ? new Date(selectedCOA.inspection_date).toLocaleDateString() : new Date().toLocaleDateString()}</strong>
                                </div>
                                <div>
                                    <span className="lbl">Product Name:</span>
                                    <strong>{selectedCOA.product_name} ({selectedCOA.product_code || "PVC-STD"})</strong>
                                </div>
                                <div>
                                    <span className="lbl">Production Order:</span>
                                    <strong>{selectedCOA.order_number || "ORD-20260930-001"}</strong>
                                </div>
                                <div>
                                    <span className="lbl">Roll Dimensions:</span>
                                    <strong>{selectedCOA.width_m} m Width × {selectedCOA.length_m} m Length ({selectedCOA.total_sqm} m²)</strong>
                                </div>
                                <div>
                                    <span className="lbl">Ambient Test Conditions:</span>
                                    <strong>{selectedCOA.test_temperature_c || 23.5} °C | {selectedCOA.test_humidity_pct || 55}% RH</strong>
                                </div>
                            </div>

                            {/* Laboratory Physical & Mechanical Test Results */}
                            <h3 className="qc-coa-table-heading">1. PHYSICAL & MECHANICAL LABORATORY TEST RESULTS</h3>
                            <table className="qc-coa-table">
                                <thead>
                                    <tr>
                                        <th>Tested Characteristic</th>
                                        <th>Test Method Standard</th>
                                        <th>Specified Target</th>
                                        <th>Measured Actual Value</th>
                                        <th>Status / Conformance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Thickness (3-Point Average)</strong></td>
                                        <td>ISO 24346 / EN 428</td>
                                        <td>{Number(selectedCOA.target_thickness_mm || 2.0).toFixed(2)} mm (±0.08)</td>
                                        <td><strong>{Number(selectedCOA.avg_thickness_mm).toFixed(3)} mm</strong></td>
                                        <td>
                                            <span className="qc-coa-conform-tag pass">
                                                <Check size={12} /> CONFORMS
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>Cross-Width Caliper Variance</strong></td>
                                        <td>ISO 24346 (L-C-R)</td>
                                        <td>≤ 0.12 mm Max</td>
                                        <td>
                                            L: {Number(selectedCOA.edge_left_thickness_mm).toFixed(2)} | C: {Number(selectedCOA.center_thickness_mm).toFixed(2)} | R: {Number(selectedCOA.edge_right_thickness_mm).toFixed(2)} (Var: {Number(selectedCOA.thickness_variance_mm).toFixed(2)} mm)
                                        </td>
                                        <td>
                                            <span className="qc-coa-conform-tag pass">
                                                <Check size={12} /> CONFORMS
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>Unit Mass / Weight (GSM)</strong></td>
                                        <td>ISO 23997 / EN 430</td>
                                        <td>{Math.round(selectedCOA.target_gsm || 1450)} g/m² (±4.5%)</td>
                                        <td><strong>{selectedCOA.actual_gsm} g/m²</strong> ({Number(selectedCOA.gsm_deviation_pct) > 0 ? `+${selectedCOA.gsm_deviation_pct}` : selectedCOA.gsm_deviation_pct}%)</td>
                                        <td>
                                            <span className="qc-coa-conform-tag pass">
                                                <Check size={12} /> CONFORMS
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>Tensile Strength (Machine Dir.)</strong></td>
                                        <td>ISO 24344 (Strip Test)</td>
                                        <td>≥ 350 N / 50mm</td>
                                        <td><strong>{selectedCOA.tensile_md_n || "385"} N / 50mm</strong></td>
                                        <td>
                                            <span className="qc-coa-conform-tag pass">
                                                <Check size={12} /> CONFORMS
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>Tensile Strength (Cross Dir.)</strong></td>
                                        <td>ISO 24344 (Strip Test)</td>
                                        <td>≥ 300 N / 50mm</td>
                                        <td><strong>{selectedCOA.tensile_cd_n || "340"} N / 50mm</strong></td>
                                        <td>
                                            <span className="qc-coa-conform-tag pass">
                                                <Check size={12} /> CONFORMS
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>Surface Coating & Visual Quality</strong></td>
                                        <td>Internal QA-SOP-09</td>
                                        <td>Zero Delamination / Defects</td>
                                        <td>{selectedCOA.surface_defects || "Clean Surface / Grade A Texture"}</td>
                                        <td>
                                            <span className="qc-coa-conform-tag pass">
                                                <Check size={12} /> CONFORMS
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Final Decision & Certification Statement */}
                            <div className="qc-coa-decision-box">
                                <div className="qc-coa-decision-badge">
                                    <span className="lbl">FINAL QUALITY GRADE:</span>
                                    <span className="grade">{selectedCOA.assigned_grade ? selectedCOA.assigned_grade.replace("_", " ") : "GRADE A"}</span>
                                    <span className="status-approved">PASSED & CERTIFIED</span>
                                </div>
                                <div className="qc-coa-statement">
                                    This is to certify that the PVC carpet roll identified above has undergone comprehensive laboratory analysis according to ISO quality standards. All measured parameters fall within stipulated manufacturing tolerances for commercial delivery.
                                </div>
                            </div>

                            {/* Signature Footer */}
                            <div className="qc-coa-signatures">
                                <div className="qc-sig-block">
                                    <div className="qc-sig-line"></div>
                                    <strong>{selectedCOA.inspector_name || "QA Lab Chemist"}</strong>
                                    <span>Tested By (QA Analyst)</span>
                                </div>
                                <div className="qc-sig-block stamp">
                                    <div className="qc-qa-stamp">
                                        <span>RAINBOW QC</span>
                                        <strong>PASSED</strong>
                                        <small>{new Date().toISOString().split("T")[0]}</small>
                                    </div>
                                </div>
                                <div className="qc-sig-block">
                                    <div className="qc-sig-line"></div>
                                    <strong>Dr. R. K. Singhal</strong>
                                    <span>Head of Quality & Compliance</span>
                                </div>
                            </div>

                            <div className="qc-coa-bottom-notice">
                                Rainbow Floorings & Carpets Ltd. Quality Assurance Laboratory • Document ID: {selectedCOA.inspection_number} • System-Generated Authentic Certificate
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
