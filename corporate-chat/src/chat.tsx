import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Smile,
  MoreVertical,
  Search,
  Phone,
  Video,
  Settings,
  Users as UsersIcon,
  X,
  MessageCircle,
  UserPlus,
  Mic,
  Image as ImageIcon,
  Paperclip,
  File as FileIcon,
  Check
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userAPI, messageAPI, fileAPI, groupAPI, API_BASE_URL } from './services/api';
import socketService from './services/socket';
import { Message, Contact } from './types';
import MessageItem from './components/MessageItem';
import CreateGroupModal from './components/CreateGroupModal';

const Chat: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allUsers, setAllUsers] = useState<Contact[]>([]);
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<number | undefined>(undefined);
  const recordingStartTime = useRef<number>(0);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Загрузка контактов и всех пользователей
  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      try {
        const [contactsData, usersData] = await Promise.all([
          userAPI.getContacts(),
          userAPI.getAllUsers()
        ]);
        
        setContacts(contactsData);
        setAllUsers(usersData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [currentUser]);

  // WebSocket слушатели
  useEffect(() => {
    if (!currentUser) return;

    // Получение новых сообщений
    socketService.onMessageReceive((message: Message) => {
      if (currentContact &&
          ((message.senderId === currentContact.id || message.receiverId === currentContact.id) ||
           (message.groupId === currentContact.id))) {
        setMessages(prev => [...prev, message]);
        
        // Если сообщение от текущего контакта, отмечаем как прочитанное
        if (message.senderId !== currentUser.id) {
          if (message.groupId) {
            socketService.markMessagesAsRead(currentUser.id, undefined, message.groupId);
          } else {
            socketService.markMessagesAsRead(currentUser.id, message.senderId);
          }
        }
      }
      
      // Обновляем список контактов
      loadContacts();
    });

    // Редактирование сообщения
    socketService.onMessageEdited((updatedMessage: Message) => {
      setMessages(prev => prev.map(msg => 
        msg.id === updatedMessage.id ? updatedMessage : msg
      ));
    });

    // Удаление сообщения
    socketService.onMessageDeleted((data: any) => {
      if (data.deleteType === 'self' && data.userId === currentUser?.id) {
        // Удаление только у себя - удаляем сообщение только для текущего пользователя
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      } else if (data.deleteType === 'all') {
        // Удаление у всех - удаляем сообщение у всех пользователей
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      } else {
        // Для обратной совместимости (если тип удаления не указан)
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      }
    });

    // Статусы сообщений
    socketService.onMessageStatus((data: any) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, status: data.status } : msg
      ));
    });

    // Статусы пользователей
    socketService.onUserStatus((data: any) => {
      setContacts(prev => prev.map(contact => 
        contact.id === data.userId ? { ...contact, status: data.status } : contact
      ));
      
      setAllUsers(prev => prev.map(user => 
        user.id === data.userId ? { ...user, status: data.status } : user
      ));
      
      if (currentContact?.id === data.userId) {
        setCurrentContact(prev => prev ? { ...prev, status: data.status } : null);
      }
    });

    // Печатает
    socketService.onTypingStart((data: any) => {
      if (currentContact && 
          ((currentContact.type === 'group' && currentContact.id === data.groupId) ||
           (currentContact.id === data.userId))) {
        setIsTyping(true);
      }
    });

    socketService.onTypingStop((data: any) => {
      if (currentContact && 
          ((currentContact.type === 'group' && currentContact.id === data.groupId) ||
           (currentContact.id === data.userId))) {
        setIsTyping(false);
      }
    });

    // Прочитано
    socketService.onMessagesRead((data: any) => {
      if (data.senderId === currentUser.id) {
        setMessages(prev => prev.map(msg => 
          msg.receiverId === data.userId ? { ...msg, status: 'read' } : msg
        ));
      }
    });

    return () => {
      socketService.off('message:receive');
      socketService.off('message:edited');
      socketService.off('message:deleted');
      socketService.off('message:status');
      socketService.off('user:status');
      socketService.off('typing:start');
      socketService.off('typing:stop');
      socketService.off('messages:read');
    };
  }, [currentUser, currentContact]);

  const loadContacts = async () => {
    try {
      const contactsData = await userAPI.getContacts();
      setContacts(contactsData);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadMessages = async (contactId: string) => {
    setLoadingMessages(true);
    try {
      const messagesData = await messageAPI.getMessages(contactId);
      setMessages(messagesData);
      
      // Отмечаем сообщения как прочитанные
      if (currentUser) {
        const isGroup = contactId.startsWith('group_');
        if (isGroup) {
          socketService.markMessagesAsRead(currentUser.id, undefined, contactId);
        } else {
          socketService.markMessagesAsRead(currentUser.id, contactId);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleContactSelect = (contact: Contact) => {
    setCurrentContact(contact);
    setShowAllUsers(false);
    loadMessages(contact.id);
    
    // Присоединяемся к группе, если это группа
    if (contact.type === 'group') {
      socketService.joinGroup(contact.id);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!currentContact || !currentUser) return;

    // Если это изображение - показываем предпросмотр
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setSelectedImageFile(file);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Для других файлов - загружаем сразу
    setUploadingFile(true);
    try {
      const fileData = await fileAPI.uploadFile(file);

      const isGroup = currentContact.type === 'group';

      socketService.sendMessage(
        currentUser.id,
        isGroup ? undefined : currentContact.id,
        file.name,
        isGroup ? currentContact.id : undefined,
        fileData
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Ошибка при загрузке файла');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleImageSend = async () => {
    if (!selectedImageFile || !currentContact || !currentUser) return;

    setUploadingFile(true);
    try {
      const fileData = await fileAPI.uploadFile(selectedImageFile);

      const isGroup = currentContact.type === 'group';

      socketService.sendMessage(
        currentUser.id,
        isGroup ? undefined : currentContact.id,
        '',
        isGroup ? currentContact.id : undefined,
        fileData
      );

      setImagePreview(null);
      setSelectedImageFile(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Ошибка при загрузке изображения');
    } finally {
      setUploadingFile(false);
    }
  };

  // Обработка файлов
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(file.name);
    }
  };

  const handleFileSend = async () => {
    if (!selectedFile || !currentContact || !currentUser) return;

    setUploadingFile(true);
    try {
      const fileData = await fileAPI.uploadFile(selectedFile);

      const isGroup = currentContact.type === 'group';

      socketService.sendMessage(
        currentUser.id,
        isGroup ? undefined : currentContact.id,
        selectedFile.name,
        isGroup ? currentContact.id : undefined,
        fileData
      );

      setSelectedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Ошибка при загрузке файла');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileCancel = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageCancel = () => {
    setImagePreview(null);
    setSelectedImageFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentContact || !currentUser) return;

    const isGroup = currentContact.type === 'group';
    
    socketService.sendMessage(
      currentUser.id,
      isGroup ? undefined : currentContact.id,
      inputValue,
      isGroup ? currentContact.id : undefined
    );
    
    setInputValue('');
    
    // Останавливаем индикатор печати
    if (typingTimeoutRef.current !== undefined) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    
    if (isGroup) {
      socketService.stopTyping(currentUser.id, undefined, currentContact.id);
    } else {
      socketService.stopTyping(currentUser.id, currentContact.id);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    if (!currentContact || !currentUser) return;

    const isGroup = currentContact.type === 'group';
    
    // Уведомляем о начале печати
    if (isGroup) {
      socketService.startTyping(currentUser.id, undefined, currentContact.id);
    } else {
      socketService.startTyping(currentUser.id, currentContact.id);
    }
    
    // Останавливаем печать через 2 секунды
    if (typingTimeoutRef.current !== undefined) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = window.setTimeout(() => {
      if (isGroup) {
        socketService.stopTyping(currentUser.id, undefined, currentContact.id);
      } else {
        socketService.stopTyping(currentUser.id, currentContact.id);
      }
    }, 2000);
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!currentContact) return;
    
    try {
      await messageAPI.editMessage(messageId, newText);
      
      const isGroup = currentContact.type === 'group';
      socketService.editMessage(
        messageId,
        newText,
        isGroup ? currentContact.id : undefined,
        isGroup ? undefined : currentContact.id
      );
    } catch (error) {
      console.error('Error editing message:', error);
      alert('Ошибка при редактировании сообщения');
    }
  };

  const handleDeleteMessage = async (messageId: string, deleteType: 'self' | 'all') => {
    if (!currentContact) return;

    try {
      await messageAPI.deleteMessage(messageId, deleteType);

      const isGroup = currentContact.type === 'group';
      socketService.deleteMessage(
        messageId,
        isGroup ? currentContact.id : undefined,
        isGroup ? undefined : currentContact.id,
        deleteType
      );
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Ошибка при удалении сообщения');
    }
  };

  // Эмодзи - только популярные и хорошо поддерживаемые
  const popularEmojis = [
    // Эмоции
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
    '🤪', '😎', '🤓', '🧐', '😏', '😒', '😞', '😔',
    '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩',
    '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '😱',
    '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫',
    '😴', '🤤', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
    '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😈',
    '👿', '💀', '💩', '🤡', '👻', '👽', '🤖', '🎃',
    
    // Жесты
    '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
    '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
    '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛',
    '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪',
    
    // Сердца
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
    '💘', '💝', '💟', '💋', '💌', '💎', '💍', '💐',
    
    // Праздник
    '🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🎄', '🎃',
    '🎆', '🎇', '✨', '🎋', '🎍', '🎎', '🎏', '🎐',
    '🎑', '🧧', '🎗️', '🎟️', '🎫', '🏆', '🏅', '🥇',
    '🥈', '🥉', '⚽', '⚾', '🏀', '🏐', '🏈', '🏉',
    '🎾', '🎳', '🎯', '🎱', '🔮', '🎮', '🎲', '🧩',
    '🧸', '🎪', '🎨', '🎭', '🎬', '🎤', '🎧', '🎵',
    '🎶', '🎹', '🎸', '🎺', '🎻', '🥁', '🎼', '🎷',
    
    // Природа
    '🌟', '⭐', '🌠', '☀️', '🌤️', '⛅', '🌥️', '☁️',
    '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄',
    '🌬️', '💨', '🌪️', '🌈', '☂️', '☔', '💧', '💦',
    '🌊', '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿',
    '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🥦', '🥬',
    '🥒', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞',
    '🥖', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗',
    '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮',
    '🌯', '🥗', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱',
    '🍤', '🍙', '🍚', '🍘', '🍥', '🍢', '🍡', '🍧',
    '🍨', '🍦', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫',
    '🍿', '🍩', '🍪', '🥜', '🍯', '🥛', '☕', '🍵',
    '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🍸',
    '🍹', '🍾', '🧊',
    
    // Транспорт
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
    '🚒', '🚐', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲',
    '🚨', '🚘', '🚖', '✈️', '🛫', '🛬', '💺', '🚀',
    '🛸', '🚁', '⛵', '🚤', '🚢', '⚓',
    
    // Здания
    '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨',
    '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼',
    '🗽', '⛪', '🕌', '⛲', '⛺', '🌁', '🌃', '🏙️',
    '🌄', '🌅', '🌆', '🌇', '🌉', '♨️', '🎠', '🎡',
    '🎢', '💈', '🚦', '🚏', '🗿',
    
    // Техника
    '📱', '📲', '☎️', '📞', '📠', '🔋', '🔌', '💻',
    '🖥️', '🖨️', '⌨️', '💽', '💾', '💿', '📀', '🎥',
    '🎬', '📺', '📷', '📸', '📹', '🔍', '🔎', '💡',
    '🔦', '📔', '📕', '📖', '📗', '📘', '📙', '📚',
    '📓', '📒', '📃', '📜', '📄', '📰', '🔖', '🏷️',
    
    // Деньги
    '💰', '💴', '💵', '💶', '💷', '💸', '💳', '🧾',
    '💹', '✉️', '📧', '📨', '📩', '📤', '📥', '📦',
    '📫', '📬', '📮', '✏️', '✒️', '🖊️', '📝', '💼',
    '📁', '📂', '📅', '📆', '📇', '📈', '📉', '📊',
    '📋', '📌', '📍', '📎', '📏', '📐', '✂️', '🗑️',
    
    // Замки
    '🔒', '🔓', '🔏', '🔐', '🔑', '🔨', '🪓', '⛏️',
    '🛠️', '🔧', '🔩', '⚙️', '⚖️', '🔗', '🧰', '🧲',
    '🧪', '🧫', '🧬', '🔬', '🔭', '📡', '💉', '💊',
    '🩹', '🩺', '🚪', '🛏️', '🛋️', '🪑', '🚽', '🚿',
    '🛁', '🧹', '🧻', '🧼', '🧽', '🛒',
    
    // Символы
    '🔥', '✨', '💫', '⭐', '⚡', '💥', '💢', '💨',
    '💦', '💤', '🔊', '🔉', '🔇', '📢', '📣', '📯',
    '🔔', '🔕', '🎵', '🎶', '🎼', '🔴', '🟠', '🟡',
    '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷',
    '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔳', '🔲',
    '⬛', '⬜', '◼️', '◻️', '◾', '◽', '▪️', '▫️',
    '🔈', '🔉', '🔊', '🔋', '🔌', '💯', '♾️', '♻️',
    '✅', '☑️', '✔️', '✖️', '❌', '❎', '➕', '➖',
    '➗', '➰', '➿', '〽️', '✳️', '✴️', '❇️', '‼️',
    '⁉️', '❓', '❔', '❕', '❗', '〰️', '©️', '®️',
    '™️', '#️⃣', '*️⃣', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣',
    '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟',
    
    // Стрелки
    '⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️',
    '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️', '🔃', '🔄',
    '🔙', '🔚', '🔛', '🔜', '🔝',
    
    // Знаки
    '⚠️', '🚸', '⛔', '🚫', '🚳', '🚭', '🚯', '🚱',
    '🚷', '📵', '🔞', '☢️', '☣️', '🛑', '💠', '🔰',
    '📛', '🎌', '🏁', '🚩', '🎗️',
    
    // Люди
    '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔',
    '👩', '🧓', '👴', '👵', '👨‍⚕️', '👩‍⚕️', '👨‍🎓', '👩‍🎓',
    '👨‍🏫', '👩‍🏫', '👨‍⚖️', '👩‍⚖️', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳',
    '👨‍🔧', '👩‍🔧', '👨‍🏭', '👩‍🏭', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬',
    '👨‍💻', '👩‍💻', '👨‍🎤', '👩‍🎤', '👨‍🎨', '👩‍🎨', '👨‍✈️', '👩‍✈️',
    '👨‍🚀', '👩‍🚀', '👮', '👮‍♂️', '👮‍♀️', '🕵️', '🕵️‍♂️', '🕵️‍♀️',
    '💂', '💂‍♂️', '💂‍♀️', '👷', '👷‍♂️', '👷‍♀️', '🤴', '👸',
    '👳', '👳‍♂️', '👳‍♀️', '👲', '🧕', '🤵', '👰', '🤰',
    '🤱', '👼', '🎅', '🤶', '🦸', '🦸‍♂️', '🦸‍♀️', '🦹',
    '🦹‍♂️', '🦹‍♀️', '🧙', '🧙‍♂️', '🧙‍♀️', '🧚', '🧚‍♂️', '🧚‍♀️',
    '🧛', '🧛‍♂️', '🧛‍♀️', '🧜', '🧜‍♂️', '🧜‍♀️', '🧝', '🧝‍♂️',
    '🧝‍♀️', '🧞', '🧞‍♂️', '🧞‍♀️', '🧟', '🧟‍♂️', '🧟‍♀️',
    
    // Животные
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
    '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
    '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞',
    '🐜', '🦟', '🦗', '🕷️', '🕸️', '🐢', '🐍', '🦎',
    '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡',
    '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅',
    '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪',
    '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖',
    '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮',
    '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢',
    '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥',
    '🐁', '🐀', '🐿️', '🦔',
    
    // Растения
    '💐', '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻',
    '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵',
    '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍇',
    '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎',
    '🍏', '🍐', '🍑', '🍒', '🍓', '🥝', '🍅', '🥥',
    '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒', '🥬',
    '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐',
    '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗',
    '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮',
    '🌯', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🥣',
    '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙',
    '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤',
    '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🍦', '🍧',
    '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫',
    '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖',
    '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻',
    '🥂', '🥃', '🥤', '🧃', '🧉', '🧊'
  ];

  const handleEmojiClick = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Закрытие панели эмодзи при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && emojiPickerRef.current && 
          !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // Голосовые сообщения
  const startRecording = async () => {
    try {
      // Проверяем поддержку API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Ваш браузер не поддерживает запись аудио. Пожалуйста, используйте современный браузер (Chrome, Firefox, Edge).');
        return;
      }

      // Проверяем наличие микрофона
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasAudioInput = devices.some(device => device.kind === 'audioinput');
        
        if (!hasAudioInput) {
          alert('Микрофон не найден. Пожалуйста, подключите микрофон.');
          return;
        }
      } catch (enumError) {
        // Если enumerateDevices не работает, пробуем сразу получить доступ
        console.log('Не удалось получить список устройств, пробуем запись...');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);

        // Останавливаем все треки
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingStartTime.current = Date.now();

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - recordingStartTime.current) / 1000));
      }, 1000);

    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      
      let errorMessage = 'Ошибка доступа к микрофону. ';
      
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'Микрофон не найден. Пожалуйста, подключите микрофон.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Микрофон занят другим приложением.';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += 'Микрофон не поддерживает требуемые параметры.';
      } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        errorMessage += 'Для записи аудио требуется HTTPS соединение.';
      }
      
      alert(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
      }
      
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
      }
      
      setIsRecording(false);
      setRecordingTime(0);
      setAudioBlob(null);
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !currentContact || !currentUser) return;

    setUploadingFile(true);
    try {
      // Создаем файл из blob
      const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      const fileData = await fileAPI.uploadFile(file);
      
      const isGroup = currentContact.type === 'group';
      
      socketService.sendVoiceMessage(
        currentUser.id,
        isGroup ? undefined : currentContact.id,
        isGroup ? currentContact.id : undefined,
        fileData.url,
        recordingTime
      );

      setAudioBlob(null);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error sending voice message:', error);
      alert('Ошибка при отправке голосового сообщения');
    } finally {
      setUploadingFile(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateGroup = async (name: string, members: string[]) => {
    try {
      const group = await groupAPI.createGroup(name, members);
      
      // Обновляем список контактов
      await loadContacts();
      
      // Присоединяемся к группе
      socketService.joinGroup(group.id);
      
      alert('Группа успешно создана!');
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Ошибка при создании группы');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const displayedUsers = showAllUsers ? allUsers : contacts;
  const filteredUsers = displayedUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {showAllUsers ? 'Все пользователи' : 'Сообщения'}
            </h2>
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowCreateGroupModal(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                title="Создать группу"
              >
                <UserPlus size={20} className="text-gray-600" />
              </button>
              <button 
                onClick={() => {
                  setShowAllUsers(!showAllUsers);
                  setSearchQuery('');
                }}
                className={`p-2 rounded-full transition ${
                  showAllUsers ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                }`}
                title={showAllUsers ? 'Показать чаты' : 'Найти пользователя'}
              >
                <UsersIcon size={20} />
              </button>
              <button 
                onClick={() => navigate('/profile')}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                title="Настройки профиля"
              >
                <Settings size={20} className="text-gray-600" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={showAllUsers ? "Поиск пользователей..." : "Поиск в чатах..."}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="text-gray-400 mb-3">
                {showAllUsers ? <UsersIcon size={48} className="mx-auto" /> : <Search size={48} className="mx-auto" />}
              </div>
              {searchQuery ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">
                    Ничего не найдено
                  </h3>
                  <p className="text-sm text-gray-500">
                    Попробуйте изменить поисковый запрос
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">
                    {showAllUsers ? 'Нет пользователей' : 'Нет активных чатов'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {showAllUsers 
                      ? 'Зарегистрированные пользователи появятся здесь' 
                      : 'Начните общение с кем-нибудь'}
                  </p>
                  {!showAllUsers && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowAllUsers(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                      >
                        Найти пользователя
                      </button>
                      <button
                        onClick={() => setShowCreateGroupModal(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium w-full"
                      >
                        Создать группу
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="p-2">
              {filteredUsers.map(user => (
                <ContactItem
                  key={user.id}
                  contact={user}
                  active={currentContact?.id === user.id}
                  onClick={() => handleContactSelect(user)}
                  showLastMessage={!showAllUsers}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentContact ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={currentContact.avatar}
                      alt={currentContact.name}
                      className="w-10 h-10 rounded-full"
                    />
                    {currentContact.type !== 'group' && (
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        currentContact.status === 'online' ? 'bg-green-500' :
                        currentContact.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {currentContact.name}
                      {currentContact.type === 'group' && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({currentContact.members?.length || 0} участников)
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {isTyping ? (
                        <span className="text-blue-600 italic">печатает...</span>
                      ) : currentContact.type === 'group' ? (
                        'Группа'
                      ) : currentContact.status === 'online' ? (
                        'В сети'
                      ) : (
                        'Не в сети'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {currentContact.type !== 'group' && (
                    <>
                      <button className="p-2 hover:bg-gray-100 rounded-full transition" title="Голосовой вызов">
                        <Phone size={20} className="text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-full transition" title="Видео вызов">
                        <Video size={20} className="text-gray-600" />
                      </button>
                    </>
                  )}
                  <button className="p-2 hover:bg-gray-100 rounded-full transition" title="Дополнительно">
                    <MoreVertical size={20} className="text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <div className="text-gray-400 mb-3">
                      <MessageCircle size={64} className="mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">
                      Нет сообщений
                    </h3>
                    <p className="text-sm text-gray-500">
                      Начните разговор с {currentContact.name}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => {
                    const isOwnMessage = message.senderId === currentUser.id;
                    return (
                      <MessageItem
                        key={message.id}
                        message={message}
                        isOwnMessage={isOwnMessage}
                        contactAvatar={currentContact.avatar}
                        currentUserId={currentUser.id}
                        onEdit={handleEditMessage}
                        onDelete={handleDeleteMessage}
                      />
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 px-6 py-4">
              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-3 flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 font-medium">Изображение готово к отправке</p>
                    <p className="text-xs text-gray-500">{selectedImageFile?.name}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleImageCancel}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition"
                      title="Отменить"
                    >
                      <X size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={handleImageSend}
                      className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition"
                      title="Отправить"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Voice Recording Preview */}
              {isRecording && (
                <div className="mb-3 flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <Mic size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-red-700 font-medium">Запись...</p>
                    <p className="text-xs text-red-500">{formatRecordingTime(recordingTime)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition"
                      title="Отменить"
                    >
                      <X size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition"
                      title="Остановить"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Voice Message Ready to Send */}
              {audioBlob && !isRecording && (
                <div className="mb-3 flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Mic size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-blue-700 font-medium">Голосовое сообщение</p>
                    <p className="text-xs text-blue-500">{formatRecordingTime(recordingTime)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition"
                      title="Отменить"
                    >
                      <X size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={sendVoiceMessage}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition"
                      title="Отправить"
                    >
                      <Send size={18} className="text-white" />
                    </button>
                  </div>
                </div>
              )}

              {/* File Preview */}
              {selectedFile && (
                <div className="mb-3 flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <FileIcon size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-blue-700 font-medium">Файл готов к отправке</p>
                    <p className="text-xs text-blue-500 truncate">{selectedFile.name}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleFileCancel}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition"
                      title="Отменить"
                    >
                      <X size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={handleFileSend}
                      className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition"
                      title="Отправить"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center space-x-3 relative">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleFileClick}
                  disabled={uploadingFile || !!imagePreview || !!selectedFile}
                  className="p-2 hover:bg-gray-100 rounded-full transition disabled:opacity-50"
                  title="Прикрепить файл"
                >
                  <Paperclip size={20} className="text-gray-600" />
                </button>
                <button
                  type="button"
                  onClick={handleImageClick}
                  disabled={uploadingFile || !!imagePreview || !!selectedFile}
                  className="p-2 hover:bg-gray-100 rounded-full transition disabled:opacity-50"
                  title="Прикрепить изображение"
                >
                  <ImageIcon size={20} className="text-gray-600" />
                </button>
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={uploadingFile || !!audioBlob || !!imagePreview || !!selectedFile}
                  className={`p-2 rounded-full transition disabled:opacity-50 ${
                    isRecording ? 'bg-red-500 hover:bg-red-600' : 'hover:bg-gray-100'
                  }`}
                  title={isRecording ? 'Остановить запись' : 'Голосовое сообщение'}
                >
                  <Mic size={20} className={isRecording ? 'text-white' : 'text-gray-600'} />
                </button>
                
                {/* Emoji Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 hover:bg-yellow-100 rounded-full transition"
                    title="Эмодзи"
                  >
                    <Smile size={20} className="text-yellow-500" />
                  </button>
                  
                  {/* Emoji Picker Panel */}
                  {showEmojiPicker && (
                    <div
                      ref={emojiPickerRef}
                      className="absolute bottom-full left-0 mb-2 p-4 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl border-2 border-yellow-200 z-50"
                      style={{ minWidth: '360px', maxHeight: '400px' }}
                    >
                      <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-yellow-100">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">😊</span>
                          <p className="text-base font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                            Эмодзи
                          </p>
                        </div>
                        <button
                          onClick={() => setShowEmojiPicker(false)}
                          className="p-1.5 hover:bg-red-100 rounded-full transition"
                        >
                          <X size={16} className="text-red-500" />
                        </button>
                      </div>
                      <div
                        className="grid grid-cols-10 gap-1 overflow-y-auto"
                        style={{ maxHeight: '280px' }}
                      >
                        {popularEmojis.map((emoji, index) => (
                          <button
                            key={`${emoji}-${index}`}
                            type="button"
                            onClick={() => handleEmojiClick(emoji)}
                            className="p-1.5 hover:bg-gradient-to-br hover:from-yellow-100 hover:to-orange-100 rounded-lg transition text-xl transform hover:scale-125"
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-yellow-100 text-center">
                        <p className="text-xs text-gray-400">
                          {popularEmojis.length} эмодзи доступно
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Введите сообщение..."
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={uploadingFile || !!imagePreview || !!audioBlob || isRecording}
                />
                <button
                  type="submit"
                  disabled={(!inputValue.trim() || uploadingFile) || !!imagePreview || !!audioBlob || isRecording}
                  className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-full transition"
                  title="Отправить"
                >
                  <Send size={20} className="text-white" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <MessageCircle size={80} className="mx-auto" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                Выберите чат
              </h3>
              <p className="text-gray-500 mb-6">
                Выберите контакт из списка или найдите нового пользователя
              </p>
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setShowAllUsers(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Найти пользователя
                </button>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Создать группу
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreateGroup={handleCreateGroup}
        currentUserId={currentUser.id}
      />
    </div>
  );
};

interface ContactItemProps {
  contact: Contact;
  active: boolean;
  onClick: () => void;
  showLastMessage: boolean;
}

const ContactItem: React.FC<ContactItemProps> = ({ 
  contact, 
  active, 
  onClick,
  showLastMessage 
}) => {
  const isGroup = contact.type === 'group';
  
  return (
    <div 
      onClick={onClick}
      className={`flex items-center p-3 rounded-lg cursor-pointer transition ${
        active ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className="relative mr-3 flex-shrink-0">
        <img src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full" />
        {!isGroup && (
          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            contact.status === 'online' ? 'bg-green-500' :
            contact.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
          }`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-gray-800 truncate">
            {contact.name}
            {isGroup && (
              <span className="ml-1 text-xs text-gray-500">
                ({contact.members?.length || 0})
              </span>
            )}
          </h4>
          {showLastMessage && contact.lastMessageTime && (
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {new Date(contact.lastMessageTime).toLocaleDateString() === new Date().toLocaleDateString()
                ? new Date(contact.lastMessageTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                : new Date(contact.lastMessageTime).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          {showLastMessage ? (
            <>
              <p className="text-sm text-gray-600 truncate flex-1">
                {contact.lastMessage || 'Нет сообщений'}
              </p>
              {contact.unreadCount && contact.unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full flex-shrink-0 min-w-[20px] text-center">
                  {contact.unreadCount}
                </span>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 truncate">{contact.email || (isGroup ? 'Группа' : '')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;