-- =========================================================
-- PVC CARPET PHASE 7: PLANT MAINTENANCE & MACHINE BREAKDOWNS
-- =========================================================

USE production_management;

-- 1. Seed Comprehensive PVC Carpet Manufacturing Equipment Roster
INSERT INTO machines (id, machine_code, machine_name, machine_type, manufacturer, model_number, serial_number, capacity_per_hour, status, installation_date)
VALUES 
(10, 'COAT-LINE-01', 'Multi-Layer PVC Knife Coating & Gelling Line 01', 'Coating & Gelling Line', 'Bruckner / Zimmer Austria', 'MAGNO-3200', 'BRK-2019-9482', 450.00, 'RUNNING', '2019-04-15'),
(11, 'COAT-LINE-02', 'Needle-Punch Felt Impregnation Line 02', 'Impregnation & Coating Line', 'Stork Prints B.V.', 'ROTAMAC-2400', 'STRK-2021-3310', 380.00, 'RUNNING', '2021-08-20'),
(12, 'MIX-COWLES-01', 'Cowles High-Speed Plastisol Dissolver 1500L #1', 'High-Speed Dissolver Mixer', 'Dispermat / VMA-Getzmann', 'TU-1500-EX', 'VMA-2020-0418', 600.00, 'RUNNING', '2020-02-10'),
(13, 'MIX-COWLES-02', 'Cowles High-Speed Plastisol Dissolver 1500L #2 with Vacuum', 'Vacuum Dissolver Mixer', 'Dispermat / VMA-Getzmann', 'VAC-1500-EX', 'VMA-2022-1102', 600.00, 'RUNNING', '2022-06-18'),
(14, 'CAL-EMBOSS-01', 'Rotary Texture Calender & Embossing Unit with Chiller', 'Embossing Calender', 'Ramisch Guarneri', 'NIPCO-FLEX-200', 'RMS-2018-8812', 500.00, 'RUNNING', '2018-11-05'),
(15, 'INSPECT-SLIT-01', 'Automated Carpet Roll Inspection, Slitter & Re-winder', 'Inspection & Slitting Station', 'Menzel Maschinenbau', 'SLIT-ROLL-2200', 'MNZ-2021-5509', 750.00, 'RUNNING', '2021-03-25')
ON DUPLICATE KEY UPDATE 
    machine_name = VALUES(machine_name),
    machine_type = VALUES(machine_type),
    status = VALUES(status);

-- 2. Enhance machine_breakdowns table with breakdown ticket details
ALTER TABLE machine_breakdowns
    ADD COLUMN IF NOT EXISTS breakdown_ticket_no VARCHAR(50) NULL AFTER id,
    ADD COLUMN IF NOT EXISTS severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM' AFTER machine_id,
    ADD COLUMN IF NOT EXISTS breakdown_category ENUM('MECHANICAL', 'ELECTRICAL', 'PNEUMATIC', 'THERMAL_OIL', 'ELECTRONIC_DRIVE', 'OPERATOR_ERROR') DEFAULT 'MECHANICAL' AFTER severity,
    ADD COLUMN IF NOT EXISTS root_cause_category VARCHAR(100) NULL AFTER reason,
    ADD COLUMN IF NOT EXISTS technician_name VARCHAR(150) NULL AFTER action_taken,
    ADD COLUMN IF NOT EXISTS reported_by_name VARCHAR(150) DEFAULT 'Line Supervisor' AFTER technician_name,
    ADD COLUMN IF NOT EXISTS spare_parts_used TEXT NULL AFTER downtime_minutes,
    ADD COLUMN IF NOT EXISTS status ENUM('OPEN', 'IN_REPAIR', 'RESOLVED', 'CLOSED') DEFAULT 'RESOLVED' AFTER spare_parts_used;

-- 3. Enhance machine_maintenance table for PM Work Orders
ALTER TABLE machine_maintenance
    ADD COLUMN IF NOT EXISTS work_order_no VARCHAR(50) NULL AFTER id,
    ADD COLUMN IF NOT EXISTS priority ENUM('LOW', 'NORMAL', 'HIGH', 'EMERGENCY') DEFAULT 'NORMAL' AFTER maintenance_type,
    ADD COLUMN IF NOT EXISTS frequency ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL') DEFAULT 'MONTHLY' AFTER priority,
    ADD COLUMN IF NOT EXISTS checklist_items TEXT NULL AFTER description,
    ADD COLUMN IF NOT EXISTS downtime_hours DECIMAL(6,2) DEFAULT 0.00 AFTER cost;

-- 4. Seed Historical Real Machine Breakdowns
INSERT IGNORE INTO machine_breakdowns 
(id, breakdown_ticket_no, machine_id, severity, breakdown_category, breakdown_start, breakdown_end, reason, root_cause_category, action_taken, technician_name, reported_by_name, downtime_minutes, spare_parts_used, status) 
VALUES
(1, 'BD-20260928-0001', 10, 'HIGH', 'THERMAL_OIL', '2026-09-28 09:15:00', '2026-09-28 10:45:00', 'Gelling Oven Zone 2 temperature dropped by 18°C below setpoint (175°C target). Thermal oil circulation valve stuck.', 'Thermal Modulating Actuator Sticking', 'Replaced pneumatic actuator solenoid and calibrated digital PID controller. Reheated zone to 175°C.', 'Sanjay Solanki (Senior Electrical Lead)', 'Vikram Desai (Line 1 Operator)', 90, 'Pneumatic 3-way modulating valve diaphragm, Solenoid coil 24V DC', 'RESOLVED'),
(2, 'BD-20260929-0001', 12, 'MEDIUM', 'MECHANICAL', '2026-09-29 14:00:00', '2026-09-29 14:40:00', 'Cowles Dissolver #1 main shaft excessive vibration and abnormal mechanical noise during high-speed dispersion (1200 RPM).', 'Bearing Greasing Depletion & Impeller Misalignment', 'Purged contaminated grease, re-packed with high-temp polyurea synthetic grease, and dynamically balanced Cowles dispersing disc.', 'Mahesh Prajapati (Mechanical Fitter)', 'Devendra Solanki (Mixing Master)', 40, 'Polyurea EP-2 high-temp grease, Locking shaft collar M40', 'RESOLVED'),
(3, 'BD-20260930-0001', 14, 'LOW', 'PNEUMATIC', '2026-09-30 08:30:00', '2026-09-30 09:05:00', 'Embossing calender pneumatic cylinder pressure drop causing uneven nip pressure on left carpet edge.', 'Pneumatic Quick Exhaust Valve Leak', 'Replaced leaking quick exhaust valve and recalibrated dual nip pressure gauges to 4.5 bar.', 'Sanjay Solanki', 'Karan Varma', 35, 'Quick exhaust valve 1/2" BSP, PU tubing 10mm', 'RESOLVED');

-- 5. Seed Scheduled & In-Progress Preventive Maintenance (PM) Work Orders
INSERT IGNORE INTO machine_maintenance 
(id, work_order_no, machine_id, maintenance_type, priority, frequency, scheduled_date, completed_date, description, checklist_items, cost, downtime_hours, technician_name, status) 
VALUES
(1, 'WO-20260930-0001', 10, 'PREVENTIVE', 'HIGH', 'MONTHLY', '2026-09-30', NULL, 'Monthly Gelling Oven & Doctor Blade Precision Calibration', '1. Calibrate gelling oven zone 1-3 thermocouple sensors\n2. Inspect doctor blade knife edge using dial indicator (run-out <0.02mm)\n3. Check thermal oil circulation pump pressure and mechanical seal leaks\n4. Clean air circulation filters and exhaust blower impellers\n5. Test emergency trip pull-cord wire along complete line length', 4500.00, 2.50, 'Sanjay Solanki & Team', 'IN_PROGRESS'),
(2, 'WO-20261005-0001', 13, 'SERVICE', 'NORMAL', 'QUARTERLY', '2026-10-05', NULL, 'Vacuum Dissolver Pump Overhaul & Seal Replacement', '1. Vacuum pump oil drain & refill with synthetic vacuum fluid\n2. Inspect double mechanical seal face wear\n3. Test vacuum chamber seal integrity (hold -0.90 bar for 15 mins)\n4. Check motor thermal overload relay trip settings', 8500.00, 3.00, 'External Service Engineer (Getzmann)', 'SCHEDULED'),
(3, 'WO-20260925-0001', 15, 'INSPECTION', 'NORMAL', 'WEEKLY', '2026-09-25', '2026-09-25', 'Roll Slitter Rotary Circular Knife Sharpening & Laser Sensor Alignment', '1. Rotary shear slitting blades inspected & sharpened\n2. Re-winder pneumatic tension load cell zero calibrated\n3. Ultrasonic edge guide sensor cleaned and tested', 1200.00, 1.00, 'Mahesh Prajapati', 'COMPLETED');
