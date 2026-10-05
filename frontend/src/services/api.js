import axios from "axios";

/**
 * Normalizes the API Base URL:
 * 1. Takes VITE_API_URL if provided (e.g. "https://rainbow-backend.onrender.com" or "http://localhost:5000/api")
 * 2. Strips trailing slashes
 * 3. Ensures the path ends with "/api"
 * 4. Gracefully falls back to local Express dev server on localhost or relative "/api" in production
 */
export const getNormalizedApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && envUrl.trim() !== "") {
        const clean = envUrl.trim().replace(/\/+$/, "");
        return clean.endsWith("/api") ? clean : `${clean}/api`;
    }

    if (typeof window !== "undefined") {
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            return "http://localhost:5000/api";
        }
        // In production on the same domain (e.g. Render unified service)
        return "/api";
    }

    return "http://localhost:5000/api";
};

export const API_BASE_URL = getNormalizedApiUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    },
    timeout: 30000
});

// Dynamic request interceptor to attach JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("erp_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for centralized error diagnostics
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            if (error.response.status === 401) {
                // If unauthorized and token is invalid or expired
                const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
                if (currentPath && !currentPath.includes("/login")) {
                    console.warn("[API] 401 Unauthorized encountered. Session may have expired.");
                }
            }
        } else if (error.request) {
            console.error("[API] Network error: No response received from backend at", API_BASE_URL);
        }
        return Promise.reject(error);
    }
);

/**
 * Standardized authenticated fetch helper
 * Drop-in for fetch that automatically handles API_BASE_URL and attaches Authorization Bearer token.
 */
export const authFetch = async (endpointOrUrl, options = {}) => {
    let url = endpointOrUrl;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        const path = endpointOrUrl.startsWith("/") ? endpointOrUrl : `/${endpointOrUrl}`;
        // If path already starts with /api and API_BASE_URL ends with /api, avoid /api/api
        if (path.startsWith("/api") && API_BASE_URL.endsWith("/api")) {
            const rootBase = API_BASE_URL.slice(0, -4);
            url = `${rootBase}${path}`;
        } else {
            url = `${API_BASE_URL}${path}`;
        }
    }

    const headers = {
        ...(options.headers || {})
    };

    const token = localStorage.getItem("erp_token");
    if (token && !headers["Authorization"] && !headers["authorization"]) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers
    });
};

export default api;