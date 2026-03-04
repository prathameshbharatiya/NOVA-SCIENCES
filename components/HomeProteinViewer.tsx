import React, { useEffect, useRef, useState } from 'react';

interface HomeProteinViewerProps {
  pdbId?: string;
  className?: string;
}

declare global {
  interface Window {
    $3Dmol: any;
  }
}

const HomeProteinViewer: React.FC<HomeProteinViewerProps> = ({ 
  pdbId = '6VXX', // SARS-CoV-2 Spike Protein - Very complex and recognizable
  className = '' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !window.$3Dmol) return;

    // Initialize viewer
    const config = { 
      backgroundColor: 'transparent',
      antialias: true,
      preserveDrawingBuffer: true 
    };
    
    if (!viewerRef.current) {
      viewerRef.current = window.$3Dmol.createViewer(containerRef.current, config);
    }

    const viewer = viewerRef.current;

    // Fetch and display protein
    const fetchProtein = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://files.rcsb.org/view/${pdbId}.pdb`);
        if (!response.ok) throw new Error('Failed to fetch PDB');
        const data = await response.text();
        
        viewer.clear();
        viewer.addModel(data, "pdb");
        
        // Styling for a "complex" look
        // We use 'spectrum' for a vibrant, complex feel
        viewer.setStyle({}, { 
          cartoon: { 
            color: 'spectrum',
            opacity: 0.9,
            thickness: 0.4
          } 
        });
        
        viewer.zoomTo();
        viewer.render();
        
        // Add a slow rotation for "interactivity" and "coolness"
        viewer.animate({ loop: "backward", step: 0.2 });
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading protein structure:", error);
        setIsLoading(false);
      }
    };

    fetchProtein();

    // Cleanup
    return () => {
      if (viewerRef.current) {
        viewerRef.current.clear();
      }
    };
  }, [pdbId]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ position: 'relative', minHeight: '400px' }}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10 rounded-[2.5rem]">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 animate-pulse">
            Loading Complex Structure...
          </p>
        </div>
      )}
    </div>
  );
};

export default HomeProteinViewer;
