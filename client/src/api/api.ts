import axios from 'axios';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { aesDecrypt, aesEncrypt } from '../utils/crypto';
import enErrors from '../utils/enErrors.json';

const api = axios.create({
  baseURL: import.meta.env.REACT_APP_API_BASE_URL,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store,no-cache,must-revalidate',
  }
});

// Request interceptor to attach Bearer Token
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const notifyError = (message: string) => {
  toast.error(message, { duration: 5000, id: message });
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

export const logoutUser = () => {
  sessionStorage.clear();
  localStorage.removeItem('expiration_time');
  window.location.href = '/login';
};

// Handle standard API errors
const handleApiError = (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    logoutUser();
    throw error;
  }

  if (axios.isAxiosError(error)) {
    const errorCode = error.response?.data?.error;
    if (typeof errorCode === 'string' && errorCode in enErrors) {
      notifyError((enErrors as Record<string, string>)[errorCode]);
    } else {
      notifyError(getErrorMessage(error, enErrors.general_error));
    }
    throw error;
  }
  notifyError(enErrors.general_error);
  throw error;
};

export async function getRequest(url: string, params = {}) {
  try {
    const response = await api.get(url, { params });
    // Laravel responses are typically { data: ... } or raw objects
    return response.data?.data ?? response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function postRequest(url: string, data = {}, params = {}) {
  try {
    const response = await api.post(url, data, { params });
    return response.data?.data ?? response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function postLoginRequest(url: string, data = {}) {
  try {
    const response = await api.post(url, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorCode = error.response?.data?.error;
      if (typeof errorCode === 'string' && errorCode in enErrors) {
        notifyError((enErrors as Record<string, string>)[errorCode]);
      } else {
        notifyError(getErrorMessage(error, enErrors.general_error));
      }
    } else {
      notifyError(enErrors.general_error);
    }
    throw error;
  }
}

export async function getRefreshTokenRequest() {
  const encryptedRefreshToken = sessionStorage.getItem('refresh_token') || '';
  const decryptedRefreshToken = aesDecrypt(encryptedRefreshToken);

  if (!decryptedRefreshToken) {
    logoutUser();
    return;
  }

  try {
    const response = await api.post('refresh-token', {
      grant_type: 'refresh_token',
      client_id: import.meta.env.REACT_APP_CLIENT_ID,
      client_secret: import.meta.env.REACT_APP_CLIENT_SECRET,
      refresh_token: decryptedRefreshToken,
    });

    const { access_token, refresh_token } = response.data;
    sessionStorage.setItem('access_token', access_token);
    sessionStorage.setItem('refresh_token', aesEncrypt(refresh_token));
    
    // reset expiration
    const newExpirationTime = new Date(new Date().getTime() + 50 * 60 * 1000);
    localStorage.setItem('expiration_time', newExpirationTime.toString());
  } catch {
    logoutUser();
  }
}

export async function getFileRequest(url: string, params = {}, filename: string) {
  try {
    const response = await api.get(url, {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: (response.headers['content-type'] as string) || 'application/octet-stream',
    });
    saveAs(blob, filename);
  } catch (error) {
    notifyError(getErrorMessage(error, 'Download failed'));
  }
}

export async function postFileRequest(url: string, file: File, params = {}) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(url, formData, {
      params,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    notifyError(getErrorMessage(error, 'Upload failed'));
    throw error;
  }
}

export async function deleteRequest(url: string, params = {}) {
  try {
    const response = await api.delete(url, { params });
    return response.data?.data ?? response.data;
  } catch (error) {
    handleApiError(error);
  }
}
