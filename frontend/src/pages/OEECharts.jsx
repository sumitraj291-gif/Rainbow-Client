import React from "react";
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

const OEECharts = ({ machineData, dailyData }) => (
    <div className="oee-chart-grid">
        <div className="oee-panel oee-chart-panel">
            <div className="oee-panel-header">
                <div>
                    <h3>Machine KPI comparison</h3>
                    <p>Availability, performance, quality and OEE by machine.</p>
                </div>
                <span>{machineData.length} machines</span>
            </div>

            {machineData.length > 0 ? (
                <div
                    className="oee-chart-canvas oee-machine-chart"
                    style={{
                        height: Math.min(
                            520,
                            Math.max(280, machineData.length * 46)
                        )
                    }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={machineData}
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
                <span>{dailyData.length} days</span>
            </div>

            {dailyData.length > 0 ? (
                <div className="oee-chart-canvas">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={dailyData}
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
);

export default OEECharts;
