"use server";

import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

/**
 * AES-256-GCM encryption for PII fields (SSN, EIN, tax_id).
 *
 * Format: base64(iv || ciphertext || authTag)
 * - IV: 12 bytes (GCM standard)
 * - Auth tag: 16 bytes
 * - The rest is ciphertext
 *
 * Key: 32-byte hex string from FIELD_ENCRYPTION_KEY env var.
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  if (hex.length !== 64) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
    );
  }
  return Buffer.from(hex, "hex");
}

/** Encrypt a plaintext string. Returns a base64-encoded blob. */
export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // iv || ciphertext || tag
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

/** Decrypt a base64-encoded blob back to plaintext. Returns null on failure. */
export function decryptField(encoded: string): string | null {
  try {
    const key = getKey();
    const buf = Buffer.from(encoded, "base64");

    if (buf.length < IV_LENGTH + TAG_LENGTH + 1) {
      return null; // too short to be valid ciphertext
    }

    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(buf.length - TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(ciphertext) + decipher.final("utf8");
  } catch {
    // Auth tag mismatch, bad data, wrong key — return null rather than throw
    return null;
  }
}

/**
 * Encrypt a value only if it looks like plaintext (not already encrypted).
 * Already-encrypted values are base64 blobs at least ~40 chars long.
 * Plaintext SSNs/EINs are 9-11 chars (e.g., "123-45-6789" or "12-3456789").
 */
export function encryptIfPlaintext(value: string | null): string | null {
  if (!value) return null;

  // Try decrypting — if it succeeds, it's already encrypted
  const decrypted = decryptField(value);
  if (decrypted !== null) return value;

  // Not valid ciphertext, so encrypt it
  return encryptField(value);
}

/**
 * Safely decrypt a field that may be plaintext (during migration) or encrypted.
 * Returns the plaintext value either way.
 */
export function decryptFieldSafe(value: string | null): string | null {
  if (!value) return null;

  const decrypted = decryptField(value);
  // If decryption failed, the value is probably still plaintext
  return decrypted ?? value;
}
