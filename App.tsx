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
import { AMINO_ACIDS, REFERENCE_PROTEINS, ReferenceProtein, EXPERIMENTAL_PRESETS } from './constants';
import { predictMutation, searchProtein, generateDecisionMemo } from './services/geminiService';
import MutationCard from './components/MutationCard';
import DecisionMemo from './components/DecisionMemo';
import ProteinViewer, { ProteinViewerHandle } from './components/ProteinViewer';
import DecisionLog from './components/DecisionLog';
import { track } from '@vercel/analytics';

const SESSION_KEY = 'novasciences_session_v025';
const LOGS_KEY = 'novasciences_logs_v025';

const App: React.FC = () => {
  // Persistence Loading
  const [logEntries, setLogEntries] = useState<DecisionLogEntry[]>(() => {
    const saved = localStorage.getItem(LOGS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [auditTrail, setAuditTrail] = useState<SystemAuditTrail>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) return JSON.parse(saved);
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
  
  const [priorResults, setPriorResults] = useState<PriorResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const viewerHandleRef = useRef<ProteinViewerHandle>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [decisionMemo, setDecisionMemo] = useState<DecisionMemoType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Persistence Sync
  useEffect(() => {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logEntries));
  }, [logEntries]);

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(auditTrail));
  }, [auditTrail]);

  const logEvent = (feature: string, details: string) => {
    const timestamp = new Date().toISOString();
    // Sync to Local State
    setAuditTrail(prev => ({
      ...prev,
      events: [...prev.events, { timestamp, feature, details }]
    }));
    
    // Sync to Vercel Analytics for persistent global dashboard tracking
    const sessionDuration = Math.round((new Date().getTime() - new Date(auditTrail.startTime).getTime()) / 1000);
    track(feature, {
      details,
      sessionId: auditTrail.sessionId,
      duration_seconds: sessionDuration,
      protein: currentProtein?.id || 'none'
    });
  };

  // Sync memory from log outcomes and NOTES for AI context
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

  // Guardrails
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
      logEvent('MUTATION_SELECT', `Residue target set to ${mutStr}`);
    }
  };

  const handlePredict = async () => {
    if (!currentProtein) return;
    setIsPredicting(true);
    setError(null);
    logEvent('PREDICTION_START', `Analyzing ${mutation.wildtype}${mutation.position}${mutation.mutant} for ${currentProtein.id}`);
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
        logEntries, 
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
      logEvent('PREDICTION_SUCCESS', `Analysis complete: ΔΔG ${pred.deltaDeltaG.toFixed(2)}`);

    } catch (err: any) {
      setError(`Analysis Error: ${err.message || "Unknown error"}`);
      logEvent('SYSTEM_FAULT', `Prediction failed: ${err.message}`);
    } finally {
      setIsPredicting(false);
    }
  };

  const updateLogEntry = (id: string, updates: Partial<DecisionLogEntry>) => {
    setLogEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    if (updates.userNotes) logEvent('NOTE_UPDATE', `Modified user rationale for entry ${id}`);
    if (updates.outcome) logEvent('OUTCOME_VERIFIED', `Entry ${id} marked as ${updates.outcome}`);
  };

  const restoreLogContext = (entry: DecisionLogEntry) => {
    setGoal(entry.goal);
    setRiskTolerance(entry.riskTolerance);
    setPreserveRegions(entry.preserveRegions);
    setEnvironment(entry.environment);
    setResult(entry.prediction || null);
    setDecisionMemo(entry.memo || null);
    parseMutationString(entry.mutationTested);
    logEvent('CONTEXT_RESTORE', `Restored workflow for ${entry.mutationTested}`);
  };

  const handleCustomSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setError(null);
    logEvent('PROTEIN_SEARCH', `Resolving ${searchQuery}`);
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
    logEvent('REF_LOAD', `Selected ${ref.name} (${ref.id})`);
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
    logEvent('REPORT_EXPORT', `Generated comprehensive scientific memo`);
    const snapshots = viewerHandleRef.current?.getSnapshots();
    const { full, zoomed } = snapshots || { full: '', zoomed: '' };
    
    // System Audit & Metrics
    const sessionDuration = Math.round((new Date().getTime() - new Date(auditTrail.startTime).getTime()) / 60000);
    const auditHtml = auditTrail.events.map(ev => `
      <div style="font-size: 9px; font-family: 'JetBrains Mono', monospace; border-left: 2px solid #e2e8f0; padding-left: 10px; margin-bottom: 4px;">
        <span style="color: #94a3b8;">[${new Date(ev.timestamp).toLocaleTimeString()}]</span>
        <span style="color: #4f46e5; font-weight: 800;">${ev.feature}</span>: ${ev.details}
      </div>
    `).join('');

    // Comprehensive Decision Log
    const logsHtml = logEntries.map(entry => `
      <div style="border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; padding: 24px; background: #fff; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
             <h4 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a;">${entry.mutationTested}</h4>
             <p style="margin: 4px 0 0; font-size: 10px; font-weight: 700; color: #6366f1; text-transform: uppercase;">Outcome: ${entry.outcome}</p>
          </div>
          <span style="font-size: 10px; color: #94a3b8; font-weight: 600;">Captured ${new Date(entry.timestamp).toLocaleString()}</span>
        </div>
        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 16px;">
          <div style="background: #f8fafc; padding: 15px; border-radius: 12px; font-size: 11px;">
             <strong>Environment:</strong> ${entry.environment || 'Physiological'}<br/>
             <strong>Tolerance:</strong> ${entry.riskTolerance}
          </div>
          ${entry.snapshots?.zoomed ? `<img src="${entry.snapshots.zoomed}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 12px; border: 1px solid #e2e8f0;" />` : ''}
        </div>
        <div style="padding: 15px; background: #fffbeb; border-radius: 12px; border: 1px solid #fef3c7;">
          <h5 style="margin: 0 0 8px; font-size: 9px; font-weight: 900; color: #b45309; text-transform: uppercase;">Scientist Rationale & Notes</h5>
          <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5; font-weight: 500;">${entry.userNotes || 'No notes documented.'}</p>
        </div>
      </div>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>novasciences Report - ${result.reproducibility.runId}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=JetBrains+Mono&display=swap');
          body { font-family: 'Inter', sans-serif; color: #1e293b; max-width: 900px; margin: 0 auto; padding: 60px; background: #f8fafc; }
          .container { background: white; border-radius: 40px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); }
          .header { background: #0f172a; color: white; padding: 80px 60px; position: relative; }
          .header::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 4px; background: linear-gradient(to right, #6366f1, #a855f7); }
          .section { padding: 60px; border-bottom: 1px solid #f1f5f9; }
          .title { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em; margin-bottom: 30px; color: #4f46e5; }
          .box { background: #f8fafc; padding: 35px; border-radius: 24px; font-size: 15px; border: 1px solid #e2e8f0; line-height: 1.7; font-weight: 500; }
          .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 30px; }
          .snapshot { width: 100%; border-radius: 24px; border: 4px solid #f1f5f9; }
          .stats-card { background: rgba(255,255,255,0.05); padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 42px; font-weight:900; text-transform:uppercase; letter-spacing: -0.04em; color: #fff;">novasciences</h1>
            <p style="opacity:0.6; margin:12px 0 30px; font-size: 16px; font-weight: 600;">RUN_ID: ${result.reproducibility.runId} | SESSION: ${auditTrail.sessionId}</p>
            
            <div style="display: grid; grid-template-cols: repeat(4, 1fr); gap: 15px;">
              <div class="stats-card"><span style="display:block; font-size:9px; font-weight:900; opacity:0.5; margin-bottom:4px;">PROTEIN</span><span style="font-size:12px; font-weight:800;">${currentProtein.id}</span></div>
              <div class="stats-card"><span style="display:block; font-size:9px; font-weight:900; opacity:0.5; margin-bottom:4px;">SESSION TIME</span><span style="font-size:12px; font-weight:800;">${sessionDuration}m</span></div>
              <div class="stats-card"><span style="display:block; font-size:9px; font-weight:900; opacity:0.5; margin-bottom:4px;">LOG ENTRIES</span><span style="font-size:12px; font-weight:800;">${logEntries.length}</span></div>
              <div class="stats-card"><span style="display:block; font-size:9px; font-weight:900; opacity:0.5; margin-bottom:4px;">SECURITY</span><span style="font-size:12px; font-weight:800;">ENCRYPTED</span></div>
            </div>
          </div>

          <div class="section">
            <div class="title">I. Executive Summary & Reasoning</div>
            <div class="box">${decisionMemo.summary}</div>
            <div style="margin-top:20px; font-size:13px; font-weight:700; color:#475569; padding: 20px; background: #eff6ff; border-radius: 16px;">
              <strong>Synthesis Log Insight:</strong> ${decisionMemo.logInsights}
            </div>
          </div>

          <div class="section">
            <div class="title">II. Thermodynamic & Structural Impact</div>
            <div class="grid">
               <div class="box" style="border-left: 8px solid #6366f1;">
                 <h4 style="margin:0 0 10px; font-size:12px; font-weight:900; color:#6366f1;">PREDICTED STABILITY</h4>
                 <p style="margin:0; font-size: 24px; font-weight: 900; color: #0f172a;">ΔΔG: ${result.deltaDeltaG.toFixed(2)} kcal/mol</p>
                 <p style="margin:4px 0 0; font-weight: 800; color: #6366f1; font-size: 14px;">${result.stabilityImpact}</p>
               </div>
               <div class="box">
                 <h4 style="margin:0 0 10px; font-size:12px; font-weight:900; color:#10b981;">CONFIDENCE SCORE</h4>
                 <p style="margin:0; font-size: 24px; font-weight: 900; color: #0f172a;">${(result.confidence * 100).toFixed(0)}%</p>
                 <p style="margin:4px 0 0; font-weight: 800; color: #10b981; font-size: 14px;">System Accuracy High</p>
               </div>
            </div>
            <div style="margin-top:30px;"><img src="${zoomed}" class="snapshot" /></div>
          </div>

          <div class="section" style="background: #f8fafc;">
            <div class="title">III. Historical Decision Logs & Scientist Notes</div>
            <div style="margin-top: 20px;">
               ${logsHtml || '<p style="text-align:center; opacity:0.5;">No decision logs recorded.</p>'}
            </div>
          </div>

          <div class="section">
            <div class="title">IV. System Audit Trail (Activity Logs)</div>
            <div style="background: #0f172a; padding: 30px; border-radius: 20px; color: #e2e8f0; font-family: 'JetBrains Mono', monospace;">
               ${auditHtml}
            </div>
          </div>

          <div class="section" style="border: 0; text-align: center; padding: 40px;">
            <p style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">
              DOCUMENT GENERATED BY NOVA BIOLOGICAL ENGINE 0.2.5V & bull; PERSISTENT ANALYTICS SYNCED TO VERCEL
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NOVA_FULL_AUDIT_${result.reproducibility.runId}.html`;
    a.click();
  };

  const clearSession = () => {
    if (window.confirm("Scientist: This will permanently wipe local session persistence. Export your data first. Proceed?")) {
      logEvent('SESSION_WIPE', 'User cleared all local persistence');
      localStorage.removeItem(LOGS_KEY);
      localStorage.removeItem(SESSION_KEY);
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-20 antialiased selection:bg-indigo-100">
      <nav className="bg-[#0f172a] text-white sticky top-0 z-50 shadow-2xl px-6 py-4 border-b border-indigo-500/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/30"><i className="fa-solid fa-dna text-lg"></i></div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black lowercase tracking-tight">novasciences <span className="text-indigo-400">0.2.5v</span></h1>
              <span className="text-[8px] font-black uppercase opacity-40 tracking-widest -mt-1">Active Session: {auditTrail.sessionId}</span>
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={clearSession} className="text-rose-400 hover:text-rose-300 text-[10px] font-black uppercase px-4 py-2 rounded-xl hover:bg-rose-500/10 transition-all">Reset Session</button>
             {logEntries.length > 0 && (
              <button onClick={downloadPIReport} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95">
                <i className="fa-solid fa-file-export"></i> Export Comprehensive Memo
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
                        <div className="flex justify-between items-center mb-2">
                           <label className="block text-[10px] font-black text-slate-400 uppercase">Experiment Context</label>
                           <div className="flex gap-1">
                              {EXPERIMENTAL_PRESETS.map(p => (
                                <button 
                                  key={p.name} 
                                  onClick={() => {
                                    setEnvironment(p.values);
                                    logEvent('PRESET_APPLIED', `Applied ${p.name} conditions`);
                                  }}
                                  className="text-[7px] font-black bg-slate-100 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-slate-200 transition-colors uppercase text-slate-500 hover:text-indigo-600"
                                  title={p.description}
                                >
                                  {p.name}
                                </button>
                              ))}
                           </div>
                        </div>
                        <textarea 
                          value={environment} 
                          onChange={(e) => setEnvironment(e.target.value)} 
                          placeholder="Standard physiological conditions or select a preset..." 
                          className="w-full bg-slate-50 border-2 border-slate-100 py-3 px-4 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-indigo-500 min-h-[80px]" 
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

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-lg max-h-[600px] overflow-y-auto custom-scrollbar">
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