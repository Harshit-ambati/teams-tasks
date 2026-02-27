import ChatRoom from '../models/ChatRoom.js';
import ProjectTeam from '../models/ProjectTeam.js';
import User from '../models/User.js';
import { createAuditLog } from '../utils/activityLogger.js';

const dedupeIds = (ids = []) => [...new Set(ids.map((id) => String(id)).filter(Boolean))];

const createRoomAudit = async ({ room, performedBy, action = 'Chat room created' }) => {
  if (!performedBy) return;
  await createAuditLog({
    action,
    entityType: 'chat_room',
    entityId: room._id,
    performedBy,
    metadata: {
      roomType: room.type,
      teamId: room.teamId || null,
      projectId: room.projectId || null,
      memberCount: room.members?.length || 0,
    },
  });
};

export const ensureGlobalChatRoom = async ({ performedBy = null } = {}) => {
  const allUsers = await User.find({}, '_id').lean();
  const allMemberIds = dedupeIds(allUsers.map((user) => user._id));
  const actorId = performedBy || allMemberIds[0] || null;

  let room = await ChatRoom.findOne({ type: 'global' });
  if (!room) {
    room = await ChatRoom.create({
      type: 'global',
      name: 'Global Organization',
      members: allMemberIds,
    });
    await createRoomAudit({ room, performedBy: actorId, action: 'Global chat room created' });
    return room;
  }

  const existing = new Set((room.members || []).map((id) => String(id)));
  const missing = allMemberIds.filter((id) => !existing.has(id));
  if (missing.length > 0) {
    room.members = dedupeIds([...(room.members || []), ...missing]);
    await room.save();
  }

  return room;
};

export const addUserToGlobalRoom = async (userId) => {
  if (!userId) return null;
  await ensureGlobalChatRoom({ performedBy: userId });
  return ChatRoom.findOneAndUpdate(
    { type: 'global' },
    { $addToSet: { members: userId } },
    { new: true }
  );
};

export const ensureTeamChatRoom = async ({ team, performedBy }) => {
  if (!team?._id) return null;

  const members = dedupeIds([team.owner, ...(team.members || [])]);
  let room = await ChatRoom.findOne({ type: 'team', teamId: team._id });
  if (!room) {
    room = await ChatRoom.create({
      type: 'team',
      name: `Team: ${team.name}`,
      teamId: team._id,
      members,
    });
    await createRoomAudit({ room, performedBy, action: 'Team chat room created' });
    return room;
  }

  room.name = `Team: ${team.name}`;
  room.members = members;
  await room.save();
  return room;
};

const resolveProjectMemberIds = async (project) => {
  const projectTeam = await ProjectTeam.findOne({ projectId: project._id }).select('members teamLeader').lean();
  return dedupeIds([project.owner, ...(projectTeam?.members || []), projectTeam?.teamLeader]);
};

export const ensureProjectChatRoom = async ({ project, performedBy }) => {
  if (!project?._id) return null;
  const members = await resolveProjectMemberIds(project);

  let room = await ChatRoom.findOne({ type: 'project', projectId: project._id });
  if (!room) {
    room = await ChatRoom.create({
      type: 'project',
      name: `Project: ${project.title}`,
      projectId: project._id,
      members,
    });
    await createRoomAudit({ room, performedBy, action: 'Project chat room created' });
    return room;
  }

  room.name = `Project: ${project.title}`;
  room.members = members;
  await room.save();
  return room;
};

export const syncProjectChatMembers = async ({ projectId, performedBy = null }) => {
  const { default: Project } = await import('../models/Project.js');
  const project = await Project.findById(projectId);
  if (!project) return null;
  return ensureProjectChatRoom({ project, performedBy: performedBy || project.owner });
};

export const getOrCreatePrivateRoom = async ({ userAId, userBId, performedBy, roomType = 'private' }) => {
  const ids = dedupeIds([userAId, userBId]).sort();
  if (ids.length !== 2) {
    throw new Error('Private chat requires two distinct users');
  }
  const normalizedType = roomType === 'ai' ? 'ai' : 'private';

  const existing = await ChatRoom.findOne({
    type: normalizedType,
    members: { $all: ids, $size: 2 },
  });
  if (existing) return existing;

  const room = await ChatRoom.create({
    type: normalizedType,
    name: '',
    members: ids,
  });
  await createRoomAudit({
    room,
    performedBy,
    action: normalizedType === 'ai' ? 'AI chat room created' : 'Private chat room created',
  });
  return room;
};
