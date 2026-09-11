import React, { useEffect, useState } from 'react';

interface WaveformVisualizerProps {
  isActive: boolean;
  intensity?: number;
  barCount?: number;
  className?: string;
  color?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isActive,
  intensity = 0.6,
  barCount = 28,
  className = '',
  color = 'from-emerald-400 to-teal-200'
}) => {
  const [heights, setHeights] = useState<number[]>([]);

  useEffect(() => {
    // Generate initial heights
    const initial = Array.from({ length: barCount }, () => 15 + Math.random() * 20);
    setHeights(initial);

    if (!isActive) return;

    const interval = setInterval(() => {
      setHeights(prev =>
        prev.map((_, i) => {
          const centerBias = 1 - Math.abs(i - barCount / 2) / (barCount / 2);
          const dynamic = Math.sin(Date.now() / 150 + i * 0.4) * 30 + Math.random() * 40;
          return Math.max(12, Math.min(95, dynamic * centerBias * (0.4 + intensity * 0.8)));
        })
      );
    }, 80);

    return () => clearInterval(interval);
  }, [isActive, intensity, barCount]);

  return (
    <div className={`flex items-center justify-center gap-[3px] h-14 px-4 ${className}`}>
      {heights.map((h, idx) => (
        <div
          key={idx}
          className={`w-1 rounded-full transition-all duration-100 bg-gradient-to-t ${color} ${
            isActive ? 'opacity-90' : 'opacity-30'
          }`}
          style={{
            height: isActive ? `${h}%` : '8px',
            transformOrigin: 'bottom'
          }}
        />
      ))}
    </div>
  );
};
