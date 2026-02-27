import express from 'express';
import {
  createAiRoom,
  createPrivateRoom,
  deleteMessage,
  editMessage,
  getAiCompletion,
  getChatRooms,
  getChatUsers,
  getMessageReactions,
  getMessagesByRoom,
  getPinnedMessages,
  getRoomPublicKeys,
  getUploadSignature,
  markRoomAsRead,
  pinMessage,
  registerPublicKey,
  searchMessages,
  toggleReaction,
  unpinMessage,
} from '../controllers/chatController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.get('/search', searchMessages);
router.get('/rooms', getChatRooms);
router.post('/rooms/private', createPrivateRoom);
router.post('/rooms/ai', createAiRoom);
router.get('/rooms/:id/messages', getMessagesByRoom);
router.get('/rooms/:id/pinned', getPinnedMessages);
router.patch('/rooms/:id/read', markRoomAsRead);
router.post('/rooms/:id/pin/:messageId', pinMessage);
router.delete('/rooms/:id/pin/:messageId', unpinMessage);
router.patch('/messages/:id', editMessage);
router.delete('/messages/:id', deleteMessage);
router.post('/messages/:id/reactions/toggle', toggleReaction);
router.get('/messages/:id/reactions', getMessageReactions);
router.get('/users', getChatUsers);
router.post('/keys/public', registerPublicKey);
router.get('/keys/public', getRoomPublicKeys);
router.get('/uploads/signature', getUploadSignature);
router.post('/ai/complete', getAiCompletion);

export default router;
