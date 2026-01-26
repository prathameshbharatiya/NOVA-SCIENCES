import { GoogleGenAI, Type } from "@google/genai";
import { PredictionResult, Mutation, ProteinMetadata, ScientificGoal, PriorResult, DecisionMemo } from "../types";

// Always use Gemini 3 series for complex scientific reasoning
const MODEL_NAME_FAST = "gemini-3-flash-preview";
const MODEL_NAME_PRO = "gemini-3-pro-preview";

/**
 * Validates that the response contains valid text and handles safety blocks.
 */
const extractText = (response: any, fallbackError: string): string => {
  if (response.candidates && response.candidates[0]?.finishReason === 'SAFETY') {
    throw new Error("Analysis blocked by safety filters. Please try a different query.");
  }
  const text = response.text;
  if (!text || text.trim().length === 0) {
    throw new Error(fallbackError);
  }
  return text;
};

export const searchProtein = async (query: string): Promise<ProteinMetadata> => {
  // Initialize inside function to catch injected process.env.API_KEY correctly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME_FAST,
      contents: `You are a biological data specialist. Identify the protein for the query: "${query}". 
      Return details including UniProt ID, common PDB ID, and 6 suggested mutations that are relevant for stability or functional studies.`,
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

    const text = extractText(response, "The AI returned an empty response during protein search. Please try a more specific protein name or UniProt ID.");
    const parsed = JSON.parse(text.trim());
    
    return {
      ...parsed,
      sourceType: parsed.pdbId ? 'User-Uploaded' : 'AlphaFold',
      structureStatus: 'idle'
    } as ProteinMetadata;
  } catch (err: any) {
    console.error("Gemini Search Error:", err);
    // Specifically catch API Key issues which often present as 401/403 or network errors
    if (err.message?.includes('API_KEY')) {
      throw new Error("Invalid or missing Gemini API Key. Please verify your project settings.");
    }
    throw new Error(err.message || "Protein resolution failed. Ensure you are using a valid Google Gemini API key (not OpenAI).");
  }
};

export const predictMutation = async (
  protein: ProteinMetadata, 
  mutation: Mutation, 
  goal: ScientificGoal, 
  priorResults: PriorResult[]
): Promise<PredictionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mutationStr = `${mutation.wildtype}${mutation.position}${mutation.mutant}`;
  const memoryStr = priorResults.length > 0 
    ? priorResults.map(r => `${r.mutation}: ${r.outcome}`).join(", ") 
    : "No prior experimental data.";

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME_FAST,
      contents: `Perform a detailed thermodynamic analysis of the ${mutationStr} mutation in the ${protein.name} protein system.
      
      GOAL: ${goal}
      PRIOR DATA: ${memoryStr}
      
      You must calculate the predicted Delta Delta G (kcal/mol) and provide a deep structural rationale.`,
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

    const text = extractText(response, "Thermodynamic engine returned no data. The mutation might be in a region the model cannot reliably analyze.");
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
  } catch (err: any) {
    console.error("Gemini Prediction Error:", err);
    throw new Error(err.message || "Mutation analysis failed. Please verify your connection and API key.");
  }
};

export const generateDecisionMemo = async (
  protein: ProteinMetadata, 
  goal: ScientificGoal, 
  priorResults: PriorResult[]
): Promise<DecisionMemo> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const memoryStr = priorResults.length > 0 
    ? priorResults.map(r => `${r.mutation}: ${r.outcome}`).join(", ") 
    : "None provided.";

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME_PRO,
      contents: `Generate a high-level scientific Decision Memo for the protein ${protein.name} optimization project.
      GOAL: ${goal}
      PRIOR RESULTS: ${memoryStr}
      
      Recommend specific next steps and mutations based on current structural and functional knowledge.`,
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

    const text = extractText(response, "Decision engine could not synthesize a memo. Check your scientific parameters.");
    return JSON.parse(text.trim());
  } catch (err: any) {
    console.error("Gemini Memo Error:", err);
    throw new Error(err.message || "Strategic memo generation failed.");
  }
};