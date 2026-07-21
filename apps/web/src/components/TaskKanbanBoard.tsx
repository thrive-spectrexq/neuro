import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Clock, Circle, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
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
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
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
          status: newTaskStatus,
        }),
      });

      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskDesc('');
        setShowCreateModal(false);
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}/status`, {
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

  const columns: { id: 'todo' | 'in_progress' | 'done'; title: string; icon: any; color: string }[] = [
    { id: 'todo', title: 'To Do', icon: Circle, color: 'text-gray-400 border-gray-500/30' },
    { id: 'in_progress', title: 'In Progress', icon: Clock, color: 'text-accent-cyan border-cyan-500/30' },
    { id: 'done', title: 'Completed', icon: CheckCircle2, color: 'text-emerald-400 border-emerald-500/30' },
  ];

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="h-full flex flex-col glass-panel rounded-2xl border border-white/10 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Task Kanban Board
          </h2>
          <p className="text-xs text-gray-400">Manage priorities & workflow progress</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-purple to-accent-blue text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg active:scale-95"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const ColIcon = col.icon;

          return (
            <div key={col.id} className="flex flex-col glass-panel rounded-xl border border-white/10 p-4 bg-black/20 overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ColIcon className={`w-4 h-4 ${col.color.split(' ')[0]}`} />
                  <h3 className="font-semibold text-sm text-white">{col.title}</h3>
                  <span className="px-2 py-0.5 text-xs bg-white/10 text-gray-300 rounded-full font-mono">
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setNewTaskStatus(col.id);
                    setShowCreateModal(true);
                  }}
                  className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Task list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {isLoading ? (
                  <div className="h-32 flex items-center justify-center text-gray-500 text-xs">
                    Loading tasks...
                  </div>
                ) : colTasks.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-gray-500 text-xs border border-dashed border-white/10 rounded-xl">
                    No tasks in {col.title.toLowerCase()}
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="glass-panel p-4 rounded-xl border border-white/10 hover:border-white/20 transition-all shadow-md group relative flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-white leading-snug">{task.title}</h4>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {task.description && (
                        <p className="text-xs text-gray-400 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getPriorityBadge(
                            task.priority
                          )}`}
                        >
                          {task.priority || 'medium'}
                        </span>

                        {/* Status Transition Controls */}
                        <div className="flex items-center gap-1">
                          {col.id !== 'todo' && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(
                                  task.id,
                                  col.id === 'done' ? 'in_progress' : 'todo'
                                )
                              }
                              title="Move back"
                              className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
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
                              title="Move forward"
                              className="p-1 text-accent-cyan hover:text-white hover:bg-accent-cyan/20 rounded transition-all"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-white/15 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-accent-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Task details..."
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-accent-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-purple"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Initial Status</label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-purple"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-accent-purple to-accent-blue text-white rounded-xl text-xs font-semibold shadow-lg hover:opacity-90"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
