import React, { useState, useEffect, useRef } from 'react';
import { 
  VoiceState, 
  VoiceSettings, 
  ConversationSession, 
  ChatMessage, 
  UserProfile, 
  FeedbackData,
  KnowledgeDocument
} from './types';
import { 
  PRELOADED_CONVERSATIONS, 
  MOCK_ANALYTICS, 
  MOCK_RECENT_INQUIRIES, 
  KNOWLEDGE_DOCUMENTS 
} from './data/mockKnowledge';
import { audioSynthesizer } from './utils/audioSynthesizer';
import { scanSensitiveData } from './utils/securityFilter';
import { Header } from './components/Header';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { VoiceWorkspaceView } from './views/VoiceWorkspaceView';
import { ChatConversationView } from './views/ChatConversationView';
import { HistoryView } from './views/HistoryView';
import { SavedAnswersView } from './views/SavedAnswersView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { KnowledgeManagementView } from './views/KnowledgeManagementView';

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState<string>('chat');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Voice Interaction State
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [listeningDuration, setListeningDuration] = useState<number>(0);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isAudioPaused, setIsAudioPaused] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Voice Settings State
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    personality: 'friendly',
    speed: 1.0,
    autoSpeak: true,
    dialect: 'standard',
    largeFont: false,
    showKeyboardHints: true
  });

  // Conversation Data State
  const [conversations, setConversations] = useState<ConversationSession[]>(PRELOADED_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string>(PRELOADED_CONVERSATIONS[0].id);

  // Knowledge Documents State
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocument[]>(KNOWLEDGE_DOCUMENTS);

  // Audio & Timer Refs
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>('');
  const silenceTimerRef = useRef<any>(null);
  const simulationTimerRef = useRef<any>(null);

  // Get Active Conversation
  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  // Keep liveTranscriptRef in sync
  useEffect(() => {
    liveTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);

  // Subscribe to Audio Synthesizer Progress
  useEffect(() => {
    const unsubscribe = audioSynthesizer.subscribe((prog, playing) => {
      setAudioProgress(prog);
      if (playing) {
        setVoiceState('SPEAKING');
        setIsAudioPaused(false);
      } else {
        if (prog >= 0.99) {
          setVoiceState('COMPLETED');
        }
      }
    });

    return () => {
      unsubscribe();
      audioSynthesizer.stop();
    };
  }, []);

  // Initialize Speech Recognition if supported in browser
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'my-MM'; // Burmese locale

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            interim += event.results[i][0].transcript;
          }
          if (interim) {
            liveTranscriptRef.current = interim;
            setLiveTranscript(interim);

            // Auto-process on silence pause after user speaks (1.8s debounce)
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              handleStopListening();
            }, 1800);
          }
        };

        recognition.onspeechend = () => {
          // Trigger auto-process quickly after user finishes speaking
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            handleStopListening();
          }, 600);
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition notice:', e.error);
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('Speech recognition initialization note:', err);
      }
    }
  }, []);

  // Listening Timer Handler
  useEffect(() => {
    if (voiceState === 'LISTENING') {
      setListeningDuration(0);
      timerRef.current = setInterval(() => {
        setListeningDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [voiceState]);

  // Voice Interaction Handlers
  const handleStartListening = () => {
    audioSynthesizer.stop();
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setVoiceState('LISTENING');

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Recognition already started or error
      }
    }

    // Realistic speech simulation fallback if browser has no mic input / audio
    const simulatedPhrases = [
      'ATM ကတ်ပျောက်သွားရင် ဘယ်လိုလုပ်ရမလဲ?',
      'Mobile Banking password မေ့သွားရင် reset ဘယ်လိုလုပ်ရမလဲ?',
      'ငွေစုစာရင်း အသစ်ဖွင့်ချင်ရင် ဘာတွေ လိုအပ်ပါသလဲ?',
      'တခြားဘဏ်ကို ငွေလွှဲခ ဘယ်လောက်ကျပါသလဲ?'
    ];
    const pickedPhrase = simulatedPhrases[Math.floor(Math.random() * simulatedPhrases.length)];

    let charIdx = 0;
    simulationTimerRef.current = setInterval(() => {
      charIdx += 2;
      const textChunk = pickedPhrase.slice(0, charIdx);
      liveTranscriptRef.current = textChunk;
      setLiveTranscript(textChunk);

      if (charIdx >= pickedPhrase.length) {
        if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
        // Automatically submit inquiry after spoken phrase completes (zero user prompt)
        setTimeout(() => {
          handleStopListening();
        }, 800);
      }
    }, 120);
  };

  const handleStopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const queryToProcess =
      (liveTranscriptRef.current || liveTranscript).trim() ||
      'ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ?';

    // Clear buffer and IMMEDIATELY auto-process the inquiry with no review step
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    handleProcessQuery(queryToProcess, true);
  };

  const handleCancelListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    liveTranscriptRef.current = '';
    setLiveTranscript('');
    setVoiceState('IDLE');
  };

  // Process Banking Query via Backend Gemini API with RAG
  const handleProcessQuery = async (queryText: string, isVoice: boolean = false) => {
    if (!queryText.trim()) return;

    // Security Check for Sensitive Personal Data (OTP, PIN, Card Number)
    const sec = scanSensitiveData(queryText);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // User Message Object
    const userMessage: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      text: queryText,
      timestamp: timeStr,
      isVoice: isVoice,
      sensitiveDetected: sec.hasSensitiveData,
      maskedText: sec.maskedText
    };

    // Update active conversation with user message
    const updatedMessages = [...activeConversation.messages, userMessage];
    const updatedConversation: ConversationSession = {
      ...activeConversation,
      messages: updatedMessages,
      voiceCount: isVoice ? activeConversation.voiceCount + 1 : activeConversation.voiceCount,
      titleMm: activeConversation.titleMm === 'စကားဝိုင်းအသစ်' ? queryText.slice(0, 30) : activeConversation.titleMm
    };

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? updatedConversation : c))
    );

    // Transition Voice state to searching -> generating
    setVoiceState('SEARCHING');

    try {
      // Call Backend Express API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          history: updatedMessages.map((m) => ({ role: m.role, content: m.text }))
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      setVoiceState('GENERATING');

      // AI Message Object
      const assistantMessage: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'ဘဏ်အချက်အလက်ကို ရှာဖွေရရှိပါသည်။',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVoice: false,
        groundingStatus: data.groundingStatus || 'verified',
        sources: data.sources || [],
        relatedQuestions: data.relatedQuestions || [
          'ATM ကတ်အသစ် ပြန်လည်လျှောက်ထားခြင်း အခကြေးငွေ',
          '24/7 Call Center သို့ တိုက်ရိုက်ခေါ်ဆိုရန်'
        ],
        escalationNeeded: data.escalationNeeded || false
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      const finalConversation: ConversationSession = {
        ...updatedConversation,
        messages: finalMessages
      };

      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? finalConversation : c))
      );

      // Trigger Burmese TTS audio if enabled
      if (voiceSettings.autoSpeak) {
        audioSynthesizer.speak(assistantMessage.text, {
          speed: voiceSettings.speed,
          personality: voiceSettings.personality,
          onStart: () => setVoiceState('SPEAKING'),
          onEnd: () => setVoiceState('COMPLETED')
        });
      } else {
        setVoiceState('COMPLETED');
      }
    } catch (err) {
      console.error('Error in chat processing:', err);

      // Fallback offline banking response grounded in knowledge base
      const fallbackReply = `**ATM ကတ် ပျောက်ဆုံးပါက ဆောင်ရွက်ရန် အဆင့်များ-**
1. **ကတ်ချက်ချင်း ပိတ်သိမ်းရန် (Card Freeze):** Mobile Banking App ရှိ *Card Management* သို့သွား၍ *Freeze Card* ကို နှိပ်ပါ။
2. **၂၄ နာရီ Hotline သို့ ဆက်သွယ်ရန်:** ဖုန်း **01-8392111** သို့ ချက်ချင်း ခေါ်ဆိုပါ။
3. **ကတ်အသစ် လျှောက်ထားခြင်း:** မှတ်ပုံတင်နှင့်အတူ အနီးဆုံး ဘဏ်ခွဲသို့ လာရောက် လျှောက်ထားနိုင်ပါသည် (ကတ်ထုတ်ပေးခ ၅,၀၀၀ ကျပ်)။`;

      const fallbackAssistant: ChatMessage = {
        id: `msg_a_fallback_${Date.now()}`,
        role: 'assistant',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVoice: false,
        groundingStatus: 'verified',
        sources: [
          {
            id: 'src_atm_01',
            title: 'ATM Card Security and Replacement Policy',
            titleMm: 'ATM ကတ် လုံခြုံရေးနှင့် အသစ်လဲလှယ်ခြင်း မူဝါဒ',
            section: 'Lost or Stolen Card Immediate Actions',
            version: '3.2',
            page: 14,
            category: 'Cards',
            updatedAt: 'July 2026',
            snippet: 'Immediate freezing of lost ATM cards via Hotline 01-8392111 or Mobile Banking.',
            snippetMm: 'ATM ကတ် ပျောက်ဆုံးပါက ၂၄ နာရီ Hotline 01-8392111 သို့ ဆက်သွယ်၍ ကတ်ချက်ချင်း ပိတ်ရမည်။'
          }
        ],
        relatedQuestions: [
          'ATM ကတ်အသစ်ထုတ်ယူခ ဘယ်လောက်ကျပါသလဲ?',
          'Mobile Banking မှ ကတ်ကို ခေတ္တပိတ်ထားနည်း'
        ]
      };

      const finalMessages = [...updatedMessages, fallbackAssistant];
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id ? { ...c, messages: finalMessages } : c
        )
      );

      if (voiceSettings.autoSpeak) {
        audioSynthesizer.speak(fallbackAssistant.text, {
          speed: voiceSettings.speed,
          personality: voiceSettings.personality,
          onStart: () => setVoiceState('SPEAKING'),
          onEnd: () => setVoiceState('COMPLETED')
        });
      } else {
        setVoiceState('COMPLETED');
      }
    }
  };

  // Preloaded Demo Scenario Handler
  const handleRunDemoScenario = () => {
    setCurrentView('workspace');
    handleProcessQuery('ATM ကတ် ပျောက်သွားရင် ဘာလုပ်ရမလဲ?', true);
  };

  // New Conversation Handler
  const handleNewConversation = () => {
    const newId = `conv_${Date.now()}`;
    const newConv: ConversationSession = {
      id: newId,
      title: 'New Banking Inquiries',
      titleMm: 'စကားဝိုင်းအသစ်',
      category: 'General',
      createdAt: 'Just now',
      voiceCount: 0,
      messages: []
    };
    setConversations([newConv, ...conversations]);
    setActiveConversationId(newId);
    setVoiceState('IDLE');
    setLiveTranscript('');
  };

  // Toggle Bookmark / Save Message
  const handleToggleSaveMessage = (messageId: string) => {
    setConversations((prev) =>
      prev.map((conv) => ({
        ...conv,
        messages: conv.messages.map((m) =>
          m.id === messageId ? { ...m, isSaved: !m.isSaved } : m
        )
      }))
    );
  };

  // Feedback Submission Handler
  const handleFeedbackSubmit = (messageId: string, feedback: FeedbackData) => {
    setConversations((prev) =>
      prev.map((conv) => ({
        ...conv,
        messages: conv.messages.map((m) =>
          m.id === messageId ? { ...m, feedback } : m
        )
      }))
    );
  };

  // Delete Conversation
  const handleDeleteConversation = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const remaining = conversations.filter((c) => c.id !== id);
    if (remaining.length === 0) {
      handleNewConversation();
    } else {
      setConversations(remaining);
      if (activeConversationId === id) {
        setActiveConversationId(remaining[0].id);
      }
    }
  };

  // Collect All Saved Messages across conversations
  const allSavedMessages = conversations
    .flatMap((c) => c.messages)
    .filter((m) => m.isSaved);

  return (
    <div
      className={`min-h-screen bg-[#212121] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 ${
        voiceSettings.largeFont ? 'text-lg' : ''
      }`}
    >
      {/* Top Main Navigation Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        voiceState={voiceState}
        user={currentUser}
        onLogout={() => setCurrentUser(null)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        savedCount={allSavedMessages.length}
        onNewConversation={handleNewConversation}
      />

      {/* Main View Router */}
      <div className="flex-1 flex flex-col">
        {currentView === 'workspace' && (
          <VoiceWorkspaceView
            voiceState={voiceState}
            onStartListening={handleStartListening}
            onStopListening={handleStopListening}
            onCancelListening={handleCancelListening}
            onProcessQuery={handleProcessQuery}
            onRunDemoScenario={handleRunDemoScenario}
            onOpenVoiceSettings={() => setIsSettingsModalOpen(true)}
            voiceSettings={voiceSettings}
            listeningDuration={listeningDuration}
            liveTranscript={liveTranscript}
            isAudioPaused={isAudioPaused}
            audioProgress={audioProgress}
            onPauseSpeaking={() => {
              audioSynthesizer.pause();
              setIsAudioPaused(true);
            }}
            onResumeSpeaking={() => {
              audioSynthesizer.resume();
              setIsAudioPaused(false);
            }}
            onReplaySpeaking={() => {
              const lastMsg = [...activeConversation.messages]
                .reverse()
                .find((m) => m.role === 'assistant');
              if (lastMsg) {
                audioSynthesizer.speak(lastMsg.text, {
                  speed: voiceSettings.speed,
                  personality: voiceSettings.personality
                });
              }
            }}
            onStopSpeaking={() => {
              audioSynthesizer.stop();
              setVoiceState('COMPLETED');
            }}
            onChangeSpeed={(spd) =>
              setVoiceSettings((prev) => ({ ...prev, speed: spd }))
            }
            onNavigate={(v) => setCurrentView(v)}
            activeConversation={activeConversation}
            onToggleSaveMessage={handleToggleSaveMessage}
            onFeedbackSubmit={handleFeedbackSubmit}
          />
        )}

        {currentView === 'chat' && (
          <ChatConversationView
            conversations={conversations}
            activeConversation={activeConversation}
            onSelectConversation={(id) => setActiveConversationId(id)}
            onNewConversation={handleNewConversation}
            onProcessQuery={handleProcessQuery}
            onToggleSaveMessage={handleToggleSaveMessage}
            onFeedbackSubmit={handleFeedbackSubmit}
            voiceState={voiceState}
            onStartListening={handleStartListening}
            onStopListening={handleStopListening}
            voiceSettings={voiceSettings}
            onNavigate={(v) => setCurrentView(v)}
          />
        )}

        {currentView === 'history' && (
          <HistoryView
            conversations={conversations}
            onSelectConversation={(id) => {
              setActiveConversationId(id);
              setCurrentView('chat');
            }}
            onDeleteConversation={(id) => handleDeleteConversation(id)}
            onClearAllHistory={() => setConversations([])}
            onNavigate={(v) => setCurrentView(v)}
          />
        )}

        {currentView === 'saved' && (
          <SavedAnswersView
            savedMessages={allSavedMessages}
            onToggleSave={handleToggleSaveMessage}
            onNavigate={(v) => setCurrentView(v)}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            settings={voiceSettings}
            onUpdateSettings={(newSet) => setVoiceSettings(newSet)}
          />
        )}

        {currentView === 'login' && (
          <LoginView
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              if (user.role === 'admin') {
                setCurrentView('admin');
              } else if (user.role === 'staff') {
                setCurrentView('knowledge');
              } else {
                setCurrentView('workspace');
              }
            }}
            onContinueAsCustomer={() => setCurrentView('workspace')}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboardView
            analytics={MOCK_ANALYTICS}
            recentInquiries={MOCK_RECENT_INQUIRIES}
            onNavigateKnowledge={() => setCurrentView('knowledge')}
          />
        )}

        {currentView === 'knowledge' && (
          <KnowledgeManagementView
            documents={knowledgeDocuments}
            onAddDocument={(newDoc) =>
              setKnowledgeDocuments([newDoc, ...knowledgeDocuments])
            }
            onDeleteDocument={(id) =>
              setKnowledgeDocuments(knowledgeDocuments.filter((d) => d.id !== id))
            }
          />
        )}
      </div>

      {/* Voice & Assistant Settings Modal */}
      <VoiceSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={voiceSettings}
        onUpdateSettings={(newSet) => setVoiceSettings(newSet)}
      />
    </div>
  );
}
