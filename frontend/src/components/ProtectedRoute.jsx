import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
    const {
        user,
        loading
    } = useAuth();

    const location = useLocation();

    if (loading) {
        return (
            <div className="auth-loading">
                <div className="auth-loading-box">
                    <div className="auth-spinner"></div>
                    <p>Loading Rainbow ERP...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    return children;
};

export default ProtectedRoute;