import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
    Cpu,
    PlayCircle,
    PauseCircle,
    Wrench,
    AlertTriangle,
    Search,
    Plus,
    RefreshCw,
    Edit2,
    Trash2,
    X,
    CheckCircle2,
    AlertCircle,
    Check,
    Layers,
    Calendar,
    Gauge
} from "lucide-react";
import "./Machines.css";

const initialForm = {
    machine_code: "",
    machine_name: "",
    machine_type: "",
    manufacturer: "",
    model_number: "",
    serial_number: "",
    capacity_per_hour: "",
    status: "IDLE",
    installation_date: ""
};

export default function Machines() {
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState(initialForm);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [saving, setSaving] = useState(false);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        loadMachines();
    }, []);

    const loadMachines = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/machines");
            if (response.data?.success) {
                setMachines(response.data.data || []);
            } else {
                setMachines([]);
                setError(response.data?.message || "Unable to load machines.");
            }
        } catch (err) {
            console.error("Load Machines Error:", err);
            setMachines([]);
            setError(err.response?.data?.message || "Unable to connect to Machines API.");
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingId(null);
        setForm(initialForm);
        setError("");
        setSuccess("");
        setShowModal(true);
    };

    const openEdit = (machine) => {
        setError("");
        setEditingId(machine.id);
        setForm({
            machine_code: machine.machine_code || "",
            machine_name: machine.machine_name || "",
            machine_type: machine.machine_type || "",
            manufacturer: machine.manufacturer || "",
            model_number: machine.model_number || "",
            serial_number: machine.serial_number || "",
            capacity_per_hour: machine.capacity_per_hour ?? "",
            status: machine.status || "IDLE",
            installation_date: machine.installation_date ? String(machine.installation_date).substring(0, 10) : ""
        });
        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;
        setShowModal(false);
        setEditingId(null);
        setForm(initialForm);
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!form.machine_code.trim()) {
            setError("Machine code is required.");
            return;
        }

        if (!form.machine_name.trim()) {
            setError("Machine name is required.");
            return;
        }

        try {
            setSaving(true);
            const payload = {
                machine_code: form.machine_code.trim(),
                machine_name: form.machine_name.trim(),
                machine_type: form.machine_type.trim() || null,
                manufacturer: form.manufacturer.trim() || null,
                model_number: form.model_number.trim() || null,
                serial_number: form.serial_number.trim() || null,
                capacity_per_hour: form.capacity_per_hour ? Number(form.capacity_per_hour) : null,
                status: form.status,
                installation_date: form.installation_date || null
            };

            let response;
            if (editingId) {
                response = await api.put(`/machines/${editingId}`, payload);
            } else {
                response = await api.post("/machines", payload);
            }

            if (!response.data?.success) {
                throw new Error(response.data?.message || "Unable to save machine.");
            }

            setSuccess(editingId ? "Machine updated successfully." : "Machine created successfully.");
            setShowModal(false);
            setEditingId(null);
            setForm(initialForm);
            await loadMachines();
        } catch (err) {
            console.error("Save Machine Error:", err);
            setError(err.response?.data?.message || err.message || "Unable to save machine.");
        } finally {
            setSaving(false);
        }
    };

    const handleQuickStatusChange = async (machineId, newStatus) => {
        try {
            setUpdatingStatusId(machineId);
            const response = await api.patch(`/machines/${machineId}/status`, { status: newStatus });
            if (response.data?.success) {
                setMachines(prev => prev.map(m => m.id === machineId ? { ...m, status: newStatus } : m));
                setSuccess(`Machine status updated to ${newStatus}`);
            }
        } catch (err) {
            console.error("Status update error:", err);
            setError("Failed to update machine status.");
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleDelete = async (machine) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${machine.machine_code} (${machine.machine_name})?`
        );
        if (!confirmed) return;

        try {
            setError("");
            setSuccess("");
            const response = await api.delete(`/machines/${machine.id}`);
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Unable to delete machine.");
            }
            setSuccess("Machine deleted successfully.");
            await loadMachines();
        } catch (err) {
            console.error("Delete Machine Error:", err);
            setError(err.response?.data?.message || err.message || "Unable to delete machine.");
        }
    };

    const filteredMachines = useMemo(() => {
        const text = search.trim().toLowerCase();
        return machines.filter((machine) => {
            const matchesSearch =
                !text ||
                String(machine.machine_code || "").toLowerCase().includes(text) ||
                String(machine.machine_name || "").toLowerCase().includes(text) ||
                String(machine.machine_type || "").toLowerCase().includes(text) ||
                String(machine.manufacturer || "").toLowerCase().includes(text) ||
                String(machine.model_number || "").toLowerCase().includes(text);

            const matchesStatus =
                statusFilter === "ALL" || machine.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [machines, search, statusFilter]);

    const stats = useMemo(() => ({
        total: machines.length,
        running: machines.filter((m) => m.status === "RUNNING").length,
        idle: machines.filter((m) => m.status === "IDLE").length,
        maintenance: machines.filter((m) => m.status === "MAINTENANCE" || m.status === "BREAKDOWN").length
    }), [machines]);

    return (
        <div className="machines-page">
            {/* =================================================
               HEADER & TOP ACTIONS
            ================================================= */}
            <div className="machines-header-card">
                <div className="machines-header-info">
                    <span className="machines-eyebrow">PLANT EQUIPMENT • MASTER DATA</span>
                    <h1>Machines & Production Lines</h1>
                    <p>Manage PVC coating lines, Cowles dissolvers, calenders, extruders, and finishing equipment.</p>
                </div>

                <div className="machines-header-actions">
                    <button
                        type="button"
                        className="machines-refresh-btn"
                        onClick={loadMachines}
                        title="Reload Machine Fleet"
                    >
                        <RefreshCw size={17} className={loading ? "machines-spin" : ""} />
                    </button>
                    <button
                        type="button"
                        className="machines-btn-primary"
                        onClick={openCreate}
                    >
                        <Plus size={16} /> Add Machine
                    </button>
                </div>
            </div>

            {/* Notification Alerts */}
            {error && (
                <div className="machines-alert error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                    <button type="button" onClick={() => setError("")}><X size={15} /></button>
                </div>
            )}

            {success && (
                <div className="machines-alert success">
                    <CheckCircle2 size={16} />
                    <span>{success}</span>
                    <button type="button" onClick={() => setSuccess("")}><X size={15} /></button>
                </div>
            )}

            {/* =================================================
               METRIC SUMMARY CARDS
            ================================================= */}
            <div className="machines-stats-grid">
                <div className="machines-stat-card">
                    <div className="machines-stat-icon-wrap indigo">
                        <Cpu size={22} />
                    </div>
                    <div className="machines-stat-content">
                        <span className="machines-stat-label">Total Fleet</span>
                        <div className="machines-stat-val">{stats.total}</div>
                        <span className="machines-stat-sub">Active plant units</span>
                    </div>
                </div>

                <div className="machines-stat-card">
                    <div className="machines-stat-icon-wrap emerald">
                        <PlayCircle size={22} />
                    </div>
                    <div className="machines-stat-content">
                        <span className="machines-stat-label">Running Units</span>
                        <div className="machines-stat-val">{stats.running}</div>
                        <span className="machines-stat-sub">Active in production</span>
                    </div>
                </div>

                <div className="machines-stat-card">
                    <div className="machines-stat-icon-wrap blue">
                        <PauseCircle size={22} />
                    </div>
                    <div className="machines-stat-content">
                        <span className="machines-stat-label">Standby / Idle</span>
                        <div className="machines-stat-val">{stats.idle}</div>
                        <span className="machines-stat-sub">Ready for job dispatch</span>
                    </div>
                </div>

                <div className="machines-stat-card">
                    <div className="machines-stat-icon-wrap amber">
                        <Wrench size={22} />
                    </div>
                    <div className="machines-stat-content">
                        <span className="machines-stat-label">Maintenance / Down</span>
                        <div className="machines-stat-val">{stats.maintenance}</div>
                        <span className="machines-stat-sub">
                            {stats.maintenance > 0 ? "Scheduled PM or servicing" : "All units operational"}
                        </span>
                    </div>
                </div>
            </div>

            {/* =================================================
               MAIN MACHINE DIRECTORY TABLE
            ================================================= */}
            <div className="machines-card">
                <div className="machines-filter-bar">
                    <div className="machines-search-wrap">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search machine code, name, type, manufacturer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="machines-filter-group">
                        <div className="machines-status-chips">
                            {[
                                { key: "ALL", label: `All (${machines.length})` },
                                { key: "RUNNING", label: `Running (${stats.running})` },
                                { key: "IDLE", label: `Idle (${stats.idle})` },
                                { key: "MAINTENANCE", label: `Maintenance (${stats.maintenance})` }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    className={`machines-chip ${statusFilter === tab.key ? "active" : ""}`}
                                    onClick={() => setStatusFilter(tab.key)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="machines-table-responsive">
                    <table className="machines-table">
                        <thead>
                            <tr>
                                <th style={{ width: "16%" }}>MACHINE CODE & TYPE</th>
                                <th style={{ width: "32%" }}>EQUIPMENT NAME & SPECS</th>
                                <th style={{ width: "14%" }}>CAPACITY / HR</th>
                                <th style={{ width: "14%" }}>INSTALLATION</th>
                                <th style={{ width: "14%" }}>STATUS</th>
                                <th style={{ width: "10%", textAlign: "right" }}>ACTIONS</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading && machines.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="machines-empty-box">
                                        <RefreshCw className="machines-spin" size={20} style={{ margin: "0 auto 8px" }} />
                                        <span>Loading machines catalog...</span>
                                    </td>
                                </tr>
                            ) : filteredMachines.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="machines-empty-box">
                                        <strong>No machines found</strong>
                                        <span>Try adjusting your search query or filter.</span>
                                    </td>
                                </tr>
                            ) : (
                                filteredMachines.map((machine) => (
                                    <tr key={machine.id}>
                                        <td>
                                            <div className="machine-code-badge">{machine.machine_code}</div>
                                            <div>
                                                <span className="machine-type-tag">
                                                    {machine.machine_type || "General Equipment"}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <div className="machine-name-title">{machine.machine_name}</div>
                                            <div className="machine-subtext">
                                                {machine.manufacturer ? `${machine.manufacturer}` : "—"}
                                                {machine.model_number ? ` • Model: ${machine.model_number}` : ""}
                                                {machine.serial_number ? ` • S/N: ${machine.serial_number}` : ""}
                                            </div>
                                        </td>

                                        <td>
                                            <div className="machine-capacity-cell">
                                                {machine.capacity_per_hour
                                                    ? `${Number(machine.capacity_per_hour).toLocaleString()} Units/hr`
                                                    : "—"}
                                            </div>
                                        </td>

                                        <td>
                                            <div className="machine-subtext" style={{ fontSize: "0.8rem", color: "#475569" }}>
                                                {machine.installation_date
                                                    ? new Date(machine.installation_date).toLocaleDateString("en-IN", {
                                                          day: "2-digit",
                                                          month: "short",
                                                          year: "numeric"
                                                      })
                                                    : "—"}
                                            </div>
                                        </td>

                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <select
                                                    className="machine-status-select"
                                                    value={machine.status}
                                                    disabled={updatingStatusId === machine.id}
                                                    onChange={(e) => handleQuickStatusChange(machine.id, e.target.value)}
                                                >
                                                    <option value="RUNNING">● Running</option>
                                                    <option value="IDLE">● Idle</option>
                                                    <option value="MAINTENANCE">● Maintenance</option>
                                                    <option value="BREAKDOWN">● Breakdown</option>
                                                    <option value="INACTIVE">● Inactive</option>
                                                </select>
                                            </div>
                                        </td>

                                        <td>
                                            <div className="machines-action-group">
                                                <button
                                                    type="button"
                                                    className="machines-btn-icon"
                                                    onClick={() => openEdit(machine)}
                                                    title="Edit Machine"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="machines-btn-icon delete"
                                                    onClick={() => handleDelete(machine)}
                                                    title="Delete Machine"
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

                <div className="machines-table-footer">
                    <span>
                        Showing <strong>{filteredMachines.length}</strong> of <strong>{machines.length}</strong> machines
                    </span>
                    <span>Rainbow ERP • Plant Equipment Master</span>
                </div>
            </div>

            {/* =================================================
               MODAL: ADD / EDIT MACHINE
            ================================================= */}
            {showModal && (
                <div
                    className="machine-modal-backdrop"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div className="machine-modal-card">
                        <div className="machine-modal-header">
                            <div>
                                <span className="machines-eyebrow">EQUIPMENT CONFIGURATION</span>
                                <h2>{editingId ? "Edit Machine" : "Add New Machine"}</h2>
                            </div>
                            <button type="button" className="machine-modal-close" onClick={closeModal}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="machine-modal-form">
                            <div className="machine-form-row">
                                <div className="machine-form-field">
                                    <label>Machine Code *</label>
                                    <input
                                        type="text"
                                        name="machine_code"
                                        value={form.machine_code}
                                        onChange={handleChange}
                                        placeholder="e.g. COAT-LINE-03"
                                        required
                                    />
                                </div>

                                <div className="machine-form-field">
                                    <label>Operational Status *</label>
                                    <select name="status" value={form.status} onChange={handleChange}>
                                        <option value="RUNNING">Running</option>
                                        <option value="IDLE">Idle / Standby</option>
                                        <option value="MAINTENANCE">Maintenance</option>
                                        <option value="BREAKDOWN">Breakdown</option>
                                        <option value="INACTIVE">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="machine-form-field">
                                <label>Machine Name *</label>
                                <input
                                    type="text"
                                    name="machine_name"
                                    value={form.machine_name}
                                    onChange={handleChange}
                                    placeholder="e.g. High-Speed Plastisol Dissolver 1500L #3"
                                    required
                                />
                            </div>

                            <div className="machine-form-row">
                                <div className="machine-form-field">
                                    <label>Machine Type / Category</label>
                                    <input
                                        type="text"
                                        name="machine_type"
                                        value={form.machine_type}
                                        onChange={handleChange}
                                        placeholder="e.g. Coating & Gelling Line"
                                    />
                                </div>

                                <div className="machine-form-field">
                                    <label>Hourly Rated Capacity</label>
                                    <input
                                        type="number"
                                        name="capacity_per_hour"
                                        value={form.capacity_per_hour}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        placeholder="e.g. 500"
                                    />
                                </div>
                            </div>

                            <div className="machine-form-row">
                                <div className="machine-form-field">
                                    <label>Manufacturer</label>
                                    <input
                                        type="text"
                                        name="manufacturer"
                                        value={form.manufacturer}
                                        onChange={handleChange}
                                        placeholder="e.g. Bruckner / Zimmer Austria"
                                    />
                                </div>

                                <div className="machine-form-field">
                                    <label>Model Number</label>
                                    <input
                                        type="text"
                                        name="model_number"
                                        value={form.model_number}
                                        onChange={handleChange}
                                        placeholder="e.g. MAGNO-3200"
                                    />
                                </div>
                            </div>

                            <div className="machine-form-row">
                                <div className="machine-form-field">
                                    <label>Serial Number</label>
                                    <input
                                        type="text"
                                        name="serial_number"
                                        value={form.serial_number}
                                        onChange={handleChange}
                                        placeholder="e.g. SN-2024-8841"
                                    />
                                </div>

                                <div className="machine-form-field">
                                    <label>Installation Date</label>
                                    <input
                                        type="date"
                                        name="installation_date"
                                        value={form.installation_date}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="machine-modal-actions">
                                <button
                                    type="button"
                                    className="machine-btn-cancel"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="machines-btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : editingId ? "Update Machine" : "Create Machine"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}