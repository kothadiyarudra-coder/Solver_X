import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const COLORS = {
  success: "#10B981",
  failed: "#F43F5E",
};

export default function Charts({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-8 text-center text-xs text-slate-500">
        No telemetry time-series recorded yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-5">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="chartSuccess" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="chartFailed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#302345" />
          <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} />
          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#241738",
              border: "1px solid #302345",
              borderRadius: "8px",
              color: "#f8fafc",
            }}
          />
          <Area
            type="monotone"
            dataKey="success"
            stroke="#10B981"
            fill="url(#chartSuccess)"
          />
          <Area
            type="monotone"
            dataKey="failed"
            stroke="#F43F5E"
            fill="url(#chartFailed)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
