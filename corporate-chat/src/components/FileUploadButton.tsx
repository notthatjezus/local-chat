import React, { useRef } from 'react';
import { Paperclip, Loader } from 'lucide-react';

interface FileUploadButtonProps {
  onFileSelect: (file: File) => void;
  uploading?: boolean;
  disabled?: boolean;
}

const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  onFileSelect,
  uploading = false,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Проверяем размер файла (максимум 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Размер файла не должен превышать 10MB');
        return;
      }
      
      onFileSelect(file);
      e.target.value = ''; // Сбрасываем input
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || uploading}
        className="p-2 hover:bg-gray-100 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
        title="Прикрепить файл"
      >
        {uploading ? (
          <Loader size={20} className="text-blue-600 animate-spin" />
        ) : (
          <Paperclip size={20} className="text-gray-600" />
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt,.zip"
      />
    </>
  );
};

export default FileUploadButton;