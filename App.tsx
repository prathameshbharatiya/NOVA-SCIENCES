
import React, { useState, useRef } from 'react';
import { Mutation, PredictionResult, ProteinMetadata, ScientificGoal, PriorResult, DecisionMemo as DecisionMemoType } from './types';
import { AMINO_ACIDS, REFERENCE_PROTEINS, ReferenceProtein } from './constants';
import { predictMutation, searchProtein, generateDecisionMemo } from './services/geminiService';
import MutationCard from './components/MutationCard';
import DecisionMemo from './components/DecisionMemo';
import ProteinViewer, { ProteinViewerHandle } from './ProteinViewer';

const App: React.FC = () => {
  const [currentProtein, setCurrentProtein] = useState<ProteinMetadata | null>(null);
  const [mutation, setMutation] = useState<Mutation>({ wildtype: 'R', position: 273, mutant: 'H' });
  const [goal, setGoal] = useState<ScientificGoal>(ScientificGoal.STABILITY);
  const [priorResults, setPriorResults] = useState<PriorResult[]>([]);
  const [newPrior, setNewPrior] = useState<{ mut: string; outcome: 'Positive' | 'Neutral' | 'Negative' }>({ mut: '', outcome: 'Neutral' });
  const [searchQuery, setSearchQuery] = useState('');
  
  const viewerHandleRef = useRef<ProteinViewerHandle>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [decisionMemo, setDecisionMemo] = useState<DecisionMemoType | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (data.suggestedMutations && data.suggestedMutations.length > 0) {
        setMutation({
          wildtype: data.suggestedMutations[0].residue,
          position: data.suggestedMutations[0].position,
          mutant: 'A'
        });
      }
    } catch (err: any) {
      setError('System busy. Retrying connection...');
    } finally {
      setIsSearching(false);
    }
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
      setError('Could not resolve protein. Try a UniProt ID.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePredict = async () => {
    if (!currentProtein) return;
    setIsPredicting(true);
    setError(null);
    try {
      const [pred, memo] = await Promise.all([
        predictMutation(currentProtein, mutation, goal, priorResults),
        generateDecisionMemo(currentProtein, goal, priorResults)
      ]);
      setResult(pred);
      setDecisionMemo(memo);
    } catch (err: any) {
      setError('Decision Engine timeout. Please simplify parameters.');
    } finally {
      setIsPredicting(false);
    }
  };

  const deletePriorResult = (index: number) => {
    setPriorResults(priorResults.filter((_, i) => i !== index));
  };

  const addPriorResult = () => {
    if (!newPrior.mut) return;
    setPriorResults([...priorResults, { mutation: newPrior.mut.toUpperCase(), outcome: newPrior.outcome }]);
    setNewPrior({ mut: '', outcome: 'Neutral' });
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
        <title>novasciences 0.2.5v Report - ${result.reproducibility.runId}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #000000; max-width: 900px; margin: 0 auto; padding: 40px; background: #f8fafc; }
          .container { background: white; border-radius: 32px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
          .header { background: #1e293b; color: white; padding: 50px 40px; }
          .badge { background: rgba(255,255,255,0.15); padding: 5px 12px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; display: inline-block; }
          .section { padding: 35px; border-bottom: 1px solid #f1f5f9; }
          .title { font-size: 11px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px; border-left: 4px solid #4f46e5; padding-left: 10px; }
          .box { background: #f8fafc; padding: 25px; border-radius: 18px; font-size: 14px; border: 1px solid #e2e8f0; color: #000; }
          .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-top: 15px; }
          .image-frame { background: #0f172a; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; text-align: center; }
          .image-frame img { width: 100%; display: block; border-bottom: 1px solid #334155; }
          .image-label { color: white; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 12px; background: #0f172a; }
          .risk-explainer { font-size: 12px; color: #475569; background: #f8fafc; padding: 15px; border-radius: 12px; margin-top: 10px; border: 1px dashed #cbd5e1; }
          .footer { text-align: center; padding: 40px; font-size: 11px; color: #64748b; font-style: italic; }
          .metric-pill { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 11px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="badge">${result.isValidatedReference ? 'Validated' : 'General'} Mode &bull; ${result.reproducibility.runId}</div>
            <h1 style="margin:0; font-weight:800; text-transform:uppercase;">Scientific Decision Memo</h1>
            <p style="opacity:0.8; margin:5px 0 0;">${currentProtein.name} (${currentProtein.id}) | Goal: ${goal}</p>
          </div>
          
          <div class="section">
            <div class="title">Executive Summary</div>
            <div class="box">${decisionMemo.summary}</div>
          </div>

          <div class="section">
            <div class="title">Structural Evidence Snapshots</div>
            <div class="grid">
              <div class="image-frame">
                <img src="${full}" />
                <div class="image-label">Global Fold Context</div>
              </div>
              <div class="image-frame">
                <img src="${zoomed}" />
                <div class="image-label">Mutation Site Analysis: ${result.mutation}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="title">Thermodynamic Analysis (&Delta;&Delta;G)</div>
            <div class="box">
              <div style="margin-bottom: 15px;">
                <strong>Predicted &Delta;&Delta;G:</strong> 
                <span class="metric-pill" style="background: #e0f2fe; color: #0369a1;">${result.deltaDeltaG.toFixed(2)} kcal/mol</span>
                &bull; 
                <strong>Impact:</strong> 
                <span class="metric-pill" style="background: #f1f5f9; color: #0f172a;">${result.stabilityImpact}</span>
              </div>
              <p style="font-size: 13px; color: #334155; margin: 0;">${result.justification}</p>
            </div>
          </div>

          <div class="section">
            <div class="title">Mutation Risk Profile</div>
            <div style="background:#fff1f2; border:2px solid #be123c; padding:25px; border-radius:24px; color:#9f1239;">
              <div style="font-size: 14px; font-weight: 800; margin-bottom: 10px; text-transform: uppercase;">Structural/Functional Risk Assessment</div>
              <div style="font-weight: 600; line-height: 1.5;">${result.riskBreakdown}</div>
            </div>
            
            <div class="risk-explainer">
              <strong>Understanding Mutation Risk:</strong><br>
              In protein engineering, mutation risk measures the likelihood of unintended deleterious effects on the protein's native state. 
              <strong>High Risk</strong> typically indicates that the mutation occurs in a highly conserved core, near a critical catalytic site, 
              or introduces significant steric clashes that could lead to misfolding, aggregation, or complete loss of function, 
              regardless of its local thermodynamic stability profile.
            </div>
          </div>

          <div class="section">
            <div class="title">Reproduction Metadata</div>
            <div style="font-size: 11px; color: #64748b; font-family: monospace;">
              Run ID: ${result.reproducibility.runId}<br>
              Model: ${result.reproducibility.modelName} (v${result.reproducibility.modelVersion})<br>
              Timestamp: ${result.reproducibility.timestamp}<br>
              Source: ${result.reproducibility.structureSource} (${result.reproducibility.structureSourceDetails})
            </div>
          </div>

          <div class="footer">
            CONFIDENTIAL PI MEMO &bull; GENERATED BY novasciences 0.2.5v ENGINE<br>
            ${result.disclaimer}
          </div>
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NS_Report_${result.reproducibility.runId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-20 antialiased selection:bg-indigo-100">
      <nav className="bg-[#0f172a] text-white sticky top-0 z-50 shadow-2xl px-6 py-4 border-b border-indigo-500/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/30"><i className="fa-solid fa-dna text-lg"></i></div>
            <h1 className="text-xl font-black lowercase tracking-tight">novasciences <span className="text-indigo-400">0.2.5v</span></h1>
          </div>
          {result && decisionMemo && (
            <button onClick={downloadPIReport} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg transition-all transform active:scale-95">
              <i className="fa-solid fa-file-export"></i> PI Executive Report
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        {!currentProtein && !isSearching && (
          <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center">
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Reference Systems</h2>
              <p className="text-slate-600 text-lg font-medium">High-confidence decision support for well-characterized proteins.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
               {REFERENCE_PROTEINS.map(p => (
                 <div key={p.id} onClick={() => loadReference(p)} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer flex flex-col group">
                   <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all"><i className={`fa-solid ${p.icon} text-lg`}></i></div>
                   <h3 className="font-black text-slate-900 text-sm mb-2">{p.name}</h3>
                   <p className="text-[11px] text-slate-700 leading-relaxed font-semibold flex-1">{p.why}</p>
                 </div>
               ))}
            </div>
            <div className="pt-10 border-t-2 border-slate-100 flex flex-col items-center">
               <div className="flex w-full max-w-md gap-3">
                 <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Enter UniProt ID (e.g. P04637)..." className="flex-1 bg-white border-2 border-slate-200 py-4 px-6 rounded-2xl text-sm font-black text-black placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                 <button onClick={handleCustomSearch} className="bg-slate-900 text-white px-8 rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-600 transition-all shadow-lg">Resolve System</button>
               </div>
            </div>
          </div>
        )}

        {currentProtein && !isSearching && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentProtein(null)} className="text-[10px] font-black uppercase text-slate-900 hover:text-indigo-600 flex items-center gap-2 transition-colors border-b-2 border-transparent hover:border-indigo-600"><i className="fa-solid fa-arrow-left"></i> Back to Systems</button>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${currentProtein.isValidatedReference ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-200' : 'bg-slate-100 text-slate-800 border-2 border-slate-200'}`}>
                {currentProtein.isValidatedReference ? 'Validated Mode Active' : 'General Intelligence Mode'}
              </div>
            </div>

            {decisionMemo && <DecisionMemo memo={decisionMemo} goal={goal} />}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4 space-y-8">
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-lg">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase mb-6 tracking-widest border-b-2 border-indigo-500 pb-2 inline-block">Decision Loop</h4>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-900 uppercase mb-2">Primary Scientific Goal</label>
                      <select value={goal} onChange={(e) => setGoal(e.target.value as ScientificGoal)} className="w-full bg-slate-50 border-2 border-slate-200 py-3 px-4 rounded-xl text-xs font-black text-black focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm">
                        {Object.values(ScientificGoal).map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="pt-6 border-t-2 border-slate-50">
                      <label className="block text-[10px] font-black text-slate-900 uppercase mb-4">Experimental Memory</label>
                      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto custom-scrollbar">
                        {priorResults.map((r, i) => (
                          <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border-2 border-slate-100 group transition-all hover:border-indigo-200 shadow-sm">
                            <span className="text-[11px] font-black text-black">{r.mutation}</span>
                            <div className="flex gap-2">
                              <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${r.outcome === 'Positive' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{r.outcome}</span>
                              <button onClick={() => deletePriorResult(i)} className="text-slate-400 hover:text-rose-600 transition-colors"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                            </div>
                          </div>
                        ))}
                        {priorResults.length === 0 && <div className="text-[10px] text-slate-500 font-bold italic p-4 text-center border-2 border-dashed border-slate-100 rounded-xl">No assays recorded yet.</div>}
                      </div>
                      <div className="flex gap-2 mb-3">
                        <input type="text" value={newPrior.mut} onChange={(e) => setNewPrior({...newPrior, mut: e.target.value.toUpperCase()})} placeholder="e.g. L344P" className="flex-1 bg-white border-2 border-slate-200 py-2 px-3 rounded-lg text-[11px] font-black text-black focus:ring-2 focus:ring-indigo-500 outline-none" />
                        <select value={newPrior.outcome} onChange={(e) => setNewPrior({...newPrior, outcome: e.target.value as any})} className="bg-white border-2 border-slate-200 px-2 rounded-lg text-[11px] font-black text-black">
                          <option value="Positive">Pos</option><option value="Neutral">Neu</option><option value="Negative">Neg</option>
                        </select>
                      </div>
                      <button onClick={addPriorResult} disabled={!newPrior.mut} className="w-full bg-slate-900 text-white py-3 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-600 transition-all disabled:opacity-30 shadow-md">Add Observation</button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-lg">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase mb-6 tracking-widest border-b-2 border-indigo-500 pb-2 inline-block">Target Search</h4>
                  <div className="grid grid-cols-3 gap-3 mb-8">
                     <div className="space-y-1">
                       <label className="block text-center text-[10px] font-black text-slate-900 uppercase">WT</label>
                       <select value={mutation.wildtype} onChange={(e) => setMutation({...mutation, wildtype: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 py-3 rounded-xl text-center text-xs font-black text-black shadow-sm">
                         {AMINO_ACIDS.map(aa => <option key={aa} value={aa}>{aa}</option>)}
                       </select>
                     </div>
                     <div className="space-y-1">
                       <label className="block text-center text-[10px] font-black text-slate-900 uppercase">POS</label>
                       <input type="number" value={mutation.position} onChange={(e) => setMutation({...mutation, position: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border-2 border-slate-200 py-3 rounded-xl text-center text-xs font-black text-black shadow-sm" />
                     </div>
                     <div className="space-y-1">
                       <label className="block text-center text-[10px] font-black text-slate-900 uppercase">MUT</label>
                       <select value={mutation.mutant} onChange={(e) => setMutation({...mutation, mutant: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 py-3 rounded-xl text-center text-xs font-black text-black shadow-sm">
                         {AMINO_ACIDS.map(aa => <option key={aa} value={aa}>{aa}</option>)}
                       </select>
                     </div>
                  </div>
                  <button onClick={handlePredict} disabled={isPredicting} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                    {isPredicting ? <i className="fa-solid fa-dna fa-spin"></i> : <><i className="fa-solid fa-bolt"></i> Run Decision Engine</>}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-10">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-stretch">
                  <div className="xl:col-span-7">
                    <ProteinViewer ref={viewerHandleRef} uniprotId={currentProtein.id} pdbId={currentProtein.pdbId} mutation={mutation} />
                  </div>
                  <div className="xl:col-span-5">
                    {result ? <MutationCard result={result} /> : (
                      <div className="h-full bg-white border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center p-10 text-center text-slate-300 shadow-inner">
                        <i className="fa-solid fa-microchip text-5xl mb-6 text-slate-200"></i>
                        <h4 className="text-[12px] font-black uppercase text-slate-400 tracking-[0.2em]">System Ready</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Configure mutation parameters to start analysis.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isSearching && (
          <div className="h-96 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-600 rounded-full animate-spin"></div>
              <i className="fa-solid fa-dna absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600"></i>
            </div>
            <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest animate-pulse">Initializing Scientific Workspace...</p>
          </div>
        )}

        {error && (
          <div className="fixed bottom-10 right-10 bg-rose-600 text-white px-8 py-5 rounded-[1.5rem] shadow-2xl flex items-center gap-4 z-50 animate-in fade-in slide-in-from-right-4 border-2 border-rose-500">
             <i className="fa-solid fa-circle-exclamation text-2xl"></i>
             <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-wider opacity-80">System Alert</span>
               <div className="text-[12px] font-bold uppercase">{error}</div>
             </div>
             <button onClick={() => setError(null)} className="ml-4 hover:scale-110 transition-transform"><i className="fa-solid fa-xmark text-lg"></i></button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
