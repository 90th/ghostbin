import { EncryptedPaste } from '../types';

const API_BASE = '/api/v1';

export const savePaste = async (paste: EncryptedPaste, headers?: Record<string, string>): Promise<void> => {
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
};

export const getPaste = async (id: string): Promise<EncryptedPaste | null> => {
  const response = await fetch(`${API_BASE}/paste/${id}`);

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  return response.json();
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
