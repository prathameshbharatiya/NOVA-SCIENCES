import React from 'react';

interface StabilityGaugeProps {
  value: number; // kcal/mol
  compact?: boolean;
}

const StabilityGauge: React.FC<StabilityGaugeProps> = ({ value, compact = false }) => {
  // Ensure value is a number to prevent .toFixed crashes
  const numValue = typeof value === 'number' ? value : Number(value);
  const safeValue = isNaN(numValue) ? 0 : numValue;

  // Normalize value for a -5 to +5 scale (typical range for ddG)
  const normalized = Math.min(Math.max(safeValue, -5), 5);
  const percentage = ((normalized + 5) / 10) * 100;

  let color = 'bg-slate-400';
  if (safeValue < -2) color = 'bg-rose-500'; // Highly Destabilizing
  else if (safeValue < -0.5) color = 'bg-orange-500'; // Destabilizing
  else if (safeValue < 0.5) color = 'bg-indigo-400'; // Neutral
  else color = 'bg-emerald-500'; // Stabilizing

  if (compact) {
    return (
      <div className="w-full">
        <div className="flex flex-col items-center mb-2">
          <div className="text-xl font-black text-slate-900 mono">
            {safeValue > 0 ? '+' : ''}{safeValue.toFixed(2)}
            <span className="text-[8px] ml-1 text-slate-400 uppercase tracking-widest font-black">kcal</span>
          </div>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/50">
          <div 
            className={`h-full transition-all duration-1000 ease-out flex items-center justify-end pr-2 shadow-sm ${color}`}
            style={{ width: `${isNaN(percentage) ? 50 : percentage}%` }}
          >
          </div>
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300"></div>
        </div>
        <div className="flex justify-between mt-1 text-[6px] font-black text-slate-400 uppercase tracking-tighter">
          <span>DESTAB</span>
          <span>NEUTRAL</span>
          <span>STAB</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-inner">
      <div className="flex justify-between mb-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
        <span>Highly Destabilizing (-5)</span>
        <span className="text-slate-900">Neutral (0)</span>
        <span>Highly Stabilizing (+5)</span>
      </div>
      <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden relative shadow-inner">
        <div 
          className={`h-full transition-all duration-1000 ease-out flex items-center justify-end pr-2 shadow-lg ${color}`}
          style={{ width: `${isNaN(percentage) ? 50 : percentage}%` }}
        >
        </div>
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-400 opacity-50"></div>
      </div>
      <div className="mt-4 flex flex-col items-center">
        <div className="text-3xl font-black text-slate-900 mono">
          {safeValue > 0 ? '+' : ''}{safeValue.toFixed(2)}
          <span className="text-[10px] ml-1 text-slate-400 uppercase tracking-widest font-black">kcal/mol</span>
        </div>
        <p className="mt-1 text-[10px] font-black uppercase text-indigo-600 tracking-widest">&Delta;&Delta;G Prediction</p>
      </div>
    </div>
  );
};

export default StabilityGauge;