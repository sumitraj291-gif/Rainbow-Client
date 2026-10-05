const pool = require("../config/database");

const PVC_FIELDS = `
    p.id,
    p.product_code,
    p.category_id,

    pc.name AS category_name,
    pc.name AS category_code,

    p.product_name,

    p.carpet_type,
    p.design_pattern,
    p.colour,

    p.width_mm,
    p.length_m,
    p.thickness_mm,
    p.gsm,

    p.surface_finish,
    p.backing_type,
    p.packing_type,

    p.standard_production_time,

    p.standard_cost,
    p.selling_price,

    p.unit_id,

    u.symbol AS unit_code,
    u.name AS unit_name,

    p.status,
    p.created_at,
    p.updated_at,

    COALESCE(
        (
            SELECT COUNT(*)
            FROM product_processes pp
            WHERE pp.product_id = p.id
        ),
        0
    ) AS process_count
`;

const getProducts = async (req, res) => {
    try {
        const {
            search = "",
            status = ""
        } = req.query;

        let sql = `
            SELECT ${PVC_FIELDS}
            FROM products p
            LEFT JOIN units u
                ON u.id = p.unit_id
            LEFT JOIN product_categories pc
                ON pc.id = p.category_id
            WHERE 1 = 1
        `;

        const params = [];

        if (search.trim()) {
            sql += `
                AND (
                    p.product_code LIKE ?
                    OR p.product_name LIKE ?
                    OR COALESCE(p.carpet_type, '') LIKE ?
                    OR COALESCE(p.colour, '') LIKE ?
                    OR COALESCE(p.design_pattern, '') LIKE ?
                )
            `;

            const q = `%${search.trim()}%`;

            params.push(
                q,
                q,
                q,
                q,
                q
            );
        }

        if (status) {
            sql += ` AND p.status = ?`;
            params.push(status);
        }

        sql += `
            ORDER BY p.created_at DESC
        `;

        const [rows] = await pool.query(
            sql,
            params
        );

        return res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error(
            "Get Products Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load products",
            error: error.message
        });
    }
};

const getProductById = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `
            SELECT ${PVC_FIELDS}
            FROM products p
            LEFT JOIN units u
                ON u.id = p.unit_id
            LEFT JOIN product_categories pc
                ON pc.id = p.category_id
            WHERE p.id = ?
            LIMIT 1
            `,
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const [routing] = await pool.query(`
            SELECT
                pp.id,
                pp.sequence_no,
                pp.process_id,
                pr.process_code,
                pr.process_name,
                pr.department,
                pp.machine_id,
                m.machine_code,
                m.machine_name,
                pp.standard_output_per_hour,
                pp.setup_minutes,
                pp.mandatory,
                pp.remarks
            FROM product_processes pp
            INNER JOIN processes pr
                ON pr.id = pp.process_id
            LEFT JOIN machines m
                ON m.id = pp.machine_id
            WHERE pp.product_id = ?
            ORDER BY pp.sequence_no
        `, [req.params.id]);

        return res.json({
            success: true,
            data: {
                ...rows[0],
                routing
            }
        });

    } catch (error) {
        console.error(
            "Get Product Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load product",
            error: error.message
        });
    }
};

const getProductOptions = async (req, res) => {
    try {
        const [products] = await pool.query(`
            SELECT
                id,
                product_code,
                product_name,
                unit_id
            FROM products
            WHERE status = 'ACTIVE'
            ORDER BY product_name
        `);

        const [units] = await pool.query(`
          SELECT
        id,
        symbol AS unit_code,
        name AS unit_name
    FROM units
    ORDER BY name
`);

        const [categories] = await pool.query(`
          SELECT
        id,
        name AS category_code,
        name AS category_name
    FROM product_categories
    ORDER BY name
`);

        return res.json({
            success: true,
            data: {
                products,
                units,
                categories
            }
        });

    } catch (error) {
        console.error(
            "Product Options Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load product options",
            error: error.message
        });
    }
};

const createProduct = async (req, res) => {
    const connection =
        await pool.getConnection();

    try {
        const {
    product_code,
    category_id,
    product_name,
    carpet_type,
    design_pattern,
    colour,
    width_mm,
    length_m,
    thickness_mm,
    gsm,
    surface_finish,
    backing_type,
    packing_type,
    standard_production_time,
    standard_cost,
    selling_price,
    unit_id,
    status
} = req.body;

        if (
            !product_code?.trim() ||
            !product_name?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Product code and product name are required"
            });
        }

        if (
            Number(width_mm) < 0 ||
            Number(length_m) < 0 ||
            Number(thickness_mm) < 0 ||
            Number(gsm) < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Physical specifications cannot be negative"
            });
        }

        if (
            Number(standard_cost) < 0 ||
            Number(selling_price) < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cost and selling price cannot be negative"
            });
        }

        const [duplicate] =
            await connection.query(
                `
                SELECT id
                FROM products
                WHERE product_code = ?
                LIMIT 1
                `,
                [product_code.trim()]
            );

        if (duplicate.length) {
            return res.status(409).json({
                success: false,
                message:
                    "Product code already exists"
            });
        }

        const [result] =
            await connection.query(
                `
                INSERT INTO products
(
    product_code,
    category_id,
    product_name,
    carpet_type,
    design_pattern,
    colour,
    width_mm,
    length_m,
    thickness_mm,
    gsm,
    surface_finish,
    backing_type,
    packing_type,
    standard_production_time,
    standard_cost,
    selling_price,
    unit_id,
    status
)
VALUES
(
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?
)`,
                [
    product_code.trim(),
    category_id || null,
    product_name.trim(),

    carpet_type || null,
    design_pattern || null,
    colour || null,

    width_mm ?? null,
    length_m ?? null,
    thickness_mm ?? null,
    gsm ?? null,

    surface_finish || null,
    backing_type || null,
    packing_type || null,

    standard_production_time ?? null,

    standard_cost ?? 0,
    selling_price ?? 0,

    unit_id || null,
    status
]
            );

        return res.status(201).json({
            success: true,
            message:
                "PVC carpet product created successfully",
            data: {
                id: result.insertId
            }
        });

    } catch (error) {
        console.error(
            "Create Product Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to create product",
            error: error.message
        });

    } finally {
        connection.release();
    }
};

const updateProduct = async (req, res) => {
    const connection =
        await pool.getConnection();

    try {
        const { id } = req.params;

        const {
            product_code,
            category_id,
            product_name,
            carpet_type,
            design_pattern,
            colour,
            width_mm,
            length_m,
            thickness_mm,
            gsm,
            surface_finish,
            backing_type,
            packing_type,
            standard_cost,
            selling_price,
            unit_id,
            status = "ACTIVE"
        } = req.body;

        if (
            !product_code?.trim() ||
            !product_name?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Product code and product name are required"
            });
        }

        if (
            Number(width_mm) < 0 ||
            Number(length_m) < 0 ||
            Number(thickness_mm) < 0 ||
            Number(gsm) < 0 ||
            Number(standard_cost) < 0 ||
            Number(selling_price) < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Numeric product values cannot be negative"
            });
        }

        const [existing] =
            await connection.query(
                `
                SELECT id
                FROM products
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );

        if (!existing.length) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const [duplicate] =
            await connection.query(
                `
                SELECT id
                FROM products
                WHERE product_code = ?
                  AND id <> ?
                LIMIT 1
                `,
                [
                    product_code.trim(),
                    id
                ]
            );

        if (duplicate.length) {
            return res.status(409).json({
                success: false,
                message:
                    "Product code already exists"
            });
        }

        await connection.query(
            `
            UPDATE products
            SET
                product_code = ?,
                category_id = ?,
                product_name = ?,
                carpet_type = ?,
                design_pattern = ?,
                colour = ?,
                width_mm = ?,
                length_m = ?,
                thickness_mm = ?,
                gsm = ?,
                surface_finish = ?,
                backing_type = ?,
                packing_type = ?,
                standard_cost = ?,
                selling_price = ?,
                unit_id = ?,
                status = ?
            WHERE id = ?
            `,
            [
                product_code.trim(),
                category_id || null,
                product_name.trim(),
                carpet_type || null,
                design_pattern || null,
                colour || null,
                width_mm ?? null,
                length_m ?? null,
                thickness_mm ?? null,
                gsm ?? null,
                surface_finish || null,
                backing_type || null,
                packing_type || null,
                standard_cost ?? 0,
                selling_price ?? 0,
                unit_id || null,
                status,
                id
            ]
        );

        return res.json({
            success: true,
            message:
                "PVC carpet product updated successfully"
        });

    } catch (error) {
        console.error(
            "Update Product Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to update product",
            error: error.message
        });

    } finally {
        connection.release();
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const [orders] =
            await pool.query(
                `
                SELECT id
                FROM production_orders
                WHERE product_id = ?
                LIMIT 1
                `,
                [id]
            );

        if (orders.length) {
            return res.status(409).json({
                success: false,
                message:
                    "Product is used in production orders. Set it INACTIVE instead."
            });
        }

        await pool.query(
            `
            DELETE FROM product_processes
            WHERE product_id = ?
            `,
            [id]
        );

        const [result] =
            await pool.query(
                `
                DELETE FROM products
                WHERE id = ?
                `,
                [id]
            );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.json({
            success: true,
            message:
                "Product deleted successfully"
        });

    } catch (error) {
        console.error(
            "Delete Product Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to delete product",
            error: error.message
        });
    }
};

/*
=========================================================
GET PRODUCT BILL OF MATERIALS (BOM)
=========================================================
*/
const getProductBOM = async (req, res) => {
    try {
        const { id } = req.params;

        const [productRows] = await pool.query(
            "SELECT id, product_code, product_name, standard_cost, unit_id FROM products WHERE id = ?",
            [id]
        );

        if (productRows.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const [items] = await pool.query(`
            SELECT 
                pb.id,
                pb.product_id,
                pb.material_id,
                pb.quantity_per_unit,
                pb.wastage_percentage,
                rm.material_code,
                rm.material_name,
                rm.standard_purchase_rate,
                COALESCE(u.symbol, 'KG') AS unit_symbol,
                COALESCE(mc.name, 'General') AS category_name,
                ROUND(pb.quantity_per_unit * (1 + (COALESCE(pb.wastage_percentage, 0) / 100)) * COALESCE(rm.standard_purchase_rate, 0), 2) AS unit_cost_inr
            FROM product_bom pb
            JOIN raw_materials rm ON rm.id = pb.material_id
            LEFT JOIN units u ON u.id = rm.unit_id
            LEFT JOIN material_categories mc ON mc.id = rm.category_id
            WHERE pb.product_id = ?
            ORDER BY rm.category_id ASC, rm.material_name ASC
        `, [id]);

        // Also fetch active raw materials for dropdown selection
        const [availableMaterials] = await pool.query(`
            SELECT 
                rm.id,
                rm.material_code,
                rm.material_name,
                rm.standard_purchase_rate,
                COALESCE(u.symbol, 'KG') AS unit_symbol,
                COALESCE(mc.name, 'General') AS category_name
            FROM raw_materials rm
            LEFT JOIN units u ON u.id = rm.unit_id
            LEFT JOIN material_categories mc ON mc.id = rm.category_id
            WHERE rm.status = 'ACTIVE'
            ORDER BY rm.material_name ASC
        `);

        const totalBOMCost = items.reduce((sum, item) => sum + parseFloat(item.unit_cost_inr || 0), 0);

        res.json({
            success: true,
            product: productRows[0],
            data: items,
            total_bom_cost: parseFloat(totalBOMCost.toFixed(2)),
            available_materials: availableMaterials
        });
    } catch (error) {
        console.error("Get Product BOM Error:", error);
        res.status(500).json({ success: false, message: "Failed to load product BOM", error: error.message });
    }
};

/*
=========================================================
SAVE / REPLACE PRODUCT BILL OF MATERIALS (BOM)
=========================================================
*/
const saveProductBOM = async (req, res) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
        const { id } = req.params;
        const { items } = req.body;

        if (!Array.isArray(items)) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "Items array is required" });
        }

        // Delete existing BOM for this product
        await connection.query("DELETE FROM product_bom WHERE product_id = ?", [id]);

        // Insert new items
        for (const item of items) {
            const qty = parseFloat(item.quantity_per_unit);
            const matId = parseInt(item.material_id, 10);
            if (!isNaN(matId) && !isNaN(qty) && qty > 0) {
                await connection.query(`
                    INSERT INTO product_bom (product_id, material_id, quantity_per_unit, wastage_percentage)
                    VALUES (?, ?, ?, ?)
                `, [id, matId, qty, parseFloat(item.wastage_percentage || 0)]);
            }
        }

        // Calculate total standard BOM cost and update product standard_cost
        const [costRows] = await connection.query(`
            SELECT SUM(pb.quantity_per_unit * (1 + (COALESCE(pb.wastage_percentage, 0) / 100)) * COALESCE(rm.standard_purchase_rate, 0)) AS bom_cost
            FROM product_bom pb
            JOIN raw_materials rm ON rm.id = pb.material_id
            WHERE pb.product_id = ?
        `, [id]);

        const totalCost = costRows[0]?.bom_cost || 0;
        await connection.query("UPDATE products SET standard_cost = ? WHERE id = ?", [totalCost, id]);

        await connection.commit();
        res.json({
            success: true,
            message: "Bill of Materials (BOM) saved successfully!",
            bom_cost: parseFloat(Number(totalCost).toFixed(2))
        });
    } catch (error) {
        await connection.rollback();
        console.error("Save Product BOM Error:", error);
        res.status(500).json({ success: false, message: "Failed to save product BOM", error: error.message });
    } finally {
        connection.release();
    }
};

/*
=========================================================
SEED DEFAULT BOM FORMULATIONS FOR ALL FACTORY PRODUCTS
=========================================================
*/
const seedDefaultBOM = async (req, res) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
        const [products] = await connection.query("SELECT id, product_code, product_name FROM products");
        const [materials] = await connection.query("SELECT id, material_code FROM raw_materials");

        const matMap = {};
        materials.forEach(m => { matMap[m.material_code] = m.id; });

        let insertedCount = 0;

        for (const p of products) {
            const code = p.product_code || "";
            const isDoorMat = code.includes("FM-MAT");
            const isRoll = code.includes("FM-ROLL");

            // Clear old BOM for this product
            await connection.query("DELETE FROM product_bom WHERE product_id = ?", [p.id]);

            const bomRecipes = [];

            if (isDoorMat) {
                // Determine pigment by product code
                let pigmentId = matMap["RM-PIG-BLU"] || 13;
                if (code.includes("RED")) pigmentId = matMap["RM-PIG-RED"] || 11;
                else if (code.includes("GRY")) pigmentId = matMap["RM-PIG-GREY"] || 12;

                bomRecipes.push(
                    { material_id: matMap["RM-PVC-E68"] || 1, qty: 0.450, waste: 1.5 },
                    { material_id: matMap["RM-PLAST-DOTP"] || 4, qty: 0.220, waste: 1.0 },
                    { material_id: matMap["RM-FILL-CACO3"] || 6, qty: 0.160, waste: 1.0 },
                    { material_id: matMap["RM-BLOW-ADC"] || 8, qty: 0.015, waste: 0.5 },
                    { material_id: matMap["RM-STAB-ZNCA"] || 9, qty: 0.018, waste: 0.5 },
                    { material_id: pigmentId, qty: 0.012, waste: 0.5 },
                    { material_id: matMap["RM-SUB-POLY"] || 10, qty: 0.240, waste: 2.0 }
                );
            } else if (isRoll) {
                bomRecipes.push(
                    { material_id: matMap["RM-PVC-S65"] || 2, qty: 22.500, waste: 2.0 },
                    { material_id: matMap["RM-PLAST-DOTP"] || 4, qty: 11.200, waste: 1.0 },
                    { material_id: matMap["RM-FILL-CACO3"] || 6, qty: 7.500, waste: 1.0 },
                    { material_id: matMap["RM-STAB-ZNCA"] || 9, qty: 0.850, waste: 0.5 },
                    { material_id: matMap["RM-COAT-PU"] || 14, qty: 1.200, waste: 1.0 },
                    { material_id: matMap["KP-180-BF"] || 16, qty: 15.000, waste: 3.0 }
                );
            }

            for (const r of bomRecipes) {
                if (r.material_id) {
                    await connection.query(`
                        INSERT INTO product_bom (product_id, material_id, quantity_per_unit, wastage_percentage)
                        VALUES (?, ?, ?, ?)
                    `, [p.id, r.material_id, r.qty, r.waste]);
                    insertedCount++;
                }
            }

            // Recalculate cost
            const [costRows] = await connection.query(`
                SELECT SUM(pb.quantity_per_unit * (1 + (COALESCE(pb.wastage_percentage, 0) / 100)) * COALESCE(rm.standard_purchase_rate, 0)) AS bom_cost
                FROM product_bom pb
                JOIN raw_materials rm ON rm.id = pb.material_id
                WHERE pb.product_id = ?
            `, [p.id]);

            const totalCost = costRows[0]?.bom_cost || 0;
            await connection.query("UPDATE products SET standard_cost = ? WHERE id = ?", [totalCost, p.id]);
        }

        await connection.commit();
        res.json({
            success: true,
            message: `Successfully seeded Bill of Materials (BOM) recipes across ${products.length} products (${insertedCount} ingredients configured)!`
        });
    } catch (error) {
        await connection.rollback();
        console.error("Seed BOM Error:", error);
        res.status(500).json({ success: false, message: "Failed to seed default BOM", error: error.message });
    } finally {
        connection.release();
    }
};

module.exports = {
    getProducts,
    getProductById,
    getProductOptions,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductBOM,
    saveProductBOM,
    seedDefaultBOM
};
