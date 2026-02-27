const WINDOW_MS = 10_000;
const MAX_MESSAGES_PER_WINDOW = 12;

const userBuckets = new Map();

export const canSendSocketMessage = (userId) => {
  const now = Date.now();
  const key = String(userId || '');
  if (!key) return false;

  const bucket = userBuckets.get(key) || { count: 0, startedAt: now };
  if (now - bucket.startedAt >= WINDOW_MS) {
    userBuckets.set(key, { count: 1, startedAt: now });
    return true;
  }

  if (bucket.count >= MAX_MESSAGES_PER_WINDOW) {
    return false;
  }

  bucket.count += 1;
  userBuckets.set(key, bucket);
  return true;
};
