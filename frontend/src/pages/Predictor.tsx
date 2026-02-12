import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Activity } from 'lucide-react';

interface PredictorProps {
  selectedZone: string | null;
}

interface PredictionResponse {
  zone: string;
  model_scope: 'zone' | 'global';
  supply_r2: number;
  ops_r2: number;
  siruvani_supply_mld: number;
  pilloor_supply_mld: number;
  groundwater_supply_mld: number;
  supply_hours_per_day: number;
  pumping_capacity_mld: number;
}

const Predictor: React.FC<PredictorProps> = ({ selectedZone }) => {
  const [formData, setFormData] = useState({
    zone: '',
    population: 0,
    priority_level: 'High',
    festival_week: 'No',
    res_demand: 0,
    com_demand: 0,
    ind_demand: 0,
    temp_avg_c: 28,
    season: 'Summer',
    rainfall_mm: 0,
  });

  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedZone) {
      return;
    }

    axios
      .get('http://localhost:8000/api/defaults', {
        params: { zone: selectedZone },
      })
      .then(res => {
        setFormData(prev => ({ ...prev, ...res.data }));
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError(
          'Unable to load default scenario values for this zone. You can still enter values manually.'
        );
      });
  }, [selectedZone]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePredict = async () => {
    if (!selectedZone) {
      setError('Select a zone before running a prediction.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/api/predict', {
        ...formData,
        zone: formData.zone || selectedZone,
      });
      setPrediction(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const totalDemand =
    Number(formData.res_demand || 0) +
    Number(formData.com_demand || 0) +
    Number(formData.ind_demand || 0);

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* Left: structured input */}
      <section className="h-fit w-full rounded-2xl border border-sky-200/15 bg-slate-950/70 p-6 backdrop-blur-2xl lg:w-1/2 lg:p-7">
        <header className="mb-5 flex items-center gap-3 text-sky-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-200">
            <Settings size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-sky-50">
              Scenario configuration
            </h2>
            <p className="text-xs text-sky-100/75">
              Enter demand and environmental assumptions for this planning run.
            </p>
          </div>
        </header>

        {!selectedZone && (
          <div className="mb-4 rounded-xl border border-sky-200/40 bg-sky-500/10 px-4 py-3 text-xs text-sky-50">
            Select a zone from the left sidebar to load zone-specific defaults and run
            predictions.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-amber-200/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-50">
            {error}
          </div>
        )}

        <div className="space-y-5 text-sky-50">
          {/* Context row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-sky-200">
                Population served
              </label>
              <input
                type="number"
                name="population"
                value={formData.population}
                onChange={handleChange}
                className="w-full rounded-xl border border-sky-200/25 bg-slate-900/70 p-2.5 text-sm text-sky-50 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-300/70"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-sky-200">
                Priority level
              </label>
              <select
                name="priority_level"
                value={formData.priority_level}
                onChange={handleChange}
                className="w-full rounded-xl border border-sky-200/25 bg-slate-900/70 p-2.5 text-sm text-sky-50 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-300/70"
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>

          {/* Demand card */}
          <div className="rounded-2xl border border-sky-200/15 bg-slate-950/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">
              Demand (MLD)
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-[11px] text-sky-200">Residential</label>
                <input
                  type="number"
                  name="res_demand"
                  value={formData.res_demand}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-sky-200/25 bg-slate-900/70 p-2 text-xs text-sky-50 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-300/70"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-sky-200">Commercial</label>
                <input
                  type="number"
                  name="com_demand"
                  value={formData.com_demand}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-sky-200/25 bg-slate-900/70 p-2 text-xs text-sky-50 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-300/70"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-sky-200">Industrial</label>
                <input
                  type="number"
                  name="ind_demand"
                  value={formData.ind_demand}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-sky-200/25 bg-slate-900/70 p-2 text-xs text-sky-50 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-300/70"
                />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between text-xs text-sky-200/80">
              <span>Total input demand</span>
              <span className="font-semibold text-sky-50">
                {totalDemand.toFixed(2)} <span className="font-normal text-sky-200">MLD</span>
              </span>
            </div>
          </div>

          {/* Environment card */}
          <div className="rounded-2xl border border-sky-200/15 bg-slate-950/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">
              Environmental
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-sky-200">Season</label>
                <select
                  name="season"
                  value={formData.season}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-sky-200/25 bg-slate-900/70 p-2.5 text-xs text-sky-50 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-300/70"
                >
                  <option>Winter</option>
                  <option>Summer</option>
                  <option>SW_Monsoon</option>
                  <option>NE_Monsoon</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-sky-200">Temp avg (°C)</label>
                <input
                  type="number"
                  name="temp_avg_c"
                  value={formData.temp_avg_c}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-sky-200/25 bg-slate-900/70 p-2.5 text-xs text-sky-50 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-300/70"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handlePredict}
            className="mt-2 w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-slate-50 shadow-sm transition-colors hover:bg-sky-500"
          >
            {loading ? 'Running prediction…' : 'Run prediction'}
          </button>
        </div>
      </section>

      {/* Right: output summary – distinct layout from input */}
      <section className="w-full space-y-5 lg:w-1/2">
        <div className="rounded-2xl border border-sky-200/15 bg-slate-950/70 p-5 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">
                Recommended total supply
              </p>
              <p className="mt-2 text-3xl font-semibold text-sky-50">
                {totalDemand.toFixed(2)}{' '}
                <span className="text-sm font-normal text-sky-200">MLD</span>
              </p>
              <p className="mt-2 text-xs text-sky-200/80">
                Directly derived from entered sectoral demand before applying network
                constraints.
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/80 text-sky-200">
              <Activity size={20} />
            </div>
          </div>
        </div>

        {prediction && (
          <div className="space-y-4">
            {/* Model accuracy */}
            <div className="rounded-2xl border border-sky-200/15 bg-slate-950/80 p-5 backdrop-blur-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">
                Model accuracy · {prediction.model_scope === 'zone' ? 'zone-specific' : 'global'}
              </p>
              <div className="mt-3 space-y-3 text-xs text-sky-100/85">
                <div>
                  <div className="flex items-center justify-between">
                    <span>Supply allocation (R²)</span>
                    <span className="font-semibold">
                      {(prediction.supply_r2 * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 w-full rounded-full bg-slate-900/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500 transition-all duration-700"
                      style={{ width: `${Math.max(0, Math.min(1, prediction.supply_r2)) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span>Operations (R²)</span>
                    <span className="font-semibold">
                      {(prediction.ops_r2 * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 w-full rounded-full bg-slate-900/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all duration-700"
                      style={{ width: `${Math.max(0, Math.min(1, prediction.ops_r2)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-sky-200/15 bg-slate-950/70 p-5 backdrop-blur-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">
                Operational settings
              </p>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-sky-50">
                <div>
                  <p className="text-xs text-sky-200/80">Supply duration</p>
                  <p className="mt-1 text-xl font-semibold">
                    {prediction.supply_hours_per_day}{' '}
                    <span className="text-sm font-normal text-sky-200">hrs/day</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-sky-200/80">Pumping capacity</p>
                  <p className="mt-1 text-xl font-semibold">
                    {prediction.pumping_capacity_mld}{' '}
                    <span className="text-sm font-normal text-sky-200">MLD</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-sky-200/15 bg-slate-950/70 p-5 backdrop-blur-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">
                Source allocation
              </p>
              <ul className="mt-3 space-y-2 text-sm text-sky-50">
                <li className="flex justify-between">
                  <span className="text-sky-100/85">Siruvani</span>
                  <span className="font-semibold text-sky-50">
                    {prediction.siruvani_supply_mld}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-sky-100/85">Pilloor</span>
                  <span className="font-semibold text-sky-50">
                    {prediction.pilloor_supply_mld}
                  </span>
                </li>
              </ul>

              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-slate-900/70">
                  <div
                    className="h-2 rounded-full bg-sky-500"
                    style={{ width: '85%' }}
                  ></div>
                </div>
                <p className="mt-1 text-right text-[11px] text-sky-200/80">
                  System load estimate: <span className="font-semibold">85%</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Predictor;