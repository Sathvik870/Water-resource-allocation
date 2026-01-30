import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import axios from 'axios';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    axios.get('http://localhost:8000/api/dashboard')
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, []);

  if (!data) return <div className="p-10 text-slate-500">Loading Dashboard Analytics...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-800">System Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-medium text-slate-500">Total Supply (Current Week)</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{data.current_week_supply.toFixed(2)} MLD</p>
          <span className="text-xs text-green-500 font-medium">+2.4% vs Last Avg</span>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-medium text-slate-500">System Status</h3>
          <p className="text-3xl font-bold text-yellow-500 mt-2">Stressed</p>
          <span className="text-xs text-slate-400">Based on recent gap analysis</span>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-medium text-slate-500">Avg Efficiency</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-2">92.4%</p>
          <span className="text-xs text-slate-400">Allocation Efficiency</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Weekly Water Supply Trend</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.weekly_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week_start" tick={{fontSize: 10}} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total_supply_mld" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Zone Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Demand by Zone</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.zone_distribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="total_demand_mld"
                label
              >
                {data.zone_distribution.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Season Supply */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Supply by Season</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.season_supply}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="season" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total_supply_mld" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Population */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Population Projection</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.population_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week_start" tick={{fontSize: 10}}/>
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="population" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;