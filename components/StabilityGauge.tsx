import React from 'react';

interface StabilityGaugeProps {
  value: number; // kcal/mol
}

const StabilityGauge: React.FC<StabilityGaugeProps> = ({ value }) => {
  // Normalize value for a -5 to +5 scale (typical range for ddG)
  const normalized = Math.min(Math.max(value, -5), 5);
  const percentage = ((normalized + 5) / 10) * 100;

  let color = 'bg-slate-400';
  if (value < -2) color = 'bg-rose-600'; // Highly Destabilizing
  else if (value < -0.5) color = 'bg-amber-500'; // Destabilizing
  else if (value < 0.5) color = 'bg-blue-400'; // Neutral
  else color = 'bg-emerald-500'; // Stabilizing

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
          style={{ width: `${percentage}%` }}
        >
        </div>
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-400 opacity-50"></div>
      </div>
      <div className="mt-4 flex flex-col items-center">
        <div className="text-3xl font-black text-slate-900 mono">
          {value > 0 ? '+' : ''}{value.toFixed(2)}
          <span className="text-[10px] ml-1 text-slate-400 uppercase tracking-widest font-black">kcal/mol</span>
        </div>
        <p className="mt-1 text-[10px] font-black uppercase text-indigo-600 tracking-widest">&Delta;&Delta;G Prediction</p>
      </div>
    </div>
  );
};

export default StabilityGauge;