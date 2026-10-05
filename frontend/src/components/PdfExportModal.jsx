import React, { useState } from "react";
import {
    FileDown,
    Printer,
    X,
    Maximize2,
    Sliders,
    FileText,
    Check,
    ArrowRight,
    Sparkles,
    Layout,
    RotateCw
} from "lucide-react";
import "./PdfExportModal.css";
import { API_BASE_URL as API_BASE } from "../services/api";

/**
 * Universal Industrial PDF Export & Page Format Customizer
 * Allows instant selection of Paper Size (A4, A5, Letter) and Orientation (Portrait, Landscape)
 * Auto-adjusts proportions, scales, and typography seamlessly.
 */
export default function PdfExportModal({
    isOpen,
    onClose,
    documentType = "challan", // "challan" | "gatepass" | "grn"
    documentId,
    documentTitle = "Document",
    documentRef = ""
}) {
    const [selectedSize, setSelectedSize] = useState("A4");
    const [selectedOrientation, setSelectedOrientation] = useState("portrait");
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen || !documentId) return null;

    // Build the dynamic PDF endpoint URL
    const getPdfUrl = () => {
        let endpoint = documentType || "challan";
        if (documentType === "gatepass") endpoint = "gatepass";
        else if (documentType === "grn") endpoint = "grn";
        else if (documentType === "production-order") endpoint = "production-order";
        else if (documentType === "sales-order") endpoint = "sales-order";

        return `${API_BASE}/pdf/${endpoint}/${documentId}?pageSize=${selectedSize}&size=${selectedSize}&orientation=${selectedOrientation}`;
    };

    const handleOpenInNewTab = () => {
        setIsGenerating(true);
        const url = getPdfUrl();
        window.open(url, "_blank");
        setTimeout(() => setIsGenerating(false), 800);
    };

    const handleDirectDownload = () => {
        setIsGenerating(true);
        const url = getPdfUrl();
        const link = document.createElement("a");
        link.href = url;
        link.download = `${documentType.toUpperCase()}_${documentRef || documentId}_${selectedSize}_${selectedOrientation}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setIsGenerating(false), 800);
    };

    return (
        <div className="pdf-modal-backdrop" onClick={(e) => e.target.classList.contains("pdf-modal-backdrop") && onClose()}>
            <div className="pdf-modal-card">
                {/* Modal Header */}
                <div className="pdf-modal-header">
                    <div className="pdf-modal-title-group">
                        <div className="pdf-badge">
                            <Sliders size={13} />
                            <span>AUTO-ADJUSTING PDF ENGINE</span>
                        </div>
                        <h3>Configure Document Page Format</h3>
                        <p>
                            {documentTitle} {documentRef && <strong>({documentRef})</strong>}
                        </p>
                    </div>
                    <button type="button" className="pdf-close-btn" onClick={onClose} title="Close">
                        <X size={18} />
                    </button>
                </div>

                <div className="pdf-modal-body">
                    {/* Left Column: Form Controls */}
                    <div className="pdf-controls-column">
                        {/* 1. Paper Size Selector */}
                        <div className="pdf-section">
                            <label className="pdf-section-label">
                                <span>1. Select Physical Paper Size</span>
                                <small className="hint">Scales fonts & margins automatically</small>
                            </label>
                            <div className="pdf-size-grid">
                                <button
                                    type="button"
                                    className={`pdf-choice-card ${selectedSize === "A4" ? "active" : ""}`}
                                    onClick={() => setSelectedSize("A4")}
                                >
                                    <div className="card-top">
                                        <span className="card-name">A4</span>
                                        {selectedSize === "A4" && <Check size={14} className="check-icon" />}
                                    </div>
                                    <span className="card-desc">210 × 297 mm</span>
                                    <span className="card-tag">Official Full Sheet</span>
                                </button>

                                <button
                                    type="button"
                                    className={`pdf-choice-card ${selectedSize === "A5" ? "active" : ""}`}
                                    onClick={() => setSelectedSize("A5")}
                                >
                                    <div className="card-top">
                                        <span className="card-name">A5</span>
                                        {selectedSize === "A5" && <Check size={14} className="check-icon" />}
                                    </div>
                                    <span className="card-desc">148 × 210 mm</span>
                                    <span className="card-tag highlight">Gate Pass / Voucher</span>
                                </button>

                                <button
                                    type="button"
                                    className={`pdf-choice-card ${selectedSize === "LETTER" ? "active" : ""}`}
                                    onClick={() => setSelectedSize("LETTER")}
                                >
                                    <div className="card-top">
                                        <span className="card-name">Letter</span>
                                        {selectedSize === "LETTER" && <Check size={14} className="check-icon" />}
                                    </div>
                                    <span className="card-desc">8.5 × 11 in</span>
                                    <span className="card-tag">US Export Standard</span>
                                </button>
                            </div>
                        </div>

                        {/* 2. Orientation Selector */}
                        <div className="pdf-section">
                            <label className="pdf-section-label">
                                <span>2. Select Document Orientation</span>
                                <small className="hint">Adjusts columns & margins</small>
                            </label>
                            <div className="pdf-orientation-grid">
                                <button
                                    type="button"
                                    className={`pdf-choice-pill ${selectedOrientation === "portrait" ? "active" : ""}`}
                                    onClick={() => setSelectedOrientation("portrait")}
                                >
                                    <Layout size={15} />
                                    <span>Portrait (Vertical Standard)</span>
                                    {selectedOrientation === "portrait" && <Check size={14} />}
                                </button>

                                <button
                                    type="button"
                                    className={`pdf-choice-pill ${selectedOrientation === "landscape" ? "active" : ""}`}
                                    onClick={() => setSelectedOrientation("landscape")}
                                >
                                    <RotateCw size={15} />
                                    <span>Landscape (Horizontal Wide)</span>
                                    {selectedOrientation === "landscape" && <Check size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Notice info banner */}
                        <div className="pdf-notice-box">
                            <Sparkles size={16} className="notice-icon" />
                            <div>
                                <strong>Automatic Dynamic Formatting Active:</strong>
                                <p>
                                    When you select <strong>{selectedSize} ({selectedOrientation})</strong>, the vector engine recalibrates margins, table row heights, and font scaling so the document prints crisp with zero cut-off.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Live Wireframe Preview */}
                    <div className="pdf-preview-column">
                        <div className="pdf-wireframe-wrap">
                            <div className="wireframe-header">
                                <span>LIVE PROPORTION WIREFRAME</span>
                                <strong>{selectedSize} • {selectedOrientation.toUpperCase()}</strong>
                            </div>

                            {/* Simulated Paper Aspect Ratio */}
                            <div className="wireframe-paper-stage">
                                <div className={`wireframe-sheet ${selectedSize.toLowerCase()} ${selectedOrientation}`}>
                                    <div className="wf-top-strip"></div>
                                    <div className="wf-title-line"></div>
                                    <div className="wf-subtitle-line"></div>
                                    
                                    <div className="wf-grid-two">
                                        <div className="wf-box">
                                            <div className="wf-subline"></div>
                                            <div className="wf-subline w75"></div>
                                            <div className="wf-subline w50"></div>
                                        </div>
                                        <div className="wf-box">
                                            <div className="wf-subline"></div>
                                            <div className="wf-subline w75"></div>
                                            <div className="wf-subline w50"></div>
                                        </div>
                                    </div>

                                    <div className="wf-table">
                                        <div className="wf-table-header"></div>
                                        <div className="wf-table-row"></div>
                                        <div className="wf-table-row alt"></div>
                                        <div className="wf-table-row"></div>
                                        <div className="wf-table-total"></div>
                                    </div>

                                    <div className="wf-bottom-sigs">
                                        <div className="wf-sig"></div>
                                        <div className="wf-sig"></div>
                                        <div className="wf-sig"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pdf-modal-footer">
                    <button type="button" className="pdf-cancel-btn" onClick={onClose}>
                        Cancel
                    </button>
                    <div className="pdf-action-group">
                        <button
                            type="button"
                            className="pdf-secondary-action-btn"
                            onClick={handleOpenInNewTab}
                            disabled={isGenerating}
                        >
                            <Printer size={15} />
                            <span>Preview / Print in Browser</span>
                        </button>
                        <button
                            type="button"
                            className="pdf-primary-action-btn"
                            onClick={handleDirectDownload}
                            disabled={isGenerating}
                        >
                            <FileDown size={15} />
                            <span>Download Auto-Adjusted PDF ({selectedSize})</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
