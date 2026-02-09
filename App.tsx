
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mutation, 
  PredictionResult, 
  ProteinMetadata, 
  ScientificGoal, 
  RiskTolerance,
  DecisionLogEntry,
  ExperimentalEnvironment,
  DecisionMemo as DecisionMemoType
} from './types';
import { REFERENCE_PROTEINS, EXPERIMENTAL_PRESETS } from './constants';
import { predictMutation, searchProtein, generateStrategicRoadmap } from './services/geminiService';
import MutationCard from './components/MutationCard';
import ProteinViewer from './components/ProteinViewer';
import DecisionLog from './components/DecisionLog';
import DecisionMemo from './components/DecisionMemo';

const LOGS_KEY = 'novasciences_logs_v025_scientist_mode';

const App: React.FC = () => {
  const [logEntries, setLogEntries] = useState<DecisionLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LOGS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [currentProtein, setCurrentProtein] = useState<ProteinMetadata | null>(null);
  const [mutation, setMutation] = useState<Mutation>({ wildtype: '', position: 1, mutant: '' });
  const [goal, setGoal] = useState<ScientificGoal>(ScientificGoal.STABILITY);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>(RiskTolerance.MEDIUM);
  const [env, setEnv] = useState<ExperimentalEnvironment>({ ph: 7.4, temp: 37, ionicStrength: 150, bufferSystem: 'HEPES/NaCl' });
  const [showIdealized, setShowIdealized] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [strategyMemo, setStrategyMemo] = useState<DecisionMemoType | null>(null);
  const [error, setError] = useState<{ message: string; type: 'quota' | 'general' } | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem(LOGS_KEY, JSON.stringify(logEntries)); }, [logEntries]);

  // Enhanced auto-scroll with requestAnimationFrame to ensure DOM is ready
  useEffect(() => {
    if (!isAnalyzing && (predictionResult || strategyMemo)) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      });
    }
  }, [isAnalyzing, predictionResult, strategyMemo]);

  const handleResolveProtein = async (id: string) => {
    setIsSearching(true);
    setError(null);
    try {
      const p = await searchProtein(id);
      setCurrentProtein(p);
      setPredictionResult(null);
      setStrategyMemo(null); 
      
      const reference = REFERENCE_PROTEINS.find(rp => rp.id === id || rp.name.toLowerCase() === id.toLowerCase());
      if (reference?.canonicalMutation) {
        setMutation({ ...reference.canonicalMutation });
      } else {
        setMutation({ wildtype: '', position: 1, mutant: '' });
      }
    } catch (e: any) {
      const isQuota = e.message?.toLowerCase().includes("quota") || e.status === 429;
      setError({ 
        message: isQuota ? "API Quota Exceeded. Please try again in a moment." : (e.message || "Failed to resolve protein data."),
        type: isQuota ? 'quota' : 'general'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleComprehensiveAnalysis = async () => {
    if (!currentProtein || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    setPredictionResult(null);
    setStrategyMemo(null);

    try {
      const pastLogsStr = logEntries
        .filter(le => le.uniprotId === currentProtein.id && le.outcome !== 'Not Tested Yet')
        .slice(0, 5)
        .map(le => `Mutation: ${le.mutationTested}, Outcome: ${le.outcome}`).join('\n');

      const [pred, memo] = await Promise.all([
        predictMutation(currentProtein, mutation, goal, riskTolerance, env),
        generateStrategicRoadmap(currentProtein, goal, env, pastLogsStr)
      ]);

      setPredictionResult(pred);
      setStrategyMemo(memo);

      setLogEntries(prev => [{ 
        id: Math.random().toString(36).substring(2, 9), 
        timestamp: new Date().toISOString(), 
        proteinName: currentProtein.name, 
        uniprotId: currentProtein.id, 
        mutationTested: `${mutation.wildtype}${mutation.position}${mutation.mutant}`, 
        prediction: pred, 
        userNotes: '', 
        outcome: 'Not Tested Yet',
        environment: { ...env } 
      }, ...prev]);

    } catch (err: any) {
      const isQuota = err.message?.toLowerCase().includes("quota") || err.status === 429;
      setError({ 
        message: isQuota ? "System resources limited. Please retry in 30 seconds." : (err.message || "Analysis synthesis failed."),
        type: isQuota ? 'quota' : 'general' 
      }); 
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const handleDownloadReport = () => {
    if (!currentProtein) return;
    // We rely on high-quality print stylesheets to generate a downloadable PDF report
    window.print();
  };

  const applyPreset = (presetValues: string) => {
    const phMatch = presetValues.match(/pH\s?([\d.]+)/);
    const tempMatch = presetValues.match(/(\d+)°C/);
    const saltMatch = presetValues.match(/(\d+)mM/);
    setEnv({
      ...env,
      ph: phMatch ? parseFloat(phMatch[1]) : env.ph,
      temp: tempMatch ? parseInt(tempMatch[1]) : env.temp,
      ionicStrength: saltMatch ? parseInt(saltMatch[1]) : env.ionicStrength
    });
  };

  return (
    <div className="min-h-screen pb-20 bg-[#fcfdfe]">
      {/* Dossier Print Header */}
      <header className="hidden print:block mb-12 border-b-4 border-slate-900 pb-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Official Analysis Dossier</h1>
            <p className="text-xs font-black uppercase text-slate-500 tracking-[0.3em] mt-2">Generated by NOVA Strategic Synthesis • {new Date().toLocaleString()}</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Security Clearance</div>
            <div className="text-xs font-black text-rose-600 uppercase bg-rose-50 px-3 py-1 border border-rose-200 rounded">INTERNAL SCIENTIFIC USE ONLY</div>
          </div>
        </div>
      </header>

      <nav className="bg-[#0f172a] text-white sticky top-0 z-[60] px-6 py-4 flex items-center justify-between shadow-xl print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg"><i className="fa-solid fa-dna text-white"></i></div>
          <h1 className="text-xl font-black lowercase tracking-tight">novasciences <span className="text-indigo-400">0.2.5v</span></h1>
        </div>
        <div className="flex gap-4">
           {currentProtein && (
            <button 
              onClick={handleDownloadReport} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all flex items-center gap-2 active:scale-95"
            >
              <i className="fa-solid fa-file-pdf"></i> Generate Official Dossier
            </button>
           )}
           <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-rose-400 text-[10px] font-black uppercase px-4 hover:bg-rose-500/10 rounded-xl py-2">Wipe Session</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        {!currentProtein ? (
          <div className="animate-in fade-in zoom-in duration-500 max-w-4xl mx-auto">
            <div className="text-center py-16 lg:py-24 space-y-12 bg-white border-4 border-dashed border-slate-100 rounded-[3rem] lg:rounded-[4rem] shadow-sm">
              <div className="space-y-4">
                <h2 className="text-4xl lg:text-5xl font-black uppercase text-slate-900 tracking-tighter">System Initialization</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Resolve biological coordinates for comprehensive prediction</p>
              </div>

              <div className="flex flex-col lg:flex-row max-w-xl mx-auto gap-4 px-6 lg:px-10">
                <div className="flex-1 relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && searchQuery && !isSearching && handleResolveProtein(searchQuery)}
                    placeholder="Search UniProt or PDB (e.g., p53)..." 
                    className="w-full bg-slate-50 border-2 border-slate-200 pl-14 pr-6 py-5 rounded-[2.5rem] font-black text-sm outline-none focus:border-indigo-500 transition-all shadow-inner" 
                  />
                </div>
                <button 
                  onClick={() => searchQuery && handleResolveProtein(searchQuery)} 
                  disabled={isSearching || !searchQuery}
                  className="bg-slate-900 hover:bg-black text-white px-10 py-5 lg:py-0 rounded-[2.5rem] font-black uppercase text-[11px] disabled:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-xl"
                >
                  {isSearching ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Resolve Protein"}
                </button>
              </div>

              <div className="space-y-6">
                <span className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-300 block">Select high-priority research model</span>
                <div className="flex flex-wrap justify-center gap-4 px-6 lg:px-10">
                  {REFERENCE_PROTEINS.map(rp => (
                    <button 
                      key={rp.id} 
                      onClick={() => handleResolveProtein(rp.id)} 
                      className="group bg-slate-50 hover:bg-indigo-600 p-6 rounded-[2.5rem] text-[10px] font-black uppercase transition-all border border-slate-100 hover:border-indigo-600 flex items-center gap-4 shadow-sm hover:shadow-xl active:scale-95"
                    >
                      <i className={`fa-solid ${rp.icon} text-indigo-500 group-hover:text-white transition-colors text-lg`}></i> 
                      <div className="text-left">
                        <div className="group-hover:text-white transition-colors">{rp.name}</div>
                        <div className="text-[8px] opacity-40 group-hover:text-indigo-200 group-hover:opacity-100">{rp.id}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Control Column */}
            <aside className="lg:col-span-4 space-y-6 print:hidden aside-controls">
              <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-lg space-y-6">
                <div className="flex items-center justify-between border-b-2 border-indigo-500 pb-3">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Lab Configuration</h4>
                  <button onClick={() => setCurrentProtein(null)} className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-500">Back</button>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Environment Presets</label>
                    <div className="flex flex-wrap gap-2">
                      {EXPERIMENTAL_PRESETS.map(p => (
                        <button 
                          key={p.name}
                          onClick={() => applyPreset(p.values)}
                          className={`text-[8px] font-black uppercase px-2 py-1.5 border rounded-lg transition-all ${
                            env.ph.toString() === p.values.match(/pH\s?([\d.]+)/)?.[1] 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase">Scientific Objective</label>
                      <select 
                        value={goal} 
                        onChange={e => setGoal(e.target.value as ScientificGoal)} 
                        className="w-full bg-slate-50 p-4 rounded-xl text-xs font-black border border-slate-100 shadow-inner outline-none focus:border-indigo-400"
                      >
                        {Object.values(ScientificGoal).map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl space-y-4 border border-slate-100">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase">
                         <span className="text-slate-400">pH Environment</span>
                         <span className="text-indigo-600">{env.ph.toFixed(1)}</span>
                      </div>
                      <input type="range" min="0" max="14" step="0.1" value={env.ph} onChange={e => setEnv({...env, ph: parseFloat(e.target.value)})} className="w-full accent-indigo-600" />
                      
                      <div className="flex justify-between items-center text-[9px] font-black uppercase">
                         <span className="text-slate-400">Temperature</span>
                         <span className="text-rose-600">{env.temp}°C</span>
                      </div>
                      <input type="range" min="0" max="100" step="1" value={env.temp} onChange={e => setEnv({...env, temp: parseInt(e.target.value)})} className="w-full accent-rose-600" />
                    </div>

                    <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-md">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">Specific Substitution Vector</span>
                      <div className="grid grid-cols-3 gap-3">
                        <input type="text" value={mutation.wildtype} onChange={e => setMutation({...mutation, wildtype: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-center text-xs font-black" maxLength={1} placeholder="WT" />
                        <input type="number" value={mutation.position} onChange={e => setMutation({...mutation, position: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-center text-xs font-black" placeholder="POS" />
                        <input type="text" value={mutation.mutant} onChange={e => setMutation({...mutation, mutant: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-center text-xs font-black" maxLength={1} placeholder="MUT" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase">Visualize Mutant</span>
                       <button 
                        onClick={() => setShowIdealized(!showIdealized)}
                        className={`w-10 h-6 rounded-full transition-all relative ${showIdealized ? 'bg-indigo-600' : 'bg-slate-200'}`}
                       >
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showIdealized ? 'left-5' : 'left-1'}`}></div>
                       </button>
                    </div>

                    <button 
                      onClick={handleComprehensiveAnalysis} 
                      disabled={isAnalyzing} 
                      className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-[12px] uppercase shadow-xl hover:bg-indigo-700 disabled:bg-slate-200 transition-all flex flex-col items-center justify-center gap-1 active:scale-95 group"
                    >
                      {isAnalyzing ? (
                        <><i className="fa-solid fa-bolt fa-fade text-xl mb-1"></i> Fast Synthesis Active...</>
                      ) : (
                        <>
                          <span className="flex items-center gap-2"><i className="fa-solid fa-bolt text-lg group-hover:animate-pulse"></i> Execute Comprehensive Analysis</span>
                          <span className="text-[8px] opacity-60 font-black">Fast ΔΔG + Strategic Discovery</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 lg:p-8 rounded-[2rem] border-2 border-slate-100 shadow-lg h-[400px] overflow-y-auto custom-scrollbar">
                <DecisionLog 
                  entries={logEntries} 
                  onUpdateEntry={(id, u) => {
                    setLogEntries(prev => prev.map(e => e.id === id ? {...e, ...u} : e));
                  }} 
                  onRestore={e => {
                    const match = e.mutationTested.match(/([A-Z])(\d+)([A-Z])/);
                    if (match) {
                      setMutation({ wildtype: match[1], position: parseInt(match[2]), mutant: match[3] });
                    }
                    setEnv(e.environment);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                />
              </div>
            </aside>

            {/* Right Dashboard Area */}
            <section className="lg:col-span-8 space-y-10 pb-20">
              <div className="space-y-8">
                <div className="bg-white px-8 py-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex justify-between items-center print:border-none print:shadow-none print:p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-xl print:shadow-none">{currentProtein.name[0]}</div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{currentProtein.name}</h2>
                      <span className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em]">{currentProtein.id} | {currentProtein.sourceType} Target</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">Active Objective</span>
                    <span className="text-[12px] font-black text-indigo-600 uppercase">{goal}</span>
                  </div>
                </div>

                <div className="print-card">
                  <ProteinViewer 
                    uniprotId={currentProtein.id} 
                    pdbId={currentProtein.pdbId} 
                    mutation={mutation} 
                    showIdealizedMutant={showIdealized}
                  />
                </div>
              </div>

              <div ref={resultsRef} className="scroll-mt-24 space-y-12">
                {isAnalyzing ? (
                  <div className="bg-white border-4 border-dashed border-slate-100 rounded-[3rem] py-32 text-center">
                    <div className="max-w-md mx-auto space-y-6">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto text-2xl shadow-inner border border-indigo-100 animate-bounce">
                          <i className="fa-solid fa-dna"></i>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Fast Synthesis in Progress</h3>
                        <div className="space-y-2">
                          <p className="text-sm text-slate-500 font-bold leading-relaxed px-10">
                            Resolving ΔΔG and literature citations...
                          </p>
                          <div className="w-48 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden">
                            <div className="h-full bg-indigo-500 animate-[loading_1.5s_infinite_linear]"></div>
                          </div>
                        </div>
                    </div>
                  </div>
                ) : (predictionResult || strategyMemo) ? (
                  <div className="space-y-12">
                    {predictionResult && (
                      <div className="animate-in fade-in slide-in-from-bottom-5 duration-500" id="analysis-section">
                          <div className="flex items-center gap-3 mb-6 px-4 print:mb-2">
                            <i className="fa-solid fa-square-poll-vertical text-indigo-500 print:hidden"></i>
                            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Thermodynamic Prediction Core</h4>
                          </div>
                          <MutationCard result={predictionResult} />
                      </div>
                    )}

                    {strategyMemo && (
                      <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200" id="roadmap-section">
                          <div className="flex items-center gap-3 mb-6 px-4 print:mb-2 print:mt-10">
                            <i className="fa-solid fa-compass text-emerald-500 print:hidden"></i>
                            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Strategic Discovery Roadmap</h4>
                          </div>
                          <DecisionMemo 
                            memo={strategyMemo} 
                            goal={goal} 
                            onSelectMutation={(mut) => {
                              const match = mut.match(/([A-Z])(\d+)([A-Z])/);
                              if (match) {
                                setMutation({ wildtype: match[1], position: parseInt(match[2]), mutant: match[3] });
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }
                            }}
                          />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white border-4 border-dashed border-slate-100 rounded-[3rem] py-32 text-center print:hidden">
                    <div className="max-w-md mx-auto space-y-6">
                      <i className="fa-solid fa-bolt-lightning text-5xl text-slate-100 mb-2"></i>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Scientific Analysis Ready</h3>
                      <p className="text-sm text-slate-500 font-bold leading-relaxed px-10">
                        Configure your substitution target and environmental variables to synthesize a full structural report.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {currentProtein.suggestedMutations && (
                <div className="bg-white p-8 lg:p-10 rounded-[3rem] border-2 border-slate-100 shadow-lg print:hidden">
                  <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-8">Structure-Function Suggestions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentProtein.suggestedMutations.map((suggested, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => applyPreset(suggested.residue + suggested.position)}
                        className="text-left bg-slate-50 border border-slate-100 p-6 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50/30 transition-all flex gap-5 items-center group shadow-sm hover:shadow-md"
                      >
                         <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center font-black text-slate-900 group-hover:border-indigo-200 transition-colors shadow-inner">
                            {suggested.residue}{suggested.position}
                         </div>
                         <p className="text-[11px] text-slate-500 font-bold leading-tight flex-1 italic group-hover:text-slate-700">"{suggested.rationale}"</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {error && (
        <div className={`fixed bottom-10 right-10 ${error.type === 'quota' ? 'bg-amber-600' : 'bg-rose-600'} text-white p-6 rounded-3xl shadow-2xl flex items-center gap-4 z-[100] max-w-md animate-slide-in print:hidden`}>
           <i className={`fa-solid ${error.type === 'quota' ? 'fa-hourglass-half' : 'fa-triangle-exclamation'} text-2xl`}></i>
           <div className="flex-1">
             <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">System Status</p>
             <p className="text-xs font-bold leading-relaxed">{error.message}</p>
           </div>
           <button onClick={() => setError(null)} className="text-white/50 hover:text-white transition-colors"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      {/* Dossier Print Footer */}
      <footer className="hidden print:block mt-20 pt-10 border-t border-slate-200">
        <div className="grid grid-cols-2 gap-10">
          <div>
            <h5 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Technical Reproducibility & Methodology</h5>
            <p className="text-[8px] text-slate-500 leading-relaxed italic max-w-md">
              All thermodynamic ΔΔG values are predictive models synthesized by the NOVA Intelligence engine. Structural snapshots represent idealized side-chain approximations in the target environment. Literature citations are grounded via real-time verification tools.
            </p>
          </div>
          <div className="text-right flex flex-col justify-end">
             <div className="text-[12px] font-black uppercase text-slate-900 tracking-tight">NOVASCIENCES 0.2.5v</div>
             <div className="text-[9px] text-slate-400 uppercase tracking-widest">Biological Synthesis Pipeline #822-PRO-CORE</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
