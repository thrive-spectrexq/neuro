import test from 'node:test';
import assert from 'node:assert';
import {
  deriveKeyFromPassword,
  encryptPayload,
  decryptPayload,
  generateDeviceKeyPair,
  exportPublicKeySpki,
  wrapPassphraseForDevice,
  unwrapPassphraseFromDevice,
} from './crypto';

test('E2E Encryption & Decryption Round-Trip', async () => {
  const secretData = { message: 'Hello Neuro Zero Knowledge', noteId: '123-456' };
  const passphrase = 'my-super-secret-master-passphrase';

  const envelope = await encryptPayload(secretData, passphrase);
  assert.ok(envelope.encrypted_data, 'encrypted_data must be present');
  assert.ok(envelope.iv, 'iv must be present');
  assert.ok(envelope.salt, 'salt must be present');

  const decrypted = await decryptPayload(envelope, passphrase);
  assert.deepStrictEqual(decrypted, secretData);
});

test('PBKDF2 Key Derivation with Salt String', async () => {
  const key1 = await deriveKeyFromPassword('passphrase123', 'c2FsdF9iYXNlNjRfMTIz');
  assert.ok(key1 instanceof CryptoKey, 'Derived key must be a CryptoKey');
});

test('RSA Device Key Passphrase Exchange Round-Trip', async () => {
  const keyPair = await generateDeviceKeyPair();
  const spkiBase64 = await exportPublicKeySpki(keyPair.publicKey);

  const masterPassphrase = 'neuro-device-master-passphrase';
  const wrapped = await wrapPassphraseForDevice(masterPassphrase, spkiBase64);
  assert.ok(wrapped, 'wrapped passphrase should be base64');

  const unwrapped = await unwrapPassphraseFromDevice(wrapped, keyPair.privateKey);
  assert.strictEqual(unwrapped, masterPassphrase);
});
