export enum ScientificGoal {
  STABILITY = 'Stability Improvement',
  BINDING = 'Binding/Interface Optimization',
  ROBUSTNESS = 'Functional Robustness',
  EXPLORATORY = 'Exploratory Scanning'
}

export enum RiskTolerance {
  LOW = 'Low (Conservative)',
  MEDIUM = 'Medium (Balanced)',
  HIGH = 'High (Exploratory)'
}

export interface ExperimentalPreset {
  name: string;
  description: string;
  values: string;
}

export interface PriorResult {
  mutation: string;
  outcome: 'Positive' | 'Neutral' | 'Negative';
  notes?: string;
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
  riskBreakdown: string;
  clinicalSignificance: string;
  references: string[];
  reproducibility: ReproducibilityMetadata;
  reportSummary: string;
  disclaimer: string;
  goalAlignment: 'High' | 'Medium' | 'Low';
  tradeOffAnalysis: string;
  justification: string;
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
  logInsights?: string;
}

export interface DecisionLogEntry {
  id: string;
  timestamp: string;
  proteinName: string;
  uniprotId: string;
  goal: ScientificGoal;
  riskTolerance: RiskTolerance;
  preserveRegions: string;
  environment: string;
  mutationTested: string;
  prediction?: PredictionResult;
  memo?: DecisionMemo;
  snapshots?: { full: string; zoomed: string };
  userNotes: string;
  outcome: 'Positive' | 'Neutral' | 'Negative' | 'Not Tested Yet';
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