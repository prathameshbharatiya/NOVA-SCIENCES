
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

const ProteinViewer = forwardRef<ProteinViewerHandle, ProteinViewerProps>(({ uniprotId, pdbId, localData, mutation, onStructureStatus }, ref) => {
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
        if (typeof v.png === 'function') return v.png();
        if (typeof v.pngURI === 'function') return v.pngURI();
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
    const cleanId = uId.trim().toUpperCase();
    const cleanPdb = pId?.trim().toUpperCase();

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
        viewer.resize(); // Fix for missing structure on initialization
        viewer.render();
        setLoading(false);
        setStatus('available');
      } catch (err) {
        setLoading(false);
        setStatus('unavailable');
      }
    };

    loadData();

    const handleResize = () => viewer.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [uniprotId, pdbId]);

  useEffect(() => {
    if (!loading && glViewer.current && status === 'available' && mutation) {
      const viewer = glViewer.current;
      viewer.removeAllLabels();
      viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
      const sel = { resi: mutation.position };
      viewer.addStyle(sel, { stick: { radius: 0.8, color: 'red' }, sphere: { radius: 1.5, color: 'red' } });
      viewer.addLabel(`${mutation.wildtype}${mutation.position}${mutation.mutant}`, { 
        fontSize: 12, 
        fontColor: 'white',
        backgroundColor: 'black',
        backgroundOpacity: 0.8,
        position: sel 
      });
      viewer.zoomTo(sel, 800);
      viewer.render();
    }
  }, [mutation, loading, status]);

  return (
    <div className="relative rounded-3xl overflow-hidden bg-slate-900 h-[500px] border-2 border-slate-800 shadow-2xl">
      <div ref={viewerRef} className="w-full h-full"></div>
      {loading && (
        <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[10px] text-white font-black uppercase tracking-widest animate-pulse">Resolving Coordinates...</p>
        </div>
      )}
      {status === 'unavailable' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-slate-500 p-10 text-center">
           <i className="fa-solid fa-eye-slash text-4xl mb-4 text-rose-500"></i>
           <p className="text-[12px] font-black uppercase tracking-widest text-white">Structure Unavailable</p>
        </div>
      )}
    </div>
  );
});

export default ProteinViewer;
