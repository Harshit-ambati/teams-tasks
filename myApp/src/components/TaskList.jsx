import TaskItem from './TaskItem';
import '../styles/TaskList.css';

export default function TaskList({
  tasks,
  onToggleStatus,
  onToggleCompletion,
  onEdit,
  onDelete,
}) {
  return (
    <div className="task-list">
      {tasks.length === 0 ? (
        <div className="no-tasks">
          <p>No tasks to display</p>
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleStatus={() => onToggleStatus(task.id, task.status)}
              onToggleCompletion={() => onToggleCompletion(task.id)}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
