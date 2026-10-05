import React, { useEffect, useMemo, useState } from "react";
import {
    Users,
    CheckCircle2,
    Cog,
    Wrench,
    FlaskConical,
    Search,
    LayoutGrid,
    Table,
    Plus,
    RefreshCw,
    Sun,
    Moon,
    RotateCw,
    Clock,
    User,
    Edit2,
    Trash2,
    X,
    AlertCircle,
    Sparkles
} from "lucide-react";
import api from "../services/api";
import "./Employees.css";
import ExcelToolbar from "../components/ExcelToolbar";

const initialForm = {
    employee_code: "",
    name: "",
    phone: "",
    email: "",
    department: "PRODUCTION",
    designation: "",
    joining_date: "",
    shift: "DAY",
    status: "ACTIVE"
};

const DEPARTMENTS = [
    { value: "PRODUCTION", label: "Production Line" },
    { value: "MAINTENANCE", label: "Maintenance & Engineering" },
    { value: "QUALITY_CONTROL", label: "Quality Control & Lab" },
    { value: "WAREHOUSE", label: "Warehouse & Logistics" },
    { value: "ADMINISTRATION", label: "Administration & Plant Mgmt" }
];

const SHIFTS = [
    { value: "GENERAL", label: "General (09:00 - 18:00)" },
    { value: "DAY", label: "Day Shift (06:00 - 14:00)" },
    { value: "NIGHT", label: "Night Shift (22:00 - 06:00)" },
    { value: "ROTATIONAL", label: "Rotational Shifts" }
];

function Employees() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        active_count: 0,
        inactive_count: 0,
        production_count: 0,
        maintenance_count: 0,
        qc_count: 0
    });

    const [form, setForm] = useState(initialForm);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("ALL");
    const [shiftFilter, setShiftFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [viewMode, setViewMode] = useState("grid");

    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        loadEmployees();
    }, [deptFilter, shiftFilter, statusFilter]);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            setError("");

            const params = {};
            if (deptFilter !== "ALL") params.department = deptFilter;
            if (shiftFilter !== "ALL") params.shift = shiftFilter;
            if (statusFilter !== "ALL") params.status = statusFilter;
            if (search.trim()) params.search = search.trim();

            const response = await api.get("/employees", { params });

            if (response.data?.success) {
                setEmployees(response.data.data || []);
                if (response.data.stats) {
                    setStats(response.data.stats);
                }
            } else {
                setEmployees([]);
                setError(response.data?.message || "Unable to load employees.");
            }
        } catch (err) {
            console.error("Load Employees Error:", err);
            setEmployees([]);
            setError(err.response?.data?.message || "Unable to connect to Employees API.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        loadEmployees();
    };

    const openCreate = () => {
        setEditingId(null);
        setForm({
            ...initialForm,
            joining_date: new Date().toISOString().substring(0, 10)
        });
        setError("");
        setSuccess("");
        setShowModal(true);
    };

    const openEdit = (emp) => {
        setEditingId(emp.id);
        setForm({
            employee_code: emp.employee_code || "",
            name: emp.name || "",
            phone: emp.phone || "",
            email: emp.email || "",
            department: emp.department || "PRODUCTION",
            designation: emp.designation || "",
            joining_date: emp.joining_date ? String(emp.joining_date).substring(0, 10) : "",
            shift: emp.shift || "DAY",
            status: emp.status || "ACTIVE"
        });
        setError("");
        setSuccess("");
        setShowModal(true);
    };

    const openDetail = async (emp) => {
        setSelectedEmployee(emp);
        setShowDetailModal(true);
        setDetailLoading(true);

        try {
            const res = await api.get(`/employees/${emp.id}`);
            if (res.data?.success) {
                setSelectedEmployee(res.data.data);
            }
        } catch (err) {
            console.error("Load Employee Details Error:", err);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setError("Employee name is required.");
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const payload = {
                employee_code: form.employee_code.trim() || undefined,
                name: form.name.trim(),
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                department: form.department || "PRODUCTION",
                designation: form.designation.trim() || null,
                joining_date: form.joining_date || null,
                shift: form.shift,
                status: form.status
            };

            let response;
            if (editingId) {
                response = await api.put(`/employees/${editingId}`, payload);
            } else {
                response = await api.post("/employees", payload);
            }

            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to save employee.");
            }

            setSuccess(editingId ? "Employee profile updated successfully." : "New employee enrolled successfully.");
            setShowModal(false);
            setEditingId(null);
            setForm(initialForm);
            await loadEmployees();
        } catch (err) {
            console.error("Save Employee Error:", err);
            setError(err.response?.data?.message || err.message || "Failed to save employee.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (emp) => {
        const confirmed = window.confirm(
            `Are you sure you want to remove employee "${emp.name}" (${emp.employee_code})?`
        );
        if (!confirmed) return;

        try {
            setError("");
            setSuccess("");

            const res = await api.delete(`/employees/${emp.id}`);
            if (!res.data?.success) {
                throw new Error(res.data?.message || "Failed to delete employee.");
            }

            setSuccess("Employee deleted successfully.");
            await loadEmployees();
        } catch (err) {
            console.error("Delete Employee Error:", err);
            setError(err.response?.data?.message || err.message || "Failed to delete employee.");
        }
    };

    const handleSeed = async () => {
        try {
            setSeeding(true);
            setError("");
            setSuccess("");

            const res = await api.post("/employees/seed");
            if (res.data?.success) {
                setSuccess(res.data.message || "Sample factory team seeded successfully.");
                await loadEmployees();
            } else {
                setError(res.data?.message || "Unable to seed employees.");
            }
        } catch (err) {
            console.error("Seed Error:", err);
            setError(err.response?.data?.message || "Unable to seed employees.");
        } finally {
            setSeeding(false);
        }
    };

    // Client-side search filtering
    const filteredEmployees = useMemo(() => {
        if (!search.trim()) return employees;
        const q = search.trim().toLowerCase();
        return employees.filter(emp =>
            (emp.name && emp.name.toLowerCase().includes(q)) ||
            (emp.employee_code && emp.employee_code.toLowerCase().includes(q)) ||
            (emp.phone && emp.phone.toLowerCase().includes(q)) ||
            (emp.email && emp.email.toLowerCase().includes(q)) ||
            (emp.department && emp.department.toLowerCase().includes(q)) ||
            (emp.designation && emp.designation.toLowerCase().includes(q))
        );
    }, [employees, search]);

    const getInitials = (name) => {
        if (!name) return "EM";
        const parts = name.trim().split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const getDeptClass = (dept) => {
        if (!dept) return "dept-production";
        const d = dept.toUpperCase();
        if (d.includes("MAINT")) return "dept-maintenance";
        if (d.includes("QUAL") || d.includes("QC") || d.includes("LAB")) return "dept-qc";
        if (d.includes("WARE") || d.includes("LOGIS") || d.includes("DISP")) return "dept-warehouse";
        if (d.includes("ADMIN") || d.includes("MGMT")) return "dept-admin";
        return "dept-production";
    };

    const formatDeptLabel = (dept) => {
        if (!dept) return "Production";
        const match = DEPARTMENTS.find(d => d.value === dept);
        if (match) return match.label;
        return dept.replace(/_/g, " ");
    };

    const getShiftBadge = (shift) => {
        const s = shift || "GENERAL";
        switch (s) {
            case "DAY":
                return <span className="emp-tag shift-day"><Sun size={12} /> Day Shift</span>;
            case "NIGHT":
                return <span className="emp-tag shift-night"><Moon size={12} /> Night Shift</span>;
            case "ROTATIONAL":
                return <span className="emp-tag shift-rotational"><RotateCw size={12} /> Rotational</span>;
            default:
                return <span className="emp-tag shift-general"><Clock size={12} /> General</span>;
        }
    };

    return (
        <div className="emp-page">
            {/* Header Card */}
            <div className="emp-header-card">
                <div className="emp-header-info">
                    <h1>Employees</h1>
                    <p>
                        Plant personnel roster, machine operators, technicians and shift assignments.
                    </p>
                </div>
                <div className="emp-header-actions">
                    <button
                        type="button"
                        className="emp-refresh-btn"
                        onClick={loadEmployees}
                        title="Refresh List"
                    >
                        <RefreshCw size={17} className={loading ? "emp-spin" : ""} />
                    </button>
                    <ExcelToolbar
                        moduleName="employees"
                        displayName="Employees"
                        onImportDone={loadEmployees}
                    />
                    <button
                        type="button"
                        className="emp-btn secondary"
                        onClick={handleSeed}
                        disabled={seeding}
                        title="Load standard PVC carpet factory personnel roster"
                    >
                        <Sparkles size={14} />
                        {seeding ? "Seeding..." : "Seed Roster"}
                    </button>
                    <button
                        type="button"
                        className="emp-btn primary"
                        onClick={openCreate}
                    >
                        <Plus size={16} /> Add Employee
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div className="emp-alert error">
                    <div className="emp-alert-content">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                    <button type="button" className="emp-alert-close" onClick={() => setError("")}><X size={14} /></button>
                </div>
            )}
            {success && (
                <div className="emp-alert success">
                    <div className="emp-alert-content">
                        <CheckCircle2 size={16} />
                        <span>{success}</span>
                    </div>
                    <button type="button" className="emp-alert-close" onClick={() => setSuccess("")}><X size={14} /></button>
                </div>
            )}

            {/* KPI Metrics */}
            <div className="emp-stats-grid">
                <div className="emp-stat-card">
                    <div className="emp-stat-icon-wrap blue">
                        <Users size={20} />
                    </div>
                    <div className="emp-stat-content">
                        <span className="emp-stat-label">Total Staff</span>
                        <div className="emp-stat-val">{stats.total || employees.length}</div>
                    </div>
                </div>

                <div className="emp-stat-card">
                    <div className="emp-stat-icon-wrap emerald">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="emp-stat-content">
                        <span className="emp-stat-label">Active On Duty</span>
                        <div className="emp-stat-val">{Number(stats.active_count) || employees.filter(e => e.status === "ACTIVE").length}</div>
                    </div>
                </div>

                <div className="emp-stat-card">
                    <div className="emp-stat-icon-wrap indigo">
                        <Cog size={20} />
                    </div>
                    <div className="emp-stat-content">
                        <span className="emp-stat-label">Production Operators</span>
                        <div className="emp-stat-val">{Number(stats.production_count) || employees.filter(e => e.department === "PRODUCTION").length}</div>
                    </div>
                </div>

                <div className="emp-stat-card">
                    <div className="emp-stat-icon-wrap amber">
                        <Wrench size={20} />
                    </div>
                    <div className="emp-stat-content">
                        <span className="emp-stat-label">Maintenance Techs</span>
                        <div className="emp-stat-val">{Number(stats.maintenance_count) || employees.filter(e => e.department === "MAINTENANCE").length}</div>
                    </div>
                </div>

                <div className="emp-stat-card">
                    <div className="emp-stat-icon-wrap purple">
                        <FlaskConical size={20} />
                    </div>
                    <div className="emp-stat-content">
                        <span className="emp-stat-label">QC & Lab Inspectors</span>
                        <div className="emp-stat-val">{Number(stats.qc_count) || employees.filter(e => e.department?.includes("QUAL")).length}</div>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="emp-controls-card">
                <div className="emp-controls-top">
                    <form className="emp-search-box" onSubmit={handleSearchSubmit}>
                        <Search size={16} className="emp-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name, employee code, phone, role..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </form>

                    <div className="emp-view-toggles">
                        <button
                            type="button"
                            className={`emp-view-btn ${viewMode === "grid" ? "active" : ""}`}
                            onClick={() => setViewMode("grid")}
                        >
                            <LayoutGrid size={15} /> Grid Cards
                        </button>
                        <button
                            type="button"
                            className={`emp-view-btn ${viewMode === "table" ? "active" : ""}`}
                            onClick={() => setViewMode("table")}
                        >
                            <Table size={15} /> Table
                        </button>
                    </div>
                </div>

                {/* Department Filter Pills */}
                <div className="emp-pills-row">
                    <span className="emp-pills-label">Department:</span>
                    <button
                        type="button"
                        className={`emp-pill ${deptFilter === "ALL" ? "active" : ""}`}
                        onClick={() => setDeptFilter("ALL")}
                    >
                        All ({employees.length})
                    </button>
                    {DEPARTMENTS.map(d => (
                        <button
                            key={d.value}
                            type="button"
                            className={`emp-pill ${deptFilter === d.value ? "active" : ""}`}
                            onClick={() => setDeptFilter(d.value)}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>

                {/* Shift & Status Pills */}
                <div className="emp-pills-row">
                    <span className="emp-pills-label">Shift:</span>
                    <button
                        type="button"
                        className={`emp-pill ${shiftFilter === "ALL" ? "active" : ""}`}
                        onClick={() => setShiftFilter("ALL")}
                    >
                        All Shifts
                    </button>
                    <button
                        type="button"
                        className={`emp-pill ${shiftFilter === "DAY" ? "active" : ""}`}
                        onClick={() => setShiftFilter("DAY")}
                    >
                        <Sun size={12} /> Day
                    </button>
                    <button
                        type="button"
                        className={`emp-pill ${shiftFilter === "NIGHT" ? "active" : ""}`}
                        onClick={() => setShiftFilter("NIGHT")}
                    >
                        <Moon size={12} /> Night
                    </button>
                    <button
                        type="button"
                        className={`emp-pill ${shiftFilter === "GENERAL" ? "active" : ""}`}
                        onClick={() => setShiftFilter("GENERAL")}
                    >
                        <Clock size={12} /> General
                    </button>
                    <button
                        type="button"
                        className={`emp-pill ${shiftFilter === "ROTATIONAL" ? "active" : ""}`}
                        onClick={() => setShiftFilter("ROTATIONAL")}
                    >
                        <RotateCw size={12} /> Rotational
                    </button>

                    <span className="emp-pills-label" style={{ marginLeft: "14px" }}>Status:</span>
                    <button
                        type="button"
                        className={`emp-pill ${statusFilter === "ALL" ? "active" : ""}`}
                        onClick={() => setStatusFilter("ALL")}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        className={`emp-pill ${statusFilter === "ACTIVE" ? "active" : ""}`}
                        onClick={() => setStatusFilter("ACTIVE")}
                    >
                        Active
                    </button>
                    <button
                        type="button"
                        className={`emp-pill ${statusFilter === "INACTIVE" ? "active" : ""}`}
                        onClick={() => setStatusFilter("INACTIVE")}
                    >
                        Inactive
                    </button>
                </div>
            </div>

            {/* Employees Content */}
            {loading ? (
                <div className="emp-empty-state">
                    <RefreshCw size={28} className="emp-spin" style={{ color: "#0284c7", margin: "0 auto 10px" }} />
                    <h3>Loading Employee Directory...</h3>
                    <p>Fetching operator records and shift assignments from the plant database.</p>
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="emp-empty-state">
                    <Users size={36} style={{ color: "#94a3b8", margin: "0 auto 10px" }} />
                    <h3>No Employees Found</h3>
                    <p>
                        {search || deptFilter !== "ALL" || shiftFilter !== "ALL"
                            ? "No personnel matched your current filter criteria."
                            : "There are currently no registered staff members in the system."}
                    </p>
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                        <button type="button" className="emp-btn primary" onClick={openCreate}>
                            <Plus size={15} /> Add First Employee
                        </button>
                        <button type="button" className="emp-btn secondary" onClick={handleSeed}>
                            <Sparkles size={14} /> Load Factory Roster (12 Staff)
                        </button>
                    </div>
                </div>
            ) : viewMode === "grid" ? (
                /* Cards Grid */
                <div className="emp-cards-container">
                    {filteredEmployees.map(emp => (
                        <div key={emp.id} className="emp-card">
                            <div className="emp-card-top">
                                <div className="emp-avatar-wrapper">
                                    <div className={`emp-avatar ${getDeptClass(emp.department)}`}>
                                        {getInitials(emp.name)}
                                    </div>
                                    <div className="emp-card-identity">
                                        <div className="emp-name">{emp.name}</div>
                                        <div className="emp-designation">{emp.designation || "Staff Member"}</div>
                                    </div>
                                </div>
                                <span className={`emp-status-badge ${emp.status === "ACTIVE" ? "active" : "inactive"}`}>
                                    <span className="emp-dot"></span>
                                    {emp.status}
                                </span>
                            </div>

                            <div className="emp-card-tags">
                                <span className="emp-tag code">{emp.employee_code}</span>
                                <span className="emp-tag dept">{formatDeptLabel(emp.department)}</span>
                                {getShiftBadge(emp.shift)}
                            </div>

                            <div className="emp-card-details">
                                <div className="emp-detail-row">
                                    <span className="emp-detail-label">Phone:</span>
                                    <span className="emp-detail-val">
                                        {emp.phone ? <a href={`tel:${emp.phone}`}>{emp.phone}</a> : "—"}
                                    </span>
                                </div>
                                <div className="emp-detail-row">
                                    <span className="emp-detail-label">Email:</span>
                                    <span className="emp-detail-val">
                                        {emp.email ? <a href={`mailto:${emp.email}`}>{emp.email}</a> : "—"}
                                    </span>
                                </div>
                                <div className="emp-detail-row">
                                    <span className="emp-detail-label">Joining Date:</span>
                                    <span className="emp-detail-val">
                                        {emp.joining_date ? String(emp.joining_date).substring(0, 10) : "—"}
                                    </span>
                                </div>
                            </div>

                            <div className="emp-card-actions">
                                <button
                                    type="button"
                                    className="emp-action-btn"
                                    onClick={() => openDetail(emp)}
                                >
                                    <User size={13} /> Profile
                                </button>
                                <button
                                    type="button"
                                    className="emp-action-btn edit"
                                    onClick={() => openEdit(emp)}
                                >
                                    <Edit2 size={13} /> Edit
                                </button>
                                <button
                                    type="button"
                                    className="emp-action-btn delete"
                                    onClick={() => handleDelete(emp)}
                                    title="Delete Employee"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Table View */
                <div className="emp-table-card">
                    <table className="emp-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Code</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Shift</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.map(emp => (
                                <tr key={emp.id}>
                                    <td>
                                        <div className="emp-table-user">
                                            <div className={`emp-table-avatar ${getDeptClass(emp.department)}`}>
                                                {getInitials(emp.name)}
                                            </div>
                                            <div>
                                                <strong>{emp.name}</strong>
                                                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                                                    {emp.email || "No email"}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="emp-tag code">{emp.employee_code}</span>
                                    </td>
                                    <td>
                                        <span className="emp-tag dept">{formatDeptLabel(emp.department)}</span>
                                    </td>
                                    <td>{emp.designation || "—"}</td>
                                    <td>{getShiftBadge(emp.shift)}</td>
                                    <td>{emp.phone || "—"}</td>
                                    <td>
                                        <span className={`emp-status-badge ${emp.status === "ACTIVE" ? "active" : "inactive"}`}>
                                            <span className="emp-dot"></span>
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="emp-table-actions">
                                            <button
                                                type="button"
                                                className="emp-tbl-btn"
                                                onClick={() => openDetail(emp)}
                                                title="View Profile"
                                            >
                                                <User size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="emp-tbl-btn"
                                                onClick={() => openEdit(emp)}
                                                title="Edit Employee"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="emp-tbl-btn delete"
                                                onClick={() => handleDelete(emp)}
                                                title="Delete Employee"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* CREATE / EDIT MODAL */}
            {showModal && (
                <div className="emp-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="emp-modal" onClick={e => e.stopPropagation()}>
                        <div className="emp-modal-header">
                            <h3>{editingId ? "Edit Employee Profile" : "Enrol New Employee"}</h3>
                            <button
                                type="button"
                                className="emp-modal-close"
                                onClick={() => setShowModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div className="emp-modal-body">
                                <div className="emp-form-grid">
                                    <div className="emp-form-field full">
                                        <label>Full Name *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Vikram Desai"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="emp-form-field">
                                        <label>Employee Code</label>
                                        <div className="emp-code-input-group">
                                            <input
                                                type="text"
                                                placeholder="e.g. EMP-015 (Auto if blank)"
                                                value={form.employee_code}
                                                onChange={e => setForm({ ...form, employee_code: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                    </div>

                                    <div className="emp-form-field">
                                        <label>Phone Number</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. +91 98250 12345"
                                            value={form.phone}
                                            onChange={e => setForm({ ...form, phone: e.target.value })}
                                        />
                                    </div>

                                    <div className="emp-form-field">
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            placeholder="e.g. operator@rainbowcarpet.com"
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                        />
                                    </div>

                                    <div className="emp-form-field">
                                        <label>Joining Date</label>
                                        <input
                                            type="date"
                                            value={form.joining_date}
                                            onChange={e => setForm({ ...form, joining_date: e.target.value })}
                                        />
                                    </div>

                                    <div className="emp-form-field">
                                        <label>Department</label>
                                        <select
                                            value={form.department}
                                            onChange={e => setForm({ ...form, department: e.target.value })}
                                        >
                                            {DEPARTMENTS.map(d => (
                                                <option key={d.value} value={d.value}>{d.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="emp-form-field">
                                        <label>Designation / Role</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. PVC Coating Operator, Line Lead..."
                                            value={form.designation}
                                            onChange={e => setForm({ ...form, designation: e.target.value })}
                                        />
                                    </div>

                                    <div className="emp-form-field">
                                        <label>Working Shift</label>
                                        <select
                                            value={form.shift}
                                            onChange={e => setForm({ ...form, shift: e.target.value })}
                                        >
                                            {SHIFTS.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="emp-form-field">
                                        <label>Employment Status</label>
                                        <select
                                            value={form.status}
                                            onChange={e => setForm({ ...form, status: e.target.value })}
                                        >
                                            <option value="ACTIVE">ACTIVE (On Roster)</option>
                                            <option value="INACTIVE">INACTIVE (Resigned / On Leave)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="emp-modal-footer">
                                <button
                                    type="button"
                                    className="emp-btn secondary"
                                    onClick={() => setShowModal(false)}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="emp-btn primary"
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : editingId ? "Update Employee" : "Enrol Employee"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAIL / ACTIVITY DRAWER MODAL */}
            {showDetailModal && selectedEmployee && (
                <div className="emp-modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="emp-modal" onClick={e => e.stopPropagation()}>
                        <div className="emp-modal-header">
                            <h3>Personnel Roster Card</h3>
                            <button
                                type="button"
                                className="emp-modal-close"
                                onClick={() => setShowDetailModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="emp-modal-body">
                            <div className="emp-detail-card">
                                <div className="emp-detail-header-block">
                                    <div className={`emp-avatar ${getDeptClass(selectedEmployee.department)}`} style={{ width: "56px", height: "56px", fontSize: "1.3rem" }}>
                                        {getInitials(selectedEmployee.name)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a" }}>
                                                {selectedEmployee.name}
                                            </h2>
                                            <span className={`emp-status-badge ${selectedEmployee.status === "ACTIVE" ? "active" : "inactive"}`}>
                                                <span className="emp-dot"></span>
                                                {selectedEmployee.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "3px" }}>
                                            {selectedEmployee.designation || "Staff Member"} • {formatDeptLabel(selectedEmployee.department)}
                                        </div>
                                        <div style={{ marginTop: "6px", display: "flex", gap: "6px" }}>
                                            <span className="emp-tag code">{selectedEmployee.employee_code}</span>
                                            {getShiftBadge(selectedEmployee.shift)}
                                        </div>
                                    </div>
                                </div>

                                {/* Linked Factory Activity */}
                                <div>
                                    <h4 style={{ margin: "0 0 10px 0", fontSize: "0.88rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        Manufacturing Log Traceability
                                    </h4>
                                    <div className="emp-activity-badge-grid">
                                        <div className="emp-activity-card">
                                            <span>Carpet Rolls Produced</span>
                                            <strong>{selectedEmployee.activity?.rolls_count ?? 0}</strong>
                                        </div>
                                        <div className="emp-activity-card">
                                            <span>Shift Production Logs</span>
                                            <strong>{selectedEmployee.activity?.production_entries_count ?? 0}</strong>
                                        </div>
                                        <div className="emp-activity-card">
                                            <span>Quality Inspections</span>
                                            <strong>{selectedEmployee.activity?.inspections_count ?? 0}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact & HR Info */}
                                <div>
                                    <h4 style={{ margin: "0 0 10px 0", fontSize: "0.88rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        Personnel Details
                                    </h4>
                                    <div className="emp-card-details">
                                        <div className="emp-detail-row">
                                            <span className="emp-detail-label">Phone:</span>
                                            <span className="emp-detail-val">
                                                {selectedEmployee.phone ? <a href={`tel:${selectedEmployee.phone}`}>{selectedEmployee.phone}</a> : "—"}
                                            </span>
                                        </div>
                                        <div className="emp-detail-row">
                                            <span className="emp-detail-label">Official Email:</span>
                                            <span className="emp-detail-val">
                                                {selectedEmployee.email ? <a href={`mailto:${selectedEmployee.email}`}>{selectedEmployee.email}</a> : "—"}
                                            </span>
                                        </div>
                                        <div className="emp-detail-row">
                                            <span className="emp-detail-label">Date of Joining:</span>
                                            <span className="emp-detail-val">
                                                {selectedEmployee.joining_date ? String(selectedEmployee.joining_date).substring(0, 10) : "—"}
                                            </span>
                                        </div>
                                        <div className="emp-detail-row">
                                            <span className="emp-detail-label">Record Created:</span>
                                            <span className="emp-detail-val">
                                                {selectedEmployee.created_at ? new Date(selectedEmployee.created_at).toLocaleDateString() : "—"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="emp-modal-footer">
                            <button
                                type="button"
                                className="emp-btn secondary"
                                onClick={() => setShowDetailModal(false)}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                className="emp-btn primary"
                                onClick={() => {
                                    setShowDetailModal(false);
                                    openEdit(selectedEmployee);
                                }}
                            >
                                <Edit2 size={14} /> Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Employees;
