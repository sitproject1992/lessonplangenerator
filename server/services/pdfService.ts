import fs from 'fs';
import pdf from 'pdf-parse-fork';

export async function extractTextFromPDF(filePath: string): Promise<string> {
  console.log(`Starting PDF extraction for: ${filePath}`);
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }
    const dataBuffer = fs.readFileSync(filePath);
    console.log(`File read into buffer. Size: ${dataBuffer.length} bytes`);
    
    if (dataBuffer.length === 0) {
      throw new Error('File is empty');
    }
    
    console.log("Calling pdf-parse-fork...");
    const data = await pdf(dataBuffer);
    console.log("pdf-parse-fork complete.");
    
    if (!data || typeof data.text !== 'string') {
      console.error('PDF parsing returned invalid data:', data);
      return '';
    }
    
    return data.text;
  } catch (error: any) {
    console.error('Error in extractTextFromPDF:', error);
    throw new Error(`Failed to parse PDF document: ${error.message}`);
  }
}

export function cleanExtractedText(text: string): string {
  // Basic cleaning: remove multiple spaces, newlines, etc.
  return text.replace(/\s+/g, ' ').trim();
}
