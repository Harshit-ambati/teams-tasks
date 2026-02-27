import crypto from 'crypto';

const MAX_FILE_MB = Number(process.env.CHAT_MAX_FILE_MB || 15);
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const DEFAULT_ALLOWED_MIME = [
  'image/',
  'application/pdf',
  'text/plain',
  'application/vnd',
  'audio/',
  'video/',
];

const allowedMimeRules = (process.env.CHAT_ALLOWED_MIME_TYPES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const SAFE_MIME_RULES = allowedMimeRules.length > 0 ? allowedMimeRules : DEFAULT_ALLOWED_MIME;

const CLOUDINARY_HOST_ALLOWLIST = ['res.cloudinary.com'];

export const isMimeAllowed = (mimeType = '') => {
  const normalized = String(mimeType || '').toLowerCase();
  if (!normalized) return false;
  return SAFE_MIME_RULES.some((rule) => normalized.startsWith(rule.toLowerCase()));
};

export const assertValidFilePayload = ({ fileUrl, fileSize, mimeType, type }) => {
  if (!['file', 'voice'].includes(String(type || ''))) return;
  if (!fileUrl) throw new Error('fileUrl is required for file or voice messages');
  if (!isSecureCloudUrl(fileUrl)) throw new Error('Only secure cloud URLs are allowed');
  if (!Number.isFinite(Number(fileSize)) || Number(fileSize) <= 0) {
    throw new Error('Invalid file size');
  }
  if (Number(fileSize) > MAX_FILE_BYTES) {
    throw new Error(`File too large. Max ${MAX_FILE_MB}MB`);
  }
  if (!isMimeAllowed(mimeType)) {
    throw new Error('File type is not allowed');
  }
};

export const isSecureCloudUrl = (rawUrl = '') => {
  try {
    const parsed = new URL(String(rawUrl || ''));
    if (parsed.protocol !== 'https:') return false;
    return CLOUDINARY_HOST_ALLOWLIST.some((host) => parsed.hostname.endsWith(host));
  } catch {
    return false;
  }
};

export const createCloudinarySignature = ({ folder, publicId, timestamp }) => {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) {
    throw new Error('CLOUDINARY_API_SECRET is required');
  }
  const payload = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  return crypto.createHash('sha1').update(payload).digest('hex');
};

