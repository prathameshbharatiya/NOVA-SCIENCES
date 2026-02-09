
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

export interface Mutation {
  wildtype: string;
  position: number;
  mutant: string;
}

export interface EnergyBreakdown {
  vanDerWaals: number;
  electrostatics: number;
  hBonds: number;
  solvation: number;
}

export interface BenchmarkAlignment {
  dataset: string;
  alignmentScore: number;
  correlationType?: 'Direct' | 'Heuristic' | 'Structural Similarity';
  keyInsight: string;
}

export interface RecommendedMutation {
  rank: number;
  mutation: string;
  goalAlignment: string;
  confidence: string;
  rationale: string;
  risk: string;
  litScore: number;
}

export interface DiscouragedMutation {
  mutation: string;
  risk: string;
  signal: string;
  litScore: number;
}

export interface LearningProgress {
  reRankedCount: number;
  learnedPattern: string;
}

export interface DecisionMemo {
  confidenceMode: string;
  summary: string;
  recommended: RecommendedMutation[];
  discouraged: DiscouragedMutation[];
  environmentalRoadmapImpact: string;
  learningProgress: LearningProgress;
  groundingUrls?: string[];
}

export interface PredictionResult {
  protein: string;
  uniprotId: string;
  mutation: string;
  deltaDeltaG: number; 
  stabilityImpact: 'Stabilizing' | 'Neutral' | 'Destabilizing' | 'Highly Destabilizing';
  confidence: number; 
  confidenceMode?: string;
  overallLiteratureAlignment: number; 
  regime: MutationRegime;
  patternAnchors: string[];
  signalConsistency: 'High Agreement' | 'Conflicting Signals' | 'Neutral';
  reportSummary: string;
  goalAlignment: 'High' | 'Medium' | 'Low';
  scientificPapers: ScientificPaper[];
  benchmarkAlignments: BenchmarkAlignment[];
  reproducibility: ReproducibilityMetadata;
  environmentalAnalysis?: EnvironmentalImpact;
  energyBreakdown?: EnergyBreakdown;
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

export interface DecisionLogEntry {
  id: string;
  timestamp: string;
  proteinName: string;
  uniprotId: string;
  mutationTested: string;
  prediction?: PredictionResult;
  userNotes: string;
  assayType?: string;
  timeRequired?: string; // hours/days
  resourceIntensity?: 'Low' | 'Medium' | 'High';
  outcome: 'Success' | 'Partial' | 'Fail' | 'Not Tested Yet';
  numericScore?: number;
  environment: ExperimentalEnvironment;
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
}
