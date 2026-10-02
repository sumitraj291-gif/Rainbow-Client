import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";

const getDateString = (date) =>
    date.toISOString().slice(0, 10);

const OEEReports = () => {
    const today = new Date();

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(
        thirtyDaysAgo.getDate() - 29
    );

    const [filters, setFilters] = useState({
        from: getDateString(thirtyDaysAgo),
        to: getDateString(today),
        machine_id: "",
        shift: ""
    });

    const [options, setOptions] = useState({
        machines: [],
        shifts: []
    });

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");

    const loadOptions = async () => {
        try {
            const response =
                await api.get("/reports/oee/options");

            if (response.data.success) {
                setOptions(
                    response.data.data || {
                        machines: [],
                        shifts: []
                    }
                );
            }
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to load OEE filters."
            );
        }
    };

    const generateReport = async () => {
        try {
            if (filters.from > filters.to) {
                setError(
                    "From date cannot be after To date."
                );
                return;
            }

            setGenerating(true);
            setError("");

            const response =
                await api.get("/reports/oee", {
                    params: filters
                });

            if (!response.data.success) {
                throw new Error(
                    response.data.message ||
                    "Unable to generate OEE report"
                );
            }

            setReport(response.data.data);
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to generate OEE report."
            );
        } finally {
            setGenerating(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        const initialize = async () => {
            await loadOptions();
            await generateReport();
        };

        initialize();
    }, []);

    const summary =
        report?.summary || {};

    const machineWise =
        report?.machine_wise || [];

    const entries =
        report?.entries || [];

    const machineChartData = useMemo(
        () => machineWise.map((machine) => ({
            machine: machine.machine_name && machine.machine_code
                ? `${machine.machine_code} · ${machine.machine_name}`
                : machine.machine_code || machine.machine_name || "Unassigned",
            availability: machine.availability,
            performance: machine.performance,
            quality: machine.quality,
            oee: machine.oee,
            downtime_minutes: Number(machine.downtime_minutes || 0)
        })),
        [machineWise]
    );

    const dailyTimeData = useMemo(() => {
        const daily = new Map();

        entries.forEach((entry) => {
            if (!entry.production_date) return;

            const date = String(entry.production_date).slice(0, 10);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

            if (!daily.has(date)) {
                const parsedDate = new Date(`${date}T00:00:00`);
                daily.set(date, {
                    date,
                    label: parsedDate.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short"
                    }),
                    run_minutes: 0,
                    downtime_minutes: 0
                });
            }

            const totals = daily.get(date);
            totals.run_minutes += Number(entry.run_minutes || 0);
            totals.downtime_minutes += Number(entry.downtime_minutes || 0);
        });

        return Array.from(daily.values()).sort((first, second) =>
            first.date.localeCompare(second.date)
        );
    }, [entries]);

    const highestOeeMachine = machineChartData.reduce(
        (best, machine) =>
            machine.oee != null && (best === null || machine.oee > best.oee)
                ? machine
                : best,
        null
    );

    const highestDowntimeMachine = machineChartData.reduce(
        (highest, machine) =>
            highest === null || machine.downtime_minutes > highest.downtime_minutes
                ? machine
                : highest,
        null
    );

    const formatNumber = (
        value,
        decimals = 0
    ) => {
        if (
            value === null ||
            value === undefined
        ) {
            return "N/A";
        }

        return Number(value).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: decimals
            }
        );
    };

    const percentage = (value) => {
        if (
            value === null ||
            value === undefined
        ) {
            return "N/A";
        }

        return `${Number(value).toFixed(1)}%`;
    };

    const getOEEClass = (value) => {
        if (
            value === null ||
            value === undefined
        ) {
            return "oee-neutral";
        }

        if (value >= 85) {
            return "oee-good";
        }

        if (value >= 60) {
            return "oee-medium";
        }

        return "oee-low";
    };

    const handleFilterChange = (event) => {
        const {
            name,
            value
        } = event.target;

        setFilters((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const hasData =
        Number(summary.entries || 0) > 0;

    const missingStandardRate =
        summary.standard_rate_available === false;

    const reportTitle = useMemo(() => {
        return `OEE Report ${filters.from} to ${filters.to}`;
    }, [filters.from, filters.to]);

    /*
     * Export the currently displayed report as CSV.
     * This needs no extra npm package and opens correctly in Excel.
     */
    const exportCSV = () => {
        if (!report) {
            return;
        }

        const rows = [];

        rows.push([
            "OEE REPORT",
            "",
            "",
            "",
            ""
        ]);

        rows.push([
            "From",
            filters.from,
            "To",
            filters.to,
            ""
        ]);

        rows.push([]);

        rows.push([
            "Metric",
            "Value"
        ]);

        rows.push([
            "Availability",
            summary.availability ?? ""
        ]);

        rows.push([
            "Performance",
            summary.performance ?? ""
        ]);

        rows.push([
            "Quality",
            summary.quality ?? ""
        ]);

        rows.push([
            "OEE",
            summary.oee ?? ""
        ]);

        rows.push([]);

        rows.push([
            "Machine",
            "Planned Minutes",
            "Run Minutes",
            "Downtime Minutes",
            "Availability %",
            "Performance %",
            "Quality %",
            "OEE %"
        ]);

        machineWise.forEach((machine) => {
            rows.push([
                `${machine.machine_code || ""} ${machine.machine_name || ""}`,
                machine.planned_minutes ?? "",
                machine.run_minutes ?? "",
                machine.downtime_minutes ?? "",
                machine.availability ?? "",
                machine.performance ?? "",
                machine.quality ?? "",
                machine.oee ?? ""
            ]);
        });

        rows.push([]);

        rows.push([
            "Production Order",
            "Date",
            "Machine",
            "Shift",
            "Input",
            "Good",
            "Rejected",
            "Wastage",
            "Downtime Minutes",
            "Availability %",
            "Performance %",
            "Quality %",
            "OEE %"
        ]);

        entries.forEach((entry) => {
            rows.push([
                entry.production_order_number || "",
                entry.production_date || "",
                entry.machine_code || "Unassigned",
                entry.shift || "",
                entry.input_quantity ?? "",
                entry.good_quantity ?? "",
                entry.rejected_quantity ?? "",
                entry.wastage_quantity ?? "",
                entry.downtime_minutes ?? "",
                entry.availability ?? "",
                entry.performance ?? "",
                entry.quality ?? "",
                entry.oee ?? ""
            ]);
        });

        const csv = rows
            .map((row) =>
                row.map((cell) => {
                    const value =
                        cell === null ||
                        cell === undefined
                            ? ""
                            : String(cell);

                    return `"${value.replace(
                        /"/g,
                        '""'
                    )}"`;
                }).join(",")
            )
            .join("\r\n");

        const blob = new Blob(
            ["\uFEFF" + csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `OEE_Report_${filters.from}_${filters.to}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    };

    /*
     * Browser print dialog -> user can select
     * "Save as PDF". This keeps PDF generation
     * dependency-free.
     */
    const exportPDF = () => {
        window.print();
    };

    return (
        <div className="module-page oee-page">

            <div className="module-header oee-header">

                <div>
                    <div className="module-eyebrow">
                        REPORTS
                    </div>

                    <h2>
                        Overall Equipment Effectiveness
                    </h2>

                    <p>
                        Analyse machine availability,
                        performance and quality from
                        recorded production data.
                    </p>
                </div>

                <div className="oee-header-actions">

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={exportCSV}
                        disabled={!report}
                    >
                        Export Excel
                    </button>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={exportPDF}
                        disabled={!report}
                    >
                        Export PDF
                    </button>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={generateReport}
                        disabled={generating}
                    >
                        {generating
                            ? "Generating..."
                            : "Generate Report"}
                    </button>

                </div>

            </div>

            {error && (
                <div className="module-alert error">
                    <strong>Attention:</strong>{" "}
                    {error}
                </div>
            )}

            <div className="oee-filter-panel">

                <div className="oee-filter-field">
                    <label>From Date</label>

                    <input
                        type="date"
                        name="from"
                        value={filters.from}
                        onChange={handleFilterChange}
                    />
                </div>

                <div className="oee-filter-field">
                    <label>To Date</label>

                    <input
                        type="date"
                        name="to"
                        value={filters.to}
                        onChange={handleFilterChange}
                    />
                </div>

                <div className="oee-filter-field">
                    <label>Machine</label>

                    <select
                        name="machine_id"
                        value={filters.machine_id}
                        onChange={handleFilterChange}
                    >
                        <option value="">
                            All Machines
                        </option>

                        {options.machines.map(
                            (machine) => (
                                <option
                                    key={machine.id}
                                    value={machine.id}
                                >
                                    {machine.machine_code}
                                    {" — "}
                                    {machine.machine_name}
                                </option>
                            )
                        )}
                    </select>
                </div>

                <div className="oee-filter-field">
                    <label>Shift</label>

                    <select
                        name="shift"
                        value={filters.shift}
                        onChange={handleFilterChange}
                    >
                        <option value="">
                            All Shifts
                        </option>

                        {options.shifts.map(
                            (shift) => (
                                <option
                                    key={shift}
                                    value={shift}
                                >
                                    {shift}
                                </option>
                            )
                        )}
                    </select>
                </div>

            </div>

            {loading ? (
                <div className="oee-loading">
                    Loading OEE report...
                </div>
            ) : (
                <>
                    <div className="oee-kpi-grid">

                        <div
                            className={`oee-kpi-card main-oee ${getOEEClass(
                                summary.oee
                            )}`}
                        >
                            <span>Overall OEE</span>

                            <strong>
                                {percentage(
                                    summary.oee
                                )}
                            </strong>

                            <small>
                                {summary.oee != null
                                    ? "Availability × Performance × Quality"
                                    : hasData && missingStandardRate
                                        ? "Standard output rate required"
                                        : hasData
                                            ? "Insufficient data to calculate"
                                            : "No production data for this period"}
                            </small>
                        </div>

                        <div className="oee-kpi-card">
                            <span>Availability</span>

                            <strong>
                                {percentage(
                                    summary.availability
                                )}
                            </strong>

                            <small>
                                {summary.availability != null
                                    ? "Run time ÷ planned time"
                                    : "No planned production time recorded"}
                            </small>
                        </div>

                        <div className="oee-kpi-card">
                            <span>Performance</span>

                            <strong>
                                {percentage(
                                    summary.performance
                                )}
                            </strong>

                            <small>
                                {summary.performance != null
                                    ? "Actual output ÷ standard-rate output"
                                    : hasData && missingStandardRate
                                        ? "Standard output rate required"
                                        : hasData
                                            ? "Insufficient data to calculate"
                                            : "No production data for this period"}
                            </small>
                        </div>

                        <div className="oee-kpi-card">
                            <span>Quality</span>

                            <strong>
                                {percentage(
                                    summary.quality
                                )}
                            </strong>

                            <small>
                                {summary.quality != null
                                    ? "Good quantity ÷ total quantity"
                                    : "No production quantity recorded"}
                            </small>
                        </div>

                    </div>

                    <div className="oee-stat-grid">

                        <div>
                            <span>Production Entries</span>
                            <strong>
                                {formatNumber(
                                    summary.entries
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Input Quantity</span>
                            <strong>
                                {formatNumber(
                                    summary.input_quantity,
                                    3
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Good Quantity</span>
                            <strong>
                                {formatNumber(
                                    summary.good_quantity,
                                    3
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Rejected</span>
                            <strong>
                                {formatNumber(
                                    summary.rejected_quantity,
                                    3
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Wastage</span>
                            <strong>
                                {formatNumber(
                                    summary.wastage_quantity,
                                    3
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Downtime</span>
                            <strong>
                                {formatNumber(
                                    summary.downtime_minutes
                                )}{" "}
                                min
                            </strong>
                        </div>

                    </div>

                    <div className="oee-report-note">
                        <strong>{reportTitle}</strong>
                        <span>
                            {" "}• Calculated from recorded
                            production entries and machine
                            routing standards.
                        </span>
                    </div>

                    {!summary.standard_rate_available &&
                        hasData && (
                            <div className="oee-info-note">
                                Performance and Overall OEE are N/A because
                                no standard output rate is configured for
                                the selected product-machine routing. Add a
                                standard output/hour to calculate these
                                measures; the report does not estimate them.
                            </div>
                        )}

                    <div className="oee-insight-grid">
                        <div className="oee-insight-card">
                            <span>Highest machine OEE</span>
                            <strong>
                                {highestOeeMachine
                                    ? percentage(highestOeeMachine.oee)
                                    : "N/A"}
                            </strong>
                            <small>
                                {highestOeeMachine?.machine ||
                                    (hasData
                                        ? "OEE needs a standard output rate"
                                        : "No machine data for this period")}
                            </small>
                        </div>

                        <div className="oee-insight-card">
                            <span>Most downtime</span>
                            <strong>
                                {highestDowntimeMachine
                                    ? `${formatNumber(highestDowntimeMachine.downtime_minutes)} min`
                                    : "N/A"}
                            </strong>
                            <small>
                                {highestDowntimeMachine?.machine ||
                                    "No machine data for this period"}
                            </small>
                        </div>
                    </div>

                    <div className="oee-chart-grid">
                        <div className="oee-panel oee-chart-panel">
                            <div className="oee-panel-header">
                                <div>
                                    <h3>Machine KPI comparison</h3>
                                    <p>Availability, performance, quality and OEE by machine.</p>
                                </div>
                                <span>{machineChartData.length} machines</span>
                            </div>

                            {machineChartData.length > 0 ? (
                                <div
                                    className="oee-chart-canvas oee-machine-chart"
                                    style={{
                                        height: Math.min(
                                            520,
                                            Math.max(280, machineChartData.length * 46)
                                        )
                                    }}
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={machineChartData}
                                            layout="vertical"
                                            margin={{ top: 8, right: 18, bottom: 8, left: 6 }}
                                            barCategoryGap="24%"
                                        >
                                            <CartesianGrid stroke="#e8edf3" strokeDasharray="3 3" horizontal={false} />
                                            <XAxis
                                                type="number"
                                                domain={[0, "dataMax"]}
                                                tickFormatter={(value) => `${value}%`}
                                                tick={{ fill: "#64748b", fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                type="category"
                                                dataKey="machine"
                                                width={148}
                                                tick={{ fill: "#475569", fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
                                                contentStyle={{
                                                    border: "1px solid #dbe3ec",
                                                    borderRadius: 8,
                                                    fontSize: 12
                                                }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                                            <Bar dataKey="availability" name="Availability" fill="#3478c7" />
                                            <Bar dataKey="performance" name="Performance" fill="#0f9f91" />
                                            <Bar dataKey="quality" name="Quality" fill="#65a30d" />
                                            <Bar dataKey="oee" name="OEE" fill="#d97706" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="oee-chart-empty">
                                    No machine data is available for these filters.
                                </div>
                            )}
                        </div>

                        <div className="oee-panel oee-chart-panel">
                            <div className="oee-panel-header">
                                <div>
                                    <h3>Run time and downtime trend</h3>
                                    <p>Recorded production minutes by day.</p>
                                </div>
                                <span>{dailyTimeData.length} days</span>
                            </div>

                            {dailyTimeData.length > 0 ? (
                                <div className="oee-chart-canvas">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={dailyTimeData}
                                            margin={{ top: 8, right: 14, bottom: 4, left: 0 }}
                                        >
                                            <CartesianGrid stroke="#e8edf3" strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fill: "#64748b", fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                                minTickGap={18}
                                            />
                                            <YAxis
                                                tickFormatter={(value) => Number(value).toLocaleString("en-IN")}
                                                tick={{ fill: "#64748b", fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                                width={44}
                                            />
                                            <Tooltip
                                                formatter={(value, name) => [
                                                    `${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })} min`,
                                                    name
                                                ]}
                                                labelFormatter={(label, payload) =>
                                                    payload?.[0]?.payload?.date || label
                                                }
                                                contentStyle={{
                                                    border: "1px solid #dbe3ec",
                                                    borderRadius: 8,
                                                    fontSize: 12
                                                }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                                            <Line
                                                type="monotone"
                                                dataKey="run_minutes"
                                                name="Run time"
                                                stroke="#16845b"
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="downtime_minutes"
                                                name="Downtime"
                                                stroke="#d97706"
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="oee-chart-empty">
                                    No dated production entries are available for this period.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="oee-panel">

                        <div className="oee-panel-header">
                            <div>
                                <h3>
                                    Machine-wise OEE
                                </h3>

                                <p>
                                    Machine performance for the
                                    selected reporting period.
                                </p>
                            </div>

                            <span>
                                {machineWise.length} machines
                            </span>
                        </div>

                        <div className="oee-table-wrapper">

                            <table className="erp-table oee-table">

                                <thead>
                                    <tr>
                                        <th>Machine</th>
                                        <th>Planned</th>
                                        <th>Run</th>
                                        <th>Downtime</th>
                                        <th>Availability</th>
                                        <th>Performance</th>
                                        <th>Quality</th>
                                        <th>OEE</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {machineWise.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan="8"
                                                className="table-state"
                                            >
                                                No machine production
                                                data found for the
                                                selected filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        machineWise.map(
                                            (machine) => (
                                                <tr
                                                    key={
                                                        machine.machine_id ||
                                                        machine.machine_code
                                                    }
                                                >
                                                    <td>
                                                        <strong>
                                                            {
                                                                machine.machine_code
                                                            }
                                                        </strong>

                                                        <div className="table-secondary">
                                                            {
                                                                machine.machine_name
                                                            }
                                                        </div>
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            machine.planned_minutes
                                                        )}{" "}
                                                        min
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            machine.run_minutes
                                                        )}{" "}
                                                        min
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            machine.downtime_minutes
                                                        )}{" "}
                                                        min
                                                    </td>

                                                    <td>
                                                        {percentage(
                                                            machine.availability
                                                        )}
                                                    </td>

                                                    <td>
                                                        {percentage(
                                                            machine.performance
                                                        )}
                                                    </td>

                                                    <td>
                                                        {percentage(
                                                            machine.quality
                                                        )}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`oee-value ${getOEEClass(
                                                                machine.oee
                                                            )}`}
                                                        >
                                                            {percentage(
                                                                machine.oee
                                                            )}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>

                    <div className="oee-panel">

                        <div className="oee-panel-header">
                            <div>
                                <h3>
                                    Production Entry Detail
                                </h3>

                                <p>
                                    Source records used to
                                    calculate the report.
                                </p>
                            </div>

                            <span>
                                {entries.length} entries
                            </span>
                        </div>

                        <div className="oee-table-wrapper">

                            <table className="erp-table oee-table">

                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Production Order</th>
                                        <th>Machine</th>
                                        <th>Shift</th>
                                        <th>Input</th>
                                        <th>Good</th>
                                        <th>Rejected</th>
                                        <th>Wastage</th>
                                        <th>Downtime</th>
                                        <th>OEE</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {entries.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan="10"
                                                className="table-state"
                                            >
                                                No production entries
                                                found.
                                            </td>
                                        </tr>
                                    ) : (
                                        entries.map(
                                            (entry) => (
                                                <tr
                                                    key={
                                                        entry.id
                                                    }
                                                >
                                                    <td>
                                                        {entry.production_date
                                                            ? new Date(
                                                                entry.production_date
                                                            ).toLocaleDateString(
                                                                "en-IN"
                                                            )
                                                            : "—"}
                                                    </td>

                                                    <td>
                                                        <strong>
                                                            {entry.production_order_number ||
                                                                "—"}
                                                        </strong>

                                                        <div className="table-secondary">
                                                            {entry.product_code ||
                                                                ""}
                                                        </div>
                                                    </td>

                                                    <td>
                                                        {entry.machine_code ||
                                                            "Unassigned"}
                                                    </td>

                                                    <td>
                                                        {entry.shift ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            entry.input_quantity,
                                                            3
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            entry.good_quantity,
                                                            3
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            entry.rejected_quantity,
                                                            3
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            entry.wastage_quantity,
                                                            3
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            entry.downtime_minutes
                                                        )}{" "}
                                                        min
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`oee-value ${getOEEClass(
                                                                entry.oee
                                                            )}`}
                                                        >
                                                            {percentage(
                                                                entry.oee
                                                            )}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>
                </>
            )}

            <style>{`
                .oee-page {
                    width: 100%;
                }

                .oee-header {
                    align-items: flex-start;
                }

                .oee-header-actions {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                }

                .secondary-button {
                    min-height: 38px;
                    padding: 0 13px;
                    border: 1px solid #d7dee8;
                    border-radius: 7px;
                    background: #fff;
                    color: #344054;
                    font-family: inherit;
                    font-size: 10px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .secondary-button:hover {
                    background: #f8fafc;
                    border-color: #c7d0dc;
                }

                .secondary-button:disabled {
                    opacity: .55;
                    cursor: not-allowed;
                }

                .oee-filter-panel {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 14px;
                    padding: 16px;
                    margin-bottom: 18px;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                }

                .oee-filter-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .oee-filter-field label {
                    color: #475569;
                    font-size: 10px;
                    font-weight: 600;
                }

                .oee-filter-field input,
                .oee-filter-field select {
                    width: 100%;
                    height: 40px;
                    box-sizing: border-box;
                    padding: 0 10px;
                    border: 1px solid #d7dee8;
                    border-radius: 7px;
                    background: #fff;
                    color: #172033;
                    font-family: inherit;
                    font-size: 11px;
                    outline: none;
                }

                .oee-filter-field input:focus,
                .oee-filter-field select:focus {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37,99,235,.08);
                }

                .oee-kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 15px;
                    margin-bottom: 16px;
                }

                .oee-kpi-card {
                    min-height: 118px;
                    box-sizing: border-box;
                    padding: 18px;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                }

                .oee-kpi-card span {
                    display: block;
                    margin-bottom: 12px;
                    color: #64748b;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: .05em;
                    text-transform: uppercase;
                }

                .oee-kpi-card strong {
                    display: block;
                    color: #0f2747;
                    font-size: 27px;
                    line-height: 1;
                }

                .oee-kpi-card small {
                    display: block;
                    margin-top: 10px;
                    color: #64748b;
                    font-size: 11px;
                    line-height: 1.45;
                }

                .oee-kpi-card.main-oee {
                    border-left: 3px solid #2563eb;
                }

                .oee-kpi-card.main-oee.oee-good {
                    border-left-color: #059669;
                }

                .oee-kpi-card.main-oee.oee-medium {
                    border-left-color: #d97706;
                }

                .oee-kpi-card.main-oee.oee-low {
                    border-left-color: #dc2626;
                }

                .oee-stat-grid {
                    display: grid;
                    grid-template-columns: repeat(6, minmax(0, 1fr));
                    gap: 1px;
                    margin-bottom: 16px;
                    overflow: hidden;
                    background: #e2e8f0;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                }

                .oee-stat-grid > div {
                    min-height: 82px;
                    padding: 15px;
                    background: #fff;
                }

                .oee-stat-grid span {
                    display: block;
                    margin-bottom: 9px;
                    color: #64748b;
                    font-size: 9px;
                }

                .oee-stat-grid strong {
                    color: #172033;
                    font-size: 17px;
                }

                .oee-report-note {
                    display: flex;
                    gap: 4px;
                    align-items: center;
                    margin-bottom: 16px;
                    color: #64748b;
                    font-size: 10px;
                }

                .oee-report-note strong {
                    color: #334155;
                }

                .oee-info-note {
                    margin-bottom: 16px;
                    padding: 12px 14px;
                    border: 1px solid #bfdbfe;
                    border-radius: 8px;
                    background: #eff6ff;
                    color: #1e40af;
                    font-size: 12px;
                    line-height: 1.55;
                }

                .oee-insight-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .oee-insight-card {
                    min-width: 0;
                    padding: 14px 16px;
                    border: 1px solid #e2e8f0;
                    border-radius: 9px;
                    background: #fff;
                }

                .oee-insight-card span,
                .oee-insight-card small {
                    display: block;
                    color: #64748b;
                    font-size: 11px;
                }

                .oee-insight-card strong {
                    display: block;
                    margin: 5px 0 3px;
                    color: #172033;
                    font-size: 18px;
                }

                .oee-insight-card small {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .oee-chart-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 14px;
                }

                .oee-chart-panel {
                    min-width: 0;
                }

                .oee-chart-panel .oee-panel-header h3 {
                    font-size: 14px;
                }

                .oee-chart-panel .oee-panel-header p {
                    font-size: 11px;
                    line-height: 1.4;
                }

                .oee-chart-canvas {
                    width: 100%;
                    height: 300px;
                    min-width: 0;
                    padding: 12px 10px 4px;
                    box-sizing: border-box;
                }

                .oee-machine-chart {
                    overflow-y: auto;
                }

                .oee-chart-empty {
                    min-height: 240px;
                    display: grid;
                    place-items: center;
                    padding: 20px;
                    color: #64748b;
                    font-size: 12px;
                    text-align: center;
                }

                .oee-panel {
                    margin-bottom: 18px;
                    overflow: hidden;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                }

                .oee-panel-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 16px 18px;
                    border-bottom: 1px solid #e8edf3;
                }

                .oee-panel-header h3 {
                    margin: 0 0 4px;
                    color: #0f2747;
                    font-size: 14px;
                }

                .oee-panel-header p {
                    margin: 0;
                    color: #94a3b8;
                    font-size: 9px;
                }

                .oee-panel-header > span {
                    padding: 5px 8px;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    background: #f8fafc;
                    color: #64748b;
                    font-size: 9px;
                    font-weight: 600;
                    white-space: nowrap;
                }

                .oee-table-wrapper {
                    width: 100%;
                    overflow-x: auto;
                }

                .oee-table {
                    min-width: 1000px;
                }

                .oee-table th {
                    height: 42px;
                    padding: 0 13px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    color: #64748b;
                    font-size: 9px;
                    font-weight: 700;
                    letter-spacing: .04em;
                    text-align: left;
                    text-transform: uppercase;
                    white-space: nowrap;
                }

                .oee-table td {
                    padding: 11px 13px;
                    border-bottom: 1px solid #edf1f5;
                    color: #475569;
                    font-size: 10px;
                    white-space: nowrap;
                }

                .oee-table tbody tr:last-child td {
                    border-bottom: none;
                }

                .oee-table tbody tr:hover {
                    background: #fafcff;
                }

                .oee-table .table-secondary {
                    margin-top: 3px;
                    color: #98a2b3;
                    font-size: 9px;
                }

                .oee-value {
                    display: inline-flex;
                    min-width: 48px;
                    justify-content: center;
                    padding: 5px 7px;
                    border-radius: 5px;
                    font-size: 10px;
                    font-weight: 700;
                }

                .oee-good {
                    color: #047857;
                }

                .oee-value.oee-good {
                    background: #ecfdf5;
                    color: #047857;
                }

                .oee-medium {
                    color: #b45309;
                }

                .oee-value.oee-medium {
                    background: #fffbeb;
                    color: #b45309;
                }

                .oee-low {
                    color: #b91c1c;
                }

                .oee-value.oee-low {
                    background: #fef2f2;
                    color: #b91c1c;
                }

                .oee-neutral {
                    color: #64748b;
                }

                .oee-value.oee-neutral {
                    background: #f1f5f9;
                    color: #64748b;
                }

                .oee-loading {
                    min-height: 250px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    color: #64748b;
                    font-size: 12px;
                }

                @media print {
                    .erp-sidebar,
                    .erp-header,
                    .oee-filter-panel,
                    .oee-header-actions,
                    .module-eyebrow,
                    .module-alert {
                        display: none !important;
                    }

                    .erp-layout,
                    .erp-main,
                    .erp-content,
                    .module-page {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        max-width: none !important;
                    }

                    .oee-page {
                        font-size: 10px;
                    }

                    .oee-kpi-grid {
                        grid-template-columns: repeat(4, 1fr);
                    }

                    .oee-panel {
                        break-inside: avoid;
                    }

                    .oee-table {
                        min-width: 0;
                    }
                }

                @media (max-width: 1000px) {
                    .oee-filter-panel {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .oee-kpi-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .oee-stat-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }

                    .oee-chart-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 600px) {
                    .oee-header {
                        flex-direction: column;
                    }

                    .oee-header-actions {
                        width: 100%;
                        justify-content: stretch;
                    }

                    .oee-header-actions button {
                        flex: 1;
                    }

                    .oee-filter-panel,
                    .oee-kpi-grid {
                        grid-template-columns: 1fr;
                    }

                    .oee-stat-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .oee-insight-grid {
                        grid-template-columns: 1fr;
                    }

                    .oee-report-note {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
};

export default OEEReports;
