import React, { useState } from 'react';
import { DecisionLogEntry } from '../types';

interface DecisionLogProps {
  entries: DecisionLogEntry[];
  onUpdateEntry: (id: string, updates: Partial<DecisionLogEntry>) => void;
  onRestore: (entry: DecisionLogEntry) => void;
}

const DecisionLog: React.FC<DecisionLogProps> = ({ entries, onUpdateEntry, onRestore }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-10 text-center">
        <i className="fa-solid fa-clock-rotate-left text-3xl text-slate-300 mb-4"></i>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Log Empty. Decisions will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Decision Log (Chronological)</h3>
        <span className="text-[10px] font-bold text-slate-400">{entries.length} Entries</span>
      </div>
      
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden shadow-sm transition-all hover:shadow-md">
            <div 
              className="p-5 flex items-center justify-between cursor-pointer group"
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${
                  entry.outcome === 'Positive' ? 'bg-emerald-100 text-emerald-600' :
                  entry.outcome === 'Negative' ? 'bg-rose-100 text-rose-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {(entry.mutationTested || 'M').substring(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-black text-slate-900">{entry.mutationTested}</span>
                    <span className="text-[9px] font-bold text-slate-400">• {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-600 truncate max-w-[200px]">{entry.proteinName} — {entry.goal}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                  entry.outcome === 'Positive' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' :
                  entry.outcome === 'Negative' ? 'border-rose-200 text-rose-600 bg-rose-50' :
                  'border-slate-200 text-slate-400'
                }`}>
                  {entry.outcome === 'Not Tested Yet' ? 'Pending' : entry.outcome}
                </span>
                <i className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-300 ${expandedId === entry.id ? 'rotate-180' : ''}`}></i>
              </div>
            </div>

            {expandedId === entry.id && (
              <div className="p-6 border-t-2 border-slate-50 space-y-6 bg-slate-50/30 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <h5 className="text-[8px] font-black uppercase text-slate-400 mb-2 tracking-widest">Scientific Profile</h5>
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-slate-900"><span className="text-slate-400">Risk:</span> {entry.riskTolerance}</p>
                       <p className="text-[10px] font-bold text-slate-900"><span className="text-slate-400">Preserve:</span> {entry.preserveRegions || 'None'}</p>
                       <p className="text-[10px] font-bold text-slate-900"><span className="text-slate-400">Environment:</span> {entry.environment || 'Standard'}</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <h5 className="text-[8px] font-black uppercase text-slate-400 mb-2 tracking-widest">Top Recommendations</h5>
                    <div className="space-y-1 flex-1">
                      {entry.memo?.recommended?.slice(0, 3).map((r, i) => (
                        <p key={i} className="text-[10px] font-black text-indigo-600 truncate">#{r.rank} {r.mutation}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {entry.snapshots?.zoomed && (
                  <div className="relative group overflow-hidden rounded-2xl border border-slate-200">
                    <img src={entry.snapshots.zoomed} className="w-full h-32 object-cover transition-transform group-hover:scale-110" alt="Structural context" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                      <span className="text-[8px] text-white font-black uppercase">Captured Atomic Context</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status & Justification</label>
                  <div className="flex gap-2">
                    {['Positive', 'Neutral', 'Negative', 'Not Tested Yet'].map((opt) => (
                      <button 
                        key={opt}
                        onClick={() => onUpdateEntry(entry.id, { outcome: opt as any })}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border-2 ${
                          entry.outcome === opt 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                          : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {opt === 'Not Tested Yet' ? 'Pending' : opt}
                      </button>
                    ))}
                  </div>
                  <textarea 
                    value={entry.userNotes}
                    onChange={(e) => onUpdateEntry(entry.id, { userNotes: e.target.value })}
                    placeholder="Document scientific rationale or experimental findings (max 5 lines)..."
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-[11px] font-medium text-slate-900 outline-none focus:border-indigo-500 transition-all shadow-inner"
                    rows={3}
                  />
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter text-slate-900">Run: {entry.prediction?.reproducibility?.runId || 'N/A'}</span>
                    <span className="text-[7px] font-bold text-slate-300 uppercase tracking-tighter">Engine: {entry.prediction?.reproducibility?.modelName || 'Core'} v{entry.prediction?.reproducibility?.modelVersion || '0.2.5'}</span>
                  </div>
                  <button 
                    onClick={() => onRestore(entry)}
                    className="text-[10px] font-black text-indigo-600 uppercase hover:text-indigo-800 transition-colors flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl"
                  >
                    <i className="fa-solid fa-window-restore"></i> Restore System
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DecisionLog;