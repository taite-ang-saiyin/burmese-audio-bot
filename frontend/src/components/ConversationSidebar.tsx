import React from 'react';
import { 
  Plus, 
  SquarePen, 
  Bookmark, 
  PhoneCall, 
  Settings2, 
  Trash2, 
  CreditCard,
  KeyRound,
  Coins,
  FileCheck,
  Sparkles,
  UserCheck,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { ConversationSession } from '../types';

interface ConversationSidebarProps {
  conversations: ConversationSession[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onNavigateSaved: () => void;
  onNavigateSettings: () => void;
  onDeleteConversation?: (id: string, e: React.MouseEvent) => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onNavigateSaved,
  onNavigateSettings,
  onDeleteConversation
}) => {
  return (
    <aside className="w-64 shrink-0 bg-[#171717] border-r border-white/[0.08] flex flex-col justify-between h-full p-3 text-zinc-300 select-none">
      {/* Top Header & New Chat button */}
      <div className="space-y-3">
        {/* ChatGPT style "New chat" button */}
        <button
          id="new-chat-sidebar-btn"
          onClick={onNewConversation}
          className="w-full py-2.5 px-3 rounded-xl bg-[#212121] hover:bg-[#2f2f2f] text-zinc-100 border border-white/[0.08] hover:border-white/20 font-medium text-xs flex items-center justify-between shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5" />
            </div>
            <span>New chat</span>
          </div>
          <SquarePen className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition" />
        </button>

        {/* Recent Inquiries List */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between px-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            <span>Conversations</span>
            <span className="text-[10px] text-zinc-600">{conversations.length}</span>
          </div>

          <div className="space-y-0.5 max-h-[calc(100vh-280px)] overflow-y-auto no-scrollbar pt-1">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition ${
                    isActive
                      ? 'bg-[#212121] text-white font-medium shadow-sm'
                      : 'text-zinc-400 hover:bg-[#212121]/60 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <span className="truncate text-[12.5px]">
                      {conv.title || conv.titleMm}
                    </span>
                  </div>

                  {onDeleteConversation && (
                    <button
                      onClick={(e) => onDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-zinc-500 transition rounded"
                      title="Delete Conversation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Profile & Links Area */}
      <div className="space-y-1.5 pt-3 border-t border-white/[0.08]">
        {/* Saved answers */}
        <button
          onClick={onNavigateSaved}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#212121] transition"
        >
          <Bookmark className="w-4 h-4 text-emerald-400" />
          <span>Saved Answers</span>
        </button>

        {/* Settings */}
        <button
          onClick={onNavigateSettings}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#212121] transition"
        >
          <Settings2 className="w-4 h-4 text-zinc-400" />
          <span>Voice & App Settings</span>
        </button>

        {/* User Card */}
        <div className="p-2.5 rounded-xl bg-[#212121] border border-white/[0.06] flex items-center justify-between text-xs mt-2">
          <div className="flex items-center space-x-2 truncate">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              U
            </div>
            <div className="truncate">
              <div className="font-semibold text-zinc-200 text-xs truncate">
                Verified Customer
              </div>
              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5" /> 256-bit Secured
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
