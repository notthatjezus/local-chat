# База данных Corporate Chat

## 📊 Структура базы данных

База данных SQLite расположена в файле `instance/chat.db`.

### Таблицы:

#### 1. `users` - Пользователи
- `id` - уникальный идентификатор
- `email` - email (уникальный)
- `password` - хэш пароля
- `name` - имя пользователя
- `avatar` - URL аватара
- `bio` - информация о себе
- `status` - статус (online/offline/away)
- `created_at` - дата регистрации

#### 2. `messages` - Сообщения
- `id` - уникальный идентификатор
- `sender_id` - ID отправителя
- `receiver_id` - ID получателя (для личных сообщений)
- `group_id` - ID группы (для групповых сообщений)
- `text` - текст сообщения
- `file_url` - URL файла
- `file_name` - имя файла
- `file_type` - тип файла
- `audio_url` - URL аудио (для голосовых)
- `audio_duration` - длительность аудио
- `status` - статус (sent/delivered/read)
- `edited` - флаг редактирования
- `edited_at` - дата редактирования
- `deleted_for` - список ID удаливших пользователей
- `timestamp` - время отправки

#### 3. `groups` - Группы
- `id` - уникальный идентификатор
- `name` - название
- `avatar` - URL аватара
- `description` - описание
- `created_by` - ID создателя
- `admins` - список администраторов (JSON)
- `created_at` - дата создания

#### 4. `group_members` - Участники групп
- `id` - уникальный идентификатор
- `group_id` - ID группы
- `user_id` - ID пользователя
- `joined_at` - дата вступления

## 🔄 Миграция данных

Для переноса данных из старого JSON-файла в SQLite:

```bash
python3 migrate.py
```

## 📦 Установка зависимостей

```bash
pip install -r requirements.txt
```

## 🚀 Запуск сервера

```bash
python3 app.py
```

## 📁 Структура файлов

```
server/
├── app.py              # Основное приложение Flask
├── models.py           # Модели SQLAlchemy
├── db_manager.py       # Менеджер базы данных
├── routes.py           # HTTP маршруты
├── socket_events.py    # WebSocket события
├── migrate.py          # Скрипт миграции
├── requirements.txt    # Зависимости
└── instance/
    └── chat.db         # Файл базы данных SQLite
```
