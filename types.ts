
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

export enum MutationRegime {
  WELL_UNDERSTOOD = 'Well-understood regime',
  MODERATE = 'Moderately-understood regime',
  FRONTIER = 'Frontier regime'
}

export interface ExperimentalEnvironment {
  ph: number;
  temp: number;
  ionicStrength: number;
  bufferSystem: string;
}

export interface ExperimentalPreset {
  name: string;
  description: string;
  values: string;
}

export interface EnvironmentalImpact {
  leverageFactor: number;
  reasoning: string;
  sensitivity: 'High' | 'Moderate' | 'Low';
  shiftAmount: number;
}

export interface ScientificPaper {
  title: string;
  journal: string;
  year: number;
  url: string;
  relevance: string;
}

export interface PriorResult {
  mutation: string;
  outcome: 'Positive' | 'Neutral' | 'Negative' | 'Not Tested Yet';
  notes?: string;
  assayType?: string;
  resourceIntensity?: 'Low' | 'Medium' | 'High';
  timeRequired?: string;
}

export interface Mutation {
  wildtype: string;
  position: number;
  mutant: string;
}

export interface BenchmarkAlignment {
  dataset: string;
  alignmentScore: number;
  correlationType: 'Direct' | 'Heuristic' | 'Structural Similarity';
  keyInsight: string;
}

export interface ConfidenceBreakdown {
  structuralConfidence: 'High' | 'Medium' | 'Low';
  disorderRisk: 'Low' | 'Medium' | 'High';
  experimentalEvidence: 'None' | 'Mixed' | 'Supporting' | 'Contradictory';
  overallConfidence: 'High' | 'Medium' | 'Low';
  confidenceRationale: string;
}

export interface PredictionResult {
  protein: string;
  uniprotId: string;
  mutation: string;
  deltaDeltaG: number; 
  stabilityImpact: 'Stabilizing' | 'Neutral' | 'Destabilizing' | 'Highly Destabilizing';
  confidence: number; 
  regime: MutationRegime;
  patternAnchors: string[];
  signalConsistency: 'High Agreement' | 'Conflicting Signals' | 'Neutral';
  assumptions: string[];
  reportSummary: string;
  goalAlignment: 'High' | 'Medium' | 'Low';
  tradeOffAnalysis?: string;
  justification?: string;
  isValidatedReference: boolean;
  confidenceMode: 'Validated Reference Mode' | 'General Reasoning Mode';
  benchmarkAlignments: BenchmarkAlignment[];
  scientificPapers: ScientificPaper[];
  reproducibility: ReproducibilityMetadata;
  empiricalShift?: {
    direction: 'Up' | 'Down' | 'Neutral';
    magnitude: number;
    reason: string;
  };
  environmentalAnalysis?: EnvironmentalImpact;
  structuralAnalysis?: string;
  comparativeContext?: string;
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
  confidenceMode: 'Validated Reference Mode' | 'General Reasoning Mode';
  learningProgress?: {
    learnedPattern: string;
    reRankedCount: number;
    adjustedUncertainty: string;
  };
  environmentalRoadmapImpact?: string;
}

export interface DecisionLogEntry {
  id: string;
  timestamp: string;
  proteinName: string;
  uniprotId: string;
  goal: ScientificGoal;
  mutationTested: string;
  prediction?: PredictionResult;
  memo?: DecisionMemo;
  userNotes: string;
  outcome: 'Positive' | 'Neutral' | 'Negative' | 'Not Tested Yet';
  assayType?: string;
  resourceIntensity?: 'Low' | 'Medium' | 'High';
  timeRequired?: string;
  environment: ExperimentalEnvironment;
}

export interface SystemAuditTrail {
  sessionId: string;
  startTime: string;
  events: Array<{
    timestamp: string;
    feature: string;
    details: string;
  }>;
}

export type StructureStatus = 'idle' | 'fetching' | 'available' | 'unavailable' | 'error';

export interface ProteinMetadata {
  id: string; 
  pdbId?: string; 
  name: string;
  description: string;
  length: number;
  sourceType: 'AlphaFold' | 'User-Uploaded' | 'Demo' | 'Sequence-Only';
  suggestedMutations?: SuggestedMutation[];
  structureStatus?: StructureStatus;
  isValidatedReference?: boolean;
  referenceContext?: string;
}
