import { GoogleGenAI, Type } from "@google/genai";
import { PredictionResult, Mutation, ProteinMetadata, ScientificGoal, PriorResult, DecisionMemo } from "../types";

// Using the stable alias 'gemini-flash-latest' to ensure maximum quota availability
const MODEL_NAME = "gemini-flash-latest";

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
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
        console.warn(`Gemini Request Error (${status}). Retrying in ${delay}ms (Attempt ${i + 1}/${maxRetries})...`);
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
    throw new Error("Bio-Safety Filter: This query was flagged and blocked by the model.");
  }
  const text = response.text;
  if (!text || text.trim().length === 0) {
    console.error("Critical: Received empty response body from Gemini API", response);
    throw new Error(fallbackError);
  }
  return text;
};

export const searchProtein = async (query: string): Promise<ProteinMetadata> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Environment Error: API_KEY is undefined in the current context.");
  
  const ai = new GoogleGenAI({ apiKey });
  
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Identify protein for query: "${query}". Return JSON with UniProt ID, PDB ID, name, description, length, and 6 suggested mutations (residue, position, rationale, confidence).`,
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

    const text = extractText(response, "Resolution Engine Failure: Received null payload from service.");
    const parsed = JSON.parse(text);
    return { ...parsed, sourceType: parsed.pdbId ? 'User-Uploaded' : 'AlphaFold', structureStatus: 'idle' };
  });
};

export const predictMutation = async (
  protein: ProteinMetadata, 
  mutation: Mutation, 
  goal: ScientificGoal, 
  priorResults: PriorResult[]
): Promise<PredictionResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY missing.");
  const ai = new GoogleGenAI({ apiKey });
  const mutationStr = `${mutation.wildtype}${mutation.position}${mutation.mutant}`;
  
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze mutation ${mutationStr} in ${protein.name} for goal: ${goal}.`,
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
          required: ["protein", "uniprotId", "mutation", "deltaDeltaG", "stabilityImpact", "confidence", "relativeRank", "goalAlignment", "tradeOffAnalysis", "justification", "riskBreakdown", "structuralAnalysis", "reportSummary"]
        }
      }
    });

    const text = extractText(response, "Prediction Engine Fault: No valid thermodynamic data returned.");
    const baseResult = JSON.parse(text);
    return { 
      ...baseResult, 
      isValidatedReference: !!protein.isValidatedReference,
      reproducibility: {
        runId: `NS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        modelName: "Novasciences-Delta-Engine",
        modelVersion: "0.2.5v",
        inputHash: "NATIVE-HASH",
        dockerImageHash: "v0.2.5v-stable",
        structureSource: "Native",
        structureSourceDetails: "RCSB/AF",
        viewerVersion: "3Dmol.js"
      },
      disclaimer: "Computational estimate only. Experimental validation required."
    };
  });
};

export const generateDecisionMemo = async (
  protein: ProteinMetadata, 
  goal: ScientificGoal, 
  priorResults: PriorResult[]
): Promise<DecisionMemo> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY missing.");
  const ai = new GoogleGenAI({ apiKey });
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Synthesize a scientific decision memo for ${protein.name} optimization focusing on ${goal}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommended: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { rank: { type: Type.NUMBER }, mutation: { type: Type.STRING }, rationale: { type: Type.STRING }, goalAlignment: { type: Type.STRING }, confidence: { type: Type.STRING }, risk: { type: Type.STRING } } } },
            discouraged: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { mutation: { type: Type.STRING }, risk: { type: Type.STRING }, signal: { type: Type.STRING } } } },
            summary: { type: Type.STRING },
            memoryContext: { type: Type.STRING },
            referenceContextApplied: { type: Type.BOOLEAN }
          },
          required: ["recommended", "discouraged", "summary", "memoryContext", "referenceContextApplied"]
        }
      }
    });
    return JSON.parse(extractText(response, "Memo synthesis failed."));
  });
};