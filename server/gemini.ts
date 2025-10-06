import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface FlashcardGenerationOptions {
  content: string;
  cardTypes: string[];
  granularity: number;
  customInstructions: string;
}

export interface GeneratedFlashcard {
  question: string;
  answer: string;
  cardType: "qa" | "cloze" | "reverse";
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function chunkContent(content: string, maxTokens: number = 800000): string[] {
  const estimatedTokens = estimateTokenCount(content);
  
  if (estimatedTokens <= maxTokens) {
    return [content];
  }

  const chunks: string[] = [];
  const lines = content.split('\n');
  let currentChunk = '';
  let currentTokens = 0;
  
  for (const line of lines) {
    const lineTokens = estimateTokenCount(line);
    
    if (currentTokens + lineTokens > maxTokens && currentChunk) {
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
  
  return chunks;
}

export async function generateFlashcards(
  options: FlashcardGenerationOptions
): Promise<GeneratedFlashcard[]> {
  const { content, cardTypes, granularity, customInstructions } = options;

  const chunks = chunkContent(content);
  
  if (chunks.length > 1) {
    console.log(`Processing large document in ${chunks.length} chunks...`);
    const allFlashcards: GeneratedFlashcard[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
      const chunkFlashcards = await generateFlashcardsForChunk({
        content: chunks[i],
        cardTypes,
        granularity,
        customInstructions
      });
      allFlashcards.push(...chunkFlashcards);
    }
    
    return allFlashcards;
  }
  
  return generateFlashcardsForChunk(options);
}

async function generateFlashcardsForChunk(
  options: FlashcardGenerationOptions
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

  try {
    const response = await ai.models.generateContent({
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

STEP 1 - ANALYZE (mentally categorize all facts by importance 1-10):
Read the entire content below and identify:
- Core definitions/classifications (importance 9-10)
- Main mechanisms/causes (importance 8)
- Key clinical features/symptoms (importance 7)
- Supporting details/treatments (importance 6)
- Secondary info/exceptions (importance 5)
- Additional details (importance 4)
- Minor details/examples (importance 1-3)

STEP 2 - FILTER by current level (${currentLevel.threshold}):
- Include ONLY facts with importance ≥ ${currentLevel.threshold.split('-')[0]}
- Lower importance facts are EXCLUDED entirely
- This naturally produces fewer cards at lower levels

STEP 3 - GENERATE flashcards:
- Create ultra-concise cards (2-5 words or bullets)
- One atomic fact per card

Content to process:

${content}`,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    const data = JSON.parse(rawJson);
    return data.flashcards || [];
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw new Error(`Failed to generate flashcards: ${error}`);
  }
}
