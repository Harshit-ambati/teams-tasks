import ChatRoom from '../models/ChatRoom.js';
import Message from '../models/Message.js';
import MessageHistory from '../models/MessageHistory.js';
import Reaction from '../models/Reaction.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { getAuthorizedMessage, getAuthorizedRoom } from '../services/chatAccessService.js';
import { generateAiResponse } from '../services/aiAssistantService.js';
import { canEditMessage, canPinMessage, isAllowedMessageType } from '../services/chatPolicyService.js';
import { createCloudinarySignature, assertValidFilePayload } from '../services/fileSecurityService.js';
import { ensureGlobalChatRoom, getOrCreatePrivateRoom } from '../services/chatRoomService.js';
import { createAuditLog } from '../utils/activityLogger.js';
import { encryptMetadata } from '../utils/messageCrypto.js';

const toStringId = (value) => (value ? String(value) : '');

const normalizeCursor = (cursor) => {
  if (!cursor) return null;
  const parsed = new Date(cursor);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const parseSearchTokens = (searchTokens = []) => {
  if (Array.isArray(searchTokens)) {
    return [...new Set(searchTokens.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean))].slice(0, 30);
  }
  return String(searchTokens || '')
    .split(/\s+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 30);
};

const roomView = (room, currentUserId) => {
  const plain = room.toObject ? room.toObject() : room;
  const isPrivate = plain.type === 'private';
  const counterpart = isPrivate
    ? (plain.members || []).find((member) => toStringId(member._id || member) !== toStringId(currentUserId))
    : null;

  return {
    _id: plain._id,
    type: plain.type,
    name: isPrivate ? counterpart?.name || 'Private Chat' : plain.name,
    members: plain.members || [],
    projectId: plain.projectId || null,
    teamId: plain.teamId || null,
    pinnedMessages: plain.pinnedMessages || [],
    createdAt: plain.createdAt,
  };
};

const toReadByView = (readBy = []) =>
  (readBy || []).map((entry) => ({
    userId: entry?.userId || null,
    readAt: entry?.readAt || null,
  }));

const messageView = (message, reactionMap = new Map()) => ({
  _id: message._id,
  chatRoomId: message.chatRoomId,
  senderId: message.senderId,
  type: message.type || 'text',
  encryptedContent: message.encryptedContent || '',
  encryptedKeys: message.encryptedKeys || {},
  iv: message.iv || '',
  parentMessageId: message.parentMessageId || null,
  fileUrl: message.fileUrl || '',
  fileName: message.fileName || '',
  fileSize: message.fileSize || 0,
  mimeType: message.mimeType || '',
  encryptedFileMetadata: message.encryptedFileMetadata || '',
  edited: Boolean(message.edited),
  editedAt: message.editedAt || null,
  deleted: Boolean(message.deleted),
  deletedAt: message.deletedAt || null,
  readBy: toReadByView(message.readBy),
  reactions: reactionMap.get(toStringId(message._id)) || [],
  createdAt: message.createdAt,
  updatedAt: message.updatedAt || null,
});

const getReactionMap = async (messageIds = []) => {
  const reactions = await Reaction.find({ messageId: { $in: messageIds } })
    .populate('userId', 'name email role')
    .lean();

  const grouped = new Map();
  reactions.forEach((reaction) => {
    const key = toStringId(reaction.messageId);
    const list = grouped.get(key) || [];
    list.push({
      _id: reaction._id,
      emoji: reaction.emoji,
      userId: reaction.userId,
      createdAt: reaction.createdAt,
    });
    grouped.set(key, list);
  });
  return grouped;
};

const getAiAssistantUser = async () => {
  const aiEmail = process.env.AI_ASSISTANT_EMAIL || 'ai-assistant@local';
  let aiUser = await User.findOne({ email: aiEmail }).select('_id name email role');
  if (!aiUser) {
    const randomSecret = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const hashed = await bcrypt.hash(randomSecret, 10);
    aiUser = await User.create({
      name: 'AI Assistant',
      email: aiEmail,
      password: hashed,
      role: 'team_member',
    });
  }
  return aiUser;
};

export const getChatRooms = async (req, res) => {
  try {
    await ensureGlobalChatRoom({ performedBy: req.user.id });

    const rooms = await ChatRoom.find({ members: req.user.id })
      .populate('members', 'name email role')
      .sort({ updatedAt: -1, createdAt: -1 });

    return res.status(200).json(rooms.map((room) => roomView(room, req.user.id)));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createPrivateRoom = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    if (toStringId(userId) === toStringId(req.user.id)) {
      return res.status(400).json({ message: 'Cannot create private chat with yourself' });
    }

    const targetUser = await User.findById(userId).select('_id');
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const room = await getOrCreatePrivateRoom({
      userAId: req.user.id,
      userBId: userId,
      performedBy: req.user.id,
    });
    const hydrated = await ChatRoom.findById(room._id).populate('members', 'name email role');
    return res.status(201).json(roomView(hydrated, req.user.id));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createAiRoom = async (req, res) => {
  try {
    const aiUser = await getAiAssistantUser();
    const room = await getOrCreatePrivateRoom({
      userAId: req.user.id,
      userBId: aiUser._id,
      performedBy: req.user.id,
      roomType: 'ai',
    });
    room.name = 'AI Assistant';
    await room.save();

    const hydrated = await ChatRoom.findById(room._id).populate('members', 'name email role');
    return res.status(201).json(roomView(hydrated, req.user.id));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMessagesByRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await getAuthorizedRoom({ roomId: id, userId: req.user.id });
    if (!room) return res.status(403).json({ message: 'Forbidden: room access denied' });

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const cursorDate = normalizeCursor(req.query.cursor || req.query.before);
    const threadId = req.query.threadId ? String(req.query.threadId) : null;
    const includeDeleted = String(req.query.includeDeleted || 'false') === 'true';

    const query = { chatRoomId: id };
    if (!includeDeleted) query.deleted = { $ne: true };
    if (cursorDate) query.createdAt = { $lt: cursorDate };
    if (threadId) query.parentMessageId = threadId;

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'name email role')
      .lean();

    const ordered = messages.reverse();
    const reactionMap = await getReactionMap(ordered.map((item) => item._id));
    return res.status(200).json(ordered.map((message) => messageView(message, reactionMap)));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getPinnedMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await getAuthorizedRoom({ roomId: id, userId: req.user.id });
    if (!room) return res.status(403).json({ message: 'Forbidden: room access denied' });

    const messages = await Message.find({ _id: { $in: room.pinnedMessages || [] } })
      .populate('senderId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
    const reactionMap = await getReactionMap(messages.map((item) => item._id));
    return res.status(200).json(messages.map((item) => messageView(item, reactionMap)));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const pinMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    if (!canPinMessage(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role to pin messages' });
    }

    const room = await getAuthorizedRoom({ roomId: id, userId: req.user.id });
    if (!room) return res.status(403).json({ message: 'Forbidden: room access denied' });

    const message = await Message.findOne({ _id: messageId, chatRoomId: id, deleted: { $ne: true } });
    if (!message) return res.status(404).json({ message: 'Message not found' });

    await ChatRoom.updateOne({ _id: id }, { $addToSet: { pinnedMessages: messageId } });
    await createAuditLog({
      action: 'Message pinned',
      entityType: 'message',
      entityId: messageId,
      performedBy: req.user.id,
      metadata: { chatRoomId: id },
    });
    return res.status(200).json({ message: 'Pinned' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const unpinMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    if (!canPinMessage(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role to unpin messages' });
    }

    const room = await getAuthorizedRoom({ roomId: id, userId: req.user.id });
    if (!room) return res.status(403).json({ message: 'Forbidden: room access denied' });
    await ChatRoom.updateOne({ _id: id }, { $pull: { pinnedMessages: messageId } });

    await createAuditLog({
      action: 'Message unpinned',
      entityType: 'message',
      entityId: messageId,
      performedBy: req.user.id,
      metadata: { chatRoomId: id },
    });
    return res.status(200).json({ message: 'Unpinned' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markRoomAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await getAuthorizedRoom({ roomId: id, userId: req.user.id });
    if (!room) return res.status(403).json({ message: 'Forbidden: room access denied' });

    await Message.updateMany(
      { chatRoomId: id, 'readBy.userId': { $ne: req.user.id } },
      { $addToSet: { readBy: { userId: req.user.id, readAt: new Date() } } }
    );

    return res.status(200).json({ message: 'Marked as read' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const authorized = await getAuthorizedMessage({ messageId: id, userId: req.user.id });
    if (!authorized) return res.status(403).json({ message: 'Forbidden: message access denied' });

    const { message } = authorized;
    if (!canEditMessage({ message, actorId: req.user.id, actorRole: req.user.role })) {
      return res.status(403).json({ message: 'Edit window expired or insufficient permissions' });
    }

    const {
      type = message.type,
      encryptedContent = message.encryptedContent,
      encryptedKeys = message.encryptedKeys || {},
      iv = message.iv,
      fileUrl = message.fileUrl,
      fileName = message.fileName,
      fileSize = message.fileSize,
      mimeType = message.mimeType,
      metadata = {},
      searchTokens = message.searchTokens || [],
      reason = '',
    } = req.body || {};

    if (!isAllowedMessageType(type)) {
      return res.status(400).json({ message: 'Unsupported message type' });
    }
    assertValidFilePayload({ fileUrl, fileSize, mimeType, type });

    await MessageHistory.create({
      messageId: message._id,
      editedBy: req.user.id,
      previousType: message.type,
      previousEncryptedContent: message.encryptedContent,
      previousEncryptedKeys: message.encryptedKeys || {},
      previousIv: message.iv,
      previousEncryptedFileMetadata: message.encryptedFileMetadata,
      reason: String(reason || ''),
    });

    const encryptedFileMetadata = encryptMetadata(metadata);
    message.type = type;
    message.encryptedContent = encryptedContent;
    message.encryptedKeys = encryptedKeys;
    message.iv = iv;
    message.fileUrl = fileUrl || '';
    message.fileName = fileName || '';
    message.fileSize = Number(fileSize || 0);
    message.mimeType = mimeType || '';
    message.encryptedFileMetadata = encryptedFileMetadata;
    message.searchTokens = parseSearchTokens(searchTokens);
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    await createAuditLog({
      action: 'Chat message edited',
      entityType: 'message_history',
      entityId: message._id,
      performedBy: req.user.id,
      metadata: { chatRoomId: message.chatRoomId, reason: String(reason || '') },
    });

    const hydrated = await Message.findById(message._id).populate('senderId', 'name email role').lean();
    const reactionMap = await getReactionMap([message._id]);
    return res.status(200).json(messageView(hydrated, reactionMap));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const authorized = await getAuthorizedMessage({ messageId: id, userId: req.user.id });
    if (!authorized) return res.status(403).json({ message: 'Forbidden: message access denied' });

    const { message } = authorized;
    const isAdmin = req.user.role === 'admin';
    const isSender = toStringId(message.senderId) === toStringId(req.user.id);
    if (!isAdmin && !isSender) {
      return res.status(403).json({ message: 'Forbidden: only sender or admin can delete message' });
    }

    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();

    await createAuditLog({
      action: 'Chat message soft-deleted',
      entityType: 'message',
      entityId: message._id,
      performedBy: req.user.id,
      metadata: { chatRoomId: message.chatRoomId },
    });

    return res.status(200).json({ message: 'Message soft-deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const toggleReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body || {};
    if (!emoji) return res.status(400).json({ message: 'emoji is required' });

    const authorized = await getAuthorizedMessage({ messageId: id, userId: req.user.id });
    if (!authorized) return res.status(403).json({ message: 'Forbidden: message access denied' });

    const existing = await Reaction.findOne({ messageId: id, userId: req.user.id, emoji });
    let action = 'added';
    if (existing) {
      await Reaction.deleteOne({ _id: existing._id });
      action = 'removed';
    } else {
      await Reaction.create({ messageId: id, userId: req.user.id, emoji });
    }

    const reactions = await Reaction.find({ messageId: id }).populate('userId', 'name email role').lean();
    await createAuditLog({
      action: `Reaction ${action}`,
      entityType: 'reaction',
      entityId: id,
      performedBy: req.user.id,
      metadata: { emoji, action },
    });

    return res.status(200).json({
      action,
      reactions: reactions.map((reaction) => ({
        _id: reaction._id,
        emoji: reaction.emoji,
        userId: reaction.userId,
        createdAt: reaction.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMessageReactions = async (req, res) => {
  try {
    const { id } = req.params;
    const authorized = await getAuthorizedMessage({ messageId: id, userId: req.user.id });
    if (!authorized) return res.status(403).json({ message: 'Forbidden: message access denied' });

    const reactions = await Reaction.find({ messageId: id }).populate('userId', 'name email role').lean();
    return res.status(200).json(
      reactions.map((reaction) => ({
        _id: reaction._id,
        emoji: reaction.emoji,
        userId: reaction.userId,
        createdAt: reaction.createdAt,
      }))
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getChatUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }, 'name email role rsaPublicKey rsaKeyVersion').sort({
      name: 1,
    });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const registerPublicKey = async (req, res) => {
  try {
    const { publicKey } = req.body || {};
    if (!publicKey || String(publicKey).length < 100) {
      return res.status(400).json({ message: 'Valid publicKey is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        rsaPublicKey: String(publicKey),
        $inc: { rsaKeyVersion: 1 },
      },
      { new: true }
    ).select('_id rsaPublicKey rsaKeyVersion');

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getRoomPublicKeys = async (req, res) => {
  try {
    const { roomId } = req.query;
    if (!roomId) return res.status(400).json({ message: 'roomId is required' });
    const room = await getAuthorizedRoom({ roomId, userId: req.user.id });
    if (!room) return res.status(403).json({ message: 'Forbidden: room access denied' });

    const keys = await User.find(
      { _id: { $in: room.members } },
      '_id name email rsaPublicKey rsaKeyVersion'
    ).lean();

    return res.status(200).json(keys);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const cursorDate = normalizeCursor(req.query.cursor);
    if (!query) return res.status(400).json({ message: 'query is required' });

    const roomIds = await ChatRoom.find({ members: req.user.id }).distinct('_id');
    const mongoQuery = {
      chatRoomId: { $in: roomIds },
      deleted: { $ne: true },
      $text: { $search: query },
    };
    if (req.query.userId) mongoQuery.senderId = req.query.userId;
    if (req.query.fileType) mongoQuery.mimeType = new RegExp(String(req.query.fileType), 'i');
    if (req.query.from || req.query.to) {
      mongoQuery.createdAt = {};
      if (req.query.from) mongoQuery.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) mongoQuery.createdAt.$lte = new Date(req.query.to);
    }
    if (cursorDate) {
      mongoQuery.createdAt = { ...(mongoQuery.createdAt || {}), $lt: cursorDate };
    }

    const messages = await Message.find(mongoQuery, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'name email role')
      .lean();
    const reactionMap = await getReactionMap(messages.map((item) => item._id));
    return res.status(200).json(messages.map((item) => messageView(item, reactionMap)));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getUploadSignature = async (_req, res) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    if (!cloudName || !apiKey) {
      return res.status(400).json({ message: 'Cloudinary config missing' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = process.env.CLOUDINARY_CHAT_FOLDER || 'chat_uploads';
    const publicId = `chat_${timestamp}_${Math.random().toString(36).slice(2, 10)}`;
    const signature = createCloudinarySignature({ folder, publicId, timestamp });
    return res.status(200).json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      publicId,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAiCompletion = async (req, res) => {
  try {
    const { roomId, prompt } = req.body || {};
    const room = await getAuthorizedRoom({ roomId, userId: req.user.id });
    if (!room) return res.status(403).json({ message: 'Forbidden: room access denied' });

    const content = await generateAiResponse({ roomId, userName: req.user.name, prompt });
    await createAuditLog({
      action: 'AI chat interaction',
      entityType: 'ai_interaction',
      performedBy: req.user.id,
      metadata: { roomId, promptLength: String(prompt || '').length },
    });

    return res.status(200).json({ content });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
