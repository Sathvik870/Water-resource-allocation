import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Predictor from './pages/Predictor';

const ZONES = ['North', 'South', 'East', 'West', 'Central'] as const;

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const handleZoneSelect = (zone: string) => {
    setSelectedZone(zone);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-sky-950 via-slate-950 to-slate-900 text-slate-50">
      {/* Subtle water light rays */}
      <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen">
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-[32rem] bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentZone={selectedZone}
          onZoneChange={handleZoneSelect}
          zones={ZONES}
        />

        <main className="ml-64 flex-1 px-6 py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl border border-sky-500/15 bg-slate-900/40 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.95)] backdrop-blur-3xl lg:p-8">
              {!selectedZone ? (
                <div className="space-y-6 text-sky-50">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-300/80">
                      Select operating zone
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                      Coimbatore service zones
                    </h2>
                    <p className="mt-2 text-sm text-sky-100/80">
                      Choose a zone to start exploring allocation analytics and running
                      predictions for that area.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {ZONES.map(zone => (
                      <button
                        key={zone}
                        onClick={() => handleZoneSelect(zone)}
                        className="rounded-2xl border border-sky-200/20 bg-slate-950/70 px-4 py-3 text-left text-sky-50 shadow-sm transition-colors hover:border-sky-300/60 hover:bg-slate-900/80"
                      >
                        <p className="text-sm font-semibold">{zone}</p>
                        <p className="mt-1 text-[11px] text-sky-200/80">
                          View demand, supply and reliability metrics.
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : activeTab === 'dashboard' ? (
                <Dashboard selectedZone={selectedZone} />
              ) : (
                <Predictor selectedZone={selectedZone} />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;