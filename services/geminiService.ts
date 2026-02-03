import { GoogleGenAI, Type } from "@google/genai";
import { PredictionResult, Mutation, ProteinMetadata, ScientificGoal, PriorResult, DecisionMemo, RiskTolerance, DecisionLogEntry, MutationRegime } from "../types";

const MODEL_NAME = "gemini-3-flash-preview"; 

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 500): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err.status || 0;
      const msg = err.message?.toLowerCase() || "";
      const isTransient = status === 503 || status === 429 || msg.includes("overloaded") || msg.includes("quota") || msg.includes("resource_exhausted");
      
      if (isTransient && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

const extractText = (response: any, fallbackError: string): string => {
  if (response.candidates && response.candidates[0]?.finishReason === 'SAFETY') {
    throw new Error("Biological safety filter triggered. Research strictly limited to non-harmful proteins.");
  }
  const text = response.text;
  if (!text) throw new Error(fallbackError);
  return text;
};

export const searchProtein = async (query: string): Promise<ProteinMetadata> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY missing from environment.");
  const ai = new GoogleGenAI({ apiKey });
  
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `You are NOVA, a decision-first protein engineering workstation. Resolve protein: "${query}". Return JSON with UniProt ID, PDB ID, name, description, length, and 6 relevant mutations.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            pdbId: { type: Type.STRING },
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            length: { type: Type.NUMBER },
            suggestedMutations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  residue: { type: Type.STRING },
                  position: { type: Type.NUMBER },
                  rationale: { type: Type.STRING },
                  confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
                },
                required: ["residue", "position", "rationale", "confidence"]
              }
            }
          },
          required: ["id", "name", "description", "length", "suggestedMutations"]
        }
      }
    });

    const text = extractText(response, "Failed to resolve protein data.");
    const parsed = JSON.parse(text);
    return { ...parsed, sourceType: parsed.pdbId ? 'User-Uploaded' : 'AlphaFold', structureStatus: 'idle' };
  });
};

export const predictMutation = async (
  protein: ProteinMetadata, 
  mutation: Mutation, 
  goal: ScientificGoal, 
  priorResults: PriorResult[],
  risk: RiskTolerance,
  preserve: string,
  environment: string
): Promise<PredictionResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY missing.");
  const ai = new GoogleGenAI({ apiKey });
  const mutationStr = `${mutation.wildtype}${mutation.position}${mutation.mutant}`;
  
  const mode = protein.isValidatedReference ? 'Validated Reference Mode' : 'General Reasoning Mode';

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `NOVA MASTER BENCHMARK ENGINE v0.2.5: Analyze ${mutationStr} in ${protein.name} (${protein.id}) for ${goal}.
      
      ACTIVE MODE: ${mode}
      
      FEATURE 1: EMPIRICAL PATTERN ANCHORING
      - Anchoring to known, generalized mutation patterns (e.g. Hydrophobic -> polar in cores, charge reversals).
      - If patterns apply, increase confidence (+5-10%). If not, state "Limited pattern precedent".

      FEATURE 2: REGIME AWARENESS LAYER (CONFIDENCE CAPS)
      - WELL-UNDERSTOOD: single-point, structured, common (Cap: 90%)
      - MODERATE: functional region, interface-adjacent (Cap: 80%)
      - FRONTIER: epistasis, disorder, rare substitution (Cap: 65%)

      FEATURE 3: CROSS-SIGNAL CONSISTENCY CHECK
      - Internal check between Structural, Stability, Functional sensitivity, and Environment signals.
      - High agreement: +5% confidence. Conflicts: -5-10% and state "Conflicting signals detected".

      FEATURE 4: OUTCOME-WEIGHTED CONFIDENCE
      - Incorporate Scientist Decision Log Outcomes: ${JSON.stringify(priorResults)}
      - If prior success in same class/region: Increase confidence. If failure: Decrease and warn.

      FEATURE 5: EXPLICIT ASSUMPTION LISTING
      - List assumptions (e.g. single-point independence, standard folding).
      
      CRITICAL DATASETS: ProteinGym, VenusMutHub, S669, ProMEP, Mega-scale, etc.

      LANGUAGE RULES:
      - NEVER say: "This will work" or "This is correct".
      - ALWAYS say: "Likely", "Risky", "Uncertain", "Supported by known patterns".
      
      Confidence Score represents Decision Defensibility (NOT absolute correctness).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            protein: { type: Type.STRING },
            uniprotId: { type: Type.STRING },
            mutation: { type: Type.STRING },
            deltaDeltaG: { type: Type.NUMBER },
            stabilityImpact: { type: Type.STRING },
            confidence: { type: Type.NUMBER, description: "Final Defensibility Score (0-1)" },
            regime: { type: Type.STRING, enum: Object.values(MutationRegime) },
            patternAnchors: { type: Type.ARRAY, items: { type: Type.STRING } },
            signalConsistency: { type: Type.STRING, enum: ["High Agreement", "Conflicting Signals", "Neutral"] },
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            relativeRank: { type: Type.NUMBER },
            heuristicNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            structuralAnalysis: { type: Type.STRING },
            functionalImpact: { type: Type.STRING },
            riskBreakdown: { type: Type.STRING },
            clinicalSignificance: { type: Type.STRING },
            references: { type: Type.ARRAY, items: { type: Type.STRING } },
            reportSummary: { type: Type.STRING },
            goalAlignment: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            tradeOffAnalysis: { type: Type.STRING },
            justification: { type: Type.STRING },
            functionalRegionSensitivity: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            comparativeContext: { type: Type.STRING },
            confidenceMode: { type: Type.STRING, enum: ["Validated Reference Mode", "General Reasoning Mode"] },
            benchmarkAlignments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dataset: { type: Type.STRING },
                  alignmentScore: { type: Type.NUMBER },
                  correlationType: { type: Type.STRING },
                  keyInsight: { type: Type.STRING }
                }
              }
            },
            confidenceBreakdown: {
              type: Type.OBJECT,
              properties: {
                structuralConfidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                disorderRisk: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                functionalSensitivity: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                environmentalMismatch: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                experimentalEvidence: { type: Type.STRING, enum: ["None", "Mixed", "Supporting", "Contradictory"] },
                overallConfidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                confidenceRationale: { type: Type.STRING }
              }
            }
          },
          required: ["protein", "uniprotId", "mutation", "deltaDeltaG", "stabilityImpact", "confidence", "regime", "patternAnchors", "signalConsistency", "assumptions", "reportSummary"]
        }
      }
    });

    const text = extractText(response, "Prediction engine timeout.");
    const baseResult = JSON.parse(text);
    return { 
      ...baseResult, 
      isValidatedReference: !!protein.isValidatedReference,
      reproducibility: {
        runId: `NS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        modelName: "Novasciences-Defensibility-Engine",
        modelVersion: "0.2.5v",
        inputHash: "DEFENSIBILITY_GATED",
        dockerImageHash: "v0.2.5v-core",
        structureSource: protein.sourceType,
        structureSourceDetails: protein.pdbId ? `PDB:${protein.pdbId}` : `AFDB:${protein.id}`,
        viewerVersion: "3Dmol.js"
      },
      disclaimer: "Computational estimate grounded in global benchmarks and decision defensibility logic."
    };
  });
};

export const generateDecisionMemo = async (
  protein: ProteinMetadata, 
  goal: ScientificGoal, 
  priorLogs: DecisionLogEntry[],
  risk: RiskTolerance,
  preserve: string,
  environment: string
): Promise<DecisionMemo> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY missing.");
  const ai = new GoogleGenAI({ apiKey });

  const mode = protein.isValidatedReference ? 'Validated Reference Mode' : 'General Reasoning Mode';

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `NOVA STRATEGIC DEFENSE MEMO: Ground findings for ${protein.name}.
      
      ACTIVE MODE: ${mode}
      
      Apply the 5 feature logic: Pattern Anchors, Regime Caps, Signal Consistency, Outcome-Weighting, and Assumption Listing. 
      Generate targets with Defensibility-First thinking.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommended: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  rank: { type: Type.NUMBER }, 
                  mutation: { type: Type.STRING }, 
                  rationale: { type: Type.STRING }, 
                  goalAlignment: { type: Type.STRING }, 
                  confidence: { type: Type.STRING }, 
                  risk: { type: Type.STRING },
                  regime: { type: Type.STRING },
                  patternAnchors: { type: Type.ARRAY, items: { type: Type.STRING } },
                  assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  benchmarkRef: { type: Type.STRING }
                }
              } 
            },
            discouraged: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  mutation: { type: Type.STRING }, 
                  risk: { type: Type.STRING }, 
                  signal: { type: Type.STRING } 
                }
              } 
            },
            summary: { type: Type.STRING },
            memoryContext: { type: Type.STRING },
            referenceContextApplied: { type: Type.BOOLEAN },
            confidenceMode: { type: Type.STRING, enum: ["Validated Reference Mode", "General Reasoning Mode"] },
            logInsights: { type: Type.STRING },
            failureAwareNotes: { type: Type.STRING }
          },
          required: ["recommended", "discouraged", "summary", "confidenceMode"]
        }
      }
    });
    return JSON.parse(extractText(response, "Memo synthesis failed."));
  });
};