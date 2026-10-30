import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import RunHistory from './pages/RunHistory';
import RunDetails from './pages/RunDetails';
import CompareRuns from './pages/CompareRuns';
import Diagnosis from './pages/Diagnosis';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-slate-950/40">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/runs" element={<RunHistory />} />
              <Route path="/runs/:runId" element={<RunDetails />} />
              <Route path="/compare" element={<CompareRuns />} />
              <Route path="/diagnosis" element={<Diagnosis />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

