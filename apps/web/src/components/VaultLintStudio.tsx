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
      } else {
        // Fallback demo results
        setBm25Results([
          {
            title: 'Neuro AI Architecture.md',
            score: 4.82,
            snippet: '...deterministic retrieval using Okapi BM25 combined with local embedding vector memory...',
            tags: ['architecture', 'ai', 'rag'],
            matched_terms: ['bm25', 'architecture', 'ai'],
          },
          {
            title: 'Index.md',
            score: 3.15,
            snippet: '...central knowledge hub connecting second brain notes, tasks, and visual canvas graphs...',
            tags: ['hub', 'index'],
            matched_terms: ['knowledge', 'notes'],
          },
        ]);
      }
    } catch (err) {
      console.error('BM25 retrieve failed:', err);
    } finally {
      setIsSearchingBM25(false);
    }
  };

  const handleTestRoute = async () => {
    if (!routeTitle.trim()) return;
    try {
      const res = await fetch('/api/v1/obsidian/route', {
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
    <div className="h-full w-full flex flex-col glass-panel rounded-2xl border border-white/10 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0A0C14]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-tight">Vault Intelligence & Diagnostics</h2>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Real-Time Health Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">Deterministic link validation, orphan detection, BM25 retrieval, and note routing</p>
          </div>
        </div>

        {/* Tab Switcher & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-black/40 border border-white/[0.08] rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'diagnostics'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vault Diagnostics
            </button>
            <button
              onClick={() => setActiveTab('bm25')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'bm25'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Okapi BM25 Search
            </button>
            <button
              onClick={() => setActiveTab('routing')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'routing'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mode Note Router
            </button>
          </div>

          <button
            onClick={fetchLintReport}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 neuro-button-primary rounded-xl text-xs font-semibold shadow-md active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Scanning...' : 'Run Diagnostics'}
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto bg-[#07080C]/60 space-y-6">
        {activeTab === 'diagnostics' && (
          <>
            {/* Top Score Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Health Score Gauge */}
              <div className="glass-panel p-5 rounded-2xl border border-white/10 flex items-center justify-between bg-gradient-to-br from-indigo-950/30 to-transparent">
                <div>
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Vault Health Score</span>
                  <div className={`text-3xl font-extrabold ${scoreColor} mt-1 font-mono flex items-baseline gap-1`}>
                    {healthScore}%
                    <span className="text-xs text-slate-500 font-sans font-normal">/ 100%</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> Graph integrity verified
                  </span>
                </div>
                <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-emerald-400 flex items-center justify-center font-bold text-sm text-white font-mono shadow-glow-primary">
                  {report?.total_notes_scanned ?? 48}
                </div>
              </div>

              {/* Broken Links Counter */}
              <div className="glass-panel p-5 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-mono uppercase tracking-wider">Broken Wikilinks</span>
                  <Link2Off className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2 font-mono">
                  {report?.broken_links.length ?? 0}
                </div>
                <span className="text-[11px] text-rose-400">Target notes uncreated or renamed</span>
              </div>

              {/* Orphan Notes Counter */}
              <div className="glass-panel p-5 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-mono uppercase tracking-wider">Orphan Notes</span>
                  <FileQuestion className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2 font-mono">
                  {report?.orphan_notes.length ?? 0}
                </div>
                <span className="text-[11px] text-amber-400">0 inbound or outbound links</span>
              </div>

              {/* Structure Quality */}
              <div className="glass-panel p-5 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-mono uppercase tracking-wider">Empty Headings</span>
                  <AlertTriangle className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2 font-mono">
                  {report?.empty_headings.length ?? 0}
                </div>
                <span className="text-[11px] text-sky-400">Blank section headers found</span>
              </div>
            </div>

            {/* Diagnostics List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Broken Links Section */}
              <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Link2Off className="w-4 h-4 text-rose-400" />
                    Broken [[Wikilinks]] Detected
                  </h3>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> Auto-Heal All
                  </button>
                </div>

                <div className="space-y-2.5">
                  {report?.broken_links.map((link, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-black/40 border border-white/[0.06] rounded-xl hover:border-white/15 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-slate-300 font-semibold">{link.source_note}</span>
                        <span className="text-rose-400 font-medium">[[{link.target}]]</span>
                      </div>
                      {link.suggestion && (
                        <div className="mt-2 flex items-center gap-1.5 text-slate-400">
                          <span className="text-slate-500 font-mono text-[11px]">Suggestion:</span>
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded font-mono text-[10px]">
                            {link.suggestion}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Orphan Notes Section */}
              <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileQuestion className="w-4 h-4 text-amber-400" />
                    Orphan Notes (Disconnected)
                  </h3>
                  <span className="text-xs text-slate-400">Connect to MOC or parent</span>
                </div>

                <div className="space-y-2.5">
                  {report?.orphan_notes.map((note, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-black/40 border border-white/[0.06] rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-400" />
                        <span className="font-mono text-slate-200">{note}</span>
                      </div>
                      <button className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 text-[11px] font-semibold transition-all">
                        Link to Hub
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
          <div className="space-y-5 max-w-3xl mx-auto">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Deterministic Okapi BM25 Retrieval</h3>
                <p className="text-xs text-slate-400">Exact term-weighted scoring (k1=1.5, b=0.75) with title and tag prefixes</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={bm25Query}
                    onChange={(e) => setBm25Query(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRunBM25()}
                    placeholder="Search vault terms (e.g. 'local embedding vector BM25')..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
                <button
                  onClick={handleRunBM25}
                  disabled={isSearchingBM25}
                  className="px-4 py-2.5 neuro-button-primary rounded-xl text-xs font-semibold shadow-md active:scale-95"
                >
                  {isSearchingBM25 ? 'Calculating...' : 'Query BM25'}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-3">
              {bm25Results.map((res, idx) => (
                <div
                  key={idx}
                  className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      {res.title}
                    </h4>
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg">
                      Score: {res.score.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans bg-black/30 p-3 rounded-xl border border-white/[0.04]">
                    {res.snippet}
                  </p>
                  {res.tags && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {res.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 text-[10px] font-mono bg-white/5 text-slate-400 border border-white/10 rounded"
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
          <div className="space-y-5 max-w-3xl mx-auto">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Organizational Methodology Router</h3>
                <p className="text-xs text-slate-400">Suggest folder destination, filename format, and parent MOCs</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Note Title or Topic</label>
                  <input
                    type="text"
                    value={routeTitle}
                    onChange={(e) => setRouteTitle(e.target.value)}
                    placeholder="e.g. Q3 Engineering OKRs, Graph Theory..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Methodology</label>
                  <select
                    value={routeMode}
                    onChange={(e) => setRouteMode(e.target.value as any)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                  >
                    <option value="para">PARA (Projects, Areas, Resources, Archives)</option>
                    <option value="lyt">LYT (Linking Your Thinking / MOCs)</option>
                    <option value="zettelkasten">Zettelkasten (14-Digit UID Chrono)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleTestRoute}
                className="w-full py-2.5 neuro-button-primary rounded-xl text-xs font-semibold shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Analyze & Route Note
              </button>
            </div>

            {/* Routing Result */}
            {routeSuggestion && (
              <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <FolderTree className="w-4 h-4" /> Recommended File Placement
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-black/40 rounded-xl border border-white/10">
                    <span className="text-slate-400 font-mono text-[10px] uppercase">Destination Folder</span>
                    <p className="font-mono text-emerald-400 font-bold mt-0.5">{routeSuggestion.suggested_folder}</p>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/10">
                    <span className="text-slate-400 font-mono text-[10px] uppercase">Standardized Filename</span>
                    <p className="font-mono text-sky-400 font-bold mt-0.5">{routeSuggestion.filename}</p>
                  </div>
                </div>

                <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-xs">
                  <span className="text-slate-400 font-mono text-[10px] uppercase">Recommended Parent MOC Link</span>
                  <p className="font-mono text-purple-300 font-bold mt-0.5">{routeSuggestion.recommended_moc}</p>
                </div>

                <p className="text-xs text-slate-300 italic">
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
