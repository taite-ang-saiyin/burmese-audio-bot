import React from 'react';
import { PhoneCall, ArrowRight, ShieldAlert } from 'lucide-react';

interface EscalationCardProps {
  onCallSupport?: () => void;
  onAskAnother: () => void;
  customMessageMm?: string;
}

export const EscalationCard: React.FC<EscalationCardProps> = ({
  onCallSupport,
  onAskAnother,
  customMessageMm = 'Live human banking specialist recommended for this transaction.'
}) => {
  return (
    <div className="bg-[#282828] border border-amber-500/30 rounded-2xl p-4 sm:p-5 text-zinc-100 shadow-md space-y-3.5 my-2">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Specialist Support Recommended
            </span>
          </div>
          <h4 className="text-sm sm:text-base font-semibold text-zinc-100 leading-snug">
            {customMessageMm}
          </h4>
          <p className="text-xs text-zinc-400">
            For account security and verified transaction clearance, our 24/7 Concierge Specialists are available to assist you directly.
          </p>
        </div>
      </div>

      {/* Hotline information box */}
      <div className="bg-[#1f1f1f] p-3 rounded-xl border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <PhoneCall className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-zinc-400">24/7 Hotline:</span>
          <span className="font-mono font-bold text-white text-sm">1800-888-999 / 01-8392111</span>
        </div>
        <span className="text-[11px] text-zinc-500">Toll-Free • Available 24/7</span>
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <a
          href="tel:1800888999"
          id="escalation-call-btn"
          className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-xs flex items-center gap-2 transition shadow-sm"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Call 24/7 Support</span>
        </a>

        <button
          onClick={onAskAnother}
          id="escalation-ask-another-btn"
          className="px-4 py-2 rounded-xl bg-[#383838] hover:bg-[#404040] text-zinc-200 font-medium text-xs flex items-center gap-1.5 transition border border-white/[0.08]"
        >
          <span>Ask Another Question</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
