const express = require("express");
const multer = require("multer");
const {
    exportModule,
    importModule,
    downloadTemplate
} = require("../controllers/excelController");

const router = express.Router();

// Multer – memory storage for Excel uploads (max 10 MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
        ];
        if (
            allowed.includes(file.mimetype) ||
            file.originalname.endsWith(".xlsx") ||
            file.originalname.endsWith(".xls")
        ) {
            cb(null, true);
        } else {
            cb(new Error("Only .xlsx and .xls files are allowed."), false);
        }
    }
});

// ===========================
// EXPORT  – GET /api/excel/export/:module
// ===========================
router.get("/export/:module", exportModule);

// ===========================
// IMPORT  – POST /api/excel/import/:module
// ===========================
router.post("/import/:module", upload.single("file"), importModule);

// ===========================
// TEMPLATE – GET /api/excel/template/:module
// ===========================
router.get("/template/:module", downloadTemplate);

module.exports = router;
