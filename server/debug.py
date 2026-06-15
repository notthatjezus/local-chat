#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from database import db
import json

def show_users():
    print("\n=== ПОЛЬЗОВАТЕЛИ ===")
    users = db.get_all_users()
    if not users:
        print("Нет зарегистрированных пользователей")
    else:
        for user in users:
            print(f"- {user['name']} ({user['email']}) - ID: {user['id']}")
    print(f"Всего: {len(users)}\n")

def show_messages():
    print("=== СООБЩЕНИЯ ===")
    if not db.messages:
        print("Нет сообщений")
    else:
        for msg in db.messages:
            sender = db.find_user_by_id(msg['senderId'])
            receiver = db.find_user_by_id(msg['receiverId'])
            sender_name = sender['name'] if sender else 'Unknown'
            receiver_name = receiver['name'] if receiver else 'Unknown'
            print(f"{sender_name} → {receiver_name}: {msg['text'][:50]}...")
    print(f"Всего: {len(db.messages)}\n")

def show_raw_data():
    print("=== ПОЛНЫЕ ДАННЫЕ ===")
    data = {
        'users': [{k: v for k, v in u.items() if k != 'password'} for u in db.users],
        'messages': db.messages
    }
    print(json.dumps(data, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    print("\n🔍 Corporate Chat - Отладка базы данных\n")
    
    while True:
        print("Выберите действие:")
        print("1 - Показать пользователей")
        print("2 - Показать сообщения")
        print("3 - Показать все данные")
        print("4 - Очистить базу данных")
        print("0 - Выход")
        
        choice = input("\nВаш выбор: ")
        
        if choice == '1':
            show_users()
        elif choice == '2':
            show_messages()
        elif choice == '3':
            show_raw_data()
        elif choice == '4':
            response = input("⚠️ Точно очистить? (yes/no): ")
            if response.lower() == 'yes':
                db.clear_all_data()
                print("✅ База очищена\n")
        elif choice == '0':
            break
        else:
            print("❌ Неверный выбор\n")