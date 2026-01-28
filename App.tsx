import React, { useState, useRef, useEffect } from 'react';
import { 
  Mutation, 
  PredictionResult, 
  ProteinMetadata, 
  ScientificGoal, 
  PriorResult, 
  DecisionMemo as DecisionMemoType,
  RiskTolerance,
  DecisionLogEntry
} from './types';
import { AMINO_ACIDS, REFERENCE_PROTEINS, ReferenceProtein } from './constants';
import { predictMutation, searchProtein, generateDecisionMemo } from './services/geminiService';
import MutationCard from './components/MutationCard';
import DecisionMemo from './components/DecisionMemo';
import ProteinViewer, { ProteinViewerHandle } from './components/ProteinViewer';
import DecisionLog from './components/DecisionLog';

const App: React.FC = () => {
  const [currentProtein, setCurrentProtein] = useState<ProteinMetadata | null>(null);
  const [mutation, setMutation] = useState<Mutation>({ wildtype: 'R', position: 273, mutant: 'H' });
  const [goal, setGoal] = useState<ScientificGoal>(ScientificGoal.STABILITY);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>(RiskTolerance.MEDIUM);
  const [preserveRegions, setPreserveRegions] = useState('');
  const [environment, setEnvironment] = useState('');
  
  const [logEntries, setLogEntries] = useState<DecisionLogEntry[]>([]);
  const [priorResults, setPriorResults] = useState<PriorResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const viewerHandleRef = useRef<ProteinViewerHandle>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [decisionMemo, setDecisionMemo] = useState<DecisionMemoType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Sync memory from log outcomes
  useEffect(() => {
    const memoryFromLog = logEntries
      .filter(e => e.outcome !== 'Not Tested Yet')
      .map(e => ({ 
        mutation: e.mutationTested, 
        outcome: e.outcome as 'Positive' | 'Neutral' | 'Negative' 
      }));
    
    const combined = [...memoryFromLog];
    priorResults.forEach(p => {
      if (!combined.some(c => c.mutation === p.mutation)) {
        combined.push(p);
      }
    });
    setPriorResults(combined);
  }, [logEntries]);

  // Proactive Preservation Guardrail
  useEffect(() => {
    if (!preserveRegions) {
      setWarning(null);
      return;
    }
    const regions = preserveRegions.split(',').map(r => r.trim().toLowerCase());
    const pos = mutation.position.toString();
    const isRestricted = regions.some(r => {
      if (r.includes('-')) {
        const [start, end] = r.split('-').map(Number);
        return mutation.position >= start && mutation.position <= end;
      }
      return r === pos;
    });

    if (isRestricted) {
      setWarning(`PRESERVATION ALERT: Residue ${mutation.position} is within a protected region.`);
    } else {
      setWarning(null);
    }
  }, [mutation.position, preserveRegions]);

  const parseMutationString = (mutStr: string) => {
    const match = mutStr.match(/([A-Z])(\d+)([A-Z])/i);
    if (match) {
      setMutation({ 
        wildtype: match[1].toUpperCase(), 
        position: parseInt(match[2]), 
        mutant: match[3].toUpperCase() 
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePredict = async () => {
    if (!currentProtein) return;
    setIsPredicting(true);
    setError(null);
    try {
      const pred = await predictMutation(
        currentProtein, 
        mutation, 
        goal, 
        priorResults, 
        riskTolerance, 
        preserveRegions, 
        environment
      );
      setResult(pred);
      
      const memo = await generateDecisionMemo(
        currentProtein, 
        goal, 
        priorResults, 
        riskTolerance, 
        preserveRegions, 
        environment
      );
      setDecisionMemo(memo);

      const snapshots = viewerHandleRef.current?.getSnapshots();
      const newEntry: DecisionLogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        proteinName: currentProtein.name,
        uniprotId: currentProtein.id,
        goal,
        riskTolerance,
        preserveRegions,
        environment,
        mutationTested: `${mutation.wildtype}${mutation.position}${mutation.mutant}`,
        prediction: pred,
        memo,
        snapshots,
        userNotes: '',
        outcome: 'Not Tested Yet'
      };
      setLogEntries(prev => [newEntry, ...prev]);

    } catch (err: any) {
      setError(`Analysis Error: ${err.message || "Unknown error"}`);
    } finally {
      setIsPredicting(false);
    }
  };

  const updateLogEntry = (id: string, updates: Partial<DecisionLogEntry>) => {
    setLogEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const restoreLogContext = (entry: DecisionLogEntry) => {
    setGoal(entry.goal);
    setRiskTolerance(entry.riskTolerance);
    setPreserveRegions(entry.preserveRegions);
    setEnvironment(entry.environment);
    setResult(entry.prediction || null);
    setDecisionMemo(entry.memo || null);
    parseMutationString(entry.mutationTested);
  };

  const handleCustomSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setError(null);
    setResult(null);
    setDecisionMemo(null);
    try {
      const data = await searchProtein(searchQuery);
      setCurrentProtein({ ...data, isValidatedReference: false });
    } catch (err: any) {
      setError(`Resolution Fault: ${err.message || "Protein not found"}`);
    } finally {
      setIsSearching(false);
    }
  };

  const loadReference = async (ref: ReferenceProtein) => {
    setIsSearching(true);
    setError(null);
    setResult(null);
    setDecisionMemo(null);
    try {
      const data = await searchProtein(ref.id);
      setCurrentProtein({ 
        ...data, 
        sourceType: 'Demo', 
        isValidatedReference: true, 
        referenceContext: ref.context,
        pdbId: ref.pdbId 
      });
    } catch (err: any) {
      setError(`Search Fault: ${err.message || "Demo data unavailable"}`);
    } finally {
      setIsSearching(false);
    }
  };

  const downloadPIReport = () => {
    if (!result || !decisionMemo || !currentProtein) return;
    const snapshots = viewerHandleRef.current?.getSnapshots();
    const { full, zoomed } = snapshots || { full: '', zoomed: '' };
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>novasciences Report - ${result.reproducibility.runId}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body { font-family: 'Inter', sans-serif; color: #1e293b; max-width: 900px; margin: 0 auto; padding: 40px; background: #f8fafc; }
          .container { background: white; border-radius: 32px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
          .header { background: #0f172a; color: white; padding: 60px 40px; }
          .section { padding: 40px; border-bottom: 1px solid #f1f5f9; }
          .title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 24px; color: #4f46e5; display: flex; align-items: center; gap: 8px; }
          .box { background: #f8fafc; padding: 30px; border-radius: 20px; font-size: 14px; border: 1px solid #e2e8f0; line-height: 1.6; }
          .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
          .snapshot { width: 100%; border-radius: 20px; border: 4px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 32px; font-weight:800; text-transform:uppercase; letter-spacing: -0.02em;">NOVA Scientific Decision Memo</h1>
            <p style="opacity:0.6; margin:8px 0 0; font-size: 14px; font-weight: 600;">Run ID: ${result.reproducibility.runId} | Protein: ${currentProtein.name} (${currentProtein.id})</p>
            <div style="margin-top: 24px; display: flex; gap: 12px;">
              <span style="background: #4f46e5; padding: 4px 12px; border-radius: 8px; font-size: 10px; font-weight: 900; text-transform: uppercase;">Goal: ${goal}</span>
              <span style="background: rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 8px; font-size: 10px; font-weight: 900; text-transform: uppercase;">Risk: ${riskTolerance}</span>
            </div>
          </div>
          <div class="section">
            <div class="title">1. Executive Reasoning</div>
            <div class="box">${decisionMemo.summary}</div>
          </div>
          <div class="section">
            <div class="title">2. Thermodynamic Signature</div>
            <div class="box">
               <p style="margin:0; font-size: 18px; font-weight: 800; color: #4f46e5;">&Delta;&Delta;G: ${result.deltaDeltaG.toFixed(2)} kcal/mol</p>
               <p style="margin:4px 0 0; font-weight: 700; color: #64748b;">Stability Impact: ${result.stabilityImpact}</p>
               <p style="margin:16px 0 0; font-size: 13px;">${result.justification}</p>
            </div>
          </div>
          <div class="section">
            <div class="title">3. Structural Snapshots</div>
            <div class="grid">
              <div><p style="font-size: 10px; font-weight: 900; margin-bottom: 8px;">GLOBAL CONTEXT</p><img src="${full}" class="snapshot" /></div>
              <div><p style="font-size: 10px; font-weight: 900; margin-bottom: 8px;">LOCAL MUTATION SITE</p><img src="${zoomed}" class="snapshot" /></div>
            </div>
          </div>
          <div class="section" style="background: #f8fafc; border: 0;">
            <p style="margin:0; font-size: 10px; font-weight: 700; color: #94a3b8; text-align: center; text-transform: uppercase;">Generated via NOVA DECISION ENGINE v0.2.5v &bull; Scientific Audit Required</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NOVA_Report_${result.reproducibility.runId}.html`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-20 antialiased selection:bg-indigo-100">
      <nav className="bg-[#0f172a] text-white sticky top-0 z-50 shadow-2xl px-6 py-4 border-b border-indigo-500/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/30"><i className="fa-solid fa-dna text-lg"></i></div>
            <h1 className="text-xl font-black lowercase tracking-tight">novasciences <span className="text-indigo-400">0.2.5v</span></h1>
          </div>
          <div className="flex gap-3">
             {result && (
              <button onClick={downloadPIReport} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95">
                <i className="fa-solid fa-file-export"></i> Export Memo
              </button>
             )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        {!currentProtein && !isSearching && (
          <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center">
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight uppercase">System Resolution</h2>
              <p className="text-slate-500 text-lg font-medium">Select a validated system or resolve a custom protein identity.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
               {REFERENCE_PROTEINS.map(p => (
                 <div key={p.id} onClick={() => loadReference(p)} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer group">
                   <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all"><i className={`fa-solid ${p.icon} text-lg`}></i></div>
                   <h3 className="font-black text-slate-900 text-sm mb-2">{p.name}</h3>
                   <p className="text-[11px] text-slate-700 leading-relaxed font-semibold">{p.why}</p>
                 </div>
               ))}
            </div>
            <div className="pt-10 border-t-2 border-slate-100 flex flex-col items-center">
               <div className="flex w-full max-w-md gap-3">
                 <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="UniProt ID (e.g. P04637)..." className="flex-1 bg-white border-2 border-slate-200 py-4 px-6 rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" />
                 <button onClick={handleCustomSearch} className="bg-slate-900 text-white px-8 rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-600 shadow-lg transition-all">Resolve System</button>
               </div>
            </div>
          </div>
        )}

        {currentProtein && !isSearching && (
          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentProtein(null)} className="text-[10px] font-black uppercase text-slate-900 hover:text-indigo-600 flex items-center gap-2"><i className="fa-solid fa-arrow-left"></i> Systems Gallery</button>
              <div className="flex gap-2">
                <div className="bg-indigo-100 text-indigo-800 border-2 border-indigo-200 px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm">
                  {currentProtein.name} | {currentProtein.id}
                </div>
                {currentProtein.sourceType === 'AlphaFold' && (
                  <div className="bg-emerald-100 text-emerald-800 border-2 border-emerald-200 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">AlphaFold V4 Model</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Left Column: Controls */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-lg space-y-8">
                  <section>
                    <h4 className="text-[11px] font-black text-slate-900 uppercase mb-4 tracking-widest border-b-2 border-indigo-500 pb-2 inline-block">Analysis Environment</h4>
                    <div className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Scientific Objective</label>
                        <select 
                          value={goal} 
                          onChange={(e) => setGoal(e.target.value as ScientificGoal)} 
                          className="w-full bg-slate-50 border-2 border-slate-100 py-3 px-4 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-indigo-500 transition-all"
                        >
                          {Object.values(ScientificGoal).map(g => <option key={g} value={g} className="text-slate-900 font-bold">{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Decision Risk Tolerance</label>
                        <div className="grid grid-cols-3 gap-2">
                          {Object.values(RiskTolerance).map((rt) => (
                            <button 
                              key={rt} 
                              onClick={() => setRiskTolerance(rt)}
                              className={`py-2 rounded-lg text-[9px] font-black border-2 transition-all ${riskTolerance === rt ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-900 border-slate-100 hover:border-slate-300'}`}
                            >
                              {rt.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Preservation Constraint</label>
                        <input 
                          type="text" 
                          value={preserveRegions} 
                          onChange={(e) => setPreserveRegions(e.target.value)} 
                          placeholder="e.g. 100-120, Active Site" 
                          className={`w-full bg-slate-50 border-2 py-3 px-4 rounded-xl text-xs font-black text-slate-900 outline-none transition-all ${warning ? 'border-rose-400 focus:border-rose-600' : 'border-slate-100 focus:border-indigo-500'}`} 
                        />
                        {warning && <p className="text-[9px] text-rose-600 font-black uppercase mt-1 animate-pulse">{warning}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Experiment Context</label>
                        <input 
                          type="text" 
                          value={environment} 
                          onChange={(e) => setEnvironment(e.target.value)} 
                          placeholder="Standard physiological conditions" 
                          className="w-full bg-slate-50 border-2 border-slate-100 py-3 px-4 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-indigo-500" 
                        />
                      </div>
                    </div>
                  </section>

                  <section className="pt-4 border-t-2 border-slate-50">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase mb-4 tracking-widest border-b-2 border-rose-500 pb-2 inline-block">Mutation Identity</h4>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                       <input type="text" value={mutation.wildtype} onChange={(e) => setMutation({...mutation, wildtype: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-slate-100 py-3 rounded-xl text-center text-xs font-black text-slate-900" placeholder="WT" />
                       <input type="number" value={mutation.position} onChange={(e) => setMutation({...mutation, position: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border-2 border-slate-100 py-3 rounded-xl text-center text-xs font-black text-slate-900" />
                       <input type="text" value={mutation.mutant} onChange={(e) => setMutation({...mutation, mutant: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-slate-100 py-3 rounded-xl text-center text-xs font-black text-slate-900" placeholder="MUT" />
                    </div>
                    <button 
                      onClick={handlePredict} 
                      disabled={isPredicting || !!warning} 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      {isPredicting ? <i className="fa-solid fa-microchip fa-spin"></i> : <><i className="fa-solid fa-bolt"></i> Synthesize Analysis</>}
                    </button>
                  </section>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-lg">
                  <DecisionLog entries={logEntries} onUpdateEntry={updateLogEntry} onRestore={restoreLogContext} />
                </div>
              </div>

              {/* Right Column: Results & Viewer */}
              <div className="lg:col-span-8 space-y-10">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-stretch">
                  <div className="xl:col-span-7">
                    <ProteinViewer ref={viewerHandleRef} uniprotId={currentProtein.id} pdbId={currentProtein.pdbId} mutation={mutation} />
                  </div>
                  <div className="xl:col-span-5 flex flex-col gap-6">
                    {result ? <MutationCard result={result} /> : (
                      <div className="flex-1 bg-white border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center text-slate-300">
                        <i className="fa-solid fa-robot text-5xl mb-6 opacity-50"></i>
                        <h4 className="text-[12px] font-black uppercase tracking-widest mb-2">Engine Disengaged</h4>
                        <p className="text-[10px] font-bold max-w-[200px] leading-relaxed text-slate-400">Specify a mutation identity to initialize the decision loop.</p>
                      </div>
                    )}
                    
                    {currentProtein.suggestedMutations && (
                      <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-lg">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Suggested Exploration Targets</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {currentProtein.suggestedMutations.map((sm, idx) => (
                            <button 
                              key={idx} 
                              onClick={() => parseMutationString(`${sm.residue}${sm.position}${sm.residue === 'A' ? 'G' : 'A'}`)}
                              className="bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 p-3 rounded-xl text-left transition-all group"
                            >
                              <div className="text-[11px] font-black text-slate-900">{sm.residue}{sm.position} <i className="fa-solid fa-arrow-right opacity-0 group-hover:opacity-100 ml-1 text-indigo-500"></i></div>
                              <div className="text-[8px] font-bold text-slate-400 truncate">{sm.rationale}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {decisionMemo && (
                  <DecisionMemo 
                    memo={decisionMemo} 
                    goal={goal} 
                    onSelectMutation={(mut) => parseMutationString(mut)} 
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {isSearching && (
          <div className="h-96 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-500/10 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center"><i className="fa-solid fa-dna text-indigo-200 animate-pulse"></i></div>
            </div>
            <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest animate-pulse">Resolving Atomic Identity...</p>
          </div>
        )}

        {error && (
          <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 z-50 border-2 border-indigo-500 max-w-md animate-slide-in">
             <i className="fa-solid fa-terminal text-2xl text-rose-500"></i>
             <div className="flex flex-col">
               <span className="text-[9px] font-black uppercase tracking-widest opacity-60">System Fault Detected</span>
               <div className="text-[11px] font-bold uppercase">{error}</div>
             </div>
             <button onClick={() => setError(null)} className="ml-4 shrink-0 hover:text-rose-400 transition-colors"><i className="fa-solid fa-xmark"></i></button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;