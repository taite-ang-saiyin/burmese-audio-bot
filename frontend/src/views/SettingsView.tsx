import React, { useState } from 'react';
import { 
  Settings2, 
  Volume2, 
  Languages, 
  Type, 
  Headphones, 
  Check, 
  ShieldCheck 
} from 'lucide-react';
import { VoiceSettings } from '../types';
import { audioSynthesizer } from '../utils/audioSynthesizer';

interface SettingsViewProps {
  settings: VoiceSettings;
  onUpdateSettings: (settings: VoiceSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [testPlaying, setTestPlaying] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleTestVoice = () => {
    setTestPlaying(true);
    const testPhrase =
      settings.personality === 'friendly'
        ? 'Hello! Welcome to the AI Banking Copilot. How may I assist you today?'
        : settings.personality === 'calm'
        ? 'Welcome. You can ask any banking question with complete confidence.'
        : 'Good day. I am ready to provide verified banking policy information and assistance.';

    audioSynthesizer.speak(testPhrase, {
      speed: settings.speed,
      personality: settings.personality,
      onEnd: () => setTestPlaying(false)
    });
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-slate-100 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 space-y-1">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Settings2 className="w-4 h-4" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            System & Voice Preferences
          </h1>
        </div>
        <p className="text-xs text-slate-400">
          Configure speech synthesis, audio playback speed, and accessibility options
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Voice Personality & Audio Settings */}
        <div className="p-5 rounded-2xl bg-[#0D182A] border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-emerald-300 border-b border-slate-800 pb-2">
            <Volume2 className="w-4 h-4" />
            <span>Voice & Audio Settings</span>
          </div>

          {/* Personality */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Assistant Tone & Persona
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'friendly', label: 'Friendly', desc: 'Warm & helpful' },
                { key: 'calm', label: 'Calm', desc: 'Relaxed & clear' },
                { key: 'professional', label: 'Professional', desc: 'Formal banking' }
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      personality: p.key as VoiceSettings['personality']
                    })
                  }
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-0.5 ${
                    settings.personality === p.key
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs">{p.label}</span>
                  <span className="text-[10px] opacity-70">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Speed */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Speech Speed
            </label>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              {[0.8, 1.0, 1.2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onUpdateSettings({ ...settings, speed: spd })}
                  className={`py-2 rounded-xl border text-center transition ${
                    settings.speed === spd
                      ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-bold'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x {spd === 0.8 ? '(Slower)' : spd === 1.0 ? '(Normal)' : '(Faster)'}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Speak */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200 block">
                Auto-Read Responses
              </span>
              <span className="text-[11px] text-slate-400">
                Play speech audio automatically when answers arrive
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoSpeak}
              onChange={(e) =>
                onUpdateSettings({ ...settings, autoSpeak: e.target.checked })
              }
              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700"
            />
          </div>

          {/* Test Voice Button */}
          <button
            onClick={handleTestVoice}
            disabled={testPlaying}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Headphones className={`w-4 h-4 ${testPlaying ? 'animate-bounce' : ''}`} />
            <span>{testPlaying ? 'Playing sample audio...' : 'Test Voice Synthesis'}</span>
          </button>
        </div>

        {/* 2. Language & Dialect + Accessibility */}
        <div className="p-5 rounded-2xl bg-[#0D182A] border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-emerald-300 border-b border-slate-800 pb-2">
            <Languages className="w-4 h-4" />
            <span>Language & Region Options</span>
          </div>

          {/* Dialect Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Pronunciation Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'standard', label: 'Standard', desc: 'General English & Burmese' },
                { key: 'yangon', label: 'Urban', desc: 'Commercial banking' },
                { key: 'mandalay', label: 'Regional', desc: 'Regional banking' }
              ].map((d) => (
                <button
                  key={d.key}
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      dialect: d.key as VoiceSettings['dialect']
                    })
                  }
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-0.5 ${
                    settings.dialect === d.key
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs">{d.label}</span>
                  <span className="text-[10px] opacity-70">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Accessibility Settings */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
              <Type className="w-4 h-4 text-emerald-400" />
              <span>Accessibility & Shortcuts</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
                <span>Large Text Size</span>
                <input
                  type="checkbox"
                  checked={settings.largeFont}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, largeFont: e.target.checked })
                  }
                  className="rounded text-emerald-500 bg-slate-800 border-slate-700"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
                <span>Hold Spacebar to Speak</span>
                <input
                  type="checkbox"
                  checked={settings.showKeyboardHints}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      showKeyboardHints: e.target.checked
                    })
                  }
                  className="rounded text-emerald-500 bg-slate-800 border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Banking Security Protocol */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/20 text-xs space-y-1 mt-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sensitive Data Shield Active</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Sensitive numbers like OTPs, card digits, and passwords are automatically masked on-device.
            </p>
          </div>
        </div>
      </div>

      {/* Save Notification */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950/80 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>{saveSuccess ? 'Preferences Saved' : 'Save Preferences'}</span>
        </button>
      </div>
    </div>
  );
};
