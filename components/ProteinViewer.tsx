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
      viewer.zoomTo();
      const full = viewer.png();
      if (mutation) {
        viewer.zoomTo({ resi: mutation.position });
        return { full, zoomed: viewer.png() };
      }
      return { full, zoomed: full };
    }
  }));

  useEffect(() => {
    if (!viewerRef.current || !window.$3Dmol) return;
    if (!glViewer.current) {
      glViewer.current = window.$3Dmol.createViewer(viewerRef.current, { backgroundColor: '#0f172a', antialias: true });
    }

    const viewer = glViewer.current;
    viewer.clear();
    setLoading(true);
    setStatus('fetching');

    const id = uniprotId?.trim();
    const pdb = pdbId?.trim();

    const onFinish = () => {
      setLoading(false);
      setStatus('available');
      viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
      viewer.zoomTo();
      viewer.render();
    };

    const onError = () => {
      setLoading(false);
      setStatus('unavailable');
    };

    // Use $3Dmol's native downloaders for better CORS handling
    if (pdb) {
      window.$3Dmol.download(`pdb:${pdb}`, viewer, { onfinish: onFinish, onerror: onError });
    } else if (id) {
      // Try AlphaFold DB via native downloader
      window.$3Dmol.download(`afdb:${id}`, viewer, { 
        onfinish: onFinish, 
        onerror: () => {
          // Fallback for common reference p53 if AFDB lookup fails
          if (id === 'P04637') {
            window.$3Dmol.download(`pdb:1TUP`, viewer, { onfinish: onFinish, onerror: onError });
          } else {
            onError();
          }
        } 
      });
    } else {
      onError();
    }
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
        backgroundOpacity: 0.7,
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
          <p className="text-[10px] text-white font-black uppercase tracking-widest">Resolving Model...</p>
        </div>
      )}
      {status === 'unavailable' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-slate-500">
           <i className="fa-solid fa-eye-slash text-4xl mb-4"></i>
           <p className="text-[10px] font-black uppercase tracking-widest">Structural Reference Not Found</p>
        </div>
      )}
    </div>
  );
});

export default ProteinViewer;