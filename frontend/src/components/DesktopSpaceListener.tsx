import React, { useEffect, useRef } from 'react';
import { Keyboard } from 'lucide-react';
import { VoiceState } from '../types';

interface DesktopSpaceListenerProps {
  voiceState: VoiceState;
  onStartListening: () => void;
  onStopListening: () => void;
  enabled?: boolean;
}

export const DesktopSpaceListener: React.FC<DesktopSpaceListenerProps> = ({
  voiceState,
  onStartListening,
  onStopListening,
  enabled = true
}) => {
  const isHoldingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space' && !e.repeat && !isHoldingRef.current) {
        e.preventDefault();
        isHoldingRef.current = true;
        if (voiceState === 'IDLE' || voiceState === 'COMPLETED') {
          onStartListening();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isHoldingRef.current) {
        e.preventDefault();
        isHoldingRef.current = false;
        if (voiceState === 'LISTENING') {
          onStopListening();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [voiceState, enabled, onStartListening, onStopListening]);

  if (!enabled) return null;

  return (
    <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 select-none">
      <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
      <span>Desktop shortcut:</span>
      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px]">
        Hold Space
      </kbd>
      <span>to talk, release to send</span>
    </div>
  );
};
