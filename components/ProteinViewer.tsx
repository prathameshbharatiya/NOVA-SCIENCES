import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Mutation, StructureStatus } from '../types';

interface ProteinViewerProps {
  uniprotId: string;
  pdbId?: string;
  localData?: string;
  mutation?: Mutation | null;
  onStructureStatus?: (status: StructureStatus) => void;
}

export interface ProteinViewerHandle {
  getSnapshots: () => { full: string; zoomed: string };
}

declare global {
  interface Window { $3Dmol: any; }
}

const structureCache: Record<string, string> = {};

const ProteinViewer = forwardRef<ProteinViewerHandle, ProteinViewerProps>(({ uniprotId, pdbId, localData, mutation, onStructureStatus }, ref) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const glViewer = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StructureStatus>('idle');
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => { onStructureStatus?.(status); }, [status, onStructureStatus]);

  useImperativeHandle(ref, () => ({
    getSnapshots: () => {
      if (!glViewer.current || status !== 'available') return { full: '', zoomed: '' };
      const viewer = glViewer.current;
      viewer.zoomTo();
      const full = viewer.png();
      if (mutation) {
        viewer.zoomTo({ resi: mutation.position });
        return { full, zoomed: viewer.png() };
      }
      return { full, zoomed: full };
    }
  }));

  const handleSkip = () => {
    setLoading(false);
    setStatus('unavailable');
    setShowSkip(false);
  };

  useEffect(() => {
    if (!viewerRef.current || !window.$3Dmol) return;
    if (!glViewer.current) {
      glViewer.current = window.$3Dmol.createViewer(viewerRef.current, { backgroundColor: '#0f172a', antialias: true });
    }

    const viewer = glViewer.current;
    viewer.clear();
    setLoading(true);
    setStatus('fetching');
    setShowSkip(false);

    const skipTimer = setTimeout(() => setShowSkip(true), 3000);

    const loadData = async () => {
      const id = uniprotId?.trim();
      const pdb = pdbId?.trim();

      if (id && structureCache[id]) {
        viewer.addModel(structureCache[id], "pdb");
        viewer.zoomTo();
        setLoading(false);
        setStatus('available');
        return;
      }

      try {
        // Try AlphaFold DB first
        if (id) {
          const res = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${id}`);
          if (res.ok) {
            const data = await res.json();
            if (data[0]?.pdbUrl) {
              const pdbRes = await fetch(data[0].pdbUrl);
              const pdbText = await pdbRes.text();
              structureCache[id] = pdbText;
              viewer.addModel(pdbText, "pdb");
              viewer.zoomTo();
              setLoading(false);
              setStatus('available');
              return;
            }
          }
        }

        // Try RCSB PDB Fallback
        const targetPdb = pdb || (id === 'P04637' ? '1TUP' : null);
        if (targetPdb) {
          window.$3Dmol.download(`pdb:${targetPdb}`, viewer, {
            onfinish: () => { setLoading(false); setStatus('available'); viewer.zoomTo(); },
            onerror: () => handleSkip()
          });
          return;
        }

        handleSkip();
      } catch (err) {
        handleSkip();
      }
    };

    loadData();
    return () => clearTimeout(skipTimer);
  }, [uniprotId, pdbId]);

  useEffect(() => {
    if (!loading && glViewer.current && status === 'available' && mutation) {
      const viewer = glViewer.current;
      viewer.removeAllLabels();
      viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
      const sel = { resi: mutation.position };
      viewer.addStyle(sel, { stick: { radius: 0.8, color: 'red' }, sphere: { radius: 1.5, color: 'red' } });
      viewer.addLabel(`${mutation.wildtype}${mutation.position}${mutation.mutant}`, { fontSize: 10, position: sel });
      viewer.zoomTo(sel, 500);
      viewer.render();
    }
  }, [mutation, loading, status]);

  return (
    <div className="relative rounded-3xl overflow-hidden bg-slate-900 h-[500px]">
      <div ref={viewerRef} className="w-full h-full"></div>
      {loading && (
        <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-10">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[10px] text-white font-black uppercase tracking-widest">Resolving...</p>
          {showSkip && <button onClick={handleSkip} className="mt-4 text-[9px] text-slate-400 underline uppercase">Skip Viewer</button>}
        </div>
      )}
    </div>
  );
});

export default ProteinViewer;