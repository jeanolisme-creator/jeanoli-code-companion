export interface Project {
  id: number;
  name: string;
  fullName: string;
  account: string;
  accountAvatar: string;
  isPrivate: boolean;
  lastSync: string;
  language: string;
  branch: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  codeSuggestion?: string;
  timestamp: Date;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  tokens: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role?: string;
}
