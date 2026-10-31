import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Discover from './pages/Discover';
import Dashboard from './pages/Dashboard';
import Issues from './pages/Issues';
import Performance from './pages/Performance';
import RunHistory from './pages/RunHistory';
import RunDetails from './pages/RunDetails';
import CompareRuns from './pages/CompareRuns';
import Diagnosis from './pages/Diagnosis';
import Projects from './pages/Projects';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#1A1325] text-slate-100 flex font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col pl-64 min-w-0">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-6 bg-[#1A1325]">
            <Routes>
              {/* Sentry-Style Discover page (Errors by Title with stacked area chart) */}
              <Route path="/" element={<Discover />} />
              <Route path="/discover" element={<Discover />} />

              {/* Observability Overview Dashboard */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Issues view */}
              <Route path="/issues" element={<Issues />} />

              {/* Performance & Traces APM view */}
              <Route path="/performance" element={<Performance />} />
              <Route path="/traces" element={<Performance />} />

              {/* Execution Run History & Details */}
              <Route path="/runs" element={<RunHistory />} />
              <Route path="/runs/:id" element={<RunDetails />} />

              {/* Differential Run Comparison */}
              <Route path="/compare" element={<CompareRuns />} />

              {/* AI Gemini Root Cause Diagnosis */}
              <Route path="/diagnosis" element={<Diagnosis />} />

              {/* Projects Management */}
              <Route path="/projects" element={<Projects />} />

              {/* Settings */}
              <Route path="/settings" element={<Settings />} />

              {/* Secondary links */}
              <Route path="/activity" element={<Discover />} />
              <Route path="/stats" element={<Performance />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/discover" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
