
import React from 'react';
import { DecisionMemo as DecisionMemoType, ScientificGoal } from '../types';

interface DecisionMemoProps {
  memo: DecisionMemoType;
  goal: ScientificGoal;
}

const DecisionMemo: React.FC<DecisionMemoProps> = ({ memo, goal }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black uppercase tracking-tight">Scientific Decision Memo</h2>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-white/10 rounded-lg text-[8px] font-black uppercase border border-white/20">{goal}</div>
              <div className="px-3 py-1 bg-black/20 rounded-lg text-[8px] font-black uppercase border border-white/10">
                Context Applied: {memo.referenceContextApplied ? 'YES' : 'NO'}
              </div>
            </div>
          </div>
          <p className="text-sm font-medium leading-relaxed opacity-90">{memo.summary}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-indigo-200 bg-black/10 p-2 rounded-xl border border-white/5">
            <i className="fa-solid fa-history"></i>
            <span>Memory Context: {memo.memoryContext}</span>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <section>
            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-6 flex items-center gap-2">
              <i className="fa-solid fa-vial-circle-check"></i> Recommended Mutations to Test Next
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {memo.recommended.map((rec) => (
                <div key={rec.rank} className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl relative">
                  <div className="absolute top-4 right-4 text-emerald-300 font-black text-4xl opacity-50 italic">#{rec.rank}</div>
                  <h4 className="text-xl font-black text-emerald-900 mb-2">{rec.mutation}</h4>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <span className="bg-emerald-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">{rec.goalAlignment} Alignment</span>
                    <span className="bg-white text-emerald-700 border border-emerald-200 text-[8px] font-black px-2 py-0.5 rounded uppercase">Conf: {rec.confidence}</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed font-medium mb-3">{rec.rationale}</p>
                  <p className="text-[9px] text-emerald-600 font-bold uppercase italic"><i className="fa-solid fa-warning mr-1"></i> {rec.risk}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="pt-8 border-t border-slate-100">
            <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-6 flex items-center gap-2">
              <i className="fa-solid fa-hand-dots"></i> Mutations Discouraged or Deprioritized
            </h3>
            <div className="space-y-3">
              {memo.discouraged.map((disc, i) => (
                <div key={i} className="flex items-center gap-4 bg-rose-50 border border-rose-100 p-4 rounded-2xl group transition-all hover:bg-rose-100/50">
                  <div className="w-10 h-10 bg-rose-200 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                    <i className="fa-solid fa-xmark"></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-rose-900">{disc.mutation}</span>
                      <span className="text-[8px] font-black text-rose-400 uppercase">Signal: {disc.signal}</span>
                    </div>
                    <p className="text-[10px] text-rose-700 font-medium leading-relaxed">{disc.risk}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DecisionMemo;
