const express = require("express");

const {
    getProducts,
    getProductById,
    getProductOptions,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductBOM,
    saveProductBOM,
    seedDefaultBOM
} = require("../controllers/productController");

const router = express.Router();

router.get("/", getProducts);
router.get("/options", getProductOptions);
router.post("/seed-bom", seedDefaultBOM);
router.get("/:id", getProductById);
router.get("/:id/bom", getProductBOM);
router.post("/:id/bom", saveProductBOM);

router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;