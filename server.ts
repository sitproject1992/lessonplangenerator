import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { extractTextFromPDF, cleanExtractedText } from "./server/services/pdfService.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Service Client
const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  
  return createClient(url, key);
};

// Multer setup
const upload = multer({ dest: "uploads/" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize supabase lazily
  let supabase: any;
  try {
    supabase = getSupabase();
  } catch (err) {
    console.warn("Supabase client not initialized:", (err as Error).message);
  }

  app.use(cors());
  app.use(express.json());

  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "EduPlan AI Server is running" });
  });

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ error: "Supabase not configured on server. Please check environment variables." });
      }
      const file = req.file;
      const { type, name } = req.body;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { data, error } = await supabase
        .from("documents")
        .insert([
          {
            name: name || file.originalname,
            type: type,
            file_path: file.path,
            status: "processing",
          },
        ])
        .select();

      if (error) throw error;

      const document = data[0];

      // Extract text and return it to frontend for Gemini processing
      const rawText = await extractTextFromPDF(file.path);
      const cleanText = cleanExtractedText(rawText);

      res.json({ 
        message: "File uploaded and text extracted", 
        data: document,
        extractedText: cleanText.substring(0, 30000) // Limit for Gemini
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/save-structure", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ error: "Supabase not configured on server. Please check environment variables." });
      }
      const { docId, structure } = req.body;

      const structureData = structure.map((item: any) => ({
        document_id: docId,
        chapter_name: item.chapter,
        unit_name: item.unit || null,
        topic_name: item.topic,
      }));

      await supabase.from("content_structure").insert(structureData);
      await supabase.from("documents").update({ 
        status: "completed",
        parsed_content: { structure_count: structureData.length }
      }).eq("id", docId);

      res.json({ message: "Structure saved successfully" });
    } catch (error: any) {
      console.error("Save structure error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/save-lesson", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ error: "Supabase not configured on server. Please check environment variables." });
      }
      const { topicId, lessonPlan } = req.body;

      const { data, error } = await supabase
        .from("lesson_plans")
        .insert([
          {
            ...lessonPlan,
            content_structure_id: topicId,
          },
        ])
        .select();

      if (error) throw error;

      res.json({ message: "Lesson plan saved successfully", data: data[0] });
    } catch (error: any) {
      console.error("Save lesson error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Catch-all for /api routes to prevent Vite from serving index.html for missing API endpoints
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
