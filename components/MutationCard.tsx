
import React from 'react';
import { PredictionResult } from '../types';
import StabilityGauge from './StabilityGauge';

interface MutationCardProps {
  result: PredictionResult;
}

const MutationCard: React.FC<MutationCardProps> = ({ result }) => {
  const getImpactBadge = (impact: string) => {
    const i = impact.toLowerCase();
    if (i.includes('highly destabilizing')) return 'bg-rose-600 text-white border-rose-700';
    if (i.includes('destabilizing')) return 'bg-orange-600 text-white border-orange-700';
    if (i.includes('stabilizing')) return 'bg-emerald-600 text-white border-emerald-700';
    return 'bg-indigo-600 text-white border-indigo-700';
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-100 overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#1e293b] text-white p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">{result.reproducibility.runId}</span>
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border-2 ${result.isValidatedReference ? 'border-indigo-400 text-indigo-400' : 'border-slate-600 text-slate-400'}`}>
                {result.isValidatedReference ? 'REF-MODE' : 'GEN-MODE'}
              </span>
            </div>
            <h3 className="text-2xl font-black text-white">{result.mutation}</h3>
          </div>
          <div className="flex flex-col items-end gap-2">
             <div className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 uppercase shadow-lg ${getImpactBadge(result.stabilityImpact)}`}>
               {result.stabilityImpact}
             </div>
          </div>
        </div>
      </div>

      <div className="p-8 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
        <section className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
           <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 border-b-2 border-indigo-100 pb-1 inline-block">Scientific Rationale</h4>
           <p className="text-[12px] text-black font-bold leading-relaxed mb-4">{result.justification}</p>
           <div className="pt-4 border-t-2 border-slate-200/50">
             <h5 className="text-[9px] font-black text-slate-800 uppercase mb-2">Trade-off Analysis</h5>
             <p className="text-[11px] text-slate-900 font-semibold italic leading-relaxed">{result.tradeOffAnalysis}</p>
           </div>
        </section>

        <section className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] shadow-sm">
          <h4 className="text-[10px] font-black text-rose-800 uppercase tracking-widest mb-3 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation"></i> Risk Assessment
          </h4>
          <p className="text-[12px] text-rose-950 font-bold leading-relaxed">{result.riskBreakdown}</p>
        </section>

        <section className="px-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Thermodynamic Profile</h4>
            <div className="bg-indigo-50 text-indigo-800 border-2 border-indigo-200 px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm">Alignment: {result.goalAlignment}</div>
          </div>
          <StabilityGauge value={result.deltaDeltaG} />
        </section>

        <section className="bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] p-6 shadow-sm">
          <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-4 border-b-2 border-emerald-200 pb-1 inline-block">Structural Analysis</h4>
          <p className="text-[12px] text-emerald-950 font-bold leading-relaxed">{result.structuralAnalysis}</p>
        </section>

        <section className="border-t-2 border-slate-100 pt-6">
           <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4">Executive Conclusion</h4>
           <div className="text-[12px] text-black leading-relaxed font-bold bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 shadow-inner">
             {result.reportSummary}
           </div>
        </section>
      </div>

      <div className="bg-slate-50 p-6 border-t-2 border-slate-100 text-[9px] font-black text-slate-500 italic uppercase tracking-wider text-center">
        <i className="fa-solid fa-shield-halved mr-1 text-indigo-400"></i> {result.disclaimer}
      </div>
    </div>
  );
};

export default MutationCard;
