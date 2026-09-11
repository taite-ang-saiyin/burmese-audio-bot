import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Mic, 
  MessageSquare, 
  Trash2, 
  Download, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { ConversationSession } from '../types';

interface HistoryViewProps {
  conversations: ConversationSession[];
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearAllHistory: () => void;
  onNavigate: (view: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  conversations,
  onSelectConversation,
  onDeleteConversation,
  onClearAllHistory,
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.titleMm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.messages.some((m) => m.text.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All' || c.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleExportAll = () => {
    const dataStr = JSON.stringify(conversations, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banking-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-zinc-100 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#10A37F] text-white flex items-center justify-center shadow-md">
              <History className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Chat & Voice History
            </h1>
          </div>
          <p className="text-xs text-zinc-400">
            Review past conversations, search answers, or resume previous banking inquiries
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {conversations.length > 0 && (
            <>
              <button
                onClick={handleExportAll}
                className="px-3 py-1.5 rounded-xl bg-[#282828] hover:bg-[#303030] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={onClearAllHistory}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search within past inquiries..."
            className="w-full bg-[#282828] border border-white/[0.08] focus:border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {['All', 'Cards', 'Security', 'Transfers', 'Accounts'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'bg-[#282828] text-zinc-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* History Items List */}
      <div className="space-y-3">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => {
            const hasVoice = conv.messages.some((m) => m.isVoice);
            const previewMsg = conv.messages[conv.messages.length - 1];

            return (
              <div
                key={conv.id}
                className="p-4 rounded-2xl bg-[#282828] hover:bg-[#2f2f2f] border border-white/[0.08] hover:border-white/20 transition space-y-2.5 group shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 truncate">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-sm text-zinc-100 truncate">
                        {conv.title || conv.titleMm}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#383838] text-zinc-300">
                        {conv.category}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 truncate max-w-xl">
                      {previewMsg ? previewMsg.text : 'No messages yet'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {hasVoice && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-medium flex items-center gap-1 border border-emerald-500/20">
                        <Mic className="w-3 h-3" />
                        <span>Voice</span>
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {conv.timestamp}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-xs">
                  <div className="flex items-center space-x-3 text-zinc-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{conv.messages.length} messages</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onDeleteConversation(conv.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition"
                      title="Delete Conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        onSelectConversation(conv.id);
                        onNavigate('chat');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                    >
                      <span>Resume</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center rounded-2xl bg-[#282828] border border-white/[0.06] space-y-3">
            <History className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-300">
                No matching conversations found
              </p>
              <p className="text-xs text-zinc-500">
                Start a new voice inquiry or text question anytime.
              </p>
            </div>
            <button
              onClick={() => onNavigate('chat')}
              className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Go to Chat</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
