import { GoogleGenAI } from "@google/genai";
import { LogEntry, ReplicationTask, StoreItem } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeSystemState = async (
  wal: LogEntry[],
  retryQueue: ReplicationTask[],
  primaryStore: Record<string, StoreItem>,
  replicaStore: Record<string, StoreItem>
): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Prepare a concise summary of the state for the model
    const stateSummary = {
      pendingReplications: retryQueue.length,
      primaryKeys: Object.keys(primaryStore).length,
      replicaKeys: Object.keys(replicaStore).length,
      recentLogs: wal.slice(-10).map(l => `[${l.type}] ${l.message}`),
      consistencyStatus: retryQueue.length === 0 ? "Consistent" : "Inconsistent - Retries Pending"
    };

    const prompt = `
      You are a Senior Distributed Systems Engineer analyzing a log dump from a Key-Value store with Leader-Follower replication.
      
      System State:
      ${JSON.stringify(stateSummary, null, 2)}
      
      Please provide a brief, technical analysis (max 3 sentences) of the current system health. 
      If there are pending replications, explain why the system is currently inconsistent.
      If everything is synced, confirm the consistency.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Unable to connect to AI analysis service. Please check API Key.";
  }
};