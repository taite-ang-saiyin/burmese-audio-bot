import React from 'react';
import { Mic, ShieldAlert, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { ChatMessage } from '../types';

interface ConversationCardProps {
  message: ChatMessage;
}

export const ConversationCard: React.FC<ConversationCardProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.maskedText || message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-end my-3 w-full group animate-fade-in">
      <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[70%] flex flex-col items-end space-y-1.5">
        {/* User Message Bubble */}
        <div className="bg-[#2f2f2f] hover:bg-[#343434] text-[#ECECEC] rounded-[22px] rounded-br-[6px] px-4.5 py-3 text-[14.5px] sm:text-[15px] leading-relaxed shadow-sm transition-colors relative">
          <p className="whitespace-pre-wrap break-words font-normal">
            {message.maskedText || message.text}
          </p>

          {/* Sensitive data masking note if detected */}
          {message.sensitiveDetected && (
            <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center gap-1.5 text-[11px] text-amber-300 font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Sensitive information masked for banking security</span>
            </div>
          )}
        </div>

        {/* Hover / Sub-info Metadata & Action Bar */}
        <div className="flex items-center space-x-2 text-[11px] text-zinc-500 opacity-80 group-hover:opacity-100 transition px-1">
          {message.isVoice && (
            <span className="inline-flex items-center gap-1 text-emerald-400/90 font-medium">
              <Mic className="w-3 h-3" />
              <span>Voice</span>
            </span>
          )}
          <span>{message.timestamp}</span>

          <button
            onClick={handleCopy}
            className="p-1 rounded-md hover:text-zinc-200 hover:bg-zinc-800 transition"
            title="Copy question"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-zinc-400" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
