import { pdf } from "pdf-parse";
import mammoth from "mammoth";
import { Innertube } from "youtubei.js";
import * as fs from "fs";
import { transcribeYouTubeVideo } from "./audioExtractor";

export async function extractPDFText(filePath: string, includePageNumbers: boolean = false): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    if (!includePageNumbers) {
      return data.text;
    }
    
    // For page numbers, we need to process the PDF again to get per-page text
    // Split the extracted text by common page break indicators
    const fullText = data.text;
    const numPages = (data as any).pages || (data as any).total;
    
    console.log(`📄 PDF extraction with page numbers - text length: ${fullText?.length || 0}, pages: ${numPages}`);
    
    // Estimate text per page by dividing total text by number of pages
    const textLength = fullText.length;
    const avgCharsPerPage = Math.floor(textLength / numPages);
    
    console.log(`📄 Splitting ${textLength} chars across ${numPages} pages (~${avgCharsPerPage} chars/page)`);
    
    // Split text into approximate pages
    let result = '';
    let currentPos = 0;
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const isLastPage = pageNum === numPages;
      const endPos = isLastPage ? textLength : Math.min(currentPos + avgCharsPerPage, textLength);
      
      // Find a natural break point (sentence end) near the estimated page boundary
      let actualEndPos = endPos;
      if (!isLastPage) {
        // Look for sentence end within 100 chars of the boundary
        const searchText = fullText.substring(endPos - 50, Math.min(endPos + 50, textLength));
        const sentenceEndMatch = searchText.match(/[.!?]\s+/);
        if (sentenceEndMatch && sentenceEndMatch.index !== undefined) {
          actualEndPos = endPos - 50 + sentenceEndMatch.index + sentenceEndMatch[0].length;
        }
      }
      
      const pageText = fullText.substring(currentPos, actualEndPos).trim();
      if (pageText) {
        result += `[Page ${pageNum}] ${pageText} `;
      }
      
      currentPos = actualEndPos;
    }
    
    console.log(`📄 Final result length: ${result.trim().length}`);
    return result.trim();
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

export async function extractYouTubeTranscript(
  url: string, 
  includeTimestamps: boolean = false,
  onWhisperFallback?: () => void
): Promise<string> {
  const videoId = extractYouTubeVideoId(url);
  
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  try {
    console.log(`Extracting transcript from YouTube URL: ${url}`);
    console.log(`Extracted video ID: ${videoId}`);

    console.log(`Initializing YouTube client...`);
    const youtube = await Innertube.create();
    
    console.log(`Fetching video info for video ID: ${videoId}`);
    const info = await youtube.getInfo(videoId);
    
    console.log(`Fetching transcript...`);
    const transcriptData = await info.getTranscript();
    
    // Use optional chaining for safer access
    const segments = transcriptData?.transcript?.content?.body?.initial_segments;
    
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      throw new Error("NO_CAPTIONS");
    }
    
    // Extract text from transcript segments (segments is now validated)
    let content: string;
    
    if (includeTimestamps) {
      // Include timestamps in the content
      content = segments
        .map((segment: any) => {
          const startMs = segment.start_ms || 0;
          const hours = Math.floor(startMs / 3600000);
          const minutes = Math.floor((startMs % 3600000) / 60000);
          const seconds = Math.floor((startMs % 60000) / 1000);
          
          // Format as HH:MM:SS or MM:SS depending on video length
          const timestamp = hours > 0 
            ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            : `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          // Clean the text by removing excessive whitespace and normalizing
          const cleanText = segment.snippet.text.replace(/\s+/g, ' ').trim();
          return `[${timestamp}] ${cleanText}`;
        })
        .join(" ");
    } else {
      // Plain text without timestamps
      content = segments
        .map((segment: any) => segment.snippet.text.replace(/\s+/g, ' ').trim())
        .join(" ");
    }
    
    console.log(`Total transcript length: ${content.length} characters`);
    console.log(`First 200 chars: ${content.substring(0, 200)}`);
    
    if (content.trim().length === 0) {
      throw new Error("The video transcript is empty. Please choose a different video.");
    }
    
    return content;
  } catch (error: any) {
    console.error(`YouTube transcript extraction error:`, error);
    
    // Check if captions are unavailable - fallback to Whisper transcription
    if (error.message?.includes("NO_CAPTIONS") || 
        error.message?.includes("Transcript is disabled") || 
        error.message?.includes("Transcript not available") ||
        error.message?.includes("doesn't have subtitles")) {
      
      console.log(`No captions available, falling back to Whisper transcription for video ${videoId}`);
      
      // Notify caller that we're using Whisper (for progress updates)
      if (onWhisperFallback) {
        onWhisperFallback();
      }
      
      try {
        const whisperTranscript = await transcribeYouTubeVideo(videoId);
        
        if (!whisperTranscript || whisperTranscript.trim().length === 0) {
          throw new Error("Whisper transcription returned empty text");
        }
        
        console.log(`Whisper transcription successful: ${whisperTranscript.length} characters`);
        return whisperTranscript;
      } catch (whisperError: any) {
        console.error(`Whisper transcription failed:`, whisperError);
        throw new Error(`This video has no captions and AI transcription failed: ${whisperError.message}`);
      }
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
  mimeType: string,
  includePageNumbers: boolean = false
): Promise<string> {
  const extension = filePath.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return extractPDFText(filePath, includePageNumbers);
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
