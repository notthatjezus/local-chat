# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from db_manager import db_manager
from auth import hash_password, verify_password, generate_token, token_required
from datetime import datetime
import os
import uuid
from PIL import Image
import io
import base64

api = Blueprint('api', __name__)

# Настройки для загрузки файлов
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'txt', 'zip'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Разрешенные аудио форматы для голосовых сообщений
ALLOWED_AUDIO_EXTENSIONS = {'webm', 'mp3', 'wav', 'ogg', 'm4a'}

def allowed_audio_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_AUDIO_EXTENSIONS

# ==================== AUTH ROUTES ====================

@api.route('/auth/register', methods=['POST'])
def register():
    """Регистрация нового пользователя"""
    data = request.get_json()

    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    if not email or not password or not name:
        return jsonify({'error': 'Все поля обязательны'}), 400

    if db_manager.find_user_by_email(email):
        return jsonify({'error': 'Пользователь с таким email уже существует'}), 400

    hashed_password = hash_password(password)
    
    # Генерируем уникальный ID
    user_id = str(int(datetime.now().timestamp() * 1000))

    user = db_manager.create_user({
        'id': user_id,
        'email': email,
        'password': hashed_password,
        'name': name,
        'avatar': f'https://api.dicebear.com/7.x/avataaars/svg?seed={name}',
        'bio': ''
    })

    token = generate_token(user['id'])

    user_without_password = {k: v for k, v in user.items() if k != 'password'}

    return jsonify({
        'user': user_without_password,
        'token': token
    }), 201

@api.route('/auth/login', methods=['POST'])
def login():
    """Вход пользователя"""
    data = request.get_json()
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email и пароль обязательны'}), 400
    
    user = db_manager.find_user_by_email(email)
    
    if not user or not verify_password(password, user['password']):
        return jsonify({'error': 'Неверный email или пароль'}), 401
    
    token = generate_token(user['id'])
    
    user_without_password = {k: v for k, v in user.items() if k != 'password'}
    
    return jsonify({
        'user': user_without_password,
        'token': token
    })

# ==================== USER ROUTES ====================

@api.route('/users/me', methods=['GET'])
@token_required
def get_current_user():
    """Получить текущего пользователя"""
    user = db_manager.find_user_by_id(request.user_id)
    
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    user_without_password = {k: v for k, v in user.items() if k != 'password'}
    return jsonify(user_without_password)

@api.route('/users/me', methods=['PUT'])
@token_required
def update_profile():
    """Обновить профиль пользователя"""
    data = request.get_json()
    
    updates = {}
    if 'name' in data:
        updates['name'] = data['name']
    if 'bio' in data:
        updates['bio'] = data['bio']
    if 'avatar' in data:
        updates['avatar'] = data['avatar']
    
    updated_user = db_manager.update_user(request.user_id, updates)
    
    if not updated_user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    return jsonify(updated_user)

@api.route('/users/me/avatar', methods=['POST'])
@token_required
def upload_avatar():
    """Загрузить аватар пользователя"""
    if 'avatar' not in request.files:
        return jsonify({'error': 'Файл не найден'}), 400
    
    file = request.files['avatar']
    
    if file.filename == '':
        return jsonify({'error': 'Файл не выбран'}), 400
    
    if file and allowed_file(file.filename):
        # Генерируем уникальное имя файла
        filename = f"avatar_{request.user_id}_{uuid.uuid4().hex}.jpg"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        # Сжимаем и сохраняем изображение
        try:
            image = Image.open(file.stream)
            image = image.convert('RGB')
            image.thumbnail((400, 400))
            image.save(filepath, 'JPEG', quality=85)
            
            # Обновляем аватар в БД
            avatar_url = f'/uploads/{filename}'
            db_manager.update_user(request.user_id, {'avatar': avatar_url})
            
            return jsonify({'avatar': avatar_url}), 200
        except Exception as e:
            return jsonify({'error': f'Ошибка обработки изображения: {str(e)}'}), 500
    
    return jsonify({'error': 'Неподдерживаемый формат файла'}), 400

@api.route('/users', methods=['GET'])
@token_required
def get_all_users():
    """Получить всех пользователей"""
    users = db_manager.get_all_users()
    users = [u for u in users if u['id'] != request.user_id]
    return jsonify(users)

@api.route('/users/contacts', methods=['GET'])
@token_required
def get_contacts():
    """Получить контакты пользователя"""
    contacts = db_manager.get_user_contacts(request.user_id)
    return jsonify(contacts)

# ==================== MESSAGE ROUTES ====================

@api.route('/messages/<contact_id>', methods=['GET'])
@token_required
def get_messages(contact_id):
    """Получить историю сообщений"""
    if contact_id.startswith('group_'):
        messages = db_manager.get_messages(request.user_id, group_id=contact_id)
        db_manager.mark_messages_as_read(request.user_id, group_id=contact_id)
    else:
        messages = db_manager.get_messages(request.user_id, contact_id)
        db_manager.mark_messages_as_read(request.user_id, contact_id)
    
    return jsonify(messages)

@api.route('/messages/<message_id>', methods=['PUT'])
@token_required
def edit_message(message_id):
    """Редактировать сообщение"""
    data = request.get_json()
    new_text = data.get('text')
    
    if not new_text:
        return jsonify({'error': 'Текст сообщения обязателен'}), 400

    # Проверяем, что сообщение принадлежит пользователю
    from models import Message
    message = Message.query.get(message_id)
    if not message:
        return jsonify({'error': 'Сообщение не найдено'}), 404

    if message.sender_id != request.user_id:
        return jsonify({'error': 'Нет прав на редактирование'}), 403
    
    updated_message = db_manager.update_message(message_id, new_text)
    
    if updated_message:
        return jsonify(updated_message), 200
    
    return jsonify({'error': 'Ошибка обновления сообщения'}), 500

@api.route('/messages/<message_id>', methods=['DELETE'])
@token_required
def delete_message(message_id):
    """Удалить сообщение"""
    from flask import request as flask_request
    from models import Message
    
    delete_type = flask_request.args.get('deleteType', 'all')

    message = Message.query.get(message_id)
    if not message:
        return jsonify({'error': 'Сообщение не найдено'}), 404

    if message.sender_id != request.user_id:
        return jsonify({'error': 'Нет прав на удаление'}), 403

    # Удаляем сообщение
    if delete_type == 'self':
        # Удаление только у себя (добавляем флаг deletedForSelf)
        result = db_manager.delete_message_for_user(message_id, request.user_id)
    else:
        # Удаление у всех
        result = db_manager.delete_message(message_id)

    if result:
        return jsonify({'success': True, 'deleteType': delete_type}), 200

    return jsonify({'error': 'Ошибка удаления сообщения'}), 500

# ==================== FILE UPLOAD ====================

# Разрешенные форматы для изображений и документов
ALLOWED_FILE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'txt', 'zip', 'rar', '7z', 'tar', 'gz', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mp3', 'wav', 'ogg', 'flac', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'rtf', 'odt', 'ods', 'odp'}

def allowed_file_extension(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_FILE_EXTENSIONS

@api.route('/upload', methods=['POST'])
@token_required
def upload_file():
    """Загрузить файл (изображение или документ)"""
    if 'file' not in request.files:
        return jsonify({'error': 'Файл не найден'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'Файл не выбран'}), 400

    # Проверяем, является ли файл аудио (для голосовых сообщений)
    is_audio = file.content_type and file.content_type.startswith('audio/')

    if file and (allowed_file_extension(file.filename) or is_audio):
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)

        file.save(filepath)

        # Исправляем путь: убираем /api, так как Blueprint уже имеет префикс /api
        file_url = f'/uploads/{unique_filename}'

        # Определяем MIME-тип
        file_ext = filename.rsplit('.', 1)[1].lower()
        mime_type = file.content_type
        
        # Если MIME-тип не определён, пытаемся угадать по расширению
        if not mime_type:
            if file_ext in ['jpg', 'jpeg']:
                mime_type = 'image/jpeg'
            elif file_ext == 'png':
                mime_type = 'image/png'
            elif file_ext == 'gif':
                mime_type = 'image/gif'
            elif file_ext == 'webp':
                mime_type = 'image/webp'
            elif file_ext == 'svg':
                mime_type = 'image/svg+xml'
            elif file_ext == 'pdf':
                mime_type = 'application/pdf'
            elif file_ext in ['doc', 'docx']:
                mime_type = 'application/msword'
            elif file_ext in ['xls', 'xlsx']:
                mime_type = 'application/vnd.ms-excel'
            elif file_ext == 'txt':
                mime_type = 'text/plain'
            elif file_ext == 'zip':
                mime_type = 'application/zip'
            elif file_ext == 'mp4':
                mime_type = 'video/mp4'
            elif file_ext == 'mp3':
                mime_type = 'audio/mpeg'
            else:
                mime_type = 'application/octet-stream'

        return jsonify({
            'url': file_url,
            'filename': filename,
            'type': mime_type
        }), 200

    return jsonify({'error': 'Неподдерживаемый формат файла'}), 400

@api.route('/uploads/<filename>', methods=['GET'])
def get_uploaded_file(filename):
    """Получить загруженный файл"""
    return send_from_directory(UPLOAD_FOLDER, filename)

# ==================== GROUP ROUTES ====================

@api.route('/groups', methods=['POST'])
@token_required
def create_group():
    """Создать группу"""
    data = request.get_json()
    
    name = data.get('name')
    members = data.get('members', [])
    
    if not name:
        return jsonify({'error': 'Название группы обязательно'}), 400
    
    # Создатель автоматически добавляется в группу
    if request.user_id not in members:
        members.append(request.user_id)
    
    group = db_manager.create_group({
        'name': name,
        'avatar': data.get('avatar', 'https://api.dicebear.com/7.x/identicon/svg?seed=' + name),
        'description': data.get('description', ''),
        'members': members,
        'admins': [request.user_id],
        'createdBy': request.user_id
    })
    
    return jsonify(group), 201

@api.route('/groups/<group_id>', methods=['GET'])
@token_required
def get_group(group_id):
    """Получить информацию о группе"""
    group = db_manager.find_group_by_id(group_id)
    
    if not group:
        return jsonify({'error': 'Группа не найдена'}), 404
    
    if request.user_id not in group['members']:
        return jsonify({'error': 'Нет доступа к группе'}), 403
    
    return jsonify(group)

@api.route('/groups/<group_id>', methods=['PUT'])
@token_required
def update_group(group_id):
    """Обновить группу"""
    group = db_manager.find_group_by_id(group_id)
    
    if not group:
        return jsonify({'error': 'Группа не найдена'}), 404
    
    if request.user_id not in group['admins']:
        return jsonify({'error': 'Только администраторы могут редактировать группу'}), 403
    
    data = request.get_json()
    updates = {}
    
    if 'name' in data:
        updates['name'] = data['name']
    if 'description' in data:
        updates['description'] = data['description']
    if 'avatar' in data:
        updates['avatar'] = data['avatar']
    
    updated_group = db_manager.update_group(group_id, updates)
    return jsonify(updated_group)

@api.route('/groups/<group_id>/members', methods=['POST'])
@token_required
def add_group_member(group_id):
    """Добавить участника в группу"""
    group = db_manager.find_group_by_id(group_id)
    
    if not group:
        return jsonify({'error': 'Группа не найдена'}), 404
    
    if request.user_id not in group['admins']:
        return jsonify({'error': 'Только администраторы могут добавлять участников'}), 403
    
    data = request.get_json()
    user_id = data.get('userId')
    
    if not user_id:
        return jsonify({'error': 'ID пользователя обязателен'}), 400
    
    updated_group = db_manager.add_group_member(group_id, user_id)
    
    if updated_group:
        return jsonify(updated_group), 200
    
    return jsonify({'error': 'Ошибка добавления участника'}), 500

@api.route('/groups/<group_id>/members/<user_id>', methods=['DELETE'])
@token_required
def remove_group_member(group_id, user_id):
    """Удалить участника из группы"""
    group = db_manager.find_group_by_id(group_id)
    
    if not group:
        return jsonify({'error': 'Группа не найдена'}), 404
    
    if request.user_id not in group['admins'] and request.user_id != user_id:
        return jsonify({'error': 'Недостаточно прав'}), 403
    
    updated_group = db_manager.remove_group_member(group_id, user_id)
    
    if updated_group:
        return jsonify(updated_group), 200
    
    return jsonify({'error': 'Ошибка удаления участника'}), 500

@api.route('/groups/<group_id>', methods=['DELETE'])
@token_required
def delete_group(group_id):
    """Удалить группу"""
    group = db_manager.find_group_by_id(group_id)
    
    if not group:
        return jsonify({'error': 'Группа не найдена'}), 404
    
    if group['createdBy'] != request.user_id:
        return jsonify({'error': 'Только создатель может удалить группу'}), 403
    
    if db_manager.delete_group(group_id):
        return jsonify({'success': True}), 200
    
    return jsonify({'error': 'Ошибка удаления группы'}), 500