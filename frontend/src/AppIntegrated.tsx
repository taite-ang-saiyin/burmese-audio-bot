import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, ConversationSession, FeedbackData, UserProfile, VoiceSettings, VoiceState } from './types';
import { audioSynthesizer } from './utils/audioSynthesizer';
import { scanSensitiveData } from './utils/securityFilter';
import {
  ApiError,
  askRag,
  assistantMetadata,
  createConversation,
  currentUser,
  hasSession,
  listConversations,
  login,
  logout,
  saveMessage,
  sourcesFromRag,
  transcribeAudio
} from './api/client';
import { Header } from './components/Header';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { VoiceWorkspaceView } from './views/VoiceWorkspaceView';
import { ChatConversationView } from './views/ChatConversationView';
import { HistoryView } from './views/HistoryView';
import { SavedAnswersView } from './views/SavedAnswersView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';

const defaultVoiceSettings: VoiceSettings = {
  personality: 'friendly', speed: 1, autoSpeak: true, dialect: 'standard', largeFont: false, showKeyboardHints: true
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return 'Please sign in again to use the banking assistant.';
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

export default function AppIntegrated() {
  const [currentView, setCurrentView] = useState('login');
  const [currentUserState, setCurrentUserState] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<ConversationSession[]>([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [voiceSettings, setVoiceSettings] = useState(defaultVoiceSettings);
  const [listeningDuration, setListeningDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const activeConversation = conversations.find((item) => item.id === activeConversationId);

  const reloadConversations = async () => {
    const items = await listConversations();
    setConversations(items);
    setActiveConversationId((current) => current || items[0]?.id || '');
    return items;
  };

  const establishSession = async (user: UserProfile) => {
    setCurrentUserState(user);
    const items = await reloadConversations();
    if (items.length === 0) {
      const conversation = await createConversation();
      setConversations([conversation]);
      setActiveConversationId(conversation.id);
    }
    setCurrentView('workspace');
  };

  useEffect(() => {
    if (!hasSession()) return;
    currentUser().then(establishSession).catch(() => {
      setCurrentView('login');
    });
  }, []);

  useEffect(() => {
    const unsubscribe = audioSynthesizer.subscribe((progress, playing) => {
      setAudioProgress(progress);
      if (playing) {
        setVoiceState('SPEAKING');
        setIsAudioPaused(false);
      } else if (progress >= 0.99) {
        setVoiceState('COMPLETED');
      }
    });
    return () => {
      unsubscribe();
      audioSynthesizer.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (voiceState !== 'LISTENING') {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    setListeningDuration(0);
    timerRef.current = window.setInterval(() => setListeningDuration((seconds) => seconds + 1), 1000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [voiceState]);

  const handleTranscription = async (audio: Blob, type: string) => {
    setVoiceState('TRANSCRIBING');
    setVoiceError('');
    try {
      const extension = type.includes('webm') ? 'webm' : type.includes('mp4') ? 'm4a' : 'wav';
      const response = await transcribeAudio(new File([audio], `voice-query.${extension}`, { type: type || 'audio/webm' }));
      const transcript = response.data.final_transcript.trim();
      if (!transcript) throw new Error('No speech was detected. Please record your question again.');
      setLiveTranscript(transcript);
      setVoiceState('REVIEW_TRANSCRIPT');
      if (response.data.warnings.length) setVoiceError(response.data.warnings.join(', '));
    } catch (error) {
      setVoiceError(errorMessage(error));
      setVoiceState('IDLE');
    }
  };

  const handleStartListening = async () => {
    if (!currentUserState) {
      setCurrentView('login');
      return;
    }
    audioSynthesizer.stop();
    setVoiceError('');
    setLiveTranscript('');
    setCurrentView('workspace');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((item) => MediaRecorder.isTypeSupported(item));
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      streamRef.current = stream;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (audio.size) void handleTranscription(audio, recorder.mimeType);
        else {
          setVoiceError('No audio was captured. Please try recording again.');
          setVoiceState('IDLE');
        }
      };
      recorderRef.current = recorder;
      recorder.start(250);
      setVoiceState('LISTENING');
    } catch (error) {
      setVoiceError('Microphone access is required for voice questions. Check browser permissions and try again.');
      setVoiceState('IDLE');
    }
  };

  const handleStopListening = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const handleCancelListening = () => {
    recorderRef.current?.state === 'recording' && recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setLiveTranscript('');
    setVoiceState('IDLE');
  };

  const handleNewConversation = async () => {
    if (!currentUserState) return setCurrentView('login');
    try {
      const conversation = await createConversation();
      setConversations((items) => [conversation, ...items]);
      setActiveConversationId(conversation.id);
      setVoiceState('IDLE');
      setLiveTranscript('');
      setCurrentView('chat');
    } catch (error) {
      setVoiceError(errorMessage(error));
    }
  };

  const handleProcessQuery = async (rawQuery: string, isVoice = false) => {
    if (!activeConversation || !rawQuery.trim()) return;
    const query = rawQuery.trim();
    const security = scanSensitiveData(query);
    setVoiceError('');
    setVoiceState('SEARCHING');
    try {
      const userMessage = await saveMessage(activeConversation.id, { role: 'user', text: query, isVoice });
      userMessage.sensitiveDetected = security.hasSensitiveData;
      userMessage.maskedText = security.maskedText;
      setConversations((items) => items.map((item) => item.id === activeConversation.id
        ? { ...item, messages: [...item.messages, userMessage], voiceCount: item.voiceCount + Number(isVoice) }
        : item));

      const ragSessionId = [...activeConversation.messages].reverse().find((item) => item.role === 'assistant')?.ragSessionId;
      const response = await askRag(query, activeConversation.id, ragSessionId, isVoice);
      setVoiceState('GENERATING');
      const assistant = await saveMessage(activeConversation.id, { role: 'assistant', text: response.answer, isVoice: false }, assistantMetadata(response));
      assistant.sources = sourcesFromRag(response);
      assistant.groundingStatus = response.grounded ? 'verified' : 'limited';
      assistant.ragSessionId = response.session_id;
      setConversations((items) => items.map((item) => item.id === activeConversation.id
        ? { ...item, messages: [...item.messages, assistant] }
        : item));

      if (voiceSettings.autoSpeak) {
        audioSynthesizer.speak(response.tts_text || assistant.text, {
          speed: voiceSettings.speed,
          personality: voiceSettings.personality,
          onStart: () => setVoiceState('SPEAKING'),
          onEnd: () => setVoiceState('COMPLETED')
        });
      } else {
        setVoiceState('COMPLETED');
      }
    } catch (error) {
      setVoiceError(errorMessage(error));
      setVoiceState('IDLE');
    }
  };

  const toggleSave = (messageId: string) => {
    setConversations((items) => items.map((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) => message.id === messageId ? { ...message, isSaved: !message.isSaved } : message)
    })));
  };

  const savedMessages = conversations.flatMap((conversation) => conversation.messages).filter((message) => message.isSaved);
  const feedback = (messageId: string, data: FeedbackData) => setConversations((items) => items.map((conversation) => ({
    ...conversation, messages: conversation.messages.map((message) => message.id === messageId ? { ...message, feedback: data } : message)
  })));

  const content = !currentUserState ? (
    <LoginView
      onLogin={async (email, password) => establishSession(await login(email, password))}
      onContinueAsCustomer={async () => establishSession(await login('customer@mingalarbank.com', 'ChangeMe123!'))}
    />
  ) : currentView === 'workspace' && activeConversation ? (
    <VoiceWorkspaceView voiceState={voiceState} onStartListening={() => void handleStartListening()} onStopListening={handleStopListening}
      onCancelListening={handleCancelListening} onProcessQuery={(text, voice) => void handleProcessQuery(text, voice)}
      onRunDemoScenario={() => void handleProcessQuery('My ATM card was lost. How do I freeze it?', true)}
      onOpenVoiceSettings={() => setIsSettingsModalOpen(true)} voiceSettings={voiceSettings} listeningDuration={listeningDuration}
      liveTranscript={liveTranscript} isAudioPaused={isAudioPaused} audioProgress={audioProgress}
      onPauseSpeaking={() => { audioSynthesizer.pause(); setIsAudioPaused(true); }} onResumeSpeaking={() => { audioSynthesizer.resume(); setIsAudioPaused(false); }}
      onReplaySpeaking={() => { const message = [...activeConversation.messages].reverse().find((item) => item.role === 'assistant'); if (message) audioSynthesizer.speak(message.text, { speed: voiceSettings.speed, personality: voiceSettings.personality }); }}
      onStopSpeaking={() => { audioSynthesizer.stop(); setVoiceState('COMPLETED'); }} onChangeSpeed={(speed) => setVoiceSettings((settings) => ({ ...settings, speed }))}
      onNavigate={setCurrentView} activeConversation={activeConversation} onToggleSaveMessage={toggleSave} onFeedbackSubmit={feedback}
      onConfirmTranscript={(text) => { setLiveTranscript(''); void handleProcessQuery(text, true); }} onReRecordTranscript={() => void handleStartListening()}
      onCancelTranscript={() => { setLiveTranscript(''); setVoiceState('IDLE'); }} />
  ) : currentView === 'history' ? (
    <HistoryView conversations={conversations} onSelectConversation={(id) => { setActiveConversationId(id); setCurrentView('chat'); }}
      onDeleteConversation={() => undefined} onClearAllHistory={() => setConversations([])} onNavigate={setCurrentView} />
  ) : currentView === 'saved' ? (
    <SavedAnswersView savedMessages={savedMessages} onToggleSave={toggleSave} onNavigate={setCurrentView} />
  ) : currentView === 'settings' ? (
    <SettingsView settings={voiceSettings} onUpdateSettings={setVoiceSettings} />
  ) : activeConversation ? (
    <ChatConversationView conversations={conversations} activeConversation={activeConversation} onSelectConversation={setActiveConversationId}
      onNewConversation={() => void handleNewConversation()} onProcessQuery={(text, voice) => void handleProcessQuery(text, voice)}
      onToggleSaveMessage={toggleSave} onFeedbackSubmit={feedback} voiceState={voiceState} onStartListening={() => void handleStartListening()}
      onStopListening={handleStopListening} voiceSettings={voiceSettings} onNavigate={setCurrentView} />
  ) : <div className="p-8 text-zinc-300">Loading your conversations…</div>;

  return <div className={`min-h-screen bg-[#212121] text-zinc-100 flex flex-col ${voiceSettings.largeFont ? 'text-lg' : ''}`}>
    {currentUserState && <Header currentView={currentView} onNavigate={setCurrentView} voiceState={voiceState} user={currentUserState}
      onLogout={() => { void logout(); setCurrentUserState(null); setConversations([]); setCurrentView('login'); }} onOpenSettings={() => setIsSettingsModalOpen(true)}
      savedCount={savedMessages.length} onNewConversation={() => void handleNewConversation()} />}
    {voiceError && <div className="mx-auto mt-3 max-w-4xl w-[calc(100%-2rem)] rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-200">{voiceError}</div>}
    <main className="flex-1 flex flex-col">{content}</main>
    <VoiceSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} settings={voiceSettings} onUpdateSettings={setVoiceSettings} />
  </div>;
}
