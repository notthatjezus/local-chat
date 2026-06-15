import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(userId: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io('http://10.120.20.111:5000', {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket подключен');
      this.socket?.emit('user:connect', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket отключен');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Ошибка подключения WebSocket:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendMessage(senderId: string, receiverId: string | undefined, text: string, groupId?: string, fileData?: any) {
    if (!this.socket?.connected) {
      console.error('WebSocket не подключен');
      return;
    }

    const messageData: any = {
      senderId,
      text
    };

    if (groupId) {
      messageData.groupId = groupId;
    } else {
      messageData.receiverId = receiverId;
    }

    if (fileData) {
      messageData.fileUrl = fileData.url;
      messageData.fileName = fileData.filename;
      messageData.fileType = fileData.type;
    }

    this.socket.emit('message:send', messageData);
  }

  sendVoiceMessage(senderId: string, receiverId: string | undefined, groupId: string | undefined, audioUrl: string, duration: number) {
    if (!this.socket?.connected) {
      console.error('WebSocket не подключен');
      return;
    }

    const messageData: any = {
      senderId,
      text: '',
      audioUrl,
      audioDuration: duration
    };

    if (groupId) {
      messageData.groupId = groupId;
    } else {
      messageData.receiverId = receiverId;
    }

    this.socket.emit('message:send', messageData);
  }

  editMessage(messageId: string, text: string, groupId?: string, receiverId?: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('message:edit', { messageId, text, groupId, receiverId });
  }

  deleteMessage(messageId: string, groupId?: string, receiverId?: string, deleteType: 'self' | 'all' = 'all') {
    if (!this.socket?.connected) return;
    this.socket.emit('message:delete', { messageId, groupId, receiverId, deleteType });
  }

  onMessageReceive(callback: (message: any) => void) {
    this.socket?.on('message:receive', callback);
  }

  onMessageEdited(callback: (message: any) => void) {
    this.socket?.on('message:edited', callback);
  }

  onMessageDeleted(callback: (data: any) => void) {
    this.socket?.on('message:deleted', callback);
  }

  onMessageStatus(callback: (data: any) => void) {
    this.socket?.on('message:status', callback);
  }

  onUserStatus(callback: (data: any) => void) {
    this.socket?.on('user:status', callback);
  }

  markMessagesAsRead(userId: string, senderId?: string, groupId?: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('messages:read', { userId, senderId, groupId });
  }

  onMessagesRead(callback: (data: any) => void) {
    this.socket?.on('messages:read', callback);
  }

  startTyping(senderId: string, receiverId?: string, groupId?: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing:start', { senderId, receiverId, groupId });
  }

  stopTyping(senderId: string, receiverId?: string, groupId?: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing:stop', { senderId, receiverId, groupId });
  }

  onTypingStart(callback: (data: any) => void) {
    this.socket?.on('typing:start', callback);
  }

  onTypingStop(callback: (data: any) => void) {
    this.socket?.on('typing:stop', callback);
  }

  joinGroup(groupId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('group:join', groupId);
  }

  leaveGroup(groupId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('group:leave', groupId);
  }

  off(event: string) {
    this.socket?.off(event);
  }
}

export default new SocketService();