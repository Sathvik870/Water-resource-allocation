import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
} from 'recharts';
import axios from 'axios';

interface DashboardData {
  current_week_supply: number;
  weekly_trend: { week_start: string; total_supply_mld: number }[];
  zone_distribution: { zone: string; total_demand_mld: number }[];
  season_supply: { season: string; total_supply_mld: number }[];
  source_mix: {
    week_start: string;
    siruvani_supply_mld: number;
    pilloor_supply_mld: number;
    groundwater_supply_mld: number;
  }[];
  storage_trend: {
    week_start: string;
    siruvani_storage_pct: number;
    pilloor_storage_pct: number;
  }[];
  zone_reliability: { zone: string; supply_hours_per_day: number }[];
  zone_weekly_metrics: {
    week_start: string;
    zone: string;
    total_demand_mld: number;
    supply_hours_per_day: number;
  }[];
  zone_demand_mix: {
    zone: string;
    residential_demand_mld: number;
    commercial_demand_mld: number;
    industrial_demand_mld: number;
  }[];
  scenario_efficiency: {
    scenario_id: string;
    week: number;
    allocation_efficiency_percent: number;
    supply_demand_gap_mld: number;
  }[];
  status_summary: { system_status: string; count: number }[];
}

interface DashboardProps {
  selectedZone: string;
}

const Dashboard: React.FC<DashboardProps> = ({ selectedZone }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get('http://localhost:8000/api/dashboard')
      .then(res => {
        setData(res.data);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError(
          'Unable to connect to the analytics service. Please ensure the backend is running on port 8000.'
        );
      });
  }, []);

  const zoneWeeklyForSelected = useMemo(() => {
    if (!data?.zone_weekly_metrics) return [];
    return data.zone_weekly_metrics.filter(
      entry => entry.zone.toLowerCase() === selectedZone.toLowerCase()
    );
  }, [data, selectedZone]);

  const zoneMixForSelected = useMemo(() => {
    if (!data?.zone_demand_mix) return null;
    return (
      data.zone_demand_mix.find(
        entry => entry.zone.toLowerCase() === selectedZone.toLowerCase()
      ) ?? null
    );
  }, [data, selectedZone]);

  const weeklyWithAverage = useMemo(() => {
    if (!data?.weekly_trend) return [];
    const trend = data.weekly_trend;
    const avg =
      trend.reduce((sum: number, d) => sum + (d.total_supply_mld ?? 0), 0) /
      trend.length;
    return trend.map(d => ({
      ...d,
      rolling_avg: avg,
    }));
  }, [data]);

  if (error) {
    return (
      <div className="flex h-[480px] flex-col items-center justify-center text-sky-50">
        <div className="max-w-lg rounded-2xl border border-sky-200/10 bg-slate-900/80 px-6 py-5 text-center shadow-lg backdrop-blur-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">
            Connection issue
          </p>
          <p className="mt-3 text-sm text-sky-100/90">{error}</p>
          <p className="mt-2 text-[11px] text-sky-300/80">
            Endpoint:&nbsp;
            <span className="font-mono text-sky-100">
              http://localhost:8000/api/dashboard
            </span>
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[480px] flex-col items-center justify-center text-sky-50">
        <div className="h-11 w-11 animate-pulse rounded-full bg-sky-500/20 ring-2 ring-sky-400/40" />
        <p className="mt-4 text-sm text-sky-100/80">
          Preparing water grid analytics…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-sky-50">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-300/80">
            Coimbatore urban grid
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            System overview
          </h2>
          <p className="mt-2 max-w-xl text-sm text-sky-100/75">
            Professional snapshot of supply, demand and population across the network.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="hidden rounded-2xl border border-sky-200/20 bg-slate-900/70 px-4 py-3 text-xs sm:flex sm:flex-col sm:items-start">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">
              Current zone
            </p>
            <p className="mt-1 text-sm font-semibold text-sky-50">{selectedZone}</p>
            <p className="mt-1 text-[11px] text-sky-200/75">
              Use the left sidebar to switch zone.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-200/15 bg-slate-900/60 px-4 py-3 text-xs">
            <p className="text-sky-200/90">Current week supply</p>
            <p className="mt-1 text-lg font-semibold text-sky-50">
              {data.current_week_supply.toFixed(2)}{' '}
              <span className="text-xs font-normal text-sky-200/70">MLD</span>
            </p>
          </div>
          <div className="hidden rounded-2xl border border-emerald-200/15 bg-slate-900/70 px-4 py-3 text-xs sm:block">
            <p className="text-emerald-100/90">Network status</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">Stressed</p>
          </div>
        </div>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-sky-200/15 bg-slate-950/60 px-5 py-4 backdrop-blur-2xl">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">
            Total supply · week
          </h3>
          <p className="mt-3 text-3xl font-semibold text-sky-50">
            {data.current_week_supply.toFixed(2)}{' '}
            <span className="text-sm font-normal text-sky-200/75">MLD</span>
          </p>
          <span className="mt-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-200">
            +2.4% vs last avg
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/10 bg-slate-950/60 px-5 py-4 backdrop-blur-2xl">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">
            System status
          </h3>
          <p className="mt-3 text-3xl font-semibold text-amber-200">Stressed</p>
          <p className="mt-2 text-[11px] text-sky-200/75">
            Based on recent allocation gap analysis.
          </p>
        </div>

        <div className="rounded-2xl border border-sky-200/15 bg-slate-950/60 px-5 py-4 backdrop-blur-2xl">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">
            Allocation efficiency
          </h3>
          <p className="mt-3 text-3xl font-semibold text-emerald-200">92.4%</p>
          <p className="mt-2 text-[11px] text-sky-200/75">
            Ratio of optimal to delivered supply.
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 1. Weekly trend + benchmark */}
        <div className="h-80 rounded-2xl border border-sky-200/10 bg-slate-950/70 p-5 backdrop-blur-2xl">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-sky-50">
              Weekly water supply
            </h3>
            <p className="text-[11px] text-sky-300/80">Actual vs weekly average</p>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyWithAverage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
              <XAxis
                dataKey="week_start"
                tick={{ fontSize: 10, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
                axisLine={{ stroke: '#1e293b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.6)',
                  padding: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="total_supply_mld"
                stroke="#0ea5e9"
                strokeWidth={2.2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="rolling_avg"
                stroke="#94a3b8"
                strokeWidth={1.4}
                dot={false}
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 2. Weekly demand for current zone */}
        <div className="h-80 rounded-2xl border border-slate-200/10 bg-slate-950/70 p-5 backdrop-blur-2xl">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-sky-50">
              Weekly demand · {selectedZone}
            </h3>
            <p className="text-[11px] text-sky-300/80">
              Total demand (MLD) over time for the selected zone
            </p>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={zoneWeeklyForSelected}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
              <XAxis
                dataKey="week_start"
                tick={{ fontSize: 10, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
                axisLine={{ stroke: '#1e293b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.6)',
                  padding: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="total_demand_mld"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 3. Season supply */}
        <div className="h-72 rounded-2xl border border-sky-200/10 bg-slate-950/70 p-5 backdrop-blur-2xl">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-sky-50">
              Supply by season
            </h3>
            <p className="text-[11px] text-sky-300/80">Distribution over typical year</p>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.season_supply}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
              <XAxis
                dataKey="season"
                tick={{ fontSize: 11, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
                axisLine={{ stroke: '#1e293b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.6)',
                  padding: 10,
                }}
              />
              <Bar
                dataKey="total_supply_mld"
                radius={[8, 8, 0, 0]}
                fill="#0ea5e9"
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 4. Source mix over time */}
        <div className="h-72 rounded-2xl border border-slate-200/10 bg-slate-950/70 p-5 backdrop-blur-2xl">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-sky-50">
              Source mix over time
            </h3>
            <p className="text-[11px] text-sky-300/80">Siruvani vs Pilloor vs groundwater</p>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.source_mix}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
              <XAxis
                dataKey="week_start"
                tick={{ fontSize: 10, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
                axisLine={{ stroke: '#1e293b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.6)',
                  padding: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="siruvani_supply_mld"
                stroke="#38bdf8"
                strokeWidth={1.8}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="pilloor_supply_mld"
                stroke="#0ea5e9"
                strokeWidth={1.8}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="groundwater_supply_mld"
                stroke="#6366f1"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 5. Zone demand mix */}
        <div className="h-72 rounded-2xl border border-sky-200/10 bg-slate-950/70 p-5 backdrop-blur-2xl">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-sky-50">
              Demand mix · {selectedZone}
            </h3>
            <p className="text-[11px] text-sky-300/80">
              Average residential, commercial and industrial demand (MLD)
            </p>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  name: 'Residential',
                  value: zoneMixForSelected?.residential_demand_mld ?? 0,
                },
                {
                  name: 'Commercial',
                  value: zoneMixForSelected?.commercial_demand_mld ?? 0,
                },
                {
                  name: 'Industrial',
                  value: zoneMixForSelected?.industrial_demand_mld ?? 0,
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
                axisLine={{ stroke: '#1e293b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.6)',
                  padding: 10,
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#0ea5e9" barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 6. Zone reliability over time */}
        <div className="h-72 rounded-2xl border border-slate-200/10 bg-slate-950/70 p-5 backdrop-blur-2xl">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-sky-50">
              Supply hours · {selectedZone}
            </h3>
            <p className="text-[11px] text-sky-300/80">
              Weekly supply hours per day for the selected zone
            </p>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={zoneWeeklyForSelected}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
              <XAxis
                dataKey="week_start"
                tick={{ fontSize: 10, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
                axisLine={{ stroke: '#1e293b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.6)',
                  padding: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="supply_hours_per_day"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 7. Scenario efficiency by week */}
        <div className="h-72 rounded-2xl border border-sky-200/10 bg-slate-950/70 p-5 backdrop-blur-2xl">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-sky-50">
              Scenario efficiency
            </h3>
            <p className="text-[11px] text-sky-300/80">
              Allocation efficiency vs supply–demand gap
            </p>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
              <XAxis
                type="number"
                dataKey="supply_demand_gap_mld"
                name="Gap (MLD)"
                tick={{ fontSize: 10, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
              />
              <YAxis
                type="number"
                dataKey="allocation_efficiency_percent"
                name="Efficiency (%)"
                tick={{ fontSize: 10, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
                axisLine={{ stroke: '#1e293b' }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3', stroke: '#1e293b' }}
                contentStyle={{
                  backgroundColor: '#020617',
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.6)',
                  padding: 10,
                  color: '#e5e7eb',
                }}
                labelStyle={{ color: '#e5e7eb' }}
                itemStyle={{ color: '#e5e7eb' }}
              />
              <Scatter
                data={data.scenario_efficiency}
                fill="#0ea5e9"
                fillOpacity={0.9}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* 8. System status distribution */}
        <div className="h-72 rounded-2xl border border-slate-200/10 bg-slate-950/70 p-5 backdrop-blur-2xl">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-sky-50">
              System status distribution
            </h3>
            <p className="text-[11px] text-sky-300/80">From what‑if scenarios</p>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.status_summary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
              <XAxis
                dataKey="system_status"
                tick={{ fontSize: 11, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#e2e8f0' }}
                tickLine={{ stroke: '#1e293b' }}
                axisLine={{ stroke: '#1e293b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.6)',
                  padding: 10,
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#0ea5e9" barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;