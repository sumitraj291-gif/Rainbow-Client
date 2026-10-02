import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { Html5Qrcode } from "html5-qrcode";
import {
    Barcode,
    Camera,
    Keyboard,
    Search,
    CheckCircle2,
    AlertCircle,
    Warehouse,
    Truck,
    Package,
    Ruler,
    Scale,
    Maximize2,
    Calendar,
    Tag,
    Printer,
    RefreshCw,
    X,
    Award,
    Clock,
    Zap,
    Layers,
    Sliders,
    Volume2,
    VolumeX,
    ExternalLink,
    ShieldCheck,
    ClipboardCheck
} from "lucide-react";

export default function RollScanner() {
    const navigate = useNavigate();
    // Mode states
    const [scannerMode, setScannerMode] = useState("camera"); // "camera" | "manual"
    const [workflowMode, setWorkflowMode] = useState("single"); // "single" | "batch"
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Camera scanner state
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const html5QrCodeRef = useRef(null);

    // Search / Code input
    const [codeInput, setCodeInput] = useState("");
    const [scanningLoading, setScanningLoading] = useState(false);
    const [scanMessage, setScanMessage] = useState("");
    const [scanError, setScanError] = useState("");

    // Active scanned roll (Single mode)
    const [activeRoll, setActiveRoll] = useState(null);
    const [updatingRoll, setUpdatingRoll] = useState(false);
    const [targetBay, setTargetBay] = useState("FG-BAY-01");
    const [locations, setLocations] = useState([]);

    // Batch mode state
    const [batchRolls, setBatchRolls] = useState([]);
    const [batchTargetLocation, setBatchTargetLocation] = useState("FG-BAY-01");
    const [batchProcessing, setBatchProcessing] = useState(false);

    // Label Print Modal state
    const [showLabelModal, setShowLabelModal] = useState(false);

    // Audio synthesizer for industrial barcode beep
    const playBeep = (isSuccess = true) => {
        if (!soundEnabled) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (isSuccess) {
                // High confirmation chirp (1200Hz to 1800Hz)
                osc.type = "sine";
                osc.frequency.setValueAtTime(1200, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.08);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } else {
                // Low buzz error
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(280, ctx.currentTime);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.2);
            }
        } catch (e) {
            console.error("Audio beep error:", e);
        }
    };

    // Load warehouse locations on mount
    useEffect(() => {
        loadLocations();
    }, []);

    const loadLocations = async () => {
        try {
            const res = await api.get("/finished-goods/locations");
            setLocations(res.data.data || []);
            if (res.data.data?.length > 0) {
                setTargetBay(res.data.data[0].location_code);
                setBatchTargetLocation(res.data.data[0].location_code);
            }
        } catch (err) {
            console.error("LOAD LOCATIONS ERROR:", err);
        }
    };

    // Global USB Barcode Scanner listener (captures fast keyboard wedge input)
    useEffect(() => {
        let buffer = "";
        let lastKeyTime = Date.now();

        const handleKeyDown = (e) => {
            // Ignore if active element is a regular textarea or modal text input
            if (
                e.target.tagName === "TEXTAREA" ||
                (e.target.tagName === "INPUT" && e.target.id !== "scanner-manual-input")
            ) {
                return;
            }

            const currentTime = Date.now();
            const char = e.key;

            if (currentTime - lastKeyTime > 150) {
                buffer = "";
            }
            lastKeyTime = currentTime;

            if (char === "Enter") {
                if (buffer.length >= 3) {
                    processScanCode(buffer);
                    buffer = "";
                }
            } else if (char.length === 1) {
                buffer += char;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [workflowMode, batchRolls]);

    // Camera scanner lifecycle
    useEffect(() => {
        if (scannerMode === "camera") {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [scannerMode]);

    const startCamera = async () => {
        setCameraLoading(true);
        setCameraError("");

        try {
            const qrCode = new Html5Qrcode("camera-scanner-view");
            html5QrCodeRef.current = qrCode;

            const config = {
                fps: 15,
                qrbox: { width: 280, height: 180 },
                aspectRatio: 1.5
            };

            await qrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    handleCameraScan(decodedText);
                },
                () => {
                    // ignore frame errors while seeking
                }
            );

            setCameraActive(true);
        } catch (err) {
            console.error("CAMERA START ERROR:", err);
            setCameraError("Camera unavailable or permission denied. Use Manual / USB Gun input.");
            setCameraActive(false);
        } finally {
            setCameraLoading(false);
        }
    };

    const stopCamera = async () => {
        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.error("CAMERA STOP ERROR:", err);
            }
            html5QrCodeRef.current = null;
        }
        setCameraActive(false);
    };

    // Camera Scan Callback with debounce
    const lastScanRef = useRef({ code: "", time: 0 });
    const handleCameraScan = (code) => {
        const now = Date.now();
        if (lastScanRef.current.code === code && now - lastScanRef.current.time < 2000) {
            return; // ignore duplicates within 2s
        }
        lastScanRef.current = { code, time: now };
        processScanCode(code);
    };

    // Process scan lookup (Single or Batch)
    const processScanCode = async (codeToLookup) => {
        const clean = (codeToLookup || codeInput || "").trim();
        if (!clean) return;

        try {
            setScanningLoading(true);
            setScanError("");
            setScanMessage("");

            const res = await api.get(`/carpet-rolls/scan/${encodeURIComponent(clean)}`);
            const roll = res.data.data;

            playBeep(true);
            setScanMessage(`Scanned: ${roll.roll_number} (${roll.product_name})`);

            if (workflowMode === "single") {
                setActiveRoll(roll);
                setTargetBay(roll.warehouse_location || locations[0]?.location_code || "FG-BAY-01");
            } else {
                // Batch mode: add to list if not already in batch
                setBatchRolls((prev) => {
                    if (prev.some((r) => r.id === roll.id)) {
                        setScanError(`Roll ${roll.roll_number} is already in the current batch list.`);
                        return prev;
                    }
                    return [roll, ...prev];
                });
            }

            setCodeInput("");
        } catch (err) {
            playBeep(false);
            console.error("SCAN LOOKUP ERROR:", err);
            setScanError(err.response?.data?.message || `No roll found for code '${clean}'.`);
        } finally {
            setScanningLoading(false);
        }
    };

    // Quick Update Single Roll (Status & Bay)
    const handleSingleRollUpdate = async (newStatus, newBay, newGrade) => {
        if (!activeRoll) return;

        try {
            setUpdatingRoll(true);
            setScanError("");
            setScanMessage("");

            const payload = {};
            if (newStatus) payload.status = newStatus;
            if (newBay) payload.warehouse_location = newBay;
            if (newGrade) payload.grade = newGrade;

            const res = await api.patch(`/carpet-rolls/${activeRoll.id}/quick-update`, payload);
            setActiveRoll(res.data.data);
            setScanMessage(`Updated roll ${activeRoll.roll_number} successfully.`);
            playBeep(true);
        } catch (err) {
            console.error("UPDATE ROLL ERROR:", err);
            setScanError(err.response?.data?.message || "Failed to update roll.");
            playBeep(false);
        } finally {
            setUpdatingRoll(false);
        }
    };

    // Quick Stock-In Single Roll
    const handleSingleRollStockIn = async () => {
        if (!activeRoll) return;
        try {
            setUpdatingRoll(true);
            setScanError("");
            setScanMessage("");

            const res = await api.post("/finished-goods/stock-in", {
                roll_ids: [activeRoll.id],
                warehouse_location: targetBay
            });

            // Refresh roll
            const updatedRes = await api.get(`/carpet-rolls/scan/${activeRoll.id}`);
            setActiveRoll(updatedRes.data.data);
            setScanMessage(res.data.message || `Roll stocked into ${targetBay}.`);
            playBeep(true);
        } catch (err) {
            console.error("STOCK ROLL ERROR:", err);
            setScanError(err.response?.data?.message || "Failed to stock roll into warehouse.");
            playBeep(false);
        } finally {
            setUpdatingRoll(false);
        }
    };

    // Batch Submit: Stock All Rolls to Warehouse
    const handleBatchStockIn = async () => {
        if (batchRolls.length === 0) return;
        try {
            setBatchProcessing(true);
            setScanError("");
            setScanMessage("");

            const res = await api.post("/finished-goods/stock-in", {
                roll_ids: batchRolls.map((r) => r.id),
                warehouse_location: batchTargetLocation
            });

            setScanMessage(`Batch success: ${batchRolls.length} rolls stocked into ${batchTargetLocation}.`);
            playBeep(true);
            setBatchRolls([]);
        } catch (err) {
            console.error("BATCH STOCK-IN ERROR:", err);
            setScanError(err.response?.data?.message || "Failed to batch stock rolls.");
            playBeep(false);
        } finally {
            setBatchProcessing(false);
        }
    };

    // Batch metrics
    const batchMetrics = useMemo(() => {
        const totalRolls = batchRolls.length;
        const totalLength = batchRolls.reduce((acc, r) => acc + parseFloat(r.length_m || 0), 0);
        const totalArea = batchRolls.reduce((acc, r) => acc + parseFloat(r.area_sqm || 0), 0);
        const totalWeight = batchRolls.reduce((acc, r) => acc + parseFloat(r.net_weight_kg || 0), 0);
        return {
            totalRolls,
            totalLength: totalLength.toFixed(2),
            totalArea: totalArea.toFixed(2),
            totalAreaSqft: (totalArea * 10.764).toFixed(1),
            totalWeight: totalWeight.toFixed(2)
        };
    }, [batchRolls]);

    return (
        <div className="rs-page">
            {/* =================================================
               HEADER
            ================================================= */}
            <div className="rs-header">
                <div className="rs-header-title">
                    <div className="rs-eyebrow">MES SHOP FLOOR • BARCODE & RFID</div>
                    <h1>Carpet Roll Barcode Scanner Station</h1>
                    <p>
                        High-speed barcode scanner station for instant roll lookup, live QA inspection, and warehouse bay transfers.
                    </p>
                </div>

                <div className="rs-header-actions">
                    <button
                        type="button"
                        className={`rs-btn-toggle ${soundEnabled ? "active" : ""}`}
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        title={soundEnabled ? "Mute Beeper Sound" : "Enable Beeper Sound"}
                    >
                        {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                        <span>{soundEnabled ? "Beep On" : "Beep Off"}</span>
                    </button>
                    <a
                        href="/carpet-rolls"
                        className="rs-btn-secondary"
                        style={{ textDecoration: "none" }}
                    >
                        <Layers size={14} /> Roll Inventory
                    </a>
                    <a
                        href="/finished-goods"
                        className="rs-btn-secondary"
                        style={{ textDecoration: "none" }}
                    >
                        <Warehouse size={14} /> Finished Goods
                    </a>
                </div>
            </div>

            {/* =================================================
               ALERTS
            ================================================= */}
            {scanMessage && (
                <div className="rs-alert rs-alert-success">
                    <CheckCircle2 size={16} />
                    <span>{scanMessage}</span>
                </div>
            )}
            {scanError && (
                <div className="rs-alert rs-alert-error">
                    <AlertCircle size={16} />
                    <span>{scanError}</span>
                </div>
            )}

            {/* =================================================
               WORKFLOW & SCANNER SELECTOR TABS
            ================================================= */}
            <div className="rs-mode-bar">
                <div className="rs-pill-group">
                    <span className="rs-pill-lbl">Workflow:</span>
                    <button
                        type="button"
                        className={`rs-pill-btn ${workflowMode === "single" ? "active" : ""}`}
                        onClick={() => setWorkflowMode("single")}
                    >
                        <Barcode size={14} /> Single Roll Lookup & Action
                    </button>
                    <button
                        type="button"
                        className={`rs-pill-btn ${workflowMode === "batch" ? "active" : ""}`}
                        onClick={() => setWorkflowMode("batch")}
                    >
                        <Layers size={14} /> Batch Scanning Station ({batchRolls.length})
                    </button>
                </div>

                <div className="rs-pill-group">
                    <span className="rs-pill-lbl">Input Device:</span>
                    <button
                        type="button"
                        className={`rs-pill-btn ${scannerMode === "camera" ? "active" : ""}`}
                        onClick={() => setScannerMode("camera")}
                    >
                        <Camera size={14} /> Device Camera Viewfinder
                    </button>
                    <button
                        type="button"
                        className={`rs-pill-btn ${scannerMode === "manual" ? "active" : ""}`}
                        onClick={() => setScannerMode("manual")}
                    >
                        <Keyboard size={14} /> Handheld USB Gun / Keyboard
                    </button>
                </div>
            </div>

            {/* =================================================
               MAIN SCANNER WORKSPACE GRID
            ================================================= */}
            <div className="rs-grid">
                {/* LEFT COLUMN: SCANNER INPUT VIEW */}
                <div className="rs-scanner-card">
                    <div className="rs-card-header">
                        <div className="rs-card-title">
                            {scannerMode === "camera" ? (
                                <>
                                    <Camera size={16} color="#4f46e5" />
                                    <span>Live Barcode / QR Camera Stream</span>
                                </>
                            ) : (
                                <>
                                    <Keyboard size={16} color="#4f46e5" />
                                    <span>Handheld USB Scanner & Direct Input</span>
                                </>
                            )}
                        </div>

                        <div className="rs-status-chip">
                            <span className="rs-pulse-dot"></span>
                            <span>USB Gun Auto-Listener Active</span>
                        </div>
                    </div>

                    <div className="rs-card-body">
                        {/* CAMERA VIEWPORT */}
                        {scannerMode === "camera" && (
                            <div className="rs-camera-container">
                                <div id="camera-scanner-view" className="rs-camera-view"></div>
                                {cameraLoading && (
                                    <div className="rs-camera-overlay">
                                        <div className="rs-spinner"></div>
                                        <p>Initializing Camera Stream...</p>
                                    </div>
                                )}
                                {cameraError && (
                                    <div className="rs-camera-overlay error">
                                        <AlertCircle size={28} />
                                        <p>{cameraError}</p>
                                        <button
                                            type="button"
                                            className="rs-btn-primary"
                                            onClick={startCamera}
                                        >
                                            Retry Camera
                                        </button>
                                    </div>
                                )}
                                <div className="rs-camera-hint">
                                    Align the carpet roll barcode (e.g. <code>ROL-20260930-0001</code>) inside the target frame.
                                </div>
                            </div>
                        )}

                        {/* MANUAL / KEYBOARD INPUT FORM */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                processScanCode();
                            }}
                            className="rs-input-form"
                        >
                            <label>Scan or Enter Roll Serial Number</label>
                            <div className="rs-input-row">
                                <div className="rs-input-wrap">
                                    <Barcode size={18} className="rs-field-icon" />
                                    <input
                                        id="scanner-manual-input"
                                        type="text"
                                        value={codeInput}
                                        onChange={(e) => setCodeInput(e.target.value)}
                                        placeholder="Scan barcode or type ROL-20260930-0001..."
                                        autoComplete="off"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="rs-btn-primary"
                                    disabled={scanningLoading || !codeInput.trim()}
                                >
                                    {scanningLoading ? <RefreshCw size={14} className="rs-spin" /> : <Search size={14} />}
                                    <span>Look Up</span>
                                </button>
                            </div>
                        </form>

                        {/* QUICK SELECTION OF SAMPLE DEMO ROLLS */}
                        <div className="rs-quick-samples">
                            <span className="rs-sample-lbl">Quick Demo Rolls:</span>
                            <div className="rs-sample-pills">
                                {["ROL-20260930-0001", "ROL-20260930-0002", "ROL-20260930-0003", "ROL-20260930-0005"].map((code) => (
                                    <button
                                        key={code}
                                        type="button"
                                        className="rs-sample-pill"
                                        onClick={() => processScanCode(code)}
                                    >
                                        {code}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: SCANNED RESULT / BATCH TABLE */}
                <div className="rs-result-container">
                    {/* SINGLE ROLL WORKFLOW VIEW */}
                    {workflowMode === "single" && (
                        <div className="rs-profile-card">
                            {activeRoll ? (
                                <>
                                    <div className="rs-profile-header">
                                        <div>
                                            <div className="rs-roll-header-top">
                                                <div className="rs-roll-hero-pill">
                                                    <Barcode size={18} />
                                                    <span>{activeRoll.roll_number}</span>
                                                </div>
                                                <span className={`rs-badge-grade ${activeRoll.grade?.toLowerCase()}`}>
                                                    {activeRoll.grade === "GRADE_A" ? "Grade A Prime" : activeRoll.grade}
                                                </span>
                                                <span className={`rs-badge-status ${activeRoll.status?.toLowerCase()}`}>
                                                    {activeRoll.status}
                                                </span>
                                            </div>
                                            <h2>{activeRoll.product_name}</h2>
                                            <div className="rs-product-subtags">
                                                <span className="rs-subtag">PO: {activeRoll.production_order_number}</span>
                                                <span className="rs-subtag">{activeRoll.product_code}</span>
                                                {activeRoll.colour && <span className="rs-subtag">{activeRoll.colour}</span>}
                                                {activeRoll.carpet_type && <span className="rs-subtag">{activeRoll.carpet_type}</span>}
                                                {activeRoll.design_pattern && <span className="rs-subtag">{activeRoll.design_pattern}</span>}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="rs-btn-action-tag"
                                            onClick={() => setShowLabelModal(true)}
                                            title="Print Thermal Barcode Tag"
                                        >
                                            <Tag size={13} /> Print Label
                                        </button>
                                    </div>

                                    {/* SPECIFICATION TILES */}
                                    <div className="rs-specs-grid">
                                        <div className="rs-spec-tile">
                                            <div className="rs-tile-icon"><Ruler size={16} /></div>
                                            <div className="rs-tile-info">
                                                <div className="rs-tile-val">{activeRoll.width_m}m × {activeRoll.length_m}m</div>
                                                <div className="rs-tile-lbl">Dimensions (W × L)</div>
                                            </div>
                                        </div>

                                        <div className="rs-spec-tile">
                                            <div className="rs-tile-icon"><Maximize2 size={16} /></div>
                                            <div className="rs-tile-info">
                                                <div className="rs-tile-val">{activeRoll.area_sqm} m²</div>
                                                <div className="rs-tile-lbl">{(parseFloat(activeRoll.area_sqm || 0) * 10.764).toFixed(1)} sq.ft</div>
                                            </div>
                                        </div>

                                        <div className="rs-spec-tile">
                                            <div className="rs-tile-icon"><Scale size={16} /></div>
                                            <div className="rs-tile-info">
                                                <div className="rs-tile-val">{activeRoll.net_weight_kg ? `${activeRoll.net_weight_kg} kg` : "—"}</div>
                                                <div className="rs-tile-lbl">Net Weight (Gross: {activeRoll.gross_weight_kg || 0}kg)</div>
                                            </div>
                                        </div>

                                        <div className="rs-spec-tile">
                                            <div className="rs-tile-icon"><Warehouse size={16} /></div>
                                            <div className="rs-tile-info">
                                                <div className="rs-tile-val">{activeRoll.warehouse_location || "WIP Floor"}</div>
                                                <div className="rs-tile-lbl">Current Location</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DISPATCH / CUSTOMER DETAILS IF DISPATCHED */}
                                    {activeRoll.status === "DISPATCHED" && (
                                        <div className="rs-dispatch-banner">
                                            <Truck size={18} />
                                            <div>
                                                <strong>Dispatched via Challan: {activeRoll.dispatch_number}</strong>
                                                <div>Consignee: {activeRoll.customer_name || "Customer Direct"} • Vehicle: {activeRoll.vehicle_number || "Direct"}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* DEFECT DETAILS IF ANY */}
                                    {activeRoll.defect_type && (
                                        <div className="rs-defect-banner">
                                            <AlertCircle size={16} />
                                            <div>Defect Flag: <strong>{activeRoll.defect_type}</strong></div>
                                        </div>
                                    )}

                                    {/* QUICK SHOP-FLOOR ACTIONS */}
                                    <div className="rs-actions-panel">
                                        <h3>Quick Shop-Floor Operations</h3>

                                        <div className="rs-action-buttons-grid">
                                            {/* Action: Stock In */}
                                            <div className="rs-action-box">
                                                <div className="rs-box-header">
                                                    <Warehouse size={14} />
                                                    <span>Warehouse Stock-In</span>
                                                </div>
                                                <div className="rs-box-body">
                                                    <select
                                                        value={targetBay}
                                                        onChange={(e) => setTargetBay(e.target.value)}
                                                        disabled={updatingRoll}
                                                    >
                                                        {locations.map((loc) => (
                                                            <option key={loc.id} value={loc.location_code}>
                                                                {loc.location_code} ({loc.location_name})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        className="rs-btn-confirm"
                                                        onClick={handleSingleRollStockIn}
                                                        disabled={updatingRoll || activeRoll.status === "IN_WAREHOUSE"}
                                                    >
                                                        {activeRoll.status === "IN_WAREHOUSE" ? "Stocked in FG" : "Transfer to Bay"}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Action: QA Approval */}
                                            <div className="rs-action-box">
                                                <div className="rs-box-header">
                                                    <Award size={14} />
                                                    <span>QA Inspection Status</span>
                                                </div>
                                                <div className="rs-box-body">
                                                    <div className="rs-btn-group">
                                                        <button
                                                            type="button"
                                                            className={`rs-qa-btn ${activeRoll.grade === "GRADE_A" ? "active" : ""}`}
                                                            onClick={() => handleSingleRollUpdate("APPROVED", null, "GRADE_A")}
                                                            disabled={updatingRoll}
                                                        >
                                                            Pass Prime A
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`rs-qa-btn ${activeRoll.grade === "GRADE_B" ? "active" : ""}`}
                                                            onClick={() => handleSingleRollUpdate("APPROVED", null, "GRADE_B")}
                                                            disabled={updatingRoll}
                                                        >
                                                            Commercial B
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`rs-qa-btn scrap ${activeRoll.grade === "SCRAP" ? "active" : ""}`}
                                                            onClick={() => handleSingleRollUpdate("REJECTED", null, "SCRAP")}
                                                            disabled={updatingRoll}
                                                        >
                                                            Scrap
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action: Comprehensive Lab Inspection & COA */}
                                            <div className="rs-action-box">
                                                <div className="rs-box-header">
                                                    <ShieldCheck size={14} />
                                                    <span>Lab Testing & Certificate</span>
                                                </div>
                                                <div className="rs-box-body">
                                                    <button
                                                        type="button"
                                                        className="rs-btn-confirm"
                                                        style={{ background: "#0f172a", width: "100%" }}
                                                        onClick={() => navigate(`/quality/roll-inspection?roll=${encodeURIComponent(activeRoll.roll_number)}`)}
                                                    >
                                                        <ClipboardCheck size={13} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} /> Open Lab Test & COA
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="rs-profile-empty">
                                    <Barcode size={64} strokeWidth={1} color="#94a3b8" />
                                    <h3>Ready for Roll Barcode Scan</h3>
                                    <p>
                                        Point the camera at any PVC roll label tag, or scan with a USB barcode gun to view instant roll specs and execute warehouse actions.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* BATCH SCANNING WORKFLOW VIEW */}
                    {workflowMode === "batch" && (
                        <div className="rs-batch-card">
                            <div className="rs-batch-header">
                                <div>
                                    <h2>Active Batch Scan Queue</h2>
                                    <p>Scan multiple rolls in sequence for simultaneous warehouse inwarding or dispatching.</p>
                                </div>

                                {batchRolls.length > 0 && (
                                    <button
                                        type="button"
                                        className="rs-btn-clear"
                                        onClick={() => setBatchRolls([])}
                                    >
                                        <X size={13} /> Clear Batch
                                    </button>
                                )}
                            </div>

                            {/* BATCH KPI COUNTERS */}
                            <div className="rs-batch-kpis">
                                <div className="rs-kpi-item">
                                    <div className="rs-kpi-val">{batchMetrics.totalRolls}</div>
                                    <div className="rs-kpi-lbl">Scanned Rolls</div>
                                </div>
                                <div className="rs-kpi-item">
                                    <div className="rs-kpi-val">{batchMetrics.totalLength} m</div>
                                    <div className="rs-kpi-lbl">Total Length</div>
                                </div>
                                <div className="rs-kpi-item">
                                    <div className="rs-kpi-val">{batchMetrics.totalArea} m²</div>
                                    <div className="rs-kpi-lbl">{batchMetrics.totalAreaSqft} sq.ft</div>
                                </div>
                                <div className="rs-kpi-item">
                                    <div className="rs-kpi-val">{batchMetrics.totalWeight} kg</div>
                                    <div className="rs-kpi-lbl">Total Net Weight</div>
                                </div>
                            </div>

                            {/* BATCH ACTION BAR */}
                            {batchRolls.length > 0 && (
                                <div className="rs-batch-action-bar">
                                    <div className="rs-batch-select-wrap">
                                        <label>Destination Warehouse Bay:</label>
                                        <select
                                            value={batchTargetLocation}
                                            onChange={(e) => setBatchTargetLocation(e.target.value)}
                                            disabled={batchProcessing}
                                        >
                                            {locations.map((loc) => (
                                                <option key={loc.id} value={loc.location_code}>
                                                    {loc.location_code} ({loc.location_name})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        type="button"
                                        className="rs-btn-batch-submit"
                                        onClick={handleBatchStockIn}
                                        disabled={batchProcessing}
                                    >
                                        <Warehouse size={15} />
                                        <span>{batchProcessing ? "Stocking..." : `Stock In All ${batchRolls.length} Rolls`}</span>
                                    </button>
                                </div>
                            )}

                            {/* BATCH TABLE */}
                            <div className="rs-batch-table-wrap">
                                {batchRolls.length === 0 ? (
                                    <div className="rs-batch-empty">
                                        <Layers size={40} color="#94a3b8" />
                                        <p>Queue is empty. Start scanning rolls to populate this batch.</p>
                                    </div>
                                ) : (
                                    <table className="rs-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Roll Serial</th>
                                                <th>Product Spec</th>
                                                <th>Dimensions</th>
                                                <th>Area (m²)</th>
                                                <th>Net Wt (kg)</th>
                                                <th>Grade</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {batchRolls.map((roll, idx) => (
                                                <tr key={roll.id}>
                                                    <td>{idx + 1}</td>
                                                    <td>
                                                        <div className="rs-roll-pill">
                                                            <Barcode size={12} />
                                                            <span>{roll.roll_number}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <strong>{roll.product_name}</strong>
                                                        <div className="rs-subtext">PO: {roll.production_order_number}</div>
                                                    </td>
                                                    <td>{roll.width_m}m × {roll.length_m}m</td>
                                                    <td><strong>{roll.area_sqm} m²</strong></td>
                                                    <td>{roll.net_weight_kg || 0} kg</td>
                                                    <td>
                                                        <span className="rs-badge-grade grade_a">
                                                            {roll.grade === "GRADE_A" ? "Prime" : roll.grade}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="rs-btn-remove"
                                                            onClick={() => setBatchRolls((prev) => prev.filter((r) => r.id !== roll.id))}
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* =================================================
               MODAL: THERMAL PRINT LABEL TAG
            ================================================= */}
            {showLabelModal && activeRoll && (
                <div className="rs-modal-backdrop" onClick={(e) => e.target.classList.contains("rs-modal-backdrop") && setShowLabelModal(false)}>
                    <div className="rs-modal-card">
                        <div className="rs-modal-header no-print">
                            <div>
                                <div className="rs-eyebrow">THERMAL ROLL TAG</div>
                                <h2>Barcode Label Tag Preview</h2>
                            </div>
                            <div className="rs-modal-actions">
                                <button
                                    type="button"
                                    className="rs-btn-primary"
                                    onClick={() => window.print()}
                                >
                                    <Printer size={14} /> Print Tag
                                </button>
                                <button
                                    type="button"
                                    className="rs-btn-close"
                                    onClick={() => setShowLabelModal(false)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* PRINTABLE ROLL TAG */}
                        <div className="rs-label-sheet" id="printable-roll-tag">
                            <div className="rs-tag-header">
                                <div className="rs-tag-brand">RAINBOW POLYMERS</div>
                                <div className="rs-tag-spec">PVC CARPET ROLL IDENTIFIER</div>
                            </div>

                            <div className="rs-tag-barcode-block">
                                <div className="rs-barcode-stripes">
                                    {[1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 2, 1, 4, 3, 2, 1, 3, 2, 4, 1].map((w, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                width: `${w * 2.5}px`,
                                                backgroundColor: i % 2 === 0 ? "#000000" : "transparent",
                                                height: "65px",
                                                display: "inline-block"
                                            }}
                                        />
                                    ))}
                                </div>
                                <div className="rs-barcode-text">{activeRoll.roll_number}</div>
                            </div>

                            <div className="rs-tag-table">
                                <div className="rs-tag-row">
                                    <span>Product:</span>
                                    <strong>{activeRoll.product_name}</strong>
                                </div>
                                <div className="rs-tag-row">
                                    <span>Prod Order:</span>
                                    <strong>{activeRoll.production_order_number}</strong>
                                </div>
                                <div className="rs-tag-row">
                                    <span>Dimensions:</span>
                                    <strong>{activeRoll.width_m} m × {activeRoll.length_m} m ({activeRoll.area_sqm} m²)</strong>
                                </div>
                                <div className="rs-tag-row">
                                    <span>Net Weight:</span>
                                    <strong>{activeRoll.net_weight_kg || "—"} kg</strong>
                                </div>
                                <div className="rs-tag-row">
                                    <span>Quality Grade:</span>
                                    <strong>{activeRoll.grade === "GRADE_A" ? "Grade A Prime" : activeRoll.grade}</strong>
                                </div>
                                <div className="rs-tag-row">
                                    <span>Storage Bay:</span>
                                    <strong>{activeRoll.warehouse_location || "FG-BAY-01"}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
               STYLES
            ================================================= */}
            <style>{`
                .rs-page {
                    padding: 24px 32px;
                    max-width: 1680px;
                    margin: 0 auto;
                }

                .rs-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }

                .rs-eyebrow {
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    color: #4f46e5;
                    margin-bottom: 4px;
                }

                .rs-header-title h1 {
                    margin: 0 0 6px 0;
                    font-size: 26px;
                    font-weight: 800;
                    color: #0f172a;
                    letter-spacing: -0.02em;
                }

                .rs-header-title p {
                    margin: 0;
                    font-size: 13px;
                    color: #64748b;
                }

                .rs-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .rs-btn-toggle {
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    color: #475569;
                    padding: 8px 14px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }

                .rs-btn-toggle.active {
                    background: #f0fdf4;
                    border-color: #86efac;
                    color: #15803d;
                }

                .rs-btn-primary {
                    background: #4f46e5;
                    color: #ffffff;
                    border: none;
                    border-radius: 8px;
                    padding: 9px 16px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }

                .rs-btn-primary:hover {
                    background: #4338ca;
                }

                .rs-btn-secondary {
                    background: #ffffff;
                    color: #334155;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    padding: 8px 14px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }

                .rs-btn-secondary:hover {
                    background: #f8fafc;
                    border-color: #94a3b8;
                }

                .rs-spin {
                    animation: rsSpin 1s linear infinite;
                }

                @keyframes rsSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                /* Alerts */
                .rs-alert {
                    padding: 12px 16px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 13px;
                    font-weight: 500;
                }

                .rs-alert-success {
                    background: #ecfdf5;
                    color: #065f46;
                    border: 1px solid #a7f3d0;
                }

                .rs-alert-error {
                    background: #fef2f2;
                    color: #991b1b;
                    border: 1px solid #fecaca;
                }

                /* Mode Selector Bar */
                .rs-mode-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 8px 16px;
                    margin-bottom: 20px;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .rs-pill-group {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .rs-pill-lbl {
                    font-size: 11px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    margin-right: 4px;
                }

                .rs-pill-btn {
                    padding: 6px 12px;
                    border-radius: 6px;
                    border: 1px solid transparent;
                    background: #f8fafc;
                    color: #475569;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s ease;
                }

                .rs-pill-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }

                .rs-pill-btn.active {
                    background: #4f46e5;
                    color: #ffffff;
                }

                /* 2-Column Grid */
                .rs-grid {
                    display: grid;
                    grid-template-columns: 460px 1fr;
                    gap: 20px;
                    align-items: flex-start;
                }

                @media (max-width: 1024px) {
                    .rs-grid {
                        grid-template-columns: 1fr;
                    }
                }

                /* Scanner Card (Left) */
                .rs-scanner-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.03);
                }

                .rs-card-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .rs-card-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    font-weight: 700;
                    color: #0f172a;
                }

                .rs-status-chip {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #059669;
                    background: #ecfdf5;
                    padding: 3px 8px;
                    border-radius: 999px;
                    border: 1px solid #a7f3d0;
                }

                .rs-pulse-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #10b981;
                    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
                }

                .rs-card-body {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                /* Camera Viewfinder */
                .rs-camera-container {
                    position: relative;
                    border-radius: 10px;
                    overflow: hidden;
                    background: #0f172a;
                    border: 1px solid #334155;
                }

                .rs-camera-view {
                    width: 100% !important;
                    min-height: 240px;
                }

                .rs-camera-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.85);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #ffffff;
                    padding: 20px;
                    text-align: center;
                    gap: 10px;
                }

                .rs-camera-overlay.error {
                    color: #fca5a5;
                }

                .rs-camera-hint {
                    padding: 10px 14px;
                    background: #1e293b;
                    color: #94a3b8;
                    font-size: 11px;
                    text-align: center;
                    border-top: 1px solid #334155;
                }

                .rs-camera-hint code {
                    color: #38bdf8;
                    font-family: ui-monospace, monospace;
                    font-weight: 700;
                }

                .rs-spinner {
                    width: 28px;
                    height: 28px;
                    border: 3px solid rgba(255, 255, 255, 0.2);
                    border-top-color: #ffffff;
                    border-radius: 50%;
                    animation: rsSpin 0.8s linear infinite;
                }

                /* Input Form */
                .rs-input-form {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .rs-input-form label {
                    font-size: 11px;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                }

                .rs-input-row {
                    display: flex;
                    gap: 8px;
                }

                .rs-input-wrap {
                    position: relative;
                    flex: 1;
                    display: flex;
                    align-items: center;
                }

                .rs-field-icon {
                    position: absolute;
                    left: 10px;
                    color: #94a3b8;
                    pointer-events: none;
                }

                .rs-input-wrap input {
                    width: 100%;
                    height: 40px;
                    padding: 0 12px 0 36px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 13px;
                    font-family: ui-monospace, monospace;
                    color: #0f172a;
                    outline: none;
                    background: #ffffff;
                }

                .rs-input-wrap input:focus {
                    border-color: #4f46e5;
                    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
                }

                /* Quick Samples */
                .rs-quick-samples {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 11px;
                    color: #64748b;
                    flex-wrap: wrap;
                }

                .rs-sample-pills {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                }

                .rs-sample-pill {
                    padding: 3px 8px;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                    font-size: 10px;
                    font-family: ui-monospace, monospace;
                    font-weight: 600;
                    color: #1e40af;
                    cursor: pointer;
                }

                .rs-sample-pill:hover {
                    background: #e2e8f0;
                }

                /* Profile Card (Right - Single) */
                .rs-profile-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.03);
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .rs-profile-empty {
                    text-align: center;
                    padding: 60px 20px;
                    color: #64748b;
                }

                .rs-profile-empty h3 {
                    margin: 12px 0 6px 0;
                    font-size: 17px;
                    color: #0f172a;
                }

                .rs-profile-empty p {
                    margin: 0 auto;
                    font-size: 13px;
                    max-width: 440px;
                }

                .rs-profile-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    border-bottom: 1px solid #f1f5f9;
                    padding-bottom: 18px;
                    gap: 16px;
                }

                .rs-roll-header-top {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                    flex-wrap: wrap;
                }

                .rs-roll-hero-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    font-family: ui-monospace, monospace;
                    font-size: 16px;
                    font-weight: 800;
                    color: #1e40af;
                    background: #eff6ff;
                    padding: 6px 12px;
                    border-radius: 8px;
                    border: 1px solid #bfdbfe;
                }

                .rs-badge-grade {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 700;
                }

                .rs-badge-grade.grade_a { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
                .rs-badge-grade.grade_b { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
                .rs-badge-grade.scrap { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

                .rs-badge-status {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: capitalize;
                }

                .rs-badge-status.produced { background: #e0f2fe; color: #0369a1; }
                .rs-badge-status.in_warehouse { background: #f3e8ff; color: #6b21a8; }
                .rs-badge-status.dispatched { background: #f1f5f9; color: #475569; }

                .rs-profile-header h2 {
                    margin: 0 0 6px 0;
                    font-size: 20px;
                    font-weight: 800;
                    color: #0f172a;
                }

                .rs-product-subtags {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex-wrap: wrap;
                }

                .rs-subtag {
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 11px;
                    padding: 2px 7px;
                    border-radius: 4px;
                    font-weight: 600;
                }

                .rs-btn-action-tag {
                    background: #eef2ff;
                    color: #4338ca;
                    border: 1px solid #c7d2fe;
                    padding: 7px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }

                .rs-btn-action-tag:hover {
                    background: #e0e7ff;
                }

                /* Specs Grid */
                .rs-specs-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 14px;
                }

                .rs-spec-tile {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 12px 14px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .rs-tile-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #4f46e5;
                    flex-shrink: 0;
                }

                .rs-tile-val {
                    font-size: 14px;
                    font-weight: 800;
                    color: #0f172a;
                }

                .rs-tile-lbl {
                    font-size: 10px;
                    color: #64748b;
                    font-weight: 600;
                }

                .rs-dispatch-banner {
                    background: #f0f9ff;
                    border: 1px solid #bae6fd;
                    border-radius: 8px;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #0369a1;
                    font-size: 12px;
                }

                .rs-defect-banner {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    padding: 10px 14px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #991b1b;
                    font-size: 12px;
                }

                /* Actions Panel */
                .rs-actions-panel h3 {
                    margin: 0 0 12px 0;
                    font-size: 13px;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .rs-action-buttons-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                @media (max-width: 640px) {
                    .rs-action-buttons-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .rs-action-box {
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #ffffff;
                }

                .rs-box-header {
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    padding: 8px 12px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #475569;
                }

                .rs-box-body {
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .rs-box-body select {
                    height: 34px;
                    padding: 0 10px;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    font-size: 12px;
                    color: #0f172a;
                    background: #ffffff;
                }

                .rs-btn-confirm {
                    background: #4f46e5;
                    color: #ffffff;
                    border: none;
                    border-radius: 6px;
                    height: 34px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .rs-btn-confirm:hover {
                    background: #4338ca;
                }

                .rs-btn-group {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 6px;
                }

                .rs-qa-btn {
                    padding: 8px 4px;
                    border: 1px solid #cbd5e1;
                    background: #ffffff;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    color: #334155;
                }

                .rs-qa-btn.active {
                    background: #ecfdf5;
                    border-color: #10b981;
                    color: #065f46;
                }

                .rs-qa-btn.scrap {
                    color: #b91c1c;
                }

                .rs-qa-btn.scrap.active {
                    background: #fef2f2;
                    border-color: #ef4444;
                }

                /* Batch Card */
                .rs-batch-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.03);
                    padding: 20px 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .rs-batch-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .rs-batch-header h2 {
                    margin: 0 0 4px 0;
                    font-size: 17px;
                    font-weight: 700;
                    color: #0f172a;
                }

                .rs-batch-header p {
                    margin: 0;
                    font-size: 12px;
                    color: #64748b;
                }

                .rs-btn-clear {
                    background: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    color: #64748b;
                    padding: 5px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }

                .rs-batch-kpis {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 12px 16px;
                }

                .rs-kpi-item {
                    text-align: center;
                }

                .rs-kpi-val {
                    font-size: 18px;
                    font-weight: 800;
                    color: #0f172a;
                }

                .rs-kpi-lbl {
                    font-size: 10px;
                    color: #64748b;
                    font-weight: 600;
                }

                .rs-batch-action-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #eef2ff;
                    border: 1px solid #c7d2fe;
                    border-radius: 8px;
                    padding: 10px 16px;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .rs-batch-select-wrap {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;
                    color: #334155;
                    font-weight: 600;
                }

                .rs-batch-select-wrap select {
                    height: 32px;
                    border-radius: 6px;
                    border: 1px solid #c7d2fe;
                    padding: 0 8px;
                    font-size: 12px;
                }

                .rs-btn-batch-submit {
                    background: #4f46e5;
                    color: #ffffff;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 14px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }

                .rs-btn-batch-submit:hover {
                    background: #4338ca;
                }

                .rs-batch-table-wrap {
                    overflow-x: auto;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                }

                .rs-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }

                .rs-table th {
                    background: #f8fafc;
                    padding: 10px 12px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    border-bottom: 1px solid #e2e8f0;
                    text-align: left;
                }

                .rs-table td {
                    padding: 10px 12px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #1e293b;
                }

                .rs-roll-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-family: ui-monospace, monospace;
                    font-size: 11px;
                    font-weight: 700;
                    color: #1e40af;
                    background: #eff6ff;
                    padding: 3px 6px;
                    border-radius: 4px;
                    border: 1px solid #bfdbfe;
                }

                .rs-btn-remove {
                    background: transparent;
                    border: none;
                    color: #ef4444;
                    cursor: pointer;
                    padding: 2px 4px;
                    border-radius: 4px;
                }

                .rs-btn-remove:hover {
                    background: #fee2e2;
                }

                .rs-batch-empty {
                    text-align: center;
                    padding: 40px 20px;
                    color: #94a3b8;
                    font-size: 12px;
                }

                /* Thermal Label Modal */
                .rs-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999;
                    padding: 20px;
                }

                .rs-modal-card {
                    background: #ffffff;
                    border-radius: 14px;
                    width: 100%;
                    max-width: 440px;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                }

                .rs-modal-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .rs-modal-header h2 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 700;
                }

                .rs-modal-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .rs-btn-close {
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 4px;
                }

                /* Thermal Label Sheet */
                .rs-label-sheet {
                    padding: 24px;
                    background: #ffffff;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
                    border: 2px solid #000000;
                    margin: 20px;
                    border-radius: 8px;
                }

                .rs-tag-header {
                    text-align: center;
                    border-bottom: 2px solid #000000;
                    padding-bottom: 10px;
                    margin-bottom: 12px;
                }

                .rs-tag-brand {
                    font-size: 18px;
                    font-weight: 900;
                    letter-spacing: 0.05em;
                }

                .rs-tag-spec {
                    font-size: 10px;
                    font-weight: 700;
                    color: #475569;
                }

                .rs-tag-barcode-block {
                    text-align: center;
                    margin-bottom: 14px;
                    padding: 6px;
                    border: 1px dashed #cbd5e1;
                    border-radius: 6px;
                }

                .rs-barcode-text {
                    font-family: ui-monospace, monospace;
                    font-size: 15px;
                    font-weight: 800;
                    letter-spacing: 0.1em;
                    margin-top: 4px;
                }

                .rs-tag-table {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    font-size: 12px;
                    border-top: 1px solid #000000;
                    padding-top: 10px;
                }

                .rs-tag-row {
                    display: flex;
                    justify-content: space-between;
                }

                .rs-tag-row span {
                    color: #64748b;
                }

                .rs-tag-row strong {
                    color: #000000;
                }

                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-roll-tag, #printable-roll-tag * {
                        visibility: visible;
                    }
                    #printable-roll-tag {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100mm;
                        padding: 10mm;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
