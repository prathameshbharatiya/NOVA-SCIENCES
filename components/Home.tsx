import React from 'react';
import HomeProteinViewer from './HomeProteinViewer';
import { motion } from 'framer-motion';
import { MousePointer2, Info } from 'lucide-react';

interface HomeProps {
  onStart: () => void;
}

const Home: React.FC<HomeProps> = ({ onStart }) => {
  const [view, setView] = React.useState<'landing' | 'scientists' | 'benchmark' | 'whitepaper'>('landing');

  if (view === 'scientists') {
    return (
      <div className="min-h-screen bg-[#fcfdfe] pt-20 pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <button onClick={() => setView('landing')} className="text-indigo-600 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
            <i className="fa-solid fa-arrow-left"></i> Back to Home
          </button>
          <div className="space-y-4">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">Scientists Say This</h1>
            <p className="text-slate-400 font-bold uppercase text-[12px] tracking-[0.3em]">What did professors say when we asked about the problem?</p>
          </div>
          
          <div className="grid gap-8">
            {[
              { quote: "It is an unavoidable part of the process, and we spend a lot of time using stats and reading the literature to choose the next steps.", author: "Prof. Swati Patankar, IITB" },
              { quote: "It's true. I have four active projects and knowing which mutation or which gene is going to be the \"correct\" one is often difficult to know.", author: "Rishabh, Researcher" },
              { quote: "AI is of big help for prediction. However discovery of new mutations is always challenging and time taking.", author: "Prof. Sudip, IIT BHU" },
              { quote: "In most cases this is an unavoidable part of the ball game.", author: "Prof. Anirban Banerjee, IITB" },
              { quote: "Dealing with a large class of varied simpler soft matter research problems, one might hope to make a 'right guess'. One then needs to check out the 'guess' with appropriate calculations and matching numbers with experiments.", author: "Prof. Apratin Chaterjee, IISER Pune" }
            ].map((q, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-4 relative overflow-hidden group hover:border-indigo-500 transition-all">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <i className="fa-solid fa-quote-right text-8xl"></i>
                </div>
                <p className="text-xl font-medium text-slate-700 leading-relaxed italic">"{q.quote}"</p>
                <p className="text-indigo-600 font-black uppercase text-xs tracking-widest">— {q.author}</p>
              </div>
            ))}
            <p className="text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.5em] pt-8">...and many more</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'benchmark') {
    return (
      <div className="min-h-screen bg-[#fcfdfe] pt-20 pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <button onClick={() => setView('landing')} className="text-indigo-600 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
            <i className="fa-solid fa-arrow-left"></i> Back to Home
          </button>
          <div className="space-y-4">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">Benchmark</h1>
            <p className="text-slate-400 font-bold uppercase text-[12px] tracking-[0.3em]">nova sciences is benchmarked against industry-standard datasets</p>
          </div>

          <div className="grid gap-6">
            {[
              { name: "ProTherm Dataset", desc: "Thermodynamic Database for Proteins and Mutants", url: "https://www.iitm.ac.in/bioinfo/protherm/protherm.html" },
              { name: "Ssym Database", desc: "Symmetry-based evaluation of mutation stability", url: "https://github.com/devalab/Ssym" },
              { name: "FireProtDB", desc: "Curated database of protein stability data", url: "https://loschmidt.chemi.muni.cz/fireprotdb/" },
              { name: "SKEMPI 2.0", desc: "Structural database of kinetics and energetics of mutant protein interactions", url: "https://life.bsc.es/pid/skempi2/" }
            ].map((b, i) => (
              <a key={i} href={b.url} target="_blank" rel="noopener noreferrer" className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-500 transition-all">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{b.name}</h3>
                  <p className="text-slate-500 font-medium">{b.desc}</p>
                </div>
                <i className="fa-solid fa-arrow-up-right-from-square text-slate-300 group-hover:text-indigo-500 transition-colors"></i>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'whitepaper') {
    return (
      <div className="min-h-screen bg-[#fcfdfe] pt-20 pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <button onClick={() => setView('landing')} className="text-indigo-600 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
            <i className="fa-solid fa-arrow-left"></i> Back to Home
          </button>
          
          <article className="bg-white p-12 lg:p-20 rounded-[3rem] border-2 border-slate-100 shadow-xl space-y-12 text-slate-800 leading-relaxed">
            <header className="space-y-6 text-center border-b-2 border-slate-50 pb-12">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                A Structural Reasoning Framework for Rapid Thermodynamic Mutation Screening and Strategic Protein Engineering
              </h1>
              <div className="space-y-2">
                <p className="text-indigo-600 font-black uppercase text-lg tracking-widest">nova sciences</p>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Structural Bioinformatics Platform • Protein Engineering Research</p>
              </div>
            </header>

            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">Abstract</h2>
              <p>Mutation-induced changes in protein stability remain a central challenge in rational protein engineering. Existing computational approaches rely heavily on atomistic force fields, Monte Carlo sampling, and conformational minimization, which offer detailed energy landscapes at the expense of computational cost and interpretability.</p>
              <p>We introduce nova sciences, a structural bioinformatics platform that integrates coordinate-aware structural reasoning, heuristic thermodynamic decomposition, environmental conditioning, empirical dataset benchmarking, and literature-grounded validation into a rapid mutation prioritization engine. Unlike atomistic molecular modeling systems, nova sciences operates as an interpretable, high-speed pre-filtering layer that reduces experimental search space while maintaining thermodynamic plausibility.</p>
              <p>We formalize the structural reasoning paradigm, define heuristic energy decomposition equations, describe environmental leverage modeling, and establish a benchmarking protocol against curated mutation datasets. nova sciences introduces a composite confidence metric derived from structural quality, substitution regime familiarity, and literature consensus, positioning it as a decision-intelligence layer that complements, rather than replaces, physics-based simulation engines.</p>
              <p className="italic text-slate-500">Keywords: protein stability, ΔΔG prediction, rational protein engineering, heuristic thermodynamics, structural bioinformatics, mutation screening, sim-to-real biology</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">1. Introduction</h2>
              <p>Accurate prediction of mutation-induced changes in protein folding stability is a foundational requirement in rational protein engineering. The fundamental quantity of interest is the folding free energy difference upon mutation:</p>
              <div className="bg-slate-50 p-6 rounded-2xl text-center font-mono text-indigo-600 font-bold">
                ΔΔG = ΔGmutant − ΔGwildtype
              </div>
              <p>where ΔG represents the Gibbs free energy of folding. By convention, ΔΔG &gt; 0 indicates a stabilizing mutation and ΔΔG &lt; 0 indicates a destabilizing one. The total folding free energy decomposes into enthalpic and entropic contributions:</p>
              <div className="bg-slate-50 p-6 rounded-2xl text-center font-mono text-indigo-600 font-bold">
                ΔG = ΔH − TΔS
              </div>
              <p>where ΔH captures bonding and electrostatic interactions and ΔS captures conformational and solvent entropy changes. Existing computational tools approximate these quantities through molecular mechanics force fields:</p>
              <div className="bg-slate-50 p-6 rounded-2xl text-center font-mono text-indigo-600 font-bold">
                Etotal = Evdw + Eelectrostatic + Esolvation + Etorsion + Eentropy
              </div>
              <p>These systems require conformational sampling and energy minimization, steps that are computationally expensive and, in many cases, poorly parallelizable with experimental design cycles. In experimental practice, however, a large fraction of mutation decisions are made through structural reasoning heuristics rather than full simulation: a trained structural biologist inspects local packing, solvent exposure, charged-residue environment, and conservation to develop intuitive predictions about mutational impact. nova sciences formalizes, systematizes, and scales this reasoning process into a deterministic, interpretable computational engine.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">2. Conceptual Framework</h2>
              <p>nova sciences operates under the following central hypothesis:</p>
              <div className="bg-indigo-50 p-8 rounded-[2rem] border-2 border-indigo-100 italic font-medium text-indigo-900">
                <strong>Core Hypothesis.</strong> Local structural context combined with thermodynamic heuristics can approximate mutation stability impact sufficiently to reduce experimental search space prior to heavy-compute validation, without requiring conformational sampling or full energy minimization.
              </div>
              <p>The framework comprises seven tightly coupled modules that process a mutation query in a deterministic, interpretable pipeline:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Structural Canonicalization:</strong> maps protein identifiers to high-quality experimental structures.</li>
                <li><strong>Local Coordinate Context Extraction:</strong> characterizes the physico-chemical environment at the mutation site.</li>
                <li><strong>Heuristic Energy Decomposition:</strong> estimates packing, electrostatic, hydrogen bond, and hydrophobic contributions to ΔΔG.</li>
                <li><strong>Environmental Conditioning:</strong> adjusts predictions for pH, temperature, and ionic strength.</li>
                <li><strong>Strategic Risk Classification:</strong> stratifies mutations by structural criticality and conservation.</li>
                <li><strong>Confidence Quantification:</strong> assigns a composite reliability score to each prediction.</li>
                <li><strong>Literature-Grounded Verification:</strong> cross-references predictions against curated experimental datasets and published literature.</li>
              </ul>
            </section>

            <div className="text-center py-12">
              <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.5em]">Full paper continues below...</p>
            </div>

            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">3. Protein Canonicalization and Structural Selection</h2>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">3.1 Identity Resolution</h3>
              <p>The canonicalization module maps input protein names, gene identifiers, or accession numbers to their canonical UniProt identifiers, then retrieves all available experimental structures from the Protein Data Bank (PDB). When multiple structures exist for the same protein, a structural quality factor Qstruct is computed to select the optimal representative:</p>
              <div className="bg-slate-50 p-6 rounded-2xl text-center font-mono text-indigo-600 font-bold">
                Qstruct = α · (1 / Resolution) + β · Completeness
              </div>
              <p>Selection additionally filters against structures with major missing loop regions, non-physiological biological assemblies, or anomalous crystal contacts. The highest-Qstruct structure is designated the canonical representative for all subsequent analysis.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">4. Local Structural Context Modeling</h2>
              <p>For each residue i undergoing mutation, nova sciences defines a local neighborhood Ni comprising all residues j whose centers lie within a distance threshold r:</p>
              <div className="bg-slate-50 p-6 rounded-2xl text-center font-mono text-indigo-600 font-bold">
                Ni = {'{'} j | dij ≤ r {'}'}
              </div>
              <p>Within Ni, nova sciences extracts the following structural features: Solvent Accessibility, Secondary Structure Assignment, Contact Density, Salt Bridge Partners, Hydrogen Bond Partners, and Packing Density.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">5. Heuristic Thermodynamic Decomposition</h2>
              <p>nova sciences approximates the folding free energy change upon mutation as a sum of four independent heuristic contributions:</p>
              <div className="bg-slate-50 p-6 rounded-2xl text-center font-mono text-indigo-600 font-bold">
                ΔΔG ≈ ΔEpack + ΔEelec + ΔEhb + ΔEhydro
              </div>
              <p>Each term is computed from the local structural context without global energy minimization.</p>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">5.1 Packing Energy</h3>
              <p>The packing contribution is computed from the side-chain volume difference upon mutation: ΔV = Vmut − Vwt. For buried residues, a cavity penalty applies when ΔV &lt; 0.</p>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">5.2 Electrostatic Contribution</h3>
              <p>The electrostatic perturbation is computed from the formal charge difference: ΔEelec ∝ Σj ∈ Ni (Δq · qj) / (εlocal · rij).</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">6. Entropy Considerations</h2>
              <p>nova sciences approximates ΔSconf through three heuristic rules: Side-Chain Flexibility, Proline Insertion Penalty, and Glycine Restriction Penalty.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">7. Environmental Conditioning Module</h2>
              <p>7.1 pH Modeling: Effective charge is computed from the Henderson–Hasselbalch equation. 7.2 Thermal Sensitivity: nova sciences captures thermal sensitivity via LT = e|ΔΔG| / RT. 7.3 Ionic Strength: Debye–Hückel approximation relates the screening length to ionic strength I.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">8. Strategic Mutation Risk Classification</h2>
              <p>nova sciences classifies each mutation by strategic risk using three scores: Structural Anchor Score, Conservation Score, and Packing Criticality.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">9. Confidence Quantification</h2>
              <div className="bg-slate-50 p-6 rounded-2xl text-center font-mono text-indigo-600 font-bold">
                Confidence = 0.4 · Qstruct + 0.3 · Cliterature + 0.3 · Ssubstitution
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">10. Benchmarking Protocol</h2>
              <p>nova sciences is evaluated against three complementary experimental datasets: curated repositories of experimental ΔΔG values from the ProTherm and Ssym databases.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">12. Computational Complexity</h2>
              <p>nova sciences is designed for near-instantaneous per-mutation analysis. Neighborhood extraction requires O(N) time. For a typical single-domain protein, analysis completes in seconds.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">17. Conclusion</h2>
              <p>We have introduced nova sciences, a structural reasoning framework for rapid thermodynamic mutation screening in protein engineering. The platform formalizes the coordinate-aware heuristic reasoning that structural biologists apply intuitively, instantiating it as a deterministic, interpretable, and computationally efficient pipeline.</p>
              <p>By positioning nova sciences as a decision-intelligence pre-filtering layer rather than a replacement for physics-based engines, the framework inserts naturally into tiered protein engineering workflows, reducing experimental search space and accelerating rational design iteration without sacrificing accuracy of final physics-based validation.</p>
            </section>
            
            <footer className="pt-12 border-t-2 border-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
              © 2026 nova sciences Research Division
            </footer>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfe] overflow-hidden relative">
      {/* Biology-inspired background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-50 rounded-full blur-[120px] opacity-50 -z-10 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-50 rounded-full blur-[100px] opacity-40 -z-10"></div>
      
      <nav className="max-w-7xl mx-auto px-10 py-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-[#0f172a] p-3 rounded-2xl shadow-xl text-white">
            <i className="fa-solid fa-dna text-xl"></i>
          </div>
          <h1 className="text-2xl font-black lowercase tracking-tight text-slate-900">nova sciences <span className="text-indigo-600">0.2.5v</span></h1>
        </div>
        <div className="hidden lg:flex items-center gap-10">
          <button onClick={() => setView('scientists')} className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">Scientists Say</button>
          <button onClick={() => setView('benchmark')} className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">Benchmark</button>
          <button onClick={() => setView('whitepaper')} className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">White Paper</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-10 pt-20 lg:pt-32 pb-32 grid lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-10">
          <div className="space-y-6">
            <span className="bg-indigo-50 text-indigo-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] inline-block">Next-Gen Structural Intelligence</span>
            <h2 className="text-6xl lg:text-8xl font-black text-slate-900 tracking-tighter uppercase leading-[0.85]">
              Protein <br />
              <span className="text-indigo-600">Engineering</span> <br />
              Redefined.
            </h2>
            <p className="text-xl text-slate-500 font-medium max-w-lg leading-relaxed">
              nova sciences is a structural bioinformatics platform that accelerates mutation screening through coordinate-aware reasoning and heuristic thermodynamics.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={onStart}
              className="bg-[#0f172a] text-white px-10 py-6 rounded-[2rem] font-black uppercase text-sm shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 group"
            >
              Use nova sciences MVP <i className="fa-solid fa-bolt text-indigo-400 group-hover:scale-125 transition-transform"></i>
            </button>
            <button 
              onClick={() => setView('whitepaper')}
              className="bg-white border-2 border-slate-100 text-slate-900 px-10 py-6 rounded-[2rem] font-black uppercase text-sm shadow-sm hover:border-indigo-500 transition-all flex items-center justify-center gap-3"
            >
              Read White Paper <i className="fa-solid fa-file-lines text-slate-300"></i>
            </button>
          </div>

          <div className="pt-10 grid grid-cols-1 gap-8 border-t border-slate-100">
            <div>
              <div className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Rapid</div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Synthesis Speed</div>
            </div>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative hidden lg:block"
        >
          <div className="bg-white p-4 rounded-[3rem] shadow-2xl border-2 border-slate-50 relative z-10 overflow-hidden group">
            <div className="relative h-[600px] w-full bg-slate-50 rounded-[2.5rem] overflow-hidden">
              <HomeProteinViewer pdbId="6VXX" className="w-full h-full" />
              
              {/* Interactive Overlay */}
              <div className="absolute top-6 left-6 z-20 pointer-events-none">
                <div className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-white/10">
                  <MousePointer2 className="w-3 h-3 text-indigo-400" />
                  Interactive 3D Structure
                </div>
              </div>

              <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md text-slate-900 px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-slate-200 shadow-sm">
                  <Info className="w-3 h-3 text-indigo-600" />
                  SARS-CoV-2 Spike Protein (6VXX)
                </div>
              </div>

              {/* Interaction Hint */}
              <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-full p-4 scale-90 group-hover:scale-100 transition-transform">
                  <p className="text-white text-[10px] font-black uppercase tracking-widest">Click & Drag to Explore</p>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative DNA-like elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        </motion.div>
      </main>

      <section className="bg-slate-50 py-32">
        <div className="max-w-7xl mx-auto px-10 space-y-20">
          <div className="text-center space-y-4">
            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">What nova sciences Solves</h3>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.5em]">Bridging the gap between simulation and experiment</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-10">
            {[
              { title: "Search Space Reduction", desc: "Reduces experimental search space by eliminating destabilizing mutations before wet-lab testing.", icon: "fa-vial-circle-check" },
              { title: "Heuristic Speed", desc: "Optimized complexity allows proteome-scale screening in seconds, not days.", icon: "fa-gauge-high" },
              { title: "Interpretable Results", desc: "Decomposes ΔΔG into physically motivated terms for clear structural rationale.", icon: "fa-brain" }
            ].map((f, i) => (
              <div key={i} className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-6 hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 text-2xl">
                  <i className={`fa-solid ${f.icon}`}></i>
                </div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{f.title}</h4>
                <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#0f172a] p-2 rounded-xl text-white">
              <i className="fa-solid fa-dna"></i>
            </div>
            <span className="font-black uppercase tracking-widest text-slate-900">nova sciences</span>
          </div>
          <div className="flex gap-10">
            <button onClick={() => setView('scientists')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">Scientists Say</button>
            <button onClick={() => setView('benchmark')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">Benchmark</button>
            <button onClick={() => setView('whitepaper')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">White Paper</button>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">© 2026 nova sciences. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
