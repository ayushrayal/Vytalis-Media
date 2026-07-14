import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard IV length for GCM is 12 bytes

/**
 * Encrypt a string using AES-256-GCM.
 * @param {string} text - The clear text to encrypt.
 * @returns {string} The formatted encrypted string (iv:authTag:ciphertext).
 */
export function encrypt(text) {
  if (!text) return '';
  const keyStr = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyStr) {
    throw new Error('[Encryption] TOKEN_ENCRYPTION_KEY environment variable is not defined.');
  }

  // Derive 32-byte key from keyStr using SHA-256
  const key = crypto.createHash('sha256').update(keyStr).digest();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a string using AES-256-GCM.
 * @param {string} encryptedText - The formatted encrypted string (iv:authTag:ciphertext).
 * @returns {string} The decrypted clear text.
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return '';
  const keyStr = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyStr) {
    throw new Error('[Encryption] TOKEN_ENCRYPTION_KEY environment variable is not defined.');
  }

  const key = crypto.createHash('sha256').update(keyStr).digest();

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('[Encryption] Invalid encrypted text format.');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export default {
  encrypt,
  decrypt
};
