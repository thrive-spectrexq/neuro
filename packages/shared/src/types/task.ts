export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

export type TaskCreate = Omit<Task, 'id' | 'created_at' | 'updated_at'>;
export type TaskUpdate = Partial<TaskCreate>;
export type TaskStatusUpdate = { status: Task['status'] };
