import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check, X } from 'lucide-react';
import { FeedbackData } from '../types';

interface FeedbackControlsProps {
  onFeedbackSubmit: (feedback: FeedbackData) => void;
  existingFeedback?: FeedbackData;
}

export const FeedbackControls: React.FC<FeedbackControlsProps> = ({
  onFeedbackSubmit,
  existingFeedback
}) => {
  const [helpful, setHelpful] = useState<boolean | null>(
    existingFeedback ? existingFeedback.helpful : null
  );
  const [showNegativeReasons, setShowNegativeReasons] = useState(false);
  const [selectedReason, setSelectedReason] = useState<FeedbackData['reason'] | null>(
    existingFeedback?.reason || null
  );
  const [isSubmitted, setIsSubmitted] = useState(!!existingFeedback);

  const reasonsList = [
    { key: 'incorrect', label: 'Incorrect information' },
    { key: 'hard_to_understand', label: 'Difficult to understand' },
    { key: 'pronunciation', label: 'Audio / Voice issue' },
    { key: 'missing_info', label: 'Missing key information' },
    { key: 'other', label: 'Other reason' }
  ] as const;

  const handleThumbClick = (isHelpful: boolean) => {
    setHelpful(isHelpful);
    if (isHelpful) {
      setShowNegativeReasons(false);
      setIsSubmitted(true);
      onFeedbackSubmit({
        helpful: true,
        submittedAt: new Date().toISOString()
      });
    } else {
      setShowNegativeReasons(true);
    }
  };

  const handleReasonSelect = (reasonKey: FeedbackData['reason']) => {
    setSelectedReason(reasonKey);
    setIsSubmitted(true);
    setShowNegativeReasons(false);
    onFeedbackSubmit({
      helpful: false,
      reason: reasonKey,
      submittedAt: new Date().toISOString()
    });
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-1">
        {/* Thumbs up */}
        <button
          onClick={() => handleThumbClick(true)}
          className={`p-1.5 rounded-lg hover:bg-[#2f2f2f] transition ${
            helpful === true
              ? 'text-emerald-400 bg-zinc-800'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Good response"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>

        {/* Thumbs down */}
        <button
          onClick={() => handleThumbClick(false)}
          className={`p-1.5 rounded-lg hover:bg-[#2f2f2f] transition ${
            helpful === false
              ? 'text-rose-400 bg-zinc-800'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Bad response"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>

        {isSubmitted && (
          <span className="text-[11px] text-zinc-500 pl-1 flex items-center gap-0.5">
            <Check className="w-3 h-3 text-emerald-400" />
            <span>Feedback saved</span>
          </span>
        )}
      </div>

      {/* Negative Feedback Reason Selector Popover */}
      {showNegativeReasons && (
        <div className="absolute right-0 bottom-full mb-2 w-64 p-3 rounded-xl bg-[#282828] border border-zinc-700 shadow-xl space-y-2 z-30 animate-fade-in">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
            <span>Provide feedback</span>
            <button
              onClick={() => setShowNegativeReasons(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {reasonsList.map((r) => (
              <button
                key={r.key}
                onClick={() => handleReasonSelect(r.key)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
