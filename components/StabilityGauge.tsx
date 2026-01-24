
import React from 'react';

interface StabilityGaugeProps {
  value: number; // kcal/mol
}

const StabilityGauge: React.FC<StabilityGaugeProps> = ({ value }) => {
  // Normalize value for a -5 to +5 scale
  const normalized = Math.min(Math.max(value, -5), 5);
  const percentage = ((normalized + 5) / 10) * 100;

  let color = 'bg-gray-400';
  if (value < -2) color = 'bg-red-600';
  else if (value < -0.5) color = 'bg-orange-400';
  else if (value < 0.5) color = 'bg-blue-400';
  else color = 'bg-emerald-500';

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
        <span>Destabilizing (-5)</span>
        <span>Neutral (0)</span>
        <span>Stabilizing (+5)</span>
      </div>
      <div className="h-6 w-full bg-slate-200 rounded-full overflow-hidden relative shadow-inner">
        <div 
          className={`h-full transition-all duration-700 ease-out flex items-center justify-end pr-2 ${color}`}
          style={{ width: `${percentage}%` }}
        >
          <span className="text-white text-[10px] font-bold">{value.toFixed(2)}</span>
        </div>
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-400 opacity-50"></div>
      </div>
      <p className="mt-2 text-sm text-center font-semibold text-slate-700">
        &Delta;&Delta;G: {value.toFixed(2)} kcal/mol
      </p>
    </div>
  );
};

export default StabilityGauge;
