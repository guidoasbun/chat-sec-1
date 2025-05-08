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
  disconnectSocket
} from '@/utils/socket';
import { encryptMessage, decryptMessage, signMessageRSA, signMessageDSA } from '@/utils/crypto';

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
    // Check if user is logged in
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    userRef.current = parsedUser; // Store user in ref for access in event handlers

    // Initialize Socket.IO connection
    if (!socketInitialized.current) {
      const socket = initializeSocket(parsedUser.username);
      
      // Listen for online users updates
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
      
      // Listen for chat invitations
      socket.on('chat_invitation', (data) => {
        handleChatInvitation(data, userRef.current);
      });
      
      // Listen for new messages
      socket.on('new_message', handleNewMessage);
      
      // Listen for users joining/leaving chat
      socket.on('user_joined', (data) => {
        console.log(`${data.username} joined the chat`);
      });
      
      socket.on('user_left', (data) => {
        console.log(`${data.username} left the chat`);
        setParticipants(prev => prev.filter(p => p !== data.username));
      });
      
      socketInitialized.current = true;
    }

    // Fetch online users
    fetchOnlineUsers();
    
    // Cleanup on unmount
    return () => {
      disconnectSocket();
    };
  }, [router]);

  const handleChatInvitation = (data, currentUser) => {
    if (!currentUser) {
      console.error("User data not available for chat invitation");
      return;
    }
    
    const { chat_id, initiator, participants, encrypted_key } = data;
    
    // Store chat information
    setChatId(chat_id);
    setParticipants(participants);
    
    // In a real app, we would decrypt the symmetric key using the user's private key
    // For this demo, we'll just use a placeholder
    const symmetricKey = "placeholder-symmetric-key";
    setSymmetricKey(symmetricKey);
    
    // Join the chat room
    const socket = getSocket();
    socket.emit('join_chat', {
      username: currentUser.username,
      chat_id: chat_id
    });
    
    console.log(`Joined chat initiated by ${initiator} with participants: ${participants.join(', ')}`);
  };
  
  const handleNewMessage = (data) => {
    const { sender, encrypted_message, signature, signature_type } = data;
    
    // For now, just display the encrypted message as-is
    // In a real app, we would decrypt using the symmetric key
    setMessages(prev => [...prev, {
      sender,
      text: encrypted_message, // Display the actual message content
      signatureType: signature_type,
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
    sendEncryptedMessage(
      chatId,
      user.username,
      message,
      signatureType,
      user.privateKey
    );
    
    // Add message to local state (for immediate display)
    setMessages(prev => [...prev, {
      sender: user.username,
      text: message,
      signatureType,
      timestamp: new Date().toISOString()
    }]);
    
    setMessage("");
  };
  
  const handleLeaveChat = () => {
    if (!chatId) return;
    
    leaveChat(user.username, chatId);
    setChatId(null);
    setMessages([]);
    setParticipants([]);
  };

  const logout = () => {
    localStorage.removeItem("user");
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
                    Signed with: {msg.signatureType}
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
