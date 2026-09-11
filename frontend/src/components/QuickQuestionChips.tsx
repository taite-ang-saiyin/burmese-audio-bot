import React from 'react';
import { Sparkles, CreditCard, KeyRound, UserPlus, ArrowLeftRight, Landmark, BadgeHelp } from 'lucide-react';
import { QUICK_QUESTIONS } from '../data/mockKnowledge';

interface QuickQuestionChipsProps {
  onSelectQuestion: (question: string) => void;
  disabled?: boolean;
}

export const QuickQuestionChips: React.FC<QuickQuestionChipsProps> = ({
  onSelectQuestion,
  disabled = false
}) => {
  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'Cards':
        return <CreditCard className="w-3.5 h-3.5 text-amber-400" />;
      case 'Security':
        return <KeyRound className="w-3.5 h-3.5 text-rose-400" />;
      case 'Accounts':
        return <UserPlus className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Transfers':
        return <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Loans':
        return <Landmark className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <BadgeHelp className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-2">
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Popular Banking Inquiries</span>
        </div>
        <span className="text-[11px] text-slate-500">Tap to ask instantly</span>
      </div>

      {/* Horizontally scrollable chips container */}
      <div className="flex items-center space-x-2.5 overflow-x-auto pb-2 pt-1 px-1 no-scrollbar scroll-smooth">
        {QUICK_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            id={`quick-chip-${idx}`}
            onClick={() => onSelectQuestion(q.text)}
            disabled={disabled}
            className="flex-shrink-0 group flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-slate-200 transition-all duration-200 shadow-md hover:shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
          >
            <div className="p-1 rounded-lg bg-slate-800 group-hover:bg-slate-750 border border-slate-700/60 transition">
              {getIconForCategory(q.category)}
            </div>
            <span className="font-medium whitespace-nowrap">
              {q.text}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800/80 text-slate-400 font-normal">
              {q.tag}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
