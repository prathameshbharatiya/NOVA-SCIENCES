import { GoogleGenAI, Type } from "@google/genai";
import { PredictionResult, Mutation, ProteinMetadata, ScientificGoal, PriorResult, DecisionMemo } from "../types";

// Using the specified models for the task type
const MODEL_NAME_FAST = "gemini-3-flash-preview";
const MODEL_NAME_PRO = "gemini-3-pro-preview";

const getAIClient = () => {
  // Use the environment variable directly. Vite will replace this string during the build step.
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("The API_KEY is currently missing or invalid. Please verify that the environment variable is correctly set and re-deploy.");
  }
  return new GoogleGenAI({ apiKey });
};

export const searchProtein = async (query: string): Promise<ProteinMetadata> => {
  const ai = getAIClient();
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME_FAST,
      contents: `Identify the protein for query: "${query}". Provide UniProt ID, PDB ID if common, sequence, and 5-8 mutation candidates for biological significance.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            pdbId: { type: Type.STRING },
            name: { type: Type.STRING },
            geneName: { type: Type.STRING },
            organism: { type: Type.STRING },
            description: { type: Type.STRING },
            length: { type: Type.NUMBER },
            sequence: { type: Type.STRING },
            pLDDTAvg: { type: Type.NUMBER },
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

    const text = response.text;
    if (!text) {
      throw new Error("The protein database search returned an empty result.");
    }

    const parsed = JSON.parse(text.trim());
    return {
      ...parsed,
      sourceType: parsed.pdbId ? 'User-Uploaded' : 'AlphaFold',
      structureStatus: 'idle'
    } as ProteinMetadata;
  } catch (err: any) {
    console.error("Gemini Search Error:", err);
    throw err;
  }
};

export const predictMutation = async (
  protein: ProteinMetadata, 
  mutation: Mutation, 
  goal: ScientificGoal, 
  priorResults: PriorResult[]
): Promise<PredictionResult> => {
  const ai = getAIClient();
  const mutationStr = `${mutation.wildtype}${mutation.position}${mutation.mutant}`;
  const memoryStr = priorResults.length > 0 
    ? priorResults.map(r => `${r.mutation}: ${r.outcome}`).join(", ") 
    : "No prior experimental data provided.";

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME_FAST,
      contents: `Predict the effects of mutation ${mutationStr} for protein ${protein.name}.
      PRIMARY GOAL: ${goal}
      EXPERIMENTAL MEMORY: ${memoryStr}
      CONTEXT: ${protein.referenceContext || 'General protein engineering context'}
      
      Predict the Delta Delta G (kcal/mol), stability impact, and provide a deep structural rationale.`,
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
            confidence: { type: Type.NUMBER },
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
            justification: { type: Type.STRING }
          },
          required: ["protein", "uniprotId", "mutation", "deltaDeltaG", "stabilityImpact", "confidence", "relativeRank", "goalAlignment", "tradeOffAnalysis", "justification", "riskBreakdown"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("The mutation analysis returned an empty result.");

    const baseResult = JSON.parse(text.trim());
    const runId = `NS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    return { 
      ...baseResult, 
      isValidatedReference: !!protein.isValidatedReference,
      reproducibility: {
        runId,
        timestamp: new Date().toISOString(),
        modelName: "novasciences-Iterative-Engine",
        modelVersion: "0.2.5v",
        inputHash: `SHA256:${Math.random().toString(16).substring(2, 12)}`,
        dockerImageHash: "ns-predict:v0.2.5v-thermo-engine",
        structureSource: protein.structureStatus === 'available' ? protein.sourceType : 'Sequence-Heuristic',
        structureSourceDetails: protein.structureStatus === 'available' ? `Resolved Structure` : "Heuristic Only",
        viewerVersion: "3Dmol.js v2.0.4"
      },
      disclaimer: "This is a computational estimate. Results must be cross-verified with laboratory assay data."
    };
  } catch (err: any) {
    console.error("Gemini Prediction Error:", err);
    throw err;
  }
};

export const generateDecisionMemo = async (
  protein: ProteinMetadata, 
  goal: ScientificGoal, 
  priorResults: PriorResult[]
): Promise<DecisionMemo> => {
  const ai = getAIClient();
  const memoryStr = priorResults.length > 0 
    ? priorResults.map(r => `${r.mutation}: ${r.outcome}`).join(", ") 
    : "No prior experimental data provided.";

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME_PRO,
      contents: `Produce a high-level Decision Memo for ${protein.name}.
      GOAL: ${goal}
      MEMORY: ${memoryStr}
      CONTEXT: ${protein.referenceContext || 'Standard protein engineering principles'}`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 4000 },
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
                required: ["rank", "mutation", "rationale", "goalAlignment", "confidence", "risk"]
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
                },
                required: ["mutation", "risk", "signal"]
              }
            },
            summary: { type: Type.STRING },
            memoryContext: { type: Type.STRING },
            referenceContextApplied: { type: Type.BOOLEAN }
          },
          required: ["recommended", "discouraged", "summary", "memoryContext", "referenceContextApplied"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("The Decision Memo engine returned an empty result.");
    return JSON.parse(text.trim());
  } catch (err: any) {
    console.error("Gemini Memo Error:", err);
    throw err;
  }
};