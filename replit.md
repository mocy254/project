# FlashGenius - AI-Powered Flashcard Generator

## Overview

FlashGenius is an educational productivity application designed to convert various content formats (text, documents, YouTube videos) into AI-generated flashcards for studying. It aims to provide trusted, hallucination-free flashcards with support for multiple card types (Q&A, cloze deletion, reverse cards) and adjustable content coverage, offering precise control over flashcard generation. The project's ambition is to address medical student pain points like forgetting and exam stress by promoting active recall and spaced repetition, making studying more efficient and effective.

## Recent Changes

**October 15, 2025 - Migration to OpenAI GPT-5 Mini:**

*AI Service Provider Change:*
1. Migrated from Gemini 2.5 Flash to OpenAI GPT-5 mini:
   - Replaced `@google/genai` SDK with OpenAI SDK
   - Updated `server/gemini.ts` to `server/openai.ts` with GPT-5 mini model
   - Implemented OpenAI's structured outputs using `json_schema` with `strict: true` for 100% schema adherence
2. Image handling updated for OpenAI compatibility:
   - Images now converted to base64 before sending to API (downloads from Supabase, encodes in-memory)
   - OpenAI receives images directly in message content instead of URLs
3. Simplified tier configuration:
   - Removed Gemini-specific "thinking mode" feature (not available in GPT-5 mini)
   - Kept tier-based concurrency, retry, and timeout settings for performance optimization
   - Updated environment variable from `GEMINI_TIER` to `GPT_TIER`
4. All chunking, verification, and token counting logic preserved unchanged

**October 13, 2025 - PDF Page Number Tracking:**

*Include Source Feature for Documents:*
1. Enhanced PDF extraction with page number tracking:
   - Added `includePageNumbers` parameter to `extractPDFText()` function
   - Uses pdf-parse `pagerender` callback to track page numbers during extraction
   - Inserts `[Page N]` markers at the start of each page's text (matching YouTube timestamp format)
2. Updated document upload flow:
   - `extractContentFromFile()` now accepts `includePageNumbers` parameter
   - Document upload route passes `includeSource === 'true'` to enable page tracking
   - Page markers are preserved in chunks and passed to AI for natural citation
3. Implementation verified by architect review - ready for user testing

**October 12, 2025 - Verification & Citation Layer:**

*Hallucination Detection System:*
1. Added verification fields to flashcards database schema:
   - `sourceReference` (jsonb): Stores 200-char source excerpt from content
   - `verificationScore` (integer): % of key terms verified in source (0-100)
   - `needsReview` (boolean): Flags cards with <70% verification score
2. Implemented fact verification function in Gemini generation:
   - Extracts medical terms (≥4 chars, excluding common words) from answers
   - Calculates verification score via substring matching against source chunks
   - 70% threshold for medical content - cards below threshold flagged for review
3. UI components for transparency:
   - Verification badges: "Verified ✓" (green) or "Needs Review ⚠️" (red)
   - Expandable source reference sections showing 200-char source excerpts
   - Smart click handling prevents card flip when interacting with source
4. Fixed critical bug: Changed `||` to `??` for verificationScore persistence
   - Zero scores now properly stored (was being coerced to null)
   - All 6 createFlashcard calls use nullish coalescing

**October 11, 2025 - Gemini API Bug Fixes & Optimizations:**

*Bug Fixes:*
1. Fixed hardcoded retry values that ignored tier configuration (lines 854-855)
   - Now correctly uses `config.retryAttempts` (Tier 1: 2, Tier 2+: 3)
   - Now correctly uses `config.retryDelay` (Tier 1: 2000ms, Tier 2+: 1000ms)
2. Improved expected card count estimation for better truncation detection (lines 884-888)
   - Granularity 6-7: ~1 card per 2000 tokens (was 4000)
   - Granularity 4-5: ~1 card per 4000 tokens (unchanged)
   - Granularity 1-3: ~1 card per 10000 tokens (unchanged)
3. Fixed overlap text boundary issue in chunking (line 150)
   - Now ensures minimum 3 lines for context continuity even if exceeding 200-token target
   - Prevents inadequate overlap when encountering very long lines (tables, code blocks)

*Performance Optimizations:*
4. Enhanced subdeck deduplication with section index tracking (lines 207-230)
   - Topics now tagged with sectionIndex to prevent merging distinct sections with identical names
   - Preserves separate "Introduction" sections while still deduplicating within sections
5. Optimized Tier 2+ timeout for thinking mode (lines 777-780)
   - Small chunks (<30k tokens) now use medium timeout (120s) when thinking mode is enabled
   - Accounts for thinking mode processing overhead on Tier 2+
6. Implemented exponential backoff for chunk retries (lines 553-556)
   - Changed from fixed to exponential delay: `config.retryDelay * Math.pow(2, attempt)`
   - Tier 1: 2s, 4s, 8s retries | Tier 2+: 1s, 2s, 4s retries
   - Better rate limit handling and API-friendly retry behavior

## User Preferences

Preferred communication style: Simple, everyday language.

Flashcard answer format: Ultra-concise (bullet points or few words, NOT complete sentences or paragraphs)

## System Architecture

### Frontend

The frontend uses React 18 with TypeScript, Vite, Wouter for routing, TanStack Query for server state management, and Shadcn UI with Tailwind CSS for styling. The design system is medical student-focused, featuring a calming color palette (Medical blue, Soft teal, warm neutrals), Inter and Poppins typography, and smooth Framer Motion animations. Authentication is handled via Supabase Auth with email/password login, using a custom `useAuth` hook for session management. The Supabase client is configured in `client/src/lib/supabase.ts` and automatically includes Bearer tokens in API requests via the queryClient. Routing includes public and protected routes, with a `ProtectedRoute` component for authentication enforcement. The landing page emphasizes active recall and spaced repetition, targeting medical students with a friendly, professional tone and responsive design.

### Backend

The backend is built with Express.js and Node.js (ESM modules) in TypeScript. It provides RESTful APIs for operations like file uploads (up to 100MB), flashcard generation, and progress tracking. **All flashcard generation endpoints are protected by Supabase Auth middleware (`isAuthenticated`), ensuring only authenticated users can generate flashcards and user IDs are securely extracted from the session.** File uploads are handled with Multer and validated for various document types. Content processing involves text extraction from PDFs, DOCX, TXT, and PPT using `pdf-parse` and `mammoth`, and YouTube transcript extraction via `youtubei.js` with intelligent Whisper AI fallback for videos without captions. Token counting for AI is precisely managed using Tiktoken. A key feature is intelligent, topic-aware chunking for large documents, ensuring semantic continuity and context for AI generation, including 200-token overlaps between chunks. Generated flashcards and associated metadata are stored in a PostgreSQL database.

### Database Schema

The system uses a PostgreSQL database (Neon serverless with Drizzle ORM) with tables for `users`, `decks`, and `flashcards`.
- `users`: Stores user account information synced from Supabase Auth (id, email, firstName, lastName, profileImageUrl). User IDs match Supabase auth.users UUIDs for seamless integration. Records are automatically created during signup and login.
- `decks`: Stores flashcard deck containers, supporting hierarchical structures via `parentDeckId`. It also includes `fileUrl` for cloud storage paths of uploaded documents.
- `flashcards`: Stores individual flashcards, linked to decks, including question, answer, card type, and `imageUrl` for associated images.

Relationships include one user to many decks, and one deck to many flashcards, with cascade delete configured for data integrity.

### System Design Choices

- **UI/UX:** Medical student-focused aesthetic with a calming color palette and professional typography. Smooth animations for enhanced user experience.
- **Content Processing:** Robust pipeline for text and multimedia extraction. Intelligent topic-aware chunking for large documents ensures contextual integrity for AI. Accurate token counting is critical for AI context management.
- **Flashcard Generation:** AI-powered generation with customizable parameters including multiple card types, granularity levels (1-7 scale based on importance-based filtering), and custom instructions. Includes an option for automatically associating relevant images from PDFs or YouTube videos and an "Include Source" option for YouTube timestamps.
- **Subdeck Organization:** AI can automatically detect subtopics and create hierarchical subdecks for better organization, displayed in a file-tree style within the UI.
- **Data Storage:** Uses a production-ready PostgreSQL database with Drizzle ORM for persistent storage of user data, decks, and flashcards. Uploaded documents and extracted images are stored in **Supabase Storage** with public bucket access for images and user-organized folder structure (userId/uploads/*, userId/images/*). The system validates bucket configuration on startup and provides clear error messages if misconfigured.
- **API Design:** RESTful endpoints with HTTP polling for asynchronous generation progress tracking.

## OpenAI GPT Tier Configuration

The system supports tiered performance optimization via the `GPT_TIER` environment variable:

**Tier 1 (Default - Conservative for Rate Limits):**
- Max Concurrency: 5 parallel chunks
- Retry Attempts: 2 with 2-second delays
- Timeouts: 2min (small), 3.5min (medium), 5min (large chunks)
- Best for: Free tier or low rate limit accounts

**Tier 2+ (Optimized for Higher Rate Limits):**
- Max Concurrency: 20 parallel chunks (adaptive: 20/12/8 based on doc size)
- Retry Attempts: 3 with 1-second delays
- Timeouts: 1min (small), 2min (medium), 3min (large chunks)
- Best for: Paid tier with higher rate limits

**Key Features:**
- **Structured Outputs**: OpenAI's `json_schema` with `strict: true` provides 100% schema adherence (no validation errors)
- **Dynamic Concurrency**: Automatically adjusts based on document size to maximize speed while respecting API limits
- **Base64 Image Support**: Images converted to base64 for seamless multimodal processing
- **Token Estimation**: Uses 3.5 chars/token fallback for technical content when Tiktoken unavailable

**Performance Impact (Tier 2+ vs Tier 1):**
- Large documents (40+ chunks): 3-5x faster generation
- More reliable structured outputs with GPT-5 mini
- Faster failure recovery (reduced retry delays)

## External Dependencies

- **Authentication:** Supabase Auth (`@supabase/supabase-js`) for email/password authentication. Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables for frontend, and `SUPABASE_URL` and `SUPABASE_ANON_KEY` for backend. User sessions use Bearer token authentication.
- **AI Service:** `openai` SDK (GPT-5 mini) for advanced AI capabilities, requiring an `OPENAI_API_KEY`. Supports customized generation parameters like card types, granularity, custom instructions, image inclusion (using base64-encoded images from `pdf-to-img`, `youtubei.js`, `ffmpeg`), and source inclusion for YouTube videos. Set `GPT_TIER=2` environment variable to enable optimized settings for higher rate limit tiers.
- **Database:** Neon PostgreSQL serverless database via `@neondatabase/serverless` and Drizzle ORM.
- **File Processing Libraries:**
    - `pdf-parse`: For PDF text extraction.
    - `mammoth`: For DOCX/DOC text extraction.
    - `youtubei.js`: For YouTube video transcript extraction.
    - OpenAI Whisper API: As a fallback for AI transcription of videos without captions.
    - `yt-dlp`: For audio extraction for Whisper transcription.
    - `multer`: For multipart file upload handling.
- **Cloud Storage:** Supabase Storage for uploaded documents and extracted images. Files are organized by user ID in a hierarchical structure. Requires a public bucket named `flashgenius-uploads` to be created in the Supabase dashboard with appropriate RLS policies for authenticated upload and public read access.
- **Export Functionality:** Supports JSON, CSV, and Anki (.apkg) formats. CSV and Anki exports handle subdeck hierarchy information.