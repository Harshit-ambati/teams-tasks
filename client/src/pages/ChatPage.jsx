import { useContext, useMemo, useRef, useState } from 'react';
import ChatContext from '../context/ChatContextObject';
import { getCurrentUser } from '../utils/authStorage';
import { chatApi } from '../api/chatApi';
import '../styles/ChatPage.css';

const TYPE_LABELS = {
  private: 'Private',
  team: 'Team',
  project: 'Project',
  global: 'Global',
  ai: 'AI',
};

const REACTIONS = ['👍', '🔥', '✅', '🎯', '👀'];

const formatReadState = (state) => {
  if (state === 'read') return '✓✓';
  if (state === 'delivered') return '✓';
  return '•';
};

function ChatPage() {
  const user = getCurrentUser();
  const {
    rooms,
    messagesByRoom,
    pinnedByRoom,
    onlineUserIds,
    typingByRoom,
    chatUsers,
    activeRoomId,
    joinRoom,
    sendMessage,
    emitTyping,
    markAsRead,
    createPrivateRoom,
    createAiRoom,
    toggleReaction,
    deleteMessage,
    pinMessage,
    unpinMessage,
    getReadState,
  } = useContext(ChatContext);

  const [messageInput, setMessageInput] = useState('');
  const [selectedPrivateUser, setSelectedPrivateUser] = useState('');
  const [activeThreadId, setActiveThreadId] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const groupedRooms = useMemo(
    () => ({
      private: rooms.filter((room) => room.type === 'private'),
      team: rooms.filter((room) => room.type === 'team'),
      project: rooms.filter((room) => room.type === 'project'),
      global: rooms.filter((room) => room.type === 'global'),
      ai: rooms.filter((room) => room.type === 'ai'),
    }),
    [rooms]
  );

  const activeRoom = rooms.find((room) => room._id === activeRoomId) || null;
  const pinnedMessages = activeRoom ? pinnedByRoom[activeRoom._id] || [] : [];
  const allMessages = useMemo(() => {
    if (!activeRoom) return [];
    return messagesByRoom[activeRoom._id] || [];
  }, [activeRoom, messagesByRoom]);
  const messages = useMemo(() => {
    if (!activeThreadId) return allMessages.filter((message) => !message.parentMessageId);
    return allMessages.filter(
      (message) => String(message.parentMessageId || '') === String(activeThreadId) || message._id === activeThreadId
    );
  }, [allMessages, activeThreadId]);
  const typingNames = activeRoom ? Object.values(typingByRoom[activeRoom._id] || {}) : [];

  const uploadAsset = async (file) => {
    const signature = await chatApi.getUploadSignature();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', String(signature.timestamp));
    formData.append('signature', signature.signature);
    formData.append('folder', signature.folder);
    formData.append('public_id', signature.publicId);

    const response = await fetch(signature.uploadUrl, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();
    return {
      fileUrl: data.secure_url,
      fileName: data.original_filename || file.name,
      fileSize: file.size,
      mimeType: file.type,
    };
  };

  const handleFileSend = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeRoom) return;
    try {
      const uploaded = await uploadAsset(file);
      await sendMessage(activeRoom._id, file.name, {
        type: file.type.startsWith('audio/') ? 'voice' : 'file',
        ...uploaded,
        metadata: { ext: file.name.split('.').pop() || '' },
      });
    } catch {
      // Keep UI stable on upload failures.
    } finally {
      event.target.value = '';
    }
  };

  const startRecording = async () => {
    if (isRecording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      try {
        const uploaded = await uploadAsset(file);
        await sendMessage(activeRoom._id, '[voice note]', {
          type: 'voice',
          ...uploaded,
        });
      } catch {
        // Keep UI stable on voice upload failures.
      }
      stream.getTracks().forEach((track) => track.stop());
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>Organization Chat</h2>
          <p>{onlineUserIds.length} users online</p>
        </div>

        <div className="chat-private-create">
          <select
            value={selectedPrivateUser}
            onChange={(event) => setSelectedPrivateUser(event.target.value)}
          >
            <option value="">Start private chat...</option>
            {chatUsers.map((chatUser) => (
              <option key={chatUser._id} value={chatUser._id}>
                {chatUser.name} ({chatUser.role})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={async () => {
              if (!selectedPrivateUser) return;
              const room = await createPrivateRoom(selectedPrivateUser);
              setSelectedPrivateUser('');
              await joinRoom(room._id);
            }}
          >
            Start
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              const room = await createAiRoom();
              await joinRoom(room._id);
            }}
          >
            AI
          </button>
        </div>

        {['private', 'team', 'project', 'global', 'ai'].map((type) => (
          <section key={type} className="chat-room-section">
            <h3>{TYPE_LABELS[type]} Chats</h3>
            <div className="chat-room-list">
              {groupedRooms[type].map((room) => {
                const isActive = room._id === activeRoomId;
                const membersOnline = (room.members || []).some((member) =>
                  onlineUserIds.includes(String(member?._id || member))
                );
                return (
                  <button
                    key={room._id}
                    type="button"
                    className={`chat-room-item ${isActive ? 'active' : ''}`}
                    onClick={() => joinRoom(room._id)}
                  >
                    <span>{room.name || 'Room'}</span>
                    {membersOnline && <span className="chat-online-dot" />}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </aside>

      <main className="chat-main">
        {!activeRoom && <p className="chat-empty">Select a room to start chatting.</p>}

        {activeRoom && (
          <>
            <header className="chat-main-header">
              <div>
                <h3>{activeRoom.name}</h3>
                <p>{TYPE_LABELS[activeRoom.type]} room</p>
              </div>
            </header>

            {pinnedMessages.length > 0 && (
              <div className="chat-message-list">
                {pinnedMessages.slice(0, 3).map((message) => (
                  <article key={`pin-${message._id}`} className="chat-message">
                    <p className="chat-message-meta">Pinned</p>
                    <p>{message.content}</p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => unpinMessage(activeRoom._id, message._id)}
                    >
                      Unpin
                    </button>
                  </article>
                ))}
              </div>
            )}

            <div className="chat-message-list">
              {messages.map((message) => {
                const mine = String(message.senderId?._id || message.senderId) === String(user?._id);
                const senderName = message.senderId?.name || 'User';
                const readState = getReadState(message);
                return (
                  <article key={message._id} className={`chat-message ${mine ? 'mine' : ''}`}>
                    <p className="chat-message-meta">
                      {!mine ? senderName : 'You'} -{' '}
                      {new Date(message.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      {message.edited ? '(edited)' : ''} {mine ? formatReadState(readState) : ''}
                    </p>
                    {message.type === 'file' || message.type === 'voice' ? (
                      <p>
                        <a href={message.fileUrl} target="_blank" rel="noreferrer">
                          {message.fileName || message.content}
                        </a>
                      </p>
                    ) : (
                      <p>{message.content}</p>
                    )}
                    <div>
                      {REACTIONS.map((emoji) => (
                        <button
                          key={`${message._id}-${emoji}`}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => toggleReaction(message._id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActiveThreadId(message._id)}
                      >
                        Thread
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => pinMessage(activeRoom._id, message._id)}
                      >
                        Pin
                      </button>
                      {mine && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => deleteMessage(message._id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              {typingNames.length > 0 && (
                <p className="chat-typing">{typingNames.join(', ')} typing...</p>
              )}
            </div>

            {activeThreadId && (
              <div className="chat-main-header">
                <p>Thread mode</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveThreadId('')}>
                  Close Thread
                </button>
              </div>
            )}

            <form
              className="chat-composer"
              onSubmit={(event) => {
                event.preventDefault();
                if (!messageInput.trim()) return;
                sendMessage(activeRoom._id, messageInput.trim(), { parentMessageId: activeThreadId || null });
                setMessageInput('');
                markAsRead(activeRoom._id).catch(() => {});
              }}
            >
              <input
                value={messageInput}
                onChange={(event) => {
                  setMessageInput(event.target.value);
                  emitTyping(activeRoom._id);
                }}
                onFocus={() => markAsRead(activeRoom._id).catch(() => {})}
                placeholder="Type a secure message..."
              />
              <input type="file" onChange={handleFileSend} />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? 'Stop' : 'Voice'}
              </button>
              <button type="submit" className="btn btn-primary">
                Send
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

export default ChatPage;
