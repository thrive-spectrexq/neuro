// Zero-Knowledge Client-Side Encryption & Sync Service using Web Crypto API

export interface EncryptedEnvelope {
  encryptedData: string; // Base64
  iv: string; // Base64
  salt: string; // Base64
}

export class ZeroKnowledgeSyncService {
  /**
   * Derive a 256-bit AES-GCM Key using PBKDF2 from a user passphrase and salt.
   */
  async deriveKey(passphrase: string, saltBuffer: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passphraseKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer.buffer as ArrayBuffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passphraseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt plaintext string using AES-256-GCM in browser memory.
   */
  async encryptPayload(plainText: string, passphrase: string): Promise<EncryptedEnvelope> {
    const encoder = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const key = await this.deriveKey(passphrase, salt);
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plainText)
    );

    return {
      encryptedData: this.arrayBufferToBase64(encryptedBuffer),
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt),
    };
  }

  /**
   * Decrypt AES-256-GCM payload using passphrase and envelope metadata.
   */
  async decryptPayload(
    encryptedBase64: string,
    ivBase64: string,
    saltBase64: string,
    passphrase: string
  ): Promise<string> {
    const decoder = new TextDecoder();
    const encryptedBuffer = this.base64ToArrayBuffer(encryptedBase64);
    const iv = this.base64ToArrayBuffer(ivBase64);
    const salt = this.base64ToArrayBuffer(saltBase64);

    const key = await this.deriveKey(passphrase, new Uint8Array(salt));
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      encryptedBuffer
    );

    return decoder.decode(decryptedBuffer);
  }

  /**
   * Register Web Crypto RSA-OAEP public key with server.
   */
  async registerDevice(deviceName: string, token: string): Promise<any> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );

    const exportedPublic = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = this.arrayBufferToBase64(exportedPublic);

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

    return response.json();
  }

  /**
   * Helper: ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Helper: Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const syncService = new ZeroKnowledgeSyncService();
