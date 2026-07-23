import { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DroppableStateSnapshot, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { useTasks } from '@/hooks/useTasks';
import { Task } from '@neuro/shared/types';
import { Plus, GripVertical } from 'lucide-react';

const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

export function KanbanBoard({ projectId }: { projectId?: string }) {
  const { tasks, isLoading, updateTaskStatus, createTask } = useTasks(projectId);

  const columns = useMemo(() => {
    const cols: Record<string, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    
    tasks.forEach((task: Task) => {
      if (cols[task.status]) {
        cols[task.status]!.push(task);
      } else if (cols.todo) {
        cols.todo.push(task);
      }
    });
    
    return cols;
  }, [tasks]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as Task['status'];
    
    updateTaskStatus({
      id: draggableId,
      data: { status: newStatus }
    });
  };

  const handleCreateTask = (status: Task['status']) => {
    const title = prompt('Enter task title:');
    if (title) {
      createTask({
        title,
        status,
        project_id: projectId
      });
    }
  };

  if (isLoading) {
    return <div className="text-white p-4">Loading tasks...</div>;
  }

  return (
    <div className="flex h-full w-full gap-6 p-6 overflow-x-auto bg-black text-white">
      <DragDropContext onDragEnd={onDragEnd}>
        {COLUMNS.map(column => {
          const colTasks = columns[column.id] || [];
          return (
            <div key={column.id} className="flex flex-col w-80 shrink-0">
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-lg font-semibold text-white/90">{column.title}</h2>
                <span className="bg-purple-900/50 text-purple-200 text-xs py-1 px-2 rounded-full">
                  {colTasks.length}
                </span>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 rounded-xl p-3 min-h-[500px] transition-colors border border-white/5 bg-white/5 backdrop-blur-md ${
                      snapshot.isDraggingOver ? 'bg-purple-900/20 border-purple-500/30' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      {colTasks.map((task: Task, index: number) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`group relative rounded-lg p-4 bg-black/60 border border-white/10 shadow-lg backdrop-blur-sm transition-all ${
                                snapshot.isDragging ? 'shadow-purple-500/20 border-purple-500/50 rotate-2' : 'hover:border-white/20'
                              }`}
                            >
                              <div 
                                {...provided.dragHandleProps}
                                className="absolute top-4 right-2 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                              >
                                <GripVertical size={16} />
                              </div>
                              <h3 className="font-medium text-white/90 pr-6">{task.title}</h3>
                              {task.description && (
                                <p className="text-sm text-white/50 mt-2 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="mt-4 flex items-center justify-between text-xs text-white/40">
                                <span className={`px-2 py-0.5 rounded capitalize ${
                                  task.priority === 'high' ? 'bg-red-500/20 text-red-300' : 
                                  task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-blue-500/20 text-blue-300'
                                }`}>
                                  {task.priority || 'medium'}
                                </span>
                                <span>{new Date(task.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                    
                    <button
                      onClick={() => handleCreateTask(column.id as Task['status'])}
                      className="mt-4 flex items-center gap-2 text-white/40 hover:text-purple-400 transition-colors text-sm px-2 py-2 w-full rounded hover:bg-white/5"
                    >
                      <Plus size={16} /> Add Task
                    </button>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </DragDropContext>
    </div>
  );
}
