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
  Clock,
  Sparkles,
  X
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
        <div className="flex flex-col items-center justify-center h-64 text-[#64748B] text-xs font-mono">
          <FileText className="w-8 h-8 mb-2 opacity-30 text-teal-400" />
          Markdown live preview will appear here...
        </div>
      );
    }

    const lines = content.split('\n');
    return (
      <div className="p-4 space-y-2 text-[#CBD5E1] text-xs font-sans leading-relaxed">
        {lines.map((line, i) => {
          if (line.startsWith('# ')) return <h1 key={i} className="text-base font-bold text-white border-b border-[#242A3C] pb-1 my-2 font-mono">{line.slice(2)}</h1>;
          if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-semibold text-teal-300 border-b border-[#1E2333] pb-0.5 my-1.5 font-mono">{line.slice(3)}</h2>;
          if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-semibold text-sky-300 my-1 font-mono">{line.slice(4)}</h3>;
          if (line.startsWith('- [ ] ')) return (
            <div key={i} className="flex items-center gap-2 text-[#CBD5E1]">
              <input type="checkbox" disabled className="rounded border-[#2E354A] bg-[#090A0F] text-teal-500" />
              <span>{line.slice(6)}</span>
            </div>
          );
          if (line.startsWith('- [x] ')) return (
            <div key={i} className="flex items-center gap-2 text-[#64748B] line-through">
              <input type="checkbox" checked disabled className="rounded border-[#2E354A] bg-[#090A0F] text-teal-500" />
              <span>{line.slice(6)}</span>
            </div>
          );
          if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-[#CBD5E1]">{line.slice(2)}</li>;
          if (line.startsWith('> ')) return (
            <blockquote key={i} className="border-l-2 border-teal-500 pl-2.5 py-0.5 text-[#94A3B8] italic bg-[#131622] rounded-r">
              {line.slice(2)}
            </blockquote>
          );

          // Inline Q::A highlight
          if (line.includes('::')) {
            const parts = line.split('::');
            return (
              <div key={i} className="p-2 my-1 bg-[#161A28] border border-teal-500/30 rounded text-xs">
                <span className="text-teal-300 font-semibold font-mono">Q: {parts[0]}</span>
                <div className="text-slate-300 mt-0.5">A: {parts.slice(1).join('::')}</div>
              </div>
            );
          }

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
                      className="inline-flex items-center gap-1 px-1.5 py-0.2 mx-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[11px] font-mono cursor-pointer hover:bg-teal-500/25"
                      title={`Jump to [[${target}]]`}
                    >
                      <Link2 className="w-2.5 h-2.5 text-teal-400" />
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
    <div className="h-full w-full flex flex-col bg-[#0F1117] border border-[#1F2433] rounded-lg overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="h-11 px-3 border-b border-[#1F2433] flex items-center justify-between gap-3 bg-[#12151E]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Untitled Note..."
            value={title}
            onChange={handleTitleChange}
            className="bg-transparent text-xs font-bold text-white outline-none w-full placeholder-[#64748B] font-mono"
          />
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-0.5 p-0.5 bg-[#090A0F] border border-[#1F2433] rounded-md">
          <button
            onClick={() => setViewMode('edit')}
            className={`p-1 rounded text-xs transition-colors ${
              viewMode === 'edit' ? 'bg-[#242A3C] text-white' : 'text-[#64748B] hover:text-[#CBD5E1]'
            }`}
            title="Editor Only"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`p-1 rounded text-xs transition-colors ${
              viewMode === 'split' ? 'bg-[#242A3C] text-white' : 'text-[#64748B] hover:text-[#CBD5E1]'
            }`}
            title="Split Editor & Preview"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`p-1 rounded text-xs transition-colors ${
              viewMode === 'preview' ? 'bg-[#242A3C] text-white' : 'text-[#64748B] hover:text-[#CBD5E1]'
            }`}
            title="Rendered Preview"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Outline Toggle */}
        <button
          onClick={() => setShowOutline(!showOutline)}
          className={`p-1.5 rounded-md border text-xs transition-colors ${
            showOutline ? 'bg-[#1D2230] text-teal-300 border-teal-500/40' : 'border-[#242A3C] text-[#64748B] hover:text-white hover:bg-[#181C26]'
          }`}
          title="Document Outline"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`h-7 px-3 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
            isSaved
              ? 'bg-[#131E1B] text-emerald-300 border border-emerald-500/30'
              : 'pro-button-primary'
          }`}
        >
          {isSaved ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Saved</span>
            </>
          ) : (
            <>
              <Save className="w-3 h-3" />
              <span>Save Note</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Formatting Snippet Helper Bar */}
      <div className="h-8 px-3 border-b border-[#1A1F2C] bg-[#0E1017] flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => insertFormatting('##', '')}
            className="p-1 hover:bg-[#181C26] rounded text-[#64748B] hover:text-white"
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('**bold text**')}
            className="p-1 hover:bg-[#181C26] rounded text-[#64748B] hover:text-white"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('*italic text*')}
            className="p-1 hover:bg-[#181C26] rounded text-[#64748B] hover:text-white"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('[[Linked Note]]')}
            className="p-1 hover:bg-[#181C26] rounded text-[#64748B] hover:text-white"
            title="WikiLink [[Page]]"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('- [ ] ')}
            className="p-1 hover:bg-[#181C26] rounded text-[#64748B] hover:text-white"
            title="Task Checkbox"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('```ts\n// Code snippet\n```')}
            className="p-1 hover:bg-[#181C26] rounded text-[#64748B] hover:text-white"
            title="Code Block"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('Question::Answer')}
            className="p-1 hover:bg-[#181C26] rounded text-teal-400 hover:text-teal-300"
            title="Spaced Repetition Q::A Flashcard"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Analytics stats */}
        <div className="flex items-center gap-3 text-[10px] text-[#64748B]">
          <span>{stats.words} words</span>
          <span>•</span>
          <span>{stats.chars} chars</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {stats.readMinutes} min
          </span>
        </div>
      </div>

      {/* 3. Tags Bar */}
      <div className="px-3 py-1.5 border-b border-[#1A1F2C] bg-[#0B0C12] flex items-center gap-2 flex-wrap text-xs">
        <Tag className="w-3 h-3 text-[#64748B]" />
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#161A24] border border-[#242A3C] text-[11px] font-mono text-teal-300"
          >
            #{t}
            <button
              onClick={() => handleRemoveTag(t)}
              className="text-[#64748B] hover:text-rose-400 ml-0.5"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          placeholder="Add #tag (Enter)..."
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          className="bg-transparent text-xs text-[#CBD5E1] outline-none placeholder-[#475569] font-mono w-28"
        />
      </div>

      {/* 4. Editor / Preview Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Editor Pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className="flex-1 h-full overflow-auto bg-[#090A0F]">
            <CodeMirror
              value={content}
              height="100%"
              theme={oneDark}
              extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
              onChange={handleContentChange}
              className="text-xs font-mono h-full"
              basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
              }}
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex-1 h-full overflow-y-auto bg-[#0C0E14] border-l border-[#1A1F2C]">
            {renderPreview()}
          </div>
        )}

        {/* Outline Sidebar Drawer */}
        {showOutline && (
          <div className="w-52 h-full border-l border-[#1F2433] bg-[#0E1017] p-3 overflow-y-auto z-20 flex flex-col gap-2">
            <h4 className="text-[11px] font-bold font-mono text-[#94A3B8] uppercase tracking-wider">
              Outline
            </h4>
            {headings.length === 0 ? (
              <p className="text-[10px] text-[#64748B] italic">No headings found.</p>
            ) : (
              <div className="space-y-1">
                {headings.map((h, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left truncate text-[11px] text-[#94A3B8] hover:text-white hover:bg-[#161A24] px-1.5 py-1 rounded font-mono"
                    style={{ paddingLeft: `${(h.level - 1) * 8 + 6}px` }}
                  >
                    {h.text}
                  </button>
                ))}
              </div>
            )}

            {wikiLinks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#1F2433]">
                <h4 className="text-[11px] font-bold font-mono text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Links ({wikiLinks.length})
                </h4>
                <div className="space-y-1">
                  {wikiLinks.map((link) => (
                    <div key={link} className="flex items-center gap-1 text-[11px] font-mono text-teal-300 truncate">
                      <Link2 className="w-2.5 h-2.5 text-teal-400" />
                      <span>{link}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
