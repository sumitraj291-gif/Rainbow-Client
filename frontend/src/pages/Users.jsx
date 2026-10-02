import React, { useEffect, useState } from "react";
import api from "../services/api";
import {
    Plus,
    Search,
    RefreshCw,
    UserCheck,
    Users as UsersIcon,
    Shield,
    Lock,
    Key,
    Edit2,
    Trash2,
    X,
    Sparkles,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    Building,
    UserPlus,
    Power
} from "lucide-react";
import "./Users.css";

const Users = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [eligibleEmployees, setEligibleEmployees] = useState([]);
    const [stats, setStats] = useState({
        total_users: 0,
        active_users: 0,
        inactive_users: 0,
        unlinked_employees: 0
    });

    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const [selectedEmployeeObj, setSelectedEmployeeObj] = useState(null);
    const [formEmail, setFormEmail] = useState("");
    const [formRoleId, setFormRoleId] = useState("");
    const [formPassword, setFormPassword] = useState("");
    const [formStatus, setFormStatus] = useState("ACTIVE");
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    // Edit User Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [editForm, setEditForm] = useState({
        email: "",
        phone: "",
        role_id: "",
        status: "ACTIVE"
    });
    const [savingEdit, setSavingEdit] = useState(false);

    // Reset Password Modal State
    const [showResetModal, setShowResetModal] = useState(false);
    const [userToReset, setUserToReset] = useState(null);
    const [newPassword, setNewPassword] = useState("");
    const [resetting, setResetting] = useState(false);

    // Delete Modal State
    const [userToDelete, setUserToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Alerts
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Load initial data
    useEffect(() => {
        loadData();
    }, [roleFilter, statusFilter]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError("");

            const params = {};
            if (roleFilter !== "ALL") params.role = roleFilter;
            if (statusFilter !== "ALL") params.status = statusFilter;
            if (search.trim()) params.search = search.trim();

            const [usersRes, rolesRes, eligibleRes] = await Promise.all([
                api.get("/users", { params }),
                api.get("/users/roles"),
                api.get("/users/eligible-employees")
            ]);

            if (usersRes.data?.success) {
                setUsers(usersRes.data.data || []);
                if (usersRes.data.stats) {
                    setStats(usersRes.data.stats);
                }
            }

            if (rolesRes.data?.success) {
                setRoles(rolesRes.data.data || []);
            }

            if (eligibleRes.data?.success) {
                setEligibleEmployees(eligibleRes.data.data || []);
            }
        } catch (err) {
            console.error("Load users error:", err);
            setError(err.response?.data?.message || "Failed to load user accounts.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        loadData();
    };

    // Open Add User Modal
    const handleOpenAddModal = async () => {
        try {
            setError("");
            // Refresh eligible employees list to ensure 100% up-to-date exclusion
            const res = await api.get("/users/eligible-employees");
            const list = res.data?.data || [];
            setEligibleEmployees(list);

            setSelectedEmployeeId("");
            setSelectedEmployeeObj(null);
            setFormEmail("");
            setFormRoleId(roles.length > 0 ? roles[roles.length - 1].id : "7"); // Default to Operator or first
            setFormPassword(generatePassword());
            setFormStatus("ACTIVE");
            setShowPassword(true);
            setShowAddModal(true);
        } catch (err) {
            setError("Could not load eligible employee roster.");
        }
    };

    // Helper: Generate Random Password
    const generatePassword = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
        let pass = "Rainbow@";
        for (let i = 0; i < 4; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return pass;
    };

    // When Employee Dropdown Selection Changes
    const handleEmployeeSelect = (e) => {
        const empId = e.target.value;
        setSelectedEmployeeId(empId);

        if (!empId) {
            setSelectedEmployeeObj(null);
            setFormEmail("");
            return;
        }

        const emp = eligibleEmployees.find((item) => String(item.id) === String(empId));
        if (emp) {
            setSelectedEmployeeObj(emp);
            // Auto fill email from employee record or fallback to official email
            setFormEmail(emp.email || `${emp.employee_code.toLowerCase()}@rainbowcarpet.com`);

            // Suggest appropriate role based on department
            if (emp.department === "QUALITY_CONTROL") {
                const qcRole = roles.find((r) => r.name === "QC_MANAGER");
                if (qcRole) setFormRoleId(qcRole.id);
            } else if (emp.department === "WAREHOUSE") {
                const storeRole = roles.find((r) => r.name === "STORE_MANAGER");
                if (storeRole) setFormRoleId(storeRole.id);
            } else if (emp.department === "PRODUCTION") {
                if (emp.designation?.toLowerCase().includes("supervisor")) {
                    const supRole = roles.find((r) => r.name === "SUPERVISOR");
                    if (supRole) setFormRoleId(supRole.id);
                } else {
                    const opRole = roles.find((r) => r.name === "OPERATOR");
                    if (opRole) setFormRoleId(opRole.id);
                }
            }
        }
    };

    // Submit Create User
    const handleCreateUser = async (e) => {
        e.preventDefault();

        if (!selectedEmployeeId) {
            setError("Please select a registered employee from the dropdown list.");
            return;
        }

        if (!formEmail.trim()) {
            setError("Login email is required.");
            return;
        }

        if (!formPassword || formPassword.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            const payload = {
                employee_id: Number(selectedEmployeeId),
                role_id: Number(formRoleId),
                email: formEmail.trim().toLowerCase(),
                password: formPassword,
                status: formStatus
            };

            const response = await api.post("/users", payload);

            if (response.data?.success) {
                setSuccess(response.data.message || "User login created successfully!");
                setShowAddModal(false);
                loadData();
                setTimeout(() => setSuccess(""), 5000);
            }
        } catch (err) {
            console.error("Create user error:", err);
            setError(err.response?.data?.message || "Failed to create user account.");
        } finally {
            setSaving(false);
        }
    };

    const handleOpenEditUser = (user) => {
        setUserToEdit(user);
        setEditForm({
            email: user.email || "",
            phone: user.phone || "",
            role_id: user.role_id ? String(user.role_id) : "",
            status: user.status || "ACTIVE"
        });
        setShowEditModal(true);
    };

    const handleSaveEditUser = async (e) => {
        e.preventDefault();

        if (!userToEdit) return;

        try {
            setSavingEdit(true);
            setError("");

            const payload = {
                email: editForm.email.trim().toLowerCase(),
                phone: editForm.phone.trim(),
                role_id: Number(editForm.role_id),
                status: editForm.status
            };

            const response = await api.put(`/users/${userToEdit.id}`, payload);

            if (response.data?.success) {
                setSuccess(response.data.message || "User updated successfully.");
                setShowEditModal(false);
                setUserToEdit(null);
                loadData();
                setTimeout(() => setSuccess(""), 4000);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update user.");
        } finally {
            setSavingEdit(false);
        }
    };

    // Open Reset Password Modal
    const handleOpenReset = (user) => {
        setUserToReset(user);
        setNewPassword(generatePassword());
        setShowResetModal(true);
    };

    const handleConfirmReset = async (e) => {
        e.preventDefault();
        if (!userToReset || !newPassword || newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        try {
            setResetting(true);
            setError("");
            await api.put(`/users/${userToReset.id}/reset-password`, { new_password: newPassword });
            setSuccess(`Password for ${userToReset.name} has been reset successfully!`);
            setShowResetModal(false);
            setUserToReset(null);
            setTimeout(() => setSuccess(""), 5000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to reset password.");
        } finally {
            setResetting(false);
        }
    };

    // Toggle User Status
    const handleToggleStatus = async (user) => {
        try {
            setError("");
            const res = await api.patch(`/users/${user.id}/status`);
            if (res.data?.success) {
                setSuccess(res.data.message);
                loadData();
                setTimeout(() => setSuccess(""), 4000);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Could not change user status.");
        }
    };

    // Delete User
    const handleDeleteClick = (user) => {
        setUserToDelete(user);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;

        try {
            setDeleting(true);
            setError("");
            await api.delete(`/users/${userToDelete.id}`);
            setSuccess(`User account for ${userToDelete.name} deleted. Employee can now be reassigned if needed.`);
            setUserToDelete(null);
            loadData();
            setTimeout(() => setSuccess(""), 5000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to delete user.");
        } finally {
            setDeleting(false);
        }
    };

    // Helper: Get Role badge class
    const getRoleBadgeClass = (roleName) => {
        const r = (roleName || "").toLowerCase();
        if (r.includes("super_admin")) return "role-badge super_admin";
        if (r.includes("admin")) return "role-badge admin";
        if (r.includes("production")) return "role-badge production_manager";
        if (r.includes("supervisor")) return "role-badge supervisor";
        if (r.includes("operator")) return "role-badge operator";
        if (r.includes("qc")) return "role-badge qc_manager";
        if (r.includes("store")) return "role-badge store_manager";
        if (r.includes("sales")) return "role-badge sales";
        return "role-badge";
    };

    return (
        <div className="users-page">
            {/* Header */}
            <div className="users-header-card">
                <div className="users-header-info">
                    <h1>User Management & Access Control</h1>
                    <p>Manage system login credentials, employee software accounts, and security roles.</p>
                </div>

                <div className="users-header-actions">
                    <button
                        className="user-refresh-btn"
                        onClick={loadData}
                        title="Refresh List"
                        type="button"
                    >
                        <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                    </button>

                    <button
                        id="add-user-btn"
                        className="user-primary-btn"
                        onClick={handleOpenAddModal}
                        type="button"
                    >
                        <UserPlus size={16} strokeWidth={2.5} />
                        Add User
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {success && (
                <div className="user-alert success">
                    <CheckCircle2 size={18} />
                    <span>{success}</span>
                </div>
            )}

            {error && (
                <div className="user-alert error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* KPI Cards */}
            <div className="users-stats-grid">
                <div className="user-stat-card">
                    <div className="user-stat-icon blue">
                        <UsersIcon size={22} />
                    </div>
                    <div className="user-stat-content">
                        <span className="user-stat-label">Total System Users</span>
                        <span className="user-stat-value">{stats.total_users || users.length}</span>
                        <span className="user-stat-sub">Configured logins</span>
                    </div>
                </div>

                <div className="user-stat-card">
                    <div className="user-stat-icon green">
                        <UserCheck size={22} />
                    </div>
                    <div className="user-stat-content">
                        <span className="user-stat-label">Active Logins</span>
                        <span className="user-stat-value">{stats.active_users || 0}</span>
                        <span className="user-stat-sub">Enabled software access</span>
                    </div>
                </div>

                <div className="user-stat-card">
                    <div className="user-stat-icon purple">
                        <Shield size={22} />
                    </div>
                    <div className="user-stat-content">
                        <span className="user-stat-label">System Roles</span>
                        <span className="user-stat-value">{roles.length || 8}</span>
                        <span className="user-stat-sub">RBAC security tiers</span>
                    </div>
                </div>

                <div className="user-stat-card">
                    <div className="user-stat-icon amber">
                        <Building size={22} />
                    </div>
                    <div className="user-stat-content">
                        <span className="user-stat-label">Employees Without Login</span>
                        <span className="user-stat-value">{stats.unlinked_employees || eligibleEmployees.length}</span>
                        <span className="user-stat-sub">Shop-floor roster</span>
                    </div>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="users-filter-bar">
                <form className="user-search-wrap" onSubmit={handleSearchSubmit}>
                    <Search size={16} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Search by name, email, employee code or department..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>

                <div className="user-filter-group">
                    <select
                        className="user-filter-select"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="ALL">All Roles</option>
                        {roles.map((r) => (
                            <option key={r.id} value={r.name}>
                                {r.name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="user-filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>

                    <button
                        className="user-primary-btn"
                        style={{ height: "36px", padding: "0 14px", fontSize: "0.82rem" }}
                        onClick={loadData}
                        type="button"
                    >
                        Filter
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="users-table-card">
                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
                        <p>Loading users...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div style={{ padding: "50px", textAlign: "center", color: "#64748b" }}>
                        <UsersIcon size={36} color="#cbd5e1" style={{ margin: "0 auto 12px" }} />
                        <h3 style={{ margin: "0 0 6px 0", color: "#334155" }}>No Users Found</h3>
                        <p style={{ margin: 0, fontSize: "0.85rem" }}>
                            {search ? "No users match your query." : "Click '+ Add User' to assign credentials to an employee."}
                        </p>
                    </div>
                ) : (
                    <div className="users-table-responsive">
                        <table className="user-table">
                            <thead>
                                <tr>
                                    <th style={{ width: "23%" }}>User / Employee</th>
                                    <th style={{ width: "16%" }}>System Role</th>
                                    <th style={{ width: "21%" }}>Login Email</th>
                                    <th style={{ width: "20%" }}>Department & Designation</th>
                                    <th style={{ width: "8%" }}>Status</th>
                                    <th style={{ width: "12%" }}>Last Login</th>
                                    <th style={{ width: "120px", textAlign: "right", paddingRight: "20px" }}>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {users.map((u) => {
                                    const initials = (u.name || "U")
                                        .split(" ")
                                        .map((p) => p[0])
                                        .join("")
                                        .slice(0, 2)
                                        .toUpperCase();

                                    const isRoot = u.id === 1;

                                    return (
                                        <tr key={u.id}>
                                            <td>
                                                <div className="user-profile-cell">
                                                    <div className={`user-avatar ${isRoot ? "admin" : ""}`}>
                                                        {initials}
                                                    </div>
                                                    <div className="user-info-text">
                                                        <span className="user-name-title">
                                                            {u.name}
                                                            {isRoot && (
                                                                <span style={{ fontSize: "0.68rem", color: "#7e22ce", fontWeight: 700, marginLeft: 4 }}>
                                                                    (ROOT)
                                                                </span>
                                                            )}
                                                        </span>
                                                        {u.employee_code ? (
                                                            <span className="user-emp-code">
                                                                {u.employee_code}
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                                                                Master System Account
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <span className={getRoleBadgeClass(u.role_name)}>
                                                    {u.role_name}
                                                </span>
                                            </td>

                                            <td>
                                                <span style={{ fontFamily: "monospace", fontSize: "0.84rem", color: "#1e293b" }}>
                                                    {u.email}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="user-dept-title">
                                                    {u.department ? u.department.replace("_", " ") : "ADMINISTRATION"}
                                                </div>
                                                <div className="user-dept-sub">
                                                    {u.designation || (isRoot ? "System Administrator" : "Staff")}
                                                </div>
                                            </td>

                                            <td>
                                                <span className={`user-status-badge ${u.status === "ACTIVE" ? "active" : "inactive"}`}>
                                                    {u.status}
                                                </span>
                                            </td>

                                            <td>
                                                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                                                    {u.last_login
                                                        ? new Date(u.last_login).toLocaleString("en-IN", {
                                                              day: "2-digit",
                                                              month: "short",
                                                              hour: "2-digit",
                                                              minute: "2-digit"
                                                          })
                                                        : "Never"}
                                                </span>
                                            </td>

                                            <td style={{ textAlign: "right", paddingRight: "20px" }}>
                                                <div className="user-actions-cell" style={{ justifyContent: "flex-end" }}>
                                                    {/* Edit User */}
                                                    <button
                                                        className="user-action-btn edit"
                                                        onClick={() => handleOpenEditUser(u)}
                                                        title="Edit User"
                                                        type="button"
                                                    >
                                                        <Edit2 size={15} />
                                                    </button>

                                                    {/* Reset Password */}
                                                    <button
                                                        className="user-action-btn key"
                                                        onClick={() => handleOpenReset(u)}
                                                        title="Reset User Password"
                                                        type="button"
                                                    >
                                                        <Key size={15} />
                                                    </button>

                                                    {/* Toggle Status */}
                                                    {!isRoot && (
                                                        <button
                                                            className="user-action-btn"
                                                            onClick={() => handleToggleStatus(u)}
                                                            title={u.status === "ACTIVE" ? "Deactivate Account" : "Activate Account"}
                                                            type="button"
                                                        >
                                                            <Power size={15} color={u.status === "ACTIVE" ? "#ea580c" : "#16a34a"} />
                                                        </button>
                                                    )}

                                                    {/* Delete User */}
                                                    {!isRoot && (
                                                        <button
                                                            className="user-action-btn delete"
                                                            onClick={() => handleDeleteClick(u)}
                                                            title="Delete User (Frees Employee)"
                                                            type="button"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}
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

            {/* ADD USER MODAL (STRICT EMPLOYEE PICKER) */}
            {showAddModal && (
                <div className="user-modal-overlay">
                    <div className="user-modal-card">
                        <div className="user-modal-header">
                            <div className="user-modal-title">
                                <UserPlus size={20} color="#2563eb" />
                                <h2>Create Employee Login Account</h2>
                            </div>
                            <button
                                className="user-modal-close"
                                onClick={() => setShowAddModal(false)}
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser}>
                            <div className="user-modal-body">
                                <div className="user-alert info" style={{ padding: "8px 12px", fontSize: "0.8rem" }}>
                                    <Shield size={16} style={{ flexShrink: 0 }} />
                                    <span>
                                        <strong>Strict Rule:</strong> A user login can only be created for an existing employee in the company roster. Employees with existing accounts are automatically excluded.
                                    </span>
                                </div>

                                {/* Employee Dropdown */}
                                <div className="user-form-group">
                                    <label>Select Registered Employee *</label>
                                    <select
                                        value={selectedEmployeeId}
                                        onChange={handleEmployeeSelect}
                                        required
                                        style={{ fontWeight: 600 }}
                                    >
                                        <option value="">
                                            {eligibleEmployees.length === 0
                                                ? "— All active employees already have user accounts —"
                                                : "— Choose Employee from Roster (" + eligibleEmployees.length + " Available) —"}
                                        </option>
                                        {eligibleEmployees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                [{emp.employee_code}] {emp.name} — {emp.department} ({emp.designation || "Staff"})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Preview Card for Selected Employee */}
                                {selectedEmployeeObj && (
                                    <div className="user-emp-preview-card">
                                        <div className="emp-preview-info">
                                            <div className="emp-preview-avatar">
                                                {selectedEmployeeObj.name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .slice(0, 2)
                                                    .toUpperCase()}
                                            </div>
                                            <div className="emp-preview-details">
                                                <h4>
                                                    {selectedEmployeeObj.name}{" "}
                                                    <span style={{ fontSize: "0.76rem", color: "#2563eb" }}>
                                                        ({selectedEmployeeObj.employee_code})
                                                    </span>
                                                </h4>
                                                <p>
                                                    {selectedEmployeeObj.department} &bull; {selectedEmployeeObj.designation || "Staff"} &bull; Phone: {selectedEmployeeObj.phone || "—"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Login Email */}
                                <div className="user-form-group">
                                    <label>Login Email Address *</label>
                                    <input
                                        type="email"
                                        value={formEmail}
                                        onChange={(e) => setFormEmail(e.target.value)}
                                        placeholder="e.g. employee@rainbowcarpet.com"
                                        required
                                    />
                                </div>

                                {/* System Role Dropdown */}
                                <div className="user-form-group">
                                    <label>Assign System Role & Permissions *</label>
                                    <select
                                        value={formRoleId}
                                        onChange={(e) => setFormRoleId(e.target.value)}
                                        required
                                    >
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.name} — {r.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Initial Password */}
                                <div className="user-form-group">
                                    <label>Initial Login Password *</label>
                                    <div className="user-password-wrap">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={formPassword}
                                            onChange={(e) => setFormPassword(e.target.value)}
                                            placeholder="Enter minimum 6 characters..."
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            className="user-gen-btn"
                                            onClick={() => setFormPassword(generatePassword())}
                                            title="Generate Safe Password"
                                        >
                                            <Sparkles size={13} style={{ display: "inline", marginRight: 4 }} />
                                            Auto
                                        </button>
                                        <button
                                            type="button"
                                            className="user-gen-btn"
                                            onClick={() => setShowPassword(!showPassword)}
                                            title="Toggle Visibility"
                                        >
                                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="user-form-group">
                                    <label>Account Status</label>
                                    <select
                                        value={formStatus}
                                        onChange={(e) => setFormStatus(e.target.value)}
                                    >
                                        <option value="ACTIVE">ACTIVE (Can login immediately)</option>
                                        <option value="INACTIVE">INACTIVE (Login blocked)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="user-modal-footer">
                                <button
                                    type="button"
                                    className="user-cancel-btn"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="user-submit-btn"
                                    disabled={saving || !selectedEmployeeId}
                                >
                                    {saving ? "Creating Account..." : "Create User Login"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT USER MODAL */}
            {showEditModal && userToEdit && (
                <div className="user-modal-overlay">
                    <div className="user-modal-card" style={{ maxWidth: "520px" }}>
                        <div className="user-modal-header">
                            <div className="user-modal-title">
                                <Edit2 size={20} color="#2563eb" />
                                <h2>Edit User Access</h2>
                            </div>
                            <button
                                className="user-modal-close"
                                onClick={() => setShowEditModal(false)}
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditUser}>
                            <div className="user-modal-body">
                                <div className="user-form-group">
                                    <label>User Name</label>
                                    <input value={userToEdit.name} disabled />
                                </div>

                                <div className="user-form-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="user-form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        placeholder="Enter phone number"
                                    />
                                </div>

                                <div className="user-form-group">
                                    <label>Assign Role</label>
                                    <select
                                        value={editForm.role_id}
                                        onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
                                        required
                                    >
                                        {roles.map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {role.name} — {role.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="user-form-group">
                                    <label>Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                    </select>
                                </div>
                            </div>

                            <div className="user-modal-footer">
                                <button
                                    type="button"
                                    className="user-cancel-btn"
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="user-submit-btn"
                                    disabled={savingEdit}
                                >
                                    {savingEdit ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* RESET PASSWORD MODAL */}
            {showResetModal && userToReset && (
                <div className="user-modal-overlay">
                    <div className="user-modal-card" style={{ maxWidth: "460px" }}>
                        <div className="user-modal-header">
                            <div className="user-modal-title">
                                <Key size={20} color="#ca8a04" />
                                <h2>Reset Password</h2>
                            </div>
                            <button
                                className="user-modal-close"
                                onClick={() => setShowResetModal(false)}
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmReset}>
                            <div className="user-modal-body">
                                <p style={{ margin: 0, fontSize: "0.88rem", color: "#334155" }}>
                                    Reset login password for <strong>{userToReset.name}</strong> ({userToReset.email})
                                </p>

                                <div className="user-form-group" style={{ marginTop: 10 }}>
                                    <label>New Password (Min 6 chars)</label>
                                    <div className="user-password-wrap">
                                        <input
                                            type="text"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            className="user-gen-btn"
                                            onClick={() => setNewPassword(generatePassword())}
                                        >
                                            <Sparkles size={13} style={{ display: "inline", marginRight: 4 }} />
                                            Random
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="user-modal-footer">
                                <button
                                    type="button"
                                    className="user-cancel-btn"
                                    onClick={() => setShowResetModal(false)}
                                    disabled={resetting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="user-submit-btn"
                                    disabled={resetting}
                                >
                                    {resetting ? "Resetting..." : "Save New Password"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE USER CONFIRMATION MODAL */}
            {userToDelete && (
                <div className="user-modal-overlay">
                    <div className="user-modal-card" style={{ maxWidth: "440px" }}>
                        <div className="user-modal-header">
                            <div className="user-modal-title">
                                <Shield size={20} color="#dc2626" />
                                <h2>Delete User Account</h2>
                            </div>
                            <button
                                className="user-modal-close"
                                onClick={() => setUserToDelete(null)}
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="user-modal-body">
                            <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155" }}>
                                Are you sure you want to delete login account for <strong>{userToDelete.name}</strong> ({userToDelete.email})?
                            </p>
                            <p style={{ margin: "10px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                                💡 <strong>Note:</strong> Deleting this user account will revoke their login rights, and their linked employee record will automatically re-appear in the eligible list to create a new account if needed.
                            </p>
                        </div>

                        <div className="user-modal-footer">
                            <button
                                type="button"
                                className="user-cancel-btn"
                                onClick={() => setUserToDelete(null)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="user-submit-btn"
                                style={{ background: "#dc2626" }}
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                            >
                                {deleting ? "Deleting..." : "Delete Permanently"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
