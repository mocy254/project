import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

// Retry wrapper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  initialDelayMs: number = 1000
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
}

interface TopicOutline {
  topics: Array<{
    title: string;
    startLine: number;
    endLine: number;
    subtopics?: string[];
  }>;
}

interface SemanticChunk {
  content: string;
  topics: string[];
  context: string;
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

async function extractTopicOutline(content: string): Promise<TopicOutline> {
  const estimatedTokens = estimateTokenCount(content);
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
    const lineTokens = estimateTokenCount(line);
    
    if (currentTokens + lineTokens > maxTokensPerPass && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = line + '\n';
      currentTokens = lineTokens;
    } else {
      currentChunk += line + '\n';
      currentTokens += lineTokens;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  const allTopics: Array<{ title: string; subtopics?: string[] }> = [];
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Analyzing section ${i + 1}/${chunks.length} for topics...`);
    const chunkOutline = await extractTopicsFromChunk(chunks[i]);
    allTopics.push(...chunkOutline.topics);
  }

  const uniqueTopics = new Map<string, { title: string; subtopics?: string[] }>();
  for (const topic of allTopics) {
    if (!uniqueTopics.has(topic.title)) {
      uniqueTopics.set(topic.title, topic);
    } else if (topic.subtopics && topic.subtopics.length > 0) {
      const existing = uniqueTopics.get(topic.title)!;
      if (!existing.subtopics) existing.subtopics = [];
      existing.subtopics.push(...topic.subtopics);
    }
  }

  return {
    topics: Array.from(uniqueTopics.values()).map((topic, index) => ({
      title: topic.title,
      startLine: 0,
      endLine: 0,
      subtopics: topic.subtopics
    }))
  };
}

async function extractTopicsFromChunk(content: string): Promise<TopicOutline> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        responseSchema: {
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
                required: ["title"]
              }
            }
          },
          required: ["topics"]
        }
      },
      contents: `Analyze this document section and extract ALL major topics and subtopics.

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
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("Empty response from topic extraction");
    }
    const outline = JSON.parse(rawText);
    return outline as TopicOutline;
  } catch (error) {
    console.error("Topic extraction failed, using fallback:", error);
    return { topics: [] };
  }
}

function chunkContentByTopics(content: string, outline: TopicOutline, maxTokens: number = 100000): SemanticChunk[] {
  const estimatedTokens = estimateTokenCount(content);
  
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
    console.log("No topics detected, using simple chunking...");
    let currentChunk = '';
    let currentTokens = 0;
    
    for (const line of lines) {
      const lineTokens = estimateTokenCount(line);
      
      if (currentTokens + lineTokens > maxTokens && currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          topics: ["Document section"],
          context: "Part of larger document"
        });
        currentChunk = line + '\n';
        currentTokens = lineTokens;
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
    const lineTokens = estimateTokenCount(line);
    
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
      currentChunk = '';
      currentTokens = 0;
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
      currentChunk = line + '\n';
      currentTokens = lineTokens;
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
        ? `Topics: ${currentTopics.join(', ')}`
        : "Final section"
    });
  }

  return chunks;
}

export async function generateFlashcards(
  options: FlashcardGenerationOptions
): Promise<GeneratedFlashcard[]> {
  const { content, cardTypes, granularity, customInstructions, onProgress } = options;

  console.log(`=== Starting flashcard generation ===`);
  console.log(`Content length: ${content.length} characters`);
  console.log(`Card types: ${JSON.stringify(cardTypes)}`);
  console.log(`Granularity: ${granularity}`);
  
  const estimatedTokens = estimateTokenCount(content);
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
    
    // Process chunks in parallel with concurrency limit
    const CONCURRENCY = 3;
    const chunkGroups: SemanticChunk[][] = [];
    
    for (let i = 0; i < semanticChunks.length; i += CONCURRENCY) {
      chunkGroups.push(semanticChunks.slice(i, i + CONCURRENCY));
    }
    
    let processedChunks = 0;
    
    for (const group of chunkGroups) {
      const promises = group.map(async (chunk, idx) => {
        const chunkIndex = processedChunks + idx;
        console.log(`Processing chunk ${chunkIndex + 1}/${semanticChunks.length} - ${chunk.context}`);
        
        try {
          const chunkFlashcards = await generateFlashcardsForChunk({
            content: chunk.content,
            cardTypes,
            granularity,
            customInstructions
          }, chunk.context);
          
          console.log(`Chunk ${chunkIndex + 1} generated ${chunkFlashcards.length} flashcards`);
          return chunkFlashcards;
        } catch (error) {
          console.error(`Error processing chunk ${chunkIndex + 1}:`, error);
          console.error(`Error details:`, error instanceof Error ? error.message : error);
          console.error(`Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
          // Return empty array on error, but don't fail entire generation
          return [];
        }
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
    
    console.log(`Generated ${allFlashcards.length} total flashcards from ${semanticChunks.length} chunks`);
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
  const { content, cardTypes, granularity, customInstructions } = options;

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
  
  // Granularity: 1-7 scale with importance-based filtering
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

**Critical:** At Level 1, if content has 50 facts, maybe only 3-5 have importance ≥9. Create ONLY those 3-5 cards. Do not generate more by lowering standards.`;

  console.log(`Calling Gemini API for chunk: ${chunkContext.substring(0, 50)}...`);
  
  try {
    const response = await withRetry(
      () => withTimeout(
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.25,
            responseSchema: {
              type: "object",
              properties: {
                flashcards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      answer: { type: "string" },
                      cardType: { type: "string" },
                    },
                    required: ["question", "answer", "cardType"],
                  },
                },
              },
              required: ["flashcards"],
            },
          },
          contents: `IMPORTANCE-BASED FLASHCARD GENERATION

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
- One atomic fact per card
- Ensure COMPLETE coverage of all qualifying facts in this section

Content to process:

${content}`,
        }),
        300000, // 5 minute timeout per chunk
        "Gemini API request timed out"
      ),
      3, // 3 retries
      1000 // 1 second initial delay
    );

    const rawJson = response.text;
    if (!rawJson) {
      console.error("Gemini returned empty response");
      throw new Error("Empty response from Gemini");
    }

    const data = JSON.parse(rawJson);
    const flashcards = data.flashcards || [];
    console.log(`Gemini API returned ${flashcards.length} flashcards for chunk: ${chunkContext.substring(0, 50)}...`);
    
    if (flashcards.length === 0) {
      console.warn(`Warning: Gemini returned 0 flashcards for chunk. This may indicate the content is too short or lacks extractable information.`);
    }
    
    return flashcards;
  } catch (error) {
    console.error("Error generating flashcards:", error);
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
    throw new Error(`Failed to generate flashcards: ${error}`);
  }
}
