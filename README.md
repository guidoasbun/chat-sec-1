# Chat-Sec: Secure Chat Application

**Chat-Sec** is a secure, real-time chat application that enables authenticated users to exchange end-to-end encrypted and digitally signed messages. The system is designed with strong cryptographic protocols and supports group chats with dynamic key distribution.

---

## Features

- Secure symmetric key distribution via RSA encryption
- End-to-end encrypted messaging with AES-256
- Digital signature support (RSA or DSA)
- Real-time chat using Flask-Socket.IO and WebSockets
- Scalable frontend built in Next.js

---

## Architecture

- **Frontend**: Next.js (JavaScript)
- **Backend**: Flask + Socket.IO (Python)
- **Database**: MongoDB (user data & message history)

---

## Proposed Cloud Infrastructure

![Infrastructure Diagram](./public/infrastructure.png)

---

## Security Features

- **Asymmetric Encryption (RSA-4096)**: For secure key exchange
- **Symmetric Encryption (AES-256)**: For chat message confidentiality
- **Digital Signatures (RSA or DSA)**: For message integrity and authenticity
- **Password Security**: Passwords are hashed before storage using strong cryptographic hashing
- **Input Sanitization**: Applied on both frontend and backend to prevent injection attacks

---

## Setup Instructions

### Prerequisites

- Node.js v18+
- Python 3.8+
- MongoDB
- AWS account with Cognito configured

---

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create a `.env.local` in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_SOCKET_URL=http://localhost:5001
```

---

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Create a `.env` in the `backend` directory:

```env
SECRET_KEY=your_secret_key_here
MONGO_URI=mongodb://localhost:27017/chat-sec
```

---

## Usage

1. Register or log in via the frontend
2. View online users
3. Invite users to a secure chat session
4. Receive and decrypt the session’s symmetric key
5. Start messaging securely with real-time encryption and signatures
6. Messages are encrypted using AES-256 and signed using RSA or DSA

---

## Security Protocols

### Key Exchange
- Server generates a unique symmetric AES key per session
- Encrypts the AES key with each participant’s RSA public key
- Clients decrypt using their private RSA key

### Message Encryption
- AES (256-bit) in CBC or GCM mode (depending on implementation)
- Secure IV management and key lifecycle control

### Digital Signatures
- Users choose RSA or DSA for signing messages
- Signature and public key metadata included with messages
- Recipients verify sender identity and message integrity

---

## Testing and Validation

- Unit tests written for cryptographic functions
- Penetration testing for key leakage and XSS
- Real-time encrypted chat verified across multiple clients
- Load testing using concurrent users

---

## Future Improvements

- Add ephemeral key exchange (Diffie-Hellman)
- Store chat logs in encrypted form in MongoDB
- Role-based access control for admin features
- Desktop app integration via Tkinter

---

## License

MIT License
