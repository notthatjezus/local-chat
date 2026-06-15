import axios from 'axios';

export const API_BASE_URL = 'http://10.120.20.111:5000';
const API_URL = `${API_BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },
  
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
};

export const userAPI = {
  getMe: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
  
  updateProfile: async (updates: any) => {
    const response = await api.put('/users/me', updates);
    return response.data;
  },
  
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getAllUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getContacts: async () => {
    const response = await api.get('/users/contacts');
    return response.data;
  },
};

export const messageAPI = {
  getMessages: async (contactId: string) => {
    const response = await api.get(`/messages/${contactId}`);
    return response.data;
  },

  editMessage: async (messageId: string, text: string) => {
    const response = await api.put(`/messages/${messageId}`, { text });
    return response.data;
  },

  deleteMessage: async (messageId: string, deleteType: 'self' | 'all' = 'all') => {
    const response = await api.delete(`/messages/${messageId}`, {
      params: { deleteType }
    });
    return response.data;
  },
};

export const fileAPI = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const groupAPI = {
  createGroup: async (name: string, members: string[], description?: string, avatar?: string) => {
    const response = await api.post('/groups', { name, members, description, avatar });
    return response.data;
  },
  
  getGroup: async (groupId: string) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },
  
  updateGroup: async (groupId: string, updates: any) => {
    const response = await api.put(`/groups/${groupId}`, updates);
    return response.data;
  },
  
  addMember: async (groupId: string, userId: string) => {
    const response = await api.post(`/groups/${groupId}/members`, { userId });
    return response.data;
  },
  
  removeMember: async (groupId: string, userId: string) => {
    const response = await api.delete(`/groups/${groupId}/members/${userId}`);
    return response.data;
  },
  
  deleteGroup: async (groupId: string) => {
    const response = await api.delete(`/groups/${groupId}`);
    return response.data;
  },
};

export default api;