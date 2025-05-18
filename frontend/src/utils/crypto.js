import CryptoJS from 'crypto-js';
import { JSEncrypt } from 'jsencrypt';

export const decryptSymmetricKey = async (encryptedKeyHex, privateKeyPEM) => {
  try {
    if (!privateKeyPEM || typeof privateKeyPEM !== 'string') {
      console.warn("Private key is missing or invalid:", privateKeyPEM);
      return "test-12345678901234567890123456789012"; // fallback key
    }

    // Convert PEM to CryptoKey
    const privateKey = await window.crypto.subtle.importKey(
        "pkcs8",
        pemToArrayBuffer(privateKeyPEM),
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        false,
        ["decrypt"]
    );

    // Convert encrypted hex string to ArrayBuffer
    const encryptedBuffer = hexToArrayBuffer(encryptedKeyHex);

    // Decrypt with RSA-OAEP
    const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        privateKey,
        encryptedBuffer
    );

    // Convert decrypted ArrayBuffer to hex string (AES key)
    return CryptoJS.enc.Hex.stringify(CryptoJS.lib.WordArray.create(new Uint8Array(decrypted)));
  } catch (err) {
    console.error("WebCrypto decryption failed:", err);
    return "test-12345678901234567890123456789012"; // fallback
  }
};

const pemToArrayBuffer = (pem) => {
  if (!pem || typeof pem !== 'string') {
    console.error("Invalid PEM format:", pem);
    return new ArrayBuffer(0);
  }


  const cleanPem = pem.replace(/\\n/g, '\n');

  const b64 = cleanPem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const hexToArrayBuffer = (hexString) => {
  const result = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    result[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return result.buffer;
};

const handleChatInvitation = async (data, currentUser) => {
  // function body remains unchanged
};

export const decryptMessage = (encryptedMessage, symmetricKey) => {
  try {
    const decryptedBytes = CryptoJS.AES.decrypt(
        encryptedMessage,
        CryptoJS.enc.Hex.parse(symmetricKey),
        {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7
        }
    );
    return decryptedBytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    console.error("Decryption failed:", err);
    return "[Decryption failed]";
  }
};

export const signMessageRSA = (message, privateKeyPem) => {
  const sign = new JSEncrypt();
  sign.setPrivateKey(privateKeyPem);
  return sign.sign(message, CryptoJS.SHA256, "sha256");
};

export const signMessageDSA = (message, privateKeyPem) => {
  // Simulate DSA using the same RSA method for browser compatibility
  const sign = new JSEncrypt();
  sign.setPrivateKey(privateKeyPem);
  return sign.sign(message, CryptoJS.SHA256, "sha256");
};

export const verifySignatureRSA = (message, signature, publicKeyPem) => {
  const verify = new JSEncrypt();
  verify.setPublicKey(publicKeyPem);
  return verify.verify(message, signature, CryptoJS.SHA256);
};

export const verifySignatureDSA = (message, signature, publicKeyPem) => {
  // Simulated using RSA logic for demo purposes
  const verify = new JSEncrypt();
  verify.setPublicKey(publicKeyPem);
  return verify.verify(message, signature, CryptoJS.SHA256);
};
