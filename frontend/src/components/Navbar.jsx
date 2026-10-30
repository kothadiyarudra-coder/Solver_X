import React, { useState, useEffect } from 'react';
import { Activity, Terminal, Radio } from 'lucide-react';
import { socket } from '../services/socket';

export default function Navbar() {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }
    function onDisconnect() {
      setConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <div className="bg-sky-500/20 text-sky-400 p-2 rounded-lg border border-sky-500/30">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-lg text-white tracking-tight">DevTrace AI</span>
          <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
            v1.0.0
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Real-time Socket.IO Connection Indicator */}
        <div
          className={`flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full border transition ${
            connected
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          ></span>
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3" />
            {connected ? 'Live Streaming' : 'Reconnecting...'}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-xs text-slate-400 border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 rounded-lg">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span>Project: <strong className="text-slate-200">demo-project</strong></span>
        </div>
      </div>
    </header>
  );
}
