import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // Initialize Gemini AI client on the server
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "Green Aura Seeds" });
  });

  // AI Plant & Seed Gardening Advisor Endpoint
  app.post("/api/ai-gardener", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }

      if (!ai) {
        // Fallback response if GEMINI_API_KEY is not configured yet
        return res.json({
          response: `🌿 Green Aura Advice for "${prompt}":\n\n1. Soil & Light: Ensure well-draining soil mixed with organic coco peat or vermicompost. Keep in 6+ hours of sunlight.\n2. Germination: Sow seeds at 2x depth of seed size. Keep soil consistently moist but never waterlogged.\n3. Organic Care: Spray organic neem oil solution every 14 days to keep pests away naturally!`,
          source: "fallback"
        });
      }

      const systemInstruction = `You are Green Aura's Senior Botanist and Master Seed Gardening Advisor for GreenAuraSeeds.com (also representing GreenAuraAgro, GreenAuraOrganic, and GreenAuraFarm).
Your goal is to give encouraging, practical, non-GMO organic gardening & farming advice.
Suggest relevant Green Aura seed varieties (Tomatoes, Chilis, Basil, Marigolds, Microgreens, Coco Peat) when relevant.
Be friendly, precise, and format answers with clear bullet points and botanical advice. Context provided: ${context || 'General garden inquiry'}.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      return res.json({
        response: response.text || "Happy planting! Keep your seeds warm and moist for best results.",
        source: "gemini"
      });
    } catch (error: any) {
      console.error("AI Gardener API Error:", error);
      return res.status(500).json({
        error: "Failed to generate gardening advice",
        details: error?.message || "Unknown error"
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Green Aura Seeds server running on http://localhost:${PORT}`);
  });
}

startServer();
