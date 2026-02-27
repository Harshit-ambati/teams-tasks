import Project from '../models/Project.js';
import ProjectTeam from '../models/ProjectTeam.js';
import ChatRoom from '../models/ChatRoom.js';
import { ensureProjectChatRoom } from '../services/chatRoomService.js';
import { createAuditLog, createNotification } from '../utils/activityLogger.js';

export const getProjects = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      const projectTeams = await ProjectTeam.find({
        $or: [{ teamLeader: req.user.id }, { members: req.user.id }],
      }).select('projectId');
      const teamProjectIds = projectTeams.map((team) => team.projectId);

      query = {
        $or: [{ owner: req.user.id }, { _id: { $in: teamProjectIds } }],
      };
    }

    const projects = await Project.find(query).sort({ createdAt: -1 });
    return res.status(200).json(projects);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getProjectTeam = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const projectTeam = await ProjectTeam.findOne({ projectId: project._id })
      .populate('members', 'name email role')
      .populate('teamLeader', 'name email role');

    if (!projectTeam) {
      return res.status(200).json({
        projectId: project._id,
        members: [],
        teamLeader: null,
      });
    }

    return res.status(200).json(projectTeam);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createProject = async (req, res) => {
  try {
    const { title, description, status, team } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const project = await Project.create({
      title,
      description,
      status,
      team,
      owner: req.user.id,
    });
    await ensureProjectChatRoom({ project, performedBy: req.user.id });

    await createAuditLog({
      action: 'Project created',
      entityType: 'project',
      entityId: project._id,
      performedBy: req.user.id,
      metadata: { title: project.title, status: project.status },
    });

    await createNotification({
      message: `New project created: ${project.title}`,
      type: 'success',
      userId: req.user.id,
      relatedEntity: { entityType: 'project', entityId: project._id },
    });

    return res.status(201).json(project);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.user.role !== 'admin' && String(project.owner || '') !== String(req.user.id)) {
      const projectTeam = await ProjectTeam.findOne({
        projectId: project._id,
        $or: [{ teamLeader: req.user.id }, { members: req.user.id }],
      }).select('_id');

      if (!projectTeam) {
        return res.status(403).json({ message: 'Forbidden: project access denied' });
      }
    }

    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const query =
      req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, owner: req.user.id };
    const project = await Project.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true,
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await ensureProjectChatRoom({ project, performedBy: req.user.id });

    await createAuditLog({
      action: 'Project updated',
      entityType: 'project',
      entityId: project._id,
      performedBy: req.user.id,
      metadata: { updates: req.body },
    });

    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const query =
      req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, owner: req.user.id };
    const project = await Project.findOneAndDelete(query);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await ChatRoom.deleteOne({ type: 'project', projectId: project._id });

    await createAuditLog({
      action: 'Project deleted',
      entityType: 'project',
      entityId: project._id,
      performedBy: req.user.id,
      metadata: { title: project.title },
    });

    await createNotification({
      message: `Project deleted: ${project.title}`,
      type: 'warning',
      userId: req.user.id,
      relatedEntity: { entityType: 'project', entityId: project._id },
    });

    return res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
