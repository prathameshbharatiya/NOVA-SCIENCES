import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { REFERENCE_PROTEINS, ReferenceProtein } from './constants';
import { predictMutation, searchProtein, generateDecisionMemo } from './services/geminiService';
import MutationCard from './components/MutationCard';
import DecisionMemo from './components/DecisionMemo';
import ProteinViewer, { ProteinViewerHandle } from './components/ProteinViewer';
import DecisionLog from './components/DecisionLog';

const APP_VERSION = '0.2.5v-stable';
const SESSION_KEY = 'novasciences_session_v025_bench_mode';
const LOGS_KEY = 'novasciences_logs_v025_bench_mode';
const USAGE_HISTORY_KEY = 'novasciences_mutation_history_v1';
const VERSION_KEY = 'novasciences_app_version';

type DashboardTab = 'analysis' | 'roadmap';

const App: React.FC = () => {
  useEffect(() => {
    try {
      const savedVersion = localStorage.getItem(VERSION_KEY);
      if (savedVersion !== APP_VERSION) {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LOGS_KEY);
        localStorage.setItem(VERSION_KEY, APP_VERSION);
      }
    } catch (e) { console.warn(e); }
  }, []);

  const [logEntries, setLogEntries] = useState<DecisionLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LOGS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [auditTrail, setAuditTrail] = useState<SystemAuditTrail>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    
    return {
      sessionId: Math.random().toString(36).substring(2, 15),
      startTime: new Date().toISOString(),
      events: [{ timestamp: new Date().toISOString(), feature: 'SYSTEM_BOOT', details: 'Environment initialized' }]
    };
  });

  const [mutationHistory, setMutationHistory] = useState<Record<string, Mutation>>(() => {
    try {
      const saved = localStorage.getItem(USAGE_HISTORY_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
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
  const [isSyncing, setIsSyncing] = useState(false);
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

  useEffect(() => {
    try { localStorage.setItem(USAGE_HISTORY_KEY, JSON.stringify(mutationHistory)); } catch(e) {}
  }, [mutationHistory]);

  const logEvent = (feature: string, details: string) => {
    const timestamp = new Date().toISOString();
    setAuditTrail(prev => ({
      ...prev,
      events: [...prev.events, { timestamp, feature, details }]
    }));
  };

  const parseMutationString = (mutStr: string) => {
    if (!mutStr) return;
    const match = mutStr.match(/([A-Z])(\d+)([A-Z])/i);
    if (match) {
      setMutation({ wildtype: match[1].toUpperCase(), position: parseInt(match[2]), mutant: match[3].toUpperCase() });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /**
   * Helper to derive the best default mutation for a given protein.
   * Logic: User History > Canonical Default > First Suggested > Wild-type Only
   */
  const getContextualMutation = (protein: ProteinMetadata): Mutation => {
    // 1. Check user usage history for this specific protein
    if (mutationHistory[protein.id]) {
      return mutationHistory[protein.id];
    }

    // 2. Check for hardcoded canonical mutation (for reference proteins)
    const ref = REFERENCE_PROTEINS.find(rp => rp.id === protein.id);
    if (ref?.canonicalMutation) {
      return ref.canonicalMutation;
    }

    // 3. Check suggested mutations from resolution
    if (protein.suggestedMutations && protein.suggestedMutations.length > 0) {
      const sug = protein.suggestedMutations[0];
      return { wildtype: '', position: sug.position, mutant: sug.residue };
    }

    // 4. Clean fallback
    return { wildtype: '', position: 1, mutant: '' };
  };

  const loadReference = (p: ReferenceProtein) => {
    setIsSearching(true);
    const metadata: ProteinMetadata = {
      id: p.id,
      pdbId: p.pdbId,
      name: p.name,
      description: p.relevance,
      length: 0,
      sourceType: 'Demo',
      structureStatus: 'available',
      isValidatedReference: true,
      referenceContext: p.context
    };
    setCurrentProtein(metadata);
    setMutation(getContextualMutation(metadata));
    setSearchQuery('');
    setIsSearching(false);
    logEvent('LOAD_REFERENCE', `Loaded reference system: ${p.id}`);
  };

  const handleCustomSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const proteinData = await searchProtein(searchQuery);
      setCurrentProtein(proteinData);
      setMutation(getContextualMutation(proteinData));
    } catch (err: any) {
      setError(`Search Failed: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const isMutationSuggested = useMemo(() => {
    if (!currentProtein) return false;
    const contextual = getContextualMutation(currentProtein);
    return mutation.wildtype === contextual.wildtype && 
           mutation.position === contextual.position && 
           mutation.mutant === contextual.mutant;
  }, [currentProtein, mutation, mutationHistory]);

  useEffect(() => {
    const combined = logEntries.map(e => ({ 
      mutation: e.mutationTested, 
      outcome: e.outcome,
      notes: e.userNotes,
      assayType: e.assayType,
      resourceIntensity: e.resourceIntensity,
      timeRequired: e.timeRequired
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
    
    try {
      const [pred, memo] = await Promise.all([
        predictMutation(currentProtein, mutation, goal, priorResults, riskTolerance, preserveRegions, environment),
        generateDecisionMemo(currentProtein, goal, logEntries, riskTolerance, preserveRegions, environment)
      ]);

      setResult(pred);
      setDecisionMemo(memo);
      setIsRevealing(true);
      setHasNewRoadmap(true);
      setShowSuccessToast(true);

      // Save usage history
      setMutationHistory(prev => ({
        ...prev,
        [currentProtein.id]: mutation
      }));

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
        userNotes: '',
        outcome: 'Not Tested Yet'
      };
      
      setLogEntries(prev => [newEntry, ...prev]);
      setActiveTab('analysis');

      setTimeout(() => {
        resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);

    } catch (err: any) {
      setError(`System Fault: ${err.message || "Synthesis engine failed."}`);
    } finally {
      setIsPredicting(false);
    }
  };

  const syncIntelligence = async () => {
    if (!currentProtein || isSyncing) return;
    setIsSyncing(true);
    try {
      const memo = await generateDecisionMemo(currentProtein, goal, logEntries, riskTolerance, preserveRegions, environment);
      setDecisionMemo(memo);
      setHasNewRoadmap(true);
      logEvent('INTELLIGENCE_SYNC', 'Strategic Roadmap updated via empirical lab feedback.');
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateEntry = (id: string, updates: Partial<DecisionLogEntry>) => {
    setLogEntries(prev => prev.map(e => e.id === id ? {...e, ...updates} : e));
    if (updates.outcome || updates.userNotes !== undefined) {
      setTimeout(() => syncIntelligence(), 500);
    }
  };

  return (
    <div className="min-h-screen pb-20 antialiased selection:bg-indigo-100 bg-[#fcfdfe]">
      <nav className="bg-[#0f172a] text-white sticky top-0 z-[60] shadow-2xl px-6 py-4 border-b border-indigo-500/20 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg"><i className="fa-solid fa-dna text-lg"></i></div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black lowercase tracking-tight">novasciences <span className="text-indigo-400">0.2.5v</span></h1>
              <span className="text-[8px] font-black uppercase opacity-40 tracking-widest -mt-1">Active Bench Mode</span>
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-rose-400 hover:text-rose-300 text-[10px] font-black uppercase px-4 py-2 rounded-xl hover:bg-rose-500/10 transition-all">Reset</button>
             {(result || decisionMemo) && (
              <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95 text-white">
                <i className="fa-solid fa-file-export"></i> Export Report
              </button>
             )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-10 space-y-20">
        {!currentProtein && !isSearching && (
          <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center">
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight uppercase">Strategic System Resolution</h2>
              <p className="text-slate-500 text-lg font-medium">Select a validated system or resolve identity to begin defensive roadmap synthesis.</p>
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
                 <button onClick={handleCustomSearch} className="bg-slate-900 text-white px-8 rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-600 shadow-lg transition-all">Resolve</button>
               </div>
            </div>
          </div>
        )}

        {currentProtein && !isSearching && (
          <>
            <div className="space-y-10">
              <div className="flex items-center justify-between no-print">
                <button onClick={() => { setCurrentProtein(null); setMutation({ wildtype: 'R', position: 273, mutant: 'H' }); }} className="text-[10px] font-black uppercase text-slate-900 hover:text-indigo-600 flex items-center gap-2 transition-all hover:-translate-x-1"><i className="fa-solid fa-arrow-left"></i> Systems Gallery</button>
                <div className="bg-indigo-100 text-indigo-800 border-2 border-indigo-200 px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm">
                  {currentProtein.name} | {currentProtein.id}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 space-y-6 no-print">
                  <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-lg space-y-6 relative overflow-hidden">
                    {/* Background indicator for suggested state */}
                    {isMutationSuggested && <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 -mr-16 -mt-16 rounded-full blur-2xl pointer-events-none"></div>}
                    
                    <section>
                      <h4 className="text-[11px] font-black text-slate-900 uppercase mb-4 border-b-2 border-indigo-500 pb-2 inline-block tracking-widest">Global Environment</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Primary Objective</label>
                          <select value={goal} onChange={(e) => setGoal(e.target.value as ScientificGoal)} className="w-full bg-slate-50 border-2 border-slate-100 py-3 px-4 rounded-xl text-xs font-black outline-none focus:border-indigo-500 text-slate-900">
                            {Object.values(ScientificGoal).map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Preserve Motifs</label>
                          <input type="text" value={preserveRegions} onChange={(e) => setPreserveRegions(e.target.value)} placeholder="e.g. 100-120" className="w-full bg-slate-50 border-2 border-slate-100 py-3 px-4 rounded-xl text-xs font-black text-slate-900" />
                        </div>
                      </div>
                    </section>
                    <section className="pt-4 border-t-2 border-slate-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[11px] font-black text-slate-900 uppercase border-b-2 border-rose-500 pb-2 inline-block tracking-widest">Target Selection</h4>
                        {isMutationSuggested && (
                          <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-widest animate-in fade-in slide-in-from-right-2">
                             Suggested Pre-fill
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 mb-4">
                         <div className="space-y-1">
                           <label className="block text-[8px] font-black text-slate-400 uppercase text-center">WT</label>
                           <input type="text" value={mutation.wildtype} onChange={(e) => setMutation({...mutation, wildtype: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-slate-100 py-3 rounded-xl text-center text-xs font-black text-slate-900 outline-none focus:border-rose-400 transition-all" placeholder="R" />
                         </div>
                         <div className="space-y-1">
                           <label className="block text-[8px] font-black text-slate-400 uppercase text-center">Pos</label>
                           <input type="number" value={mutation.position} onChange={(e) => setMutation({...mutation, position: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border-2 border-slate-100 py-3 rounded-xl text-center text-xs font-black text-slate-900 outline-none focus:border-rose-400 transition-all" />
                         </div>
                         <div className="space-y-1">
                           <label className="block text-[8px] font-black text-slate-400 uppercase text-center">Mut</label>
                           <input type="text" value={mutation.mutant} onChange={(e) => setMutation({...mutation, mutant: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-slate-100 py-3 rounded-xl text-center text-xs font-black text-slate-900 outline-none focus:border-rose-400 transition-all" placeholder="H" />
                         </div>
                      </div>

                      <div className="flex gap-2 mb-4">
                        <button 
                          onClick={() => setMutation({ wildtype: '', position: 1, mutant: '' })}
                          className="flex-1 bg-slate-100 text-slate-500 py-2 rounded-xl font-black text-[9px] uppercase hover:bg-slate-200 transition-all"
                        >
                          Clear Fields
                        </button>
                        {!isMutationSuggested && (
                          <button 
                            onClick={() => setMutation(getContextualMutation(currentProtein!))}
                            className="flex-1 bg-indigo-50 text-indigo-600 py-2 rounded-xl font-black text-[9px] uppercase hover:bg-indigo-100 transition-all border border-indigo-100"
                          >
                            Reset to Suggested
                          </button>
                        )}
                      </div>

                      <button onClick={handlePredict} disabled={isPredicting} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white py-5 rounded-2xl font-black text-[11px] uppercase shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                        {isPredicting ? <><i className="fa-solid fa-microchip fa-spin"></i> Reasoning...</> : <><i className="fa-solid fa-bolt"></i> Synthesize Analysis</>}
                      </button>
                    </section>
                  </div>
                  <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-lg max-h-[600px] overflow-y-auto custom-scrollbar">
                    <DecisionLog entries={logEntries} onUpdateEntry={handleUpdateEntry} isSyncing={isSyncing} onRestore={(e) => { setGoal(e.goal); parseMutationString(e.mutationTested); }} />
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                  <div className="relative print:h-[500px]">
                    <ProteinViewer 
                      ref={viewerHandleRef} 
                      uniprotId={currentProtein.id} 
                      pdbId={currentProtein.pdbId} 
                      mutation={mutation} 
                      showIdealizedMutant={showIdealizedMutant}
                    />
                    <div className="absolute top-8 left-8 z-20 flex items-center gap-4 bg-[#0f172a]/90 backdrop-blur-xl px-6 py-3 rounded-3xl border border-white/10 shadow-2xl no-print">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={showIdealizedMutant} onChange={(e) => setShowIdealizedMutant(e.target.checked)} />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Show idealized mutant side chain</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div ref={resultsContainerRef} className="pt-20 border-t-8 border-slate-100 scroll-mt-24">
              <div className="sticky top-[72px] z-50 py-4 bg-[#fcfdfe]/80 backdrop-blur-md no-print">
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
                            <span className="text-[14px] font-black uppercase tracking-[0.4em] text-indigo-900">Calculating atomic stability...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-6 text-center">
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
                        <span className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-400">Strategic Roadmap Pending Inference...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="fixed bottom-12 right-12 bg-slate-950 text-white px-10 py-6 rounded-[2.5rem] shadow-2xl flex items-center gap-6 z-[110] border-4 border-rose-500 animate-slide-in no-print">
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