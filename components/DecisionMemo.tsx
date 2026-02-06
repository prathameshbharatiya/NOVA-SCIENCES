import React from 'react';
import { DecisionMemo as DecisionMemoType, ScientificGoal } from '../types';

interface DecisionMemoProps {
  memo: DecisionMemoType;
  goal: ScientificGoal;
  onSelectMutation?: (mutStr: string) => void;
}

const DecisionMemo: React.FC<DecisionMemoProps> = ({ memo, goal, onSelectMutation }) => {
  const isReference = memo.confidenceMode === 'Validated Reference Mode';

  const getMutationName = (rec: any) => {
    if (rec.mutation && rec.mutation.length > 0) return rec.mutation;
    return `VAR-${rec.rank || '?'}`;
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-20">
      {/* STRATEGIC HEADER */}
      <div className={`bg-[#0f172a] text-white rounded-[3rem] shadow-2xl overflow-hidden print-card border-b-[8px] ${isReference ? 'border-indigo-600/50' : 'border-amber-600/50'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch divide-x divide-white/10">
          <div className="lg:col-span-5 p-10 flex flex-col justify-center bg-slate-900/40">
            <div className="flex items-center gap-3 mb-6">
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-lg border ${isReference ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                {memo.confidenceMode || 'Strategy Active'}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">NOVA-ENG-V0.2.5</span>
            </div>
            <h3 className="text-4xl font-black tracking-tighter text-white leading-tight mb-4 uppercase">{goal}</h3>
            <p className="text-[15px] font-bold text-white/80 leading-relaxed italic border-l-4 border-indigo-500 pl-6">"{memo.summary}"</p>
          </div>

          <div className="lg:col-span-7 p-10 bg-slate-900/60 flex flex-col justify-center">
            {memo.learningProgress ? (
              <div className="space-y-6">
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400 block mb-2">Intelligence Updates from Lab Feedback</span>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                    <span className="text-[9px] font-black text-white/40 uppercase block mb-1">Re-Ranked</span>
                    <span className="text-2xl font-black text-white">{memo.learningProgress.reRankedCount || 0}</span>
                  </div>
                  <div className="col-span-2 bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
                    <span className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Structural Pattern Identified</span>
                    <p className="text-[11px] font-bold text-white leading-tight">{memo.learningProgress.learnedPattern || 'Synthesizing knowledge from prior outcomes...'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-30">
                <i className="fa-solid fa-brain text-4xl mb-3"></i>
                <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Lab Outcomes to Refine Roadmap</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TARGETS */}
      <section>
        <div className="flex items-center gap-4 mb-10 px-6">
           <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
              <i className="fa-solid fa-vial-circle-check text-xl"></i>
           </div>
           <h3 className="text-[16px] font-black text-slate-900 uppercase tracking-[0.4em]">Optimized Roadmap Targets</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {memo.recommended?.map((rec, idx) => (
            <div 
              key={idx} 
              onClick={() => onSelectMutation?.(getMutationName(rec))}
              className="bg-white border-2 border-slate-100 p-8 rounded-[3.5rem] relative cursor-pointer hover:border-indigo-500 hover:shadow-xl transition-all group flex flex-col min-h-[400px] print-card"
            >
              <div className="absolute top-8 right-10 text-slate-100 font-black text-7xl opacity-40 group-hover:text-indigo-50 transition-colors pointer-events-none italic italic">
                #{rec.rank || idx + 1}
              </div>
              <h4 className="text-6xl font-black text-slate-900 tracking-tighter mb-6 group-hover:text-indigo-600 transition-colors">
                {getMutationName(rec)}
              </h4>
              <div className="flex-1 space-y-4">
                <div className="flex gap-2">
                  <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase">{rec.goalAlignment}</span>
                  <span className="bg-[#0f172a] text-white text-[9px] font-black px-2 py-1 rounded uppercase">{rec.confidence}</span>
                </div>
                <p className="text-[14px] text-slate-800 leading-relaxed font-bold italic group-hover:text-slate-900 transition-colors">
                  "{rec.rationale || 'Suggested for targeted structural stability optimization.'}"
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-between items-center mt-auto">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{rec.risk}</span>
                <i className="fa-solid fa-arrow-right text-indigo-400 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0"></i>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-16 border-t-4 border-slate-100">
        <h3 className="text-[16px] font-black text-rose-600 uppercase tracking-[0.4em] mb-10 px-6 flex items-center gap-4">
          <i className="fa-solid fa-hand-dots text-xl"></i> High-Risk Trajectories
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
          {memo.discouraged?.map((disc, i) => (
            <div key={i} className="flex items-center gap-8 bg-white border-2 border-slate-100 p-8 rounded-[3rem] group transition-all hover:bg-rose-50/50 hover:border-rose-200 print-card">
              <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-400 shrink-0 text-3xl shadow-inner group-hover:bg-rose-100 transition-all">
                <i className="fa-solid fa-shield-virus"></i>
              </div>
              <div>
                <span className="text-4xl font-black text-slate-900 tracking-tighter group-hover:text-rose-900 transition-colors">{disc.mutation || 'VAR-X'}</span>
                <p className="text-[13px] text-slate-600 font-bold leading-relaxed mt-2">{disc.risk}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="p-10 bg-[#0f172a] rounded-[3.5rem] border border-white/10 text-center shadow-2xl no-print">
        <p className="text-[13px] font-black text-indigo-400 uppercase tracking-widest leading-relaxed max-w-4xl mx-auto">
          Every experiment logged helps NOVA reason more accurately about what to test next. This roadmap is an adaptive strategic guide.
        </p>
      </div>
    </div>
  );
};

export default DecisionMemo;