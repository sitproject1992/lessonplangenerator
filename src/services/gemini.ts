import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = (process.env as any).GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function structureDocument(text: string, type: string) {
  const prompt = `
    Analyze the following text from a ${type} document and extract the educational structure.
    Identify Chapters, Units, and Topics.
    Return the result as a JSON array of objects with the following structure:
    [
      { "chapter": "Chapter Name", "unit": "Unit Name (optional)", "topic": "Topic Name" }
    ]
    Only return the JSON array, no other text.
    
    Text: ${text}
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const responseText = response.text();

  const jsonStr = responseText.replace(/```json|```/g, "").trim();
  return JSON.parse(jsonStr);
}

export async function generateLessonPlan(topicData: any) {
  const prompt = `
    Generate a detailed lesson plan for the following topic:
    Subject: ${topicData.documents.name}
    Chapter: ${topicData.chapter_name}
    Unit: ${topicData.unit_name || "N/A"}
    Topic: ${topicData.topic_name}
    
    The lesson plan MUST follow this EXACT format:
    - Subject, Class, Unit, Period, Topic
    - Learning Outcomes (4 specific points)
    - Warmup & Review
    - Teaching Activities (a, b, c, d)
    - Evaluation (a, b, c, d)
    - Assignments
    - Remarks
    
    Return the result as a JSON object with these keys:
    {
      "subject": "...",
      "class_level": "...",
      "unit": "...",
      "period": "...",
      "topic": "...",
      "learning_outcomes": ["...", "...", "...", "..."],
      "warmup_review": "...",
      "teaching_activities": { "a": "...", "b": "...", "c": "...", "d": "..." },
      "evaluation": { "a": "...", "b": "...", "c": "...", "d": "..." },
      "assignments": "...",
      "remarks": "..."
    }
    Only return the JSON object, no other text.
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const responseText = response.text();

  const jsonStr = responseText.replace(/```json|```/g, "").trim();
  return JSON.parse(jsonStr);
}
