import Department from '../models/Department.js';
import Project from '../models/Project.js';
import ProjectTeam from '../models/ProjectTeam.js';
import ResourceRequest from '../models/ResourceRequest.js';
import { createAuditLog, createNotification } from '../utils/activityLogger.js';

const normalizeUserIds = (ids) => {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map((id) => String(id)).filter(Boolean))];
};

export const createResourceRequest = async (req, res) => {
  try {
    const { projectId, departmentId, requestedRoles, requestedMembers } = req.body;

    if (!projectId || !departmentId) {
      return res.status(400).json({ message: 'Project and department are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.user.role === 'project_manager' && String(project.owner) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: project access denied' });
    }

    const department = await Department.findById(departmentId).populate('leader', 'name email');
    if (!department) return res.status(404).json({ message: 'Department not found' });

    const request = await ResourceRequest.create({
      projectId,
      requestedBy: req.user.id,
      departmentId,
      requestedRoles: Array.isArray(requestedRoles) ? requestedRoles : [],
      requestedMembers: normalizeUserIds(requestedMembers),
      approvedMembers: [],
      status: 'pending',
    });

    await createAuditLog({
      action: 'Resource request created',
      entityType: 'project',
      entityId: project._id,
      performedBy: req.user.id,
      metadata: {
        requestId: request._id,
        departmentId,
        requestedRoles: request.requestedRoles,
        requestedMembers: request.requestedMembers,
      },
    });

    const leaderId = department.leader?._id || department.leader;
    if (leaderId) {
      await createNotification({
        message: `New resource request for ${department.name}`,
        type: 'info',
        userId: leaderId,
        relatedEntity: { entityType: 'project', entityId: project._id },
      });
    }

    return res.status(201).json(request);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getProjectRequests = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.user.role === 'project_manager' && String(project.owner) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: project access denied' });
    }

    const requests = await ResourceRequest.find({ projectId })
      .populate('departmentId', 'name')
      .populate('requestedBy', 'name email')
      .populate('approvedMembers', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json(requests);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getDepartmentRequests = async (req, res) => {
  try {
    let departmentIds = [];

    if (req.user.role === 'department_leader') {
      const departments = await Department.find({ leader: req.user.id }).select('_id');
      departmentIds = departments.map((dept) => dept._id);
    }

    const query =
      req.user.role === 'admin'
        ? {}
        : { departmentId: { $in: departmentIds } };

    const requests = await ResourceRequest.find(query)
      .populate('departmentId', 'name leader members')
      .populate('projectId', 'title owner')
      .populate('requestedBy', 'name email')
      .populate('approvedMembers', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json(requests);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const approveResourceRequest = async (req, res) => {
  try {
    const { approvedMembers, teamLeader } = req.body;
    const request = await ResourceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Resource request not found' });

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already reviewed' });
    }

    const department = await Department.findById(request.departmentId);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    if (req.user.role === 'department_leader' && String(department.leader) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: department access denied' });
    }

    const approvedIds = normalizeUserIds(approvedMembers);
    const departmentMemberIds = new Set((department.members || []).map((id) => String(id)));
    const validApproved = approvedIds.filter((id) => departmentMemberIds.has(id));

    request.status = 'approved';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.approvedMembers = validApproved;
    await request.save();

    const project = await Project.findById(request.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const projectTeam =
      (await ProjectTeam.findOne({ projectId: request.projectId })) ||
      (await ProjectTeam.create({
        projectId: request.projectId,
        members: [],
        teamLeader: null,
      }));

    const existingMembers = new Set((projectTeam.members || []).map((id) => String(id)));
    const mergedMembers = [...existingMembers, ...validApproved]
      .map((id) => String(id))
      .filter(Boolean);
    const deduped = [...new Set(mergedMembers)];

    projectTeam.members = deduped;
    if (teamLeader && departmentMemberIds.has(String(teamLeader))) {
      projectTeam.teamLeader = teamLeader;
    } else if (!projectTeam.teamLeader && validApproved.length > 0) {
      projectTeam.teamLeader = validApproved[0];
    }
    await projectTeam.save();

    await createAuditLog({
      action: 'Resource request approved',
      entityType: 'project',
      entityId: project._id,
      performedBy: req.user.id,
      metadata: {
        requestId: request._id,
        approvedMembers: validApproved,
      },
    });

    await createAuditLog({
      action: 'Project team formed',
      entityType: 'project',
      entityId: project._id,
      performedBy: req.user.id,
      metadata: { projectTeamId: projectTeam._id },
    });

    const projectManagerId = project.owner;

    await createNotification({
      message: `Resource request approved for ${department.name}`,
      type: 'success',
      userId: projectManagerId,
      relatedEntity: { entityType: 'project', entityId: project._id },
    });

    for (const memberId of validApproved) {
      await createNotification({
        message: `You were added to project team: ${project.title}`,
        type: 'info',
        userId: memberId,
        relatedEntity: { entityType: 'project', entityId: project._id },
      });
    }

    return res.status(200).json(request);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const rejectResourceRequest = async (req, res) => {
  try {
    const request = await ResourceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Resource request not found' });

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already reviewed' });
    }

    const department = await Department.findById(request.departmentId);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    if (req.user.role === 'department_leader' && String(department.leader) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: department access denied' });
    }

    request.status = 'rejected';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();

    const project = await Project.findById(request.projectId);

    await createAuditLog({
      action: 'Resource request rejected',
      entityType: 'project',
      entityId: request.projectId,
      performedBy: req.user.id,
      metadata: { requestId: request._id },
    });

    if (project) {
      await createNotification({
        message: `Resource request rejected for ${department.name}`,
        type: 'warning',
        userId: project.owner,
        relatedEntity: { entityType: 'project', entityId: project._id },
      });
    }

    return res.status(200).json(request);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
