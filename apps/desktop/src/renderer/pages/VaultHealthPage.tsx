import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { useNotes } from '../hooks/useNotes';
import {
  Activity,
  FileText,
  Link,
  AlertTriangle,
  Unlink,
  CheckCircle2,
  Clock,
  Wrench,
  RefreshCw,
  Shield,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface VaultActivity {
  id: string;
  time: string;
  action: string;
  type: 'fix' | 'scan';
}

export default function VaultHealthPage() {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [localActivity, setLocalActivity] = useState<VaultActivity[]>([]);

  const { data: notes = [], isLoading: isLoadingNotes } = useNotes();

  // Dynamic real calculation of vault health metrics from user's actual notes
  const calculatedData = useMemo(() => {
    const totalNotes = notes.length;
    if (totalNotes === 0) {
      return {
        stats: {
          healthScore: 100,
          totalNotes: 0,
          totalLinks: 0,
          orphanNotes: 0,
          deadLinks: 0,
        },
        issues: {
          deadLinks: [],
          orphanNotes: [],
          missingFrontmatter: [],
          emptySections: [],
        },
      };
    }

    const noteTitleMap = new Set(notes.map((n) => n.title.toLowerCase().trim()));
    const outgoingLinkMap: Record<string, string[]> = {};
    const incomingLinkCount: Record<string, number> = {};

    notes.forEach((n) => {
      incomingLinkCount[n.title.toLowerCase().trim()] = 0;
      outgoingLinkMap[n.id] = [];
    });

    const deadLinks: { id: string; file: string; target: string }[] = [];
    let totalLinks = 0;

    notes.forEach((note) => {
      const matches = note.content.match(/\[\[(.*?)\]\]/g) || [];
      matches.forEach((m, idx) => {
        totalLinks++;
        const target = m.slice(2, -2).trim();
        outgoingLinkMap[note.id]?.push(target);

        const targetLower = target.toLowerCase();
        if (noteTitleMap.has(targetLower)) {
          incomingLinkCount[targetLower] = (incomingLinkCount[targetLower] || 0) + 1;
        } else {
          deadLinks.push({
            id: `${note.id}-dead-${idx}`,
            file: note.title,
            target,
          });
        }
      });
    });

    const orphanNotes: { id: string; file: string }[] = [];
    const missingFrontmatter: { id: string; file: string }[] = [];
    const emptySections: { id: string; file: string; header: string }[] = [];

    notes.forEach((note) => {
      const outgoing = outgoingLinkMap[note.id] || [];
      const incoming = incomingLinkCount[note.title.toLowerCase().trim()] || 0;

      if (outgoing.length === 0 && incoming === 0) {
        orphanNotes.push({
          id: `${note.id}-orphan`,
          file: note.title,
        });
      }

      if (!note.tags || note.tags.length === 0) {
        missingFrontmatter.push({
          id: `${note.id}-frontmatter`,
          file: note.title,
        });
      }

      const lines = note.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]?.trim() || '';
        if (line.startsWith('#')) {
          const nextLine = lines[i + 1]?.trim() || '';
          if (!nextLine || nextLine.startsWith('#')) {
            emptySections.push({
              id: `${note.id}-empty-${i}`,
              file: note.title,
              header: line.replace(/^#+\s*/, ''),
            });
          }
        }
      }
    });

    const deductions =
      deadLinks.length * 4 + orphanNotes.length * 2 + missingFrontmatter.length * 1;
    const healthScore = Math.max(0, Math.min(100, 100 - deductions));

    return {
      stats: {
        healthScore,
        totalNotes,
        totalLinks,
        orphanNotes: orphanNotes.length,
        deadLinks: deadLinks.length,
      },
      issues: {
        deadLinks,
        orphanNotes,
        missingFrontmatter,
        emptySections,
      },
    };
  }, [notes]);

  const { data: remoteStats, refetch: refetchStats } = useQuery({
    queryKey: ['vault-health'],
    queryFn: () => apiClient.get('/obsidian/health-summary').then((res) => res.data),
    retry: false,
  });

  const {
    data: remoteIssues,
    refetch: refetchIssues,
    isFetching: isLinting,
  } = useQuery({
    queryKey: ['vault-lint'],
    queryFn: () => apiClient.get('/obsidian/lint?path=.').then((res) => res.data),
    retry: false,
  });

  const stats = remoteStats || calculatedData.stats;
  const issues = remoteIssues || calculatedData.issues;

  const fixDeadLinksMutation = useMutation({
    mutationFn: () => apiClient.post('/obsidian/auto-heal'),
    onSuccess: () => {
      refetchStats();
      refetchIssues();
      setLocalActivity((prev) => [
        {
          id: `act-${Date.now()}`,
          time: 'Just now',
          action: 'Executed automated vault repair pass',
          type: 'fix',
        },
        ...prev,
      ]);
    },
  });

  const handleRunLint = () => {
    refetchIssues();
    setLocalActivity((prev) => [
      {
        id: `act-${Date.now()}`,
        time: 'Just now',
        action: 'Completed full knowledge vault verification scan',
        type: 'scan',
      },
      ...prev,
    ]);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#30D158] stroke-[#30D158]';
    if (score >= 50) return 'text-[#FF9F0A] stroke-[#FF9F0A]';
    return 'text-[#FF453A] stroke-[#FF453A]';
  };

  const scoreColor = getScoreColor(stats.healthScore || 0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((stats.healthScore || 0) / 100) * circumference;

  return (
    <div className="page-container animate-in fade-in duration-200">
      <div className="page-header flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-[#0A84FF]" />
            Vault Health & Diagnostics
          </h1>
          <p className="page-subtitle mt-1">
            Real-time integrity analysis across wikilinks, orphan nodes, and metadata consistency
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={handleRunLint}
            disabled={isLinting}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLinting ? 'animate-spin' : ''}`} />
            <span>{isLinting ? 'Scanning...' : 'Run Diagnostics'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Health Score Ring */}
        <div className="card-surface p-7 flex flex-col items-center justify-center lg:col-span-1">
          <h3 className="section-label mb-5 text-[#86868B]">Vault Health Score</h3>
          <div className="relative flex items-center justify-center">
            <svg className="w-36 h-36 transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-white/[0.08] fill-none"
                strokeWidth="10"
              />
              <circle
                cx="72"
                cy="72"
                r={radius}
                className={`fill-none transition-all duration-1000 ease-out ${scoreColor.split(' ')[1]}`}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={`text-3xl font-bold tracking-tight ${scoreColor.split(' ')[0]}`}>
                {stats.healthScore}
              </span>
              <span className="text-[#86868B] text-xs font-mono mt-0.5">/ 100</span>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs font-medium text-[#A1A1A6]">
            <Shield className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span>
              {stats.healthScore >= 90
                ? 'Vault structure in excellent health'
                : stats.healthScore >= 70
                  ? 'Minor reference gaps identified'
                  : 'Action needed on broken links'}
            </span>
          </div>
        </div>

        {/* Real Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="card-surface-static p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-[#86868B] mb-2">
              <FileText className="w-4 h-4 text-[#0A84FF]" />
              <span className="text-xs font-medium">Total Notes</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#F5F5F7] font-mono">
              {stats.totalNotes}
            </span>
          </div>
          <div className="card-surface-static p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-[#86868B] mb-2">
              <Link className="w-4 h-4 text-[#5E5CE6]" />
              <span className="text-xs font-medium">Wikilinks</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#F5F5F7] font-mono">
              {stats.totalLinks}
            </span>
          </div>
          <div className="card-surface-static p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-[#FF9F0A] mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">Orphan Notes</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#F5F5F7] font-mono">
              {stats.orphanNotes}
            </span>
          </div>
          <div className="card-surface-static p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-[#FF453A] mb-2">
              <Unlink className="w-4 h-4" />
              <span className="text-xs font-medium">Dead Links</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#F5F5F7] font-mono">
              {stats.deadLinks}
            </span>
          </div>
        </div>
      </div>

      {/* Auto-Heal Actions Bar */}
      <div className="card-surface p-5 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#F5F5F7] mb-1 flex items-center gap-2 tracking-tight">
            <Wrench className="w-4 h-4 text-[#0A84FF]" />
            Automated Healing & Reference Resolvers
          </h3>
          <p className="text-xs text-[#86868B]">
            Detect, repair, or normalize broken cross-links in place
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            className="btn-primary"
            onClick={() => fixDeadLinksMutation.mutate()}
            disabled={fixDeadLinksMutation.isPending || stats.deadLinks === 0}
          >
            <Sparkles size={13} />
            <span>{fixDeadLinksMutation.isPending ? 'Repairing...' : 'Repair Dead Links'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issue Categories Section */}
        <div className="lg:col-span-2 space-y-3.5">
          <h3 className="section-label">Identified Integrity Issues</h3>

          {/* Dead Links */}
          <div className="card-surface overflow-hidden">
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-white/[0.04] transition-colors"
              onClick={() => toggleCategory('deadLinks')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FF453A]/15 rounded-xl text-[#FF453A]">
                  <Unlink className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-xs text-[#F5F5F7] tracking-tight">
                    Dead Links
                  </h4>
                  <p className="text-xs text-[#86868B]">Wikilinks pointing to non-existent notes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge-rose">{issues.deadLinks.length}</span>
                {expandedCategories['deadLinks'] ? (
                  <ChevronDown className="w-4 h-4 text-[#86868B]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#86868B]" />
                )}
              </div>
            </button>
            {expandedCategories['deadLinks'] && (
              <div className="p-4 border-t border-white/[0.06] bg-black/20">
                {issues.deadLinks.length === 0 ? (
                  <p className="text-xs text-[#86868B] italic">
                    No dead links found in your vault.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {issues.deadLinks.map((issue: any) => (
                      <li
                        key={issue.id}
                        className="text-xs flex flex-col gap-1 p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                      >
                        <span className="text-[#F5F5F7] font-medium">{issue.file}</span>
                        <span className="text-[#86868B] flex items-center gap-1.5 font-mono text-[11px]">
                          <Unlink className="w-3 h-3 text-[#FF453A]" /> Target: [[{issue.target}]]
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Orphan Notes */}
          <div className="card-surface overflow-hidden">
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-white/[0.04] transition-colors"
              onClick={() => toggleCategory('orphanNotes')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FF9F0A]/15 rounded-xl text-[#FF9F0A]">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-xs text-[#F5F5F7] tracking-tight">
                    Orphan Notes
                  </h4>
                  <p className="text-xs text-[#86868B]">
                    Notes with no incoming or outgoing connections
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge-amber">{issues.orphanNotes.length}</span>
                {expandedCategories['orphanNotes'] ? (
                  <ChevronDown className="w-4 h-4 text-[#86868B]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#86868B]" />
                )}
              </div>
            </button>
            {expandedCategories['orphanNotes'] && (
              <div className="p-4 border-t border-white/[0.06] bg-black/20">
                {issues.orphanNotes.length === 0 ? (
                  <p className="text-xs text-[#86868B] italic">No orphan notes found.</p>
                ) : (
                  <ul className="space-y-2">
                    {issues.orphanNotes.map((issue: any) => (
                      <li
                        key={issue.id}
                        className="text-xs p-2 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[#F5F5F7]"
                      >
                        {issue.file}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Missing Tags */}
          <div className="card-surface overflow-hidden">
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-white/[0.04] transition-colors"
              onClick={() => toggleCategory('missingFrontmatter')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0A84FF]/15 rounded-xl text-[#0A84FF]">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-xs text-[#F5F5F7] tracking-tight">
                    Untagged Notes
                  </h4>
                  <p className="text-xs text-[#86868B]">
                    Notes without #tags or metadata classification
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge-blue">{issues.missingFrontmatter.length}</span>
                {expandedCategories['missingFrontmatter'] ? (
                  <ChevronDown className="w-4 h-4 text-[#86868B]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#86868B]" />
                )}
              </div>
            </button>
            {expandedCategories['missingFrontmatter'] && (
              <div className="p-4 border-t border-white/[0.06] bg-black/20">
                {issues.missingFrontmatter.length === 0 ? (
                  <p className="text-xs text-[#86868B] italic">
                    All notes possess tags or categorization.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {issues.missingFrontmatter.map((issue: any) => (
                      <li
                        key={issue.id}
                        className="text-xs p-2 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[#F5F5F7]"
                      >
                        {issue.file}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Empty Sections */}
          <div className="card-surface overflow-hidden">
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-white/[0.04] transition-colors"
              onClick={() => toggleCategory('emptySections')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/[0.08] rounded-xl text-[#A1A1A6]">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-xs text-[#F5F5F7] tracking-tight">
                    Empty Sections
                  </h4>
                  <p className="text-xs text-[#86868B]">
                    Markdown headings without content underneath
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge-neutral">{issues.emptySections.length}</span>
                {expandedCategories['emptySections'] ? (
                  <ChevronDown className="w-4 h-4 text-[#86868B]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#86868B]" />
                )}
              </div>
            </button>
            {expandedCategories['emptySections'] && (
              <div className="p-4 border-t border-white/[0.06] bg-black/20">
                {issues.emptySections.length === 0 ? (
                  <p className="text-xs text-[#86868B] italic">No empty sections detected.</p>
                ) : (
                  <ul className="space-y-2">
                    {issues.emptySections.map((issue: any) => (
                      <li
                        key={issue.id}
                        className="text-xs flex flex-col gap-1 p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                      >
                        <span className="text-[#F5F5F7] font-medium">{issue.file}</span>
                        <span className="text-[#86868B] text-[11px] font-mono">
                          Heading: #{issue.header}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Real Activity Timeline */}
        <div className="lg:col-span-1">
          <h3 className="section-label">Maintenance Log</h3>
          <div className="card-surface p-5">
            {localActivity.length === 0 ? (
              <div className="text-center py-6 text-[#86868B]">
                <Clock className="w-5 h-5 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No maintenance passes run this session.</p>
                <p className="text-[11px] text-[#6E6E73] mt-1">
                  Run diagnostics to log vault verification events.
                </p>
              </div>
            ) : (
              <div className="relative pl-5 border-l border-white/[0.08] space-y-6">
                {localActivity.map((activity) => (
                  <div key={activity.id} className="relative">
                    <div
                      className={`absolute -left-[27px] bg-[#141418] p-1 rounded-full border border-white/[0.1] ${
                        activity.type === 'fix' ? 'text-[#0A84FF]' : 'text-[#30D158]'
                      }`}
                    >
                      {activity.type === 'fix' ? (
                        <Wrench className="w-3 h-3" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#F5F5F7]">{activity.action}</p>
                      <p className="text-[10px] text-[#86868B] mt-0.5 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
