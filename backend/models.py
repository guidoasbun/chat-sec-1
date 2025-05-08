from pymongo import MongoClient
from dotenv import load_dotenv
import os
from datetime import datetime

# Load environment variables
load_dotenv()

# MongoDB connection
mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(mongo_uri)
db = client['chat_sec_1_db']

class User:
    """User model for database operations"""
    
    @staticmethod
    def create(username, password, public_key, private_key):
        """Create a new user"""
        user_data = {
            'username': username,
            'password': password,  # In a real app, hash this password
            'public_key': public_key,
            'private_key': private_key,  # In a real app, encrypt this or store client-side
            'online': False,
            'created_at': datetime.utcnow()
        }
        
        result = db.users.insert_one(user_data)
        return result.inserted_id
    
    @staticmethod
    def find_by_username(username):
        """Find a user by username"""
        return db.users.find_one({'username': username})
    
    @staticmethod
    def update_online_status(username, status):
        """Update user's online status"""
        db.users.update_one(
            {'username': username},
            {'$set': {'online': status}}
        )
    
    @staticmethod
    def get_online_users():
        """Get all online users"""
        return list(db.users.find({'online': True}, {'username': 1, '_id': 0}))

class Message:
    """Message model for database operations"""
    
    @staticmethod
    def create(chat_id, sender, encrypted_message, signature, signature_type):
        """Create a new message"""
        message_data = {
            'chat_id': chat_id,
            'sender': sender,
            'encrypted_message': encrypted_message,
            'signature': signature,
            'signature_type': signature_type,
            'timestamp': datetime.utcnow()
        }
        
        result = db.messages.insert_one(message_data)
        return result.inserted_id
    
    @staticmethod
    def get_chat_messages(chat_id):
        """Get all messages for a chat"""
        return list(db.messages.find({'chat_id': chat_id}).sort('timestamp', 1))

class Chat:
    """Chat model for database operations"""
    
    @staticmethod
    def create(initiator, participants):
        """Create a new chat"""
        chat_data = {
            'initiator': initiator,
            'participants': participants,
            'created_at': datetime.utcnow(),
            'active': True
        }
        
        result = db.chats.insert_one(chat_data)
        return result.inserted_id
    
    @staticmethod
    def find_by_id(chat_id):
        """Find a chat by ID"""
        return db.chats.find_one({'_id': chat_id})
    
    @staticmethod
    def update_participants(chat_id, participants):
        """Update chat participants"""
        db.chats.update_one(
            {'_id': chat_id},
            {'$set': {'participants': participants}}
        )
    
    @staticmethod
    def deactivate(chat_id):
        """Deactivate a chat"""
        db.chats.update_one(
            {'_id': chat_id},
            {'$set': {'active': False}}
        )
