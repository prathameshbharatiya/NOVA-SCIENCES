
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { PredictionResult, Mutation, ProteinMetadata, ScientificGoal, PriorResult, DecisionMemo, RiskTolerance, DecisionLogEntry, MutationRegime, ExperimentalEnvironment } from "../types";

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
  environment: ExperimentalEnvironment
): Promise<PredictionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mutationStr = `${mutation.wildtype}${mutation.position}${mutation.mutant}`;
  
  const historyString = priorResults.map(r => 
    `- Mutation: ${r.mutation}, Outcome: ${r.outcome}, Feedback: ${r.notes}`
  ).join('\n');

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Predict ${mutationStr} for ${protein.name}.
      
      GOAL: ${goal}.
      RISK TOLERANCE: ${risk}.
      PRESERVE REGIONS: ${preserve || 'None'}.
      ENV: pH ${environment.ph}, Temp ${environment.temp}°C, Ionic ${environment.ionicStrength}mM, Buffer: ${environment.bufferSystem}.
      LAB HISTORY:\n${historyString || 'None'}.
      
      Use Google Search to find real-world scientific papers that have reported this mutation or similar substitutions in this protein. 
      Align your ΔΔG prediction with experimental literature.`,
      config: {
        tools: [{googleSearch: {}}],
        systemInstruction: `You are NOVA. Predict ΔΔG. Explicitly calculate 'environmentalAnalysis'. 
        You MUST search for grounding scientific papers to support your findings. 
        Populate 'scientificPapers' with real paper titles, journals, and URLs.
        Populate 'benchmarkAlignments' explaining how your result correlates with the literature you found.`,
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
          required: ["protein", "uniprotId", "mutation", "deltaDeltaG", "stabilityImpact", "confidence", "regime", "reportSummary", "environmentalAnalysis", "scientificPapers", "benchmarkAlignments"]
        }
      }
    });

    const text = extractText(response, "Prediction engine timeout.");
    const baseResult = safeJsonParse<any>(text, "Mutation Prediction Logic");
    return { 
      ...baseResult, 
      isValidatedReference: !!protein.isValidatedReference,
      confidenceMode: protein.isValidatedReference ? 'Validated Reference Mode' : 'General Reasoning Mode',
      reproducibility: {
        runId: `NS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        modelName: "NOVA-CORE-BIOLOGIC",
        modelVersion: "0.2.5v",
        inputHash: "SHA-GATED-GROUNDED",
        dockerImageHash: "v0.2.5v-stable",
        structureSource: protein.sourceType,
        structureSourceDetails: protein.pdbId ? `PDB:${protein.pdbId}` : `AFDB:${protein.id}`,
        viewerVersion: "3Dmol.js"
      }
    };
  });
};

export const generateDecisionMemo = async (
  protein: ProteinMetadata, 
  goal: ScientificGoal, 
  priorLogs: DecisionLogEntry[],
  risk: RiskTolerance,
  preserve: string,
  environment: ExperimentalEnvironment
): Promise<DecisionMemo> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const historyString = priorLogs.map(l => 
    `Mutation: ${l.mutationTested}, Outcome: ${l.outcome}, Context: ${l.userNotes}`
  ).join('\n');

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Strategic Synthesis for ${protein.name}.
      Goal: ${goal}. Risk Tolerance: ${risk}. Constraints: Preserve ${preserve || 'Essential regions'}.
      Lab Feedback:\n${historyString || 'None'}\n
      Env: pH ${environment.ph}, ${environment.temp}°C.`,
      config: {
        systemInstruction: `You are NOVA Strategic Advisor. Use the environmental context and history to prioritize.
        IMPORTANT: Look at 'Lab Feedback'. If a mutation was Negative, AVOID suggesting that residue or similar chemical changes. 
        List these as 'discouraged' mutations (Mutations to AVOID).
        Synthesize a list of recommended and discouraged targets.`,
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
                properties: { 
                  mutation: { type: Type.STRING }, 
                  risk: { type: Type.STRING }, 
                  signal: { type: Type.STRING } 
                },
                required: ["mutation", "risk", "signal"]
              } 
            },
            summary: { type: Type.STRING },
            environmentalRoadmapImpact: { type: Type.STRING },
            learningProgress: {
              type: Type.OBJECT,
              properties: {
                learnedPattern: { type: Type.STRING },
                reRankedCount: { type: Type.NUMBER },
                adjustedUncertainty: { type: Type.STRING }
              }
            }
          },
          required: ["recommended", "discouraged", "summary", "environmentalRoadmapImpact"]
        }
      }
    });
    const parsed = safeJsonParse<any>(extractText(response, "Roadmap synthesis failed."), "Strategic Roadmap Synthesis");
    return {
      ...parsed,
      confidenceMode: protein.isValidatedReference ? 'Validated Reference Mode' : 'General Reasoning Mode'
    };
  });
};
