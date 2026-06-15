import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Check, X, Download, FileText, Image as ImageIcon, Mic, Play, Pause, Users, UserX } from 'lucide-react';

interface MessageItemProps {
  message: any;
  isOwnMessage: boolean;
  contactAvatar?: string;
  currentUserId: string;
  onEdit: (messageId: string, newText: string) => void;
  onDelete: (messageId: string, deleteType: 'self' | 'all') => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwnMessage,
  contactAvatar,
  currentUserId,
  onEdit,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showActions, setShowActions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const isVoiceMessage = !!message.audioUrl;
  const API_BASE_URL = 'http://10.120.20.111:5000';

  // Закрытие меню удаления при клике вне сообщения
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDeleteMenu && messageRef.current && !messageRef.current.contains(event.target as Node)) {
        setShowDeleteMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDeleteMenu]);

  useEffect(() => {
    if (isVoiceMessage) {
      const audio = audioRef.current;
      if (!audio) return;
      
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };
      
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [isVoiceMessage]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * (message.audioDuration || 0);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.text) {
      onEdit(message.id, editText);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(message.text);
    setIsEditing(false);
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <FileText size={40} />;

    const type = fileType.toLowerCase();
    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type)) {
      return <ImageIcon size={40} />;
    }
    return <FileText size={40} />;
  };

  const isImage = message.fileType &&
                  (message.fileType.startsWith('image/') ||
                  ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(message.fileType.toLowerCase()));

  return (
    <div
      ref={messageRef}
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex items-end space-x-2 max-w-md relative overflow-visible ${
        isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
      }`}>
        {!isOwnMessage && contactAvatar && (
          <img
            src={contactAvatar}
            alt="Avatar"
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
        )}
        <div className="relative">
          <div className={`px-4 py-2 rounded-2xl ${
            isOwnMessage
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
          }`}>
            {/* Voice Message */}
            {isVoiceMessage && message.audioUrl && (
              <div className="flex items-center space-x-3 min-w-[200px]">
                <audio ref={audioRef} src={`${API_BASE_URL}${message.audioUrl}`} />
                <button
                  onClick={handlePlayPause}
                  className={`p-2 rounded-full transition ${
                    isOwnMessage ? 'bg-white text-blue-500 hover:bg-blue-50' : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Mic size={16} className={isOwnMessage ? 'text-blue-200' : 'text-gray-400'} />
                    <div
                      ref={progressRef}
                      onClick={handleProgressClick}
                      className={`flex-1 h-2 rounded-full cursor-pointer ${
                        isOwnMessage ? 'bg-blue-700' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOwnMessage ? 'bg-white' : 'bg-blue-500'
                        }`}
                        style={{ width: `${(currentTime / (message.audioDuration || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {formatDuration(currentTime)} / {formatDuration(message.audioDuration)}
                  </p>
                </div>
              </div>
            )}

            {/* File Preview */}
            {message.fileUrl && !isVoiceMessage && (
              <div className="mb-2">
                {isImage ? (
                  <div className="relative group">
                    <img
                      src={`${API_BASE_URL}${message.fileUrl}`}
                      alt={message.fileName}
                      className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition"
                      onClick={() => setShowImageModal(true)}
                    />
                    <div className="absolute inset-0 rounded-lg bg-black bg-opacity-0 group-hover:bg-opacity-10 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex space-x-2">
                        <a
                          href={`${API_BASE_URL}${message.fileUrl}`}
                          download={message.fileName}
                          className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition"
                          title="Скачать"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={20} className="text-gray-700" />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowImageModal(true);
                          }}
                          className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition"
                          title="Открыть"
                        >
                          <ImageIcon size={20} className="text-gray-700" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <a
                    href={`${API_BASE_URL}${message.fileUrl}`}
                    download={message.fileName}
                    className={`flex items-center space-x-3 p-3 rounded-lg ${
                      isOwnMessage ? 'bg-blue-600' : 'bg-gray-100'
                    } hover:opacity-80 transition`}
                >
                    <div className={isOwnMessage ? 'text-white' : 'text-gray-600'}>
                      {getFileIcon(message.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isOwnMessage ? 'text-white' : 'text-gray-900'
                      }`}>
                        {message.fileName}
                      </p>
                      <p className={`text-xs ${
                        isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        Нажмите для скачивания
                      </p>
                    </div>
                    <Download size={20} className={isOwnMessage ? 'text-white' : 'text-gray-600'} />
                  </a>
                )}
              </div>
            )}

            {/* Message Text */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-2 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  autoFocus
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              message.text && (
                <p className="text-sm break-words whitespace-pre-wrap">
                  {message.text}
                </p>
              )
            )}

            {/* Edited Label */}
            {message.edited && !isEditing && (
              <p className={`text-xs mt-1 ${
                isOwnMessage ? 'text-blue-100' : 'text-gray-500'
              }`}>
                (изменено)
              </p>
            )}
          </div>

          {/* Time and Status */}
          <div className={`flex items-center space-x-1 mt-1 text-xs text-gray-500 ${
            isOwnMessage ? 'justify-end' : ''
          }`}>
            <span>{formatTime(message.timestamp)}</span>
            {isOwnMessage && message.status && (
              <span className={
                message.status === 'read' ? 'text-blue-500' :
                message.status === 'delivered' ? 'text-gray-400' : 'text-gray-300'
              }>
                ✓✓
              </span>
            )}
          </div>

          {/* Action Buttons */}
          {showActions && isOwnMessage && !isEditing && (
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 -translate-x-full flex items-center space-x-1 bg-white rounded-lg shadow-lg p-1 z-50">
              <div className="relative">
                <button
                  onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                  className="p-2 hover:bg-red-50 rounded transition"
                  title="Удалить"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>

                {/* Delete Menu */}
                {showDeleteMenu && (
                  <div className="absolute right-full top-0 mr-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[180px]">
                    <p className="px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-100">
                      Тип удаления
                    </p>
                    <button
                      onClick={() => {
                        onDelete(message.id, 'self');
                        setShowDeleteMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 transition text-left"
                      title="Удалить только у себя"
                    >
                      <UserX size={16} className="text-orange-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">У себя</p>
                        <p className="text-xs text-gray-500">Только для вас</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        onDelete(message.id, 'all');
                        setShowDeleteMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-red-50 transition text-left border-t border-gray-100"
                      title="Удалить у всех"
                    >
                      <Users size={16} className="text-red-500" />
                      <div>
                        <p className="text-sm font-medium text-red-700">У всех</p>
                        <p className="text-xs text-red-500">Для всех участников</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setShowDeleteMenu(false)}
                      className="w-full text-xs text-gray-500 hover:bg-gray-50 px-3 py-1 transition border-t border-gray-100"
                    >
                      Отмена
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-gray-100 rounded transition"
                title="Редактировать"
              >
                <Edit2 size={16} className="text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && isImage && message.fileUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-7xl max-h-screen">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition"
              title="Закрыть"
            >
              <X size={24} className="text-white" />
            </button>
            <img
              src={`${API_BASE_URL}${message.fileUrl}`}
              alt={message.fileName}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
              <div className="flex items-center justify-between">
                <p className="text-white text-sm truncate mr-4">{message.fileName}</p>
                <a
                  href={`${API_BASE_URL}${message.fileUrl}`}
                  download={message.fileName}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition"
                >
                  <Download size={18} />
                  <span className="text-sm font-medium">Скачать</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageItem;