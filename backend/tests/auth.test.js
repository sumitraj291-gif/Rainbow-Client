const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/server");
const pool = require("../src/config/database");

describe("Authentication & Authorization API", () => {
    const testEmail = "test_runner_admin@rainbowcarpet.com";
    const testPassword = "AdminTestPassword@123";

    beforeAll(async () => {
        const hash = await bcrypt.hash(testPassword, 10);
        const [role] = await pool.query("SELECT id FROM roles WHERE name = 'SUPER_ADMIN' OR name = 'ADMIN' LIMIT 1");
        const roleId = role.length > 0 ? role[0].id : 1;

        // Upsert test user
        const [existing] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [testEmail]);
        if (existing.length > 0) {
            await pool.query("UPDATE users SET password_hash = ?, status = 'ACTIVE' WHERE id = ?", [hash, existing[0].id]);
        } else {
            await pool.query(
                "INSERT INTO users (role_id, name, email, password_hash, status) VALUES (?, 'Test Admin', ?, ?, 'ACTIVE')",
                [roleId, testEmail, hash]
            );
        }
    });

    test("POST /api/auth/login - rejects missing email / password", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("POST /api/auth/login - rejects invalid credentials", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: testEmail,
                password: "wrong_password_123"
            });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test("POST /api/auth/login - authenticates and issues JWT token", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: testEmail,
                password: testPassword
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();

        const token = res.body.token;

        // Test GET /api/auth/me with valid Bearer token
        const meRes = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token}`);

        expect(meRes.status).toBe(200);
        expect(meRes.body.success).toBe(true);
        expect(meRes.body.user).toBeDefined();
        expect(meRes.body.user.email).toBe(testEmail);
    });

    test("GET /api/auth/me - rejects request without token", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.status).toBe(401);
    });
});
