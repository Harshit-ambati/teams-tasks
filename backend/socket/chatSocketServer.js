import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import ChatRoom from '../models/ChatRoom.js';
import Message from '../models/Message.js';
import MessageHistory from '../models/MessageHistory.js';
import Reaction from '../models/Reaction.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { getAuthorizedMessage, getAuthorizedRoom } from '../services/chatAccessService.js';
import { generateAiResponse } from '../services/aiAssistantService.js';
import { canEditMessage, canPinMessage, isAllowedMessageType } from '../services/chatPolicyService.js';
import { assertValidFilePayload } from '../services/fileSecurityService.js';
import { canSendSocketMessage } from '../services/socketRateLimiter.js';
import { createAuditLog } from '../utils/activityLogger.js';
import { encryptMetadata } from '../utils/messageCrypto.js';
import { encryptForRecipients } from '../utils/hybridCrypto.js';

const activeUsers = new Map();
const typingState = new Map();
const TYPING_TIMEOUT_MS = 3000;

const roomKey = (roomId) => `room:${roomId}`;
const toOnlineList = () => [...activeUsers.keys()];
const toStringId = (value) => (value ? String(value) : '');

const attachUserSocket = (userId, socketId) => {
  const key = String(userId);
  const sockets = activeUsers.get(key) || new Set();
  sockets.add(socketId);
  activeUsers.set(key, sockets);
};

const detachUserSocket = (userId, socketId) => {
  const key = String(userId);
  const sockets = activeUsers.get(key);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    activeUsers.delete(key);
  }
};

const toSocketUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
});

const reactionPayload = async (messageId) => {
  const reactions = await Reaction.find({ messageId }).populate('userId', 'name email role').lean();
  return reactions.map((reaction) => ({
    _id: reaction._id,
    emoji: reaction.emoji,
    userId: reaction.userId,
    createdAt: reaction.createdAt,
  }));
};

const messagePayload = (message) => ({
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
  readBy: message.readBy || [],
  createdAt: message.createdAt,
  updatedAt: message.updatedAt || null,
});

const clearTyping = ({ io, roomId, userId, userName }) => {
  const key = `${roomId}:${userId}`;
  const existing = typingState.get(key);
  if (existing?.timeoutId) clearTimeout(existing.timeoutId);
  typingState.delete(key);
  io.to(roomKey(roomId)).emit('typingStop', { roomId, userId, userName });
};

const registerTyping = ({ io, roomId, userId, userName }) => {
  const key = `${roomId}:${userId}`;
  const existing = typingState.get(key);
  if (existing?.timeoutId) clearTimeout(existing.timeoutId);
  const timeoutId = setTimeout(() => {
    clearTyping({ io, roomId, userId, userName });
  }, TYPING_TIMEOUT_MS);
  typingState.set(key, { timeoutId });
  io.to(roomKey(roomId)).emit('typingStart', { roomId, userId, userName });
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

const configureRedisAdapter = async (io) => {
  if (!process.env.REDIS_URL) return;
  try {
    const { createAdapter } = await import('@socket.io/redis-adapter');
    const { createClient } = await import('redis');
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
  } catch (error) {
    console.warn(`Redis adapter unavailable, using in-memory adapter: ${error.message}`);
  }
};

export const initializeChatSocket = (httpServer, { corsOrigin }) => {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  configureRedisAdapter(io).catch(() => {});

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) {
        return next(new Error('Unauthorized: token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name email role');
      if (!user) {
        return next(new Error('Unauthorized: user not found'));
      }

      socket.user = toSocketUser(user);
      return next();
    } catch {
      return next(new Error('Unauthorized: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    attachUserSocket(userId, socket.id);
    io.emit('onlineUsers', toOnlineList());

    socket.on('joinRoom', async ({ roomId } = {}) => {
      try {
        if (!roomId) return socket.emit('socketError', { message: 'roomId is required' });
        const room = await getAuthorizedRoom({ roomId, userId });
        if (!room) {
          return socket.emit('socketError', { message: 'Forbidden: room access denied' });
        }
        socket.join(roomKey(roomId));
        socket.emit('joinedRoom', { roomId });
      } catch (error) {
        socket.emit('socketError', { message: error.message });
      }
    });

    socket.on('leaveRoom', ({ roomId } = {}) => {
      if (!roomId) return;
      clearTyping({ io, roomId, userId, userName: socket.user.name });
      socket.leave(roomKey(roomId));
      socket.emit('leftRoom', { roomId });
    });

    socket.on('sendMessage', async (payload = {}) => {
      try {
        const {
          roomId,
          type = 'text',
          encryptedContent = '',
          encryptedKeys = {},
          iv = '',
          parentMessageId = null,
          fileUrl = '',
          fileName = '',
          fileSize = 0,
          mimeType = '',
          metadata = {},
          searchTokens = [],
        } = payload;

        if (!roomId) return socket.emit('socketError', { message: 'roomId is required' });
        if (!isAllowedMessageType(type)) {
          return socket.emit('socketError', { message: 'Unsupported message type' });
        }
        if (!canSendSocketMessage(userId)) {
          return socket.emit('socketError', { message: 'Rate limit exceeded. Slow down your messages.' });
        }

        const room = await getAuthorizedRoom({ roomId, userId });
        if (!room) {
          return socket.emit('socketError', { message: 'Forbidden: room access denied' });
        }

        assertValidFilePayload({ fileUrl, fileSize, mimeType, type });

        if (!encryptedContent || !iv || !encryptedKeys || Object.keys(encryptedKeys).length === 0) {
          return socket.emit('socketError', {
            message: 'Encrypted payload is required (encryptedContent, iv, encryptedKeys)',
          });
        }

        const message = await Message.create({
          chatRoomId: roomId,
          senderId: userId,
          type,
          encryptedContent,
          encryptedKeys: encryptedKeys || {},
          iv,
          parentMessageId: parentMessageId || null,
          fileUrl: fileUrl || '',
          fileName: fileName || '',
          fileSize: Number(fileSize || 0),
          mimeType: mimeType || '',
          encryptedFileMetadata: encryptMetadata(metadata),
          searchTokens: Array.isArray(searchTokens)
            ? searchTokens.map((item) => String(item || '').toLowerCase()).slice(0, 30)
            : [],
          readBy: [{ userId, readAt: new Date() }],
        });

        const hydrated = await Message.findById(message._id).populate('senderId', 'name email role');
        io.to(roomKey(roomId)).emit('receiveMessage', messagePayload(hydrated));
        await createAuditLog({
          action: 'Chat message sent',
          entityType: 'message',
          entityId: message._id,
          performedBy: userId,
          metadata: { roomId, type },
        });

        if (room.type === 'ai') {
          const aiUser = await getAiAssistantUser();
          if (toStringId(aiUser._id) !== toStringId(userId)) {
            const aiText = await generateAiResponse({
              roomId,
              userName: socket.user.name,
              prompt: '[encrypted payload]',
            });
            const recipients = await User.find(
              { _id: { $in: room.members }, rsaPublicKey: { $exists: true, $ne: '' } },
              '_id rsaPublicKey'
            ).lean();
            const aiEncrypted = encryptForRecipients({ plainText: aiText, recipients });
            const aiMessage = await Message.create({
              chatRoomId: roomId,
              senderId: aiUser._id,
              type: 'text',
              encryptedContent: aiEncrypted.encryptedContent,
              encryptedKeys: aiEncrypted.encryptedKeys,
              iv: aiEncrypted.iv,
              readBy: [{ userId: aiUser._id, readAt: new Date() }],
              searchTokens: ['ai', 'assistant', 'summary'],
            });
            const hydratedAi = await Message.findById(aiMessage._id).populate('senderId', 'name email role');
            io.to(roomKey(roomId)).emit('receiveMessage', messagePayload(hydratedAi));
            await createAuditLog({
              action: 'AI socket response emitted',
              entityType: 'ai_interaction',
              entityId: aiMessage._id,
              performedBy: userId,
              metadata: { roomId },
            });
          }
        }
      } catch (error) {
        socket.emit('socketError', { message: error.message });
      }
    });

    socket.on('editMessage', async ({ messageId, updates = {} } = {}) => {
      try {
        if (!messageId) return socket.emit('socketError', { message: 'messageId is required' });
        const authorized = await getAuthorizedMessage({ messageId, userId });
        if (!authorized) return socket.emit('socketError', { message: 'Forbidden: message access denied' });

        const { message } = authorized;
        if (!canEditMessage({ message, actorId: userId, actorRole: socket.user.role })) {
          return socket.emit('socketError', { message: 'Edit window expired or insufficient permissions' });
        }

        await MessageHistory.create({
          messageId: message._id,
          editedBy: userId,
          previousType: message.type,
          previousEncryptedContent: message.encryptedContent,
          previousEncryptedKeys: message.encryptedKeys || {},
          previousIv: message.iv,
          previousEncryptedFileMetadata: message.encryptedFileMetadata,
          reason: String(updates.reason || ''),
        });

        if (updates.type && isAllowedMessageType(updates.type)) message.type = updates.type;
        if (typeof updates.encryptedContent === 'string') message.encryptedContent = updates.encryptedContent;
        if (typeof updates.iv === 'string') message.iv = updates.iv;
        if (updates.encryptedKeys) message.encryptedKeys = updates.encryptedKeys;
        if (typeof updates.fileUrl === 'string') message.fileUrl = updates.fileUrl;
        if (typeof updates.fileName === 'string') message.fileName = updates.fileName;
        if (typeof updates.fileSize !== 'undefined') message.fileSize = Number(updates.fileSize || 0);
        if (typeof updates.mimeType === 'string') message.mimeType = updates.mimeType;
        if (updates.metadata) message.encryptedFileMetadata = encryptMetadata(updates.metadata);
        if (Array.isArray(updates.searchTokens)) {
          message.searchTokens = updates.searchTokens.map((item) => String(item || '').toLowerCase()).slice(0, 30);
        }
        assertValidFilePayload({
          fileUrl: message.fileUrl,
          fileSize: message.fileSize,
          mimeType: message.mimeType,
          type: message.type,
        });

        message.edited = true;
        message.editedAt = new Date();
        await message.save();

        const hydrated = await Message.findById(message._id).populate('senderId', 'name email role');
        io.to(roomKey(String(message.chatRoomId))).emit('messageEdited', messagePayload(hydrated));
        await createAuditLog({
          action: 'Chat message edited',
          entityType: 'message_history',
          entityId: message._id,
          performedBy: userId,
          metadata: { roomId: String(message.chatRoomId) },
        });
      } catch (error) {
        socket.emit('socketError', { message: error.message });
      }
    });

    socket.on('deleteMessage', async ({ messageId } = {}) => {
      try {
        if (!messageId) return socket.emit('socketError', { message: 'messageId is required' });
        const authorized = await getAuthorizedMessage({ messageId, userId });
        if (!authorized) return socket.emit('socketError', { message: 'Forbidden: message access denied' });
        const { message } = authorized;
        const isAdmin = socket.user.role === 'admin';
        const isSender = toStringId(message.senderId) === toStringId(userId);
        if (!isAdmin && !isSender) {
          return socket.emit('socketError', { message: 'Forbidden: only sender or admin can delete message' });
        }
        message.deleted = true;
        message.deletedAt = new Date();
        await message.save();
        await createAuditLog({
          action: 'Chat message soft-deleted',
          entityType: 'message',
          entityId: message._id,
          performedBy: userId,
          metadata: { roomId: String(message.chatRoomId) },
        });
        io.to(roomKey(String(message.chatRoomId))).emit('messageDeleted', {
          messageId: String(message._id),
          roomId: String(message.chatRoomId),
          deletedAt: message.deletedAt,
        });
      } catch (error) {
        socket.emit('socketError', { message: error.message });
      }
    });

    socket.on('toggleReaction', async ({ messageId, emoji } = {}) => {
      try {
        if (!messageId || !emoji) {
          return socket.emit('socketError', { message: 'messageId and emoji are required' });
        }
        const authorized = await getAuthorizedMessage({ messageId, userId });
        if (!authorized) return socket.emit('socketError', { message: 'Forbidden: message access denied' });

        const existing = await Reaction.findOne({ messageId, userId, emoji });
        let action = 'added';
        if (existing) {
          await Reaction.deleteOne({ _id: existing._id });
          action = 'removed';
        } else {
          await Reaction.create({ messageId, userId, emoji });
        }
        const reactions = await reactionPayload(messageId);
        await createAuditLog({
          action: `Reaction ${action}`,
          entityType: 'reaction',
          entityId: messageId,
          performedBy: userId,
          metadata: { roomId: String(authorized.message.chatRoomId), emoji },
        });
        io.to(roomKey(String(authorized.message.chatRoomId))).emit('reactionUpdated', {
          roomId: String(authorized.message.chatRoomId),
          messageId: String(messageId),
          action,
          reactions,
        });
      } catch (error) {
        socket.emit('socketError', { message: error.message });
      }
    });

    socket.on('pinMessage', async ({ roomId, messageId } = {}) => {
      try {
        if (!roomId || !messageId) {
          return socket.emit('socketError', { message: 'roomId and messageId are required' });
        }
        if (!canPinMessage(socket.user.role)) {
          return socket.emit('socketError', { message: 'Forbidden: insufficient role to pin message' });
        }

        const room = await getAuthorizedRoom({ roomId, userId });
        if (!room) return socket.emit('socketError', { message: 'Forbidden: room access denied' });
        await ChatRoom.updateOne({ _id: roomId }, { $addToSet: { pinnedMessages: messageId } });
        await createAuditLog({
          action: 'Message pinned',
          entityType: 'message',
          entityId: messageId,
          performedBy: userId,
          metadata: { roomId },
        });
        io.to(roomKey(roomId)).emit('pinnedMessagesUpdated', { roomId, messageId, action: 'pinned' });
      } catch (error) {
        socket.emit('socketError', { message: error.message });
      }
    });

    socket.on('unpinMessage', async ({ roomId, messageId } = {}) => {
      try {
        if (!roomId || !messageId) {
          return socket.emit('socketError', { message: 'roomId and messageId are required' });
        }
        if (!canPinMessage(socket.user.role)) {
          return socket.emit('socketError', { message: 'Forbidden: insufficient role to unpin message' });
        }
        const room = await getAuthorizedRoom({ roomId, userId });
        if (!room) return socket.emit('socketError', { message: 'Forbidden: room access denied' });
        await ChatRoom.updateOne({ _id: roomId }, { $pull: { pinnedMessages: messageId } });
        await createAuditLog({
          action: 'Message unpinned',
          entityType: 'message',
          entityId: messageId,
          performedBy: userId,
          metadata: { roomId },
        });
        io.to(roomKey(roomId)).emit('pinnedMessagesUpdated', { roomId, messageId, action: 'unpinned' });
      } catch (error) {
        socket.emit('socketError', { message: error.message });
      }
    });

    socket.on('typingStart', async ({ roomId } = {}) => {
      try {
        if (!roomId) return;
        const room = await getAuthorizedRoom({ roomId, userId });
        if (!room) return;
        registerTyping({ io, roomId, userId, userName: socket.user.name });
      } catch {
        // Ignore noisy typing failures.
      }
    });

    socket.on('typingStop', async ({ roomId } = {}) => {
      try {
        if (!roomId) return;
        const room = await getAuthorizedRoom({ roomId, userId });
        if (!room) return;
        clearTyping({ io, roomId, userId, userName: socket.user.name });
      } catch {
        // Ignore noisy typing failures.
      }
    });

    socket.on('markAsRead', async ({ roomId, messageId = null } = {}) => {
      try {
        if (!roomId) {
          return socket.emit('socketError', { message: 'roomId is required' });
        }
        const room = await getAuthorizedRoom({ roomId, userId });
        if (!room) {
          return socket.emit('socketError', { message: 'Forbidden: room access denied' });
        }

        const receipt = { userId, readAt: new Date() };
        if (messageId) {
          await Message.updateOne(
            { _id: messageId, chatRoomId: roomId, 'readBy.userId': { $ne: userId } },
            { $addToSet: { readBy: receipt } }
          );
        } else {
          await Message.updateMany(
            { chatRoomId: roomId, 'readBy.userId': { $ne: userId } },
            { $addToSet: { readBy: receipt } }
          );
        }

        io.to(roomKey(roomId)).emit('markAsRead', {
          roomId,
          messageId,
          userId,
          readAt: receipt.readAt,
        });
      } catch (error) {
        socket.emit('socketError', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      detachUserSocket(userId, socket.id);
      io.emit('onlineUsers', toOnlineList());
      for (const key of typingState.keys()) {
        if (key.endsWith(`:${userId}`)) {
          const [roomId] = key.split(':');
          clearTyping({ io, roomId, userId, userName: socket.user.name });
        }
      }
    });
  });

  return io;
};

export const getActiveUsers = () => toOnlineList();
