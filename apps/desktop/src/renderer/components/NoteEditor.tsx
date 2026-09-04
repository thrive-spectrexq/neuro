import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { debounce } from 'lodash';
import {
  FileText,
  CheckCircle2,
  Sparkles,
  ListTodo,
  Table,
  Wand2,
  Mic,
  Copy,
  Check,
  Radio,
  FileCheck,
  Eye,
  Columns,
  Code
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';
import { useNotes, useUpdateNote } from '../hooks/useNotes';
import { soundEngine } from '../utils/soundEngine';

type EditorViewMode = 'edit' | 'split' | 'preview';

export default function NoteEditor() {
  const { activeNoteId } = useNoteStore();
  const { data: notes } = useNotes();
  const updateNoteMutation = useUpdateNote();

  const activeNote = notes?.find((n) => n.id === activeNoteId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<EditorViewMode>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [copied, setCopied] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Sync local state when active note changes
  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setContent(activeNote.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [activeNote?.id]);

  // Debounced save
  const debouncedSave = useMemo(
    () =>
      debounce((id: string, newTitle: string, newContent: string) => {
        const note = notes?.find((n) => n.id === id);
        if (note) {
          setIsSaving(true);
          updateNoteMutation.mutate(
            {
              ...note,
              title: newTitle,
              content: newContent,
            },
            {
              onSettled: () => {
                setTimeout(() => setIsSaving(false), 500);
              },
            }
          );
        }
      }, 800),
    [notes, updateNoteMutation]
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (activeNoteId) {
      debouncedSave(activeNoteId, newTitle, content);
    }
  };

  const handleContentChange = useCallback(
    (value: string) => {
      setContent(value);
      if (activeNoteId) {
        debouncedSave(activeNoteId, title, value);
      }
    },
    [activeNoteId, title, debouncedSave]
  );

  // Toggle Markdown checkbox directly in Preview
  const handleToggleCheckbox = (lineIdx: number) => {
    const lines = content.split('\n');
    const targetLine = lines[lineIdx];
    if (targetLine) {
      if (targetLine.includes('- [ ]')) {
        lines[lineIdx] = targetLine.replace('- [ ]', '- [x]');
      } else if (targetLine.includes('- [x]')) {
        lines[lineIdx] = targetLine.replace('- [x]', '- [ ]');
      }
      const updated = lines.join('\n');
      setContent(updated);
      if (activeNoteId) debouncedSave(activeNoteId, title, updated);
      soundEngine.playClick();
    }
  };

  // AI Content Assistant Actions
  const handleAiAction = async (actionType: 'polish' | 'summarize' | 'action_items' | 'table') => {
    if (!content.trim() || isAiProcessing) return;
    setIsAiProcessing(true);
    soundEngine.playBeep(700, 'sine', 0.08);

    try {
      let prompt = '';
      if (actionType === 'polish') {
        prompt = `Please polish and improve the grammar, clarity, and formatting of the following markdown note while preserving all meaning:\n\n${content}`;
      } else if (actionType === 'summarize') {
        prompt = `Generate a concise 3-bullet executive summary of the following note:\n\n${content}`;
      } else if (actionType === 'action_items') {
        prompt = `Extract actionable checklist items from this note using markdown "- [ ]" checkboxes:\n\n${content}`;
      } else if (actionType === 'table') {
        prompt = `Format the key points or lists in the following text into a clean markdown table:\n\n${content}`;
      }

      const res = await fetch('http://127.0.0.1:8000/api/v1/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: 'local' }),
      });

      if (res.ok) {
        const data = await res.json();
        const generated = data.response || data.text || '';
        if (generated) {
          let newContent = content;
          if (actionType === 'polish') {
            newContent = generated.trim();
          } else if (actionType === 'summarize') {
            newContent = `> [!NOTE]\n> **AI Summary**\n> ${generated.trim().replace(/\n/g, '\n> ')}\n\n${content}`;
          } else {
            newContent = `${content}\n\n### ⚡ AI Generated ${actionType === 'action_items' ? 'Action Items' : 'Structured Table'}\n${generated.trim()}`;
          }
          setContent(newContent);
          if (activeNoteId) {
            debouncedSave(activeNoteId, title, newContent);
          }
        }
      } else {
        // Fallback local transformation if backend AI offline
        if (actionType === 'action_items') {
          const lines = content.split('\n').filter(l => l.trim().length > 5);
          const tasks = lines.slice(0, 5).map(l => `- [ ] ${l.replace(/^[-*#\d.]+\s*/, '')}`).join('\n');
          const newContent = `${content}\n\n### ⚡ Action Items\n${tasks}`;
          setContent(newContent);
          if (activeNoteId) debouncedSave(activeNoteId, title, newContent);
        } else if (actionType === 'summarize') {
          const summary = `> [!NOTE]\n> **Quick Note Summary**\n> • Key topic: ${title || 'General'}\n> • Word count: ${wordCount} words\n\n`;
          const newContent = `${summary}${content}`;
          setContent(newContent);
          if (activeNoteId) debouncedSave(activeNoteId, title, newContent);
        }
      }
    } catch (e) {
      console.warn('AI action fallback:', e);
    } finally {
      setIsAiProcessing(false);
      soundEngine.playBeep(920, 'sine', 0.1);
    }
  };

  // Live Voice Dictation directly into Note
  const toggleDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser/runtime.');
      return;
    }

    if (isDictating) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsDictating(false);
      soundEngine.playBeep(440, 'sine', 0.1);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsDictating(true);
          soundEngine.playBeep(880, 'sine', 0.1);
        };

        recognition.onresult = (event: any) => {
          const spoken = event.results[event.results.length - 1][0].transcript;
          if (spoken) {
            setContent((prev) => {
              const updated = prev ? `${prev} ${spoken.trim()}` : spoken.trim();
              if (activeNoteId) {
                debouncedSave(activeNoteId, title, updated);
              }
              return updated;
            });
          }
        };

        recognition.onerror = () => {
          setIsDictating(false);
        };

        recognition.onend = () => {
          setIsDictating(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Dictation start error:', err);
        setIsDictating(false);
      }
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Metrics
  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  // Simple, elegant Markdown preview renderer
  const renderMarkdownPreview = () => {
    const lines = content.split('\n');
    return (
      <div className="p-8 font-sans text-sm leading-relaxed text-zinc-200 space-y-3 overflow-y-auto h-full">
        {lines.map((line, idx) => {
          if (line.startsWith('# ')) {
            return <h1 key={idx} className="text-2xl font-bold text-white border-b border-white/[0.08] pb-2 pt-2">{line.slice(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={idx} className="text-xl font-bold text-emerald-300 pt-2">{line.slice(3)}</h2>;
          }
          if (line.startsWith('### ')) {
            return <h3 key={idx} className="text-base font-semibold text-teal-300 pt-1">{line.slice(4)}</h3>;
          }
          if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
            const isChecked = line.startsWith('- [x] ');
            const taskText = line.slice(6);
            return (
              <div
                key={idx}
                onClick={() => handleToggleCheckbox(idx)}
                className="flex items-center gap-2 cursor-pointer group hover:text-white"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
                <span className={isChecked ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                  {taskText}
                </span>
              </div>
            );
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return <li key={idx} className="ml-4 list-disc text-zinc-300">{line.slice(2)}</li>;
          }
          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="border-l-2 border-emerald-500 pl-3 py-1 bg-emerald-950/20 text-emerald-200 italic rounded-r-md">
                {line.slice(2)}
              </blockquote>
            );
          }
          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }
          return <p key={idx} className="text-zinc-300">{line}</p>;
        })}
      </div>
    );
  };

  if (!activeNoteId) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#07080c] text-zinc-500 p-8 select-none">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
          <FileText size={20} className="text-zinc-500" />
        </div>
        <p className="text-sm font-medium text-zinc-300">No Note Selected</p>
        <p className="text-xs text-zinc-500 mt-1">Select a note from the Notes tab or create a new one.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#07080c]">
      {/* Editor Header & Meta Toolbar */}
      <div className="px-8 pt-5 pb-3 border-b border-white/[0.05] bg-[#090b12] flex items-center justify-between gap-4 select-none">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            placeholder="Note Title..."
            value={title}
            onChange={handleTitleChange}
            className="bg-transparent text-xl font-bold text-white placeholder-zinc-600 outline-none w-full font-sans tracking-tight"
          />
        </div>

        {/* View Mode Switcher, Copy & Save Status */}
        <div className="flex items-center gap-3 text-zinc-500 text-xs font-mono">
          {/* [Edit / Split / Preview] View Mode Switcher */}
          <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5 text-[11px]">
            <button
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded ${viewMode === 'edit' ? 'bg-emerald-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
              title="Markdown Code Editor"
            >
              <Code size={11} />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded ${viewMode === 'split' ? 'bg-emerald-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
              title="Split Code & Live Preview"
            >
              <Columns size={11} />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded ${viewMode === 'preview' ? 'bg-emerald-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
              title="Rich Markdown Preview"
            >
              <Eye size={11} />
              <span>Preview</span>
            </button>
          </div>

          <button
            onClick={handleCopyContent}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-400 hover:text-white transition-all"
            title="Copy Markdown"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
            <span>{wordCount} words</span>
          </div>

          <div className="w-[1px] h-3 bg-white/[0.08]" />

          <div className="flex items-center gap-1">
            <CheckCircle2 size={12} className={isSaving ? 'text-amber-400 animate-spin' : 'text-emerald-400'} />
            <span className="text-[11px] text-zinc-400">
              {isSaving ? 'Saving...' : 'Saved'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Copilot & Voice Dictation Action Bar */}
      <div className="px-8 py-2 border-b border-white/[0.04] bg-[#080911] flex items-center justify-between gap-2 overflow-x-auto select-none">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 flex items-center gap-1 mr-1">
            <Sparkles size={11} className="text-emerald-400" /> AI Tools:
          </span>

          <button
            onClick={() => handleAiAction('polish')}
            disabled={isAiProcessing || !content.trim()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/30 text-zinc-300 hover:text-emerald-300 text-[11px] font-sans transition-all disabled:opacity-40"
          >
            <Wand2 size={11} className="text-emerald-400" />
            <span>Polish & Fix</span>
          </button>

          <button
            onClick={() => handleAiAction('summarize')}
            disabled={isAiProcessing || !content.trim()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-teal-500/10 border border-white/[0.06] hover:border-teal-500/30 text-zinc-300 hover:text-teal-300 text-[11px] font-sans transition-all disabled:opacity-40"
          >
            <FileCheck size={11} className="text-teal-400" />
            <span>Summarize</span>
          </button>

          <button
            onClick={() => handleAiAction('action_items')}
            disabled={isAiProcessing || !content.trim()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/30 text-zinc-300 hover:text-emerald-300 text-[11px] font-sans transition-all disabled:opacity-40"
          >
            <ListTodo size={11} className="text-emerald-400" />
            <span>Extract Tasks</span>
          </button>

          <button
            onClick={() => handleAiAction('table')}
            disabled={isAiProcessing || !content.trim()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-teal-500/10 border border-white/[0.06] hover:border-teal-500/30 text-zinc-300 hover:text-teal-300 text-[11px] font-sans transition-all disabled:opacity-40"
          >
            <Table size={11} className="text-teal-400" />
            <span>To Table</span>
          </button>
        </div>

        {/* Live Speech Dictation Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDictation}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-mono transition-all ${
              isDictating
                ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse'
                : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300 hover:text-white'
            }`}
          >
            {isDictating ? (
              <>
                <Radio size={12} className="text-rose-400 animate-spin" />
                <span>Listening (Speak to write)...</span>
              </>
            ) : (
              <>
                <Mic size={12} className="text-emerald-400" />
                <span>Voice Dictate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor & Preview Canvas */}
      <div className="flex-1 overflow-hidden relative flex">
        {/* CodeMirror Source Editor */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-white/[0.06]' : 'w-full'} h-full overflow-hidden`}>
            <CodeMirror
              value={content}
              height="100%"
              theme={oneDark}
              extensions={[
                markdown({ base: markdownLanguage, codeLanguages: languages }),
              ]}
              onChange={handleContentChange}
              className="h-full text-[13px] leading-relaxed [&_.cm-editor]:h-full [&_.cm-editor]:bg-transparent [&_.cm-scroller]:p-8 [&_.cm-content]:font-mono [&_.cm-line]:py-0.5"
            />
          </div>
        )}

        {/* Rich Live Markdown Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} h-full overflow-y-auto bg-[#07080c]`}>
            {renderMarkdownPreview()}
          </div>
        )}
      </div>
    </div>
  );
}
