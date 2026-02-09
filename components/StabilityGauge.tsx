
import React from 'react';

interface StabilityGaugeProps {
  value: number; // kcal/mol
  confidence?: number; // 0 to 1
  compact?: boolean;
}

const StabilityGauge: React.FC<StabilityGaugeProps> = ({ value, confidence = 0.85, compact = false }) => {
  const numValue = typeof value === 'number' ? value : Number(value);
  const safeValue = isNaN(numValue) ? 0 : numValue;

  // Standard Bioinfo convention: negative ΔΔG = destabilizing (increased folding energy)
  // Our system follows: negative = destabilizing, positive = stabilizing for UI clarity
  const normalized = Math.min(Math.max(safeValue, -5), 5);
  const percentage = ((normalized + 5) / 10) * 100;

  let color = 'bg-slate-400';
  if (safeValue < -1.5) color = 'bg-rose-500'; // Destabilizing
  else if (safeValue < -0.5) color = 'bg-amber-400'; // Marginally Destabilizing
  else if (safeValue < 0.5) color = 'bg-indigo-400'; // Neutral
  else if (safeValue < 2.0) color = 'bg-emerald-400'; // Stabilizing
  else color = 'bg-emerald-600'; // Highly Stabilizing

  if (compact) {
    return (
      <div className="w-full">
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/30">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${color}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/60 shadow-inner">
      <div className="flex justify-between mb-3 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
        <span>Highly Destabilizing (-5)</span>
        <span className="text-slate-900">Neutral (0)</span>
        <span>Highly Stabilizing (+5)</span>
      </div>
      <div className="h-6 w-full bg-slate-200/50 rounded-full overflow-hidden relative shadow-inner border border-slate-300/30">
        <div 
          className={`h-full transition-all duration-1000 ease-out flex items-center justify-end pr-2 shadow-lg relative ${color}`}
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20"></div>
        </div>
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-400 opacity-20"></div>
      </div>
      
      <div className="mt-6 flex flex-col items-center">
        <div className="text-4xl font-black text-slate-900 tracking-tighter mono flex items-baseline gap-2">
          {safeValue > 0 ? '+' : ''}{safeValue.toFixed(2)}
          <span className="text-[12px] text-slate-400 uppercase tracking-widest font-black">kcal/mol</span>
        </div>
        
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Confidence {Math.round(confidence * 100)}%</span>
          </div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {safeValue < 0 ? 'Enthalpy Deficit' : 'Structural Optimization'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StabilityGauge;
