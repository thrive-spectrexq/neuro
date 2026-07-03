import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, TaskCreate, TaskUpdate, TaskStatusUpdate } from '@neuro/shared/types';
import { apiClient } from '@/lib/api';

const TASKS_QUERY_KEY = ['tasks'];

export function useTasks(projectId?: string) {
  const queryClient = useQueryClient();

  const fetchTasks = async (): Promise<Task[]> => {
    // In a real implementation we might pass project_id to filter
    const response = await apiClient.get('/tasks/');
    let tasks = response.data;
    if (projectId) {
      tasks = tasks.filter((t: Task) => t.project_id === projectId);
    }
    return tasks;
  };

  const tasksQuery = useQuery({
    queryKey: projectId ? [...TASKS_QUERY_KEY, { projectId }] : TASKS_QUERY_KEY,
    queryFn: fetchTasks,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: TaskCreate) => {
      const response = await apiClient.post('/tasks/', task);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TaskUpdate }) => {
      const response = await apiClient.put(`/tasks/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TaskStatusUpdate }) => {
      const response = await apiClient.patch(`/tasks/${id}/status`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });

  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    updateTaskStatus: updateTaskStatusMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
  };
}
