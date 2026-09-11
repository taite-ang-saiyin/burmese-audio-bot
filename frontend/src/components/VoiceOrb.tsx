import React, { useEffect, useState } from 'react';
import { 
  Mic, 
  Square, 
  RotateCcw, 
  Pause, 
  Play, 
  Volume2, 
  Keyboard, 
  Sparkles,
  X,
  VolumeX
} from 'lucide-react';
import { VoiceState } from '../types';
import { WaveformVisualizer } from './WaveformVisualizer';

interface VoiceOrbProps {
  state: VoiceState;
  onStartListening: () => void;
  onStopListening: () => void;
  onCancelListening: () => void;
  onSwitchToKeyboard: () => void;
  onPauseSpeaking: () => void;
  onResumeSpeaking: () => void;
  onReplaySpeaking: () => void;
  onStopSpeaking: () => void;
  isAudioPaused: boolean;
  audioProgress: number; // 0 to 1
  listeningDurationSeconds: number;
  currentLiveTranscript?: string;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  onStartListening,
  onStopListening,
  onCancelListening,
  onSwitchToKeyboard,
  onPauseSpeaking,
  onResumeSpeaking,
  onReplaySpeaking,
  onStopSpeaking,
  isAudioPaused,
  audioProgress,
  listeningDurationSeconds,
  playbackSpeed,
  onChangeSpeed
}) => {
  const [processingStep, setProcessingStep] = useState<number>(1);

  // Cycle processing indicators gracefully
  useEffect(() => {
    if (state === 'SEARCHING' || state === 'GENERATING' || state === 'TRANSCRIBING') {
      const t1 = setTimeout(() => setProcessingStep(2), 500);
      const t2 = setTimeout(() => setProcessingStep(3), 1100);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setProcessingStep(1);
    }
  }, [state]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center relative w-full max-w-lg mx-auto py-2">
      {/* Orb Center Container */}
      <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72 my-2">
        
        {/* Background Ambient Glow */}
        <div 
          className={`absolute inset-0 rounded-full transition-all duration-700 blur-3xl pointer-events-none ${
            state === 'LISTENING'
              ? 'bg-[#10A37F]/35 scale-125'
              : state === 'SEARCHING' || state === 'GENERATING' || state === 'TRANSCRIBING'
              ? 'bg-amber-500/25 scale-110'
              : state === 'SPEAKING'
              ? 'bg-teal-500/30 scale-115'
              : 'bg-[#10A37F]/15 scale-100'
          }`}
        />

        {/* Listening Radial Waves */}
        {state === 'LISTENING' && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-ping pointer-events-none" />
            <div className="absolute -inset-4 rounded-full border border-emerald-500/30 animate-pulse pointer-events-none" />
            <div className="absolute -inset-8 rounded-full border border-teal-400/20 animate-listening-wave pointer-events-none" />
          </>
        )}

        {/* Speaking Audio Progress Ring (Circular SVG) */}
        {state === 'SPEAKING' && (
          <svg className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] -rotate-90 pointer-events-none">
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="rgba(16, 163, 127, 0.15)"
              strokeWidth="4"
            />
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="#10A37F"
              strokeWidth="4"
              strokeDasharray="1000"
              strokeDashoffset={1000 - 1000 * Math.min(1, Math.max(0, audioProgress))}
              strokeLinecap="round"
              className="transition-all duration-150"
            />
          </svg>
        )}

        {/* The Main Circular Orb Core */}
        <div
          id="voice-orb-core"
          onClick={() => {
            if (state === 'IDLE' || state === 'COMPLETED') {
              onStartListening();
            } else if (state === 'LISTENING') {
              // Immediately finish speaking and auto-process
              onStopListening();
            } else if (state === 'SPEAKING') {
              if (isAudioPaused) onResumeSpeaking();
              else onPauseSpeaking();
            }
          }}
          className={`relative z-10 w-48 h-48 sm:w-56 sm:h-56 rounded-full cursor-pointer flex flex-col items-center justify-center p-4 select-none transition-all duration-500 shadow-2xl ${
            state === 'LISTENING'
              ? 'bg-gradient-to-b from-[#0a3528] via-[#09261d] to-[#051611] border-2 border-emerald-400/90 shadow-emerald-950/80 scale-105'
              : state === 'SEARCHING' || state === 'GENERATING' || state === 'TRANSCRIBING'
              ? 'bg-gradient-to-b from-[#2b2715] via-[#1a170c] to-[#0c0f17] border-2 border-amber-400/80 shadow-amber-950/60 animate-pulse'
              : state === 'SPEAKING'
              ? 'bg-gradient-to-b from-[#0d343c] via-[#092228] to-[#071317] border-2 border-teal-400/80 shadow-teal-950/60'
              : 'bg-gradient-to-b from-[#2a2a2a] via-[#1f1f1f] to-[#171717] border-2 border-white/10 hover:border-[#10A37F]/60 shadow-black/80 hover:scale-[1.02]'
          }`}
        >
          {/* Inner Core Styling */}
          <div className="absolute inset-2 rounded-full border border-white/5 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

          {/* Center Graphic */}
          {state === 'IDLE' || state === 'COMPLETED' ? (
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#10A37F]/15 border border-[#10A37F]/30 flex items-center justify-center shadow-inner">
                <Mic className="w-6 h-6 text-[#10A37F]" />
              </div>
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-zinc-100 block">
                  Tap to Speak
                </span>
                <span className="text-[11px] text-zinc-400">
                  Instant AI bank consultation
                </span>
              </div>
            </div>
          ) : state === 'LISTENING' ? (
            <div className="flex flex-col items-center text-center space-y-1.5">
              <div className="w-11 h-11 rounded-full bg-emerald-500/25 border border-emerald-400 flex items-center justify-center animate-bounce">
                <Mic className="w-5 h-5 text-emerald-300" />
              </div>
              <span className="text-sm font-bold text-emerald-300 animate-pulse">
                Listening...
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-black/60 text-emerald-300 border border-emerald-500/40">
                {formatTimer(listeningDurationSeconds)}
              </span>
            </div>
          ) : state === 'SEARCHING' || state === 'GENERATING' || state === 'TRANSCRIBING' ? (
            <div className="flex flex-col items-center text-center space-y-2.5 px-3">
              <div className="w-11 h-11 rounded-full bg-amber-500/20 border border-amber-400/60 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-amber-300 block">
                  {processingStep === 1
                    ? 'Processing speech...'
                    : processingStep === 2
                    ? 'Verifying bank policies...'
                    : 'Formulating answer...'}
                </span>
                <span className="text-[10px] text-zinc-400">Grounded in verified docs</span>
              </div>
            </div>
          ) : (
            /* SPEAKING state */
            <div className="flex flex-col items-center text-center space-y-1.5">
              <div className="w-11 h-11 rounded-full bg-teal-500/20 border border-teal-400 flex items-center justify-center">
                {isAudioPaused ? (
                  <Play className="w-5 h-5 text-teal-300 translate-x-0.5" />
                ) : (
                  <Volume2 className="w-5 h-5 text-teal-300 animate-pulse" />
                )}
              </div>
              <span className="text-sm font-bold text-teal-300">
                {isAudioPaused ? 'Paused' : 'Playing Audio'}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                {Math.round(audioProgress * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* State-Specific Status Indicators & Controls */}
      <div className="w-full flex flex-col items-center space-y-3 mt-1">
        
        {/* IDLE State Helper text */}
        {(state === 'IDLE' || state === 'COMPLETED') && (
          <div className="text-center space-y-1">
            <p className="text-xs sm:text-sm text-zinc-400">
              Speak in English or Burmese • Auto-processes inquiry on pause • Shortcut: <kbd className="px-1.5 py-0.5 bg-[#282828] border border-white/10 rounded text-[10px] text-zinc-300">Space</kbd>
            </p>
          </div>
        )}

        {/* LISTENING State: Clean Waveform + Auto Processing Note (No raw recognized speech display) */}
        {state === 'LISTENING' && (
          <div className="w-full max-w-md bg-[#282828] border border-emerald-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3 animate-fade-in">
            <WaveformVisualizer isActive={true} intensity={0.9} barCount={28} />

            <div className="text-center py-1">
              <p className="text-xs text-emerald-300 font-medium">
                Listening... Speak naturally
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Automatically submits & answers when you finish speaking
              </p>
            </div>

            {/* Controls under listening */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                id="voice-stop-btn"
                onClick={onStopListening}
                className="px-4 py-2 rounded-xl bg-[#10A37F] hover:bg-[#0e8e6e] text-white font-medium text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Finish Speaking</span>
              </button>

              <button
                id="voice-cancel-btn"
                onClick={onCancelListening}
                className="px-3.5 py-2 rounded-xl bg-[#212121] hover:bg-[#2f2f2f] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition border border-white/[0.08] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>

              <button
                id="voice-switch-kb-btn"
                onClick={onSwitchToKeyboard}
                className="px-3.5 py-2 rounded-xl bg-[#212121] hover:bg-[#2f2f2f] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition border border-white/[0.08] cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Type Instead</span>
              </button>
            </div>
          </div>
        )}

        {/* PROCESSING State */}
        {(state === 'SEARCHING' || state === 'GENERATING' || state === 'TRANSCRIBING') && (
          <div className="w-full max-w-sm bg-[#282828] border border-white/[0.08] rounded-2xl p-3.5 text-center space-y-2 shadow-lg animate-fade-in">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Verifying Bank Policy Knowledge Base</span>
            </div>
            <div className="h-1.5 w-full bg-[#1e1e1e] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#10A37F] via-amber-400 to-emerald-400 rounded-full w-2/3 animate-pulse" />
            </div>
          </div>
        )}

        {/* SPEAKING State Controls */}
        {state === 'SPEAKING' && (
          <div className="flex items-center gap-2 bg-[#282828] border border-white/[0.08] px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md animate-fade-in">
            <button
              id="voice-pause-btn"
              onClick={isAudioPaused ? onResumeSpeaking : onPauseSpeaking}
              className="p-2 rounded-xl bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition border border-teal-500/30 cursor-pointer"
              title={isAudioPaused ? 'Resume' : 'Pause'}
            >
              {isAudioPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              id="voice-replay-btn"
              onClick={onReplaySpeaking}
              className="p-2 rounded-xl bg-[#212121] text-zinc-300 hover:text-white hover:bg-[#303030] transition border border-white/[0.08] cursor-pointer"
              title="Replay Audio"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              id="voice-stop-audio-btn"
              onClick={onStopSpeaking}
              className="p-2 rounded-xl bg-[#212121] text-zinc-300 hover:text-rose-400 hover:bg-[#303030] transition border border-white/[0.08] cursor-pointer"
              title="Stop Audio"
            >
              <VolumeX className="w-4 h-4" />
            </button>

            {/* Speed Toggle Chips */}
            <div className="flex items-center bg-[#1f1f1f] rounded-xl p-1 border border-white/[0.06] text-xs font-mono ml-2">
              {[0.8, 1.0, 1.2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onChangeSpeed(spd)}
                  className={`px-2 py-1 rounded-lg font-medium transition cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
