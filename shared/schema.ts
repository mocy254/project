import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, json, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - compatible with Supabase Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const decks = pgTable("decks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentDeckId: varchar("parent_deck_id").references((): any => decks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  source: text("source").notNull(),
  sourceType: text("source_type").notNull(),
  cardTypes: text("card_types").array().notNull(),
  granularity: integer("granularity").notNull(),
  customInstructions: text("custom_instructions"),
  includeSource: text("include_source").notNull().default('false'),
  createSubdecks: text("create_subdecks").notNull().default('false'),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const flashcards = pgTable("flashcards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deckId: varchar("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  cardType: text("card_type").notNull(),
  position: integer("position").notNull(),
  imageUrl: text("image_url"),
  isLearned: boolean("is_learned").notNull().default(false),
  learnedAt: timestamp("learned_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
});

export const insertDeckSchema = createInsertSchema(decks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  cardTypes: z.array(z.string()).min(1),
});

export const insertFlashcardSchema = createInsertSchema(flashcards).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDeck = z.infer<typeof insertDeckSchema>;
export type Deck = typeof decks.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcards.$inferSelect;
