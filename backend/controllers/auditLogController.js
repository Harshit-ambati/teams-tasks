import AuditLog from '../models/AuditLog.js';

export const getAuditLogs = async (req, res) => {
  try {
    const { entityType, from, to } = req.query;
    const query = {};

    if (entityType) {
      query.entityType = entityType;
    }

    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const logs = await AuditLog.find(query)
      .populate('performedBy', 'name email')
      .sort({ timestamp: -1 });

    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getProjectAuditLogs = async (req, res) => {
  try {
    const { projectId } = req.params;

    const logs = await AuditLog.find({
      $or: [
        { entityType: 'project', entityId: projectId },
        { entityType: 'task', 'metadata.updates.project': projectId },
        { entityType: 'task', 'metadata.projectId': projectId },
      ],
    })
      .populate('performedBy', 'name email role')
      .sort({ timestamp: -1 });

    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
