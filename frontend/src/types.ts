export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'TRANSCRIBING'
  | 'REVIEW_TRANSCRIPT'
  | 'SEARCHING'
  | 'GENERATING'
  | 'SPEAKING'
  | 'COMPLETED'
  | 'ERROR';

export type GroundingStatus = 'verified' | 'limited' | 'escalated';

export type KnowledgeStatus = 'Ready' | 'Processing' | 'Needs Review' | 'Failed';

export interface SourceDocument {
  id: string;
  title: string;
  titleMm: string;
  version: string;
  page?: number | string;
  section: string;
  updatedAt: string;
  category: 'Cards' | 'Accounts' | 'Transfers' | 'Loans' | 'Security' | 'General';
  snippet: string;
  snippetMm: string;
  documentUrl?: string;
}

export interface FeedbackData {
  helpful: boolean;
  reason?: 'incorrect' | 'hard_to_understand' | 'pronunciation' | 'missing_info' | 'other';
  comment?: string;
  submittedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  transcriptMm?: string;
  isVoice?: boolean;
  timestamp: string;
  audioDurationSeconds?: number;
  sources?: SourceDocument[];
  groundingStatus?: GroundingStatus;
  relatedQuestions?: string[];
  isSaved?: boolean;
  sensitiveDetected?: boolean;
  maskedText?: string;
  feedback?: FeedbackData;
  escalationNeeded?: boolean;
  // Session identifier issued by the conversation-manager/RAG service.
  ragSessionId?: string;
}

export interface ConversationSession {
  id: string;
  title: string;
  titleMm: string;
  createdAt: string;
  lastMessageAt?: string;
  messages: ChatMessage[];
  category: string;
  voiceCount: number;
}

export interface VoiceSettings {
  personality: 'friendly' | 'calm' | 'professional';
  speed: number; // 0.8, 1.0, 1.2
  autoSpeak: boolean;
  dialect: 'standard' | 'yangon' | 'mandalay';
  largeFont: boolean;
  highContrast?: boolean;
  showKeyboardHints: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  role: 'customer' | 'staff' | 'admin';
  avatar?: string;
  preferredLanguage?: string;
}

export type UserAccount = UserProfile;

export interface KnowledgeDocument {
  id: string;
  title: string;
  titleMm: string;
  category?: string;
  type: 'Policy' | 'Procedure' | 'FAQ' | 'Circular' | 'Manual';
  status: KnowledgeStatus;
  version: string;
  updatedAt?: string;
  lastUpdated?: string;
  sectionsCount: number;
  author?: string;
  fileSize?: string;
  description?: string;
  contentMm?: string;
  tags?: string[];
  keywords?: string[];
}

export interface AnalyticsSummary {
  totalQueriesToday: number;
  voiceQueriesRate: number;
  avgResponseTimeSeconds: number;
  helpfulRate: number;
  escalationsCount: number;
  escalationRate: number;
  popularTopics: {
    topic: string;
    count: number;
    percentage: number;
  }[];
}

export interface RecentInquiry {
  id: string;
  query: string;
  timestamp: string;
  confidence: number;
  latencySeconds: number;
  status: GroundingStatus;
  isVoice: boolean;
  category: string;
  escalated?: boolean;
}
