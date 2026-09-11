import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, Sparkles } from 'lucide-react';
import { audioSynthesizer } from '../utils/audioSynthesizer';

interface AudioPlayerProps {
  textToSpeak: string;
  autoPlay?: boolean;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  textToSpeak,
  autoPlay = false,
  speed = 1.0,
  onSpeedChange,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(speed);

  useEffect(() => {
    setPlaybackSpeed(speed);
  }, [speed]);

  useEffect(() => {
    const unsubscribe = audioSynthesizer.subscribe((prog, playing) => {
      setProgress(prog);
      setIsPlaying(playing);
    });

    if (autoPlay) {
      handlePlay();
    }

    return () => {
      unsubscribe();
    };
  }, [textToSpeak]);

  const handlePlay = () => {
    audioSynthesizer.speak(textToSpeak, {
      speed: playbackSpeed,
      personality: 'friendly',
      onEnd: () => {
        setIsPlaying(false);
        setProgress(1);
      }
    });
  };

  const handleToggle = () => {
    if (isPlaying) {
      audioSynthesizer.pause();
    } else {
      if (progress >= 0.99) {
        handlePlay();
      } else {
        audioSynthesizer.resume();
      }
    }
  };

  const handleReplay = () => {
    audioSynthesizer.stop();
    handlePlay();
  };

  const handleSpeedToggle = () => {
    const nextSpeed = playbackSpeed === 1.0 ? 1.2 : playbackSpeed === 1.2 ? 0.8 : 1.0;
    setPlaybackSpeed(nextSpeed);
    onSpeedChange?.(nextSpeed);
  };

  const formatDuration = (fraction: number) => {
    const totalSecs = Math.max(3, Math.min(30, Math.round(textToSpeak.length / 15)));
    const currentSecs = Math.round(fraction * totalSecs);
    return `${Math.floor(currentSecs / 60)}:${(currentSecs % 60).toString().padStart(2, '0')} / ${Math.floor(totalSecs / 60)}:${(totalSecs % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-slate-950/70 border border-emerald-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${className}`}>
      {/* Left: Play/Pause and Replay */}
      <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
        <button
          onClick={handleToggle}
          className="p-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 transition flex items-center justify-center cursor-pointer shadow-sm"
          title={isPlaying ? 'Pause Voice' : 'Play Voice'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current translate-x-0.5" />
          )}
        </button>

        <button
          onClick={handleReplay}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition"
          title="Replay Audio"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 text-slate-300 ml-1">
          <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
          <span className="font-mono text-[11px] text-slate-400">
            {formatDuration(progress)}
          </span>
        </div>
      </div>

      {/* Center Progress Bar */}
      <div className="w-full flex-1 px-1">
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative cursor-pointer">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-100"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      </div>

      {/* Right: Speed selector */}
      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={handleSpeedToggle}
          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-[11px] transition"
          title="Adjust Playback Speed"
        >
          {playbackSpeed}x
        </button>

        <span className="text-[10px] text-emerald-400/90 font-medium px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Voice TTS
        </span>
      </div>
    </div>
  );
};
