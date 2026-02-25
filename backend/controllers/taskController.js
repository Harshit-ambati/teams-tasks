import Task from '../models/Task.js';
import ProjectTeam from '../models/ProjectTeam.js';
import { createAuditLog, createNotification } from '../utils/activityLogger.js';

const baseTaskPopulate = () =>
  Task.find().populate('assignedTo', 'name email role').populate('collaborators', 'name email role');

export const getTasks = async (req, res) => {
  try {
    let query = {
      $or: [{ createdBy: req.user.id }, { assignedTo: req.user.id }, { collaborators: req.user.id }],
    };
    if (req.user.role === 'admin') {
      query = {};
    } else if (req.user.role === 'team_leader') {
      const leadTeams = await ProjectTeam.find({ teamLeader: req.user.id }).select('projectId');
      const projectIds = leadTeams.map((team) => team.projectId);
      query = {
        $or: [
          { createdBy: req.user.id },
          { assignedTo: req.user.id },
          { collaborators: req.user.id },
          { project: { $in: projectIds } },
        ],
      };
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .populate('collaborators', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    let query = { project: projectId };

    if (req.user.role === 'team_leader') {
      const projectTeam = await ProjectTeam.findOne({
        projectId,
        teamLeader: req.user.id,
      });
      if (!projectTeam) {
        query = {
          project: projectId,
          $or: [{ createdBy: req.user.id }, { assignedTo: req.user.id }, { collaborators: req.user.id }],
        };
      }
    } else if (req.user.role !== 'admin') {
      query = {
        project: projectId,
        $or: [{ createdBy: req.user.id }, { assignedTo: req.user.id }, { collaborators: req.user.id }],
      };
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .populate('collaborators', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, project, team, assignedTo, collaborators } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    if (req.user.role === 'team_leader' && project) {
      const projectTeam = await ProjectTeam.findOne({
        projectId: project,
        teamLeader: req.user.id,
      });
      if (!projectTeam) {
        return res.status(403).json({ message: 'Forbidden: team leader access denied' });
      }
    }

    const normalizedCollaborators = Array.isArray(collaborators)
      ? [...new Set(collaborators.map((id) => String(id)).filter(Boolean))]
      : [];

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      project,
      team,
      assignedTo,
      collaborators: normalizedCollaborators,
      progressPercentage: 0,
      subtasks: [],
      createdBy: req.user.id,
    });

    await createAuditLog({
      action: 'Task created',
      entityType: 'task',
      entityId: task._id,
      performedBy: req.user.id,
      metadata: { title: task.title, status: task.status, assignedTo: task.assignedTo || null },
    });

    const notifyUsers = new Set([String(assignedTo || ''), ...normalizedCollaborators]);
    for (const userId of notifyUsers) {
      if (!userId || userId === String(req.user.id)) continue;
      await createNotification({
        message: `Task assigned: ${task.title}`,
        type: 'info',
        userId,
        relatedEntity: { entityType: 'task', entityId: task._id },
      });
    }

    const created = await Task.findById(task._id)
      .populate('assignedTo', 'name email role')
      .populate('collaborators', 'name email role');

    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('collaborators', 'name email role');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isCollaborator = (task.collaborators || []).some(
      (user) => String(user?._id || user) === String(req.user.id)
    );

    if (
      req.user.role === 'team_member' &&
      String(task.assignedTo?._id || task.assignedTo || '') !== String(req.user.id) &&
      !isCollaborator
    ) {
      return res.status(403).json({ message: 'Forbidden: task access denied' });
    }

    if (req.user.role === 'team_leader') {
      const projectTeam = await ProjectTeam.findOne({
        projectId: task.project,
        teamLeader: req.user.id,
      });
      if (!projectTeam) {
        return res.status(403).json({ message: 'Forbidden: team leader access denied' });
      }
    }

    if (
      req.user.role === 'project_manager' &&
      String(task.createdBy || '') !== String(req.user.id)
    ) {
      return res.status(403).json({ message: 'Forbidden: project access denied' });
    }

    return res.status(200).json(task);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const role = req.user.role || 'team_member';
    let existingTask = null;

    if (role === 'admin') {
      existingTask = await Task.findById(req.params.id);
    } else if (role === 'team_member' || role === 'team_leader') {
      existingTask = await Task.findById(req.params.id);
    } else {
      existingTask = await Task.findOne({ _id: req.params.id, createdBy: req.user.id });
    }

    if (!existingTask) return res.status(404).json({ message: 'Task not found' });

    const isTeamMember = role === 'team_member';
    const isAssignedUser = String(existingTask.assignedTo || '') === String(req.user.id);
    const isCollaborator = (existingTask.collaborators || []).some(
      (id) => String(id) === String(req.user.id)
    );

    if (role === 'team_leader') {
      const projectTeam = await ProjectTeam.findOne({
        projectId: existingTask.project,
        teamLeader: req.user.id,
      });
      if (!projectTeam) {
        return res.status(403).json({ message: 'Forbidden: team leader access denied' });
      }
    }

    if (isTeamMember && !isAssignedUser && !isCollaborator) {
      return res.status(403).json({ message: 'Forbidden: task updates limited to assignees/collaborators' });
    }

    if (req.body.assignedTo && !['admin', 'project_manager', 'team_leader'].includes(role)) {
      return res.status(403).json({ message: 'Forbidden: cannot assign tasks' });
    }

    if (req.body.collaborators && !['admin', 'project_manager', 'team_leader'].includes(role)) {
      return res.status(403).json({ message: 'Forbidden: cannot manage collaborators' });
    }

    const task = await Task.findOneAndUpdate({ _id: req.params.id }, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('assignedTo', 'name email role')
      .populate('collaborators', 'name email role');

    const statusChanged = req.body.status && req.body.status !== existingTask.status;
    const assigneeChanged =
      req.body.assignedTo && String(req.body.assignedTo) !== String(existingTask.assignedTo || '');

    await createAuditLog({
      action: statusChanged ? 'Task status changed' : 'Task updated',
      entityType: 'task',
      entityId: task._id,
      performedBy: req.user.id,
      metadata: { updates: req.body },
    });

    if (assigneeChanged) {
      await createNotification({
        message: `Task assigned: ${task.title}`,
        type: 'info',
        userId: req.body.assignedTo,
        relatedEntity: { entityType: 'task', entityId: task._id },
      });
    }

    if (statusChanged) {
      const notifyUserId = String(task.assignedTo?._id || task.assignedTo || req.user.id);
      await createNotification({
        message: `Task status updated: ${task.title} -> ${task.status}`,
        type: 'success',
        userId: notifyUserId,
        relatedEntity: { entityType: 'task', entityId: task._id },
      });
    }

    return res.status(200).json(task);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const query =
      req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, createdBy: req.user.id };
    const task = await Task.findOneAndDelete(query);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await createAuditLog({
      action: 'Task deleted',
      entityType: 'task',
      entityId: task._id,
      performedBy: req.user.id,
      metadata: { title: task.title },
    });

    return res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
