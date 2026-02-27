const PIN_ROLES = new Set(['admin', 'project_manager', 'team_leader']);

export const canPinMessage = (role = '') => PIN_ROLES.has(String(role || ''));

export const getEditWindowMs = () => {
  const raw = Number(process.env.CHAT_EDIT_WINDOW_MINUTES || 15);
  const minutes = Number.isFinite(raw) && raw > 0 ? raw : 15;
  return minutes * 60 * 1000;
};

export const canEditMessage = ({ message, actorId, actorRole, now = Date.now() }) => {
  if (!message) return false;
  if (String(actorRole || '') === 'admin') return true;
  if (String(message.senderId) !== String(actorId)) return false;
  const createdAt = new Date(message.createdAt || 0).getTime();
  return now - createdAt <= getEditWindowMs();
};

export const isAllowedMessageType = (type = 'text') =>
  ['text', 'file', 'voice'].includes(String(type));
