'use client';

import type { RangeType } from '@gold-monitor/shared';
import { SUPPORTED_RANGES } from '@gold-monitor/shared';

interface RangeSelectorProps {
  selected: RangeType;
  onChange: (range: RangeType) => void;
}

export function RangeSelector({ selected, onChange }: RangeSelectorProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-[#1a1d27] border border-[#2a2d3a] p-1">
      {SUPPORTED_RANGES.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            selected === range
              ? 'bg-[#f5c842] text-[#0f1117]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3a]'
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  );
}
