import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, ShieldCheck } from 'lucide-react';
import { SourceDocument } from '../types';

interface SourceDrawerProps {
  sources: SourceDocument[];
  className?: string;
}

export const SourceDrawer: React.FC<SourceDrawerProps> = ({
  sources,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className={`border border-white/[0.08] bg-[#282828] rounded-xl overflow-hidden transition-all duration-300 ${className}`}>
      {/* Expandable Toggle Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-zinc-300 hover:text-white hover:bg-[#303030] transition text-left"
      >
        <div className="flex items-center space-x-2">
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-zinc-200">
            {sources.length} Verified Bank Source{sources.length > 1 ? 's' : ''}
          </span>
          <span className="text-[11px] text-zinc-500 hidden sm:inline">
            (Official Bank Citations)
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
          <span>{isOpen ? 'Hide' : 'View Citations'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expanded Sources Grid */}
      {isOpen && (
        <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-white/[0.06] bg-[#242424] animate-fade-in">
          {sources.map((src, idx) => (
            <div
              key={src.id || idx}
              className="p-3 rounded-lg bg-[#282828] border border-white/[0.06] hover:border-white/[0.12] transition space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-100 text-xs">
                      {src.title}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      v{src.version}
                    </span>
                  </div>
                </div>

                <div className="text-right text-[10px] text-zinc-500 font-mono">
                  <span>Page {src.page}</span>
                </div>
              </div>

              {src.excerpt && (
                <div className="p-2 rounded bg-[#1f1f1f] border border-white/[0.04] text-[11px] text-zinc-300 font-normal leading-relaxed">
                  "{src.excerpt}"
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
                <span>Section: {src.section}</span>
                <span>Updated: {src.updatedAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
