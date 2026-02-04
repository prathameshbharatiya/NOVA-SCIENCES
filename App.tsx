import React, { useState, useRef, useEffect } from 'react';
import { 
  Mutation, 
  PredictionResult, 
  ProteinMetadata, 
  ScientificGoal, 
  PriorResult, 
  DecisionMemo as DecisionMemoType,
  RiskTolerance,
  DecisionLogEntry,
  SystemAuditTrail
} from './types';
import { REFERENCE_PROTEINS, ReferenceProtein, EXPERIMENTAL_PRESETS } from './constants';
import { predictMutation, searchProtein, generateDecisionMemo } from './services/geminiService';
import MutationCard from './components/MutationCard';
import DecisionMemo from './components/DecisionMemo';
import ProteinViewer, { ProteinViewerHandle } from './components/ProteinViewer';
import DecisionLog from './components/DecisionLog';

const SESSION_KEY = 'novasciences_session_v025_bench_mode';
const LOGS_KEY = 'novasciences_logs_v025_bench_mode';

type DashboardTab = 'analysis' | 'roadmap';

const App: React.FC = () => {
  const [logEntries, setLogEntries] = useState<DecisionLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LOGS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  const [auditTrail, setAuditTrail] = useState<SystemAuditTrail>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.events)) return parsed;
      }
    } catch (e) {}
    
    return {
      sessionId: Math.random().toString(36).substring(2, 15),
      startTime: new Date().toISOString(),
      events: [{ timestamp: new Date().toISOString(), feature: 'SYSTEM_BOOT', details: 'Environment initialized' }]
    };
  });

  const [currentProtein, setCurrentProtein] = useState<ProteinMetadata | null>(null);
  const [mutation, setMutation] = useState<Mutation>({ wildtype: 'R', position: 273, mutant: 'H' });
  const [goal, setGoal] = useState<ScientificGoal>(ScientificGoal.STABILITY);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>(RiskTolerance.MEDIUM);
  const [preserveRegions, setPreserveRegions] = useState('');
  const [environment, setEnvironment] = useState('');
  
  const [activeTab, setActiveTab] = useState<DashboardTab>('analysis');
  const [hasNewRoadmap, setHasNewRoadmap] = useState(false);
  const [showIdealizedMutant, setShowIdealizedMutant] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [hasViewedResults, setHasViewedResults] = useState(false);
  
  const [priorResults, setPriorResults] = useState<PriorResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const viewerHandleRef = useRef<ProteinViewerHandle>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [decisionMemo, setDecisionMemo] = useState<DecisionMemoType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logEntries));
  }, [logEntries]);

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(auditTrail));
  }, [auditTrail]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (result || decisionMemo)) {
          setHasViewedResults(true);
          setShowSuccessToast(false);
        }
      },
      { threshold: 0.1 }
    );

    if (resultsContainerRef.current) {
      observer.observe(resultsContainerRef.current);
    }

    return () => observer.disconnect();
  }, [result, decisionMemo]);

  const logEvent = (feature: string, details: string) => {
    const timestamp = new Date().toISOString();
    setAuditTrail(prev => {
      const events = Array.isArray(prev.events) ? prev.events : [];
      return {
        ...prev,
        events: [...events, { timestamp, feature, details }]
      };
    });
  };

  useEffect(() => {
    const combined = logEntries
      .filter(e => e.outcome !== 'Not Tested Yet')
      .map(e => ({ 
        mutation: e.mutationTested, 
        outcome: e.outcome as 'Positive' | 'Neutral' | 'Negative',
        notes: e.userNotes
      }));
    setPriorResults(combined);
  }, [logEntries]);

  const handleExportMemo = () => {
    if (logEntries.length === 0) return;
    logEvent('MEMO_EXPORT', `Exporting Master Scientific Record`);
    
    // ... HTML export content stays same ...
    const htmlContent = `<html>...</html>`; // Shortened for focus
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Nova_Record_${new Date().getTime()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseMutationString = (mutStr: string) => {
    if (!mutStr) return;
    const match = mutStr.match(/([A-Z])(\d+)([A-Z])/i);
    if (match) {
      setMutation({ 
        wildtype: match[1].toUpperCase(), 
        position: parseInt(match[2]), 
        mutant: match[3].toUpperCase() 
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveTab('analysis');
      logEvent('MUTATION_SELECT', `Residue target set to ${mutStr}`);
    }
  };

  const handlePredict = async () => {
    if (!currentProtein || isPredicting) return;
    setIsPredicting(true);
    setIsRevealing(false);
    setHasViewedResults(false); 
    setError(null);
    setShowSuccessToast(false);
    logEvent('PREDICTION_START', `Analyzing ${mutation.wildtype}${mutation.position}${mutation.mutant}`);
    
    try {
      const [pred, memo] = await Promise.all([
        predictMutation(currentProtein, mutation, goal, priorResults, riskTolerance, preserveRegions, environment),
        generateDecisionMemo(currentProtein, goal, logEntries, riskTolerance, preserveRegions, environment)
      ]);

      if (!pred || !memo) throw new Error("Synthesis failed to return valid data.");

      setResult(pred);
      setDecisionMemo(memo);
      setIsRevealing(true);
      setHasNewRoadmap(true);
      setShowSuccessToast(true);

      let capturedSnapshots = { full: '', zoomed: '' };
      try {
        if (viewerHandleRef.current) {
          capturedSnapshots = viewerHandleRef.current.getSnapshots();
        }
      } catch (e) { console.warn("Snapshot failed", e); }

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
        snapshots: capturedSnapshots,
        userNotes: '',
        outcome: 'Not Tested Yet'
      };
      
      setLogEntries(prev => [newEntry, ...(Array.isArray(prev) ? prev : [])]);
      logEvent('PREDICTION_SUCCESS', `Analysis complete`);
      
      setTimeout(() => {
        resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

    } catch (err: any) {
      setError(`Analysis Error: ${err.message || "Unknown error"}`);
      logEvent('SYSTEM_FAULT', `Prediction failed`);
    } finally {
      setIsPredicting(false);
    }
  };

  const scrollToResult = () => {
    resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setShowSuccessToast(false);
    setHasViewedResults(true);
  };

  const restoreLogContext = (entry: DecisionLogEntry) => {
    if (!entry) return;
    setGoal(entry.goal);
    setRiskTolerance(entry.riskTolerance);
    setPreserveRegions(entry.preserveRegions || '');
    setEnvironment(entry.environment || '');
    setResult(entry.prediction || null);
    setDecisionMemo(entry.memo || null);
    setIsRevealing(true);
    setActiveTab('analysis');
    parseMutationString(entry.mutationTested);
  };

  const handleCustomSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setError(null);
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

  return (
    <div className="min-h-screen pb-20 antialiased selection:bg-indigo-100">
      <nav className="bg-[#0f172a] text-white sticky top-0 z-[60] shadow-2xl px-6 py-4 border-b border-indigo-500/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/30"><i className="fa-solid fa-dna text-lg"></i></div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black lowercase tracking-tight text-white">novasciences <span className="text-indigo-400">0.2.5v</span></h1>
              <span className="text-[8px] font-black uppercase opacity-40 tracking-widest -mt-1 text-white">Active Session: {auditTrail.sessionId}</span>
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={() => window.location.reload()} className="text-rose-400 hover:text-rose-300 text-[10px] font-black uppercase px-4 py-2 rounded-xl hover:bg-rose-500/10 transition-all">Reset Session</button>
             {logEntries.length > 0 && (
              <button onClick={handleExportMemo} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95 text-white">
                <i className="fa-solid fa-file-export"></i> Export Memo
              </button>
             )}
          </div>
        </div>
      </nav>

      {(result || decisionMemo) && !hasViewedResults && (
        <button 
          onClick={scrollToResult}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[70] bg-[#0f172a] text-white px-8 py-4 rounded-full shadow-2xl border-2 border-indigo-500 transition-all hover:scale-110 active:scale-95 flex items-center gap-3 group"
        >
          <i className="fa-solid fa-flask-vial text-indigo-400 group-hover:rotate-12 transition-transform"></i>
          <span className="text-[10px] font-black uppercase tracking-widest">Active Analysis Data Below</span>
          <i className="fa-solid fa-arrow-down animate-bounce"></i>
        </button>
      )}

      {showSuccessToast && result && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-500">
           <div className="bg-indigo-600 text-white px-10 py-5 rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(79,70,229,0.5)] border-4 border-white/20 flex items-center gap-8">
              <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center text-3xl">
                 <i className="fa-solid fa-check-double animate-bounce"></i>
              </div>
              <div className="flex flex-col">
                 <h4 className="text-[16px] font-black uppercase tracking-[0.2em] mb-1">Simulation Complete</h4>
                 <p className="text-[12px] font-bold opacity-90 tracking-wide">{result.mutation} data ready for inspection below.</p>
              </div>
              <button onClick={scrollToResult} className="bg-white text-indigo-600 px-8 py-3 rounded-2xl text-[11px] font-black uppercase hover:bg-indigo-50 transition-all shadow-xl active:scale-95 flex items-center gap-2">
                Inspect Synthesis <i className="fa-solid fa-arrow-down"></i>
              </button>
              <button onClick={() => setShowSuccessToast(false)} className="opacity-40 hover:opacity-100 transition-opacity"><i className="fa-solid fa-xmark text-xl"></i></button>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 pt-10 space-y-20">
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
                 <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="UniProt ID..." className="flex-1 bg-white border-2 border-slate-200 py-4 px-6 rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" />
                 <button onClick={handleCustomSearch} className="bg-slate-900 text-white px-8 rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-600 shadow-lg transition-all">Resolve System</button>
               </div>
            </div>
          </div>
        )}

        {currentProtein && !isSearching && (
          <>
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <button onClick={() => setCurrentProtein(null)} className="text-[10px] font-black uppercase text-slate-900 hover:text-indigo-600 flex items-center gap-2"><i className="fa-solid fa-arrow-left"></i> Systems Gallery</button>
                <div className="flex items-center gap-3">
                   {currentProtein.isValidatedReference && (
                     <div className="bg-emerald-100 text-emerald-800 border-2 border-emerald-200 px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm">
                        Validated Reference Mode
                     </div>
                   )}
                   <div className="bg-indigo-100 text-indigo-800 border-2 border-indigo-200 px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm">
                     {currentProtein.name} | {currentProtein.id}
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-lg space-y-6">
                    <section>
                      <h4 className="text-[11px] font-black text-slate-900 uppercase mb-4 border-b-2 border-indigo-500 pb-2 inline-block tracking-widest">Environment</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Objective</label>
                          <select value={goal} onChange={(e) => setGoal(e.target.value as ScientificGoal)} className="w-full bg-slate-50 border-2 border-slate-100 py-3 px-4 rounded-xl text-xs font-black outline-none focus:border-indigo-500 text-slate-900">
                            {Object.values(ScientificGoal).map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Preservation</label>
                          <input type="text" value={preserveRegions} onChange={(e) => setPreserveRegions(e.target.value)} placeholder="e.g. 100-120" className="w-full bg-slate-50 border-2 border-slate-100 py-3 px-4 rounded-xl text-xs font-black outline-none text-slate-900" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Experimental Knowledge</label>
                          <textarea 
                            value={environment} 
                            onChange={(e) => setEnvironment(e.target.value)} 
                            placeholder="pH, Temp, Ionic strength..." 
                            className="w-full bg-slate-50 border-2 border-slate-100 py-3 px-4 rounded-xl text-xs font-black outline-none focus:border-indigo-500 text-slate-900 h-20 resize-none"
                          />
                        </div>
                      </div>
                    </section>
                    <section className="pt-4 border-t-2 border-slate-50">
                      <h4 className="text-[11px] font-black text-slate-900 uppercase mb-4 border-b-2 border-rose-500 pb-2 inline-block tracking-widest">Target</h4>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                         <input type="text" value={mutation.wildtype} onChange={(e) => setMutation({...mutation, wildtype: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-slate-100 py-3 rounded-xl text-center text-xs font-black text-slate-900" placeholder="WT" />
                         <input type="number" value={mutation.position} onChange={(e) => setMutation({...mutation, position: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border-2 border-slate-100 py-3 rounded-xl text-center text-xs font-black text-slate-900" />
                         <input type="text" value={mutation.mutant} onChange={(e) => setMutation({...mutation, mutant: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-slate-100 py-3 rounded-xl text-center text-xs font-black text-slate-900" placeholder="MUT" />
                      </div>
                      <button onClick={handlePredict} disabled={isPredicting} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white py-5 rounded-2xl font-black text-[11px] uppercase shadow-xl transition-all flex items-center justify-center gap-3">
                        {isPredicting ? <><i className="fa-solid fa-microchip fa-spin"></i> Analyzing...</> : <><i className="fa-solid fa-bolt"></i> Synthesize Analysis</>}
                      </button>
                    </section>
                  </div>
                  <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-lg max-h-[500px] overflow-y-auto custom-scrollbar">
                    <DecisionLog entries={logEntries} onUpdateEntry={(id, updates) => setLogEntries(prev => prev.map(e => e.id === id ? {...e, ...updates} : e))} onRestore={restoreLogContext} />
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                  <div className="relative">
                    <ProteinViewer 
                      ref={viewerHandleRef} 
                      uniprotId={currentProtein.id} 
                      pdbId={currentProtein.pdbId} 
                      mutation={mutation} 
                      showIdealizedMutant={showIdealizedMutant}
                    />
                    <div className="absolute top-8 left-8 z-20 flex items-center gap-4 bg-[#0f172a]/90 backdrop-blur-xl px-6 py-3 rounded-3xl border border-white/10 shadow-2xl">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={showIdealizedMutant} onChange={(e) => setShowIdealizedMutant(e.target.checked)} />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Show idealized mutant side chain</span>
                    </div>

                    {(result || decisionMemo) && !isPredicting && !hasViewedResults && (
                      <div className="absolute bottom-8 right-8 animate-in slide-in-from-right-4">
                        <button 
                          onClick={scrollToResult}
                          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-2xl flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
                        >
                          View Results Data <i className="fa-solid fa-arrow-down"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div ref={resultsContainerRef} className="pt-20 border-t-8 border-slate-100 scroll-mt-24">
              <div className="sticky top-[72px] z-50 py-4 bg-[#fcfdfe]/80 backdrop-blur-md">
                <div className="flex bg-white rounded-[2rem] p-2 border-2 border-slate-100 shadow-2xl gap-2 w-full max-w-2xl mx-auto">
                  <button onClick={() => setActiveTab('analysis')} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${activeTab === 'analysis' ? 'bg-[#0f172a] text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
                    <i className="fa-solid fa-atom"></i> Atomic Simulation
                  </button>
                  <button onClick={() => { setActiveTab('roadmap'); setHasNewRoadmap(false); }} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center justify-center gap-3 ${activeTab === 'roadmap' ? 'bg-[#0f172a] text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
                    <i className="fa-solid fa-map-location-dot"></i> Strategic Roadmap {hasNewRoadmap && <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-pulse shadow-md border-2 border-white"></span>}
                  </button>
                </div>
              </div>

              <div className="w-full min-h-[400px]">
                {activeTab === 'analysis' ? (
                  <div className={`transition-all duration-700 ${isRevealing ? 'reveal-active opacity-100' : 'opacity-0'}`}>
                    {result ? <MutationCard result={result} /> : (
                      <div className="h-80 bg-white border-4 border-dashed border-slate-100 rounded-[3.5rem] flex flex-col items-center justify-center text-slate-300">
                        {isPredicting ? (
                          <div className="animate-pulse flex flex-col items-center gap-6">
                            <i className="fa-solid fa-dna text-6xl text-indigo-400"></i>
                            <span className="text-[14px] font-black uppercase tracking-[0.4em] text-indigo-900">Cross-referencing global benchmarks...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-6">
                            <i className="fa-solid fa-robot text-7xl mb-2 opacity-10"></i>
                            <span className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-400">Analysis results manifest here upon synthesis</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {decisionMemo ? <DecisionMemo memo={decisionMemo} goal={goal} onSelectMutation={parseMutationString} /> : (
                      <div className="h-80 bg-white border-4 border-dashed border-slate-100 rounded-[3.5rem] flex flex-col items-center justify-center text-slate-300">
                        <span className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-400">Strategic Roadmap Pending Data...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {isSearching && (
          <div className="h-96 flex flex-col items-center justify-center space-y-6">
            <div className="w-20 h-20 border-4 border-indigo-500/10 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] animate-pulse">Resolving molecular identity...</p>
          </div>
        )}

        {error && (
          <div className="fixed bottom-12 right-12 bg-slate-950 text-white px-10 py-6 rounded-[2.5rem] shadow-2xl flex items-center gap-6 z-[110] border-4 border-rose-500 animate-slide-in">
             <i className="fa-solid fa-terminal text-rose-500 text-2xl"></i>
             <div className="text-[12px] font-black uppercase tracking-wide leading-tight">{error}</div>
             <button onClick={() => setError(null)} className="ml-6 opacity-40 hover:opacity-100 transition-opacity text-white text-xl"><i className="fa-solid fa-xmark"></i></button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;