const request = require("supertest");
const app = require("../src/server");
const pool = require("../src/config/database");

describe("API Health & Database Connectivity", () => {
    afterAll(async () => {
        // Allow pool to finish
    });

    test("GET / - Root endpoint returns running status", async () => {
        const res = await request(app).get("/");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain("Production Management API is running");
    });

    test("GET /api/health - Database is connected and healthy", async () => {
        const res = await request(app).get("/api/health");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.database).toBe(true);
    });
});
