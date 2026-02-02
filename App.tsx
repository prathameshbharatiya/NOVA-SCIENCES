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
import { REFERENCE_PROTEINS, ReferenceProtein } from './constants';
import { predictMutation, searchProtein, generateDecisionMemo } from './services/geminiService';
import MutationCard from './components/MutationCard';
import DecisionMemo from './components/DecisionMemo';
import ProteinViewer, { ProteinViewerHandle } from './components/ProteinViewer';
import DecisionLog from './components/DecisionLog';
import { track } from '@vercel/analytics';

const SESSION_KEY = 'novasciences_session_v025';
const LOGS_KEY = 'novasciences_logs_v025';

type DashboardTab = 'analysis' | 'roadmap';

const App: React.FC = () => {
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
    setAuditTrail(prev => ({
      ...prev,
      events: [...prev.events, { timestamp, feature, details }]
    }));
    
    const sessionDuration = Math.round((new Date().getTime() - new Date(auditTrail.startTime).getTime()) / 1000);
    try {
      track(feature, {
        details,
        sessionId: auditTrail.sessionId,
        duration_seconds: sessionDuration,
        protein: currentProtein?.id || 'none'
      });
    } catch (e) {
      console.warn("Analytics track failed", e);
    }
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
    
    logEvent('MEMO_EXPORT', `Exporting High-Fidelity Comprehensive Scientific Report for ${currentProtein?.id || 'session'}`);
    
    const htmlHeader = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Scientific Memo - ${currentProtein?.id} - Novasciences</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
        
        :root {
          --primary: #4f46e5;
          --slate-900: #0f172a;
          --slate-800: #1e293b;
          --slate-100: #f1f5f9;
          --emerald: #10b981;
          --rose: #ef4444;
          --amber: #f59e0b;
        }

        body { 
          font-family: 'Inter', sans-serif; 
          line-height: 1.6; 
          color: #1e293b; 
          background: #f8fafc; 
          margin: 0;
          padding: 60px 20px;
        }

        .report-wrapper {
          max-width: 1100px;
          margin: 0 auto;
          background: white;
          padding: 80px;
          border-radius: 40px;
          box-shadow: 0 50px 100px -20px rgba(0,0,0,0.1);
          border: 1px solid var(--slate-100);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 6px solid var(--primary);
          padding-bottom: 40px;
          margin-bottom: 60px;
        }

        .header-logo {
          font-weight: 900;
          font-size: 32px;
          text-transform: lowercase;
          letter-spacing: -0.05em;
          color: var(--slate-900);
        }

        .header-logo span { color: var(--primary); }

        .header-meta {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #94a3b8;
          text-align: right;
          line-height: 1.8;
        }

        .section-title {
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          color: var(--primary);
          border-bottom: 2px solid var(--slate-100);
          padding-bottom: 15px;
          margin: 60px 0 30px 0;
        }

        .stats-grid {
          display: grid;
          grid-template-cols: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: var(--slate-100);
          padding: 25px;
          border-radius: 25px;
          border: 1px solid #e2e8f0;
        }

        .stat-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 10px; }
        .stat-value { font-size: 18px; font-weight: 900; color: var(--slate-900); }

        .log-entry {
          background: white;
          border: 2px solid var(--slate-100);
          border-radius: 35px;
          padding: 40px;
          margin-bottom: 40px;
          position: relative;
          overflow: hidden;
        }

        .log-entry::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 8px;
          height: 100%;
          background: var(--primary);
        }

        .entry-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }

        .mut-label { font-size: 42px; font-weight: 900; color: var(--slate-900); letter-spacing: -0.05em; line-height: 1; }
        
        .score-badge {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .confidence-score {
          font-size: 28px;
          font-weight: 900;
          color: var(--primary);
        }

        .confidence-label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }

        .snapshot-box {
          width: 100%;
          border-radius: 25px;
          border: 4px solid var(--slate-100);
          margin: 30px 0;
          background: #0f172a;
        }

        .reasoning-grid {
          display: grid;
          grid-template-cols: 1.5fr 1fr;
          gap: 40px;
        }

        .detail-block h4 { font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 15px; }
        .detail-block p { font-size: 14px; color: var(--slate-800); font-weight: 500; }

        .outcome-tag {
          display: inline-block;
          padding: 6px 15px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          margin-top: 10px;
        }

        .tag-Positive { background: #dcfce7; color: #166534; }
        .tag-Negative { background: #fee2e2; color: #991b1b; }
        .tag-Neutral { background: #f1f5f9; color: #475569; }
        .tag-Pending { background: #e0e7ff; color: #3730a3; }

        .roadmap-card {
          border: 2px solid var(--slate-100);
          border-radius: 30px;
          padding: 30px;
          background: white;
          border-left: 8px solid var(--emerald);
        }

        .discouraged-card {
          border-left-color: var(--rose);
          background: #fffafa;
        }

        .ref-list {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #64748b;
          list-style: none;
          padding: 0;
        }

        .ref-list li { margin-bottom: 8px; }

        footer {
          margin-top: 100px;
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 0.2em;
        }

        @media print {
          body { background: white; padding: 0; }
          .report-wrapper { box-shadow: none; border: none; padding: 40px; width: 100%; }
        }
    </style>
</head>
<body>
    <div class="report-wrapper">
        <header class="header">
            <div>
                <div class="header-logo">novasciences <span>report</span></div>
                <div style="font-weight: 800; font-size: 18px; color: var(--slate-900); margin-top: 10px;">
                    ${currentProtein?.name} [${currentProtein?.id}]
                </div>
            </div>
            <div class="header-meta">
                REFERENCE: ${auditTrail.sessionId}<br>
                COMPILED: ${new Date().toLocaleString()}<br>
                MODEL: NOVACore-X 0.2.5
            </div>
        </header>

        <section>
            <h2 class="section-title">Mission Parameters</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Objective</div>
                    <div class="stat-value">${goal}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Risk Threshold</div>
                    <div class="stat-value">${riskTolerance}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Protein Length</div>
                    <div class="stat-value">${currentProtein?.length} AA</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Simulations Run</div>
                    <div class="stat-value">${logEntries.length}</div>
                </div>
            </div>
        </section>`;

    let roadmapHtml = '';
    if (decisionMemo) {
      roadmapHtml = `
        <section>
            <h2 class="section-title">Strategic Roadmap Summary</h2>
            <div style="background: var(--slate-900); color: white; padding: 40px; border-radius: 35px; margin-bottom: 40px;">
                <h4 style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--primary); margin-bottom: 15px;">Executive Synthesis</h4>
                <p style="font-size: 16px; font-weight: 600; line-height: 1.5; font-style: italic;">"${decisionMemo.summary}"</p>
                <div style="margin-top: 25px; display: flex; gap: 30px;">
                    <div>
                        <div style="font-size: 9px; font-weight: 800; opacity: 0.5; text-transform: uppercase;">Memory Context</div>
                        <div style="font-size: 12px; font-weight: 700;">${decisionMemo.memoryContext}</div>
                    </div>
                    <div>
                        <div style="font-size: 9px; font-weight: 800; opacity: 0.5; text-transform: uppercase;">Reference Grounding</div>
                        <div style="font-size: 12px; font-weight: 700;">${decisionMemo.referenceContextApplied ? 'Active' : 'Bypassed'}</div>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                ${decisionMemo.recommended.map(rec => `
                    <div class="roadmap-card">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div class="mut-label" style="font-size: 32px;">${rec.mutation}</div>
                            <div style="text-align: right;">
                                <div class="confidence-label">Confidence Score</div>
                                <div class="confidence-score" style="font-size: 20px;">${rec.confidenceBreakdown?.overallConfidence || rec.confidence}</div>
                            </div>
                        </div>
                        <p style="font-size: 13px; font-weight: 600; color: #475569; margin: 15px 0;">${rec.rationale}</p>
                        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--emerald);">
                            Alignment: ${rec.goalAlignment} | Risk: ${rec.risk}
                        </div>
                    </div>
                `).join('')}
            </div>

            <h3 style="font-size: 12px; font-weight: 900; color: var(--rose); margin: 40px 0 20px 0; text-transform: uppercase;">Pathology Red-Flags</h3>
            <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px;">
                ${decisionMemo.discouraged.map(disc => `
                    <div class="roadmap-card discouraged-card">
                        <div style="font-size: 24px; font-weight: 900; color: #991b1b;">${disc.mutation}</div>
                        <p style="font-size: 12px; font-weight: 600; color: #b91c1c; margin: 10px 0;">${disc.risk}</p>
                        <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #ef4444;">Signal: ${disc.signal}</div>
                    </div>
                `).join('')}
            </div>
        </section>`;
    }

    const decisionLogHtml = `
        <section>
            <h2 class="section-title">Detailed Atomic Simulations</h2>
            ${logEntries.map((entry, idx) => `
                <div class="log-entry">
                    <div class="entry-header">
                        <div>
                            <div class="mut-label">${entry.mutationTested}</div>
                            <div class="outcome-tag tag-${entry.outcome.replace(/\s+/g, '')}">Status: ${entry.outcome}</div>
                        </div>
                        <div class="score-badge">
                            <div class="confidence-label">Simulation Trust</div>
                            <div class="confidence-score">${entry.prediction?.confidence ? (entry.prediction.confidence * 100).toFixed(0) + '%' : (entry.prediction?.confidenceBreakdown?.overallConfidence || 'N/A')}</div>
                            <div style="font-size: 11px; font-weight: 800; color: var(--primary); margin-top: 10px;">
                                &Delta;&Delta;G: ${entry.prediction?.deltaDeltaG.toFixed(2)} kcal/mol
                            </div>
                        </div>
                    </div>

                    ${entry.snapshots?.zoomed ? `
                        <div class="snapshot-box">
                            <img src="${entry.snapshots.zoomed}" style="width: 100%; border-radius: 20px;" alt="Atomic Snapshot">
                        </div>
                    ` : ''}

                    <div class="reasoning-grid">
                        <div class="detail-block">
                            <h4>Scientific Rationale & Synthesis</h4>
                            <p style="font-style: italic;">"${entry.prediction?.reportSummary || 'N/A'}"</p>
                            <p style="margin-top: 15px;">${entry.prediction?.justification || 'N/A'}</p>
                            
                            <h4 style="margin-top: 30px;">Structural Analysis</h4>
                            <p>${entry.prediction?.structuralAnalysis || 'N/A'}</p>
                        </div>
                        <div class="detail-block">
                            <h4>Confidence Matrix</h4>
                            <div style="background: var(--slate-100); padding: 20px; border-radius: 20px;">
                                <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 15px;">
                                    ${Object.entries(entry.prediction?.confidenceBreakdown || {}).filter(([k]) => k !== 'confidenceRationale').map(([key, val]) => `
                                        <div>
                                            <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">${key.replace(/([A-Z])/g, ' $1').trim()}</div>
                                            <div style="font-size: 12px; font-weight: 700; color: var(--slate-900);">${val}</div>
                                        </div>
                                    `).join('')}
                                </div>
                                <div style="margin-top: 15px; font-size: 11px; color: #64748b; font-weight: 600;">
                                    ${entry.prediction?.confidenceBreakdown?.confidenceRationale || ''}
                                </div>
                            </div>

                            <h4 style="margin-top: 30px;">Scientist Observations</h4>
                            <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 20px; border-radius: 20px; color: #92400e; font-size: 13px; font-weight: 600;">
                                ${entry.userNotes ? `"${entry.userNotes}"` : 'No laboratory observations recorded for this entry.'}
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 40px; display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 30px; padding-top: 30px; border-top: 1px dashed var(--slate-100);">
                        <div>
                            <h4>Impact Category</h4>
                            <p style="font-weight: 800; color: var(--slate-900);">${entry.prediction?.stabilityImpact || 'N/A'}</p>
                        </div>
                        <div>
                            <h4>Functional Sensitivity</h4>
                            <p style="font-weight: 800; color: var(--slate-900);">${entry.prediction?.functionalRegionSensitivity || 'N/A'}</p>
                        </div>
                        <div>
                            <h4>Clinical Relevance</h4>
                            <p style="font-weight: 800; color: var(--slate-900);">${entry.prediction?.clinicalSignificance || 'N/A'}</p>
                        </div>
                    </div>

                    <div style="margin-top: 30px; background: #fafafa; padding: 15px; border-radius: 15px; font-family: 'JetBrains Mono', monospace; font-size: 10px;">
                        RUN_ID: ${entry.prediction?.reproducibility?.runId} | INPUT_HASH: ${entry.prediction?.reproducibility?.inputHash} | DOCKER_IMG: ${entry.prediction?.reproducibility?.dockerImageHash}
                    </div>
                </div>
            `).join('')}
        </section>

        <section>
            <h2 class="section-title">Scientific References & Evidence</h2>
            <ul class="ref-list">
                ${logEntries.flatMap(e => e.prediction?.references || []).filter((v, i, a) => a.indexOf(v) === i).map(ref => `<li>[REF] ${ref}</li>`).join('')}
                ${!logEntries.some(e => e.prediction?.references?.length) ? '<li>No automated references indexed for this session.</li>' : ''}
            </ul>
        </section>

        <footer>
            Novasciences Lab Automation Suite v0.2.5 — Proprietary Diagnostic Intelligence — Confidential
        </footer>
    </div>
</body>
</html>`;

    const fullHtml = htmlHeader + roadmapHtml + decisionLogHtml;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Novasciences_Memo_${currentProtein?.id || 'Session'}_${new Date().getTime()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseMutationString = (mutStr: string) => {
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
    if (!currentProtein) return;
    setIsPredicting(true);
    setIsRevealing(false);
    setHasViewedResults(false); 
    setError(null);
    setShowSuccessToast(false);
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
      
      const memo = await generateDecisionMemo(
        currentProtein, 
        goal, 
        logEntries, 
        riskTolerance, 
        preserveRegions, 
        environment
      );

      await new Promise(r => setTimeout(r, 800));

      setResult(pred);
      setDecisionMemo(memo);
      setIsRevealing(true);
      setHasNewRoadmap(true);
      setShowSuccessToast(true);

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
      
      setTimeout(() => {
        resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);

      setTimeout(() => setShowSuccessToast(false), 8000);

    } catch (err: any) {
      setError(`Analysis Error: ${err.message || "Unknown error"}`);
      logEvent('SYSTEM_FAULT', `Prediction failed: ${err.message}`);
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
    setGoal(entry.goal);
    setRiskTolerance(entry.riskTolerance);
    setPreserveRegions(entry.preserveRegions);
    setEnvironment(entry.environment);
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
                <div className="bg-indigo-100 text-indigo-800 border-2 border-indigo-200 px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm">
                  {currentProtein.name} | {currentProtein.id}
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
                    <DecisionLog entries={logEntries} onUpdateEntry={() => {}} onRestore={restoreLogContext} />
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
                            <span className="text-[14px] font-black uppercase tracking-[0.4em] text-indigo-900">Mapping atomic coordinates...</span>
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