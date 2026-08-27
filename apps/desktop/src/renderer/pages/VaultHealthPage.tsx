import React, { useState } from 'react';
import {
  Activity,
  Shield,
  FileText,
  Link,
  Unlink,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wrench,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// Mock Data
const MOCK_STATS = {
  healthScore: 82,
  totalNotes: 1245,
  totalLinks: 4832,
  orphanNotes: 14,
  deadLinks: 27,
};

const MOCK_ISSUES = {
  deadLinks: [
    { id: '1', file: 'Projects/Neuro/Backend.md', target: 'FastAPI_Setup' },
    { id: '2', file: 'Daily/2026-08-26.md', target: 'Meeting_Notes_XYZ' },
    { id: '3', file: 'Ideas/AI_Agents.md', target: 'LLM_Architecture' },
  ],
  orphanNotes: [
    { id: '4', file: 'Drafts/Untitled_2.md' },
    { id: '5', file: 'Archive/Old_Project.md' },
  ],
  missingFrontmatter: [
    { id: '6', file: 'Inbox/Quick_Thought.md' },
  ],
  emptySections: [
    { id: '7', file: 'Projects/Neuro/Roadmap.md', header: 'Q4 Goals' },
  ],
};

const MOCK_ACTIVITY = [
  { id: 'a1', time: '10 mins ago', action: 'Fixed 5 dead links automatically', type: 'fix' },
  { id: 'a2', time: '1 hour ago', action: 'Completed full vault lint', type: 'scan' },
  { id: 'a3', time: 'Yesterday', action: 'Generated frontmatter for 12 notes', type: 'fix' },
];

export default function VaultHealthPage() {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 50) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };

  const scoreColor = getScoreColor(MOCK_STATS.healthScore);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (MOCK_STATS.healthScore / 100) * circumference;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex justify-between items-end mb-8">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Activity className="w-8 h-8 text-brand-cyan" />
            Vault Health & Diagnostics
          </h1>
          <p className="page-subtitle mt-1">
            Monitor and maintain vault integrity, broken links, and metadata consistency
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Run Full Lint
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Health Score Ring */}
        <div className="card-surface p-8 flex flex-col items-center justify-center lg:col-span-1">
          <h3 className="section-label mb-6">Overall Vault Health</h3>
          <div className="relative flex items-center justify-center">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-surface-elevated fill-none"
                strokeWidth="12"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                className={`fill-none transition-all duration-1000 ease-out ${scoreColor.split(' ')[1]}`}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={`text-4xl font-bold ${scoreColor.split(' ')[0]}`}>
                {MOCK_STATS.healthScore}
              </span>
              <span className="text-text-muted text-sm mt-1">/ 100</span>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm text-text-secondary">
            <Shield className="w-4 h-4" />
            <span>Vault is generally healthy</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="card-surface-static p-6 flex flex-col">
            <div className="flex items-center gap-2 text-text-muted mb-4">
              <FileText className="w-5 h-5" />
              <span className="font-medium">Total Notes</span>
            </div>
            <span className="text-3xl font-bold text-text-primary">{MOCK_STATS.totalNotes}</span>
          </div>
          <div className="card-surface-static p-6 flex flex-col">
            <div className="flex items-center gap-2 text-text-muted mb-4">
              <Link className="w-5 h-5" />
              <span className="font-medium">Total Links</span>
            </div>
            <span className="text-3xl font-bold text-text-primary">{MOCK_STATS.totalLinks}</span>
          </div>
          <div className="card-surface-static p-6 flex flex-col">
            <div className="flex items-center gap-2 text-amber-500 mb-4">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Orphan Notes</span>
            </div>
            <span className="text-3xl font-bold text-text-primary">{MOCK_STATS.orphanNotes}</span>
          </div>
          <div className="card-surface-static p-6 flex flex-col">
            <div className="flex items-center gap-2 text-rose-500 mb-4">
              <Unlink className="w-5 h-5" />
              <span className="font-medium">Dead Links</span>
            </div>
            <span className="text-3xl font-bold text-text-primary">{MOCK_STATS.deadLinks}</span>
          </div>
        </div>
      </div>

      {/* Auto-Heal Actions Bar */}
      <div className="card-surface p-6 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-brand-primary" />
            Auto-Heal Actions
          </h3>
          <p className="text-sm text-text-secondary">Quickly resolve common structural issues</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">Generate Frontmatter</button>
          <button className="btn-primary">Fix Dead Links</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Issue Categories Section */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="section-label">Detected Issues</h3>

          {/* Dead Links */}
          <div className="card-surface overflow-hidden">
            <button 
              className="w-full p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors"
              onClick={() => toggleCategory('deadLinks')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                  <Unlink className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-text-primary">Dead Links</h4>
                  <p className="text-sm text-text-muted">Links pointing to non-existent files</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="badge-rose">{MOCK_ISSUES.deadLinks.length}</span>
                {expandedCategories['deadLinks'] ? <ChevronDown className="w-5 h-5 text-text-muted" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
              </div>
            </button>
            {expandedCategories['deadLinks'] && (
              <div className="p-4 border-t border-surface-elevated bg-surface/50">
                <ul className="space-y-3">
                  {MOCK_ISSUES.deadLinks.map(issue => (
                    <li key={issue.id} className="text-sm flex flex-col gap-1 p-2 rounded hover:bg-surface transition-colors">
                      <span className="text-text-primary font-medium">{issue.file}</span>
                      <span className="text-text-muted flex items-center gap-1">
                        <Unlink className="w-3 h-3" /> Targets: <span className="text-rose-400">{issue.target}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Orphan Notes */}
          <div className="card-surface overflow-hidden">
            <button 
              className="w-full p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors"
              onClick={() => toggleCategory('orphanNotes')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-text-primary">Orphan Notes</h4>
                  <p className="text-sm text-text-muted">Notes with zero incoming or outgoing links</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="badge-amber">{MOCK_ISSUES.orphanNotes.length}</span>
                {expandedCategories['orphanNotes'] ? <ChevronDown className="w-5 h-5 text-text-muted" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
              </div>
            </button>
            {expandedCategories['orphanNotes'] && (
              <div className="p-4 border-t border-surface-elevated bg-surface/50">
                <ul className="space-y-2">
                  {MOCK_ISSUES.orphanNotes.map(issue => (
                    <li key={issue.id} className="text-sm text-text-secondary p-2 rounded hover:bg-surface transition-colors">
                      {issue.file}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Missing Frontmatter */}
          <div className="card-surface overflow-hidden">
            <button 
              className="w-full p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors"
              onClick={() => toggleCategory('missingFrontmatter')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-text-primary">Missing Frontmatter</h4>
                  <p className="text-sm text-text-muted">Notes without YAML metadata blocks</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">{MOCK_ISSUES.missingFrontmatter.length}</span>
                {expandedCategories['missingFrontmatter'] ? <ChevronDown className="w-5 h-5 text-text-muted" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
              </div>
            </button>
            {expandedCategories['missingFrontmatter'] && (
              <div className="p-4 border-t border-surface-elevated bg-surface/50">
                <ul className="space-y-2">
                  {MOCK_ISSUES.missingFrontmatter.map(issue => (
                    <li key={issue.id} className="text-sm text-text-secondary p-2 rounded hover:bg-surface transition-colors">
                      {issue.file}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Empty Sections */}
          <div className="card-surface overflow-hidden">
            <button 
              className="w-full p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors"
              onClick={() => toggleCategory('emptySections')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-500/10 rounded-lg text-neutral-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-text-primary">Empty Sections</h4>
                  <p className="text-sm text-text-muted">Headers with no content beneath them</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="badge-neutral">{MOCK_ISSUES.emptySections.length}</span>
                {expandedCategories['emptySections'] ? <ChevronDown className="w-5 h-5 text-text-muted" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
              </div>
            </button>
            {expandedCategories['emptySections'] && (
              <div className="p-4 border-t border-surface-elevated bg-surface/50">
                <ul className="space-y-2">
                  {MOCK_ISSUES.emptySections.map(issue => (
                    <li key={issue.id} className="text-sm flex flex-col gap-1 p-2 rounded hover:bg-surface transition-colors">
                      <span className="text-text-primary">{issue.file}</span>
                      <span className="text-text-muted text-xs">Header: {issue.header}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="lg:col-span-1">
          <h3 className="section-label mb-4">Recent Activity</h3>
          <div className="card-surface p-6">
            <div className="relative pl-6 border-l-2 border-surface-elevated space-y-8">
              {MOCK_ACTIVITY.map((activity, idx) => (
                <div key={activity.id} className="relative">
                  <div className={`absolute -left-[35px] bg-panel p-1 rounded-full border-2 border-surface-elevated ${activity.type === 'fix' ? 'text-brand-cyan' : 'text-emerald-500'}`}>
                    {activity.type === 'fix' ? <Wrench className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm text-text-primary">{activity.action}</p>
                    <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
