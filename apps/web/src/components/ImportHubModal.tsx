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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#0F1117] w-full max-w-lg p-5 rounded-lg border border-[#242A3C] shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2433] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#18162B] border border-[#302856] rounded-md text-indigo-400">
              <FolderPlus className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white font-mono">Knowledge Import Hub</h3>
              <p className="text-[10px] text-[#64748B]">Batch ingest markdown archives into your local vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#64748B] hover:text-white hover:bg-[#141722] rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Source Provider Selector */}
        <div>
          <label className="block text-[10px] font-mono text-[#94A3B8] mb-1.5">Select Ingestion Format</label>
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
                  className={`p-2.5 rounded-md border text-xs font-mono flex flex-col items-center gap-1 transition-colors ${
                    importType === item.id
                      ? 'bg-[#18162B] border-[#4F46E5] text-white shadow-sm'
                      : 'bg-[#090A0F] border-[#242A3C] text-[#64748B] hover:text-white hover:bg-[#141722]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px]">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Drop Zone */}
        <div className="border border-dashed border-[#242A3C] hover:border-indigo-500/50 rounded-lg p-5 text-center bg-[#090A0F] transition-colors cursor-pointer relative">
          <input
            type="file"
            multiple
            accept=".md,.txt,.json,.csv"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-1.5 opacity-80" />
          <p className="text-xs font-bold text-white font-mono">Select or drag files to ingest</p>
          <p className="text-[10px] text-[#64748B] font-mono mt-0.5">Supports .md and .txt markdown files</p>
          {files.length > 0 && (
            <div className="mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 bg-[#18162B] text-indigo-300 border border-[#302856] rounded text-[10px] font-mono">
              <FileText className="w-3 h-3" />
              {files.length} {files.length === 1 ? 'file' : 'files'} selected
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-2.5 bg-[#2B1215] border border-[#521C24] rounded-md text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {successCount !== null && (
          <div className="p-2.5 bg-[#102319] border border-[#1B432C] rounded-md text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            Successfully imported {successCount} notes into your vault.
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#1F2433]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs font-mono text-[#94A3B8] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={files.length === 0 || isProcessing}
            className="px-3.5 py-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-mono font-medium disabled:opacity-50 transition-colors shadow-sm"
          >
            {isProcessing ? 'Importing...' : 'Import to Vault'}
          </button>
        </div>
      </div>
    </div>
  );
}
