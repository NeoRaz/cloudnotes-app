import axios from 'axios';

// CRA injects REACT_APP_* via webpack DefinePlugin; declare process so TS is happy
declare const process: { env: Record<string, string | undefined> };

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
});

// Attach Bearer token on every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Send a question to the RAG assistant.
 * Returns the full response object: { answer, sources, provider, model, conversation_id }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function postAskAssistant(
  question: string,
  conversationId?: number,
  limit = 5,
): Promise<any> {
  const response = await api.post('/assistant/ask', { question, limit, conversation_id: conversationId });
  // Laravel wraps in { data: { answer, sources, ... } }
  return response.data?.data ?? response.data;
}

export async function getConversations(): Promise<any[]> {
  const response = await api.get('/assistant/conversations');
  return response.data?.data ?? [];
}

export async function getConversation(id: number): Promise<any> {
  const response = await api.get(`/assistant/conversations/${id}`);
  return response.data?.data;
}

export async function createConversation(): Promise<any> {
  const response = await api.post('/assistant/conversations');
  return response.data?.data;
}

export async function deleteConversation(id: number): Promise<void> {
  await api.delete(`/assistant/conversations/${id}`);
}
