import { ExperimentalPreset } from "./types";

export const AMINO_ACIDS = [
  'A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'Y'
];

export const EXPERIMENTAL_PRESETS: ExperimentalPreset[] = [
  { name: 'Physiological', description: 'Human body core', values: 'pH 7.4, 37°C, 150mM NaCl' },
  { name: 'Lysosomal', description: 'Acidic degradation', values: 'pH 4.8, 37°C, Low Ionic Strength' },
  { name: 'Cryo-EM', description: 'Low temp imaging', values: 'pH 8.0, 4°C, 50mM HEPES, 100mM NaCl' },
  { name: 'Hyper-Saline', description: 'High salt stability', values: 'pH 7.0, 25°C, 2M NaCl, 10% Glycerol' },
  { name: 'Denaturing', description: 'Urea-induced stress', values: 'pH 7.5, 25°C, 4M Urea, 1mM DTT' }
];

export interface ReferenceProtein {
  id: string;
  name: string;
  relevance: string;
  why: string;
  pdbId: string;
  icon: string;
  context: string;
}

export const REFERENCE_PROTEINS: ReferenceProtein[] = [
  { 
    id: 'P04637', 
    name: 'p53', 
    relevance: 'Tumor Suppressor', 
    why: 'Mutation-dense tumor suppressor with well-characterized structure–function trade-offs.',
    pdbId: '1TUP',
    icon: 'fa-dna',
    context: 'Highly sensitive in the DNA-binding domain; well-documented stability-function trade-offs.'
  },
  { 
    id: 'Q00987', 
    name: 'MDM2', 
    relevance: 'p53 Regulator', 
    why: 'Key oncology target; binding interface with p53 is a primary site for therapeutic engineering.',
    pdbId: '4IPF',
    icon: 'fa-virus-slash',
    context: 'Requires precise binding pocket geometry; sensitive hydrophobic surface residues.'
  },
  { 
    id: 'P42212', 
    name: 'GFP', 
    relevance: 'Green Fluorescent Protein', 
    why: 'The standard for engineering brightness and spectral properties; robust beta-barrel structure.',
    pdbId: '1GFL',
    icon: 'fa-sun',
    context: 'Core chromophore environment is highly sensitive to side-chain orientation within the beta-barrel.'
  },
  { 
    id: 'P0DTC2', 
    name: 'SARS-CoV-2 Spike', 
    relevance: 'Receptor Binding Protein', 
    why: 'Critical for vaccine and antibody engineering; large, complex trimeric structure.',
    pdbId: '6VXX',
    icon: 'fa-microbe',
    context: 'Large surface area with critical RBD stability required for antibody affinity.'
  },
  { 
    id: 'P01116', 
    name: 'KRAS', 
    relevance: 'Oncogenic GTPase', 
    why: 'Common driver of cancer; switch regions are critical for signaling and inhibitor binding.',
    pdbId: '4OBE',
    icon: 'fa-flask-vial',
    context: 'Dynamics of Switch I and II are extremely sensitive to mutations near the nucleotide binding site.'
  }
];