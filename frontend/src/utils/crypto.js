import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';

// Symmetric encryption using AES
export const encryptMessage = (message, symmetricKey) => {
  return CryptoJS.AES.encrypt(message, symmetricKey).toString();
};

export const decryptMessage = (encryptedMessage, symmetricKey) => {
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, symmetricKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// RSA signature
export const signMessageRSA = (message, privateKey) => {
  const signer = new JSEncrypt();
  signer.setPrivateKey(privateKey);
  return signer.sign(message, CryptoJS.SHA256, 'sha256');
};

export const verifySignatureRSA = (message, signature, publicKey) => {
  const verifier = new JSEncrypt();
  verifier.setPublicKey(publicKey);
  return verifier.verify(message, signature, CryptoJS.SHA256);
};

// DSA signature (simplified implementation for demonstration)
// In a real application, you would use a proper DSA implementation
export const signMessageDSA = (message, privateKey) => {
  // This is a simplified version - in a real app, use a proper DSA implementation
  const hash = CryptoJS.SHA256(message).toString();
  const signer = new JSEncrypt();
  signer.setPrivateKey(privateKey);
  return signer.sign(hash, CryptoJS.SHA256, 'sha256');
};

export const verifySignatureDSA = (message, signature, publicKey) => {
  // This is a simplified version - in a real app, use a proper DSA implementation
  const hash = CryptoJS.SHA256(message).toString();
  const verifier = new JSEncrypt();
  verifier.setPublicKey(publicKey);
  return verifier.verify(hash, signature, CryptoJS.SHA256);
};
