# -*- coding: utf-8 -*-
from flask_socketio import emit, join_room, leave_room
from flask import request
from db_manager import db_manager
from models import User

# Хранилище активных пользователей {user_id: socket_id}
active_users = {}

def register_socket_events(socketio):
    """Регистрация Socket.IO событий"""

    @socketio.on('connect')
    def handle_connect():
        print(f'✅ Клиент подключен: {request.sid}')

    @socketio.on('disconnect')
    def handle_disconnect():
        print(f'❌ Клиент отключен: {request.sid}')

        disconnected_user_id = None
        for user_id, socket_id in list(active_users.items()):
            if socket_id == request.sid:
                disconnected_user_id = user_id
                del active_users[user_id]
                break

        if disconnected_user_id:
            db_manager.update_user(disconnected_user_id, {'status': 'offline'})
            emit('user:status', {
                'userId': disconnected_user_id,
                'status': 'offline'
            }, broadcast=True)
    
    @socketio.on('user:connect')
    def handle_user_connect(user_id):
        """Пользователь подключается"""
        active_users[user_id] = request.sid
        db_manager.update_user(user_id, {'status': 'online'})
        
        # Присоединяемся ко всем группам пользователя
        user_groups = db_manager.get_user_groups(user_id)
        for group in user_groups:
            join_room(group['id'])
        
        emit('user:status', {
            'userId': user_id,
            'status': 'online'
        }, broadcast=True)
        
        print(f'Пользователь {user_id} подключился')
    
    @socketio.on('message:send')
    def handle_message_send(data):
        """Отправка сообщения"""
        from datetime import datetime
        
        sender_id = data.get('senderId')
        receiver_id = data.get('receiverId')
        group_id = data.get('groupId')
        text = data.get('text')
        file_url = data.get('fileUrl')
        file_name = data.get('fileName')
        file_type = data.get('fileType')
        audio_url = data.get('audioUrl')
        audio_duration = data.get('audioDuration')

        # Генерируем уникальный ID для сообщения
        message_id = f"{int(datetime.now().timestamp() * 1000)}{len(db_manager.get_messages(sender_id, receiver_id, group_id))}"

        message_data = {
            'id': message_id,
            'senderId': sender_id,
            'text': text
        }

        if group_id:
            message_data['groupId'] = group_id
        else:
            message_data['receiverId'] = receiver_id

        if file_url:
            message_data['fileUrl'] = file_url
            message_data['fileName'] = file_name
            message_data['fileType'] = file_type

        if audio_url:
            message_data['audioUrl'] = audio_url
            message_data['audioDuration'] = audio_duration

        message = db_manager.create_message(message_data)

        if group_id:
            # Отправляем всем участникам группы
            emit('message:receive', message, room=group_id)
        else:
            # Личное сообщение
            emit('message:receive', message)

            receiver_socket_id = active_users.get(receiver_id)
            if receiver_socket_id:
                emit('message:receive', message, room=receiver_socket_id)
                db_manager.update_message_status(message['id'], 'delivered')
                emit('message:status', {
                    'messageId': message['id'],
                    'status': 'delivered'
                })
                emit('message:status', {
                    'messageId': message['id'],
                    'status': 'delivered'
                }, room=receiver_socket_id)
    
    @socketio.on('message:edit')
    def handle_message_edit(data):
        """Редактирование сообщения"""
        message_id = data.get('messageId')
        new_text = data.get('text')
        group_id = data.get('groupId')
        receiver_id = data.get('receiverId')
        
        updated_message = db_manager.update_message(message_id, new_text)
        
        if updated_message:
            if group_id:
                emit('message:edited', updated_message, room=group_id)
            else:
                emit('message:edited', updated_message)
                receiver_socket_id = active_users.get(receiver_id)
                if receiver_socket_id:
                    emit('message:edited', updated_message, room=receiver_socket_id)
    
    @socketio.on('message:delete')
    def handle_message_delete(data):
        """Удаление сообщения"""
        from flask import request as flask_request
        
        message_id = data.get('messageId')
        group_id = data.get('groupId')
        receiver_id = data.get('receiverId')
        delete_type = data.get('deleteType', 'all')
        sender_id = None

        # Находим отправителя сообщения
        from models import Message
        message = Message.query.get(message_id)
        if message:
            sender_id = message.sender_id
        
        if delete_type == 'self':
            # Удаление только у себя
            current_user_id = flask_request.sid  # Используем socket id для идентификации
            # Находим user_id по socket id
            for uid, sid in active_users.items():
                if sid == current_user_id:
                    current_user_id = uid
                    break
            
            db_manager.delete_message_for_user(message_id, current_user_id)
            
            # Отправляем событие только текущему пользователю
            emit('message:deleted', {
                'messageId': message_id,
                'deleteType': 'self',
                'userId': current_user_id
            })
        else:
            # Удаление у всех
            db_manager.delete_message(message_id)
            
            if group_id:
                emit('message:deleted', {
                    'messageId': message_id,
                    'deleteType': 'all'
                }, room=group_id)
            else:
                emit('message:deleted', {
                    'messageId': message_id,
                    'deleteType': 'all'
                })
                receiver_socket_id = active_users.get(receiver_id)
                if receiver_socket_id:
                    emit('message:deleted', {
                        'messageId': message_id,
                        'deleteType': 'all'
                    }, room=receiver_socket_id)
    
    @socketio.on('messages:read')
    def handle_messages_read(data):
        """Отметить сообщения как прочитанные"""
        user_id = data.get('userId')
        sender_id = data.get('senderId')
        group_id = data.get('groupId')
        
        if group_id:
            db_manager.mark_messages_as_read(user_id, group_id=group_id)
        else:
            db_manager.mark_messages_as_read(user_id, sender_id)
            sender_socket_id = active_users.get(sender_id)
            if sender_socket_id:
                emit('messages:read', {
                    'userId': user_id,
                    'senderId': sender_id
                }, room=sender_socket_id)
    
    @socketio.on('typing:start')
    def handle_typing_start(data):
        """Пользователь начал печатать"""
        sender_id = data.get('senderId')
        receiver_id = data.get('receiverId')
        group_id = data.get('groupId')
        
        if group_id:
            emit('typing:start', {'userId': sender_id}, room=group_id, include_self=False)
        else:
            receiver_socket_id = active_users.get(receiver_id)
            if receiver_socket_id:
                emit('typing:start', {'userId': sender_id}, room=receiver_socket_id)
    
    @socketio.on('typing:stop')
    def handle_typing_stop(data):
        """Пользователь перестал печатать"""
        sender_id = data.get('senderId')
        receiver_id = data.get('receiverId')
        group_id = data.get('groupId')
        
        if group_id:
            emit('typing:stop', {'userId': sender_id}, room=group_id, include_self=False)
        else:
            receiver_socket_id = active_users.get(receiver_id)
            if receiver_socket_id:
                emit('typing:stop', {'userId': sender_id}, room=receiver_socket_id)
    
    @socketio.on('group:join')
    def handle_group_join(group_id):
        """Присоединиться к комнате группы"""
        join_room(group_id)
        print(f'Пользователь присоединился к группе {group_id}')
    
    @socketio.on('group:leave')
    def handle_group_leave(group_id):
        """Покинуть комнату группы"""
        leave_room(group_id)
        print(f'Пользователь покинул группу {group_id}')