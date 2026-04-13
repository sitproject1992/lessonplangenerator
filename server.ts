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

// Process-level error handling
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists at startup
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

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
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "EduPlan AI Server is running" });
  });

  app.get("/api/documents", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ error: "Supabase not configured on server" });
      }
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error("Fetch documents error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/structure/:docId", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ error: "Supabase not configured on server" });
      }
      const { docId } = req.params;
      
      const { data: structure, error: structError } = await supabase
        .from("content_structure")
        .select(`
          *,
          lesson_plans (id)
        `)
        .eq("document_id", docId)
        .order("chapter_name", { ascending: true });

      if (structError) throw structError;
      res.json(structure || []);
    } catch (error: any) {
      console.error("Fetch structure error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/topic/:id", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ error: "Supabase not configured on server" });
      }
      const { id } = req.params;
      const { data, error } = await supabase
        .from("content_structure")
        .select("*, documents(*)")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Fetch topic error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/lesson-plan/:id", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ error: "Supabase not configured on server" });
      }
      const { id } = req.params;
      const { data, error } = await supabase
        .from("lesson_plans")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Fetch lesson plan error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    console.log("POST /api/upload - Start");
    try {
      if (!supabase) {
        console.error("Supabase not initialized");
        return res.status(503).json({ error: "Supabase not configured on server. Please check environment variables." });
      }
      const file = req.file;
      const { type, name, subject, grades, language } = req.body;

      console.log("Upload params:", { type, name, subject, grades, language, hasFile: !!file });

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Process grades into an array
      const gradesArray = grades ? grades.split(',').map((g: string) => g.trim()).filter(Boolean) : [];

      // 1. Upload to Supabase Storage
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `${type}/${fileName}`;

      const fileBuffer = fs.readFileSync(file.path);
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, fileBuffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (storageError) {
        console.error("Storage upload error:", storageError);
        throw storageError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      // 2. Extract text from the local file before deleting it
      console.log("Extracting text from PDF...");
      const rawText = await extractTextFromPDF(file.path);
      const cleanText = cleanExtractedText(rawText);
      console.log("Text extraction complete. Length:", cleanText.length);

      // 3. Insert record into database
      console.log("Inserting record into Supabase...");
      const { data, error } = await supabase
        .from("documents")
        .insert([
          {
            name: name || file.originalname,
            type: type,
            subject: subject,
            grades: gradesArray,
            language: language || 'English',
            file_path: publicUrlData.publicUrl,
            status: "processing",
            content: cleanText,
          },
        ])
        .select();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      const document = data[0];
      console.log("Document inserted successfully:", document.id);

      // 4. Clean up local file
      fs.unlinkSync(file.path);

      res.json({ 
        message: "File uploaded to storage and text extracted", 
        data: document,
        extractedText: cleanText.substring(0, 30000) // Limit for Gemini
      });
    } catch (error: any) {
      console.error("Upload error details:", error);
      // Try to clean up local file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error("Failed to delete temp file:", e);
        }
      }
      
      const errorMessage = error.message || "An unknown error occurred during upload";
      const errorHint = error.hint ? ` (Hint: ${error.hint})` : "";
      const errorDetails = error.details ? ` (Details: ${error.details})` : "";
      
      res.status(500).json({ 
        error: `${errorMessage}${errorHint}${errorDetails}`,
        message: errorMessage
      });
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

      if (!lessonPlan) {
        return res.status(400).json({ error: "No lesson plan data provided" });
      }

      console.log("Saving lesson plan for topic:", topicId);

      // Validate topicId as UUID
      const isValidUUID = (uuid: string) => {
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return regex.test(uuid);
      };

      // Map the AI output to the database schema with fallbacks
      const mappedPlan: any = {
        subject: lessonPlan.subject || "N/A",
        class_level: lessonPlan.class || "N/A",
        unit: lessonPlan.unit || "N/A",
        topic: lessonPlan.lesson_topic || "N/A",
        learning_outcomes: Array.isArray(lessonPlan.learning_outcomes) ? lessonPlan.learning_outcomes.map((o: any) => String(o)) : ["N/A", "N/A", "N/A", "N/A"],
        warmup_review: lessonPlan.warmup_review || "",
        teaching_activities: lessonPlan.teaching_learning_activities || lessonPlan.teaching_activities || { a: "", b: "", c: "", d: "" },
        evaluation: lessonPlan.evaluation || { a: "", b: "", c: "", d: "" },
        remarks: lessonPlan.remarks || "",
        content_structure_id: (topicId && isValidUUID(topicId)) ? topicId : null,
      };

      // Handle assignments which could be an object or a string
      if (typeof lessonPlan.assignments === 'object' && lessonPlan.assignments !== null) {
        mappedPlan.assignments = `Classwork: ${lessonPlan.assignments.classwork || ""}\nHomework: ${lessonPlan.assignments.homework || ""}`;
      } else {
        mappedPlan.assignments = lessonPlan.assignments || "";
      }

      console.log("Mapped plan for insertion:", JSON.stringify(mappedPlan, null, 2));

      // Try to insert with language first
      const planWithLanguage = { ...mappedPlan, language: lessonPlan.language || 'English' };
      
      let { data, error } = await supabase
        .from("lesson_plans")
        .upsert([planWithLanguage], { onConflict: 'content_structure_id' })
        .select();

      // If it fails because of missing language column, retry without it
      if (error && error.message && error.message.includes('column "language"')) {
        console.warn("Language column missing in lesson_plans table, retrying without it.");
        const retry = await supabase
          .from("lesson_plans")
          .upsert([mappedPlan], { onConflict: 'content_structure_id' })
          .select();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error("Supabase save lesson error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return res.status(500).json({ 
          error: error.message || "Database error saving lesson plan",
          details: error,
          code: error.code
        });
      }

      res.json({ message: "Lesson plan saved successfully", data: data ? data[0] : null });
    } catch (error: any) {
      console.error("Save lesson error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to save lesson plan",
        details: error
      });
    }
  });

  // Catch-all for /api routes to prevent Vite from serving index.html for missing API endpoints
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Global error handler for JSON responses
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(err.status || 500).json({
      error: err.message || "An unexpected error occurred",
    });
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
