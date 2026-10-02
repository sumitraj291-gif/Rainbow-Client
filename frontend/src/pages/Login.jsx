import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const Login = () => {
    const {
        login,
        isAuthenticated
    } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");

        if (!email.trim() || !password) {
            setError("Please enter your email and password.");
            return;
        }

        try {
            setLoading(true);

            await login(
                email.trim().toLowerCase(),
                password
            );

            const from =
                location.state?.from?.pathname || "/";

            navigate(from, { replace: true });

        } catch (error) {
            console.error("LOGIN ERROR:", error);

            setError(
                error.response?.data?.message ||
                error.message ||
                "Unable to login. Please try again."
            );

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">

            <div className="login-card">

                <div className="login-brand">

                    <div className="login-logo">
                        R
                    </div>

                    <div>
                        <h1>RAINBOW</h1>
                        <span>Manufacturing ERP</span>
                    </div>

                </div>

                <div className="login-heading">

                    <h2>Welcome Back</h2>

                    <p>
                        Sign in to access your production management system.
                    </p>

                </div>

                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    <div className="login-field">

                        <label htmlFor="email">
                            Email Address
                        </label>

                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            placeholder="Enter your email"
                            autoComplete="email"
                            disabled={loading}
                        />

                    </div>

                    <div className="login-field">

                        <label htmlFor="password">
                            Password
                        </label>

                        <div className="password-wrapper">

                            <input
                                id="password"
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                disabled={loading}
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() =>
                                    setShowPassword(!showPassword)
                                }
                                disabled={loading}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>

                        </div>

                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Signing In..."
                            : "Sign In"
                        }
                    </button>

                </form>

                <div className="login-footer">

                    <span>
                        Secure Production Management System
                    </span>

                    <span>
                        Version 1.0.0
                    </span>

                </div>

            </div>

        </div>
    );
};

export default Login;