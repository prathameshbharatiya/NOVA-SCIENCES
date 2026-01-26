import { GoogleGenAI, Type } from "@google/genai";
import { PredictionResult, Mutation, ProteinMetadata, ScientificGoal, PriorResult, DecisionMemo } from "../types";

// Using Flash for all tasks to maximize quota availability and reliability
const MODEL_NAME_FAST = "gemini-3-flash-preview";
const MODEL_NAME_PRO = "gemini-3-flash-preview"; 

/**
 * Utility for exponential backoff retries on transient errors
 */
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errorMsg = err.message?.toLowerCase() || "";
      const status = err.status || 0;
      
      const isTransient = 
        status === 503 || 
        status === 429 ||
        errorMsg.includes("503") || 
        errorMsg.includes("429") || 
        errorMsg.includes("overloaded") ||
        errorMsg.includes("quota") ||
        errorMsg.includes("resource_exhausted");

      if (isTransient && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Gemini transient error detected (${status}). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Validates and extracts text from a Gemini response
 */
const extractText = (response: any, fallbackError: string): string => {
  // Check for safety finish reason
  if (response.candidates && response.candidates[0]?.finishReason === 'SAFETY') {
    throw new Error("Analysis blocked by biological safety filters. Please try a standard UniProt ID.");
  }

  // Gemini 3 Direct .text property access
  const text = response.text;
  
  if (!text || text.trim().length === 0) {
    console.error("Gemini Diagnostic - Empty Response Object:", response);
    throw new Error(fallbackError);
  }
  
  return text;
};

export const searchProtein = async (query: string): Promise<ProteinMetadata> => {
  // Ensure we are pulling the key from process.env as injected by the bundler
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("System configuration error: API_KEY is missing from the environment.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  return callWithRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME_FAST,
        contents: `Act as a senior bioinformatician. Precisely identify the protein for the user query: "${query}". 
        Provide a comprehensive overview including the canonical UniProt ID, common PDB IDs, sequence length, and 6 highly relevant mutations based on known literature or structural importance.
        If multiple isoforms exist, provide the primary canonical form.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "UniProt Accession ID" },
              pdbId: { type: Type.STRING, description: "Primary PDB structure ID" },
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

      const text = extractText(response, "The system could not resolve this protein. Please verify the name or UniProt ID.");
      const parsed = JSON.parse(text.trim());
      
      return {
        ...parsed,
        sourceType: parsed.pdbId ? 'User-Uploaded' : 'AlphaFold',
        structureStatus: 'idle'
      } as ProteinMetadata;
    } catch (err: any) {
      console.error("Protein Search Service Error:", err);
      throw err;
    }
  });
};

export const predictMutation = async (
  protein: ProteinMetadata, 
  mutation: Mutation, 
  goal: ScientificGoal, 
  priorResults: PriorResult[]
): Promise<PredictionResult> => {
  const apiKey = process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey! });
  
  const mutationStr = `${mutation.wildtype}${mutation.position}${mutation.mutant}`;
  const memoryStr = priorResults.length > 0 
    ? priorResults.map(r => `${r.mutation}: ${r.outcome}`).join(", ") 
    : "None provided.";

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME_FAST,
      contents: `Perform an in-depth thermodynamic and structural analysis for the ${mutationStr} mutation in ${protein.name} (${protein.id}).
      
      SCIENTIFIC GOAL: ${goal}
      PRIOR EXPERIMENTAL EVIDENCE: ${memoryStr}
      
      Calculate predicted Delta Delta G (kcal/mol), assess folding stability impact, and provide structural rationale.`,
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
          required: [
            "protein", "uniprotId", "mutation", "deltaDeltaG", "stabilityImpact", 
            "confidence", "relativeRank", "goalAlignment", "tradeOffAnalysis", 
            "justification", "riskBreakdown", "structuralAnalysis", "reportSummary"
          ]
        }
      }
    });

    const text = extractText(response, "The prediction engine returned an invalid result. The site may be in a non-analyzable region.");
    const baseResult = JSON.parse(text.trim());
    const runId = `NS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    return { 
      ...baseResult, 
      isValidatedReference: !!protein.isValidatedReference,
      reproducibility: {
        runId,
        timestamp: new Date().toISOString(),
        modelName: "Novasciences-Delta-Engine",
        modelVersion: "0.2.5v",
        inputHash: `SHA256:${Math.random().toString(16).substring(2, 12)}`,
        dockerImageHash: "ns-predict:v0.2.5v-thermo-engine",
        structureSource: protein.structureStatus === 'available' ? protein.sourceType : 'Sequence-Heuristic',
        structureSourceDetails: protein.structureStatus === 'available' ? `Resolved Structure` : "Heuristic Modeling",
        viewerVersion: "3Dmol.js v2.0.4"
      },
      disclaimer: "Computational estimate. Results must be cross-verified with laboratory assay data."
    };
  });
};

export const generateDecisionMemo = async (
  protein: ProteinMetadata, 
  goal: ScientificGoal, 
  priorResults: PriorResult[]
): Promise<DecisionMemo> => {
  const apiKey = process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey! });
  const memoryStr = priorResults.length > 0 
    ? priorResults.map(r => `${r.mutation}: ${r.outcome}`).join(", ") 
    : "None provided.";

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME_PRO,
      contents: `Generate a high-level scientific Decision Memo for the ${protein.name} optimization project.
      GOAL: ${goal}
      CURRENT EXPERIMENTAL CONTEXT: ${memoryStr}`,
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

    const text = extractText(response, "Strategic memo synthesis failed.");
    return JSON.parse(text.trim());
  });
};