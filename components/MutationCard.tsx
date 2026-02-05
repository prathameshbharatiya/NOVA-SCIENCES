import React from 'react';
import { PredictionResult, MutationRegime } from '../types';
import StabilityGauge from './StabilityGauge';

interface MutationCardProps {
  result: PredictionResult;
}

const MutationCard: React.FC<MutationCardProps> = ({ result }) => {
  // CRITICAL FAIL-SAFE
  if (!result || typeof result !== 'object') {
    return <div className="p-10 bg-rose-50 border-2 border-rose-100 text-rose-600 font-black rounded-3xl">INVALID RESULT OBJECT RETURNED BY ENGINE</div>;
  }

  const isReference = result.confidenceMode === 'Validated Reference Mode';

  const getImpactBadge = (impact: any) => {
    const i = String(impact || '').toLowerCase();
    if (i.includes('highly destabilizing')) return 'bg-rose-600 text-white';
    if (i.includes('destabilizing')) return 'bg-orange-600 text-white';
    if (i.includes('stabilizing')) return 'bg-emerald-600 text-white';
    return 'bg-indigo-600 text-white';
  };

  const getConfidenceColor = (conf: any) => {
    const c = Number(conf || 0);
    if (c >= 0.8) return 'text-emerald-400';
    if (c >= 0.6) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full">
      <div className={`bg-[#0f172a] text-white rounded-[3rem] shadow-2xl border-b-[8px] overflow-hidden ${isReference ? 'border-indigo-600' : 'border-amber-600'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch divide-x divide-white/10">
          <div className="lg:col-span-3 p-10 flex flex-col justify-center bg-slate-900/80">
            <span className="text-[10px] font-black uppercase text-indigo-400 mb-1">{result.reproducibility?.runId || 'REF-000'}</span>
            <h3 className="text-7xl font-black tracking-tighter text-white leading-none">{result.mutation || "N/A"}</h3>
          </div>

          <div className="lg:col-span-7 grid grid-cols-3 divide-x divide-white/10 px-10 py-10 gap-8 text-center">
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase text-white/30 mb-2">Stability</span>
              <div className={`px-4 py-2 rounded-xl text-[12px] font-black uppercase ${getImpactBadge(result.stabilityImpact)}`}>
                {result.stabilityImpact || 'Neutral'}
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase text-white/30 mb-2">Signal</span>
              <span className="text-sm font-black text-indigo-400">{result.signalConsistency || 'Nominal'}</span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase text-white/30 mb-2">Regime</span>
              <span className="text-xs font-black uppercase">{result.regime || 'Unclassified'}</span>
            </div>
          </div>

          <div className="lg:col-span-2 p-10 flex flex-col justify-center bg-slate-900/80 items-end">
             <span className="text-[10px] font-black uppercase text-white/30 mb-2">Confidence</span>
             <span className={`text-4xl font-black ${getConfidenceColor(result.confidence)}`}>
                {Math.round(Number(result.confidence || 0) * 100)}%
             </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="bg-white border-2 border-slate-100 p-10 rounded-[3.5rem] shadow-sm">
            <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-widest mb-6">Structural Synthesis</h4>
            <p className="text-slate-700 font-bold leading-relaxed mb-10 italic">"{result.justification || result.structuralAnalysis || 'Analysis complete.'}"</p>
            <StabilityGauge value={result.deltaDeltaG || 0} compact />
        </section>

        <section className="bg-slate-900 border-2 border-slate-800 p-10 rounded-[3.5rem] shadow-xl text-white">
            <h4 className="text-[12px] font-black text-indigo-400 uppercase tracking-widest mb-6">Empirical Anchors</h4>
            <ul className="space-y-4">
              {result.patternAnchors?.map((p: any, i: number) => (
                <li key={i} className="text-[11px] font-bold opacity-70 italic border-l-2 border-indigo-500 pl-4">{p}</li>
              )) || <li className="text-white/20 font-black uppercase text-xs">No explicit anchors detected</li>}
            </ul>
        </section>
      </div>
    </div>
  );
};

export default MutationCard;