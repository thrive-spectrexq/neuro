// Zero-Knowledge Client-Side Encryption & Sync Service using Web Crypto API via @neuro/shared

import {
  EncryptedEnvelope,
  deriveKeyFromPassword,
  encryptPayload as sharedEncryptPayload,
  decryptPayload as sharedDecryptPayload,
  generateDeviceKeyPair,
  exportPublicKeySpki,
  wrapPassphraseForDevice,
  unwrapPassphraseFromDevice,
} from '@neuro/shared';

export type { EncryptedEnvelope };

export class ZeroKnowledgeSyncService {
  /**
   * Derive a 256-bit AES-GCM Key using PBKDF2 from a user passphrase and salt.
   */
  async deriveKey(passphrase: string, salt: Uint8Array | string): Promise<CryptoKey> {
    return deriveKeyFromPassword(passphrase, salt);
  }

  /**
   * Encrypt plaintext string or object using AES-256-GCM in browser memory.
   */
  async encryptPayload(data: any, passphrase: string): Promise<EncryptedEnvelope> {
    return sharedEncryptPayload(data, passphrase);
  }

  /**
   * Decrypt AES-256-GCM payload using passphrase and envelope metadata.
   */
  async decryptPayload(
    envelope: EncryptedEnvelope | { encrypted_data: string; iv?: string; salt?: string } | string,
    passphrase: string,
    ivBase64?: string,
    saltBase64?: string
  ): Promise<any> {
    return sharedDecryptPayload(envelope, passphrase, ivBase64, saltBase64);
  }

  /**
   * Register Web Crypto RSA-OAEP public key with server.
   */
  async registerDevice(deviceName: string, token: string): Promise<{ id: string; public_key: string; key_fingerprint: string }> {
    const keyPair = await generateDeviceKeyPair();
    const publicKeyBase64 = await exportPublicKeySpki(keyPair.publicKey);

    const response = await fetch('/api/v1/sync/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        device_name: deviceName,
        public_key: publicKeyBase64,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to register device key');
    }

    return response.json();
  }

  /**
   * Wrap/exchange master passphrase for another device's RSA public key.
   */
  async wrapPassphraseForDevice(passphrase: string, targetPublicKeySpkiBase64: string): Promise<string> {
    return wrapPassphraseForDevice(passphrase, targetPublicKeySpkiBase64);
  }

  /**
   * Unwrap/receive master passphrase using this device's RSA private key.
   */
  async unwrapPassphraseFromDevice(wrappedPassphraseBase64: string, privateKey: CryptoKey): Promise<string> {
    return unwrapPassphraseFromDevice(wrappedPassphraseBase64, privateKey);
  }
}

export const syncService = new ZeroKnowledgeSyncService();

