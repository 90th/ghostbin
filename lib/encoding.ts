/**
 * Convert ArrayBuffer to Base64 (Async using FileReader for performance)
 * @param buffer The buffer to convert
 * @returns The Base64 string
 */
export const arrayBufferToBase64 = async (buffer: ArrayBuffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // data:application/octet-stream;base64,.....
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Convert Base64 to ArrayBuffer
 * @param base64 The Base64 string
 * @returns The ArrayBuffer
 */
export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Helper to convert Hex string to Uint8Array
 * @param hex The hex string
 * @returns The Uint8Array
 */
export const hexToUint8Array = (hex: string): Uint8Array => {
  const len = hex.length;
  const bytes = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

/**
 * Helper for URL-safe Base64
 * @param base64 The standard Base64 string
 * @returns The URL-safe Base64 string
 */
export const toUrlSafeBase64 = (base64: string): string => {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Helper from URL-safe Base64
 * @param base64 The URL-safe Base64 string
 * @returns The standard Base64 string
 */
export const fromUrlSafeBase64 = (base64: string): string => {
  let str = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return str;
};
