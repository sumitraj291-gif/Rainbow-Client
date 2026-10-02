import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home, Lock } from "lucide-react";
import { getDefaultPathForRole } from "../config/permissions";

const AccessRestricted = ({ userRole, path, userName }) => {
    const defaultPath = getDefaultPathForRole(userRole);

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "65vh",
            padding: "20px"
        }}>
            <div style={{
                background: "#ffffff",
                border: "1px solid #fed7aa",
                borderRadius: "14px",
                maxWidth: "520px",
                width: "100%",
                padding: "36px 30px",
                textAlign: "center",
                boxShadow: "0 10px 25px -5px rgba(234, 88, 12, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)"
            }}>
                <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "14px",
                    background: "#fff7ed",
                    color: "#ea580c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px auto",
                    border: "1px solid #ffedd5"
                }}>
                    <Lock size={28} />
                </div>

                <span style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#ea580c",
                    background: "#fff7ed",
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    border: "1px solid #fed7aa"
                }}>
                    Security Restriction
                </span>

                <h2 style={{
                    fontSize: "1.35rem",
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "14px 0 8px 0"
                }}>
                    Access Denied
                </h2>

                <p style={{
                    fontSize: "0.88rem",
                    color: "#64748b",
                    lineHeight: "1.5",
                    margin: "0 0 20px 0"
                }}>
                    Hello <strong>{userName || "User"}</strong>, your current system role (
                    <span style={{ color: "#ea580c", fontWeight: 700 }}>{userRole || "User"}</span>
                    ) is not authorized to access this module.
                </p>

                <div style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "0.78rem",
                    color: "#475467",
                    marginBottom: "24px",
                    textAlign: "left"
                }}>
                    <div><strong>Requested Module:</strong> <code>{path}</code></div>
                    <div style={{ marginTop: "4px" }}>
                        If you need access to this section for production operations, please request an updated role from your <strong>Plant Administrator</strong>.
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                    <Link
                        to={defaultPath}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "9px 20px",
                            background: "#2563eb",
                            color: "#ffffff",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            textDecoration: "none",
                            boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
                        }}
                    >
                        <Home size={16} />
                        Go to My Workspace
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AccessRestricted;
