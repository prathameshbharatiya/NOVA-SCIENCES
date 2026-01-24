
export enum ScientificGoal {
  STABILITY = 'Stability Improvement',
  BINDING = 'Binding/Interface Optimization',
  ROBUSTNESS = 'Functional Robustness',
  EXPLORATORY = 'Exploratory Scanning'
}

export interface PriorResult {
  mutation: string;
  outcome: 'Positive' | 'Neutral' | 'Negative';
}

export interface Mutation {
  wildtype: string;
  position: number;
  mutant: string;
}

export interface ReproducibilityMetadata {
  runId: string;
  timestamp: string;
  modelName: string;
  modelVersion: string;
  inputHash: string;
  dockerImageHash: string;
  structureSource: string;
  structureSourceDetails: string;
  viewerVersion: string;
}

export interface SuggestedMutation {
  residue: string;
  position: number;
  rationale: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface PredictionResult {
  protein: string;
  uniprotId: string;
  mutation: string;
  deltaDeltaG: number; 
  stabilityImpact: 'Stabilizing' | 'Neutral' | 'Destabilizing' | 'Highly Destabilizing';
  confidence: number; 
  relativeRank: number; 
  heuristicNotes: string[]; 
  warnings: string[];
  nextActions: string[];
  structuralAnalysis: string;
  functionalImpact: string;
  riskBreakdown: string; // New: Detailed explanation of risks
  clinicalSignificance: string;
  references: string[];
  reproducibility: ReproducibilityMetadata;
  reportSummary: string;
  disclaimer: string;
  goalAlignment: 'High' | 'Medium' | 'Low';
  tradeOffAnalysis: string;
  justification: string; // The refined "Rationale"
  isValidatedReference: boolean;
  guardrails?: {
    isLargeProtein: boolean;
    isInDisorderedRegion: boolean;
    isLowConfidenceSite: boolean;
  };
}

export interface DecisionMemo {
  recommended: Array<{
    rank: number;
    mutation: string;
    rationale: string;
    goalAlignment: string;
    confidence: string;
    risk: string;
  }>;
  discouraged: Array<{
    mutation: string;
    risk: string;
    signal: string;
  }>;
  summary: string;
  memoryContext: string;
  referenceContextApplied: boolean;
}

export type StructureStatus = 'idle' | 'fetching' | 'available' | 'unavailable' | 'error';

export interface ProteinMetadata {
  id: string; 
  pdbId?: string; 
  name: string;
  description: string;
  length: number;
  geneName?: string;
  organism?: string;
  sequence?: string;
  sourceType: 'AlphaFold' | 'User-Uploaded' | 'Demo' | 'Sequence-Only';
  pLDDTAvg?: number;
  suggestedMutations?: SuggestedMutation[];
  localData?: string; 
  structureStatus?: StructureStatus;
  isValidatedReference?: boolean;
  referenceContext?: string;
}
