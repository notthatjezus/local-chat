#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv
from models import init_db
from routes import api
from socket_events import register_socket_events

# Загружаем переменные окружения
load_dotenv()

# Создаем приложение Flask
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'your_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Socket.IO
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    logger=True,
    engineio_logger=True
)

# Инициализация базы данных
init_db(app)

# Регистрируем маршруты
app.register_blueprint(api, url_prefix='/api')

# Регистрируем Socket.IO события
register_socket_events(socketio)

# Маршрут для отдачи загруженных файлов (вне API Blueprint)
@app.route('/uploads/<filename>')
def serve_uploaded_file(filename):
    uploads_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    return send_from_directory(uploads_folder, filename)

@app.route('/')
def index():
    return {'message': '🚀 Corporate Chat API работает!'}

@app.route('/health')
def health():
    return {'status': 'healthy'}

if __name__ == '__main__':
    PORT = int(os.getenv('PORT', 5000))
    
    print(f'\n🚀 Сервер запущен на порту {PORT}')
    print(f'📡 WebSocket сервер готов к подключениям\n')
    
    socketio.run(
        app,
        host='0.0.0.0',
        port=PORT,
        debug=True,
        use_reloader=True
    )