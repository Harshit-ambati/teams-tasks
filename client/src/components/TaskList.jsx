import TaskItem from './TaskItem';
import '../styles/TaskList.css';

export default function TaskList({
  tasks,
  onToggleStatus,
  onToggleCompletion,
  onEdit,
  onDelete,
  subtasksByTask,
  onCreateSubtask,
  onToggleSubtaskStatus,
  onDeleteSubtask,
  collaborationByTask,
  onCreateCollaborationRequest,
  onApproveRequest,
  onRejectRequest,
  canReviewRequests,
  projectMembersByTask,
  currentUserId,
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
              key={task._id}
              task={task}
              onToggleStatus={() => onToggleStatus(task._id, task.status)}
              onToggleCompletion={() => onToggleCompletion(task._id)}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task._id)}
              subtasks={subtasksByTask[task._id] || []}
              onCreateSubtask={onCreateSubtask}
              onToggleSubtaskStatus={onToggleSubtaskStatus}
              onDeleteSubtask={onDeleteSubtask}
              collaborationRequests={collaborationByTask[task._id] || []}
              onCreateCollaborationRequest={onCreateCollaborationRequest}
              onApproveRequest={onApproveRequest}
              onRejectRequest={onRejectRequest}
              canReviewRequests={canReviewRequests}
              projectMembers={projectMembersByTask[task._id] || []}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
