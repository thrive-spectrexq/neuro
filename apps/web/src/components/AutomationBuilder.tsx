import { useState } from 'react';
import { Zap, Plus, Trash2, Sparkles, Bot } from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: 'on_note_create' | 'on_tag_add' | 'on_task_done';
  trigger_value?: string;
  action_type: 'auto_summarize' | 'extract_tasks' | 'notify';
  is_active: boolean;
}

export function AutomationBuilder() {
  const [rules, setRules] = useState<AutomationRule[]>([
    {
      id: '1',
      name: 'Auto-Summarize Long Research Notes',
      trigger_type: 'on_note_create',
      action_type: 'auto_summarize',
      is_active: true,
    },
    {
      id: '2',
      name: 'Auto-Extract Pending Tasks from #project Notes',
      trigger_type: 'on_tag_add',
      trigger_value: 'project',
      action_type: 'extract_tasks',
      is_active: true,
    },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<'on_note_create' | 'on_tag_add' | 'on_task_done'>('on_note_create');
  const [triggerValue, setTriggerValue] = useState('');
  const [actionType, setActionType] = useState<'auto_summarize' | 'extract_tasks' | 'notify'>('auto_summarize');

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newRule: AutomationRule = {
      id: Date.now().toString(),
      name,
      trigger_type: triggerType,
      trigger_value: triggerValue || undefined,
      action_type: actionType,
      is_active: true,
    };

    setRules((prev) => [...prev, newRule]);
    setName('');
    setTriggerValue('');
    setShowModal(false);
  };

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r))
    );
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="h-full flex flex-col glass-panel rounded-2xl border border-white/10 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Workflow Automation Engine</h2>
            <p className="text-xs text-slate-400">Automate recurring AI tasks and event-driven pipelines</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-xl text-xs font-semibold hover:brightness-110 transition-all shadow-lg active:scale-95"
        >
          <Plus className="w-4 h-4" /> Create Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all shadow-md flex items-center justify-between gap-4 bg-[#0E1017]/60"
          >
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl border mt-0.5 ${rule.is_active ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {rule.name}
                  <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full border uppercase ${rule.is_active ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                    {rule.is_active ? 'Active' : 'Paused'}
                  </span>
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" /> Trigger: {rule.trigger_type.replace(/_/g, ' ')} {rule.trigger_value ? `(#${rule.trigger_value})` : ''}
                  </span>
                  <span>➔</span>
                  <span className="flex items-center gap-1 text-sky-300">
                    <Bot className="w-3 h-3 text-sky-400" /> Action: {rule.action_type.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleRule(rule.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  rule.is_active
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                {rule.is_active ? 'Pause' : 'Enable'}
              </button>
              <button
                onClick={() => deleteRule(rule.id)}
                className="p-2 text-slate-500 hover:text-rose-400 rounded-xl transition-all"
                title="Delete Rule"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-white/15 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> New Automation Rule
            </h3>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Auto-tag research documents"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Trigger Event</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as any)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="on_note_create">On Note Created</option>
                  <option value="on_tag_add">On Specific Tag Added</option>
                  <option value="on_task_done">On Task Completed</option>
                </select>
              </div>

              {triggerType === 'on_tag_add' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Tag</label>
                  <input
                    type="text"
                    value={triggerValue}
                    onChange={(e) => setTriggerValue(e.target.value)}
                    placeholder="e.g. project or research"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Automated AI Action</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="auto_summarize">Generate 2-Sentence Note Summary</option>
                  <option value="extract_tasks">Extract Actionable Tasks to Kanban</option>
                  <option value="notify">Log Audit Activity</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-xl text-xs font-semibold shadow-lg hover:brightness-110"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
