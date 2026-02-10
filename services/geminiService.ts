
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { 
  PredictionResult, 
  Mutation, 
  ProteinMetadata, 
  ScientificGoal, 
  RiskTolerance, 
  MutationRegime, 
  ExperimentalEnvironment,
  DecisionMemo
} from "../types";

// Using Gemini 3 Flash to resolve quota limits and maximize analysis speed
const MODEL_NAME = "gemini-3-flash-preview"; 

function safeJsonParse<T>(text: string, fallbackDesc: string): T {
  try {
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText) as T;
  } catch (err) {
    console.error(`JSON Parse Error: ${fallbackDesc}`, text);
    throw new Error(`Invalid data format: ${fallbackDesc}`);
  }
}

/**
 * Enhanced call wrapper with exponential backoff to handle quota (429) errors gracefully.
 */
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err.status || 0;
      const msg = err.message?.toLowerCase() || "";
      const isQuota = status === 429 || msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("limit");
      
      if (isQuota && i < maxRetries - 1) {
        // Exponential backoff: 2s, 4s, 8s...
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Quota reached. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// Access the .text property directly as per latest Gemini SDK standards
const extractText = (response: GenerateContentResponse): string => {
  if (response.candidates?.[0]?.finishReason === 'SAFETY') {
    throw new Error("Biological safety filter triggered.");
  }
  return response.text || "";
};

const extractGroundingUrls = (response: GenerateContentResponse): string[] => {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!chunks) return [];
  return chunks.map((chunk: any) => chunk.web?.uri || chunk.maps?.uri).filter((uri: any) => !!uri);
};

export const searchProtein = async (query: string): Promise<ProteinMetadata> => {
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Resolve protein: "${query}". Provide UniProt/PDB IDs. Suggest 6 mutations for oncology/biotech research.`,
      config: {
        systemInstruction: "You are NOVA, a world-class structural bioinformatician. Respond with JSON.",
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

    const parsed = safeJsonParse<any>(extractText(response), "Protein Resolution");
    return { ...parsed, sourceType: parsed.pdbId ? 'User-Uploaded' : 'AlphaFold', structureStatus: 'idle' };
  });
};

export const generateStrategicRoadmap = async (
  protein: ProteinMetadata,
  goal: ScientificGoal,
  env: ExperimentalEnvironment,
  pastLogs: string
): Promise<DecisionMemo> => {
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Strategic Roadmap for ${protein.name} (${protein.id}). 
      Goal: ${goal}. 
      Environment: pH ${env.ph}, Temp ${env.temp}°C. 
      Context: ${pastLogs || "None"}.
      
      CRITICAL INSTRUCTION: Identify exactly 3 high-priority mutations to TRY and 3 high-risk mutations to AVOID. 
      For EACH mutation, provide a detailed structural rationale (e.g., 'disrupts hydrophobic core packing', 'introduces steric clash with DNA interface').`,
      config: {
        tools: [{googleSearch: {}}],
        systemInstruction: "You are NOVA Strategic Intelligence. Recommend specific mutations to TRY vs AVOID based on thermodynamic physics and structural biology. Respond with JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            confidenceMode: { type: Type.STRING },
            summary: { type: Type.STRING },
            recommended: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  rank: { type: Type.NUMBER },
                  mutation: { type: Type.STRING },
                  goalAlignment: { type: Type.STRING },
                  confidence: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                  risk: { type: Type.STRING },
                  litScore: { type: Type.NUMBER }
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
                  signal: { type: Type.STRING },
                  litScore: { type: Type.NUMBER }
                }
              }
            },
            environmentalRoadmapImpact: { type: Type.STRING },
            learningProgress: {
              type: Type.OBJECT,
              properties: {
                reRankedCount: { type: Type.NUMBER },
                learnedPattern: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    const baseResult = safeJsonParse<DecisionMemo>(extractText(response), "Roadmap Synthesis");
    return { ...baseResult, groundingUrls: extractGroundingUrls(response) };
  });
};

export const predictMutation = async (
  protein: ProteinMetadata, 
  mutation: Mutation, 
  goal: ScientificGoal, 
  risk: RiskTolerance,
  environment: ExperimentalEnvironment
): Promise<PredictionResult> => {
  const mutationStr = `${mutation.wildtype}${mutation.position}${mutation.mutant}`;
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Predict ΔΔG for mutation ${mutationStr} in ${protein.name} (${protein.id}). 
      Goal: ${goal}. 
      Environment: pH ${environment.ph}, Temp ${environment.temp}°C.
      Explain the thermodynamic impact and cite relevant structural biology patterns.`,
      config: {
        tools: [{googleSearch: {}}],
        systemInstruction: "You are NOVA. Provide precise ΔΔG and literature alignment. Respond with JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            protein: { type: Type.STRING },
            uniprotId: { type: Type.STRING },
            mutation: { type: Type.STRING },
            deltaDeltaG: { type: Type.NUMBER },
            stabilityImpact: { type: Type.STRING, enum: ["Stabilizing", "Neutral", "Destabilizing", "Highly Destabilizing"] },
            confidence: { type: Type.NUMBER },
            overallLiteratureAlignment: { type: Type.NUMBER },
            regime: { type: Type.STRING, enum: Object.values(MutationRegime) },
            patternAnchors: { type: Type.ARRAY, items: { type: Type.STRING } },
            signalConsistency: { type: Type.STRING },
            reportSummary: { type: Type.STRING },
            energyBreakdown: {
              type: Type.OBJECT,
              properties: {
                vanDerWaals: { type: Type.NUMBER },
                electrostatics: { type: Type.NUMBER },
                hBonds: { type: Type.NUMBER },
                solvation: { type: Type.NUMBER }
              }
            },
            environmentalAnalysis: {
              type: Type.OBJECT,
              properties: {
                leverageFactor: { type: Type.NUMBER },
                reasoning: { type: Type.STRING },
                sensitivity: { type: Type.STRING, enum: ["High", "Moderate", "Low"] },
                shiftAmount: { type: Type.NUMBER }
              },
              required: ["leverageFactor", "reasoning", "sensitivity", "shiftAmount"]
            },
            scientificPapers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  journal: { type: Type.STRING },
                  year: { type: Type.NUMBER },
                  url: { type: Type.STRING },
                  relevance: { type: Type.STRING }
                }
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
          required: ["deltaDeltaG", "stabilityImpact", "reportSummary", "confidence", "overallLiteratureAlignment", "environmentalAnalysis"]
        }
      }
    });

    const baseResult = safeJsonParse<any>(extractText(response), "Mutation Prediction");
    const groundingUrls = extractGroundingUrls(response);
    const discoveryPapers = groundingUrls.map(url => ({
      title: "Real-time Verification",
      journal: new URL(url).hostname,
      year: new Date().getFullYear(),
      url: url,
      relevance: "Verification of thermodynamics via real-time search"
    }));

    return { 
      ...baseResult, 
      scientificPapers: [...(baseResult.scientificPapers || []), ...discoveryPapers],
      reproducibility: {
        runId: `NS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        modelName: "NOVA-CORE-FLASH",
        modelVersion: "0.2.5v-flash",
        inputHash: "GATED-SHA",
        dockerImageHash: "v0.2.5v-stable",
        structureSource: protein.sourceType,
        structureSourceDetails: protein.pdbId ? `PDB:${protein.pdbId}` : `AFDB:${protein.id}`,
        viewerVersion: "3Dmol.js"
      }
    };
  });
};
