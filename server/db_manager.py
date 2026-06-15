# -*- coding: utf-8 -*-
from models import db, User, Message, Group, GroupMember
from datetime import datetime
from typing import List, Dict, Optional


class DatabaseManager:
    """Менеджер базы данных для работы с пользователями, сообщениями и группами"""
    
    # ==================== USERS ====================
    
    def create_user(self, user_data: Dict) -> Dict:
        """Создать нового пользователя"""
        user = User(
            id=user_data['id'],
            email=user_data['email'],
            password=user_data['password'],
            name=user_data['name'],
            avatar=user_data.get('avatar', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user_data['name']),
            bio=user_data.get('bio', ''),
            status='offline'
        )
        
        db.session.add(user)
        db.session.commit()
        
        print(f"✅ Создан пользователь: {user.email}")
        return user.to_dict()
    
    def find_user_by_email(self, email: str) -> Optional[Dict]:
        """Найти пользователя по email"""
        user = User.query.filter_by(email=email).first()
        return user.to_dict() if user else None
    
    def find_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Найти пользователя по ID"""
        user = User.query.get(user_id)
        return user.to_dict() if user else None
    
    def get_all_users(self) -> List[Dict]:
        """Получить всех пользователей"""
        users = User.query.all()
        return [u.to_dict() for u in users]
    
    def update_user(self, user_id: str, updates: Dict) -> Optional[Dict]:
        """Обновить данные пользователя"""
        user = User.query.get(user_id)
        if user:
            for key, value in updates.items():
                if hasattr(user, key):
                    setattr(user, key, value)
            db.session.commit()
            return user.to_dict()
        return None
    
    # ==================== MESSAGES ====================
    
    def create_message(self, message_data: Dict) -> Dict:
        """Создать новое сообщение"""
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
        
        db.session.add(message)
        db.session.commit()
        
        return message.to_dict()
    
    def get_messages(self, user_id1: str, user_id2: str = None, group_id: str = None) -> List[Dict]:
        """Получить историю сообщений"""
        if group_id:
            # Сообщения группы
            messages = Message.query.filter_by(group_id=group_id).order_by(Message.timestamp).all()
        else:
            # Личные сообщения
            messages = Message.query.filter(
                ((Message.sender_id == user_id1) & (Message.receiver_id == user_id2)) |
                ((Message.sender_id == user_id2) & (Message.receiver_id == user_id1))
            ).order_by(Message.timestamp).all()
        
        # Фильтруем сообщения, удалённые для текущего пользователя
        filtered_messages = [
            m.to_dict() for m in messages
            if not (m.deleted_for and user_id1 in m.deleted_for)
        ]
        
        return filtered_messages
    
    def update_message(self, message_id: str, new_text: str) -> Optional[Dict]:
        """Обновить текст сообщения"""
        message = Message.query.get(message_id)
        if message:
            message.text = new_text
            message.edited = True
            message.edited_at = datetime.utcnow()
            db.session.commit()
            return message.to_dict()
        return None
    
    def delete_message(self, message_id: str) -> bool:
        """Удалить сообщение полностью"""
        message = Message.query.get(message_id)
        if message:
            db.session.delete(message)
            db.session.commit()
            return True
        return False
    
    def delete_message_for_user(self, message_id: str, user_id: str) -> bool:
        """Отметить сообщение как удалённое для пользователя"""
        message = Message.query.get(message_id)
        if message:
            if not message.deleted_for:
                message.deleted_for = []
            if user_id not in message.deleted_for:
                message.deleted_for.append(user_id)
            db.session.commit()
            return True
        return False
    
    def update_message_status(self, message_id: str, status: str) -> Optional[Dict]:
        """Обновить статус сообщения"""
        message = Message.query.get(message_id)
        if message:
            message.status = status
            db.session.commit()
            return message.to_dict()
        return None
    
    def mark_messages_as_read(self, user_id: str, sender_id: str = None, group_id: str = None):
        """Отметить сообщения как прочитанные"""
        if group_id:
            messages = Message.query.filter_by(group_id=group_id, receiver_id=user_id).all()
        else:
            messages = Message.query.filter_by(receiver_id=user_id, sender_id=sender_id).all()
        
        for message in messages:
            if message.status != 'read':
                message.status = 'read'
        
        db.session.commit()
    
    def get_user_contacts(self, user_id: str) -> List[Dict]:
        """Получить список контактов пользователя"""
        # Личные контакты
        contact_ids = set()
        
        # Отправленные сообщения
        sent = Message.query.filter_by(sender_id=user_id).all()
        for m in sent:
            if m.receiver_id and not m.group_id:
                contact_ids.add(m.receiver_id)
        
        # Полученные сообщения
        received = Message.query.filter_by(receiver_id=user_id).all()
        for m in received:
            if not m.group_id:
                contact_ids.add(m.sender_id)
        
        contacts = []
        for contact_id in contact_ids:
            user = User.query.get(contact_id)
            if not user:
                continue
            
            messages = self.get_messages(user_id, contact_id)
            last_message = messages[-1] if messages else None
            
            unread_count = sum(
                1 for m in Message.query.filter_by(receiver_id=user_id, sender_id=contact_id).all()
                if m.status != 'read'
            )
            
            contacts.append({
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'avatar': user.avatar,
                'status': user.status,
                'lastMessage': last_message.get('text', '') if last_message else '',
                'lastMessageTime': last_message['timestamp'] if last_message else '',
                'unreadCount': unread_count,
                'type': 'personal'
            })
        
        # Группы
        user_groups = self.get_user_groups(user_id)
        for group in user_groups:
            group_messages = self.get_messages(user_id, group_id=group['id'])
            last_message = group_messages[-1] if group_messages else None
            
            unread_count = sum(
                1 for m in Message.query.filter_by(group_id=group['id']).all()
                if m.sender_id != user_id and m.status != 'read'
            )
            
            contacts.append({
                'id': group['id'],
                'name': group['name'],
                'avatar': group['avatar'],
                'status': 'online',
                'lastMessage': last_message.get('text', '') if last_message else '',
                'lastMessageTime': last_message['timestamp'] if last_message else '',
                'unreadCount': unread_count,
                'type': 'group',
                'members': group['members']
            })
        
        # Сортируем по времени последнего сообщения
        contacts.sort(key=lambda c: c.get('lastMessageTime', ''), reverse=True)
        return contacts
    
    # ==================== GROUPS ====================
    
    def create_group(self, group_data: Dict) -> Dict:
        """Создать группу"""
        group = Group(
            id=group_data['id'],
            name=group_data['name'],
            avatar=group_data.get('avatar'),
            description=group_data.get('description', ''),
            created_by=group_data['createdBy'],
            admins=group_data.get('admins', [])
        )
        
        db.session.add(group)
        
        # Добавляем участников
        for member_id in group_data.get('members', []):
            member = GroupMember(group_id=group.id, user_id=member_id)
            db.session.add(member)
        
        db.session.commit()
        
        print(f"✅ Создана группа: {group.name}")
        return group.to_dict()
    
    def find_group_by_id(self, group_id: str) -> Optional[Dict]:
        """Найти группу по ID"""
        group = Group.query.get(group_id)
        return group.to_dict() if group else None
    
    def update_group(self, group_id: str, updates: Dict) -> Optional[Dict]:
        """Обновить данные группы"""
        group = Group.query.get(group_id)
        if group:
            for key, value in updates.items():
                if hasattr(group, key):
                    setattr(group, key, value)
            db.session.commit()
            return group.to_dict()
        return None
    
    def add_group_member(self, group_id: str, user_id: str) -> Optional[Dict]:
        """Добавить участника в группу"""
        group = Group.query.get(group_id)
        if group:
            existing = GroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
            if not existing:
                member = GroupMember(group_id=group_id, user_id=user_id)
                db.session.add(member)
                db.session.commit()
            return group.to_dict()
        return None
    
    def remove_group_member(self, group_id: str, user_id: str) -> Optional[Dict]:
        """Удалить участника из группы"""
        group = Group.query.get(group_id)
        if group:
            member = GroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
            if member:
                db.session.delete(member)
                db.session.commit()
            return group.to_dict()
        return None
    
    def get_user_groups(self, user_id: str) -> List[Dict]:
        """Получить все группы пользователя"""
        memberships = GroupMember.query.filter_by(user_id=user_id).all()
        groups = []
        for membership in memberships:
            group = Group.query.get(membership.group_id)
            if group:
                groups.append(group.to_dict())
        return groups
    
    def delete_group(self, group_id: str) -> bool:
        """Удалить группу"""
        group = Group.query.get(group_id)
        if group:
            # Удаляем все сообщения группы
            Message.query.filter_by(group_id=group_id).delete()
            # Удаляем участников
            GroupMember.query.filter_by(group_id=group_id).delete()
            # Удаляем группу
            db.session.delete(group)
            db.session.commit()
            return True
        return False


# Глобальный экземпляр
db_manager = DatabaseManager()
