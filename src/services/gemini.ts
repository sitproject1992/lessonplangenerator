import { GoogleGenAI, Type } from "@google/genai";

// Safe access to process.env for Vite environment
const getApiKey = () => {
  try {
    return (process.env as any).GEMINI_API_KEY || "";
  } catch (e) {
    return "";
  }
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

export async function structureDocument(text: string, type: string) {
  const prompt = `
    Analyze the following text from a ${type} document and extract the educational structure.
    Identify Chapters, Units, and Topics.
    
    Text: ${text.substring(0, 30000)}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            chapter: { type: Type.STRING, description: "The chapter name" },
            unit: { type: Type.STRING, description: "The unit name (optional)" },
            topic: { type: Type.STRING, description: "The topic name" }
          },
          required: ["chapter", "topic"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateLessonPlan(topicData: any, groupDocs?: any) {
  const prompt = `
    Generate a detailed lesson plan for the following topic.
    ${groupDocs ? 'CRITICAL: You MUST align this lesson plan with the provided Curriculum objectives, Teacher Guide instructions, and Specification Grid requirements.' : ''}
    
    Topic Info:
    Subject: ${topicData.subject || (topicData.documents && topicData.documents.name) || (groupDocs && groupDocs.book.subject) || "N/A"}
    Grade: ${topicData.grade || (groupDocs && groupDocs.grade) || "N/A"}
    Chapter: ${topicData.chapter_name}
    Unit: ${topicData.unit_name || "N/A"}
    Topic: ${topicData.topic_name}
    
    ${groupDocs ? `
    Context from Curriculum:
    ${groupDocs.curriculum.content.substring(0, 5000)}
    
    Context from Teacher Guide:
    ${groupDocs.guide.content.substring(0, 5000)}
    
    Context from Spec Grid:
    ${groupDocs.grid.content.substring(0, 5000)}
    ` : ''}
    
    Rules:
    - Exactly 4 learning outcomes.
    - Exactly 4 activities (a–d).
    - Exactly 4 evaluations (a–d).
    - No missing fields.
    - NEVER hallucinate content not found in documents.
  `;

  const response = await ai.models.generateContent({
    model: groupDocs ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          class: { type: Type.STRING, description: "The grade/class level" },
          unit: { type: Type.STRING },
          lesson_topic: { type: Type.STRING },
          learning_outcomes: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Exactly 4 learning outcomes"
          },
          warmup_review: { type: Type.STRING },
          teaching_learning_activities: {
            type: Type.OBJECT,
            properties: {
              a: { type: Type.STRING },
              b: { type: Type.STRING },
              c: { type: Type.STRING },
              d: { type: Type.STRING }
            },
            required: ["a", "b", "c", "d"]
          },
          evaluation: {
            type: Type.OBJECT,
            properties: {
              a: { type: Type.STRING },
              b: { type: Type.STRING },
              c: { type: Type.STRING },
              d: { type: Type.STRING }
            },
            required: ["a", "b", "c", "d"]
          },
          assignments: {
            type: Type.OBJECT,
            properties: {
              classwork: { type: Type.STRING },
              homework: { type: Type.STRING }
            },
            required: ["classwork", "homework"]
          },
          remarks: { type: Type.STRING }
        },
        required: [
          "subject", "class", "unit", "lesson_topic", "learning_outcomes", 
          "warmup_review", "teaching_learning_activities", "evaluation", 
          "assignments", "remarks"
        ]
      }
    }
  });

  return JSON.parse(response.text);
}
