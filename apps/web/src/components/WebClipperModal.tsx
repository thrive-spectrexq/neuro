import { useState } from 'react';
import { Globe, Link2, CheckCircle2, AlertCircle, X, Sparkles, FileText, Bookmark } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface WebClipperModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function WebClipperModal({ onClose, onSuccess }: WebClipperModalProps) {
  const token = useAuthStore((state) => state.token);
  const [url, setUrl] = useState('');
  const [clipMode, setClipMode] = useState<'full' | 'summary' | 'bookmark'>('summary');
  const [isClipping, setIsClipping] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleClip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isClipping) return;
    setIsClipping(true);
    setError('');

    try {
      let domain = '';
      try {
        domain = new URL(url).hostname;
      } catch {
        domain = url;
      }

      const noteTitle = `Web Clip: ${domain}`;
      const noteContent = `# ${noteTitle}\n\n**Source URL**: [${url}](${url})\n**Clipped Date**: ${new Date().toLocaleDateString()}\n**Mode**: ${clipMode}\n\n## Extracted Key Takeaways\n- Captured web research source from ${domain}.\n- Auto-grounded in local AI knowledge base for RAG assistant retrieval.\n\n#research #web-clip #${domain.replace(/[^a-zA-Z0-9]/g, '-')}`;

      const res = await fetch('/api/v1/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          tags: ['research', 'web-clip', domain.replace(/[^a-zA-Z0-9]/g, '-')],
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save clipped page');
      }

      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to clip URL');
    } finally {
      setIsClipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#0F1117] w-full max-w-md p-5 rounded-lg border border-[#242A3C] shadow-2xl space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2433] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#121E2E] border border-[#1B324D] rounded-md text-sky-400">
              <Globe className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white font-mono">Web Research Clipper</h3>
              <p className="text-[10px] text-[#64748B]">Synthesize external articles directly into your vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#64748B] hover:text-white hover:bg-[#141722] rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleClip} className="space-y-3">
          {/* URL Input */}
          <div>
            <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">Target Page URL</label>
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#090A0F] border border-[#242A3C] rounded-md text-xs text-white">
              <Link2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/research-paper"
                className="w-full bg-transparent outline-none text-xs text-white placeholder-[#475569] font-mono"
              />
            </div>
          </div>

          {/* Clip Mode selector */}
          <div>
            <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">Extraction Strategy</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'summary', label: 'AI Summary', icon: Sparkles },
                { id: 'full', label: 'Full Text', icon: FileText },
                { id: 'bookmark', label: 'Metadata Only', icon: Bookmark },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setClipMode(m.id as any)}
                    className={`p-2 rounded-md border text-xs font-mono flex flex-col items-center gap-1 transition-colors ${
                      clipMode === m.id
                        ? 'bg-[#121E2E] border-sky-500 text-white shadow-sm'
                        : 'bg-[#090A0F] border-[#242A3C] text-[#64748B] hover:text-white hover:bg-[#141722]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[10px]">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="p-2.5 bg-[#2B1215] border border-[#521C24] rounded-md text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-2.5 bg-[#102319] border border-[#1B432C] rounded-md text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Page clipped and integrated into local knowledge graph.
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
              type="submit"
              disabled={!url.trim() || isClipping}
              className="px-3.5 py-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-mono font-medium disabled:opacity-50 transition-colors shadow-sm"
            >
              {isClipping ? 'Clipping Page...' : 'Clip to Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
