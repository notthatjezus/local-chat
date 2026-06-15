#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для миграции данных из JSON файла в SQLite базу данных
"""
import json
import os
import sys

# Добавляем путь к серверу
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, User, Message, Group, GroupMember
from datetime import datetime

def migrate_data():
    """Миграция данных из JSON в SQLite"""
    
    json_file = 'data.json'
    if not os.path.exists(json_file):
        print(f"❌ Файл {json_file} не найден!")
        return
    
    print(f"📂 Чтение данных из {json_file}...")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    users_data = data.get('users', [])
    messages_data = data.get('messages', [])
    groups_data = data.get('groups', [])
    
    print(f"   Найдено: пользователей: {len(users_data)}, сообщений: {len(messages_data)}, групп: {len(groups_data)}")
    
    with app.app_context():
        # Очищаем базу перед миграцией
        print("\n🗑️ Очистка базы данных...")
        db.drop_all()
        db.create_all()
        
        # Миграция пользователей
        print(f"\n👥 Миграция пользователей...")
        for user_data in users_data:
            user = User(
                id=user_data['id'],
                email=user_data['email'],
                password=user_data['password'],
                name=user_data['name'],
                avatar=user_data.get('avatar', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user_data['name']),
                bio=user_data.get('bio', ''),
                status=user_data.get('status', 'offline')
            )
            if 'createdAt' in user_data:
                try:
                    user.created_at = datetime.fromisoformat(user_data['createdAt'])
                except:
                    pass
            db.session.add(user)
            print(f"   ✅ {user.email}")
        
        db.session.commit()
        
        # Миграция групп
        print(f"\n👥 Миграция групп...")
        for group_data in groups_data:
            group = Group(
                id=group_data['id'],
                name=group_data['name'],
                avatar=group_data.get('avatar'),
                description=group_data.get('description', ''),
                created_by=group_data.get('createdBy'),
                admins=group_data.get('admins', [])
            )
            if 'createdAt' in group_data:
                try:
                    group.created_at = datetime.fromisoformat(group_data['createdAt'])
                except:
                    pass
            db.session.add(group)
            
            # Добавляем участников
            for member_id in group_data.get('members', []):
                member = GroupMember(group_id=group.id, user_id=member_id)
                db.session.add(member)
                print(f"   ✅ Группа '{group.name}' + участник {member_id}")
            
            print(f"   ✅ Группа '{group.name}'")
        
        db.session.commit()
        
        # Миграция сообщений
        print(f"\n💬 Миграция сообщений...")
        for message_data in messages_data:
            message = Message(
                id=message_data['id'],
                sender_id=message_data['senderId'],
                receiver_id=message_data.get('receiverId'),
                group_id=message_data.get('groupId'),
                text=message_data.get('text', ''),
                file_url=message_data.get('fileUrl'),
                file_name=message_data.get('fileName'),
                file_type=message_data.get('fileType'),
                audio_url=message_data.get('audioUrl'),
                audio_duration=message_data.get('audioDuration'),
                status=message_data.get('status', 'sent'),
                edited=message_data.get('edited', False),
                deleted_for=message_data.get('deletedFor', [])
            )
            if 'timestamp' in message_data:
                try:
                    message.timestamp = datetime.fromisoformat(message_data['timestamp'])
                except:
                    pass
            if 'editedAt' in message_data and message_data['editedAt']:
                try:
                    message.edited_at = datetime.fromisoformat(message_data['editedAt'])
                except:
                    pass
            db.session.add(message)
        
        db.session.commit()
        print(f"   ✅ {len(messages_data)} сообщений")
        
        # Итоговая статистика
        print(f"\n✅ Миграция завершена!")
        print(f"   Пользователей: {User.query.count()}")
        print(f"   Сообщений: {Message.query.count()}")
        print(f"   Групп: {Group.query.count()}")


if __name__ == '__main__':
    migrate_data()
