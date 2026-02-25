import Task from '../models/Task.js';
import Subtask from '../models/Subtask.js';
import { createAuditLog, createNotification } from '../utils/activityLogger.js';
import { canAccessTaskForRole, recalculateParentTaskProgress } from '../services/taskWorkflowService.js';

const hydrateSubtask = (id) =>
  Subtask.findById(id)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role');

export const createSubtask = async (req, res) => {
  try {
    const { parentTaskId, title, description, assignedTo, status } = req.body;
    if (!parentTaskId || !title) {
      return res.status(400).json({ message: 'parentTaskId and title are required' });
    }

    const parentTask = await Task.findById(parentTaskId);
    if (!parentTask) return res.status(404).json({ message: 'Parent task not found' });

    const allowed = await canAccessTaskForRole({ task: parentTask, user: req.user });
    if (!allowed) return res.status(403).json({ message: 'Forbidden: task access denied' });

    const subtask = await Subtask.create({
      parentTaskId,
      title,
      description,
      assignedTo,
      status: status || 'Todo',
      createdBy: req.user.id,
    });

    await Task.findByIdAndUpdate(parentTaskId, { $addToSet: { subtasks: subtask._id } });
    await recalculateParentTaskProgress(parentTaskId);

    await createAuditLog({
      action: 'Subtask created',
      entityType: 'subtask',
      entityId: subtask._id,
      performedBy: req.user.id,
      metadata: { parentTaskId, title: subtask.title },
    });

    if (assignedTo && String(assignedTo) !== String(req.user.id)) {
      await createNotification({
        message: `Subtask assigned: ${subtask.title}`,
        type: 'info',
        userId: assignedTo,
        relatedEntity: { entityType: 'subtask', entityId: subtask._id },
      });
    }

    const hydrated = await hydrateSubtask(subtask._id);
    return res.status(201).json(hydrated);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getSubtasksByTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const allowed = await canAccessTaskForRole({ task, user: req.user });
    if (!allowed) return res.status(403).json({ message: 'Forbidden: task access denied' });

    const subtasks = await Subtask.find({ parentTaskId: taskId })
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json(subtasks);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateSubtask = async (req, res) => {
  try {
    const subtask = await Subtask.findById(req.params.id);
    if (!subtask) return res.status(404).json({ message: 'Subtask not found' });

    const task = await Task.findById(subtask.parentTaskId);
    if (!task) return res.status(404).json({ message: 'Parent task not found' });

    const allowed = await canAccessTaskForRole({ task, user: req.user });
    if (!allowed) return res.status(403).json({ message: 'Forbidden: task access denied' });

    const prevStatus = subtask.status;
    const prevAssignee = String(subtask.assignedTo || '');

    const next = await Subtask.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    await recalculateParentTaskProgress(next.parentTaskId);

    if (prevStatus !== 'Completed' && next.status === 'Completed') {
      await createAuditLog({
        action: 'Subtask completed',
        entityType: 'subtask',
        entityId: next._id,
        performedBy: req.user.id,
        metadata: { parentTaskId: next.parentTaskId },
      });
    } else {
      await createAuditLog({
        action: 'Subtask updated',
        entityType: 'subtask',
        entityId: next._id,
        performedBy: req.user.id,
        metadata: { updates: req.body },
      });
    }

    const nextAssignee = String(next.assignedTo?._id || next.assignedTo || '');
    if (nextAssignee && nextAssignee !== prevAssignee && nextAssignee !== String(req.user.id)) {
      await createNotification({
        message: `Subtask assigned: ${next.title}`,
        type: 'info',
        userId: nextAssignee,
        relatedEntity: { entityType: 'subtask', entityId: next._id },
      });
    }

    return res.status(200).json(next);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteSubtask = async (req, res) => {
  try {
    const subtask = await Subtask.findById(req.params.id);
    if (!subtask) return res.status(404).json({ message: 'Subtask not found' });

    const task = await Task.findById(subtask.parentTaskId);
    if (!task) return res.status(404).json({ message: 'Parent task not found' });

    const allowed = await canAccessTaskForRole({ task, user: req.user });
    if (!allowed) return res.status(403).json({ message: 'Forbidden: task access denied' });

    await Subtask.findByIdAndDelete(subtask._id);
    await Task.findByIdAndUpdate(subtask.parentTaskId, { $pull: { subtasks: subtask._id } });
    await recalculateParentTaskProgress(subtask.parentTaskId);

    await createAuditLog({
      action: 'Subtask deleted',
      entityType: 'subtask',
      entityId: subtask._id,
      performedBy: req.user.id,
      metadata: { parentTaskId: subtask.parentTaskId, title: subtask.title },
    });

    return res.status(200).json({ message: 'Subtask deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
