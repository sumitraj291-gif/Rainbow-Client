-- ============================================================
-- PVC CARPET MANUFACTURING ERP - PHASE 9: EMPLOYEE & STAFF DIRECTORY
-- Seed script for plant personnel, operators, technicians and supervisors
-- ============================================================

INSERT INTO employees (employee_code, name, phone, email, department, designation, joining_date, shift, status)
VALUES
('EMP-001', 'Rajesh Sharma', '+91 98250 11221', 'rajesh.sharma@rainbowcarpet.com', 'PRODUCTION', 'Production Supervisor', '2023-01-15', 'DAY', 'ACTIVE'),
('EMP-002', 'Vikram Desai', '+91 98250 22334', 'vikram.desai@rainbowcarpet.com', 'PRODUCTION', 'PVC Coating Line Lead Operator', '2023-03-01', 'DAY', 'ACTIVE'),
('EMP-003', 'Ramesh Yadav', '+91 98250 33445', 'ramesh.yadav@rainbowcarpet.com', 'PRODUCTION', 'Plastisol Calendering Operator', '2023-04-10', 'ROTATIONAL', 'ACTIVE'),
('EMP-004', 'Amit Verma', '+91 98250 44556', 'amit.verma@rainbowcarpet.com', 'PRODUCTION', 'Gravure Rotogravure Printing Lead', '2023-06-20', 'DAY', 'ACTIVE'),
('EMP-005', 'Sanjay Solanki', '+91 98250 55667', 'sanjay.solanki@rainbowcarpet.com', 'MAINTENANCE', 'Senior Electrical & Automation Lead', '2022-11-01', 'GENERAL', 'ACTIVE'),
('EMP-006', 'Dinesh Joshi', '+91 98250 66778', 'dinesh.joshi@rainbowcarpet.com', 'MAINTENANCE', 'Mechanical & Thermal Oil Technician', '2023-02-15', 'GENERAL', 'ACTIVE'),
('EMP-007', 'Priya Nair', '+91 98250 77889', 'priya.nair@rainbowcarpet.com', 'QUALITY_CONTROL', 'Quality Assurance & Lab Inspector', '2023-05-18', 'DAY', 'ACTIVE'),
('EMP-008', 'Hardik Mehta', '+91 98250 88990', 'hardik.mehta@rainbowcarpet.com', 'QUALITY_CONTROL', 'Roll Final Inspection Officer', '2023-08-01', 'ROTATIONAL', 'ACTIVE'),
('EMP-009', 'Manoj Patel', '+91 98250 99001', 'manoj.patel@rainbowcarpet.com', 'WAREHOUSE', 'Dispatch & Finished Goods In-charge', '2022-09-10', 'GENERAL', 'ACTIVE'),
('EMP-010', 'Karan Patel', '+91 98250 10102', 'karan.patel@rainbowcarpet.com', 'PRODUCTION', 'Chemical Mixer & Compounder', '2023-09-01', 'DAY', 'ACTIVE'),
('EMP-011', 'Suresh Kumar', '+91 98250 11213', 'suresh.kumar@rainbowcarpet.com', 'PRODUCTION', 'Embossing & Lamination Tech', '2023-10-15', 'NIGHT', 'ACTIVE'),
('EMP-012', 'Mahesh Chawla', '+91 98250 12314', 'mahesh.chawla@rainbowcarpet.com', 'MAINTENANCE', 'Plant Shift Mechanic', '2024-01-05', 'NIGHT', 'ACTIVE')
ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), department=VALUES(department), designation=VALUES(designation);
