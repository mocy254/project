import OpenAI from "openai";
import { get_encoding } from "tiktoken";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// Initialize tiktoken encoder for accurate token counting (cl100k_base encoding used by GPT-4/GPT-5)
const encoder = get_encoding("cl100k_base");

// Supabase client for downloading images
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

// Tier-based configuration for OpenAI
const GPT_TIER = process.env.GPT_TIER || "1";
const TIER_CONFIG = {
  "1": {
    // Tier 1 - Conservative settings for rate limits
    maxConcurrency: 5,
    retryAttempts: 2,
    retryDelay: 2000,
    timeouts: {
      small: 120000,  // 2 minutes
      medium: 210000, // 3.5 minutes
      large: 300000   // 5 minutes
    }
  },
  "2+": {
    // Tier 2+ - Optimized settings for higher rate limits
    maxConcurrency: 20,
    retryAttempts: 3,
    retryDelay: 1000,
    timeouts: {
      small: 60000,   // 1 minute
      medium: 120000, // 2 minutes
      large: 180000   // 3 minutes
    }
  }
};

// Normalize tier: treat any tier >= 2 as Tier 2+
const normalizedTier = parseInt(GPT_TIER) >= 2 ? "2+" : "1";
const config = TIER_CONFIG[normalizedTier as keyof typeof TIER_CONFIG];
console.log(`OpenAI GPT-5 mini using Tier ${GPT_TIER} (normalized to ${normalizedTier}) configuration:`, {
  maxConcurrency: config.maxConcurrency,
  retryAttempts: config.retryAttempts
});

// Timeout wrapper for async operations
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timed out"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

// Retry wrapper with exponential backoff (uses tier configuration)
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = config.retryAttempts,
  initialDelayMs: number = config.retryDelay
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}

export interface FlashcardGenerationOptions {
  content: string;
  cardTypes: string[];
  granularity: number;
  customInstructions: string;
  createSubdecks?: boolean;
  includeSource?: string;
  images?: Array<{imageUrl: string, pageNumber?: number}>;
  onProgress?: (update: {
    stage: string;
    message: string;
    progress: number;
    currentStep?: number;
    totalSteps?: number;
    cardsGenerated?: number;
  }) => void;
}

export interface GeneratedFlashcard {
  question: string;
  answer: string;
  cardType: "qa" | "cloze" | "reverse";
  subtopic?: string;
  imageUrl?: string;
  sourceExcerpt?: string;
  verificationScore?: number;
  needsReview?: boolean;
}

export interface SubdeckGroup {
  subtopic: string;
  flashcards: GeneratedFlashcard[];
}

interface TopicOutline {
  topics: Array<{
    title: string;
    subtopics?: string[];
  }>;
}

interface SemanticChunk {
  content: string;
  topics: string[];
  context: string;
}

function countTokens(text: string): number {
  try {
    const tokens = encoder.encode(text);
    return tokens.length;
  } catch (error) {
    console.error("Error counting tokens, falling back to estimation:", error);
    // Fallback to estimation if tiktoken fails
    // Use 3.5 chars/token for better accuracy with technical/medical content
    return Math.ceil(text.length / 3.5);
  }
}

// Get overlap text (last ~targetTokens from the given text)
function getOverlapText(text: string, targetTokens: number = 200): string {
  if (!text.trim()) return '';
  
  const lines = text.split('\n');
  const overlapLines: string[] = [];
  let overlapTokens = 0;
  const minLines = 3; // Ensure minimum context even if it exceeds target
  
  // Work backwards from the end to collect ~targetTokens
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const lineTokens = countTokens(line);
    
    // Stop if we exceed target AND have enough lines for context
    if (overlapTokens + lineTokens > targetTokens && overlapLines.length >= minLines) {
      break;
    }
    
    overlapLines.unshift(line);
    overlapTokens += lineTokens;
  }
  
  return overlapLines.join('\n');
}

// Simple fact verification: check if key medical terms from the answer exist in the source
function verifyFlashcard(flashcard: GeneratedFlashcard, sourceChunk: string): { score: number; needsReview: boolean } {
  const answer = flashcard.answer.toLowerCase();
  const source = sourceChunk.toLowerCase();
  
  // Extract key medical terms (words 4+ chars, excluding common words)
  const commonWords = new Set(['that', 'this', 'with', 'from', 'have', 'been', 'were', 'will', 'what', 'when', 'where', 'which', 'their', 'there', 'these', 'those', 'would', 'could', 'should', 'about', 'after', 'before', 'through', 'during', 'between']);
  
  const keyTerms = answer
    .split(/\s+/)
    .filter(word => {
      const cleaned = word.replace(/[^\w]/g, '');
      return cleaned.length >= 4 && !commonWords.has(cleaned);
    })
    .map(word => word.replace(/[^\w]/g, ''));
  
  if (keyTerms.length === 0) {
    // No key terms to verify, consider it verified
    return { score: 100, needsReview: false };
  }
  
  // Check how many key terms appear in the source
  const foundTerms = keyTerms.filter(term => source.includes(term));
  const verificationScore = Math.round((foundTerms.length / keyTerms.length) * 100);
  
  // Flag for review if less than 70% of key terms are found
  const needsReview = verificationScore < 70;
  
  return { score: verificationScore, needsReview };
}

// Convert image URL to base64 for OpenAI API
async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    // Extract the path from the Supabase URL
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)$/);
    
    if (!pathMatch) {
      throw new Error(`Invalid Supabase URL format: ${imageUrl}`);
    }
    
    const filePath = pathMatch[1];
    const bucketName = 'flashgenius-uploads';
    
    // Download the file from Supabase
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filePath);
    
    if (error) {
      console.error(`Error downloading image from Supabase:`, error);
      throw error;
    }
    
    // Convert to base64
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    // Determine MIME type from file extension
    const extension = filePath.split('.').pop()?.toLowerCase() || 'png';
    const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : `image/${extension}`;
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Failed to convert image to base64:`, error);
    throw error;
  }
}

async function extractTopicOutline(content: string): Promise<TopicOutline> {
  const estimatedTokens = countTokens(content);
  const maxTokensPerPass = 80000;
  
  if (estimatedTokens <= maxTokensPerPass) {
    return extractTopicsFromChunk(content);
  }

  console.log(`Document too large for single analysis. Processing in ${Math.ceil(estimatedTokens / maxTokensPerPass)} passes...`);
  
  const lines = content.split('\n');
  const chunks: string[] = [];
  let currentChunk = '';
  let currentTokens = 0;
  
  for (const line of lines) {
    const lineTokens = countTokens(line);
    
    if (currentTokens + lineTokens > maxTokensPerPass && currentChunk) {
      chunks.push(currentChunk.trim());
      
      // Add 200-token overlap for context continuity
      const overlap = getOverlapText(currentChunk, 200);
      currentChunk = overlap + (overlap ? '\n' : '') + line + '\n';
      currentTokens = countTokens(currentChunk);
    } else {
      currentChunk += line + '\n';
      currentTokens += lineTokens;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  const allTopics: Array<{ title: string; subtopics?: string[]; sectionIndex: number }> = [];
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Analyzing section ${i + 1}/${chunks.length} for topics...`);
    const chunkOutline = await extractTopicsFromChunk(chunks[i]);
    // Tag each topic with its section index to prevent merging distinct sections
    allTopics.push(...chunkOutline.topics.map(t => ({ ...t, sectionIndex: i })));
  }

  // Deduplicate using both title AND section index to preserve distinct sections
  const uniqueTopics = new Map<string, { title: string; subtopics?: string[]; sectionIndex: number }>();
  for (const topic of allTopics) {
    const key = `${topic.title}__section${topic.sectionIndex}`;
    if (!uniqueTopics.has(key)) {
      uniqueTopics.set(key, topic);
    } else if (topic.subtopics && topic.subtopics.length > 0) {
      const existing = uniqueTopics.get(key)!;
      if (!existing.subtopics) existing.subtopics = [];
      // Deduplicate subtopics using Set
      const existingSet = new Set(existing.subtopics);
      topic.subtopics.forEach(sub => existingSet.add(sub));
      existing.subtopics = Array.from(existingSet);
    }
  }

  return {
    topics: Array.from(uniqueTopics.values()).map((topic, index) => ({
      title: topic.title,
      // Ensure final deduplication of subtopics
      subtopics: topic.subtopics ? Array.from(new Set(topic.subtopics)) : undefined
    }))
  };
}

async function extractTopicsFromChunk(content: string): Promise<TopicOutline> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "topic_outline",
          strict: true,
          schema: {
            type: "object",
            properties: {
              topics: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    subtopics: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: ["title"],
                  additionalProperties: false
                }
              }
            },
            required: ["topics"],
            additionalProperties: false
          }
        }
      },
      messages: [{
        role: "user",
        content: `Analyze this document section and extract ALL major topics and subtopics.

For medical/educational content, identify:
- Disease/condition names (e.g., "Diabetes Mellitus", "Heart Failure")
- Chapter/section headings
- Pathophysiology sections
- Clinical features/symptoms sections
- Diagnostic criteria sections
- Treatment/management sections
- Complications sections

Be comprehensive - extract EVERY distinct topic mentioned.

Content:
${content}`
      }]
    });

    const rawText = response.choices[0].message.content;
    if (!rawText) {
      throw new Error("Empty response from topic extraction");
    }
    const outline = JSON.parse(rawText);
    
    // Validate that we got topics
    if (!outline || !outline.topics || outline.topics.length === 0) {
      console.warn("⚠️  Topic extraction returned 0 topics - will use simple chunking");
    }
    
    return outline as TopicOutline;
  } catch (error) {
    console.error("❌ Topic extraction FAILED:", error);
    console.error("Error details:", error instanceof Error ? error.message : error);
    console.warn("⚠️  Falling back to simple chunking without topic detection");
    console.warn("This may result in less optimal chunk boundaries but generation will continue");
    return { topics: [] };
  }
}

function chunkContentByTopics(content: string, outline: TopicOutline, maxTokens: number = 100000): SemanticChunk[] {
  const estimatedTokens = countTokens(content);
  
  if (estimatedTokens <= maxTokens) {
    return [{
      content,
      topics: outline.topics.map(t => t.title),
      context: outline.topics.length > 0 
        ? `Topics covered: ${outline.topics.map(t => t.title).slice(0, 3).join(', ')}${outline.topics.length > 3 ? '...' : ''}`
        : "Complete document"
    }];
  }

  const lines = content.split('\n');
  const chunks: SemanticChunk[] = [];
  
  if (outline.topics.length === 0) {
    console.log("No topics detected, using simple chunking with overlap...");
    let currentChunk = '';
    let currentTokens = 0;
    
    for (const line of lines) {
      const lineTokens = countTokens(line);
      
      if (currentTokens + lineTokens > maxTokens && currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          topics: ["Document section"],
          context: "Part of larger document"
        });
        
        // Get 200-token overlap from previous chunk for context continuity
        const overlap = getOverlapText(currentChunk, 200);
        
        currentChunk = overlap + (overlap ? '\n' : '') + line + '\n';
        currentTokens = countTokens(currentChunk);
      } else {
        currentChunk += line + '\n';
        currentTokens += lineTokens;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        topics: ["Document section"],
        context: "Part of larger document"
      });
    }
    
    return chunks;
  }

  const topicPatterns = outline.topics.map(t => ({
    title: t.title,
    pattern: new RegExp(t.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    subtopics: t.subtopics || []
  }));

  let currentChunk = '';
  let currentTokens = 0;
  let currentTopics: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTokens = countTokens(line);
    
    let matchedTopic = '';
    let matchedSubtopic = '';
    let isNewTopicBoundary = false;
    
    for (const { title, pattern, subtopics } of topicPatterns) {
      if (pattern.test(line)) {
        matchedTopic = title;
        isNewTopicBoundary = currentTopics.length === 0 || currentTopics[0] !== title;
        break;
      }
      
      for (const subtopic of subtopics) {
        const subtopicPattern = new RegExp(subtopic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (subtopicPattern.test(line)) {
          matchedTopic = title;
          matchedSubtopic = subtopic;
          const currentContext = currentTopics.join(' - ');
          const newContext = `${title} - ${subtopic}`;
          isNewTopicBoundary = currentContext !== newContext;
          break;
        }
      }
      if (matchedTopic) break;
    }

    if (isNewTopicBoundary && currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        topics: [...currentTopics],
        context: currentTopics.length > 0 
          ? `Topics: ${currentTopics.join(' - ')}`
          : "Document section"
      });
      
      // Add 200-token overlap for context continuity at topic boundaries
      const overlap = getOverlapText(currentChunk, 200);
      currentChunk = overlap + (overlap ? '\n' : '');
      currentTokens = countTokens(currentChunk);
      currentTopics = [];
    }

    if (matchedTopic && isNewTopicBoundary) {
      currentTopics = matchedSubtopic 
        ? [matchedTopic, matchedSubtopic]
        : [matchedTopic];
    }

    if (currentTokens + lineTokens > maxTokens && currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        topics: [...currentTopics],
        context: currentTopics.length > 0 
          ? `Topics: ${currentTopics.join(' - ')}`
          : "Document section"
      });
      
      // Add 200-token overlap for context continuity at size boundaries
      const overlap = getOverlapText(currentChunk, 200);
      currentChunk = overlap + (overlap ? '\n' : '') + line + '\n';
      currentTokens = countTokens(currentChunk);
    } else {
      currentChunk += line + '\n';
      currentTokens += lineTokens;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      topics: [...currentTopics],
      context: currentTopics.length > 0 
        ? `Topics: ${currentTopics.join(' - ')}`
        : "Final section"
    });
  }

  return chunks;
}

export async function generateFlashcards(
  options: FlashcardGenerationOptions
): Promise<GeneratedFlashcard[]> {
  const { content, cardTypes, granularity, customInstructions, onProgress, createSubdecks, includeSource, images } = options;

  console.log(`=== Starting flashcard generation with GPT-5 mini ===`);
  console.log(`Content length: ${content.length} characters`);
  console.log(`Card types: ${JSON.stringify(cardTypes)}`);
  console.log(`Granularity: ${granularity}`);
  
  const estimatedTokens = countTokens(content);
  console.log(`Estimated tokens: ${estimatedTokens}`);
  
  if (estimatedTokens > 100000) {
    console.log(`Large document detected (${Math.floor(estimatedTokens / 1000)}k tokens). Extracting topic structure...`);
    onProgress?.({
      stage: "analyzing",
      message: "Analyzing document structure...",
      progress: 10
    });
    
    const outline = await extractTopicOutline(content);
    console.log(`Found ${outline.topics.length} main topics`);
    
    onProgress?.({
      stage: "chunking",
      message: `Found ${outline.topics.length} topics, splitting document...`,
      progress: 20
    });
    
    const semanticChunks = chunkContentByTopics(content, outline, 100000);
    console.log(`Split into ${semanticChunks.length} semantic chunks`);
    
    onProgress?.({
      stage: "generating",
      message: `Processing ${semanticChunks.length} sections in parallel...`,
      progress: 25,
      totalSteps: semanticChunks.length
    });
    
    const allFlashcards: GeneratedFlashcard[] = [];
    const failedChunks: number[] = [];
    const emptyChunks: number[] = [];
    
    // Calculate dynamic concurrency based on document size and tier
    const CONCURRENCY = Math.min(
      config.maxConcurrency,
      semanticChunks.length <= 5 ? Math.min(3, semanticChunks.length) :
      semanticChunks.length <= 15 ? Math.floor(config.maxConcurrency * 0.6) :
      config.maxConcurrency
    );
    
    console.log(`Using concurrency level: ${CONCURRENCY} (Tier ${GPT_TIER}, ${semanticChunks.length} chunks)`);
    
    const chunkGroups: SemanticChunk[][] = [];
    
    for (let i = 0; i < semanticChunks.length; i += CONCURRENCY) {
      chunkGroups.push(semanticChunks.slice(i, i + CONCURRENCY));
    }
    
    let processedChunks = 0;
    
    for (const group of chunkGroups) {
      const promises = group.map(async (chunk, idx) => {
        const chunkIndex = processedChunks + idx;
        console.log(`Processing chunk ${chunkIndex + 1}/${semanticChunks.length} - ${chunk.context}`);
        
        const MAX_CHUNK_RETRIES = config.retryAttempts;
        let lastError: Error | undefined;
        
        for (let attempt = 0; attempt <= MAX_CHUNK_RETRIES; attempt++) {
          try {
            if (attempt > 0) {
              console.log(`Retrying chunk ${chunkIndex + 1} (attempt ${attempt + 1}/${MAX_CHUNK_RETRIES + 1})...`);
            }
            
            const chunkFlashcards = await generateFlashcardsForChunk({
              content: chunk.content,
              cardTypes,
              granularity,
              customInstructions,
              createSubdecks,
              images
            }, chunk.context);
            
            if (chunkFlashcards.length === 0) {
              console.warn(`⚠️  Chunk ${chunkIndex + 1} produced 0 flashcards - may indicate an issue or very low coverage level`);
              emptyChunks.push(chunkIndex + 1);
            } else {
              console.log(`✓ Chunk ${chunkIndex + 1} generated ${chunkFlashcards.length} flashcards`);
            }
            
            return chunkFlashcards;
          } catch (error) {
            lastError = error as Error;
            if (attempt < MAX_CHUNK_RETRIES) {
              const backoffDelay = config.retryDelay * Math.pow(2, attempt);
              console.warn(`⚠️  Chunk ${chunkIndex + 1} failed, will retry in ${backoffDelay}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
          }
        }
        
        console.error(`❌ ERROR: Chunk ${chunkIndex + 1} failed after ${MAX_CHUNK_RETRIES + 1} attempts:`, lastError);
        console.error(`Error details:`, lastError instanceof Error ? lastError.message : lastError);
        console.error(`Error stack:`, lastError instanceof Error ? lastError.stack : 'No stack trace');
        failedChunks.push(chunkIndex + 1);
        return [];
      });
      
      const results = await Promise.all(promises);
      results.forEach(cards => allFlashcards.push(...cards));
      
      processedChunks += group.length;
      const progress = 25 + ((processedChunks / semanticChunks.length) * 65);
      
      onProgress?.({
        stage: "generating",
        message: `Processed ${processedChunks}/${semanticChunks.length} sections`,
        progress: Math.round(progress),
        currentStep: processedChunks,
        totalSteps: semanticChunks.length,
        cardsGenerated: allFlashcards.length
      });
    }
    
    console.log(`\n=== CHUNK PROCESSING SUMMARY ===`);
    console.log(`Total chunks: ${semanticChunks.length}`);
    console.log(`Total flashcards generated: ${allFlashcards.length}`);
    
    if (failedChunks.length > 0) {
      console.error(`❌ ${failedChunks.length} chunk(s) FAILED: ${failedChunks.join(', ')}`);
      console.error(`These chunks were skipped - some content may be missing from flashcards`);
    }
    
    if (emptyChunks.length > 0) {
      console.warn(`⚠️  ${emptyChunks.length} chunk(s) produced 0 cards: ${emptyChunks.join(', ')}`);
      console.warn(`This may be normal for low coverage levels, or could indicate an issue`);
    }
    
    if (failedChunks.length === 0 && emptyChunks.length === 0) {
      console.log(`✓ All chunks processed successfully`);
    }
    
    return allFlashcards;
  }
  
  onProgress?.({
    stage: "generating",
    message: "Generating flashcards...",
    progress: 30
  });
  
  return generateFlashcardsForChunk(options, "Complete document");
}

async function generateFlashcardsForChunk(
  options: FlashcardGenerationOptions,
  chunkContext: string = "Document content"
): Promise<GeneratedFlashcard[]> {
  const { content, cardTypes, granularity, customInstructions, createSubdecks, includeSource, images } = options;
  
  // Convert images to base64 if provided
  let base64Images: Array<{base64: string, pageNumber?: number}> = [];
  if (images && images.length > 0) {
    console.log(`Converting ${images.length} images to base64 for OpenAI...`);
    for (const img of images) {
      try {
        const base64 = await imageUrlToBase64(img.imageUrl);
        base64Images.push({ base64, pageNumber: img.pageNumber });
      } catch (error) {
        console.error(`Failed to convert image ${img.imageUrl}:`, error);
      }
    }
    console.log(`Successfully converted ${base64Images.length}/${images.length} images`);
  }

  // Importance thresholds for each coverage level
  const importanceMapping = {
    1: { threshold: "9-10", description: "Only CORE PRINCIPLES (definitions, main classifications)" },
    2: { threshold: "8-10", description: "Core + KEY MECHANISMS (main pathways, primary causes)" },
    3: { threshold: "7-10", description: "Key ideas + MODERATE DETAILS (main symptoms, classifications)" },
    4: { threshold: "6-10", description: "Balanced coverage (essential facts + supporting detail)" },
    5: { threshold: "5-10", description: "Detailed (secondary mechanisms, exceptions, associations)" },
    6: { threshold: "4-10", description: "Near-comprehensive (most concepts, facts, numbers)" },
    7: { threshold: "1-10", description: "Every detail (all sentences, facts, numbers, concepts)" }
  };

  const currentLevel = importanceMapping[granularity as keyof typeof importanceMapping];
  
  const coverageGuidance = 
    granularity === 1 ? "Level 1 – Absolute Essentials Only (Importance 9-10): Include ONLY facts of critical importance (core definitions, main classifications). Skip ALL mechanisms, examples, numbers, symptoms, treatments, and complications. Generate 3-5 cards per major topic maximum." :
    granularity === 2 ? "Level 2 – Core Concepts (Importance 8-10): Include critical definitions AND the single most important mechanism/pathway per concept. Skip examples, clinical features, numbers, and treatment details. Generate 5-10 cards per major topic." :
    granularity === 3 ? "Level 3 – Key Ideas (Importance 7-10): Include main concepts, primary mechanisms, AND major clinical features/symptoms. Skip rare cases, detailed treatments, and extensive lists. Generate 10-15 cards per major topic." :
    granularity === 4 ? "Level 4 – Balanced (Importance 6-10): Include essential facts, mechanisms, main symptoms, AND key treatment principles. Add important numbers that aid diagnosis. Skip rare complications and excessive detail." :
    granularity === 5 ? "Level 5 – Detailed (Importance 5-10): Include all main content PLUS secondary mechanisms, important exceptions, clinical variations, and treatment details. Capture most key information while avoiding trivial facts." :
    granularity === 6 ? "Level 6 – Near-Comprehensive (Importance 4-10): Include almost every concept, fact, number, and detail. Only skip purely stylistic or redundant information. Create multiple cards per complex concept." :
    "Level 7 – Every Detail (Importance 1-10): Convert every educational sentence, fact, number, figure reference, and concept into flashcards. Include all mechanisms, symptoms (with timing/sequence), treatments (with doses if present), and complications.";

  // Build card type descriptions
  const cardTypeDescriptions: string[] = [];
  const reverseEnabled = cardTypes.includes("reverse");
  
  if (cardTypes.includes("qa")) {
    cardTypeDescriptions.push(`- Q&A: One clear question + ultra-brief answer (few words or bullets)`);
  }
  
  if (cardTypes.includes("cloze")) {
    cardTypeDescriptions.push(`- Cloze: Hide key terms, values, or phrases using {{c1::term}} format (no large blanks)`);
  }
  
  if (reverseEnabled) {
    cardTypeDescriptions.push(`- Reverse: Also generate the inverse card (answer → question) for bidirectional study`);
  }

  const cardTypeList = cardTypeDescriptions.join('\n');
  const customInstructionsText = customInstructions 
    ? `\n\n**Custom Instructions:** ${customInstructions}`
    : '';
  
  const subdeckGuidance = createSubdecks 
    ? `\n\n**SUBTOPIC ORGANIZATION:**
- You MUST identify and assign each flashcard to a specific subtopic/section
- Subtopic names should be clear, concise topic labels (e.g., "Pathophysiology", "Clinical Features", "Treatment")
- Group related flashcards under the same subtopic
- Use consistent subtopic names throughout the content`
    : '';

  const imageGuidance = base64Images.length > 0
    ? `\n\n**⚠️ IMAGE SELECTION REQUIRED - ${base64Images.length} IMAGES AVAILABLE:**
Images provided with page numbers: ${base64Images.map((_, idx) => `Image ${idx + 1}${base64Images[idx].pageNumber ? ` (Page ${base64Images[idx].pageNumber})` : ''}`).join(', ')}

**REQUIRED: Every flashcard MUST include an imageIndex field (0-based index).**

**HOW TO SELECT THE BEST IMAGE FOR EACH FLASHCARD:**
1. **Match by page number**: If flashcard is about content from page 3, use Image 3's index
2. **Match by topic**: Choose the image most relevant to the flashcard's concept
3. **For text-only content**: If no image is directly relevant, use the first available image from that section
4. **Use the index number** (0 for first image, 1 for second, etc.) in the "imageIndex" field

**PRIORITY FOR IMAGE SELECTION:**
- Anatomy/pathology flashcards → Use anatomical diagrams
- Clinical presentation/signs → Use clinical images or diagnostic images
- Treatment/procedures → Use flowcharts, algorithms, or procedural diagrams
- Definitions/mechanisms → Use the most contextually relevant image from that page

Remember: ALL flashcards must have an imageIndex. Choose the most educationally valuable image for each card.`
    : '';

  const sourceGuidance = includeSource === 'true'
    ? `\n\n**📍 SOURCE CITATION REQUIRED:**
The content includes page markers like [Page 3] or timestamps like [1:23].
**You MUST cite the source in your answers** when relevant:
- Include page references naturally in the answer (e.g., "Page 3: definition", "(Page 5)", "See Page 7")
- Use brief citations that don't bloat the answer
- Cite the most relevant page if the answer spans multiple pages
- Make citations feel natural, not forced`
    : '';

  const systemPrompt = `You are a medical education AI that generates flashcards using an importance-based filtering system.

**TWO-STAGE PROCESS:**

STAGE 1 - Analyze & Categorize (Mental Process):
- Read entire content and identify all facts
- Assign importance score (1-10) to each fact based on:
  * 9-10: Core definitions, main classifications (what IS it?)
  * 8: Primary mechanisms, main causes/pathways  
  * 7: Major clinical features, key symptoms, main treatments
  * 6: Supporting details, important numbers/values
  * 5: Secondary mechanisms, exceptions, clinical variations
  * 4: Additional details, less common features
  * 1-3: Rare cases, minor details, examples

STAGE 2 - Filter & Generate:
- Current coverage level: ${currentLevel.threshold} importance range
- Generate flashcards ONLY from facts with importance ≥ ${currentLevel.threshold.split('-')[0]}
- Lower importance facts must be completely IGNORED at this level

**FLASHCARD FORMAT:**
- Front: focused, standalone question
- Back: ULTRA-CONCISE answer:
  • Single fact: brief 
  • Multiple facts: bullet points (• item)
  • NO complete paragraphs

Keep cards atomic — one idea per card.
Lower coverage levels = dramatically fewer cards.

---
**USER SETTINGS:**
Card Types: ${cardTypes.join(", ")}
${reverseEnabled ? 'Reverse Mode: ENABLED — Generate bidirectional cards where appropriate' : ''}
Coverage Level: ${coverageGuidance}${customInstructionsText}
---

**CARD STRUCTURE:**
${cardTypeList}

**IMPORTANCE-BASED FILTERING RULES:**

1. **Analyze ENTIRE Content:** Read all sections but mentally categorize each fact by importance (1-10 scale)

2. **Apply Importance Filter:** ${coverageGuidance}
   - ONLY create cards from facts meeting the importance threshold
   - Example for Level 1: A definition (importance 10) → include. A treatment complication (importance 4) → SKIP
   - Example for Level 3: Main symptoms (importance 7) → include. Rare side effects (importance 3) → SKIP

3. **Topic Priority Examples:**
   Medical content hierarchy (from highest to lowest importance):
   * Definitions & classifications (9-10)
   * Main mechanisms & primary causes (8)
   * Key clinical features (6 Ps, cardinal symptoms) (7)
   * Diagnostic criteria & main treatments (6-7)
   * Secondary mechanisms & exceptions (5)
   * Complications & treatment details (4-5)
   * Timing/sequence details & specific doses (3-4)
   * Rare cases & examples (1-3)

4. **Conciseness:** Answers ULTRA-CONCISE:
   - Single fact: 2-5 words
   - Multiple facts: bullet points (•)
   - NO sentences or paragraphs

5. **Atomic Cards:** One fact per card. Standalone questions.

6. **No Hallucination:** Extract ONLY from provided content.

7. **No Redundancy:** Merge duplicate topics.

**Critical:** At Level 1, if content has 50 facts, maybe only 3-5 have importance ≥9. Create ONLY those 3-5 cards. Do not generate more by lowering standards.${subdeckGuidance}${imageGuidance}${sourceGuidance}`;

  console.log(`Calling OpenAI API for chunk: ${chunkContext.substring(0, 50)}...`);
  
  if (includeSource === 'true') {
    const pageMarkerCount = (content.match(/\[Page \d+\]/g) || []).length;
    console.log(`📍 Page markers in content: ${pageMarkerCount} found`);
    if (pageMarkerCount === 0) {
      console.warn(`⚠️  WARNING: includeSource is true but NO page markers found in content!`);
    }
  }
  
  const chunkTokens = countTokens(content);
  
  let timeout = 
    chunkTokens < 30000 ? config.timeouts.small :
    chunkTokens < 70000 ? config.timeouts.medium :
    config.timeouts.large;
  
  if (base64Images.length > 0) {
    timeout = Math.floor(timeout * 1.5);
    console.log(`⏰ Extended timeout by 50% for image selection (${base64Images.length} images available)`);
  }
  
  console.log(`Chunk size: ${chunkTokens} tokens, timeout: ${timeout / 1000}s (Tier ${GPT_TIER})`);
  
  try {
    // Build the JSON schema
    const flashcardSchema: any = {
      type: "object",
      properties: {
        question: { type: "string" },
        answer: { type: "string" },
        cardType: { type: "string" }
      },
      required: ["question", "answer", "cardType"],
      additionalProperties: false
    };
    
    if (createSubdecks) {
      flashcardSchema.properties.subtopic = { type: "string" };
      flashcardSchema.required.push("subtopic");
    }
    
    if (base64Images.length > 0) {
      flashcardSchema.properties.imageIndex = { type: "number" };
      flashcardSchema.required.push("imageIndex");
    }
    
    // Build user message content
    const userMessageParts: any[] = [
      {
        type: "text",
        text: `IMPORTANCE-BASED FLASHCARD GENERATION

Context: ${chunkContext}

STEP 1 - ANALYZE (mentally categorize all facts by importance 1-10):
Read the ENTIRE content section below and identify ALL facts:
- Core definitions/classifications (importance 9-10)
- Main mechanisms/causes (importance 8)
- Key clinical features/symptoms (importance 7)
- Supporting details/treatments (importance 6)
- Secondary info/exceptions (importance 5)
- Additional details (importance 4)
- Minor details/examples (importance 1-3)

**CRITICAL:** Process the COMPLETE content below. Do NOT skip or miss any sections. Read from start to finish.

STEP 2 - FILTER by current level (${currentLevel.threshold}):
- Include ONLY facts with importance ≥ ${currentLevel.threshold.split('-')[0]}
- Lower importance facts are EXCLUDED entirely
- This naturally produces fewer cards at lower levels

STEP 3 - GENERATE flashcards:
- Create ultra-concise cards (2-5 words or bullets)
- One atomic fact per card${createSubdecks ? '\n- Assign each flashcard to a specific subtopic (e.g., "Pathophysiology", "Treatment", "Diagnosis")' : ''}
- Ensure COMPLETE coverage of all qualifying facts in this section
- **IMPORTANT:** For medical content at level ${granularity}, expect to generate MANY flashcards (typically 20-50+ cards per topic at level 5-7). Do NOT artificially limit the number of flashcards - create cards for EVERY qualifying fact.

Content to process:

${content}`
      }
    ];
    
    // Add images if available
    if (base64Images.length > 0) {
      for (let i = 0; i < base64Images.length; i++) {
        userMessageParts.push({
          type: "image_url",
          image_url: {
            url: base64Images[i].base64
          }
        });
      }
    }
    
    const response = await withRetry(
      () => withTimeout(
        openai.chat.completions.create({
          model: "gpt-5-mini",
          temperature: 0.25,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userMessageParts
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "flashcard_generation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  flashcards: {
                    type: "array",
                    items: flashcardSchema
                  }
                },
                required: ["flashcards"],
                additionalProperties: false
              }
            }
          }
        }),
        timeout,
        "OpenAI API request timed out"
      ),
      config.retryAttempts,
      config.retryDelay
    );

    const rawJson = response.choices[0].message.content;
    if (!rawJson) {
      console.error("OpenAI returned empty response");
      throw new Error("Empty response from OpenAI");
    }

    const responseTokens = countTokens(rawJson);
    console.log(`OpenAI API response: ${responseTokens} tokens`);

    const data = JSON.parse(rawJson);
    const flashcards = data.flashcards || [];
    console.log(`OpenAI API returned ${flashcards.length} flashcards for chunk: ${chunkContext.substring(0, 50)}...`);
    
    // Convert imageIndex back to imageUrl
    if (base64Images.length > 0 && images && images.length > 0) {
      flashcards.forEach((card: any) => {
        if (typeof card.imageIndex === 'number' && card.imageIndex >= 0 && card.imageIndex < images.length) {
          card.imageUrl = images[card.imageIndex].imageUrl;
        }
        delete card.imageIndex;
      });
    }
    
    // Validate flashcard fields
    const validCardTypes = ['qa', 'cloze', 'reverse'];
    const invalidCards: Array<{ index: number; issues: string[] }> = [];
    
    flashcards.forEach((card: GeneratedFlashcard, index: number) => {
      const issues: string[] = [];
      
      if (!validCardTypes.includes(card.cardType)) {
        issues.push(`Invalid cardType "${card.cardType}" (must be: qa, cloze, or reverse)`);
        card.cardType = 'qa' as any;
      }
      
      if (card.imageUrl) {
        try {
          new URL(card.imageUrl);
        } catch {
          issues.push(`Invalid imageUrl format: "${card.imageUrl}"`);
        }
      }
      
      if (issues.length > 0) {
        invalidCards.push({ index, issues });
      }
    });
    
    if (invalidCards.length > 0) {
      console.warn(`⚠️  ${invalidCards.length} flashcard(s) had validation issues (auto-fixed where possible):`);
      invalidCards.slice(0, 3).forEach(({ index, issues }) => {
        console.warn(`  Card ${index + 1}: ${issues.join(', ')}`);
      });
    }
    
    if (images && images.length > 0) {
      const cardsWithoutImages = flashcards.filter((card: GeneratedFlashcard) => !card.imageUrl);
      if (cardsWithoutImages.length > 0) {
        console.error(`VALIDATION ERROR: ${cardsWithoutImages.length}/${flashcards.length} flashcards missing imageUrl despite ${images.length} images being available!`);
        console.error(`Sample cards without images:`, cardsWithoutImages.slice(0, 2));
      } else {
        console.log(`✓ All ${flashcards.length} flashcards have imageUrl values`);
      }
    }
    
    const sourceExcerpt = content.substring(0, 200) + (content.length > 200 ? '...' : '');
    
    flashcards.forEach((card: GeneratedFlashcard) => {
      card.sourceExcerpt = sourceExcerpt;
      
      const verification = verifyFlashcard(card, content);
      card.verificationScore = verification.score;
      card.needsReview = verification.needsReview;
      
      if (verification.needsReview) {
        console.warn(`⚠️  Card needs review (${verification.score}% verified): "${card.question.substring(0, 50)}..."`);
      }
    });
    
    return flashcards;
  } catch (error) {
    console.error("Error generating flashcards:", error);
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
    throw new Error(`Failed to generate flashcards: ${error}`);
  }
}

export function groupFlashcardsBySubtopic(flashcards: GeneratedFlashcard[]): SubdeckGroup[] {
  const groups = new Map<string, { displayName: string; cards: GeneratedFlashcard[] }>();
  
  for (const card of flashcards) {
    const subtopic = card.subtopic || "General";
    const key = subtopic.toLowerCase();
    
    if (!groups.has(key)) {
      groups.set(key, { displayName: subtopic, cards: [] });
    }
    groups.get(key)!.cards.push(card);
  }
  
  return Array.from(groups.entries())
    .sort(([keyA, groupA], [keyB, groupB]) => groupA.displayName.localeCompare(groupB.displayName))
    .map(([key, group]) => ({
      subtopic: group.displayName,
      flashcards: group.cards
    }));
}
