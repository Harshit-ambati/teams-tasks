import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { chatApi } from '../api/chatApi';
import ChatContext from './ChatContextObject';
import { getCurrentUser, getToken } from '../utils/authStorage';
import { decryptIncomingMessage, encryptMessageForRoom, ensureClientKeyPair } from '../utils/chatCrypto';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000').replace(/\/$/, '');

const parseMessageReadBy = (message) =>
  (message?.readBy || []).map((entry) => ({
    userId: String(entry?.userId?._id || entry?.userId || ''),
    readAt: entry?.readAt || null,
  }));

const normalizeMessage = async (message, currentUserId) => {
  const plainContent = await decryptIncomingMessage({ message, currentUserId });
  return {
    ...message,
    content: plainContent,
    readBy: parseMessageReadBy(message),
  };
};

export function ChatProvider({ children }) {
  const [rooms, setRooms] = useState([]);
  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [pinnedByRoom, setPinnedByRoom] = useState({});
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [typingByRoom, setTypingByRoom] = useState({});
  const [chatUsers, setChatUsers] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState('');
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUser = getCurrentUser();

  const fetchRooms = useCallback(async () => {
    const data = await chatApi.getRooms();
    setRooms(Array.isArray(data) ? data : []);
    return data;
  }, []);

  const fetchPinned = useCallback(
    async (roomId) => {
      if (!roomId) return [];
      const data = await chatApi.getPinnedMessages(roomId);
      const safe = Array.isArray(data) ? data : [];
      const normalized = await Promise.all(safe.map((item) => normalizeMessage(item, currentUser?._id)));
      setPinnedByRoom((prev) => ({ ...prev, [roomId]: normalized }));
      return normalized;
    },
    [currentUser?._id]
  );

  const fetchMessages = useCallback(
    async (roomId, options = {}) => {
      if (!roomId) return [];
      const data = await chatApi.getMessages(roomId, { limit: 80, ...options });
      const safe = Array.isArray(data) ? data : [];
      const normalized = await Promise.all(safe.map((item) => normalizeMessage(item, currentUser?._id)));
      setMessagesByRoom((prev) => ({ ...prev, [roomId]: normalized }));
      return normalized;
    },
    [currentUser?._id]
  );

  const fetchChatUsers = useCallback(async () => {
    const users = await chatApi.getUsers();
    setChatUsers(Array.isArray(users) ? users : []);
  }, []);

  const fetchRoomKeys = useCallback(async (roomId) => chatApi.getRoomPublicKeys(roomId), []);

  useEffect(() => {
    const token = getToken();
    if (!token || !currentUser?._id) return undefined;

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('onlineUsers', (onlineIds) => {
      setOnlineUserIds(Array.isArray(onlineIds) ? onlineIds : []);
    });

    socket.on('receiveMessage', async (message) => {
      if (!message?.chatRoomId) return;
      const normalized = await normalizeMessage(message, currentUser?._id);
      setMessagesByRoom((prev) => ({
        ...prev,
        [message.chatRoomId]: [...(prev[message.chatRoomId] || []), normalized],
      }));
    });

    socket.on('messageEdited', async (message) => {
      const normalized = await normalizeMessage(message, currentUser?._id);
      const roomId = String(normalized.chatRoomId);
      setMessagesByRoom((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || []).map((item) => (item._id === normalized._id ? normalized : item)),
      }));
    });

    socket.on('messageDeleted', ({ roomId, messageId, deletedAt }) => {
      setMessagesByRoom((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || []).map((item) =>
          item._id === messageId ? { ...item, deleted: true, deletedAt, content: '[deleted]' } : item
        ),
      }));
    });

    socket.on('reactionUpdated', ({ roomId, messageId, reactions }) => {
      setMessagesByRoom((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || []).map((item) => (item._id === messageId ? { ...item, reactions } : item)),
      }));
    });

    socket.on('pinnedMessagesUpdated', ({ roomId }) => {
      fetchPinned(roomId).catch(() => {});
    });

    socket.on('typingStart', ({ roomId, userId, userName }) => {
      if (!roomId || !userId || userId === currentUser._id) return;
      setTypingByRoom((prev) => {
        const roomTyping = { ...(prev[roomId] || {}) };
        roomTyping[userId] = userName || 'Someone';
        return { ...prev, [roomId]: roomTyping };
      });
    });

    socket.on('typingStop', ({ roomId, userId }) => {
      if (!roomId || !userId || userId === currentUser._id) return;
      setTypingByRoom((prev) => {
        const roomTyping = { ...(prev[roomId] || {}) };
        delete roomTyping[userId];
        return { ...prev, [roomId]: roomTyping };
      });
    });

    socket.on('markAsRead', ({ roomId, messageId, userId, readAt }) => {
      if (!roomId || !userId) return;
      setMessagesByRoom((prev) => {
        const list = [...(prev[roomId] || [])];
        const next = list.map((message) => {
          if (messageId && message._id !== messageId) return message;
          const existing = new Map((message.readBy || []).map((entry) => [String(entry.userId), entry]));
          existing.set(String(userId), { userId: String(userId), readAt: readAt || new Date().toISOString() });
          return { ...message, readBy: [...existing.values()] };
        });
        return { ...prev, [roomId]: next };
      });
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?._id, fetchPinned]);

  useEffect(() => {
    if (!getToken() || !currentUser?._id) return;

    const timer = setTimeout(() => {
      ensureClientKeyPair()
        .then((pair) => chatApi.registerPublicKey(pair.publicKeyPem))
        .catch(() => {});
      fetchRooms().catch(() => setRooms([]));
      fetchChatUsers().catch(() => setChatUsers([]));
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchRooms, fetchChatUsers, currentUser?._id]);

  const joinRoom = useCallback(
    async (roomId) => {
      if (!roomId) return;
      try {
        if (activeRoomId && activeRoomId !== roomId) {
          socketRef.current?.emit('leaveRoom', { roomId: activeRoomId });
        }

        setActiveRoomId(roomId);
        socketRef.current?.emit('joinRoom', { roomId });
        await Promise.all([fetchMessages(roomId), fetchPinned(roomId)]);
        socketRef.current?.emit('markAsRead', { roomId });
        await chatApi.markRoomRead(roomId);
      } catch {
        setActiveRoomId('');
      }
    },
    [activeRoomId, fetchMessages, fetchPinned]
  );

  const leaveRoom = useCallback(
    (roomId) => {
      if (!roomId) return;
      socketRef.current?.emit('leaveRoom', { roomId });
      socketRef.current?.emit('typingStop', { roomId });
      if (activeRoomId === roomId) {
        setActiveRoomId('');
      }
    },
    [activeRoomId]
  );

  const sendMessage = useCallback(
    async (roomId, plainText, extra = {}) => {
      if (!roomId) return;
      const room = rooms.find((item) => item._id === roomId);
      const roomKeys = await fetchRoomKeys(roomId);
      const recipients = roomKeys.filter((user) => user.rsaPublicKey);
      const encrypted = await encryptMessageForRoom({ plainText, recipients });

      socketRef.current?.emit('sendMessage', {
        roomId,
        type: extra.type || 'text',
        encryptedContent: encrypted.encryptedContent,
        encryptedKeys: encrypted.encryptedKeys,
        iv: encrypted.iv,
        parentMessageId: extra.parentMessageId || null,
        fileUrl: extra.fileUrl || '',
        fileName: extra.fileName || '',
        fileSize: extra.fileSize || 0,
        mimeType: extra.mimeType || '',
        metadata: extra.metadata || {},
        searchTokens: String(plainText || '')
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 25),
      });

      if (room?.type === 'ai') {
        chatApi.getAiCompletion({ roomId, prompt: plainText }).catch(() => {});
      }
    },
    [rooms, fetchRoomKeys]
  );

  const emitTyping = useCallback((roomId) => {
    if (!roomId) return;
    socketRef.current?.emit('typingStart', { roomId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typingStop', { roomId });
    }, 1200);
  }, []);

  const markAsRead = useCallback(async (roomId, messageId = null) => {
    if (!roomId) return;
    socketRef.current?.emit('markAsRead', { roomId, messageId });
    await chatApi.markRoomRead(roomId);
  }, []);

  const createPrivateRoom = useCallback(
    async (userId) => {
      const created = await chatApi.createPrivateRoom(userId);
      await fetchRooms();
      return created;
    },
    [fetchRooms]
  );

  const createAiRoom = useCallback(async () => {
    const created = await chatApi.createAiRoom();
    await fetchRooms();
    return created;
  }, [fetchRooms]);

  const toggleReaction = useCallback((messageId, emoji) => {
    socketRef.current?.emit('toggleReaction', { messageId, emoji });
  }, []);

  const editMessage = useCallback((messageId, updates) => {
    socketRef.current?.emit('editMessage', { messageId, updates });
  }, []);

  const deleteMessage = useCallback((messageId) => {
    socketRef.current?.emit('deleteMessage', { messageId });
  }, []);

  const pinMessage = useCallback((roomId, messageId) => {
    socketRef.current?.emit('pinMessage', { roomId, messageId });
  }, []);

  const unpinMessage = useCallback((roomId, messageId) => {
    socketRef.current?.emit('unpinMessage', { roomId, messageId });
  }, []);

  const getReadState = useCallback(
    (message) => {
      const reads = message?.readBy || [];
      if (!reads.some((entry) => String(entry.userId) !== String(currentUser?._id))) return 'sent';
      if (reads.length <= 1) return 'delivered';
      return 'read';
    },
    [currentUser?._id]
  );

  const value = useMemo(
    () => ({
      rooms,
      messagesByRoom,
      pinnedByRoom,
      onlineUserIds,
      typingByRoom,
      chatUsers,
      activeRoomId,
      fetchRooms,
      fetchMessages,
      joinRoom,
      leaveRoom,
      sendMessage,
      emitTyping,
      markAsRead,
      createPrivateRoom,
      createAiRoom,
      toggleReaction,
      editMessage,
      deleteMessage,
      pinMessage,
      unpinMessage,
      getReadState,
    }),
    [
      rooms,
      messagesByRoom,
      pinnedByRoom,
      onlineUserIds,
      typingByRoom,
      chatUsers,
      activeRoomId,
      fetchRooms,
      fetchMessages,
      joinRoom,
      leaveRoom,
      sendMessage,
      emitTyping,
      markAsRead,
      createPrivateRoom,
      createAiRoom,
      toggleReaction,
      editMessage,
      deleteMessage,
      pinMessage,
      unpinMessage,
      getReadState,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

