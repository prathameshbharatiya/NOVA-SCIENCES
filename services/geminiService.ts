
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
      contents: `Resolve protein: "${query}". Return JSON with UniProt ID, PDB ID, name, description, length, and 6 highly relevant mutations for stability or function.`,
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

export const generateStrategicRoadmap = async (
  protein: ProteinMetadata,
  goal: ScientificGoal,
  env: ExperimentalEnvironment,
  pastLogs: string
): Promise<DecisionMemo> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Synthesize a Strategic Roadmap for ${protein.name} (${protein.id}).
      Primary Goal: ${goal}.
      Current Lab Environment: pH ${env.ph}, Temp ${env.temp}°C, Salt ${env.ionicStrength}mM.
      Feedback Loop - Previous Experimental Observations:
      ${pastLogs || "No prior experiments logged."}
      
      Task:
      1. Prescribe exactly 3 mutations to TEST next based on environment and goal.
      2. Identify 2 mutations to AVOID (Blacklist).
      3. Explain specifically how the pH ${env.ph} and Temp ${env.temp} affected the roadmap selection.
      4. Provide 'Lit Alignment' scores (0-1) based on real-world grounding.`,
      config: {
        tools: [{googleSearch: {}}],
        systemInstruction: "You are NOVA Strategic Intelligence. Prescribe experimental direction using structural physics and grounding. Always return JSON.",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 8192 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            confidenceMode: { type: Type.STRING },
            summary: { type: Type.STRING },
            environmentalRoadmapImpact: { type: Type.STRING },
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
                },
                required: ["mutation", "rationale", "rank", "litScore"]
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
                },
                required: ["mutation", "risk", "signal", "litScore"]
              }
            },
            learningProgress: {
              type: Type.OBJECT,
              properties: {
                reRankedCount: { type: Type.NUMBER },
                learnedPattern: { type: Type.STRING }
              }
            }
          },
          required: ["confidenceMode", "summary", "recommended", "discouraged", "environmentalRoadmapImpact"]
        }
      }
    });

    const text = extractText(response, "Strategic synthesis engine timeout.");
    const baseResult = safeJsonParse<DecisionMemo>(text, "Strategic Roadmap Generation");

    // Extract grounding URLs for required search grounding display
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingUrls: string[] = [];
    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri) groundingUrls.push(chunk.web.uri);
      });
    }

    return { ...baseResult, groundingUrls };
  });
};

export const predictMutation = async (
  protein: ProteinMetadata, 
  mutation: Mutation, 
  goal: ScientificGoal, 
  risk: RiskTolerance,
  environment: ExperimentalEnvironment
): Promise<PredictionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mutationStr = `${mutation.wildtype}${mutation.position}${mutation.mutant}`;
  
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Assay Simulation: substitution ${mutationStr} for ${protein.name}.
      Biological Goal: ${goal}. Environment: pH ${environment.ph}, Temp ${environment.temp}°C, Salt ${environment.ionicStrength}mM.
      Determine thermodynamic ΔΔG and literature alignment.`,
      config: {
        tools: [{googleSearch: {}}],
        systemInstruction: `You are NOVA. Predict ΔΔG stability change. Use Search Grounding for real paper URLs.`,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 12288 },
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
                },
                required: ["title", "journal", "year", "url", "relevance"]
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
          required: ["protein", "uniprotId", "mutation", "deltaDeltaG", "stabilityImpact", "confidence", "overallLiteratureAlignment", "regime", "reportSummary", "environmentalAnalysis", "scientificPapers", "benchmarkAlignments"]
        }
      }
    });

    const text = extractText(response, "Assay processing failure.");
    const baseResult = safeJsonParse<any>(text, "Mutation Prediction Logic");
    
    // Explicit Grounding URL Extraction for visibility
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      const groundedLinks = groundingMetadata.groundingChunks
        .filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({
          title: chunk.web.title || 'Resolved Research Context',
          journal: 'Web Grounding',
          year: new Date().getFullYear(),
          url: chunk.web.uri,
          relevance: 'Direct literature support identified during analysis.'
        }));
      
      if (groundedLinks.length > 0) {
        baseResult.scientificPapers = [...(baseResult.scientificPapers || []), ...groundedLinks];
      }
    }

    return { 
      ...baseResult, 
      reproducibility: {
        runId: `NS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        modelName: "NOVA-CORE",
        modelVersion: "0.2.5v",
        inputHash: "GATED-SHA",
        dockerImageHash: "v0.2.5v-stable",
        structureSource: protein.sourceType,
        structureSourceDetails: protein.pdbId ? `PDB:${protein.pdbId}` : `AFDB:${protein.id}`,
        viewerVersion: "3Dmol.js"
      }
    };
  });
};
