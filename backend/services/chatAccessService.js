import ChatRoom from '../models/ChatRoom.js';
import Message from '../models/Message.js';

export const isRoomMember = (room, userId) =>
  Boolean(room && userId && (room.members || []).some((memberId) => String(memberId) === String(userId)));

export const getAuthorizedRoom = async ({ roomId, userId }) => {
  const room = await ChatRoom.findById(roomId);
  if (!room || !isRoomMember(room, userId)) {
    return null;
  }
  return room;
};

export const getAuthorizedMessage = async ({ messageId, userId }) => {
  const message = await Message.findById(messageId);
  if (!message) return null;
  const room = await ChatRoom.findById(message.chatRoomId);
  if (!room || !isRoomMember(room, userId)) {
    return null;
  }
  return { message, room };
};
