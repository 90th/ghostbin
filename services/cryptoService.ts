/**
 * Client-side encryption service using Web Crypto API.
 * Nothing leaves the browser unencrypted.
 */

// Convert ArrayBuffer to Base64
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Convert Base64 to ArrayBuffer
export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Generate a new AES-GCM key
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

// Generate a random salt
export const generateSalt = (): Uint8Array => {
  return window.crypto.getRandomValues(new Uint8Array(16));
};

// Derive a key from a password using PBKDF2
export const deriveKeyFromPassword = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

// Export key to JWK (for URL fragment or storage)
export const exportKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(exported);
};

// Import key from JWK string
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

// Encrypt text (or serialized key data)
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
    iv: arrayBufferToBase64(iv.buffer),
    data: arrayBufferToBase64(encryptedBuffer),
  };
};

// Decrypt text (or serialized key data)
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