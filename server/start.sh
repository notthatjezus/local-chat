#!/bin/bash

# Переходим в директорию сервера
cd "$(dirname "$0")"

# Активируем виртуальное окружение
source venv/bin/activate

# Устанавливаем зависимости, если нужно
if [ ! -d "venv/lib/python3"*/site-packages/flask ]; then
    echo "📦 Устанавливаем зависимости..."
    pip install -r requirements.txt
fi

# Запускаем сервер
echo "🚀 Запуск бэкенда..."
python3 app.py