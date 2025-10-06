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

export async function generateFlashcards(
  options: FlashcardGenerationOptions
): Promise<GeneratedFlashcard[]> {
  const { content, cardTypes, granularity, customInstructions } = options;

  // Granularity: 1-7 scale representing content coverage
  const coverageGuidance = 
    granularity === 1 ? "Level 1 – Absolute Essentials Only: Generate MINIMAL cards (3-5 per major topic). Only include the single most important definition or principle per concept. Skip ALL details, mechanisms, examples, numbers, and subtopics. Ask: 'What is the ONE thing a student must remember?' Create only that card. Be extremely selective." :
    granularity === 2 ? "Level 2 – Core Concepts Only: Generate LIMITED cards (5-10 per major topic). Include only critical definitions and the most important relationship or mechanism. Skip examples, exceptions, numbers, and secondary details. Focus on foundational knowledge only." :
    granularity === 3 ? "Level 3 – Key Ideas: Generate MODERATE cards (10-15 per major topic). Cover main concepts and primary mechanisms. Include 1-2 supporting details per concept only if essential. Skip most examples, rare cases, and extensive lists." :
    granularity === 4 ? "Level 4 – Balanced Coverage: Generate a balanced set of cards. Include essential facts plus moderate supporting detail. Add relevant examples or key numbers that aid understanding but skip excessive minutiae. Ideal for comprehensive yet efficient study." :
    granularity === 5 ? "Level 5 – Detailed Understanding: Generate thorough cards. Include essential facts plus secondary mechanisms, important exceptions, and related associations. Capture most details found in the text while maintaining clarity. Merge related facts to avoid redundancy." :
    granularity === 6 ? "Level 6 – Near-Comprehensive: Include almost every concept, fact, and number in the text. Each fact should appear in at least one flashcard. Use multiple cards per concept if necessary to maintain clarity and conciseness." :
    "Level 7 – Every Detail: Convert every relevant sentence, fact, number, and concept into flashcards. No detail should be skipped unless it is purely stylistic or non-educational. Use multiple cards per concept if needed. Ensure cards remain readable and logically grouped by theme.";

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

  const systemPrompt = `You are a medical education AI that generates concise, complete flashcards from study materials.

**TASK:**
Read the entire input carefully. Do NOT skip any part.
Extract ONLY the facts required by the coverage level (lower levels = fewer cards, higher levels = more cards).
Convert each fact into a flashcard with:
- Front: a focused, standalone question or prompt
- Back: CONCISE answer using minimal words:
  • Single fact: 2-5 words or brief phrase
  • Multiple facts: bullet points (• item)
  • NO complete sentences or paragraphs
  • Include essential numbers/terms only

Keep cards atomic — one idea per card.
Avoid redundancy or overlapping questions.
Use concise professional wording.
IMPORTANT: Lower coverage levels should produce significantly FEWER cards than higher levels.

---
**USER SETTINGS:**
Card Types: ${cardTypes.join(", ")}
${reverseEnabled ? 'Reverse Mode: ENABLED — Generate bidirectional cards where appropriate' : ''}
Coverage Level: ${coverageGuidance}${customInstructionsText}
---

**CARD STRUCTURE:**
${cardTypeList}

**RULES:**
1. **Read Entire Input:** Process the ENTIRE content. Do not stop early or skip sections.

2. **Coverage & Card Limits:** ${coverageGuidance}
   - Strictly adhere to the coverage level
   - Levels 1-3 should generate dramatically FEWER cards than levels 5-7
   - Be highly selective at lower levels — only include truly essential information

3. **Conciseness:** Answers must be ULTRA-CONCISE:
   - Single fact: use 2-5 words or brief phrases (without distorting the meaning)
   - Multiple facts: use bullet points (• item) with no periods
   - NO paragraphs or complete sentences
   - Only essential keywords and values

4. **Atomic Cards:** One fact per card. Each card must stand alone without requiring outside context.

5. **No Hallucination:** Extract information ONLY from the provided content. Never add external knowledge, elaboration, or examples not present in the source.

6. **No Redundancy:** If the same topic appears multiple times, merge or reword to avoid duplication. Do not create near-identical cards.

7. **Precision:** Include specific numbers, mechanisms, terms, or exceptions ONLY when they match the coverage level requirement.

8. **Selectivity Based on Level:**
   - Levels 1-2: Skip most details, examples, numbers, mechanisms — extract absolute minimum
   - Levels 3-4: Include main concepts with moderate detail
   - Levels 5-7: Capture progressively more comprehensive detail

**Output:** Generate flashcards strictly matching the coverage level. Lower levels = fewer cards, higher levels = more cards.`;

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
      contents: `Read the ENTIRE content below carefully and create flashcards according to the coverage level.

CRITICAL: The coverage level determines HOW MANY cards to generate:
- Level 1: Generate MINIMAL cards (only absolute essentials)
- Levels 2-3: Generate LIMITED cards (core concepts only)
- Levels 4-5: Generate MODERATE to THOROUGH cards
- Levels 6-7: Generate COMPREHENSIVE cards (all details)

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
