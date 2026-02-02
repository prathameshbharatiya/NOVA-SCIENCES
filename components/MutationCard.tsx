import React from 'react';
import { PredictionResult } from '../types';
import StabilityGauge from './StabilityGauge';

interface MutationCardProps {
  result: PredictionResult;
}

const MutationCard: React.FC<MutationCardProps> = ({ result }) => {
  const getImpactBadge = (impact: string) => {
    const i = impact.toLowerCase();
    if (i.includes('highly destabilizing')) return 'bg-rose-600 text-white border-rose-700 shadow-rose-900/40';
    if (i.includes('destabilizing')) return 'bg-orange-600 text-white border-orange-700 shadow-orange-900/40';
    if (i.includes('stabilizing')) return 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/40';
    return 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-900/40';
  };

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'High': return 'text-emerald-400';
      case 'Medium': return 'text-amber-400';
      case 'Low': return 'text-rose-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full">
      {/* FULL-WIDTH COMMAND DASHBOARD STRIP */}
      <div className="bg-[#0f172a] text-white rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(15,23,42,0.5)] border-b-[8px] border-indigo-600/50 overflow-hidden animate-pulse-once">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch divide-x divide-white/10">
          
          {/* Identity: Extra Wide */}
          <div className="lg:col-span-3 p-10 flex flex-col justify-center bg-slate-900/80">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex flex-col">
                <span className="text-[12px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-1">{result.reproducibility.runId}</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg border border-white/10 w-fit ${result.isValidatedReference ? 'text-indigo-300 bg-indigo-500/20' : 'text-slate-500 bg-slate-800'}`}>
                  {result.isValidatedReference ? 'REFERENCE-VALIDATED' : 'GENERATIVE-MODEL'}
                </span>
              </div>
            </div>
            <h3 className="text-8xl font-black tracking-tighter text-white leading-none drop-shadow-2xl">{result.mutation}</h3>
          </div>

          {/* Core Metrics: Spread out across the screen */}
          <div className="lg:col-span-7 grid grid-cols-3 divide-x divide-white/10 px-10 py-10 gap-8">
            <div className="flex flex-col justify-center px-6">
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Thermodynamic impact</span>
              <div className={`px-6 py-3 rounded-2xl text-[16px] font-black uppercase border text-center shadow-2xl transition-all hover:scale-105 ${getImpactBadge(result.stabilityImpact)}`}>
                {result.stabilityImpact}
              </div>
            </div>
            
            <div className="flex flex-col justify-center px-6 text-center">
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Site Sensitivity</span>
              <span className={`text-5xl font-black uppercase tracking-tighter ${getConfidenceColor(result.functionalRegionSensitivity)}`}>
                {result.functionalRegionSensitivity}
              </span>
              <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-2">Functional Region</span>
            </div>

            <div className="flex flex-col justify-center px-6 text-center">
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Goal Alignment</span>
              <span className="text-5xl font-black uppercase tracking-tighter text-indigo-400">
                {result.goalAlignment}
              </span>
              <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-2">Strategic Fit</span>
            </div>
          </div>

          {/* Confidence: Large Summary */}
          <div className="lg:col-span-2 p-10 flex flex-col justify-center bg-slate-900/80 items-end text-right">
            <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Synthesis Trust</span>
            <span className={`text-5xl font-black uppercase tracking-tighter ${getConfidenceColor(result.confidenceBreakdown.overallConfidence)}`}>
              {result.confidenceBreakdown.overallConfidence}
            </span>
            <span className="text-[10px] font-black text-indigo-500/50 uppercase tracking-[0.2em] mt-3">NOVA ENGINE 0.2.5v</span>
          </div>

        </div>
      </div>

      {/* DETAILED REASONING GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="bg-white border-2 border-slate-100 p-10 rounded-[3.5rem] shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
              <i className="fa-solid fa-microchip text-xl"></i> Structural Rationale Synthesis
            </h4>
            <p className="text-[16px] text-slate-900 font-bold leading-relaxed mb-10 italic">
              {result.justification}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 pt-8 border-t-4 border-slate-50">
             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
               <span className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Comparative Context</span>
               <p className="text-[12px] text-slate-900 font-bold leading-snug">{result.comparativeContext}</p>
             </div>
             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
               <span className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Trade-off Log</span>
               <p className="text-[12px] text-slate-900 font-bold leading-snug">{result.tradeOffAnalysis}</p>
             </div>
          </div>
        </section>

        <div className="space-y-10 flex flex-col">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 flex-1">
             <div className="bg-white border-2 border-slate-100 p-8 rounded-[3rem] shadow-sm">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Thermodynamics</h4>
                <StabilityGauge value={result.deltaDeltaG} compact />
             </div>
             <div className="bg-white border-2 border-slate-100 p-8 rounded-[3rem] shadow-sm">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Certainty Matrix</h4>
                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                   {[
                     { l: 'Structure', v: result.confidenceBreakdown.structuralConfidence },
                     { l: 'Disorder', v: result.confidenceBreakdown.disorderRisk },
                     { l: 'Function', v: result.confidenceBreakdown.functionalSensitivity },
                     { l: 'Experimental', v: result.confidenceBreakdown.experimentalEvidence }
                   ].map((item, idx) => (
                     <div key={idx} className="flex flex-col">
                       <span className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-tighter">{item.l}</span>
                       <span className="text-[14px] font-black uppercase text-indigo-700">
                         {item.v}
                       </span>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          <section className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl border-b-[12px] border-indigo-600/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <i className="fa-solid fa-quote-right text-8xl"></i>
            </div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-indigo-400">Scientist Summary Brief</h4>
              <span className="text-[9px] font-black opacity-30 mono">NOVA-CORE-V0.2.5</span>
            </div>
            <p className="text-[18px] font-bold leading-tight italic text-white/95">
              "{result.reportSummary}"
            </p>
          </section>
        </div>
      </div>
      
      {/* Risk & Structural Insights Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-rose-50 border-2 border-rose-100 p-8 rounded-[3rem] flex items-start gap-6 shadow-sm">
           <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center text-white text-3xl shrink-0 shadow-lg">
             <i className="fa-solid fa-triangle-exclamation"></i>
           </div>
           <div>
              <h5 className="text-[12px] font-black text-rose-800 uppercase tracking-[0.3em] mb-2">Failure Mode Analysis</h5>
              <p className="text-[14px] text-rose-950 font-bold leading-relaxed">{result.riskBreakdown}</p>
           </div>
        </div>
        <div className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-[3rem] flex items-start gap-6 shadow-sm">
           <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-white text-3xl shrink-0 shadow-lg">
             <i className="fa-solid fa-microscope"></i>
           </div>
           <div>
              <h5 className="text-[12px] font-black text-emerald-800 uppercase tracking-[0.3em] mb-2">Atomic Coordination Analysis</h5>
              <p className="text-[14px] text-emerald-950 font-bold leading-relaxed">{result.structuralAnalysis}</p>
           </div>
        </div>
      </div>

      <div className="p-8 bg-slate-950 rounded-[3rem] border border-white/10 text-center shadow-inner mt-4">
        <p className="text-[12px] font-black text-rose-400 uppercase tracking-[0.25em] leading-relaxed max-w-4xl mx-auto">
          <i className="fa-solid fa-shield-halved mr-3 text-lg"></i> 
          This visualization illustrates an idealized local side-chain substitution. 
          It demonstrates steric and chemical delta, NOT a predicted global mutant fold. 
          Laboratory synthesis is the only definitive validation path.
        </p>
      </div>
    </div>
  );
};

export default MutationCard;