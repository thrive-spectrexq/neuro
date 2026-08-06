import { useState, useEffect, useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { 
  FileText, 
  Save, 
  Tag, 
  Eye, 
  Edit3, 
  Columns, 
  Check, 
  List, 
  Link2, 
  Bold, 
  Italic, 
  Heading2, 
  CheckSquare, 
  Code, 
  Clock 
} from 'lucide-react';

interface NoteEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  onSave?: (note: { title: string; content: string; tags: string[] }) => void;
}

type ViewMode = 'edit' | 'preview' | 'split';

export function NoteEditor({
  initialTitle = '',
  initialContent = '',
  initialTags = [],
  onSave,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialTags);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isSaved, setIsSaved] = useState(true);
  const [showOutline, setShowOutline] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
    setTags(initialTags);
  }, [initialTitle, initialContent, initialTags]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setIsSaved(false);
  };

  const handleContentChange = useCallback((val: string) => {
    setContent(val);
    setIsSaved(false);
  }, []);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase().replace(/^#/, '');
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setIsSaved(false);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    setIsSaved(false);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ title, content, tags });
      setIsSaved(true);
    }
  };

  // Quick formatting insert helpers
  const insertFormatting = (prefix: string, suffix: string = '') => {
    setContent((prev) => `${prev}\n${prefix} ${suffix}`.trim());
    setIsSaved(false);
  };

  // Word, Character and Read Time analytics
  const stats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    const readMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readMinutes };
  }, [content]);

  // Extract headings for outline navigation
  const headings = useMemo(() => {
    const lines = content.split('\n');
    return lines
      .map((line, idx) => {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match && match[1] && match[2]) {
          return { level: match[1].length, text: match[2], line: idx };
        }
        return null;
      })
      .filter((item): item is { level: number; text: string; line: number } => item !== null);
  }, [content]);

  // Extract [[WikiLinks]] found in content
  const wikiLinks = useMemo(() => {
    const matches = Array.from(content.matchAll(/\[\[(.*?)\]\]/g));
    return Array.from(new Set(matches.map((m) => m[1])));
  }, [content]);

  // Helper to render markdown content with wiki-links preview
  const renderPreview = () => {
    if (!content.trim()) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs italic">
          <FileText className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
          Type markdown on the left to preview rich rendering & [[Wikilinks]]...
        </div>
      );
    }

    const lines = content.split('\n');
    return (
      <div className="p-6 space-y-3 text-slate-200 text-sm font-sans leading-relaxed">
        {lines.map((line, i) => {
          if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-black text-white border-b border-white/10 pb-2 my-3 tracking-tight">{line.slice(2)}</h1>;
          if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-indigo-300 border-b border-white/5 pb-1 my-2 tracking-tight">{line.slice(3)}</h2>;
          if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-sky-300 my-1">{line.slice(4)}</h3>;
          if (line.startsWith('- [ ] ')) return (
            <div key={i} className="flex items-center gap-2 text-slate-300">
              <input type="checkbox" disabled className="rounded border-slate-700 bg-black/40 text-indigo-500" />
              <span>{line.slice(6)}</span>
            </div>
          );
          if (line.startsWith('- [x] ')) return (
            <div key={i} className="flex items-center gap-2 text-slate-500 line-through">
              <input type="checkbox" checked disabled className="rounded border-slate-700 bg-black/40 text-indigo-500" />
              <span>{line.slice(6)}</span>
            </div>
          );
          if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-slate-300">{line.slice(2)}</li>;
          if (line.startsWith('> ')) return (
            <blockquote key={i} className="border-l-2 border-indigo-500 pl-3 py-1 text-slate-400 italic bg-indigo-950/20 rounded-r-lg">
              {line.slice(2)}
            </blockquote>
          );

          // WikiLink replacement in text
          const parts = line.split(/(\[\[.*?\]\])/g);
          return (
            <p key={i} className="min-h-[1.25rem]">
              {parts.map((part, pIdx) => {
                if (part.startsWith('[[') && part.endsWith(']]')) {
                  const target = part.slice(2, -2);
                  return (
                    <span
                      key={pIdx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-semibold cursor-pointer hover:bg-indigo-500/30 transition-colors shadow-sm"
                      title={`Jump to [[${target}]]`}
                    >
                      <Link2 className="w-3 h-3 text-indigo-400" />
                      {target}
                    </span>
                  );
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Top Title & Action Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-4 bg-[#0A0C14]/80 backdrop-blur-md">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <FileText className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Untitled Note..."
            value={title}
            onChange={handleTitleChange}
            className="bg-transparent text-base font-extrabold text-white outline-none w-full placeholder-slate-500 tracking-tight"
          />
        </div>

        {/* View Mode Toggle Controls */}
        <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-xl">
          <button
            onClick={() => setViewMode('edit')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              viewMode === 'edit' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Edit Mode"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              viewMode === 'split' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Split Mode"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              viewMode === 'preview' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Preview Mode"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Outline Drawer Toggle */}
        <button
          onClick={() => setShowOutline(!showOutline)}
          className={`p-1.5 rounded-xl border border-white/10 text-xs font-semibold transition-all ${
            showOutline ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Document Outline"
        >
          <List className="w-4 h-4" />
        </button>

        {/* Save Button & Status */}
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all shadow-lg active:scale-95 ${
            isSaved
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'neuro-button-primary'
          }`}
        >
          {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {isSaved ? 'Saved' : 'Save Note'}
        </button>
      </div>

      {/* Formatting & Tags Sub-Toolbar */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between gap-3 bg-black/20 text-xs overflow-x-auto">
        {/* Quick Markdown Formats */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => insertFormatting('**bold text**')}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('*italic text*')}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('## Section Heading')}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
            title="Heading"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('- [ ] Task item')}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
            title="Checkbox"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('```typescript\n// code here\n```')}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
            title="Code Block"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('[[Target Note]]')}
            className="p-1 hover:bg-white/10 rounded text-indigo-400 hover:text-indigo-300"
            title="Wikilink"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tags Section */}
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <Tag className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <div className="flex items-center gap-1 flex-wrap">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30"
              >
                #{t}
                <button onClick={() => handleRemoveTag(t)} className="hover:text-white font-bold ml-0.5">&times;</button>
              </span>
            ))}
            <input
              type="text"
              placeholder="+tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="bg-transparent text-[11px] text-slate-300 outline-none w-16 placeholder-slate-600 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Main Workspace Area (Edit / Preview / Split + Optional Outline Sidebar) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Document Outline Drawer */}
        {showOutline && (
          <div className="w-52 border-r border-white/10 bg-[#080A10]/95 p-3 overflow-y-auto flex-shrink-0">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-mono">
              <List className="w-3 h-3" /> Outline
            </h4>
            {headings.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No headings in note</p>
            ) : (
              <div className="space-y-1">
                {headings.map((h, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-slate-300 hover:text-indigo-400 cursor-pointer truncate py-1 transition-colors font-sans"
                    style={{ paddingLeft: `${(h.level - 1) * 10}px` }}
                  >
                    {h.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Editor and Preview Containers */}
        <div className="flex-1 flex overflow-hidden">
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className={`h-full overflow-auto bg-black/40 ${viewMode === 'split' ? 'w-1/2 border-r border-white/10' : 'w-full'}`}>
              <CodeMirror
                value={content}
                height="100%"
                theme={oneDark}
                extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
                onChange={handleContentChange}
                className="h-full text-xs [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono [&_.cm-gutters]:bg-black/20 [&_.cm-gutters]:border-r-white/5"
              />
            </div>
          )}

          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={`h-full overflow-y-auto bg-[#090B12]/80 ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
              {renderPreview()}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="px-4 py-1.5 border-t border-white/5 bg-[#08090F]/90 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <span>{stats.words} words</span>
          <span>{stats.chars} chars</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-500" /> ~{stats.readMinutes} min read</span>
        </div>
        {wikiLinks.length > 0 && (
          <div className="flex items-center gap-1 text-indigo-400">
            <Link2 className="w-3 h-3" />
            <span>{wikiLinks.length} [[wikilinks]] detected</span>
          </div>
        )}
      </div>
    </div>
  );
}
