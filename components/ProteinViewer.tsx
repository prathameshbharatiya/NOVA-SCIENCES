import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Mutation, StructureStatus } from '../types';

interface ProteinViewerProps {
  uniprotId: string;
  pdbId?: string;
  localData?: string;
  mutation?: Mutation | null;
  showIdealizedMutant?: boolean;
  onStructureStatus?: (status: StructureStatus) => void;
}

export interface ProteinViewerHandle {
  getSnapshots: () => { full: string; zoomed: string };
}

declare global {
  interface Window { $3Dmol: any; }
}

/**
 * Enhanced Idealized side-chain offsets relative to CA.
 */
const SIDE_CHAIN_TEMPLATES: Record<string, number[][]> = {
  'A': [[1.5, 1.5, 1.5]], 
  'C': [[1.5, 1.5, 1.5], [2.5, 2.5, 2.5]],
  'D': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [3.5, 3.0, 1.0], [3.5, 2.0, 2.0]],
  'E': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [3.5, 3.5, 1.5], [4.5, 4.0, 1.0], [4.5, 3.0, 2.0]],
  'F': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [4.0, 3.5, 1.5], [5.5, 3.5, 1.5], [5.5, 2.0, 1.5], [4.0, 2.0, 1.5]],
  'G': [], 
  'H': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [4.0, 3.5, 1.5], [5.0, 2.5, 1.5], [4.0, 1.5, 1.5]],
  'I': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [1.5, 3.0, 3.0], [2.5, 4.0, 4.0]],
  'K': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [3.5, 3.5, 1.5], [4.5, 4.5, 1.5], [5.5, 5.5, 1.5]],
  'L': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [4.0, 4.0, 1.0], [4.0, 2.0, 2.0]],
  'M': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [3.5, 3.5, 1.5], [4.5, 4.5, 1.5]],
  'N': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [3.5, 3.0, 1.0], [3.5, 2.0, 2.0]],
  'P': [[1.5, 1.5, 1.5], [2.5, 1.5, 1.5], [2.5, 0.0, 2.5]],
  'Q': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [3.5, 3.5, 1.5], [4.5, 4.0, 1.0], [4.5, 3.0, 2.0]],
  'R': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [3.5, 3.5, 1.5], [4.5, 4.5, 1.5], [5.5, 5.5, 1.5]],
  'S': [[1.5, 1.5, 1.5], [2.5, 2.5, 2.5]],
  'T': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [1.5, 3.0, 3.0]],
  'V': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [1.5, 3.0, 3.0]],
  'W': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [4.0, 3.5, 1.5], [5.5, 4.0, 1.5], [6.5, 2.5, 1.5], [5.5, 1.5, 1.5]],
  'Y': [[1.5, 1.5, 1.5], [2.5, 2.5, 1.5], [4.0, 3.5, 1.5], [5.5, 3.5, 1.5], [6.5, 3.5, 1.5], [5.5, 2.0, 1.5], [4.0, 2.0, 1.5]],
};

const ProteinViewer = forwardRef<ProteinViewerHandle, ProteinViewerProps>(({ uniprotId, pdbId, mutation, showIdealizedMutant, onStructureStatus }, ref) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const glViewer = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StructureStatus>('idle');

  useEffect(() => { onStructureStatus?.(status); }, [status, onStructureStatus]);

  useImperativeHandle(ref, () => ({
    getSnapshots: () => {
      if (!glViewer.current || status !== 'available') return { full: '', zoomed: '' };
      const viewer = glViewer.current;
      viewer.render();
      
      const capture = (v: any) => {
        try {
          if (typeof v.png === 'function') return v.png();
          if (typeof v.pngURI === 'function') return v.pngURI();
        } catch (e) { console.error('Snapshot capture failed', e); }
        return '';
      };

      viewer.zoomTo();
      viewer.render();
      const full = capture(viewer);
      
      if (mutation) {
        viewer.zoomTo({ resi: mutation.position });
        viewer.render();
        return { full, zoomed: capture(viewer) };
      }
      return { full, zoomed: full };
    }
  }));

  const fetchStructure = async (uId: string, pId?: string) => {
    const cleanId = (uId || '').trim().toUpperCase();
    const cleanPdb = (pId || '').trim().toUpperCase();

    if (cleanPdb) {
      try {
        const response = await fetch(`https://files.rcsb.org/download/${cleanPdb}.pdb`);
        if (response.ok) return await response.text();
      } catch (e) { console.warn('PDB Fetch failed:', e); }
    }

    try {
      const response = await fetch(`https://alphafold.ebi.ac.uk/files/AF-${cleanId}-F1-model_v4.pdb`);
      if (response.ok) return await response.text();
    } catch (e) { console.warn('AlphaFold V4 Fetch failed:', e); }

    try {
      const response = await fetch(`https://alphafold.ebi.ac.uk/files/AF-${cleanId}-F1-model_v1.pdb`);
      if (response.ok) return await response.text();
    } catch (e) { console.warn('AlphaFold V1 Fetch failed:', e); }

    throw new Error('Structural resolution failed.');
  };

  useEffect(() => {
    if (!viewerRef.current || !window.$3Dmol) return;
    
    if (!glViewer.current) {
      glViewer.current = window.$3Dmol.createViewer(viewerRef.current, { 
        backgroundColor: '#0f172a', 
        antialias: true,
        preserveDrawingBuffer: true 
      });
    }

    const viewer = glViewer.current;
    viewer.clear();
    setLoading(true);
    setStatus('fetching');

    const loadData = async () => {
      try {
        const data = await fetchStructure(uniprotId, pdbId);
        viewer.addModel(data, "pdb");
        viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
        viewer.zoomTo();
        viewer.resize();
        viewer.render();
        setLoading(false);
        setStatus('available');
      } catch (err) {
        setLoading(false);
        setStatus('unavailable');
      }
    };

    loadData();

    const handleResize = () => viewer && viewer.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [uniprotId, pdbId]);

  useEffect(() => {
    if (!loading && glViewer.current && status === 'available' && mutation) {
      const viewer = glViewer.current;
      viewer.removeAllLabels();
      viewer.removeAllShapes();
      
      viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
      const sel = { resi: mutation.position };
      
      // WILD-TYPE SIDE CHAIN
      viewer.addStyle(sel, { stick: { radius: 0.2, opacity: 0.3, color: 'lightgrey' } });
      
      viewer.addLabel(`${mutation.wildtype}${mutation.position}${mutation.mutant}`, { 
        fontSize: 16, 
        fontColor: 'white',
        backgroundColor: '#4f46e5',
        backgroundOpacity: 1.0,
        position: sel 
      });

      viewer.addLabel("LOCAL SIDE-CHAIN SUBSTITUTION (IDEALIZED)", {
        fontSize: 10,
        fontColor: '#ff0000',
        backgroundColor: 'black',
        backgroundOpacity: 0.9,
        position: { x: 10, y: 10, z: 0 },
        fixed: true
      });

      if (showIdealizedMutant) {
        const mutantCode = (mutation.mutant || 'A').toUpperCase();
        const template = SIDE_CHAIN_TEMPLATES[mutantCode] || [];
        
        const model = viewer.getModel();
        if (model) {
          const atoms = model.selectedAtoms(sel);
          if (atoms && atoms.length > 0) {
            const caAtom = atoms.find((a: any) => a.atom === 'CA');
            if (caAtom) {
              let prevPoint = { x: caAtom.x, y: caAtom.y, z: caAtom.z };
              template.forEach((offset) => {
                const nextPoint = { 
                  x: caAtom.x + offset[0], 
                  y: caAtom.y + offset[1], 
                  z: caAtom.z + offset[2] 
                };
                
                viewer.addCylinder({
                  start: prevPoint,
                  end: nextPoint,
                  radius: 0.5,
                  color: '#ff1111',
                  fromCap: 1,
                  toCap: 1
                });
                
                viewer.addSphere({
                  center: nextPoint,
                  radius: 0.7,
                  color: '#ff1111'
                });
                
                prevPoint = nextPoint; 
              });
            }
          }
        }
      }

      viewer.zoomTo(sel, 800);
      viewer.render();
    }
  }, [mutation, loading, status, showIdealizedMutant]);

  return (
    <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 h-[600px] border-4 border-slate-800 shadow-2xl">
      <div ref={viewerRef} className="w-full h-full"></div>
      
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 bg-black/40 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
         <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-[8px] font-black text-white uppercase tracking-widest">Mutant Side-Chain</span></div>
         <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-400"></span><span className="text-[8px] font-black text-white uppercase tracking-widest">Wild-Type Context</span></div>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[12px] text-white font-black uppercase tracking-widest animate-pulse">Resolving Coordinate Map...</p>
        </div>
      )}
      {status === 'unavailable' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-slate-500 p-10 text-center">
           <i className="fa-solid fa-eye-slash text-5xl mb-6 text-rose-500"></i>
           <p className="text-[14px] font-black uppercase tracking-widest text-white">Structural Data Point Unresolved</p>
        </div>
      )}
    </div>
  );
});

export default ProteinViewer;