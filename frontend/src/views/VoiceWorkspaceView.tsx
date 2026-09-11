import React, { useState, useRef } from 'react';
import { 
  Mic, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  AlertTriangle, 
  Keyboard, 
  ChevronRight,
  ArrowUp,
  MessageSquare
} from 'lucide-react';
import { VoiceState, VoiceSettings, ConversationSession, FeedbackData } from '../types';
import { VoiceOrb } from '../components/VoiceOrb';
import { QuickQuestionChips } from '../components/QuickQuestionChips';
import { DesktopSpaceListener } from '../components/DesktopSpaceListener';
import { AssistantResponseCard } from '../components/AssistantResponseCard';
import { LiveTranscript } from '../components/LiveTranscript';
import { scanSensitiveData } from '../utils/securityFilter';

interface VoiceWorkspaceViewProps {
  voiceState: VoiceState;
  onStartListening: () => void;
  onStopListening: () => void;
  onCancelListening: () => void;
  onProcessQuery: (text: string, isVoice: boolean) => void;
  onRunDemoScenario: () => void;
  onOpenVoiceSettings: () => void;
  voiceSettings: VoiceSettings;
  listeningDuration: number;
  liveTranscript: string;
  isAudioPaused: boolean;
  audioProgress: number;
  onPauseSpeaking: () => void;
  onResumeSpeaking: () => void;
  onReplaySpeaking: () => void;
  onStopSpeaking: () => void;
  onChangeSpeed: (speed: number) => void;
  onNavigate: (view: string) => void;
  activeConversation?: ConversationSession;
  onToggleSaveMessage?: (messageId: string) => void;
  onFeedbackSubmit?: (messageId: string, feedback: FeedbackData) => void;
  onConfirmTranscript?: (text: string) => void;
  onReRecordTranscript?: () => void;
  onCancelTranscript?: () => void;
}

export const VoiceWorkspaceView: React.FC<VoiceWorkspaceViewProps> = ({
  voiceState,
  onStartListening,
  onStopListening,
  onCancelListening,
  onProcessQuery,
  onRunDemoScenario,
  voiceSettings,
  listeningDuration,
  liveTranscript,
  isAudioPaused,
  audioProgress,
  onPauseSpeaking,
  onResumeSpeaking,
  onReplaySpeaking,
  onStopSpeaking,
  onChangeSpeed,
  onNavigate,
  activeConversation,
  onToggleSaveMessage,
  onFeedbackSubmit,
  onConfirmTranscript,
  onReRecordTranscript,
  onCancelTranscript
}) => {
  const [textInput, setTextInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const securityCheck = scanSensitiveData(textInput);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || voiceState === 'SEARCHING' || voiceState === 'GENERATING') return;
    onProcessQuery(textInput.trim(), false);
    setTextInput('');
  };

  // Find latest assistant answer if any
  const latestAssistantMessage = activeConversation?.messages
    ? [...activeConversation.messages].reverse().find((m) => m.role === 'assistant')
    : null;

  return (
    <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 w-full text-zinc-100 min-h-[calc(100vh-64px)]">
      
      {/* Top Welcome Header in ChatGPT Style */}
      <div className="text-center space-y-2 max-w-xl mx-auto pt-1 animate-fade-in">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#10A37F]/10 text-emerald-400 border border-[#10A37F]/30 mb-0.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>AI Banking Copilot Voice Mode</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Ask any banking question naturally
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
          Speak hands-free with instant auto-processing, verified with official bank policy.
        </p>

        {/* Desktop space bar shortcut badge */}
        <div className="flex justify-center pt-0.5">
          <DesktopSpaceListener
            voiceState={voiceState}
            onStartListening={onStartListening}
            onStopListening={onStopListening}
            enabled={voiceSettings.showKeyboardHints}
          />
        </div>
      </div>

      {/* Main Centerpiece Area: Central Voice Orb */}
      <div className="flex-1 flex flex-col items-center justify-center my-3 w-full space-y-4">
        <VoiceOrb
          state={voiceState}
          onStartListening={onStartListening}
          onStopListening={onStopListening}
          onCancelListening={onCancelListening}
          onSwitchToKeyboard={() => {
            inputRef.current?.focus();
          }}
          onPauseSpeaking={onPauseSpeaking}
          onResumeSpeaking={onResumeSpeaking}
          onReplaySpeaking={onReplaySpeaking}
          onStopSpeaking={onStopSpeaking}
          isAudioPaused={isAudioPaused}
          audioProgress={audioProgress}
          listeningDurationSeconds={listeningDuration}
          currentLiveTranscript={liveTranscript}
          playbackSpeed={voiceSettings.speed}
          onChangeSpeed={onChangeSpeed}
        />

        {voiceState === 'REVIEW_TRANSCRIPT' && onConfirmTranscript && onReRecordTranscript && onCancelTranscript && (
          <LiveTranscript
            initialText={liveTranscript}
            onConfirmSubmit={onConfirmTranscript}
            onReRecord={onReRecordTranscript}
            onCancel={onCancelTranscript}
          />
        )}

        {/* Display Verified Answer Card if in Speaking/Completed state and response is available */}
        {(voiceState === 'SPEAKING' || voiceState === 'COMPLETED') && latestAssistantMessage && (
          <div className="w-full max-w-2xl mx-auto animate-fade-in pt-2">
            <div className="flex items-center justify-between px-2 pb-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Latest Verified Policy Answer
              </span>
              <button
                onClick={() => onNavigate('chat')}
                className="hover:text-white transition flex items-center gap-1 text-[11px]"
              >
                <span>Full Chat View</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <AssistantResponseCard
              message={latestAssistantMessage}
              onSelectRelatedQuestion={(q) => onProcessQuery(q, false)}
              onToggleSave={onToggleSaveMessage}
              onFeedbackSubmit={onFeedbackSubmit}
              onAskAnother={onStartListening}
            />
          </div>
        )}
      </div>

      {/* Bottom Area: Quick Questions + ChatGPT Pill Input Bar + Demo Launcher */}
      <div className="w-full max-w-2xl mx-auto space-y-3 pb-2">
        
        {/* Quick Conversational Chips */}
        {voiceState !== 'LISTENING' && (
          <QuickQuestionChips
            onSelectQuestion={(q) => onProcessQuery(q, false)}
            disabled={voiceState === 'SEARCHING' || voiceState === 'GENERATING'}
          />
        )}

        {/* Text/Voice Input Box in ChatGPT Pill Style */}
        <div className="relative">
          <form
            onSubmit={handleTextSubmit}
            className="bg-[#2f2f2f] hover:bg-[#323232] focus-within:bg-[#2f2f2f] border border-white/[0.12] focus-within:border-white/30 rounded-[26px] p-2 pl-3 sm:pl-4 flex items-center gap-2 shadow-xl transition-all"
          >
            <button
              type="button"
              id="voice-mic-inline-btn"
              onClick={voiceState === 'LISTENING' ? onStopListening : onStartListening}
              className={`p-2 rounded-full transition flex items-center justify-center shrink-0 cursor-pointer ${
                voiceState === 'LISTENING'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
              title={voiceState === 'LISTENING' ? 'Finish Speaking' : 'Click to speak'}
            >
              <Mic className="w-5 h-5" />
            </button>

            <input
              ref={inputRef}
              id="user-query-input"
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask a banking question or type keywords..."
              className="flex-1 bg-transparent text-sm sm:text-[15px] text-[#ECECEC] placeholder-zinc-500 outline-none"
              disabled={voiceState === 'SEARCHING' || voiceState === 'GENERATING'}
            />

            {textInput && (
              <button
                type="button"
                onClick={() => setTextInput('')}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2"
              >
                Clear
              </button>
            )}

            <button
              type="submit"
              id="user-query-send-btn"
              disabled={!textInput.trim() || voiceState === 'SEARCHING' || voiceState === 'GENERATING'}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 ${
                textInput.trim() && voiceState !== 'SEARCHING' && voiceState !== 'GENERATING'
                  ? 'bg-white text-black hover:bg-zinc-200 cursor-pointer shadow-sm'
                  : 'bg-[#424242] text-zinc-500 cursor-not-allowed'
              }`}
              title="Send Inquiry"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          {/* Sensitive data warning if detected */}
          {securityCheck.hasSensitiveData && (
            <div className="absolute -top-12 left-0 right-0 p-2 rounded-xl bg-amber-950/90 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2 shadow-lg animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{securityCheck.warningEn || 'Sensitive token detected and masked.'}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-zinc-400 border-t border-white/[0.08]">
          <button
            id="run-demo-scenario-btn"
            onClick={onRunDemoScenario}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#282828] hover:bg-[#303030] text-emerald-300 border border-white/[0.08] transition shadow-sm font-medium cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Try ATM Sample Query</span>
          </button>

          <div className="flex items-center space-x-3 text-zinc-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-zinc-400" />
              <span>Banking Grade Privacy</span>
            </span>
            <span>•</span>
            <button 
              onClick={() => onNavigate('chat')} 
              className="hover:text-emerald-300 transition flex items-center gap-0.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>ChatGPT Conversation View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Mobile Fixed Bottom Dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#171717]/95 border-t border-white/[0.08] p-2.5 flex items-center justify-around z-30 backdrop-blur-lg">
        <button
          onClick={() => {
            inputRef.current?.focus();
          }}
          className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-white text-[10px]"
        >
          <Keyboard className="w-5 h-5 text-zinc-300" />
          <span>Type</span>
        </button>

        {/* Large Voice Mic */}
        <button
          id="mobile-main-mic-btn"
          onClick={voiceState === 'LISTENING' ? onStopListening : onStartListening}
          className={`w-14 h-14 -mt-6 rounded-full flex items-center justify-center shadow-2xl transition border-4 border-[#171717] ${
            voiceState === 'LISTENING'
              ? 'bg-rose-600 text-white animate-bounce'
              : 'bg-[#10A37F] text-white shadow-emerald-950/80 hover:scale-105'
          }`}
        >
          <Mic className="w-6 h-6" />
        </button>

        <button
          onClick={() => onNavigate('chat')}
          className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-white text-[10px]"
        >
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span>Chat Log</span>
        </button>
      </div>

    </div>
  );
};
