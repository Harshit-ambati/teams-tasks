import crypto from 'crypto';

const AES_ALGO = 'aes-256-gcm';
const IV_LEN = 12;

const ensurePem = (pem = '') => String(pem || '').includes('BEGIN PUBLIC KEY');

export const encryptForRecipients = ({ plainText, recipients = [] }) => {
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(AES_ALGO, aesKey, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText || ''), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const encryptedContent = Buffer.concat([encrypted, authTag]).toString('base64');

  const encryptedKeys = {};
  recipients.forEach((recipient) => {
    const userId = String(recipient?._id || '');
    const publicKey = recipient?.rsaPublicKey;
    if (!userId || !ensurePem(publicKey)) return;
    const encryptedKey = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      aesKey
    );
    encryptedKeys[userId] = encryptedKey.toString('base64');
  });

  return {
    encryptedContent,
    iv: iv.toString('base64'),
    encryptedKeys,
  };
};
