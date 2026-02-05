import React from 'react';
import { DecisionMemo as DecisionMemoType, ScientificGoal } from '../types';

interface DecisionMemoProps {
  memo: DecisionMemoType;
  goal: ScientificGoal;
}

const DecisionMemo: React.FC<DecisionMemoProps> = ({ memo, goal }) => {
  // CRITICAL FAIL-SAFE
  if (!memo || typeof memo !== 'object' || !Array.isArray(memo.recommended)) {
    return <div className="p-10 bg-rose-50 border-2 border-rose-100 text-rose-600 font-black rounded-3xl">INCOMPLETE STRATEGIC DATA STRUCTURE</div>;
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full">
      <div className="bg-[#0f172a] text-white rounded-[3rem] p-10 shadow-2xl">
        <h3 className="text-4xl font-black uppercase tracking-tighter mb-4">{goal || "Objective Meta"}</h3>
        <p className="text-indigo-400 font-bold italic border-l-4 border-indigo-500 pl-6">"{memo.summary || 'Summary analysis pending.'}"</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {memo.recommended.map((rec: any, idx: number) => (
          <div key={`${rec.mutation}-${idx}`} className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] relative shadow-sm group hover:border-indigo-500 transition-all">
            <div className="absolute top-6 right-8 text-slate-100 font-black text-5xl group-hover:text-indigo-50 transition-colors">#{rec.rank || idx + 1}</div>
            <h4 className="text-4xl font-black text-slate-900 mb-4">{rec.mutation || "M100X"}</h4>
            <p className="text-xs font-bold text-slate-600 leading-relaxed italic">"{rec.rationale || 'Suggested based on molecular density patterns.'}"</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DecisionMemo;