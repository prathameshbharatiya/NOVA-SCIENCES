import React, { useState } from 'react';
import { DecisionLogEntry } from '../types';

interface DecisionLogProps {
  entries: DecisionLogEntry[];
  onUpdateEntry: (id: string, updates: Partial<DecisionLogEntry>) => void;
  onRestore: (entry: DecisionLogEntry) => void;
  isSyncing?: boolean;
}

const DecisionLog: React.FC<DecisionLogProps> = ({ entries, onUpdateEntry, onRestore, isSyncing }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-10 text-center">
        <i className="fa-solid fa-flask-vial text-3xl text-slate-300 mb-4"></i>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Log Wet-Lab results here to make NOVA smarter about the next test.</p>
      </div>
    );
  }

  const ASSAY_TYPES = ['Spectroscopy', 'Binding Assay', 'Activity Assay', 'Stability (T_m)', 'Crystallography', 'NMR', 'Functional Screen', 'Other'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <i className="fa-solid fa-microscope text-indigo-500"></i> Feedback Loop History
        </h3>
        {isSyncing && (
          <span className="text-[9px] font-black text-indigo-600 uppercase animate-pulse flex items-center gap-2">
            <i className="fa-solid fa-rotate"></i> Learning...
          </span>
        )}
      </div>
      
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden shadow-sm transition-all hover:shadow-md">
            <div 
              className="p-5 flex items-center justify-between cursor-pointer group"
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-inner ${
                  entry.outcome === 'Positive' ? 'bg-emerald-100 text-emerald-600' :
                  entry.outcome === 'Negative' ? 'bg-rose-100 text-rose-600' :
                  entry.outcome === 'Neutral' ? 'bg-amber-100 text-amber-600' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {entry.mutationTested.substring(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-black text-slate-900 tracking-tight">{entry.mutationTested}</span>
                    <span className="text-[9px] font-bold text-slate-400">• {new Date(entry.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 truncate max-w-[180px]">{entry.assayType || 'Pending Assay'} • {entry.outcome === 'Not Tested Yet' ? 'No Feedback' : 'Feedback Received'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border-2 ${
                  entry.outcome === 'Positive' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' :
                  entry.outcome === 'Negative' ? 'border-rose-200 text-rose-600 bg-rose-50' :
                  entry.outcome === 'Neutral' ? 'border-amber-200 text-amber-600 bg-amber-50' :
                  'border-slate-200 text-slate-300'
                }`}>
                  {entry.outcome === 'Not Tested Yet' ? 'Awaiting Lab' : entry.outcome}
                </span>
                <i className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-300 ${expandedId === entry.id ? 'rotate-180' : ''}`}></i>
              </div>
            </div>

            {expandedId === entry.id && (
              <div className="p-6 border-t-2 border-slate-50 space-y-6 bg-slate-50/40 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Assay Methodology</label>
                      <select 
                        value={entry.assayType || ''} 
                        onChange={(e) => onUpdateEntry(entry.id, { assayType: e.target.value })}
                        className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-500"
                      >
                        <option value="">Select Assay...</option>
                        {ASSAY_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Cost Intensity</label>
                        <select 
                          value={entry.resourceIntensity || ''} 
                          onChange={(e) => onUpdateEntry(entry.id, { resourceIntensity: e.target.value as any })}
                          className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-[10px] font-bold outline-none"
                        >
                          <option value="">Intensity...</option>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Duration</label>
                        <input 
                          type="text"
                          value={entry.timeRequired || ''}
                          onChange={(e) => onUpdateEntry(entry.id, { timeRequired: e.target.value })}
                          placeholder="e.g. 7d"
                          className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-[10px] font-bold outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Scientific Outcome</label>
                    <div className="flex flex-wrap gap-2">
                      {['Positive', 'Neutral', 'Negative', 'Not Tested Yet'].map((opt) => (
                        <button 
                          key={opt}
                          onClick={() => onUpdateEntry(entry.id, { outcome: opt as any })}
                          className={`flex-1 min-w-[80px] px-3 py-2 rounded-xl text-[9px] font-black transition-all border-2 ${
                            entry.outcome === opt 
                            ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-md' 
                            : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {opt === 'Not Tested Yet' ? 'Logged' : opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Observations for NOVA Intelligence</label>
                  <textarea 
                    value={entry.userNotes}
                    onChange={(e) => onUpdateEntry(entry.id, { userNotes: e.target.value })}
                    placeholder="E.g. Observed fold change in fluorescence; high aggregation. (This will re-rank future roadmap items)"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[11px] font-medium text-slate-900 outline-none focus:border-indigo-500 min-h-[80px] shadow-inner"
                  />
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Data node: {entry.id}</span>
                  <button 
                    onClick={() => onRestore(entry)}
                    className="text-[9px] font-black text-indigo-600 uppercase hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                  >
                    <i className="fa-solid fa-window-restore"></i> Restore This Simulation
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