const request = require("supertest");
const app = require("../src/server");
const pool = require("../src/config/database");

// Binary parser for Supertest binary endpoints
const binaryParser = (res, cb) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => cb(null, Buffer.concat(chunks)));
};

describe("Industrial PDF Generation System Tests", () => {
    let testChallanId = 1;
    let testGrnId = 1;

    beforeAll(async () => {
        // Find existing or verify IDs
        try {
            const [chRows] = await pool.query("SELECT id FROM dispatch_challans LIMIT 1");
            if (chRows.length > 0) {
                testChallanId = chRows[0].id;
            }
            const [grnRows] = await pool.query("SELECT id FROM material_receipts LIMIT 1");
            if (grnRows.length > 0) {
                testGrnId = grnRows[0].id;
            }
        } catch (err) {
            console.error("Error setting up test IDs:", err);
        }
    });

    describe("1. Official Delivery Challan (Rule 55)", () => {
        test("GET /api/pdf/challan/:id returns valid PDF document", async () => {
            const res = await request(app)
                .get(`/api/pdf/challan/${testChallanId}`)
                .buffer()
                .parse(binaryParser)
                .expect(200);

            expect(res.headers["content-type"]).toBe("application/pdf");
            expect(res.headers["content-disposition"]).toContain("inline;");
            expect(res.headers["content-disposition"]).toContain(".pdf");
            expect(Buffer.isBuffer(res.body)).toBe(true);

            // Valid PDF header bytes '%PDF-'
            const pdfHeader = res.body.slice(0, 5).toString();
            expect(pdfHeader).toBe("%PDF-");
            expect(res.body.length).toBeGreaterThan(1000);
        });

        test("GET /api/pdf/challan/999999 returns 404 for non-existent challan", async () => {
            const res = await request(app).get("/api/pdf/challan/999999");
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe("2. Security Gate Pass (Outward Vehicle Exit)", () => {
        test("GET /api/pdf/gatepass/:id returns valid PDF document", async () => {
            const res = await request(app)
                .get(`/api/pdf/gatepass/${testChallanId}`)
                .buffer()
                .parse(binaryParser)
                .expect(200);

            expect(res.headers["content-type"]).toBe("application/pdf");
            expect(res.headers["content-disposition"]).toContain("inline;");
            expect(res.headers["content-disposition"]).toContain(".pdf");
            expect(Buffer.isBuffer(res.body)).toBe(true);

            // Valid PDF header bytes '%PDF-'
            const pdfHeader = res.body.slice(0, 5).toString();
            expect(pdfHeader).toBe("%PDF-");
            expect(res.body.length).toBeGreaterThan(1000);
        });

        test("GET /api/pdf/gatepass/999999 returns 404 for non-existent record", async () => {
            const res = await request(app).get("/api/pdf/gatepass/999999");
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe("3. Inward Goods Receipt Note (GRN & Weighbridge Slip)", () => {
        test("GET /api/pdf/grn/:id returns valid PDF document", async () => {
            const res = await request(app)
                .get(`/api/pdf/grn/${testGrnId}`)
                .buffer()
                .parse(binaryParser)
                .expect(200);

            expect(res.headers["content-type"]).toBe("application/pdf");
            expect(res.headers["content-disposition"]).toContain("inline;");
            expect(res.headers["content-disposition"]).toContain(".pdf");
            expect(Buffer.isBuffer(res.body)).toBe(true);

            // Valid PDF header bytes '%PDF-'
            const pdfHeader = res.body.slice(0, 5).toString();
            expect(pdfHeader).toBe("%PDF-");
            expect(res.body.length).toBeGreaterThan(1000);
        });

        test("GET /api/pdf/grn/999999 returns 404 for non-existent record", async () => {
            const res = await request(app).get("/api/pdf/grn/999999");
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe("4. Production Order Job Card & Routing Traveler Sheet", () => {
        test("GET /api/pdf/production-order/:id returns valid PDF document", async () => {
            const res = await request(app)
                .get("/api/pdf/production-order/1")
                .buffer()
                .parse(binaryParser)
                .expect(200);

            expect(res.headers["content-type"]).toBe("application/pdf");
            expect(res.headers["content-disposition"]).toContain("inline;");
            expect(res.headers["content-disposition"]).toContain(".pdf");
            expect(Buffer.isBuffer(res.body)).toBe(true);

            // Valid PDF header bytes '%PDF-'
            const pdfHeader = res.body.slice(0, 5).toString();
            expect(pdfHeader).toBe("%PDF-");
            expect(res.body.length).toBeGreaterThan(1000);
        });

        test("GET /api/pdf/production-order/999999 returns 404 for non-existent record", async () => {
            const res = await request(app).get("/api/pdf/production-order/999999");
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe("5. Sales Order Confirmation & Proforma Tax Invoice", () => {
        test("GET /api/pdf/sales-order/:id returns valid PDF document", async () => {
            const res = await request(app)
                .get("/api/pdf/sales-order/1")
                .buffer()
                .parse(binaryParser)
                .expect(200);

            expect(res.headers["content-type"]).toBe("application/pdf");
            expect(res.headers["content-disposition"]).toContain("inline;");
            expect(res.headers["content-disposition"]).toContain(".pdf");
            expect(Buffer.isBuffer(res.body)).toBe(true);

            // Valid PDF header bytes '%PDF-'
            const pdfHeader = res.body.slice(0, 5).toString();
            expect(pdfHeader).toBe("%PDF-");
            expect(res.body.length).toBeGreaterThan(1000);
        });

        test("GET /api/pdf/sales-order/999999 returns 404 for non-existent record", async () => {
            const res = await request(app).get("/api/pdf/sales-order/999999");
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });
});
