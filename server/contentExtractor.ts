import { pdf } from "pdf-parse";
import mammoth from "mammoth";
import { YoutubeTranscript } from "youtube-transcript";
import * as fs from "fs";

export async function extractPDFText(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to extract PDF text: ${error}`);
  }
}

export async function extractDOCXText(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to extract DOCX text: ${error}`);
  }
}

export async function extractTXTText(filePath: string): Promise<string> {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    throw new Error(`Failed to extract TXT text: ${error}`);
  }
}

export async function extractPPTText(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || "PPT/PPTX parsing limited - please convert to PDF for better results";
  } catch (error) {
    throw new Error(`Failed to extract PPT text: ${error}`);
  }
}

export async function extractYouTubeTranscript(url: string): Promise<string> {
  try {
    console.log(`Extracting transcript from YouTube URL: ${url}`);
    
    const videoId = extractYouTubeVideoId(url);
    console.log(`Extracted video ID: ${videoId}`);
    
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    console.log(`Fetching transcript for video ID: ${videoId}`);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    console.log(`Transcript items fetched: ${transcript.length}`);
    
    // Check if transcript is empty
    if (!transcript || transcript.length === 0) {
      throw new Error("This video doesn't have subtitles/captions available. Please choose a different video with captions enabled.");
    }
    
    const content = transcript.map(item => item.text).join(" ");
    console.log(`Total transcript length: ${content.length} characters`);
    console.log(`First 200 chars: ${content.substring(0, 200)}`);
    
    if (content.trim().length === 0) {
      throw new Error("The video transcript is empty. Please choose a different video.");
    }
    
    return content;
  } catch (error: any) {
    console.error(`YouTube transcript extraction error:`, error);
    if (error.message?.includes("Transcript is disabled")) {
      throw new Error("This video doesn't have subtitles/captions enabled. Please choose a video with available transcripts.");
    }
    throw new Error(`Failed to extract YouTube transcript: ${error.message || error}`);
  }
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export async function extractContentFromFile(
  filePath: string,
  mimeType: string
): Promise<string> {
  const extension = filePath.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return extractPDFText(filePath);
    case "docx":
    case "doc":
      return extractDOCXText(filePath);
    case "txt":
      return extractTXTText(filePath);
    case "ppt":
    case "pptx":
      return extractPPTText(filePath);
    default:
      throw new Error(`Unsupported file type. Please upload PDF, DOCX, DOC, TXT, PPT, or PPTX files only.`);
  }
}
