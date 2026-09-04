import { useState, useEffect, useMemo } from 'react';
import { Plus, CheckCircle2, Clock, Circle, Trash2, ArrowRight, ArrowLeft, Search, Calendar, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
}

export function TaskKanbanBoard() {
  const token = useAuthStore((state) => state.token);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          priority: newTaskPriority,
          due_date: newTaskDueDate || undefined,
          status: newTaskStatus,
        }),
      });

      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskDueDate('');
        setShowCreateModal(false);
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPriority =
        priorityFilter === 'all' || task.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, priorityFilter]);

  const columns = [
    {
      id: 'todo' as const,
      title: 'Backlog & To Do',
      icon: Circle,
      color: 'text-[#94A3B8]',
      borderColor: 'border-[#242A3C]',
      headerBg: 'bg-[#141722]',
    },
    {
      id: 'in_progress' as const,
      title: 'In Progress',
      icon: Clock,
      color: 'text-sky-400',
      borderColor: 'border-sky-500/30',
      headerBg: 'bg-[#0E1B2E]',
    },
    {
      id: 'done' as const,
      title: 'Completed',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      headerBg: 'bg-[#0E241D]',
    },
  ];

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-[#2A1218] text-rose-300 border-[#4E1C27]';
      case 'high':
        return 'bg-[#2B1B10] text-amber-300 border-[#4D2E14]';
      case 'medium':
        return 'bg-[#121E2E] text-sky-300 border-[#1B324D]';
      default:
        return 'bg-[#141722] text-[#94A3B8] border-[#242A3C]';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#090A0F] border border-[#1F2433] rounded-lg p-4 overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#141722] border border-[#242A3C] rounded-md text-teal-400">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide font-mono">Workflow Kanban</h2>
            <p className="text-[10px] text-[#64748B] font-mono">
              {tasks.length} Active Tasks · {tasks.filter(t => t.status === 'done').length} Completed
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#0F1117] border border-[#242A3C] rounded-md text-xs text-[#CBD5E1]">
            <Search className="w-3 h-3 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none placeholder-[#475569] w-28 sm:w-36 font-mono"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#0F1117] text-[#CBD5E1] border border-[#242A3C] text-[11px] rounded-md px-2 py-1 outline-none font-mono cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-medium transition-colors shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 overflow-hidden">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          const ColIcon = col.icon;

          return (
            <div key={col.id} className="flex flex-col bg-[#0F1117] rounded-lg border border-[#1F2433] overflow-hidden">
              <div className={`flex items-center justify-between px-3 py-2 border-b border-[#1F2433] ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <ColIcon className={`w-3.5 h-3.5 ${col.color}`} />
                  <h3 className="font-semibold text-xs text-white font-mono">{col.title}</h3>
                  <span className="px-1.5 py-0.2 text-[10px] bg-[#090A0F] text-[#94A3B8] border border-[#242A3C] rounded font-mono">
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setNewTaskStatus(col.id);
                    setShowCreateModal(true);
                  }}
                  className="p-1 text-[#64748B] hover:text-white hover:bg-[#181C26] rounded transition-colors"
                  title={`Add task to ${col.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Task list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {isLoading ? (
                  <div className="h-28 flex items-center justify-center text-[#64748B] text-xs font-mono">
                    Loading tasks...
                  </div>
                ) : colTasks.length === 0 ? (
                  <div className="h-24 flex flex-col items-center justify-center text-[#475569] text-[11px] border border-dashed border-[#1F2433] rounded-md font-mono">
                    Empty column
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                    return (
                      <div
                        key={task.id}
                        className="p-2.5 rounded-md border border-[#1F2433] bg-[#141722] hover:border-[#2E364B] transition-all group flex flex-col gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-white leading-snug font-mono">{task.title}</h4>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-[#64748B] hover:text-rose-400 transition-opacity"
                            title="Delete task"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {task.description && (
                          <p className="text-[11px] text-[#94A3B8] line-clamp-2 leading-relaxed">{task.description}</p>
                        )}

                        <div className="flex items-center justify-between pt-1.5 border-t border-[#1F2433] mt-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${getPriorityBadge(
                                task.priority
                              )}`}
                            >
                              {task.priority || 'medium'}
                            </span>

                            {task.due_date && (
                              <span
                                className={`text-[9px] font-mono flex items-center gap-1 px-1 py-0.2 rounded ${
                                  isOverdue
                                    ? 'bg-[#2A1218] text-rose-300 border border-[#4E1C27] font-bold'
                                    : 'text-[#64748B]'
                                }`}
                              >
                                {isOverdue ? <AlertCircle className="w-2.5 h-2.5 text-rose-400" /> : <Calendar className="w-2.5 h-2.5" />}
                                {task.due_date}
                              </span>
                            )}
                          </div>

                          {/* Status Transition Controls */}
                          <div className="flex items-center gap-0.5">
                            {col.id !== 'todo' && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(
                                    task.id,
                                    col.id === 'done' ? 'in_progress' : 'todo'
                                  )
                                }
                                title="Move left"
                                className="p-1 text-[#64748B] hover:text-white hover:bg-[#1E2435] rounded transition-colors"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {col.id !== 'done' && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(
                                    task.id,
                                    col.id === 'todo' ? 'in_progress' : 'done'
                                  )
                                }
                                title="Move right"
                                className="p-1 text-sky-400 hover:text-white hover:bg-sky-500/20 rounded transition-colors"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0F1117] w-full max-w-md p-5 rounded-lg border border-[#242A3C] shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white font-mono">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full bg-[#090A0F] border border-[#242A3C] rounded-md px-3 py-1.5 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1">Description</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Task details & specifications..."
                  rows={3}
                  className="w-full bg-[#090A0F] border border-[#242A3C] rounded-md px-3 py-1.5 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-teal-500 font-mono resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full bg-[#090A0F] border border-[#242A3C] rounded-md px-2 py-1 text-xs text-white focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full bg-[#090A0F] border border-[#242A3C] rounded-md px-2 py-1 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">Initial Status</label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value as any)}
                    className="w-full bg-[#090A0F] border border-[#242A3C] rounded-md px-2 py-1 text-xs text-white focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1F2433]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1 text-xs font-mono text-[#94A3B8] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-medium transition-colors"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
