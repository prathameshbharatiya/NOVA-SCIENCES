

import React from 'react';
import { DecisionMemo as DecisionMemoType, ScientificGoal } from '../types';

interface DecisionMemoProps {
  memo: DecisionMemoType;
  goal: ScientificGoal;
  onSelectMutation?: (mutStr: string) => void;
}

const DecisionMemo: React.FC<DecisionMemoProps> = ({ memo, goal, onSelectMutation }) => {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-500';
    if (score >= 0.6) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-20 print-card">
      <div className="bg-[#0f172a] text-white rounded-[3rem] shadow-2xl overflow-hidden border-b-[8px] border-emerald-500/50">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch divide-x divide-white/10">
          <div className="lg:col-span-6 p-12 flex flex-col justify-center bg-slate-900/40">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-lg border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                {memo.confidenceMode || 'Strategic Optimization Active'}
              </span>
            </div>
            <h3 className="text-5xl font-black tracking-tighter text-white leading-tight mb-4 uppercase">{goal}</h3>
            <p className="text-[18px] font-bold text-white/90 leading-relaxed italic border-l-4 border-emerald-500 pl-8">"{memo.summary}"</p>
          </div>

          <div className="lg:col-span-6 p-12 bg-slate-900/60 flex flex-col justify-center gap-8">
            <div className="bg-indigo-500/10 p-6 rounded-3xl border border-indigo-500/20">
               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Environmental Roadmap Leverage</span>
               <p className="text-[13px] font-bold text-white leading-relaxed italic">
                 "{memo.environmentalRoadmapImpact}"
               </p>
            </div>
            {memo.learningProgress && (
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-slate-800/50 p-5 rounded-3xl border border-white/5 text-center">
                  <span className="text-[9px] font-black text-white/40 uppercase block mb-1">Re-Ranked</span>
                  <span className="text-3xl font-black text-white">{memo.learningProgress.reRankedCount || 0}</span>
                </div>
                <div className="col-span-2 bg-slate-800/50 p-5 rounded-3xl border border-white/5">
                  <span className="text-[9px] font-black text-white/40 uppercase block mb-1">Heuristic Pattern Detected</span>
                  <p className="text-[12px] font-bold text-white leading-tight">{memo.learningProgress.learnedPattern}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center gap-4 mb-10 px-6">
           <div className="w-14 h-14 bg-emerald-100 rounded-[1.5rem] flex items-center justify-center text-emerald-600 shadow-xl border-2 border-emerald-200">
              <i className="fa-solid fa-vial-circle-check text-2xl"></i>
           </div>
           <div>
              <h3 className="text-[16px] font-black text-slate-900 uppercase tracking-[0.4em]">Optimized Target Roadmap</h3>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Prescribed for High-Probability Success</p>
           </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {memo.recommended?.map((rec, idx) => (
            <div 
              key={idx} 
              onClick={() => onSelectMutation?.(rec.mutation)}
              className="bg-white border-2 border-slate-100 p-10 rounded-[3.5rem] relative cursor-pointer hover:border-emerald-500 hover:shadow-2xl transition-all group flex flex-col min-h-[450px]"
            >
              <div className="absolute top-10 right-10 text-slate-100 font-black text-8xl opacity-40 group-hover:text-emerald-50 transition-colors pointer-events-none italic">
                #{rec.rank || idx + 1}
              </div>
              <h4 className="text-6xl font-black text-slate-900 tracking-tighter mb-8 group-hover:text-emerald-600 transition-colors">
                {rec.mutation}
              </h4>
              <div className="flex-1 space-y-6">
                <div className="flex flex-wrap gap-2">
                  <span className="bg-emerald-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase">{rec.goalAlignment}</span>
                  <span className="bg-[#0f172a] text-white text-[9px] font-black px-3 py-1 rounded-full uppercase">Lit Grounding: {Math.round((rec.litScore || 0) * 100)}%</span>
                </div>
                <p className="text-[15px] text-slate-800 leading-relaxed font-bold italic group-hover:text-slate-900 transition-colors">
                  "{rec.rationale}"
                </p>
              </div>
              <div className="pt-8 border-t border-slate-100 flex justify-between items-center mt-auto">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{rec.risk}</span>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-500 group-hover:translate-x-1 transition-transform">
                  Test Mutation <i className="fa-solid fa-arrow-right"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mandatory Grounding Source Display as per Gemini Search Grounding Guidelines */}
      {memo.groundingUrls && memo.groundingUrls.length > 0 && (
        <section className="bg-slate-50 border-2 border-slate-100 p-10 rounded-[3.5rem] shadow-sm">
           <div className="flex items-center gap-4 mb-6">
             <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-200">
                <i className="fa-solid fa-link"></i>
             </div>
             <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Grounded Research Sources</h4>
           </div>
           <div className="flex flex-wrap gap-3">
              {memo.groundingUrls.map((url, i) => (
                <a 
                  key={i} 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] font-bold text-indigo-700 bg-white px-4 py-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:text-indigo-900 transition-all flex items-center gap-2 shadow-sm"
                >
                  <i className="fa-solid fa-globe text-[8px] text-indigo-400"></i>
                  {new URL(url).hostname}
                </a>
              ))}
           </div>
        </section>
      )}

      {memo.discouraged && memo.discouraged.length > 0 && (
        <section className="pt-20 border-t-4 border-slate-100">
           <div className="flex items-center gap-4 mb-10 px-6">
             <div className="w-14 h-14 bg-rose-100 rounded-[1.5rem] flex items-center justify-center text-rose-600 shadow-xl border-2 border-rose-200">
                <i className="fa-solid fa-ban text-2xl"></i>
             </div>
             <div>
                <h3 className="text-[16px] font-black text-rose-600 uppercase tracking-[0.4em]">Candidates to AVOID (Blacklist)</h3>
                <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest">High Structural Risk or Env Clashes</p>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {memo.discouraged.map((item, idx) => (
              <div key={idx} className="bg-rose-50/50 border-2 border-rose-100 p-10 rounded-[3.5rem] flex items-center gap-10">
                <div className="w-20 h-20 shrink-0 bg-white rounded-3xl flex items-center justify-center text-rose-500 text-4xl shadow-xl border border-rose-100 font-black">
                   {item.mutation[0]}
                </div>
                <div className="flex-1">
                   <div className="flex justify-between items-center mb-2">
                     <h4 className="text-3xl font-black text-slate-900">{item.mutation}</h4>
                     <span className={`text-[10px] font-black uppercase ${getScoreColor(item.litScore)}`}>Lit Grounding: {Math.round(item.litScore * 100)}%</span>
                   </div>
                   <p className="text-[11px] font-black text-rose-600 uppercase tracking-widest mb-3">{item.risk}</p>
                   <p className="text-[14px] font-bold text-slate-600 italic">"{item.signal}"</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="p-12 bg-[#0f172a] rounded-[4rem] border border-white/10 text-center shadow-2xl no-print">
        <p className="text-[14px] font-black text-indigo-400 uppercase tracking-[0.2em] leading-relaxed max-w-4xl mx-auto">
          NOVA Strategic Engine has re-calculated these rankings using {memo.learningProgress?.reRankedCount || 0} unique structural heuristics based on your environmental constraints.
        </p>
      </div>
    </div>
  );
};

export default DecisionMemo;
