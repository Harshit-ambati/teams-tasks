import Message from '../models/Message.js';

const summarize = (lines) => {
  if (lines.length === 0) return 'No recent context available yet.';
  if (lines.length === 1) return `Summary: ${lines[0]}`;
  return `Summary:\n- ${lines.slice(-8).join('\n- ')}`;
};

const detectTaskIntent = (text) => {
  const normalized = String(text || '').toLowerCase();
  return normalized.includes('create task') || normalized.includes('todo') || normalized.includes('assign');
};

export const generateAiResponse = async ({ roomId, userName, prompt }) => {
  const recentMessages = await Message.find({
    chatRoomId: roomId,
    deleted: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const context = recentMessages
    .reverse()
    .map((item) => item.searchTokens?.join(' ') || item.type || 'message')
    .filter(Boolean);

  const rawPrompt = String(prompt || '').trim();
  if (!rawPrompt) {
    return 'Please provide a question or request.';
  }

  if (/summarize|summary/i.test(rawPrompt)) {
    return summarize(context);
  }

  if (detectTaskIntent(rawPrompt)) {
    return `Task suggestion for ${userName || 'team'}: define owner, due date, and acceptance criteria before creating the ticket.`;
  }

  if (/deadline|due date|remind/i.test(rawPrompt)) {
    return 'Reminder: review tasks in the project board and sort by nearest due date to prioritize blockers.';
  }

  return `AI Assistant: I can summarize this chat, suggest task creation details, and provide deadline reminders. You said: "${rawPrompt.slice(0, 220)}"`;
};

