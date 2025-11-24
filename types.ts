export interface EncryptedPaste {
  id: string;
  iv: string; // Base64 encoded initialization vector for content
  data: string; // Base64 encoded ciphertext of content
  createdAt: number;
  expiresAt?: number; // Timestamp when the paste expires
  burnAfterRead: boolean;
  views: number;

  // Password protection fields
  hasPassword?: boolean;
  salt?: string; // Base64 encoded salt for PBKDF2
  encryptedKey?: string; // Base64 encoded ciphertext of the content key
  keyIv?: string; // Base64 encoded IV for the key encryption
  burnTokenHash?: string; // SHA-256 hash of the burn token
}

export type CreatePastePayload = Omit<EncryptedPaste, 'id'>;

export interface DecryptedPaste {
  id: string;
  text: string;
  createdAt: number;
  burnAfterRead: boolean;
  views: number;
  expiresAt?: number;
  language?: string;
  burnToken?: string; // The secret token to authorize deletion
}

export interface PasteMetadata {
  ttl: number; // Time to live in hours
  burnAfterRead: boolean;
}

export enum AppRoute {
  CREATE = 'create',
  VIEW = 'view',
  ABOUT = 'about'
}