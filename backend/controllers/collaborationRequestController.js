import CollaborationRequest from '../models/CollaborationRequest.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { createAuditLog, createNotification } from '../utils/activityLogger.js';
import { canAccessTaskForRole } from '../services/taskWorkflowService.js';

const hydrateRequest = (id) =>
  CollaborationRequest.findById(id)
    .populate('requestedBy', 'name email role')
    .populate('requestedTo', 'name email role')
    .populate('approvedBy', 'name email role');

export const createCollaborationRequest = async (req, res) => {
  try {
    const { taskId, requestedTo, reason } = req.body;
    if (!taskId || !requestedTo || !reason?.trim()) {
      return res.status(400).json({ message: 'taskId, requestedTo and reason are required' });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (String(task.assignedTo || '') !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only assigned task member can request collaboration' });
    }

    const request = await CollaborationRequest.create({
      taskId,
      requestedBy: req.user.id,
      requestedTo,
      reason: reason.trim(),
      status: 'Pending',
    });

    await createAuditLog({
      action: 'Collaboration request created',
      entityType: 'collaboration_request',
      entityId: request._id,
      performedBy: req.user.id,
      metadata: { taskId, requestedTo },
    });

    await createNotification({
      message: `Collaboration requested on task: ${task.title}`,
      type: 'info',
      userId: requestedTo,
      relatedEntity: { entityType: 'collaboration_request', entityId: request._id },
    });

    const hydrated = await hydrateRequest(request._id);
    return res.status(201).json(hydrated);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getCollaborationRequestsByTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const roleAllowed = ['admin', 'project_manager', 'department_leader', 'team_leader'].includes(req.user.role);
    const participantAllowed =
      String(task.assignedTo || '') === String(req.user.id) ||
      (task.collaborators || []).some((id) => String(id) === String(req.user.id));

    if (!roleAllowed && !participantAllowed) {
      const taskAllowed = await canAccessTaskForRole({ task, user: req.user });
      if (!taskAllowed) {
        return res.status(403).json({ message: 'Forbidden: task access denied' });
      }
    }

    const requests = await CollaborationRequest.find({ taskId })
      .populate('requestedBy', 'name email role')
      .populate('requestedTo', 'name email role')
      .populate('approvedBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json(requests);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const approveCollaborationRequest = async (req, res) => {
  try {
    const request = await CollaborationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Collaboration request not found' });
    if (request.status !== 'Pending') {
      return res.status(400).json({ message: 'Request already reviewed' });
    }

    const task = await Task.findById(request.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    request.status = 'Approved';
    request.approvedBy = req.user.id;
    await request.save();

    const collaboratorId = String(request.requestedTo);
    const collabSet = new Set((task.collaborators || []).map((id) => String(id)));
    if (collaboratorId !== String(task.assignedTo || '')) {
      collabSet.add(collaboratorId);
    }
    task.collaborators = [...collabSet];
    await task.save();

    await createAuditLog({
      action: 'Collaboration request approved',
      entityType: 'collaboration_request',
      entityId: request._id,
      performedBy: req.user.id,
      metadata: { taskId: task._id, requestedTo: request.requestedTo },
    });

    const project = task.project ? await Project.findById(task.project).select('owner') : null;
    const notifyTargets = new Set([
      String(task.assignedTo || ''),
      String(request.requestedTo || ''),
      String(project?.owner || ''),
    ]);

    for (const userId of notifyTargets) {
      if (!userId) continue;
      await createNotification({
        message: `Collaboration approved for task: ${task.title}`,
        type: 'success',
        userId,
        relatedEntity: { entityType: 'collaboration_request', entityId: request._id },
      });
    }

    const hydrated = await hydrateRequest(request._id);
    return res.status(200).json(hydrated);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const rejectCollaborationRequest = async (req, res) => {
  try {
    const request = await CollaborationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Collaboration request not found' });
    if (request.status !== 'Pending') {
      return res.status(400).json({ message: 'Request already reviewed' });
    }

    request.status = 'Rejected';
    request.approvedBy = req.user.id;
    await request.save();

    await createAuditLog({
      action: 'Collaboration request rejected',
      entityType: 'collaboration_request',
      entityId: request._id,
      performedBy: req.user.id,
      metadata: { taskId: request.taskId },
    });

    await createNotification({
      message: 'Your collaboration request was rejected',
      type: 'warning',
      userId: request.requestedBy,
      relatedEntity: { entityType: 'collaboration_request', entityId: request._id },
    });

    const hydrated = await hydrateRequest(request._id);
    return res.status(200).json(hydrated);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
