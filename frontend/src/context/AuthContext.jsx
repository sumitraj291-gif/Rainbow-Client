import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("erp_token");

        if (!token) {
            setLoading(false);
            return;
        }

        api.defaults.headers.common.Authorization = `Bearer ${token}`;

        const loadUser = async () => {
            try {
                const response = await api.get("/auth/me");

                if (response.data.success) {
                    setUser(response.data.user);
                } else {
                    logout();
                }
            } catch (error) {
                console.error("AUTH RESTORE ERROR:", error);

                localStorage.removeItem("erp_token");
                delete api.defaults.headers.common.Authorization;
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    const login = async (email, password) => {
        const response = await api.post("/auth/login", {
            email,
            password
        });

        if (!response.data.success) {
            throw new Error(
                response.data.message || "Login failed"
            );
        }

        const token = response.data.token;
        const loggedInUser = response.data.user;

        localStorage.setItem("erp_token", token);

        api.defaults.headers.common.Authorization =
            `Bearer ${token}`;

        setUser(loggedInUser);

        return loggedInUser;
    };

    const logout = () => {
        localStorage.removeItem("erp_token");

        delete api.defaults.headers.common.Authorization;

        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                isAuthenticated: !!user
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};