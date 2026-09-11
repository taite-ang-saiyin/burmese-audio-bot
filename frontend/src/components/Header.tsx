import React from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Plus, 
  Bookmark, 
  SlidersHorizontal,
  History,
  MessageSquare,
  Building2,
  LogOut,
  Mic,
  SquarePen
} from 'lucide-react';
import { VoiceSettings, VoiceState, UserProfile } from '../types';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  voiceSettings?: VoiceSettings;
  voiceState?: VoiceState;
  onOpenVoiceSettings?: () => void;
  onOpenSettings?: () => void;
  onNewConversation?: () => void;
  savedCount?: number;
  user?: UserProfile | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  voiceSettings,
  onOpenVoiceSettings,
  onOpenSettings,
  onNewConversation,
  savedCount = 0,
  user,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#171717]/95 backdrop-blur-md border-b border-white/[0.08] text-zinc-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand Identity */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => onNavigate('chat')}
          >
            <div className="w-8 h-8 rounded-full bg-[#10A37F] text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                  Banking <span className="text-[#10A37F] font-bold">Copilot</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
                  Grounded AI
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Links in ChatGPT style */}
          <nav className="hidden md:flex items-center space-x-1 bg-[#212121] p-1 rounded-xl border border-white/[0.06] text-xs font-medium">
            <button
              onClick={() => onNavigate('chat')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                currentView === 'chat'
                  ? 'bg-[#2f2f2f] text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => onNavigate('workspace')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                currentView === 'workspace'
                  ? 'bg-[#2f2f2f] text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Orb</span>
            </button>
            <button
              onClick={() => onNavigate('history')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                currentView === 'history'
                  ? 'bg-[#2f2f2f] text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
            <button
              onClick={() => onNavigate('saved')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                currentView === 'saved'
                  ? 'bg-[#2f2f2f] text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved</span>
              {savedCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                  {savedCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* New Conversation Button */}
            {onNewConversation && (
              <button
                id="header-new-chat-btn"
                onClick={onNewConversation}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#212121] text-zinc-200 hover:text-white hover:bg-[#2f2f2f] border border-white/[0.08] transition shadow-sm"
                title="Start a new chat"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            )}

            {/* Voice Settings Trigger */}
            <button
              id="header-voice-settings-btn"
              onClick={onOpenVoiceSettings || onOpenSettings}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#212121] text-zinc-400 hover:text-zinc-200 hover:bg-[#2f2f2f] border border-white/[0.08] transition"
              title="Voice & App Settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* User / Portal Switcher */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-white/[0.08]">
                <button
                  onClick={() => onNavigate(user.role === 'admin' ? 'admin' : 'knowledge')}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#212121] hover:bg-[#2f2f2f] text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{user.role === 'admin' ? 'Admin' : 'Staff'}</span>
                </button>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-300 hover:bg-[#212121] transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-[#212121] border border-transparent hover:border-white/[0.08] transition"
              >
                Staff Portal
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
