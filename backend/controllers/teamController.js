import Team from '../models/Team.js';
import ChatRoom from '../models/ChatRoom.js';
import { ensureTeamChatRoom } from '../services/chatRoomService.js';
import { createAuditLog, createNotification } from '../utils/activityLogger.js';

export const getTeams = async (req, res) => {
  try {
    const teams = await Team.find({ owner: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json(teams);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createTeam = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const team = await Team.create({
      name,
      description,
      members: Array.isArray(members) ? members : [],
      owner: req.user.id,
    });
    await ensureTeamChatRoom({ team, performedBy: req.user.id });

    await createAuditLog({
      action: 'Team created',
      entityType: 'team',
      entityId: team._id,
      performedBy: req.user.id,
      metadata: { name: team.name },
    });

    const addedMembers = Array.isArray(team.members) ? team.members : [];
    for (const memberId of addedMembers) {
      await createNotification({
        message: `You were added to team: ${team.name}`,
        type: 'info',
        userId: memberId,
        relatedEntity: { entityType: 'team', entityId: team._id },
      });
    }

    return res.status(201).json(team);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTeamById = async (req, res) => {
  try {
    const query =
      req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, owner: req.user.id };
    const team = await Team.findOne(query);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    return res.status(200).json(team);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateTeam = async (req, res) => {
  try {
    const query =
      req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, owner: req.user.id };
    const existingTeam = await Team.findOne(query);
    if (!existingTeam) return res.status(404).json({ message: 'Team not found' });

    const team = await Team.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true,
    });
    await ensureTeamChatRoom({ team, performedBy: req.user.id });

    await createAuditLog({
      action: 'Team updated',
      entityType: 'team',
      entityId: team._id,
      performedBy: req.user.id,
      metadata: { updates: req.body },
    });

    const previousMembers = new Set((existingTeam.members || []).map((id) => String(id)));
    const nextMembers = Array.isArray(req.body.members)
      ? req.body.members.map((id) => String(id))
      : [];
    const addedMembers = nextMembers.filter((id) => !previousMembers.has(id));

    for (const memberId of addedMembers) {
      await createNotification({
        message: `You were added to team: ${team.name}`,
        type: 'info',
        userId: memberId,
        relatedEntity: { entityType: 'team', entityId: team._id },
      });
    }

    return res.status(200).json(team);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteTeam = async (req, res) => {
  try {
    const query =
      req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, owner: req.user.id };
    const team = await Team.findOneAndDelete(query);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    await ChatRoom.deleteOne({ type: 'team', teamId: team._id });

    await createAuditLog({
      action: 'Team deleted',
      entityType: 'team',
      entityId: team._id,
      performedBy: req.user.id,
      metadata: { name: team.name },
    });

    return res.status(200).json({ message: 'Team deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
