# FlashGenius - AI-Powered Flashcard Generator

## Overview

FlashGenius is an educational productivity application designed to convert various content formats (text, documents, YouTube videos) into AI-generated flashcards for studying. It aims to provide trusted, hallucination-free flashcards with support for multiple card types (Q&A, cloze deletion, reverse cards) and adjustable content coverage, offering precise control over flashcard generation. The project's ambition is to address medical student pain points like forgetting and exam stress by promoting active recall and spaced repetition, making studying more efficient and effective.

## User Preferences

Preferred communication style: Simple, everyday language.

Flashcard answer format: Ultra-concise (bullet points or few words, NOT complete sentences or paragraphs)

## System Architecture

### Frontend

The frontend uses React 18 with TypeScript, Vite, Wouter for routing, TanStack Query for server state management, and Shadcn UI with Tailwind CSS for styling. The design system is medical student-focused, featuring a calming color palette (Medical blue, Soft teal, warm neutrals), Inter and Poppins typography, and smooth Framer Motion animations. Authentication is handled via Supabase Auth with email/password login, using a custom `useAuth` hook for session management. The Supabase client is configured in `client/src/lib/supabase.ts` and automatically includes Bearer tokens in API requests via the queryClient. Routing includes public and protected routes, with a `ProtectedRoute` component for authentication enforcement. The landing page emphasizes active recall and spaced repetition, targeting medical students with a friendly, professional tone and responsive design.

### Backend

The backend is built with Express.js and Node.js (ESM modules) in TypeScript. It provides RESTful APIs for operations like file uploads (up to 100MB), flashcard generation, and progress tracking. File uploads are handled with Multer and validated for various document types. Content processing involves text extraction from PDFs, DOCX, TXT, and PPT using `pdf-parse` and `mammoth`, and YouTube transcript extraction via `youtubei.js` with intelligent Whisper AI fallback for videos without captions. Token counting for AI is precisely managed using Tiktoken. A key feature is intelligent, topic-aware chunking for large documents, ensuring semantic continuity and context for AI generation, including 200-token overlaps between chunks. Generated flashcards and associated metadata are stored in a PostgreSQL database.

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
- **Data Storage:** Uses a production-ready PostgreSQL database with Drizzle ORM for persistent storage of user data, decks, and flashcards. Uploaded documents are stored in Replit App Storage (Google Cloud Storage) with private ACLs.
- **API Design:** RESTful endpoints with HTTP polling for asynchronous generation progress tracking.

## External Dependencies

- **Authentication:** Supabase Auth (`@supabase/supabase-js`) for email/password authentication. Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables for frontend, and `SUPABASE_URL` and `SUPABASE_ANON_KEY` for backend. User sessions use Bearer token authentication.
- **AI Service:** `@google/genai` SDK for advanced AI capabilities, requiring a `GEMINI_API_KEY`. It supports customized generation parameters like card types, granularity, custom instructions, image inclusion (using `pdf-to-img`, `youtubei.js`, `ffmpeg`), and source inclusion for YouTube videos.
- **Database:** Neon PostgreSQL serverless database via `@neondatabase/serverless` and Drizzle ORM.
- **File Processing Libraries:**
    - `pdf-parse`: For PDF text extraction.
    - `mammoth`: For DOCX/DOC text extraction.
    - `youtubei.js`: For YouTube video transcript extraction.
    - OpenAI Whisper API: As a fallback for AI transcription of videos without captions.
    - `yt-dlp`: For audio extraction for Whisper transcription.
    - `multer`: For multipart file upload handling.
- **Cloud Storage:** Google Cloud Storage via Replit App Storage for uploaded documents and extracted images.
- **Export Functionality:** Supports JSON, CSV, and Anki (.apkg) formats. CSV and Anki exports handle subdeck hierarchy information.