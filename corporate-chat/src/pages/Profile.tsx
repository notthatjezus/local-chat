import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Save } from 'lucide-react';
import { userAPI, API_BASE_URL } from '../services/api';
import AvatarUpload from '../components/AvatarUpload';

const Profile: React.FC = () => {
  const { currentUser, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    try {
      await updateProfile({ name, bio });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Ошибка при обновлении профиля');
    }
  };

  const handleAvatarChange = async (file: File) => {
    setUploading(true);
    try {
      const response = await userAPI.uploadAvatar(file);
      // Добавляем базовый URL к относительному пути аватара
      const fullAvatarUrl = response.avatar.startsWith('http')
        ? response.avatar
        : `${API_BASE_URL}${response.avatar}`;
      await updateProfile({ avatar: fullAvatarUrl });
      alert('Аватар успешно обновлен!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Ошибка при загрузке аватара');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              <span>Назад к чату</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700"
            >
              <LogOut size={20} />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-32"></div>
          
          <div className="px-8 pb-8">
            <div className="relative -mt-16 mb-6">
              <AvatarUpload
                currentAvatar={currentUser.avatar}
                onAvatarChange={handleAvatarChange}
                disabled={uploading}
              />
              <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white ${
                currentUser.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
            </div>

            {uploading && (
              <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg">
                Загрузка аватара...
              </div>
            )}

            {/* Profile Info */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Имя
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  О себе
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!isEditing}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                  placeholder="Расскажите о себе..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                  >
                    Редактировать профиль
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center space-x-2"
                    >
                      <Save size={20} />
                      <span>Сохранить</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setName(currentUser.name);
                        setBio(currentUser.bio || '');
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition font-semibold"
                    >
                      Отмена
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Информация об аккаунте</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Дата регистрации:</span>
              <span className="font-medium text-gray-900">
                {currentUser.createdAt.toLocaleDateString('ru-RU')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>ID пользователя:</span>
              <span className="font-medium text-gray-900">{currentUser.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Статус:</span>
              <span className={`font-medium ${
                currentUser.status === 'online' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {currentUser.status === 'online' ? 'В сети' : 'Не в сети'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;