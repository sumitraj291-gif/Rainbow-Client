const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find active user
        const [users] = await pool.query(
            `
            SELECT
                u.id,
                u.role_id,
                u.name,
                u.email,
                u.phone,
                u.password_hash,
                u.status,
                r.name AS role_name,
                r.description AS role_description
            FROM users u
            INNER JOIN roles r
                ON r.id = u.role_id
            WHERE u.email = ?
            LIMIT 1
            `,
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        // Check account status
        if (user.status !== "ACTIVE") {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive. Please contact administrator."
            });
        }

        // Check password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Create JWT
        // Create JWT
        const jwtSecret = process.env.JWT_SECRET || "rainbow_polymers_erp_jwt_secret_key_2026_super_secure";
        const token = jwt.sign(
            {
                id: user.id,
                role_id: user.role_id,
                role: user.role_name,
                email: user.email
            },
            jwtSecret,
            {
                expiresIn: "8h"
            }
        );

        // Update last login
        await pool.query(
            `
            UPDATE users
            SET last_login = NOW()
            WHERE id = ?
            `,
            [user.id]
        );

        // Don't send password hash to frontend
        delete user.password_hash;

        return res.json({
            success: true,
            message: "Login successful",
            token,
            user
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        const errMsg = error.message || error.code || String(error);
        const isDbConnError = error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || errMsg.includes("connect") || errMsg.includes("denied") || !process.env.DATABASE_URL;

        return res.status(500).json({
            success: false,
            message: isDbConnError
                ? "Database not connected. Please set the DATABASE_URL environment variable in the Render Dashboard."
                : `Login failed: ${errMsg}`,
            error: errMsg
        });
    }
};

const me = async (req, res) => {
    try {
        const [users] = await pool.query(
            `
            SELECT
                u.id,
                u.role_id,
                u.name,
                u.email,
                u.phone,
                u.status,
                u.last_login,
                r.name AS role_name,
                r.description AS role_description
            FROM users u
            INNER JOIN roles r
                ON r.id = u.role_id
            WHERE u.id = ?
            LIMIT 1
            `,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error("ME ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load user"
        });
    }
};

module.exports = {
    login,
    me
};