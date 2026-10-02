import React from "react";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../config/permissions";
import AccessRestricted from "./AccessRestricted";

const RoleRoute = ({ path, element }) => {
    const { user } = useAuth();
    const userRole = user?.role_name || "";

    if (!hasPermission(userRole, path)) {
        return <AccessRestricted userRole={userRole} path={path} userName={user?.name} />;
    }

    return element;
};

export default RoleRoute;
