import React, { useState, useEffect, useMemo } from "react";
import {
    Wrench,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Activity,
    ShieldCheck,
    Plus,
    Search,
    Filter,
    RefreshCw,
    X,
    Check,
    Calendar,
    Flame,
    Gauge,
    Cpu,
    Zap,
    RotateCcw,
    Layers,
    User,
    ArrowRight
} from "lucide-react";
import "./Maintenance.css";
import ExcelToolbar from "../components/ExcelToolbar";
import { API_BASE_URL as API_BASE, authFetch } from "../services/api";

export default function Maintenance() {
    // Tabs: "machines", "breakdowns", "workorders"
    const [activeTab, setActiveTab] = useState("machines");

    // Data states
    const [stats, setStats] = useState({
        total_machines: 0,
        running_machines: 0,
        breakdown_machines: 0,
        maintenance_machines: 0,
        idle_machines: 0,
        plant_availability_pct: "100.0",
        active_breakdowns_count: 0,
        total_breakdowns: 0,
        total_downtime_minutes: 0,
        mttr_minutes: 0,
        upcoming_pm_count: 0,
        total_pm_cost_inr: "0.00"
    });
    const [machines, setMachines] = useState([]);
    const [breakdowns, setBreakdowns] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [severityFilter, setSeverityFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // Modal States
    const [showBreakdownModal, setShowBreakdownModal] = useState(false);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [showPMModal, setShowPMModal] = useState(false);
    const [selectedTicketForResolve, setSelectedTicketForResolve] = useState(null);

    // Breakdown Form State
    const [breakdownForm, setBreakdownForm] = useState({
        machine_id: "",
        severity: "HIGH",
        breakdown_category: "MECHANICAL",
        reason: "",
        root_cause_category: "",
        reported_by_name: "Shift Production Engineer",
        technician_name: "Sanjay Solanki (Maintenance Lead)"
    });

    // Resolve Form State
    const [resolveForm, setResolveForm] = useState({
        action_taken: "",
        root_cause_category: "",
        technician_name: "Sanjay Solanki",
        spare_parts_used: "",
        downtime_minutes: "45"
    });

    // PM Work Order Form State
    const [pmForm, setPmForm] = useState({
        machine_id: "",
        maintenance_type: "PREVENTIVE",
        priority: "NORMAL",
        frequency: "MONTHLY",
        scheduled_date: new Date().toISOString().slice(0, 10),
        description: "",
        checklist_items: "1. Check bearing lubrication\n2. Inspect drive belt tension\n3. Verify thermal sensors\n4. Test emergency stop switches",
        cost: "3500",
        downtime_hours: "2.0",
        technician_name: "Plant Maintenance Team"
    });

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
            const [sRes, mRes, bRes, wRes] = await Promise.all([
                authFetch(`${API_BASE}/maintenance/stats`),
                authFetch(`${API_BASE}/maintenance/machines`),
                authFetch(`${API_BASE}/maintenance/breakdowns`),
                authFetch(`${API_BASE}/maintenance/work-orders`)
            ]);

            const [sJson, mJson, bJson, wJson] = await Promise.all([
                sRes.json(),
                mRes.json(),
                bRes.json(),
                wRes.json()
            ]);

            if (sJson.success) setStats(sJson.data || {});
            if (mJson.success) {
                setMachines(mJson.data || []);
                if (mJson.data?.length > 0 && !breakdownForm.machine_id) {
                    setBreakdownForm(prev => ({ ...prev, machine_id: String(mJson.data[0].id) }));
                    setPmForm(prev => ({ ...prev, machine_id: String(mJson.data[0].id) }));
                }
            }
            if (bJson.success) setBreakdowns(bJson.data || []);
            if (wJson.success) setWorkOrders(wJson.data || []);
        } catch (err) {
            console.error("Maintenance load error:", err);
            setError("Failed to load maintenance records from server.");
        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // ACTIONS
    // =========================================================
    const handleReportBreakdown = async (e) => {
        e.preventDefault();
        if (!breakdownForm.machine_id) {
            setError("Please select the affected equipment.");
            return;
        }

        setError(null);
        try {
            const res = await authFetch(`${API_BASE}/maintenance/breakdowns`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(breakdownForm)
            });
            const json = await res.json();
            if (json.success) {
                setSuccessMessage(json.message);
                setShowBreakdownModal(false);
                setBreakdownForm(prev => ({ ...prev, reason: "", root_cause_category: "" }));
                await loadData();
                setActiveTab("breakdowns");
            } else {
                setError(json.message);
            }
        } catch (err) {
            setError("Failed to submit breakdown ticket.");
        }
    };

    const handleResolveBreakdown = async (e) => {
        e.preventDefault();
        if (!selectedTicketForResolve) return;

        setError(null);
        try {
            const res = await authFetch(`${API_BASE}/maintenance/breakdowns/${selectedTicketForResolve.id}/resolve`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(resolveForm)
            });
            const json = await res.json();
            if (json.success) {
                setSuccessMessage(json.message);
                setShowResolveModal(false);
                setSelectedTicketForResolve(null);
                await loadData();
            } else {
                setError(json.message);
            }
        } catch (err) {
            setError("Failed to resolve breakdown ticket.");
        }
    };

    const handleCreateWorkOrder = async (e) => {
        e.preventDefault();
        if (!pmForm.machine_id || !pmForm.description) {
            setError("Machine and description are required.");
            return;
        }

        setError(null);
        try {
            const res = await authFetch(`${API_BASE}/maintenance/work-orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pmForm)
            });
            const json = await res.json();
            if (json.success) {
                setSuccessMessage(json.message);
                setShowPMModal(false);
                setPmForm(prev => ({ ...prev, description: "" }));
                await loadData();
                setActiveTab("workorders");
            } else {
                setError(json.message);
            }
        } catch (err) {
            setError("Failed to schedule work order.");
        }
    };

    // Filtered Breakdowns
    const filteredBreakdowns = useMemo(() => {
        return breakdowns.filter(b => {
            const q = searchQuery.toLowerCase();
            const matchesQuery = !q ||
                b.breakdown_ticket_no?.toLowerCase().includes(q) ||
                b.machine_name?.toLowerCase().includes(q) ||
                b.reason?.toLowerCase().includes(q) ||
                b.root_cause_category?.toLowerCase().includes(q);

            const matchesSeverity = !severityFilter || b.severity === severityFilter;
            const matchesStatus = !statusFilter || b.status === statusFilter;
            return matchesQuery && matchesSeverity && matchesStatus;
        });
    }, [breakdowns, searchQuery, severityFilter, statusFilter]);

    return (
        <div className="mt-page">
            {/* =================================================
               HEADER & ACTIONS
            ================================================= */}
            <div className="mt-header-card">
                <div className="mt-header-info">
                    <div className="mt-eyebrow">
                        <Wrench size={14} className="mt-eyebrow-icon" /> TOTAL PRODUCTIVE MAINTENANCE (TPM) & LINE RELIABILITY
                    </div>
                    <h1>Plant Equipment Maintenance & Breakdowns</h1>
                    <p>
                        PVC Coating Lines, Cowles Dissolvers, Embossing Calenders, Breakdown Tickets, MTTR & PM Work Orders.
                    </p>
                </div>
                <div className="mt-header-actions">
                    <button
                        type="button"
                        className={`mt-tab-btn ${activeTab === "machines" ? "active" : ""}`}
                        onClick={() => setActiveTab("machines")}
                    >
                        <Cpu size={15} /> Equipment Health Status
                    </button>
                    <button
                        type="button"
                        className={`mt-tab-btn ${activeTab === "breakdowns" ? "active" : ""}`}
                        onClick={() => setActiveTab("breakdowns")}
                    >
                        <AlertTriangle size={15} /> Breakdown Tickets
                    </button>
                    <button
                        type="button"
                        className={`mt-tab-btn ${activeTab === "workorders" ? "active" : ""}`}
                        onClick={() => setActiveTab("workorders")}
                    >
                        <Clock size={15} /> PM Work Orders
                    </button>
                    <button
                        type="button"
                        className="mt-tab-btn danger"
                        onClick={() => setShowBreakdownModal(true)}
                    >
                        <AlertTriangle size={15} /> Report Breakdown
                    </button>
                    <button
                        type="button"
                        className="mt-tab-btn primary"
                        onClick={() => setShowPMModal(true)}
                    >
                        <Plus size={15} /> Schedule PM
                    </button>
                    <button
                        type="button"
                        className="mt-refresh-btn"
                        onClick={loadData}
                        title="Reload Data"
                    >
                        <RefreshCw size={15} />
                    </button>
                    <ExcelToolbar
                        moduleName="maintenance"
                        displayName="Maintenance"
                        onImportDone={loadData}
                    />
                </div>
            </div>

            {/* Notification Alerts */}
            {successMessage && (
                <div className="mt-alert mt-alert-success">
                    <CheckCircle2 size={16} />
                    <span>{successMessage}</span>
                    <button type="button" onClick={() => setSuccessMessage(null)}><X size={14} /></button>
                </div>
            )}
            {error && (
                <div className="mt-alert mt-alert-error">
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                    <button type="button" onClick={() => setError(null)}><X size={14} /></button>
                </div>
            )}

            {/* =================================================
               METRIC SUMMARY CARDS
            ================================================= */}
            <div className="mt-stats-grid">
                <div className="mt-stat-card">
                    <div className="mt-stat-icon-wrap emerald">
                        <Activity size={20} />
                    </div>
                    <div className="mt-stat-content">
                        <span className="mt-stat-label">PLANT AVAILABILITY (OEE)</span>
                        <div className="mt-stat-val">{stats.plant_availability_pct}%</div>
                        <span className="mt-stat-sub">{stats.running_machines} of {stats.total_machines} machines active</span>
                    </div>
                </div>

                <div className="mt-stat-card">
                    <div className="mt-stat-icon-wrap red">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="mt-stat-content">
                        <span className="mt-stat-label">ACTIVE BREAKDOWNS</span>
                        <div className="mt-stat-val">{stats.active_breakdowns_count} Lines</div>
                        <span className="mt-stat-sub">{stats.breakdown_machines} machines stopped</span>
                    </div>
                </div>

                <div className="mt-stat-card">
                    <div className="mt-stat-icon-wrap blue">
                        <Clock size={20} />
                    </div>
                    <div className="mt-stat-content">
                        <span className="mt-stat-label">MEAN TIME TO REPAIR (MTTR)</span>
                        <div className="mt-stat-val">{stats.mttr_minutes} mins</div>
                        <span className="mt-stat-sub">{stats.total_downtime_minutes} mins total downtime</span>
                    </div>
                </div>

                <div className="mt-stat-card">
                    <div className="mt-stat-icon-wrap purple">
                        <Wrench size={20} />
                    </div>
                    <div className="mt-stat-content">
                        <span className="mt-stat-label">UPCOMING PM SCHEDULE</span>
                        <div className="mt-stat-val">{stats.upcoming_pm_count} Orders</div>
                        <span className="mt-stat-sub">₹{Number(stats.total_pm_cost_inr).toLocaleString()} total maintenance</span>
                    </div>
                </div>
            </div>

            {/* =================================================
               TAB 1: EQUIPMENT HEALTH STATUS (LIVE GRID)
            ================================================= */}
            {activeTab === "machines" && (
                <div className="mt-machines-grid">
                    {machines.map(m => {
                        const isDown = m.status === "BREAKDOWN";
                        const isMaint = m.status === "MAINTENANCE";
                        const isRun = m.status === "RUNNING";

                        return (
                            <div key={m.id} className={`mt-machine-card ${m.status?.toLowerCase()}`}>
                                <div className="mt-m-card-header">
                                    <div className="mt-m-code-badge">{m.machine_code}</div>
                                    <span className={`mt-m-status-pill ${m.status?.toLowerCase()}`}>
                                        <span className="dot"></span> {m.status}
                                    </span>
                                </div>

                                <h3 className="mt-m-name">{m.machine_name}</h3>
                                <div className="mt-m-type">{m.machine_type || "Production Equipment"}</div>

                                <div className="mt-m-meta-rows">
                                    <div className="mt-m-row">
                                        <span className="lbl">Manufacturer:</span>
                                        <strong>{m.manufacturer || "Standard OEM"}</strong>
                                    </div>
                                    <div className="mt-m-row">
                                        <span className="lbl">Model / Serial:</span>
                                        <strong>{m.model_number || "—"} ({m.serial_number || "—"})</strong>
                                    </div>
                                    <div className="mt-m-row">
                                        <span className="lbl">Open Breakdowns:</span>
                                        <strong className={m.open_breakdowns > 0 ? "danger" : "normal"}>
                                            {m.open_breakdowns} Active Tickets
                                        </strong>
                                    </div>
                                    <div className="mt-m-row">
                                        <span className="lbl">Scheduled PMs:</span>
                                        <strong>{m.active_pm_count} Planned</strong>
                                    </div>
                                </div>

                                <div className="mt-m-card-actions">
                                    {isDown ? (
                                        <button
                                            type="button"
                                            className="mt-btn-card resolve"
                                            onClick={() => {
                                                const openTicket = breakdowns.find(b => b.machine_id === m.id && b.status !== "RESOLVED");
                                                if (openTicket) {
                                                    setSelectedTicketForResolve(openTicket);
                                                    setShowResolveModal(true);
                                                } else {
                                                    setActiveTab("breakdowns");
                                                }
                                            }}
                                        >
                                            <RotateCcw size={13} /> Resolve Breakdown
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="mt-btn-card report"
                                            onClick={() => {
                                                setBreakdownForm(prev => ({ ...prev, machine_id: String(m.id) }));
                                                setShowBreakdownModal(true);
                                            }}
                                        >
                                            <AlertTriangle size={13} /> Report Problem
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="mt-btn-card pm"
                                        onClick={() => {
                                            setPmForm(prev => ({ ...prev, machine_id: String(m.id) }));
                                            setShowPMModal(true);
                                        }}
                                    >
                                        <Clock size={13} /> Plan PM
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* =================================================
               TAB 2: BREAKDOWN TICKETS LOG
            ================================================= */}
            {activeTab === "breakdowns" && (
                <div className="mt-card">
                    <div className="mt-filter-bar">
                        <div className="mt-search-wrap">
                            <Search size={15} />
                            <input
                                type="text"
                                placeholder="Search by Ticket #, Machine, Failure Reason, Root Cause..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="mt-filter-selects">
                            <select
                                value={severityFilter}
                                onChange={(e) => setSeverityFilter(e.target.value)}
                            >
                                <option value="">All Severities</option>
                                <option value="CRITICAL">Critical</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="OPEN">Open (Line Stopped)</option>
                                <option value="IN_REPAIR">In Repair</option>
                                <option value="RESOLVED">Resolved</option>
                            </select>

                            {(searchQuery || severityFilter || statusFilter) && (
                                <button
                                    type="button"
                                    className="mt-clear-btn"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSeverityFilter("");
                                        setStatusFilter("");
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-table-responsive">
                        <table className="mt-table">
                            <thead>
                                <tr>
                                    <th>Ticket & Category</th>
                                    <th>Equipment Line</th>
                                    <th>Severity</th>
                                    <th>Failure Symptoms & Anomaly</th>
                                    <th>Root Cause Diagnosis</th>
                                    <th>Downtime</th>
                                    <th>Technician</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && breakdowns.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="mt-td-center">
                                            <RefreshCw className="mt-spin" size={18} /> Loading breakdown tickets...
                                        </td>
                                    </tr>
                                ) : filteredBreakdowns.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="mt-td-center">
                                            No breakdown tickets found. All equipment operational!
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBreakdowns.map(t => (
                                        <tr key={t.id}>
                                            <td>
                                                <strong className="mt-ticket-no">{t.breakdown_ticket_no}</strong>
                                                <div className="mt-sub-text">{t.breakdown_category}</div>
                                            </td>
                                            <td>
                                                <strong>{t.machine_name}</strong>
                                                <div className="mt-sub-text">{t.machine_code}</div>
                                            </td>
                                            <td>
                                                <span className={`mt-sev-badge ${t.severity?.toLowerCase()}`}>
                                                    {t.severity}
                                                </span>
                                            </td>
                                            <td style={{ maxWidth: "260px" }}>
                                                <div className="mt-reason-text">{t.reason}</div>
                                            </td>
                                            <td style={{ maxWidth: "220px" }}>
                                                <div className="mt-rca-text">{t.root_cause_category || "Under Diagnosis"}</div>
                                            </td>
                                            <td>
                                                <strong className="mt-downtime-val">{t.downtime_minutes || 0} mins</strong>
                                                <div className="mt-sub-text">
                                                    {t.breakdown_start ? new Date(t.breakdown_start).toLocaleDateString() : ""}
                                                </div>
                                            </td>
                                            <td>
                                                <div>{t.technician_name || "Unassigned"}</div>
                                                <div className="mt-sub-text">Rep: {t.reported_by_name}</div>
                                            </td>
                                            <td>
                                                <span className={`mt-status-badge ${t.status?.toLowerCase()}`}>
                                                    {t.status === "RESOLVED" ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                {t.status !== "RESOLVED" && t.status !== "CLOSED" ? (
                                                    <button
                                                        type="button"
                                                        className="mt-btn-resolve"
                                                        onClick={() => {
                                                            setSelectedTicketForResolve(t);
                                                            setResolveForm(prev => ({
                                                                ...prev,
                                                                root_cause_category: t.root_cause_category || "",
                                                                technician_name: t.technician_name || "Sanjay Solanki"
                                                            }));
                                                            setShowResolveModal(true);
                                                        }}
                                                    >
                                                        <RotateCcw size={12} /> Resolve
                                                    </button>
                                                ) : (
                                                    <span className="mt-sub-text">Completed</span>
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
               TAB 3: PREVENTIVE MAINTENANCE WORK ORDERS
            ================================================= */}
            {activeTab === "workorders" && (
                <div className="mt-card">
                    <div className="mt-card-header-row">
                        <div>
                            <h2>Scheduled Preventive Maintenance (PM) Orders</h2>
                            <p>Calibration checklists, oil changeovers, doctor blade inspections & scheduled downtime</p>
                        </div>
                        <button
                            type="button"
                            className="mt-btn-plan-pm"
                            onClick={() => setShowPMModal(true)}
                        >
                            <Plus size={15} /> Create PM Work Order
                        </button>
                    </div>

                    <div className="mt-table-responsive" style={{ marginTop: "16px" }}>
                        <table className="mt-table">
                            <thead>
                                <tr>
                                    <th>Work Order #</th>
                                    <th>Equipment Line</th>
                                    <th>PM Type & Priority</th>
                                    <th>Frequency</th>
                                    <th>Scheduled Date</th>
                                    <th>Checklist Description</th>
                                    <th>Est. Cost</th>
                                    <th>Technician</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="mt-td-center">
                                            No PM work orders scheduled.
                                        </td>
                                    </tr>
                                ) : (
                                    workOrders.map(w => (
                                        <tr key={w.id}>
                                            <td>
                                                <strong className="mt-wo-no">{w.work_order_no}</strong>
                                            </td>
                                            <td>
                                                <strong>{w.machine_name}</strong>
                                                <div className="mt-sub-text">{w.machine_code}</div>
                                            </td>
                                            <td>
                                                <span className="mt-pm-type">{w.maintenance_type}</span>
                                                <div className="mt-sub-text">Priority: {w.priority}</div>
                                            </td>
                                            <td>
                                                <span className="mt-freq-badge">{w.frequency}</span>
                                            </td>
                                            <td>
                                                <div>{w.scheduled_date ? new Date(w.scheduled_date).toLocaleDateString() : "—"}</div>
                                                <div className="mt-sub-text">{w.downtime_hours} hrs window</div>
                                            </td>
                                            <td style={{ maxWidth: "280px" }}>
                                                <div className="mt-wo-desc">{w.description}</div>
                                                {w.checklist_items && (
                                                    <div className="mt-checklist-preview">
                                                        {w.checklist_items.slice(0, 60)}...
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <strong>₹{Number(w.cost).toLocaleString()}</strong>
                                            </td>
                                            <td>
                                                <div>{w.technician_name}</div>
                                            </td>
                                            <td>
                                                <span className={`mt-wo-status ${w.status?.toLowerCase()}`}>
                                                    {w.status?.replace("_", " ")}
                                                </span>
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
               MODAL: REPORT MACHINE BREAKDOWN
            ================================================= */}
            {showBreakdownModal && (
                <div className="mt-modal-backdrop" onClick={(e) => e.target.classList.contains("mt-modal-backdrop") && setShowBreakdownModal(false)}>
                    <div className="mt-modal-card">
                        <div className="mt-modal-header danger">
                            <div>
                                <span className="mt-eyebrow" style={{ color: "#ef4444" }}>EMERGENCY MAINTENANCE TICKET</span>
                                <h2>Report Equipment Breakdown</h2>
                            </div>
                            <button
                                type="button"
                                className="mt-modal-close"
                                onClick={() => setShowBreakdownModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleReportBreakdown} className="mt-modal-form">
                            <div className="mt-form-field">
                                <label>Affected Production Machine *</label>
                                <select
                                    required
                                    value={breakdownForm.machine_id}
                                    onChange={(e) => setBreakdownForm({ ...breakdownForm, machine_id: e.target.value })}
                                >
                                    <option value="">-- Choose Machine --</option>
                                    {machines.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.machine_code} - {m.machine_name} ({m.status})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mt-form-grid-2">
                                <div className="mt-form-field">
                                    <label>Severity Level *</label>
                                    <select
                                        value={breakdownForm.severity}
                                        onChange={(e) => setBreakdownForm({ ...breakdownForm, severity: e.target.value })}
                                    >
                                        <option value="CRITICAL">Critical (Line Completely Halted)</option>
                                        <option value="HIGH">High (Major Speed/Quality Loss)</option>
                                        <option value="MEDIUM">Medium (Abnormal Anomaly)</option>
                                        <option value="LOW">Low (Minor Non-blocking Issue)</option>
                                    </select>
                                </div>

                                <div className="mt-form-field">
                                    <label>Sub-system / Category *</label>
                                    <select
                                        value={breakdownForm.breakdown_category}
                                        onChange={(e) => setBreakdownForm({ ...breakdownForm, breakdown_category: e.target.value })}
                                    >
                                        <option value="MECHANICAL">Mechanical (Bearings, Rollers, Blades)</option>
                                        <option value="ELECTRICAL">Electrical (Motors, Relays, Solenoids)</option>
                                        <option value="PNEUMATIC">Pneumatic (Air Cylinders, Valves, Pressure)</option>
                                        <option value="THERMAL_OIL">Thermal Oil / Burner (Oven Heat, Pumps)</option>
                                        <option value="ELECTRONIC_DRIVE">VFD / Inverter Drive / PLC Sensors</option>
                                        <option value="OPERATOR_ERROR">Operation / Web Jamming</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-form-field">
                                <label>Failure Symptoms & Observed Problem *</label>
                                <textarea
                                    required
                                    rows="3"
                                    value={breakdownForm.reason}
                                    onChange={(e) => setBreakdownForm({ ...breakdownForm, reason: e.target.value })}
                                    placeholder="Describe abnormal noise, temperature drop, visual smoke, or sensor alarm codes..."
                                />
                            </div>

                            <div className="mt-form-grid-2">
                                <div className="mt-form-field">
                                    <label>Suspected Root Cause (Initial RCA)</label>
                                    <input
                                        type="text"
                                        value={breakdownForm.root_cause_category}
                                        onChange={(e) => setBreakdownForm({ ...breakdownForm, root_cause_category: e.target.value })}
                                        placeholder="e.g. Bearing seized / Solenoid burnt"
                                    />
                                </div>

                                <div className="mt-form-field">
                                    <label>Assigned Maintenance Engineer</label>
                                    <input
                                        type="text"
                                        value={breakdownForm.technician_name}
                                        onChange={(e) => setBreakdownForm({ ...breakdownForm, technician_name: e.target.value })}
                                        placeholder="Engineer name"
                                    />
                                </div>
                            </div>

                            <div className="mt-modal-submit-row">
                                <span className="mt-warning-note">
                                    * Logging this ticket will immediately change machine status to <strong>BREAKDOWN</strong> in plant dashboards.
                                </span>
                                <button
                                    type="submit"
                                    className="mt-btn-submit-danger"
                                >
                                    <AlertTriangle size={16} /> Halt Machine & Dispatch Maintenance
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =================================================
               MODAL: RESOLVE BREAKDOWN TICKET
            ================================================= */}
            {showResolveModal && selectedTicketForResolve && (
                <div className="mt-modal-backdrop" onClick={(e) => e.target.classList.contains("mt-modal-backdrop") && setShowResolveModal(false)}>
                    <div className="mt-modal-card">
                        <div className="mt-modal-header">
                            <div>
                                <span className="mt-eyebrow">REPAIR COMPLETION & RESUME</span>
                                <h2>Resolve Breakdown {selectedTicketForResolve.breakdown_ticket_no}</h2>
                                <p>{selectedTicketForResolve.machine_name}</p>
                            </div>
                            <button
                                type="button"
                                className="mt-modal-close"
                                onClick={() => setShowResolveModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleResolveBreakdown} className="mt-modal-form">
                            <div className="mt-form-field">
                                <label>Corrective Action Taken & Repairs Performed *</label>
                                <textarea
                                    required
                                    rows="3"
                                    value={resolveForm.action_taken}
                                    onChange={(e) => setResolveForm({ ...resolveForm, action_taken: e.target.value })}
                                    placeholder="Detail the technical fix, adjustments made, and test run confirmation..."
                                />
                            </div>

                            <div className="mt-form-grid-2">
                                <div className="mt-form-field">
                                    <label>Confirmed Root Cause (5-Why Conclusion) *</label>
                                    <input
                                        type="text"
                                        required
                                        value={resolveForm.root_cause_category}
                                        onChange={(e) => setResolveForm({ ...resolveForm, root_cause_category: e.target.value })}
                                        placeholder="e.g. Mechanical seal fatigue / Voltage surge"
                                    />
                                </div>

                                <div className="mt-form-field">
                                    <label>Total Downtime Incurred (Minutes) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={resolveForm.downtime_minutes}
                                        onChange={(e) => setResolveForm({ ...resolveForm, downtime_minutes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="mt-form-field">
                                <label>Spare Parts & Consumables Replaced</label>
                                <input
                                    type="text"
                                    value={resolveForm.spare_parts_used}
                                    onChange={(e) => setResolveForm({ ...resolveForm, spare_parts_used: e.target.value })}
                                    placeholder="e.g. SKF Bearing 6208-2RS, 24V Solenoid Coil, Polyurea Grease"
                                />
                            </div>

                            <div className="mt-form-field">
                                <label>Lead Technician Sign-off *</label>
                                <input
                                    type="text"
                                    required
                                    value={resolveForm.technician_name}
                                    onChange={(e) => setResolveForm({ ...resolveForm, technician_name: e.target.value })}
                                />
                            </div>

                            <div className="mt-modal-submit-row">
                                <button
                                    type="submit"
                                    className="mt-btn-submit-success"
                                >
                                    <CheckCircle2 size={16} /> Mark Resolved & Resume Machine to RUNNING
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =================================================
               MODAL: SCHEDULE PM WORK ORDER
            ================================================= */}
            {showPMModal && (
                <div className="mt-modal-backdrop" onClick={(e) => e.target.classList.contains("mt-modal-backdrop") && setShowPMModal(false)}>
                    <div className="mt-modal-card">
                        <div className="mt-modal-header">
                            <div>
                                <span className="mt-eyebrow">PREVENTIVE MAINTENANCE PROGRAM</span>
                                <h2>Schedule Equipment PM Work Order</h2>
                            </div>
                            <button
                                type="button"
                                className="mt-modal-close"
                                onClick={() => setShowPMModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateWorkOrder} className="mt-modal-form">
                            <div className="mt-form-field">
                                <label>Target Machine *</label>
                                <select
                                    required
                                    value={pmForm.machine_id}
                                    onChange={(e) => setPmForm({ ...pmForm, machine_id: e.target.value })}
                                >
                                    <option value="">-- Select Machine --</option>
                                    {machines.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.machine_code} - {m.machine_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mt-form-grid-3">
                                <div className="mt-form-field">
                                    <label>PM Type</label>
                                    <select
                                        value={pmForm.maintenance_type}
                                        onChange={(e) => setPmForm({ ...pmForm, maintenance_type: e.target.value })}
                                    >
                                        <option value="PREVENTIVE">Preventive Maintenance</option>
                                        <option value="SERVICE">Service & Overhaul</option>
                                        <option value="INSPECTION">Calibration / Inspection</option>
                                    </select>
                                </div>

                                <div className="mt-form-field">
                                    <label>Frequency</label>
                                    <select
                                        value={pmForm.frequency}
                                        onChange={(e) => setPmForm({ ...pmForm, frequency: e.target.value })}
                                    >
                                        <option value="WEEKLY">Weekly</option>
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="QUARTERLY">Quarterly</option>
                                        <option value="ANNUAL">Annual</option>
                                    </select>
                                </div>

                                <div className="mt-form-field">
                                    <label>Scheduled Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={pmForm.scheduled_date}
                                        onChange={(e) => setPmForm({ ...pmForm, scheduled_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="mt-form-field">
                                <label>Work Order Description *</label>
                                <input
                                    type="text"
                                    required
                                    value={pmForm.description}
                                    onChange={(e) => setPmForm({ ...pmForm, description: e.target.value })}
                                    placeholder="e.g. Monthly Gelling Oven Thermal Oil & Knife Blade Calibration"
                                />
                            </div>

                            <div className="mt-form-field">
                                <label>Checklist Tasks (Step-by-step)</label>
                                <textarea
                                    rows="4"
                                    value={pmForm.checklist_items}
                                    onChange={(e) => setPmForm({ ...pmForm, checklist_items: e.target.value })}
                                />
                            </div>

                            <div className="mt-form-grid-3">
                                <div className="mt-form-field">
                                    <label>Est. Cost (₹)</label>
                                    <input
                                        type="number"
                                        value={pmForm.cost}
                                        onChange={(e) => setPmForm({ ...pmForm, cost: e.target.value })}
                                    />
                                </div>

                                <div className="mt-form-field">
                                    <label>Planned Downtime (Hrs)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={pmForm.downtime_hours}
                                        onChange={(e) => setPmForm({ ...pmForm, downtime_hours: e.target.value })}
                                    />
                                </div>

                                <div className="mt-form-field">
                                    <label>Assigned Team / Tech</label>
                                    <input
                                        type="text"
                                        value={pmForm.technician_name}
                                        onChange={(e) => setPmForm({ ...pmForm, technician_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="mt-modal-submit-row">
                                <button
                                    type="submit"
                                    className="mt-btn-submit-primary"
                                >
                                    <Clock size={16} /> Schedule PM Work Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
