
import { GoogleGenAI } from "@google/genai";
import { InventoryItem } from "../types";

export const getInventoryInsights = async (items: InventoryItem[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const inventorySummary = items.map(i => 
    `${i.name}: ${i.availableQuantity}/${i.totalQuantity} ${i.unit} (Threshold: ${i.lowStockThreshold})`
  ).join(', ');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this network equipment inventory for GNet Data & Network Solutions and provide 3 short, professional bullet points for the dashboard regarding restock priorities or stock health. 
      Inventory: ${inventorySummary}`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 200,
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Unable to generate AI insights at this time. Please check your stock levels manually.";
  }
};
