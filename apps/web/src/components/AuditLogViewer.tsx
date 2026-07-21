import { useState, useEffect } from 'react';
import { Shield, Activity, FileSpreadsheet, FileCode, Clock } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface AuditItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  timestamp: string;
}

export function AuditLogViewer() {
  const token = useAuthStore((state) => state.token);
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivity = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/analytics/activity?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch audit log activity:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  const handleExport = (format: 'json' | 'csv') => {
    const url = `/api/v1/analytics/audit/export?format=${format}`;
    window.open(url, '_blank');
  };

  return (
    <div className="h-full flex flex-col glass-panel rounded-2xl border border-white/10 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent-cyan" /> Workspace Audit Trails & Compliance
          </h2>
          <p className="text-xs text-gray-400">Track data operations, member additions, & export compliance logs</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-3.5 py-2 glass-panel hover:bg-white/10 text-xs font-semibold text-emerald-300 border border-emerald-500/30 rounded-xl transition-all shadow-md active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 px-3.5 py-2 glass-panel hover:bg-white/10 text-xs font-semibold text-accent-purple border border-purple-500/30 rounded-xl transition-all shadow-md active:scale-95"
          >
            <FileCode className="w-4 h-4" /> Export JSON
          </button>
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            Loading activity log...
          </div>
        ) : logs.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-gray-500 text-sm border border-dashed border-white/10 rounded-xl">
            <Activity className="w-8 h-8 mb-2 opacity-50 text-accent-cyan" />
            No audit log entries recorded yet
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="glass-panel p-3.5 rounded-xl border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-accent-cyan">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">{log.action}</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-accent-purple/20 text-purple-300 rounded border border-purple-500/20">
                      {log.entity_type}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Target ID: <span className="font-mono text-gray-300">{log.entity_id}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="text-[11px] text-gray-400 max-w-xs truncate hidden md:block">
                    {JSON.stringify(log.details)}
                  </div>
                )}
                <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(log.timestamp).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
