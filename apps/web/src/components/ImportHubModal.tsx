import { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, FolderPlus, Sparkles } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface ImportHubModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function ImportHubModal({ onClose, onSuccess }: ImportHubModalProps) {
  const token = useAuthStore((state) => state.token);
  const [importType, setImportType] = useState<'obsidian' | 'notion' | 'markdown'>('markdown');
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles(selected);
    }
  };

  const handleImport = async () => {
    if (files.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setError('');

    try {
      let imported = 0;
      for (const file of files) {
        const text = await file.text();
        const title = file.name.replace(/\.[^/.]+$/, "");
        
        // Auto extract tags starting with #
        const tagMatches = text.match(/#([a-zA-Z0-9_-]+)/g) || [];
        const tags = Array.from(new Set(tagMatches.map((t) => t.replace('#', '').toLowerCase())));

        const res = await fetch('/api/v1/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title || 'Imported Note',
            content: text,
            tags: tags,
          }),
        });

        if (res.ok) {
          imported++;
        }
      }

      setSuccessCount(imported);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to complete import');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-white/15 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
              <FolderPlus className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Knowledge Import Hub</h3>
              <p className="text-xs text-slate-400">Import your existing notes and research archives</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source Provider Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Select Format</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'markdown', label: 'Markdown (.md)', icon: FileText },
              { id: 'obsidian', label: 'Obsidian Vault', icon: Sparkles },
              { id: 'notion', label: 'Notion Export', icon: Upload },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setImportType(item.id as any)}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                    importType === item.id
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 text-indigo-400" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drop Zone */}
        <div className="border-2 border-dashed border-white/15 hover:border-indigo-500/50 rounded-2xl p-6 text-center bg-black/30 transition-all cursor-pointer relative">
          <input
            type="file"
            multiple
            accept=".md,.txt,.json,.csv"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-80" />
          <p className="text-xs font-semibold text-white">Click or drag files to upload</p>
          <p className="text-[11px] text-slate-400 mt-1">Supports .md, .txt files</p>
          {files.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-mono">
              <FileText className="w-3.5 h-3.5" />
              {files.length} {files.length === 1 ? 'file' : 'files'} selected
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {successCount !== null && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Successfully imported {successCount} notes into your vault!
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={files.length === 0 || isProcessing}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-xl text-xs font-semibold shadow-lg hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {isProcessing ? 'Importing...' : 'Import to Vault'}
          </button>
        </div>
      </div>
    </div>
  );
}
