import React from 'react';
import { X, Volume2, Gauge, Sparkles, Sliders, Type, Check } from 'lucide-react';
import { VoiceSettings } from '../types';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: VoiceSettings) => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-[#282828] border border-white/[0.12] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-zinc-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#10A37F] text-white flex items-center justify-center shadow-md">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Voice & Assistant Settings
              </h3>
              <p className="text-xs text-zinc-400">
                Customize speech and interaction preferences
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Voice Personality Style */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Voice Tone Personality</span>
          </label>

          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'friendly', label: 'Friendly', desc: 'Warm & helpful' },
              { key: 'calm', label: 'Calm', desc: 'Gentle & clear' },
              { key: 'formal', label: 'Executive', desc: 'Precise & direct' }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() =>
                  onUpdateSettings({ ...settings, personality: item.key as any })
                }
                className={`p-3 rounded-xl border text-left transition ${
                  settings.personality === item.key
                    ? 'bg-white text-black font-semibold border-white shadow-sm'
                    : 'bg-[#212121] text-zinc-300 hover:bg-[#303030] border-white/[0.08]'
                }`}
              >
                <div className="text-xs">{item.label}</div>
                <div className={`text-[10px] mt-0.5 ${settings.personality === item.key ? 'text-zinc-700' : 'text-zinc-500'}`}>
                  {item.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Speech Playback Speed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>Voice Playback Speed</span>
            </label>
            <span className="font-mono text-emerald-400 font-bold">
              {settings.speed.toFixed(1)}x
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[0.8, 1.0, 1.2, 1.5].map((spd) => (
              <button
                key={spd}
                onClick={() => onUpdateSettings({ ...settings, speed: spd })}
                className={`py-2 rounded-xl text-xs font-mono transition ${
                  settings.speed === spd
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'bg-[#212121] text-zinc-300 hover:bg-[#303030] border border-white/[0.08]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* 3. Accessibility & Auto-Speak Toggles */}
        <div className="space-y-2 pt-2 border-t border-white/[0.08]">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Behavior Preferences</span>
          </label>

          {/* Auto Speak Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#212121] border border-white/[0.08]">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-zinc-200">
                Auto-read AI responses
              </span>
              <p className="text-[10px] text-zinc-400">
                Play synthesized voice audio immediately after response
              </p>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({ ...settings, autoSpeak: !settings.autoSpeak })
              }
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.autoSpeak ? 'bg-[#10A37F]' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.autoSpeak ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Large Font Size Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#212121] border border-white/[0.08]">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-zinc-200">
                Large Font Display
              </span>
              <p className="text-[10px] text-zinc-400">
                Enhance text size for high contrast readability
              </p>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({ ...settings, largeFont: !settings.largeFont })
              }
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.largeFont ? 'bg-[#10A37F]' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.largeFont ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-xs transition shadow-sm"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
};
