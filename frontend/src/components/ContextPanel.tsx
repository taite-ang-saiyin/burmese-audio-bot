import React from 'react';
import { X, ShieldCheck, PhoneCall, FileText, ArrowRight, BookOpen } from 'lucide-react';
import { SourceDocument } from '../types';

interface ContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sources: SourceDocument[];
  relatedQuestions: string[];
  onSelectRelatedQuestion: (q: string) => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  isOpen,
  onClose,
  sources,
  relatedQuestions,
  onSelectRelatedQuestion
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-80 shrink-0 bg-[#171717] border-l border-white/[0.08] h-full p-4 flex flex-col justify-between overflow-y-auto animate-fade-in text-zinc-200">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
              Grounded Sources & Context
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bank Sources */}
        {sources && sources.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Citations ({sources.length})</span>
            </h4>

            <div className="space-y-2">
              {sources.map((src, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#212121] border border-white/[0.06] text-xs space-y-1.5 hover:border-white/[0.12] transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200 text-xs truncate">
                      {src.title || src.titleMm}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      v{src.version}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">{src.section}</p>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1 border-t border-white/[0.04]">
                    <span>Page {src.page}</span>
                    <span>Updated {src.updatedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#212121] border border-white/[0.06] text-xs text-zinc-400 text-center">
            No external citations referenced for this query.
          </div>
        )}

        {/* Related Inquiries */}
        {relatedQuestions && relatedQuestions.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/[0.08]">
            <h4 className="text-xs font-medium text-zinc-400">
              Suggested Questions
            </h4>
            <div className="space-y-1.5">
              {relatedQuestions.map((rq, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectRelatedQuestion(rq)}
                  className="w-full text-left p-2.5 rounded-xl bg-[#212121] hover:bg-[#282828] border border-white/[0.06] hover:border-white/[0.12] text-xs text-zinc-300 hover:text-white transition flex items-center justify-between group"
                >
                  <span className="truncate pr-1">{rq}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 shrink-0 transition" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Support Info */}
      <div className="pt-3 border-t border-white/[0.08] space-y-2">
        <div className="p-3 rounded-xl bg-[#212121] border border-amber-500/20 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>24/7 Human Bank Officer</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Dial 1800-888-999 or request immediate branch officer handover.
          </p>
        </div>
      </div>
    </aside>
  );
};
