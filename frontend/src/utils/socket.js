import { io } from 'socket.io-client';
import { signMessageRSA, signMessageDSA } from './crypto';
import CryptoJS from 'crypto-js';

let socket;
let symmetricKey = null;

export const initializeSocket = (username) => {
  // Updated port to 5001 to match backend
  socket = io('http://localhost:5001');

  socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('user_login', { username });
  });

  return socket;
};

export const getSocket = () => {

  if (!socket) {
    throw new Error('Socket not initialized. Call initializeSocket first.');
  }
  return socket;
};

export const setSymmetricKey = (key) => {
  symmetricKey = key;
  console.log('Symmetric key set:', key);
};

export const getSymmetricKey = () => {
  return symmetricKey;
};

export const initiateChatWithUsers = (initiator, participants) => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }

  console.log(`Initiating chat as ${initiator} with participants:`, participants);
  socket.emit('initiate_chat', {
    initiator,
    participants
  });
};

export const sendEncryptedMessage = (chatId, sender, message, signatureType, privateKey) => {
  const socket = getSocket();
  if (!socket) {
    throw new Error('Socket not initialized');
  }

  if (!symmetricKey || symmetricKey.length !== 64) {
    throw new Error("Invalid symmetric key: must be 64 hex characters long (32 bytes / AES-256)");
  }

  const encryptedMessage = CryptoJS.AES.encrypt(
      CryptoJS.enc.Utf8.parse(message),
      CryptoJS.enc.Hex.parse(symmetricKey),
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      }
  ).toString();

  // Create a signature using RSA or DSA
  const signature = signatureType === "RSA"
    ? signMessageRSA(message, privateKey)
    : signMessageDSA(message, privateKey);

  console.log(`Sending message in chat ${chatId} from ${sender}:`, message);

  // Send the message
  socket.emit('send_message', {
    chat_id: chatId,
    username: sender,
    encrypted_message: encryptedMessage,
    signature,
    signature_type: signatureType,
    timestamp: new Date().toISOString()
  });
};

export const leaveChat = (username, chatId) => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }

  socket.emit('leave_chat', {
    username,
    chat_id: chatId
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};