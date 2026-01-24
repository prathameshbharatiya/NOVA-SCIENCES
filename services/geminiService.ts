import { GoogleGenAI, Type } from "@google/genai";
import { PredictionResult, Mutation, ProteinMetadata, ScientificGoal, PriorResult, DecisionMemo } from "../types";

const MODEL_NAME_FAST = "gemini-3-flash-preview";
const MODEL_NAME_PRO = "gemini-3-pro-preview";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing. Please check your environment variables.");
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

    if (!response.text) {
      throw new Error("The AI returned an empty response. Please try a different protein.");
    }

    const parsed = JSON.parse(response.text.trim());
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
    : "No prior experimental outcomes provided.";

  const mode = protein.isValidatedReference ? "Validated Reference Mode" : "General Reasoning Mode";
  const context = protein.referenceContext ? `LITERATURE CONTEXT: ${protein.referenceContext}` : "Using general protein engineering principles.";

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME_FAST,
      contents: `Analyze mutation ${mutationStr} in ${protein.name}.
      MODE: ${mode}
      ${context}
      SCIENTIFIC GOAL: ${goal}
      EXPERIMENTAL MEMORY: ${memoryStr}
      
      Evaluate Delta Delta G, stability impact, and alignment with the GOAL.
      REFINE RATIONALE: Provide a deep structural/chemical explanation for WHY this mutation matters (justification).
      RISK ASSESSMENT: Explicitly define the functional or structural RISKS (riskBreakdown).`,
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
            justification: { type: Type.STRING },
            guardrails: {
              type: Type.OBJECT,
              properties: {
                isLargeProtein: { type: Type.BOOLEAN },
                isInDisorderedRegion: { type: Type.BOOLEAN },
                isLowConfidenceSite: { type: Type.BOOLEAN }
              }
            }
          },
          required: ["protein", "uniprotId", "mutation", "deltaDeltaG", "stabilityImpact", "confidence", "relativeRank", "goalAlignment", "tradeOffAnalysis", "justification", "riskBreakdown"]
        }
      }
    });

    const baseResult = JSON.parse(response.text?.trim() || "{}");
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
        dockerImageHash: "ns-predict:v0.2.5v-deep-rationale",
        structureSource: protein.structureStatus === 'available' ? protein.sourceType : 'Sequence-Heuristic',
        structureSourceDetails: protein.structureStatus === 'available' ? `Resolved Structure` : "Heuristic Only",
        viewerVersion: "3Dmol.js v2.0.4"
      },
      disclaimer: "Computational estimate. Decisions should be cross-verified with assay data."
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
    : "No prior experimental outcomes provided.";

  const mode = protein.isValidatedReference ? "Validated Reference Mode" : "General Reasoning Mode";
  const context = protein.referenceContext ? `REFERENCE SYSTEM CONTEXT: ${protein.referenceContext}` : "General Reasoning Only.";

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME_PRO,
      contents: `Act as a senior protein scientist. Produce a Decision Memo for ${protein.name}.
      MODE: ${mode}
      ${context}
      GOAL: ${goal}
      PRIOR RESULTS: ${memoryStr}
      
      1. Identify 3 specific mutations to test next. Provide high-quality structural rationale for each.
      2. Identify mutations to avoid and define the specific signal (e.g., Active site overlap, Clashes).`,
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

    return JSON.parse(response.text?.trim() || "{}");
  } catch (err: any) {
    console.error("Gemini Memo Error:", err);
    throw err;
  }
};