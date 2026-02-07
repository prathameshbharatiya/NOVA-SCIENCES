
import React, { useState, useEffect } from 'react';
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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isSynthesizingRoadmap, setIsSynthesizingRoadmap] = useState(false);
  
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [strategyMemo, setStrategyMemo] = useState<DecisionMemoType | null>(null);
  const [activeTab, setActiveTab] = useState<'assay' | 'roadmap'>('assay');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(LOGS_KEY, JSON.stringify(logEntries)); }, [logEntries]);

  const handleResolveProtein = async (id: string) => {
    setIsSearching(true);
    setError(null);
    try {
      const p = await searchProtein(id);
      setCurrentProtein(p);
      setResult(null);
      setStrategyMemo(null);
      
      // Protein-Aware Default Initialization
      const reference = REFERENCE_PROTEINS.find(rp => rp.id === id || rp.name.toLowerCase() === id.toLowerCase());
      if (reference?.canonicalMutation) {
        setMutation({ ...reference.canonicalMutation });
      } else {
        // Reset to empty for unknown proteins to avoid state leakage
        setMutation({ wildtype: '', position: 1, mutant: '' });
      }

      // Auto-trigger roadmap with fresh environment and log data
      triggerRoadmap(p, goal, env);
    } catch (e: any) {
      setError(e.message || "Failed to resolve protein data.");
    } finally {
      setIsSearching(false);
    }
  };

  const triggerRoadmap = async (p: ProteinMetadata, g: ScientificGoal, e: ExperimentalEnvironment) => {
    setIsSynthesizingRoadmap(true);
    try {
      // Create feedback loop string from past experiments
      const pastLogsStr = logEntries
        .filter(le => le.uniprotId === p.id && le.outcome !== 'Not Tested Yet')
        .slice(0, 5) // Last 5 relevant experiments
        .map(le => `Mutation: ${le.mutationTested}, Outcome: ${le.outcome}, Env: pH ${le.environment.ph}, Temp ${le.environment.temp}C`).join('\n');
      
      const memo = await generateStrategicRoadmap(p, g, e, pastLogsStr);
      setStrategyMemo(memo);
    } catch (err: any) {
      console.error("Roadmap synthesis error:", err);
    } finally {
      setIsSynthesizingRoadmap(false);
    }
  };

  const handlePredict = async () => {
    if (!currentProtein || isPredicting) return;
    if (!mutation.wildtype || !mutation.mutant || !mutation.position) {
      setError("Please specify mutation coordinates (Wildtype, Position, Mutant).");
      return;
    }
    setIsPredicting(true);
    setResult(null);
    setError(null);
    try {
      const pred = await predictMutation(currentProtein, mutation, goal, riskTolerance, env);
      setResult(pred);
      
      // Store complete experimental context in logs
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
      setError(err.message || "An error occurred during prediction."); 
    } finally { setIsPredicting(false); }
  };

  const selectSuggested = (residue: string, pos: number, wt?: string) => {
    setMutation({ wildtype: wt || mutation.wildtype || '', position: pos, mutant: residue });
    setActiveTab('assay');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyPreset = (presetValues: string) => {
    const phMatch = presetValues.match(/pH\s?([\d.]+)/);
    const tempMatch = presetValues.match(/(\d+)°C/);
    const saltMatch = presetValues.match(/(\d+)mM/);
    
    const newEnv = {
      ...env,
      ph: phMatch ? parseFloat(phMatch[1]) : env.ph,
      temp: tempMatch ? parseInt(tempMatch[1]) : env.temp,
      ionicStrength: saltMatch ? parseInt(saltMatch[1]) : env.ionicStrength
    };
    setEnv(newEnv);
    if (currentProtein) triggerRoadmap(currentProtein, goal, newEnv);
  };

  const handleDownloadReport = () => {
    if (!currentProtein) return;
    const filename = `NOVA_Dossier_${currentProtein.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    
    // Build environmental log section for the report
    const recentLogs = logEntries
      .filter(l => l.uniprotId === currentProtein.id)
      .map(l => `
        <div style="border-bottom: 1px solid #e2e8f0; padding: 10px 0;">
          <strong style="color: #4f46e5;">${l.mutationTested}</strong> - Outcome: ${l.outcome}<br/>
          <small style="color: #64748b;">pH: ${l.environment.ph}, Temp: ${l.environment.temp}°C, Salt: ${l.environment.ionicStrength}mM</small>
        </div>
      `).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NOVA Strategic Dossier - ${currentProtein.name}</title>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; background: #f8fafc; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 60px; border-radius: 2rem; box-shadow: 0 20px 50px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    h1 { text-transform: uppercase; border-bottom: 4px solid #4f46e5; padding-bottom: 15px; margin-bottom: 30px; letter-spacing: -0.05em; font-weight: 900; font-size: 36px; }
    h2 { text-transform: uppercase; font-size: 14px; color: #4f46e5; letter-spacing: 0.2em; margin-top: 40px; border-left: 4px solid #4f46e5; padding-left: 15px; font-weight: 900; margin-bottom: 20px; }
    .card { background: #f1f5f9; padding: 25px; border-radius: 1.5rem; margin: 20px 0; border: 1px solid #e2e8f0; }
    .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
    .value { font-weight: 900; font-size: 28px; color: #0f172a; }
    .label { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 5px; display: block; }
    .rec-item { border-left: 4px solid #10b981; padding-left: 20px; margin: 15px 0; background: #f0fdf4; padding: 15px; border-radius: 0 1rem 1rem 0; }
    .avoid-item { border-left: 4px solid #f43f5e; padding-left: 20px; margin: 15px 0; background: #fef2f2; padding: 15px; border-radius: 0 1rem 1rem 0; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; font-weight: 900; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
      <h1>Technical Dossier</h1>
      <div style="text-align:right; font-size:11px; font-weight:700; color:#64748b;">NOVA-CORE 0.2.5v<br>${new Date().toLocaleString()}</div>
    </div>
    
    <div style="margin-bottom: 40px;">
      <div style="font-size: 24px; font-weight: 900;">${currentProtein.name}</div>
      <div style="color: #4f46e5; font-weight: 800; font-size: 14px;">UniProt: ${currentProtein.id}</div>
    </div>

    <h2>Assay Environment & Constraints</h2>
    <div class="card grid">
      <div><span class="label">pH Environment</span><div class="value">${env.ph}</div></div>
      <div><span class="label">Temperature</span><div class="value">${env.temp}°C</div></div>
      <div><span class="label">Ionic Strength</span><div class="value">${env.ionicStrength}mM</div></div>
      <div><span class="label">Buffer System</span><div class="value">${env.bufferSystem}</div></div>
    </div>

    ${strategyMemo ? `
    <h2>Strategic Roadmap Synthesis</h2>
    <div class="card" style="background: #eef2ff; border-color: #c7d2fe;">
      <p style="font-size:18px; font-weight:700; color:#4f46e5; margin-bottom:15px;">"${strategyMemo.summary}"</p>
      <p style="font-size:13px;"><strong>Environmental Rationale:</strong> ${strategyMemo.environmentalRoadmapImpact}</p>
    </div>

    <h3>Prescribed Roadmap (Priority Testing)</h3>
    ${strategyMemo.recommended.map(r => `
      <div class="rec-item">
        <div style="font-size:20px; font-weight:900;">${r.mutation}</div>
        <p style="font-size: 13px; margin: 8px 0;">${r.rationale}</p>
        <div style="font-size:10px; color:#10b981; font-weight:900; text-transform:uppercase;">Lit Alignment: ${Math.round((r.litScore || 0) * 100)}%</div>
      </div>
    `).join('')}

    <h3>Blacklist (Structural Risk Candidates)</h3>
    ${strategyMemo.discouraged.map(r => `
      <div class="avoid-item">
        <div style="font-size:20px; font-weight:900;">${r.mutation}</div>
        <p style="font-size: 13px; margin: 8px 0;"><strong>Risk:</strong> ${r.risk}</p>
        <div style="font-size:10px; color:#f43f5e; font-weight:900; text-transform:uppercase;">Signal Score: ${Math.round((r.litScore || 0) * 100)}%</div>
      </div>
    `).join('')}
    ` : ''}

    ${recentLogs ? `
    <h2>Recent Experimental History (Assay Log)</h2>
    <div class="card" style="background: white;">
      ${recentLogs}
    </div>
    ` : ''}

    ${result ? `
    <h2>Latest Individual Analysis: ${result.mutation}</h2>
    <div class="card grid">
      <div><span class="label">Predicted ΔΔG</span><div class="value">${result.deltaDeltaG.toFixed(2)} kcal/mol</div></div>
      <div><span class="label">Grounding Alignment</span><div class="value">${Math.round(result.overallLiteratureAlignment * 100)}%</div></div>
    </div>
    <div class="card">
      <span class="label">Synthesis Summary</span>
      <p style="font-weight:700;">${result.reportSummary}</p>
      <p style="font-size: 12px; margin-top: 10px; color: #64748b;">${result.environmentalAnalysis?.reasoning}</p>
    </div>
    ` : ''}

    <div class="footer">
      This document is a technical briefing generated for decision intelligence. Grounded in search metadata and structural heuristics.
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pb-20 bg-[#fcfdfe]">
      <nav className="bg-[#0f172a] text-white sticky top-0 z-[60] px-6 py-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg"><i className="fa-solid fa-dna"></i></div>
          <h1 className="text-xl font-black lowercase tracking-tight">novasciences <span className="text-indigo-400">0.2.5v</span></h1>
        </div>
        <div className="flex gap-4">
           {currentProtein && (
            <button 
              onClick={handleDownloadReport} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-file-export"></i> Technical Dossier
            </button>
           )}
           <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-rose-400 text-[10px] font-black uppercase px-4 hover:bg-rose-500/10 rounded-xl py-2">Reset</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        {!currentProtein ? (
          <div className="animate-in fade-in zoom-in duration-500 max-w-4xl mx-auto">
            <div className="text-center py-20 space-y-12 bg-white border-4 border-dashed border-slate-100 rounded-[4rem] shadow-sm">
              <div className="space-y-4">
                <h2 className="text-5xl font-black uppercase text-slate-900 tracking-tighter">Identity Resolution</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Resolve biological coordinates via UniProt ID</p>
              </div>

              <div className="flex max-w-xl mx-auto gap-4 px-10">
                <div className="flex-1 relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && searchQuery && !isSearching && handleResolveProtein(searchQuery)}
                    placeholder="Search UniProt (e.g., P04637)..." 
                    className="w-full bg-slate-50 border-2 border-slate-200 pl-14 pr-6 py-5 rounded-[2.5rem] font-black text-sm outline-none focus:border-indigo-500 transition-all" 
                  />
                </div>
                <button 
                  onClick={() => searchQuery && handleResolveProtein(searchQuery)} 
                  disabled={isSearching || !searchQuery}
                  className="bg-slate-900 hover:bg-black text-white px-10 rounded-[2.5rem] font-black uppercase text-[11px] disabled:bg-slate-200 transition-all flex items-center gap-2"
                >
                  {isSearching ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Resolve"}
                </button>
              </div>

              <div className="space-y-6">
                <span className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-300 block">Or select reference system</span>
                <div className="flex flex-wrap justify-center gap-4 px-10">
                  {REFERENCE_PROTEINS.map(rp => (
                    <button 
                      key={rp.id} 
                      onClick={() => handleResolveProtein(rp.id)} 
                      className="group bg-slate-50 hover:bg-indigo-600 p-6 rounded-[2.5rem] text-[10px] font-black uppercase transition-all border border-slate-100 hover:border-indigo-600 flex items-center gap-4 shadow-sm hover:shadow-xl hover:shadow-indigo-500/20 active:scale-95"
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
            <aside className="lg:col-span-4 space-y-6">
              <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-lg space-y-6">
                <div className="flex items-center justify-between border-b-2 border-indigo-500 pb-3">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Assay Workstation</h4>
                  <button onClick={() => setCurrentProtein(null)} className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-500">Change System</button>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Environment Presets</label>
                    <div className="flex flex-wrap gap-2">
                      {EXPERIMENTAL_PRESETS.map(p => (
                        <button 
                          key={p.name}
                          onClick={() => applyPreset(p.values)}
                          className="text-[8px] font-black uppercase px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase">Strategy Type</label>
                      <select 
                        value={goal} 
                        onChange={e => {
                          const newGoal = e.target.value as ScientificGoal;
                          setGoal(newGoal);
                          if (currentProtein) triggerRoadmap(currentProtein, newGoal, env);
                        }} 
                        className="w-full bg-slate-50 p-4 rounded-xl text-xs font-black border border-slate-100"
                      >
                        {Object.values(ScientificGoal).map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Substitution Coordinates</label>
                        <button onClick={() => setMutation({wildtype: '', position: 1, mutant: ''})} className="text-[7px] font-black uppercase text-indigo-400 hover:text-indigo-600">Clear</button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="relative">
                          <span className="absolute top-2 left-3 text-[7px] font-black uppercase text-slate-300">WT</span>
                          <input type="text" value={mutation.wildtype} onChange={e => setMutation({...mutation, wildtype: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-100 p-4 pt-6 rounded-xl text-center text-xs font-black" maxLength={1} />
                        </div>
                        <div className="relative">
                          <span className="absolute top-2 left-3 text-[7px] font-black uppercase text-slate-300">POS</span>
                          <input type="number" value={mutation.position} onChange={e => setMutation({...mutation, position: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border border-slate-100 p-4 pt-6 rounded-xl text-center text-xs font-black" />
                        </div>
                        <div className="relative">
                          <span className="absolute top-2 left-3 text-[7px] font-black uppercase text-slate-300">MUT</span>
                          <input type="text" value={mutation.mutant} onChange={e => setMutation({...mutation, mutant: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-100 p-4 pt-6 rounded-xl text-center text-xs font-black" maxLength={1} />
                        </div>
                      </div>
                      <p className="text-[7px] font-bold text-slate-400 italic">Pre-filled based on protein selection context.</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl space-y-4 border border-slate-100">
                      <div className="flex justify-between items-center">
                         <label className="text-[9px] font-black text-slate-400 uppercase">pH Environment</label>
                         <span className="text-[10px] font-black text-indigo-600">{env.ph.toFixed(1)}</span>
                      </div>
                      <input type="range" min="0" max="14" step="0.1" value={env.ph} onChange={e => setEnv({...env, ph: parseFloat(e.target.value)})} onMouseUp={() => currentProtein && triggerRoadmap(currentProtein, goal, env)} className="w-full accent-indigo-600" />
                      
                      <div className="flex justify-between items-center">
                         <label className="text-[9px] font-black text-slate-400 uppercase">Temp</label>
                         <span className="text-[10px] font-black text-rose-600">{env.temp}°C</span>
                      </div>
                      <input type="range" min="0" max="100" step="1" value={env.temp} onChange={e => setEnv({...env, temp: parseInt(e.target.value)})} onMouseUp={() => currentProtein && triggerRoadmap(currentProtein, goal, env)} className="w-full accent-rose-600" />

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="relative">
                           <span className="absolute top-1 left-2 text-[6px] font-black uppercase text-slate-300">Ionic (mM)</span>
                           <input type="number" value={env.ionicStrength} onChange={e => setEnv({...env, ionicStrength: parseInt(e.target.value) || 0})} onBlur={() => currentProtein && triggerRoadmap(currentProtein, goal, env)} className="w-full bg-white border border-slate-200 p-2 pt-4 rounded-lg text-xs font-black" />
                        </div>
                        <div className="relative">
                           <span className="absolute top-1 left-2 text-[6px] font-black uppercase text-slate-300">Buffer</span>
                           <input type="text" value={env.bufferSystem} onChange={e => setEnv({...env, bufferSystem: e.target.value})} onBlur={() => currentProtein && triggerRoadmap(currentProtein, goal, env)} className="w-full bg-white border border-slate-200 p-2 pt-4 rounded-lg text-xs font-black" />
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handlePredict} 
                      disabled={isPredicting} 
                      className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-[11px] uppercase shadow-xl hover:bg-indigo-700 disabled:bg-slate-200 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                      {isPredicting ? <><i className="fa-solid fa-microchip fa-spin"></i> Synthesizing...</> : <><i className="fa-solid fa-bolt"></i> Run Grounded Assay</>}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-lg h-[450px] overflow-y-auto custom-scrollbar">
                <DecisionLog 
                  entries={logEntries} 
                  onUpdateEntry={(id, u) => {
                    setLogEntries(prev => {
                      const updated = prev.map(e => e.id === id ? {...e, ...u} : e);
                      // Feedback Loop: When outcome changes, we re-trigger roadmap to learn from results
                      if (u.outcome && currentProtein) triggerRoadmap(currentProtein, goal, env);
                      return updated;
                    });
                  }} 
                  onRestore={e => {
                    const wt = e.mutationTested[0];
                    const mut = e.mutationTested[e.mutationTested.length - 1];
                    const pos = parseInt(e.mutationTested.substring(1, e.mutationTested.length - 1));
                    setMutation({ wildtype: wt, position: pos, mutant: mut });
                    setEnv(e.environment);
                    setActiveTab('assay');
                  }} 
                />
              </div>
            </aside>

            <section className="lg:col-span-8 space-y-8 pb-20">
              <div className="flex bg-white p-2 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                <button 
                  onClick={() => setActiveTab('assay')}
                  className={`flex-1 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activeTab === 'assay' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <i className="fa-solid fa-flask"></i> Technical Assay
                </button>
                <button 
                  onClick={() => setActiveTab('roadmap')}
                  className={`flex-1 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activeTab === 'roadmap' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                   <i className="fa-solid fa-map-location-dot"></i> 
                   {isSynthesizingRoadmap ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Strategic Roadmap'}
                </button>
              </div>

              <div className="bg-white px-8 py-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-xl">{currentProtein.name[0]}</div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{currentProtein.name}</h2>
                    <span className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em]">{currentProtein.id}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Targeting Objective</div>
                  <div className="text-[10px] font-black text-slate-600 uppercase bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{goal}</div>
                </div>
              </div>

              {activeTab === 'assay' ? (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
                  <ProteinViewer uniprotId={currentProtein.id} pdbId={currentProtein.pdbId} mutation={mutation} />
                  {result && <MutationCard result={result} />}
                  
                  <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-lg">
                    <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-8">Quick Sequence Scan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentProtein.suggestedMutations?.map((suggested, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => selectSuggested(suggested.residue, suggested.position)}
                          className="text-left bg-slate-50 border border-slate-100 p-6 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50/30 transition-all flex gap-5 items-center group"
                        >
                           <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center font-black text-slate-900 group-hover:border-indigo-200 transition-colors">
                              {suggested.residue}{suggested.position}
                           </div>
                           <p className="text-[11px] text-slate-500 font-bold leading-tight flex-1">"{suggested.rationale}"</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                   {strategyMemo ? (
                     <DecisionMemo 
                      memo={strategyMemo} 
                      goal={goal} 
                      onSelectMutation={(mut) => {
                        const match = mut.match(/([A-Z])(\d+)([A-Z])/);
                        if (match) {
                          setMutation({ wildtype: match[1], position: parseInt(match[2]), mutant: match[3] });
                          setActiveTab('assay');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                     />
                   ) : (
                     <div className="bg-white border-4 border-dashed border-slate-100 rounded-[4rem] py-32 text-center">
                        <i className="fa-solid fa-microchip text-4xl text-slate-200 mb-6 animate-pulse"></i>
                        <h3 className="text-xl font-black text-slate-300 uppercase tracking-[0.3em]">Synthesizing Strategic Roadmap...</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Integrating PubMed grounding & Experimental Logic</p>
                     </div>
                   )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {error && (
        <div className="fixed bottom-10 right-10 bg-rose-600 text-white p-6 rounded-3xl shadow-2xl flex items-center gap-4 z-[100] max-w-md animate-slide-in">
           <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
           <div className="flex-1">
             <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">System Notice</p>
             <p className="text-xs font-bold leading-relaxed">{error}</p>
           </div>
           <button onClick={() => setError(null)} className="text-white/50 hover:text-white transition-colors"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}
    </div>
  );
};

export default App;
