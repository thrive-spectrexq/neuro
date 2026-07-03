import React from 'react';

export default function SettingsPage() {
  return (
    <div className="p-8 h-full overflow-auto max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
      
      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-200 border-b border-white/10 pb-2">Appearance</h2>
          <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white">Theme</h3>
              <p className="text-sm text-gray-400">Select application theme</p>
            </div>
            <select className="bg-surface border border-white/10 text-white rounded px-3 py-1 outline-none">
              <option>Dark (Default)</option>
              <option>Light</option>
              <option>System</option>
            </select>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-200 border-b border-white/10 pb-2">AI Configuration</h2>
          <div className="glass-panel p-4 rounded-xl space-y-4">
            <div>
              <label className="block font-medium text-white mb-1">Local LLM Endpoint</label>
              <input type="text" className="w-full bg-background border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-accent-blue" placeholder="http://localhost:11434/api/generate" />
            </div>
            <div>
              <label className="block font-medium text-white mb-1">Model Name</label>
              <input type="text" className="w-full bg-background border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-accent-blue" placeholder="llama3" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
