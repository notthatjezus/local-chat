# -*- coding: utf-8 -*-
import jwt
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import os

JWT_SECRET = os.getenv('JWT_SECRET', 'your_secret_key')

def hash_password(password: str) -> str:
    """Хэшировать пароль"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Проверить пароль"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_token(user_id: str) -> str:
    """Генерировать JWT токен"""
    payload = {
        'userId': user_id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def decode_token(token: str) -> dict:
    """Декодировать JWT токен"""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        raise Exception('Токен истек')
    except jwt.InvalidTokenError:
        raise Exception('Неверный токен')

def token_required(f):
    """Декоратор для защиты маршрутов"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Неверный формат токена'}), 401
        
        if not token:
            return jsonify({'error': 'Требуется авторизация'}), 401
        
        try:
            data = decode_token(token)
            request.user_id = data['userId']
        except Exception as e:
            return jsonify({'error': str(e)}), 403
        
        return f(*args, **kwargs)
    
    return decorated