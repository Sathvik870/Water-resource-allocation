import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings,  Activity } from 'lucide-react';

const Predictor: React.FC = () => {
  const [formData, setFormData] = useState({
    population: 0,
    priority_level: 'High',
    festival_week: 'No',
    res_demand: 0,
    com_demand: 0,
    ind_demand: 0,
    temp_avg_c: 28,
    season: 'Summer',
    rainfall_mm: 0
  });

  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:8000/api/defaults').then(res => {
      setFormData(prev => ({ ...prev, ...res.data }));
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/api/predict', formData);
      setPrediction(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Input Form */}
      <div className="w-full lg:w-1/2 bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
        <div className="flex items-center gap-2 mb-6 text-blue-600">
          <Settings />
          <h2 className="text-xl font-bold text-slate-800">Scenario Configuration</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Scenario Preset</label>
            <select className="w-full p-2 border rounded-lg text-slate-700 bg-slate-50" disabled>
              <option>Custom Scenario (Manual Input)</option>
              <option>S1 - Normal Rainfall</option>
              <option>S3 - High Demand</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Population</label>
            <input type="number" name="population" value={formData.population} onChange={handleChange} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Priority Level</label>
            <select name="priority_level" value={formData.priority_level} onChange={handleChange} className="w-full p-2 border rounded-lg">
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>

          <div className="col-span-2 border-t pt-4 mt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demand Factors (MLD)</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Residential</label>
            <input type="number" name="res_demand" value={formData.res_demand} onChange={handleChange} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Commercial</label>
            <input type="number" name="com_demand" value={formData.com_demand} onChange={handleChange} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Industrial</label>
            <input type="number" name="ind_demand" value={formData.ind_demand} onChange={handleChange} className="w-full p-2 border rounded-lg" />
          </div>

          <div className="col-span-2 border-t pt-4 mt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Environmental</span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Season</label>
            <select name="season" value={formData.season} onChange={handleChange} className="w-full p-2 border rounded-lg">
              <option>Winter</option>
              <option>Summer</option>
              <option>SW_Monsoon</option>
              <option>NE_Monsoon</option>
            </select>
          </div>
           <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Temp Avg (°C)</label>
            <input type="number" name="temp_avg_c" value={formData.temp_avg_c} onChange={handleChange} className="w-full p-2 border rounded-lg" />
          </div>
        </div>

        <button 
          onClick={handlePredict}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-200"
        >
          {loading ? 'Simulating...' : 'Generate Prediction'}
        </button>
      </div>

      {/* Results */}
      <div className="w-full lg:w-1/2 space-y-6">
        {/* Recommended Header (Static for UI Flow) */}
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 text-sm">Recommended Total Supply</p>
              <h1 className="text-4xl font-bold mt-1">
                {(parseFloat(formData.res_demand.toString()) + parseFloat(formData.com_demand.toString()) + parseFloat(formData.ind_demand.toString())).toFixed(2)} 
                <span className="text-lg font-normal ml-2">MLD</span>
              </h1>
            </div>
            <Activity className="opacity-50" size={32} />
          </div>
        </div>

        {prediction && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-fade-in-up">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Prediction Results</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-xs text-blue-500 font-bold uppercase">Operational</p>
                <div className="mt-2">
                  <span className="block text-sm text-slate-500">Supply Duration</span>
                  <span className="text-2xl font-bold text-slate-800">{prediction.supply_hours_per_day} <span className="text-sm">hrs/day</span></span>
                </div>
                <div className="mt-2">
                  <span className="block text-sm text-slate-500">Pumping Cap.</span>
                  <span className="text-xl font-bold text-slate-800">{prediction.pumping_capacity_mld} <span className="text-sm">MLD</span></span>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-xs text-green-600 font-bold uppercase">Source Allocation</p>
                <ul className="mt-2 space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-slate-600">Siruvani</span>
                    <span className="font-bold">{prediction.siruvani_supply_mld}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-600">Pilloor</span>
                    <span className="font-bold">{prediction.pilloor_supply_mld}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-600">Groundwater</span>
                    <span className="font-bold">{prediction.groundwater_supply_mld}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6">
               <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '85%' }}></div>
               </div>
               <p className="text-xs text-right text-slate-400 mt-1">System Load: 85% (Critical)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Predictor;