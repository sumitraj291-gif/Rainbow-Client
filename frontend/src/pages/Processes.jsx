import React, { useEffect, useMemo, useState } from "react";
import {
    Workflow,
    CheckCircle2,
    Cpu,
    Building2,
    Plus,
    RefreshCw,
    Search,
    Edit2,
    Trash2,
    X,
    AlertCircle,
    SlidersHorizontal
} from "lucide-react";
import api from "../api";
import "./Processes.css";

const emptyForm = {
    process_code: "",
    process_name: "",
    department: "Production",
    machine_required: 1,
    standard_output_per_hour: "",
    standard_setup_minutes: 0,
    status: "ACTIVE",
    remarks: ""
};

export default function Processes() {
    const [processes, setProcesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadProcesses = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/processes");
            if (response.data?.success) {
                setProcesses(response.data.data || []);
            }
        } catch (err) {
            console.error("LOAD PROCESSES ERROR:", err);
            setError(err.response?.data?.message || "Unable to load manufacturing processes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProcesses();
    }, []);

    // Unique departments
    const departments = useMemo(() => {
        const set = new Set(processes.map((p) => p.department).filter(Boolean));
        return Array.from(set);
    }, [processes]);

    // KPI Metrics
    const metrics = useMemo(() => {
        const total = processes.length;
        const active = processes.filter((p) => p.status === "ACTIVE").length;
        const machineReq = processes.filter((p) => Number(p.machine_required) === 1).length;
        const deptCount = departments.length || 1;

        return { total, active, machineReq, deptCount };
    }, [processes, departments]);

    // Filtered processes
    const filteredProcesses = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return processes.filter((process) => {
            const matchesSearch =
                !keyword ||
                String(process.process_code || "").toLowerCase().includes(keyword) ||
                String(process.process_name || "").toLowerCase().includes(keyword) ||
                String(process.department || "").toLowerCase().includes(keyword);

            const matchesDept = departmentFilter === "ALL" || process.department === departmentFilter;
            const matchesStatus = statusFilter === "ALL" || process.status === statusFilter;

            return matchesSearch && matchesDept && matchesStatus;
        });
    }, [processes, search, departmentFilter, statusFilter]);

    const openAddModal = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError("");
        setShowModal(true);
    };

    const openEditModal = (process) => {
        setEditingId(process.id);
        setForm({
            process_code: process.process_code || "",
            process_name: process.process_name || "",
            department: process.department || "Production",
            machine_required: Number(process.machine_required || 0),
            standard_output_per_hour: process.standard_output_per_hour || "",
            standard_setup_minutes: process.standard_setup_minutes || 0,
            status: process.status || "ACTIVE",
            remarks: process.remarks || ""
        });
        setError("");
        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;
        setShowModal(false);
        setEditingId(null);
        setForm(emptyForm);
        setError("");
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (checked ? 1 : 0) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.process_code.trim()) {
            setError("Process code is required.");
            return;
        }

        if (!form.process_name.trim()) {
            setError("Process name is required.");
            return;
        }

        const payload = {
            process_code: form.process_code.trim().toUpperCase(),
            process_name: form.process_name.trim(),
            department: form.department?.trim() || null,
            machine_required: Number(form.machine_required || 0),
            standard_output_per_hour: form.standard_output_per_hour ? Number(form.standard_output_per_hour) : null,
            standard_setup_minutes: Number(form.standard_setup_minutes || 0),
            status: form.status,
            remarks: form.remarks?.trim() || null
        };

        try {
            setSaving(true);
            let res;
            if (editingId) {
                res = await api.put(`/processes/${editingId}`, payload);
            } else {
                res = await api.post("/processes", payload);
            }

            if (res.data?.success) {
                setSuccess(editingId ? "Process updated successfully." : "Process created successfully.");
                closeModal();
                await loadProcesses();
                setTimeout(() => setSuccess(""), 3000);
            } else {
                throw new Error(res.data?.message || "Failed to save process.");
            }
        } catch (err) {
            console.error("Save Process Error:", err);
            setError(err.response?.data?.message || err.message || "Failed to save process.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (process) => {
        const confirmed = window.confirm(`Are you sure you want to delete process "${process.process_name}" (${process.process_code})?`);
        if (!confirmed) return;

        try {
            setError("");
            setSuccess("");
            const res = await api.delete(`/processes/${process.id}`);
            if (res.data?.success) {
                setSuccess("Process deleted successfully.");
                await loadProcesses();
                setTimeout(() => setSuccess(""), 3000);
            } else {
                throw new Error(res.data?.message || "Unable to delete process.");
            }
        } catch (err) {
            console.error("Delete Process Error:", err);
            setError(err.response?.data?.message || err.message || "Unable to delete process.");
        }
    };

    return (
        <div className="pm-page">
            {/* Header Card */}
            <div className="pm-header-card">
                <div className="pm-header-info">
                    <h1>Process Master</h1>
                    <p>Configure manufacturing processes used throughout production planning, routing, and shopfloor execution.</p>
                </div>
                <div className="pm-header-actions">
                    <button
                        type="button"
                        className="pm-refresh-btn"
                        onClick={loadProcesses}
                        title="Refresh Process List"
                    >
                        <RefreshCw size={17} className={loading ? "pm-spin" : ""} />
                    </button>
                    <button
                        type="button"
                        className="pm-btn primary"
                        onClick={openAddModal}
                    >
                        <Plus size={16} /> Add Process
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {success && (
                <div className="pm-alert success">
                    <div className="pm-alert-content">
                        <CheckCircle2 size={16} />
                        <span>{success}</span>
                    </div>
                    <button type="button" className="pm-alert-close" onClick={() => setSuccess("")}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {error && !showModal && (
                <div className="pm-alert error">
                    <div className="pm-alert-content">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                    <button type="button" className="pm-alert-close" onClick={() => setError("")}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* KPI Summary Stat Cards */}
            <div className="pm-stats-grid">
                <div className="pm-stat-card">
                    <div className="pm-stat-icon-wrap blue">
                        <Workflow size={20} />
                    </div>
                    <div className="pm-stat-content">
                        <span className="pm-stat-label">Total Processes</span>
                        <div className="pm-stat-val">{metrics.total}</div>
                    </div>
                </div>

                <div className="pm-stat-card">
                    <div className="pm-stat-icon-wrap emerald">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="pm-stat-content">
                        <span className="pm-stat-label">Active Operations</span>
                        <div className="pm-stat-val">{metrics.active}</div>
                    </div>
                </div>

                <div className="pm-stat-card">
                    <div className="pm-stat-icon-wrap amber">
                        <Cpu size={20} />
                    </div>
                    <div className="pm-stat-content">
                        <span className="pm-stat-label">Machine Driven</span>
                        <div className="pm-stat-val">{metrics.machineReq}</div>
                    </div>
                </div>

                <div className="pm-stat-card">
                    <div className="pm-stat-icon-wrap indigo">
                        <Building2 size={20} />
                    </div>
                    <div className="pm-stat-content">
                        <span className="pm-stat-label">Work Departments</span>
                        <div className="pm-stat-val">{metrics.deptCount}</div>
                    </div>
                </div>
            </div>

            {/* Controls & Filter Toolbar */}
            <div className="pm-controls-card">
                <div className="pm-search-box">
                    <Search size={16} className="pm-search-icon" />
                    <input
                        type="text"
                        placeholder="Search by code, process name, or department..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="pm-filters-group">
                    <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="pm-filter-select"
                    >
                        <option value="ALL">All Departments</option>
                        {departments.map((dept) => (
                            <option key={dept} value={dept}>
                                {dept}
                            </option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="pm-filter-select"
                    >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Processes Table Card */}
            <div className="pm-table-card">
                <div className="pm-table-header">
                    <div>
                        <h3>Manufacturing Processes</h3>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="pm-table-count">
                            {filteredProcesses.length} {filteredProcesses.length === 1 ? "record" : "records"}
                        </span>
                        <span style={{ fontSize: "0.76rem", fontWeight: "600", color: "#16a34a", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a" }}></span> Live Database
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="pm-empty-state">
                        <RefreshCw size={28} className="pm-spin" style={{ color: "#0284c7", margin: "0 auto 10px" }} />
                        <h3>Loading Processes...</h3>
                        <p>Fetching standard manufacturing operations from the plant database.</p>
                    </div>
                ) : filteredProcesses.length === 0 ? (
                    <div className="pm-empty-state">
                        <Workflow size={36} style={{ color: "#94a3b8", margin: "0 auto 10px" }} />
                        <h3>No Processes Found</h3>
                        <p>
                            {search || departmentFilter !== "ALL" || statusFilter !== "ALL"
                                ? "No processes match your filter criteria."
                                : "Add your first manufacturing process to start configuring product routings."}
                        </p>
                        <button type="button" className="pm-btn primary" onClick={openAddModal}>
                            <Plus size={15} /> Add Process
                        </button>
                    </div>
                ) : (
                    <div className="pm-table-wrapper">
                        <table className="pm-table">
                            <thead>
                                <tr>
                                    <th>Process Code</th>
                                    <th>Process Name</th>
                                    <th>Department / Work Center</th>
                                    <th>Standard Throughput</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProcesses.map((proc) => {
                                    const outputRate = Number(proc.standard_output_per_hour || 0);
                                    const setupMins = Number(proc.standard_setup_minutes || 0);
                                    const isMachine = Number(proc.machine_required) === 1;

                                    return (
                                        <tr key={proc.id}>
                                            <td>
                                                <span className="pm-code-badge">
                                                    {proc.process_code}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="pm-name-cell">
                                                    <strong>{proc.process_name}</strong>
                                                    {proc.remarks && <span>{proc.remarks}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <div>
                                                    <span className="pm-dept-badge">
                                                        {proc.department || "General Plant"}
                                                    </span>
                                                    <div className="pm-machine-req">
                                                        {isMachine ? "⚙️ Machine Driven" : "✋ Manual / Bench"}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div>
                                                    <span className="pm-rate-val">
                                                        {outputRate > 0 ? `${outputRate.toLocaleString("en-IN")} units/hr` : "—"}
                                                    </span>
                                                    <div className="pm-setup-val">
                                                        Setup: {setupMins} mins
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`pm-status-badge ${proc.status === "ACTIVE" ? "active" : "inactive"}`}>
                                                    {proc.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="pm-actions-row">
                                                    <button
                                                        type="button"
                                                        className="pm-tbl-btn"
                                                        onClick={() => openEditModal(proc)}
                                                        title="Edit Process"
                                                    >
                                                        <Edit2 size={13} /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="pm-tbl-btn delete"
                                                        onClick={() => handleDelete(proc)}
                                                        title="Delete Process"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ADD / EDIT PROCESS MODAL */}
            {showModal && (
                <div className="pm-modal-backdrop" onClick={closeModal}>
                    <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pm-modal-header">
                            <h2>{editingId ? "Edit Manufacturing Process" : "Add Manufacturing Process"}</h2>
                            <button
                                type="button"
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
                                onClick={closeModal}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="pm-modal-body">
                                {error && (
                                    <div className="pm-alert error" style={{ margin: "0 0 10px" }}>
                                        <div className="pm-alert-content">
                                            <AlertCircle size={15} />
                                            <span>{error}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="pm-form-grid">
                                    <div className="pm-form-group">
                                        <label>Process Code *</label>
                                        <input
                                            type="text"
                                            name="process_code"
                                            value={form.process_code}
                                            onChange={handleChange}
                                            placeholder="e.g. PROC-008"
                                            required
                                        />
                                    </div>

                                    <div className="pm-form-group">
                                        <label>Department / Work Center *</label>
                                        <select
                                            name="department"
                                            value={form.department}
                                            onChange={handleChange}
                                        >
                                            <option value="Compounding">Compounding</option>
                                            <option value="Production">Production</option>
                                            <option value="Finishing">Finishing</option>
                                            <option value="Quality Control">Quality Control</option>
                                            <option value="Packing">Packing</option>
                                            <option value="Maintenance">Maintenance</option>
                                        </select>
                                    </div>

                                    <div className="pm-form-group full-width">
                                        <label>Process Name *</label>
                                        <input
                                            type="text"
                                            name="process_name"
                                            value={form.process_name}
                                            onChange={handleChange}
                                            placeholder="e.g. Edge Binding & Ultrasonic Sealing"
                                            required
                                        />
                                    </div>

                                    <div className="pm-form-group">
                                        <label>Standard Output (Units / Hour)</label>
                                        <input
                                            type="number"
                                            name="standard_output_per_hour"
                                            min="0"
                                            value={form.standard_output_per_hour}
                                            onChange={handleChange}
                                            placeholder="e.g. 500"
                                        />
                                    </div>

                                    <div className="pm-form-group">
                                        <label>Standard Setup Time (Minutes)</label>
                                        <input
                                            type="number"
                                            name="standard_setup_minutes"
                                            min="0"
                                            value={form.standard_setup_minutes}
                                            onChange={handleChange}
                                            placeholder="e.g. 15"
                                        />
                                    </div>

                                    <div className="pm-form-group">
                                        <label>Machinery Type</label>
                                        <select
                                            name="machine_required"
                                            value={form.machine_required}
                                            onChange={handleChange}
                                        >
                                            <option value={1}>Machine Required (Automated / Line)</option>
                                            <option value={0}>Manual / Inspection Bench</option>
                                        </select>
                                    </div>

                                    <div className="pm-form-group">
                                        <label>Operational Status</label>
                                        <select
                                            name="status"
                                            value={form.status}
                                            onChange={handleChange}
                                        >
                                            <option value="ACTIVE">ACTIVE</option>
                                            <option value="INACTIVE">INACTIVE</option>
                                        </select>
                                    </div>

                                    <div className="pm-form-group full-width">
                                        <label>Operational Notes / Remarks</label>
                                        <textarea
                                            name="remarks"
                                            rows="2"
                                            value={form.remarks}
                                            onChange={handleChange}
                                            placeholder="Enter standard tooling, temperature, or quality checkpoints..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pm-modal-footer">
                                <button
                                    type="button"
                                    className="pm-btn"
                                    onClick={closeModal}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="pm-btn primary"
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : editingId ? "Update Process" : "Create Process"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}