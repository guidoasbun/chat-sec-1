from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from pymongo import MongoClient
from cryptography.hazmat.primitives.asymmetric import rsa, padding, dsa
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv
from bson.json_util import dumps
from bson.objectid import ObjectId

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
# Use threading mode instead of eventlet to avoid compatibility issues with Python 3.13
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000", async_mode='threading', json=json)

# MongoDB connection
mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(mongo_uri)
db = client['chat_sec_1_db']
users_collection = db['users']
messages_collection = db['messages']

# In-memory storage for online users and their sessions
online_users = {}
active_chats = {}

# Helper function to convert MongoDB document to JSON-serializable dict
def mongo_to_dict(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    return obj

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    # Check if user already exists
    if users_collection.find_one({'username': username}):
        return jsonify({'success': False, 'message': 'Username already exists'}), 400
    
    # Generate RSA key pair for the user
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )
    
    public_key = private_key.public_key()
    
    # Serialize keys for storage
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')
    
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')
    
    # Store user in database
    user_data = {
        'username': username,
        'password': password,  # In a real app, hash this password
        'public_key': public_pem,
        'private_key': private_pem,  # In a real app, encrypt this or store client-side
        'online': False
    }
    
    users_collection.insert_one(user_data)
    
    return jsonify({
        'success': True, 
        'message': 'User registered successfully',
        'public_key': public_pem
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    user = users_collection.find_one({'username': username})
    
    if not user or user['password'] != password:
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
    
    # Update user status to online
    users_collection.update_one(
        {'username': username},
        {'$set': {'online': True}}
    )
    
    return jsonify({
        'success': True,
        'message': 'Login successful',
        'user': {
            'username': user['username'],
            'public_key': user['public_key'],
            'private_key': user['private_key']  # In a real app, this should be handled differently
        }
    }), 200

@app.route('/api/users/online', methods=['GET'])
def get_online_users():
    online = list(users_collection.find({'online': True}, {'username': 1, '_id': 0}))
    return jsonify({'users': [user['username'] for user in online]}), 200

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    for username, sid in list(online_users.items()):
        if sid == request.sid:
            online_users.pop(username, None)
            users_collection.update_one(
                {'username': username},
                {'$set': {'online': False}}
            )
            emit('user_offline', {'username': username}, broadcast=True)
            break
    print('Client disconnected')

@socketio.on('user_login')
def handle_user_login(data):
    username = data['username']
    online_users[username] = request.sid
    emit('user_online', {'username': username}, broadcast=True)

@socketio.on('initiate_chat')
def handle_initiate_chat(data):
    initiator = data['initiator']
    participants = data['participants']
    
    # Check if all participants are online
    offline_users = []
    for user in participants:
        if user not in online_users:
            offline_users.append(user)
    
    if offline_users:
        emit('chat_error', {
            'message': 'Some users are offline',
            'offline_users': offline_users
        })
        return
    
    # Generate a symmetric key for the chat
    symmetric_key = os.urandom(32)  # 256-bit key
    
    # Create a unique chat room
    chat_id = f"chat_{os.urandom(8).hex()}"
    
    # Store chat information
    active_chats[chat_id] = {
        'initiator': initiator,
        'participants': participants + [initiator],
        'symmetric_key': symmetric_key
    }
    
    # Distribute the key to all participants
    all_participants = participants + [initiator]
    for participant in all_participants:
        # Get user's public key
        user = users_collection.find_one({'username': participant})
        if not user:
            continue
        
        # Load the public key
        public_key = serialization.load_pem_public_key(
            user['public_key'].encode('utf-8')
        )
        
        # Encrypt the symmetric key with the user's public key
        encrypted_key = public_key.encrypt(
            symmetric_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        # Send the encrypted key to the user
        emit('chat_invitation', {
            'chat_id': chat_id,
            'initiator': initiator,
            'participants': all_participants,
            'encrypted_key': encrypted_key.hex()
        }, room=online_users[participant])
        
        # Add user to the chat room
        join_room(chat_id, sid=online_users[participant])

@socketio.on('join_chat')
def handle_join_chat(data):
    username = data['username']
    chat_id = data['chat_id']
    
    # Notify others that user has joined
    emit('user_joined', {'username': username}, room=chat_id)

@socketio.on('leave_chat')
def handle_leave_chat(data):
    username = data['username']
    chat_id = data['chat_id']
    
    # Remove user from chat room
    leave_room(chat_id, sid=online_users[username])
    
    # Notify others that user has left
    emit('user_left', {'username': username}, room=chat_id)
    
    # If this was the last user, clean up the chat
    if chat_id in active_chats and len(active_chats[chat_id]['participants']) == 1:
        del active_chats[chat_id]

@socketio.on('send_message')
def handle_send_message(data):
    username = data['username']
    chat_id = data['chat_id']
    encrypted_message = data['encrypted_message']
    signature = data['signature']
    signature_type = data['signature_type']  # 'RSA' or 'DSA'
    
    # Store message in database
    message_data = {
        'chat_id': chat_id,
        'sender': username,
        'encrypted_message': encrypted_message,
        'signature': signature,
        'signature_type': signature_type,
        'timestamp': data.get('timestamp', None)
    }
    
    # Insert message and get the inserted ID
    result = messages_collection.insert_one(message_data)
    
    # Create a JSON-serializable copy of the message data
    serializable_message = message_data.copy()
    serializable_message['_id'] = str(result.inserted_id)  # Convert ObjectId to string
    
    # Broadcast message to all users in the chat
    emit('new_message', serializable_message, room=chat_id)

if __name__ == '__main__':
    # Use port 5001 instead of 5000 to avoid conflict with AirPlay
    port = 5001
    socketio.run(app, debug=True, host='0.0.0.0', port=port)
