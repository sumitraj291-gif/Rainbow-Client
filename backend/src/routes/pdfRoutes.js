const express = require("express");
const {
    generateDeliveryChallanPDF,
    generateGatePassPDF,
    generateMaterialReceiptPDF,
    generateProductionOrderJobCardPDF,
    generateSalesOrderPDF
} = require("../controllers/pdfController");

const router = express.Router();

// GET /api/pdf/challan/:id - Download / Stream Delivery Challan PDF
router.get("/challan/:id", generateDeliveryChallanPDF);

// GET /api/pdf/gatepass/:id - Download / Stream Security Gate Pass PDF
router.get("/gatepass/:id", generateGatePassPDF);

// GET /api/pdf/grn/:id - Download / Stream Inward Material Receipt Note (GRN) PDF
router.get("/grn/:id", generateMaterialReceiptPDF);

// GET /api/pdf/production-order/:id - Download / Stream Production Job Card & Routing Traveler PDF
router.get("/production-order/:id", generateProductionOrderJobCardPDF);

// GET /api/pdf/sales-order/:id - Download / Stream Sales Order Proforma Invoice PDF
router.get("/sales-order/:id", generateSalesOrderPDF);

module.exports = router;
