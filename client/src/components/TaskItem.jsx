import { useMemo, useState } from 'react';
import '../styles/TaskItem.css';

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12l5 5 9-9" />
    </svg>
  );
}

const subtaskStatusCycle = {
  Todo: 'InProgress',
  InProgress: 'Completed',
  Completed: 'Todo',
};

export default function TaskItem({
  task,
  onToggleStatus,
  onToggleCompletion,
  onEdit,
  onDelete,
  subtasks = [],
  onCreateSubtask,
  onToggleSubtaskStatus,
  onDeleteSubtask,
  collaborationRequests = [],
  onCreateCollaborationRequest,
  onApproveRequest,
  onRejectRequest,
  canReviewRequests,
  projectMembers = [],
  currentUserId,
}) {
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskDescription, setSubtaskDescription] = useState('');
  const [subtaskAssignee, setSubtaskAssignee] = useState('');
  const [collabRequestedTo, setCollabRequestedTo] = useState('');
  const [collabReason, setCollabReason] = useState('');

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
    if (!status) return 'Unknown';
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

  const assignedToId = String(task.assignedTo?._id || task.assignedTo || '');
  const isAssignedUser = assignedToId === String(currentUserId || '');
  const safeCollaborationRequests = Array.isArray(collaborationRequests) ? collaborationRequests : [];
  const safeSubtasks = Array.isArray(subtasks) ? subtasks : [];
  const safeProjectMembers = Array.isArray(projectMembers) ? projectMembers : [];
  const pendingRequests = safeCollaborationRequests.filter((item) => item.status === 'Pending');

  const collaboratorIds = useMemo(
    () => (Array.isArray(task.collaborators) ? task.collaborators : []).map((user) => String(user?._id || user)),
    [task.collaborators]
  );

  const availableMembersForCollab = safeProjectMembers.filter((member) => {
    const memberId = String(member._id);
    return memberId !== assignedToId && !collaboratorIds.includes(memberId);
  });

  return (
    <div className={`task-item task-${task.status}`}>
      <div className="task-header">
        <div className="task-title-section">
          <button
            className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
            onClick={onToggleCompletion}
            title={task.status === 'completed' ? 'Mark as undone' : 'Mark as done'}
          >
            {task.status === 'completed' && (
              <span className="checkbox-icon">
                <CheckIcon />
              </span>
            )}
          </button>
          <div className="task-title-content">
            <h3 className={task.status === 'completed' ? 'completed' : ''}>{task.title}</h3>
            {task.description && <p className="task-description">{task.description}</p>}
          </div>
        </div>
        <div className="task-actions">
          <button className="task-btn edit-btn" onClick={onEdit} title="Edit task">
            Edit
          </button>
          <button className="task-btn delete-btn" onClick={onDelete} title="Delete task">
            Delete
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
            title="Click to change status (Todo -> In Progress -> Completed)"
          >
            {getStatusLabel(task.status)}
          </button>
          {task.dueDate && (
            <span
              className={`due-date ${isOverdue(task.dueDate) ? 'overdue' : ''}`}
              title={isOverdue(task.dueDate) ? 'Overdue' : 'Due date'}
            >
              Due: {formatDate(task.dueDate)}
            </span>
          )}
          {task.assignedMemberName && (
            <span className="assignee-badge" title={`Assigned to ${task.assignedMemberName}`}>
              {task.assignedMemberName}
            </span>
          )}
        </div>
        {isOverdue(task.dueDate) && <span className="overdue-warning">Overdue</span>}
      </div>

      <div className="task-progress">
        <div className="task-progress-label">
          <span>Subtask Progress</span>
          <span>{task.progressPercentage || 0}%</span>
        </div>
        <div className="task-progress-track">
          <div className="task-progress-fill" style={{ width: `${task.progressPercentage || 0}%` }} />
        </div>
      </div>

      <div className="task-section">
        <h4>Subtasks</h4>
        <div className="subtask-form-row">
          <input
            type="text"
            placeholder="Subtask title"
            value={subtaskTitle}
            onChange={(event) => setSubtaskTitle(event.target.value)}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={subtaskDescription}
            onChange={(event) => setSubtaskDescription(event.target.value)}
          />
          <select
            value={subtaskAssignee}
            onChange={(event) => setSubtaskAssignee(event.target.value)}
          >
            <option value="">Assign user</option>
            {safeProjectMembers.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="task-btn subtask-add-btn"
            onClick={async () => {
              if (!subtaskTitle.trim()) return;
              await onCreateSubtask(task._id, {
                title: subtaskTitle.trim(),
                description: subtaskDescription.trim(),
                assignedTo: subtaskAssignee || undefined,
              });
              setSubtaskTitle('');
              setSubtaskDescription('');
              setSubtaskAssignee('');
            }}
          >
            Add Subtask
          </button>
        </div>
        <div className="subtask-list">
          {safeSubtasks.map((subtask) => (
            <div key={subtask._id} className="subtask-row">
              <div>
                <p className="subtask-title">{subtask.title}</p>
                {subtask.description ? <p className="subtask-desc">{subtask.description}</p> : null}
                <p className="subtask-meta">
                  {subtask.assignedTo?.name || 'Unassigned'} - {subtask.status}
                </p>
              </div>
              <div className="subtask-actions">
                <button
                  type="button"
                  className="task-btn subtask-status-btn"
                  onClick={() => onToggleSubtaskStatus(subtask._id, subtaskStatusCycle[subtask.status] || 'Todo')}
                >
                  Next Status
                </button>
                <button
                  type="button"
                  className="task-btn delete-btn"
                  onClick={() => onDeleteSubtask(subtask._id, task._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {safeSubtasks.length === 0 && <p className="subtask-empty">No subtasks added yet.</p>}
        </div>
      </div>

      <div className="task-section">
        <h4>Collaboration</h4>
        {isAssignedUser && (
          <div className="subtask-form-row">
            <select
              value={collabRequestedTo}
              onChange={(event) => setCollabRequestedTo(event.target.value)}
            >
              <option value="">Select member</option>
              {availableMembersForCollab.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Reason for collaboration"
              value={collabReason}
              onChange={(event) => setCollabReason(event.target.value)}
            />
            <button
              type="button"
              className="task-btn collab-request-btn"
              onClick={async () => {
                if (!collabRequestedTo || !collabReason.trim()) return;
                await onCreateCollaborationRequest(task._id, {
                  requestedTo: collabRequestedTo,
                  reason: collabReason.trim(),
                });
                setCollabRequestedTo('');
                setCollabReason('');
              }}
            >
              Request Collaboration
            </button>
          </div>
        )}

        <div className="subtask-list">
          {safeCollaborationRequests.map((request) => (
            <div key={request._id} className="subtask-row">
              <div>
                <p className="subtask-title">
                  {request.requestedBy?.name}
                  {' -> '}
                  {request.requestedTo?.name}
                </p>
                <p className="subtask-desc">{request.reason}</p>
                <p className="subtask-meta">Status: {request.status}</p>
              </div>
              {canReviewRequests && request.status === 'Pending' && (
                <div className="subtask-actions">
                  <button
                    type="button"
                    className="task-btn collab-approve-btn"
                    onClick={() => onApproveRequest(request._id, task._id)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="task-btn collab-reject-btn"
                    onClick={() => onRejectRequest(request._id, task._id)}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
          {pendingRequests.length === 0 && safeCollaborationRequests.length === 0 && (
            <p className="subtask-empty">No collaboration requests.</p>
          )}
        </div>
      </div>
    </div>
  );
}
