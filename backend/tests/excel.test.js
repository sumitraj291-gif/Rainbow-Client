const request = require("supertest");
const XLSX = require("xlsx");
const app = require("../src/server");

// Custom binary parser helper for Supertest binary endpoints
const binaryParser = (res, cb) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => cb(null, Buffer.concat(chunks)));
};

describe("Excel Import / Export System Tests", () => {
    const allModules = [
        "customers",
        "suppliers",
        "products",
        "raw_materials",
        "employees",
        "machines",
        "sales_orders",
        "production_orders",
        "production_entries",
        "maintenance",
        "dispatches",
        "material_receipts"
    ];

    describe("Excel Template Generation", () => {
        allModules.forEach((mod) => {
            test(`GET /api/excel/template/${mod} returns valid XLSX spreadsheet`, async () => {
                const res = await request(app)
                    .get(`/api/excel/template/${mod}`)
                    .buffer()
                    .parse(binaryParser)
                    .expect(200);

                expect(res.headers["content-type"]).toContain("spreadsheetml");
                expect(res.headers["content-disposition"]).toContain(`${mod}_template.xlsx`);
                expect(Buffer.isBuffer(res.body)).toBe(true);

                // Verify buffer is readable by XLSX
                const wb = XLSX.read(res.body, { type: "buffer" });
                expect(wb.SheetNames.length).toBeGreaterThan(0);
            });
        });

        test("GET /api/excel/template/unknown_module returns 400 Bad Request", async () => {
            const res = await request(app).get("/api/excel/template/unknown_xyz");
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe("Excel Export Functionality", () => {
        allModules.forEach((mod) => {
            test(`GET /api/excel/export/${mod} returns valid exported XLSX file`, async () => {
                const res = await request(app)
                    .get(`/api/excel/export/${mod}`)
                    .buffer()
                    .parse(binaryParser)
                    .expect(200);

                expect(res.headers["content-type"]).toContain("spreadsheetml");
                expect(res.headers["content-disposition"]).toContain(`${mod}_export_`);
                expect(Buffer.isBuffer(res.body)).toBe(true);

                const wb = XLSX.read(res.body, { type: "buffer" });
                expect(wb.SheetNames.length).toBeGreaterThan(0);
            });
        });

        test("GET /api/excel/export/invalid_mod returns 400 Bad Request", async () => {
            const res = await request(app).get("/api/excel/export/invalid_mod");
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe("Excel Import Validation & Parsing", () => {
        test("POST /api/excel/import/customers without file returns 400", async () => {
            const res = await request(app).post("/api/excel/import/customers");
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("No Excel file uploaded");
        });

        test("POST /api/excel/import/unsupported_mod returns 400", async () => {
            const ws = XLSX.utils.aoa_to_sheet([["Test Col"], ["Test Val"]]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            const dummyXlsx = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

            const res = await request(app)
                .post("/api/excel/import/unsupported_mod")
                .attach("file", dummyXlsx, "test.xlsx");
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test("POST /api/excel/import/customers with valid spreadsheet inserts records", async () => {
            const headers = [
                "Customer Code", "Company Name", "Contact Person", "Phone",
                "Email", "GST Number", "Billing Address", "Shipping Address",
                "City", "State", "Pincode", "Credit Limit", "Payment Terms", "Status"
            ];
            const testCode = `CUST-TEST-${Date.now().toString().slice(-4)}`;
            const rowData = [
                testCode, "Unit Test Flooring Ltd", "Pooja Varma", "+91 99000 11222",
                "pooja@unittest.com", "24TEST1234A1Z1", "Test Address 1", "Test Address 1",
                "Ahmedabad", "Gujarat", "380001", "250000", "Net 30 Days", "ACTIVE"
            ];

            const ws = XLSX.utils.aoa_to_sheet([headers, rowData]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Customers");
            const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

            const res = await request(app)
                .post("/api/excel/import/customers")
                .attach("file", buffer, "customers.xlsx");

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.summary).toBeDefined();
            expect(res.body.summary.inserted + res.body.summary.updated).toBeGreaterThanOrEqual(1);
        });
    });
});
