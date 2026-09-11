import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  PanelRight, 
  PanelLeft, 
  PanelLeftClose,
  Sparkles, 
  AlertTriangle,
  ChevronDown,
  Plus,
  CreditCard,
  KeyRound,
  Coins,
  Building2,
  ShieldCheck,
  SquarePen,
  ArrowUp
} from 'lucide-react';
import { 
  ConversationSession, 
  VoiceState, 
  VoiceSettings, 
  FeedbackData 
} from '../types';
import { ConversationSidebar } from '../components/ConversationSidebar';
import { ConversationCard } from '../components/ConversationCard';
import { AssistantResponseCard } from '../components/AssistantResponseCard';
import { ContextPanel } from '../components/ContextPanel';
import { scanSensitiveData } from '../utils/securityFilter';

interface ChatConversationViewProps {
  conversations: ConversationSession[];
  activeConversation: ConversationSession;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onProcessQuery: (text: string, isVoice: boolean) => void;
  onToggleSaveMessage: (messageId: string) => void;
  onFeedbackSubmit: (messageId: string, feedback: FeedbackData) => void;
  voiceState: VoiceState;
  onStartListening: () => void;
  onStopListening: () => void;
  voiceSettings: VoiceSettings;
  onNavigate: (view: string) => void;
}

export const ChatConversationView: React.FC<ChatConversationViewProps> = ({
  conversations,
  activeConversation,
  onSelectConversation,
  onNewConversation,
  onProcessQuery,
  onToggleSaveMessage,
  onFeedbackSubmit,
  voiceState,
  onStartListening,
  onStopListening,
  voiceSettings,
  onNavigate
}) => {
  const [inputText, setInputText] = useState('');
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation.messages, voiceState]);

  const securityCheck = scanSensitiveData(inputText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || voiceState === 'SEARCHING' || voiceState === 'GENERATING') return;
    onProcessQuery(inputText.trim(), false);
    setInputText('');
  };

  // Find latest sources and related questions from the last assistant message
  const lastAssistantMessage = [...activeConversation.messages]
    .reverse()
    .find((m) => m.role === 'assistant');

  // Starter Prompts for Empty Chat State
  const starterPrompts = [
    {
      icon: <CreditCard className="w-4 h-4 text-emerald-400" />,
      title: 'Report lost or stolen card',
      desc: 'Immediate emergency freeze & replacement steps',
      prompt: 'My ATM card was lost, how do I immediately freeze it and get a replacement?'
    },
    {
      icon: <Coins className="w-4 h-4 text-cyan-400" />,
      title: 'Daily transfer limits',
      desc: 'Mobile banking & ATM cash withdrawal rules',
      prompt: 'What are the daily transfer and ATM cash withdrawal limits for mobile banking?'
    },
    {
      icon: <KeyRound className="w-4 h-4 text-amber-400" />,
      title: 'Reset mobile banking PIN',
      desc: 'Account credentials recovery procedure',
      prompt: 'How do I reset my mobile banking login password or transaction PIN?'
    },
    {
      icon: <Building2 className="w-4 h-4 text-teal-400" />,
      title: 'Branch hours & Swift codes',
      desc: 'Customer service center info & FX rates',
      prompt: 'What are the branch opening hours and international Swift code for inward remittance?'
    }
  ];

  const isEmptyState = activeConversation.messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[#212121]">
      {/* 1. Collapsible Left Sidebar */}
      {isSidebarOpen && (
        <div className="hidden md:block h-full animate-fade-in">
          <ConversationSidebar
            conversations={conversations}
            activeConversationId={activeConversation.id}
            onSelectConversation={onSelectConversation}
            onNewConversation={onNewConversation}
            onNavigateSaved={() => onNavigate('saved')}
            onNavigateSettings={() => onNavigate('settings')}
          />
        </div>
      )}

      {/* 2. Main Conversation Canvas */}
      <main className="flex-1 flex flex-col justify-between h-full bg-[#212121] relative overflow-hidden text-zinc-100">
        
        {/* Top Header Bar in ChatGPT Style */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-white/[0.08] bg-[#212121] z-10">
          <div className="flex items-center space-x-2">
            {/* Sidebar Toggle Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#2f2f2f] transition hidden md:flex items-center"
              title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </button>

            {/* Model Selector / Copilot Identity */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-[#2f2f2f]/60 hover:bg-[#2f2f2f] border border-white/[0.06] text-xs font-semibold cursor-pointer transition">
              <span className="text-zinc-200">Banking Copilot</span>
              <span className="text-[10px] text-emerald-400 font-normal">v4.0</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </div>

            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-white/[0.06]">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Verified Bank Policy RAG
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* New Chat Quick Button */}
            <button
              onClick={onNewConversation}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#2f2f2f] transition"
              title="Start a new chat"
            >
              <SquarePen className="w-4 h-4" />
            </button>

            {/* Toggle Sources Panel */}
            <button
              onClick={() => setIsContextOpen(!isContextOpen)}
              className={`p-1.5 px-2.5 rounded-lg text-xs flex items-center gap-1.5 transition ${
                isContextOpen
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-[#2f2f2f]/80 text-zinc-300 hover:text-white border border-white/[0.06]'
              }`}
              title="Toggle Knowledge Sources"
            >
              <PanelRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sources</span>
            </button>
          </div>
        </div>

        {/* Message Stream Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-3xl mx-auto w-full space-y-6">
            
            {/* Empty Chat Welcome State */}
            {isEmptyState ? (
              <div className="py-12 sm:py-16 space-y-8 text-center animate-fade-in">
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/60">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    What can I help with today?
                  </h2>
                  <p className="text-sm text-zinc-400 max-w-md mx-auto">
                    Ask banking policy questions, check transaction guidelines, or speak with voice AI.
                  </p>
                </div>

                {/* 2x2 Starter Prompt Cards in ChatGPT style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                  {starterPrompts.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => onProcessQuery(item.prompt, false)}
                      className="p-3.5 rounded-2xl bg-[#282828] hover:bg-[#303030] border border-white/[0.08] hover:border-white/20 text-xs transition group space-y-1 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        {item.icon}
                        <span className="font-semibold text-zinc-200 group-hover:text-white">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">
                        {item.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Message History List
              activeConversation.messages.map((msg) =>
                msg.role === 'user' ? (
                  <ConversationCard key={msg.id} message={msg} />
                ) : (
                  <AssistantResponseCard
                    key={msg.id}
                    message={msg}
                    onSelectRelatedQuestion={(q) => onProcessQuery(q, false)}
                    onToggleSave={onToggleSaveMessage}
                    onFeedbackSubmit={onFeedbackSubmit}
                    onAskAnother={onStartListening}
                    autoSpeak={voiceSettings.autoSpeak}
                  />
                )
              )
            )}

            {/* Processing / Generating State Animation */}
            {(voiceState === 'SEARCHING' || voiceState === 'GENERATING' || voiceState === 'TRANSCRIBING') && (
              <div className="flex items-start my-4 w-full animate-fade-in pl-9">
                <div className="p-3.5 rounded-2xl bg-[#282828] border border-white/[0.08] text-xs text-zinc-300 space-y-2 max-w-md shadow-md">
                  <div className="flex items-center space-x-2 text-emerald-400 font-medium">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>
                      {voiceState === 'TRANSCRIBING'
                        ? 'Transcribing speech audio...'
                        : voiceState === 'SEARCHING'
                        ? 'Searching verified bank policies...'
                        : 'Composing verified banking response...'}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full w-2/3 animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 3. Bottom ChatGPT Floating Pill Input Area */}
        <div className="p-3 sm:p-4 bg-gradient-to-t from-[#212121] via-[#212121]/95 to-transparent space-y-2">
          <div className="max-w-3xl mx-auto w-full space-y-2">
            
            {/* Input Pill Container */}
            <form 
              onSubmit={handleSubmit} 
              className="bg-[#2f2f2f] hover:bg-[#323232] focus-within:bg-[#2f2f2f] border border-white/[0.12] focus-within:border-white/30 rounded-[26px] p-2 pl-3 sm:pl-4 flex items-center gap-2 shadow-xl transition-all"
            >
              {/* Mic Voice Trigger Button */}
              <button
                type="button"
                id="chat-mic-btn"
                onClick={voiceState === 'LISTENING' ? onStopListening : onStartListening}
                className={`p-2 rounded-full transition flex items-center justify-center shrink-0 cursor-pointer ${
                  voiceState === 'LISTENING'
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
                title={voiceState === 'LISTENING' ? 'Stop listening' : 'Speak via Voice'}
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Text Input Field */}
              <input
                ref={inputRef}
                id="chat-text-input"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message Banking Copilot..."
                className="flex-1 bg-transparent text-sm sm:text-[15px] text-[#ECECEC] placeholder-zinc-500 outline-none"
                disabled={voiceState === 'SEARCHING' || voiceState === 'GENERATING'}
              />

              {/* Send Button (ChatGPT style: circle, white background when active) */}
              <button
                type="submit"
                id="chat-send-btn"
                disabled={!inputText.trim() || voiceState === 'SEARCHING' || voiceState === 'GENERATING'}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 ${
                  inputText.trim() && voiceState !== 'SEARCHING' && voiceState !== 'GENERATING'
                    ? 'bg-white text-black hover:bg-zinc-200 cursor-pointer shadow-sm'
                    : 'bg-[#424242] text-zinc-500 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>

            {/* Sensitive data masking alert */}
            {securityCheck.hasSensitiveData && (
              <div className="p-2 rounded-xl bg-amber-950/90 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2 shadow-lg animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{securityCheck.warningEn || 'Confidential tokens will be masked.'}</span>
              </div>
            )}

            {/* Disclaimer in ChatGPT style */}
            <p className="text-[11px] text-zinc-500 text-center font-normal">
              Banking Copilot can make mistakes. Verify important policy details with official bank documents.
            </p>
          </div>
        </div>
      </main>

      {/* 4. Right Context Panel */}
      <ContextPanel
        isOpen={isContextOpen}
        onClose={() => setIsContextOpen(false)}
        sources={lastAssistantMessage?.sources || []}
        relatedQuestions={lastAssistantMessage?.relatedQuestions || []}
        onSelectRelatedQuestion={(q) => onProcessQuery(q, false)}
      />
    </div>
  );
};
