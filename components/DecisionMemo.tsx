import React from 'react';
import { DecisionMemo as DecisionMemoType, ScientificGoal } from '../types';

interface DecisionMemoProps {
  memo: DecisionMemoType;
  goal: ScientificGoal;
  onSelectMutation?: (mutStr: string) => void;
}

const DecisionMemo: React.FC<DecisionMemoProps> = ({ memo, goal, onSelectMutation }) => {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-20 print-card">
      {/* Strategic Summary Header */}
      <div className="bg-[#0f172a] text-white rounded-[3rem] shadow-2xl overflow-hidden border-b-[10px] border-emerald-500/60 print:bg-white print:text-slate-900 print:border-slate-200 print:shadow-none">
        <div className="p-10 lg:p-14 print:p-0">
          <div className="flex items-center gap-3 mb-10 print:hidden">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] px-5 py-2 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
              Strategic Executive Intelligence
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7">
              <h3 className="text-4xl lg:text-5xl font-black tracking-tighter text-white leading-tight mb-8 uppercase print:text-slate-900">
                Strategic {goal} Path
              </h3>
              <div className="border-l-4 border-emerald-500 pl-8 space-y-4">
                 <p className="text-xl lg:text-2xl font-black text-white leading-snug print:text-slate-900">
                   {memo.summary}
                 </p>
                 <p className="text-sm font-bold text-white/50 italic print:text-slate-500">
                    Calculated for optimal thermodynamic stability vs. functional retention.
                 </p>
              </div>
            </div>
            <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-inner print:bg-slate-50 print:border-slate-100">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-4">Environmental Optimization Reasoning</span>
                <p className="text-[13px] font-bold text-white/80 leading-relaxed italic print:text-slate-700">
                  "{memo.environmentalRoadmapImpact}"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECOMMENDED SECTION: High Priority Mutations to TRY */}
      <section className="space-y-8">
        <div className="flex items-center gap-5 px-6 print:px-0">
           <div className="w-16 h-16 bg-emerald-100 rounded-[1.8rem] flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200 print:bg-slate-50 print:border-slate-300">
              <i className="fa-solid fa-circle-check text-3xl"></i>
           </div>
           <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">High-Priority Mutations: TRY THESE</h3>
              <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Validated candidates for structural enhancement and objective success</p>
           </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {memo.recommended?.map((rec, idx) => (
            <div 
              key={idx} 
              onClick={() => onSelectMutation?.(rec.mutation)}
              className="bg-white border-2 border-slate-100 p-10 rounded-[3rem] relative cursor-pointer hover:border-emerald-500 hover:shadow-2xl transition-all group flex flex-col h-full print:shadow-none print:border-slate-200 print:p-6"
            >
              <div className="flex justify-between items-start mb-8">
                <span className="w-12 h-12 bg-slate-50 text-slate-400 flex items-center justify-center rounded-2xl font-black text-sm border border-slate-100 group-hover:border-emerald-200 group-hover:text-emerald-500 transition-colors">#{rec.rank || idx + 1}</span>
                <div className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-4 py-2 rounded-xl uppercase border border-emerald-100 shadow-sm">
                   {Math.round((rec.litScore || 0) * 100)}% Match
                </div>
              </div>
              <div className="mb-6">
                 <h4 className="text-6xl font-black text-slate-900 tracking-tighter group-hover:text-emerald-600 transition-colors mb-2">
                   {rec.mutation}
                 </h4>
                 <div className="flex gap-2">
                   <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black px-2 py-1 rounded-md uppercase border border-indigo-100">{rec.goalAlignment}</span>
                   <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase border ${rec.risk?.toLowerCase().includes('low') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{rec.risk} Risk</span>
                 </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6 flex-1 group-hover:bg-white transition-colors">
                <p className="text-sm text-slate-700 font-bold leading-relaxed italic">
                  "{rec.rationale}"
                </p>
              </div>
              <div className="pt-6 border-t border-slate-50 flex justify-between items-center print:hidden">
                <div className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                  Load for detailed ΔΔG <i className="fa-solid fa-arrow-right"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DISCOURAGED SECTION: Critical Blacklist - DO NOT TRY */}
      <section className="bg-rose-50/40 border-2 border-rose-100 p-10 lg:p-14 rounded-[4rem] print:bg-white print:border-slate-200 print:p-8">
        <div className="flex items-center gap-5 mb-12">
           <div className="w-16 h-16 bg-rose-100 rounded-[1.8rem] flex items-center justify-center text-rose-600 shadow-sm border border-rose-200">
              <i className="fa-solid fa-ban text-3xl"></i>
           </div>
           <div>
              <h3 className="text-2xl font-black text-rose-600 uppercase tracking-tight">Critical Blacklist: DO NOT TRY</h3>
              <p className="text-[11px] font-black uppercase text-rose-400 tracking-[0.2em]">Exclued due to predicted structural collapse or functional ablation</p>
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {memo.discouraged?.map((item, idx) => (
            <div key={idx} className="bg-white border-2 border-rose-100 p-10 rounded-[3rem] flex items-start gap-10 shadow-sm hover:shadow-xl transition-all print:border-slate-200 print:p-6 print:gap-6">
              <div className="w-20 h-20 shrink-0 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center text-3xl font-black border border-rose-100 shadow-inner">
                 {item.mutation[0]}
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                   <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{item.mutation}</h4>
                   <span className="text-[10px] font-black text-rose-600 uppercase px-3 py-1.5 bg-rose-50 rounded-xl border border-rose-100">Structural Redline</span>
                 </div>
                 <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100/50">
                    <p className="text-xs font-bold text-slate-600 italic leading-relaxed">
                      "{item.signal}"
                    </p>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Evidence & Grounding Footnote */}
      {memo.groundingUrls && memo.groundingUrls.length > 0 && (
        <section className="bg-slate-50 border-2 border-slate-100 p-10 rounded-[4rem] shadow-sm print:border-slate-200 print:p-8">
           <div className="flex items-center gap-4 mb-8">
             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm border border-slate-200">
                <i className="fa-solid fa-magnifying-glass-chart text-lg"></i>
             </div>
             <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em]">Discovery Verification & Literature Grounding</h4>
           </div>
           <div className="flex flex-wrap gap-3">
              {memo.groundingUrls.map((url, i) => (
                <a 
                  key={i} 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] font-black text-indigo-600 bg-white px-5 py-3 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex items-center gap-3 no-underline print:text-slate-900 print:border-slate-200"
                >
                  <i className="fa-solid fa-link opacity-40"></i>
                  {new URL(url).hostname.replace('www.', '')}
                </a>
              ))}
           </div>
        </section>
      )}

      {/* Intelligence Learning Status */}
      {memo.learningProgress && (
        <div className="p-12 bg-indigo-600 rounded-[4rem] text-white flex flex-col md:flex-row items-center gap-12 shadow-2xl print:bg-slate-900 print:shadow-none print:p-8">
          <div className="flex flex-col items-center shrink-0">
             <span className="text-[11px] font-black uppercase text-indigo-200 mb-3 tracking-[0.2em]">Contextual Patterns</span>
             <div className="text-7xl font-black tracking-tighter">{memo.learningProgress.reRankedCount || 0}</div>
             <span className="text-[9px] font-black uppercase text-indigo-300 mt-2">Active Logic Points</span>
          </div>
          <div className="flex-1 space-y-4 text-center md:text-left">
             <h5 className="text-[11px] font-black uppercase text-indigo-200 tracking-widest">Active Synthesis Intelligence Insight</h5>
             <p className="text-2xl lg:text-3xl font-black leading-tight tracking-tight">
               "{memo.learningProgress.learnedPattern}"
             </p>
             <p className="text-xs font-bold text-white/40 italic">
               Heuristic optimized based on target {goal} constraints and experimental past logs.
             </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecisionMemo;