
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

const APP_VERSION = '0.2.5v-stable';
const SESSION_KEY = 'novasciences_session_v025_bench_mode';
const LOGS_KEY = 'novasciences_logs_v025_bench_mode';
const VERSION_KEY = 'novasciences_app_version';

type DashboardTab = 'analysis' | 'roadmap';

const App: React.FC = () => {
  useEffect(() => {
    try {
      const savedVersion = localStorage.getItem(VERSION_KEY);
      if (savedVersion !== APP_VERSION) {
        localStorage.clear();
        localStorage.setItem(VERSION_KEY, APP_VERSION);
      }
    } catch (e) { console.warn("Version check failed", e); }
  }, []);

  const [logEntries, setLogEntries] = useState<DecisionLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LOGS_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  });
  
  const [auditTrail, setAuditTrail] = useState<SystemAuditTrail>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.events)) return parsed;
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
    try { localStorage.setItem(LOGS_KEY, JSON.stringify(logEntries)); } catch(e) {}
  }, [logEntries]);

  useEffect(() => {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(auditTrail)); } catch(e) {}
  }, [auditTrail]);

  const logEvent = (feature: string, details: string) => {
    const timestamp = new Date().toISOString();
    setAuditTrail(prev => {
      const events = Array.isArray(prev?.events) ? prev.events : [];
      return { ...prev, events: [...events, { timestamp, feature, details }] };
    });
  };

  // Fixed missing loadReference function to resolve reference systems
  const loadReference = async (ref: ReferenceProtein) => {
    setIsSearching(true);
    setError(null);
    try {
      const metadata = await searchProtein(ref.name);
      setCurrentProtein({
        ...metadata,
        isValidatedReference: true,
        referenceContext: ref.context,
        pdbId: ref.pdbId || metadata.pdbId
      });
      logEvent('REFERENCE_LOAD', `Resolved ${ref.name} context via synthesis`);
    } catch (err: any) {
      setError(`Failed to load reference: ${err.message}`);
      logEvent('REFERENCE_LOAD_FAIL', `Error resolving ${ref.name}`);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const combined = logEntries
      .filter(e => e && e.outcome !== 'Not Tested Yet')
      .map(e => ({ 
        mutation: e.mutationTested || 'Unknown', 
        outcome: (e.outcome as any) || 'Neutral',
        notes: e.userNotes || ''
      }));
    setPriorResults(combined);
  }, [logEntries]);

  const handlePredict = async () => {
    if (!currentProtein || isPredicting) return;
    
    setIsPredicting(true);
    setIsRevealing(false);
    setHasViewedResults(false); 
    setError(null);
    setResult(null);
    setDecisionMemo(null);
    setShowSuccessToast(false);
    
    console.log("NOVA Predict Clicked:", mutation);
    
    try {
      const [pred, memo] = await Promise.all([
        predictMutation(currentProtein, mutation, goal, priorResults, riskTolerance, preserveRegions, environment),
        generateDecisionMemo(currentProtein, goal, logEntries, riskTolerance, preserveRegions, environment)
      ]);

      if (!pred || !memo) throw new Error("Synthesis failed to generate molecular data structure.");

      // DEFENSIVE STATE UPDATES
      try {
        setResult(pred);
        setDecisionMemo(memo);
        setIsRevealing(true);
        setHasNewRoadmap(true);
        setShowSuccessToast(true);

        let capturedSnapshots = { full: '', zoomed: '' };
        if (viewerHandleRef.current) {
          try { capturedSnapshots = viewerHandleRef.current.getSnapshots(); } catch (e) {}
        }

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
        logEvent('PREDICTION_SUCCESS', 'Analysis stable');
        
        setTimeout(() => {
          resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      } catch (renderError: any) {
        console.error("UI Render Crash during synthesis:", renderError);
        setError(`Render Failure: ${renderError.message || "Failed to build the result cards."}`);
      }

    } catch (err: any) {
      console.error("Synthesis Fault:", err);
      setError(`Analysis Error: ${err.message || "The synthesis engine failed."}`);
      logEvent('SYSTEM_FAULT', 'Inference error');
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
    setGoal(entry.goal || ScientificGoal.STABILITY);
    setRiskTolerance(entry.riskTolerance || RiskTolerance.MEDIUM);
    setPreserveRegions(entry.preserveRegions || '');
    setEnvironment(entry.environment || '');
    setResult(entry.prediction || null);
    setDecisionMemo(entry.memo || null);
    setIsRevealing(true);
    setActiveTab('analysis');
    
    const mutMatch = (entry.mutationTested || '').match(/([A-Z])(\d+)([A-Z])/i);
    if (mutMatch) {
       setMutation({ wildtype: mutMatch[1].toUpperCase(), position: parseInt(mutMatch[2]), mutant: mutMatch[3].toUpperCase() });
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
             <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-rose-400 hover:text-rose-300 text-[10px] font-black uppercase px-4 py-2 rounded-xl hover:bg-rose-500/10 transition-all">Emergency Reset</button>
             {logEntries.length > 0 && (
              <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95 text-white">
                <i className="fa-solid fa-file-export"></i> Print Report
              </button>
             )}
          </div>
        </div>
      </nav>

      {showSuccessToast && result && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-500">
           <div className="bg-indigo-600 text-white px-10 py-5 rounded-[2.5rem] shadow-2xl border-4 border-white/20 flex items-center gap-8">
              <div className="flex flex-col">
                 <h4 className="text-[16px] font-black uppercase tracking-[0.2em] mb-1">Analysis Ready</h4>
                 <p className="text-[12px] font-bold opacity-90 tracking-wide">{result.mutation} predicted.</p>
              </div>
              <button onClick={scrollToResult} className="bg-white text-indigo-600 px-8 py-3 rounded-2xl text-[11px] font-black uppercase shadow-xl active:scale-95">Inspect <i className="fa-solid fa-arrow-down ml-2"></i></button>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 pt-10 space-y-20">
        {!currentProtein && !isSearching && (
          <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center">
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight uppercase">System Resolution</h2>
              <p className="text-slate-500 text-lg font-medium">Select a system below to begin atomic simulation.</p>
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
          </div>
        )}

        {currentProtein && !isSearching && (
          <>
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <button onClick={() => setCurrentProtein(null)} className="text-[10px] font-black uppercase text-slate-900 hover:text-indigo-600 flex items-center gap-2"><i className="fa-solid fa-arrow-left"></i> Back</button>
                <div className="flex items-center gap-3">
                   <div className="bg-indigo-100 text-indigo-800 border-2 border-indigo-200 px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm">
                     {currentProtein.name} | {currentProtein.id}
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-lg space-y-6">
                    <section>
                      <h4 className="text-[11px] font-black text-slate-900 uppercase mb-4 border-b-2 border-indigo-500 pb-2 inline-block tracking-widest">Target Params</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Objective</label>
                          <select value={goal} onChange={(e) => setGoal(e.target.value as ScientificGoal)} className="w-full bg-slate-50 border-2 border-slate-100 py-3 px-4 rounded-xl text-xs font-black text-slate-900 outline-none">
                            {Object.values(ScientificGoal).map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                      </div>
                    </section>
                    <section className="pt-4 border-t-2 border-slate-50">
                      <h4 className="text-[11px] font-black text-slate-900 uppercase mb-4 border-b-2 border-rose-500 pb-2 inline-block tracking-widest">Mutation</h4>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                         <input type="text" value={mutation.wildtype} onChange={(e) => setMutation({...mutation, wildtype: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-slate-100 py-3 rounded-xl text-center text-xs font-black text-slate-900" />
                         <input type="number" value={mutation.position} onChange={(e) => setMutation({...mutation, position: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border-2 border-slate-100 py-3 rounded-xl text-center text-xs font-black text-slate-900" />
                         <input type="text" value={mutation.mutant} onChange={(e) => setMutation({...mutation, mutant: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-slate-100 py-3 rounded-xl text-center text-xs font-black text-slate-900" />
                      </div>
                      <button onClick={handlePredict} disabled={isPredicting} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white py-5 rounded-2xl font-black text-[11px] uppercase shadow-xl transition-all">
                        {isPredicting ? "Analyzing..." : "Synthesis Analysis"}
                      </button>
                    </section>
                  </div>
                  <DecisionLog entries={logEntries} onUpdateEntry={(id, updates) => setLogEntries(prev => prev.map(e => e.id === id ? {...e, ...updates} : e))} onRestore={restoreLogContext} />
                </div>

                <div className="lg:col-span-8 space-y-6">
                  <ProteinViewer 
                    ref={viewerHandleRef} 
                    uniprotId={currentProtein.id} 
                    pdbId={currentProtein.pdbId} 
                    mutation={mutation} 
                    showIdealizedMutant={showIdealizedMutant}
                  />
                </div>
              </div>
            </div>

            <div ref={resultsContainerRef} className="pt-20 border-t-8 border-slate-100 scroll-mt-24">
              <div className="flex bg-white rounded-[2rem] p-2 border-2 border-slate-100 shadow-2xl gap-2 w-full max-w-2xl mx-auto mb-10 sticky top-[80px] z-50">
                <button onClick={() => setActiveTab('analysis')} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${activeTab === 'analysis' ? 'bg-[#0f172a] text-white' : 'text-slate-400'}`}>Atomic Simulation</button>
                <button onClick={() => setActiveTab('roadmap')} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${activeTab === 'roadmap' ? 'bg-[#0f172a] text-white' : 'text-slate-400'}`}>Strategic Roadmap</button>
              </div>

              <div className="w-full min-h-[400px]">
                {activeTab === 'analysis' ? (
                  <div className={`transition-all duration-700 ${isRevealing ? 'opacity-100' : 'opacity-0'}`}>
                    {result ? <MutationCard result={result} /> : <div className="p-20 text-center text-slate-300 font-black uppercase">Result Pending Synthesis...</div>}
                  </div>
                ) : (
                  <div className="duration-700">
                    {decisionMemo ? <DecisionMemo memo={decisionMemo} goal={goal} /> : <div className="p-20 text-center text-slate-300 font-black uppercase">Roadmap Pending...</div>}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {isSearching && <div className="h-96 flex flex-col items-center justify-center font-black uppercase tracking-[0.4em] animate-pulse">Resolving molecular identity...</div>}
        {error && <div className="fixed bottom-12 right-12 bg-rose-600 text-white px-10 py-6 rounded-3xl shadow-2xl z-[110] border-4 border-white flex items-center gap-6"><i className="fa-solid fa-triangle-exclamation text-2xl"></i><span className="font-black uppercase text-xs">{error}</span><button onClick={() => setError(null)} className="ml-4 opacity-50"><i className="fa-solid fa-xmark"></i></button></div>}
      </main>
    </div>
  );
};

export default App;
