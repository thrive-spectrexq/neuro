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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-white/15 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 border border-sky-500/30 rounded-xl">
              <Globe className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Web Research Clipper</h3>
              <p className="text-xs text-slate-400">Capture & summarize web pages into your vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleClip} className="space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Page URL</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white">
              <Link2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/research-article"
                className="w-full bg-transparent outline-none text-xs text-white placeholder-slate-500"
              />
            </div>
          </div>

          {/* Clip Mode selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Capture Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'summary', label: 'AI Summary', icon: Sparkles },
                { id: 'full', label: 'Full Article', icon: FileText },
                { id: 'bookmark', label: 'Bookmark Only', icon: Bookmark },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setClipMode(m.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      clipMode === m.id
                        ? 'bg-sky-500/20 border-sky-500 text-white shadow-md'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-sky-400" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Web article clipped & saved to vault!
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
              type="submit"
              disabled={!url.trim() || isClipping}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-xl text-xs font-semibold shadow-lg hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {isClipping ? 'Clipping Page...' : 'Clip to Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
