import React, { useRef, useState } from 'react';
import { Camera } from 'lucide-react';

interface AvatarUploadProps {
  currentAvatar: string;
  onAvatarChange: (file: File) => void;
  disabled?: boolean;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onAvatarChange,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }

      // Проверяем размер (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
        return;
      }

      // Создаем предпросмотр
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      onAvatarChange(file);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayAvatar = preview || currentAvatar;

  return (
    <div className="relative inline-block">
      <img
        src={displayAvatar}
        alt="Avatar"
        className="w-32 h-32 rounded-full border-4 border-white bg-white cursor-pointer"
        onClick={handleClick}
      />
      {preview && (
        <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center space-x-2">
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition"
            title="Отменить"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={handleClick}
            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition"
            title="Выбрать другой"
          >
            <Camera size={20} />
          </button>
        </div>
      )}
      {!preview && (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className="absolute bottom-2 right-2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full shadow-lg transition"
        >
          <Camera size={20} />
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default AvatarUpload;