import React, { useState } from 'react';
import { 
  Bookmark, 
  Search, 
  Trash2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ChatMessage } from '../types';
import { AudioPlayer } from '../components/AudioPlayer';
import { GroundingBadge } from '../components/GroundingBadge';
import { SourceDrawer } from '../components/SourceDrawer';

interface SavedAnswersViewProps {
  savedMessages: ChatMessage[];
  onToggleSave: (messageId: string) => void;
  onNavigate: (view: string) => void;
}

export const SavedAnswersView: React.FC<SavedAnswersViewProps> = ({
  savedMessages,
  onToggleSave,
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = savedMessages.filter(
    (m) =>
      m.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.sources && m.sources.some((s) => s.title.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-zinc-100 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#10A37F] text-white flex items-center justify-center shadow-md">
              <Bookmark className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Saved Answers
            </h1>
          </div>
          <p className="text-xs text-zinc-400">
            Bookmarked bank answers and verified reference guidelines
          </p>
        </div>

        <button
          onClick={() => onNavigate('chat')}
          className="px-3.5 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Chat Inquiry</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search saved answers or policies..."
          className="w-full bg-[#282828] border border-white/[0.08] focus:border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none"
        />
      </div>

      {/* List */}
      <div className="space-y-4">
        {filtered.length > 0 ? (
          filtered.map((msg) => (
            <div
              key={msg.id}
              className="p-5 rounded-2xl bg-[#282828] border border-white/[0.08] space-y-3.5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-[#10A37F] text-white flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200">
                    AI Banking Copilot
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {msg.timestamp}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <GroundingBadge status={msg.groundingStatus} />
                  <button
                    onClick={() => onToggleSave(msg.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Text */}
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {msg.text}
              </p>

              {/* Audio controller */}
              <div className="pt-1">
                <AudioPlayer textToSpeak={msg.text} autoPlay={false} />
              </div>

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <SourceDrawer sources={msg.sources} />
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center rounded-2xl bg-[#282828] border border-white/[0.06] space-y-3">
            <Bookmark className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-300">
                No saved answers yet
              </p>
              <p className="text-xs text-zinc-500">
                Click the bookmark icon on any AI answer in the chat to save it for quick reference.
              </p>
            </div>
            <button
              onClick={() => onNavigate('chat')}
              className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explore Chat</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
