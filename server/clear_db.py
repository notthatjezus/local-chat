#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from database import db
import os

if __name__ == '__main__':
    response = input("⚠️ Вы уверены, что хотите очистить все данные? (yes/no): ")
    
    if response.lower() == 'yes':
        db.clear_all_data()
        print("✅ База данных очищена")
    else:
        print("❌ Операция отменена")