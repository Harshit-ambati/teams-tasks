import Task from '../models/Task.js';
import Subtask from '../models/Subtask.js';

export const recalculateParentTaskProgress = async (parentTaskId) => {
  const [parentTask, totalSubtasks, completedSubtasks] = await Promise.all([
    Task.findById(parentTaskId),
    Subtask.countDocuments({ parentTaskId }),
    Subtask.countDocuments({ parentTaskId, status: 'Completed' }),
  ]);

  if (!parentTask) return null;

  const progressPercentage =
    totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

  parentTask.progressPercentage = progressPercentage;

  if (totalSubtasks > 0 && completedSubtasks === totalSubtasks) {
    parentTask.status = 'completed';
  } else if (totalSubtasks > 0 && completedSubtasks < totalSubtasks && parentTask.status === 'completed') {
    parentTask.status = 'in-progress';
  }

  await parentTask.save();
  return parentTask;
};

export const canAccessTaskForRole = async ({ task, user }) => {
  if (!task || !user) return false;

  const userId = String(user.id);
  const role = user.role;

  if (role === 'admin') return true;
  if (role === 'project_manager') return String(task.createdBy || '') === userId;

  if (role === 'team_leader') {
    const { default: ProjectTeam } = await import('../models/ProjectTeam.js');
    const projectTeam = await ProjectTeam.findOne({
      projectId: task.project,
      teamLeader: userId,
    }).select('_id');

    return Boolean(projectTeam);
  }

  const assignee = String(task.assignedTo || '');
  const collaborators = (task.collaborators || []).map((id) => String(id));
  return assignee === userId || collaborators.includes(userId) || String(task.createdBy || '') === userId;
};
