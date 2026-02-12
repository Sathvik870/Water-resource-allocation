import React from 'react';
import { LayoutDashboard, Droplets } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentZone: string | null;
  onZoneChange: (zone: string) => void;
  zones: readonly string[];
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentZone,
  onZoneChange,
  zones,
}) => {
  const baseButton =
    'w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all';

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-64 flex-col border-r border-sky-500/20 bg-slate-950/70 pb-6 pt-4 shadow-[0_24px_80px_rgba(15,23,42,1)] backdrop-blur-3xl">
      <div className="flex items-center gap-3 px-6 pb-4 pt-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-400 to-emerald-400 shadow-lg shadow-sky-700/40">
          <Droplets className="h-5 w-5 text-slate-950" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-sky-50">
            AquaSmart
          </h1>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-sky-300/70">
            Water Allocation Suite
          </p>
        </div>
      </div>

      {/* Current zone indicator + quick switch */}
      <div className="px-6 pb-3 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/60">
          Operating zone
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-medium text-sky-100">
            {currentZone ?? 'Not selected'}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {zones.map(zone => (
            <button
              key={zone}
              type="button"
              onClick={() => onZoneChange(zone)}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                currentZone === zone
                  ? 'border-sky-400 bg-sky-500/20 text-sky-50'
                  : 'border-slate-700 bg-slate-900/60 text-sky-200 hover:border-sky-400/70 hover:text-sky-50'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-3 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/60">
          Navigation
        </p>
      </div>

      <nav className="flex-1 space-y-2 px-4">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`${baseButton} ${
            activeTab === 'dashboard'
              ? 'bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 text-slate-950 shadow-lg shadow-sky-900/60'
              : 'text-sky-100/80 hover:bg-slate-900/70 hover:text-white border border-transparent hover:border-sky-500/30'
          }`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950/60 text-sky-300">
            <LayoutDashboard size={18} />
          </span>
          <span className="flex flex-col items-start">
            <span>Overview</span>
            <span className="text-[11px] font-normal text-sky-100/60">
              System dashboard
            </span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('predictor')}
          className={`${baseButton} ${
            activeTab === 'predictor'
              ? 'bg-sky-500/15 text-sky-100 border border-sky-400/40 shadow-inner shadow-sky-900/60'
              : 'text-sky-100/80 hover:bg-slate-900/70 hover:text-white border border-transparent hover:border-sky-500/30'
          }`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950/60 text-sky-300">
            <Droplets size={18} />
          </span>
          <span className="flex flex-col items-start">
            <span>Demand Predictor</span>
            <span className="text-[11px] font-normal text-sky-100/60">
              Scenario simulation
            </span>
          </span>
        </button>
      </nav>

      <div className="mt-4 px-6">
        <div className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/15 via-cyan-400/10 to-emerald-400/10 px-4 py-3 text-xs text-sky-50/90 shadow-lg shadow-sky-900/60">
          <p className="font-semibold">Live water grid</p>
          <p className="mt-1 text-[11px] text-sky-100/70">
            Monitor allocation efficiency and plan supply with confidence.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;