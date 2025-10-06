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
    granularity === 1 ? "Level 1 – Core Principles Only: Include only the most essential, high-yield facts and definitions. Skip details, numbers, or examples unless critical for understanding the concept. Focus on 'what' and 'why,' not 'how' or 'when.' Output concise, exam-relevant flashcards." :
    granularity === 2 ? "Level 2 – Key Concepts: Focus on key mechanisms, main ideas, and high-yield relationships. Exclude most examples and exceptions. Keep cards short — one concept per card, ideal for quick recall." :
    granularity === 3 ? "Level 3 – Moderate Detail: Cover all main concepts plus one or two clarifying details where needed. Exclude rare exceptions or long lists. Emphasize definitions, functions, and clinical relevance." :
    granularity === 4 ? "Level 4 – Balanced Summary: Provide a balanced set of cards capturing essential facts and moderate supporting detail. Include relevant examples or numbers that aid understanding but skip excessive minutiae. Ideal for Step 1–style study with efficient retention." :
    granularity === 5 ? "Level 5 – Detailed Understanding: Include essential facts plus secondary mechanisms, exceptions, and related associations. Capture most details found in the text, while maintaining concise flashcards. Avoid repetition — merge related facts into single well-phrased cards." :
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
Extract every distinct fact, concept, or process that a student should remember (according to the coverage level).
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

2. **Coverage:** ${coverageGuidance}

3. **Conciseness:** Answers must be ULTRA-CONCISE:
   - Single fact: use 2-5 words or brief phrase (NOT a sentence)
   - Multiple facts: use bullet points (• item) with no periods
   - NO paragraphs or complete sentences
   - Only essential keywords and values

4. **Atomic Cards:** One fact per card. Each card must stand alone without requiring outside context.

5. **No Hallucination:** Extract information ONLY from the provided content. Never add external knowledge, elaboration, or examples not present in the source.

6. **No Redundancy:** If the same topic appears multiple times, merge or reword to avoid duplication. Do not create near-identical cards.

7. **Precision:** Include specific numbers, mechanisms, terms, or exceptions when present in the source material.

8. **Completeness:** Do not skip figures, tables, lists, or any factual content (turn them into cards if they contain facts to remember).

**Output:** Generate as many flashcards as needed to cover the content according to the specified coverage level. There is NO limit on the number of flashcards.`;

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
      contents: `Read the ENTIRE content below carefully and create flashcards according to the coverage level. Do not skip any part:\n\n${content}`,
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
