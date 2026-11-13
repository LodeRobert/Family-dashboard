import React from 'react';

interface ColorPickerFieldProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  compact?: boolean;
}

const QUICK_COLORS = [
  '#4285F4',
  '#6366F1',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#14B8A6'
];

export const ColorPickerField: React.FC<ColorPickerFieldProps> = ({
  value,
  onChange,
  label,
  compact = false
}) => {
  const safeHex = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#6366F1';

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Full spectrum native HTML5 color picker */}
        <label
          className="relative inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:border-indigo-400 transition-colors"
          title="Kies elke gewenste kleur uit het volledige kleurenspectrum"
        >
          <input
            type="color"
            value={safeHex}
            onChange={e => onChange(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
          />
          <span className="font-mono text-[11px] uppercase text-slate-700 dark:text-slate-300">
            {safeHex}
          </span>
        </label>

        {!compact && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {QUICK_COLORS.map(preset => (
              <button
                type="button"
                key={preset}
                onClick={() => onChange(preset)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  safeHex.toLowerCase() === preset.toLowerCase()
                    ? 'scale-115 border-slate-900 dark:border-white'
                    : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: preset }}
                title={preset}
                aria-label={`Kies kleur ${preset}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
