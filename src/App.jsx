import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);
  const [isOrganizing, setIsOrganizing] = useState(false);

  // Auto-scroll logs to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Electron log listener setup
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onLog) {
      window.electronAPI.onLog((message) => {
        setLogs((prevLogs) => [...prevLogs, message]);
      });
    }
  }, []);

  const handleStart = () => {
    if (window.electronAPI) {
      window.electronAPI.startOrganizer();
      setIsRunning(true);
    }
  };

  const handleStop = () => {
    if (window.electronAPI) {
      window.electronAPI.stopOrganizer();
      setIsRunning(false);
    }
  };

  const handleOrganizeExisting = () => {
  if (!window.electronAPI || isOrganizing) return;

  setIsOrganizing(true);
  window.electronAPI.organizeExisting();
};

  useEffect(() => {
    if (window.electronAPI?.onOrganizeComplete) {
      window.electronAPI.onOrganizeComplete(() => {
        setIsOrganizing(false);
      });
    }
  }, []);

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 text-2xl">
            📁
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-white">File Organizer Pro</h1>
            <p className="text-xs text-slate-400">Automatic Downloads Directory Manager</p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
          isRunning 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          {isRunning ? 'Watching Downloads Folder' : 'Organizer Inactive'}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 my-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Controls & Information */}
        <div className="flex flex-col gap-5">
          {/* Action Control Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md gap-4 flex flex-col">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Controls</h2>
            
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium rounded-xl shadow-lg shadow-emerald-900/20 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">🚀</span>
                <span>Start Watching</span>
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-medium rounded-xl shadow-lg shadow-rose-900/20 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">🛑</span>
                <span>Stop Watching</span>
              </button>
            )}

              <button
                onClick={handleOrganizeExisting}
                disabled={isOrganizing}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                {isOrganizing ? "📂 Organizing..." : "📂 Organize Existing Files"}
              </button>

          </div>

          {/* Quick Info Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md text-xs text-slate-400 flex flex-col gap-3">
            <h3 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">How It Works</h3>
            <p>Automatically detects newly downloaded files in your Downloads folder and routes them to subfolders based on extension and today's date.</p>
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-300">Images</span>
              <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-300">Documents</span>
              <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-300">Videos</span>
              <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-300">Audio</span>
              <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-300">Apps</span>
            </div>
          </div>
        </div>

        {/* Right Column: Terminal-like Log Window */}
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl backdrop-blur-md">
          {/* Terminal Title Bar */}
          <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-slate-400">activity.log</span>
            </div>
            
            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded bg-slate-800/40 hover:bg-slate-800 cursor-pointer"
              >
                Clear Console
              </button>
            )}
          </div>

          {/* Terminal Console Viewport */}
          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto max-h-[380px] space-y-2 leading-relaxed">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2 my-12">
                <span className="text-2xl opacity-40">⌨️</span>
                <p>System idle. Click "Start Watching" to observe directory activity.</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-2 rounded border font-mono transition-all ${
                    log.includes('❌') 
                      ? 'bg-rose-950/30 border-rose-900/50 text-rose-300' 
                      : log.includes('🚀') || log.includes('🛑')
                      ? 'bg-blue-950/30 border-blue-900/50 text-blue-300'
                      : 'bg-slate-950/50 border-slate-800/60 text-emerald-400/90'
                  }`}
                >
                  <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                  {log}
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="pt-4 border-t border-slate-900 flex justify-between items-center text-[11px] text-slate-600">
        <span>File Organizer Pro • Electron Desktop App</span>
        <span>Node.js Environment Active</span>
      </footer>
    </div>
  );
}

export default App;