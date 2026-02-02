import React from 'react';
import { DecisionMemo as DecisionMemoType, ScientificGoal } from '../types';

interface DecisionMemoProps {
  memo: DecisionMemoType;
  goal: ScientificGoal;
  onSelectMutation?: (mutStr: string) => void;
}

const DecisionMemo: React.FC<DecisionMemoProps> = ({ memo, goal, onSelectMutation }) => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full">
      {/* FULL-WIDTH ROADMAP COMMAND STRIP */}
      <div className="bg-[#0f172a] text-white rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(15,23,42,0.5)] border-b-[8px] border-indigo-600/50 overflow-hidden animate-pulse-once">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch divide-x divide-white/10">
          
          {/* Identity & Mission */}
          <div className="lg:col-span-4 p-10 flex flex-col justify-center bg-slate-900/80">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">Roadmap Active</span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">NOVA-STRATEGY-V0.2.5</span>
            </div>
            <h3 className="text-5xl font-black tracking-tighter text-white leading-none mb-4 uppercase">{goal}</h3>
            <p className="text-[14px] font-bold text-white/70 leading-relaxed italic border-l-4 border-indigo-500 pl-6">
              "{memo.summary}"
            </p>
          </div>

          {/* Strategic Context: Memory & Logic */}
          <div className="lg:col-span-5 grid grid-cols-2 divide-x divide-white/10 p-10 gap-8">
            <div className="flex flex-col justify-center px-6">
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Laboratory Memory</span>
              <p className="text-[13px] font-bold text-white/90 leading-snug">{memo.logInsights}</p>
            </div>
            
            <div className="flex flex-col justify-center px-6">
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Strategic Logic</span>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${memo.referenceContextApplied ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Reference Context {memo.referenceContextApplied ? 'Applied' : 'Bypassed'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Logic Root: {memo.memoryContext}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Safety & Failure Awareness */}
          <div className="lg:col-span-3 p-10 flex flex-col justify-center bg-rose-500/5 items-start">
            <span className="text-[12px] font-black uppercase tracking-[0.3em] text-rose-400 mb-4">Failure Awareness Log</span>
            <p className="text-[12px] font-bold text-rose-100 leading-snug">{memo.failureAwareNotes}</p>
          </div>

        </div>
      </div>

      {/* CORE ROADMAP GRIDS */}
      <div className="grid grid-cols-1 gap-10">
        <section>
          <div className="flex items-center justify-between mb-8 px-4">
             <h3 className="text-[14px] font-black text-emerald-600 uppercase tracking-[0.4em] flex items-center gap-3">
                <i className="fa-solid fa-vial-circle-check text-2xl"></i> High-Probability Recommendations
             </h3>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Click card to simulate target</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {memo.recommended.map((rec) => (
              <div 
                key={rec.rank} 
                onClick={() => onSelectMutation?.(rec.mutation)}
                className="bg-white border-2 border-slate-100 p-8 rounded-[3.5rem] relative cursor-pointer hover:border-emerald-500 hover:shadow-[0_20px_50px_-15px_rgba(16,185,129,0.2)] transition-all group flex flex-col min-h-[320px]"
              >
                <div className="absolute top-6 right-8 text-emerald-100 font-black text-6xl opacity-50 italic group-hover:text-emerald-200 transition-colors">#{rec.rank}</div>
                <h4 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">{rec.mutation}</h4>
                
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex gap-2">
                    <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">{rec.goalAlignment} Alignment</span>
                  </div>

                  <p className="text-[14px] text-slate-700 leading-relaxed font-bold italic mb-2">"{rec.rationale}"</p>
                  
                  {/* Detailed Confidence Reasoning */}
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 mt-auto">
                     <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Synthesis Confidence: {rec.confidenceBreakdown?.overallConfidence || rec.confidence}</span>
                     </div>
                     <p className="text-[11px] text-emerald-800 font-bold leading-tight">
                       {rec.confidenceBreakdown?.confidenceRationale}
                     </p>
                  </div>

                  <div className="flex items-center gap-2 text-rose-500 px-1">
                    <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                    <span className="text-[10px] font-black uppercase tracking-widest">{rec.risk}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                  <i className="fa-solid fa-arrow-right"></i> Initiate Atomic Simulation
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Deprioritized Grid */}
        <section className="pt-10 border-t-4 border-slate-100">
          <h3 className="text-[14px] font-black text-rose-600 uppercase tracking-[0.4em] mb-8 flex items-center gap-3 px-4">
             <i className="fa-solid fa-hand-dots text-2xl"></i> Deprioritized Pathologies
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {memo.discouraged.map((disc, i) => (
              <div key={i} className="flex items-center gap-6 bg-rose-50 border-2 border-rose-100 p-8 rounded-[2.5rem] group transition-all hover:bg-rose-100/50 hover:border-rose-300">
                <div className="w-16 h-16 bg-rose-200 rounded-[1.5rem] flex items-center justify-center text-rose-600 shrink-0 text-2xl shadow-inner">
                  <i className="fa-solid fa-shield-virus"></i>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-black text-rose-950 tracking-tighter">{disc.mutation}</span>
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] bg-white px-3 py-1 rounded-lg border border-rose-100">Signal: {disc.signal}</span>
                  </div>
                  <p className="text-[13px] text-rose-900 font-bold leading-relaxed">{disc.risk}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* FOOTER ALERT */}
      <div className="p-8 bg-slate-950 rounded-[3rem] border border-white/10 text-center shadow-inner">
        <p className="text-[12px] font-black text-rose-400 uppercase tracking-[0.25em] leading-relaxed max-w-4xl mx-auto">
          <i className="fa-solid fa-map-location-dot mr-3 text-lg"></i> 
          The Strategic Roadmap identifies potential targets based on learned patterns and comparative analysis. 
          Each recommendation requires individual atomic simulation and subsequent laboratory benchmarking.
        </p>
      </div>
    </div>
  );
};

export default DecisionMemo;