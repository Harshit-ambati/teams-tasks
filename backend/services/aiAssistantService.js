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

const toContextText = (messages = []) =>
  messages
    .reverse()
    .map((item) => {
      const tokens = (item.searchTokens || []).slice(0, 20).join(' ');
      return tokens || item.type || 'message';
    })
    .filter(Boolean)
    .slice(-8)
    .join('\n');

const generateWithOpenAI = async ({ apiKey, model, userName, prompt, contextText }) => {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content:
            'You are a concise project assistant for team chat. Give practical, actionable answers with short bullet points when useful.',
        },
        {
          role: 'user',
          content: `User: ${userName || 'Team member'}\nRecent context:\n${contextText || 'No context'}\n\nPrompt:\n${prompt}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text =
    data?.output_text ||
    data?.output?.[0]?.content?.find((item) => item.type === 'output_text')?.text ||
    '';
  if (!String(text).trim()) {
    throw new Error('OpenAI response did not include text output');
  }

  return String(text).trim();
};

export const generateAiResponse = async ({ roomId, userName, prompt }) => {
  const recentMessages = await Message.find({
    chatRoomId: roomId,
    deleted: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const rawPrompt = String(prompt || '').trim();
  if (!rawPrompt) {
    return 'Please provide a question or request.';
  }

  const openAiApiKey = process.env.OPENAI_API_KEY || '';
  const openAiModel = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const contextText = toContextText(recentMessages);

  if (openAiApiKey) {
    try {
      return await generateWithOpenAI({
        apiKey: openAiApiKey,
        model: openAiModel,
        userName,
        prompt: rawPrompt,
        contextText,
      });
    } catch (error) {
      console.warn(`OpenAI fallback triggered: ${error.message}`);
    }
  }

  const context = contextText ? contextText.split('\n') : [];
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
