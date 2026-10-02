-- Run this once in phpMyAdmin if PVC Carpet is not already present.
INSERT INTO product_categories (name, description)
SELECT 'PVC Carpet', 'PVC Carpet Products'
WHERE NOT EXISTS (
    SELECT 1
    FROM product_categories
    WHERE name = 'PVC Carpet'
);
