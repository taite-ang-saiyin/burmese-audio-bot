import React, { useState, useEffect } from 'react';
import { Send, Edit3, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import { scanSensitiveData } from '../utils/securityFilter';

interface LiveTranscriptProps {
  initialText: string;
  onConfirmSubmit: (editedText: string) => void;
  onReRecord: () => void;
  onCancel: () => void;
}

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({
  initialText,
  onConfirmSubmit,
  onReRecord,
  onCancel
}) => {
  const [text, setText] = useState(initialText);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const securityCheck = scanSensitiveData(text);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    onConfirmSubmit(text.trim());
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-[#0E1B31] border border-emerald-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-xl animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-300">
              Recognized Speech
            </h3>
            <p className="text-[11px] text-slate-400">
              Review or edit your inquiry before submitting
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-slate-400 hover:text-emerald-300 transition flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700"
        >
          <Edit3 className="w-3 h-3" />
          <span>{isEditing ? 'Done' : 'Edit'}</span>
        </button>
      </div>

      {/* Editable or Display Textarea */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            id="transcript-edit-area"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3.5 text-slate-100 placeholder-slate-500 text-sm sm:text-base resize-none outline-none leading-relaxed transition"
            placeholder="Edit your speech inquiry here..."
          />
        </div>

        {/* Sensitive data warning if detected */}
        {securityCheck.hasSensitiveData && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">{securityCheck.warningEn || 'Confidential Data Notice'}</p>
              <p className="text-[11px] text-amber-300/80">Never share OTPs, passwords, or PINs. Sensitive tokens have been masked.</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1 gap-2">
          <button
            type="button"
            id="transcript-rerecord-btn"
            onClick={onReRecord}
            className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Re-record</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs font-medium transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              id="transcript-submit-btn"
              disabled={!text.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/80 transition cursor-pointer"
            >
              <span>Submit Inquiry</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
