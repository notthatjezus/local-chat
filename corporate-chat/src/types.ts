export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  bio?: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  avatar?: string;
  edited?: boolean;
  editedAt?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  type?: 'personal' | 'group';
  members?: string[];
}

export interface Group {
  id: string;
  name: string;
  avatar: string;
  description?: string;
  members: string[];
  admins: string[];
  createdBy: string;
  createdAt: string;
}