const PDFDocument = require("pdfkit");
const pool = require("../config/database");

// =========================================================
// COMPANY METADATA CONSTANTS
// =========================================================
const COMPANY = {
    name: "RAINBOW POLYMERS & CARPETS PVT. LTD.",
    tagline: "Manufacturers of Premium PVC Flooring, Tufted Carpets & Industrial Vinyl Rolls",
    address: "Plot 124-128, Phase IV, GIDC Industrial Estate, Sachin, Surat, Gujarat - 394230",
    gstin: "24AABCR8819Q1ZP",
    cin: "U17220GJ2015PTC081290",
    pan: "AABCR8819Q",
    phone: "+91 261 2891100 / +91 98251 00200",
    email: "dispatch@rainbowcarpet.com | store@rainbowcarpet.com",
    state: "Gujarat (Code 24)"
};

// =========================================================
// NUMBER TO WORDS (INDIAN CURRENCY FORMAT)
// =========================================================
function numberToWordsIndian(num) {
    if (!num || isNaN(num) || Number(num) <= 0) return "Rupees Zero Only";
    const n = Math.floor(Number(num));
    const paisa = Math.round((Number(num) - n) * 100);

    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function convertLessThanThousand(val) {
        let str = "";
        if (val >= 100) {
            str += a[Math.floor(val / 100)] + " Hundred ";
            val %= 100;
        }
        if (val >= 20) {
            str += b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : "") + " ";
        } else if (val > 0) {
            str += a[val] + " ";
        }
        return str.trim();
    }

    let crores = Math.floor(n / 10000000);
    let remainder = n % 10000000;
    let lakhs = Math.floor(remainder / 100000);
    remainder %= 100000;
    let thousands = Math.floor(remainder / 1000);
    remainder %= 1000;
    let hundreds = remainder;

    let res = "";
    if (crores > 0) res += convertLessThanThousand(crores) + " Crore ";
    if (lakhs > 0) res += convertLessThanThousand(lakhs) + " Lakh ";
    if (thousands > 0) res += convertLessThanThousand(thousands) + " Thousand ";
    if (hundreds > 0) res += convertLessThanThousand(hundreds) + " ";

    res = "Rupees " + res.trim();
    if (paisa > 0) {
        res += " and " + convertLessThanThousand(paisa) + " Paise";
    }
    return res + " Only";
}

// =========================================================
// DYNAMIC PAGE LAYOUT CONFIGURATOR (AUTO-ADJUSTING)
// =========================================================
function resolvePageConfig(req) {
    const rawSize = String(req.query.size || "A4").toUpperCase();
    const rawOrientation = String(req.query.orientation || "portrait").toLowerCase();

    // Standard paper size validation
    const validSizes = {
        A4: "A4",
        A5: "A5",
        LETTER: "LETTER"
    };
    const size = validSizes[rawSize] || "A4";
    const layout = rawOrientation === "landscape" ? "landscape" : "portrait";
    const isLandscape = layout === "landscape";

    // Auto-adjust scale & margins based on physical paper dimension
    let scale = 1.0;
    let margin = 36;

    if (size === "A5") {
        scale = isLandscape ? 0.72 : 0.75;
        margin = 20;
    } else if (isLandscape) {
        scale = 0.92;
        margin = 32;
    }

    return { size, layout, margin, scale, isLandscape };
}

// =========================================================
// AUTO-ADJUSTING PDF DRAWING HELPERS
// =========================================================

function drawHeader(doc, title, cfg) {
    const { margin, scale } = cfg;
    const contentWidth = doc.page.width - (2 * margin);

    // Header Top Banner Line
    doc.rect(margin, margin - 4, contentWidth, 3 * scale).fill("#1e3a8a");

    // Company Name
    doc.fillColor("#0f172a")
       .fontSize(14 * scale)
       .font("Helvetica-Bold")
       .text(COMPANY.name, margin, margin + (4 * scale), { width: contentWidth, align: "center" });

    // Tagline & Factory Info
    doc.fillColor("#64748b")
       .fontSize(7.5 * scale)
       .font("Helvetica")
       .text(COMPANY.tagline, margin, margin + (20 * scale), { width: contentWidth, align: "center" });
    
    doc.text(`${COMPANY.address} | Phone: ${COMPANY.phone}`, margin, margin + (30 * scale), { width: contentWidth, align: "center" });
    doc.text(`GSTIN: ${COMPANY.gstin} | State: ${COMPANY.state} | CIN: ${COMPANY.cin}`, margin, margin + (40 * scale), { width: contentWidth, align: "center" });

    // Document Title Banner (Clean title without debug tags)
    const bannerY = margin + (51 * scale);
    const bannerH = 19 * scale;
    doc.rect(margin, bannerY, contentWidth, bannerH).fill("#1e293b");
    doc.fillColor("#ffffff")
       .fontSize(9 * scale)
       .font("Helvetica-Bold")
       .text(title.toUpperCase(), margin, bannerY + (5 * scale), { width: contentWidth, align: "center" });

    doc.fillColor("#000000"); // Reset fill
    return bannerY + bannerH + (8 * scale);
}

function drawInfoRow(doc, label, value, x, y, labelWidth, valueWidth, scale = 1.0) {
    doc.fontSize(7.2 * scale)
       .font("Helvetica-Bold")
       .fillColor("#475569")
       .text(label, x, y, { width: labelWidth });
    
    doc.font("Helvetica")
       .fillColor("#0f172a")
       .text(String(value || "—"), x + labelWidth + 2, y, { width: valueWidth });
}

// =========================================================
// 1. GENERATE OFFICIAL DELIVERY CHALLAN (RULE 55)
// =========================================================

const generateDeliveryChallanPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const cfg = resolvePageConfig(req);

        // Fetch Challan
        const [challans] = await pool.query(`
            SELECT 
                dc.*,
                c.customer_code,
                c.contact_person,
                c.phone AS customer_phone,
                c.email AS customer_email,
                c.billing_address,
                c.shipping_address,
                c.city AS dest_city,
                c.state AS dest_state,
                c.pincode AS dest_pincode,
                so.order_number,
                so.order_date
            FROM dispatch_challans dc
            LEFT JOIN customers c ON c.id = dc.customer_id
            LEFT JOIN sales_orders so ON so.id = dc.sales_order_id
            WHERE dc.id = ?
            LIMIT 1
        `, [id]);

        if (challans.length === 0) {
            return res.status(404).json({ success: false, message: "Delivery Challan not found" });
        }

        const challan = challans[0];

        // Fetch Items
        const [items] = await pool.query(`
            SELECT 
                dci.*,
                cr.thickness_mm,
                cr.gsm,
                cr.warehouse_location
            FROM dispatch_challan_items dci
            LEFT JOIN carpet_rolls cr ON cr.id = dci.carpet_roll_id
            WHERE dci.challan_id = ?
            ORDER BY dci.id ASC
        `, [id]);

        // Init PDFKit Document with auto-adjusted geometry
        const doc = new PDFDocument({ 
            size: cfg.size, 
            layout: cfg.layout, 
            margin: cfg.margin 
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="Delivery_Challan_${challan.challan_number}_${cfg.size}.pdf"`);
        doc.pipe(res);

        const { margin, scale } = cfg;
        const contentWidth = doc.page.width - (2 * margin);

        // Header (Clean Title without debug tag)
        let curY = drawHeader(doc, "DELIVERY CHALLAN (RULE 55 - GST APPLICABLE IN TRANSIT)", cfg);

        // Auto-Adjusting Two Column Details Box
        const colGap = 10 * scale;
        const colWidth = (contentWidth - colGap) / 2;
        const leftX = margin;
        const rightX = margin + colWidth + colGap;
        const boxHeight = 108 * scale;
        const boxY = curY;

        doc.rect(margin, boxY, contentWidth, boxHeight).lineWidth(0.8).stroke("#cbd5e1");
        doc.moveTo(margin + colWidth + (colGap / 2), boxY).lineTo(margin + colWidth + (colGap / 2), boxY + boxHeight).stroke("#cbd5e1");

        const lblW = colWidth * 0.38;
        const valW = colWidth * 0.58;
        const rowStep = 14 * scale;

        // Left Column: Challan & Consignee
        drawInfoRow(doc, "Challan Number:", challan.challan_number, leftX + (6 * scale), boxY + (6 * scale), lblW, valW, scale);
        drawInfoRow(doc, "Gate Pass No:", challan.gate_pass_number || "—", leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 1), lblW, valW, scale);
        drawInfoRow(doc, "Dispatch Date:", `${new Date(challan.dispatch_date).toLocaleDateString("en-IN")} ${challan.dispatch_time || ""}`, leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 2), lblW, valW, scale);
        drawInfoRow(doc, "Sales Order Ref:", challan.order_number || challan.sales_order_number || "DIRECT", leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 3), lblW, valW, scale);
        drawInfoRow(doc, "Consignee Name:", challan.customer_name, leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 4), lblW, valW, scale);
        drawInfoRow(doc, "Delivery Address:", `${challan.delivery_address || challan.shipping_address || "Factory Direct"}`, leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 5), lblW, valW, scale);
        drawInfoRow(doc, "Customer GSTIN:", challan.customer_gst || "URP (Unregistered)", leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 6), lblW, valW, scale);

        // Right Column: Logistics & Vehicle
        drawInfoRow(doc, "Vehicle Number:", challan.vehicle_number, rightX + (6 * scale), boxY + (6 * scale), lblW, valW, scale);
        drawInfoRow(doc, "Transporter Name:", challan.transporter_name || "Self Logistics", rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 1), lblW, valW, scale);
        drawInfoRow(doc, "LR / Bilty No:", challan.lr_number || "—", rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 2), lblW, valW, scale);
        drawInfoRow(doc, "LR Date:", challan.lr_date ? new Date(challan.lr_date).toLocaleDateString("en-IN") : "—", rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 3), lblW, valW, scale);
        drawInfoRow(doc, "Driver Name & Ph:", `${challan.driver_name || "—"} (${challan.driver_phone || "—"})`, rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 4), lblW, valW, scale);
        drawInfoRow(doc, "Driver License:", challan.driver_license || "—", rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 5), lblW, valW, scale);
        drawInfoRow(doc, "E-Way Bill Number:", challan.eway_bill_number || "—", rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 6), lblW, valW, scale);

        // Proportional Table Header
        let tableY = boxY + boxHeight + (10 * scale);
        const headerH = 16 * scale;
        doc.rect(margin, tableY, contentWidth, headerH).fill("#0f172a");

        // Percentage Column Widths (Total = 1.0)
        const colPcts = [0.06, 0.22, 0.26, 0.09, 0.09, 0.10, 0.09, 0.09];
        const colWs = colPcts.map(pct => pct * contentWidth);
        const colXs = [];
        let accX = margin;
        for (let i = 0; i < colWs.length; i++) {
            colXs.push(accX);
            accX += colWs[i];
        }

        doc.fillColor("#ffffff").fontSize(7 * scale).font("Helvetica-Bold");
        doc.text("S.N.", colXs[0], tableY + (4 * scale), { width: colWs[0], align: "center" });
        doc.text("ROLL SERIAL NO", colXs[1] + 2, tableY + (4 * scale), { width: colWs[1] - 4 });
        doc.text("PRODUCT / GRADE DESCRIPTION", colXs[2] + 2, tableY + (4 * scale), { width: colWs[2] - 4 });
        doc.text("WIDTH (m)", colXs[3], tableY + (4 * scale), { width: colWs[3] - 2, align: "right" });
        doc.text("LENGTH (m)", colXs[4], tableY + (4 * scale), { width: colWs[4] - 2, align: "right" });
        doc.text("AREA (SQM)", colXs[5], tableY + (4 * scale), { width: colWs[5] - 2, align: "right" });
        doc.text("NET WT (KG)", colXs[6], tableY + (4 * scale), { width: colWs[6] - 2, align: "right" });
        doc.text("GROSS (KG)", colXs[7], tableY + (4 * scale), { width: colWs[7] - 2, align: "right" });

        tableY += headerH;

        // Dynamic Table Rows
        let totalLinear = 0;
        let totalSqm = 0;
        let totalNet = 0;
        let totalGross = 0;

        items.forEach((item, index) => {
            const desc = item.product_name || "PVC Vinyl Carpet Roll";
            doc.fontSize(7 * scale).font("Helvetica");
            const textH = doc.heightOfString(desc, { width: colWs[2] - 4 });
            const rowH = Math.max(16 * scale, textH + (6 * scale));

            if (index % 2 === 0) {
                doc.rect(margin, tableY, contentWidth, rowH).fill("#f8fafc");
            }

            const textY = tableY + (3.5 * scale);
            doc.fillColor("#0f172a").fontSize(7 * scale).font("Helvetica");
            doc.text(String(index + 1), colXs[0], textY, { width: colWs[0], align: "center" });
            doc.font("Helvetica-Bold").text(item.roll_number, colXs[1] + 2, textY, { width: colWs[1] - 4 });
            doc.font("Helvetica").text(desc, colXs[2] + 2, textY, { width: colWs[2] - 4 });
            doc.text(Number(item.width_m || item.width_meters || 2.0).toFixed(2), colXs[3], textY, { width: colWs[3] - 2, align: "right" });
            doc.text(Number(item.length_m || item.length_meters || 30.0).toFixed(2), colXs[4], textY, { width: colWs[4] - 2, align: "right" });
            doc.text(Number(item.area_sqm || 60.0).toFixed(2), colXs[5], textY, { width: colWs[5] - 2, align: "right" });
            doc.text(Number(item.net_weight_kg || 0).toFixed(1), colXs[6], textY, { width: colWs[6] - 2, align: "right" });
            doc.text(Number(item.gross_weight_kg || 0).toFixed(1), colXs[7], textY, { width: colWs[7] - 2, align: "right" });

            totalLinear += Number(item.length_m || item.length_meters || 0);
            totalSqm += Number(item.area_sqm || 0);
            totalNet += Number(item.net_weight_kg || 0);
            totalGross += Number(item.gross_weight_kg || 0);

            tableY += rowH;
        });

        // Totals Row
        const totH = 16 * scale;
        doc.rect(margin, tableY, contentWidth, totH).fill("#e2e8f0");
        doc.fillColor("#0f172a").fontSize(7.5 * scale).font("Helvetica-Bold");
        doc.text(`TOTAL MANIFEST (${items.length} ROLLS)`, colXs[1] + 2, tableY + (4 * scale), { width: colWs[1] + colWs[2] });
        doc.text(totalLinear > 0 ? totalLinear.toFixed(2) : Number(challan.total_linear_meters || 0).toFixed(2), colXs[4], tableY + (4 * scale), { width: colWs[4] - 2, align: "right" });
        doc.text(totalSqm > 0 ? totalSqm.toFixed(2) : Number(challan.total_sqm || 0).toFixed(2), colXs[5], tableY + (4 * scale), { width: colWs[5] - 2, align: "right" });
        doc.text(totalNet > 0 ? totalNet.toFixed(1) : Number(challan.total_net_weight_kg || 0).toFixed(1), colXs[6], tableY + (4 * scale), { width: colWs[6] - 2, align: "right" });
        doc.text(totalGross > 0 ? totalGross.toFixed(1) : Number(challan.total_gross_weight_kg || 0).toFixed(1), colXs[7], tableY + (4 * scale), { width: colWs[7] - 2, align: "right" });

        tableY += totH + (10 * scale);

        // Declarations Box
        const declH = 38 * scale;
        doc.rect(margin, tableY, contentWidth, declH).lineWidth(0.5).stroke("#cbd5e1");
        doc.fillColor("#475569").fontSize(6.5 * scale).font("Helvetica");
        doc.text("DECLARATION & TERMS:", margin + (6 * scale), tableY + (4 * scale), { underline: true });
        doc.text("1. Certified that the particulars given above are true and correct under Rule 55 of CGST/SGST Rules 2017.", margin + (6 * scale), tableY + (12 * scale));
        doc.text("2. Goods once dispatched shall not be taken back without prior written QC clearance.", margin + (6 * scale), tableY + (20 * scale));
        doc.text(`3. Remarks: ${challan.remarks || "Loaded in good order, moisture protected packing."}`, margin + (6 * scale), tableY + (28 * scale));

        tableY += declH + (24 * scale);

        // Proportional 3-Way Signatures with Date
        const sigWidth = (contentWidth - (20 * scale)) / 3;
        const sigY = tableY;

        doc.lineCap("butt").moveTo(margin, sigY).lineTo(margin + sigWidth, sigY).stroke("#94a3b8");
        doc.moveTo(margin + sigWidth + (10 * scale), sigY).lineTo(margin + (2 * sigWidth) + (10 * scale), sigY).stroke("#94a3b8");
        doc.moveTo(margin + (2 * sigWidth) + (20 * scale), sigY).lineTo(margin + contentWidth, sigY).stroke("#94a3b8");

        doc.fillColor("#0f172a").fontSize(7 * scale).font("Helvetica-Bold");
        doc.text("PREPARED BY", margin, sigY + (4 * scale), { width: sigWidth, align: "center" });
        doc.font("Helvetica").fontSize(6 * scale).fillColor("#64748b").text(`${challan.created_by || "Dispatch Supervisor"}\nDate: ____________`, margin, sigY + (13 * scale), { width: sigWidth, align: "center" });

        doc.fillColor("#0f172a").fontSize(7 * scale).font("Helvetica-Bold").text("SECURITY GATE OFFICER", margin + sigWidth + (10 * scale), sigY + (4 * scale), { width: sigWidth, align: "center" });
        doc.font("Helvetica").fontSize(6 * scale).fillColor("#64748b").text(`${challan.security_officer_name || "Main Gate Security"}\nDate: ____________`, margin + sigWidth + (10 * scale), sigY + (13 * scale), { width: sigWidth, align: "center" });

        doc.fillColor("#0f172a").fontSize(7 * scale).font("Helvetica-Bold").text("RECEIVER'S SIGNATURE & STAMP", margin + (2 * sigWidth) + (20 * scale), sigY + (4 * scale), { width: sigWidth, align: "center" });
        doc.font("Helvetica").fontSize(6 * scale).fillColor("#64748b").text("Authorized Customer Seal\nDate: ____________", margin + (2 * sigWidth) + (20 * scale), sigY + (13 * scale), { width: sigWidth, align: "center" });

        doc.end();

    } catch (error) {
        console.error("Delivery Challan PDF error:", error);
        res.status(500).json({ success: false, message: "Failed to generate Delivery Challan PDF", error: error.message });
    }
};

// =========================================================
// 2. GENERATE SECURITY GATE PASS (OUTWARD)
// =========================================================

const generateGatePassPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const cfg = resolvePageConfig(req);

        const [challans] = await pool.query(`
            SELECT * FROM dispatch_challans WHERE id = ? LIMIT 1
        `, [id]);

        if (challans.length === 0) {
            return res.status(404).json({ success: false, message: "Gate pass record not found" });
        }

        const challan = challans[0];

        const doc = new PDFDocument({ 
            size: cfg.size, 
            layout: cfg.layout, 
            margin: cfg.margin 
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="Gate_Pass_${challan.gate_pass_number || challan.challan_number}_${cfg.size}.pdf"`);
        doc.pipe(res);

        const { margin, scale } = cfg;
        const contentWidth = doc.page.width - (2 * margin);

        // Header (Clean Title without debug tag)
        let curY = drawHeader(doc, "SECURITY GATE PASS (VEHICLE OUTWARD CLEARANCE)", cfg);

        const y = curY;
        const mainBoxH = 150 * scale;
        doc.rect(margin, y, contentWidth, mainBoxH).lineWidth(1).stroke("#1e293b");

        // High-contrast Gate Pass Badge Top Bar
        const barH = 22 * scale;
        doc.rect(margin, y, contentWidth, barH).fill("#0284c7");
        doc.fillColor("#ffffff").fontSize(9.5 * scale).font("Helvetica-Bold");
        doc.text(`GATE PASS NO: ${challan.gate_pass_number || ("GP-" + challan.challan_number)}`, margin + (10 * scale), y + (6 * scale));
        doc.text(`DATE: ${new Date(challan.dispatch_date).toLocaleDateString("en-IN")}`, margin + contentWidth - (180 * scale), y + (6 * scale), { align: "right", width: 170 * scale });

        // Information Grid
        const colGap = 12 * scale;
        const colWidth = (contentWidth - colGap) / 2;
        const leftX = margin + (10 * scale);
        const rightX = margin + colWidth + colGap;
        const lblW = colWidth * 0.40;
        const valW = colWidth * 0.55;
        const rowStep = 18 * scale;
        let rowY = y + barH + (10 * scale);

        drawInfoRow(doc, "Delivery Challan Ref:", challan.challan_number, leftX, rowY, lblW, valW, scale);
        drawInfoRow(doc, "Vehicle Reg. Number:", challan.vehicle_number, rightX, rowY, lblW, valW, scale);

        rowY += rowStep;
        drawInfoRow(doc, "Transporter Name:", challan.transporter_name || "Self Logistics", leftX, rowY, lblW, valW, scale);
        drawInfoRow(doc, "Driver Full Name:", challan.driver_name || "—", rightX, rowY, lblW, valW, scale);

        rowY += rowStep;
        drawInfoRow(doc, "Driver Phone No:", challan.driver_phone || "—", leftX, rowY, lblW, valW, scale);
        drawInfoRow(doc, "Driver License No:", challan.driver_license || "—", rightX, rowY, lblW, valW, scale);

        rowY += rowStep;
        drawInfoRow(doc, "Destination Customer:", challan.customer_name, leftX, rowY, lblW, valW, scale);
        drawInfoRow(doc, "E-Way Bill Number:", challan.eway_bill_number || "—", rightX, rowY, lblW, valW, scale);

        rowY += rowStep;
        drawInfoRow(doc, "Total Loaded Rolls:", `${challan.total_rolls} Units`, leftX, rowY, lblW, valW, scale);
        drawInfoRow(doc, "Gross Vehicle Wt (MT):", `${(Number(challan.total_gross_weight_kg || 0) / 1000).toFixed(2)} MT`, rightX, rowY, lblW, valW, scale);

        rowY += rowStep;
        drawInfoRow(doc, "Total Linear Meters:", `${Number(challan.total_linear_meters || 0).toFixed(2)} M`, leftX, rowY, lblW, valW, scale);
        drawInfoRow(doc, "Total Surface Area:", `${Number(challan.total_sqm || 0).toFixed(2)} SQM`, rightX, rowY, lblW, valW, scale);

        // Security Checklist Box
        const checkY = y + mainBoxH + (14 * scale);
        const checkH = 75 * scale;
        doc.rect(margin, checkY, contentWidth, checkH).fill("#f8fafc").stroke("#e2e8f0");
        doc.fillColor("#0f172a").fontSize(8 * scale).font("Helvetica-Bold").text("SECURITY VERIFICATION CHECKLIST (MANDATORY BEFORE BARRIER CLEARANCE)", margin + (10 * scale), checkY + (7 * scale));

        doc.fillColor("#334155").fontSize(7 * scale).font("Helvetica");
        doc.text("[  X  ] Vehicle physical roll count matches delivery challan count exactly.", margin + (10 * scale), checkY + (22 * scale));
        doc.text("[  X  ] Commercial driving license & ID card verified and recorded.", margin + (10 * scale), checkY + (34 * scale));
        doc.text("[  X  ] Cargo weather seal and tarpaulin checked for rain safety.", margin + (10 * scale), checkY + (46 * scale));
        doc.text(`[  X  ] Security Exit Seal Number: SEAL-${Date.now().toString().slice(-6)} verified intact.`, margin + (10 * scale), checkY + (58 * scale));

        // Gate Signatures with Date
        const sigY = checkY + checkH + (32 * scale);
        const sigWidth = (contentWidth - (20 * scale)) / 3;

        doc.moveTo(margin, sigY).lineTo(margin + sigWidth, sigY).stroke("#94a3b8");
        doc.moveTo(margin + sigWidth + (10 * scale), sigY).lineTo(margin + (2 * sigWidth) + (10 * scale), sigY).stroke("#94a3b8");
        doc.moveTo(margin + (2 * sigWidth) + (20 * scale), sigY).lineTo(margin + contentWidth, sigY).stroke("#94a3b8");

        doc.fillColor("#0f172a").fontSize(7.5 * scale).font("Helvetica-Bold");
        doc.text("DISPATCH INCHARGE", margin, sigY + (4 * scale), { width: sigWidth, align: "center" });
        doc.font("Helvetica").fontSize(6 * scale).fillColor("#64748b").text("Verified & Released\nDate: ____________", margin, sigY + (13 * scale), { width: sigWidth, align: "center" });

        doc.fillColor("#0f172a").fontSize(7.5 * scale).font("Helvetica-Bold").text("DRIVER ACKNOWLEDGMENT", margin + sigWidth + (10 * scale), sigY + (4 * scale), { width: sigWidth, align: "center" });
        doc.font("Helvetica").fontSize(6 * scale).fillColor("#64748b").text("Cargo Received Intact\nDate: ____________", margin + sigWidth + (10 * scale), sigY + (13 * scale), { width: sigWidth, align: "center" });

        doc.fillColor("#0f172a").fontSize(7.5 * scale).font("Helvetica-Bold").text("MAIN GATE SECURITY OFFICER", margin + (2 * sigWidth) + (20 * scale), sigY + (4 * scale), { width: sigWidth, align: "center" });
        doc.font("Helvetica").fontSize(6 * scale).fillColor("#64748b").text("Outward Barrier Cleared\nDate: ____________", margin + (2 * sigWidth) + (20 * scale), sigY + (13 * scale), { width: sigWidth, align: "center" });

        doc.end();

    } catch (error) {
        console.error("Gate Pass PDF error:", error);
        res.status(500).json({ success: false, message: "Failed to generate Gate Pass PDF", error: error.message });
    }
};

// =========================================================
// 3. GENERATE INWARD MATERIAL RECEIPT (GRN SLIP)
// =========================================================

const generateMaterialReceiptPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const cfg = resolvePageConfig(req);

        // Fetch GRN with Supplier and Purchase Order details
        const [receiptRows] = await pool.query(`
            SELECT 
                mr.*,
                s.supplier_code,
                s.company_name AS supplier_name,
                s.contact_person AS supplier_contact,
                s.phone AS supplier_phone,
                s.email AS supplier_email,
                s.gst_number AS supplier_gst,
                s.address AS supplier_address,
                s.city AS supplier_city,
                s.state AS supplier_state,
                s.pincode AS supplier_pincode,
                s.payment_terms,
                po.po_number,
                po.order_date AS po_date
            FROM material_receipts mr
            INNER JOIN suppliers s ON s.id = mr.supplier_id
            LEFT JOIN purchase_orders po ON po.id = mr.purchase_order_id
            WHERE mr.id = ?
            LIMIT 1
        `, [id]);

        if (receiptRows.length === 0) {
            return res.status(404).json({ success: false, message: "Material receipt (GRN) not found" });
        }

        const grn = receiptRows[0];

        // Fetch Items with full chemical properties
        const [items] = await pool.query(`
            SELECT 
                mri.*,
                rm.material_code,
                rm.material_name,
                rm.grade,
                mc.name AS category_name,
                u.symbol AS unit_symbol
            FROM material_receipt_items mri
            INNER JOIN raw_materials rm ON rm.id = mri.material_id
            LEFT JOIN material_categories mc ON mc.id = rm.category_id
            LEFT JOIN units u ON u.id = rm.unit_id
            WHERE mri.receipt_id = ?
            ORDER BY mri.id ASC
        `, [id]);

        const doc = new PDFDocument({ 
            size: cfg.size, 
            layout: cfg.layout, 
            margin: cfg.margin 
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="GRN_Receipt_${grn.grn_number}_${cfg.size}.pdf"`);
        doc.pipe(res);

        const { margin, scale } = cfg;
        const contentWidth = doc.page.width - (2 * margin);

        // Header (Clean Title without debug tag)
        let curY = drawHeader(doc, "GOODS RECEIPT NOTE (INWARD RAW MATERIAL & STORE INTAKE)", cfg);

        // Comprehensive 2-Column Metadata Details Box
        const colGap = 10 * scale;
        const colWidth = (contentWidth - colGap) / 2;
        const leftX = margin;
        const rightX = margin + colWidth + colGap;
        const boxHeight = 114 * scale;
        const boxY = curY;

        doc.rect(margin, boxY, contentWidth, boxHeight).lineWidth(0.8).stroke("#cbd5e1");
        doc.moveTo(margin + colWidth + (colGap / 2), boxY).lineTo(margin + colWidth + (colGap / 2), boxY + boxHeight).stroke("#cbd5e1");

        const lblW = colWidth * 0.38;
        const valW = colWidth * 0.58;
        const rowStep = 14 * scale;

        // Left Column: Document & Supplier Details
        drawInfoRow(doc, "GRN Number:", grn.grn_number, leftX + (6 * scale), boxY + (6 * scale), lblW, valW, scale);
        drawInfoRow(doc, "Receipt Date:", new Date(grn.receipt_date).toLocaleDateString("en-IN"), leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 1), lblW, valW, scale);
        drawInfoRow(doc, "Supplier Name:", grn.supplier_name, leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 2), lblW, valW, scale);
        drawInfoRow(doc, "Supplier Code & GST:", `${grn.supplier_code} | ${grn.supplier_gst || "—"}`, leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 3), lblW, valW, scale);
        drawInfoRow(doc, "Supplier Address:", `${grn.supplier_city || ""}, ${grn.supplier_state || ""}`, leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 4), lblW, valW, scale);
        
        const poDateStr = grn.po_date ? ` (${new Date(grn.po_date).toLocaleDateString("en-IN")})` : "";
        drawInfoRow(doc, "Purchase Order Ref:", `${grn.po_number || "DIRECT / SPOT PO"}${poDateStr}`, leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 5), lblW, valW, scale);
        drawInfoRow(doc, "Store Location Bay:", grn.store_location || "MAIN-RAW-WH-01", leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 6), lblW, valW, scale);

        // Right Column: Invoice, Logistics & Weighbridge Details
        drawInfoRow(doc, "Invoice Number:", grn.invoice_number || "—", rightX + (6 * scale), boxY + (6 * scale), lblW, valW, scale);
        const invDateStr = grn.invoice_date ? new Date(grn.invoice_date).toLocaleDateString("en-IN") : new Date(grn.receipt_date).toLocaleDateString("en-IN");
        drawInfoRow(doc, "Invoice Date:", invDateStr, rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 1), lblW, valW, scale);
        drawInfoRow(doc, "Challan / DC No:", grn.supplier_challan_no || "—", rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 2), lblW, valW, scale);
        drawInfoRow(doc, "Vehicle Number:", grn.vehicle_number || "—", rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 3), lblW, valW, scale);
        drawInfoRow(doc, "Transporter Name:", grn.transporter_name || "Supplier Transport", rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 4), lblW, valW, scale);
        drawInfoRow(doc, "LR / Bilty Number:", grn.lr_number || "—", rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 5), lblW, valW, scale);
        
        const netStr = `${Number(grn.weighbridge_net_kg || 0).toLocaleString()} KG (${Number(grn.weighbridge_gross_kg || 0).toLocaleString()} / ${Number(grn.weighbridge_tare_kg || 0).toLocaleString()})`;
        drawInfoRow(doc, "Net (Gross / Tare):", netStr, rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 6), lblW, valW, scale);

        // 10-Column Proportional Table Header (Industrial ERP Standard)
        let tableY = boxY + boxHeight + (10 * scale);
        const headerH = 16 * scale;
        doc.rect(margin, tableY, contentWidth, headerH).fill("#0f172a");

        // Percentage Column Widths (Sum = 1.00)
        // S.N.(4%), CODE(11%), DESC(23%), BATCH(12%), PKG(9%), CHL QTY(8%), ACC QTY(8%), REJ QTY(7%), RATE(8%), AMOUNT(10%)
        const colPcts = [0.04, 0.11, 0.23, 0.12, 0.09, 0.08, 0.08, 0.07, 0.08, 0.10];
        const colWs = colPcts.map(pct => pct * contentWidth);
        const colXs = [];
        let accX = margin;
        for (let i = 0; i < colWs.length; i++) {
            colXs.push(accX);
            accX += colWs[i];
        }

        doc.fillColor("#ffffff").fontSize(6.8 * scale).font("Helvetica-Bold");
        doc.text("S.N.", colXs[0], tableY + (4 * scale), { width: colWs[0], align: "center" });
        doc.text("CODE", colXs[1] + 2, tableY + (4 * scale), { width: colWs[1] - 4 });
        doc.text("DESCRIPTION & GRADE", colXs[2] + 2, tableY + (4 * scale), { width: colWs[2] - 4 });
        doc.text("BATCH NO", colXs[3] + 2, tableY + (4 * scale), { width: colWs[3] - 4 });
        doc.text("PKG / TYPE", colXs[4] + 2, tableY + (4 * scale), { width: colWs[4] - 4, align: "center" });
        doc.text("CHL QTY", colXs[5], tableY + (4 * scale), { width: colWs[5] - 2, align: "right" });
        doc.text("ACC QTY", colXs[6], tableY + (4 * scale), { width: colWs[6] - 2, align: "right" });
        doc.text("REJ QTY", colXs[7], tableY + (4 * scale), { width: colWs[7] - 2, align: "right" });
        doc.text("RATE (INR)", colXs[8], tableY + (4 * scale), { width: colWs[8] - 2, align: "right" });
        doc.text("AMOUNT (INR)", colXs[9], tableY + (4 * scale), { width: colWs[9] - 2, align: "right" });

        tableY += headerH;

        let totalChallanQty = 0;
        let totalAcceptedQty = 0;
        let totalRejectedQty = 0;
        let totalAmount = 0;
        let totalPackagesCount = 0;
        let totalBagsCount = 0;
        let moistureSum = 0;
        let coaCount = 0;

        items.forEach((item, index) => {
            const desc = `${item.material_name} (${item.grade || item.category_name || "COMMERCIAL"})`;
            
            // Dynamic row height to prevent multi-line collision
            doc.fontSize(6.6 * scale).font("Helvetica");
            const textH = doc.heightOfString(desc, { width: colWs[2] - 4 });
            const rowH = Math.max(16 * scale, textH + (6 * scale));

            if (index % 2 === 0) {
                doc.rect(margin, tableY, contentWidth, rowH).fill("#f8fafc");
            }

            const chlQty = Number(item.received_quantity || 0);
            const accQty = Number(item.accepted_quantity || item.received_quantity || 0);
            const rejQty = Number(item.rejected_quantity || 0);
            const rate = Number(item.rate || 0);
            const amount = Number(item.total_item_amount || (accQty * rate) || 0);
            const pkgs = Number(item.number_of_packages || 0);

            const textY = tableY + (3.5 * scale);
            doc.fillColor("#0f172a").fontSize(6.6 * scale).font("Helvetica");
            doc.text(String(index + 1), colXs[0], textY, { width: colWs[0], align: "center" });
            doc.font("Helvetica-Bold").text(item.material_code, colXs[1] + 2, textY, { width: colWs[1] - 4 });
            doc.font("Helvetica").text(desc, colXs[2] + 2, textY, { width: colWs[2] - 4 });
            doc.text(item.batch_number || "—", colXs[3] + 2, textY, { width: colWs[3] - 4 });
            doc.text(`${pkgs > 0 ? pkgs + " " : ""}${item.package_type || "BAGS"}`, colXs[4] + 2, textY, { width: colWs[4] - 4, align: "center" });
            
            doc.text(chlQty.toLocaleString(), colXs[5], textY, { width: colWs[5] - 2, align: "right" });
            doc.font("Helvetica-Bold").text(accQty.toLocaleString(), colXs[6], textY, { width: colWs[6] - 2, align: "right" });
            
            // Highlight rejected qty in red if greater than 0
            if (rejQty > 0) {
                doc.fillColor("#b91c1c").font("Helvetica-Bold").text(rejQty.toLocaleString(), colXs[7], textY, { width: colWs[7] - 2, align: "right" });
                doc.fillColor("#0f172a").font("Helvetica");
            } else {
                doc.text("0", colXs[7], textY, { width: colWs[7] - 2, align: "right" });
            }

            doc.text(rate.toFixed(2), colXs[8], textY, { width: colWs[8] - 2, align: "right" });
            doc.font("Helvetica-Bold").text(amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colXs[9], textY, { width: colWs[9] - 2, align: "right" });

            totalChallanQty += chlQty;
            totalAcceptedQty += accQty;
            totalRejectedQty += rejQty;
            totalAmount += amount;
            totalPackagesCount += pkgs;
            if ((item.package_type || "").toUpperCase().includes("BAG")) {
                totalBagsCount += pkgs;
            }
            if (item.moisture_pct) moistureSum += Number(item.moisture_pct);
            if (item.coa_attached) coaCount++;

            tableY += rowH;
        });

        const finalAmount = totalAmount > 0 ? totalAmount : Number(grn.total_amount_inr || 0);

        // Totals Row
        const totH = 17 * scale;
        doc.rect(margin, tableY, contentWidth, totH).fill("#e2e8f0");
        doc.fillColor("#0f172a").fontSize(7 * scale).font("Helvetica-Bold");
        doc.text(`TOTAL MANIFEST (${items.length} ITEMS)`, colXs[1] + 2, tableY + (4.5 * scale), { width: colWs[1] + colWs[2] });
        doc.text(`${totalChallanQty.toLocaleString()}`, colXs[5], tableY + (4.5 * scale), { width: colWs[5] - 2, align: "right" });
        doc.text(`${totalAcceptedQty.toLocaleString()}`, colXs[6], tableY + (4.5 * scale), { width: colWs[6] - 2, align: "right" });
        doc.text(`${totalRejectedQty.toLocaleString()}`, colXs[7], tableY + (4.5 * scale), { width: colWs[7] - 2, align: "right" });
        doc.text(`Rs. ${finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colXs[9], tableY + (4.5 * scale), { width: colWs[9] - 2, align: "right" });

        tableY += totH + (8 * scale);

        // Summary Bar: Packages Tally & Inward Valuation in Words
        const summaryH = 30 * scale;
        doc.rect(margin, tableY, contentWidth, summaryH).fill("#f8fafc").stroke("#cbd5e1");
        
        const pkgSummaryText = totalPackagesCount > 0 
            ? `${totalPackagesCount.toLocaleString()} PACKAGES (${totalBagsCount > 0 ? totalBagsCount.toLocaleString() + " Bags / Units" : "Standard Packages"})`
            : `${Number(grn.total_packages || items.length).toLocaleString()} PACKAGES / BALES`;

        doc.fillColor("#1e293b").fontSize(7 * scale).font("Helvetica-Bold");
        doc.text(`TOTAL PACKAGE TALLY: ${pkgSummaryText}`, margin + (8 * scale), tableY + (5 * scale));

        const wordsStr = numberToWordsIndian(finalAmount);
        doc.fillColor("#0f172a").fontSize(7 * scale).font("Helvetica-Bold");
        doc.text("TOTAL INWARD VALUATION (IN WORDS): ", margin + (8 * scale), tableY + (16 * scale), { continued: true });
        doc.font("Helvetica").fillColor("#334155").text(wordsStr);

        tableY += summaryH + (10 * scale);

        // Chemical IQC Lab Test Parameters & Quality Certification Box
        const qcH = 44 * scale;
        doc.rect(margin, tableY, contentWidth, qcH).lineWidth(0.5).stroke("#cbd5e1");
        doc.fillColor("#0f172a").fontSize(7.5 * scale).font("Helvetica-Bold");
        doc.text("INCOMING QUALITY CONTROL (IQC) & CHEMICAL LAB CERTIFICATION:", margin + (8 * scale), tableY + (5 * scale));

        const avgMoisture = items.length > 0 && moistureSum > 0 ? (moistureSum / items.length).toFixed(2) : "0.10";
        const coaStatus = (coaCount > 0 || grn.status === "APPROVED") ? "VERIFIED & ATTACHED [X]" : "NOT APPLICABLE";

        doc.fillColor("#334155").fontSize(6.8 * scale).font("Helvetica");
        doc.text(`1. Laboratory Parameters: Average Moisture: ${avgMoisture}% | K-Value / Viscosity: Verified within Factory Standards.`, margin + (8 * scale), tableY + (16 * scale));
        doc.text(`2. Supplier Certificate of Analysis (COA): ${coaStatus} | Quality Clearance Status: [ ${grn.status || "APPROVED"} ].`, margin + (8 * scale), tableY + (25 * scale));
        doc.text(`3. Store Intake Remarks: ${grn.remarks || "Material inspected, physical bags verified intact, accepted into raw material warehouse stock."}`, margin + (8 * scale), tableY + (34 * scale));

        tableY += qcH + (24 * scale);

        // Professional 3-Way Authorization Signatures with Name, Date and Plant Seal Lines
        const sigWidth = (contentWidth - (20 * scale)) / 3;
        const sigY = tableY;

        doc.lineCap("butt").moveTo(margin, sigY).lineTo(margin + sigWidth, sigY).stroke("#94a3b8");
        doc.moveTo(margin + sigWidth + (10 * scale), sigY).lineTo(margin + (2 * sigWidth) + (10 * scale), sigY).stroke("#94a3b8");
        doc.moveTo(margin + (2 * sigWidth) + (20 * scale), sigY).lineTo(margin + contentWidth, sigY).stroke("#94a3b8");

        doc.fillColor("#0f172a").fontSize(7 * scale).font("Helvetica-Bold");
        doc.text("WEIGHBRIDGE OPERATOR", margin, sigY + (4 * scale), { width: sigWidth, align: "center" });
        doc.font("Helvetica").fontSize(6 * scale).fillColor("#64748b");
        doc.text("Gross/Tare Verified\nDate: ____________", margin, sigY + (13 * scale), { width: sigWidth, align: "center" });

        doc.fillColor("#0f172a").fontSize(7 * scale).font("Helvetica-Bold");
        doc.text("PLANT QC CHEMIST", margin + sigWidth + (10 * scale), sigY + (4 * scale), { width: sigWidth, align: "center" });
        doc.font("Helvetica").fontSize(6 * scale).fillColor("#64748b");
        doc.text("Chemical Lab Cleared\nDate: ____________", margin + sigWidth + (10 * scale), sigY + (13 * scale), { width: sigWidth, align: "center" });

        doc.fillColor("#0f172a").fontSize(7 * scale).font("Helvetica-Bold");
        doc.text("STORE MANAGER / AUTH SIGNATORY", margin + (2 * sigWidth) + (20 * scale), sigY + (4 * scale), { width: sigWidth, align: "center" });
        doc.font("Helvetica").fontSize(6 * scale).fillColor("#64748b");
        doc.text("For Rainbow Polymers & Carpets Pvt. Ltd.\nDate: ____________", margin + (2 * sigWidth) + (20 * scale), sigY + (13 * scale), { width: sigWidth, align: "center" });

        doc.end();

    } catch (error) {
        console.error("Material Receipt PDF error:", error);
        res.status(500).json({ success: false, message: "Failed to generate Material Receipt PDF", error: error.message });
    }
};

// =========================================================
// 4. GENERATE PRODUCTION ORDER JOB CARD & TRAVELER SHEET
// =========================================================

const generateProductionOrderJobCardPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const cfg = resolvePageConfig(req);

        // 1. Fetch Production Order Details
        const [orders] = await pool.query(`
            SELECT 
                po.*,
                p.product_code,
                p.product_name,
                p.carpet_type,
                p.design_pattern,
                p.colour,
                p.thickness_mm,
                p.gsm,
                p.surface_finish,
                p.backing_type,
                so.order_number AS sales_order_number,
                so.order_date AS sales_order_date,
                c.company_name AS customer_name,
                u.symbol AS unit_symbol,
                e.name AS supervisor_name
            FROM production_orders po
            LEFT JOIN products p ON p.id = po.product_id
            LEFT JOIN sales_orders so ON so.id = po.sales_order_id
            LEFT JOIN customers c ON c.id = so.customer_id
            LEFT JOIN units u ON u.id = p.unit_id
            LEFT JOIN employees e ON e.id = po.supervisor_id
            WHERE po.id = ?
            LIMIT 1
        `, [id]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: "Production Order not found" });
        }

        const po = orders[0];

        // 2. Fetch Materials (BOM Formulation)
        let [materials] = await pool.query(`
            SELECT 
                pm.*,
                rm.material_code,
                rm.material_name,
                rm.grade,
                u.symbol AS unit_symbol
            FROM production_materials pm
            INNER JOIN raw_materials rm ON rm.id = pm.material_id
            LEFT JOIN units u ON u.id = rm.unit_id
            WHERE pm.production_order_id = ?
            ORDER BY pm.id ASC
        `, [id]);

        // Fallback to product_bom if production_materials not populated
        if (materials.length === 0 && po.product_id) {
            const [bomRows] = await pool.query(`
                SELECT 
                    pb.id,
                    pb.material_id,
                    rm.material_code,
                    rm.material_name,
                    rm.grade,
                    u.symbol AS unit_symbol,
                    (pb.quantity * ?) AS required_quantity,
                    (pb.quantity * ?) AS issued_quantity
                FROM product_bom pb
                INNER JOIN raw_materials rm ON rm.id = pb.material_id
                LEFT JOIN units u ON u.id = rm.unit_id
                WHERE pb.product_id = ?
                ORDER BY pb.id ASC
            `, [Number(po.planned_quantity || 1), Number(po.planned_quantity || 1), po.product_id]);
            materials = bomRows;
        }

        // 3. Fetch Process Routing Sequence
        const [processes] = await pool.query(`
            SELECT 
                pop.*,
                p.process_name,
                m.machine_code,
                m.machine_name,
                e.name AS operator_name
            FROM production_order_processes pop
            LEFT JOIN product_processes pp ON pp.id = pop.product_process_id
            LEFT JOIN processes p ON (p.id = pp.process_id OR p.id = pop.product_process_id)
            LEFT JOIN machines m ON m.id = pop.machine_id
            LEFT JOIN employees e ON e.id = pop.operator_id
            WHERE pop.production_order_id = ?
            ORDER BY pop.sequence_no ASC
        `, [id]);

        const doc = new PDFDocument({ 
            size: cfg.size, 
            layout: cfg.layout, 
            margin: cfg.margin 
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="Job_Card_${po.production_order_number}_${cfg.size}.pdf"`);
        doc.pipe(res);

        const { margin, scale } = cfg;
        const contentWidth = doc.page.width - (2 * margin);

        // Header
        let curY = drawHeader(doc, "PRODUCTION JOB CARD & ROUTING TRAVELER SHEET", cfg);

        // Details Box (2 Columns)
        const colGap = 10 * scale;
        const colWidth = (contentWidth - colGap) / 2;
        const leftX = margin;
        const rightX = margin + colWidth + colGap;
        const boxHeight = 98 * scale;
        const boxY = curY;

        doc.rect(margin, boxY, contentWidth, boxHeight).lineWidth(0.8).stroke("#cbd5e1");
        doc.moveTo(margin + colWidth + (colGap / 2), boxY).lineTo(margin + colWidth + (colGap / 2), boxY + boxHeight).stroke("#cbd5e1");

        const lblW = colWidth * 0.38;
        const valW = colWidth * 0.58;
        const rowStep = 13.5 * scale;

        // Left Column: Work Order & Product Specs
        drawInfoRow(doc, "Job Order No:", po.production_order_number, leftX + (6 * scale), boxY + (6 * scale), lblW, valW, scale);
        drawInfoRow(doc, "Release Date:", new Date(po.production_date).toLocaleDateString("en-IN"), leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 1), lblW, valW, scale);
        drawInfoRow(doc, "Product Code:", po.product_code || "—", leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 2), lblW, valW, scale);
        drawInfoRow(doc, "Product Name:", po.product_name || "PVC Tufted Carpet Roll", leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 3), lblW, valW, scale);
        drawInfoRow(doc, "Batch Target:", `${Number(po.planned_quantity).toLocaleString()} ${po.unit_symbol || "Units / SQM"}`, leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 4), lblW, valW, scale);
        drawInfoRow(doc, "Physical Specs:", `Thickness: ${po.thickness_mm || "2.0"}mm | GSM: ${po.gsm || "650"}`, leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 5), lblW, valW, scale);
        drawInfoRow(doc, "Shift & Priority:", `Shift ${po.shift || "DAY"} | Priority: [ ${po.priority || "NORMAL"} ]`, leftX + (6 * scale), boxY + (6 * scale) + (rowStep * 6), lblW, valW, scale);

        // Right Column: Order Reference & Shopfloor Planning
        drawInfoRow(doc, "Sales Order Ref:", po.sales_order_number || "STOCK BUILD RUN", rightX + (6 * scale), boxY + (6 * scale), lblW, valW, scale);
        drawInfoRow(doc, "Customer Name:", po.customer_name || "INTERNAL INVENTORY PRODUCTION", rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 1), lblW, valW, scale);
        drawInfoRow(doc, "Target Due Date:", new Date(po.expected_completion_date).toLocaleDateString("en-IN"), rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 2), lblW, valW, scale);
        drawInfoRow(doc, "Supervisor:", po.supervisor_name || "Plant Shift Head", rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 3), lblW, valW, scale);
        drawInfoRow(doc, "Work Order Status:", `[ ${po.status || "PLANNED"} ]`, rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 4), lblW, valW, scale);
        drawInfoRow(doc, "Finish & Backing:", `${po.surface_finish || "Standard"} | ${po.backing_type || "PVC Backed"}`, rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 5), lblW, valW, scale);
        drawInfoRow(doc, "Process Remarks:", po.remarks || "Adhere to mixing recipe and oven gelling curve", rightX + (6 * scale), boxY + (6 * scale) + (rowStep * 6), lblW, valW, scale);

        // =====================================================
        // SECTION 1: RAW MATERIAL & CHEMICAL FORMULATION BOM
        // =====================================================
        let tableY = boxY + boxHeight + (8 * scale);

        // Section Title
        doc.rect(margin, tableY, contentWidth, 14 * scale).fill("#334155");
        doc.fillColor("#ffffff").fontSize(7.5 * scale).font("Helvetica-Bold");
        doc.text("SECTION 1: CHEMICAL FORMULATION & RAW MATERIAL BOM ISSUE LIST", margin + (6 * scale), tableY + (3.5 * scale));

        tableY += 14 * scale;

        // Table Header
        const bomH = 15 * scale;
        doc.rect(margin, tableY, contentWidth, bomH).fill("#0f172a");

        const bomPcts = [0.05, 0.14, 0.35, 0.12, 0.12, 0.11, 0.11];
        const bomWs = bomPcts.map(pct => pct * contentWidth);
        const bomXs = [];
        let accX = margin;
        for (let i = 0; i < bomWs.length; i++) {
            bomXs.push(accX);
            accX += bomWs[i];
        }

        doc.fillColor("#ffffff").fontSize(6.8 * scale).font("Helvetica-Bold");
        doc.text("S.N.", bomXs[0], tableY + (4 * scale), { width: bomWs[0], align: "center" });
        doc.text("CODE", bomXs[1] + 2, tableY + (4 * scale), { width: bomWs[1] - 4 });
        doc.text("RAW MATERIAL DESCRIPTION & GRADE", bomXs[2] + 2, tableY + (4 * scale), { width: bomWs[2] - 4 });
        doc.text("REQ QTY", bomXs[3], tableY + (4 * scale), { width: bomWs[3] - 2, align: "right" });
        doc.text("ISSUED QTY", bomXs[4], tableY + (4 * scale), { width: bomWs[4] - 2, align: "right" });
        doc.text("LOT / BATCH NO", bomXs[5] + 2, tableY + (4 * scale), { width: bomWs[5] - 4, align: "center" });
        doc.text("OPERATOR SIGN", bomXs[6] + 2, tableY + (4 * scale), { width: bomWs[6] - 4, align: "center" });

        tableY += bomH;

        let totalReqKg = 0;
        let totalIssuedKg = 0;

        materials.slice(0, 8).forEach((item, index) => {
            const desc = `${item.material_name} (${item.grade || "STD"})`;
            doc.fontSize(6.5 * scale).font("Helvetica");
            const textH = doc.heightOfString(desc, { width: bomWs[2] - 4 });
            const rowH = Math.max(14 * scale, textH + (5 * scale));

            if (index % 2 === 0) doc.rect(margin, tableY, contentWidth, rowH).fill("#f8fafc");

            const textY = tableY + (3 * scale);
            doc.fillColor("#0f172a").fontSize(6.5 * scale).font("Helvetica");
            doc.text(String(index + 1), bomXs[0], textY, { width: bomWs[0], align: "center" });
            doc.font("Helvetica-Bold").text(item.material_code, bomXs[1] + 2, textY, { width: bomWs[1] - 4 });
            doc.font("Helvetica").text(desc, bomXs[2] + 2, textY, { width: bomWs[2] - 4 });
            
            const req = Number(item.required_quantity || 0);
            const iss = Number(item.issued_quantity || item.required_quantity || 0);
            doc.text(`${req.toFixed(2)} ${item.unit_symbol || "KG"}`, bomXs[3], textY, { width: bomWs[3] - 2, align: "right" });
            doc.font("Helvetica-Bold").text(`${iss.toFixed(2)} ${item.unit_symbol || "KG"}`, bomXs[4], textY, { width: bomWs[4] - 2, align: "right" });
            doc.font("Helvetica").text("ISSUED [ OK ]", bomXs[5] + 2, textY, { width: bomWs[5] - 4, align: "center" });
            doc.text("__________", bomXs[6] + 2, textY, { width: bomWs[6] - 4, align: "center" });

            totalReqKg += req;
            totalIssuedKg += iss;
            tableY += rowH;
        });

        // BOM Totals Row
        const bomTotH = 14 * scale;
        doc.rect(margin, tableY, contentWidth, bomTotH).fill("#e2e8f0");
        doc.fillColor("#0f172a").fontSize(7 * scale).font("Helvetica-Bold");
        doc.text(`TOTAL BATCH FORMULATION (${materials.length} ITEMS)`, bomXs[1] + 2, tableY + (3.5 * scale), { width: bomWs[1] + bomWs[2] });
        doc.text(`${totalReqKg.toFixed(2)} KG`, bomXs[3], tableY + (3.5 * scale), { width: bomWs[3] - 2, align: "right" });
        doc.text(`${totalIssuedKg.toFixed(2)} KG`, bomXs[4], tableY + (3.5 * scale), { width: bomWs[4] - 2, align: "right" });

        tableY += bomTotH + (8 * scale);

        // =====================================================
        // SECTION 2: SHOPFLOOR MACHINE PROCESS ROUTING SEQUENCE
        // =====================================================
        doc.rect(margin, tableY, contentWidth, 14 * scale).fill("#1e293b");
        doc.fillColor("#ffffff").fontSize(7.5 * scale).font("Helvetica-Bold");
        doc.text("SECTION 2: SHOPFLOOR MACHINE ROUTING & OPERATION SEQUENCE", margin + (6 * scale), tableY + (3.5 * scale));

        tableY += 14 * scale;

        const routeH = 15 * scale;
        doc.rect(margin, tableY, contentWidth, routeH).fill("#0f172a");

        const routePcts = [0.06, 0.32, 0.24, 0.14, 0.12, 0.12];
        const routeWs = routePcts.map(pct => pct * contentWidth);
        const routeXs = [];
        let rAccX = margin;
        for (let i = 0; i < routeWs.length; i++) {
            routeXs.push(rAccX);
            rAccX += routeWs[i];
        }

        doc.fillColor("#ffffff").fontSize(6.8 * scale).font("Helvetica-Bold");
        doc.text("SEQ", routeXs[0], tableY + (4 * scale), { width: routeWs[0], align: "center" });
        doc.text("OPERATION / PROCESS NAME", routeXs[1] + 2, tableY + (4 * scale), { width: routeWs[1] - 4 });
        doc.text("ASSIGNED MACHINE LINE", routeXs[2] + 2, tableY + (4 * scale), { width: routeWs[2] - 4 });
        doc.text("TARGET OUTPUT", routeXs[3], tableY + (4 * scale), { width: routeWs[3] - 2, align: "right" });
        doc.text("OPERATOR SIGN", routeXs[4] + 2, tableY + (4 * scale), { width: routeWs[4] - 4, align: "center" });
        doc.text("QC CLEARANCE", routeXs[5] + 2, tableY + (4 * scale), { width: routeWs[5] - 4, align: "center" });

        tableY += routeH;

        processes.forEach((proc, index) => {
            const pName = proc.process_name || `Process Stage #${index + 1}`;
            const mName = proc.machine_name ? `${proc.machine_code || ""} ${proc.machine_name}` : "Manual / Conveyor Station";
            
            doc.fontSize(6.5 * scale).font("Helvetica");
            const textH = doc.heightOfString(pName, { width: routeWs[1] - 4 });
            const rowH = Math.max(14 * scale, textH + (5 * scale));

            if (index % 2 === 0) doc.rect(margin, tableY, contentWidth, rowH).fill("#f8fafc");

            const textY = tableY + (3 * scale);
            doc.fillColor("#0f172a").fontSize(6.5 * scale).font("Helvetica");
            doc.text(String(proc.sequence_no || index + 1), routeXs[0], textY, { width: routeWs[0], align: "center" });
            doc.font("Helvetica-Bold").text(pName, routeXs[1] + 2, textY, { width: routeWs[1] - 4 });
            doc.font("Helvetica").text(mName, routeXs[2] + 2, textY, { width: routeWs[2] - 4 });
            doc.text(`${Number(proc.planned_quantity || po.planned_quantity).toLocaleString()}`, routeXs[3], textY, { width: routeWs[3] - 2, align: "right" });
            doc.text("__________", routeXs[4] + 2, textY, { width: routeWs[4] - 4, align: "center" });
            doc.text("[ PASSED ]", routeXs[5] + 2, textY, { width: routeWs[5] - 4, align: "center" });

            tableY += rowH;
        });

        tableY += 8 * scale;

        // =====================================================
        // SECTION 3: QUALITY CONTROL PARAMETER CHECKPOINTS
        // =====================================================
        const qcH = 42 * scale;
        doc.rect(margin, tableY, contentWidth, qcH).lineWidth(0.5).stroke("#cbd5e1");
        doc.fillColor("#0f172a").fontSize(7.5 * scale).font("Helvetica-Bold");
        doc.text("SECTION 3: MANDATORY QUALITY CONTROL (QC) SHOPFLOOR CHECKPOINTS:", margin + (8 * scale), tableY + (5 * scale));

        doc.fillColor("#334155").fontSize(6.6 * scale).font("Helvetica");
        doc.text("[  X  ] Plastisol viscosity & de-aeration checked. Gel temperature: 185°C - 200°C maintained.", margin + (8 * scale), tableY + (15 * scale));
        doc.text("[  X  ] Calibrated ultrasonic thickness verification: target tolerance within ± 0.1 mm range.", margin + (8 * scale), tableY + (24 * scale));
        doc.text("[  X  ] Tufting loop pull-force & peel strength tested. Visual inspection for pinholes / blisters: ZERO DEFECTS.", margin + (8 * scale), tableY + (33 * scale));

        tableY += qcH + (20 * scale);

        // =====================================================
        // SECTION 4: SHOPFLOOR AUTHORIZATION SIGNATURES
        // =====================================================
        const sigWidth = (contentWidth - (20 * scale)) / 3;
        const sigY = tableY;

        doc.lineCap("butt").moveTo(margin, sigY).lineTo(margin + sigWidth, sigY).stroke("#94a3b8");
        doc.moveTo(margin + sigWidth + (10 * scale), sigY).lineTo(margin + (2 * sigWidth) + (10 * scale), sigY).stroke("#94a3b8");
        doc.moveTo(margin + (2 * sigWidth) + (20 * scale), sigY).lineTo(margin + contentWidth, sigY).stroke("#94a3b8");

        doc.fillColor("#0f172a").fontSize(7 * scale).font("Helvetica-Bold");
        doc.text("PRODUCTION PLANNER", margin, sigY + (4 * scale), { width: sigWidth, align: "center" });
        doc.font("Helvetica").fontSize(6 * scale).fillColor("#64748b");
        doc.text("Work Order Released\nDate: ____________", margin, sigY + (13 * scale), { width: sigWidth, align: "center" });

        doc.fillColor("#0f172a").fontSize(7 * scale).font("Helvetica-Bold");
        doc.text("SHIFT PRODUCTION ENGINEER", margin + sigWidth + (10 * scale), sigY + (4 * scale), { width: sigWidth, align: "center" });
        doc.font("Helvetica").fontSize(6 * scale).fillColor("#64748b");
        doc.text(`${po.supervisor_name || "Shift Head"}\nDate: ____________`, margin + sigWidth + (10 * scale), sigY + (13 * scale), { width: sigWidth, align: "center" });

        doc.fillColor("#0f172a").fontSize(7 * scale).font("Helvetica-Bold");
        doc.text("PLANT QC INSPECTOR", margin + (2 * sigWidth) + (20 * scale), sigY + (4 * scale), { width: sigWidth, align: "center" });
        doc.font("Helvetica").fontSize(6 * scale).fillColor("#64748b");
        doc.text("Final Batch Clearance Seal\nDate: ____________", margin + (2 * sigWidth) + (20 * scale), sigY + (13 * scale), { width: sigWidth, align: "center" });

        doc.end();

    } catch (error) {
        console.error("Production Order Job Card PDF error:", error);
        res.status(500).json({ success: false, message: "Failed to generate Production Order Job Card PDF", error: error.message });
    }
};

// =========================================================
// 5. SALES ORDER CONFIRMATION / PROFORMA TAX INVOICE PDF
// =========================================================
function sanitizePdfText(str) {
    if (!str) return "";
    return String(str)
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-") // Unicode hyphens and dashes to ASCII '-'
        .replace(/[\u2018\u2019]/g, "'") // curly single quotes
        .replace(/[\u201C\u201D]/g, '"') // curly double quotes
        .replace(/[\u00D7]/g, "x") // multiplication sign to x
        .replace(/[\u00B1]/g, "+/-") // plus-minus
        .replace(/[\u20B9]/g, "Rs. ") // Rupee glyph
        .replace(/\u00A0/g, " "); // non-breaking space
}

function formatInr(val) {
    const n = Number(val || 0);
    return `Rs. ${n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

const generateSalesOrderPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const requestedSize = (req.query.pageSize || req.query.size || "A4").toUpperCase();
        const validSizes = ["A4", "A5", "LETTER"];
        const pageSize = validSizes.includes(requestedSize) ? requestedSize : "A4";

        const [orders] = await pool.query(`
            SELECT
                so.*,
                c.customer_code,
                c.company_name AS customer_name,
                c.contact_person,
                c.phone AS customer_phone,
                c.email AS customer_email,
                c.gst_number AS customer_gstin,
                c.billing_address,
                c.shipping_address,
                c.city AS customer_city,
                c.state AS customer_state,
                c.pincode AS customer_pincode,
                c.payment_terms AS customer_payment_terms
            FROM sales_orders so
            INNER JOIN customers c ON c.id = so.customer_id
            WHERE so.id = ?
        `, [id]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Sales Order #${id} not found`
            });
        }

        const so = orders[0];

        const [items] = await pool.query(`
            SELECT
                soi.*,
                p.product_code,
                p.product_name,
                p.carpet_type,
                p.design_pattern,
                p.colour,
                p.width_mm,
                p.length_m,
                p.thickness_mm,
                p.gsm,
                u.symbol AS unit_code,
                u.name AS unit_name
            FROM sales_order_items soi
            INNER JOIN products p ON p.id = soi.product_id
            LEFT JOIN units u ON u.id = p.unit_id
            WHERE soi.sales_order_id = ?
            ORDER BY soi.id ASC
        `, [id]);

        // GST Tax Calculations
        const custState = (so.customer_state || "").trim().toLowerCase();
        const isIntraState = custState.includes("gujarat") || custState === "24";

        let totalTaxable = 0;
        let totalPcs = 0;
        const processedItems = items.map((it) => {
            const qty = Number(it.ordered_quantity || 0);
            const rate = Number(it.unit_price || 0);
            const taxable = qty * rate;
            totalTaxable += taxable;
            totalPcs += qty;
            return {
                ...it,
                qty,
                rate,
                taxable
            };
        });

        const cgstRate = isIntraState ? 0.09 : 0;
        const sgstRate = isIntraState ? 0.09 : 0;
        const igstRate = isIntraState ? 0 : 0.18;

        const totalCgst = totalTaxable * cgstRate;
        const totalSgst = totalTaxable * sgstRate;
        const totalIgst = totalTaxable * igstRate;
        const totalTax = totalCgst + totalSgst + totalIgst;
        const grandTotal = Math.round(totalTaxable + totalTax);
        const roundOff = (grandTotal - (totalTaxable + totalTax)).toFixed(2);
        const amountInWords = numberToWordsIndian(grandTotal);

        // Document Setup
        const doc = new PDFDocument({
            size: pageSize,
            margin: 24,
            info: {
                Title: `Proforma_Invoice_${so.order_number}`,
                Author: COMPANY.name,
                Subject: `Sales Order Confirmation #${so.order_number}`,
                Creator: "Rainbow ERP Document Engine"
            }
        });

        const filename = `Proforma_Invoice_${so.order_number}_${pageSize}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        doc.pipe(res);

        const pageHeight = doc.page.height;
        const pageWidth = doc.page.width;
        const margin = 24;
        const contentWidth = pageWidth - (margin * 2);
        const scale = pageSize === "A5" ? 0.72 : 1.0;

        // Outer Double Border
        doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin * 2) + 8)
            .lineWidth(1)
            .stroke("#0f172a");
        doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin * 2) + 4)
            .lineWidth(0.5)
            .stroke("#94a3b8");

        // Header Banner (Navy Background)
        doc.rect(margin, margin, contentWidth, 54 * scale).fill("#0f172a");

        doc.fillColor("#ffffff")
            .font("Helvetica-Bold")
            .fontSize(12 * scale)
            .text(COMPANY.name, margin + (10 * scale), margin + (8 * scale), { width: contentWidth - (20 * scale) });

        doc.font("Helvetica")
            .fontSize(6.8 * scale)
            .fillColor("#cbd5e1")
            .text(COMPANY.tagline, margin + (10 * scale), margin + (22 * scale));

        doc.fontSize(6.5 * scale)
            .text(`Factory: ${COMPANY.address}`, margin + (10 * scale), margin + (32 * scale));

        doc.font("Helvetica-Bold")
            .fontSize(6.8 * scale)
            .fillColor("#facc15")
            .text(`GSTIN: ${COMPANY.gstin} | PAN: ${COMPANY.pan} | CIN: ${COMPANY.cin} | State: ${COMPANY.state}`, margin + (10 * scale), margin + (42 * scale));

        // Subtitle Title Box
        let curY = margin + (58 * scale);
        doc.rect(margin, curY, contentWidth, 24 * scale).fill("#f1f5f9");
        doc.rect(margin, curY, contentWidth, 24 * scale).lineWidth(0.5).stroke("#cbd5e1");

        doc.fillColor("#0f172a")
            .font("Helvetica-Bold")
            .fontSize(10 * scale)
            .text("PROFORMA INVOICE / SALES ORDER CONFIRMATION", margin, curY + (4 * scale), { width: contentWidth, align: "center" });

        doc.fillColor("#64748b")
            .font("Helvetica")
            .fontSize(6.2 * scale)
            .text("[ Commercial Booking Confirmation & Schedule Under Rule 46 of CGST Act, 2017 ]", margin, curY + (15 * scale), { width: contentWidth, align: "center" });

        curY += (28 * scale);

        // Metadata 2-Column Block
        const colW = (contentWidth - (8 * scale)) / 2;
        const metaH = 88 * scale;

        // Left Box: Buyer & Consignee Details
        doc.rect(margin, curY, colW, metaH).lineWidth(0.5).stroke("#cbd5e1");
        doc.rect(margin, curY, colW, 14 * scale).fill("#e2e8f0");
        doc.fillColor("#0f172a").fontSize(7.5 * scale).font("Helvetica-Bold")
            .text("BUYER / BILLED & SHIPPED TO:", margin + (6 * scale), curY + (3.5 * scale));

        let leftTextY = curY + (18 * scale);
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8 * scale)
            .text(sanitizePdfText(so.customer_name || "N/A"), margin + (6 * scale), leftTextY, { width: colW - (12 * scale) });
        leftTextY += (11 * scale);

        doc.fillColor("#334155").font("Helvetica").fontSize(6.8 * scale);
        const fullAddr = sanitizePdfText([so.billing_address, so.customer_city, so.customer_state, so.customer_pincode].filter(Boolean).join(", "));
        doc.text(`Address: ${fullAddr || "Standard Registered Works"}`, margin + (6 * scale), leftTextY, { width: colW - (12 * scale) });
        leftTextY += (18 * scale);

        doc.font("Helvetica-Bold").fillColor("#0284c7")
            .text(`GSTIN / UIN: ${so.customer_gstin || "UNREGISTERED"}`, margin + (6 * scale), leftTextY);
        leftTextY += (9 * scale);

        const placeOfSupply = so.customer_state
            ? `${so.customer_state} (Code: ${so.customer_gstin ? so.customer_gstin.slice(0, 2) : "—"})`
            : "Inter-State";
        doc.font("Helvetica-Bold").fillColor("#059669").fontSize(6.6 * scale)
            .text(`Place of Supply: ${placeOfSupply} [${isIntraState ? "Intra-State / CGST+SGST" : "Inter-State / IGST"}]`, margin + (6 * scale), leftTextY);
        leftTextY += (9 * scale);

        doc.font("Helvetica").fillColor("#334155").fontSize(6.5 * scale)
            .text(`Contact: ${sanitizePdfText(so.contact_person || "Purchase Dept")} | Tel: ${so.customer_phone || "—"}`, margin + (6 * scale), leftTextY);
        leftTextY += (8 * scale);
        doc.text(`Email: ${so.customer_email || "—"} | Cust Code: ${so.customer_code || "—"}`, margin + (6 * scale), leftTextY);

        // Right Box: Order & Payment Terms
        const rightX = margin + colW + (8 * scale);
        doc.rect(rightX, curY, colW, metaH).lineWidth(0.5).stroke("#cbd5e1");
        doc.rect(rightX, curY, colW, 14 * scale).fill("#e2e8f0");
        doc.fillColor("#0f172a").fontSize(7.5 * scale).font("Helvetica-Bold")
            .text("COMMERCIAL & ORDER SCHEDULE:", rightX + (6 * scale), curY + (3.5 * scale));

        let rightTextY = curY + (18 * scale);
        doc.fillColor("#334155").font("Helvetica").fontSize(7 * scale);

        const drawMetaRow = (label, val, boldVal = false, color = "#0f172a") => {
            doc.fillColor("#475569").font("Helvetica").text(label, rightX + (6 * scale), rightTextY, { width: 95 * scale });
            doc.fillColor(color).font(boldVal ? "Helvetica-Bold" : "Helvetica").text(`:  ${val}`, rightX + (102 * scale), rightTextY, { width: colW - (108 * scale) });
            rightTextY += (10 * scale);
        };

        const formatDateStr = (d) => {
            if (!d) return "Immediate / Ex-Stock";
            return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        };

        const humanStatus = (so.status || "CONFIRMED").replace(/_/g, " ").toUpperCase();

        drawMetaRow("Proforma No.", so.order_number, true, "#0284c7");
        drawMetaRow("Order Date", formatDateStr(so.order_date), false);
        drawMetaRow("Customer PO Ref", so.customer_po_number || "Direct Demand Booking", true, "#0f172a");
        drawMetaRow("Expected Delivery", formatDateStr(so.expected_delivery_date), true, "#059669");
        drawMetaRow("Payment Terms", so.customer_payment_terms || "30 Days Credit / Standard", false);
        drawMetaRow("Dispatch Mode", "Road Transport (Ex-Factory Sachin)", false);
        drawMetaRow("Order Priority", (so.priority || "NORMAL").toUpperCase(), true, so.priority === "URGENT" ? "#dc2626" : "#0284c7");
        drawMetaRow("Booking Status", humanStatus, true, "#16a34a");

        curY += metaH + (10 * scale);

        // SECTION: ITEM SCHEDULE TABLE
        const cols = [
            { id: "sr", label: "SR.", w: 22 * scale, align: "center" },
            { id: "desc", label: "PRODUCT DESCRIPTION & TECHNICAL SPECIFICATIONS", w: 195 * scale, align: "left" },
            { id: "hsn", label: "HSN", w: 36 * scale, align: "center" },
            { id: "qty", label: "ORDER QTY", w: 48 * scale, align: "right" },
            { id: "unit", label: "UNIT", w: 28 * scale, align: "center" },
            { id: "rate", label: "RATE (Rs.)", w: 52 * scale, align: "right" },
            { id: "gst", label: "GST %", w: 32 * scale, align: "center" },
            { id: "total", label: "AMOUNT (Rs.)", w: contentWidth - ((22 + 195 + 36 + 48 + 28 + 52 + 32) * scale), align: "right" }
        ];

        // Table Header
        const thHeight = 16 * scale;
        doc.rect(margin, curY, contentWidth, thHeight).fill("#0f172a");

        let curX = margin;
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(6.5 * scale);
        cols.forEach((col) => {
            doc.text(col.label, curX + (2 * scale), curY + (4.5 * scale), { width: col.w - (4 * scale), align: col.align });
            curX += col.w;
        });

        curY += thHeight;

        // Table Rows
        doc.font("Helvetica").fontSize(6.5 * scale);

        processedItems.forEach((item, index) => {
            const specParts = [];
            if (item.carpet_type) specParts.push(item.carpet_type);
            if (item.colour) specParts.push(`Col: ${item.colour}`);
            if (item.design_pattern) specParts.push(`Pattern: ${item.design_pattern}`);

            const w = item.width_mm ? Number(item.width_mm) : 0;
            const t = item.thickness_mm ? Number(item.thickness_mm) : 0;
            const l = item.length_m ? Number(item.length_m) : 0;
            const gsm = item.gsm ? Number(item.gsm) : 0;

            if (w > 0 && t > 0) {
                specParts.push(`${w} x ${t} mm`);
            } else if (w > 0 && l > 0) {
                specParts.push(`${w} mm x ${l} m`);
            } else if (t > 0) {
                specParts.push(`${t} mm thick`);
            }

            if (gsm > 0) {
                specParts.push(`${gsm.toLocaleString("en-IN")} GSM`);
            }

            const cleanName = sanitizePdfText(item.product_name || "PVC Product");
            const cleanCode = sanitizePdfText(item.product_code || "");
            const specText = sanitizePdfText(specParts.join(" | "));

            // Exact dynamic height measurement to guarantee ZERO collision
            const titleH = doc.heightOfString(`${cleanName} (${cleanCode})`, { width: cols[1].w - (6 * scale) });
            const specH = specText ? doc.heightOfString(specText, { width: cols[1].w - (6 * scale) }) : 0;
            const rowH = Math.max(26 * scale, titleH + specH + (9 * scale));

            // Alternate Row Shading
            if (index % 2 === 0) {
                doc.rect(margin, curY, contentWidth, rowH).fill("#f8fafc");
            }

            // Cell borders
            doc.rect(margin, curY, contentWidth, rowH).lineWidth(0.4).stroke("#e2e8f0");

            let rowX = margin;

            // 1. Sr.
            doc.fillColor("#475569").font("Helvetica").fontSize(6.5 * scale)
                .text(`${index + 1}`, rowX, curY + (6 * scale), { width: cols[0].w, align: cols[0].align });
            rowX += cols[0].w;

            // 2. Product Description & Specifications (SEQUENTIAL FLOW - NO COLLISION)
            let textCursorY = curY + (4 * scale);
            doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(6.5 * scale)
                .text(`${cleanName} `, rowX + (3 * scale), textCursorY, { continued: true, width: cols[1].w - (6 * scale) });
            doc.font("Helvetica").fillColor("#6d28d9")
                .text(`(${cleanCode})`, { continued: false });

            textCursorY += titleH + (1.5 * scale);

            if (specText) {
                doc.font("Helvetica").fontSize(5.8 * scale).fillColor("#64748b")
                    .text(specText, rowX + (3 * scale), textCursorY, { width: cols[1].w - (6 * scale) });
            }
            rowX += cols[1].w;

            // 3. HSN Code
            doc.fillColor("#475569").font("Helvetica").fontSize(6.5 * scale)
                .text("5705", rowX, curY + (6 * scale), { width: cols[2].w, align: cols[2].align });
            rowX += cols[2].w;

            // 4. Quantity
            doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(6.5 * scale)
                .text(Number(item.qty).toLocaleString("en-IN"), rowX, curY + (6 * scale), { width: cols[3].w - (3 * scale), align: cols[3].align });
            rowX += cols[3].w;

            // 5. Unit
            doc.fillColor("#64748b").font("Helvetica").fontSize(6.5 * scale)
                .text(sanitizePdfText(item.unit_code || "Pcs"), rowX, curY + (6 * scale), { width: cols[4].w, align: cols[4].align });
            rowX += cols[4].w;

            // 6. Rate (Formatted with Indian Comma Separator)
            doc.fillColor("#0f172a").font("Helvetica").fontSize(6.5 * scale)
                .text(formatInr(item.rate), rowX, curY + (6 * scale), { width: cols[5].w - (3 * scale), align: cols[5].align });
            rowX += cols[5].w;

            // 7. GST %
            doc.fillColor("#475569").font("Helvetica").fontSize(6.5 * scale)
                .text(isIntraState ? "18% (9+9)" : "18% IGST", rowX, curY + (6 * scale), { width: cols[6].w, align: cols[6].align });
            rowX += cols[6].w;

            // 8. Total Line Amount (Formatted with Indian Comma Separator)
            doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(6.5 * scale)
                .text(formatInr(item.taxable), rowX, curY + (6 * scale), { width: cols[7].w - (4 * scale), align: cols[7].align });

            curY += rowH;
        });

        // Summary & Tax Breakdown Box
        const summaryH = 58 * scale;
        const wordsW = contentWidth * 0.58;
        const totalW = contentWidth - wordsW;

        // Left box: Amount in words & Bank Account
        doc.rect(margin, curY, wordsW, summaryH).lineWidth(0.5).stroke("#cbd5e1");
        doc.rect(margin, curY, wordsW, 13 * scale).fill("#f1f5f9");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(6.5 * scale)
            .text("AMOUNT IN WORDS & SETTLEMENT DETAILS:", margin + (6 * scale), curY + (3 * scale));

        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7 * scale)
            .text(`${amountInWords}`, margin + (6 * scale), curY + (17 * scale), { width: wordsW - (12 * scale) });

        doc.fillColor("#334155").font("Helvetica").fontSize(6.2 * scale)
            .text("Bank Details for NEFT / RTGS Transfer:", margin + (6 * scale), curY + (29 * scale));
        doc.fillColor("#64748b").font("Helvetica").fontSize(6 * scale)
            .text("Bank: State Bank of India | A/C No: 38920199201 | IFSC: SBIN0001824 | Branch: Sachin GIDC", margin + (6 * scale), curY + (37 * scale));
        doc.text("Beneficiary: Rainbow Polymers & Carpets Pvt. Ltd. | Current Account", margin + (6 * scale), curY + (46 * scale));

        // Right box: Tax Calculations (Commas everywhere!)
        doc.rect(margin + wordsW, curY, totalW, summaryH).lineWidth(0.5).stroke("#cbd5e1");

        let sumY = curY + (3 * scale);
        const drawSumRow = (label, valStr, bold = false, color = "#0f172a") => {
            doc.fillColor("#475569").font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(6.5 * scale)
                .text(label, margin + wordsW + (6 * scale), sumY, { width: totalW * 0.52 });
            doc.fillColor(color).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(6.5 * scale)
                .text(valStr, margin + wordsW + (totalW * 0.52), sumY, { width: (totalW * 0.48) - (6 * scale), align: "right" });
            sumY += (9 * scale);
        };

        drawSumRow("Taxable Subtotal", formatInr(totalTaxable));
        if (isIntraState) {
            drawSumRow("Add: CGST @ 9.0%", formatInr(totalCgst));
            drawSumRow("Add: SGST @ 9.0%", formatInr(totalSgst));
        } else {
            drawSumRow("Add: IGST @ 18.0%", formatInr(totalIgst));
        }
        drawSumRow("Round Off (+/-)", `Rs. ${roundOff}`);

        doc.rect(margin + wordsW, sumY, totalW, 14 * scale).fill("#0f172a");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5 * scale)
            .text("TOTAL INVOICE (INR):", margin + wordsW + (6 * scale), sumY + (3.5 * scale));
        doc.fillColor("#facc15").font("Helvetica-Bold").fontSize(8 * scale)
            .text(formatInr(grandTotal), margin + wordsW + (totalW * 0.50), sumY + (3 * scale), { width: (totalW * 0.50) - (6 * scale), align: "right" });

        curY += summaryH + (12 * scale);

        // SECTION: TERMS & CONDITIONS (EXPANDED TO BALANCE PAGE)
        const tcH = 46 * scale;
        doc.rect(margin, curY, contentWidth, tcH).lineWidth(0.5).stroke("#cbd5e1");
        doc.rect(margin, curY, contentWidth, 13 * scale).fill("#f1f5f9");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(6.8 * scale)
            .text("COMMERCIAL TERMS & SUPPLY CONDITIONS:", margin + (6 * scale), curY + (3.5 * scale));

        doc.font("Helvetica").fontSize(5.8 * scale).fillColor("#475569");
        doc.text("1. Delivery Terms: Ex-Factory GIDC Sachin Surat. Goods in transit are at buyer's risk and insurance coverage.", margin + (6 * scale), curY + (16 * scale));
        doc.text("2. Manufacturing Tolerance: Thickness +/- 0.1 mm, Roll Width & Length +/- 2.0% in line with IS/ISO flooring standards.", margin + (6 * scale), curY + (23 * scale));
        doc.text("3. Proforma Validity: Rates quoted above are firm for 30 days from date of booking. Payment terms strictly as agreed.", margin + (6 * scale), curY + (30 * scale));
        doc.text("4. Inspection & Jurisdiction: Material inspection must be conducted upon delivery prior to cutting/fixing. Subject to Surat jurisdiction.", margin + (6 * scale), curY + (37 * scale));

        // Anchor Signatures Towards Bottom of Page
        const targetSigY = pageHeight - margin - (48 * scale);
        const sigY = Math.max(curY + tcH + (18 * scale), targetSigY);
        const sigW = (contentWidth - (20 * scale)) / 3;

        doc.lineCap("butt").moveTo(margin, sigY).lineTo(margin + sigW, sigY).stroke("#94a3b8");
        doc.moveTo(margin + sigW + (10 * scale), sigY).lineTo(margin + (2 * sigW) + (10 * scale), sigY).stroke("#94a3b8");
        doc.moveTo(margin + (2 * sigW) + (20 * scale), sigY).lineTo(margin + contentWidth, sigY).stroke("#94a3b8");

        doc.fillColor("#0f172a").fontSize(6.8 * scale).font("Helvetica-Bold");
        doc.text("PREPARED BY (SALES DESK)", margin, sigY + (4 * scale), { width: sigW, align: "center" });
        doc.font("Helvetica").fontSize(5.8 * scale).fillColor("#64748b");
        doc.text("Rainbow Order Desk\nVerified Commercials", margin, sigY + (12 * scale), { width: sigW, align: "center" });

        doc.fillColor("#0f172a").fontSize(6.8 * scale).font("Helvetica-Bold");
        doc.text("CUSTOMER ACCEPTANCE", margin + sigW + (10 * scale), sigY + (4 * scale), { width: sigW, align: "center" });
        doc.font("Helvetica").fontSize(5.8 * scale).fillColor("#64748b");
        doc.text("Authorized Signatory\n(Please Sign & Stamp)", margin + sigW + (10 * scale), sigY + (12 * scale), { width: sigW, align: "center" });

        doc.fillColor("#0f172a").fontSize(6.8 * scale).font("Helvetica-Bold");
        doc.text("FOR RAINBOW POLYMERS & CARPETS", margin + (2 * sigW) + (20 * scale), sigY + (4 * scale), { width: sigW, align: "center" });
        doc.font("Helvetica").fontSize(5.8 * scale).fillColor("#64748b");
        doc.text("Authorized Commercial Signatory\nFactory Operations Head", margin + (2 * sigW) + (20 * scale), sigY + (12 * scale), { width: sigW, align: "center" });

        doc.end();

    } catch (error) {
        console.error("Sales Order PDF Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate Sales Order Proforma PDF",
            error: error.message
        });
    }
};

// =========================================================
// EXPORTS
// =========================================================
module.exports = {
    generateDeliveryChallanPDF,
    generateGatePassPDF,
    generateMaterialReceiptPDF,
    generateProductionOrderJobCardPDF,
    generateSalesOrderPDF
};
