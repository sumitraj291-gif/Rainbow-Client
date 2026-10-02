import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasPermission, getDefaultRoute } from "../config/permissions";
import AccessRestricted from "./AccessRestricted";

const RoleRoute = ({ path, element }) => {
    const { user } = useAuth();
    const userRole = user?.role_name || "";

    if (!hasPermission(userRole, path)) {
        if (path === "/") {
            return <Navigate to={getDefaultRoute(userRole)} replace />;
        }
        return <AccessRestricted userRole={userRole} path={path} userName={user?.name} />;
    }

    return element;
};

export default RoleRoute;
