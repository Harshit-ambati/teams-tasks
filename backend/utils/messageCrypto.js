import crypto from 'crypto';

const AES_ALGO = 'aes-256-gcm';
const IV_BYTE_LENGTH = 12;

const asKeyBuffer = (rawKey) => {
  if (!rawKey) {
    throw new Error('MESSAGE_ENCRYPTION_KEY is required');
  }

  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  try {
    const maybeBase64 = Buffer.from(rawKey, 'base64');
    if (maybeBase64.length === 32) return maybeBase64;
  } catch {
    // Fallback handled below.
  }

  const utf8 = Buffer.from(rawKey, 'utf8');
  if (utf8.length === 32) return utf8;

  throw new Error(
    'MESSAGE_ENCRYPTION_KEY must be 32 bytes (utf8), 64-char hex, or base64 for 32 bytes'
  );
};

const getKey = () => asKeyBuffer(process.env.MESSAGE_ENCRYPTION_KEY || '');

export const assertMessageEncryptionReady = () => {
  getKey();
};

export const encryptMessage = (plainText) => {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTE_LENGTH);
  const cipher = crypto.createCipheriv(AES_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedContent: `${authTag.toString('hex')}:${encrypted.toString('hex')}`,
    iv: iv.toString('hex'),
  };
};

export const decryptMessage = ({ encryptedContent, iv }) => {
  const key = getKey();
  const [authTagHex, payloadHex] = String(encryptedContent || '').split(':');
  if (!authTagHex || !payloadHex) {
    throw new Error('Invalid encrypted payload');
  }

  const decipher = crypto.createDecipheriv(AES_ALGO, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
};

export const encryptMetadata = (value) => {
  const serialized = JSON.stringify(value || {});
  const encrypted = encryptMessage(serialized);
  return `${encrypted.iv}.${encrypted.encryptedContent}`;
};

export const decryptMetadata = (payload) => {
  const [iv, encryptedContent] = String(payload || '').split('.');
  if (!iv || !encryptedContent) return null;
  const plain = decryptMessage({ iv, encryptedContent });
  return JSON.parse(plain);
};
