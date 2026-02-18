import '../styles/TaskItem.css';

export default function TaskItem({ task, onToggleStatus, onToggleCompletion, onEdit, onDelete }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#ff6b6b';
      case 'medium':
        return '#ffd43b';
      case 'low':
        return '#51cf66';
      default:
        return '#748196';
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && task.status !== 'completed';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={`task-item task-${task.status}`}>
      <div className="task-header">
        <div className="task-title-section">
          <button
            className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
            onClick={onToggleCompletion}
            title={task.status === 'completed' ? "Mark as undone" : "Mark as done"}
          >
            {task.status === 'completed' && <span>✓</span>}
          </button>
          <div className="task-title-content">
            <h3 className={task.status === 'completed' ? 'completed' : ''}>
              {task.title}
            </h3>
            {task.description && <p className="task-description">{task.description}</p>}
          </div>
        </div>
        <div className="task-actions">
          <button
            className="task-btn edit-btn"
            onClick={onEdit}
            title="Edit task"
          >
            ✏️
          </button>
          <button
            className="task-btn delete-btn"
            onClick={onDelete}
            title="Delete task"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="task-footer">
        <div className="task-meta">
          {task.priority && (
            <span
              className="priority-badge"
              style={{ backgroundColor: getPriorityColor(task.priority) }}
              title={`Priority: ${task.priority}`}
            >
              {task.priority.charAt(0).toUpperCase()}
            </span>
          )}
          <button
            className="status-badge"
            onClick={onToggleStatus}
            title="Click to change status (Todo → In Progress → Completed)"
          >
            {getStatusLabel(task.status)}
          </button>
          {task.dueDate && (
            <span
              className={`due-date ${isOverdue(task.dueDate) ? 'overdue' : ''}`}
              title={isOverdue(task.dueDate) ? 'Overdue' : 'Due date'}
            >
              📅 {formatDate(task.dueDate)}
            </span>
          )}
        </div>
        {isOverdue(task.dueDate) && (
          <span className="overdue-warning">⚠️ Overdue</span>
        )}
      </div>
    </div>
  );
}
