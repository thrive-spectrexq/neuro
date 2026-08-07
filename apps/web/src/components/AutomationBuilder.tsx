import { useState } from 'react';
import { Zap, Plus, Trash2 } from 'lucide-react';

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
      name: 'Auto-Summarize Research Notes',
      trigger_type: 'on_note_create',
      action_type: 'auto_summarize',
      is_active: true,
    },
    {
      id: '2',
      name: 'Extract Pending Tasks from #project Notes',
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
    <div className="h-full flex flex-col bg-[#090A0F] border border-[#1F2433] rounded-lg p-4 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b border-[#1F2433] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#2B1B10] border border-[#4D2E14] rounded-md text-amber-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide font-mono">Event Automations</h2>
            <p className="text-[10px] text-[#64748B]">Trigger-action pipelines for autonomous vault enrichment</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 px-2.5 py-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-medium transition-colors shadow-sm"
        >
          <Plus className="w-3 h-3" />
          <span>New Rule</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="p-3.5 rounded-lg border border-[#1F2433] bg-[#0F1117] hover:border-[#2E364B] transition-colors flex items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-md border mt-0.5 ${rule.is_active ? 'bg-[#2B1B10] border-[#4D2E14] text-amber-400' : 'bg-[#141722] border-[#242A3C] text-[#64748B]'}`}>
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-white font-mono flex items-center gap-2">
                  {rule.name}
                  {rule.is_active ? (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#102319] text-emerald-400 border border-[#1B432C]">
                      Active
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#141722] text-[#64748B] border border-[#242A3C]">
                      Disabled
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2 text-[10px] font-mono text-[#94A3B8]">
                  <span>Trigger: <strong className="text-sky-300">{rule.trigger_type}</strong></span>
                  {rule.trigger_value && (
                    <span className="bg-[#141722] px-1 py-0.2 rounded text-slate-300 border border-[#242A3C]">#{rule.trigger_value}</span>
                  )}
                  <span>&bull;</span>
                  <span>Action: <strong className="text-indigo-300">{rule.action_type}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleRule(rule.id)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded-md border transition-colors ${
                  rule.is_active
                    ? 'bg-[#141722] text-[#CBD5E1] border-[#242A3C] hover:bg-[#1E2435]'
                    : 'bg-[#4F46E5] text-white border-transparent hover:bg-[#4338CA]'
                }`}
              >
                {rule.is_active ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => deleteRule(rule.id)}
                className="p-1 text-[#64748B] hover:text-rose-400 transition-colors"
                title="Delete rule"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0F1117] w-full max-w-md p-5 rounded-lg border border-[#242A3C] shadow-2xl space-y-3">
            <h3 className="text-xs font-bold text-white font-mono">Create Automation Pipeline</h3>
            <form onSubmit={handleCreateRule} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">Pipeline Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Extract TODO tags..."
                  className="w-full bg-[#090A0F] border border-[#242A3C] rounded-md px-3 py-1.5 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">Event Trigger</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as any)}
                  className="w-full bg-[#090A0F] border border-[#242A3C] rounded-md px-2 py-1.5 text-xs text-white focus:outline-none font-mono cursor-pointer"
                >
                  <option value="on_note_create">When a note is created</option>
                  <option value="on_tag_add">When a specific tag is attached</option>
                  <option value="on_task_done">When a task is marked complete</option>
                </select>
              </div>

              {triggerType === 'on_tag_add' && (
                <div>
                  <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">Target Tag</label>
                  <input
                    type="text"
                    value={triggerValue}
                    onChange={(e) => setTriggerValue(e.target.value)}
                    placeholder="e.g. project or urgent (without #)"
                    className="w-full bg-[#090A0F] border border-[#242A3C] rounded-md px-3 py-1.5 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">Autonomous Action</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}
                  className="w-full bg-[#090A0F] border border-[#242A3C] rounded-md px-2 py-1.5 text-xs text-white focus:outline-none font-mono cursor-pointer"
                >
                  <option value="auto_summarize">Auto-summarize content and append TL;DR</option>
                  <option value="extract_tasks">Extract markdown task checkboxes to Kanban</option>
                  <option value="notify">Push system notification</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1F2433]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1 text-xs font-mono text-[#94A3B8] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-medium transition-colors font-mono"
                >
                  Save Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
