import React from 'react';
import { PredictionResult, MutationRegime } from '../types';
import StabilityGauge from './StabilityGauge';

interface MutationCardProps {
  result: PredictionResult;
}

const MutationCard: React.FC<MutationCardProps> = ({ result }) => {
  const isReference = result.confidenceMode === 'Validated Reference Mode';

  const getImpactBadge = (impact: string) => {
    const i = (impact || '').toLowerCase();
    if (i.includes('highly destabilizing')) return 'bg-rose-600 text-white border-rose-700 shadow-rose-900/40';
    if (i.includes('destabilizing')) return 'bg-orange-600 text-white border-orange-700 shadow-orange-900/40';
    if (i.includes('stabilizing')) return 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/40';
    return 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-900/40';
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-emerald-400';
    if (conf >= 0.6) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-10">
      {/* COMMAND DASHBOARD */}
      <div className={`bg-[#0f172a] text-white rounded-[3rem] shadow-2xl border-b-[8px] overflow-hidden ${isReference ? 'border-indigo-600/50' : 'border-amber-600/50'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch divide-x divide-white/10">
          <div className="lg:col-span-3 p-10 flex flex-col justify-center bg-slate-900/80">
            <div className="flex flex-col mb-3">
              <span className="text-[12px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-1">{result.reproducibility?.runId || 'N/A'}</span>
              <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${isReference ? 'text-emerald-400' : 'text-amber-400'}`}>
                <i className={`fa-solid ${isReference ? 'fa-certificate' : 'fa-brain'}`}></i>
                {result.confidenceMode || 'Analysis Active'}
              </div>
            </div>
            <h3 className="text-8xl font-black tracking-tighter text-white leading-none">{result.mutation}</h3>
          </div>

          <div className="lg:col-span-7 grid grid-cols-3 divide-x divide-white/10 px-10 py-10 gap-8">
            <div className="flex flex-col justify-center px-6">
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">&Delta;&Delta;G Impact</span>
              <div className={`px-6 py-3 rounded-2xl text-[16px] font-black uppercase border text-center ${getImpactBadge(result.stabilityImpact)}`}>
                {result.stabilityImpact || 'Neutral'}
              </div>
            </div>
            
            <div className="flex flex-col justify-center px-6 text-center">
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Empirical Context</span>
              <div className="flex items-center justify-center gap-2 mb-1">
                <i className={`fa-solid ${result.empiricalShift ? 'fa-dna' : 'fa-chart-line'} text-indigo-400`}></i>
                <span className="text-[14px] font-black uppercase tracking-tight text-white">
                  {result.empiricalShift ? `Adjusted by Lab` : `Structure-Only`}
                </span>
              </div>
              <span className="text-[8px] font-black opacity-30 uppercase tracking-[0.2em]">Prior Outcomes Applied</span>
            </div>

            <div className="flex flex-col justify-center px-6 text-center">
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Signal Status</span>
              <span className={`text-xl font-black uppercase tracking-tight ${result.signalConsistency === 'Conflicting Signals' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {result.signalConsistency || 'Nominal'}
              </span>
            </div>
          </div>

          <div className="lg:col-span-2 p-10 flex flex-col justify-center bg-slate-900/80 items-end text-right">
            <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Confidence</span>
            <span className={`text-5xl font-black uppercase tracking-tighter ${getConfidenceColor(result.confidence || 0)}`}>
              {Math.round((result.confidence || 0) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {result.empiricalShift && result.empiricalShift.direction !== 'Neutral' && (
        <div className="bg-indigo-50 border-2 border-indigo-200 p-6 rounded-[2.5rem] flex items-center gap-8 animate-in slide-in-from-left-4">
           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${result.empiricalShift.direction === 'Up' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
             <i className={`fa-solid ${result.empiricalShift.direction === 'Up' ? 'fa-circle-arrow-up' : 'fa-circle-arrow-down'}`}></i>
           </div>
           <div>
             <h4 className="text-[12px] font-black text-indigo-900 uppercase tracking-widest mb-1">Inference Shifted by Empirical Lab Results</h4>
             <p className="text-[11px] font-bold text-indigo-800 italic leading-relaxed">"{result.empiricalShift.reason}"</p>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-4 space-y-6">
           <section className="bg-white border-2 border-slate-100 p-8 rounded-[3rem] shadow-sm">
              <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                <i className="fa-solid fa-anchor"></i> Key Signals Found
              </h4>
              <div className="space-y-3">
                {result.patternAnchors?.map((p, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[11px] font-bold text-slate-800 italic">"{p}"</div>
                ))}
              </div>
           </section>

           <section className="bg-slate-900 border-2 border-slate-800 p-8 rounded-[3rem] shadow-xl">
              <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                <i className="fa-solid fa-list-check text-indigo-400"></i> Assumptions
              </h4>
              <ul className="space-y-2">
                {result.assumptions?.map((a, i) => (
                  <li key={i} className="flex gap-3 text-[11px] text-white/60 font-bold leading-tight">
                    <span className="text-indigo-400 text-[8px] mt-1">●</span>{a}
                  </li>
                ))}
              </ul>
           </section>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <section className="bg-white border-2 border-slate-100 p-10 rounded-[3.5rem] shadow-sm">
              <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                <i className="fa-solid fa-dna text-xl"></i> Structural Rationale
              </h4>
              <p className="text-[16px] text-slate-900 font-bold leading-relaxed mb-10 italic">
                {result.reportSummary || result.structuralAnalysis || 'Analyzing...'}
              </p>
              <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-slate-50">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-2">Stability Gauge</span>
                  <StabilityGauge value={result.deltaDeltaG || 0} compact />
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center flex flex-col justify-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-2">Goal Alignment</span>
                  <span className="text-2xl font-black text-indigo-600 uppercase tracking-tight">{result.goalAlignment || 'High'}</span>
                </div>
              </div>
          </section>

          <section className="bg-slate-50 border-2 border-slate-200 p-8 rounded-[3.5rem] shadow-inner">
             <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-3 px-2">
               <i className="fa-solid fa-database"></i> Benchmark Consensus Evidence
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {result.benchmarkAlignments?.map((b, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                     <div className="flex justify-between items-center mb-3">
                       <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{b.dataset}</span>
                       <span className="text-[14px] font-black text-slate-900 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                         {Math.round(b.alignmentScore || 0)}%
                       </span>
                     </div>
                     <p className="text-[10px] font-bold text-slate-600 leading-tight italic">"{b.keyInsight || 'Aligned.'}"</p>
                  </div>
                ))}
             </div>
          </section>
        </div>
      </div>

      <div className="p-8 bg-slate-950 rounded-[3rem] text-center border border-white/10 no-print">
        <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">
          Atomic-level inference grounded in lab-feedback priors and global benchmark data.
        </p>
      </div>
    </div>
  );
};

export default MutationCard;