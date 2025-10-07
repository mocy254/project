import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { generateFlashcards } from "./gemini";
import { extractContentFromFile, extractYouTubeTranscript } from "./contentExtractor";
import { insertDeckSchema, insertFlashcardSchema } from "@shared/schema";
import { z } from "zod";
import { progressManager } from "./progressManager";

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
      const { content, cardTypes, granularity, customInstructions, userId, title } = req.body;

      if (!content || !cardTypes || !Array.isArray(cardTypes) || cardTypes.length === 0 || granularity === undefined || !userId || !title) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const flashcards = await generateFlashcards({
        content,
        cardTypes,
        granularity,
        customInstructions: customInstructions || ""
      });

      const deck = await storage.createDeck({
        userId,
        title,
        source: content.substring(0, 100) + "...",
        sourceType: "text",
        cardTypes,
        granularity,
        customInstructions: customInstructions || null
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

      res.json({
        deckId: deck.id,
        flashcardCount: createdCards.length
      });
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

      const { cardTypes, granularity, customInstructions, userId, title } = req.body;

      const content = await extractContentFromFile(req.file.path, req.file.mimetype);

      const parsedCardTypes = JSON.parse(cardTypes);
      const flashcards = await generateFlashcards({
        content,
        cardTypes: parsedCardTypes,
        granularity: parseInt(granularity),
        customInstructions: customInstructions || ""
      });

      const deck = await storage.createDeck({
        userId,
        title,
        source: req.file.originalname,
        sourceType: "document",
        cardTypes: parsedCardTypes,
        granularity: parseInt(granularity),
        customInstructions: customInstructions || null
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

      res.json({
        deckId: deck.id,
        flashcardCount: createdCards.length
      });
    } catch (error: any) {
      console.error("Document generation error:", error);
      res.status(500).json({ error: error.message || "Generation failed" });
    }
  });

  app.post("/api/generate/youtube", async (req, res) => {
    try {
      const { url, cardTypes, granularity, customInstructions, userId, title } = req.body;

      if (!url || !cardTypes || !Array.isArray(cardTypes) || cardTypes.length === 0 || granularity === undefined || !userId || !title) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const content = await extractYouTubeTranscript(url);

      const flashcards = await generateFlashcards({
        content,
        cardTypes,
        granularity,
        customInstructions: customInstructions || ""
      });

      const deck = await storage.createDeck({
        userId,
        title,
        source: url,
        sourceType: "youtube",
        cardTypes,
        granularity,
        customInstructions: customInstructions || null
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

      res.json({
        deckId: deck.id,
        flashcardCount: createdCards.length
      });
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
          const ankiRows = cards.map(card =>
            `${card.question}\t${card.answer}`
          );
          res.setHeader("Content-Type", "text/plain");
          res.setHeader("Content-Disposition", `attachment; filename="${deck.title}.txt"`);
          res.send(ankiRows.join("\n"));
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
