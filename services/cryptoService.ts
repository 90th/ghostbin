import { argon2id } from 'hash-wasm';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  hexToUint8Array,
  toUrlSafeBase64,
  fromUrlSafeBase64
} from '../lib/encoding';

/**
 * Client-side encryption service using Web Crypto API.
 * Nothing leaves the browser unencrypted.
 */

// ============================================================================
// Hashing
// ============================================================================

/**
 * SHA-256 Hash function for Burn Token
 * @param token The token string to hash
 * @returns Hex string of the hash
 */
export const hashToken = async (token: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// ============================================================================
// Key Management
// ============================================================================

/**
 * Generate a new AES-GCM key
 * Security: AES-GCM 256-bit
 */
export const generateKey = async (): Promise<CryptoKey> => {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
};

/**
 * Generate a random salt
 * Security: 16 bytes (128 bits) of cryptographically strong random data
 */
export const generateSalt = (): Uint8Array => {
  return window.crypto.getRandomValues(new Uint8Array(16));
};

/**
 * Derive a key from a password using Argon2id
 * Security: Argon2id, 1 iteration, 64MB memory, 1 parallelism, 32 byte hash
 */
export const deriveKeyFromPassword = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const derivedKeyHex = await argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 8,
    memorySize: 65536, // 64MB
    hashLength: 32,    // 256 bits
    outputType: 'hex',
  });

  const keyBuffer = hexToUint8Array(derivedKeyHex);

  return window.crypto.subtle.importKey(
    "raw",
    keyBuffer as BufferSource,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
};

/**
 * Export key to JWK (for URL fragment or storage)
 */
export const exportKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(exported);
};

/**
 * Import key from JWK string
 */
export const importKey = async (jwkString: string): Promise<CryptoKey> => {
  const jwk = JSON.parse(jwkString);
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "AES-GCM",
    },
    true,
    ["encrypt", "decrypt"]
  );
};

/**
 * Export key to Raw Base64 (URL-safe)
 */
export const exportKeyRaw = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  const base64 = await arrayBufferToBase64(exported);
  return toUrlSafeBase64(base64);
};

/**
 * Import key from Raw Base64 string (URL-safe)
 */
export const importKeyRaw = async (base64Key: string): Promise<CryptoKey> => {
  const base64 = fromUrlSafeBase64(base64Key);
  const buffer = base64ToArrayBuffer(base64);
  return window.crypto.subtle.importKey(
    "raw",
    buffer,
    {
      name: "AES-GCM",
    },
    true,
    ["encrypt", "decrypt"]
  );
};

// ============================================================================
// Encryption / Decryption
// ============================================================================

/**
 * Encrypt text (or serialized key data)
 * Security: AES-GCM with random 12-byte IV
 */
export const encryptText = async (text: string, key: CryptoKey): Promise<{ iv: string; data: string }> => {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(text);

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encodedData
  );

  return {
    iv: await arrayBufferToBase64(iv.buffer),
    data: await arrayBufferToBase64(encryptedBuffer),
  };
};

/**
 * Decrypt text (or serialized key data)
 * Security: AES-GCM
 */
export const decryptText = async (encryptedData: string, ivStr: string, key: CryptoKey): Promise<string> => {
  const iv = base64ToArrayBuffer(ivStr);
  const data = base64ToArrayBuffer(encryptedData);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
    },
    key,
    data
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
};


