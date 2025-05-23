"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  initializeSocket, 
  getSocket, 
  initiateChatWithUsers,
  sendEncryptedMessage,
  setSymmetricKey,
  leaveChat,
  disconnectSocket,
  getSymmetricKey
} from '@/utils/socket';
import { decryptMessage, verifySignatureRSA, verifySignatureDSA, decryptSymmetricKey } from '@/utils/crypto';
import { sanitizeInput } from '@/utils/sanitize';

export default function Chat() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [signatureType, setSignatureType] = useState("RSA"); // Default to RSA
  const [participants, setParticipants] = useState([]);
  const socketInitialized = useRef(false);
  const userRef = useRef(null); // Add a ref to store the user data

  useEffect(() => {
    const fetchUserFromCookie = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/get-cookie', { withCredentials: true });
        const parsedUser = {
          ...response.data.user,
          public_key: response.data.user.public_key || response.data.user.publicKey,
          privateKey: response.data.user.private_key || response.data.user.privateKey
        };
        setUser(parsedUser);
        userRef.current = parsedUser;

        // initialize socket connection
        if (!socketInitialized.current) {
          const socket = initializeSocket(parsedUser.username);

          socket.on('user_online', (data) => {
            setOnlineUsers(prev => {
              if (!prev.includes(data.username)) {
                return [...prev, data.username];
              }
              return prev;
            });
          });

          socket.on('user_offline', (data) => {
            setOnlineUsers(prev => prev.filter(user => user !== data.username));
          });

          socket.on('chat_invitation', async (data) => {
            console.log("📩 Received chat_invitation:", data);
            await handleChatInvitation(data, userRef.current);
          });

          socket.on('new_message', handleNewMessage);

          socket.on('user_joined', (data) => {
            console.log(`${data.username} joined the chat`);
          });

          socket.on('user_left', (data) => {
            console.log(`${data.username} left the chat`);
            setParticipants(prev => prev.filter(p => p !== data.username));
          });

          socket.on('chat_error', (data) => {
            alert(`Error: ${data.message}. Offline: ${data.offline_users.join(', ')}`);
          });

          socketInitialized.current = true;
        }

        fetchOnlineUsers();
      } catch (error) {
        router.push("/login");
      }
    };

    fetchUserFromCookie(); // 👈 call the async function
    return () => {
      disconnectSocket();
    };
  }, [router]);


  const handleChatInvitation = async (data, currentUser) => {
    if (!currentUser) {
      console.error("User data not available for chat invitation");
      return;
    }

    const { chat_id, initiator, participants, encrypted_key } = data;

    // Store chat information
    setChatId(chat_id);
    setParticipants(participants);

    // Decrypt the symmetric key using the user's private key
    const symmetricKey = await decryptSymmetricKey(encrypted_key, currentUser.privateKey);
    console.log("Decrypted symmetric key:", symmetricKey);
    setSymmetricKey(symmetricKey);

    // Join the chat room
    const socket = getSocket();
    socket.emit('join_chat', {
      username: currentUser.username,
      chat_id: chat_id
    });

    console.log(`Joined chat initiated by ${initiator} with participants: ${participants.join(', ')}`);
  };

  const handleNewMessage = async (data) => {

    const { sender, encrypted_message, signature, signature_type } = data;
    const symmetricKey = getSymmetricKey();
    const decryptedText = decryptMessage(encrypted_message, symmetricKey);

// Lookup sender's public key from participant list (or fetch from server if needed)
    let senderPublicKey = null;
    const currentUser = userRef.current;

    if (sender === currentUser?.username) {
      senderPublicKey = currentUser.public_key || currentUser.publicKey;
    } else {
      // Fetch the sender’s public key from server if not found in participants list
      try {
        const res = await axios.get(`http://localhost:5001/api/users/public-key/${sender}`);
        senderPublicKey = res.data.public_key;
      } catch (err) {
        console.warn("Failed to fetch public key for sender:", sender, err);
        return;
      }
    }

    console.log("Current user:", userRef.current);
    if (!senderPublicKey) {
      console.warn("Missing public key for sender:", sender);
      return;
    }

    let isValid = false;
    if (signature_type === "RSA") {
      isValid = verifySignatureRSA(decryptedText, signature, senderPublicKey);
    } else {
      isValid = verifySignatureDSA(decryptedText, signature, senderPublicKey);
    }

    if (!isValid) {
      console.warn(`Invalid signature on message from ${sender}`);
    }

    setMessages(prev => [...prev, {
      sender,
      text: decryptedText,
      signatureType: signature_type,
      signatureValid: isValid, // ✅ or ❌
      timestamp: new Date().toISOString()
    }]);
  };

  const fetchOnlineUsers = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5001/api/users/online"
      );
      setOnlineUsers(response.data.users || []);
    } catch (error) {
      console.error("Error fetching online users:", error);
    }
  };

  const toggleUserSelection = (username) => {
    if (selectedUsers.includes(username)) {
      setSelectedUsers(selectedUsers.filter((user) => user !== username));
    } else {
      setSelectedUsers([...selectedUsers, username]);
    }
  };

  const initiateChat = () => {
    if (selectedUsers.length === 0) {
      alert("Please select at least one user to chat with");
      return;
    }

    // Initiate chat with selected users
    initiateChatWithUsers(user.username, selectedUsers);
  };

  const sendMessage = () => {
    if (!message.trim() || !chatId) return;
    
    // Send encrypted message
    try{
      const socket = getSocket();
      const sanitizedMessage = sanitizeInput(message);
      sendEncryptedMessage(
          chatId,
          user.username,
          sanitizedMessage,
          signatureType,
          user.privateKey
      );
    } catch (err) {
      console.error("Cannot send message:", err);
    }

    setMessage("");
  };
  
  const handleLeaveChat = () => {
    if (!chatId) return;
    
    leaveChat(user.username, chatId);
    setChatId(null);
    setMessages([]);
    setParticipants([]);
  };

  const logout = async () => {
    await axios.post('http://localhost:5001/api/logout', {}, { withCredentials: true });
    disconnectSocket();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-white p-4 border-r">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Your Profile</h2>
          {user && (
            <div className="p-3 bg-gray-100 rounded">
              <p className="font-medium">{user.username}</p>
              <p className="text-sm text-gray-500">Online</p>
            </div>
          )}
          <button
            onClick={logout}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Online Users</h2>
          <div className="space-y-2">
            {onlineUsers.length > 0 ? (
              onlineUsers.map((username) => (
                <div
                  key={username}
                  className={`p-3 rounded cursor-pointer ${
                    selectedUsers.includes(username)
                      ? "bg-blue-100 border border-blue-300"
                      : "bg-gray-100"
                  }`}
                  onClick={() => toggleUserSelection(username)}
                >
                  {username}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No users online</p>
            )}
          </div>
        </div>

        {selectedUsers.length > 0 && !chatId && (
          <div>
            <h3 className="font-medium mb-2">
              Selected Users: {selectedUsers.join(", ")}
            </h3>
            <button
              onClick={initiateChat}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Start Chat
            </button>
          </div>
        )}
        
        {chatId && (
          <div>
            <h3 className="font-medium mb-2">Current Chat</h3>
            <p className="text-sm mb-2">Participants: {participants.join(', ')}</p>
            <button 
              onClick={handleLeaveChat}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Leave Chat
            </button>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="w-3/4 flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg max-w-md ${
                    msg.sender === user?.username
                      ? "ml-auto bg-blue-500 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  <p className="font-medium">{msg.sender}</p>
                  <p>{msg.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    Signed with: {msg.signatureType} {msg.signatureValid ? "✅" : "❌"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">
                {chatId ? "No messages yet" : "Select users and start a chat"}
              </p>
            </div>
          )}
        </div>

        {chatId && (
          <div className="p-4 bg-white border-t">
            <div className="mb-2">
              <label className="mr-4">
                <input
                  type="radio"
                  value="RSA"
                  checked={signatureType === "RSA"}
                  onChange={() => setSignatureType("RSA")}
                  className="mr-1"
                />
                RSA Signature
              </label>
              <label>
                <input
                  type="radio"
                  value="DSA"
                  checked={signatureType === "DSA"}
                  onChange={() => setSignatureType("DSA")}
                  className="mr-1"
                />
                DSA Signature
              </label>
            </div>
            <div className="flex">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border rounded-l focus:outline-none"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
