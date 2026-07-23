import { useState, useEffect, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { FileText, Save, Tag } from 'lucide-react';

interface NoteEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  onSave?: (note: { title: string; content: string; tags: string[] }) => void;
}

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

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
    setTags(initialTags);
  }, [initialTitle, initialContent, initialTags]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleContentChange = useCallback((val: string) => {
    setContent(val);
  }, []);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase().replace(/^#/, '');
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ title, content, tags });
    }
  };

  return (
    <div className="h-full w-full flex flex-col glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Top Title & Action Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 bg-black/20">
        <div className="flex items-center gap-3 flex-1">
          <FileText className="w-5 h-5 text-accent-purple" />
          <input
            type="text"
            placeholder="Untitled Note..."
            value={title}
            onChange={handleTitleChange}
            className="bg-transparent text-xl font-extrabold text-white outline-none w-full placeholder-gray-500"
          />
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white shadow-lg hover:brightness-110 active:scale-95 transition-all"
        >
          <Save className="w-4 h-4" />
          Save Note
        </button>
      </div>

      {/* Tags Section */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 bg-black/10 overflow-x-auto">
        <Tag className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />
        <div className="flex items-center gap-1.5 flex-wrap">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-accent-purple/20 text-purple-200 border border-purple-500/30"
            >
              #{t}
              <button
                onClick={() => handleRemoveTag(t)}
                className="hover:text-white font-bold ml-1"
              >
                &times;
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder="Add tag + Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            className="bg-transparent text-xs text-gray-300 outline-none w-28 placeholder-gray-600"
          />
        </div>
      </div>

      {/* CodeMirror Markdown Editor */}
      <div className="flex-1 overflow-auto bg-black/40">
        <CodeMirror
          value={content}
          height="100%"
          theme={oneDark}
          extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
          onChange={handleContentChange}
          className="h-full text-sm [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono [&_.cm-gutters]:bg-black/20 [&_.cm-gutters]:border-r-white/5"
        />
      </div>
    </div>
  );
}
