/**
 * AES-256-GCM field-level encryption for PHI (Protected Health Information).
 *
 * ⚠️  CRITICAL: The ENCRYPTION_KEY environment variable must be backed up
 * securely and separately from the database. If the key is lost, all
 * encrypted PHI in the database becomes permanently unreadable.
 *
 * Encrypted values are stored as: "enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * The "enc:" prefix allows safeDecrypt to detect unencrypted legacy values.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;      // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;     // 128-bit auth tag
const PREFIX = 'enc:';

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY environment variable is not set.');
  }
  if (raw.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 characters. Got ${raw.length}.`,
    );
  }
  return Buffer.from(raw, 'utf8');
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a string in the format: "enc:<iv>:<authTag>:<ciphertext>" (all hex).
 */
export function encrypt(text: string): string {
  try {
    const key = getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (err) {
    // Do not log the key or plaintext
    throw new Error('Encryption failed. Ensure ENCRYPTION_KEY is correctly configured.');
  }
}

/**
 * Decrypts a string produced by encrypt().
 * Throws if the value is tampered with or the key is wrong.
 */
export function decrypt(encryptedText: string): string {
  try {
    if (!encryptedText.startsWith(PREFIX)) {
      throw new Error('Value is not in encrypted format.');
    }
    const parts = encryptedText.slice(PREFIX.length).split(':');
    if (parts.length !== 3) {
      throw new Error('Encrypted value has invalid format.');
    }
    const [ivHex, authTagHex, ciphertextHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch (err) {
    // Do not log the key or ciphertext
    throw new Error('Decryption failed. The data may be corrupted or the key may have changed.');
  }
}

/**
 * Attempts to decrypt a value. If it is not in encrypted format (e.g. legacy
 * plaintext data written before encryption was enabled), returns it as-is.
 * This enables a graceful migration period where old and new data coexist.
 */
export function safeDecrypt(value: string): string {
  if (!value.startsWith(PREFIX)) return value;
  return decrypt(value);
}
