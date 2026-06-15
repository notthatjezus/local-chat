# -*- coding: utf-8 -*-
from datetime import datetime
from typing import List, Dict, Optional
import threading
import json
import os

class Database:
    """База данных с сохранением в JSON файл"""
    
    def __init__(self, data_file='data.json'):
        self.data_file = data_file
        self.users: List[Dict] = []
        self.messages: List[Dict] = []
        self.groups: List[Dict] = []
        self.lock = threading.Lock()
        self._load_data()
    
    def _load_data(self):
        """Загрузить данные из файла"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.users = data.get('users', [])
                    self.messages = data.get('messages', [])
                    self.groups = data.get('groups', [])
                    print(f"📂 Загружено: пользователей: {len(self.users)}, сообщений: {len(self.messages)}, групп: {len(self.groups)}")
            except Exception as e:
                print(f"⚠️ Ошибка загрузки данных: {e}")
                self.users = []
                self.messages = []
                self.groups = []
        else:
            print("📂 Создан новый файл данных")
    
    def _save_data(self):
        """Сохранить данные в файл"""
        try:
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'users': self.users,
                    'messages': self.messages,
                    'groups': self.groups
                }, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"⚠️ Ошибка сохранения данных: {e}")
    
    # ==================== USERS ====================
    
    def create_user(self, user_data: Dict) -> Dict:
        """Создать нового пользователя"""
        with self.lock:
            new_user = {
                'id': str(int(datetime.now().timestamp() * 1000)),
                **user_data,
                'createdAt': datetime.now().isoformat(),
                'status': 'offline'
            }
            self.users.append(new_user)
            self._save_data()
            print(f"✅ Создан пользователь: {new_user['email']}")
            return new_user
    
    def find_user_by_email(self, email: str) -> Optional[Dict]:
        """Найти пользователя по email"""
        return next((u for u in self.users if u['email'] == email), None)
    
    def find_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Найти пользователя по ID"""
        return next((u for u in self.users if u['id'] == user_id), None)
    
    def get_all_users(self) -> List[Dict]:
        """Получить всех пользователей (без паролей)"""
        return [{k: v for k, v in user.items() if k != 'password'} 
                for user in self.users]
    
    def update_user(self, user_id: str, updates: Dict) -> Optional[Dict]:
        """Обновить данные пользователя"""
        with self.lock:
            user = self.find_user_by_id(user_id)
            if user:
                user.update(updates)
                self._save_data()
                return {k: v for k, v in user.items() if k != 'password'}
        return None
    
    # ==================== MESSAGES ====================
    
    def create_message(self, message_data: Dict) -> Dict:
        """Создать новое сообщение"""
        with self.lock:
            new_message = {
                'id': f"{int(datetime.now().timestamp() * 1000)}{len(self.messages)}",
                **message_data,
                'timestamp': datetime.now().isoformat(),
                'status': 'sent',
                'edited': False,
                'editedAt': None
            }
            self.messages.append(new_message)
            self._save_data()
            return new_message
    
    def update_message(self, message_id: str, new_text: str) -> Optional[Dict]:
        """Обновить текст сообщения"""
        with self.lock:
            message = next((m for m in self.messages if m['id'] == message_id), None)
            if message:
                message['text'] = new_text
                message['edited'] = True
                message['editedAt'] = datetime.now().isoformat()
                self._save_data()
                return message
        return None
    
    def delete_message(self, message_id: str) -> bool:
        """Удалить сообщение полностью"""
        with self.lock:
            message = next((m for m in self.messages if m['id'] == message_id), None)
            if message:
                self.messages.remove(message)
                self._save_data()
                return True
        return False

    def delete_message_for_user(self, message_id: str, user_id: str) -> bool:
        """Отметить сообщение как удалённое для пользователя"""
        with self.lock:
            message = next((m for m in self.messages if m['id'] == message_id), None)
            if message:
                # Инициализируем список удалённых для пользователей, если его нет
                if 'deletedFor' not in message:
                    message['deletedFor'] = []
                
                # Добавляем пользователя в список удалённых
                if user_id not in message['deletedFor']:
                    message['deletedFor'].append(user_id)
                    self._save_data()
                    return True
        return False
    
    def get_messages(self, user_id1: str, user_id2: str = None, group_id: str = None) -> List[Dict]:
        """Получить историю сообщений"""
        if group_id:
            # Сообщения группы
            messages = [m for m in self.messages if m.get('groupId') == group_id]
        else:
            # Личные сообщения
            messages = [
                m for m in self.messages
                if (m.get('senderId') == user_id1 and m.get('receiverId') == user_id2) or
                   (m.get('senderId') == user_id2 and m.get('receiverId') == user_id1)
            ]
        
        # Фильтруем сообщения, удалённые для текущего пользователя
        filtered_messages = [
            m for m in messages
            if not (m.get('deletedFor') and user_id1 in m.get('deletedFor', []))
        ]
        
        return sorted(filtered_messages, key=lambda m: m['timestamp'])
    
    def update_message_status(self, message_id: str, status: str) -> Optional[Dict]:
        """Обновить статус сообщения"""
        with self.lock:
            message = next((m for m in self.messages if m['id'] == message_id), None)
            if message:
                message['status'] = status
                self._save_data()
                return message
        return None
    
    def mark_messages_as_read(self, user_id: str, sender_id: str = None, group_id: str = None):
        """Отметить сообщения как прочитанные"""
        with self.lock:
            changed = False
            for message in self.messages:
                if group_id:
                    # Групповые сообщения
                    if (message.get('groupId') == group_id and 
                        message.get('senderId') != user_id and
                        message['status'] != 'read'):
                        message['status'] = 'read'
                        changed = True
                else:
                    # Личные сообщения
                    if (message.get('receiverId') == user_id and 
                        message.get('senderId') == sender_id and 
                        message['status'] != 'read'):
                        message['status'] = 'read'
                        changed = True
            if changed:
                self._save_data()
    
    def get_user_contacts(self, user_id: str) -> List[Dict]:
        """Получить список контактов пользователя"""
        contact_ids = set()
        
        for message in self.messages:
            if not message.get('groupId'):  # Только личные сообщения
                if message.get('senderId') == user_id:
                    contact_ids.add(message.get('receiverId'))
                if message.get('receiverId') == user_id:
                    contact_ids.add(message.get('senderId'))
        
        contacts = []
        for contact_id in contact_ids:
            user = self.find_user_by_id(contact_id)
            if not user:
                continue
            
            messages = self.get_messages(user_id, contact_id)
            last_message = messages[-1] if messages else None
            
            unread_count = sum(
                1 for m in messages
                if m.get('receiverId') == user_id and m['status'] != 'read'
            )
            
            contacts.append({
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'avatar': user['avatar'],
                'status': user.get('status', 'offline'),
                'lastMessage': last_message.get('text', '') if last_message else '',
                'lastMessageTime': last_message['timestamp'] if last_message else '',
                'unreadCount': unread_count,
                'type': 'personal'
            })
        
        # Добавляем группы
        user_groups = self.get_user_groups(user_id)
        for group in user_groups:
            group_messages = self.get_messages(user_id, group_id=group['id'])
            last_message = group_messages[-1] if group_messages else None
            
            unread_count = sum(
                1 for m in group_messages
                if m.get('senderId') != user_id and m['status'] != 'read'
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
        with self.lock:
            new_group = {
                'id': f"group_{int(datetime.now().timestamp() * 1000)}",
                **group_data,
                'createdAt': datetime.now().isoformat()
            }
            self.groups.append(new_group)
            self._save_data()
            print(f"✅ Создана группа: {new_group['name']}")
            return new_group
    
    def find_group_by_id(self, group_id: str) -> Optional[Dict]:
        """Найти группу по ID"""
        return next((g for g in self.groups if g['id'] == group_id), None)
    
    def update_group(self, group_id: str, updates: Dict) -> Optional[Dict]:
        """Обновить данные группы"""
        with self.lock:
            group = self.find_group_by_id(group_id)
            if group:
                group.update(updates)
                self._save_data()
                return group
        return None
    
    def add_group_member(self, group_id: str, user_id: str) -> Optional[Dict]:
        """Добавить участника в группу"""
        with self.lock:
            group = self.find_group_by_id(group_id)
            if group and user_id not in group['members']:
                group['members'].append(user_id)
                self._save_data()
                return group
        return None
    
    def remove_group_member(self, group_id: str, user_id: str) -> Optional[Dict]:
        """Удалить участника из группы"""
        with self.lock:
            group = self.find_group_by_id(group_id)
            if group and user_id in group['members']:
                group['members'].remove(user_id)
                self._save_data()
                return group
        return None
    
    def get_user_groups(self, user_id: str) -> List[Dict]:
        """Получить все группы пользователя"""
        return [g for g in self.groups if user_id in g['members']]
    
    def delete_group(self, group_id: str) -> bool:
        """Удалить группу"""
        with self.lock:
            group = self.find_group_by_id(group_id)
            if group:
                self.groups.remove(group)
                # Удаляем все сообщения группы
                self.messages = [m for m in self.messages if m.get('groupId') != group_id]
                self._save_data()
                return True
        return False
    
    def clear_all_data(self):
        """Очистить все данные"""
        with self.lock:
            self.users = []
            self.messages = []
            self.groups = []
            self._save_data()
            print("🗑️ Все данные очищены")

# Глобальный экземпляр базы данных
db = Database()