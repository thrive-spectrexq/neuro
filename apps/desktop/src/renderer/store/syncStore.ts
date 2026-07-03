import { create } from 'zustand';
import { deriveKeyFromPassword, encryptPayload, decryptPayload } from '@neuro/shared';

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

    const encryptedData = await encryptPayload(localData, masterKey);

    const response = await fetch('http://localhost:8000/api/v1/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: userId,
        encrypted_data: encryptedData,
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

    const response = await fetch('http://localhost:8000/api/v1/sync/latest', {
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

    const decryptedData = await decryptPayload(blob.encrypted_data, masterKey);
    return decryptedData;
  }
}));
