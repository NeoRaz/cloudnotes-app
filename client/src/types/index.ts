export interface User {
  id?: number;
  first_name: string;
  last_name: string;
  name?: string;
  email: string;
  email_verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Selection {
  id: number;
  name: string;
  type: string;
}

export interface Note {
  id?: number;
  title: string;
  description: string;
  user_id?: number;
  status_id?: number;
  priority_id?: number;
  due_date?: string;
  is_pinned?: boolean;
  attachment_path?: string;
  attachment_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Source {
  note_id: number;
  chunk_index: number;
  chunk_text: string;
  metadata?: {
    title?: string;
    user_id?: number;
  };
}

export interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  model?: string;
  loading?: boolean;
}

export interface Conversation {
  id: number;
  title: string;
  updated_at: string;
}
