export interface EncryptedEnvelope {
  encrypted_data: string; // Base64
  iv: string;             // Base64
  salt: string;           // Base64
}

export const PBKDF2_ITERATIONS = 600000;

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(binary, 'binary').toString('base64');
  }
  throw new Error('No base64 encoding environment found');
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  throw new Error('No base64 decoding environment found');
}

export async function deriveKeyFromPassword(
  password: string,
  saltInput: Uint8Array | ArrayBuffer | string
): Promise<CryptoKey> {
  const cryptoObj = globalThis.crypto;
  const enc = new TextEncoder();
  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  let saltBuffer: ArrayBuffer;
  if (typeof saltInput === 'string') {
    saltBuffer = base64ToArrayBuffer(saltInput);
  } else if (saltInput instanceof Uint8Array) {
    saltBuffer = saltInput.buffer.slice(
      saltInput.byteOffset,
      saltInput.byteOffset + saltInput.byteLength
    ) as ArrayBuffer;
  } else {
    saltBuffer = saltInput;
  }

  return cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPayload(
  data: any,
  passphraseOrKey: string | CryptoKey,
  providedSalt?: string
): Promise<EncryptedEnvelope> {
  const cryptoObj = globalThis.crypto;
  const enc = new TextEncoder();
  const rawText = typeof data === 'string' ? data : JSON.stringify(data);
  const encodedData = enc.encode(rawText);

  const ivBytes = cryptoObj.getRandomValues(new Uint8Array(12));
  let saltBytes: Uint8Array;
  let key: CryptoKey;

  if (typeof passphraseOrKey === 'string') {
    if (providedSalt) {
      saltBytes = new Uint8Array(base64ToArrayBuffer(providedSalt));
    } else {
      saltBytes = cryptoObj.getRandomValues(new Uint8Array(16));
    }
    key = await deriveKeyFromPassword(passphraseOrKey, saltBytes);
  } else {
    key = passphraseOrKey;
    if (providedSalt) {
      saltBytes = new Uint8Array(base64ToArrayBuffer(providedSalt));
    } else {
      saltBytes = cryptoObj.getRandomValues(new Uint8Array(16));
    }
  }

  const cipherBuffer = await cryptoObj.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    key,
    encodedData
  );

  return {
    encrypted_data: arrayBufferToBase64(cipherBuffer),
    iv: arrayBufferToBase64(ivBytes),
    salt: arrayBufferToBase64(saltBytes),
  };
}

export async function decryptPayload(
  envelopeOrEncryptedData: EncryptedEnvelope | { encrypted_data: string; iv?: string; salt?: string } | string,
  passphraseOrKey: string | CryptoKey,
  ivBase64?: string,
  saltBase64?: string
): Promise<any> {
  const cryptoObj = globalThis.crypto;
  let encryptedData: string;
  let ivStr: string;
  let saltStr: string | undefined;

  if (typeof envelopeOrEncryptedData === 'object' && envelopeOrEncryptedData !== null) {
    encryptedData = envelopeOrEncryptedData.encrypted_data;
    ivStr = envelopeOrEncryptedData.iv!;
    saltStr = envelopeOrEncryptedData.salt;
  } else {
    encryptedData = envelopeOrEncryptedData;
    ivStr = ivBase64!;
    saltStr = saltBase64;
  }

  if (!encryptedData || !ivStr) {
    throw new Error('Invalid encrypted payload envelope');
  }

  let key: CryptoKey;
  if (typeof passphraseOrKey === 'string') {
    if (!saltStr) {
      throw new Error('Salt is required to derive key from passphrase');
    }
    key = await deriveKeyFromPassword(passphraseOrKey, saltStr);
  } else {
    key = passphraseOrKey;
  }

  const cipherBuffer = base64ToArrayBuffer(encryptedData);
  const ivBuffer = base64ToArrayBuffer(ivStr);

  const decryptedBuffer = await cryptoObj.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer),
    },
    key,
    cipherBuffer
  );

  const dec = new TextDecoder();
  const decryptedText = dec.decode(decryptedBuffer);

  try {
    return JSON.parse(decryptedText);
  } catch {
    return decryptedText;
  }
}

export async function generateDeviceKeyPair(): Promise<CryptoKeyPair> {
  const cryptoObj = globalThis.crypto;
  return cryptoObj.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportPublicKeySpki(publicKey: CryptoKey): Promise<string> {
  const cryptoObj = globalThis.crypto;
  const exported = await cryptoObj.subtle.exportKey('spki', publicKey);
  return arrayBufferToBase64(exported);
}

export async function importPublicKeySpki(spkiBase64: string): Promise<CryptoKey> {
  const cryptoObj = globalThis.crypto;
  const buffer = base64ToArrayBuffer(spkiBase64);
  return cryptoObj.subtle.importKey(
    'spki',
    buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  );
}

export async function wrapPassphraseForDevice(
  passphrase: string,
  targetPublicKeySpkiBase64: string
): Promise<string> {
  const cryptoObj = globalThis.crypto;
  const publicKey = await importPublicKeySpki(targetPublicKeySpkiBase64);
  const enc = new TextEncoder();
  const encryptedBuffer = await cryptoObj.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    enc.encode(passphrase)
  );
  return arrayBufferToBase64(encryptedBuffer);
}

export async function unwrapPassphraseFromDevice(
  wrappedPassphraseBase64: string,
  privateKey: CryptoKey
): Promise<string> {
  const cryptoObj = globalThis.crypto;
  const encryptedBuffer = base64ToArrayBuffer(wrappedPassphraseBase64);
  const decryptedBuffer = await cryptoObj.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedBuffer
  );
  return new TextDecoder().decode(decryptedBuffer);
}

