
import React from 'react';
import { PredictionResult } from '../types';
import StabilityGauge from './StabilityGauge';

interface MutationCardProps {
  result: PredictionResult;
}

const MutationCard: React.FC<MutationCardProps> = ({ result }) => {
  const getImpactColor = (impact: string) => {
    const i = (impact || '').toLowerCase();
    if (i.includes('highly destabilizing')) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    if (i.includes('destabilizing')) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    if (i.includes('stabilizing')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20';
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-400';
    if (score >= 0.6) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-10 print-card">
      {/* PRIMARY INSTRUMENT READOUT */}
      <div className="bg-[#0f172a] text-white rounded-[3rem] shadow-2xl overflow-hidden border-b-[8px] border-indigo-600/50">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch divide-x divide-white/10">
          
          <div className="lg:col-span-4 p-12 flex flex-col justify-center bg-slate-900/50">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">RESOLUTION CORE</span>
              <div className="h-px flex-1 bg-white/10"></div>
            </div>
            <div className="flex items-baseline gap-4 mb-2">
              <h3 className="text-8xl font-black tracking-tighter text-white leading-none">{result.mutation}</h3>
              <span className="text-2xl font-black text-white/20 mono">{result.uniprotId}</span>
            </div>
            <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em] mt-2">Substitution Vector Analysis</p>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 divide-x divide-white/10 p-12 gap-12 bg-slate-900/20">
            <div className="flex flex-col justify-center gap-6">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Stability Profile</span>
                <div className={`px-4 py-2 rounded-xl text-[14px] font-black uppercase border text-center ${getImpactColor(result.stabilityImpact)}`}>
                  {result.stabilityImpact}
                </div>
              </div>
              <div className="space-y-1 text-center">
                 <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Lit Grounding</span>
                 <div className={`text-5xl font-black ${getScoreColor(result.overallLiteratureAlignment)}`}>
                    {Math.round(result.overallLiteratureAlignment * 100)}%
                 </div>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-6 pl-12">
               <div className="space-y-1">
                 <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Signal Consistency</span>
                 <div className="text-xl font-black text-indigo-300 uppercase">{result.signalConsistency}</div>
               </div>
               <div className="space-y-1">
                 <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Assay Confidence</span>
                 <div className={`text-4xl font-black ${getScoreColor(result.confidence)}`}>
                    {Math.round(result.confidence * 100)}%
                 </div>
               </div>
            </div>
          </div>

          <div className="lg:col-span-3 p-10 flex flex-col justify-center bg-slate-900/60 items-end text-right">
            <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-2xl mb-6">
               <i className="fa-solid fa-vial"></i>
            </div>
            <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em] mb-2">Env Leverage</span>
            <div className="text-5xl font-black text-white">{result.environmentalAnalysis?.leverageFactor.toFixed(2)}x</div>
            <p className="text-[9px] font-black text-indigo-400/60 uppercase mt-4 tracking-widest">Shifted ΔΔG by {Math.abs(result.environmentalAnalysis?.shiftAmount || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white border-2 border-slate-100 p-10 rounded-[3.5rem] shadow-sm">
            <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <i className="fa-solid fa-dna"></i> Synthesis Rationale
            </h4>
            <p className="text-[18px] text-slate-900 font-bold leading-relaxed mb-10 italic">
              "{result.reportSummary}"
            </p>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Thermodynamic Shift Gauge</span>
               <StabilityGauge value={result.deltaDeltaG} />
            </div>
          </section>

          <section className="bg-white border-2 border-indigo-100 p-10 rounded-[3.5rem] shadow-lg">
            <h4 className="text-[12px] font-black text-indigo-900 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
               <i className="fa-solid fa-flask"></i> Detailed Environmental Impact
            </h4>
            <p className="text-[15px] font-bold text-slate-700 leading-relaxed italic mb-8">
               "{result.environmentalAnalysis?.reasoning}"
            </p>
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-100">
               <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Sensitivity</span>
                  <span className="text-xs font-black text-slate-900 uppercase">{result.environmentalAnalysis?.sensitivity}</span>
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Leverage Score</span>
                  <span className="text-xs font-black text-slate-900">{result.environmentalAnalysis?.leverageFactor}</span>
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Delta Shift</span>
                  <span className={`text-xs font-black ${result.environmentalAnalysis?.shiftAmount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {result.environmentalAnalysis?.shiftAmount > 0 ? '+' : ''}{result.environmentalAnalysis?.shiftAmount.toFixed(2)}
                  </span>
               </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <section className="bg-slate-900 p-8 rounded-[3rem] shadow-xl text-white">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-indigo-400">Research Grounding</h4>
              <div className="space-y-4">
                 {result.scientificPapers?.slice(0, 5).map((paper, idx) => (
                   <a 
                     key={idx} 
                     href={paper.url} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="block bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-indigo-500 hover:bg-white/10 transition-all group no-underline"
                   >
                      <h5 className="text-[11px] font-black mb-1 group-hover:text-indigo-300 line-clamp-2 text-white/90">{paper.title}</h5>
                      <div className="flex justify-between items-center text-[9px] font-black text-white/30 uppercase">
                         <span className="truncate max-w-[150px]">{paper.journal}</span>
                         <span>{paper.year}</span>
                      </div>
                   </a>
                 ))}
                 {(!result.scientificPapers || result.scientificPapers.length === 0) && (
                   <div className="text-[10px] text-white/20 font-black uppercase text-center py-4">No grounded research links found.</div>
                 )}
              </div>
           </section>

           <section className="bg-white border-2 border-slate-100 p-8 rounded-[3rem] shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-slate-400">Benchmark Consensus</h4>
              <div className="space-y-4">
                 {result.benchmarkAlignments?.map((b, i) => (
                   <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-black">
                        <span className="text-slate-500 uppercase tracking-tighter">{b.dataset}</span>
                        <span className="text-indigo-600 font-black">{Math.round(b.alignmentScore * 100)}%</span>
                      </div>
                      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${b.alignmentScore * 100}%` }}></div>
                      </div>
                      <p className="text-[8px] text-slate-400 leading-tight italic">{b.keyInsight}</p>
                   </div>
                 ))}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default MutationCard;
