import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Predictor from './pages/Predictor';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 ml-64 p-8 overflow-y-auto">
        {activeTab === 'dashboard' ? <Dashboard /> : <Predictor />}
      </div>
    </div>
  );
}

export default App;