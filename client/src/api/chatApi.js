import axiosClient from './axios';

export const chatApi = {
  getRooms: () => axiosClient.get('/chat/rooms'),
  createPrivateRoom: (userId) => axiosClient.post('/chat/rooms/private', { userId }),
  createAiRoom: () => axiosClient.post('/chat/rooms/ai', {}),
  getMessages: (roomId, params = {}) =>
    axiosClient.get(`/chat/rooms/${roomId}/messages`, { params }),
  searchMessages: (params = {}) => axiosClient.get('/chat/search', { params }),
  markRoomRead: (roomId) => axiosClient.patch(`/chat/rooms/${roomId}/read`),
  editMessage: (messageId, payload) => axiosClient.patch(`/chat/messages/${messageId}`, payload),
  deleteMessage: (messageId) => axiosClient.delete(`/chat/messages/${messageId}`),
  getPinnedMessages: (roomId) => axiosClient.get(`/chat/rooms/${roomId}/pinned`),
  pinMessage: (roomId, messageId) => axiosClient.post(`/chat/rooms/${roomId}/pin/${messageId}`, {}),
  unpinMessage: (roomId, messageId) => axiosClient.delete(`/chat/rooms/${roomId}/pin/${messageId}`),
  toggleReaction: (messageId, emoji) =>
    axiosClient.post(`/chat/messages/${messageId}/reactions/toggle`, { emoji }),
  getMessageReactions: (messageId) => axiosClient.get(`/chat/messages/${messageId}/reactions`),
  getUsers: () => axiosClient.get('/chat/users'),
  registerPublicKey: (publicKey) => axiosClient.post('/chat/keys/public', { publicKey }),
  getRoomPublicKeys: (roomId) => axiosClient.get('/chat/keys/public', { params: { roomId } }),
  getUploadSignature: () => axiosClient.get('/chat/uploads/signature'),
  getAiCompletion: (payload) => axiosClient.post('/chat/ai/complete', payload),
};
