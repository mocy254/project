import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { generateFlashcards, groupFlashcardsBySubtopic } from "./gemini";
import { extractContentFromFile, extractYouTubeTranscript } from "./contentExtractor";
import { insertDeckSchema, insertFlashcardSchema } from "@shared/schema";
import { z } from "zod";
import { progressManager } from "./progressManager";
import { ObjectStorageService } from "./objectStorage";
import { readFile, unlink } from "fs";
import { promisify } from "util";
// @ts-ignore - No type definitions available
import AnkiExportModule from 'anki-apkg-export';
const AnkiExport = (AnkiExportModule as any).default || AnkiExportModule;

const unlinkAsync = promisify(unlink);
const readFileAsync = promisify(readFile);

// Helper function to upload file to Object Storage
async function uploadFileToStorage(
  filePath: string,
  userId: string
): Promise<string> {
  try {
    const objectStorageService = new ObjectStorageService();
    
    // Get upload URL
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    
    // Read file into buffer before uploading (ensures file is fully read before cleanup)
    const fileBuffer = await readFileAsync(filePath);
    
    // Upload file buffer
    const response = await fetch(uploadURL, {
      method: 'PUT',
      body: fileBuffer,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file to storage: ${response.statusText}`);
    }

    // Set ACL policy and get path
    const aclResponse = await objectStorageService.trySetObjectEntityAclPolicy(
      uploadURL,
      {
        owner: userId,
        visibility: "private"
      }
    );

    // Validate ACL response before normalization
    if (!aclResponse || typeof aclResponse !== 'string') {
      throw new Error("ACL response missing canonical object path - normalization failed");
    }

    const trimmedResponse = aclResponse.trim();
    if (!trimmedResponse) {
      throw new Error("ACL response missing canonical object path - normalization failed");
    }

    // Normalize to canonical /objects/... format
    let objectPath: string;
    try {
      objectPath = objectStorageService.normalizeObjectEntityPath(trimmedResponse);
    } catch (normError) {
      throw new Error(`ACL response normalization failed: ${normError instanceof Error ? normError.message : 'unknown error'}`);
    }

    // Validate the normalized path
    if (!objectPath || typeof objectPath !== 'string' || !objectPath.startsWith("/objects/")) {
      throw new Error("ACL response missing canonical object path - normalization failed");
    }

    return objectPath;
  } finally {
    // Always clean up local file, even if upload fails
    try {
      await unlinkAsync(filePath);
    } catch (cleanupError) {
      console.error("Failed to clean up local file:", filePath, cleanupError);
    }
  }
}

const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage_config,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.post("/api/generate/text", async (req, res) => {
    try {
      const { content, cardTypes, granularity, customInstructions, userId, title, includeSource, createSubdecks } = req.body;

      if (!content || !cardTypes || !Array.isArray(cardTypes) || cardTypes.length === 0 || granularity === undefined || !userId || !title) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const sessionId = randomUUID();
      
      // Return session ID immediately
      res.json({ sessionId });

      // Process asynchronously in background
      (async () => {
        try {
          progressManager.setProgress({
            sessionId,
            stage: "analyzing",
            message: "Analyzing text content...",
            progress: 10
          });

          const shouldCreateSubdecks = createSubdecks === 'true';
          const flashcards = await generateFlashcards({
            content,
            cardTypes,
            granularity,
            customInstructions: customInstructions || "",
            createSubdecks: shouldCreateSubdecks,
            onProgress: (update) => {
              progressManager.setProgress({
                sessionId,
                stage: update.stage as any,
                message: update.message,
                progress: update.progress,
                currentStep: update.currentStep,
                totalSteps: update.totalSteps,
                cardsGenerated: update.cardsGenerated
              });
            }
          });

          // Validate that flashcards were generated
          if (!flashcards || flashcards.length === 0) {
            throw new Error("No flashcards were generated. The content may be too short or the AI service is experiencing issues. Please try again.");
          }

          progressManager.setProgress({
            sessionId,
            stage: "saving",
            message: "Saving flashcards...",
            progress: 90
          });

          let resultDeckId: string;
          let totalCardCount: number;

          if (shouldCreateSubdecks && flashcards.some(c => c.subtopic)) {
            // Create parent deck
            const parentDeck = await storage.createDeck({
              userId,
              title,
              source: content.substring(0, 100) + "...",
              sourceType: "text",
              cardTypes,
              granularity,
              customInstructions: customInstructions || null,
              includeSource: includeSource || 'false',
              createSubdecks: 'true'
            });

            // Group flashcards by subtopic
            const subdeckGroups = groupFlashcardsBySubtopic(flashcards);
            
            // Create subdeck for each subtopic
            let totalCards = 0;
            for (const group of subdeckGroups) {
              const subdeck = await storage.createDeck({
                userId,
                parentDeckId: parentDeck.id,
                title: group.subtopic,
                source: content.substring(0, 100) + "...",
                sourceType: "text",
                cardTypes,
                granularity,
                customInstructions: customInstructions || null,
                includeSource: includeSource || 'false',
                createSubdecks: 'false'
              });

              await Promise.all(
                group.flashcards.map((card, index) =>
                  storage.createFlashcard({
                    deckId: subdeck.id,
                    question: card.question,
                    answer: card.answer,
                    cardType: card.cardType,
                    position: index
                  })
                )
              );

              totalCards += group.flashcards.length;
            }

            resultDeckId = parentDeck.id;
            totalCardCount = totalCards;
          } else {
            // Create single deck
            const deck = await storage.createDeck({
              userId,
              title,
              source: content.substring(0, 100) + "...",
              sourceType: "text",
              cardTypes,
              granularity,
              customInstructions: customInstructions || null,
              includeSource: includeSource || 'false',
              createSubdecks: 'false'
            });

            const createdCards = await Promise.all(
              flashcards.map((card, index) =>
                storage.createFlashcard({
                  deckId: deck.id,
                  question: card.question,
                  answer: card.answer,
                  cardType: card.cardType,
                  position: index
                })
              )
            );

            resultDeckId = deck.id;
            totalCardCount = createdCards.length;
          }

          progressManager.setProgress({
            sessionId,
            stage: "complete",
            message: "Generation complete!",
            progress: 100
          });

          progressManager.setResult(sessionId, {
            deckId: resultDeckId,
            flashcardCount: totalCardCount
          });
        } catch (error: any) {
          console.error("Text generation error:", error);
          progressManager.setProgress({
            sessionId,
            stage: "error",
            message: error.message || "Generation failed",
            progress: 0,
            error: error.message
          });
          progressManager.setResult(sessionId, null);
        }
      })();
    } catch (error: any) {
      console.error("Text generation error:", error);
      res.status(500).json({ error: error.message || "Generation failed" });
    }
  });

  app.post("/api/generate/document", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { cardTypes, granularity, customInstructions, userId, title, includeSource, createSubdecks } = req.body;
      const sessionId = randomUUID();
      
      // Return session ID immediately
      res.json({ sessionId });

      // Process asynchronously in background
      (async () => {
        try {
          progressManager.setProgress({
            sessionId,
            stage: "extracting",
            message: "Extracting content from document...",
            progress: 5
          });

          const content = await extractContentFromFile(req.file!.path, req.file!.mimetype);

          progressManager.setProgress({
            sessionId,
            stage: "analyzing",
            message: "Analyzing document content...",
            progress: 15
          });

          const parsedCardTypes = JSON.parse(cardTypes);
          const shouldCreateSubdecks = createSubdecks === 'true';
          const flashcards = await generateFlashcards({
            content,
            cardTypes: parsedCardTypes,
            granularity: parseInt(granularity),
            customInstructions: customInstructions || "",
            createSubdecks: shouldCreateSubdecks,
            onProgress: (update) => {
              progressManager.setProgress({
                sessionId,
                stage: update.stage as any,
                message: update.message,
                progress: update.progress,
                currentStep: update.currentStep,
                totalSteps: update.totalSteps,
                cardsGenerated: update.cardsGenerated
              });
            }
          });

          // Validate that flashcards were generated
          if (!flashcards || flashcards.length === 0) {
            throw new Error("No flashcards were generated. The content may be too short or the AI service is experiencing issues. Please try again.");
          }

          progressManager.setProgress({
            sessionId,
            stage: "saving",
            message: "Saving flashcards...",
            progress: 90
          });

          let resultDeckId: string;
          let totalCardCount: number;

          // Upload file to Object Storage (cleanup handled in helper)
          let fileUrl: string | null = null;
          try {
            fileUrl = await uploadFileToStorage(req.file!.path, userId);
          } catch (uploadError) {
            console.error("Failed to upload file to storage:", uploadError);
            // Continue without fileUrl if upload fails
          }

          if (shouldCreateSubdecks && flashcards.some(c => c.subtopic)) {
            // Create parent deck
            const parentDeck = await storage.createDeck({
              userId,
              title,
              source: req.file!.originalname,
              sourceType: "document",
              cardTypes: parsedCardTypes,
              granularity: parseInt(granularity),
              customInstructions: customInstructions || null,
              includeSource: includeSource || 'false',
              createSubdecks: 'true',
              fileUrl
            });

            // Group flashcards by subtopic
            const subdeckGroups = groupFlashcardsBySubtopic(flashcards);
            
            // Create subdeck for each subtopic
            let totalCards = 0;
            for (const group of subdeckGroups) {
              const subdeck = await storage.createDeck({
                userId,
                parentDeckId: parentDeck.id,
                title: group.subtopic,
                source: req.file!.originalname,
                sourceType: "document",
                cardTypes: parsedCardTypes,
                granularity: parseInt(granularity),
                customInstructions: customInstructions || null,
                includeSource: includeSource || 'false',
                createSubdecks: 'false'
              });

              await Promise.all(
                group.flashcards.map((card, index) =>
                  storage.createFlashcard({
                    deckId: subdeck.id,
                    question: card.question,
                    answer: card.answer,
                    cardType: card.cardType,
                    position: index
                  })
                )
              );

              totalCards += group.flashcards.length;
            }

            resultDeckId = parentDeck.id;
            totalCardCount = totalCards;
          } else {
            // Create single deck
            const deck = await storage.createDeck({
              userId,
              title,
              source: req.file!.originalname,
              sourceType: "document",
              cardTypes: parsedCardTypes,
              granularity: parseInt(granularity),
              customInstructions: customInstructions || null,
              includeSource: includeSource || 'false',
              createSubdecks: 'false',
              fileUrl
            });

            const createdCards = await Promise.all(
              flashcards.map((card, index) =>
                storage.createFlashcard({
                  deckId: deck.id,
                  question: card.question,
                  answer: card.answer,
                  cardType: card.cardType,
                  position: index
                })
              )
            );

            resultDeckId = deck.id;
            totalCardCount = createdCards.length;
          }

          progressManager.setProgress({
            sessionId,
            stage: "complete",
            message: "Generation complete!",
            progress: 100
          });

          progressManager.setResult(sessionId, {
            deckId: resultDeckId,
            flashcardCount: totalCardCount
          });
        } catch (error: any) {
          console.error("Document generation error:", error);
          progressManager.setProgress({
            sessionId,
            stage: "error",
            message: error.message || "Generation failed",
            progress: 0,
            error: error.message
          });
          progressManager.setResult(sessionId, null);
        }
      })();
    } catch (error: any) {
      console.error("Document generation error:", error);
      res.status(500).json({ error: error.message || "Generation failed" });
    }
  });

  app.post("/api/generate/youtube", async (req, res) => {
    try {
      const { url, cardTypes, granularity, customInstructions, userId, title, includeSource, createSubdecks } = req.body;

      if (!url || !cardTypes || !Array.isArray(cardTypes) || cardTypes.length === 0 || granularity === undefined || !userId || !title) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const sessionId = randomUUID();
      
      // Return session ID immediately
      res.json({ sessionId });

      // Process asynchronously in background
      (async () => {
        try {
          progressManager.setProgress({
            sessionId,
            stage: "extracting",
            message: "Extracting transcript from YouTube video...",
            progress: 5
          });

          const shouldIncludeTimestamps = includeSource === 'true';
          const content = await extractYouTubeTranscript(url, shouldIncludeTimestamps);

          progressManager.setProgress({
            sessionId,
            stage: "analyzing",
            message: "Analyzing video transcript...",
            progress: 15
          });

          const shouldCreateSubdecks = createSubdecks === 'true';
          const flashcards = await generateFlashcards({
            content,
            cardTypes,
            granularity,
            customInstructions: customInstructions || "",
            createSubdecks: shouldCreateSubdecks,
            onProgress: (update) => {
              progressManager.setProgress({
                sessionId,
                stage: update.stage as any,
                message: update.message,
                progress: update.progress,
                currentStep: update.currentStep,
                totalSteps: update.totalSteps,
                cardsGenerated: update.cardsGenerated
              });
            }
          });

          // Validate that flashcards were generated
          if (!flashcards || flashcards.length === 0) {
            throw new Error("No flashcards were generated. The content may be too short or the AI service is experiencing issues. Please try again.");
          }

          progressManager.setProgress({
            sessionId,
            stage: "saving",
            message: "Saving flashcards...",
            progress: 90
          });

          let resultDeckId: string;
          let totalCardCount: number;

          if (shouldCreateSubdecks && flashcards.some(c => c.subtopic)) {
            // Create parent deck
            const parentDeck = await storage.createDeck({
              userId,
              title,
              source: url,
              sourceType: "youtube",
              cardTypes,
              granularity,
              customInstructions: customInstructions || null,
              includeSource: includeSource || 'false',
              createSubdecks: 'true'
            });

            // Group flashcards by subtopic
            const subdeckGroups = groupFlashcardsBySubtopic(flashcards);
            
            // Create subdeck for each subtopic
            let totalCards = 0;
            for (const group of subdeckGroups) {
              const subdeck = await storage.createDeck({
                userId,
                parentDeckId: parentDeck.id,
                title: group.subtopic,
                source: url,
                sourceType: "youtube",
                cardTypes,
                granularity,
                customInstructions: customInstructions || null,
                includeSource: includeSource || 'false',
                createSubdecks: 'false'
              });

              await Promise.all(
                group.flashcards.map((card, index) =>
                  storage.createFlashcard({
                    deckId: subdeck.id,
                    question: card.question,
                    answer: card.answer,
                    cardType: card.cardType,
                    position: index
                  })
                )
              );

              totalCards += group.flashcards.length;
            }

            resultDeckId = parentDeck.id;
            totalCardCount = totalCards;
          } else {
            // Create single deck
            const deck = await storage.createDeck({
              userId,
              title,
              source: url,
              sourceType: "youtube",
              cardTypes,
              granularity,
              customInstructions: customInstructions || null,
              includeSource: includeSource || 'false',
              createSubdecks: 'false'
            });

            const createdCards = await Promise.all(
              flashcards.map((card, index) =>
                storage.createFlashcard({
                  deckId: deck.id,
                  question: card.question,
                  answer: card.answer,
                  cardType: card.cardType,
                  position: index
                })
              )
            );

            resultDeckId = deck.id;
            totalCardCount = createdCards.length;
          }

          progressManager.setProgress({
            sessionId,
            stage: "complete",
            message: "Generation complete!",
            progress: 100
          });

          progressManager.setResult(sessionId, {
            deckId: resultDeckId,
            flashcardCount: totalCardCount
          });
        } catch (error: any) {
          console.error("YouTube generation error:", error);
          progressManager.setProgress({
            sessionId,
            stage: "error",
            message: error.message || "Generation failed",
            progress: 0,
            error: error.message
          });
          progressManager.setResult(sessionId, null);
        }
      })();
    } catch (error: any) {
      console.error("YouTube generation error:", error);
      res.status(500).json({ error: error.message || "Generation failed" });
    }
  });

  app.get("/api/generation/progress/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const progress = progressManager.getProgress(sessionId);
      
      if (!progress) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/generation/result/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const result = progressManager.getResult(sessionId);
      
      if (result === undefined) {
        return res.status(404).json({ error: "Session not found or expired" });
      }
      
      if (result === null) {
        return res.status(500).json({ error: "Generation failed" });
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/decks/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const decks = await storage.getDecksByUserId(userId);
      res.json(decks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/decks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deck = await storage.getDeck(id);
      if (!deck) {
        return res.status(404).json({ error: "Deck not found" });
      }
      res.json(deck);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/decks/:id/cards", async (req, res) => {
    try {
      const { id } = req.params;
      const cards = await storage.getFlashcardsByDeckId(id);
      res.json(cards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/cards/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { question, answer } = req.body;

      const updated = await storage.updateFlashcard(id, {
        question,
        answer
      });

      if (!updated) {
        return res.status(404).json({ error: "Card not found" });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/cards/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFlashcard(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/decks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDeck(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/decks/:id/export/:format", async (req, res) => {
    try {
      const { id, format } = req.params;
      const deck = await storage.getDeck(id);
      const cards = await storage.getFlashcardsByDeckId(id);

      if (!deck) {
        return res.status(404).json({ error: "Deck not found" });
      }

      switch (format) {
        case "json":
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Content-Disposition", `attachment; filename="${deck.title}.json"`);
          res.json({ deck, flashcards: cards });
          break;

        case "csv":
          const csvRows = ["Question,Answer,Type"];
          cards.forEach(card => {
            const row = [
              `"${card.question.replace(/"/g, '""')}"`,
              `"${card.answer.replace(/"/g, '""')}"`,
              card.cardType
            ];
            csvRows.push(row.join(","));
          });
          res.setHeader("Content-Type", "text/csv");
          res.setHeader("Content-Disposition", `attachment; filename="${deck.title}.csv"`);
          res.send(csvRows.join("\n"));
          break;

        case "anki":
          const apkg = new AnkiExport(deck.title);
          
          // Add all flashcards to the package
          cards.forEach(card => {
            // Format the question and answer based on card type
            let question = card.question;
            let answer = card.answer;
            
            // For cloze deletion cards, format them properly for Anki
            if (card.cardType === "cloze") {
              // Replace [blank] with {{c1::answer}} format for Anki
              const clozeParts = question.split("[blank]");
              if (clozeParts.length > 1) {
                question = clozeParts[0] + `{{c1::${answer}}}` + clozeParts.slice(1).join("[blank]");
                answer = ""; // Cloze cards don't need separate answer
              }
            }
            
            apkg.addCard(question, answer);
          });
          
          // Generate the .apkg file
          const zipData = await apkg.save();
          
          // Set proper headers for Anki package download
          res.setHeader("Content-Type", "application/octet-stream");
          res.setHeader("Content-Disposition", `attachment; filename="${deck.title}.apkg"`);
          res.send(Buffer.from(zipData, 'binary'));
          break;

        default:
          res.status(400).json({ error: "Invalid export format" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Create new user
      const user = await storage.createUser({
        email,
        password, // In production, hash this password!
        name: name || null
      });

      res.json({ 
        userId: user.id, 
        name: user.name || email.split("@")[0] 
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({ 
        userId: user.id, 
        name: user.name || email.split("@")[0] 
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
