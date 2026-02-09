
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
        <i className="fa-solid fa-flask-vial text-3xl text-slate-300 mb-4"></i>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Experimental history appears here.</p>
      </div>
    );
  }

  const ASSAY_TYPES = ['Spectroscopy', 'Binding Assay', 'Activity Assay', 'Stability (T_m)', 'Crystallography', 'NMR', 'Functional Screen', 'Other'];

  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 px-2">
        <i className="fa-solid fa-history text-indigo-500"></i> Assay Notebook
      </h3>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden shadow-sm transition-all hover:shadow-md">
            <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-inner ${
                  entry.outcome === 'Success' ? 'bg-emerald-100 text-emerald-600' :
                  entry.outcome === 'Fail' ? 'bg-rose-100 text-rose-600' :
                  entry.outcome === 'Partial' ? 'bg-amber-100 text-amber-600' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {entry.mutationTested.substring(0, 1)}
                </div>
                <div>
                  <div className="text-[12px] font-black text-slate-900">{entry.mutationTested}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase">{entry.proteinName}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                    entry.outcome === 'Success' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' :
                    entry.outcome === 'Fail' ? 'border-rose-200 text-rose-600 bg-rose-50' :
                    'border-slate-200 text-slate-300'
                 }`}>
                   {entry.outcome === 'Not Tested Yet' ? 'Logged' : entry.outcome}
                 </span>
                 <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${expandedId === entry.id ? 'rotate-180' : ''}`}></i>
              </div>
            </div>
            {expandedId === entry.id && (
              <div className="p-6 border-t-2 border-slate-50 space-y-4 bg-slate-50/40">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Assay Type</label>
                      <select 
                        value={entry.assayType || ''} 
                        onChange={(e) => onUpdateEntry(entry.id, { assayType: e.target.value })}
                        className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-[10px] font-bold"
                      >
                        <option value="">Select Assay...</option>
                        {ASSAY_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Outcome</label>
                      <div className="flex gap-1">
                        {['Success', 'Partial', 'Fail'].map(opt => (
                          <button 
                            key={opt}
                            onClick={() => onUpdateEntry(entry.id, { outcome: opt as any })}
                            className={`flex-1 py-1 text-[8px] font-black rounded border transition-all ${entry.outcome === opt ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                   </div>
                   <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Resource Cost</label>
                      <select 
                        value={entry.resourceIntensity || ''} 
                        onChange={(e) => onUpdateEntry(entry.id, { resourceIntensity: e.target.value as any })}
                        className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-[10px] font-bold"
                      >
                        <option value="">Select Intensity...</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Time Required</label>
                      <input 
                        type="text"
                        value={entry.timeRequired || ''}
                        placeholder="e.g. 4h, 2d"
                        onChange={(e) => onUpdateEntry(entry.id, { timeRequired: e.target.value })}
                        className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-[10px] font-bold"
                      />
                   </div>
                </div>
                
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[9px] font-bold text-indigo-700">
                  <div className="uppercase text-[7px] text-indigo-400 mb-1 tracking-widest">Environment Recorded</div>
                  pH ${entry.environment.ph} | ${entry.environment.temp}°C | ${entry.environment.ionicStrength}mM | ${entry.environment.bufferSystem}
                </div>

                <div className="space-y-2">
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Experimental Notes</label>
                  <textarea 
                    value={entry.userNotes}
                    onChange={(e) => onUpdateEntry(entry.id, { userNotes: e.target.value })}
                    placeholder="Enter lab observations..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[11px] font-medium outline-none min-h-[80px] focus:border-indigo-300 transition-all"
                  />
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(entry.timestamp).toLocaleDateString()}</span>
                  <button onClick={() => onRestore(entry)} className="text-[9px] font-black text-indigo-600 uppercase hover:bg-indigo-50 px-3 py-1 rounded-lg transition-colors">Restore Coordinates</button>
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
