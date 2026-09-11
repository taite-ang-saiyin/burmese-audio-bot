import React, { useState } from 'react';
import { 
  Sparkles, 
  Bookmark, 
  BookmarkCheck, 
  Copy, 
  Check, 
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { ChatMessage, FeedbackData } from '../types';
import { GroundingBadge } from './GroundingBadge';
import { SourceDrawer } from './SourceDrawer';
import { FeedbackControls } from './FeedbackControls';
import { EscalationCard } from './EscalationCard';
import { audioSynthesizer } from '../utils/audioSynthesizer';

interface AssistantResponseCardProps {
  message: ChatMessage;
  onSelectRelatedQuestion?: (question: string) => void;
  onToggleSave?: (messageId: string) => void;
  onFeedbackSubmit?: (messageId: string, feedback: FeedbackData) => void;
  onAskAnother?: () => void;
  autoSpeak?: boolean;
}

export const AssistantResponseCard: React.FC<AssistantResponseCardProps> = ({
  message,
  onSelectRelatedQuestion,
  onToggleSave,
  onFeedbackSubmit,
  onAskAnother,
  autoSpeak = false
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  React.useEffect(() => {
    const unsub = audioSynthesizer.subscribe((prog, playing) => {
      setAudioProgress(prog);
      setIsPlayingAudio(playing);
    });

    if (autoSpeak) {
      handlePlaySpeech();
    }

    return () => unsub();
  }, [message.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlaySpeech = () => {
    if (isPlayingAudio) {
      audioSynthesizer.pause();
    } else {
      audioSynthesizer.speak(message.text, {
        speed: 1.0,
        personality: 'friendly',
        onEnd: () => setIsPlayingAudio(false)
      });
    }
  };

  const handleReplay = () => {
    audioSynthesizer.stop();
    audioSynthesizer.speak(message.text, {
      speed: 1.0,
      personality: 'friendly',
      onEnd: () => setIsPlayingAudio(false)
    });
  };

  // Format text into structured paragraphs, code blocks, and bullets
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} className="h-2.5" />;
      }

      const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
      const isNumbered = /^\d+[\.၊)]/.test(trimmed);

      // Render bold tokens **bold**
      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
      const content = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={pIdx} className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-amber-300 font-mono text-xs">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });

      return (
        <p
          key={idx}
          className={`leading-relaxed text-[15px] text-[#ECECEC] ${
            isBullet
              ? 'pl-5 relative before:content-["•"] before:absolute before:left-1 before:text-emerald-400 font-normal'
              : ''
          } ${isNumbered ? 'font-normal pl-1.5' : ''}`}
        >
          {content}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col items-start my-4 w-full animate-fade-in group">
      <div className="w-full space-y-3.5">
        
        {/* Assistant Header & Persona */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            {/* ChatGPT style Avatar Icon */}
            <div className="w-7 h-7 rounded-full bg-[#10A37F] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#ECECEC]">
                Banking Copilot
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {message.timestamp}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <GroundingBadge status={message.groundingStatus} />
          </div>
        </div>

        {/* Message Content Body in Clean ChatGPT Typography */}
        <div className="pl-9 space-y-3 text-[#ECECEC]">
          <div className="space-y-2 font-normal leading-relaxed text-[15px]">
            {renderFormattedText(message.text)}
          </div>

          {/* Escalation Card if Human Support is required */}
          {message.escalationNeeded && (
            <div className="pt-1">
              <EscalationCard onAskAnother={onAskAnother || (() => {})} />
            </div>
          )}

          {/* Audio TTS Mini Bar if Playing */}
          {isPlayingAudio && (
            <div className="p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-between gap-3 text-xs text-zinc-300 animate-fade-in">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="font-medium text-white">Reading response aloud...</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePlaySpeech}
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white"
                  title="Pause"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleReplay}
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white"
                  title="Replay from start"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Verified Policy Sources Accordion */}
          {message.sources && message.sources.length > 0 && (
            <div className="pt-1">
              <SourceDrawer sources={message.sources} />
            </div>
          )}

          {/* Follow-up Question Chips in ChatGPT style */}
          {message.relatedQuestions && message.relatedQuestions.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                {message.relatedQuestions.map((rq, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectRelatedQuestion?.(rq)}
                    className="group flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#2f2f2f] hover:bg-[#383838] border border-white/[0.08] hover:border-white/20 text-xs text-zinc-300 hover:text-white transition text-left cursor-pointer"
                  >
                    <span>{rq}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ChatGPT Action Buttons Bar (Audio, Copy, Like, Dislike, Save) */}
          <div className="flex items-center justify-between pt-1 text-zinc-400">
            <div className="flex items-center space-x-1">
              {/* Play / Listen Button */}
              <button
                onClick={handlePlaySpeech}
                className={`p-1.5 rounded-lg hover:bg-[#2f2f2f] hover:text-zinc-200 transition flex items-center gap-1 text-xs ${
                  isPlayingAudio ? 'text-emerald-400 bg-zinc-800' : 'text-zinc-400'
                }`}
                title={isPlayingAudio ? 'Pause Audio' : 'Listen to Answer (TTS)'}
              >
                {isPlayingAudio ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-[#2f2f2f] hover:text-zinc-200 transition"
                title="Copy Answer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </button>

              {/* Bookmark / Save */}
              <button
                onClick={() => onToggleSave?.(message.id)}
                className={`p-1.5 rounded-lg hover:bg-[#2f2f2f] transition ${
                  message.isSaved
                    ? 'text-emerald-400 bg-zinc-800'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title={message.isSaved ? 'Saved to Bookmarks' : 'Save Answer'}
              >
                {message.isSaved ? (
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Thumbs Up / Down Feedback */}
            <FeedbackControls
              existingFeedback={message.feedback}
              onFeedbackSubmit={(fb) => onFeedbackSubmit?.(message.id, fb)}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
