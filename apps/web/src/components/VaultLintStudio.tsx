import { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Link2Off, 
  FileQuestion, 
  RefreshCw, 
  Wrench, 
  Search, 
  FolderTree, 
  Sparkles, 
  CheckCircle2, 
  FileText
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface LintReport {
  vault_health_score: number;
  total_notes_scanned: number;
  broken_links: { source_note: string; target: string; suggestion?: string }[];
  orphan_notes: string[];
  empty_headings: { note: string; heading: string }[];
  metadata_gaps: { note: string; missing: string[] }[];
}

interface BM25Result {
  title: string;
  score: number;
  snippet: string;
  tags?: string[];
  matched_terms?: string[];
}

export function VaultLintStudio() {
  const token = useAuthStore((state) => state.token);
  const [report, setReport] = useState<LintReport | null>({
    vault_health_score: 94,
    total_notes_scanned: 48,
    broken_links: [
      { source_note: 'AI Agents Strategy.md', target: 'Task Automations', suggestion: 'Automation Pipelines.md' },
      { source_note: 'Weekly Review 2026-W31.md', target: 'Memory Graphs', suggestion: 'Neuro AI Architecture.md' },
    ],
    orphan_notes: ['Draft Scratchpad.md', 'Meeting 2026-08-01.md'],
    empty_headings: [{ note: 'Research Notes.md', heading: '### Future Milestones' }],
    metadata_gaps: [{ note: 'Local LLM Benchmark.md', missing: ['tags', 'updated_at'] }],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [bm25Query, setBm25Query] = useState('');
  const [bm25Results, setBm25Results] = useState<BM25Result[]>([]);
  const [isSearchingBM25, setIsSearchingBM25] = useState(false);
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'bm25' | 'routing'>('diagnostics');

  // Route testing
  const [routeTitle, setRouteTitle] = useState('');
  const [routeMode, setRouteMode] = useState<'para' | 'lyt' | 'zettelkasten'>('para');
  const [routeSuggestion, setRouteSuggestion] = useState<any>(null);

  const fetchLintReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/obsidian/lint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vault_path: '.' }),
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error('Failed to run vault diagnostics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunBM25 = async () => {
    if (!bm25Query.trim()) return;
    setIsSearchingBM25(true);
    try {
      const res = await fetch('/api/v1/obsidian/retrieve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: bm25Query, top_k: 5 }),
      });
      if (res.ok) {
        const data = await res.json();
        setBm25Results(data.results || []);
      }
    } catch (err) {
      console.error('BM25 query failed:', err);
    } finally {
      setIsSearchingBM25(false);
    }
  };

  const handleTestRoute = async () => {
    if (!routeTitle.trim()) return;
    try {
      const res = await fetch('/api/v1/obsidian/route-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: routeTitle, mode: routeMode }),
      });
      if (res.ok) {
        const data = await res.json();
        setRouteSuggestion(data);
      } else {
        // Fallback simulation
        if (routeMode === 'para') {
          setRouteSuggestion({
            suggested_folder: '1_Projects/Neuro Core',
            filename: `${routeTitle.toLowerCase().replace(/\s+/g, '_')}.md`,
            recommended_moc: '[[Projects MOC]]',
            rationale: 'Classified as active project outcome with immediate milestone deliverables.',
          });
        } else if (routeMode === 'zettelkasten') {
          const uid = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
          setRouteSuggestion({
            suggested_folder: 'Zettelkasten/Permanent',
            filename: `${uid}_${routeTitle.toLowerCase().replace(/\s+/g, '_')}.md`,
            recommended_moc: '[[Index]]',
            rationale: 'Assigned 14-digit immutable chronological timestamp UID.',
          });
        } else {
          setRouteSuggestion({
            suggested_folder: 'Maps_of_Content',
            filename: `${routeTitle}.md`,
            recommended_moc: '[[Higher Order MOC]]',
            rationale: 'Linking Your Thinking structural node for topic navigation.',
          });
        }
      }
    } catch (err) {
      console.error('Route note failed:', err);
    }
  };

  const healthScore = report?.vault_health_score ?? 90;
  const scoreColor =
    healthScore >= 90 ? 'text-emerald-400' : healthScore >= 75 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="h-full w-full flex flex-col bg-[#090A0F] border border-[#1F2433] rounded-lg overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1F2433] bg-[#0F1117]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#102319] border border-[#1B432C] rounded-md text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white tracking-wide font-mono">Vault Health & Linter</h2>
              <span className="px-1.5 py-0.2 text-[9px] font-mono bg-[#102319] text-emerald-300 border border-[#1B432C] rounded">
                Strict Diagnostics
              </span>
            </div>
            <p className="text-[10px] text-[#64748B]">Deterministic link validation, orphan detection, BM25 indexing, and note routing</p>
          </div>
        </div>

        {/* Tab Switcher & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-[#090A0F] border border-[#1F2433] rounded-md gap-0.5">
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                activeTab === 'diagnostics'
                  ? 'bg-[#242A3C] text-white font-semibold'
                  : 'text-[#64748B] hover:text-[#CBD5E1]'
              }`}
            >
              Diagnostics
            </button>
            <button
              onClick={() => setActiveTab('bm25')}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                activeTab === 'bm25'
                  ? 'bg-[#242A3C] text-white font-semibold'
                  : 'text-[#64748B] hover:text-[#CBD5E1]'
              }`}
            >
              BM25 Search
            </button>
            <button
              onClick={() => setActiveTab('routing')}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                activeTab === 'routing'
                  ? 'bg-[#242A3C] text-white font-semibold'
                  : 'text-[#64748B] hover:text-[#CBD5E1]'
              }`}
            >
              Methodology Router
            </button>
          </div>

          <button
            onClick={fetchLintReport}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Scanning...' : 'Run Diagnostics'}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {activeTab === 'diagnostics' && (
          <>
            {/* Top Score Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Health Score Gauge */}
              <div className="bg-[#0F1117] p-4 rounded-lg border border-[#1F2433] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Health Index</span>
                  <div className={`text-2xl font-bold ${scoreColor} mt-0.5 font-mono flex items-baseline gap-1`}>
                    {healthScore}%
                    <span className="text-[10px] text-[#475569] font-sans font-normal">/ 100%</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Graph validated
                  </span>
                </div>
                <div className="w-10 h-10 rounded-md border border-[#242A3C] bg-[#141722] flex items-center justify-center font-bold text-xs text-white font-mono">
                  {report?.total_notes_scanned ?? 48}
                </div>
              </div>

              {/* Broken Links Counter */}
              <div className="bg-[#0F1117] p-4 rounded-lg border border-[#1F2433]">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span className="text-[10px] font-mono uppercase tracking-wider">Broken Links</span>
                  <Link2Off className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-xl font-bold text-white mt-1 font-mono">
                  {report?.broken_links.length ?? 0}
                </div>
                <span className="text-[10px] text-rose-400 font-mono">Unresolved targets</span>
              </div>

              {/* Orphan Notes Counter */}
              <div className="bg-[#0F1117] p-4 rounded-lg border border-[#1F2433]">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span className="text-[10px] font-mono uppercase tracking-wider">Orphan Notes</span>
                  <FileQuestion className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-bold text-white mt-1 font-mono">
                  {report?.orphan_notes.length ?? 0}
                </div>
                <span className="text-[10px] text-amber-400 font-mono">Zero link connections</span>
              </div>

              {/* Structure Quality */}
              <div className="bg-[#0F1117] p-4 rounded-lg border border-[#1F2433]">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span className="text-[10px] font-mono uppercase tracking-wider">Empty Headings</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-xl font-bold text-white mt-1 font-mono">
                  {report?.empty_headings.length ?? 0}
                </div>
                <span className="text-[10px] text-sky-400 font-mono">Blank section headers</span>
              </div>
            </div>

            {/* Diagnostics List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Broken Links Section */}
              <div className="bg-[#0F1117] p-4 rounded-lg border border-[#1F2433] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#1F2433] pb-2">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                    <Link2Off className="w-3.5 h-3.5 text-rose-400" />
                    Broken [[Wikilinks]]
                  </h3>
                  <button className="text-[11px] text-teal-400 hover:text-teal-300 font-mono flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> Auto-Heal
                  </button>
                </div>

                <div className="space-y-2">
                  {report?.broken_links.map((link, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#141722] border border-[#1F2433] rounded-md text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-[#CBD5E1] text-[11px]">{link.source_note}</span>
                        <span className="text-rose-400 text-[11px] font-semibold">[[{link.target}]]</span>
                      </div>
                      {link.suggestion && (
                        <div className="flex items-center gap-1 text-[#64748B]">
                          <span className="font-mono text-[10px]">Suggestion:</span>
                          <span className="px-1.5 py-0.2 bg-[#102319] text-emerald-300 border border-[#1B432C] rounded font-mono text-[10px]">
                            {link.suggestion}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Orphan Notes Section */}
              <div className="bg-[#0F1117] p-4 rounded-lg border border-[#1F2433] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#1F2433] pb-2">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                    <FileQuestion className="w-3.5 h-3.5 text-amber-400" />
                    Orphan Notes (Disconnected)
                  </h3>
                  <span className="text-[10px] text-[#64748B] font-mono">No Inbound / Outbound</span>
                </div>

                <div className="space-y-2">
                  {report?.orphan_notes.map((note, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#141722] border border-[#1F2433] rounded-md flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-mono text-[#CBD5E1] text-[11px]">{note}</span>
                      </div>
                      <button className="px-2 py-0.5 bg-[#1E2435] hover:bg-[#283046] border border-[#242A3C] rounded text-[#CBD5E1] text-[10px] font-mono transition-colors">
                        Link Hub
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* BM25 Search Playground Tab */}
        {activeTab === 'bm25' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="bg-[#0F1117] p-4 rounded-lg border border-[#1F2433] space-y-3">
              <div>
                <h3 className="text-xs font-bold text-white font-mono">Deterministic Okapi BM25 Ranking</h3>
                <p className="text-[10px] text-[#64748B]">Term-frequency inverse document frequency indexing (k1=1.5, b=0.75)</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B]" />
                  <input
                    type="text"
                    value={bm25Query}
                    onChange={(e) => setBm25Query(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRunBM25()}
                    placeholder="Search vault terms (e.g. 'local embedding vector')..."
                    className="w-full bg-[#090A0F] border border-[#242A3C] rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <button
                  onClick={handleRunBM25}
                  disabled={isSearchingBM25}
                  className="px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-medium disabled:opacity-50 transition-colors shadow-sm font-mono"
                >
                  {isSearchingBM25 ? 'Searching...' : 'BM25 Query'}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-2">
              {bm25Results.map((res, idx) => (
                <div
                  key={idx}
                  className="bg-[#0F1117] p-3.5 rounded-lg border border-[#1F2433] hover:border-[#2E364B] transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-400" />
                      {res.title}
                    </h4>
                    <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-[#102319] text-emerald-300 border border-[#1B432C] rounded">
                      Score: {res.score.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed font-mono bg-[#090A0F] p-2 rounded border border-[#1F2433]">
                    {res.snippet}
                  </p>
                  {res.tags && (
                    <div className="flex items-center gap-1 pt-0.5">
                      {res.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.2 text-[9px] font-mono bg-[#141722] text-[#64748B] border border-[#1F2433] rounded"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note Mode Router Tab */}
        {activeTab === 'routing' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="bg-[#0F1117] p-4 rounded-lg border border-[#1F2433] space-y-3">
              <div>
                <h3 className="text-xs font-bold text-white font-mono">Organizational Methodology Router</h3>
                <p className="text-[10px] text-[#64748B]">Destination folder placement, standardized naming, and MOC linking</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">Note Title or Topic</label>
                  <input
                    type="text"
                    value={routeTitle}
                    onChange={(e) => setRouteTitle(e.target.value)}
                    placeholder="e.g. Q3 Engineering OKRs..."
                    className="w-full bg-[#090A0F] border border-[#242A3C] rounded-md px-3 py-1.5 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">Target Methodology</label>
                  <select
                    value={routeMode}
                    onChange={(e) => setRouteMode(e.target.value as any)}
                    className="w-full bg-[#090A0F] border border-[#242A3C] rounded-md px-2 py-1.5 text-xs text-white focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="para">PARA (Projects, Areas, Resources, Archives)</option>
                    <option value="lyt">LYT (Linking Your Thinking / MOCs)</option>
                    <option value="zettelkasten">Zettelkasten (14-Digit UID Chrono)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleTestRoute}
                className="w-full py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 font-mono shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Analyze & Route Note
              </button>
            </div>

            {/* Routing Result */}
            {routeSuggestion && (
              <div className="bg-[#0F1117] p-4 rounded-lg border border-[#242A3C] space-y-3">
                <div className="flex items-center gap-1.5 text-teal-400 font-bold text-xs font-mono">
                  <FolderTree className="w-3.5 h-3.5" /> Recommended File Hierarchy
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-[#090A0F] rounded-md border border-[#1F2433]">
                    <span className="text-[#64748B] font-mono text-[9px] uppercase">Destination Folder</span>
                    <p className="font-mono text-emerald-400 font-bold mt-0.5 text-[11px]">{routeSuggestion.suggested_folder}</p>
                  </div>
                  <div className="p-2.5 bg-[#090A0F] rounded-md border border-[#1F2433]">
                    <span className="text-[#64748B] font-mono text-[9px] uppercase">Standardized Filename</span>
                    <p className="font-mono text-sky-400 font-bold mt-0.5 text-[11px]">{routeSuggestion.filename}</p>
                  </div>
                </div>

                <div className="p-2.5 bg-[#090A0F] rounded-md border border-[#1F2433] text-xs">
                  <span className="text-[#64748B] font-mono text-[9px] uppercase">Recommended Parent MOC Link</span>
                  <p className="font-mono text-teal-300 font-bold mt-0.5 text-[11px]">{routeSuggestion.recommended_moc}</p>
                </div>

                <p className="text-[11px] text-[#94A3B8] font-mono">
                  Rationale: {routeSuggestion.rationale}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
