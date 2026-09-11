import React from 'react';
import { ShieldCheck, AlertCircle, HelpCircle, FileCheck2 } from 'lucide-react';
import { GroundingStatus } from '../types';

interface GroundingBadgeProps {
  status?: GroundingStatus;
  className?: string;
}

export const GroundingBadge: React.FC<GroundingBadgeProps> = ({
  status = 'verified',
  className = ''
}) => {
  if (status === 'verified') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm ${className}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Verified from bank knowledge</span>
      </span>
    );
  }

  if (status === 'limited') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 ${className}`}>
        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        <span>Limited Information</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 ${className}`}>
      <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
      <span>Human Support Recommended</span>
    </span>
  );
};
