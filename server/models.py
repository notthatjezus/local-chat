# -*- coding: utf-8 -*-
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    """Модель пользователя"""
    __tablename__ = 'users'
    
    id = db.Column(db.String(50), primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    avatar = db.Column(db.String(500), default='https://api.dicebear.com/7.x/avataaars/svg?seed=default')
    bio = db.Column(db.Text, default='')
    status = db.Column(db.String(20), default='offline')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Сообщения
    sent_messages = db.relationship('Message', backref='sender', lazy='dynamic', 
                                    foreign_keys='Message.sender_id')
    received_messages = db.relationship('Message', backref='receiver', lazy='dynamic',
                                        foreign_keys='Message.receiver_id')
    
    # Группы
    groups = db.relationship('GroupMember', backref='user', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'avatar': self.avatar,
            'status': self.status,
            'bio': self.bio,
            'createdAt': self.created_at.isoformat() if self.created_at else datetime.utcnow().isoformat()
        }


class Message(db.Model):
    """Модель сообщения"""
    __tablename__ = 'messages'
    
    id = db.Column(db.String(50), primary_key=True)
    sender_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False, index=True)
    receiver_id = db.Column(db.String(50), db.ForeignKey('users.id'), index=True)
    group_id = db.Column(db.String(50), db.ForeignKey('groups.id'), index=True)
    text = db.Column(db.Text, default='')
    file_url = db.Column(db.String(500))
    file_name = db.Column(db.String(255))
    file_type = db.Column(db.String(100))
    audio_url = db.Column(db.String(500))
    audio_duration = db.Column(db.Integer)
    status = db.Column(db.String(20), default='sent')
    edited = db.Column(db.Boolean, default=False)
    edited_at = db.Column(db.DateTime)
    deleted_for = db.Column(db.JSON, default=list)  # Список ID пользователей, удаливших сообщение
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Группа
    group = db.relationship('Group', backref=db.backref('messages', lazy='dynamic'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'senderId': self.sender_id,
            'receiverId': self.receiver_id,
            'groupId': self.group_id,
            'text': self.text,
            'fileUrl': self.file_url,
            'fileName': self.file_name,
            'fileType': self.file_type,
            'audioUrl': self.audio_url,
            'audioDuration': self.audio_duration,
            'timestamp': self.timestamp.isoformat() if self.timestamp else datetime.utcnow().isoformat(),
            'status': self.status,
            'edited': self.edited,
            'editedAt': self.edited_at.isoformat() if self.edited_at else None,
            'deletedFor': self.deleted_for if self.deleted_for else []
        }


class Group(db.Model):
    """Модель группы"""
    __tablename__ = 'groups'
    
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    avatar = db.Column(db.String(500), default='https://api.dicebear.com/7.x/identicon/svg?seed=group')
    description = db.Column(db.Text, default='')
    created_by = db.Column(db.String(50), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Участники
    members = db.relationship('GroupMember', backref='group', lazy='dynamic', 
                              cascade='all, delete-orphan')
    admins = db.Column(db.JSON, default=list)
    
    def to_dict(self):
        member_list = [m.user_id for m in self.members.all()]
        return {
            'id': self.id,
            'name': self.name,
            'avatar': self.avatar,
            'description': self.description,
            'members': member_list,
            'admins': self.admins if self.admins else [],
            'createdBy': self.created_by,
            'createdAt': self.created_at.isoformat() if self.created_at else datetime.utcnow().isoformat()
        }


class GroupMember(db.Model):
    """Модель участника группы"""
    __tablename__ = 'group_members'
    
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.String(50), db.ForeignKey('groups.id'), nullable=False)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('group_id', 'user_id', name='unique_group_user'),
    )


def init_db(app):
    """Инициализация базы данных"""
    db.init_app(app)
    
    with app.app_context():
        print("📂 Инициализация базы данных...")
        db.create_all()
        
        # Проверка количества пользователей
        user_count = User.query.count()
        message_count = Message.query.count()
        group_count = Group.query.count()
        
        print(f"✅ База данных готова!")
        print(f"   Пользователей: {user_count}")
        print(f"   Сообщений: {message_count}")
        print(f"   Групп: {group_count}")
