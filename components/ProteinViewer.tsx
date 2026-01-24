
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Mutation, StructureStatus } from '../types';

interface ProteinViewerProps {
  uniprotId: string;
  pdbId?: string;
  localData?: string;
  mutation?: Mutation | null;
  prediction?: {
    structuralAnalysis: string;
    stabilityImpact: string;
  } | null;
  onStructureStatus?: (status: StructureStatus) => void;
}

export interface ProteinViewerHandle {
  getSnapshots: () => { full: string; zoomed: string };
}

declare global {
  interface Window {
    $3Dmol: any;
  }
}

// Global session cache to avoid redundant network requests
const structureCache: Record<string, string> = {};

const FETCH_TIMEOUT = 15000; 

const ProteinViewer = forwardRef<ProteinViewerHandle, ProteinViewerProps>(({ uniprotId, pdbId, localData, mutation, prediction, onStructureStatus }, ref) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const glViewer = useRef<any>(null);
  const isLoadingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StructureStatus>('idle');
  const [showSkip, setShowSkip] = useState(false);
  const [colorMode, setColorMode] = useState<'spectrum' | 'confidence'>('confidence');
  const [isAlphaFold, setIsAlphaFold] = useState(false);

  useEffect(() => {
    onStructureStatus?.(status);
  }, [status, onStructureStatus]);

  useImperativeHandle(ref, () => ({
    getSnapshots: () => {
      if (!glViewer.current || status !== 'available') return { full: '', zoomed: '' };
      const viewer = glViewer.current;
      const capture = () => {
        viewer.render();
        try {
          if (typeof viewer.png === 'function') {
            const data = viewer.png();
            return typeof data === 'string' && data.startsWith('data:') ? data : `data:image/png;base64,${data}`;
          }
        } catch (e) {
          const canvas = viewerRef.current?.querySelector('canvas');
          if (canvas instanceof HTMLCanvasElement) return canvas.toDataURL('image/png');
        }
        return '';
      };
      viewer.zoomTo();
      const full = capture();
      let zoomed = full;
      if (mutation) {
        viewer.zoomTo({ resi: mutation.position });
        zoomed = capture();
      }
      return { full, zoomed };
    }
  }));

  const applyStyles = (viewer: any) => {
    if (!viewer) return;
    viewer.removeAllLabels();
    viewer.setStyle({}, {});
    
    if (colorMode === 'confidence' && isAlphaFold) {
      viewer.setStyle({}, { cartoon: { colorscheme: 'plddt' } });
    } else {
      viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
    }

    if (mutation && status === 'available') {
      const selection = { resi: mutation.position };
      viewer.addStyle(selection, { 
        stick: { radius: 0.8, colorscheme: 'redCarbon' },
        sphere: { radius: 1.5, color: '#ef4444', opacity: 0.8 }
      });
      viewer.zoomTo(selection, 600);
      viewer.addLabel(`${mutation.wildtype}${mutation.position}${mutation.mutant}`, {
        fontSize: 12, fontColor: 'white', backgroundColor: '#ef4444', backgroundOpacity: 0.9, position: selection, distanceToAtom: 4
      });
    } else {
      viewer.zoomTo();
    }
    viewer.render();
  };

  const handleSkip = () => {
    isLoadingRef.current = false;
    setLoading(false);
    setStatus('unavailable');
    setShowSkip(false);
  };

  useEffect(() => {
    if (!viewerRef.current || !window.$3Dmol) return;
    
    if (!glViewer.current) {
      glViewer.current = window.$3Dmol.createViewer(viewerRef.current, { 
        backgroundColor: '#0f172a',
        antialias: true 
      });
    }

    const viewer = glViewer.current;
    viewer.clear();
    setLoading(true);
    isLoadingRef.current = true;
    setStatus('fetching');
    setIsAlphaFold(false);
    setShowSkip(false);

    const skipTimer = setTimeout(() => setShowSkip(true), 5000);
    const timeoutId = setTimeout(() => {
      if (isLoadingRef.current) {
        console.warn("NOVA: Structure resolution timeout.");
        handleSkip();
      }
    }, FETCH_TIMEOUT);

    const finalizeLoad = (data: string, isAF: boolean, id?: string) => {
      if (!isLoadingRef.current) return;
      if (id) structureCache[id] = data;
      
      viewer.addModel(data, "pdb");
      isLoadingRef.current = false;
      setLoading(false);
      setIsAlphaFold(isAF);
      setStatus('available');
      clearTimeout(timeoutId);
      clearTimeout(skipTimer);
      setShowSkip(false);
      
      viewer.resize();
      viewer.zoomTo();
      applyStyles(viewer);
    };

    const loadData = async () => {
      const cleanId = uniprotId?.trim();
      const cleanPdb = pdbId?.trim();

      // Tier 1: Local Cache
      if (cleanId && structureCache[cleanId]) {
        finalizeLoad(structureCache[cleanId], true);
        return;
      }

      try {
        if (localData) {
          finalizeLoad(localData, false);
          return;
        }

        // Tier 2: AlphaFold DB API
        if (cleanId) {
          try {
            const afResponse = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${cleanId}`);
            if (afResponse.ok) {
              const afData = await afResponse.json();
              if (afData && afData.length > 0 && afData[0].pdbUrl) {
                const pdbRes = await fetch(afData[0].pdbUrl);
                if (pdbRes.ok) {
                  const pdbData = await pdbRes.text();
                  finalizeLoad(pdbData, true, cleanId);
                  return;
                }
              }
            }
          } catch (e) { console.debug("AlphaFold DB API failed, trying fallbacks"); }
        }

        // Tier 3: Direct RCSB PDB Download
        const targetPdb = cleanPdb || (cleanId === 'P04637' ? '1TUP' : null);
        if (targetPdb && targetPdb.length === 4) {
          window.$3Dmol.download(`pdb:${targetPdb}`, viewer, {
            onfinish: () => {
              isLoadingRef.current = false;
              setLoading(false);
              setIsAlphaFold(false);
              setStatus('available');
              clearTimeout(timeoutId);
              clearTimeout(skipTimer);
              viewer.zoomTo();
              applyStyles(viewer);
            },
            onerror: () => handleSkip()
          });
          return;
        }

        handleSkip();
      } catch (err) {
        handleSkip();
      }
    };

    viewer.resize();
    loadData();

    return () => {
      isLoadingRef.current = false;
      clearTimeout(timeoutId);
      clearTimeout(skipTimer);
    };
  }, [uniprotId, localData, pdbId]);

  useEffect(() => {
    if (!loading && glViewer.current && status === 'available') {
      applyStyles(glViewer.current);
    }
  }, [mutation, colorMode, loading, isAlphaFold, status]);

  return (
    <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl min-h-[500px] transition-all duration-300">
      <div ref={viewerRef} className="mol-container w-full h-[500px]"></div>
      
      {loading && (
        <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center backdrop-blur-md z-30 animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="w-14 h-14 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
            <i className="fa-solid fa-helix absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 animate-pulse"></i>
          </div>
          <p className="text-[9px] font-black text-white uppercase tracking-[0.3em] mb-4">Resolving Structure</p>
          
          {showSkip && (
            <button 
              onClick={handleSkip}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10 transition-all shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2"
            >
              Skip Structure (Use Sequence)
            </button>
          )}
        </div>
      )}

      {status === 'unavailable' && (
        <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center p-12 text-center z-30 animate-in fade-in">
          <div className="max-w-xs">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <i className="fa-solid fa-dna text-amber-500 text-lg"></i>
            </div>
            <h4 className="text-white font-black text-xs uppercase mb-3 tracking-widest">Structural Model Not Found</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              NOVA is analyzing <span className="text-indigo-400">{uniprotId}</span> using sequence-based thermodynamic heuristics.
            </p>
          </div>
        </div>
      )}

      {status === 'available' && !loading && (
        <div className="absolute top-4 left-4 flex gap-2 z-20 pointer-events-auto">
          <button 
            onClick={() => setColorMode('confidence')} 
            disabled={!isAlphaFold} 
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all shadow-2xl border border-white/5 ${colorMode === 'confidence' && isAlphaFold ? 'bg-indigo-600 text-white' : 'bg-slate-950/80 text-slate-400 disabled:opacity-30'}`}
          >
            AF-Confidence
          </button>
          <button 
            onClick={() => setColorMode('spectrum')} 
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all shadow-2xl border border-white/5 ${colorMode === 'spectrum' || !isAlphaFold ? 'bg-indigo-600 text-white' : 'bg-slate-950/80 text-slate-400'}`}
          >
            Spectrum
          </button>
        </div>
      )}

      {status === 'available' && !loading && colorMode === 'confidence' && isAlphaFold && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none p-4 bg-slate-950/60 backdrop-blur-sm rounded-2xl border border-white/5 animate-in fade-in slide-in-from-left-2">
          <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">pLDDT Confidence</h5>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#0053D6]"></div><span className="text-[8px] font-bold text-white uppercase">Very High (>90)</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#65CBF3]"></div><span className="text-[8px] font-bold text-white uppercase">Confident (70-90)</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#FFDB13]"></div><span className="text-[8px] font-bold text-white uppercase">Low (50-70)</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#FF7D45]"></div><span className="text-[8px] font-bold text-white uppercase">Very Low (<50)</span></div>
          </div>
        </div>
      )}
      
      {status === 'available' && !loading && (
        <div className="absolute top-4 right-4 z-20 pointer-events-auto">
           <button 
             onClick={() => { glViewer.current?.zoomTo(); glViewer.current?.render(); }}
             className="w-8 h-8 bg-slate-950/80 border border-white/5 text-white rounded-lg flex items-center justify-center hover:bg-slate-800 transition-all"
             title="Reset View"
           >
             <i className="fa-solid fa-compress text-[10px]"></i>
           </button>
        </div>
      )}
    </div>
  );
});

export default ProteinViewer;
