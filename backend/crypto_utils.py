from cryptography.hazmat.primitives.asymmetric import rsa, padding, dsa, utils
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import os

def generate_rsa_key_pair():
    """Generate an RSA key pair for asymmetric encryption"""
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
    
    return private_pem, public_pem

def generate_dsa_key_pair():
    """Generate a DSA key pair for digital signatures"""
    private_key = dsa.generate_private_key(
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
    
    return private_pem, public_pem

def generate_symmetric_key():
    """Generate a random symmetric key for AES encryption"""
    return os.urandom(32)  # 256-bit key

def encrypt_with_rsa(public_key_pem, data):
    """Encrypt data using RSA public key"""
    public_key = serialization.load_pem_public_key(
        public_key_pem.encode('utf-8')
    )
    
    encrypted_data = public_key.encrypt(
        data,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    return encrypted_data

def decrypt_with_rsa(private_key_pem, encrypted_data):
    """Decrypt data using RSA private key"""
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode('utf-8'),
        password=None
    )
    
    decrypted_data = private_key.decrypt(
        encrypted_data,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    return decrypted_data

def sign_with_rsa(private_key_pem, message):
    """Sign a message using RSA private key"""
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode('utf-8'),
        password=None
    )
    
    signature = private_key.sign(
        message,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    
    return signature

def verify_rsa_signature(public_key_pem, message, signature):
    """Verify an RSA signature"""
    public_key = serialization.load_pem_public_key(
        public_key_pem.encode('utf-8')
    )
    
    try:
        public_key.verify(
            signature,
            message,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return True
    except Exception:
        return False

def sign_with_dsa(private_key_pem, message):
    """Sign a message using DSA private key"""
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode('utf-8'),
        password=None
    )
    
    signature = private_key.sign(
        message,
        hashes.SHA256()
    )
    
    return signature

def verify_dsa_signature(public_key_pem, message, signature):
    """Verify a DSA signature"""
    public_key = serialization.load_pem_public_key(
        public_key_pem.encode('utf-8')
    )
    
    try:
        public_key.verify(
            signature,
            message,
            hashes.SHA256()
        )
        return True
    except Exception:
        return False
