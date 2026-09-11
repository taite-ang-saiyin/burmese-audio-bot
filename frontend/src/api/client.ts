/// <reference types="vite/client" />

import { ChatMessage, ConversationSession, GroundingStatus, SourceDocument, UserProfile } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');
const TOKEN_STORAGE_KEY = 'mingalar-banking-access-token';

let accessToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function hasSession(): boolean {
  return Boolean(accessToken);
}

export function clearSession(): void {
  accessToken = '';
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      detail = typeof body.detail === 'string' ? body.detail : body.detail?.message || detail;
    } catch {
      // A non-JSON upstream failure is still represented as a useful status.
    }
    throw new ApiError(detail, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

interface BackendMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  is_voice: boolean;
  is_saved: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface BackendConversation {
  id: string;
  title: string;
  category: string;
  created_at: string;
  updated_at: string;
  messages?: BackendMessage[];
}

interface RagSource {
  document?: string | null;
  page?: number | string | null;
  section?: string | null;
  score?: number | null;
}

export interface RagResponse {
  session_id: string;
  answer: string;
  tts_text: string;
  sources: RagSource[];
  grounded: boolean;
}

export interface TranscriptionResponse {
  success: boolean;
  data: {
    final_transcript: string;
    warnings: string[];
  };
}

function displayTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function mapSource(source: RagSource, index: number): SourceDocument {
  const document = source.document || 'Retrieved banking policy';
  return {
    id: `rag-source-${index}-${document}`,
    title: document,
    titleMm: document,
    version: 'RAG retrieval',
    page: source.page ?? undefined,
    section: source.section || 'Retrieved context',
    updatedAt: 'Retrieved now',
    category: 'General',
    snippet: source.score === undefined || source.score === null
      ? 'Retrieved policy context'
      : `Retrieval relevance: ${Math.round(source.score * 100)}%`,
    snippetMm: 'Retrieved policy context'
  };
}

function messageFromBackend(message: BackendMessage): ChatMessage | null {
  if (message.role === 'system') return null;
  const metadata = message.metadata || {};
  const grounding = metadata.grounding_status;
  return {
    id: message.id,
    role: message.role,
    text: message.content,
    timestamp: displayTime(message.created_at),
    isVoice: message.is_voice,
    isSaved: message.is_saved,
    sources: Array.isArray(metadata.sources) ? metadata.sources as SourceDocument[] : undefined,
    groundingStatus: grounding === 'limited' || grounding === 'escalated' ? grounding : 'verified',
    relatedQuestions: Array.isArray(metadata.related_questions) ? metadata.related_questions as string[] : undefined,
    ragSessionId: typeof metadata.rag_session_id === 'string' ? metadata.rag_session_id : undefined
  };
}

function conversationFromBackend(conversation: BackendConversation): ConversationSession {
  const messages = (conversation.messages || [])
    .map(messageFromBackend)
    .filter((message): message is ChatMessage => message !== null);
  return {
    id: conversation.id,
    title: conversation.title,
    titleMm: conversation.title,
    category: conversation.category,
    createdAt: displayTime(conversation.created_at),
    lastMessageAt: displayTime(conversation.updated_at),
    voiceCount: messages.filter((message) => message.isVoice).length,
    messages
  };
}

export async function login(email: string, password: string): Promise<UserProfile> {
  const response = await request<{ access_token: string; user: UserProfile }>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  accessToken = response.access_token;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
  return response.user;
}

export function currentUser(): Promise<UserProfile> {
  return request<UserProfile>('/auth/me');
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/auth/logout', { method: 'POST' });
  } finally {
    clearSession();
  }
}

export async function listConversations(): Promise<ConversationSession[]> {
  const response = await request<{ items: BackendConversation[] }>('/conversations');
  return Promise.all(response.items.map(async (conversation) => {
    const details = await request<BackendConversation>(`/conversations/${conversation.id}`);
    return conversationFromBackend(details);
  }));
}

export async function createConversation(title = 'New banking inquiry'): Promise<ConversationSession> {
  const response = await request<BackendConversation>('/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, category: 'General' })
  });
  return conversationFromBackend({ ...response, messages: [] });
}

export async function saveMessage(
  conversationId: string,
  message: Pick<ChatMessage, 'role' | 'text' | 'isVoice'>,
  metadata: Record<string, unknown> = {}
): Promise<ChatMessage> {
  const response = await request<BackendMessage>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: message.role, content: message.text, is_voice: Boolean(message.isVoice), metadata })
  });
  const mapped = messageFromBackend(response);
  if (!mapped) throw new ApiError('The backend returned an unsupported message role.', 500);
  return mapped;
}

export function askRag(message: string, conversationId: string, ragSessionId?: string, isVoice = false): Promise<RagResponse> {
  return request<RagResponse>('/integrations/chat/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversation_id: conversationId, rag_session_id: ragSessionId, is_voice: isVoice })
  });
}

export function transcribeAudio(file: File): Promise<TranscriptionResponse> {
  const body = new FormData();
  body.append('file', file);
  return request<TranscriptionResponse>('/integrations/stt/transcribe', { method: 'POST', body });
}

/** Request synthesized WAV audio through the authenticated backend gateway. */
export async function synthesizeSpeech(text: string): Promise<Blob> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE_URL}/integrations/tts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    let detail = `TTS request failed (${response.status})`;
    try {
      const body = await response.json();
      detail = typeof body.detail === 'string' ? body.detail : body.detail?.message || detail;
    } catch {
      // Keep the HTTP status when the upstream response is not JSON.
    }
    throw new ApiError(detail, response.status);
  }

  if (!response.headers.get('content-type')?.startsWith('audio/')) {
    throw new ApiError('The TTS service returned an unexpected response.', 502);
  }
  return response.blob();
}

export function assistantMetadata(response: RagResponse): Record<string, unknown> {
  const groundingStatus: GroundingStatus = response.grounded ? 'verified' : 'limited';
  return {
    rag_session_id: response.session_id,
    grounding_status: groundingStatus,
    sources: response.sources.map(mapSource),
    related_questions: []
  };
}

export function sourcesFromRag(response: RagResponse): SourceDocument[] {
  return response.sources.map(mapSource);
}
