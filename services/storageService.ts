import { EncryptedPaste, CreatePastePayload } from '../types';

const API_BASE = '/api/v1';

export interface PasteMetadata {
  exists: boolean;
  hasPassword: boolean;
  burnAfterRead: boolean;
  createdAt: number;
  expiresAt: number | null;
}

export const savePaste = async (paste: CreatePastePayload, headers?: Record<string, string>): Promise<string> => {
  const response = await fetch(`${API_BASE}/paste`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(paste),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const data = await response.json();
  return data.id;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getPaste = async (id: string): Promise<EncryptedPaste | null> => {
  let attempt = 0;
  const maxRetries = 3;
  let delay = 300;

  while (true) {
    const response = await fetch(`${API_BASE}/paste/${id}`);

    if (response.status === 404) return null;

    if (response.ok) {
      return response.json();
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt < maxRetries) {
        attempt++;
        await sleep(delay);
        delay *= 2;
        continue;
      }
    }

    throw new Error(`Server error: ${response.status}`);
  }
};

export const deletePaste = async (id: string, burnToken?: string): Promise<void> => {
  const headers: HeadersInit = {};
  if (burnToken) {
    headers['X-Burn-Token'] = burnToken;
  }

  const response = await fetch(`${API_BASE}/paste/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    console.error(`Failed to delete paste ${id}: ${response.status}`);
  }
};

export const getPasteMetadata = async (id: string): Promise<PasteMetadata | null> => {
  const response = await fetch(`${API_BASE}/paste/${id}/metadata`);

  if (!response.ok) {
    return null;
  }

  return response.json();
};
