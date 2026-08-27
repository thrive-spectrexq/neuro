import React, { useState } from 'react';
import {
  Upload,
  Globe,
  FileText,
  Hash,
  Check,
  Clock,
  AlertCircle,
  FileSearch,
  GitBranch,
  FolderOpen,
  Shield,
  Code
} from 'lucide-react';

const mockRecentSources = [
  { id: '1', name: 'attention-is-all-you-need.pdf', type: 'PDF', sha: 'a3f9e2b1c4', timestamp: '10 mins ago', status: 'complete' },
  { id: '2', name: 'https://arxiv.org/abs/1706.03762', type: 'URL', sha: 'b7c8d9e0f1', timestamp: '1 hour ago', status: 'complete' },
  { id: '3', name: 'project-notes.md', type: 'Markdown', sha: 'c4d5e6f7a8', timestamp: '2 hours ago', status: 'complete' },
  { id: '4', name: 'data-pipeline-architecture.html', type: 'HTML', sha: 'd1e2f3a4b5', timestamp: '5 hours ago', status: 'error' },
];

export default function IngestPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle drop mock
  };

  return (
    <div className="page-container flex flex-col gap-8 h-full overflow-y-auto">
      <div className="page-header">
        <h1 className="page-title">Source Ingestion</h1>
        <p className="page-subtitle">
          Capture sources with provenance tracking. Every import is content-addressed and linked to your knowledge vault.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input Zone */}
        <div className="flex flex-col gap-6">
          <div 
            className={`card-surface-static flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 min-h-[300px] transition-colors duration-200 ${
              isDragging ? 'border-brand-cyan bg-brand-cyan/5' : 'border-[var(--surface-elevated)]'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="bg-[var(--surface-elevated)] p-4 rounded-full mb-4">
              <Upload className="w-8 h-8 text-[var(--text-secondary)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Drop files here</h3>
            <p className="text-[var(--text-secondary)] text-sm mb-6 text-center">
              Drag and drop your documents to begin ingestion.
            </p>
            <button className="btn-primary">
              Browse Files
            </button>
          </div>

          <div className="card-surface-static p-4 flex flex-col gap-3">
            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--text-secondary)]" />
              Capture from URL
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="input-base flex-1" 
                placeholder="Paste URL to capture..." 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <button className="btn-secondary whitespace-nowrap">
                Capture
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="badge-neutral text-xs">Markdown</span>
            <span className="badge-neutral text-xs">Text</span>
            <span className="badge-neutral text-xs">PDF</span>
            <span className="badge-neutral text-xs">HTML</span>
            <span className="badge-neutral text-xs">URL</span>
          </div>
        </div>

        {/* Right Column - Processing Pipeline */}
        <div className="card-surface-static p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-brand-cyan" />
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Active Pipeline</h2>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-6">
            {/* Step 1: Complete */}
            <div className="flex gap-4 items-start">
              <div className="relative flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 z-10">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="absolute top-10 bottom-[-24px] w-[2px] bg-emerald-500/20"></div>
              </div>
              <div className="flex-1 pt-2">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-medium text-[var(--text-primary)]">Capture</h3>
                  <span className="text-xs text-emerald-500 font-medium">Complete</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">Source received</p>
              </div>
            </div>

            {/* Step 2: Active */}
            <div className="flex gap-4 items-start">
              <div className="relative flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center shrink-0 z-10 relative">
                  <div className="absolute inset-0 rounded-full animate-ping bg-brand-cyan/20"></div>
                  <FileSearch className="w-5 h-5 text-brand-cyan relative z-10" />
                </div>
                <div className="absolute top-10 bottom-[-24px] w-[2px] bg-[var(--surface-elevated)]"></div>
              </div>
              <div className="flex-1 pt-2">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-medium text-[var(--text-primary)]">Extract</h3>
                  <span className="text-xs text-brand-cyan font-medium animate-pulse">Processing...</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">Content extracted & parsed</p>
                <div className="mt-3 w-full bg-[var(--surface-elevated)] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand-cyan h-full w-[65%] rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Step 3: Pending */}
            <div className="flex gap-4 items-start">
              <div className="relative flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-elevated)] border border-[var(--surface-elevated)] flex items-center justify-center shrink-0 z-10">
                  <GitBranch className="w-5 h-5 text-[var(--text-tertiary)]" />
                </div>
                <div className="absolute top-10 bottom-[-24px] w-[2px] bg-[var(--surface-elevated)]"></div>
              </div>
              <div className="flex-1 pt-2">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-medium text-[var(--text-tertiary)]">Link</h3>
                  <span className="text-xs text-[var(--text-tertiary)] font-medium">Pending</span>
                </div>
                <p className="text-sm text-[var(--text-tertiary)]">Wikilinks generated</p>
              </div>
            </div>

            {/* Step 4: Pending */}
            <div className="flex gap-4 items-start">
              <div className="relative flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-elevated)] border border-[var(--surface-elevated)] flex items-center justify-center shrink-0 z-10">
                  <FolderOpen className="w-5 h-5 text-[var(--text-tertiary)]" />
                </div>
              </div>
              <div className="flex-1 pt-2">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-medium text-[var(--text-tertiary)]">File</h3>
                  <span className="text-xs text-[var(--text-tertiary)] font-medium">Pending</span>
                </div>
                <p className="text-sm text-[var(--text-tertiary)]">Filed into vault</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recently Ingested Sources */}
      <div className="flex flex-col gap-4 mt-4">
        <h2 className="section-label">Recent Sources</h2>
        <div className="flex flex-col gap-2">
          {mockRecentSources.map(source => (
            <div key={source.id} className="card-surface p-4 flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--surface-elevated)] flex items-center justify-center">
                  {source.type === 'PDF' && <FileText className="w-5 h-5 text-rose-400" />}
                  {source.type === 'URL' && <Globe className="w-5 h-5 text-blue-400" />}
                  {source.type === 'Markdown' && <Hash className="w-5 h-5 text-emerald-400" />}
                  {source.type === 'HTML' && <Code className="w-5 h-5 text-amber-400" />}
                </div>
                <div>
                  <h4 className="font-medium text-[var(--text-primary)] text-sm mb-1 group-hover:text-brand-cyan transition-colors">
                    {source.name}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                    <span className={
                      source.type === 'PDF' ? 'badge-rose' :
                      source.type === 'URL' ? 'badge-cyan' :
                      source.type === 'Markdown' ? 'badge-emerald' : 'badge-amber'
                    }>
                      {source.type}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Hash className="w-3 h-3" />
                      {source.sha}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {source.timestamp}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                {source.status === 'complete' ? (
                  <span className="badge-emerald flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Complete
                  </span>
                ) : (
                  <span className="badge-rose flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Error
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Provenance info callout */}
      <div className="mt-4 p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--panel)] flex gap-4 items-start">
        <Shield className="w-5 h-5 text-brand-cyan shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          <strong className="text-[var(--text-primary)] font-medium">Provenance Tracking:</strong> Every source is content-addressed with SHA-256, timestamped, and linked back to generated notes for full provenance tracking.
        </p>
      </div>
    </div>
  );
}
