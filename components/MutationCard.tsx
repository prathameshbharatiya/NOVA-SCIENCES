
import React from 'react';
import { PredictionResult } from '../types';
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-10 print-card">
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
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Env Leverage</span>
              <div className="flex items-center justify-center gap-2 mb-1">
                <i className={`fa-solid fa-temperature-empty text-indigo-400`}></i>
                <span className="text-[14px] font-black uppercase tracking-tight text-white">
                  {Math.round((result.environmentalAnalysis?.leverageFactor || 0) * 100)}%
                </span>
              </div>
              <span className="text-[8px] font-black opacity-30 uppercase tracking-[0.2em]">Decision Sensitivity</span>
            </div>

            <div className="flex flex-col justify-center px-6 text-center">
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Signal Status</span>
              <span className={`text-xl font-black uppercase tracking-tight ${result.signalConsistency?.includes('Conflict') ? 'text-rose-400' : 'text-emerald-400'}`}>
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

      {/* EVIDENCE GROUNDING (PAPERS) */}
      <section className="bg-white border-2 border-slate-100 p-8 rounded-[3.5rem] shadow-lg">
        <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
          <i className="fa-solid fa-book-open text-indigo-600"></i> Evidence Grounding & Literature Alignment
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-4">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Supporting Scientific Papers</span>
             {result.scientificPapers && result.scientificPapers.length > 0 ? (
               result.scientificPapers.map((paper, idx) => (
                 <a key={idx} href={paper.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-50 border border-slate-200 p-5 rounded-3xl hover:border-indigo-500 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-2">
                       <h5 className="text-[13px] font-black text-slate-900 group-hover:text-indigo-600 leading-tight">{paper.title}</h5>
                       <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-300"></i>
                    </div>
                    <div className="flex gap-3 text-[10px] font-black text-indigo-500 uppercase tracking-tighter mb-2">
                       <span>{paper.journal}</span>
                       <span className="text-slate-400">{paper.year}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 italic font-bold leading-relaxed">"{paper.relevance}"</p>
                 </a>
               ))
             ) : (
               <p className="text-slate-400 text-xs italic">No specific literature matches found for this substitution.</p>
             )}
           </div>
           <div className="space-y-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Benchmark Correlation</span>
              {result.benchmarkAlignments?.map((b, idx) => (
                <div key={idx} className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-3xl">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-indigo-600 uppercase">{b.dataset}</span>
                      <span className="text-[11px] font-black text-slate-900">{Math.round(b.alignmentScore * 100)}% Match</span>
                   </div>
                   <div className="h-1.5 w-full bg-white rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-indigo-500" style={{ width: `${b.alignmentScore * 100}%` }}></div>
                   </div>
                   <p className="text-[11px] text-slate-700 font-bold leading-relaxed italic">"{b.keyInsight}"</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* ENVIRONMENTAL ANALYSIS */}
      <section className="bg-white border-2 border-indigo-100 p-8 rounded-[3.5rem] shadow-lg relative overflow-hidden">
        <div className="relative flex flex-col md:flex-row gap-10 items-center">
          <div className="shrink-0 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full border-[6px] border-indigo-100 flex items-center justify-center text-3xl font-black text-indigo-600">
               {result.environmentalAnalysis?.leverageFactor > 0.5 ? 'H' : 'M'}
            </div>
            <span className="text-[10px] font-black text-indigo-400 uppercase mt-4 tracking-widest">Sensitivity</span>
          </div>
          <div className="flex-1">
            <h4 className="text-[12px] font-black text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <i className="fa-solid fa-flask text-indigo-500"></i> Environmental Impact Analysis
            </h4>
            <p className="text-[15px] font-bold text-slate-800 leading-relaxed italic mb-6">
              "{result.environmentalAnalysis?.reasoning}"
            </p>
            <div className="grid grid-cols-2 gap-8 border-t border-slate-100 pt-6">
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ΔΔG ENV Shift</span>
                  <span className={`text-lg font-black ${result.environmentalAnalysis?.shiftAmount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {result.environmentalAnalysis?.shiftAmount > 0 ? '+' : ''}{result.environmentalAnalysis?.shiftAmount.toFixed(2)} kcal/mol
                  </span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assay Condition Shift</span>
                  <span className="text-lg font-black text-slate-900 uppercase">{result.environmentalAnalysis?.sensitivity || 'Normal'}</span>
               </div>
            </div>
          </div>
        </div>
      </section>

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
                <i className="fa-solid fa-microchip text-indigo-400"></i> Reproducibility Metadata
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[9px] font-black text-white/30 uppercase">ID</span>
                  <span className="text-[10px] text-white font-mono">{result.reproducibility?.runId}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[9px] font-black text-white/30 uppercase">Model</span>
                  <span className="text-[10px] text-white font-mono">{result.reproducibility?.modelName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[9px] font-black text-white/30 uppercase">Docker</span>
                  <span className="text-[10px] text-white font-mono">{result.reproducibility?.dockerImageHash}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-white/30 uppercase">Structure</span>
                  <span className="text-[10px] text-white font-mono">{result.reproducibility?.structureSource}</span>
                </div>
              </div>
           </section>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <section className="bg-white border-2 border-slate-100 p-10 rounded-[3.5rem] shadow-sm">
              <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                <i className="fa-solid fa-dna text-xl"></i> Synthesis Rationale
              </h4>
              <p className="text-[16px] text-slate-900 font-bold leading-relaxed mb-10 italic">
                {result.reportSummary || 'Analyzing...'}
              </p>
              <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-slate-50">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-2">Final Stability Gauge</span>
                  <StabilityGauge value={result.deltaDeltaG || 0} compact />
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center flex flex-col justify-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-2">Goal Alignment</span>
                  <span className="text-2xl font-black text-indigo-600 uppercase tracking-tight">{result.goalAlignment || 'High'}</span>
                </div>
              </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MutationCard;
