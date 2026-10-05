import React, { useState, useRef } from "react";
import { Download, Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, FileDown } from "lucide-react";
import api from "../services/api";
import "./ExcelToolbar.css";

/**
 * ExcelToolbar – Reusable Excel Import / Export component.
 *
 * Props:
 *   moduleName   – backend module key (e.g. "customers", "products", "raw_materials")
 *   displayName  – human-readable label (e.g. "Customers")
 *   onImportDone – callback after successful import (to refresh the list)
 *   importable   – (default true) set false to hide Import button for read-only modules
 */
const ExcelToolbar = ({
    moduleName,
    displayName = "Data",
    onImportDone,
    importable = true
}) => {
    const [showImportModal, setShowImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [importError, setImportError] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    // ============================
    // EXPORT
    // ============================
    const handleExport = async () => {
        try {
            setExporting(true);
            const response = await api.get(`/excel/export/${moduleName}`, {
                responseType: "blob"
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            const timestamp = new Date().toISOString().slice(0, 10);
            link.setAttribute("download", `${moduleName}_export_${timestamp}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export error:", err);
            alert("Failed to export data. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    // ============================
    // DOWNLOAD TEMPLATE
    // ============================
    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get(`/excel/template/${moduleName}`, {
                responseType: "blob"
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${moduleName}_template.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Template download error:", err);
        }
    };

    // ============================
    // IMPORT
    // ============================
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setImportError("");
            setImportResult(null);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) {
            setImportError("Please select a file first.");
            return;
        }

        try {
            setImporting(true);
            setImportError("");
            setImportResult(null);

            const formData = new FormData();
            formData.append("file", selectedFile);

            const response = await api.post(`/excel/import/${moduleName}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (response.data?.success) {
                setImportResult(response.data);
                if (onImportDone) onImportDone();
            } else {
                setImportError(response.data?.message || "Import failed.");
            }

        } catch (err) {
            console.error("Import error:", err);
            setImportError(
                err.response?.data?.message || "Failed to import file. Please check the format."
            );
        } finally {
            setImporting(false);
        }
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setSelectedFile(null);
        setImportResult(null);
        setImportError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <>
            {/* ============================
                BUTTONS (inline in parent toolbar)
            ============================ */}
            <div className="excel-toolbar-buttons">
                <button
                    className="excel-btn excel-export-btn"
                    onClick={handleExport}
                    disabled={exporting}
                    title={`Export ${displayName} to Excel`}
                    type="button"
                >
                    <Download size={15} />
                    {exporting ? "Exporting…" : "Export"}
                </button>

                {importable && (
                    <button
                        className="excel-btn excel-import-btn"
                        onClick={() => setShowImportModal(true)}
                        title={`Import ${displayName} from Excel`}
                        type="button"
                    >
                        <Upload size={15} />
                        Import
                    </button>
                )}
            </div>

            {/* ============================
                IMPORT MODAL
            ============================ */}
            {showImportModal && (
                <div className="excel-modal-overlay" onClick={closeImportModal}>
                    <div className="excel-modal" onClick={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <div className="excel-modal-header">
                            <div className="excel-modal-title">
                                <FileSpreadsheet size={22} />
                                <div>
                                    <h3>Import {displayName}</h3>
                                    <p>Upload an Excel file (.xlsx) to import data</p>
                                </div>
                            </div>
                            <button
                                className="excel-modal-close"
                                onClick={closeImportModal}
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="excel-modal-body">

                            {/* Template Download */}
                            <div className="excel-template-hint">
                                <FileDown size={16} />
                                <span>
                                    Need the right format?{" "}
                                    <button
                                        type="button"
                                        className="excel-template-link"
                                        onClick={handleDownloadTemplate}
                                    >
                                        Download blank template
                                    </button>
                                </span>
                            </div>

                            {/* File Input */}
                            <div className="excel-file-zone">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileSelect}
                                    id={`excel-file-${moduleName}`}
                                    className="excel-file-input"
                                />
                                <label htmlFor={`excel-file-${moduleName}`} className="excel-file-label">
                                    <Upload size={28} strokeWidth={1.5} />
                                    {selectedFile ? (
                                        <div className="excel-file-selected">
                                            <strong>{selectedFile.name}</strong>
                                            <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                    ) : (
                                        <div className="excel-file-placeholder">
                                            <strong>Click to select Excel file</strong>
                                            <span>or drag and drop here (.xlsx only)</span>
                                        </div>
                                    )}
                                </label>
                            </div>

                            {/* Error */}
                            {importError && (
                                <div className="excel-alert excel-alert-error">
                                    <AlertCircle size={16} />
                                    <span>{importError}</span>
                                </div>
                            )}

                            {/* Success Result */}
                            {importResult && (
                                <div className="excel-import-result">
                                    <div className="excel-alert excel-alert-success">
                                        <CheckCircle2 size={16} />
                                        <span>{importResult.message}</span>
                                    </div>

                                    <div className="excel-result-stats">
                                        <div className="excel-result-stat">
                                            <span className="stat-num green">{importResult.summary?.inserted || 0}</span>
                                            <span className="stat-label">Inserted</span>
                                        </div>
                                        <div className="excel-result-stat">
                                            <span className="stat-num blue">{importResult.summary?.updated || 0}</span>
                                            <span className="stat-label">Updated</span>
                                        </div>
                                        <div className="excel-result-stat">
                                            <span className="stat-num amber">{importResult.summary?.skipped || 0}</span>
                                            <span className="stat-label">Skipped</span>
                                        </div>
                                    </div>

                                    {importResult.errors?.length > 0 && (
                                        <div className="excel-error-list">
                                            <strong>Row Errors:</strong>
                                            <ul>
                                                {importResult.errors.map((e, i) => (
                                                    <li key={i}>{e}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="excel-modal-footer">
                            <button
                                type="button"
                                className="excel-btn excel-btn-cancel"
                                onClick={closeImportModal}
                            >
                                {importResult ? "Close" : "Cancel"}
                            </button>

                            {!importResult && (
                                <button
                                    type="button"
                                    className="excel-btn excel-btn-import"
                                    onClick={handleImport}
                                    disabled={importing || !selectedFile}
                                >
                                    <Upload size={15} />
                                    {importing ? "Importing…" : "Start Import"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ExcelToolbar;
