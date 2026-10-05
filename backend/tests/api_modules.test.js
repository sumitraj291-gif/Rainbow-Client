const request = require("supertest");
const app = require("../src/server");

describe("Core REST API Endpoints Suite", () => {

    describe("1. Customers API", () => {
        test("GET /api/customers - returns customer list", async () => {
            const res = await request(app).get("/api/customers").expect(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe("2. Suppliers API", () => {
        test("GET /api/suppliers - returns suppliers list", async () => {
            const res = await request(app).get("/api/suppliers").expect(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe("3. Products API", () => {
        test("GET /api/products - returns products list", async () => {
            const res = await request(app).get("/api/products").expect(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe("4. Raw Materials & Inventory API", () => {
        test("GET /api/raw-materials - returns raw materials list", async () => {
            const res = await request(app).get("/api/raw-materials").expect(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        test("GET /api/raw-materials/stats - returns inventory valuation stats", async () => {
            const res = await request(app).get("/api/raw-materials/stats").expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.total_materials).toBeDefined();
        });
    });

    describe("5. Employees API", () => {
        test("GET /api/employees - returns plant staff roster", async () => {
            const res = await request(app).get("/api/employees").expect(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe("6. Machines API", () => {
        test("GET /api/machines - returns plant equipment list", async () => {
            const res = await request(app).get("/api/machines").expect(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe("7. Sales Orders API", () => {
        test("GET /api/sales-orders - returns customer sales orders", async () => {
            const res = await request(app).get("/api/sales-orders").expect(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe("8. Production Orders API", () => {
        test("GET /api/production-orders - returns factory production orders", async () => {
            const res = await request(app).get("/api/production-orders").expect(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe("9. Production Entries (Shopfloor Logs)", () => {
        test("GET /api/production-entries - returns recorded production logs", async () => {
            const res = await request(app).get("/api/production-entries").expect(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe("10. Maintenance & Breakdown Management", () => {
        test("GET /api/maintenance/stats - returns plant availability & MTTR metrics", async () => {
            const res = await request(app).get("/api/maintenance/stats").expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.total_machines).toBeDefined();
        });

        test("GET /api/maintenance/breakdowns - returns breakdown logs", async () => {
            const res = await request(app).get("/api/maintenance/breakdowns").expect(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe("11. Dispatch & Gate Pass Challans", () => {
        test("GET /api/dispatches - returns vehicle loading & dispatch challans", async () => {
            const res = await request(app).get("/api/dispatches").expect(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe("12. Material Receipts & Inward GRN", () => {
        test("GET /api/material-receipts - returns inbound GRNs and weighbridge slips", async () => {
            const res = await request(app).get("/api/material-receipts").expect(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe("13. Executive Plant Dashboard", () => {
        test("GET /api/dashboard - returns plant KPI summary", async () => {
            const res = await request(app).get("/api/dashboard").expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
    });
});
