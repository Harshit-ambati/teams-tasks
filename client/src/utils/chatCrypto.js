const KEY_PAIR_STORAGE = 'chat_rsa_keypair_v1';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const fromBase64 = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const pemToBinary = (pem) => {
  const clean = String(pem || '')
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');
  return fromBase64(clean);
};

const exportPublicKeyPem = async (publicKey) => {
  const spki = await window.crypto.subtle.exportKey('spki', publicKey);
  const base64 = toBase64(spki);
  const chunks = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${chunks.join('\n')}\n-----END PUBLIC KEY-----`;
};

const importPublicKeyFromPem = async (pem) =>
  window.crypto.subtle.importKey(
    'spki',
    pemToBinary(pem),
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );

const importPrivateKeyFromJwk = async (jwk) =>
  window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
  );

const getStoredKeyPair = () => {
  try {
    const raw = localStorage.getItem(KEY_PAIR_STORAGE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setStoredKeyPair = (data) => {
  localStorage.setItem(KEY_PAIR_STORAGE, JSON.stringify(data));
};

export const ensureClientKeyPair = async () => {
  const stored = getStoredKeyPair();
  if (stored?.privateKeyJwk && stored?.publicKeyPem) {
    return stored;
  }

  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicKeyPem = await exportPublicKeyPem(keyPair.publicKey);
  const next = { privateKeyJwk, publicKeyPem };
  setStoredKeyPair(next);
  return next;
};

export const encryptMessageForRoom = async ({ plainText, recipients = [] }) => {
  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoder.encode(String(plainText || ''))
  );

  const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
  const encryptedKeys = {};
  for (const recipient of recipients) {
    const userId = String(recipient?._id || '');
    const publicKeyPem = recipient?.rsaPublicKey;
    if (!userId || !publicKeyPem) continue;
    const publicKey = await importPublicKeyFromPem(publicKeyPem);
    const encryptedKey = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAesKey);
    encryptedKeys[userId] = toBase64(encryptedKey);
  }

  return {
    encryptedContent: toBase64(encrypted),
    iv: toBase64(iv.buffer),
    encryptedKeys,
  };
};

export const decryptIncomingMessage = async ({ message, currentUserId }) => {
  if (!message) return '';
  if (message.deleted) return '[deleted]';
  if (message.type === 'file') return message.fileName || 'Shared file';
  if (message.type === 'voice') return '[voice note]';
  if (!message.encryptedContent || !message.iv) return message.content || '';

  const keyPair = getStoredKeyPair();
  if (!keyPair?.privateKeyJwk) return '[encrypted message]';
  const privateKey = await importPrivateKeyFromJwk(keyPair.privateKeyJwk);

  const encryptedKey = message.encryptedKeys?.[String(currentUserId || '')];
  if (!encryptedKey) return '[encrypted message]';

  try {
    const rawAesKey = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      fromBase64(encryptedKey)
    );
    const aesKey = await window.crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, [
      'decrypt',
    ]);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(fromBase64(message.iv)) },
      aesKey,
      fromBase64(message.encryptedContent)
    );
    return decoder.decode(decrypted);
  } catch {
    return '[encrypted message]';
  }
};

