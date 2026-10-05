import React, { useState, useEffect, useMemo } from "react";
import {
    FileCheck,
    ClipboardList,
    Scale,
    Layers,
    Search,
    Filter,
    Plus,
    Trash2,
    Printer,
    X,
    RefreshCw,
    CheckCircle2,
    Clock,
    AlertCircle,
    Building2,
    Calendar,
    Eye,
    Truck,
    Check,
    ArrowDownToLine,
    ShieldCheck,
    FileText,
    Boxes,
    FileDown
} from "lucide-react";
import "./MaterialReceipt.css";
import ExcelToolbar from "../components/ExcelToolbar";
import PdfExportModal from "../components/PdfExportModal";
import { API_BASE_URL as API_BASE, authFetch } from "../services/api";

export default function MaterialReceipt() {
    // Tabs: "list" or "new"
    const [activeTab, setActiveTab] = useState("list");

    // Data states
    const [receipts, setReceipts] = useState([]);
    const [stats, setStats] = useState({
        total_grns: 0,
        total_received_kg: "0.00",
        total_received_mt: "0.00",
        total_inward_value_inr: "0.00",
        pending_qc_count: 0,
        active_suppliers_count: 0
    });
    const [suppliers, setSuppliers] = useState([]);
    const [materials, setMaterials] = useState([]);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // List Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // Modal: Printable GRN
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [loadingReceiptDetails, setLoadingReceiptDetails] = useState(false);

    // Modal: Auto-adjusting PDF Export Format Customizer
    const [pdfConfigModal, setPdfConfigModal] = useState({
        isOpen: false,
        documentId: null,
        documentTitle: "",
        documentRef: ""
    });

    const handleOpenPdfModal = (receiptId, grnNumber) => {
        setPdfConfigModal({
            isOpen: true,
            documentId: receiptId,
            documentTitle: "Inward Goods Receipt Note (GRN)",
            documentRef: grnNumber
        });
    };

    // Form State for New Inward GRN
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [formData, setFormData] = useState({
        receipt_date: new Date().toISOString().slice(0, 10),
        invoice_number: "",
        invoice_date: new Date().toISOString().slice(0, 10),
        supplier_challan_no: "",
        vehicle_number: "",
        transporter_name: "Gujarat Freight Carriers",
        lr_number: "",
        weighbridge_gross_kg: "",
        weighbridge_tare_kg: "",
        store_location: "RAW-WH-BAY-01",
        status: "APPROVED",
        remarks: ""
    });

    const [items, setItems] = useState([
        {
            material_id: "",
            package_type: "BAGS",
            number_of_packages: "",
            received_quantity: "",
            rate: "",
            batch_number: "",
            supplier_batch_number: "",
            moisture_pct: "0.15",
            coa_attached: true
        }
    ]);

    // Fetch initial data
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([
                fetchReceipts(),
                fetchStats(),
                fetchSuppliers(),
                fetchMaterials()
            ]);
        } catch (err) {
            console.error("Error loading initial data:", err);
            setError("Failed to load inventory receipt records. Please check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    const fetchReceipts = async () => {
        const res = await authFetch(`${API_BASE}/material-receipts`);
        const json = await res.json();
        if (json.success) {
            setReceipts(json.data || []);
        }
    };

    const fetchStats = async () => {
        const res = await authFetch(`${API_BASE}/material-receipts/stats`);
        const json = await res.json();
        if (json.success) {
            setStats(json.data || {});
        }
    };

    const fetchSuppliers = async () => {
        const res = await authFetch(`${API_BASE}/material-receipts/suppliers`);
        const json = await res.json();
        if (json.success) {
            setSuppliers(json.data || []);
        }
    };

    const fetchMaterials = async () => {
        const res = await authFetch(`${API_BASE}/raw-materials`);
        const json = await res.json();
        if (json.success) {
            setMaterials(json.data || []);
        }
    };

    // Selected supplier details
    const selectedSupplier = useMemo(() => {
        return suppliers.find((s) => String(s.id) === String(selectedSupplierId)) || null;
    }, [suppliers, selectedSupplierId]);

    // Live Weighbridge Net Weight calculation
    const weighbridgeNetKg = useMemo(() => {
        const gross = parseFloat(formData.weighbridge_gross_kg) || 0;
        const tare = parseFloat(formData.weighbridge_tare_kg) || 0;
        return Math.max(0, gross - tare);
    }, [formData.weighbridge_gross_kg, formData.weighbridge_tare_kg]);

    // Live Items Total Calculation
    const { totalItemsQty, totalItemsValuation } = useMemo(() => {
        let totalQty = 0;
        let totalVal = 0;
        items.forEach((it) => {
            const qty = parseFloat(it.received_quantity) || 0;
            const rate = parseFloat(it.rate) || 0;
            totalQty += qty;
            totalVal += qty * rate;
        });
        return { totalItemsQty: totalQty, totalItemsValuation: totalVal };
    }, [items]);

    // Filtered receipts
    const filteredReceipts = useMemo(() => {
        return receipts.filter((r) => {
            const q = searchQuery.toLowerCase().trim();
            const matchesQuery =
                !q ||
                (r.grn_number && r.grn_number.toLowerCase().includes(q)) ||
                (r.supplier_name && r.supplier_name.toLowerCase().includes(q)) ||
                (r.invoice_number && r.invoice_number.toLowerCase().includes(q)) ||
                (r.vehicle_number && r.vehicle_number.toLowerCase().includes(q)) ||
                (r.lr_number && r.lr_number.toLowerCase().includes(q));

            const matchesStatus = !statusFilter || r.status === statusFilter;

            return matchesQuery && matchesStatus;
        });
    }, [receipts, searchQuery, statusFilter]);

    // Item row helpers
    const handleItemChange = (index, field, value) => {
        setItems((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };

            // If material_id selected, auto-fill unit rate if known
            if (field === "material_id") {
                const mat = materials.find((m) => String(m.id) === String(value));
                if (mat && mat.standard_cost) {
                    updated[index].rate = mat.standard_cost;
                }
            }
            return updated;
        });
    };

    const handleAddItemRow = () => {
        setItems((prev) => [
            ...prev,
            {
                material_id: "",
                package_type: "BAGS",
                number_of_packages: "",
                received_quantity: "",
                rate: "",
                batch_number: "",
                supplier_batch_number: "",
                moisture_pct: "0.15",
                coa_attached: true
            }
        ]);
    };

    const handleRemoveItemRow = (index) => {
        if (items.length === 1) return;
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    // Open Single GRN Modal
    const handleViewGRN = async (id) => {
        setLoadingReceiptDetails(true);
        try {
            const res = await authFetch(`${API_BASE}/material-receipts/${id}`);
            const json = await res.json();
            if (json.success) {
                setSelectedReceipt(json.data);
            } else {
                setError(json.message || "Failed to load GRN details");
            }
        } catch (err) {
            console.error("View GRN error:", err);
            setError("Could not fetch GRN details.");
        } finally {
            setLoadingReceiptDetails(false);
        }
    };

    // Form Submission
    const handleSubmitGRN = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!selectedSupplierId) {
            setError("Please select the chemical supplier from the master list.");
            return;
        }

        if (!formData.invoice_number.trim()) {
            setError("Supplier Tax Invoice Number is required.");
            return;
        }

        // Validate items
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.material_id) {
                setError(`Please select a raw material for Row #${i + 1}.`);
                return;
            }
            if (!item.received_quantity || parseFloat(item.received_quantity) <= 0) {
                setError(`Please enter a valid received quantity for Row #${i + 1}.`);
                return;
            }
            if (!item.rate || parseFloat(item.rate) <= 0) {
                setError(`Please enter purchase rate (₹) for Row #${i + 1}.`);
                return;
            }
        }

        const payload = {
            supplier_id: parseInt(selectedSupplierId, 10),
            receipt_date: formData.receipt_date,
            invoice_number: formData.invoice_number.trim(),
            invoice_date: formData.invoice_date,
            supplier_challan_no: formData.supplier_challan_no.trim(),
            vehicle_number: formData.vehicle_number.trim().toUpperCase() || "DIRECT",
            transporter_name: formData.transporter_name.trim(),
            lr_number: formData.lr_number.trim(),
            weighbridge_gross_kg: parseFloat(formData.weighbridge_gross_kg) || 0,
            weighbridge_tare_kg: parseFloat(formData.weighbridge_tare_kg) || 0,
            total_packages: items.reduce((acc, it) => acc + (parseInt(it.number_of_packages, 10) || 0), 0),
            store_location: formData.store_location,
            status: formData.status,
            remarks: formData.remarks.trim(),
            items: items.map((it) => ({
                material_id: parseInt(it.material_id, 10),
                package_type: it.package_type,
                number_of_packages: parseInt(it.number_of_packages, 10) || 0,
                received_quantity: parseFloat(it.received_quantity) || 0,
                rate: parseFloat(it.rate) || 0,
                batch_number: it.batch_number.trim() || undefined,
                supplier_batch_number: it.supplier_batch_number.trim() || undefined,
                moisture_pct: parseFloat(it.moisture_pct) || 0.10,
                coa_attached: Boolean(it.coa_attached),
                qc_status: formData.status === "APPROVED" ? "APPROVED" : "QC_PENDING"
            }))
        };

        setSubmitting(true);
        try {
            const res = await authFetch(`${API_BASE}/material-receipts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                setSuccessMessage(`Goods Receipt Note ${data.data.grn_number} created and inventory updated!`);
                // Reset form
                setFormData({
                    receipt_date: new Date().toISOString().slice(0, 10),
                    invoice_number: "",
                    invoice_date: new Date().toISOString().slice(0, 10),
                    supplier_challan_no: "",
                    vehicle_number: "",
                    transporter_name: "Gujarat Freight Carriers",
                    lr_number: "",
                    weighbridge_gross_kg: "",
                    weighbridge_tare_kg: "",
                    store_location: "RAW-WH-BAY-01",
                    status: "APPROVED",
                    remarks: ""
                });
                setSelectedSupplierId("");
                setItems([
                    {
                        material_id: "",
                        package_type: "BAGS",
                        number_of_packages: "",
                        received_quantity: "",
                        rate: "",
                        batch_number: "",
                        supplier_batch_number: "",
                        moisture_pct: "0.15",
                        coa_attached: true
                    }
                ]);

                // Reload data and switch to list tab
                await Promise.all([fetchReceipts(), fetchStats()]);
                setActiveTab("list");
            } else {
                setError(data.message || "Failed to record material receipt");
            }
        } catch (err) {
            console.error("Create receipt error:", err);
            setError("Server error while recording receipt. Check network connection.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mr-page">
            {/* =========================================================
                HEADER CARD
            ========================================================= */}
            <div className="mr-header-card">
                <div className="mr-header-info">
                    <span className="mr-eyebrow">
                        <ArrowDownToLine size={13} />
                        Inbound Supply Chain & Quality Control
                    </span>
                    <h1>Material Receipt & Inward Weighbridge (GRN)</h1>
                    <p>
                        Gate weighbridge validation, supplier invoice matching, chemical COA verification & inventory stock intake
                    </p>
                </div>

                <div className="mr-header-actions">
                    <button
                        type="button"
                        className={`mr-tab-btn ${activeTab === "list" ? "active" : ""}`}
                        onClick={() => setActiveTab("list")}
                    >
                        <ClipboardList size={15} />
                        GRN Directory ({receipts.length})
                    </button>

                    <button
                        type="button"
                        className={`mr-tab-btn primary ${activeTab === "new" ? "active" : ""}`}
                        onClick={() => setActiveTab("new")}
                    >
                        <Plus size={15} />
                        New Inward Receipt (GRN)
                    </button>

                    <button
                        type="button"
                        className="mr-refresh-btn"
                        onClick={loadAllData}
                        title="Refresh data"
                        disabled={loading}
                    >
                        <RefreshCw size={15} className={loading ? "mr-spinning" : ""} />
                    </button>

                    <ExcelToolbar
                        moduleName="material_receipts"
                        displayName="Material Receipts"
                        onImportDone={loadAllData}
                    />
                </div>
            </div>

            {/* =========================================================
                KPI STATS BANNER
            ========================================================= */}
            <div className="mr-stats-grid">
                <div className="mr-stat-card">
                    <div className="mr-stat-icon blue">
                        <FileCheck size={22} />
                    </div>
                    <div className="mr-stat-body">
                        <span className="mr-stat-label">Total Inward GRNs</span>
                        <div className="mr-stat-value">{stats.total_grns}</div>
                        <span className="mr-stat-sub">Gate passes completed</span>
                    </div>
                </div>

                <div className="mr-stat-card">
                    <div className="mr-stat-icon emerald">
                        <Scale size={22} />
                    </div>
                    <div className="mr-stat-body">
                        <span className="mr-stat-label">Total Inward Volume</span>
                        <div className="mr-stat-value">
                            {stats.total_received_mt} <small style={{ fontSize: "0.75rem" }}>MT</small>
                        </div>
                        <span className="mr-stat-sub">
                            {Number(stats.total_received_kg).toLocaleString("en-IN")} KG net
                        </span>
                    </div>
                </div>

                <div className="mr-stat-card">
                    <div className="mr-stat-icon purple">
                        <Boxes size={22} />
                    </div>
                    <div className="mr-stat-body">
                        <span className="mr-stat-label">Raw Material Inward Value</span>
                        <div className="mr-stat-value">
                            ₹{(Number(stats.total_inward_value_inr) / 100000).toFixed(2)}{" "}
                            <small style={{ fontSize: "0.75rem" }}>Lakhs</small>
                        </div>
                        <span className="mr-stat-sub">Procured valuation</span>
                    </div>
                </div>

                <div className="mr-stat-card">
                    <div className="mr-stat-icon amber">
                        <Clock size={22} />
                    </div>
                    <div className="mr-stat-body">
                        <span className="mr-stat-label">Pending Lab QC</span>
                        <div className="mr-stat-value">{stats.pending_qc_count}</div>
                        <span className="mr-stat-sub">Awaiting chemical clearance</span>
                    </div>
                </div>

                <div className="mr-stat-card">
                    <div className="mr-stat-icon slate">
                        <Building2 size={22} />
                    </div>
                    <div className="mr-stat-body">
                        <span className="mr-stat-label">Active Suppliers</span>
                        <div className="mr-stat-value">{stats.active_suppliers_count || suppliers.length}</div>
                        <span className="mr-stat-sub">Approved vendors</span>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {successMessage && (
                <div className="mr-alert success">
                    <div className="mr-alert-content">
                        <CheckCircle2 size={16} />
                        <span>{successMessage}</span>
                    </div>
                    <button
                        type="button"
                        className="mr-alert-close"
                        onClick={() => setSuccessMessage(null)}
                    >
                        <X size={15} />
                    </button>
                </div>
            )}

            {error && (
                <div className="mr-alert error">
                    <div className="mr-alert-content">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        className="mr-alert-close"
                        onClick={() => setError(null)}
                    >
                        <X size={15} />
                    </button>
                </div>
            )}

            {/* =========================================================
                TAB 1: GRN DIRECTORY
            ========================================================= */}
            {activeTab === "list" && (
                <>
                    {/* Filters Bar */}
                    <div className="mr-filter-bar">
                        <div className="mr-filter-group">
                            <div className="mr-search-box">
                                <Search size={15} className="mr-search-icon" />
                                <input
                                    type="text"
                                    className="mr-search-input"
                                    placeholder="Search by GRN #, Supplier, Vehicle #, Invoice #..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <select
                                className="mr-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="APPROVED">Approved & Inwarded</option>
                                <option value="QC_PENDING">Pending QC</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>

                        <div className="mr-filter-count">
                            Showing <strong>{filteredReceipts.length}</strong> of {receipts.length} Goods Receipt Notes
                        </div>
                    </div>

                    {/* Table Card */}
                    <div className="mr-table-card">
                        <div className="mr-table-responsive">
                            <table className="mr-table">
                                <thead>
                                    <tr>
                                        <th>GRN # & Date</th>
                                        <th>Chemical Supplier</th>
                                        <th>Supplier Invoice / DC</th>
                                        <th>Inward Logistics</th>
                                        <th>Weighbridge Net</th>
                                        <th>Storage Location</th>
                                        <th>Inward Value (₹)</th>
                                        <th>QC Status</th>
                                        <th style={{ textAlign: "right" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredReceipts.length === 0 ? (
                                        <tr>
                                            <td colSpan="9">
                                                <div className="mr-empty-state">
                                                    <Layers size={32} />
                                                    <p>No Goods Receipt Notes match your search criteria.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredReceipts.map((r) => {
                                            const grnDate = r.receipt_date
                                                ? new Date(r.receipt_date).toLocaleDateString("en-IN", {
                                                      day: "2-digit",
                                                      month: "short",
                                                      year: "numeric"
                                                  })
                                                : "N/A";
                                            const netKg = Number(r.weighbridge_net_kg || 0);

                                            return (
                                                <tr key={r.id}>
                                                    <td>
                                                        <div className="mr-grn-cell">
                                                            <strong>{r.grn_number}</strong>
                                                            <span>{grnDate}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="mr-supplier-cell">
                                                            <strong title={r.supplier_name}>{r.supplier_name}</strong>
                                                            <span>{r.supplier_city || r.supplier_code}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="mr-invoice-cell">
                                                            <strong>{r.invoice_number}</strong>
                                                            <span>DC: {r.supplier_challan_no || "N/A"}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="mr-vehicle-cell">
                                                            <strong>{r.vehicle_number}</strong>
                                                            <span>{r.transporter_name || "Direct Inward"}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="mr-weight-badge">
                                                            {netKg.toLocaleString("en-IN")} <span>KG</span>
                                                        </div>
                                                        <div className="mr-weight-sub">
                                                            {(netKg / 1000).toFixed(2)} MT • {r.total_packages || 0} pkgs
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="mr-loc-badge">
                                                            {r.store_location || "MAIN-RAW-WH"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="mr-amount">
                                                            ₹{Number(r.total_amount_inr || 0).toLocaleString("en-IN", {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`mr-status-pill ${
                                                                r.status === "APPROVED"
                                                                    ? "approved"
                                                                    : r.status === "REJECTED"
                                                                    ? "rejected"
                                                                    : "pending"
                                                            }`}
                                                        >
                                                            {r.status === "APPROVED" ? (
                                                                <CheckCircle2 size={12} />
                                                            ) : (
                                                                <Clock size={12} />
                                                            )}
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                                        <div className="mr-action-cell">
                                                            <button
                                                                type="button"
                                                                className="mr-action-btn view"
                                                                onClick={() => handleViewGRN(r.id)}
                                                                title="View / Print Official GRN"
                                                            >
                                                                <Eye size={13} />
                                                                <span>Print GRN</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="mr-action-btn pdf"
                                                                onClick={() => handleOpenPdfModal(r.id, r.grn_number)}
                                                                title="Configure paper size (A4 / A5 / Letter) & download auto-adjusted PDF"
                                                            >
                                                                <FileDown size={13} />
                                                                <span>PDF</span>
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
                </>
            )}

            {/* =========================================================
                TAB 2: INWARD GATE ENTRY & GRN GENERATOR FORM
            ========================================================= */}
            {activeTab === "new" && (
                <form onSubmit={handleSubmitGRN} className="mr-form-container">
                    {/* SECTION 1: SUPPLIER & INVOICE */}
                    <div className="mr-form-section">
                        <h2 className="mr-section-title">
                            <span className="step-num">1</span>
                            Supplier & Commercial Invoice Details
                        </h2>
                        <div className="mr-form-grid">
                            <div className="mr-field">
                                <label>
                                    Chemical Supplier <span className="req">*</span>
                                </label>
                                <select
                                    className="mr-input"
                                    value={selectedSupplierId}
                                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Select Approved Supplier --</option>
                                    {suppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.company_name} ({s.city})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mr-field">
                                <label>Supplier GSTIN</label>
                                <input
                                    type="text"
                                    className="mr-input"
                                    readOnly
                                    value={selectedSupplier?.gst_number || "Auto-populated"}
                                />
                            </div>

                            <div className="mr-field">
                                <label>
                                    Tax Invoice Number <span className="req">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="mr-input"
                                    placeholder="e.g. RIL/INV/2026/8941"
                                    value={formData.invoice_number}
                                    onChange={(e) =>
                                        setFormData({ ...formData, invoice_number: e.target.value })
                                    }
                                    required
                                />
                            </div>

                            <div className="mr-field">
                                <label>Invoice Date</label>
                                <input
                                    type="date"
                                    className="mr-input"
                                    value={formData.invoice_date}
                                    onChange={(e) =>
                                        setFormData({ ...formData, invoice_date: e.target.value })
                                    }
                                />
                            </div>

                            <div className="mr-field">
                                <label>Delivery Challan / Note #</label>
                                <input
                                    type="text"
                                    className="mr-input"
                                    placeholder="e.g. DC-99120"
                                    value={formData.supplier_challan_no}
                                    onChange={(e) =>
                                        setFormData({ ...formData, supplier_challan_no: e.target.value })
                                    }
                                />
                            </div>

                            <div className="mr-field">
                                <label>Store Destination Bay</label>
                                <select
                                    className="mr-input"
                                    value={formData.store_location}
                                    onChange={(e) =>
                                        setFormData({ ...formData, store_location: e.target.value })
                                    }
                                >
                                    <option value="SILO-BAY-01">SILO-BAY-01 (PVC Resin Bulk Silo)</option>
                                    <option value="LIQUID-TANK-DINP-01">LIQUID-TANK-DINP-01 (Plasticizer Bulk Tank)</option>
                                    <option value="RAW-WH-BAY-01">RAW-WH-BAY-01 (General Chemical Warehouse)</option>
                                    <option value="RAW-WH-BAY-02">RAW-WH-BAY-02 (Additives & Stabilizers)</option>
                                    <option value="RAW-WH-BAY-03">RAW-WH-BAY-03 (Minerals & CaCO3 Bags)</option>
                                    <option value="SUBSTRATE-STORE">SUBSTRATE-STORE (Felt Rolls Bay)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: WEIGHBRIDGE & LOGISTICS */}
                    <div className="mr-form-section">
                        <h2 className="mr-section-title">
                            <span className="step-num">2</span>
                            Security Gate & Weighbridge Certificate
                        </h2>

                        <div className="mr-weighbridge-box">
                            <div className="mr-wb-grid">
                                <div className="mr-field">
                                    <label>Vehicle Reg. Number</label>
                                    <input
                                        type="text"
                                        className="mr-input"
                                        placeholder="e.g. GJ-05-BX-7781"
                                        value={formData.vehicle_number}
                                        onChange={(e) =>
                                            setFormData({ ...formData, vehicle_number: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="mr-field">
                                    <label>Transporter Name</label>
                                    <input
                                        type="text"
                                        className="mr-input"
                                        placeholder="e.g. Reliance Dedicated Fleet"
                                        value={formData.transporter_name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, transporter_name: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="mr-field">
                                    <label>LR / Bilty Number</label>
                                    <input
                                        type="text"
                                        className="mr-input"
                                        placeholder="e.g. LR-449102"
                                        value={formData.lr_number}
                                        onChange={(e) =>
                                            setFormData({ ...formData, lr_number: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="mr-field">
                                    <label>Gross Weight (KG)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="mr-input"
                                        placeholder="Full truck weight"
                                        value={formData.weighbridge_gross_kg}
                                        onChange={(e) =>
                                            setFormData({ ...formData, weighbridge_gross_kg: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="mr-field">
                                    <label>Tare Weight (KG)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="mr-input"
                                        placeholder="Empty truck weight"
                                        value={formData.weighbridge_tare_kg}
                                        onChange={(e) =>
                                            setFormData({ ...formData, weighbridge_tare_kg: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="mr-wb-net-display">
                                    <span className="mr-wb-net-label">Scale Net Weight</span>
                                    <div className="mr-wb-net-val">
                                        {weighbridgeNetKg.toLocaleString("en-IN")} KG
                                    </div>
                                    <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                                        {(weighbridgeNetKg / 1000).toFixed(2)} Metric Tonnes
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: RAW MATERIAL ITEM LINES */}
                    <div className="mr-form-section">
                        <h2 className="mr-section-title">
                            <span className="step-num">3</span>
                            Received Chemical / Raw Material Line Items
                        </h2>

                        <div className="mr-items-builder">
                            <table className="mr-items-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: "28%" }}>Raw Material <span className="req">*</span></th>
                                        <th style={{ width: "14%" }}>Packaging</th>
                                        <th style={{ width: "10%" }}>No. of Pkgs</th>
                                        <th style={{ width: "12%" }}>Qty Received (KG/M) <span className="req">*</span></th>
                                        <th style={{ width: "12%" }}>Rate (₹/Unit) <span className="req">*</span></th>
                                        <th style={{ width: "12%" }}>Supplier Lot #</th>
                                        <th style={{ width: "8%" }}>Total (₹)</th>
                                        <th style={{ width: "4%", textAlign: "center" }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => {
                                        const qty = parseFloat(item.received_quantity) || 0;
                                        const rate = parseFloat(item.rate) || 0;
                                        const rowTotal = qty * rate;

                                        return (
                                            <tr key={idx}>
                                                <td>
                                                    <select
                                                        className="mr-item-input"
                                                        value={item.material_id}
                                                        onChange={(e) =>
                                                            handleItemChange(idx, "material_id", e.target.value)
                                                        }
                                                        required
                                                    >
                                                        <option value="">-- Choose Material --</option>
                                                        {materials.map((m) => (
                                                            <option key={m.id} value={m.id}>
                                                                {m.material_code} - {m.material_name} ({m.category_name})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    <select
                                                        className="mr-item-input"
                                                        value={item.package_type}
                                                        onChange={(e) =>
                                                            handleItemChange(idx, "package_type", e.target.value)
                                                        }
                                                    >
                                                        <option value="BAGS">25kg Paper Bags</option>
                                                        <option value="DRUMS">200L Steel Drums</option>
                                                        <option value="IBC">1000L IBC Tote</option>
                                                        <option value="BULK_TANKER">Bulk Road Tanker</option>
                                                        <option value="ROLLS">Substrate Rolls</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="mr-item-input"
                                                        placeholder="Count"
                                                        value={item.number_of_packages}
                                                        onChange={(e) =>
                                                            handleItemChange(idx, "number_of_packages", e.target.value)
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        className="mr-item-input"
                                                        placeholder="0.00"
                                                        value={item.received_quantity}
                                                        onChange={(e) =>
                                                            handleItemChange(idx, "received_quantity", e.target.value)
                                                        }
                                                        required
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        className="mr-item-input"
                                                        placeholder="Rate ₹"
                                                        value={item.rate}
                                                        onChange={(e) =>
                                                            handleItemChange(idx, "rate", e.target.value)
                                                        }
                                                        required
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="mr-item-input"
                                                        placeholder="e.g. LOT-26-88"
                                                        value={item.supplier_batch_number}
                                                        onChange={(e) =>
                                                            handleItemChange(idx, "supplier_batch_number", e.target.value)
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <strong style={{ fontSize: "0.85rem", fontWeight: "700", color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                                                        ₹{rowTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </strong>
                                                </td>
                                                <td style={{ textAlign: "center" }}>
                                                    {items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="mr-remove-btn"
                                                            onClick={() => handleRemoveItemRow(idx)}
                                                            title="Remove line item"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div className="mr-add-item-row">
                                <button
                                    type="button"
                                    className="mr-btn-add"
                                    onClick={handleAddItemRow}
                                >
                                    <Plus size={14} />
                                    Add Another Chemical Item
                                </button>

                                <div className="mr-items-summary">
                                    <span>
                                        Total Weight: <strong>{totalItemsQty.toLocaleString("en-IN")} KG</strong>
                                    </span>
                                    <span>
                                        Total Valuation:{" "}
                                        <strong>
                                            ₹{totalItemsValuation.toLocaleString("en-IN", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}
                                        </strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: QC & APPROVAL */}
                    <div className="mr-form-section">
                        <div className="mr-form-grid">
                            <div className="mr-field" style={{ gridColumn: "span 2" }}>
                                <label>Gate & Inspection Remarks</label>
                                <input
                                    type="text"
                                    className="mr-input"
                                    placeholder="e.g. Seals intact. Moisture tested <0.2%. K-value and bulk density verified."
                                    value={formData.remarks}
                                    onChange={(e) =>
                                        setFormData({ ...formData, remarks: e.target.value })
                                    }
                                />
                            </div>

                            <div className="mr-field">
                                <label>Inward QC Status</label>
                                <select
                                    className="mr-input"
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({ ...formData, status: e.target.value })
                                    }
                                >
                                    <option value="APPROVED">APPROVED & INWARD TO STOCK</option>
                                    <option value="QC_PENDING">QC PENDING (HOLD IN QUARANTINE)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SUBMIT BUTTON BAR */}
                    <div className="mr-form-actions">
                        <div className="mr-form-left-options">
                            <label className="mr-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.status === "APPROVED"}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            status: e.target.checked ? "APPROVED" : "QC_PENDING"
                                        })
                                    }
                                />
                                <span>Immediately add batches to inventory available for plastisol mixing</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="mr-submit-btn"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw size={15} className="mr-spinning" />
                                    Creating GRN & Allocating Batches...
                                </>
                            ) : (
                                <>
                                    <Check size={16} />
                                    Generate Official Goods Receipt Note (GRN)
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* =========================================================
                PRINTABLE OFFICIAL GOODS RECEIPT NOTE (GRN) MODAL
            ========================================================= */}
            {selectedReceipt && (
                <div className="mr-modal-overlay" onClick={() => setSelectedReceipt(null)}>
                    <div
                        className="mr-modal-dialog"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mr-modal-header">
                            <h3>
                                <FileCheck size={18} />
                                Goods Receipt Note (GRN) — {selectedReceipt.grn_number}
                            </h3>
                            <div className="mr-modal-actions">
                                <button
                                    type="button"
                                    className="mr-modal-btn"
                                    onClick={() => handleOpenPdfModal(selectedReceipt.id, selectedReceipt.grn_number)}
                                    style={{ background: "#2563eb", color: "#ffffff", borderColor: "#2563eb" }}
                                    title="Choose page size (A4 / A5 / Letter) and download auto-adjusted PDF"
                                >
                                    <FileDown size={14} />
                                    Configure & Print PDF
                                </button>
                                <button
                                    type="button"
                                    className="mr-modal-btn"
                                    onClick={() => window.print()}
                                >
                                    <Printer size={14} />
                                    Print Document
                                </button>
                                <button
                                    type="button"
                                    className="mr-modal-close"
                                    onClick={() => setSelectedReceipt(null)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="mr-modal-body">
                            <div className="mr-doc">
                                {/* Header Letterhead */}
                                <div className="mr-doc-header">
                                    <div className="mr-doc-company">
                                        <h2>RAINBOW CARPETS & FLOORINGS LTD.</h2>
                                        <p>
                                            Plot 42, GIDC Industrial Estate, Sachin, Surat, Gujarat - 394230
                                        </p>
                                        <p>
                                            Phone: +91 261 2894100 | Email: stores@rainbowcarpets.com
                                        </p>
                                        <p>
                                            GSTIN: <strong>24AAACR8821B1Z3</strong> | State Code: 24 (Gujarat)
                                        </p>
                                    </div>

                                    <div className="mr-doc-title-block">
                                        <span className="mr-doc-badge">
                                            OFFICIAL GOODS RECEIPT NOTE
                                        </span>
                                        <div className="mr-doc-grn-id">
                                            {selectedReceipt.grn_number}
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                                            Date:{" "}
                                            <strong>
                                                {new Date(selectedReceipt.receipt_date).toLocaleDateString(
                                                    "en-IN",
                                                    { day: "2-digit", month: "short", year: "numeric" }
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Meta Grid */}
                                <div className="mr-doc-meta-grid">
                                    {/* Box 1: Supplier */}
                                    <div className="mr-doc-box">
                                        <h4>CONSIGNOR / SUPPLIER DETAILS</h4>
                                        <div className="mr-doc-row">
                                            <span className="label">Supplier:</span>
                                            <span className="val">{selectedReceipt.supplier_name}</span>
                                        </div>
                                        <div className="mr-doc-row">
                                            <span className="label">Supplier Code:</span>
                                            <span className="val">{selectedReceipt.supplier_code}</span>
                                        </div>
                                        <div className="mr-doc-row">
                                            <span className="label">GSTIN:</span>
                                            <span className="val">{selectedReceipt.supplier_gst}</span>
                                        </div>
                                        <div className="mr-doc-row">
                                            <span className="label">Location:</span>
                                            <span className="val">
                                                {selectedReceipt.supplier_city}, {selectedReceipt.supplier_state || "India"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Box 2: Commercial & Logistics */}
                                    <div className="mr-doc-box">
                                        <h4>COMMERCIAL & LOGISTICS DETAILS</h4>
                                        <div className="mr-doc-row">
                                            <span className="label">Supplier Invoice No:</span>
                                            <span className="val">{selectedReceipt.invoice_number}</span>
                                        </div>
                                        <div className="mr-doc-row">
                                            <span className="label">Invoice Date:</span>
                                            <span className="val">
                                                {selectedReceipt.invoice_date
                                                    ? new Date(selectedReceipt.invoice_date).toLocaleDateString("en-IN")
                                                    : "N/A"}
                                            </span>
                                        </div>
                                        <div className="mr-doc-row">
                                            <span className="label">Delivery Challan No:</span>
                                            <span className="val">{selectedReceipt.supplier_challan_no || "N/A"}</span>
                                        </div>
                                        <div className="mr-doc-row">
                                            <span className="label">Vehicle Registration:</span>
                                            <span className="val">{selectedReceipt.vehicle_number}</span>
                                        </div>
                                        <div className="mr-doc-row">
                                            <span className="label">Transporter / LR:</span>
                                            <span className="val">
                                                {selectedReceipt.transporter_name} ({selectedReceipt.lr_number || "Direct"})
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Weighbridge block */}
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(3, 1fr)",
                                        gap: "10px",
                                        background: "#f1f5f9",
                                        padding: "10px 14px",
                                        borderRadius: "6px",
                                        marginBottom: "16px",
                                        fontSize: "0.78rem"
                                    }}
                                >
                                    <div>
                                        <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem", fontWeight: "600", textTransform: "uppercase" }}>
                                            GROSS WEIGHBRIDGE
                                        </span>
                                        <strong style={{ fontSize: "0.95rem", fontWeight: "700", color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                                            {Number(selectedReceipt.weighbridge_gross_kg || 0).toLocaleString("en-IN")} KG
                                        </strong>
                                    </div>
                                    <div>
                                        <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem", fontWeight: "600", textTransform: "uppercase" }}>
                                            TARE WEIGHBRIDGE
                                        </span>
                                        <strong style={{ fontSize: "0.95rem", fontWeight: "700", color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                                            {Number(selectedReceipt.weighbridge_tare_kg || 0).toLocaleString("en-IN")} KG
                                        </strong>
                                    </div>
                                    <div>
                                        <span style={{ color: "#2563eb", display: "block", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase" }}>
                                            NET DELIVERED WEIGHT
                                        </span>
                                        <strong style={{ fontSize: "0.95rem", fontWeight: "800", color: "#2563eb", fontVariantNumeric: "tabular-nums" }}>
                                            {Number(selectedReceipt.weighbridge_net_kg || 0).toLocaleString("en-IN")} KG (
                                            {(Number(selectedReceipt.weighbridge_net_kg || 0) / 1000).toFixed(2)} MT)
                                        </strong>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <table className="mr-doc-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Material Code</th>
                                            <th>Description</th>
                                            <th>Packaging</th>
                                            <th>Batch / Lot No</th>
                                            <th style={{ textAlign: "right" }}>Qty Recd</th>
                                            <th style={{ textAlign: "right" }}>Accepted</th>
                                            <th style={{ textAlign: "right" }}>Rate (₹)</th>
                                            <th style={{ textAlign: "right" }}>Total Amount (₹)</th>
                                            <th style={{ textAlign: "center" }}>QC</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedReceipt.items && selectedReceipt.items.length > 0 ? (
                                            selectedReceipt.items.map((item, idx) => (
                                                <tr key={item.id || idx}>
                                                    <td>{idx + 1}</td>
                                                    <td style={{ fontWeight: "700", color: "#1e40af" }}>
                                                        {item.material_code}
                                                    </td>
                                                    <td>
                                                        <strong>{item.material_name}</strong>
                                                        <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                                                            Category: {item.category_name}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {item.package_type} ({item.number_of_packages || 0} pkgs)
                                                    </td>
                                                    <td style={{ fontSize: "0.75rem", fontWeight: "600", color: "#334155" }}>
                                                        {item.batch_number}
                                                    </td>
                                                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: "600" }}>
                                                        {Number(item.received_quantity).toLocaleString("en-IN")}{" "}
                                                        {item.unit_symbol || "KG"}
                                                    </td>
                                                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: "600", color: "#059669" }}>
                                                        {Number(item.accepted_quantity).toLocaleString("en-IN")}{" "}
                                                        {item.unit_symbol || "KG"}
                                                    </td>
                                                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                                        ₹{Number(item.rate).toFixed(2)}
                                                    </td>
                                                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: "700", color: "#0f172a" }}>
                                                        ₹{Number(item.total_item_amount).toLocaleString("en-IN", {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2
                                                        })}
                                                    </td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <span
                                                            style={{
                                                                color: item.qc_status === "APPROVED" ? "#059669" : "#d97706",
                                                                fontWeight: "700",
                                                                fontSize: "0.7rem"
                                                            }}
                                                        >
                                                            {item.qc_status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="10" style={{ textAlign: "center" }}>
                                                    No line items recorded
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Totals Block */}
                                <div className="mr-doc-totals">
                                    <div className="mr-doc-totals-box">
                                        <div className="mr-doc-totals-row">
                                            <span>Total Line Items:</span>
                                            <strong>{selectedReceipt.items?.length || 0}</strong>
                                        </div>
                                        <div className="mr-doc-totals-row">
                                            <span>Storage Location:</span>
                                            <strong>{selectedReceipt.store_location || "MAIN-RAW-WH"}</strong>
                                        </div>
                                        <div className="mr-doc-totals-row grand">
                                            <span>Total GRN Value:</span>
                                            <span>
                                                ₹{Number(selectedReceipt.total_amount_inr || 0).toLocaleString("en-IN", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Remarks & Verification Note */}
                                <div
                                    style={{
                                        background: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "4px",
                                        padding: "8px 12px",
                                        fontSize: "0.75rem",
                                        color: "#475569"
                                    }}
                                >
                                    <strong>Inspection & Storage Remarks:</strong>{" "}
                                    {selectedReceipt.remarks || "Material received in good condition. Sealed packaging verified."}
                                </div>

                                {/* Signatures Block */}
                                <div className="mr-doc-signatures">
                                    <div className="mr-sig-box">
                                        <div className="mr-sig-line"></div>
                                        <span className="mr-sig-title">Security & Weighbridge</span>
                                        <span className="mr-sig-sub">Inward Gate Officer</span>
                                    </div>
                                    <div className="mr-sig-box">
                                        <div className="mr-sig-line"></div>
                                        <span className="mr-sig-title">Store Keeper</span>
                                        <span className="mr-sig-sub">Raw Material WH In-Charge</span>
                                    </div>
                                    <div className="mr-sig-box">
                                        <div className="mr-sig-line"></div>
                                        <span className="mr-sig-title">Quality Assurance Chemist</span>
                                        <span className="mr-sig-sub">Lab Testing & COA Verification</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Auto-Adjusting PDF Format Selector Modal */}
            <PdfExportModal
                isOpen={pdfConfigModal.isOpen}
                onClose={() => setPdfConfigModal(prev => ({ ...prev, isOpen: false }))}
                documentType="grn"
                documentId={pdfConfigModal.documentId}
                documentTitle={pdfConfigModal.documentTitle}
                documentRef={pdfConfigModal.documentRef}
            />
        </div>
    );
}
