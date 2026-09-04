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
    <div className="h-full flex flex-col bg-[#090A0F] border border-[#1F2433] rounded-lg p-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-[#1F2433] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#141722] border border-[#242A3C] rounded-md text-sky-400">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide font-mono">Workspace Audit Trails & Compliance</h2>
            <p className="text-[10px] text-[#64748B]">Deterministic ledger of data operations, security actions, and modifications</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#102319] hover:bg-[#153123] text-emerald-300 border border-[#1B432C] rounded-md text-xs font-mono transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#18162B] hover:bg-[#231F3D] text-teal-300 border border-[#302856] rounded-md text-xs font-mono transition-colors shadow-sm"
          >
            <FileCode className="w-3 h-3" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-[#64748B] text-xs font-mono">
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-[#475569] text-xs border border-dashed border-[#1F2433] rounded-md font-mono">
            <Activity className="w-5 h-5 mb-1.5 text-[#334155]" />
            No audit log entries recorded
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-md border border-[#1F2433] bg-[#0F1117] hover:border-[#2E364B] transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1 bg-[#141722] rounded border border-[#242A3C] text-sky-400">
                  <Activity className="w-3 h-3" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono">{log.action}</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-mono bg-[#18162B] text-teal-300 rounded border border-[#302856]">
                      {log.entity_type}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748B] font-mono mt-0.5">
                    ID: {log.entity_id} {log.details ? `&bull; ${JSON.stringify(log.details)}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-mono text-[#64748B] flex-shrink-0">
                <Clock className="w-3 h-3" />
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
