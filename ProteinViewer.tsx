
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Mutation, StructureStatus } from './types';

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

const structureCache: Record<string, string> = {};
const FETCH_TIMEOUT = 15000; 

const ProteinViewer = forwardRef<ProteinViewerHandle, ProteinViewerProps>((props, ref) => {
  const { uniprotId, pdbId, localData, mutation, onStructureStatus } = props;
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
        console.warn("novasciences: Structure resolution timeout.");
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

      if (cleanId && structureCache[cleanId]) {
        finalizeLoad(structureCache[cleanId], true);
        return;
      }

      try {
        if (localData) {
          finalizeLoad(localData, false);
          return;
        }

        if (cleanId) {
          try {
            const afResponse = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${cleanId}`);
            if (afResponse.ok) {
              const afData = await afResponse.json();
              if (afData?.[0]?.pdbUrl) {
                const pdbRes = await fetch(afData[0].pdbUrl);
                if (pdbRes.ok) {
                  const pdbData = await pdbRes.text();
                  finalizeLoad(pdbData, true, cleanId);
                  return;
                }
              }
            }
          } catch (e) {}
        }

        const targetPdb = cleanPdb || (cleanId === 'P04637' ? '1TUP' : null);
        if (targetPdb && targetPdb.length === 4) {
          window.$3Dmol.download(`pdb:${targetPdb}`, viewer, {
            onfinish: () => {
              isLoadingRef.current = false;
              setLoading(false);
              setStatus('available');
              clearTimeout(timeoutId);
              clearTimeout(skipTimer);
              viewer.zoomTo();
              applyStyles(viewer);
            },
            onerror: handleSkip
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
    <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl min-h-[500px]">
      <div ref={viewerRef} className="mol-container w-full h-[500px]"></div>
      
      {loading && (
        <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center backdrop-blur-md z-30">
          <div className="w-10 h-10 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-[9px] font-black text-white uppercase tracking-widest">Resolving Model</p>
        </div>
      )}

      {status === 'available' && !loading && isAlphaFold && colorMode === 'confidence' && (
        <div className="absolute bottom-4 left-4 z-20 p-5 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-white/10 pointer-events-none shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <h5 className="text-[10px] font-black text-white uppercase tracking-[0.1em] mb-3 border-b border-white/10 pb-2">AlphaFold Confidence (pLDDT)</h5>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-md bg-[#0053D6] shadow-[0_0_8px_#0053D6]"></div>
              <span className="text-[9px] font-black text-white uppercase">Very High (&gt;90)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-md bg-[#65CBF3] shadow-[0_0_8px_#65CBF3]"></div>
              <span className="text-[9px] font-black text-white uppercase">Confident (70-90)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-md bg-[#FFDB13] shadow-[0_0_8px_#FFDB13]"></div>
              <span className="text-[9px] font-black text-white uppercase">Low (50-70)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-md bg-[#FF7D45] shadow-[0_0_8px_#FF7D45]"></div>
              <span className="text-[9px] font-black text-white uppercase">Very Low (&lt;50)</span>
            </div>
          </div>
          <p className="mt-3 text-[7px] text-slate-400 font-bold uppercase leading-tight max-w-[140px]">
            Scores &lt;50 are often a strong predictor of intrinsic disorder.
          </p>
        </div>
      )}

      <div className="absolute top-4 left-4 flex gap-2 z-20">
        <button 
          onClick={() => setColorMode('confidence')} 
          disabled={!isAlphaFold} 
          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border border-white/5 transition-all shadow-xl ${colorMode === 'confidence' && isAlphaFold ? 'bg-indigo-600 text-white' : 'bg-slate-950/80 text-slate-400 disabled:opacity-30 hover:bg-slate-800'}`}
        >
          Confidence
        </button>
        <button 
          onClick={() => setColorMode('spectrum')} 
          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border border-white/5 transition-all shadow-xl ${colorMode === 'spectrum' || !isAlphaFold ? 'bg-indigo-600 text-white' : 'bg-slate-950/80 text-slate-400 hover:bg-slate-800'}`}
        >
          Spectrum
        </button>
      </div>

      {status === 'available' && !loading && (
        <div className="absolute bottom-4 right-4 z-20">
          <button 
            onClick={() => { glViewer.current?.zoomTo(); glViewer.current?.render(); }}
            className="w-10 h-10 bg-slate-950/80 border border-white/10 text-white rounded-xl flex items-center justify-center hover:bg-indigo-600 transition-all shadow-2xl"
            title="Reset View"
          >
            <i className="fa-solid fa-expand text-xs"></i>
          </button>
        </div>
      )}
    </div>
  );
});

export default ProteinViewer;
