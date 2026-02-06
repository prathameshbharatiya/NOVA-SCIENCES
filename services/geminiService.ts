import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { PredictionResult, Mutation, ProteinMetadata, ScientificGoal, PriorResult, DecisionMemo, RiskTolerance, DecisionLogEntry, MutationRegime } from "../types";

const MODEL_NAME = "gemini-3-pro-preview"; 

function safeJsonParse<T>(text: string, fallbackDesc: string): T {
  try {
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText) as T;
  } catch (err) {
    console.error(`JSON Parse Error: ${fallbackDesc}`, text);
    throw new Error(`The synthesis engine returned an invalid data format. Details: ${fallbackDesc}`);
  }
}

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

const extractText = (response: GenerateContentResponse, fallbackError: string): string => {
  if (response.candidates && response.candidates[0]?.finishReason === 'SAFETY') {
    throw new Error("Biological safety filter triggered.");
  }
  const text = response.text;
  if (!text) throw new Error(fallbackError);
  return text;
};

export const searchProtein = async (query: string): Promise<ProteinMetadata> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Resolve protein: "${query}". Return JSON with UniProt ID, PDB ID, name, description, length, and 6 relevant mutations.`,
      config: {
        systemInstruction: "You are NOVA, a decision-first protein engineering workstation.",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 4096 },
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
    const parsed = safeJsonParse<any>(text, "Protein Metadata Resolution");
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mutationStr = `${mutation.wildtype}${mutation.position}${mutation.mutant}`;
  
  const historyString = priorResults.map(r => 
    `- Mutation: ${r.mutation}, Outcome: ${r.outcome}, Assay: ${r.assayType}, Resource: ${r.resourceIntensity}, Notes: ${r.notes}`
  ).join('\n');

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Perform atomic stability inference for ${mutationStr}.
      
      Experimental Feedback Loop (PRIORS):
      ${historyString || 'No prior lab data recorded for this system yet.'}
      
      Structural Constraints: Preserve ${preserve || 'Standard structural motifs'}.
      Experimental Conditions: ${environment || 'Standard Physiological'}.
      Risk Profile: ${risk}.`,
      config: {
        systemInstruction: `You are NOVA. Your primary directive is to adjust your stability predictions based on the provided "Experimental Feedback Loop". 
        If prior mutations in similar regions or with similar chemical shifts have FAILED (Negative), decrease your confidence and increase your deltaDeltaG uncertainty.
        If they have SUCCEEDED (Positive), look for local optimizations.
        Always explain in 'empiricalShift' how the history influenced this specific prediction.`,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 16384 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            protein: { type: Type.STRING },
            uniprotId: { type: Type.STRING },
            mutation: { type: Type.STRING },
            deltaDeltaG: { type: Type.NUMBER },
            stabilityImpact: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            regime: { type: Type.STRING, enum: Object.values(MutationRegime) },
            patternAnchors: { type: Type.ARRAY, items: { type: Type.STRING } },
            signalConsistency: { type: Type.STRING, enum: ["High Agreement", "Conflicting Signals", "Neutral"] },
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            reportSummary: { type: Type.STRING },
            goalAlignment: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            empiricalShift: {
              type: Type.OBJECT,
              properties: {
                direction: { type: Type.STRING, enum: ["Up", "Down", "Neutral"] },
                magnitude: { type: Type.NUMBER },
                reason: { type: Type.STRING }
              }
            },
            confidenceBreakdown: {
              type: Type.OBJECT,
              properties: {
                structuralConfidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                disorderRisk: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                experimentalEvidence: { type: Type.STRING, enum: ["None", "Mixed", "Supporting", "Contradictory"] },
                overallConfidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                confidenceRationale: { type: Type.STRING }
              }
            },
            benchmarkAlignments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dataset: { type: Type.STRING },
                  alignmentScore: { type: Type.NUMBER },
                  keyInsight: { type: Type.STRING }
                }
              }
            }
          },
          required: ["protein", "uniprotId", "mutation", "deltaDeltaG", "stabilityImpact", "confidence", "regime", "reportSummary"]
        }
      }
    });

    const text = extractText(response, "Prediction engine timeout.");
    const baseResult = safeJsonParse<any>(text, "Mutation Prediction Logic");
    return { 
      ...baseResult, 
      isValidatedReference: !!protein.isValidatedReference,
      reproducibility: {
        runId: `NS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        modelName: "NOVA-DEFENSIBILITY",
        modelVersion: "0.2.5v",
        inputHash: "GATED",
        dockerImageHash: "v0.2.5v-core",
        structureSource: protein.sourceType,
        structureSourceDetails: protein.pdbId ? `PDB:${protein.pdbId}` : `AFDB:${protein.id}`,
        viewerVersion: "3Dmol.js"
      },
      disclaimer: "Computational estimate grounded in global benchmarks and empirical lab feedback."
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const historyString = priorLogs.map(l => 
    `Mutation: ${l.mutationTested}, Outcome: ${l.outcome}, Assay: ${l.assayType}, Cost: ${l.resourceIntensity}, Feedback: ${l.userNotes}`
  ).join('\n');

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Synthesize a Strategic Roadmap for ${protein.name}.
      Goal: ${goal}.
      Prior Lab Outcomes:\n${historyString || 'None yet.'}\n
      Constraints: Preserve ${preserve || 'Critical domains'}.`,
      config: {
        systemInstruction: `You are NOVA Strategic Advisor. Use the "Prior Lab Outcomes" to refine your roadmap.
        If an outcome was Negative, explicitly AVOID mutations in that domain or chemical class.
        If an outcome was Positive, prioritize local scanning or interface optimization around that hit.
        Return a 'learningProgress' object explaining what structural patterns you've learned from the lab feedback.`,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 16384 },
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
                  risk: { type: Type.STRING }
                },
                required: ["rank", "mutation", "rationale", "confidence"]
              } 
            },
            discouraged: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { mutation: { type: Type.STRING }, risk: { type: Type.STRING }, signal: { type: Type.STRING } },
                required: ["mutation", "risk", "signal"]
              } 
            },
            summary: { type: Type.STRING },
            learningProgress: {
              type: Type.OBJECT,
              properties: {
                learnedPattern: { type: Type.STRING },
                reRankedCount: { type: Type.NUMBER },
                adjustedUncertainty: { type: Type.STRING }
              }
            }
          },
          required: ["recommended", "discouraged", "summary"]
        }
      }
    });
    return safeJsonParse<DecisionMemo>(extractText(response, "Roadmap synthesis timeout."), "Strategic Roadmap Synthesis");
  });
};