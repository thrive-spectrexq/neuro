import { create } from 'zustand';
import { deriveKeyFromPassword, encryptPayload, decryptPayload } from '@neuro/shared';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

interface SyncState {
  masterKey: CryptoKey | null;
  setMasterPassword: (password: string, salt: string) => Promise<void>;
  pushSync: (userId: string, token: string, localData: any) => Promise<void>;
  pullSync: (token: string) => Promise<any>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  masterKey: null,
  setMasterPassword: async (password: string, salt: string) => {
    const key = await deriveKeyFromPassword(password, salt);
    set({ masterKey: key });
  },
  pushSync: async (userId: string, token: string, localData: any) => {
    const { masterKey } = get();
    if (!masterKey) {
      throw new Error('Master key not derived');
    }

    const envelope = await encryptPayload(localData, masterKey);

    const response = await fetch(`${API_BASE_URL}/api/v1/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: userId,
        encrypted_data: envelope.encrypted_data,
        iv: envelope.iv,
        salt: envelope.salt,
        version: 1,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to upload sync blob');
    }
  },
  pullSync: async (token: string) => {
    const { masterKey } = get();
    if (!masterKey) {
      throw new Error('Master key not derived');
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/sync/latest`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch latest sync blob');
    }

    const blob = await response.json();
    if (!blob || !blob.encrypted_data) return null;

    const decryptedData = await decryptPayload(
      { encrypted_data: blob.encrypted_data, iv: blob.iv, salt: blob.salt },
      masterKey
    );
    return decryptedData;
  }
}));

